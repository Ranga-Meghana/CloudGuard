"""Resource listing, detail view and simulated lifecycle actions (start / stop / reboot)."""
import random

from ..models.schemas import RESOURCE_TYPES
from ..utils.errors import NotFound, ValidationError
from ..utils.timeutil import now_utc, to_iso
from . import metrics_service, security_service

LIST_FIELDS = ("_id", "name", "type", "service", "size", "region", "status", "cpu", "memory", "storage",
               "network", "monthly_cost", "security_status", "created_at", "tags")


def list_resources(repo, rtype=None, q=None, status=None):
    if rtype and rtype not in RESOURCE_TYPES:
        raise ValidationError(f"type must be one of: {', '.join(RESOURCE_TYPES)}")
    query = {}
    if rtype:
        query["type"] = rtype
    if status:
        query["status"] = status
    items = repo.all("resources", query, sort=[("name", 1)])
    if q:
        needle = q.strip().lower()
        items = [r for r in items if needle in r["name"].lower() or needle in r["service"].lower()
                 or needle in r["region"].lower() or needle in r["type"].lower()]
    return [{k: r.get(k) for k in LIST_FIELDS} for r in items]


def type_counts(repo):
    counts = {t: 0 for t in RESOURCE_TYPES}
    for r in repo.all("resources"):
        counts[r["type"]] += 1
    counts["all"] = sum(counts.values())
    return counts


def resource_detail(repo, resource_id):
    res = repo.get("resources", resource_id)
    if not res:
        raise NotFound("Resource not found")
    findings = repo.all("security_findings", {"resource_id": resource_id})
    findings = [f for f in findings if f["status"] != "resolved"]
    recs = repo.all("recommendations", {"resource_id": resource_id})
    res["findings"] = findings
    res["recommendations"] = [r for r in recs if r["status"] == "open"]
    res["series"] = metrics_service.resource_series(repo, resource_id)
    return res


def perform_action(repo, resource_id, action):
    res = repo.get("resources", resource_id)
    if not res:
        raise NotFound("Resource not found")
    if res["type"] not in ("compute", "database"):
        raise ValidationError("Only compute and database resources support start/stop/reboot")
    if action not in ("start", "stop", "reboot"):
        raise ValidationError("action must be start, stop or reboot")

    rng = random.Random()
    changes, message = {}, ""
    if action == "stop":
        if res["status"] == "stopped":
            raise ValidationError("Resource is already stopped")
        changes = {"status": "stopped", "cpu": 0.0, "memory": 0.0, "network": 0.0,
                   "monthly_cost": round(res["base_cost"] * 0.1, 2)}  # storage keeps costing a little
        message = "Resource stopped"
    elif action == "start":
        if res["status"] != "stopped":
            raise ValidationError("Resource is already running")
        base = res.get("baseline", {})
        changes = {"status": "running", "monthly_cost": res["base_cost"],
                   "cpu": round(min(60, (base.get("cpu") or 30) * rng.uniform(0.8, 1.1)), 1),
                   "memory": round((base.get("memory") or 40) * rng.uniform(0.8, 1.1), 1),
                   "network": round((base.get("network") or 25) * rng.uniform(0.8, 1.1), 1)}
        message = "Resource started"
    else:
        if res["status"] == "stopped":
            raise ValidationError("Start the resource before rebooting it")
        changes = {"status": "running"}
        message = "Resource rebooted"
    events = [{"time": to_iso(now_utc()), "message": message, "level": "info"}] + res.get("events", [])
    changes["events"] = events[:8]
    repo.update("resources", resource_id, changes)
    security_service.refresh_resource_security(repo)
    return resource_detail(repo, resource_id)
