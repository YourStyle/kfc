from app import db
from app.utils.timezone import now_moscow


class QuestProgress(db.Model):
    __tablename__ = 'quest_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    quest_page_id = db.Column(db.Integer, db.ForeignKey('quest_pages.id', ondelete='CASCADE'), nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    is_skipped = db.Column(db.Boolean, default=False)
    points_earned = db.Column(db.Integer, default=0)
    scanned_at = db.Column(db.DateTime, default=now_moscow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'quest_page_id', name='uq_user_quest_page'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'quest_page_id': self.quest_page_id,
            'page_slug': self.quest_page.slug if self.quest_page else None,
            'is_correct': self.is_correct,
            'is_skipped': self.is_skipped,
            'points_earned': self.points_earned,
            'scanned_at': self.scanned_at.isoformat() if self.scanned_at else None,
        }

    def __repr__(self):
        return f'<QuestProgress user={self.user_id} page={self.quest_page_id}>'
