import pytest
from app import db
from app.models.game_session import GameSession
from app.models.user_progress import UserLevelProgress
from app.models.user import User


class TestStartGame:
    """Tests for /api/game/start endpoint"""

    def test_start_game_no_auth(self, client):
        """Test starting game without auth"""
        response = client.post('/api/game/start', json={'level_id': 1})
        assert response.status_code == 401

    def test_start_game_success(self, client, auth_header, sample_level):
        """Test successful game start"""
        response = client.post('/api/game/start',
                               json={'level_id': sample_level.id},
                               headers=auth_header)
        assert response.status_code == 200
        data = response.get_json()
        assert 'session_id' in data
        assert 'level' in data
        assert data['level']['name'] == 'Test Level'

    def test_start_game_missing_level_id(self, client, auth_header):
        """Test starting game without level_id"""
        response = client.post('/api/game/start', json={}, headers=auth_header)
        assert response.status_code == 400

    def test_start_game_nonexistent_level(self, client, auth_header):
        """Test starting game with nonexistent level"""
        response = client.post('/api/game/start',
                               json={'level_id': 999},
                               headers=auth_header)
        assert response.status_code == 404


class TestCompleteGame:
    """Tests for /api/game/complete endpoint"""

    def test_complete_game_no_auth(self, client):
        """Test completing game without auth"""
        response = client.post('/api/game/complete', json={'session_id': 1})
        assert response.status_code == 401

    def test_complete_game_success_win(self, client, app, auth_header, sample_level, verified_user):
        """Test successful game completion with win"""
        # Start a game first
        start_response = client.post('/api/game/start',
                                     json={'level_id': sample_level.id},
                                     headers=auth_header)
        session_id = start_response.get_json()['session_id']

        # Complete the game
        response = client.post('/api/game/complete', json={
            'session_id': session_id,
            'score': 500,
            'moves_used': 20,
            'duration_seconds': 120,
            'targets_met': {
                'collect': {'drumstick': 10},
                'score': 500
            }
        }, headers=auth_header)

        assert response.status_code == 200
        data = response.get_json()
        assert data['is_won'] is True
        assert data['stars'] >= 1
        assert data['score'] >= 500

    def test_complete_game_loss(self, client, app, auth_header, sample_level, verified_user):
        """Test game completion with loss (targets not met)"""
        # Start a game
        start_response = client.post('/api/game/start',
                                     json={'level_id': sample_level.id},
                                     headers=auth_header)
        session_id = start_response.get_json()['session_id']

        # Complete without meeting targets
        response = client.post('/api/game/complete', json={
            'session_id': session_id,
            'score': 50,
            'moves_used': 30,
            'targets_met': {
                'collect': {'drumstick': 2}  # Need 5
            }
        }, headers=auth_header)

        assert response.status_code == 200
        data = response.get_json()
        assert data['is_won'] is False
        assert data['stars'] == 0

    def test_complete_game_missing_session(self, client, auth_header):
        """Test completing nonexistent session"""
        response = client.post('/api/game/complete', json={
            'session_id': 999,
            'score': 100
        }, headers=auth_header)
        assert response.status_code == 404

    def test_complete_game_already_completed(self, client, app, auth_header, sample_level):
        """Test completing already completed session"""
        # Start and complete a game
        start_response = client.post('/api/game/start',
                                     json={'level_id': sample_level.id},
                                     headers=auth_header)
        session_id = start_response.get_json()['session_id']

        client.post('/api/game/complete', json={
            'session_id': session_id,
            'score': 100,
            'targets_met': {'collect': {'drumstick': 5}}
        }, headers=auth_header)

        # Try to complete again
        response = client.post('/api/game/complete', json={
            'session_id': session_id,
            'score': 200
        }, headers=auth_header)

        assert response.status_code == 400
        assert 'already completed' in response.get_json()['error']

    def test_complete_game_moves_bonus(self, client, auth_header, sample_level):
        """Test that remaining moves give bonus points"""
        start_response = client.post('/api/game/start',
                                     json={'level_id': sample_level.id},
                                     headers=auth_header)
        session_id = start_response.get_json()['session_id']

        response = client.post('/api/game/complete', json={
            'session_id': session_id,
            'score': 100,
            'moves_used': 10,  # 20 moves remaining out of 30
            'targets_met': {'collect': {'drumstick': 5}, 'score': 100}
        }, headers=auth_header)

        assert response.status_code == 200
        data = response.get_json()
        assert data['is_won'] is True
        assert data['moves_bonus'] == 20 * 50  # 1000 bonus
        assert data['score'] == 100 + 1000


class TestCheckTargetsMet:
    """Test the check_targets_met helper function"""

    def test_collect_targets_met(self, app):
        """Test checking collect targets"""
        from app.api.game import check_targets_met

        targets = {'collect': {'drumstick': 5, 'burger': 3}}
        met = {'collect': {'drumstick': 5, 'burger': 3}}
        assert check_targets_met(targets, met) is True

    def test_collect_targets_not_met(self, app):
        """Test checking collect targets not met"""
        from app.api.game import check_targets_met

        targets = {'collect': {'drumstick': 5}}
        met = {'collect': {'drumstick': 3}}
        assert check_targets_met(targets, met) is False

    def test_min_score_target(self, app):
        """Test checking minimum score target"""
        from app.api.game import check_targets_met

        targets = {'min_score': 100}
        met = {'score': 150}
        assert check_targets_met(targets, met) is True

        met = {'score': 50}
        assert check_targets_met(targets, met) is False


class TestCalculateStars:
    """Test the calculate_stars helper function"""

    def test_three_stars(self, app):
        """Test 3 stars calculation"""
        from app.api.game import calculate_stars

        targets = {'min_score': 100}
        assert calculate_stars(targets, 200, {}) == 3

    def test_two_stars(self, app):
        """Test 2 stars calculation"""
        from app.api.game import calculate_stars

        targets = {'min_score': 100}
        assert calculate_stars(targets, 150, {}) == 2

    def test_one_star(self, app):
        """Test 1 star calculation"""
        from app.api.game import calculate_stars

        targets = {'min_score': 100}
        assert calculate_stars(targets, 100, {}) == 1
