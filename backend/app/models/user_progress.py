from app import db
from datetime import datetime


class UserLevelProgress(db.Model):
    __tablename__ = 'user_level_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    level_id = db.Column(db.Integer, db.ForeignKey('levels.id', ondelete='CASCADE'), nullable=False, index=True)
    best_score = db.Column(db.Integer, default=0)
    stars = db.Column(db.Integer, default=0)  # 0-3 stars
    completed_at = db.Column(db.DateTime)
    attempts_count = db.Column(db.Integer, default=0)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'level_id', name='unique_user_level'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'level_id': self.level_id,
            'best_score': self.best_score,
            'stars': self.stars,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'attempts_count': self.attempts_count,
        }

    def __repr__(self):
        return f'<UserLevelProgress user={self.user_id} level={self.level_id}>'
