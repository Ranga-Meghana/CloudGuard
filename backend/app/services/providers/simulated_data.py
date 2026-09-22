"""Static catalogue for the simulated cloud environment: 24 fictional resources.

Numbers (cpu/memory/network) are the *typical* values; `spikes` inject a temporary anomaly
at a given "hours ago" index (0 = now) so the anomaly detector always has something to find.
"""


def ep(port, cidr="0.0.0.0/0"):
    return {"port": port, "protocol": "tcp", "cidr": cidr}


# Simulated on-demand monthly price per instance size (USD). Real AWS prices differ.
INSTANCE_PRICES = {"t3.micro": 6.0, "t3.small": 12.0, "t3.medium": 24.0,
                   "t3.large": 42.0, "t3.xlarge": 84.0, "t3.2xlarge": 168.0}
INSTANCE_ORDER = ["t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge", "t3.2xlarge"]

DEFAULT_CONFIG = {
    "public_access": False, "open_ports": [], "backup_enabled": True, "versioning": True,
    "encryption_enabled": True, "iam_policy": "least-privilege", "inactive_rules": 0,
    "autoscaling": False, "network_anomaly_ack": False,
}

RESOURCE_SPECS = [
    # ---------------------------------------------------------------- compute (10)
    dict(name="EC2-Production-01", type="compute", service="EC2", size="t3.large", region="us-east-1",
         cpu=64, memory=58, network=55, disk=46, cost=42.0, age_days=410, env="production", owner="platform"),
    dict(name="EC2-Production-02", type="compute", service="EC2", size="t3.large", region="us-east-1",
         cpu=61, memory=55, network=52, disk=44, cost=42.0, age_days=410, env="production", owner="platform"),
    dict(name="EC2-Production-03", type="compute", service="EC2", size="t3.xlarge", region="us-east-1",
         cpu=62, memory=68, network=60, disk=51, cost=84.0, age_days=380, env="production", owner="platform",
         config=dict(open_ports=[ep(22)]), spikes={"cpu": {0: 96, 1: 91}}),
    dict(name="EC2-Production-04", type="compute", service="EC2", size="t3.large", region="ap-south-1",
         cpu=14, memory=26, network=18, disk=38, cost=42.0, age_days=260, env="production", owner="platform"),
    dict(name="EC2-Analytics-01", type="compute", service="EC2", size="t3.large", region="ap-south-1",
         cpu=22, memory=41, network=30, disk=55, cost=42.0, age_days=200, env="analytics", owner="data-team"),
    dict(name="EC2-Analytics-02", type="compute", service="EC2", size="t3.large", region="eu-west-1",
         cpu=48, memory=52, network=36, disk=49, cost=42.0, age_days=200, env="analytics", owner="data-team",
         spikes={"network": {1: 88, 2: 84}}),
    dict(name="EC2-Staging-01", type="compute", service="EC2", size="t3.medium", region="us-west-2",
         cpu=27, memory=36, network=20, disk=30, cost=24.0, age_days=150, env="staging", owner="qa",
         config=dict(open_ports=[ep(8080)])),
    dict(name="EC2-Staging-02", type="compute", service="EC2", size="t3.medium", region="us-west-2",
         cpu=4, memory=12, network=3, disk=22, cost=24.0, age_days=150, env="staging", owner="qa",
         config=dict(inactive_rules=3)),
    dict(name="EC2-Worker-01", type="compute", service="EC2", size="t3.medium", region="us-east-1",
         cpu=55, memory=60, network=40, disk=42, cost=24.0, age_days=120, env="production", owner="platform",
         config=dict(iam_policy="wildcard")),
    dict(name="EC2-Worker-02", type="compute", service="EC2", size="t3.small", region="ap-south-1",
         cpu=46, memory=50, network=33, disk=40, cost=12.0, age_days=21, env="production", owner="platform"),
    # ---------------------------------------------------------------- storage (6)
    dict(name="Storage-Bucket-01", type="storage", service="S3", region="us-east-1", network=22,
         used_gb=620, capacity_gb=1000, age_days=500, env="production", owner="platform"),
    dict(name="Storage-Bucket-02", type="storage", service="S3", region="us-west-2", network=18,
         used_gb=310, capacity_gb=500, age_days=420, env="production", owner="data-team",
         config=dict(encryption_enabled=False)),
    dict(name="Storage-Bucket-03", type="storage", service="S3", region="eu-west-1", network=4,
         used_gb=900, capacity_gb=2000, age_days=700, env="archive", owner="data-team", last_accessed_days=210,
         config=dict(versioning=False)),
    dict(name="Storage-Bucket-04", type="storage", service="S3", region="us-east-1", network=27,
         used_gb=116, capacity_gb=200, age_days=90, env="production", owner="marketing",
         config=dict(public_access=True)),
    dict(name="Storage-Vol-01", type="storage", service="EBS", region="ap-south-1", network=None,
         used_gb=405, capacity_gb=500, age_days=260, env="production", owner="platform"),
    dict(name="Storage-Vol-02", type="storage", service="EBS", region="us-east-1", network=None,
         used_gb=30, capacity_gb=250, age_days=45, env="staging", owner="qa", attached=False),
    # ---------------------------------------------------------------- database (4)
    dict(name="DB-Main", type="database", service="RDS", size="db.t3.large · PostgreSQL 15", region="us-east-1",
         cpu=52, memory=66, network=40, used_gb=132, capacity_gb=200, cost=96.5, age_days=520,
         env="production", owner="platform", multi_az=True),
    dict(name="DB-Analytics", type="database", service="RDS", size="db.t3.medium · PostgreSQL 15", region="ap-south-1",
         cpu=45, memory=72, network=35, used_gb=72, capacity_gb=100, cost=48.2, age_days=300,
         env="analytics", owner="data-team", config=dict(backup_enabled=False), spikes={"memory": {6: 93}}),
    dict(name="DB-Reporting", type="database", service="RDS", size="db.t3.small · MySQL 8", region="eu-west-1",
         cpu=30, memory=44, network=25, used_gb=55, capacity_gb=100, cost=31.0, age_days=240,
         env="analytics", owner="data-team", config=dict(public_access=True)),
    dict(name="DB-Cache-01", type="database", service="ElastiCache", size="cache.t3.small · Redis 7", region="us-west-2",
         cpu=38, memory=57, network=45, used_gb=7, capacity_gb=20, cost=22.4, age_days=180,
         env="production", owner="platform"),
    # ---------------------------------------------------------------- network (4)
    dict(name="LB-Public-01", type="network", service="ALB", size="internet-facing", region="us-east-1", network=68,
         cost=24.3, age_days=500, env="production", owner="platform", config=dict(open_ports=[ep(443), ep(80)])),
    dict(name="LB-Internal-01", type="network", service="ALB", size="internal", region="ap-south-1", network=33,
         cost=21.6, age_days=260, env="production", owner="platform", config=dict(inactive_rules=2)),
    dict(name="NAT-Gateway-01", type="network", service="NAT Gateway", size="managed", region="us-east-1", network=74,
         cost=45.8, age_days=500, env="production", owner="platform"),
    dict(name="CDN-Edge-01", type="network", service="CloudFront", size="global", region="us-east-1", network=61,
         cost=18.9, age_days=330, env="production", owner="marketing"),
]

