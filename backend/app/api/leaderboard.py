from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.user_progress import UserLevelProgress
from app.utils.timezone import now_moscow
from datetime import timedelta

bp = Blueprint('leaderboard', __name__)


@bp.route('', methods=['GET'])
def get_global_leaderboard():
    """Get global leaderboard by total score"""
    limit = request.args.get('limit', 100, type=int)

    users = User.query.filter(
        User.is_verified == True,
        User.total_score > 0
    ).order_by(
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
            'total_stars': total_stars
        })

    return jsonify({'leaderboard': result})


@bp.route('/weekly', methods=['GET'])
def get_weekly_leaderboard():
    """Get weekly leaderboard based on scores earned this week"""
    limit = request.args.get('limit', 100, type=int)

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

    return jsonify({'leaderboard': result})


@bp.route('/my-rank', methods=['GET'])
@jwt_required()
def get_my_rank():
    """Get current user's rank in global leaderboard"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Count users with higher score
    rank = User.query.filter(
        User.is_verified == True,
        User.total_score > user.total_score
    ).count() + 1

    total_players = User.query.filter(
        User.is_verified == True,
        User.total_score > 0
    ).count()

    return jsonify({
        'rank': rank,
        'total_score': user.total_score,
        'total_players': total_players
    })
