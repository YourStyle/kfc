from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.level import Level
from app.models.game_session import GameSession
from app.models.user_progress import UserLevelProgress
from app.models.user import User
from app.models.user_activity import log_activity
from app.utils.timezone import now_moscow

bp = Blueprint('game', __name__)


@bp.route('/start', methods=['POST'])
@jwt_required()
def start_game():
    """Start a new game session"""
    user_id = get_jwt_identity()
    data = request.get_json()

    level_id = data.get('level_id')
    if not level_id:
        return jsonify({'error': 'level_id is required'}), 400

    level = Level.query.get(level_id)
    if not level or not level.is_active:
        return jsonify({'error': 'Level not found'}), 404

    # Create game session
    session = GameSession(
        user_id=user_id,
        level_id=level_id
    )
    db.session.add(session)
    db.session.commit()

    # Log activity
    log_activity(user_id, 'start_game', {'level_id': level_id, 'session_id': session.id}, request)

    return jsonify({
        'session_id': session.id,
        'level': level.to_dict()
    })


@bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_game():
    """Complete a game session"""
    user_id = get_jwt_identity()
    data = request.get_json()

    session_id = data.get('session_id')
    score = data.get('score', 0)
    moves_used = data.get('moves_used', 0)
    targets_met = data.get('targets_met', {})
    duration_seconds = data.get('duration_seconds', 0)

    if not session_id:
        return jsonify({'error': 'session_id is required'}), 400

    session = GameSession.query.get(session_id)
    if not session or session.user_id != user_id:
        return jsonify({'error': 'Session not found'}), 404

    if session.is_completed:
        return jsonify({'error': 'Session already completed'}), 400

    level = Level.query.get(session.level_id)

    # Check if level targets are met
    is_won = check_targets_met(level.targets, targets_met)

    # Calculate bonus for remaining moves if level is won
    remaining_moves = level.max_moves - moves_used
    moves_bonus = 0
    if is_won and remaining_moves > 0:
        moves_bonus = remaining_moves * 50  # 50 points per remaining move
        score += moves_bonus

    # Calculate stars
    stars = calculate_stars(level.targets, score, targets_met) if is_won else 0

    # Update session
    session.score = score
    session.moves_used = moves_used
    session.targets_met = targets_met
    session.duration_seconds = duration_seconds
    session.is_completed = True
    session.is_won = is_won

    # Update user progress if won
    if is_won:
        progress = UserLevelProgress.query.filter_by(
            user_id=user_id,
            level_id=level.id
        ).first()

        if not progress:
            progress = UserLevelProgress(
                user_id=user_id,
                level_id=level.id,
                attempts_count=0,
                best_score=0,
                stars=0
            )
            db.session.add(progress)

        progress.attempts_count += 1

        if score > progress.best_score:
            progress.best_score = score

        if stars > progress.stars:
            progress.stars = stars

        if not progress.completed_at:
            progress.completed_at = now_moscow()

        # Update user's total score
        user = User.query.get(user_id)
        if user:
            # Recalculate total score from all levels
            total = db.session.query(
                db.func.sum(UserLevelProgress.best_score)
            ).filter(
                UserLevelProgress.user_id == user_id
            ).scalar() or 0
            user.total_score = total

    db.session.commit()

    # Log activity
    log_activity(user_id, 'complete_game', {
        'level_id': level.id,
        'session_id': session_id,
        'score': score,
        'is_won': is_won,
        'stars': stars
    }, request)

    return jsonify({
        'is_won': is_won,
        'stars': stars,
        'score': score,
        'moves_bonus': moves_bonus,
        'session': session.to_dict()
    })


def check_targets_met(targets: dict, met: dict) -> bool:
    """Check if all required targets are met"""
    # Check collect targets
    if 'collect' in targets:
        for item, required in targets['collect'].items():
            if met.get('collect', {}).get(item, 0) < required:
                return False

    # Check combo targets
    if 'combos' in targets:
        for combo_type, required in targets['combos'].items():
            if met.get('combos', {}).get(combo_type, 0) < required:
                return False

    # Check minimum score
    if 'min_score' in targets:
        if met.get('score', 0) < targets['min_score']:
            return False

    return True


def calculate_stars(targets: dict, score: int, met: dict) -> int:
    """Calculate stars based on performance"""
    min_score = targets.get('min_score', 0)

    if score >= min_score * 2:
        return 3
    elif score >= min_score * 1.5:
        return 2
    else:
        return 1
