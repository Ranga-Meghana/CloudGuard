"""Fleet-level helpers shared by the provider and the services."""
from statistics import fmean


def fleet_utilization(resources: list) -> dict:
    """Average CPU / memory / storage / network across the resources that report them."""

    def avg(items, field):
        vals = [r[field] for r in items if r.get(field) is not None and r.get("status") != "stopped"]
        return round(fmean(vals), 1) if vals else 0.0

    with_cpu = [r for r in resources if r["type"] in ("compute", "database")]
    with_disk = [r for r in resources if r["type"] in ("storage", "database")]
    return {
        "cpu": avg(with_cpu, "cpu"),
        "memory": avg(with_cpu, "memory"),
        "storage": avg(with_disk, "storage"),
        "network": avg(resources, "network"),
    }
