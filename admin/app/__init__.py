from flask import Flask, redirect, url_for, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin, AdminIndexView, expose
from flask_login import LoginManager, current_user
from prometheus_flask_exporter import PrometheusMetrics
from datetime import datetime, timezone, timedelta
import os

db = SQLAlchemy()
login_manager = LoginManager()
metrics = None

# Moscow timezone
MOSCOW_TZ = timezone(timedelta(hours=3))

def now_moscow():
    return datetime.now(MOSCOW_TZ).replace(tzinfo=None)


DASHBOARD_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дашборд - ROSTIC'S Admin</title>
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
        }

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

        .sidebar-nav a:hover {
            background: rgba(255,255,255,0.08);
            color: white;
        }

        .sidebar-nav a.active {
            background: var(--primary);
            color: white;
        }

        .sidebar-nav i { font-size: 1.1rem; opacity: 0.8; }

        .main-content {
            margin-left: 260px;
            padding: 2rem;
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .page-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--dark);
            margin: 0;
        }

        .user-menu {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            background: var(--primary);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
        }

        .stat-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
        }

        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        .stat-icon.primary { background: #eef2ff; color: var(--primary); }
        .stat-icon.success { background: #ecfdf5; color: var(--success); }
        .stat-icon.warning { background: #fffbeb; color: var(--warning); }
        .stat-icon.info { background: #ecfeff; color: var(--info); }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--dark);
            line-height: 1;
        }

        .stat-label {
            color: #64748b;
            font-size: 0.875rem;
            font-weight: 500;
            margin-top: 0.25rem;
        }

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
        }

        .card-title {
            font-weight: 600;
            color: var(--dark);
            margin: 0;
            font-size: 1rem;
        }

        .card-body { padding: 0; }

        .table { margin: 0; }

        .table th {
            background: #f8fafc;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .table td {
            padding: 1rem 1.25rem;
            vertical-align: middle;
            border-bottom: 1px solid #f1f5f9;
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
        .badge-info { background: #e0f2fe; color: #0369a1; }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }

        .action-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.25rem;
            text-decoration: none;
            color: var(--dark);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .action-card:hover {
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
            transform: translateY(-2px);
            color: var(--dark);
        }

        .action-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        .action-icon.primary { background: #eef2ff; color: var(--primary); }
        .action-icon.success { background: #ecfdf5; color: var(--success); }
        .action-icon.info { background: #ecfeff; color: var(--info); }

        .action-text h4 {
            font-size: 0.9rem;
            font-weight: 600;
            margin: 0;
        }

        .action-text p {
            font-size: 0.8rem;
            color: #64748b;
            margin: 0.25rem 0 0 0;
        }

        @media (max-width: 1200px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; }
            .stats-grid { grid-template-columns: 1fr; }
            .quick-actions { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <aside class="sidebar">
        <div class="sidebar-brand">
            <i class="bi bi-controller"></i>
            <span>ROSTIC'S Admin</span>
        </div>

        <div class="nav-section">Главная</div>
        <ul class="sidebar-nav">
            <li><a href="/admin" class="active"><i class="bi bi-grid-1x2"></i> Дашборд</a></li>
            <li><a href="/admin/analytics/"><i class="bi bi-bar-chart-line"></i> Аналитика</a></li>
        </ul>

        {% if admin_role in ('superadmin', 'game_admin', 'quest_admin') %}
        <div class="nav-section">Пользователи</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/user/"><i class="bi bi-people"></i> Все пользователи</a></li>
            <li><a href="/admin/progress/"><i class="bi bi-graph-up"></i> Прогресс</a></li>
            <li><a href="/admin/activity/"><i class="bi bi-activity"></i> Активность</a></li>
        </ul>
        {% endif %}

        {% if admin_role in ('superadmin', 'game_admin') %}
        <div class="nav-section">Игра</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/level/"><i class="bi bi-layers"></i> Уровни</a></li>
            <li><a href="/level-editor/"><i class="bi bi-grid-3x3-gap"></i> Конструктор</a></li>
            <li><a href="/admin/session/"><i class="bi bi-joystick"></i> Сессии</a></li>
            <li><a href="/admin/texts/"><i class="bi bi-fonts"></i> Тексты</a></li>
        </ul>
        {% endif %}

        {% if admin_role in ('superadmin', 'quest_admin') %}
        <div class="nav-section">Квест</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/quest/pages/"><i class="bi bi-map"></i> Страницы квеста</a></li>
            <li><a href="/admin/quest/promo/"><i class="bi bi-ticket-perforated"></i> Промокоды</a></li>
            <li><a href="/admin/quest/progress/"><i class="bi bi-person-check"></i> Прогресс участников</a></li>
            <li><a href="/admin/quest/qr-codes/"><i class="bi bi-qr-code"></i> QR-коды</a></li>
        </ul>
        {% endif %}

        <div class="nav-section">Система</div>
        <ul class="sidebar-nav">
            <li><a href="/admin/adminuser/"><i class="bi bi-shield-lock"></i> Админы</a></li>
            <li><a href="/auth/logout"><i class="bi bi-box-arrow-left"></i> Выход</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h1 class="page-title">Дашборд</h1>
            <div class="user-menu">
                <span class="text-muted">Добро пожаловать</span>
                <div class="user-avatar">A</div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon primary"><i class="bi bi-people"></i></div>
                </div>
                <div class="stat-value">{{ total_users }}</div>
                <div class="stat-label">Всего пользователей</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon success"><i class="bi bi-patch-check"></i></div>
                </div>
                <div class="stat-value">{{ verified_users }}</div>
                <div class="stat-label">Подтверждённых</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon warning"><i class="bi bi-hourglass-split"></i></div>
                </div>
                <div class="stat-value">{{ pending_users }}</div>
                <div class="stat-label">Ожидают подтверждения</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon info"><i class="bi bi-calendar-check"></i></div>
                </div>
                <div class="stat-value">{{ today_registrations }}</div>
                <div class="stat-label">Регистраций сегодня</div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon info"><i class="bi bi-layers"></i></div>
                </div>
                <div class="stat-value">{{ total_levels }}</div>
                <div class="stat-label">Активных уровней</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon success"><i class="bi bi-controller"></i></div>
                </div>
                <div class="stat-value">{{ total_sessions }}</div>
                <div class="stat-label">Игровых сессий</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon primary"><i class="bi bi-trophy"></i></div>
                </div>
                <div class="stat-value">{{ "{:,}".format(total_score) }}</div>
                <div class="stat-label">Всего очков</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-icon warning"><i class="bi bi-key"></i></div>
                </div>
                <div class="stat-value">{{ active_codes }}</div>
                <div class="stat-label">Активных кодов</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="bi bi-clock-history me-2"></i>Последние пользователи</h3>
                <a href="/admin/user/" class="btn btn-sm btn-outline-primary">Все</a>
            </div>
            <div class="card-body">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя</th>
                            <th>Email</th>
                            <th>Статус</th>
                            <th>Код</th>
                            <th>Регистрация</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for user in recent_users %}
                        <tr>
                            <td><strong>#{{ user.id }}</strong></td>
                            <td>{{ user.username }}</td>
                            <td>{{ user.email }}</td>
                            <td>
                                {% if user.is_verified %}
                                    <span class="badge badge-success">Подтверждён</span>
                                {% else %}
                                    <span class="badge badge-warning">Ожидает</span>
                                {% endif %}
                            </td>
                            <td>
                                {% if user.verification_code %}
                                    <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">{{ user.verification_code }}</code>
                                {% else %}
                                    <span class="text-muted">—</span>
                                {% endif %}
                            </td>
                            <td>{{ user.created_at.strftime('%d.%m.%Y %H:%M') if user.created_at else '—' }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="bi bi-lightning me-2"></i>Быстрые действия</h3>
            </div>
            <div class="card-body" style="padding: 1.5rem;">
                <div class="quick-actions">
                    <a href="/admin/user/" class="action-card">
                        <div class="action-icon primary"><i class="bi bi-people"></i></div>
                        <div class="action-text">
                            <h4>Пользователи</h4>
                            <p>Управление пользователями</p>
                        </div>
                    </a>
                    <a href="/level-editor/" class="action-card">
                        <div class="action-icon success"><i class="bi bi-grid-3x3-gap"></i></div>
                        <div class="action-text">
                            <h4>Конструктор</h4>
                            <p>Создание уровней</p>
                        </div>
                    </a>
                    <a href="/admin/session/" class="action-card">
                        <div class="action-icon info"><i class="bi bi-controller"></i></div>
                        <div class="action-text">
                            <h4>Сессии</h4>
                            <p>История игр</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''


class SecureAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated:
            return redirect(url_for('admin_auth.login'))

        from app.models import User, Level, GameSession

        total_users = User.query.count()
        verified_users = User.query.filter_by(is_verified=True).count()
        pending_users = total_users - verified_users

        today_start = now_moscow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_registrations = User.query.filter(User.created_at >= today_start).count()

        total_levels = Level.query.filter_by(is_active=True).count()
        total_sessions = GameSession.query.count()
        total_score = db.session.query(db.func.sum(User.total_score)).scalar() or 0

        active_codes = User.query.filter(
            User.verification_code.isnot(None),
            User.verification_expires_at > now_moscow()
        ).count()

        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()

        return render_template_string(
            DASHBOARD_TEMPLATE,
            total_users=total_users,
            verified_users=verified_users,
            pending_users=pending_users,
            today_registrations=today_registrations,
            total_levels=total_levels,
            total_sessions=total_sessions,
            total_score=total_score,
            active_codes=active_codes,
            recent_users=recent_users,
            admin_role=current_user.role if hasattr(current_user, 'role') and current_user.role else 'superadmin'
        )


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'postgresql://rostics:rostics@localhost:5432/rostics'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)

    # Prometheus metrics (skip in testing to avoid duplicate registration)
    global metrics
    if not app.config.get('TESTING'):
        metrics = PrometheusMetrics(app, group_by='endpoint')
        metrics.info('app_info', 'Application info', version='1.0.0', service='rostics-admin')
    login_manager.login_view = 'admin_auth.login'

    from app.models import AdminUser, User, Level, UserLevelProgress, GameSession, UserActivity

    @login_manager.user_loader
    def load_user(user_id):
        return AdminUser.query.get(int(user_id))

    admin = Admin(
        app,
        name='ROSTIC\'S Kitchen Admin',
        template_mode='bootstrap4',
        index_view=SecureAdminIndexView()
    )

    # Flask-Admin views disabled - using custom_views.py with Russian templates instead

    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.level_editor import bp as level_editor_bp
    app.register_blueprint(level_editor_bp, url_prefix='/level-editor')

    from app.custom_views import bp as custom_views_bp
    app.register_blueprint(custom_views_bp, url_prefix='/admin')

    from app.quest_views import bp as quest_views_bp
    app.register_blueprint(quest_views_bp)

    @app.route('/')
    def index():
        return redirect('/admin')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'service': 'admin'}

    return app
