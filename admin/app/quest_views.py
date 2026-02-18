"""Quest management views for admin panel"""
import io
import os
from flask import Blueprint, render_template_string, redirect, url_for, request, flash, send_file
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime
from app import db
from app.models import QuestPage, QuestProgress, PromoCodePool, PromoCode, User
from sqlalchemy import func, distinct
import segno
import base64
from markupsafe import escape

bp = Blueprint('quest_admin', __name__, url_prefix='/admin/quest')


# ============== ROLE-BASED ACCESS ==============
def require_role(*allowed_roles):
    """Decorator to require specific admin roles"""
    def decorator(f):
        @wraps(f)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in allowed_roles and current_user.role != 'superadmin':
                flash('Недостаточно прав доступа', 'danger')
                return redirect('/admin')
            return f(*args, **kwargs)
        return wrapped
    return decorator


# ============== BASE TEMPLATE ==============
QUEST_BASE_TEMPLATE = '''
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
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --dark: #1e293b;
            --light: #f8fafc;
        }
        * { font-family: 'Inter', sans-serif; }
        body { background: var(--light); min-height: 100vh; }
        .sidebar {
            width: 260px;
            background: var(--dark);
            min-height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            padding: 1.5rem;
            z-index: 1000;
        }
        .sidebar-brand {
            color: white;
            font-size: 1.25rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 1.5rem;
            text-decoration: none;
        }
        .sidebar-brand:hover { color: white; }
        .sidebar-brand i { color: var(--primary); font-size: 1.5rem; }
        .nav-section {
            color: rgba(255,255,255,0.4);
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.75rem;
            padding-left: 0.75rem;
        }
        .sidebar-nav { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }
        .sidebar-nav a {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 10px;
            transition: all 0.2s;
            font-weight: 500;
            font-size: 0.9rem;
        }
        .sidebar-nav a:hover { background: rgba(255,255,255,0.08); color: white; }
        .sidebar-nav a.active { background: var(--primary); color: white; }
        .sidebar-nav i { font-size: 1.1rem; opacity: 0.8; }
        .main-content { margin-left: 260px; padding: 2rem; }
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .page-title { font-size: 1.75rem; font-weight: 700; color: var(--dark); margin: 0; }
        .card {
            background: white;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin-bottom: 1.5rem;
        }
        .card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: transparent;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .card-title { font-weight: 600; color: var(--dark); margin: 0; font-size: 1rem; }
        .card-body { padding: 1.5rem; }
        .table { margin: 0; }
        .table th {
            background: #f8fafc;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
        }
        .table td {
            padding: 1rem;
            vertical-align: middle;
            border-bottom: 1px solid #f1f5f9;
            font-size: 0.9rem;
        }
        .table tbody tr:hover { background: #f8fafc; }
        .badge {
            font-weight: 500;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-info { background: #e0f2fe; color: #0369a1; }
        .btn {
            font-weight: 500;
            border-radius: 10px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .btn-primary { background: var(--primary); border: none; color: white; }
        .btn-primary:hover { background: var(--primary-dark); }
        .btn-danger { background: var(--danger); border: none; color: white; }
        .btn-success { background: var(--success); border: none; }
        .btn-outline-secondary { border: 2px solid #e2e8f0; color: var(--dark); background: white; }
        .btn-outline-secondary:hover { background: #f1f5f9; color: var(--dark); }
        .btn-outline-danger { border: 2px solid var(--danger); color: var(--danger); background: white; }
        .btn-outline-danger:hover { background: var(--danger); color: white; }
        .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
        .form-control, .form-select {
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 0.625rem 1rem;
            font-size: 0.9rem;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
            outline: none;
        }
        .form-label { font-weight: 600; color: var(--dark); font-size: 0.875rem; }
        .pagination { margin: 0; }
        .page-link {
            border: none;
            color: var(--dark);
            padding: 0.5rem 0.875rem;
            border-radius: 8px;
            margin: 0 2px;
        }
        .page-link:hover { background: #f1f5f9; color: var(--dark); }
        .page-item.active .page-link { background: var(--primary); color: white; }
        .alert { border: none; border-radius: 12px; margin-bottom: 1.5rem; }
        .alert-success { background: #dcfce7; color: #166534; }
        .alert-danger { background: #fee2e2; color: #991b1b; }
        .search-box { max-width: 300px; }
        .action-btns { white-space: nowrap; }
        .action-btns .btn { margin-right: 0.25rem; }
        .table-responsive { border-radius: 0 0 16px 16px; }
        .stats-card {
            border-left: 4px solid var(--primary);
            transition: transform 0.2s;
        }
        .stats-card.low-alert {
            border-left-color: var(--danger);
            background: #fff5f5;
        }
        .stats-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; }
        }
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
            <li><a href="/admin" {% if active_page == 'dashboard' %}class="active"{% endif %}><i class="bi bi-grid-1x2"></i> Дашборд</a></li>
            <li><a href="/admin/analytics/" {% if active_page == 'analytics' %}class="active"{% endif %}><i class="bi bi-bar-chart-line"></i> Аналитика</a></li>
        </ul>
        <div class="nav-section">Пользователи</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/user/" {% if active_page == 'users' %}class="active"{% endif %}><i class="bi bi-people"></i> Все пользователи</a></li>
            <li><a href="/admin/progress/" {% if active_page == 'progress' %}class="active"{% endif %}><i class="bi bi-graph-up"></i> Прогресс</a></li>
            <li><a href="/admin/activity/" {% if active_page == 'activity' %}class="active"{% endif %}><i class="bi bi-activity"></i> Активность</a></li>
        </ul>
        <div class="nav-section">Игра</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/level/" {% if active_page == 'levels' %}class="active"{% endif %}><i class="bi bi-layers"></i> Уровни</a></li>
            <li><a href="/level-editor/" {% if active_page == 'level_editor' %}class="active"{% endif %}><i class="bi bi-grid-3x3-gap"></i> Конструктор</a></li>
            <li><a href="/admin/session/" {% if active_page == 'sessions' %}class="active"{% endif %}><i class="bi bi-joystick"></i> Сессии</a></li>
        </ul>
        {% if admin_role in ['quest_admin', 'superadmin'] %}
        <div class="nav-section">Квест</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/quest/pages/" {% if active_page == 'quest_pages' %}class="active"{% endif %}><i class="bi bi-file-text"></i> Страницы квеста</a></li>
            <li><a href="/admin/quest/promo/" {% if active_page == 'quest_promo' %}class="active"{% endif %}><i class="bi bi-ticket-perforated"></i> Промокоды</a></li>
            <li><a href="/admin/quest/progress/" {% if active_page == 'quest_progress' %}class="active"{% endif %}><i class="bi bi-trophy"></i> Прогресс участников</a></li>
            <li><a href="/admin/quest/qr-codes/" {% if active_page == 'quest_qr' %}class="active"{% endif %}><i class="bi bi-qr-code"></i> QR-коды</a></li>
        </ul>
        {% endif %}
        <div class="nav-section">Система</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/adminuser/" {% if active_page == 'admins' %}class="active"{% endif %}><i class="bi bi-shield-lock"></i> Админы</a></li>
            <li><a href="/auth/logout"><i class="bi bi-box-arrow-left"></i> Выход</a></li>
        </ul>
    </aside>
    <main class="main-content">
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                {% for category, message in messages %}
                    <div class="alert alert-{{ 'success' if category == 'success' else 'danger' }}">
                        <i class="bi bi-{{ 'check-circle' if category == 'success' else 'exclamation-circle' }} me-2"></i>{{ message }}
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


def render_quest_page(title, active_page, content):
    """Render a quest admin page with sidebar"""
    role = current_user.role if current_user.is_authenticated else 'superadmin'
    return render_template_string(QUEST_BASE_TEMPLATE,
        title=title, active_page=active_page, content=content, admin_role=role)


# ============== QUEST PAGES MANAGEMENT ==============
@bp.route('/pages/')
@require_role('quest_admin', 'superadmin')
def quest_pages_list():
    """List all quest pages"""
    pages = QuestPage.query.order_by(QuestPage.order).all()

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-file-text me-2"></i>Страницы квеста</h1>
        <a href="/admin/quest/pages/create" class="btn btn-primary"><i class="bi bi-plus-lg me-2"></i>Создать страницу</a>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">Все страницы</span>
            <span class="text-muted">Всего: {len(pages)}</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Порядок</th>
                        <th>Название</th>
                        <th>Slug</th>
                        <th>QR Token</th>
                        <th>Очки</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for page in pages:
        status = '<span class="badge badge-success">Активна</span>' if page.is_active else '<span class="badge badge-danger">Отключена</span>'
        content += f'''
                    <tr>
                        <td><strong>{page.order}</strong></td>
                        <td>{page.title}</td>
                        <td><code>{page.slug}</code></td>
                        <td><code>{page.qr_token}</code></td>
                        <td><strong>{page.points}</strong></td>
                        <td>{status}</td>
                        <td class="action-btns">
                            <a href="/admin/quest/pages/edit/{page.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                            <a href="/admin/quest/pages/delete/{page.id}" class="btn btn-sm btn-danger" onclick="return confirm('Удалить страницу квеста?')"><i class="bi bi-trash"></i></a>
                        </td>
                    </tr>
        '''

    content += '''
                </tbody>
            </table>
        </div>
    </div>
    '''

    return render_quest_page('Страницы квеста', 'quest_pages', content)


@bp.route('/pages/create', methods=['GET', 'POST'])
@require_role('quest_admin', 'superadmin')
def quest_pages_create():
    """Create new quest page"""
    if request.method == 'POST':
        try:
            slug = request.form.get('slug', '').strip()
            title = request.form.get('title', '').strip()
            riddle_text = request.form.get('riddle_text', '').strip()
            fact_text = request.form.get('fact_text', '').strip()
            image_url = request.form.get('image_url', '').strip()
            qr_token = request.form.get('qr_token', '').strip()
            points = int(request.form.get('points', 10))
            order = int(request.form.get('order', 0))
            is_active = request.form.get('is_active') == '1'

            if not slug or not title or not riddle_text or not qr_token:
                flash('Заполните все обязательные поля!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_create'))

            # Check for duplicates
            if QuestPage.query.filter_by(slug=slug).first():
                flash('Страница с таким slug уже существует!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_create'))

            if QuestPage.query.filter_by(qr_token=qr_token).first():
                flash('QR токен уже используется!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_create'))

            page = QuestPage(
                slug=slug,
                title=title,
                riddle_text=riddle_text,
                fact_text=fact_text or None,
                image_url=image_url or None,
                qr_token=qr_token,
                points=points,
                order=order,
                is_active=is_active
            )

            db.session.add(page)
            db.session.commit()

            flash('Страница квеста создана!', 'success')
            return redirect(url_for('quest_admin.quest_pages_list'))

        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка при создании: {str(e)}', 'danger')

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-plus-lg me-2"></i>Создать страницу квеста</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Slug <span class="text-danger">*</span></label>
                        <input type="text" name="slug" class="form-control" placeholder="page-1" required>
                        <small class="text-muted">URL-friendly идентификатор (латиница, дефисы)</small>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Название <span class="text-danger">*</span></label>
                        <input type="text" name="title" class="form-control" placeholder="Загадка №1" required>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Текст загадки <span class="text-danger">*</span></label>
                        <textarea name="riddle_text" class="form-control" rows="4" placeholder="Текст загадки для пользователя..." required></textarea>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Интересный факт</label>
                        <textarea name="fact_text" class="form-control" rows="3" placeholder="Показывается после правильного ответа..."></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">URL изображения</label>
                        <input type="text" name="image_url" class="form-control" placeholder="https://example.com/image.jpg">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">QR Token <span class="text-danger">*</span></label>
                        <input type="text" name="qr_token" class="form-control" placeholder="unique-token-123" required>
                        <small class="text-muted">Уникальный токен для QR-кода</small>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Очки за правильный ответ</label>
                        <input type="number" name="points" class="form-control" value="10" min="0" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Порядок отображения</label>
                        <input type="number" name="order" class="form-control" value="0" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Статус</label>
                        <select name="is_active" class="form-select">
                            <option value="1" selected>Активна</option>
                            <option value="0">Отключена</option>
                        </select>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Создать</button>
                    <a href="/admin/quest/pages/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''

    return render_quest_page('Создать страницу', 'quest_pages', content)


@bp.route('/pages/edit/<int:id>', methods=['GET', 'POST'])
@require_role('quest_admin', 'superadmin')
def quest_pages_edit(id):
    """Edit quest page"""
    page = QuestPage.query.get_or_404(id)

    if request.method == 'POST':
        try:
            slug = request.form.get('slug', '').strip()
            title = request.form.get('title', '').strip()
            riddle_text = request.form.get('riddle_text', '').strip()
            fact_text = request.form.get('fact_text', '').strip()
            image_url = request.form.get('image_url', '').strip()
            qr_token = request.form.get('qr_token', '').strip()
            points = int(request.form.get('points', 10))
            order = int(request.form.get('order', 0))
            is_active = request.form.get('is_active') == '1'

            if not slug or not title or not riddle_text or not qr_token:
                flash('Заполните все обязательные поля!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_edit', id=id))

            # Check for duplicates (excluding current page)
            existing_slug = QuestPage.query.filter(QuestPage.slug == slug, QuestPage.id != id).first()
            if existing_slug:
                flash('Страница с таким slug уже существует!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_edit', id=id))

            existing_token = QuestPage.query.filter(QuestPage.qr_token == qr_token, QuestPage.id != id).first()
            if existing_token:
                flash('QR токен уже используется!', 'danger')
                return redirect(url_for('quest_admin.quest_pages_edit', id=id))

            page.slug = slug
            page.title = title
            page.riddle_text = riddle_text
            page.fact_text = fact_text or None
            page.image_url = image_url or None
            page.qr_token = qr_token
            page.points = points
            page.order = order
            page.is_active = is_active
            page.updated_at = datetime.utcnow()

            db.session.commit()

            flash('Страница квеста обновлена!', 'success')
            return redirect(url_for('quest_admin.quest_pages_list'))

        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка при обновлении: {str(e)}', 'danger')

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-pencil me-2"></i>Редактирование: {page.title}</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Slug <span class="text-danger">*</span></label>
                        <input type="text" name="slug" class="form-control" value="{page.slug}" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Название <span class="text-danger">*</span></label>
                        <input type="text" name="title" class="form-control" value="{page.title}" required>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Текст загадки <span class="text-danger">*</span></label>
                        <textarea name="riddle_text" class="form-control" rows="4" required>{page.riddle_text}</textarea>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Интересный факт</label>
                        <textarea name="fact_text" class="form-control" rows="3">{page.fact_text or ''}</textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">URL изображения</label>
                        <input type="text" name="image_url" class="form-control" value="{page.image_url or ''}">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">QR Token <span class="text-danger">*</span></label>
                        <input type="text" name="qr_token" class="form-control" value="{page.qr_token}" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Очки за правильный ответ</label>
                        <input type="number" name="points" class="form-control" value="{page.points}" min="0" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Порядок отображения</label>
                        <input type="number" name="order" class="form-control" value="{page.order}" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Статус</label>
                        <select name="is_active" class="form-select">
                            <option value="1" {'selected' if page.is_active else ''}>Активна</option>
                            <option value="0" {'' if page.is_active else 'selected'}>Отключена</option>
                        </select>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Сохранить</button>
                    <a href="/admin/quest/pages/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''

    return render_quest_page('Редактирование страницы', 'quest_pages', content)


@bp.route('/pages/delete/<int:id>')
@require_role('quest_admin', 'superadmin')
def quest_pages_delete(id):
    """Delete quest page"""
    page = QuestPage.query.get_or_404(id)

    try:
        db.session.delete(page)
        db.session.commit()
        flash('Страница квеста удалена!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Ошибка при удалении: {str(e)}', 'danger')

    return redirect(url_for('quest_admin.quest_pages_list'))


# ============== PROMO CODE MANAGEMENT ==============
@bp.route('/promo/')
@require_role('quest_admin', 'superadmin')
def promo_pools_list():
    """List all promo code pools with stats"""
    pools = PromoCodePool.query.order_by(PromoCodePool.min_score).all()

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-ticket-perforated me-2"></i>Промокоды</h1>
        <a href="/admin/quest/promo/create-pool" class="btn btn-primary"><i class="bi bi-plus-lg me-2"></i>Создать пул</a>
    </div>
    '''

    # Stats cards for each pool
    content += '<div class="row mb-4">'
    for pool in pools:
        remaining = pool.remaining_codes
        is_low = pool.is_low
        alert_class = 'low-alert' if is_low else ''

        tier_colors = {
            'bronze': '#cd7f32',
            'silver': '#c0c0c0',
            'gold': '#ffd700',
            'platinum': '#e5e4e2'
        }
        tier_color = tier_colors.get(pool.tier, 'var(--primary)')

        content += f'''
        <div class="col-md-6 col-lg-4 mb-3">
            <a href="/admin/quest/promo/{pool.id}" class="text-decoration-none">
                <div class="card stats-card {alert_class}" style="border-left-color: {tier_color};">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="card-title mb-1">{pool.name}</h6>
                                <span class="badge badge-info">{pool.tier.upper()}</span>
                            </div>
                            {'<i class="bi bi-exclamation-triangle text-danger" style="font-size: 1.5rem;"></i>' if is_low else '<i class="bi bi-check-circle text-success" style="font-size: 1.5rem;"></i>'}
                        </div>
                        <div class="small text-muted mb-2">Минимум: {pool.min_score} очков</div>
                        <div class="row text-center">
                            <div class="col-4">
                                <div style="font-size: 1.5rem; font-weight: 700;">{pool.total_codes}</div>
                                <div class="small text-muted">Всего</div>
                            </div>
                            <div class="col-4">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">{remaining}</div>
                                <div class="small text-muted">Осталось</div>
                            </div>
                            <div class="col-4">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">{pool.used_codes}</div>
                                <div class="small text-muted">Использовано</div>
                            </div>
                        </div>
                        {f'<div class="alert alert-danger mt-3 mb-0 py-2"><small><i class="bi bi-exclamation-triangle me-1"></i>Мало кодов! Порог: {pool.alert_threshold}</small></div>' if is_low else ''}
                    </div>
                </div>
            </a>
        </div>
        '''
    content += '</div>'

    # Upload form
    content += '''
    <div class="card">
        <div class="card-header">
            <span class="card-title"><i class="bi bi-upload me-2"></i>Загрузить промокоды</span>
        </div>
        <div class="card-body">
            <form method="POST" action="/admin/quest/promo/upload" enctype="multipart/form-data">
                <div class="row align-items-end">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Пул промокодов</label>
                        <select name="pool_id" class="form-select" required>
                            <option value="">Выберите пул...</option>
    '''

    for pool in pools:
        content += f'<option value="{pool.id}">{pool.name} ({pool.tier})</option>'

    content += '''
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">CSV файл (по одному коду на строку)</label>
                        <input type="file" name="codes_file" class="form-control" accept=".csv,.txt" required>
                    </div>
                    <div class="col-md-2 mb-3">
                        <button type="submit" class="btn btn-success w-100"><i class="bi bi-upload me-2"></i>Загрузить</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    '''

    return render_quest_page('Промокоды', 'quest_promo', content)


