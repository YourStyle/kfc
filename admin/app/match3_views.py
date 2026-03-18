"""Match3 leaderboard prize distribution views for admin panel"""
from flask import Blueprint, render_template_string, request, flash, redirect, current_app
from flask_login import login_required, current_user
from flask_mail import Message
from functools import wraps
from datetime import datetime

from app import db, mail
from app.models import User, PromoCodePool, PromoCode, Match3Prize

bp = Blueprint('match3_admin', __name__, url_prefix='/admin/match3')


# ─── Prize tier constants ────────────────────────────────────────────────────
# Moscow
TIER_MOSCOW_VIP = 'moscow_vip'       # ranks 1–20: cosmonaut meeting + merch
TIER_MOSCOW_15 = 'moscow_15pct'      # ranks 21–50: 15% promo
TIER_MOSCOW_7 = 'moscow_7pct'        # ranks 51+:   7% promo

# Regions
TIER_REGION_30 = 'region_30pct'      # ranks 1–30:  30% promo + merch
TIER_REGION_15 = 'region_15pct'      # ranks 31–50: 15% promo
TIER_REGION_7 = 'region_7pct'        # ranks 51+:   7% promo

TIER_LABELS = {
    TIER_MOSCOW_VIP: 'Встреча с космонавтом + мерч',
    TIER_MOSCOW_15:  'Промокод −15%',
    TIER_MOSCOW_7:   'Промокод −7%',
    TIER_REGION_30:  'Промокод −30% + мерч',
    TIER_REGION_15:  'Промокод −15%',
    TIER_REGION_7:   'Промокод −7%',
}

TIER_NEEDS_CODE = {
    TIER_MOSCOW_VIP: False,
    TIER_MOSCOW_15:  True,
    TIER_MOSCOW_7:   True,
    TIER_REGION_30:  True,
    TIER_REGION_15:  True,
    TIER_REGION_7:   True,
}

# Maps tier → pool tier name (must match PromoCodePool.tier in DB)
TIER_TO_POOL_TIER = {
    TIER_MOSCOW_15:  'match3_15',
    TIER_MOSCOW_7:   'match3_7',
    TIER_REGION_30:  'match3_30',
    TIER_REGION_15:  'match3_15',
    TIER_REGION_7:   'match3_7',
}


def _assign_moscow_tier(rank: int) -> str:
    if rank <= 20:
        return TIER_MOSCOW_VIP
    if rank <= 50:
        return TIER_MOSCOW_15
    return TIER_MOSCOW_7


def _assign_region_tier(rank: int) -> str:
    if rank <= 30:
        return TIER_REGION_30
    if rank <= 50:
        return TIER_REGION_15
    return TIER_REGION_7


def _get_leaderboard(city: str, limit: int = 100):
    """Return [(rank, user), ...] for the given city filter."""
    users = User.query.filter(
        User.is_verified == True,
        User.city == city,
        User.total_score > 0,
    ).order_by(User.total_score.desc()).limit(limit).all()
    return list(enumerate(users, start=1))


def _get_prize_map(region: str) -> dict:
    """Return {user_id: Match3Prize} for already-sent prizes in a region."""
    prizes = Match3Prize.query.filter_by(region=region).all()
    return {p.user_id: p for p in prizes}


def _claim_code_for_tier(tier: str) -> str | None:
    """Atomically claim one promo code from match3 pool matching the tier.
    Returns the code string or None if no codes available."""
    pool_tier = TIER_TO_POOL_TIER.get(tier)
    if not pool_tier:
        return None

    pool = PromoCodePool.query.filter_by(
        category='match3',
        tier=pool_tier,
        is_active=True,
    ).first()
    if not pool:
        return None

    code_obj = PromoCode.query.filter(
        PromoCode.pool_id == pool.id,
        PromoCode.is_used != True,
    ).with_for_update().first()

    if not code_obj:
        return None

    code_obj.is_used = True
    code_obj.used_at = datetime.utcnow()
    pool.used_codes = (pool.used_codes or 0) + 1
    return code_obj.code


