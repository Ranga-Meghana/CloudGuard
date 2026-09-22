from flask import Blueprint, jsonify

from ..db import get_repo
from ..services import cost_service
from ..utils.auth import login_required

bp = Blueprint("costs", __name__, url_prefix="/api/costs")


@bp.get("")
@login_required
def costs():
    return jsonify(cost_service.breakdown(get_repo()))


@bp.get("/summary")
@login_required
def summary():
    return jsonify(cost_service.summary(get_repo()))
