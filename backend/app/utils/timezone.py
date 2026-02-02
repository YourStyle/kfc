from datetime import datetime, timezone, timedelta

# Moscow timezone (UTC+3)
MOSCOW_TZ = timezone(timedelta(hours=3))


def now_moscow():
    """Get current time in Moscow timezone"""
    return datetime.now(MOSCOW_TZ).replace(tzinfo=None)


def utc_to_moscow(dt):
    """Convert UTC datetime to Moscow time"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(MOSCOW_TZ).replace(tzinfo=None)
