import React, { useEffect, useState, useRef } from 'react';
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
  const [loaded, setLoaded] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const scoreRafRef = useRef(0);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    setIsLoading(true);
    setLoaded(false);

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
    setTimeout(() => setLoaded(true), 50);
  };

  // Animated score counter
  useEffect(() => {
    const target = user?.total_score || 0;
    if (target === 0) { setDisplayScore(0); return; }
    const start = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (t < 1) {
        scoreRafRef.current = requestAnimationFrame(tick);
      } else {
        scoreRafRef.current = 0;
      }
    };

    cancelAnimationFrame(scoreRafRef.current);
    scoreRafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(scoreRafRef.current); scoreRafRef.current = 0; };
  }, [user?.total_score, loaded]);

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div className="profile-bg" style={{
          ...styles.backgroundImage,
          backgroundImage: `url(${basePath}images/background.webp)`,
        }} />

        <div style={styles.header}>
          <h1 style={styles.title}>Профиль</h1>
        </div>

        <div style={styles.contentContainer}>
          <div style={styles.contentPanel}>
            <div style={styles.notLoggedIn}>
              <div style={styles.notLoggedInIcon}>👤</div>
              <h2 style={styles.notLoggedInTitle}>Войдите в аккаунт</h2>
              <p style={styles.notLoggedInText}>
                Чтобы видеть статистику и участвовать в рейтинге, необходимо войти или зарегистрироваться.
              </p>
              <button className="sci-fi-btn" style={styles.loginButton} onClick={onShowAuth}>
                Войти / Регистрация
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="profile-bg" style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${basePath}images/background.webp)`,
      }} />

      <div style={styles.header}>
        <h1 style={styles.title}>Профиль</h1>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.contentPanel}>
            <div style={styles.content}>
              {/* User Card */}
              <div className={`profile-stagger ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.userCard, animationDelay: '0.1s' }}>
                <div className="profile-avatar" style={styles.avatar}>
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.username}>{user?.username}</div>
                  <div style={styles.email}>{user?.email}</div>
                  <div style={styles.city}>
                    📍 {user?.city_name || (user?.city === 'moscow' ? 'Москва и МО' : 'Регион')}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={styles.statsGrid}>
                <div className={`profile-stagger ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.statCard, animationDelay: '0.2s' }}>
                  <div style={styles.statValue}>{displayScore.toLocaleString()}</div>
                  <div style={styles.statLabel}>Общий счёт</div>
                </div>

                <div className={`profile-stagger ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.statCard, animationDelay: '0.3s' }}>
                  <div style={styles.statValue}>{completedLevels}</div>
                  <div style={styles.statLabel}>Пройдено</div>
                </div>

                <div className={`profile-stagger ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.statCard, animationDelay: '0.4s' }}>
                  <div style={styles.statValue}>
                    {myRank ? `#${myRank.rank}` : '-'}
                  </div>
                  <div style={styles.statLabel}>Место</div>
                </div>

                <div className={`profile-stagger ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.statCard, animationDelay: '0.5s' }}>
                  <div style={styles.statValue}>
                    {myRank ? myRank.total_players : '-'}
                  </div>
                  <div style={styles.statLabel}>Игроков</div>
                </div>
              </div>

              {/* Logout Button */}
              <button className={`profile-stagger profile-logout ${loaded ? 'profile-stagger-visible' : ''}`} style={{ ...styles.logoutButton, animationDelay: '0.6s' }} onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '20px 20px 15px',
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0,
    textShadow: '0 0 20px rgba(237, 28, 41, 0.4), 0 2px 10px rgba(0, 0, 0, 0.5)',
    textTransform: 'uppercase',
  },
  contentContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 80,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px',
  },
  contentPanel: {
    width: '100%',
    maxWidth: 500,
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.92) 0%, rgba(30, 30, 30, 0.95) 100%)',
    borderRadius: 20,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5), 0 0 80px rgba(228, 0, 43, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  userCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.85) 100%)',
    backdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: 18,
    border: '1px solid rgba(237, 28, 41, 0.3)',
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: '#ED1C29',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 4,
    fontFamily: "'RosticsCeraPro', sans-serif",
    textShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
  },
  email: {
    fontSize: 13,
    color: 'rgba(244, 166, 152, 0.6)',
  },
  city: {
    fontSize: 12,
    color: 'rgba(244, 166, 152, 0.7)',
    marginTop: 4,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  statCard: {
    position: 'relative',
    background: 'linear-gradient(160deg, rgba(21, 21, 21, 0.9) 0%, rgba(40, 40, 40, 0.85) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    border: '1px solid rgba(237, 28, 41, 0.15)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 900,
    color: '#fff',
    marginBottom: 4,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 15px rgba(237, 28, 41, 0.4)',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(244, 166, 152, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontWeight: 600,
  },
  logoutButton: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0,
    transition: 'all 0.2s ease',
  },
  notLoggedIn: {
    textAlign: 'center',
    padding: 30,
  },
  notLoggedInIcon: {
    fontSize: 60,
    marginBottom: 16,
    filter: 'drop-shadow(0 0 20px rgba(237, 28, 41, 0.4))',
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 10,
    marginTop: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
    textShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
  },
  notLoggedInText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 28,
    lineHeight: 1.6,
    fontSize: 14,
  },
  loginButton: {
    padding: '16px 44px',
    border: 'none',
    borderRadius: 12,
    background: '#ED1C29',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(228, 0, 43, 0.5), 0 6px 20px rgba(0, 0, 0, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
    transition: 'all 0.2s ease',
  },
};

// Add sci-fi button styles
const profileStyleSheet = document.createElement('style');
profileStyleSheet.textContent = `
  /* @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap'); */

  .sci-fi-btn {
  }
  .sci-fi-btn:hover {
    background: #ED1C29 !important;
    box-shadow: 0 6px 28px rgba(228, 0, 43, 0.6) !important;
    transform: translateY(-2px);
  }
  .sci-fi-btn:active {
    transform: translateY(0);
  }

  /* Stagger entrance animation */
  @keyframes profileStaggerIn {
    from { opacity: 0; transform: translateY(18px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .profile-stagger { opacity: 0; }
  .profile-stagger-visible { animation: profileStaggerIn 0.4s ease-out both; }

  /* Avatar pulse glow */
  @keyframes profileAvatarPulse {
    0%, 100% { box-shadow: 0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
    50% { box-shadow: 0 0 35px rgba(228, 0, 43, 0.7), 0 0 60px rgba(228, 0, 43, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
  }
  .profile-avatar {
    animation: profileAvatarPulse 3s ease-in-out infinite;
  }

  /* Logout button hover */
  .profile-logout:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 100, 120, 0.3) !important;
    color: rgba(255, 255, 255, 0.85) !important;
    transform: translateY(-1px);
  }

  /* Mobile background for profile screen */
  @media (max-width: 500px) {
    .profile-bg {
      background-image: url('/images/backgroundmob.webp') !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-stagger-visible { animation: none !important; opacity: 1 !important; transform: none !important; }
    .profile-avatar { animation: none !important; }
  }
`;
if (!document.getElementById('profile-styles')) {
  profileStyleSheet.id = 'profile-styles';
  document.head.appendChild(profileStyleSheet);
}
