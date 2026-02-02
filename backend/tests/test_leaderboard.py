import pytest
from app import db
from app.models.user import User
from app.models.user_progress import UserLevelProgress
from app.models.game_session import GameSession
from app.utils.timezone import now_moscow


class TestGlobalLeaderboard:
    """Tests for /api/leaderboard endpoint"""

    def test_leaderboard_empty(self, client):
        """Test getting leaderboard when empty"""
        response = client.get('/api/leaderboard')
        assert response.status_code == 200
        assert response.get_json()['leaderboard'] == []

    def test_leaderboard_with_users(self, client, app, verified_user):
        """Test getting leaderboard with users"""
        verified_user.total_score = 1000
        db.session.commit()

        response = client.get('/api/leaderboard')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['leaderboard']) == 1
        assert data['leaderboard'][0]['total_score'] == 1000
        assert data['leaderboard'][0]['rank'] == 1

    def test_leaderboard_ranking(self, client, app, verified_user):
        """Test that users are ranked correctly"""
        verified_user.total_score = 500
        db.session.commit()

        # Add another user with higher score
        user2 = User(
            email='player2@example.com',
            username='player2',
            is_verified=True,
            total_score=1000
        )
        user2.set_password('password')
        db.session.add(user2)
        db.session.commit()

        response = client.get('/api/leaderboard')
        data = response.get_json()
        assert len(data['leaderboard']) == 2
        assert data['leaderboard'][0]['total_score'] == 1000
        assert data['leaderboard'][0]['rank'] == 1
        assert data['leaderboard'][1]['total_score'] == 500
        assert data['leaderboard'][1]['rank'] == 2

    def test_leaderboard_excludes_unverified(self, client, unverified_user, app):
        """Test that unverified users are excluded"""
        unverified_user.total_score = 1000
        db.session.commit()

        response = client.get('/api/leaderboard')
        assert response.get_json()['leaderboard'] == []

    def test_leaderboard_limit(self, client, app):
        """Test leaderboard limit parameter"""
        for i in range(5):
            user = User(
                email=f'player{i}@example.com',
                username=f'player{i}',
                is_verified=True,
                total_score=(i + 1) * 100
            )
            user.set_password('password')
            db.session.add(user)
        db.session.commit()

        response = client.get('/api/leaderboard?limit=3')
        data = response.get_json()
        assert len(data['leaderboard']) == 3
        assert data['leaderboard'][0]['total_score'] == 500


class TestWeeklyLeaderboard:
    """Tests for /api/leaderboard/weekly endpoint"""

    def test_weekly_leaderboard_empty(self, client):
        """Test getting weekly leaderboard when empty"""
        response = client.get('/api/leaderboard/weekly')
        assert response.status_code == 200
        assert response.get_json()['leaderboard'] == []

    def test_weekly_leaderboard_with_sessions(self, client, app, verified_user, sample_level):
        """Test weekly leaderboard includes current week's sessions"""
        session = GameSession(
            user_id=verified_user.id,
            level_id=sample_level.id,
            score=500,
            is_completed=True,
            is_won=True,
            created_at=now_moscow()
        )
        db.session.add(session)
        db.session.commit()

        response = client.get('/api/leaderboard/weekly')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['leaderboard']) == 1
        assert data['leaderboard'][0]['weekly_score'] == 500


class TestMyRank:
    """Tests for /api/leaderboard/my-rank endpoint"""

    def test_my_rank_no_auth(self, client):
        """Test getting rank without auth"""
        response = client.get('/api/leaderboard/my-rank')
        assert response.status_code == 401

    def test_my_rank_success(self, client, auth_header, app, verified_user):
        """Test getting current user's rank"""
        verified_user.total_score = 500
        db.session.commit()

        response = client.get('/api/leaderboard/my-rank', headers=auth_header)
        assert response.status_code == 200
        data = response.get_json()
        assert data['rank'] == 1
        assert data['total_score'] == 500
        assert data['total_players'] == 1

    def test_my_rank_with_others(self, client, auth_header, app, verified_user):
        """Test rank when other users have higher scores"""
        verified_user.total_score = 500
        db.session.commit()

        # Add users with higher scores
        for i in range(3):
            u = User(
                email=f'top{i}@example.com',
                username=f'top{i}',
                is_verified=True,
                total_score=1000 + i * 100
            )
            u.set_password('password')
            db.session.add(u)
        db.session.commit()

        response = client.get('/api/leaderboard/my-rank', headers=auth_header)
        data = response.get_json()
        assert data['rank'] == 4
        assert data['total_players'] == 4
