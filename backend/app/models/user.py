from app import db
from app.utils.timezone import now_moscow
from app.utils.encryption import EncryptedString, compute_hash
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(EncryptedString(), nullable=False)
    email_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100))
    # Город: 'moscow' = Москва и МО, 'region' = Другой регион
    city = db.Column(db.String(20), default='region', index=True)
    # Полное название города
    city_name = db.Column(db.String(100))
    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(EncryptedString())
    verification_expires_at = db.Column(db.DateTime)
    total_score = db.Column(db.Integer, default=0)
    registration_source = db.Column(db.String(20), default='game', index=True)
    quest_score = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=now_moscow)
    last_login_at = db.Column(db.DateTime)

    # Relationships
    progress = db.relationship('UserLevelProgress', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    sessions = db.relationship('GameSession', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    activities = db.relationship('UserActivity', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    quest_progress = db.relationship('QuestProgress', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_email(self, email):
        """Set email with automatic hash computation for lookups."""
        self.email = email
        self.email_hash = compute_hash(email)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        if not self.password_hash or not self.password_hash.startswith('$2'):
            return False  # Deleted/invalid account — reject without bcrypt error
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    @staticmethod
    def find_by_email(email):
        """Find user by email using blind index."""
        return User.query.filter_by(email_hash=compute_hash(email)).first()

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'city': self.city,
            'city_name': self.city_name,
            'is_verified': self.is_verified,
            'total_score': self.total_score,
            'registration_source': self.registration_source,
            'quest_score': self.quest_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<User {self.email}>'
