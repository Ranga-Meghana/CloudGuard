from flask import Blueprint, jsonify, request

from ..db import get_repo
from ..services import resource_service
from ..utils.auth import login_required

bp = Blueprint("resources", __name__, url_prefix="/api")


@bp.get("/resources")
@login_required
def list_resources():
    repo = get_repo()
    items = resource_service.list_resources(repo, request.args.get("type"), request.args.get("q"),
                                            request.args.get("status"))
    return jsonify({"items": items, "count": len(items), "counts": resource_service.type_counts(repo)})


@bp.get("/resources/<resource_id>")
@login_required
def resource_detail(resource_id):
    return jsonify(resource_service.resource_detail(get_repo(), resource_id))


@bp.post("/resources/<resource_id>/action")
@login_required
def resource_action(resource_id):
    body = request.get_json(silent=True) or {}
    return jsonify(resource_service.perform_action(get_repo(), resource_id, body.get("action")))
