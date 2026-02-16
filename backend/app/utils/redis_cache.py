"""
Redis utilities for caching and rate limiting.
Provides graceful fallback when Redis is unavailable.
"""
import json
import functools
from flask import request, jsonify
from datetime import datetime

# Will be set by app initialization
redis_client = None


def init_redis(client):
    """Initialize Redis client from app"""
    global redis_client
    redis_client = client


def get_redis():
    """Get Redis client (may be None if unavailable)"""
    return redis_client


# ==================== VERIFICATION CODES ====================

VERIFICATION_CODE_TTL = 300  # 5 minutes
VERIFICATION_CODE_PREFIX = "verify:"


def store_verification_code(email: str, code: str) -> bool:
    """
    Store verification code in Redis with TTL.
    Returns True if stored successfully, False if Redis unavailable.
    """
    if not redis_client:
        return False

    key = f"{VERIFICATION_CODE_PREFIX}{email.lower()}"
    try:
        redis_client.setex(key, VERIFICATION_CODE_TTL, code)
        return True
    except Exception as e:
        print(f"Redis error storing verification code: {e}")
        return False


def get_verification_code(email: str) -> str | None:
    """
    Get verification code from Redis.
    Returns None if not found or Redis unavailable.
    """
    if not redis_client:
        return None

    key = f"{VERIFICATION_CODE_PREFIX}{email.lower()}"
    try:
        code = redis_client.get(key)
        return code.decode('utf-8') if code else None
    except Exception as e:
        print(f"Redis error getting verification code: {e}")
        return None


def delete_verification_code(email: str) -> bool:
    """Delete verification code after successful verification"""
    if not redis_client:
        return False

    key = f"{VERIFICATION_CODE_PREFIX}{email.lower()}"
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False


# ==================== RATE LIMITING ====================

RATE_LIMIT_PREFIX = "ratelimit:"


def check_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """
    Check if rate limit exceeded using sliding window.
    Returns (is_allowed, remaining_requests).
    """
    if not redis_client:
        return True, limit  # Allow if Redis unavailable

    full_key = f"{RATE_LIMIT_PREFIX}{key}"

    try:
        current = redis_client.get(full_key)

        if current is None:
            # First request in window
            redis_client.setex(full_key, window_seconds, 1)
            return True, limit - 1

        count = int(current)
        if count >= limit:
            # Rate limit exceeded
            ttl = redis_client.ttl(full_key)
            return False, 0

        # Increment counter
        redis_client.incr(full_key)
        return True, limit - count - 1

    except Exception as e:
        print(f"Redis rate limit error: {e}")
        return True, limit


def rate_limit(limit: int, window_seconds: int, key_func=None):
    """
    Rate limiting decorator.

    Args:
        limit: Max requests allowed in window
        window_seconds: Time window in seconds
        key_func: Optional function to generate key (receives request)
                  Default: uses IP + endpoint

    Usage:
        @rate_limit(5, 60)  # 5 requests per minute
        def my_endpoint():
            ...
    """
    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # Generate rate limit key
            if key_func:
                key = key_func(request)
            else:
                ip = request.headers.get('X-Real-IP') or request.remote_addr or 'unknown'
                endpoint = request.endpoint or 'unknown'
                key = f"{ip}:{endpoint}"

            is_allowed, remaining = check_rate_limit(key, limit, window_seconds)

            if not is_allowed:
                return jsonify({
                    'error': 'Too many requests. Please try again later.',
                    'retry_after': window_seconds
                }), 429

            response = f(*args, **kwargs)

            # Add rate limit headers if response is a tuple (response, status_code)
            # or a Response object
            return response

        return wrapped
    return decorator


# Predefined rate limiters
def rate_limit_login():
    """5 login attempts per minute per IP"""
    return rate_limit(5, 60)


def rate_limit_register():
    """3 registrations per hour per IP"""
    return rate_limit(3, 3600)


def rate_limit_game_complete():
    """60 game completions per hour per user"""
    return rate_limit(60, 3600, key_func=lambda r: f"user:{r.headers.get('Authorization', 'anon')}")


def rate_limit_resend_code():
    """3 code resends per 10 minutes per email"""
    return rate_limit(3, 600, key_func=lambda r: f"resend:{r.get_json().get('email', 'unknown')}")


# ==================== LEADERBOARD CACHING ====================

