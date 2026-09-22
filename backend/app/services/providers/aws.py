"""Future real-AWS provider (intentionally NOT implemented - no credentials are needed for the demo).

How to complete it (boto3 is the AWS SDK for Python):

    import boto3
    session = boto3.Session()                        # credentials from env / IAM role - never hard-coded

    get_resources()
        ec2  = session.client("ec2");  ec2.describe_instances()            -> compute
        s3   = session.client("s3");   s3.list_buckets(), get_public_access_block(),
                                       get_bucket_encryption(), get_bucket_versioning()  -> storage + security
        rds  = session.client("rds");  rds.describe_db_instances()           -> database
        elb  = session.client("elbv2");elb.describe_load_balancers()         -> network
        ec2.describe_security_groups() -> open_ports / inactive_rules ; iam.get_account_authorization_details()

    get_metrics()
        cw = session.client("cloudwatch")
        cw.get_metric_statistics(Namespace="AWS/EC2", MetricName="CPUUtilization", Period=3600, ...)
        (memory needs the CloudWatch agent: namespace "CWAgent")

    get_cost_history()
        ce = session.client("ce")
        ce.get_cost_and_usage(TimePeriod=..., Granularity="MONTHLY", Metrics=["UnblendedCost"],
                              GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}])

Each method must return the same document shapes as SimulatedCloudProvider so the rest of the
application (scanner, analytics, dashboard) works unchanged.
"""
from .base import CloudProvider


class AWSCloudProvider(CloudProvider):
    name = "aws"
    label = "AWS (Live)"

    def _todo(self):
        raise NotImplementedError(
            "AWSCloudProvider is a documented extension point. See the docstring of this module "
            "for the boto3 calls to implement, or use CLOUD_PROVIDER=simulated."
        )

    def get_resources(self):
        self._todo()

    def get_metrics(self, resources):
        self._todo()

    def get_cost_history(self, resources):
        self._todo()

    def refresh_metrics(self, resources, latest_fleet, latest_points, now):
        self._todo()