@bp.route('/promo/<int:pool_id>')
@require_role('quest_admin', 'superadmin')
def promo_codes_view(pool_id):
    """View codes in a specific pool"""
    pool = PromoCodePool.query.get_or_404(pool_id)
    page = request.args.get('page', 1, type=int)

    pagination = PromoCode.query.filter_by(pool_id=pool_id).order_by(
        PromoCode.is_used.asc(),
        PromoCode.created_at.desc()
    ).paginate(page=page, per_page=25, error_out=False)

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-ticket-perforated me-2"></i>{pool.name}</h1>
        <a href="/admin/quest/promo/" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-2"></i>Назад</a>
    </div>

    <!-- Pool Stats -->
    <div class="row mb-4">
        <div class="col-md-3 col-6 mb-3">
            <div class="card">
                <div class="card-body text-center">
                    <div style="font-size: 2rem; font-weight: 700;">{pool.total_codes}</div>
                    <div class="text-muted">Всего кодов</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="card">
                <div class="card-body text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--success);">{pool.remaining_codes}</div>
                    <div class="text-muted">Осталось</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="card">
                <div class="card-body text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--danger);">{pool.used_codes}</div>
                    <div class="text-muted">Использовано</div>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-3">
            <div class="card">
                <div class="card-body text-center">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--info);">{pool.min_score}</div>
                    <div class="text-muted">Мин. очков</div>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <span class="card-title">Промокоды в пуле</span>
            <span class="text-muted">Показано: {len(pagination.items)} из {pagination.total}</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Код</th>
                        <th>Статус</th>
                        <th>Использован кем</th>
                        <th>Дата использования</th>
                        <th>Создан</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for code in pagination.items:
        status = '<span class="badge badge-danger">Использован</span>' if code.is_used else '<span class="badge badge-success">Доступен</span>'
        used_by = code.used_by.email if code.used_by else '—'
        used_at = code.used_at.strftime('%d.%m.%Y %H:%M') if code.used_at else '—'
        created = code.created_at.strftime('%d.%m.%Y %H:%M') if code.created_at else '—'

        content += f'''
                    <tr>
                        <td><strong>#{code.id}</strong></td>
                        <td><code>{code.code}</code></td>
                        <td>{status}</td>
                        <td>{used_by}</td>
                        <td>{used_at}</td>
                        <td>{created}</td>
                    </tr>
        '''

    content += '</tbody></table></div>'

    # Pagination
    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}"><i class="bi bi-chevron-left"></i></a></li>'
        for p in pagination.iter_pages():
            if p:
                active = 'active' if p == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={p}">{p}</a></li>'
            else:
                content += '<li class="page-item disabled"><span class="page-link">...</span></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'

    return render_quest_page(pool.name, 'quest_promo', content)


