"""SimulatedCloudProvider - realistic, deterministic fake cloud data (no AWS credentials needed).

It behaves like a real provider: it returns an inventory, historical metrics and cost history.
Swap it for AWSCloudProvider later without touching the rest of the application.
"""
import math
import random
from datetime import timedelta
from statistics import fmean

from ...utils.fleet import fleet_utilization
from ...utils.timeutil import (days_in_month, from_iso, month_key, now_utc, shift_month, to_iso)
from .base import CloudProvider
from .simulated_data import DEFAULT_CONFIG, EVENT_TEMPLATES, RESOURCE_SPECS, SPECIAL_EVENTS

HOURS_90D = 90 * 24
RESOURCE_HOURS = 72
# Multipliers that shape the last 5 months of history relative to today's run-rate.
# The last value (1.1416) makes "this month" ~12.4% cheaper than last month.
MONTH_FACTORS = [0.78, 0.86, 0.95, 1.04, 1.1416]


def _clamp(value, lo=1.0, hi=99.0):
    return max(lo, min(hi, value))


def _ramp(day, start=76.0, length=14.0):
    return _clamp((day - start) / length, 0.0, 1.0)


def _diurnal(hour):
    return math.sin((hour - 9) / 24 * 2 * math.pi)  # peaks mid-afternoon


