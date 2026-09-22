"""Demo security scanner.

Predefined checks run against the (simulated) resource configuration stored in the database.
Each check ("rule") inspects one resource and may return an issue. Findings get a stable id
(f-<rule>-<resource>) so re-scanning keeps the status a user already set.
"""
import time

from ..models.schemas import SEVERITY_ORDER, SEVERITIES
from ..utils.errors import NotFound
from ..utils.timeutil import now_utc, to_iso
from .anomaly_service import detect_anomalies

SENSITIVE_PORTS = {22: "SSH", 3389: "RDP", 3306: "MySQL", 5432: "PostgreSQL", 1433: "SQL Server",
                   6379: "Redis", 27017: "MongoDB"}
ALLOWED_PUBLIC_PORTS = {80, 443}
WORLD = "0.0.0.0/0"
ACTIVE = ("open", "investigating")

# Score = 100 - sum(weights of active findings)
SEVERITY_WEIGHTS = {"critical": 2.0, "high": 1.2, "medium": 0.5, "low": 0.2}


def _risky_ports(res):
    return [p["port"] for p in res["config"].get("open_ports", [])
            if p.get("cidr") == WORLD and p["port"] not in ALLOWED_PUBLIC_PORTS]


# ------------------------------------------------------------------ rules
def check_public_storage(res, ctx):
    if res["type"] == "storage" and res["service"] == "S3" and res["config"]["public_access"]:
        return dict(severity="critical", category="storage", title="Publicly accessible storage bucket",
                    description=f"{res['name']} allows public read access. Anyone on the internet can list and download its objects.",
                    remediation=["Enable S3 Block Public Access on the bucket",
                                 "Review the bucket policy and remove wildcard principals",
                                 "Audit access logs for unexpected downloads"])


def check_public_database(res, ctx):
    if res["type"] == "database" and res["config"]["public_access"]:
        return dict(severity="high", category="access", title="Database reachable from the public internet",
                    description=f"{res['name']} is publicly accessible. Databases should only accept connections from private subnets.",
                    remediation=["Disable 'Publicly accessible' on the DB instance",
                                 "Allow traffic only from the application security group"])


def check_unrestricted_ports(res, ctx):
    ports = _risky_ports(res)
    if not ports:
        return None
    sensitive = [p for p in ports if p in SENSITIVE_PORTS]
    label = ", ".join(f"{p} ({SENSITIVE_PORTS[p]})" if p in SENSITIVE_PORTS else str(p) for p in ports)
    return dict(severity="high" if sensitive else "medium", category="network",
                title=f"Unrestricted inbound port {label}",
                description=f"{res['name']} accepts traffic on port {label} from 0.0.0.0/0 (the whole internet).",
                remediation=["Restrict the source CIDR to your office or VPN range",
                             "Use AWS Systems Manager Session Manager instead of open SSH/RDP"])


def check_missing_backup(res, ctx):
    cfg = res["config"]
    if res["type"] == "database" and not cfg["backup_enabled"]:
        return dict(severity="high", category="reliability", title="Missing backup policy",
                    description=f"Automated backups are disabled on {res['name']}. A failure could cause permanent data loss.",
                    remediation=["Enable automated backups with 7-day retention", "Test a point-in-time restore"])
    if res["type"] == "storage" and res["service"] == "S3" and not cfg["versioning"]:
        return dict(severity="medium", category="reliability", title="Missing backup policy",
                    description=f"Versioning is off on {res['name']}, so deleted or overwritten objects cannot be recovered.",
                    remediation=["Enable bucket versioning", "Add a lifecycle rule to expire old versions"])


def check_encryption(res, ctx):
    if res["type"] in ("storage", "database") and not res["config"]["encryption_enabled"]:
        return dict(severity="medium", category="config", title="Encryption at rest disabled",
                    description=f"{res['name']} stores data without server-side encryption.",
                    remediation=["Enable default encryption (SSE-S3 or KMS)", "Re-encrypt existing objects"])


