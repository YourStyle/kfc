from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.level import Level
from app.models.user_progress import UserLevelProgress

bp = Blueprint('levels', __name__)


@bp.route('', methods=['GET'])
def get_levels():
    """Get all active levels"""
    levels = Level.query.filter_by(is_active=True).order_by(Level.order).all()
    return jsonify({'levels': [level.to_dict() for level in levels]})


@bp.route('/<int:level_id>', methods=['GET'])
def get_level(level_id):
    """Get single level by ID"""
    level = Level.query.get_or_404(level_id)
    return jsonify({'level': level.to_dict()})


@bp.route('/<int:level_id>/leaderboard', methods=['GET'])
def get_level_leaderboard(level_id):
    """Get leaderboard for a specific level"""
    limit = request.args.get('limit', 100, type=int)

    leaderboard = db.session.query(
        UserLevelProgress.user_id,
        UserLevelProgress.best_score,
        UserLevelProgress.stars
    ).filter(
        UserLevelProgress.level_id == level_id,
        UserLevelProgress.best_score > 0
    ).order_by(
        UserLevelProgress.best_score.desc()
    ).limit(limit).all()

    # Get user details
    from app.models.user import User
    result = []
    for idx, (user_id, score, stars) in enumerate(leaderboard, 1):
        user = User.query.get(user_id)
        if user and user.is_verified:
            result.append({
                'rank': idx,
                'user_id': user_id,
                'username': user.username,
                'score': score,
                'stars': stars
            })

    return jsonify({'leaderboard': result})


@bp.route('/user/progress', methods=['GET'])
@jwt_required()
def get_user_progress():
    """Get current user's progress on all levels"""
    user_id = get_jwt_identity()

    progress = UserLevelProgress.query.filter_by(user_id=user_id).all()
    progress_dict = {p.level_id: p.to_dict() for p in progress}

    levels = Level.query.filter_by(is_active=True).order_by(Level.order).all()

    result = []
    for level in levels:
        level_data = level.to_dict()
        level_data['progress'] = progress_dict.get(level.id)
        result.append(level_data)

    return jsonify({'levels': result})
