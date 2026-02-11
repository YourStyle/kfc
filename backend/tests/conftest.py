import pytest
from app import create_app, db
from app.models.user import User
from app.models.level import Level
from app.models.game_session import GameSession
from app.models.user_progress import UserLevelProgress
from flask_jwt_extended import create_access_token
from prometheus_client import REGISTRY


def clear_prometheus_registry():
    """Clear all collectors from prometheus registry to avoid duplicate errors"""
    collectors_to_remove = list(REGISTRY._names_to_collectors.values())
    for collector in collectors_to_remove:
        try:
            REGISTRY.unregister(collector)
        except Exception:
            pass


@pytest.fixture
def app():
    """Create test application"""
    clear_prometheus_registry()

    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI runner"""
    return app.test_cli_runner()


@pytest.fixture
def verified_user(app):
    """Create a verified user"""
    user = User(
        email='test@example.com',
        username='testuser',
        is_verified=True
    )
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def unverified_user(app):
    """Create an unverified user"""
    user = User(
        email='unverified@example.com',
        username='unverified',
        is_verified=False,
        verification_code='123456'
    )
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def auth_header(app, verified_user):
    """Create authorization header for verified user"""
    token = create_access_token(identity=verified_user.id)
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_level(app):
    """Create a sample level"""
    level = Level(
        name='Test Level',
        order=1,
        grid_width=7,
        grid_height=7,
        max_moves=30,
        targets={'collect': {'drumstick': 5}, 'min_score': 100},
        is_active=True
    )
    db.session.add(level)
    db.session.commit()
    return level
