"""Analytics: chart series + plain-language insights generated with simple statistics."""
from datetime import timedelta
from statistics import fmean

from ..utils.timeutil import from_iso, to_iso
from .metrics_service import RANGES, fleet_series

# range -> (hours in one comparison window, phrase)
WINDOWS = {"24h": (24, "in the last 24 hours"), "7d": (168, "this week"),
           "30d": (720, "this month"), "90d": (720, "this month"), "1h": (24, "in the last 24 hours")}
STORAGE_LIMIT = 80.0


def _hourly(repo, hours):
    latest = repo.all("metrics", {"scope": "fleet", "granularity": "hour"}, sort=[("ts", -1)], limit=1)
    if not latest:
        return []
    cutoff = to_iso(from_iso(latest[0]["ts"]) - timedelta(hours=hours))
    return repo.all("metrics", {"scope": "fleet", "granularity": "hour", "ts": {"$gt": cutoff}}, sort=[("ts", 1)])


def _avg(points, field):
    vals = [p[field] for p in points if p.get(field) is not None]
    return fmean(vals) if vals else 0.0


def _change(recent, previous):
    return (recent - previous) / previous * 100 if previous else 0.0


def _direction(pct, up="increased", down="decreased"):
    return up if pct >= 0 else down


def storage_projection(repo):
    """Least-squares slope of the last 30 days of storage usage -> days until 80%."""
    points = _hourly(repo, 24 * 30)
    if len(points) < 48:
        return None
    ys = [p["storage"] for p in points]
    xs = [i / 24 for i in range(len(ys))]  # days
    mx, my = fmean(xs), fmean(ys)
    denom = sum((x - mx) ** 2 for x in xs) or 1e-9
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denom  # % per day
    current = ys[-1]
    days = (STORAGE_LIMIT - current) / slope if slope > 0.01 and current < STORAGE_LIMIT else None
    return {"current": round(current, 1), "slope_per_day": round(slope, 2),
            "days_to_limit": int(round(days)) if days is not None else None}


def build_insights(repo, range_key):
    hours, phrase = WINDOWS[range_key]
    points = _hourly(repo, hours * 2)
    recent, previous = points[len(points) // 2:], points[:len(points) // 2]
    insights = []

    cpu = _change(_avg(recent, "cpu"), _avg(previous, "cpu"))
    insights.append({"id": "cpu", "metric": "cpu", "tone": "warning" if cpu > 10 else "info",
                     "title": "CPU utilization", "change_pct": round(cpu, 1),
                     "text": f"CPU utilization {_direction(cpu)} {abs(cpu):.0f}% {phrase}."})

    proj = storage_projection(repo)
    if proj and proj["days_to_limit"] is not None:
        insights.append({"id": "storage", "metric": "storage", "tone": "warning" if proj["days_to_limit"] < 30 else "info",
                         "title": "Storage forecast", "change_pct": proj["slope_per_day"],
                         "text": f"Storage usage is projected to reach 80% in {proj['days_to_limit']} days."})
    elif proj:
        insights.append({"id": "storage", "metric": "storage", "tone": "positive", "title": "Storage forecast",
                         "change_pct": proj["slope_per_day"], "text": "Storage usage is stable and not projected to reach 80%."})

    net = _change(_avg(recent, "network"), _avg(previous, "network"))
    insights.append({"id": "network", "metric": "network", "tone": "warning" if net > 20 else "info",
                     "title": "Network activity", "change_pct": round(net, 1),
                     "text": f"Network activity is {abs(net):.0f}% {'higher' if net >= 0 else 'lower'} than the previous period."})

    cost = _change(sum(p["cost"] for p in recent), sum(p["cost"] for p in previous))
    insights.append({"id": "cost", "metric": "cost", "tone": "warning" if cost > 5 else "positive",
                     "title": "Cloud spend", "change_pct": round(cost, 1),
                     "text": ("Spend is flat compared with the previous period." if abs(cost) < 1 else
                              f"Spend {_direction(cost)} {abs(cost):.0f}% compared with the previous period.")})

    events = _change(sum(p["security_events"] for p in recent), sum(p["security_events"] for p in previous))
    insights.append({"id": "events", "metric": "security_events", "tone": "warning" if events > 15 else "info",
                     "title": "Security events", "change_pct": round(events, 1),
                     "text": f"Security events {_direction(events, 'rose', 'fell')} {abs(events):.0f}% versus the previous period."})
    return insights


def analytics(repo, range_key):
    return {
        "range": range_key,
        "series": fleet_series(repo, range_key if range_key in RANGES else "7d"),
        "insights": build_insights(repo, range_key),
        "storage_limit": STORAGE_LIMIT,
    }
