"""Seed the database with the CloudGuard demo environment.

    python seed.py            # seed only if the database is empty
    python seed.py --reset    # wipe every collection and re-seed
"""
import argparse
import logging

from app.config import Config
from app.db import create_repository
from app.services.seed_service import DEMO_EMAIL, DEMO_PASSWORD, seed_database

logging.basicConfig(level=logging.INFO, format="%(message)s")

parser = argparse.ArgumentParser(description="Seed CloudGuard demo data")
parser.add_argument("--reset", action="store_true", help="delete existing data first")
args = parser.parse_args()

config = {k: getattr(Config, k) for k in dir(Config) if k.isupper()}
repo = create_repository(config)
if repo.mode != "mongodb":
    print("! MONGO_URI is not set or MongoDB is unreachable - nothing would be persisted. Set MONGO_URI first.")
elif repo.count("resources") and not args.reset:
    print("Database already contains data. Use --reset to wipe and re-seed.")
else:
    result = seed_database(repo, Config.CLOUD_PROVIDER, reset=args.reset)
    print(f"Seeded: {result}")
    print(f"Demo login -> {DEMO_EMAIL} / {DEMO_PASSWORD}")
