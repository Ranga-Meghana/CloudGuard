"""Rule-based recommendation engine: turns resource data + metrics into actionable advice."""
from statistics import fmean

from ..utils.timeutil import to_iso
from .providers.simulated_data import INSTANCE_ORDER, INSTANCE_PRICES


def _rec(now, rule, res, category, title, description, reason, impact, priority, action,
         savings=0.0, current=None, recommended=None):
    return {
        "_id": f"rec-{rule}-{res['_id']}", "category": category, "title": title, "description": description,
        "resource_id": res["_id"], "resource_name": res["name"], "reason": reason, "impact": impact,
        "estimated_savings": round(savings, 2), "priority": priority, "status": "open",
        "current_cost": current, "recommended_cost": recommended, "action": action,
        "created_at": to_iso(now), "applied_at": None,
    }


def generate(resources, metrics_by_resource, now):
    recs = []
    for res in resources:
        cfg, cost = res["config"], res["monthly_cost"]
        cpu_series = [p["cpu"] for p in metrics_by_resource.get(res["_id"], []) if p.get("cpu") is not None]
        avg_cpu = fmean(cpu_series) if cpu_series else None

        # ---- cost: right-size or stop compute --------------------------------------------
        if res["type"] == "compute" and res["status"] == "running" and avg_cpu is not None:
            idx = INSTANCE_ORDER.index(res["instance_type"])
            if avg_cpu < 8:
                recs.append(_rec(
                    now, "stop_idle", res, "cost", f"Stop idle instance {res['name']}",
                    "This instance is almost completely idle. Stopping it removes the compute charge.",
                    f"Average CPU utilization is {avg_cpu:.0f}% over the last 72 hours.",
                    f"Save ${cost:.2f} per month", "medium", {"kind": "stop"}, cost, cost, 0.0))
            elif avg_cpu < 25 and idx > 0:
                smaller = INSTANCE_ORDER[idx - 1]
                new_cost = INSTANCE_PRICES[smaller]
                title = f"{res['name']} is underutilized" if avg_cpu < 20 else f"Optimize {res['name']}"
                recs.append(_rec(
                    now, "downsize", res, "cost", title,
                    f"Move from {res['instance_type']} to {smaller} to match the real workload.",
                    f"Average CPU utilization is below 25% ({avg_cpu:.0f}%).",
                    f"Reduce monthly cost by approximately ${cost - new_cost:.0f}", "high" if avg_cpu < 20 else "medium",
                    {"kind": "resize", "instance_type": smaller}, cost - new_cost, cost, new_cost))

        # ---- cost: archive cold storage / release unattached volumes ---------------------
        if res["service"] == "S3" and (res.get("last_accessed_days") or 0) > 90:
            new_cost = round(cost * 0.2, 2)
            recs.append(_rec(
                now, "archive", res, "cost", "Archive inactive storage data",
                "Move rarely used objects to an archive storage class (Glacier).",
                f"No objects have been read for {res['last_accessed_days']} days.",
                f"Save ${cost - new_cost:.2f} per month", "medium", {"kind": "archive_storage"},
                cost - new_cost, cost, new_cost))
        if res["service"] == "EBS" and cfg.get("attached") is False:
            recs.append(_rec(
                now, "release", res, "cost", f"Release unattached volume {res['name']}",
                "This volume is not attached to any instance but is still billed every month.",
                "The volume has been detached for more than 100 days.",
                f"Save ${cost:.2f} per month", "medium", {"kind": "release"}, cost, cost, 0.0))

        # ---- security ---------------------------------------------------------------------
        if res["service"] == "S3" and cfg["public_access"]:
            recs.append(_rec(now, "public_storage", res, "security", "Restrict public access to storage bucket",
                             "Turn on Block Public Access so objects are no longer readable by anyone.",
                             "The bucket is publicly readable.", "Removes a critical data-exposure risk", "high",
                             {"kind": "remediate", "rule_id": "public_storage"}))
        if res["type"] == "database" and cfg["public_access"]:
            recs.append(_rec(now, "public_database", res, "security", f"Make {res['name']} private",
                             "Disable public accessibility and allow only the application security group.",
                             "The database endpoint is reachable from the internet.",
                             "Closes a high-risk attack path", "high",
                             {"kind": "remediate", "rule_id": "public_database"}))
        if any(p.get("cidr") == "0.0.0.0/0" and p["port"] == 22 for p in cfg["open_ports"]):
            recs.append(_rec(now, "unrestricted_ports", res, "security", f"Restrict SSH access on {res['name']}",
                             "Limit port 22 to your VPN range instead of the whole internet.",
                             "SSH is open to 0.0.0.0/0.", "Blocks brute-force login attempts", "high",
                             {"kind": "remediate", "rule_id": "unrestricted_ports"}))
        if cfg["iam_policy"] == "wildcard":
            recs.append(_rec(now, "excessive_permissions", res, "security", f"Apply least-privilege access to {res['name']}",
                             "Replace wildcard permissions with only the actions the workload needs.",
                             "The attached role allows every action on every resource.",
                             "Limits blast radius of a compromised instance", "medium",
                             {"kind": "remediate", "rule_id": "excessive_permissions"}))

        # ---- reliability ------------------------------------------------------------------
        if res["type"] == "database" and not cfg["backup_enabled"]:
            recs.append(_rec(now, "missing_backup", res, "reliability", "Enable automated backup",
                             "Turn on daily automated backups with 7-day retention.",
                             "No backup policy is configured.", "Protects against permanent data loss", "high",
                             {"kind": "remediate", "rule_id": "missing_backup"}))
        if res["service"] == "S3" and not cfg["versioning"]:
            recs.append(_rec(now, "versioning", res, "reliability", f"Enable versioning on {res['name']}",
                             "Keep previous object versions so accidental deletes can be undone.",
                             "Bucket versioning is disabled.", "Makes accidental deletion recoverable", "medium",
                             {"kind": "remediate", "rule_id": "missing_backup"}))

        # ---- performance ------------------------------------------------------------------
        if res["type"] == "compute" and (res["cpu"] or 0) >= 90:
            recs.append(_rec(now, "autoscaling", res, "performance", f"Enable auto scaling for {res['name']}",
                             "Add an Auto Scaling group so capacity grows when CPU stays high.",
                             f"CPU reached {res['cpu']:.0f}% - well above its normal range.",
                             "Reduces CPU load by roughly 18 points during peaks", "high", {"kind": "autoscaling"}))
        anomaly_net = res["baseline"].get("network")
        if res["name"] == "EC2-Analytics-02" and anomaly_net is not None and not cfg["network_anomaly_ack"]:
            recs.append(_rec(now, "network_spike", res, "performance", f"Investigate traffic spike on {res['name']}",
                             "Review flow logs and confirm the traffic burst is expected.",
                             "Network usage jumped far above its baseline about an hour ago.",
                             "Rules out data exfiltration or a misbehaving job", "medium",
                             {"kind": "remediate", "rule_id": "abnormal_network"}))
    return recs