@bp.route('/promo/upload', methods=['POST'])
@require_role('quest_admin', 'superadmin')
def promo_codes_upload():
    """Upload promo codes from CSV"""
    try:
        pool_id = int(request.form.get('pool_id', 0))
        pool = PromoCodePool.query.get_or_404(pool_id)

        file = request.files.get('codes_file')
        if not file or file.filename == '':
            flash('Файл не выбран!', 'danger')
            return redirect(url_for('quest_admin.promo_pools_list'))

        # Read file content
        content = file.read().decode('utf-8').strip()
        codes = [line.strip() for line in content.split('\n') if line.strip()]

        if not codes:
            flash('Файл пустой!', 'danger')
            return redirect(url_for('quest_admin.promo_pools_list'))

        added = 0
        duplicates = 0

        for code_text in codes:
            # Check if code already exists
            existing = PromoCode.query.filter_by(code=code_text).first()
            if existing:
                duplicates += 1
                continue

            code = PromoCode(
                pool_id=pool_id,
                code=code_text,
                is_used=False
            )
            db.session.add(code)
            added += 1

        # Update pool total
        pool.total_codes = PromoCode.query.filter_by(pool_id=pool_id).count()

        db.session.commit()

        flash(f'Загружено {added} кодов. Дубликатов пропущено: {duplicates}', 'success')

    except Exception as e:
        db.session.rollback()
        flash(f'Ошибка загрузки: {str(e)}', 'danger')

    return redirect(url_for('quest_admin.promo_pools_list'))


