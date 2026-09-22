"""Document shapes + validation rules for every MongoDB collection.

Documents are plain dicts (no ORM) so a student can read them easily.
All `_id` values are readable strings such as "res-001" or "f-public_storage-res-014".

users:              _id, name, email, password_hash, role, settings{...}
resources:          _id, name, type, service, size, region, status, cpu, memory, storage, network,
                    monthly_cost, base_cost, uptime{pct,days}, created_at, tags, config{...},
                    security_status, events[...]
security_findings:  _id, rule_id, title, severity, resource_id, resource_name, description,
                    remediation[...], status, detected_at, resolved_at
alerts:             _id, title, message, category, severity, resource_id, resource_name, status,
                    read, created_at
recommendations:    _id, category, title, description, resource_id, resource_name, reason, impact,
                    estimated_savings, priority, status, current_cost, recommended_cost, action{...}
cost_records:       _id, month ("YYYY-MM"), category, amount
metrics:            _id, scope ("fleet"|"resource"), granularity ("hour"|"minute"), ts, resource_id,
                    cpu, memory, network, storage, cost, security_events
meta:               _id ("platform"), last_refreshed, last_scan, baseline_security_score, score_history
"""
from ..utils.errors import ValidationError

COLLECTIONS = (
    "users", "resources", "security_findings", "alerts",
    "recommendations", "cost_records", "metrics", "meta",
)

RESOURCE_TYPES = ("compute", "storage", "database", "network")
SEVERITIES = ("critical", "high", "medium", "low")
SEVERITY_ORDER = {s: i for i, s in enumerate(SEVERITIES)}
ALERT_CATEGORIES = ("security", "performance", "cost", "system")
ALERT_STATUSES = ("open", "resolved", "archived")
FINDING_STATUSES = ("open", "investigating", "resolved")
REC_CATEGORIES = ("security", "cost", "performance", "reliability")
REC_STATUSES = ("open", "applied", "dismissed")
PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

# What a client is allowed to change with PATCH, per collection.
PATCH_RULES = {
    "alerts": {"read": bool, "status": ALERT_STATUSES},
    "security_findings": {"status": FINDING_STATUSES},
    "recommendations": {"status": REC_STATUSES},
}

SETTINGS_SCHEMA = {
    "notifications": {"email_alerts": bool, "push_alerts": bool, "critical_only": bool, "weekly_digest": bool},
    "security": {"auto_scan": bool, "scan_frequency": ("hourly", "daily", "weekly"),
                 "alert_threshold": ("low", "medium", "high"), "require_mfa": bool},
    "appearance": {"accent": ("cyan", "violet", "blue"), "scene": ("aurora", "dusk", "ocean"),
                   "blur": ("low", "medium", "high"), "reduce_motion": bool},
    "cloud": {"region": ("us-east-1", "us-west-2", "ap-south-1", "eu-west-1")},
    "profile": {"timezone": str},
}


def clean_patch(collection: str, payload) -> dict:
    """Validate a PATCH body against PATCH_RULES and return only the allowed fields."""
    if not isinstance(payload, dict) or not payload:
        raise ValidationError("Request body must be a non-empty JSON object")
    rules = PATCH_RULES[collection]
    cleaned = {}
    for key, value in payload.items():
        if key not in rules:
            raise ValidationError(f"Field '{key}' cannot be updated")
        rule = rules[key]
        if rule is bool:
            if not isinstance(value, bool):
                raise ValidationError(f"'{key}' must be true or false")
        elif value not in rule:
            raise ValidationError(f"'{key}' must be one of: {', '.join(rule)}")
        cleaned[key] = value
    return cleaned


def clean_settings(payload) -> dict:
    """Validate the nested settings object sent to PATCH /api/profile."""
    if not isinstance(payload, dict):
        raise ValidationError("'settings' must be an object")
    cleaned = {}
    for section, values in payload.items():
        if section not in SETTINGS_SCHEMA or not isinstance(values, dict):
            raise ValidationError(f"Unknown settings section '{section}'")
        cleaned[section] = {}
        for key, value in values.items():
            rule = SETTINGS_SCHEMA[section].get(key)
            if rule is None:
                raise ValidationError(f"Unknown setting '{section}.{key}'")
            ok = isinstance(value, bool) if rule is bool else isinstance(value, str) if rule is str else value in rule
            if not ok:
                raise ValidationError(f"Invalid value for '{section}.{key}'")
            cleaned[section][key] = value
    return cleaned
