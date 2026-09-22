"""Tiny JWT helper + @login_required decorator (simple, student-friendly auth)."""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from .errors import Unauthorized


def create_token(user: dict) -> str:
    cfg = current_app.config
    payload = {
        "sub": user["_id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=cfg["TOKEN_TTL_HOURS"]),
    }
    return jwt.encode(payload, cfg["SECRET_KEY"], algorithm="HS256")


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            raise Unauthorized("Missing bearer token")
        try:
            claims = jwt.decode(header[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise Unauthorized("Session expired, please sign in again")
        except jwt.PyJWTError:
            raise Unauthorized("Invalid token")
        g.user_id = claims["sub"]
        return fn(*args, **kwargs)

    return wrapper
