import pytest
from app import db
from app.models.user import User


class TestRegister:
    """Tests for /api/auth/register endpoint"""

    def test_register_success(self, client):
        """Test successful registration"""
        response = client.post('/api/auth/register', json={
            'email': 'new@example.com',
            'password': 'password123',
            'username': 'newuser'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == 'new@example.com'
        assert data['user']['username'] == 'newuser'
        assert data['user']['is_verified'] is False

    def test_register_missing_email(self, client):
        """Test registration with missing email"""
        response = client.post('/api/auth/register', json={
            'password': 'password123'
        })
        assert response.status_code == 400
        assert 'error' in response.get_json()

    def test_register_missing_password(self, client):
        """Test registration with missing password"""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com'
        })
        assert response.status_code == 400

    def test_register_short_password(self, client):
        """Test registration with password less than 6 characters"""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': '12345'
        })
        assert response.status_code == 400
        assert 'at least 6' in response.get_json()['error']

    def test_register_duplicate_email(self, client, verified_user):
        """Test registration with existing email"""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        assert response.status_code == 400
        assert 'already registered' in response.get_json()['error']

    def test_register_email_normalization(self, client):
        """Test that email is normalized (lowercase, trimmed)"""
        response = client.post('/api/auth/register', json={
            'email': '  TEST@EXAMPLE.COM  ',
            'password': 'password123'
        })
        assert response.status_code == 201
        assert response.get_json()['user']['email'] == 'test@example.com'


class TestLogin:
    """Tests for /api/auth/login endpoint"""

    def test_login_success(self, client, verified_user):
        """Test successful login"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'password123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert 'user' in data

    def test_login_wrong_password(self, client, verified_user):
        """Test login with wrong password"""
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401
        assert 'Invalid' in response.get_json()['error']

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent email"""
        response = client.post('/api/auth/login', json={
            'email': 'notexist@example.com',
            'password': 'password123'
        })
        assert response.status_code == 401

    def test_login_unverified_user(self, client, unverified_user):
        """Test login with unverified user"""
        response = client.post('/api/auth/login', json={
            'email': 'unverified@example.com',
            'password': 'password123'
        })
        assert response.status_code == 401
        data = response.get_json()
        assert 'verify' in data['error'].lower()
        assert data.get('needs_verification') is True

    def test_login_missing_credentials(self, client):
        """Test login without email or password"""
        response = client.post('/api/auth/login', json={})
        assert response.status_code == 400


class TestVerify:
    """Tests for /api/auth/verify endpoint"""

    def test_verify_success(self, client, app, unverified_user):
        """Test successful email verification"""
        response = client.post('/api/auth/verify', json={
            'email': 'unverified@example.com',
            'code': '123456'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert data['user']['is_verified'] is True

    def test_verify_wrong_code(self, client, unverified_user):
        """Test verification with wrong code"""
        response = client.post('/api/auth/verify', json={
            'email': 'unverified@example.com',
            'code': '000000'
        })
        assert response.status_code == 400
        assert 'Invalid' in response.get_json()['error']

    def test_verify_already_verified(self, client, verified_user):
        """Test verification of already verified user"""
        response = client.post('/api/auth/verify', json={
            'email': 'test@example.com',
            'code': '123456'
        })
        assert response.status_code == 400
        assert 'already verified' in response.get_json()['error']

    def test_verify_nonexistent_user(self, client):
        """Test verification of nonexistent user"""
        response = client.post('/api/auth/verify', json={
            'email': 'notexist@example.com',
            'code': '123456'
        })
        assert response.status_code == 404


class TestMe:
    """Tests for /api/auth/me endpoint"""

    def test_me_success(self, client, auth_header):
        """Test getting current user info"""
        response = client.get('/api/auth/me', headers=auth_header)
        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == 'test@example.com'

    def test_me_no_auth(self, client):
        """Test getting current user without auth"""
        response = client.get('/api/auth/me')
        assert response.status_code == 401


class TestLogout:
    """Tests for /api/auth/logout endpoint"""

    def test_logout_success(self, client, auth_header):
        """Test successful logout"""
        response = client.post('/api/auth/logout', headers=auth_header)
        assert response.status_code == 200

    def test_logout_no_auth(self, client):
        """Test logout without auth"""
        response = client.post('/api/auth/logout')
        assert response.status_code == 401
