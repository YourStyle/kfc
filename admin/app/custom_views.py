"""Custom Russian admin views with consistent design"""
from flask import Blueprint, render_template_string, redirect, url_for, request, flash
from flask_login import login_required, current_user
from app import db
from app.models import User, Level, UserLevelProgress, GameSession, UserActivity, AdminUser

bp = Blueprint('custom_admin', __name__)

# Shared base template
BASE_TEMPLATE = '''
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
        .stars { color: #f59e0b; }
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


def render_page(title, active_page, content):
    return render_template_string(BASE_TEMPLATE, title=title, active_page=active_page, content=content)


# ============== USERS ==============
@bp.route('/user/')
@login_required
def users_list():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')

    query = User.query
    if search:
        query = query.filter(
            (User.username.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )

    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=25, error_out=False)

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-people me-2"></i>Пользователи</h1>
    </div>
    <div class="card">
        <div class="card-header">
            <form method="GET" class="search-box">
                <input type="text" name="search" class="form-control" placeholder="Поиск..." value="{search}">
            </form>
            <span class="text-muted">Всего: {pagination.total}</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Статус</th>
                        <th>Код</th>
                        <th>Очки</th>
                        <th>Регистрация</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for u in pagination.items:
        status = '<span class="badge badge-success">Подтверждён</span>' if u.is_verified else '<span class="badge badge-warning">Ожидает</span>'
        code = f'<code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">{u.verification_code}</code>' if u.verification_code else '<span class="text-muted">—</span>'
        date = u.created_at.strftime('%d.%m.%Y %H:%M') if u.created_at else '—'
        content += f'''
                    <tr>
                        <td><strong>#{u.id}</strong></td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{status}</td>
                        <td>{code}</td>
                        <td><strong>{u.total_score:,}</strong></td>
                        <td>{date}</td>
                        <td class="action-btns">
                            <a href="/admin/user/edit/{u.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                            <a href="/admin/user/delete/{u.id}" class="btn btn-sm btn-danger" onclick="return confirm('Удалить пользователя?')"><i class="bi bi-trash"></i></a>
                        </td>
                    </tr>
        '''

    content += '''
                </tbody>
            </table>
        </div>
    '''

    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}&search={search}"><i class="bi bi-chevron-left"></i></a></li>'
        for p in pagination.iter_pages():
            if p:
                active = 'active' if p == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={p}&search={search}">{p}</a></li>'
            else:
                content += '<li class="page-item disabled"><span class="page-link">...</span></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}&search={search}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'

    return render_page('Пользователи', 'users', content)


@bp.route('/user/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def user_edit(id):
    user = User.query.get_or_404(id)

    if request.method == 'POST':
        user.username = request.form.get('username', user.username)
        user.email = request.form.get('email', user.email)
        user.is_verified = request.form.get('is_verified') == '1'
        user.total_score = int(request.form.get('total_score', 0))
        user.verification_code = request.form.get('verification_code') or None
        db.session.commit()
        flash('Пользователь обновлён!', 'success')
        return redirect(url_for('custom_admin.users_list'))

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-pencil me-2"></i>Редактирование пользователя #{user.id}</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Имя</label>
                        <input type="text" name="username" class="form-control" value="{user.username}" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-control" value="{user.email}" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Статус</label>
                        <select name="is_verified" class="form-select">
                            <option value="1" {'selected' if user.is_verified else ''}>Подтверждён</option>
                            <option value="0" {'' if user.is_verified else 'selected'}>Ожидает</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Очки</label>
                        <input type="number" name="total_score" class="form-control" value="{user.total_score}">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Код верификации</label>
                        <input type="text" name="verification_code" class="form-control" value="{user.verification_code or ''}">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Сохранить</button>
                    <a href="/admin/user/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''
    return render_page('Редактирование пользователя', 'users', content)


@bp.route('/user/delete/<int:id>')
@login_required
def user_delete(id):
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    flash('Пользователь удалён!', 'success')
    return redirect(url_for('custom_admin.users_list'))


# ============== PROGRESS ==============
@bp.route('/progress/')
@login_required
def progress_list():
    page = request.args.get('page', 1, type=int)
    pagination = UserLevelProgress.query.order_by(UserLevelProgress.completed_at.desc().nullslast()).paginate(page=page, per_page=25, error_out=False)

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-graph-up me-2"></i>Прогресс игроков</h1>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">История прохождений</span>
            <span class="text-muted">Всего: ''' + str(pagination.total) + '''</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Игрок</th>
                        <th>Уровень</th>
                        <th>Лучший счёт</th>
                        <th>Звёзды</th>
                        <th>Попытки</th>
                        <th>Завершён</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for p in pagination.items:
        stars = '⭐' * p.stars + '☆' * (3 - p.stars) if p.stars else '—'
        date = p.completed_at.strftime('%d.%m.%Y %H:%M') if p.completed_at else '—'
        user_name = p.user.username if p.user else '—'
        level_name = p.level.name if p.level else '—'
        content += f'''
                    <tr>
                        <td><strong>#{p.id}</strong></td>
                        <td>{user_name}</td>
                        <td>{level_name}</td>
                        <td><strong>{p.best_score:,}</strong></td>
                        <td class="stars">{stars}</td>
                        <td>{p.attempts_count}</td>
                        <td>{date}</td>
                    </tr>
        '''

    content += '</tbody></table></div>'

    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}"><i class="bi bi-chevron-left"></i></a></li>'
        for pg in pagination.iter_pages():
            if pg:
                active = 'active' if pg == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={pg}">{pg}</a></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'
    return render_page('Прогресс', 'progress', content)


# ============== ACTIVITY ==============
@bp.route('/activity/')
@login_required
def activity_list():
    page = request.args.get('page', 1, type=int)
    pagination = UserActivity.query.order_by(UserActivity.created_at.desc()).paginate(page=page, per_page=25, error_out=False)

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-activity me-2"></i>Активность</h1>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">Журнал действий</span>
            <span class="text-muted">Всего: ''' + str(pagination.total) + '''</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Пользователь</th>
                        <th>Действие</th>
                        <th>IP</th>
                        <th>Дата</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for a in pagination.items:
        date = a.created_at.strftime('%d.%m.%Y %H:%M') if a.created_at else '—'
        user_name = a.user.username if a.user else '—'
        content += f'''
                    <tr>
                        <td><strong>#{a.id}</strong></td>
                        <td>{user_name}</td>
                        <td><span class="badge badge-info">{a.action}</span></td>
                        <td><code>{a.ip_address or '—'}</code></td>
                        <td>{date}</td>
                    </tr>
        '''

    content += '</tbody></table></div>'

    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}"><i class="bi bi-chevron-left"></i></a></li>'
        for pg in pagination.iter_pages():
            if pg:
                active = 'active' if pg == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={pg}">{pg}</a></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'
    return render_page('Активность', 'activity', content)


# ============== LEVELS ==============
@bp.route('/level/')
@login_required
def levels_list():
    levels = Level.query.order_by(Level.order).all()

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-layers me-2"></i>Уровни</h1>
        <a href="/level-editor/" class="btn btn-primary"><i class="bi bi-plus-lg me-2"></i>Создать уровень</a>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">Все уровни</span>
            <span class="text-muted">Всего: ''' + str(len(levels)) + '''</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Название</th>
                        <th>Размер</th>
                        <th>Ходы</th>
                        <th>Предметы</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for lvl in levels:
        status = '<span class="badge badge-success">Активен</span>' if lvl.is_active else '<span class="badge badge-danger">Отключён</span>'
        items = ', '.join(lvl.item_types) if lvl.item_types else '—'
        content += f'''
                    <tr>
                        <td><strong>{lvl.order}</strong></td>
                        <td>{lvl.name}</td>
                        <td>{lvl.grid_width}×{lvl.grid_height}</td>
                        <td>{lvl.max_moves}</td>
                        <td><small>{items}</small></td>
                        <td>{status}</td>
                        <td class="action-btns">
                            <a href="/level-editor/{lvl.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                        </td>
                    </tr>
        '''

    content += '</tbody></table></div></div>'
    return render_page('Уровни', 'levels', content)


# ============== SESSIONS ==============
@bp.route('/session/')
@login_required
def sessions_list():
    page = request.args.get('page', 1, type=int)
    pagination = GameSession.query.order_by(GameSession.created_at.desc()).paginate(page=page, per_page=25, error_out=False)

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-joystick me-2"></i>Игровые сессии</h1>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">История игр</span>
            <span class="text-muted">Всего: ''' + str(pagination.total) + '''</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Игрок</th>
                        <th>Уровень</th>
                        <th>Очки</th>
                        <th>Ходов</th>
                        <th>Результат</th>
                        <th>Время</th>
                        <th>Дата</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for s in pagination.items:
        result = '<span class="badge badge-success">Победа</span>' if s.is_won else '<span class="badge badge-danger">Проигрыш</span>'
        date = s.created_at.strftime('%d.%m.%Y %H:%M') if s.created_at else '—'
        user_name = s.user.username if s.user else '—'
        level_name = s.level.name if s.level else '—'
        content += f'''
                    <tr>
                        <td><strong>#{s.id}</strong></td>
                        <td>{user_name}</td>
                        <td>{level_name}</td>
                        <td><strong>{s.score:,}</strong></td>
                        <td>{s.moves_used}</td>
                        <td>{result}</td>
                        <td>{s.duration_seconds} сек</td>
                        <td>{date}</td>
                    </tr>
        '''

    content += '</tbody></table></div>'

    if pagination.pages > 1:
        content += '<div class="card-footer bg-transparent border-0 d-flex justify-content-center"><nav><ul class="pagination">'
        if pagination.has_prev:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.prev_num}"><i class="bi bi-chevron-left"></i></a></li>'
        for pg in pagination.iter_pages():
            if pg:
                active = 'active' if pg == pagination.page else ''
                content += f'<li class="page-item {active}"><a class="page-link" href="?page={pg}">{pg}</a></li>'
        if pagination.has_next:
            content += f'<li class="page-item"><a class="page-link" href="?page={pagination.next_num}"><i class="bi bi-chevron-right"></i></a></li>'
        content += '</ul></nav></div>'

    content += '</div>'
    return render_page('Сессии', 'sessions', content)


# ============== ADMINS ==============
@bp.route('/adminuser/')
@login_required
def admins_list():
    admins = AdminUser.query.order_by(AdminUser.created_at.desc()).all()

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-shield-lock me-2"></i>Администраторы</h1>
        <a href="/admin/adminuser/new" class="btn btn-primary"><i class="bi bi-plus-lg me-2"></i>Добавить</a>
    </div>
    <div class="card">
        <div class="card-header">
            <span class="card-title">Список администраторов</span>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Логин</th>
                        <th>Статус</th>
                        <th>Создан</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    '''

    for a in admins:
        status = '<span class="badge badge-success">Активен</span>' if a.is_active else '<span class="badge badge-danger">Отключён</span>'
        date = a.created_at.strftime('%d.%m.%Y %H:%M') if a.created_at else '—'
        content += f'''
                    <tr>
                        <td><strong>#{a.id}</strong></td>
                        <td>{a.username}</td>
                        <td>{status}</td>
                        <td>{date}</td>
                        <td class="action-btns">
                            <a href="/admin/adminuser/edit/{a.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></a>
                            <a href="/admin/adminuser/delete/{a.id}" class="btn btn-sm btn-danger" onclick="return confirm('Удалить администратора?')"><i class="bi bi-trash"></i></a>
                        </td>
                    </tr>
        '''

    content += '</tbody></table></div></div>'
    return render_page('Администраторы', 'admins', content)