@bp.route('/promo/create-pool', methods=['GET', 'POST'])
@require_role('quest_admin', 'superadmin')
def promo_pool_create():
    """Create new promo code pool"""
    if request.method == 'POST':
        try:
            name = request.form.get('name', '').strip()
            tier = request.form.get('tier', '').strip()
            min_score = int(request.form.get('min_score', 0))
            discount_label = request.form.get('discount_label', '').strip()
            alert_threshold = int(request.form.get('alert_threshold', 10))

            if not name or not tier:
                flash('Заполните все обязательные поля!', 'danger')
                return redirect(url_for('quest_admin.promo_pool_create'))

            pool = PromoCodePool(
                name=name,
                tier=tier,
                min_score=min_score,
                discount_label=discount_label or None,
                alert_threshold=alert_threshold,
                total_codes=0,
                used_codes=0,
                is_active=True
            )

            db.session.add(pool)
            db.session.commit()

            flash('Пул промокодов создан!', 'success')
            return redirect(url_for('quest_admin.promo_pools_list'))

        except Exception as e:
            db.session.rollback()
            flash(f'Ошибка при создании: {str(e)}', 'danger')

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-plus-lg me-2"></i>Создать пул промокодов</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Название <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" placeholder="Бронзовые промокоды" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Уровень (tier) <span class="text-danger">*</span></label>
                        <select name="tier" class="form-select" required>
                            <option value="">Выберите...</option>
                            <option value="bronze">Bronze (Бронза)</option>
                            <option value="silver">Silver (Серебро)</option>
                            <option value="gold">Gold (Золото)</option>
                            <option value="platinum">Platinum (Платина)</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Минимум очков</label>
                        <input type="number" name="min_score" class="form-control" value="0" min="0" required>
                        <small class="text-muted">Минимальное количество очков для получения</small>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Порог предупреждения</label>
                        <input type="number" name="alert_threshold" class="form-control" value="10" min="1" required>
                        <small class="text-muted">Показывать предупреждение когда останется меньше</small>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Описание скидки</label>
                        <input type="text" name="discount_label" class="form-control" placeholder="Скидка 10% на заказ">
                        <small class="text-muted">Для отображения пользователю</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Создать</button>
                    <a href="/admin/quest/promo/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''

    return render_quest_page('Создать пул', 'quest_promo', content)


