from app import db
from app.utils.timezone import now_moscow


class GameText(db.Model):
    """Editable text content for game and quest UI"""
    __tablename__ = 'game_texts'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    section = db.Column(db.String(30), nullable=False)  # 'game', 'quest', 'rules', 'landing'
    label = db.Column(db.String(200), nullable=False)    # Human-readable description
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=now_moscow, onupdate=now_moscow)

    def to_dict(self):
        return {
            'key': self.key,
            'section': self.section,
            'value': self.value,
        }

    def __repr__(self):
        return f'<GameText {self.key}>'
