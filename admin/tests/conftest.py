import pytest
from app import create_app, db
from app.models import AdminUser, User, Level
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
        'WTF_CSRF_ENABLED': False,
        'LOGIN_DISABLED': False,
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
def admin_user(app):
    """Create an admin user"""
    with app.app_context():
        admin = AdminUser(
            username='testadmin',
            is_active=True
        )
        admin.set_password('password123')
        db.session.add(admin)
        db.session.commit()
        db.session.refresh(admin)
        return admin


@pytest.fixture
def inactive_admin(app):
    """Create an inactive admin user"""
    with app.app_context():
        admin = AdminUser(
            username='inactive',
            is_active=False
        )
        admin.set_password('password123')
        db.session.add(admin)
        db.session.commit()
        db.session.refresh(admin)
        return admin


@pytest.fixture
def logged_in_client(client, admin_user):
    """Create a client with logged in admin"""
    client.post('/auth/login', data={
        'username': 'testadmin',
        'password': 'password123'
    })
    return client


@pytest.fixture
def sample_game_user(app):
    """Create a sample game user"""
    with app.app_context():
        user = User(
            email='player@example.com',
            username='player1',
            password_hash='hash',
            is_verified=True,
            total_score=500
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture
def sample_level(app):
    """Create a sample level"""
    with app.app_context():
        level = Level(
            name='Test Level',
            order=1,
            grid_width=7,
            grid_height=7,
            max_moves=30,
            targets={'min_score': 100},
            is_active=True
        )
        db.session.add(level)
        db.session.commit()
        db.session.refresh(level)
        return level
