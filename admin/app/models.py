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
    role = db.Column(db.String(20), default='superadmin')
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
    city = db.Column(db.String(20), default='region')  # 'moscow' или 'region'
    city_name = db.Column(db.String(100))  # Полное название города
    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6))
    verification_expires_at = db.Column(db.DateTime)
    total_score = db.Column(db.Integer, default=0)
    registration_source = db.Column(db.String(20), default='game')
    quest_score = db.Column(db.Integer, default=0)
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
    item_types = db.Column(ARRAY(db.String(50)), default=['drumstick', 'wing', 'burger', 'fries', 'bucket', 'ice_cream', 'donut', 'cappuccino'])
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
        return ['drumstick', 'wing', 'burger', 'fries', 'bucket', 'ice_cream', 'donut', 'cappuccino']

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


class AnalyticsShare(db.Model):
    """Settings for public analytics sharing"""
    __tablename__ = 'analytics_share'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<AnalyticsShare {self.token[:8]}...>'


# Quest models (mirror from backend)
class QuestPage(db.Model):
    """Quest pages with riddles"""
    __tablename__ = 'quest_pages'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    order = db.Column(db.Integer, nullable=False, default=0)
    title = db.Column(db.String(200), nullable=False)
    riddle_text = db.Column(db.Text, nullable=False)
    fact_text = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    qr_token = db.Column(db.String(100), unique=True, nullable=False)
    points = db.Column(db.Integer, default=10)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    progress_entries = db.relationship('QuestProgress', backref='quest_page', lazy='dynamic')

    def __repr__(self):
        return f'<QuestPage {self.slug}>'


class QuestProgress(db.Model):
    """Quest user progress"""
    __tablename__ = 'quest_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    quest_page_id = db.Column(db.Integer, db.ForeignKey('quest_pages.id'), nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    is_skipped = db.Column(db.Boolean, default=False)
    points_earned = db.Column(db.Integer, default=0)
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('quest_progress', lazy='dynamic'))

    def __repr__(self):
        return f'<QuestProgress user={self.user_id} page={self.quest_page_id}>'


class PromoCodePool(db.Model):
    """Promo code pools by tier"""
    __tablename__ = 'promo_code_pools'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tier = db.Column(db.String(20), nullable=False)
    min_score = db.Column(db.Integer, nullable=False)
    discount_label = db.Column(db.String(200))
    total_codes = db.Column(db.Integer, default=0)
    used_codes = db.Column(db.Integer, default=0)
    alert_threshold = db.Column(db.Integer, default=10)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    codes = db.relationship('PromoCode', backref='pool', lazy='dynamic')

    @property
    def remaining_codes(self):
        return self.total_codes - self.used_codes

    @property
    def is_low(self):
        return self.remaining_codes < self.alert_threshold

    def __repr__(self):
        return f'<PromoCodePool {self.name}>'


class PromoCode(db.Model):
    """Individual promo codes"""
    __tablename__ = 'promo_codes'

    id = db.Column(db.Integer, primary_key=True)
    pool_id = db.Column(db.Integer, db.ForeignKey('promo_code_pools.id'), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    used_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    used_by = db.relationship('User', backref=db.backref('promo_codes_received', lazy='dynamic'))

    def __repr__(self):
        return f'<PromoCode {self.code}>'


class GameText(db.Model):
    """Editable text content for game and quest UI"""
    __tablename__ = 'game_texts'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    section = db.Column(db.String(30), nullable=False)
    label = db.Column(db.String(200), nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime)

    def __repr__(self):
        return f'<GameText {self.key}>'
