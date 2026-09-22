"""Applying a recommendation SIMULATES the change: it edits the stored resource, nothing real."""
from ..models.schemas import PRIORITY_ORDER
from ..utils.errors import NotFound, ValidationError
from ..utils.timeutil import now_utc, to_iso
from . import security_service
from .providers.simulated_data import INSTANCE_PRICES


def _log_event(res, message):
    events = [{"time": to_iso(now_utc()), "message": message, "level": "success"}] + res.get("events", [])
    return events[:8]


def list_recommendations(repo, category=None, status=None):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    items = repo.all("recommendations", query)
    items.sort(key=lambda r: (PRIORITY_ORDER[r["priority"]], -r["estimated_savings"]))
    return items


def apply_recommendation(repo, rec):
    action, rid = rec["action"], rec["resource_id"]
    res = repo.get("resources", rid)
    if res is None:
        raise NotFound("The resource for this recommendation no longer exists")
    kind = rec["action"]["kind"]

    if kind == "resize":
        new_type = action["instance_type"]
        old_price = INSTANCE_PRICES.get(res["instance_type"], res["monthly_cost"])
        new_price = INSTANCE_PRICES[new_type]
        new_cpu = round(min(95.0, (res["cpu"] or 0) * old_price / new_price), 1)
        repo.update("resources", rid, {
            "instance_type": new_type, "size": new_type, "monthly_cost": new_price, "base_cost": new_price,
            "cpu": new_cpu, "events": _log_event(res, f"Instance resized to {new_type} by CloudGuard")})
    elif kind == "stop":
        repo.update("resources", rid, {
            "status": "stopped", "cpu": 0.0, "memory": 0.0, "network": 0.0, "monthly_cost": 0.0,
            "events": _log_event(res, "Idle instance stopped by CloudGuard")})
    elif kind == "release":
        repo.update("resources", rid, {
            "status": "stopped", "monthly_cost": 0.0, "events": _log_event(res, "Unattached volume released")})
    elif kind == "archive_storage":
        cfg = {**res["config"], "storage_class": "GLACIER"}
        repo.update("resources", rid, {
            "monthly_cost": rec["recommended_cost"], "base_cost": rec["recommended_cost"], "config": cfg,
            "last_accessed_days": 0, "events": _log_event(res, "Inactive data moved to archive storage")})
    elif kind == "autoscaling":
        cfg = {**res["config"], "autoscaling": True}
        cpu = max(20.0, (res["cpu"] or 0) - 18)
        repo.update("resources", rid, {
            "config": cfg, "cpu": cpu, "status": "running" if cpu < 90 else res["status"],
            "events": _log_event(res, "Auto Scaling enabled")})
    elif kind == "remediate":
        security_service.remediate(repo, rid, action["rule_id"])
    else:
        raise ValidationError(f"Unknown recommendation action '{kind}'")
    return repo.update("recommendations", rec["_id"], {"status": "applied", "applied_at": to_iso(now_utc())})


def update_status(repo, rec_id, status):
    rec = repo.get("recommendations", rec_id)
    if not rec:
        raise NotFound("Recommendation not found")
    if rec["status"] == "applied":
        raise ValidationError("This recommendation was already applied")
    if status == "applied":
        return apply_recommendation(repo, rec)
    return repo.update("recommendations", rec_id, {"status": status})
