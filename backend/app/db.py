"""Data-access layer.

Two interchangeable repositories expose the SAME small API:

  * MongoRepository   - real MongoDB / MongoDB Atlas (used when MONGO_URI works)
  * MemoryRepository  - in-memory demo store (automatic fallback, no database needed)

The rest of the code only talks to the `Repository` API, so the app runs identically
in both modes. Query filters support: equality, $in, $ne, $gt, $gte, $lt, $lte.
"""
import copy
import logging
import threading
import uuid
from abc import ABC, abstractmethod

from flask import current_app

log = logging.getLogger(__name__)


class Repository(ABC):
    mode = "abstract"

    @abstractmethod
    def all(self, coll, query=None, sort=None, limit=0): ...

    @abstractmethod
    def get(self, coll, doc_id): ...

    @abstractmethod
    def insert_many(self, coll, docs): ...

    @abstractmethod
    def update(self, coll, doc_id, changes): ...

    @abstractmethod
    def upsert(self, coll, doc): ...

    @abstractmethod
    def delete(self, coll, doc_id): ...

    @abstractmethod
    def delete_many(self, coll, query=None): ...

    @abstractmethod
    def count(self, coll, query=None): ...

    def insert_one(self, coll, doc):
        self.insert_many(coll, [doc])
        return doc

    def clear_all(self, collections):
        for name in collections:
            self.delete_many(name)

    def describe(self) -> dict:
        return {"mode": self.mode}


def _ensure_ids(docs):
    for doc in docs:
        doc.setdefault("_id", uuid.uuid4().hex[:16])
    return docs


# --------------------------------------------------------------------------- in-memory
def _matches(doc, query):
    for key, cond in (query or {}).items():
        val = doc.get(key)
        if isinstance(cond, dict):
            for op, arg in cond.items():
                if op == "$in" and val not in arg:
                    return False
                if op == "$ne" and val == arg:
                    return False
                if op in ("$gt", "$gte", "$lt", "$lte"):
                    if val is None:
                        return False
                    if op == "$gt" and not val > arg:
                        return False
                    if op == "$gte" and not val >= arg:
                        return False
                    if op == "$lt" and not val < arg:
                        return False
                    if op == "$lte" and not val <= arg:
                        return False
        elif val != cond:
            return False
    return True


class MemoryRepository(Repository):
    mode = "memory"

    def __init__(self):
        self._data = {}
        self._lock = threading.RLock()

    def _coll(self, name):
        return self._data.setdefault(name, {})

    def all(self, coll, query=None, sort=None, limit=0):
        with self._lock:
            docs = [d for d in self._coll(coll).values() if _matches(d, query)]
            for field, direction in reversed(sort or []):
                docs.sort(key=lambda d, f=field: (d.get(f) is None, d.get(f)), reverse=direction < 0)
            if limit:
                docs = docs[:limit]
            return copy.deepcopy(docs)

    def get(self, coll, doc_id):
        with self._lock:
            doc = self._coll(coll).get(doc_id)
            return copy.deepcopy(doc) if doc else None

    def insert_many(self, coll, docs):
        with self._lock:
            store = self._coll(coll)
            for doc in _ensure_ids(docs):
                store[doc["_id"]] = copy.deepcopy(doc)

    def update(self, coll, doc_id, changes):
        with self._lock:
            doc = self._coll(coll).get(doc_id)
            if doc is None:
                return None
            doc.update(copy.deepcopy(changes))
            return copy.deepcopy(doc)

    def upsert(self, coll, doc):
        with self._lock:
            self._coll(coll)[doc["_id"]] = copy.deepcopy(doc)

    def delete(self, coll, doc_id):
        with self._lock:
            return self._coll(coll).pop(doc_id, None) is not None

    def delete_many(self, coll, query=None):
        with self._lock:
            store = self._coll(coll)
            for doc_id in [i for i, d in store.items() if _matches(d, query)]:
                del store[doc_id]

    def count(self, coll, query=None):
        with self._lock:
            return sum(1 for d in self._coll(coll).values() if _matches(d, query))

    def describe(self):
        return {"mode": "memory", "note": "In-memory demo store (data resets when the server restarts)"}


# --------------------------------------------------------------------------- MongoDB
class MongoRepository(Repository):
    mode = "mongodb"

    def __init__(self, client, db_name):
        self.client = client
        self.db = client[db_name]
        self.db_name = db_name

    def ensure_indexes(self):
        self.db.metrics.create_index([("scope", 1), ("granularity", 1), ("ts", 1)])
        self.db.metrics.create_index([("resource_id", 1), ("ts", 1)])
        self.db.alerts.create_index([("status", 1), ("created_at", -1)])
        self.db.security_findings.create_index([("status", 1), ("severity", 1)])
        self.db.users.create_index("email", unique=True)

    def all(self, coll, query=None, sort=None, limit=0):
        cursor = self.db[coll].find(query or {})
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
        return list(cursor)

    def get(self, coll, doc_id):
        return self.db[coll].find_one({"_id": doc_id})

    def insert_many(self, coll, docs):
        if docs:
            self.db[coll].insert_many(_ensure_ids(docs))

    def update(self, coll, doc_id, changes):
        from pymongo import ReturnDocument

        return self.db[coll].find_one_and_update(
            {"_id": doc_id}, {"$set": changes}, return_document=ReturnDocument.AFTER
        )

    def upsert(self, coll, doc):
        self.db[coll].replace_one({"_id": doc["_id"]}, doc, upsert=True)

    def delete(self, coll, doc_id):
        return self.db[coll].delete_one({"_id": doc_id}).deleted_count > 0

    def delete_many(self, coll, query=None):
        self.db[coll].delete_many(query or {})

    def count(self, coll, query=None):
        return self.db[coll].count_documents(query or {})

    def describe(self):
        return {"mode": "mongodb", "database": self.db_name}


# --------------------------------------------------------------------------- factory
def create_repository(config) -> Repository:
    """Connect to MongoDB if MONGO_URI is set and reachable, otherwise fall back to memory."""
    uri = config.get("MONGO_URI", "")
    if not uri:
        log.warning("MONGO_URI is empty -> running in IN-MEMORY DEMO MODE")
        return MemoryRepository()
    try:
        from pymongo import MongoClient

        client = MongoClient(uri, serverSelectionTimeoutMS=4000)
        client.admin.command("ping")  # fail fast if the server is unreachable
        repo = MongoRepository(client, config["MONGO_DB_NAME"])
        repo.ensure_indexes()
        log.info("Connected to MongoDB database '%s'", config["MONGO_DB_NAME"])
        return repo
    except Exception as exc:  # noqa: BLE001 - any connection problem triggers the fallback
        log.warning("MongoDB unavailable (%s) -> falling back to IN-MEMORY DEMO MODE", type(exc).__name__)
        return MemoryRepository()


def get_repo() -> Repository:
    return current_app.extensions["repo"]
