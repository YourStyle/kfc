from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.user_progress import UserLevelProgress
from app.utils.timezone import now_moscow
from app.utils.redis_cache import get_cached_leaderboard, cache_leaderboard, rate_limit
from datetime import timedelta

bp = Blueprint('leaderboard', __name__)


@bp.route('', methods=['GET'])
@rate_limit(60, 60)  # 60 requests per minute
def get_global_leaderboard():
    """Get global leaderboard by total score (cached for 60 seconds)

    Query params:
    - limit: max number of results (default 100)
    - city: filter by region - 'moscow' or 'region' (optional, returns all if not specified)
    """
    limit = request.args.get('limit', 100, type=int)
    city = request.args.get('city', None)

    # Validate city filter
    if city and city not in ('moscow', 'region'):
        city = None

    # Try cache first
    cache_key = f"global:{limit}:{city or 'all'}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return jsonify({'leaderboard': cached, 'cached': True})

    # Build query
    query = User.query.filter(
        User.is_verified == True,
        User.total_score > 0
    )

    # Apply city filter if specified
    if city:
        query = query.filter(User.city == city)

    users = query.order_by(
        User.total_score.desc()
    ).limit(limit).all()

    result = []
    for idx, user in enumerate(users, 1):
        # Get completed levels count
        completed_levels = UserLevelProgress.query.filter(
            UserLevelProgress.user_id == user.id,
            UserLevelProgress.completed_at.isnot(None)
        ).count()

        # Get total stars
        total_stars = db.session.query(
            db.func.sum(UserLevelProgress.stars)
        ).filter(
            UserLevelProgress.user_id == user.id
        ).scalar() or 0

        result.append({
            'rank': idx,
            'user_id': user.id,
            'username': user.username,
            'total_score': user.total_score,
            'completed_levels': completed_levels,
            'total_stars': total_stars,
            'city': user.city
        })

    # Cache result for 60 seconds
    cache_leaderboard(cache_key, result, ttl=60)

    return jsonify({'leaderboard': result})


@bp.route('/weekly', methods=['GET'])
@rate_limit(60, 60)  # 60 requests per minute
def get_weekly_leaderboard():
    """Get weekly leaderboard based on scores earned this week (cached for 2 minutes)"""
    limit = request.args.get('limit', 100, type=int)

    # Try cache first
    cache_key = f"weekly:{limit}"
    cached = get_cached_leaderboard(cache_key)
    if cached:
        return jsonify({'leaderboard': cached, 'cached': True})

    # Calculate start of current week (Monday)
    today = now_moscow()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get scores from game sessions this week
    from app.models.game_session import GameSession

    weekly_scores = db.session.query(
        GameSession.user_id,
        db.func.sum(GameSession.score).label('weekly_score')
    ).filter(
        GameSession.created_at >= start_of_week,
        GameSession.is_won == True
    ).group_by(
        GameSession.user_id
    ).order_by(
        db.desc('weekly_score')
    ).limit(limit).all()

    result = []
    for idx, (user_id, weekly_score) in enumerate(weekly_scores, 1):
        user = User.query.get(user_id)
        if user and user.is_verified:
            result.append({
                'rank': idx,
                'user_id': user_id,
                'username': user.username,
                'weekly_score': weekly_score
            })

    # Cache result for 2 minutes
    cache_leaderboard(cache_key, result, ttl=120)

    return jsonify({'leaderboard': result})


@bp.route('/my-rank', methods=['GET'])
@jwt_required()
def get_my_rank():
    """Get current user's rank in leaderboard (global and regional)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Global rank - count users with higher score
    global_rank = User.query.filter(
        User.is_verified == True,
        User.total_score > user.total_score
    ).count() + 1

    global_total_players = User.query.filter(
        User.is_verified == True,
        User.total_score > 0
    ).count()

    # Regional rank - count users in same region with higher score
    regional_rank = User.query.filter(
        User.is_verified == True,
        User.city == user.city,
        User.total_score > user.total_score
    ).count() + 1

    regional_total_players = User.query.filter(
        User.is_verified == True,
        User.city == user.city,
        User.total_score > 0
    ).count()

    return jsonify({
        'rank': global_rank,
        'total_score': user.total_score,
        'total_players': global_total_players,
        'city': user.city,
        'regional_rank': regional_rank,
        'regional_total_players': regional_total_players
    })
