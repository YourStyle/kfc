from datetime import datetime, timezone, timedelta

# Moscow timezone (UTC+3)
MOSCOW_TZ = timezone(timedelta(hours=3))


def now_moscow():
    """Get current time in Moscow timezone"""
    return datetime.now(MOSCOW_TZ).replace(tzinfo=None)
