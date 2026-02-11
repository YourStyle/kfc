from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.level import Level
from app.models.game_session import GameSession
from app.models.user_progress import UserLevelProgress
from app.models.user import User
from app.models.user_activity import log_activity
from app.utils.timezone import now_moscow
from app.utils.redis_cache import (
    store_game_session, get_game_session, delete_game_session,
    validate_game_session, get_active_sessions_count,
    rate_limit, invalidate_leaderboard
)

bp = Blueprint('game', __name__)


@bp.route('/start', methods=['POST'])
@jwt_required()
@rate_limit(30, 60)  # 30 game starts per minute
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

    # Anti-cheat: check active sessions (max 3 concurrent)
    active_count = get_active_sessions_count(user_id)
    if active_count >= 3:
        return jsonify({'error': 'Too many active sessions. Complete or close existing games first.'}), 429

    # Create game session
    session = GameSession(
        user_id=user_id,
        level_id=level_id
    )
    db.session.add(session)
    db.session.commit()

    # Store in Redis for fast access and anti-cheat
    store_game_session(session.id, user_id, level_id, {
        'max_moves': level.max_moves,
        'targets': level.targets
    })

    # Log activity
    log_activity(user_id, 'start_game', {'level_id': level_id, 'session_id': session.id}, request)

    return jsonify({
        'session_id': session.id,
        'level': level.to_dict()
    })


@bp.route('/complete', methods=['POST'])
@jwt_required()
@rate_limit(60, 60)  # 60 completions per minute (anti-cheat)
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

    # Validate session in Redis (anti-cheat)
    is_valid, error_msg = validate_game_session(session_id, user_id)
    if not is_valid:
        return jsonify({'error': error_msg}), 400

    session = GameSession.query.get(session_id)
    if not session or session.user_id != user_id:
        return jsonify({'error': 'Session not found'}), 404

    if session.is_completed:
        return jsonify({'error': 'Session already completed'}), 400

    level = Level.query.get(session.level_id)

    # Calculate completion percentages and win status
    completion = calculate_completion(level.targets, targets_met, score)
    is_won = completion['is_won']

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

    # Clean up Redis session
    delete_game_session(session_id)

    # Invalidate leaderboard cache if score changed
    if is_won:
        invalidate_leaderboard()  # Clear all leaderboard caches

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
        'completion': {
            'collection_percent': round(completion['collection_percent'], 1),
            'score_percent': round(completion['score_percent'], 1),
            'overall_percent': round(completion['overall_percent'], 1),
            'collection_complete': completion['collection_complete'],
            'score_complete': completion['score_complete'],
        },
        'session': session.to_dict()
    })


def calculate_completion(targets: dict, met: dict, score: int) -> dict:
    """
    Calculate completion percentage for each category and overall.
    Level is won if EITHER collection OR score targets are 100% complete.
    Each category has 50% weight in overall percentage.
    """
    result = {
        'collection_percent': 0,
        'score_percent': 0,
        'overall_percent': 0,
        'is_won': False,
        'collection_complete': False,
        'score_complete': False,
    }

    # Calculate collection completion
    if 'collect' in targets and targets['collect']:
        total_required = 0
        total_collected = 0
        for item, required in targets['collect'].items():
            total_required += required
            collected = met.get('collect', {}).get(item, 0)
            total_collected += min(collected, required)  # Cap at required amount

        if total_required > 0:
            result['collection_percent'] = min(100, (total_collected / total_required) * 100)
            result['collection_complete'] = total_collected >= total_required
    else:
        # No collection targets - consider as 100% complete
        result['collection_percent'] = 100
        result['collection_complete'] = True

    # Calculate score completion
    if 'min_score' in targets and targets['min_score'] > 0:
        min_score = targets['min_score']
        result['score_percent'] = min(100, (score / min_score) * 100)
        result['score_complete'] = score >= min_score
    else:
        # No score target - consider as 100% complete
        result['score_percent'] = 100
        result['score_complete'] = True

    # Overall percentage: 50% collection + 50% score
    result['overall_percent'] = (result['collection_percent'] * 0.5) + (result['score_percent'] * 0.5)

    # Level is won if EITHER category is 100% complete
    result['is_won'] = result['collection_complete'] or result['score_complete']

    return result


def check_targets_met(targets: dict, met: dict, score: int) -> bool:
    """Check if level is won (either collection OR score targets are 100% met)"""
    completion = calculate_completion(targets, met, score)
    return completion['is_won']


def calculate_stars(targets: dict, score: int, met: dict) -> int:
    """Calculate stars based on performance"""
    min_score = targets.get('min_score', 0)

    if score >= min_score * 2:
        return 3
    elif score >= min_score * 1.5:
        return 2
    else:
        return 1
