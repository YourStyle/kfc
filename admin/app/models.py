from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY


class AdminUser(UserMixin, db.Model):
    """Admin users for the admin panel"""
    __tablename__ = 'admin_users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<AdminUser {self.username}>'


# Mirror models from backend (read-only access)
class User(db.Model):
    """Game users"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6))
    verification_expires_at = db.Column(db.DateTime)
    total_score = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)

    progress = db.relationship('UserLevelProgress', backref='user', lazy='dynamic')
    sessions = db.relationship('GameSession', backref='user', lazy='dynamic')
    activities = db.relationship('UserActivity', backref='user', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.username}>'


class Level(db.Model):
    """Game levels"""
    __tablename__ = 'levels'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Integer, default=0)
    grid_width = db.Column(db.Integer, default=7)
    grid_height = db.Column(db.Integer, default=7)
    max_moves = db.Column(db.Integer, default=30)
    item_types = db.Column(ARRAY(db.String(50)), default=['chicken', 'burger', 'fries', 'cola', 'bucket'])
    targets = db.Column(db.JSON, default={})
    obstacles = db.Column(db.JSON, default=[])  # Array of {row, col} positions
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    progress = db.relationship('UserLevelProgress', backref='level', lazy='dynamic')
    sessions = db.relationship('GameSession', backref='level', lazy='dynamic')

    def get_item_types_list(self):
        if self.item_types:
            if isinstance(self.item_types, list):
                return self.item_types
            return self.item_types.split(',')
        return ['chicken', 'burger', 'fries', 'cola', 'bucket']

    def __repr__(self):
        return f'<Level {self.name}>'


class UserLevelProgress(db.Model):
    """User progress on levels"""
    __tablename__ = 'user_level_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    level_id = db.Column(db.Integer, db.ForeignKey('levels.id'), nullable=False)
    best_score = db.Column(db.Integer, default=0)
    stars = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime)
    attempts_count = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<Progress User:{self.user_id} Level:{self.level_id}>'


class GameSession(db.Model):
    """Game sessions"""
    __tablename__ = 'game_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    level_id = db.Column(db.Integer, db.ForeignKey('levels.id'), nullable=False)
    score = db.Column(db.Integer, default=0)
    moves_used = db.Column(db.Integer, default=0)
    targets_met = db.Column(db.JSON, default={})
    duration_seconds = db.Column(db.Integer, default=0)
    is_completed = db.Column(db.Boolean, default=False)
    is_won = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Session {self.id}>'


class UserActivity(db.Model):
    """User activity for analytics"""
    __tablename__ = 'user_activities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    activity_data = db.Column('metadata', db.JSON, default={})
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Activity {self.action}>'
