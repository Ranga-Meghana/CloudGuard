from .alerts import bp as alerts_bp
from .analytics import bp as analytics_bp
from .auth import bp as auth_bp
from .costs import bp as costs_bp
from .dashboard import bp as dashboard_bp
from .health import bp as health_bp
from .recommendations import bp as recommendations_bp
from .resources import bp as resources_bp
from .security import bp as security_bp

ALL_BLUEPRINTS = [health_bp, auth_bp, dashboard_bp, resources_bp, security_bp, costs_bp,
                  analytics_bp, alerts_bp, recommendations_bp]