class SimulatedCloudProvider(CloudProvider):
    name = "simulated"
    label = "AWS (Simulation)"

    def __init__(self, seed=42, now=None):
        self.seed = seed
        self.now = now or now_utc()

    # ------------------------------------------------------------------ inventory
    def get_resources(self):
        now, rng = self.now, random.Random(self.seed)
        docs = []
        for index, spec in enumerate(RESOURCE_SPECS, start=1):
            rtype, service = spec["type"], spec["service"]
            config = {**DEFAULT_CONFIG, **spec.get("config", {})}
            spikes = spec.get("spikes", {})
            used, cap = spec.get("used_gb"), spec.get("capacity_gb")

            # cost
            if service == "S3":
                cost, size = round(used * 0.023, 2), f"{used} GB stored"
            elif service == "EBS":
                cost, size = round(cap * 0.08, 2), f"{cap} GB · gp3"
            else:
                cost, size = spec["cost"], spec["size"]

            storage_pct = round(used / cap * 100, 1) if used is not None else spec.get("disk")
            current = {m: spec.get(m) for m in ("cpu", "memory", "network")}
            for metric, points in spikes.items():
                current[metric] = points[0] if 0 in points else current[metric]

            status = "running"
            if current["cpu"] is not None and current["cpu"] >= 90:
                status = "warning"
            if spec.get("attached") is False:
                config["attached"] = False

            uptime_days = spec["age_days"] if rtype in ("storage", "network") else rng.randint(6, 90)
            docs.append({
                "_id": f"res-{index:03d}",
                "name": spec["name"], "type": rtype, "service": service, "size": size,
                "instance_type": spec["size"] if rtype == "compute" else None,
                "region": spec["region"], "status": status,
                "cpu": current["cpu"], "memory": current["memory"],
                "storage": storage_pct, "network": current["network"],
                "used_gb": used, "capacity_gb": cap,
                "monthly_cost": cost, "base_cost": cost,
                "uptime": {"pct": round(99.9 + rng.random() * 0.09, 2), "days": uptime_days},
                "created_at": to_iso(now - timedelta(days=spec["age_days"])),
                "tags": {"env": spec["env"], "owner": spec["owner"]},
                "last_accessed_days": spec.get("last_accessed_days"),
                "config": config,
                "baseline": {m: spec.get(m) for m in ("cpu", "memory", "network")},
                "security_status": "secure",
                "events": self._events(spec, rng, now),
            })
        return docs

    def _events(self, spec, rng, now):
        events = [(h, m, lvl) for h, m, lvl in SPECIAL_EVENTS.get(spec["name"], [])]
        templates = EVENT_TEMPLATES[spec["type"]]
        for i, (msg, lvl) in enumerate(rng.sample(templates, k=min(3, len(templates)))):
            events.append((rng.randint(3, 9) * (i + 1) * 3 + rng.random(), msg, lvl))
        events.sort(key=lambda e: e[0])
        return [{"time": to_iso(now - timedelta(hours=h)), "message": m, "level": lvl} for h, m, lvl in events[:6]]

    # ------------------------------------------------------------------ metrics
    def get_metrics(self, resources):
        rng = random.Random(self.seed + 1)
        docs = self._resource_series(resources, rng) + self._fleet_series(resources, rng)
        docs += self._minute_series(fleet_utilization(resources), random.Random(self.seed + 2), self.now)
        return docs

    def _resource_series(self, resources, rng):
        anchor = self.now - timedelta(minutes=8)
        spec_by_name = {s["name"]: s for s in RESOURCE_SPECS}
        docs = []
        for res in resources:
            spikes = spec_by_name[res["name"]].get("spikes", {})
            for k in range(RESOURCE_HOURS):
                ts = anchor - timedelta(hours=k)
                point = {"_id": f"m-{res['_id']}-{k:02d}", "scope": "resource", "granularity": "hour",
                         "resource_id": res["_id"], "ts": to_iso(ts)}
                for metric in ("cpu", "memory", "network"):
                    base = res["baseline"][metric]
                    if base is None:
                        point[metric] = None
                        continue
                    if k in spikes.get(metric, {}):
                        value = spikes[metric][k]
                    elif k == 0:
                        value = base
                    else:
                        amp = min(8.0, base * 0.15)
                        noise = max(1.5, min(4.0, base * 0.06))
                        value = _clamp(base + amp * _diurnal(ts.hour) + rng.uniform(-noise, noise))
                    point[metric] = round(value, 1)
                docs.append(point)
        return docs

    def _month_totals(self, resources):
        """Total cost per month: history months from MONTH_FACTORS + the live month."""
        run_rate = sum(r["monthly_cost"] for r in resources)
        totals = {month_key(shift_month(self.now, -(5 - i))): round(run_rate * f, 2)
                  for i, f in enumerate(MONTH_FACTORS)}
        totals[month_key(self.now)] = round(run_rate, 2)
        return totals

    def _fleet_series(self, resources, rng):
        cur = fleet_utilization(resources)
        totals = self._month_totals(resources)
        anchor = self.now.replace(minute=0, second=0)
        slope30 = max(0.4, (80 - cur["storage"]) / 18)  # storage growth (% per day) over the last 30 days
        docs = []
        for k in range(HOURS_90D - 1, -1, -1):
            ts = anchor - timedelta(hours=k)
            day = (HOURS_90D - 1 - k) / 24
            ramp = _ramp(day)
            weekend = 0.88 if ts.weekday() >= 5 else 1.0
            di = _diurnal(ts.hour)
            days_back = k / 24
            storage = cur["storage"] - slope30 * days_back if days_back <= 30 else \
                max(5.0, cur["storage"] - slope30 * 30 - 0.15 * (days_back - 30))
            month_total = totals.get(month_key(ts), totals[month_key(self.now)])
            lam = 0.75 * (1 + 0.6 * di) * (2.2 if 30 <= k // 24 <= 31 else 1.0)  # one noisy day
            doc = {
                "_id": f"fleet-hour-{to_iso(ts)}", "scope": "fleet", "granularity": "hour", "ts": to_iso(ts),
                "cpu": _clamp(cur["cpu"] * (0.80 + 0.20 * ramp) * weekend + 5 * di + rng.uniform(-3, 3)),
                "memory": _clamp(cur["memory"] * (0.96 + 0.04 * ramp) + 2 * di + rng.uniform(-1.5, 1.5)),
                "network": _clamp(cur["network"] * (0.75 + 0.25 * ramp) * weekend + 6 * di + rng.uniform(-3, 3)),
                "storage": _clamp(storage + rng.uniform(-0.3, 0.3)),
                "cost": month_total / (days_in_month(ts) * 24) * rng.uniform(0.97, 1.03),
                "security_events": max(0, int(round(rng.gauss(lam, math.sqrt(lam))))),
            }
            # deliberate fleet-wide bursts so anomaly detection has history to show
            if k in (120, 121):
                doc["cpu"] = 89.0 + (k - 120)
            if k in (50, 51, 52):
                doc["network"] = 91.0 + (k - 50) * 2
            if k == 0:
                doc.update(cpu=cur["cpu"], memory=cur["memory"], network=cur["network"], storage=cur["storage"])
            for key in ("cpu", "memory", "network", "storage"):
                doc[key] = round(doc[key], 1)
            doc["cost"] = round(doc["cost"], 4)
            docs.append(doc)
        return docs

    def _minute_series(self, cur, rng, now):
        """Last 60 minutes at 1-minute resolution (powers the 1H chart)."""
        docs, values = [], dict(cur)
        for i in range(59, -1, -1):
            ts = now - timedelta(minutes=i)
            for m in ("cpu", "memory", "network"):
                values[m] = _clamp(values[m] + (cur[m] - values[m]) * 0.15 + rng.uniform(-2.2, 2.2))
            docs.append({"_id": f"fleet-minute-{to_iso(ts)}", "scope": "fleet", "granularity": "minute",
                         "ts": to_iso(ts), "cpu": round(values["cpu"], 1), "memory": round(values["memory"], 1),
                         "network": round(values["network"], 1), "storage": cur["storage"]})
        docs[-1].update(cpu=cur["cpu"], memory=cur["memory"], network=cur["network"])
        return docs

    # ------------------------------------------------------------------ costs
    def get_cost_history(self, resources):
        rng = random.Random(self.seed + 3)
        shares = {}
        for res in resources:
            shares[res["type"]] = shares.get(res["type"], 0) + res["monthly_cost"]
        totals = self._month_totals(resources)
        current = month_key(self.now)
        docs = []
        for month, total in totals.items():
            if month == current:
                continue  # the current month is always computed live from the inventory
            raw = {cat: amount * rng.uniform(0.97, 1.03) for cat, amount in shares.items()}
            scale = total / sum(raw.values())
            for cat, amount in raw.items():
                docs.append({"_id": f"cost-{month}-{cat}", "month": month, "category": cat,
                             "amount": round(amount * scale, 2), "currency": "USD"})
        return docs

    # ------------------------------------------------------------------ refresh
    def refresh_metrics(self, resources, latest_fleet, latest_points, now):
        """Generate what changed since the last sync: new hourly points + fresh 1-minute series."""
        rng = random.Random(int(now.timestamp()))
        totals = self._month_totals(resources)
        anchor = now.replace(minute=0, second=0)
        out = {"fleet_hourly": [], "resource_points": [], "resource_current": {}, "fleet_minute": []}

        # 1) hourly fleet points since the last one (random walk around today's averages)
        cur = fleet_utilization(resources)
        prev, ts = latest_fleet, from_iso(latest_fleet["ts"]) + timedelta(hours=1)
        while ts <= anchor and len(out["fleet_hourly"]) < HOURS_90D:
            point = {"_id": f"fleet-hour-{to_iso(ts)}", "scope": "fleet", "granularity": "hour", "ts": to_iso(ts)}
            for m in ("cpu", "memory", "network"):
                target = cur[m] + (5 if m == "cpu" else 3) * _diurnal(ts.hour)
                point[m] = round(_clamp(prev[m] + (target - prev[m]) * 0.35 + rng.uniform(-2, 2)), 1)
            point["storage"] = round(min(92.0, prev["storage"] + 0.03), 1)
            month_total = totals.get(month_key(ts), sum(r["monthly_cost"] for r in resources))
            point["cost"] = round(month_total / (days_in_month(ts) * 24) * rng.uniform(0.97, 1.03), 4)
            point["security_events"] = max(0, int(round(rng.gauss(0.8, 0.9))))
            out["fleet_hourly"].append(point)
            prev, ts = point, ts + timedelta(hours=1)

        # 2) hourly per-resource points since each resource's last point
        for res in resources:
            last = latest_points.get(res["_id"])
            if not last:
                continue
            prev, ts = last, from_iso(last["ts"]) + timedelta(hours=1)
            added = 0
            while ts <= now and added < RESOURCE_HOURS:
                point = {"_id": f"m-{res['_id']}-{to_iso(ts)}", "scope": "resource", "granularity": "hour",
                         "resource_id": res["_id"], "ts": to_iso(ts)}
                for m in ("cpu", "memory", "network"):
                    base = res["baseline"][m]
                    if base is None or prev.get(m) is None:
                        point[m] = None
                        continue
                    target = base + min(8.0, base * 0.15) * _diurnal(ts.hour)
                    point[m] = round(_clamp(prev[m] + (target - prev[m]) * 0.5 + rng.uniform(-1.5, 1.5)), 1)
                out["resource_points"].append(point)
                prev, ts, added = point, ts + timedelta(hours=1), added + 1
            latest = prev
            # 3) "live" current values: latest point with a small jitter
            if res["status"] != "stopped":
                out["resource_current"][res["_id"]] = {
                    m: (round(_clamp(latest[m] + rng.uniform(-2.5, 2.5)), 1) if latest.get(m) is not None else None)
                    for m in ("cpu", "memory", "network")}

        # 4) minute series ending at the refreshed fleet averages
        current_resources = [{**r, **out["resource_current"].get(r["_id"], {})} for r in resources]
        out["fleet_minute"] = self._minute_series(fleet_utilization(current_resources), rng, now)
        return out
