import pytest


class TestLogin:
    """Tests for admin login"""

    def test_login_page_loads(self, client):
        """Test that login page loads"""
        response = client.get('/auth/login')
        assert response.status_code == 200
        assert 'Вход' in response.get_data(as_text=True)

    def test_login_success(self, client, admin_user):
        """Test successful login"""
        response = client.post('/auth/login', data={
            'username': 'testadmin',
            'password': 'password123'
        }, follow_redirects=True)
        assert response.status_code == 200
        assert 'Дашборд' in response.get_data(as_text=True)

    def test_login_wrong_password(self, client, admin_user):
        """Test login with wrong password"""
        response = client.post('/auth/login', data={
            'username': 'testadmin',
            'password': 'wrongpassword'
        })
        assert response.status_code == 200
        assert 'Неверный логин или пароль' in response.get_data(as_text=True)

    def test_login_nonexistent_user(self, client):
        """Test login with nonexistent user"""
        response = client.post('/auth/login', data={
            'username': 'notexist',
            'password': 'password'
        })
        assert response.status_code == 200
        assert 'Неверный' in response.get_data(as_text=True)

    def test_login_inactive_user(self, client, inactive_admin):
        """Test login with inactive admin"""
        response = client.post('/auth/login', data={
            'username': 'inactive',
            'password': 'password123'
        })
        assert response.status_code == 200
        assert 'отключён' in response.get_data(as_text=True)

    def test_redirect_if_authenticated(self, logged_in_client):
        """Test that logged in user is redirected from login page"""
        response = logged_in_client.get('/auth/login')
        assert response.status_code == 302
        assert '/admin' in response.location


class TestLogout:
    """Tests for admin logout"""

    def test_logout(self, logged_in_client):
        """Test logout redirects to login"""
        response = logged_in_client.get('/auth/logout', follow_redirects=True)
        assert response.status_code == 200
        assert 'Вход' in response.get_data(as_text=True)


class TestProtectedRoutes:
    """Tests for protected route access"""

    def test_admin_requires_login(self, client):
        """Test that admin dashboard requires login"""
        response = client.get('/admin/')
        assert response.status_code == 302
        assert 'login' in response.location.lower()

    def test_users_page_requires_login(self, client):
        """Test that users page requires login"""
        response = client.get('/admin/user/')
        assert response.status_code == 302

    def test_levels_page_requires_login(self, client):
        """Test that levels page requires login"""
        response = client.get('/admin/level/')
        assert response.status_code == 302
