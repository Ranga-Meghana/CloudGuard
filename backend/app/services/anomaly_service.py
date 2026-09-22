"""Anomaly detection - simple, explainable statistics (no black-box ML).

For every metric time-series we compute:
    mean and standard deviation over the window
    z-score = (value - mean) / std
A point is ANOMALOUS when its z-score >= Z_THRESHOLD (a statistical spike)
or the value crosses a hard limit (e.g. CPU >= 90%).

The baseline shown to the user is recomputed WITHOUT the anomalous points, so
"normal CPU: 20-75%" is not polluted by the spike itself.
"""
from statistics import fmean, pstdev

from ..models.schemas import SEVERITY_ORDER
from ..utils.timeutil import from_iso, to_iso

Z_THRESHOLD = 3.0
HARD_LIMITS = {"cpu": 90.0, "memory": 92.0, "network": 90.0}
LABELS = {"cpu": "CPU", "memory": "Memory", "network": "Network"}
MIN_POINTS = 12
FLEET_WINDOW_DAYS = 14

METHOD = {
    "name": "z-score + threshold",
    "z_threshold": Z_THRESHOLD,
    "hard_limits": HARD_LIMITS,
    "description": "A point is anomalous when it is at least 3 standard deviations above the "
                   "window average, or crosses a hard limit (CPU 90%, memory 92%, network 90%).",
}


def _severity(value):
    if value >= 97:
        return "critical"
    if value >= 90:
        return "high"
    return "medium"


def analyze_series(points, metric):
    """Return the most severe anomaly of one metric series, or None."""
    series = [(p["ts"], p[metric]) for p in points if p.get(metric) is not None]
    if len(series) < MIN_POINTS:
        return None
    values = [v for _, v in series]
    mean, std = fmean(values), pstdev(values) or 1e-9
    flagged = [(ts, v) for ts, v in series if (v - mean) / std >= Z_THRESHOLD or v >= HARD_LIMITS[metric]]
    if not flagged:
        return None

    flagged_ts = {ts for ts, _ in flagged}
    clean = [v for ts, v in series if ts not in flagged_ts] or values
    base_mean, base_std = fmean(clean), pstdev(clean) or 1.0
    peak_ts, peak = max(flagged, key=lambda item: item[1])
    z = (peak - base_mean) / base_std
    return {
        "metric": metric, "value": round(peak, 1), "detected_at": peak_ts, "occurrences": len(flagged),
        "baseline_mean": round(base_mean, 1),
        "baseline_low": round(max(0.0, base_mean - 2 * base_std), 1),
        "baseline_high": round(min(100.0, base_mean + 2 * base_std), 1),
        "z_score": round(z, 1), "severity": _severity(peak),
    }


def _describe(item, scope_name):
    label = LABELS[item["metric"]]
    item["message"] = f"Anomalous {label} spike detected"
    item["description"] = (f"{label} reached {item['value']:.0f}% on {scope_name} "
                           f"(normal range {item['baseline_low']:.0f}-{item['baseline_high']:.0f}%, "
                           f"z-score {item['z_score']}).")
    return item


def detect_anomalies(repo, metrics=("cpu", "memory", "network"), include_fleet=True):
    resources = {r["_id"]: r for r in repo.all("resources")}
    by_resource = {}
    for point in repo.all("metrics", {"scope": "resource"}, sort=[("ts", 1)]):
        by_resource.setdefault(point["resource_id"], []).append(point)

    found = []
    for rid, points in by_resource.items():
        res = resources.get(rid)
        if not res:
            continue
        for metric in metrics:
            item = analyze_series(points, metric)
            if item:
                item.update(scope="resource", resource_id=rid, resource_name=res["name"],
                            id=f"anom-{rid}-{metric}")
                found.append(_describe(item, res["name"]))

    if include_fleet:
        latest = repo.all("metrics", {"scope": "fleet", "granularity": "hour"}, sort=[("ts", -1)], limit=1)
        if latest:
            from datetime import timedelta
            cutoff = to_iso(from_iso(latest[0]["ts"]) - timedelta(days=FLEET_WINDOW_DAYS))
            points = repo.all("metrics", {"scope": "fleet", "granularity": "hour", "ts": {"$gte": cutoff}},
                              sort=[("ts", 1)])
            for metric in metrics:
                item = analyze_series(points, metric)
                if item:
                    item.update(scope="fleet", resource_id=None, resource_name="Fleet (all resources)",
                                id=f"anom-fleet-{metric}")
                    found.append(_describe(item, "the whole fleet"))

    found.sort(key=lambda a: (SEVERITY_ORDER[a["severity"]], _neg(a["detected_at"])))
    return found


def _neg(iso):
    """Sort key so that newer timestamps come first."""
    return -from_iso(iso).timestamp()