LEADERBOARD_PREFIX = "leaderboard:"
LEADERBOARD_TTL = 60  # Cache for 1 minute


def cache_leaderboard(key: str, data: list, ttl: int = LEADERBOARD_TTL) -> bool:
    """Cache leaderboard data"""
    if not redis_client:
        return False

    full_key = f"{LEADERBOARD_PREFIX}{key}"
    try:
        redis_client.setex(full_key, ttl, json.dumps(data))
        return True
    except Exception as e:
        print(f"Redis error caching leaderboard: {e}")
        return False


def get_cached_leaderboard(key: str) -> list | None:
    """Get cached leaderboard data"""
    if not redis_client:
        return None

    full_key = f"{LEADERBOARD_PREFIX}{key}"
    try:
        data = redis_client.get(full_key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"Redis error getting leaderboard: {e}")
        return None


def invalidate_leaderboard(key: str = None):
    """Invalidate leaderboard cache (all or specific)"""
    if not redis_client:
        return

    try:
        if key:
            redis_client.delete(f"{LEADERBOARD_PREFIX}{key}")
        else:
            # Delete all leaderboard keys
            for k in redis_client.scan_iter(f"{LEADERBOARD_PREFIX}*"):
                redis_client.delete(k)
    except Exception as e:
        print(f"Redis error invalidating leaderboard: {e}")


# ==================== GAME SESSION STATE ====================

GAME_SESSION_PREFIX = "game_session:"
GAME_SESSION_TTL = 3600  # 1 hour (games shouldn't take longer)


def store_game_session(session_id: int, user_id: int, level_id: int, data: dict = None) -> bool:
    """
    Store active game session state in Redis.
    Used for anti-cheat validation and session recovery.
    """
    if not redis_client:
        return False

    key = f"{GAME_SESSION_PREFIX}{session_id}"
    session_data = {
        'user_id': user_id,
        'level_id': level_id,
        'started_at': datetime.utcnow().isoformat(),
        'data': data or {}
    }

    try:
        redis_client.setex(key, GAME_SESSION_TTL, json.dumps(session_data))
        return True
    except Exception as e:
        print(f"Redis error storing game session: {e}")
        return False


def get_game_session(session_id: int) -> dict | None:
    """Get game session state from Redis"""
    if not redis_client:
        return None

    key = f"{GAME_SESSION_PREFIX}{session_id}"
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"Redis error getting game session: {e}")
        return None


def update_game_session(session_id: int, data: dict) -> bool:
    """Update game session state (e.g., current score, moves)"""
    if not redis_client:
        return False

    key = f"{GAME_SESSION_PREFIX}{session_id}"
    try:
        existing = redis_client.get(key)
        if not existing:
            return False

        session_data = json.loads(existing)
        session_data['data'].update(data)
        session_data['updated_at'] = datetime.utcnow().isoformat()

        # Refresh TTL
        redis_client.setex(key, GAME_SESSION_TTL, json.dumps(session_data))
        return True
    except Exception as e:
        print(f"Redis error updating game session: {e}")
        return False


def delete_game_session(session_id: int) -> bool:
    """Delete game session after completion"""
    if not redis_client:
        return False

    key = f"{GAME_SESSION_PREFIX}{session_id}"
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False


def validate_game_session(session_id: int, user_id: int) -> tuple[bool, str]:
    """
    Validate game session for anti-cheat.
    Returns (is_valid, error_message).
    """
    if not redis_client:
        return True, ""  # Skip validation if Redis unavailable

    session = get_game_session(session_id)
    if not session:
        return True, ""  # Session not in Redis (might be old), allow

    if session['user_id'] != user_id:
        return False, "Session does not belong to this user"

    # Check if session is too old (more than 1 hour)
    started_at = datetime.fromisoformat(session['started_at'])
    elapsed = (datetime.utcnow() - started_at).total_seconds()
    if elapsed > 3600:
        return False, "Session expired"

    return True, ""


def get_active_sessions_count(user_id: int) -> int:
    """Count active game sessions for a user (anti-cheat: detect multi-session abuse)"""
    if not redis_client:
        return 0

    count = 0
    try:
        for key in redis_client.scan_iter(f"{GAME_SESSION_PREFIX}*"):
            data = redis_client.get(key)
            if data:
                session = json.loads(data)
                if session.get('user_id') == user_id:
                    count += 1
    except Exception:
        pass
    return count
