from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash

from ..db import get_repo
from ..models.schemas import clean_settings
from ..services.seed_service import DEMO_EMAIL
from ..utils.auth import create_token, login_required
from ..utils.errors import ApiError, NotFound, Unauthorized, ValidationError

bp = Blueprint("auth", __name__, url_prefix="/api")


def public_user(user):
    return {k: v for k, v in user.items() if k != "password_hash"}


@bp.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    email, password = str(body.get("email", "")).strip().lower(), str(body.get("password", ""))
    if not email or not password:
        raise ValidationError("Email and password are required")
    users = get_repo().all("users", {"email": email})
    if not users or not check_password_hash(users[0]["password_hash"], password):
        raise Unauthorized("Invalid email or password")
    return jsonify({"token": create_token(users[0]), "user": public_user(users[0])})


@bp.post("/auth/demo")
def demo_login():
    """One-click demo sign-in used by the 'Continue with Demo Account' button."""
    if not current_app.config["ALLOW_DEMO_LOGIN"]:
        raise ApiError("Demo login is disabled on this server", 403, "forbidden")
    users = get_repo().all("users", {"email": DEMO_EMAIL})
    if not users:
        raise NotFound("Demo user not found - run `python seed.py`")
    return jsonify({"token": create_token(users[0]), "user": public_user(users[0])})


@bp.get("/profile")
@login_required
def profile():
    user = get_repo().get("users", g.user_id)
    if not user:
        raise Unauthorized("Account no longer exists")
    return jsonify(public_user(user))


@bp.patch("/profile")
@login_required
def update_profile():
    repo, body = get_repo(), request.get_json(silent=True) or {}
    user = repo.get("users", g.user_id)
    if not user:
        raise Unauthorized("Account no longer exists")
    changes = {}
    if "name" in body:
        name = str(body["name"]).strip()
        if not 1 <= len(name) <= 60:
            raise ValidationError("Name must be 1-60 characters")
        changes["name"] = name
    if "settings" in body:
        settings = user.get("settings", {})
        for section, values in clean_settings(body["settings"]).items():
            settings[section] = {**settings.get(section, {}), **values}
        changes["settings"] = settings
    if not changes:
        raise ValidationError("Nothing to update")
    return jsonify(public_user(repo.update("users", g.user_id, changes)))
