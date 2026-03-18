from app import db
from app.utils.encryption import EncryptedString
from datetime import datetime


class LandingVisit(db.Model):
    """Visits to the Sakura Fest landing page"""
    __tablename__ = 'landing_visits'

    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(EncryptedString())  # Encrypted PII
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))
    region = db.Column(db.String(200))
    user_agent = db.Column(EncryptedString())  # Encrypted PII
    referrer = db.Column(db.String(500))
    is_fake = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<LandingVisit {self.ip_address} {self.city}>'
