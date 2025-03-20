from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app import db
from app.models.user import User
from app.models.quest_page import QuestPage
from app.models.quest_progress import QuestProgress
from app.models.promo_code import PromoCodePool, PromoCode
from app.models.user_activity import log_activity
from app.utils.encryption import compute_hash
from app.utils.timezone import now_moscow
from app.utils.redis_cache import get_redis
from app.services.email import send_promo_email

bp = Blueprint('quest', __name__)


def _auto_claim_promo(user):
    """Auto-claim best eligible promo code for the user.

    Returns (code, tier, discount_label) or None.
    Safe to call multiple times — returns existing claim if already claimed.
    """
    # Already claimed?
    existing = PromoCode.query.filter_by(used_by_user_id=user.id).first()
    if existing:
        return (existing.code, existing.pool.tier, existing.pool.discount_label)

    score = user.quest_score or 0
    if score < 120:
        return None

    # Find best eligible pool (quest category, highest tier first)
    pool = PromoCodePool.query.filter(
        PromoCodePool.category == 'quest',
        PromoCodePool.is_active == True,
        PromoCodePool.min_score <= score,
    ).order_by(PromoCodePool.min_score.desc()).first()

    if not pool:
        return None

    # Grab unused code with row-level lock
    code = PromoCode.query.filter(
        PromoCode.pool_id == pool.id,
        PromoCode.is_used != True,
    ).with_for_update().first()

    if not code:
        return None

    code.is_used = True
    code.used_by_user_id = user.id
    code.used_at = now_moscow()
    pool.used_codes = (pool.used_codes or 0) + 1
    db.session.commit()

    log_activity(user.id, 'quest_claim_promo', {
        'code_hash': compute_hash(code.code),
        'tier': pool.tier,
        'score': score,
        'auto': True,
    }, request)

    # Send email (best-effort)
    if user.email:
        try:
            send_promo_email(
                email=user.email,
                code=code.code,
                tier=pool.tier,
                discount_label=pool.discount_label or '',
            )
        except Exception:
            pass

    return (code.code, pool.tier, pool.discount_label)


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
def scan_qr():
    """Validate a QR code scan. Works for both authenticated and guest users.

    Authenticated: saves progress to DB (full validation + step matching).
    Guest: validates QR token and returns page info without saving.
    """
    # Try to get JWT identity (optional)
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    data = request.get_json()
    qr_token = data.get('qr_token', '').strip()

    if not qr_token:
        return jsonify({'error': 'qr_token is required'}), 400

    # Find the page matching this QR token
    scanned_page = QuestPage.query.filter_by(qr_token=qr_token, is_active=True).first()
    if not scanned_page:
        return jsonify({'error': 'Invalid QR code', 'is_correct': False}), 400

    # --- Guest mode: just validate and return page info ---
    if not user_id:
        points = scanned_page.points or 10
        return jsonify({
            'is_correct': True,
            'points_earned': points,
            'fact_text': scanned_page.fact_text,
            'page': scanned_page.to_dict(include_answer=False),
            'page_slug': scanned_page.slug,
        })

    # --- Authenticated mode: full validation + save ---
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

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

    response = {
        'is_correct': True,
        'points_earned': points,
        'total_quest_score': user.quest_score,
        'fact_text': scanned_page.fact_text,
        'page': scanned_page.to_dict(),
        'next_page_slug': next_page.slug if next_page else None,
        'quest_completed': next_page is None,
    }

    # Auto-claim promo when quest is completed
    if next_page is None:
        claimed = _auto_claim_promo(user)
        if claimed:
            response['promo_code'] = claimed[0]
            response['promo_tier'] = claimed[1]
            response['promo_discount'] = claimed[2]

    return jsonify(response)


