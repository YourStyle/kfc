from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.user_activity import log_activity
from app.services.email import send_verification_email
from app.utils.timezone import now_moscow
from app.utils.redis_cache import (
    store_verification_code, get_verification_code, delete_verification_code,
    rate_limit
)
from datetime import timedelta
import random
import string

bp = Blueprint('auth', __name__)


def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))


@bp.route('/register', methods=['POST'])
@rate_limit(3, 3600)  # 3 registrations per hour per IP
def register():
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    username = data.get('username', '').strip()
    city = data.get('city', 'region')  # 'moscow' или 'region'
    city_name = data.get('city_name', '').strip()  # Полное название города
    source = data.get('source', 'game')  # 'game' или 'quest'
    if source not in ('game', 'quest'):
        source = 'game'

    # Validation
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # Validate city
    if city not in ('moscow', 'region'):
        city = 'region'

    # Check if email exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    # Generate verification code
    code = generate_verification_code()

    # Create user (code stored in Redis with TTL, DB as fallback)
    user = User(
        email=email,
        username=username or email.split('@')[0],
        city=city,
        city_name=city_name or None,
        registration_source=source,
        verification_code=code,  # DB fallback
        verification_expires_at=now_moscow() + timedelta(minutes=5)
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Store code in Redis (with 5 min TTL)
    store_verification_code(email, code)

    # Send verification email
    try:
        send_verification_email(user.email, code)
    except Exception as e:
        print(f"Failed to send verification email: {e}")

    # Log activity
    log_activity(user.id, 'register', request=request)

    return jsonify({
        'message': 'Registration successful. Please check your email for verification code.',
        'user': user.to_dict()
    }), 201


@bp.route('/verify', methods=['POST'])
@rate_limit(10, 60)  # 10 attempts per minute
def verify_email():
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    if not email or not code:
        return jsonify({'error': 'Email and verification code are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_verified:
        return jsonify({'error': 'Email already verified'}), 400

    # Check Redis first, then fallback to DB
    redis_code = get_verification_code(email)
    stored_code = redis_code or user.verification_code

    if stored_code != code:
        return jsonify({'error': 'Invalid verification code'}), 400

    # If using DB fallback, check expiration
    if not redis_code and user.verification_expires_at and user.verification_expires_at < now_moscow():
        return jsonify({'error': 'Verification code expired'}), 400

    # Verify user
    user.is_verified = True
    user.verification_code = None
    user.verification_expires_at = None
    db.session.commit()

    # Clean up Redis
    delete_verification_code(email)

    # Log activity
    log_activity(user.id, 'verify_email', request=request)

    # Generate token
    access_token = create_access_token(identity=user.id)

    return jsonify({
        'message': 'Email verified successfully',
        'access_token': access_token,
        'user': user.to_dict()
    })


@bp.route('/resend-code', methods=['POST'])
@rate_limit(3, 600)  # 3 resends per 10 minutes per IP
def resend_verification_code():
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.is_verified:
        return jsonify({'error': 'Email already verified'}), 400

    # Generate new code
    code = generate_verification_code()

    # Store in Redis and DB (fallback)
    store_verification_code(email, code)
    user.verification_code = code
    user.verification_expires_at = now_moscow() + timedelta(minutes=5)
    db.session.commit()

    # Send email
    try:
        send_verification_email(user.email, code)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return jsonify({'error': 'Failed to send email'}), 500

    return jsonify({'message': 'Verification code sent'})


@bp.route('/login', methods=['POST'])
@rate_limit(5, 60)  # 5 login attempts per minute per IP
def login():
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_verified:
        return jsonify({'error': 'Please verify your email first', 'needs_verification': True}), 401

    # Update last login
    user.last_login_at = now_moscow()
    db.session.commit()

    # Log activity
    log_activity(user.id, 'login', request=request)

    # Generate token
    access_token = create_access_token(identity=user.id)

    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    })


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()})


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # In a stateless JWT setup, logout is handled client-side
    # But we can log the activity
    user_id = get_jwt_identity()
    log_activity(user_id, 'logout', request=request)

    return jsonify({'message': 'Logged out successfully'})
