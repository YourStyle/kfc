import pytest
from app import db
from app.models import User, Level, GameSession


class TestDashboard:
    """Tests for admin dashboard"""

    def test_dashboard_loads(self, logged_in_client):
        """Test that dashboard loads for authenticated admin"""
        response = logged_in_client.get('/admin/')
        assert response.status_code == 200
        assert 'Дашборд' in response.get_data(as_text=True)

    def test_dashboard_shows_stats(self, logged_in_client, app, sample_game_user):
        """Test that dashboard shows user statistics"""
        response = logged_in_client.get('/admin/')
        html = response.get_data(as_text=True)
        assert 'Всего пользователей' in html
        assert 'Подтверждённых' in html

    def test_dashboard_shows_recent_users(self, logged_in_client, sample_game_user):
        """Test that dashboard shows recent users"""
        response = logged_in_client.get('/admin/')
        html = response.get_data(as_text=True)
        assert 'Последние пользователи' in html

    def test_dashboard_shows_quick_actions(self, logged_in_client):
        """Test that dashboard shows quick actions"""
        response = logged_in_client.get('/admin/')
        html = response.get_data(as_text=True)
        assert 'Быстрые действия' in html
        assert 'Пользователи' in html
        assert 'Конструктор' in html