@bp.route('/adminuser/new', methods=['GET', 'POST'])
@login_required
def admin_new():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if AdminUser.query.filter_by(username=username).first():
            flash('Пользователь с таким логином уже существует!', 'danger')
        else:
            admin = AdminUser(username=username, is_active=True)
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            flash('Администратор создан!', 'success')
            return redirect(url_for('custom_admin.admins_list'))

    content = '''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-plus-lg me-2"></i>Новый администратор</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Логин</label>
                        <input type="text" name="username" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Пароль</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Создать</button>
                    <a href="/admin/adminuser/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''
    return render_page('Новый администратор', 'admins', content)


@bp.route('/adminuser/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def admin_edit(id):
    admin = AdminUser.query.get_or_404(id)

    if request.method == 'POST':
        admin.username = request.form.get('username', admin.username)
        admin.is_active = request.form.get('is_active') == '1'
        new_password = request.form.get('password')
        if new_password:
            admin.set_password(new_password)
        db.session.commit()
        flash('Администратор обновлён!', 'success')
        return redirect(url_for('custom_admin.admins_list'))

    content = f'''
    <div class="page-header">
        <h1 class="page-title"><i class="bi bi-pencil me-2"></i>Редактирование: {admin.username}</h1>
    </div>
    <div class="card">
        <div class="card-body">
            <form method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Логин</label>
                        <input type="text" name="username" class="form-control" value="{admin.username}" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Новый пароль <small class="text-muted">(оставьте пустым, чтобы не менять)</small></label>
                        <input type="password" name="password" class="form-control">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Статус</label>
                        <select name="is_active" class="form-select">
                            <option value="1" {'selected' if admin.is_active else ''}>Активен</option>
                            <option value="0" {'' if admin.is_active else 'selected'}>Отключён</option>
                        </select>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-2"></i>Сохранить</button>
                    <a href="/admin/adminuser/" class="btn btn-outline-secondary">Отмена</a>
                </div>
            </form>
        </div>
    </div>
    '''
    return render_page('Редактирование администратора', 'admins', content)


@bp.route('/adminuser/delete/<int:id>')
@login_required
def admin_delete(id):
    admin = AdminUser.query.get_or_404(id)
    if admin.id == current_user.id:
        flash('Нельзя удалить самого себя!', 'danger')
    else:
        db.session.delete(admin)
        db.session.commit()
        flash('Администратор удалён!', 'success')
    return redirect(url_for('custom_admin.admins_list'))