# ============== QUEST PROGRESS ==============
@bp.route('/progress/')
@require_role('quest_admin', 'superadmin')
def quest_progress_list():
    """View quest participants progress"""
    page = request.args.get('page', 1, type=int)

    # Get users who participated in quest (have quest progress)
    participants_query = db.session.query(
        User.id,
        User.username,
        User.email,
        User.registration_source,
        User.quest_score,
        func.count(QuestProgress.id).label('questions_answered'),
        func.sum(func.cast(QuestProgress.is_correct, db.Integer)).label('correct_count'),
        func.sum(func.cast(QuestProgress.is_skipped, db.Integer)).label('skipped_count'),
        func.max(PromoCode.code).label('promo_code')
    ).outerjoin(
        QuestProgress, User.id == QuestProgress.user_id
    ).outerjoin(
        PromoCode, User.id == PromoCode.used_by_user_id
    ).group_by(
        User.id
    ).having(
        func.count(QuestProgress.id) > 0
    ).order_by(
        User.quest_score.desc()
    )

    pagination = db.session.query(
        User.id,
        User.username,
        User.email,
        User.registration_source,
        User.quest_score,
        func.count(QuestProgress.id).label('questions_answered'),
        func.sum(func.cast(QuestProgress.is_correct, db.Integer)).label('correct_count'),
        func.sum(func.cast(QuestProgress.is_skipped, db.Integer)).label('skipped_count')
    ).outerjoin(
        QuestProgress, User.id == QuestProgress.user_id
    ).group_by(
        User.id
    ).having(
        func.count(QuestProgress.id) > 0
    ).order_by(
        User.quest_score.desc()
    ).paginate(page=page, per_page=25, error_out=False)

    # Total stats
    total_participants = db.session.query(func.count(func.distinct(QuestProgress.user_id))).scalar() or 0
    total_answers = QuestProgress.query.count()

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-trophy me-2"></i>Прогресс участников квеста</h1>
    </div>

    <!-- Summary Stats -->
    <div class="row mb-4">
        <div class="col-md-6 mb-3">
            <div class="card" style="border-left: 4px solid var(--primary);">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-muted small">Всего участников</div>
                            <div style="font-size: 2rem; font-weight: 700; color: var(--dark);">{total_participants}</div>
                        </div>
                        <i class="bi bi-people" style="font-size: 2rem; color: var(--primary);"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-3">
            <div class="card" style="border-left: 4px solid var(--success);">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-muted small">Всего ответов</div>
                            <div style="font-size: 2rem; font-weight: 700; color: var(--dark);">{total_answers}</div>
                        </div>
                        <i class="bi bi-check-circle" style="font-size: 2rem; color: var(--success);"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <span class="card-title">Участники</span>
            <span class="text-muted">Показано: {len(pagination.items)} из {pagination.total}</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Источник</th>
                        <th>Ответов</th>
                        <th>Правильно</th>
                        <th>Пропущено</th>
                        <th>Очки</th>
                        <th>Промокод</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for row in pagination.items:
        user_id = row.id
        username = row.username
        email = row.email
        source = row.registration_source or 'game'
        quest_score = row.quest_score or 0
        answered = row.questions_answered or 0
        correct = row.correct_count or 0
        skipped = row.skipped_count or 0

        # Get promo code if claimed
        promo = PromoCode.query.filter_by(used_by_user_id=user_id).first()
        promo_display = f'<span class="badge badge-success">{promo.code}</span>' if promo else '<span class="text-muted">—</span>'

        source_badge = 'badge-info' if source == 'quest' else 'badge-warning'

        content += f'''
                    <tr>
                        <td><strong>#{user_id}</strong></td>
                        <td>{username}</td>
                        <td>{email}</td>
                        <td><span class="badge {source_badge}">{source}</span></td>
                        <td><strong>{answered}</strong></td>
                        <td><span class="badge badge-success">{correct}</span></td>
                        <td><span class="badge badge-warning">{skipped}</span></td>
                        <td><strong>{quest_score}</strong></td>
                        <td>{promo_display}</td>
                        <td class="action-btns">
                            <form method="POST" action="/admin/quest/progress/reset/{user_id}" style="display:inline;">
                                <button type="submit" class="btn btn-sm btn-outline-danger" onclick="return confirm('Сбросить весь прогресс квеста для {username or email}? Это действие необратимо.')">
                                    <i class="bi bi-arrow-counterclockwise"></i> Сбросить
                                </button>
                            </form>
                        </td>
                    </tr>
        '''

    content += '</tbody></table></div>'

    # Pagination
    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}"><i class="bi bi-chevron-left"></i></a></li>'
        for p in pagination.iter_pages():
            if p:
                active = 'active' if p == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={p}">{p}</a></li>'
            else:
                content += '<li class="page-item disabled"><span class="page-link">...</span></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'

    return render_quest_page('Прогресс квеста', 'quest_progress', content)