def check_permissions(res, ctx):
    if res["config"]["iam_policy"] == "wildcard":
        return dict(severity="medium", category="access", title="Excessive access permissions",
                    description=f"The role attached to {res['name']} grants wildcard (*) permissions.",
                    remediation=["Replace '*' actions with the minimum required permissions",
                                 "Use IAM Access Analyzer to generate a least-privilege policy"])


def check_inactive_rules(res, ctx):
    n = res["config"]["inactive_rules"]
    if n > 0:
        return dict(severity="low", category="network", title="Inactive security rule",
                    description=f"{res['name']} has {n} security-group rule(s) with no traffic in 90 days.",
                    remediation=["Remove rules that are no longer needed", "Document the remaining rules"])


def check_network_anomaly(res, ctx):
    if res["config"].get("network_anomaly_ack"):
        return None
    anomaly = ctx["network_anomalies"].get(res["_id"])
    if anomaly:
        return dict(severity="medium", category="network", title="Abnormal network activity",
                    description=f"Network usage on {res['name']} reached {anomaly['value']:.0f}% "
                                f"(normal {anomaly['baseline_low']:.0f}-{anomaly['baseline_high']:.0f}%).",
                    remediation=["Inspect VPC flow logs for unknown destinations", "Rotate credentials if data exfiltration is suspected"])


RULES = [
    ("public_storage", "Public storage exposure", check_public_storage),
    ("public_database", "Public database access", check_public_database),
    ("unrestricted_ports", "Unrestricted inbound ports", check_unrestricted_ports),
    ("missing_backup", "Backup & versioning", check_missing_backup),
    ("no_encryption", "Encryption at rest", check_encryption),
    ("excessive_permissions", "Excessive permissions", check_permissions),
    ("inactive_rules", "Inactive security rules", check_inactive_rules),
    ("abnormal_network", "Abnormal network activity", check_network_anomaly),
]


# ------------------------------------------------------------------ scoring
def compute_score(findings):
    penalty = sum(SEVERITY_WEIGHTS[f["severity"]] for f in findings if f["status"] in ACTIVE)
    return max(0, int(100 - penalty + 0.5))


def severity_counts(findings):
    counts = {s: 0 for s in SEVERITIES}
    for f in findings:
        if f["status"] in ACTIVE:
            counts[f["severity"]] += 1
    return counts


def summary(repo):
    findings = repo.all("security_findings")
    meta = repo.get("meta", "platform") or {}
    score = compute_score(findings)
    baseline = meta.get("baseline_security_score", score)
    return {
        "score": score, "counts": severity_counts(findings),
        "total_active": sum(1 for f in findings if f["status"] in ACTIVE),
        "baseline_score": baseline,
        "change_pct": round((score - baseline) / baseline * 100, 1) if baseline else 0.0,
        "last_scan": meta.get("last_scan"),
    }


def refresh_resource_security(repo):
    """Set each resource's security_status from its active findings."""
    worst = {}
    for f in repo.all("security_findings"):
        if f["status"] in ACTIVE:
            cur = worst.get(f["resource_id"])
            if cur is None or SEVERITY_ORDER[f["severity"]] < SEVERITY_ORDER[cur]:
                worst[f["resource_id"]] = f["severity"]
    for res in repo.all("resources"):
        sev = worst.get(res["_id"])
        status = "secure" if sev is None else "critical" if sev in ("critical", "high") else "warning"
        if res.get("security_status") != status:
            repo.update("resources", res["_id"], {"security_status": status})


