"""Demo alerts (platform-generated content, not cloud-provider data)."""
from datetime import timedelta

from ..utils.timeutil import to_iso


def demo_alerts(resources, now):
    rid = {r["name"]: r["_id"] for r in resources}
    # (id, title, message, category, severity, minutes_ago, resource, status, read)
    rows = [
        ("high-cpu", "High CPU usage detected", "CPU utilization exceeded 90% for 2 consecutive samples.",
         "performance", "high", 8, "EC2-Production-03", "open", False),
        ("public-bucket", "Public storage exposure", "The bucket allows public read access to its objects.",
         "security", "critical", 21, "Storage-Bucket-04", "open", False),
        ("net-activity", "Unusual network activity", "Outbound traffic is far above the 72-hour baseline.",
         "security", "medium", 63, "EC2-Analytics-02", "open", False),
        ("nat-cost", "NAT gateway cost spike", "Data processing charges are 34% higher than last week.",
         "cost", "medium", 300, "NAT-Gateway-01", "open", False),
        ("db-backup", "Database backup policy missing", "Automated backups are disabled on this instance.",
         "system", "high", 60 * 30, "DB-Analytics", "open", False),
        ("db-memory", "Memory pressure on database", "Memory utilization reached 93% and swap usage increased.",
         "performance", "medium", 60 * 34, "DB-Analytics", "open", True),
        ("idle-instance", "Idle resource detected", "CPU has stayed below 5% for 3 days.",
         "cost", "low", 60 * 50, "EC2-Staging-02", "open", True),
        ("disk-80", "Disk usage above 80%", "Volume usage passed the 80% warning threshold.",
         "system", "medium", 60 * 26, "Storage-Vol-01", "resolved", True),
        ("ssh-open", "SSH open to the internet", "Inbound port 22 is open to 0.0.0.0/0.",
         "security", "high", 60 * 27, "EC2-Production-03", "resolved", True),
        ("budget-80", "Budget threshold reached", "Month-to-date spend reached 80% of the monthly budget.",
         "cost", "medium", 60 * 24 * 4, "NAT-Gateway-01", "resolved", True),
        ("maintenance", "Maintenance window completed", "Scheduled patching finished successfully.",
         "system", "low", 60 * 24 * 5, "EC2-Production-01", "resolved", True),
        ("failed-logins", "Failed login attempts spike", "Repeated failed console sign-ins were detected.",
         "security", "medium", 60 * 24 * 6, "EC2-Worker-01", "archived", True),
        ("lb-latency", "Load balancer latency elevated", "p95 latency exceeded 800 ms for 10 minutes.",
         "performance", "low", 60 * 24 * 7, "LB-Public-01", "archived", True),
    ]
    docs = []
    for key, title, message, category, severity, minutes, name, status, read in rows:
        docs.append({"_id": f"alert-{key}", "title": title, "message": message, "category": category,
                     "severity": severity, "resource_id": rid.get(name), "resource_name": name,
                     "status": status, "read": read, "created_at": to_iso(now - timedelta(minutes=minutes))})
    return docs