@bp.route('/progress/reset/<int:user_id>', methods=['POST'])
@require_role('quest_admin', 'superadmin')
def quest_progress_reset(user_id):
    """Reset a user's quest progress completely"""
    user = User.query.get_or_404(user_id)

    try:
        # Delete all QuestProgress rows for this user
        QuestProgress.query.filter_by(user_id=user_id).delete()

        # Reset quest score
        user.quest_score = 0

        # Release any claimed promo codes
        claimed_codes = PromoCode.query.filter_by(used_by_user_id=user_id).all()
        for code in claimed_codes:
            pool = PromoCodePool.query.get(code.pool_id)
            code.is_used = False
            code.used_by_user_id = None
            code.used_at = None
            if pool and pool.used_codes > 0:
                pool.used_codes -= 1

        db.session.commit()

        flash(f'Прогресс квеста для {user.username or user.email} сброшен!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Ошибка при сбросе прогресса: {str(e)}', 'danger')

    return redirect(url_for('quest_admin.quest_progress_list'))


# ============== QR CODE GENERATION ==============
def _generate_qr_svg(data: str) -> str:
    """Generate QR code as SVG string"""
    qr = segno.make(data, error='M')
    buf = io.BytesIO()
    qr.save(buf, kind='svg', scale=4, border=2, dark='#1e293b')
    return buf.getvalue().decode('utf-8')