# ------------------------------------------------------------------ scan
def run_scan(repo):
    started = time.perf_counter()
    now = to_iso(now_utc())
    resources = repo.all("resources")
    network_anomalies = {a["resource_id"]: a for a in detect_anomalies(repo, ("network",), include_fleet=False)}
    ctx = {"network_anomalies": network_anomalies}

    detected, per_rule = {}, []
    for rule_id, name, check in RULES:
        hits = 0
        for res in resources:
            issue = check(res, ctx)
            if issue:
                hits += 1
                fid = f"f-{rule_id}-{res['_id']}"
                detected[fid] = {**issue, "_id": fid, "rule_id": rule_id, "resource_id": res["_id"],
                                 "resource_name": res["name"], "resource_type": res["type"]}
        per_rule.append({"id": rule_id, "name": name, "issues": hits})

    existing = {f["_id"]: f for f in repo.all("security_findings")}
    new_count = 0
    for fid, issue in detected.items():
        old = existing.get(fid)
        if old is None:
            repo.insert_many("security_findings", [{**issue, "status": "open", "detected_at": now, "resolved_at": None}])
            new_count += 1
        elif old["status"] == "resolved":
            repo.update("security_findings", fid, {**issue, "status": "open", "detected_at": now, "resolved_at": None})
            new_count += 1
        else:  # keep the status the user already set, refresh the text
            repo.update("security_findings", fid, {k: v for k, v in issue.items() if k != "_id"})
    for fid, old in existing.items():
        if fid not in detected and old["status"] in ACTIVE:
            repo.update("security_findings", fid, {"status": "resolved", "resolved_at": now})

    meta = repo.get("meta", "platform") or {"_id": "platform"}
    meta["last_scan"] = now
    repo.upsert("meta", meta)
    refresh_resource_security(repo)

    stats = summary(repo)
    return {
        "scanned_resources": len(resources), "checks_run": per_rule,
        "total_findings": stats["total_active"], "new_findings": new_count,
        "counts": stats["counts"], "score": stats["score"],
        "duration_ms": int((time.perf_counter() - started) * 1000), "completed_at": now,
    }


# ------------------------------------------------------------------ remediation (simulated)
def remediate(repo, resource_id, rule_id):
    """Apply the fix for a rule to the resource configuration and resolve the matching finding."""
    res = repo.get("resources", resource_id)
    if not res:
        raise NotFound("Resource not found")
    cfg = res["config"]
    if rule_id in ("public_storage", "public_database"):
        cfg["public_access"] = False
    elif rule_id == "unrestricted_ports":
        cfg["open_ports"] = [p for p in cfg["open_ports"] if p.get("cidr") != WORLD or p["port"] in ALLOWED_PUBLIC_PORTS]
    elif rule_id == "missing_backup":
        cfg["backup_enabled"] = True
        cfg["versioning"] = True
    elif rule_id == "no_encryption":
        cfg["encryption_enabled"] = True
    elif rule_id == "excessive_permissions":
        cfg["iam_policy"] = "least-privilege"
    elif rule_id == "inactive_rules":
        cfg["inactive_rules"] = 0
    elif rule_id == "abnormal_network":
        cfg["network_anomaly_ack"] = True
    events = [{"time": to_iso(now_utc()), "message": f"Security issue remediated ({rule_id.replace('_', ' ')})",
               "level": "success"}] + res.get("events", [])
    repo.update("resources", resource_id, {"config": cfg, "events": events[:8]})
    fid = f"f-{rule_id}-{resource_id}"
    if repo.get("security_findings", fid):
        repo.update("security_findings", fid, {"status": "resolved", "resolved_at": to_iso(now_utc())})
    refresh_resource_security(repo)


def update_finding_status(repo, finding_id, status):
    finding = repo.get("security_findings", finding_id)
    if not finding:
        raise NotFound("Finding not found")
    if status == "resolved":
        if finding.get("rule_id") and repo.get("resources", finding["resource_id"]):
            remediate(repo, finding["resource_id"], finding["rule_id"])
        return repo.update("security_findings", finding_id,
                           {"status": "resolved", "resolved_at": to_iso(now_utc())})
    updated = repo.update("security_findings", finding_id, {"status": status, "resolved_at": None})
    refresh_resource_security(repo)
    return updated
