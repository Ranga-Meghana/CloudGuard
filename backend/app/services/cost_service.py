"""Cost analytics: current month is computed LIVE from the inventory, history comes from cost_records."""
from ..utils.timeutil import days_in_month, month_key, now_utc, shift_month

CATEGORIES = [("compute", "Compute"), ("storage", "Storage"), ("database", "Database"), ("network", "Network")]
FORECAST_FACTOR = 1.03  # usage-based extras (data transfer, requests) on top of the fixed run-rate


def _month_label(key):
    y, m = key.split("-")
    names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{names[int(m) - 1]} {y[2:]}"


def _current_by_category(resources):
    totals = {key: 0.0 for key, _ in CATEGORIES}
    for r in resources:
        totals[r["type"]] += r["monthly_cost"]
    return {k: round(v, 2) for k, v in totals.items()}


def _history(repo):
    months = {}
    for rec in repo.all("cost_records"):
        months.setdefault(rec["month"], {})[rec["category"]] = rec["amount"]
    return dict(sorted(months.items()))


def idle_resources(resources):
    idle = []
    for r in resources:
        if r["type"] == "compute" and r["status"] == "running" and (r["cpu"] or 0) < 12:
            idle.append(r)
        elif r.get("config", {}).get("attached") is False and r["monthly_cost"] > 0:
            idle.append(r)
    return idle


def summary(repo):
    now = now_utc()
    resources = repo.all("resources")
    run_rate = round(sum(r["monthly_cost"] for r in resources), 2)
    history = _history(repo)
    previous = round(sum(list(history.values())[-1].values()), 2) if history else run_rate
    recs = repo.all("recommendations", {"category": "cost"})
    potential = round(sum(r["estimated_savings"] for r in recs if r["status"] == "open"), 2)
    realized = round(sum(r["estimated_savings"] for r in recs if r["status"] == "applied"), 2)
    dim = days_in_month(now)
    return {
        "monthly_cost": run_rate,
        "previous_month": previous,
        "change_pct": round((run_rate - previous) / previous * 100, 1) if previous else 0.0,
        "month_to_date": round(run_rate * now.day / dim, 2),
        "projected_cost": round(run_rate * FORECAST_FACTOR, 2),
        "potential_savings": potential,
        "realized_savings": realized,
        "idle_resources": len(idle_resources(resources)),
        "currency": "USD",
    }


def breakdown(repo):
    now = now_utc()
    resources = repo.all("resources")
    current = _current_by_category(resources)
    history = _history(repo)
    prev = list(history.values())[-1] if history else {}
    stats = summary(repo)

    by_service = [{"key": k, "name": name, "current": current[k], "previous": round(prev.get(k, 0), 2),
                   "share": round(current[k] / stats["monthly_cost"] * 100, 1) if stats["monthly_cost"] else 0}
                  for k, name in CATEGORIES]

    by_month = [{"month": m, "label": _month_label(m), **{k: vals.get(k, 0) for k, _ in CATEGORIES},
                 "total": round(sum(vals.values()), 2), "current": False} for m, vals in history.items()]
    key = month_key(now)
    by_month.append({"month": key, "label": _month_label(key), **current, "total": stats["monthly_cost"],
                     "current": True, "projected": stats["projected_cost"]})

    top = sorted(resources, key=lambda r: r["monthly_cost"], reverse=True)[:10]
    by_resource = [{"id": r["_id"], "name": r["name"], "type": r["type"], "cost": r["monthly_cost"]} for r in top]
    return {"summary": stats, "by_service": by_service, "by_month": by_month, "by_resource": by_resource}