def _get_frontend_url() -> str:
    return os.environ.get('FRONTEND_URL', 'https://rosticslegends.ru')


@bp.route('/qr-codes/')
@require_role('quest_admin', 'superadmin')
def qr_codes_page():
    """Page showing all quest pages with QR codes in a printable grid"""
    pages = QuestPage.query.filter_by(is_active=True).order_by(QuestPage.order).all()
    frontend_url = _get_frontend_url()

    cards_html = ''
    for page in pages:
        qr_url = f'{frontend_url}/spacequest/scan/{page.qr_token}'
        svg_str = _generate_qr_svg(qr_url)
        svg_b64 = base64.b64encode(svg_str.encode('utf-8')).decode('ascii')
        safe_title = escape(page.title)
        safe_token = escape(page.qr_token)

        cards_html += f'''
        <div class="qr-card">
            <div class="qr-card-header">
                <span class="qr-hall">#{page.order}</span>
                <span class="qr-title">{safe_title}</span>
            </div>
            <div class="qr-image">
                <img src="data:image/svg+xml;base64,{svg_b64}" alt="QR for {safe_title}" />
            </div>
            <div class="qr-card-footer">
                <code class="qr-token">{safe_token}</code>
                <a href="/admin/quest/qr-codes/download/{page.id}" class="btn btn-sm btn-outline-secondary no-print">
                    <i class="bi bi-download"></i> SVG
                </a>
            </div>
        </div>
        '''

    content = f'''
    <style>
        .qr-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 24px;
            margin-top: 16px;
        }}
        .qr-card {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            break-inside: avoid;
        }}
        .qr-card-header {{
            margin-bottom: 12px;
        }}
        .qr-hall {{
            display: inline-block;
            background: var(--primary);
            color: white;
            font-weight: 700;
            font-size: 0.8rem;
            padding: 2px 10px;
            border-radius: 6px;
            margin-right: 8px;
        }}
        .qr-title {{
            font-weight: 600;
            color: var(--dark);
            font-size: 0.95rem;
        }}
        .qr-image {{
            margin: 12px auto;
            max-width: 200px;
        }}
        .qr-image img {{
            width: 100%;
            height: auto;
        }}
        .qr-card-footer {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-top: 8px;
        }}
        .qr-token {{
            font-size: 0.75rem;
            color: #64748b;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}

        @media print {{
            .sidebar {{ display: none !important; }}
            .main-content {{ margin-left: 0 !important; padding: 0 !important; }}
            .page-header .btn {{ display: none !important; }}
            .no-print {{ display: none !important; }}
            .qr-grid {{
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }}
            .qr-card {{
                border: 1px solid #ccc;
                box-shadow: none;
                padding: 12px;
            }}
            .qr-image {{ max-width: 160px; }}
        }}
    </style>

    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-qr-code me-2"></i>QR-коды квеста</h1>
        <button class="btn btn-primary no-print" onclick="window.print()">
            <i class="bi bi-printer me-2"></i>Печать
        </button>
    </div>

    <div class="card no-print" style="margin-bottom: 16px;">
        <div class="card-body">
            <small class="text-muted">
                <i class="bi bi-info-circle me-1"></i>
                QR-коды ведут на <code>{frontend_url}/spacequest/scan/{{token}}</code>.
                Активных страниц: <strong>{len(pages)}</strong>.
                Нажмите «Печать» для вывода на принтер.
            </small>
        </div>
    </div>

    <div class="qr-grid">
        {cards_html}
    </div>
    '''

    return render_quest_page('QR-коды квеста', 'quest_qr', content)


@bp.route('/qr-codes/download/<int:page_id>')
@require_role('quest_admin', 'superadmin')
def qr_code_download(page_id):
    """Download individual QR code as SVG file"""
    page = QuestPage.query.get_or_404(page_id)
    frontend_url = _get_frontend_url()
    qr_url = f'{frontend_url}/spacequest/scan/{page.qr_token}'

    svg_str = _generate_qr_svg(qr_url)
    buf = io.BytesIO(svg_str.encode('utf-8'))
    buf.seek(0)

    filename = f'qr_{page.slug}.svg'
    return send_file(buf, mimetype='image/svg+xml', as_attachment=True, download_name=filename)
