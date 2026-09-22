"""Small UTC time helpers. All timestamps are stored as ISO-8601 strings ("2026-09-18T10:00:00Z")."""
from datetime import datetime, timedelta, timezone

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime(ISO_FMT)


def from_iso(value: str) -> datetime:
    return datetime.strptime(value, ISO_FMT).replace(tzinfo=timezone.utc)


def ago(now: datetime = None, **delta) -> str:
    """ago(now, hours=2) -> ISO string for two hours before `now`."""
    return to_iso((now or now_utc()) - timedelta(**delta))


def month_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def shift_month(dt: datetime, months: int) -> datetime:
    """First day of the month `months` away from dt (negative = past)."""
    index = dt.year * 12 + (dt.month - 1) + months
    return datetime(index // 12, index % 12 + 1, 1, tzinfo=timezone.utc)


def days_in_month(dt: datetime) -> int:
    nxt = shift_month(dt, 1)
    return (nxt - datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)).days