def _send_match3_prize_email(email: str, username: str, tier: str, code: str = None, rank: int = 0) -> bool:
    """Send match3 prize email. Different template from quest email."""
    subject = "ROSTIC'S — Ваш приз за участие в Легендах Космоса"
    tier_label = TIER_LABELS.get(tier, '')

    if code:
        prize_block = f'''
  <p><strong>Ваш приз: {tier_label}</strong></p>
  <div class="promo">
    <p style="margin:0 0 8px;color:#666;font-size:14px;">Промокод</p>
    <span>{code}</span>
  </div>
  <p>Используйте промокод в ресторанах Rostic's.</p>'''
    else:
        prize_block = f'''
  <p><strong>Ваш приз: {tier_label}</strong></p>
  <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>'''

    html_body = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}}
  .container{{max-width:500px;margin:0 auto;background:white;border-radius:20px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,.1);}}
  .logo{{text-align:center;margin-bottom:30px;}}
  .logo span{{background:#E4002B;color:white;padding:10px 20px;border-radius:25px;font-weight:bold;font-size:18px;}}
  h1{{color:#E4002B;text-align:center;margin-bottom:20px;}}
  .promo{{background:#f8f8f8;border:3px solid #FFD700;border-radius:15px;padding:20px;text-align:center;margin:30px 0;}}
  .promo span{{font-size:32px;font-weight:bold;letter-spacing:4px;color:#E4002B;}}
  p{{color:#666;line-height:1.6;text-align:center;}}
  .rank{{display:inline-block;background:#eef2ff;color:#6366f1;padding:4px 14px;border-radius:20px;font-weight:600;font-size:14px;margin-bottom:12px;}}
  .footer{{text-align:center;margin-top:30px;color:#999;font-size:12px;}}
</style></head>
<body><div class="container">
  <div class="logo"><span>ROSTIC'S</span></div>
  <h1>Поздравляем, {username}!</h1>
  <p>Вы заняли <span class="rank">#{rank} место</span> в рейтинге игры<br><strong>Легенды Космоса — Мэтч-3</strong></p>
  {prize_block}
  <div class="footer">© Юнирест, 2026 | rosticslegends.ru</div>
</div></body></html>"""

    text_body = (
        f"ROSTIC'S — Поздравляем! Вы заняли #{rank} место в Легенды Космоса — Мэтч-3.\n"
        f"Ваш приз: {tier_label}\n"
        + (f"Промокод: {code}\n" if code else "Наш менеджер свяжется с вами.\n")
        + "\n© Юнирест, 2026 | rosticslegends.ru"
    )

    if not current_app.config.get('MAIL_USERNAME'):
        current_app.logger.warning(f"MATCH3_PRIZE_EMAIL email={email} rank={rank} tier={tier} code={code}")
        return True

    try:
        msg = Message(subject=subject, recipients=[email], body=text_body, html=html_body)
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send match3 prize email to {email}: {e}")
        return False


# ─── Access control ───────────────────────────────────────────────────────────
def require_admin(f):
    @wraps(f)
    @login_required
    def wrapped(*args, **kwargs):
        if current_user.role not in ('superadmin', 'quest_admin'):
            flash('Недостаточно прав доступа', 'danger')
            return redirect('/admin')
        return f(*args, **kwargs)
    return wrapped


# ─── Base template (reuses quest_views sidebar pattern) ──────────────────────
MATCH3_BASE_TEMPLATE = '''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }} - ROSTIC'S Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --primary:#6366f1; --primary-dark:#4f46e5; --success:#10b981; --warning:#f59e0b; --danger:#ef4444; --info:#06b6d4; --dark:#1e293b; --light:#f8fafc; }
        * { font-family: 'Inter', sans-serif; }
        body { background: var(--light); min-height: 100vh; }
        .sidebar { width:260px; background:var(--dark); min-height:100vh; position:fixed; left:0; top:0; padding:1.5rem; z-index:1000; }
        .sidebar-brand { color:white; font-size:1.25rem; font-weight:700; display:flex; align-items:center; gap:.75rem; padding-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,.1); margin-bottom:1.5rem; text-decoration:none; }
        .sidebar-brand:hover { color:white; }
        .sidebar-brand i { color:var(--primary); font-size:1.5rem; }
        .nav-section { color:rgba(255,255,255,.4); font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:.75rem; padding-left:.75rem; }
        .sidebar-nav { list-style:none; padding:0; margin:0 0 1.5rem 0; }
        .sidebar-nav a { color:rgba(255,255,255,.7); text-decoration:none; display:flex; align-items:center; gap:.75rem; padding:.75rem; border-radius:10px; transition:all .2s; font-weight:500; font-size:.9rem; }
        .sidebar-nav a:hover { background:rgba(255,255,255,.08); color:white; }
        .sidebar-nav a.active { background:var(--primary); color:white; }
        .sidebar-nav i { font-size:1.1rem; opacity:.8; }
        .main-content { margin-left:260px; padding:2rem; }
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .page-title { font-size:1.75rem; font-weight:700; color:var(--dark); margin:0; }
        .card { background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,.05); margin-bottom:1.5rem; }
        .card-header { padding:1.25rem 1.5rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:transparent; flex-wrap:wrap; gap:1rem; }
        .card-title { font-weight:600; color:var(--dark); margin:0; font-size:1rem; }
        .card-body { padding:1.5rem; }
        .table { margin:0; }
        .table th { background:#f8fafc; font-weight:600; font-size:.75rem; text-transform:uppercase; letter-spacing:.5px; color:#64748b; padding:1rem; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
        .table td { padding:.85rem 1rem; vertical-align:middle; border-bottom:1px solid #f1f5f9; font-size:.875rem; }
        .table tbody tr:hover { background:#f8fafc; }
        .badge { font-weight:500; padding:.3rem .7rem; border-radius:6px; font-size:.75rem; }
        .badge-success { background:#dcfce7; color:#166534; }
        .badge-warning { background:#fef3c7; color:#92400e; }
        .badge-danger { background:#fee2e2; color:#991b1b; }
        .badge-info { background:#e0f2fe; color:#0369a1; }
        .badge-secondary { background:#f1f5f9; color:#475569; }
        .btn { font-weight:500; border-radius:10px; padding:.5rem 1rem; font-size:.875rem; transition:all .2s; }
        .btn-primary { background:var(--primary); border:none; color:white; }
        .btn-primary:hover { background:var(--primary-dark); color:white; }
        .btn-success { background:var(--success); border:none; color:white; }
        .btn-success:hover { background:#059669; color:white; }
        .btn-sm { padding:.3rem .7rem; font-size:.8rem; }
        .btn-outline-secondary { border:2px solid #e2e8f0; color:var(--dark); background:white; }
        .alert { border:none; border-radius:12px; margin-bottom:1.5rem; }
        .alert-success { background:#dcfce7; color:#166534; }
        .alert-danger { background:#fee2e2; color:#991b1b; }
        .alert-info { background:#e0f2fe; color:#0369a1; }
        .tab-nav { display:flex; gap:.5rem; margin-bottom:1.5rem; }
        .tab-nav a { padding:.6rem 1.5rem; border-radius:10px; text-decoration:none; font-weight:500; font-size:.9rem; color:#64748b; background:#f1f5f9; }
        .tab-nav a.active { background:var(--primary); color:white; }
        .rank-badge { display:inline-block; width:32px; height:32px; border-radius:50%; background:#f1f5f9; color:#475569; font-weight:700; font-size:.85rem; line-height:32px; text-align:center; }
        .rank-badge.gold { background:#fef3c7; color:#92400e; }
        .rank-badge.silver { background:#f1f5f9; color:#475569; }
        .rank-badge.bronze { background:#fde8d8; color:#7c3217; }
        @media (max-width:768px) { .sidebar{display:none;} .main-content{margin-left:0;} }
    </style>
</head>
<body>
    <aside class="sidebar">
        <a href="/admin" class="sidebar-brand">
            <i class="bi bi-controller"></i>
            <span>ROSTIC'S Admin</span>
        </a>
        <div class="nav-section">Главная</div>
        <ul class="sidebar-nav">
            <li><a href="/admin"><i class="bi bi-grid-1x2"></i> Дашборд</a></li>
            <li><a href="/admin/analytics/"><i class="bi bi-bar-chart-line"></i> Аналитика</a></li>
        </ul>
        <div class="nav-section">Пользователи</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/user/"><i class="bi bi-people"></i> Все пользователи</a></li>
            <li><a href="/admin/progress/"><i class="bi bi-graph-up"></i> Прогресс</a></li>
            <li><a href="/admin/activity/"><i class="bi bi-activity"></i> Активность</a></li>
        </ul>
        <div class="nav-section">Игра</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/level/"><i class="bi bi-layers"></i> Уровни</a></li>
            <li><a href="/level-editor/"><i class="bi bi-grid-3x3-gap"></i> Конструктор</a></li>
            <li><a href="/admin/session/"><i class="bi bi-joystick"></i> Сессии</a></li>
        </ul>
        <div class="nav-section">Квест</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/quest/pages/"><i class="bi bi-file-text"></i> Страницы квеста</a></li>
            <li><a href="/admin/quest/promo/"><i class="bi bi-ticket-perforated"></i> Промокоды</a></li>
            <li><a href="/admin/quest/promo/bulk-email"><i class="bi bi-envelope-at"></i> Рассылка квест</a></li>
            <li><a href="/admin/quest/progress/"><i class="bi bi-trophy"></i> Прогресс участников</a></li>
        </ul>
        <div class="nav-section">Мэтч-3</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/match3/prizes/" {% if active_page == 'match3_prizes' %}class="active"{% endif %}><i class="bi bi-award"></i> Призы рейтинга</a></li>
            <li><a href="/admin/match3/pools/" {% if active_page == 'match3_pools' %}class="active"{% endif %}><i class="bi bi-ticket-detailed"></i> Пулы промокодов</a></li>
        </ul>
        <div class="nav-section">Система</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/adminuser/"><i class="bi bi-shield-lock"></i> Админы</a></li>
            <li><a href="/auth/logout"><i class="bi bi-box-arrow-left"></i> Выход</a></li>
        </ul>
    </aside>
    <main class="main-content">
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="alert alert-{{ 'success' if category == 'success' else ('info' if category == 'info' else 'danger') }}">
                        <i class="bi bi-{{ 'check-circle' if category == 'success' else ('info-circle' if category == 'info' else 'exclamation-circle') }} me-2"></i>{{ message }}
                    </div>
                {% endfor %}
            {% endif %}
        {% endwith %}
        {{ content | safe }}
    </main>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''


def render_match3_page(title, active_page, content):
    from flask import render_template_string
    return render_template_string(MATCH3_BASE_TEMPLATE,
                                  title=title, active_page=active_page, content=content)


# ─── Helper: build leaderboard rows with tier + prize status ─────────────────
def _build_rows(city: str):
    """Return list of dicts ready for template rendering."""
    ranked = _get_leaderboard(city)
    prize_map = _get_prize_map(city)

    rows = []
    for rank, user in ranked:
        tier = _assign_moscow_tier(rank) if city == 'moscow' else _assign_region_tier(rank)
        prize = prize_map.get(user.id)
        rows.append({
            'rank': rank,
            'user': user,
            'tier': tier,
            'tier_label': TIER_LABELS[tier],
            'needs_code': TIER_NEEDS_CODE[tier],
            'prize': prize,
            'sent': prize is not None and prize.email_sent_at is not None,
        })
    return rows


# ─── Routes ──────────────────────────────────────────────────────────────────
@bp.route('/prizes/')
@require_admin
def prizes_list():
    """Show leaderboard for both regions with prize status."""
    tab = request.args.get('tab', 'moscow')
    city = 'moscow' if tab == 'moscow' else 'region'
    rows = _build_rows(city)

    sent_count = sum(1 for r in rows if r['sent'])
    total = len(rows)

    # Pool status
    pools = PromoCodePool.query.filter_by(category='match3', is_active=True).all()
    pool_info = {p.tier: {'name': p.name, 'remaining': p.total_codes - p.used_codes} for p in pools}

    def rank_cls(rank):
        if rank == 1: return 'gold'
        if rank <= 3: return 'silver'
        if rank <= 10: return 'bronze'
        return ''

    rows_html = ''
    for r in rows:
        prize = r['prize']
        if r['sent']:
            status = f'<span class="badge badge-success">Отправлено<br><small>{prize.email_sent_at.strftime("%d.%m %H:%M") if prize.email_sent_at else ""}</small></span>'
        elif prize:
            status = '<span class="badge badge-warning">Создан, не отправлен</span>'
        else:
            status = '<span class="badge badge-secondary">Не отправлено</span>'

        code_display = f'<code style="font-size:.8rem">{prize.code}</code>' if prize and prize.code else '<span class="text-muted">—</span>'

        action_btn = ''
        if not r['sent']:
            action_btn = f'''
            <form method="post" action="/admin/match3/prizes/send-one" style="display:inline">
                <input type="hidden" name="user_id" value="{r['user'].id}">
                <input type="hidden" name="city" value="{city}">
                <input type="hidden" name="rank" value="{r['rank']}">
                <input type="hidden" name="tier" value="{r['tier']}">
                <button type="submit" class="btn btn-success btn-sm">
                    <i class="bi bi-send"></i> Отправить
                </button>
            </form>'''
        else:
            action_btn = '<span class="text-muted">✓</span>'

        rows_html += f'''
        <tr>
            <td><span class="rank-badge {rank_cls(r['rank'])}">{r['rank']}</span></td>
            <td><strong>{r['user'].username}</strong></td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{r['user'].email}</td>
            <td>{r['user'].city_name or r['user'].city}</td>
            <td><strong>{r['user'].total_score:,}</strong></td>
            <td><span class="badge {'badge-info' if r['needs_code'] else 'badge-warning'}">{r['tier_label']}</span></td>
            <td>{code_display}</td>
            <td>{status}</td>
            <td class="action-btns">{action_btn}</td>
        </tr>'''

    pool_cards = ''
    for tier_key, info in pool_info.items():
        remaining = info['remaining']
        cls = 'danger' if remaining < 20 else ('warning' if remaining < 100 else 'success')
        pool_cards += f'<span class="badge badge-{cls} me-2">{info["name"]}: {remaining} кодов</span>'

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-award me-2"></i>Призы рейтинга Мэтч-3</h1>
        <div>
            <form method="post" action="/admin/match3/prizes/send-all" style="display:inline">
                <input type="hidden" name="city" value="{city}">
                <button type="submit" class="btn btn-primary"
                    onclick="return confirm('Отправить призовые письма всем, кто ещё не получил?')">
                    <i class="bi bi-send-fill me-2"></i>Отправить всем непосланным
                </button>
            </form>
        </div>
    </div>

    {"<div class='card card-body mb-3'><strong>Пулы промокодов мэтч-3:</strong> " + (pool_cards or "<span class='text-muted'>Нет активных пулов с category=match3</span>") + "</div>" if True else ""}

    <div class="tab-nav">
        <a href="?tab=moscow" class="{'active' if tab == 'moscow' else ''}"><i class="bi bi-building me-1"></i>Москва</a>
        <a href="?tab=region" class="{'active' if tab == 'region' else ''}"><i class="bi bi-geo-alt me-1"></i>Регионы</a>
    </div>

    <div class="card">
        <div class="card-header">
            <span class="card-title">
                {'Москва' if city == 'moscow' else 'Регионы'} — топ {total} игроков
            </span>
            <span class="text-muted">Отправлено: {sent_count} / {total}</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Игрок</th>
                        <th>Email</th>
                        <th>Город</th>
                        <th>Очки</th>
                        <th>Приз</th>
                        <th>Промокод</th>
                        <th>Статус</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html if rows_html else '<tr><td colspan="9" class="text-center text-muted py-4">Нет игроков в этом регионе</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    '''

    return render_match3_page('Призы рейтинга Мэтч-3', 'match3_prizes', content)


@bp.route('/prizes/send-one', methods=['POST'])
@require_admin
def send_one_prize():
    """Send prize to a single player."""
    user_id = request.form.get('user_id', type=int)
    city = request.form.get('city', 'moscow')
    rank = request.form.get('rank', type=int)
    tier = request.form.get('tier', '')

    user = User.query.get(user_id)
    if not user:
        flash('Пользователь не найден', 'danger')
        return redirect(f'/admin/match3/prizes/?tab={city}')

    # Idempotency: check if prize already sent
    existing = Match3Prize.query.filter_by(user_id=user_id, region=city).first()
    if existing and existing.email_sent_at:
        flash(f'{user.username}: приз уже был отправлен', 'info')
        return redirect(f'/admin/match3/prizes/?tab={city}')

    code = None
    if TIER_NEEDS_CODE.get(tier):
        code = _claim_code_for_tier(tier)
        if code is None:
            flash(f'Нет доступных промокодов для тира {tier}. Добавьте пул с category=match3, tier={TIER_TO_POOL_TIER.get(tier)}', 'danger')
            return redirect(f'/admin/match3/prizes/?tab={city}')

    ok = _send_match3_prize_email(
        email=user.email,
        username=user.username,
        tier=tier,
        code=code,
        rank=rank,
    )

    if ok:
        now = datetime.utcnow()
        if existing:
            existing.code = code
            existing.email_sent_at = now
        else:
            prize = Match3Prize(
                user_id=user_id,
                region=city,
                rank=rank,
                tier=tier,
                prize_description=TIER_LABELS.get(tier, ''),
                code=code,
                email_sent_at=now,
            )
            db.session.add(prize)
        db.session.commit()
        flash(f'Приз отправлен: {user.username} ({user.email})', 'success')
    else:
        # Still record the code as claimed even if email failed, so we don't lose it
        if code:
            if existing:
                existing.code = code
            else:
                prize = Match3Prize(
                    user_id=user_id,
                    region=city,
                    rank=rank,
                    tier=tier,
                    prize_description=TIER_LABELS.get(tier, ''),
                    code=code,
                    email_sent_at=None,
                )
                db.session.add(prize)
            db.session.commit()
        flash(f'Ошибка отправки письма для {user.email}. Код сохранён в базе.', 'danger')

    return redirect(f'/admin/match3/prizes/?tab={city}')


@bp.route('/prizes/send-all', methods=['POST'])
@require_admin
def send_all_prizes():
    """Bulk send prizes to all players who haven't received one yet."""
    city = request.form.get('city', 'moscow')
    ranked = _get_leaderboard(city)
    prize_map = _get_prize_map(city)

    sent_ok = 0
    sent_fail = 0
    skipped = 0

    for rank, user in ranked:
        # Skip if already sent
        existing = prize_map.get(user.id)
        if existing and existing.email_sent_at:
            skipped += 1
            continue

        tier = _assign_moscow_tier(rank) if city == 'moscow' else _assign_region_tier(rank)

        code = None
        if TIER_NEEDS_CODE.get(tier):
            code = _claim_code_for_tier(tier)
            if code is None:
                current_app.logger.warning(f"No codes for tier {tier}, skipping user {user.id}")
                sent_fail += 1
                continue

        ok = _send_match3_prize_email(
            email=user.email,
            username=user.username,
            tier=tier,
            code=code,
            rank=rank,
        )

        now = datetime.utcnow()
        if existing:
            existing.code = code
            if ok:
                existing.email_sent_at = now
        else:
            prize = Match3Prize(
                user_id=user.id,
                region=city,
                rank=rank,
                tier=tier,
                prize_description=TIER_LABELS.get(tier, ''),
                code=code,
                email_sent_at=now if ok else None,
            )
            db.session.add(prize)

        if ok:
            sent_ok += 1
        else:
            sent_fail += 1

    db.session.commit()

    if sent_ok:
        flash(f'Отправлено: {sent_ok}. Пропущено (уже получили): {skipped}.', 'success')
    if sent_fail:
        flash(f'Ошибки отправки: {sent_fail} (проверьте логи или наличие промокодов)', 'danger')
    if not sent_ok and not sent_fail:
        flash('Все игроки уже получили свои призы.', 'info')

    return redirect(f'/admin/match3/prizes/?tab={city}')


# ─── Match3 pool management (shortcut view) ──────────────────────────────────
@bp.route('/pools/')
@require_admin
def pools_list():
    """Show match3 promo code pools."""
    pools = PromoCodePool.query.filter_by(category='match3').order_by(PromoCodePool.id).all()

    rows_html = ''
    for p in pools:
        remaining = p.total_codes - p.used_codes
        cls = 'badge-danger' if remaining < 20 else ('badge-warning' if remaining < 100 else 'badge-success')
        rows_html += f'''
        <tr>
            <td>{p.id}</td>
            <td><strong>{p.name}</strong></td>
            <td><code>{p.tier}</code></td>
            <td>{p.min_score}</td>
            <td>{p.discount_label or "—"}</td>
            <td>{p.total_codes}</td>
            <td>{p.used_codes}</td>
            <td><span class="badge {cls}">{remaining}</span></td>
            <td>{"✓" if p.is_active else "✗"}</td>
        </tr>'''

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-ticket-detailed me-2"></i>Пулы промокодов Мэтч-3</h1>
        <a href="/admin/quest/promo/" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-1"></i>Все пулы
        </a>
    </div>
    <div class="card mb-3 card-body">
        <strong>Ожидаемые тиры (tier) для match3:</strong>
        <ul class="mb-0 mt-2">
            <li><code>match3_7</code> — 7% промокод (Москва 51+, Регионы 51+)</li>
            <li><code>match3_15</code> — 15% промокод (Москва 21–50, Регионы 31–50)</li>
            <li><code>match3_30</code> — 30% промокод (Регионы 1–30)</li>
        </ul>
        Создайте пулы с <code>category=match3</code> и указанными тирами через
        <a href="/admin/quest/promo/">обычное меню промокодов</a>.
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">Активные пулы (category=match3)</span>
            <span class="text-muted">{len(pools)} пулов</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th><th>Название</th><th>Тир</th><th>Min score</th>
                        <th>Скидка</th><th>Всего</th><th>Использовано</th><th>Остаток</th><th>Активен</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html if rows_html else '<tr><td colspan="9" class="text-center text-muted py-4">Нет пулов с category=match3. Создайте их в меню Промокоды, указав category=match3.</td></tr>'}
                </tbody>
            </table>
        </div>
    </div>
    '''

    return render_match3_page('Пулы промокодов Мэтч-3', 'match3_pools', content)
