from app import db
from app.utils.timezone import now_moscow


class GameSession(db.Model):
    __tablename__ = 'game_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    level_id = db.Column(db.Integer, db.ForeignKey('levels.id', ondelete='CASCADE'), nullable=False, index=True)
    score = db.Column(db.Integer, default=0)
    moves_used = db.Column(db.Integer, default=0)
    targets_met = db.Column(db.JSON)  # What targets were achieved
    # Example: {"collect": {"drumstick": 8, "burger": 3}, "combos": {"4_match": 1}}
    duration_seconds = db.Column(db.Integer)
    is_completed = db.Column(db.Boolean, default=False)
    is_won = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=now_moscow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'level_id': self.level_id,
            'score': self.score,
            'moves_used': self.moves_used,
            'targets_met': self.targets_met,
            'duration_seconds': self.duration_seconds,
            'is_completed': self.is_completed,
            'is_won': self.is_won,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<GameSession {self.id} user={self.user_id} level={self.level_id}>'
