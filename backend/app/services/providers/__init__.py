from .aws import AWSCloudProvider
from .base import CloudProvider
from .simulated import SimulatedCloudProvider


def get_provider(name: str = "simulated", **kwargs) -> CloudProvider:
    """Factory: pick the cloud provider from configuration (CLOUD_PROVIDER)."""
    if name == "aws":
        return AWSCloudProvider()
    return SimulatedCloudProvider(**kwargs)


__all__ = ["CloudProvider", "SimulatedCloudProvider", "AWSCloudProvider", "get_provider"]
