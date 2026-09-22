"""Central configuration. Everything comes from environment variables (see .env.example)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _flag(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or "dev-only-secret-change-me-please-use-env-file"
    MONGO_URI = os.getenv("MONGO_URI", "").strip()
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "cloudguard")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CLOUD_PROVIDER = os.getenv("CLOUD_PROVIDER", "simulated").strip().lower()
    AUTO_SEED = _flag("AUTO_SEED", True)
    ALLOW_DEMO_LOGIN = _flag("ALLOW_DEMO_LOGIN", True)
    TOKEN_TTL_HOURS = int(os.getenv("TOKEN_TTL_HOURS", "12"))
    PORT = int(os.getenv("PORT", "5000"))

    @classmethod
    def cors_origins(cls):
        """FRONTEND_URL may hold several comma-separated origins."""
        origins = [o.strip().rstrip("/") for o in cls.FRONTEND_URL.split(",") if o.strip()]
        return origins or ["http://localhost:5173"]
