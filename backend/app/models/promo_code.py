from app import db
from app.utils.timezone import now_moscow


class PromoCodePool(db.Model):
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
    created_at = db.Column(db.DateTime, default=now_moscow)

    codes = db.relationship('PromoCode', backref='pool', lazy='dynamic', cascade='all, delete-orphan')

    @property
    def remaining_codes(self):
        return self.total_codes - self.used_codes

    @property
    def is_low(self):
        return self.remaining_codes < self.alert_threshold

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'tier': self.tier,
            'min_score': self.min_score,
            'discount_label': self.discount_label,
            'total_codes': self.total_codes,
            'used_codes': self.used_codes,
            'remaining_codes': self.remaining_codes,
            'alert_threshold': self.alert_threshold,
            'is_active': self.is_active,
        }

    def __repr__(self):
        return f'<PromoCodePool {self.name}>'


class PromoCode(db.Model):
    __tablename__ = 'promo_codes'

    id = db.Column(db.Integer, primary_key=True)
    pool_id = db.Column(db.Integer, db.ForeignKey('promo_code_pools.id', ondelete='CASCADE'), nullable=False, index=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    is_used = db.Column(db.Boolean, default=False)
    used_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=now_moscow)

    used_by = db.relationship('User', backref=db.backref('promo_codes_received', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'pool_id': self.pool_id,
            'code': self.code,
            'is_used': self.is_used,
            'used_by_user_id': self.used_by_user_id,
            'used_at': self.used_at.isoformat() if self.used_at else None,
        }

    def __repr__(self):
        return f'<PromoCode {self.code}>'
