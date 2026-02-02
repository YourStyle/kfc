import pytest
from app import db
from app.models.level import Level
from app.models.user_progress import UserLevelProgress


class TestGetLevels:
    """Tests for /api/levels endpoint"""

    def test_get_levels_empty(self, client):
        """Test getting levels when none exist"""
        response = client.get('/api/levels')
        assert response.status_code == 200
        assert response.get_json()['levels'] == []

    def test_get_levels_success(self, client, sample_level):
        """Test getting all levels"""
        response = client.get('/api/levels')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['levels']) == 1
        assert data['levels'][0]['name'] == 'Test Level'

    def test_get_levels_only_active(self, client, app, sample_level):
        """Test that only active levels are returned"""
        with app.app_context():
            inactive = Level(
                name='Inactive Level',
                order=2,
                targets={'min_score': 100},
                is_active=False
            )
            db.session.add(inactive)
            db.session.commit()

        response = client.get('/api/levels')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['levels']) == 1
        assert data['levels'][0]['name'] == 'Test Level'


class TestGetLevel:
    """Tests for /api/levels/<id> endpoint"""

    def test_get_level_success(self, client, sample_level):
        """Test getting single level"""
        response = client.get(f'/api/levels/{sample_level.id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['level']['name'] == 'Test Level'
        assert data['level']['grid_width'] == 7
        assert data['level']['max_moves'] == 30

    def test_get_level_not_found(self, client):
        """Test getting nonexistent level"""
        response = client.get('/api/levels/999')
        assert response.status_code == 404


class TestLevelLeaderboard:
    """Tests for /api/levels/<id>/leaderboard endpoint"""

    def test_level_leaderboard_empty(self, client, sample_level):
        """Test getting leaderboard when empty"""
        response = client.get(f'/api/levels/{sample_level.id}/leaderboard')
        assert response.status_code == 200
        assert response.get_json()['leaderboard'] == []

    def test_level_leaderboard_with_scores(self, client, app, sample_level, verified_user):
        """Test getting leaderboard with scores"""
        with app.app_context():
            progress = UserLevelProgress(
                user_id=verified_user.id,
                level_id=sample_level.id,
                best_score=500,
                stars=3
            )
            db.session.add(progress)
            db.session.commit()

        response = client.get(f'/api/levels/{sample_level.id}/leaderboard')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['leaderboard']) == 1
        assert data['leaderboard'][0]['score'] == 500
        assert data['leaderboard'][0]['stars'] == 3


class TestUserProgress:
    """Tests for /api/levels/user/progress endpoint"""

    def test_user_progress_no_auth(self, client):
        """Test getting progress without auth"""
        response = client.get('/api/levels/user/progress')
        assert response.status_code == 401

    def test_user_progress_empty(self, client, auth_header, sample_level):
        """Test getting progress when none exists"""
        response = client.get('/api/levels/user/progress', headers=auth_header)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['levels']) == 1
        assert data['levels'][0]['progress'] is None

    def test_user_progress_with_data(self, client, app, auth_header, sample_level, verified_user):
        """Test getting progress with existing data"""
        with app.app_context():
            progress = UserLevelProgress(
                user_id=verified_user.id,
                level_id=sample_level.id,
                best_score=300,
                stars=2,
                attempts_count=5
            )
            db.session.add(progress)
            db.session.commit()

        response = client.get('/api/levels/user/progress', headers=auth_header)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['levels']) == 1
        assert data['levels'][0]['progress'] is not None
        assert data['levels'][0]['progress']['best_score'] == 300
        assert data['levels'][0]['progress']['stars'] == 2
