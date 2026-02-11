from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.quest_page import QuestPage
from app.models.quest_progress import QuestProgress
from app.models.promo_code import PromoCodePool, PromoCode
from app.models.user_activity import log_activity
from app.utils.timezone import now_moscow

bp = Blueprint('quest', __name__)


@bp.route('/pages', methods=['GET'])
def list_pages():
    """List all active quest pages (public, no qr_token exposed)."""
    pages = QuestPage.query.filter_by(is_active=True).order_by(QuestPage.order).all()
    return jsonify({
        'pages': [p.to_dict(include_answer=False) for p in pages]
    })


@bp.route('/pages/<slug>', methods=['GET'])
def get_page(slug):
    """Get a single quest page by slug (public, no qr_token exposed)."""
    page = QuestPage.query.filter_by(slug=slug, is_active=True).first()
    if not page:
        return jsonify({'error': 'Page not found'}), 404
    return jsonify({'page': page.to_dict(include_answer=False)})


@bp.route('/scan', methods=['POST'])
@jwt_required()
def scan_qr():
    """Validate a QR code scan. Checks if qr_token matches user's current step."""
    user_id = get_jwt_identity()
    data = request.get_json()
    qr_token = data.get('qr_token', '').strip()

    if not qr_token:
        return jsonify({'error': 'qr_token is required'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Find the page matching this QR token
    scanned_page = QuestPage.query.filter_by(qr_token=qr_token, is_active=True).first()
    if not scanned_page:
        return jsonify({'error': 'Invalid QR code'}), 400

    # Check if already answered this page
    existing = QuestProgress.query.filter_by(user_id=user_id, quest_page_id=scanned_page.id).first()
    if existing:
        return jsonify({
            'error': 'Already scanned',
            'already_completed': True,
            'page_slug': scanned_page.slug,
        }), 400

    # Get user's current step: first unanswered active page by order
    all_pages = QuestPage.query.filter_by(is_active=True).order_by(QuestPage.order).all()
    answered_page_ids = set(
        p.quest_page_id for p in
        QuestProgress.query.filter_by(user_id=user_id).all()
    )

    current_page = None
    for page in all_pages:
        if page.id not in answered_page_ids:
            current_page = page
            break

    if not current_page:
        return jsonify({'error': 'Quest already completed'}), 400

    # Check if scanned QR matches current step
    if scanned_page.id != current_page.id:
        return jsonify({
            'error': 'Wrong QR code. Find the exhibit for the current riddle.',
            'is_correct': False,
            'expected_order': current_page.order,
            'scanned_order': scanned_page.order,
        }), 400

    # Correct scan — award points
    points = scanned_page.points or 10
    progress = QuestProgress(
        user_id=user_id,
        quest_page_id=scanned_page.id,
        is_correct=True,
        is_skipped=False,
        points_earned=points,
    )
    db.session.add(progress)

    user.quest_score = (user.quest_score or 0) + points

    # Mark transferred users
    if user.registration_source == 'game':
        user.registration_source = 'transferred'

    db.session.commit()

    log_activity(user_id, 'quest_scan', {
        'page_slug': scanned_page.slug,
        'points': points,
    }, request)

    # Find next page
    next_page = None
    for page in all_pages:
        if page.id not in answered_page_ids and page.id != scanned_page.id:
            next_page = page
            break

    return jsonify({
        'is_correct': True,
        'points_earned': points,
        'total_quest_score': user.quest_score,
        'fact_text': scanned_page.fact_text,
        'page': scanned_page.to_dict(),
        'next_page_slug': next_page.slug if next_page else None,
        'quest_completed': next_page is None,
    })


@bp.route('/skip', methods=['POST'])
@jwt_required()
def skip_question():
    """Skip the current question (0 points)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get current step
    all_pages = QuestPage.query.filter_by(is_active=True).order_by(QuestPage.order).all()
    answered_page_ids = set(
        p.quest_page_id for p in
        QuestProgress.query.filter_by(user_id=user_id).all()
    )

    current_page = None
    for page in all_pages:
        if page.id not in answered_page_ids:
            current_page = page
            break

    if not current_page:
        return jsonify({'error': 'Quest already completed'}), 400

    # Skip — 0 points
    progress = QuestProgress(
        user_id=user_id,
        quest_page_id=current_page.id,
        is_correct=False,
        is_skipped=True,
        points_earned=0,
    )
    db.session.add(progress)

    # Mark transferred users
    if user.registration_source == 'game':
        user.registration_source = 'transferred'

    db.session.commit()

    log_activity(user_id, 'quest_skip', {
        'page_slug': current_page.slug,
    }, request)

    # Find next page
    answered_page_ids.add(current_page.id)
    next_page = None
    for page in all_pages:
        if page.id not in answered_page_ids:
            next_page = page
            break

    return jsonify({
        'skipped_page': current_page.slug,
        'next_page_slug': next_page.slug if next_page else None,
        'quest_completed': next_page is None,
        'total_quest_score': user.quest_score or 0,
    })


@bp.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """Get user's full quest progress."""
    user_id = get_jwt_identity()

    all_pages = QuestPage.query.filter_by(is_active=True).order_by(QuestPage.order).all()
    progress_entries = QuestProgress.query.filter_by(user_id=user_id).all()
    progress_map = {p.quest_page_id: p for p in progress_entries}

    user = User.query.get(user_id)

    pages_progress = []
    for page in all_pages:
        p = progress_map.get(page.id)
        pages_progress.append({
            'page_slug': page.slug,
            'page_order': page.order,
            'page_title': page.title,
            'is_answered': p is not None,
            'is_correct': p.is_correct if p else False,
            'is_skipped': p.is_skipped if p else False,
            'points_earned': p.points_earned if p else 0,
        })

    # Find current step
    current_slug = None
    for pp in pages_progress:
        if not pp['is_answered']:
            current_slug = pp['page_slug']
            break

    return jsonify({
        'progress': pages_progress,
        'total_score': user.quest_score or 0,
        'total_pages': len(all_pages),
        'answered_pages': len(progress_entries),
        'current_page_slug': current_slug,
        'quest_completed': current_slug is None,
    })


@bp.route('/result', methods=['GET'])
@jwt_required()
def get_result():
    """Get final quest result and eligible promo tier."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    score = user.quest_score or 0

    progress_entries = QuestProgress.query.filter_by(user_id=user_id).all()
    total_pages = QuestPage.query.filter_by(is_active=True).count()
    correct_count = sum(1 for p in progress_entries if p.is_correct)
    skipped_count = sum(1 for p in progress_entries if p.is_skipped)

    # Find eligible promo tier (highest first)
    eligible_pool = PromoCodePool.query.filter(
        PromoCodePool.is_active == True,
        PromoCodePool.min_score <= score
    ).order_by(PromoCodePool.min_score.desc()).first()

    # Check if already claimed
    existing_claim = PromoCode.query.filter_by(used_by_user_id=user_id).first()

    return jsonify({
        'total_score': score,
        'total_pages': total_pages,
        'correct_answers': correct_count,
        'skipped_answers': skipped_count,
        'answered_pages': len(progress_entries),
        'eligible_tier': eligible_pool.tier if eligible_pool else None,
        'eligible_discount': eligible_pool.discount_label if eligible_pool else None,
        'already_claimed': existing_claim is not None,
        'claimed_code': existing_claim.code if existing_claim else None,
        'claimed_tier': existing_claim.pool.tier if existing_claim else None,
    })


@bp.route('/claim-promo', methods=['POST'])
@jwt_required()
def claim_promo():
    """Claim a promo code based on total quest score. One-time only."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if already claimed
    existing_claim = PromoCode.query.filter_by(used_by_user_id=user_id).first()
    if existing_claim:
        return jsonify({
            'error': 'Already claimed',
            'code': existing_claim.code,
            'tier': existing_claim.pool.tier,
            'discount_label': existing_claim.pool.discount_label,
        }), 400

    score = user.quest_score or 0

    # Find eligible pool (highest tier first)
    eligible_pool = PromoCodePool.query.filter(
        PromoCodePool.is_active == True,
        PromoCodePool.min_score <= score
    ).order_by(PromoCodePool.min_score.desc()).first()

    if not eligible_pool:
        return jsonify({'error': 'Score too low for any promo'}), 400

    # Grab an unused code with row-level lock (PostgreSQL)
    code = PromoCode.query.filter_by(
        pool_id=eligible_pool.id, is_used=False
    ).with_for_update().first()

    if not code:
        return jsonify({'error': 'No promo codes available. Please try again later.'}), 503

    code.is_used = True
    code.used_by_user_id = user_id
    code.used_at = now_moscow()
    eligible_pool.used_codes = (eligible_pool.used_codes or 0) + 1

    db.session.commit()

    log_activity(user_id, 'quest_claim_promo', {
        'code': code.code,
        'tier': eligible_pool.tier,
        'score': score,
    }, request)

    return jsonify({
        'code': code.code,
        'tier': eligible_pool.tier,
        'discount_label': eligible_pool.discount_label,
    })
