"""Time-series queries: fleet metrics for any range, bucketed for chart-friendly sizes."""
from datetime import timedelta

from ..utils.errors import ValidationError
from ..utils.timeutil import from_iso, to_iso

# range -> (granularity, hours of history, points per bucket)
RANGES = {
    "1h": ("minute", 1, 1),
    "24h": ("hour", 24, 1),
    "7d": ("hour", 24 * 7, 4),
    "30d": ("hour", 24 * 30, 24),
    "90d": ("hour", 24 * 90, 24),
}
FIELDS_AVG = ("cpu", "memory", "network", "storage")
FIELDS_SUM = ("cost", "security_events")


def _bucketize(points, size):
    if size <= 1:
        return points
    out = []
    for i in range(0, len(points), size):
        chunk = points[i:i + size]
        item = {"ts": chunk[0]["ts"]}
        for f in FIELDS_AVG:
            vals = [p[f] for p in chunk if p.get(f) is not None]
            item[f] = round(sum(vals) / len(vals), 1) if vals else None
        for f in FIELDS_SUM:
            vals = [p.get(f) or 0 for p in chunk]
            item[f] = round(sum(vals), 2)
        out.append(item)
    return out


def fleet_series(repo, range_key):
    if range_key not in RANGES:
        raise ValidationError(f"range must be one of: {', '.join(RANGES)}")
    granularity, hours, bucket = RANGES[range_key]
    latest = repo.all("metrics", {"scope": "fleet", "granularity": granularity}, sort=[("ts", -1)], limit=1)
    if not latest:
        return []
    cutoff = to_iso(from_iso(latest[0]["ts"]) - timedelta(hours=hours))
    points = repo.all("metrics", {"scope": "fleet", "granularity": granularity, "ts": {"$gt": cutoff}},
                      sort=[("ts", 1)])
    points = [{k: p.get(k) for k in ("ts", *FIELDS_AVG, *FIELDS_SUM)} for p in points]
    return _bucketize(points, bucket)


def resource_series(repo, resource_id, hours=72):
    points = repo.all("metrics", {"scope": "resource", "resource_id": resource_id}, sort=[("ts", 1)])
    return [{k: p.get(k) for k in ("ts", "cpu", "memory", "network")} for p in points[-hours:]]


def daily_events(repo, days=35):
    """Security events per UTC day (powers the dashboard activity calendar)."""
    points = repo.all("metrics", {"scope": "fleet", "granularity": "hour"}, sort=[("ts", -1)], limit=days * 24)
    totals = {}
    for p in points:
        day = p["ts"][:10]
        totals[day] = totals.get(day, 0) + (p.get("security_events") or 0)
    return dict(sorted(totals.items()))
