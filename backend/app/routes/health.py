from flask import Blueprint, current_app, jsonify

from ..db import get_repo
from ..utils.timeutil import now_utc, to_iso

bp = Blueprint("health", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    repo = get_repo()
    return jsonify({
        "status": "ok",
        "service": "cloudguard-api",
        "time": to_iso(now_utc()),
        "database": repo.describe(),
        "provider": {"name": current_app.config["CLOUD_PROVIDER"], "label": "AWS (Simulation)"},
        "demo_environment": True,
    })
