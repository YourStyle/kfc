import pytest


class TestHealth:
    """Tests for /api/health endpoint"""

    def test_health_check(self, client):
        """Test health check endpoint returns ok"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
