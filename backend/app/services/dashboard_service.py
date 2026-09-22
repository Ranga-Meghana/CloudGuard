"""Aggregates everything the dashboard needs into ONE response (fewer round-trips)."""
from datetime import timedelta

from ..models.schemas import PRIORITY_ORDER
from ..utils.fleet import fleet_utilization
from ..utils.timeutil import from_iso, now_utc, to_iso
from . import anomaly_service, cost_service, metrics_service, security_service

SNAPSHOT = ["EC2-Production-01", "EC2-Production-02", "DB-Main", "Storage-Bucket-01"]


def _alerts_per_day(alerts, days=7, now=None):
    now = now or now_utc()
    counts = []
    for i in range(days - 1, -1, -1):
        day = to_iso(now - timedelta(days=i))[:10]
        counts.append(sum(1 for a in alerts if a["created_at"][:10] == day))
    return counts


def build_dashboard(repo):
    now = now_utc()
    resources = repo.all("resources")
    alerts = repo.all("alerts")
    meta = repo.get("meta", "platform") or {}
    sec = security_service.summary(repo)
    costs = cost_service.summary(repo)
    breakdown = cost_service.breakdown(repo)

    # --- summary cards
    month_ago = to_iso(now - timedelta(days=30))
    older = sum(1 for r in resources if r["created_at"] <= month_ago)
    growth = round((len(resources) - older) / older * 100, 1) if older else 0.0
    open_alerts = [a for a in alerts if a["status"] == "open"]
    new_today = sum(1 for a in open_alerts if a["created_at"] >= to_iso(now - timedelta(hours=24)))
    daily_cost = {}
    for p in metrics_service.fleet_series(repo, "30d"):
        daily_cost[p["ts"][:10]] = p["cost"]
    cost_spark = [round(v, 1) for v in list(daily_cost.values())[-14:]]
    score_history = (meta.get("score_history") or [])[-7:] + [sec["score"]]
    counts_by_age = [len([r for r in resources if r["created_at"] <= to_iso(now - timedelta(days=7 * w))])
                     for w in range(7, -1, -1)]

    summary = {
        "total_resources": {"value": len(resources), "change_pct": growth, "spark": counts_by_age},
        "security_score": {"value": sec["score"], "change_pct": sec["change_pct"], "spark": score_history},
        "monthly_cost": {"value": costs["monthly_cost"], "change_pct": costs["change_pct"], "spark": cost_spark},
        "active_alerts": {"value": len(open_alerts), "new_today": new_today, "spark": _alerts_per_day(alerts)},
    }

    # --- alerts, anomalies, recommendations, snapshot
    recent_alerts = sorted(open_alerts, key=lambda a: a["created_at"], reverse=True)[:4]
    anomalies = anomaly_service.detect_anomalies(repo)
    recs = [r for r in repo.all("recommendations", {"status": "open"})]
    recs.sort(key=lambda r: (PRIORITY_ORDER[r["priority"]], -r["estimated_savings"]))
    by_name = {r["name"]: r for r in resources}
    snapshot = [by_name[n] for n in SNAPSHOT if n in by_name] or resources[:4]

    # --- activity calendar
    events = metrics_service.daily_events(repo, 35)
    today = to_iso(now)[:10]
    activity = [{"date": d, "events": n} for d, n in events.items()]
    recent_days = [{"date": d, "events": n} for d, n in list(events.items())[-6:]]

    degraded = [r for r in resources if r["status"] == "warning"]
    return {
        "status": {"operational": True, "label": "All systems operational", "attention": len(degraded)},
        "last_updated": meta.get("last_refreshed"),
        "region": "ap-south-1", "today": today,
        "summary": summary,
        "utilization": fleet_utilization(resources),
        "security": {"score": sec["score"], "counts": sec["counts"], "total_active": sec["total_active"]},
        "cost": {"by_service": breakdown["by_service"], "summary": costs},
        "alerts": recent_alerts,
        "anomalies": anomalies[:5], "anomaly_count": len(anomalies),
        "recommendations": recs[:4], "open_recommendations": len(recs),
        "resources": snapshot,
        "activity": activity, "recent_days": recent_days,
    }
