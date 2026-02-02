from app import db
from app.utils.timezone import now_moscow


class UserActivity(db.Model):
    __tablename__ = 'user_activities'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    # Actions: 'register', 'login', 'verify_email', 'start_game', 'complete_game', 'view_leaderboard'
    activity_data = db.Column('metadata', db.JSON)  # Additional data about the action (column name 'metadata' in DB)
    ip_address = db.Column(db.String(45))  # IPv6 compatible
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=now_moscow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'data': self.activity_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<UserActivity {self.action} user={self.user_id}>'


def log_activity(user_id, action, data=None, request=None):
    """Helper function to log user activity"""
    activity = UserActivity(
        user_id=user_id,
        action=action,
        activity_data=data,
        ip_address=request.remote_addr if request else None,
        user_agent=request.headers.get('User-Agent') if request else None,
    )
    db.session.add(activity)
    db.session.commit()
    return activity
