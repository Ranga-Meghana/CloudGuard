"""Refresh Data: pulls fresh (simulated) metrics from the provider and stores them."""
from datetime import timedelta

from ..utils.fleet import fleet_utilization
from ..utils.timeutil import now_utc, to_iso
from .providers import get_provider

RESOURCE_KEEP_HOURS = 72
FLEET_KEEP_DAYS = 90
STALE_AFTER_HOURS = 2


def refresh_environment(repo, provider_name="simulated"):
    now = now_utc()
    provider = get_provider(provider_name, now=now)
    resources = repo.all("resources")

    latest_fleet = repo.all("metrics", {"scope": "fleet", "granularity": "hour"}, sort=[("ts", -1)], limit=1)
    latest_points = {}
    for point in repo.all("metrics", {"scope": "resource"}, sort=[("ts", 1)]):
        latest_points[point["resource_id"]] = point  # ascending order -> last one wins

    new = provider.refresh_metrics(resources, latest_fleet[0], latest_points, now)
    repo.insert_many("metrics", new["fleet_hourly"] + new["resource_points"])
    repo.delete_many("metrics", {"scope": "fleet", "granularity": "minute"})
    repo.insert_many("metrics", new["fleet_minute"])
    repo.delete_many("metrics", {"scope": "resource", "ts": {"$lt": to_iso(now - timedelta(hours=RESOURCE_KEEP_HOURS))}})
    repo.delete_many("metrics", {"scope": "fleet", "granularity": "hour",
                                 "ts": {"$lt": to_iso(now - timedelta(days=FLEET_KEEP_DAYS))}})

    for rid, values in new["resource_current"].items():
        res = next(r for r in resources if r["_id"] == rid)
        changes = {k: v for k, v in values.items() if v is not None}
        if res["status"] in ("running", "warning") and "cpu" in changes:
            changes["status"] = "warning" if changes["cpu"] >= 90 else "running"
        repo.update("resources", rid, changes)

    meta = repo.get("meta", "platform") or {"_id": "platform"}
    meta["last_refreshed"] = to_iso(now)
    repo.upsert("meta", meta)
    return {"refreshed_at": meta["last_refreshed"], "new_points": len(new["fleet_hourly"]) + len(new["resource_points"]),
            "utilization": fleet_utilization(repo.all("resources"))}


def ensure_fresh(repo, provider_name="simulated"):
    """On start-up, catch the time series up if the server has been asleep (e.g. free hosting tiers)."""
    latest = repo.all("metrics", {"scope": "fleet", "granularity": "hour"}, sort=[("ts", -1)], limit=1)
    if latest and latest[0]["ts"] < to_iso(now_utc() - timedelta(hours=STALE_AFTER_HOURS)):
        refresh_environment(repo, provider_name)
        return True
    return False
