from flask import Blueprint, jsonify, request

from ..db import get_repo
from ..models.schemas import ALERT_CATEGORIES, SEVERITIES, SEVERITY_ORDER, clean_patch
from ..utils.auth import login_required
from ..utils.errors import NotFound, ValidationError

bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


def _counts(repo):
    alerts = repo.all("alerts")
    open_alerts = [a for a in alerts if a["status"] == "open"]
    return {
        "open": len(open_alerts),
        "unread": sum(1 for a in open_alerts if not a["read"]),
        "critical": sum(1 for a in open_alerts if a["severity"] == "critical"),
        "by_category": {c: sum(1 for a in open_alerts if a["category"] == c) for c in ALERT_CATEGORIES},
        "total": len(alerts),
    }


@bp.get("")
@login_required
def list_alerts():
    repo = get_repo()
    query = {k: request.args[k] for k in ("category", "severity", "status") if request.args.get(k)}
    items = repo.all("alerts", query, sort=[("created_at", -1)])
    q = (request.args.get("q") or "").lower().strip()
    if q:
        items = [a for a in items if q in a["title"].lower() or q in (a["resource_name"] or "").lower()
                 or q in a["message"].lower()]
    return jsonify({"items": items, "count": len(items), "counts": _counts(repo)})


@bp.patch("/<alert_id>")
@login_required
def update_alert(alert_id):
    changes = clean_patch("alerts", request.get_json(silent=True))
    repo = get_repo()
    if changes.get("status") == "resolved":
        changes["read"] = True
    updated = repo.update("alerts", alert_id, changes)
    if not updated:
        raise NotFound("Alert not found")
    return jsonify({"item": updated, "counts": _counts(repo)})


@bp.delete("/<alert_id>")
@login_required
def delete_alert(alert_id):
    repo = get_repo()
    if not repo.delete("alerts", alert_id):
        raise NotFound("Alert not found")
    return jsonify({"deleted": True, "counts": _counts(repo)})


@bp.post("/read-all")
@login_required
def read_all():
    repo = get_repo()
    for alert in repo.all("alerts", {"status": "open", "read": False}):
        repo.update("alerts", alert["_id"], {"read": True})
    return jsonify({"counts": _counts(repo)})
