import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app  # noqa: E402
from app.config import Config  # noqa: E402
from app.db import MemoryRepository, MongoRepository  # noqa: E402


class TestConfig(Config):
    MONGO_URI = ""
    SECRET_KEY = "test-secret-key-that-is-long-enough-for-hs256"
    TESTING = True


def _client(repo):
    app = create_app(TestConfig, repo=repo)
    client = app.test_client()
    token = client.post("/api/auth/demo").get_json()["token"]
    client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return client


@pytest.fixture(params=["memory", "mongodb"])
def client(request):
    """Every test runs against the in-memory store AND the MongoDB code path (via mongomock)."""
    if request.param == "memory":
        return _client(MemoryRepository())
    import mongomock
    return _client(MongoRepository(mongomock.MongoClient(), "cloudguard_test"))
