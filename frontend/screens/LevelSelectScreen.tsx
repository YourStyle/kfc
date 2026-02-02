import React, { useEffect, useState } from 'react';
import api, { LevelWithProgress, Level } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LockIcon } from '../components/Icons';

interface LevelSelectScreenProps {
  onSelectLevel: (level: Level) => void;
  onBack: () => void;
  onShowAuth: () => void;
  onShowLeaderboard: () => void;
}

export function LevelSelectScreen({
  onSelectLevel,
  onShowAuth,
}: LevelSelectScreenProps) {
  const { isAuthenticated } = useAuth();
  const [levels, setLevels] = useState<LevelWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    loadLevels();
  }, [isAuthenticated]);

  const loadLevels = async () => {
    setIsLoading(true);

    if (isAuthenticated) {
      const { data } = await api.getUserProgress();
      if (data) {
        setLevels(data.levels);
      }
    } else {
      const { data } = await api.getLevels();
      if (data) {
        setLevels(data.levels || data);
      }
    }

    setIsLoading(false);
  };

  const isLevelUnlocked = (index: number) => {
    if (index === 0) return true;
    if (!isAuthenticated) return index < 2;
    const prevLevel = levels[index - 1];
    return prevLevel?.progress?.completed_at != null;
  };

  return (
    <div style={styles.container}>
      {/* Background Image - fixed full screen */}
      <div style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${basePath}images/background.png)`,
      }} />

      {/* Fixed Logo at top */}
      <div style={styles.header}>
        <img
          src={`${basePath}images/logoRost.png`}
          alt="ROSTIC'S КУХНЯ"
          style={styles.logo}
        />
      </div>

      {/* Scrollable levels container in the middle */}
      <div style={styles.levelsContainer}>
        <div style={styles.levelsPanel}>
          {isLoading ? (
            <div style={styles.loading}>
              <div style={styles.loadingSpinner} />
              <span>Загрузка...</span>
            </div>
          ) : (
            <div style={styles.levelsList}>
              {levels.map((level, index) => {
                const unlocked = isLevelUnlocked(index);
                const completed = level.progress?.completed_at != null;
                const stars = level.progress?.stars || 0;
                const bestScore = level.progress?.best_score || 0;

                if (unlocked) {
                  return (
                    <div
                      key={level.id}
                      style={styles.levelCard}
                      onClick={() => onSelectLevel(level)}
                    >
                      {/* Red gradient border on left */}
                      <div style={styles.redBorder} />

                      <div style={styles.levelCardContent}>
                        {/* Header row */}
                        <div style={styles.levelHeader}>
                          <div style={styles.difficultyBadge}>ЛЕГКО</div>
                          <div style={styles.levelLabel}>УРОВЕНЬ {level.order}</div>
                        </div>

                        {/* Level name */}
                        <div style={styles.levelName}>{level.name}</div>

                        {/* Content row: image + info */}
                        <div style={styles.levelContentRow}>
                          <img
                            src={`${basePath}images/bucket.png`}
                            alt="bucket"
                            style={styles.bucketImage}
                          />
                          <div style={styles.levelRightSide}>
                            {/* Stars if completed */}
                            {completed && stars > 0 && (
                              <div style={styles.starsRow}>
                                {[1, 2, 3].map((i) => (
                                  <span
                                    key={i}
                                    style={{
                                      ...styles.star,
                                      opacity: i <= stars ? 1 : 0.3,
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Score pill */}
                            <div style={styles.scorePill}>
                              {completed ? bestScore.toLocaleString() : '0'}
                            </div>
                            {/* Play button */}
                            <button style={styles.playButton}>
                              {completed ? 'Играть снова' : 'Играть'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Locked level
                return (
                  <div key={level.id} style={styles.levelCardLocked}>
                    <div style={styles.lockIconHex}>
                      <LockIcon size={24} color="rgba(150, 160, 180, 0.8)" />
                    </div>
                    <div style={styles.lockedInfo}>
                      <div style={styles.lockedLabel}>УРОВЕНЬ {level.order}</div>
                      <div style={styles.lockedText}>Открывается позже</div>
                    </div>
                  </div>
                );
              })}

              {/* Auth Banner for guests */}
              {!isAuthenticated && (
                <div style={styles.authBanner}>
                  <span>🔐 Войди, чтобы сохранить прогресс</span>
                  <button style={styles.authButton} onClick={onShowAuth}>
                    Войти
                  </button>
                </div>
              )}
            </div>
          )}
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
    textAlign: 'center',
    paddingTop: 15,
    paddingBottom: 10,
  },
  logo: {
    maxWidth: 240,
    height: 'auto',
    display: 'block',
    margin: '0 auto',
  },
  levelsContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    bottom: 80,
    zIndex: 5,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px',
  },
  levelsPanel: {
    width: '100%',
    maxWidth: 500,
    background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.7) 0%, rgba(15, 20, 35, 0.8) 100%)',
    borderRadius: 24,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 15,
    color: '#fff',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: '3px solid #E4002B',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  levelsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  // Active level card - glassmorphism
  levelCard: {
    position: 'relative',
    background: 'rgba(30, 40, 60, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  redBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 5,
    background: 'linear-gradient(180deg, #FF6B6B 0%, #E4002B 50%, #C4001F 100%)',
    borderRadius: '20px 0 0 20px',
  },
  levelCardContent: {
    padding: '16px 18px 18px 22px',
  },
  levelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyBadge: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #E4002B 100%)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 14px',
    borderRadius: 6,
    letterSpacing: 1,
  },
  levelLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
  },
  levelName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 14,
  },
  levelContentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  bucketImage: {
    width: 100,
    height: 100,
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
  },
  levelRightSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
  starsRow: {
    display: 'flex',
    gap: 4,
  },
  star: {
    fontSize: 18,
    color: '#FFD700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  scorePill: {
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    padding: '10px 40px',
    borderRadius: 25,
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  playButton: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #E4002B 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 25,
    padding: '14px 40px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(228, 0, 43, 0.4)',
    minWidth: 140,
  },
  // Locked level card - glassmorphism
  levelCardLocked: {
    background: 'rgba(40, 50, 70, 0.5)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  lockIconHex: {
    width: 56,
    height: 56,
    background: 'rgba(100, 115, 140, 0.3)',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockedInfo: {
    flex: 1,
  },
  lockedLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 14,
  },
  authBanner: {
    marginTop: 10,
    background: 'rgba(30, 40, 60, 0.6)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: 13,
  },
  authButton: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #E4002B 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 20px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 13,
    flexShrink: 0,
  },
};

// Add animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.getElementById('level-select-styles')) {
  styleSheet.id = 'level-select-styles';
  document.head.appendChild(styleSheet);
}
