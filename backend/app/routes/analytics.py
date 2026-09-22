from flask import Blueprint, jsonify, request

from ..db import get_repo
from ..services import analytics_service, anomaly_service
from ..utils.auth import login_required
from ..utils.errors import ValidationError

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@bp.get("")
@login_required
def analytics():
    range_key = request.args.get("range", "7d")
    if range_key not in analytics_service.WINDOWS:
        raise ValidationError("range must be one of: 24h, 7d, 30d, 90d")
    return jsonify(analytics_service.analytics(get_repo(), range_key))


@bp.get("/anomalies")
@login_required
def anomalies():
    items = anomaly_service.detect_anomalies(get_repo())
    limit = request.args.get("limit", type=int)
    return jsonify({"items": items[:limit] if limit else items, "count": len(items),
                    "method": anomaly_service.METHOD})
