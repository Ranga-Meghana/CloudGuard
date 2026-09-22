"""API error type + JSON error handlers, so every failure returns clean JSON."""
import logging

from flask import jsonify
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = "bad_request"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


class NotFound(ApiError):
    def __init__(self, message="Resource not found"):
        super().__init__(message, 404, "not_found")


class ValidationError(ApiError):
    def __init__(self, message):
        super().__init__(message, 400, "validation_error")


class Unauthorized(ApiError):
    def __init__(self, message="Authentication required"):
        super().__init__(message, 401, "unauthorized")


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _api_error(err):
        return jsonify({"error": err.message, "code": err.code}), err.status

    @app.errorhandler(HTTPException)
    def _http_error(err):
        return jsonify({"error": err.description, "code": err.name.lower().replace(" ", "_")}), err.code

    @app.errorhandler(Exception)
    def _unhandled(err):
        log.exception("Unhandled error")
        return jsonify({"error": "Internal server error", "code": "internal_error"}), 500
