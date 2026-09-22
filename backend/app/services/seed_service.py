"""Populate the database with a complete demo environment (24 resources, 90 days of metrics...).

Run from the CLI:   python seed.py [--reset]
It also runs automatically on first start when the database is empty (AUTO_SEED=true).
"""
import logging
from datetime import timedelta

from werkzeug.security import generate_password_hash

from ..models.schemas import COLLECTIONS
from ..utils.timeutil import now_utc, to_iso
from . import recommendation_engine, security_service
from .demo_data import demo_alerts
from .providers import get_provider

log = logging.getLogger(__name__)

DEMO_EMAIL = "demo@cloudguard.io"
DEMO_PASSWORD = "Demo@1234"

DEFAULT_SETTINGS = {
    "profile": {"timezone": "Asia/Kolkata"},
    "notifications": {"email_alerts": True, "push_alerts": True, "critical_only": False, "weekly_digest": True},
    "security": {"auto_scan": True, "scan_frequency": "daily", "alert_threshold": "medium", "require_mfa": True},
    "appearance": {"accent": "cyan", "scene": "aurora", "blur": "medium", "reduce_motion": False},
    "cloud": {"region": "ap-south-1"},
}


def seed_database(repo, provider_name="simulated", reset=False):
    if reset:
        repo.clear_all(COLLECTIONS)
    now = now_utc()
    provider = get_provider(provider_name, now=now)

    resources = provider.get_resources()
    repo.insert_many("resources", resources)
    metrics = provider.get_metrics(resources)
    repo.insert_many("metrics", metrics)
    repo.insert_many("cost_records", provider.get_cost_history(resources))

    repo.insert_many("users", [{
        "_id": "user-demo", "name": "Meghana", "email": DEMO_EMAIL, "role": "Cloud Administrator",
        "password_hash": generate_password_hash(DEMO_PASSWORD), "settings": DEFAULT_SETTINGS,
        "created_at": to_iso(now - timedelta(days=120)),
    }])

    repo.upsert("meta", {"_id": "platform", "last_refreshed": to_iso(now - timedelta(minutes=2)),
                         "last_scan": None, "baseline_security_score": 88,
                         "score_history": [82, 83, 85, 84, 86, 88, 88]})

    # security findings come from the real scanner, then we add a little history
    scan = security_service.run_scan(repo)
    repo.update("security_findings", "f-unrestricted_ports-res-003", {"status": "investigating"})
    repo.update("security_findings", "f-public_storage-res-014", {"detected_at": to_iso(now - timedelta(minutes=21))})
    history = [
        ("f-old-inactive-rule", "inactive_rules", "Inactive security rule", "low", "network", "LB-Public-01", 9),
        ("f-old-weak-access", "excessive_permissions", "Weak access configuration", "medium", "access", "EC2-Production-01", 12),
        ("f-old-open-port", "unrestricted_ports", "Unrestricted inbound port 3389 (RDP)", "high", "network", "EC2-Staging-01", 15),
    ]
    by_name = {r["name"]: r for r in resources}
    repo.insert_many("security_findings", [{
        "_id": fid, "rule_id": rule, "title": title, "severity": sev, "category": cat,
        "resource_id": by_name[name]["_id"], "resource_name": name, "resource_type": by_name[name]["type"],
        "description": f"{title} on {name} was fixed during a previous review.",
        "remediation": ["Already remediated"], "status": "resolved",
        "detected_at": to_iso(now - timedelta(days=days + 2)), "resolved_at": to_iso(now - timedelta(days=days)),
    } for fid, rule, title, sev, cat, name, days in history])
    repo.update("meta", "platform", {"last_scan": to_iso(now - timedelta(minutes=38))})

    by_resource = {}
    for p in metrics:
        if p["scope"] == "resource":
            by_resource.setdefault(p["resource_id"], []).append(p)
    repo.insert_many("recommendations", recommendation_engine.generate(resources, by_resource, now))
    repo.insert_many("alerts", demo_alerts(resources, now))
    security_service.refresh_resource_security(repo)
    log.info("Seeded demo environment: %d resources, %d metric points, %d findings",
             len(resources), len(metrics), scan["total_findings"])
    return {"resources": len(resources), "metrics": len(metrics), "findings": scan["total_findings"]}


def ensure_seeded(repo, config):
    if repo.count("resources") == 0 and config.get("AUTO_SEED", True):
        log.info("Database is empty -> seeding demo data")
        seed_database(repo, config.get("CLOUD_PROVIDER", "simulated"))
        return True
    return False
