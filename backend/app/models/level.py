from app import db
from app.utils.timezone import now_moscow
import json


class Level(db.Model):
    __tablename__ = 'levels'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Integer, nullable=False, default=0)
    grid_width = db.Column(db.Integer, default=7)
    grid_height = db.Column(db.Integer, default=7)
    max_moves = db.Column(db.Integer, default=30)
    # Store as JSON string for SQLite compatibility
    _item_types = db.Column('item_types', db.Text, default='["chicken", "burger", "fries", "cola", "bucket"]')
    targets = db.Column(db.JSON, nullable=False)
    # targets example: {"collect": {"chicken": 10}, "combos": {"4_match": 2}, "min_score": 500}
    obstacles = db.Column(db.JSON, default=[])
    # obstacles example: [{"row": 3, "col": 3}, {"row": 3, "col": 4}]
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=now_moscow)

    @property
    def item_types(self):
        if self._item_types:
            return json.loads(self._item_types) if isinstance(self._item_types, str) else self._item_types
        return ['chicken', 'burger', 'fries', 'cola', 'bucket']

    @item_types.setter
    def item_types(self, value):
        self._item_types = json.dumps(value) if isinstance(value, list) else value

    # Relationships
    progress = db.relationship('UserLevelProgress', backref='level', lazy='dynamic', cascade='all, delete-orphan')
    sessions = db.relationship('GameSession', backref='level', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'order': self.order,
            'grid_width': self.grid_width,
            'grid_height': self.grid_height,
            'max_moves': self.max_moves,
            'item_types': self.item_types,
            'targets': self.targets,
            'obstacles': self.obstacles or [],
            'is_active': self.is_active,
        }

    def __repr__(self):
        return f'<Level {self.name}>'
