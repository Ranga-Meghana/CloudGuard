from flask import Blueprint, current_app, jsonify, request

from ..db import get_repo
from ..services import metrics_service
from ..services.dashboard_service import build_dashboard
from ..services.refresh_service import refresh_environment
from ..utils.auth import login_required

bp = Blueprint("dashboard", __name__, url_prefix="/api")


@bp.get("/dashboard")
@login_required
def dashboard():
    return jsonify(build_dashboard(get_repo()))


@bp.get("/metrics")
@login_required
def metrics():
    range_key = request.args.get("range", "24h")
    return jsonify({"range": range_key, "series": metrics_service.fleet_series(get_repo(), range_key)})


@bp.post("/refresh")
@login_required
def refresh():
    """'Refresh Data' button: pull fresh (simulated) metrics and update the environment."""
    return jsonify(refresh_environment(get_repo(), current_app.config["CLOUD_PROVIDER"]))
