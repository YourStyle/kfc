from app import db
from app.utils.timezone import now_moscow
from app.utils.encryption import EncryptedString


class Match3Prize(db.Model):
    """Tracks match3 leaderboard prizes sent to players."""
    __tablename__ = 'match3_prizes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    region = db.Column(db.String(20), nullable=False)        # 'moscow' | 'region'
    rank = db.Column(db.Integer, nullable=False)
    tier = db.Column(db.String(50), nullable=False)          # see TIER_* constants
    prize_description = db.Column(db.Text)
    code = db.Column(EncryptedString())  # Encrypted promo code
    email_sent_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=now_moscow, nullable=False)

    user = db.relationship('User', backref=db.backref('match3_prizes', lazy='dynamic'))

    def __repr__(self):
        return f'<Match3Prize user={self.user_id} rank={self.rank} tier={self.tier}>'
