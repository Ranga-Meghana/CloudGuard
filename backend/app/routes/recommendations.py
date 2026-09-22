from flask import Blueprint, jsonify, request

from ..db import get_repo
from ..models.schemas import REC_CATEGORIES, REC_STATUSES, clean_patch
from ..services import cost_service, recommendation_service
from ..utils.auth import login_required
from ..utils.errors import ValidationError

bp = Blueprint("recommendations", __name__, url_prefix="/api/recommendations")


def _totals(repo):
    items = repo.all("recommendations")
    open_items = [r for r in items if r["status"] == "open"]
    return {
        "open": len(open_items),
        "high_priority": sum(1 for r in open_items if r["priority"] == "high"),
        "potential_savings": round(sum(r["estimated_savings"] for r in open_items), 2),
        "applied": sum(1 for r in items if r["status"] == "applied"),
        "realized_savings": round(sum(r["estimated_savings"] for r in items if r["status"] == "applied"), 2),
        "by_category": {c: sum(1 for r in open_items if r["category"] == c) for c in REC_CATEGORIES},
    }


@bp.get("")
@login_required
def list_recommendations():
    repo = get_repo()
    category, status = request.args.get("category"), request.args.get("status")
    if category and category not in REC_CATEGORIES:
        raise ValidationError(f"category must be one of: {', '.join(REC_CATEGORIES)}")
    if status and status not in REC_STATUSES:
        raise ValidationError(f"status must be one of: {', '.join(REC_STATUSES)}")
    items = recommendation_service.list_recommendations(repo, category, status)
    return jsonify({"items": items, "count": len(items), "totals": _totals(repo)})


@bp.patch("/<rec_id>")
@login_required
def update_recommendation(rec_id):
    changes = clean_patch("recommendations", request.get_json(silent=True))
    repo = get_repo()
    updated = recommendation_service.update_status(repo, rec_id, changes["status"])
    return jsonify({"item": updated, "totals": _totals(repo), "cost": cost_service.summary(repo)})