@bp.route('/sync-guest', methods=['POST'])
@jwt_required()
def sync_guest_progress():
    """Sync guest quest progress after registration/login.

    Accepts an array of {page_slug, is_correct, is_skipped, points_earned}
    and creates QuestProgress entries for the authenticated user.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    entries = data.get('progress', [])

    if not entries:
        return jsonify({'synced': 0, 'total_score': user.quest_score or 0})

    # Build page lookup
    all_pages = {p.slug: p for p in QuestPage.query.filter_by(is_active=True).all()}

    # Get existing progress to avoid duplicates
    existing_page_ids = set(
        p.quest_page_id for p in QuestProgress.query.filter_by(user_id=user_id).all()
    )

    total_points = 0
    synced = 0

    for entry in entries:
        slug = entry.get('page_slug')
        page = all_pages.get(slug)
        if not page or page.id in existing_page_ids:
            continue

        is_correct = entry.get('is_correct', False)
        is_skipped = entry.get('is_skipped', False)
        # SECURITY: Always use server-side point value, never trust client
        points = (page.points or 0) if is_correct and not is_skipped else 0

        progress = QuestProgress(
            user_id=user_id,
            quest_page_id=page.id,
            is_correct=is_correct,
            is_skipped=is_skipped,
            points_earned=points,
        )
        db.session.add(progress)
        existing_page_ids.add(page.id)
        total_points += points
        synced += 1

    if synced > 0:
        user.quest_score = (user.quest_score or 0) + total_points

        if user.registration_source == 'game':
            user.registration_source = 'transferred'

        db.session.commit()

        log_activity(user_id, 'quest_sync_guest', {
            'synced_pages': synced,
            'total_points': total_points,
        }, request)

    response = {
        'synced': synced,
        'total_score': user.quest_score or 0,
    }

    # Auto-claim promo if score qualifies
    if (user.quest_score or 0) >= 120:
        claimed = _auto_claim_promo(user)
        if claimed:
            response['promo_code'] = claimed[0]
            response['promo_tier'] = claimed[1]
            response['promo_discount'] = claimed[2]

    return jsonify(response)


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

    # Auto-claim if eligible (idempotent — returns existing claim if already claimed)
    claimed = _auto_claim_promo(user)

    # Find eligible promo tier for display
    eligible_pool = PromoCodePool.query.filter(
        PromoCodePool.is_active == True,
        PromoCodePool.min_score <= score
    ).order_by(PromoCodePool.min_score.desc()).first()

    return jsonify({
        'total_score': score,
        'total_pages': total_pages,
        'correct_answers': correct_count,
        'skipped_answers': skipped_count,
        'answered_pages': len(progress_entries),
        'eligible_tier': eligible_pool.tier if eligible_pool else None,
        'eligible_discount': eligible_pool.discount_label if eligible_pool else None,
        'already_claimed': claimed is not None,
        'claimed_code': claimed[0] if claimed else None,
        'claimed_tier': claimed[1] if claimed else None,
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
    # Use `is_used != True` to also match NULL values from bulk imports
    code = PromoCode.query.filter(
        PromoCode.pool_id == eligible_pool.id,
        PromoCode.is_used != True
    ).with_for_update().first()

    if not code:
        return jsonify({'error': 'No promo codes available. Please try again later.'}), 503

    code.is_used = True
    code.used_by_user_id = user_id
    code.used_at = now_moscow()
    eligible_pool.used_codes = (eligible_pool.used_codes or 0) + 1

    db.session.commit()

    log_activity(user_id, 'quest_claim_promo', {
        'code_hash': compute_hash(code.code),
        'tier': eligible_pool.tier,
        'score': score,
    }, request)

    return jsonify({
        'code': code.code,
        'tier': eligible_pool.tier,
        'discount_label': eligible_pool.discount_label,
    })


@bp.route('/send-promo-email', methods=['POST'])
@jwt_required()
def send_promo_email_endpoint():
    """Send the user's claimed promo code to their registered email."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # SECURITY: Only allow sending to the user's own registered email
    email = user.email
    if not email or '@' not in email:
        return jsonify({'error': 'Email не найден в вашем аккаунте'}), 400

    # Verify user has a claimed promo code
    existing_claim = PromoCode.query.filter_by(used_by_user_id=user_id).first()
    if not existing_claim:
        return jsonify({'error': 'У вас нет промокода'}), 400

    try:
        send_promo_email(
            email=email,
            code=existing_claim.code,
            tier=existing_claim.pool.tier if existing_claim.pool else '',
            discount_label=existing_claim.pool.discount_label if existing_claim.pool else '',
        )
    except Exception:
        return jsonify({'error': 'Не удалось отправить письмо'}), 500

    log_activity(user_id, 'quest_promo_email', {
        'email_hash': compute_hash(email),
        'code_hash': compute_hash(existing_claim.code),
    }, request)

    return jsonify({'message': 'Промокод отправлен на ваш email'})


