import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ProfileScreenProps {
  onBack: () => void;
  onShowAuth: () => void;
}

export function ProfileScreen({ onBack, onShowAuth }: ProfileScreenProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [myRank, setMyRank] = useState<{ rank: number; total_players: number } | null>(null);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    setIsLoading(true);

    const [rankRes, progressRes] = await Promise.all([
      api.getMyRank(),
      api.getUserProgress(),
    ]);

    if (rankRes.data) {
      setMyRank({ rank: rankRes.data.rank, total_players: rankRes.data.total_players });
    }

    if (progressRes.data) {
      const completed = progressRes.data.levels.filter(
        (l) => l.progress?.completed_at
      ).length;
      setCompletedLevels(completed);
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Профиль</h1>
        </div>

        <div style={styles.notLoggedIn}>
          <div style={styles.notLoggedInIcon}>👤</div>
          <h2 style={styles.notLoggedInTitle}>Войдите в аккаунт</h2>
          <p style={styles.notLoggedInText}>
            Чтобы видеть статистику и участвовать в рейтинге, необходимо войти или зарегистрироваться.
          </p>
          <button style={styles.loginButton} onClick={onShowAuth}>
            Войти / Регистрация
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Профиль</h1>
      </div>

      {isLoading ? (
        <div style={styles.loading}>Загрузка...</div>
      ) : (
        <div style={styles.content}>
          {/* User Card */}
          <div style={styles.userCard}>
            <div style={styles.avatar}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.username}>{user?.username}</div>
              <div style={styles.email}>{user?.email}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{user?.total_score?.toLocaleString() || 0}</div>
              <div style={styles.statLabel}>Общий счёт</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>{completedLevels}</div>
              <div style={styles.statLabel}>Пройдено уровней</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {myRank ? `#${myRank.rank}` : '-'}
              </div>
              <div style={styles.statLabel}>Место в рейтинге</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {myRank ? myRank.total_players : '-'}
              </div>
              <div style={styles.statLabel}>Всего игроков</div>
            </div>
          </div>

          {/* Logout Button */}
          <button style={styles.logoutButton} onClick={handleLogout}>
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFF5F5',
    padding: '25px 20px 20px',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    color: '#E4002B',
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    textAlign: 'center',
    fontFamily: "'Oswald', sans-serif",
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
    fontSize: 18,
  },
  content: {
    maxWidth: 500,
    margin: '0 auto',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E4002B',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E4002B',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  logoutButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    border: '2px solid #ccc',
    backgroundColor: '#fff',
    color: '#666',
    fontSize: 16,
    cursor: 'pointer',
  },
  notLoggedIn: {
    textAlign: 'center',
    padding: 40,
    maxWidth: 400,
    margin: '0 auto',
  },
  notLoggedInIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  notLoggedInText: {
    color: '#666',
    marginBottom: 30,
    lineHeight: 1.5,
  },
  loginButton: {
    padding: '15px 40px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#E4002B',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
