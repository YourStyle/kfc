from flask import Blueprint, render_template_string, redirect, url_for, flash, request
from flask_login import login_user, logout_user, current_user
from app import db
from app.models import AdminUser

bp = Blueprint('admin_auth', __name__)

LOGIN_TEMPLATE = '''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Вход - ROSTIC'S Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --dark: #1e293b;
            --light: #f8fafc;
        }

        * { font-family: 'Inter', sans-serif; }

        body {
            background: var(--dark);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .login-container {
            width: 100%;
            max-width: 420px;
        }

        .login-card {
            background: white;
            border-radius: 24px;
            padding: 2.5rem;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        }

        .login-logo {
            text-align: center;
            margin-bottom: 2rem;
        }

        .login-logo i {
            font-size: 3rem;
            color: var(--primary);
            margin-bottom: 1rem;
            display: block;
        }

        .login-logo h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--dark);
            margin: 0;
        }

        .login-logo p {
            color: #64748b;
            font-size: 0.9rem;
            margin: 0.5rem 0 0 0;
        }

        .form-label {
            font-weight: 600;
            color: var(--dark);
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }

        .form-control {
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 0.875rem 1rem;
            font-size: 0.95rem;
            transition: all 0.2s;
        }

        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            outline: none;
        }

        .input-group-text {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-right: none;
            border-radius: 12px 0 0 12px;
            color: #64748b;
        }

        .input-group .form-control {
            border-left: none;
            border-radius: 0 12px 12px 0;
        }

        .input-group:focus-within .input-group-text {
            border-color: var(--primary);
        }

        .btn-primary {
            background: var(--primary);
            border: none;
            border-radius: 12px;
            padding: 0.875rem;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.2s;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35);
        }

        .alert {
            border: none;
            border-radius: 12px;
            padding: 1rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
        }

        .alert-danger {
            background: #fee2e2;
            color: #991b1b;
        }

        .alert-success {
            background: #dcfce7;
            color: #166534;
        }

        .login-footer {
            text-align: center;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-logo">
                <i class="bi bi-controller"></i>
                <h1>ROSTIC'S Admin</h1>
                <p>Вход в панель управления</p>
            </div>

            {% with messages = get_flashed_messages(with_categories=true) %}
                {% if messages %}
                    {% for category, message in messages %}
                        <div class="alert alert-{{ category }}">
                            <i class="bi bi-{{ 'check-circle' if category == 'success' else 'exclamation-circle' }} me-2"></i>
                            {{ message }}
                        </div>
                    {% endfor %}
                {% endif %}
            {% endwith %}

            <form method="POST">
                <div class="mb-3">
                    <label class="form-label">Логин</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-person"></i></span>
                        <input type="text" name="username" class="form-control" placeholder="Введите логин" required autofocus>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="form-label">Пароль</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-lock"></i></span>
                        <input type="password" name="password" class="form-control" placeholder="Введите пароль" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary w-100">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Войти
                </button>
            </form>

            <div class="login-footer">
                Панель управления игрой ROSTIC'S Kitchen
            </div>
        </div>
    </div>
</body>
</html>
'''


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect('/admin')

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = AdminUser.query.filter_by(username=username).first()

        if user and user.check_password(password):
            if not user.is_active:
                flash('Аккаунт отключён', 'danger')
                return render_template_string(LOGIN_TEMPLATE)

            login_user(user)
            return redirect('/admin')
        else:
            flash('Неверный логин или пароль', 'danger')

    return render_template_string(LOGIN_TEMPLATE)


@bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('admin_auth.login'))