@bp.route('/guest-promo', methods=['POST'])
def guest_promo():
    """Send promo code to a guest by email without requiring registration.

    Validates score server-side from submitted entries (slugs + correctness).
    Rate-limits 1 claim per email via Redis (30-day TTL).
    """
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    entries = data.get('entries', [])  # [{page_slug, is_correct, is_skipped}]

    if not email or '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({'error': 'Введите корректный email'}), 400

    # Rate limit: 1 promo per email (Redis key survives 30 days)
    redis = get_redis()
    redis_key = f"guest_promo:{email}"
    if redis:
        try:
            if redis.get(redis_key):
                return jsonify({'error': 'Этот email уже получил промокод'}), 400
        except Exception:
            pass  # Redis unavailable — proceed without rate limit

    # Also block if registered user already claimed via the normal flow
    existing_user = User.find_by_email(email)
    if existing_user:
        existing_code = PromoCode.query.filter_by(used_by_user_id=existing_user.id).first()
        if existing_code:
            return jsonify({'error': 'Этот email уже получил промокод. Войдите в аккаунт.'}), 400

    # Validate score server-side — require qr_token as proof of scan
    if not entries or not isinstance(entries, list):
        return jsonify({'error': 'Нет данных о прохождении'}), 400

    score = 0
    seen_slugs = set()
    for entry in entries[:50]:  # cap iterations
        slug = (entry.get('page_slug') or '').strip()
        qr_token = (entry.get('qr_token') or '').strip()
        if not slug or slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        page = QuestPage.query.filter_by(slug=slug, is_active=True).first()
        # SECURITY: Validate via qr_token (cryptographic proof of scan),
        # not client-supplied is_correct flag
        if page and qr_token and page.qr_token == qr_token:
            score += page.points

    if score < 120:
        return jsonify({'error': f'Недостаточно очков для промокода (набрано {score}, нужно 120+)'}), 400

    # Find eligible pool (quest category only)
    eligible_pool = PromoCodePool.query.filter(
        PromoCodePool.category == 'quest',
        PromoCodePool.is_active == True,
        PromoCodePool.min_score <= score,
    ).order_by(PromoCodePool.min_score.desc()).first()

    if not eligible_pool:
        return jsonify({'error': 'Промокоды временно недоступны'}), 503

    code = PromoCode.query.filter(
        PromoCode.pool_id == eligible_pool.id,
        PromoCode.is_used != True,
    ).with_for_update().first()

    if not code:
        return jsonify({'error': 'Промокоды временно недоступны'}), 503

    code.is_used = True
    code.used_at = now_moscow()
    # used_by_user_id stays NULL — guest claim
    eligible_pool.used_codes = (eligible_pool.used_codes or 0) + 1
    db.session.commit()

    # Mark email in Redis so it can't claim again
    if redis:
        try:
            redis.setex(redis_key, 60 * 60 * 24 * 30, '1')  # 30 days
        except Exception:
            pass

    # Send email (best-effort — code is already claimed)
    try:
        send_promo_email(
            email=email,
            code=code.code,
            tier=eligible_pool.tier,
            discount_label=eligible_pool.discount_label or '',
        )
    except Exception:
        pass

    log_activity(None, 'quest_guest_promo', {
        'email_hash': compute_hash(email),
        'code_hash': compute_hash(code.code),
        'score': score,
        'tier': eligible_pool.tier,
    }, request)

    return jsonify({'code': code.code})
