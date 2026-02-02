from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail
from flask_jwt_extended import JWTManager
from prometheus_flask_exporter import PrometheusMetrics
import redis
import os

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()
jwt = JWTManager()
metrics = None
redis_client = None


def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    # Support SQLite for local development
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///rostics.db')
    # Fix for SQLAlchemy with postgres:// vs postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT Configuration
    app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400 * 7  # 7 days

    # Mail Configuration
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.yandex.ru')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 465))
    app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'true').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    jwt.init_app(app)

    # Prometheus metrics (skip in testing to avoid duplicate registration)
    global metrics
    if not app.config.get('TESTING'):
        metrics = PrometheusMetrics(app, group_by='endpoint')
        metrics.info('app_info', 'Application info', version='1.0.0', service='rostics-backend')

    # CORS
    cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, origins=cors_origins, supports_credentials=True)

    # Redis (optional for local development)
    global redis_client
    redis_url = os.environ.get('REDIS_URL')
    if redis_url:
        try:
            redis_client = redis.from_url(redis_url)
            redis_client.ping()
        except:
            redis_client = None
            print("Warning: Redis not available, some features may be limited")

    # Register blueprints
    from app.api import auth, levels, game, leaderboard
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(levels.bp, url_prefix='/api/levels')
    app.register_blueprint(game.bp, url_prefix='/api/game')
    app.register_blueprint(leaderboard.bp, url_prefix='/api/leaderboard')

    # Health check
    @app.route('/api/health')
    def health():
        return {'status': 'ok'}

    return app
