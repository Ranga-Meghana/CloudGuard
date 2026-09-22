from flask import Blueprint, jsonify, request

from ..db import get_repo
from ..models.schemas import SEVERITIES, SEVERITY_ORDER, clean_patch
from ..services import security_service
from ..utils.auth import login_required
from ..utils.errors import ValidationError

bp = Blueprint("security", __name__, url_prefix="/api/security")


@bp.get("/findings")
@login_required
def findings():
    repo = get_repo()
    query = {}
    for key in ("severity", "status"):
        if request.args.get(key):
            query[key] = request.args[key]
    items = repo.all("security_findings", query)
    q = (request.args.get("q") or "").lower().strip()
    if q:
        items = [f for f in items if q in f["title"].lower() or q in f["resource_name"].lower()]
    items.sort(key=lambda f: (f["status"] == "resolved", SEVERITY_ORDER[f["severity"]], f["detected_at"]))
    return jsonify({"items": items, "count": len(items), **security_service.summary(repo)})


@bp.patch("/findings/<finding_id>")
@login_required
def update_finding(finding_id):
    changes = clean_patch("security_findings", request.get_json(silent=True))
    repo = get_repo()
    updated = security_service.update_finding_status(repo, finding_id, changes["status"])
    return jsonify({"item": updated, **security_service.summary(repo)})


@bp.post("/scan")
@login_required
def scan():
    return jsonify(security_service.run_scan(get_repo()))


@bp.get("/score")
@login_required
def score():
    return jsonify(security_service.summary(get_repo()))
