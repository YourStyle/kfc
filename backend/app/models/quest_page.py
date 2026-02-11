from app import db
from app.utils.timezone import now_moscow


class QuestPage(db.Model):
    __tablename__ = 'quest_pages'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)
    order = db.Column(db.Integer, nullable=False, default=0)
    title = db.Column(db.String(200), nullable=False)
    riddle_text = db.Column(db.Text, nullable=False)
    fact_text = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    qr_token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    points = db.Column(db.Integer, default=10)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now_moscow)
    updated_at = db.Column(db.DateTime, default=now_moscow, onupdate=now_moscow)

    progress_entries = db.relationship('QuestProgress', backref='quest_page', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'slug': self.slug,
            'order': self.order,
            'title': self.title,
            'riddle_text': self.riddle_text,
            'fact_text': self.fact_text,
            'image_url': self.image_url,
            'points': self.points,
            'is_active': self.is_active,
        }
        if include_answer:
            data['qr_token'] = self.qr_token
        return data

    def __repr__(self):
        return f'<QuestPage {self.slug}>'
