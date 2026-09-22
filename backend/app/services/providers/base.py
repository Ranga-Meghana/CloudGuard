"""Cloud provider abstraction.

    CloudProvider (this file)
        |-- SimulatedCloudProvider   <- used today: realistic fictional data, no credentials
        '-- AWSCloudProvider         <- future: same interface, backed by boto3

The rest of CloudGuard (database seeding, refresh, scanner, analytics) only depends on this
interface. To go live on AWS you implement AWSCloudProvider and set CLOUD_PROVIDER=aws.
"""
from abc import ABC, abstractmethod


class CloudProvider(ABC):
    name = "base"
    label = "Base provider"

    @abstractmethod
    def get_resources(self) -> list:
        """Inventory: compute, storage, database and network resources (incl. security config)."""

    @abstractmethod
    def get_metrics(self, resources: list) -> list:
        """Historical utilisation metrics (fleet-level and per-resource time series)."""

    @abstractmethod
    def get_cost_history(self, resources: list) -> list:
        """Monthly cost records grouped by service category."""

    @abstractmethod
    def refresh_metrics(self, resources: list, latest_fleet: dict, latest_points: dict, now) -> dict:
        """Return NEW metric points since the last sync (used by the "Refresh Data" button)."""
