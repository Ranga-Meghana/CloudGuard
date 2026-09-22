"""CloudGuard API - application factory."""
import logging

from flask import Flask
from flask_cors import CORS

from .config import Config
from .db import create_repository
from .services.refresh_service import ensure_fresh
from .services.seed_service import ensure_seeded
from .utils.errors import register_error_handlers


def create_app(config_class=Config, repo=None):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app = Flask(__name__)
    app.config.from_object(config_class)

    if app.config["SECRET_KEY"] == "dev-only-secret-change-me-please-use-env-file":
        app.logger.warning("SECRET_KEY is not set - using an insecure development key")

    CORS(app, resources={r"/api/*": {"origins": config_class.cors_origins()}},
         allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

    app.extensions["repo"] = repo or create_repository(app.config)
    ensure_seeded(app.extensions["repo"], app.config)
    ensure_fresh(app.extensions["repo"], app.config["CLOUD_PROVIDER"])

    from .routes import ALL_BLUEPRINTS
    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)

    register_error_handlers(app)

    @app.get("/")
    def index():
        return {"service": "CloudGuard API", "docs": "See README.md - try GET /api/health"}

    return app