EVENT_TEMPLATES = {
    "compute": [("Instance status checks passed", "success"), ("Security group rules reviewed", "info"),
                ("OS security patches applied", "success"), ("Automated snapshot completed", "success"),
                ("Auto-recovery check completed", "info")],
    "storage": [("Lifecycle policy evaluated", "info"), ("Access log delivery verified", "success"),
                ("Replication check completed", "success"), ("Storage class analysis updated", "info")],
    "database": [("Automated snapshot completed", "success"), ("Minor engine patch scheduled", "info"),
                 ("Connection pool health check passed", "success"), ("Slow query report generated", "info")],
    "network": [("Health checks passing on all targets", "success"), ("Traffic report generated", "info"),
                ("Idle connection timeout reviewed", "info"), ("TLS certificate valid for 61 more days", "success")],
}

# Extra, resource-specific events (hours ago, message, level)
SPECIAL_EVENTS = {
    "EC2-Production-03": [(0.1, "CPU utilization exceeded 90%", "warning"),
                          (26, "Inbound SSH rule opened to 0.0.0.0/0", "warning")],
    "EC2-Analytics-02": [(1.1, "Network throughput spiked above baseline", "warning")],
    "DB-Analytics": [(6, "Memory utilization reached 93%", "warning"), (70, "Automated backups disabled", "warning")],
    "Storage-Bucket-04": [(21, "Public access block was disabled", "warning")],
    "Storage-Vol-02": [(140, "Volume detached from instance", "info")],
    "NAT-Gateway-01": [(5, "Data processing volume up 34% vs. last week", "warning")],
}
