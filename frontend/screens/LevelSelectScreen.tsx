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

// Difficulty config for visual variety
const getDifficultyConfig = (order: number) => {
  if (order <= 2) return { label: 'ЛЕГКО', color: '#00FF88', glow: 'rgba(0, 255, 136, 0.5)' };
  if (order <= 4) return { label: 'СРЕДНЕ', color: '#FFB800', glow: 'rgba(255, 184, 0, 0.5)' };
  return { label: 'СЛОЖНО', color: '#FF3366', glow: 'rgba(255, 51, 102, 0.5)' };
};

export function LevelSelectScreen({
  onSelectLevel,
  onShowAuth,
}: LevelSelectScreenProps) {
  const { isAuthenticated } = useAuth();
  const [levels, setLevels] = useState<LevelWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    loadLevels();
  }, [isAuthenticated]);

  const loadLevels = async () => {
    setIsLoading(true);
    setLoaded(false);

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
    setTimeout(() => setLoaded(true), 50);
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
      <div className="levels-bg" style={{
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
        <div style={styles.levelsPanel} className="hide-scrollbar">
            <div style={styles.levelsList}>
              {levels.map((level, index) => {
                const unlocked = isLevelUnlocked(index);
                const completed = level.progress?.completed_at != null;
                const bestScore = level.progress?.best_score || 0;
                const difficulty = getDifficultyConfig(level.order);
                const isHovered = hoveredCard === level.id;

                if (unlocked) {
                  const minScore = level.targets?.min_score || 1000;
                  const progress = completed ? 100 : Math.min(Math.floor((bestScore / minScore) * 100), 99);

                  return (
                    <div
                      key={level.id}
                      className={`level-card ${loaded ? 'level-card-visible' : 'level-card-hidden'}`}
                      style={{
                        ...styles.levelCard,
                        transform: isHovered ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
                        animationDelay: loaded ? `${index * 0.08}s` : undefined,
                      }}
                      onClick={() => onSelectLevel(level)}
                      onMouseEnter={() => setHoveredCard(level.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {/* Декоративные уголки - напрямую на карточке */}
                      <div className="corner-tl" style={styles.frameCornerTL} />
                      <div className="corner-tr" style={styles.frameCornerTR} />
                      <div className="corner-bl" style={styles.frameCornerBL} />
                      <div className="corner-br" style={styles.frameCornerBR} />


                      {/* Голографический блик */}
                      <div className="holo-shimmer" style={styles.holoShimmer} />

                      <div style={styles.levelCardContent}>
                        {/* Заголовок с номером уровня */}
                        <div style={styles.cardHeader}>
                          <div style={styles.levelBadge}>
                            <span style={styles.levelPrefix}>УРОВЕНЬ</span>
                            <span style={styles.levelNumber}>{level.order}</span>
                          </div>
                          <div
                            style={{
                              ...styles.difficultyPill,
                              background: `linear-gradient(135deg, ${difficulty.color}33 0%, ${difficulty.color}11 100%)`,
                              borderColor: difficulty.color,
                              color: difficulty.color,
                            }}
                          >
                            {difficulty.label}
                          </div>
                        </div>

                        {/* Название и картинка */}
                        <div style={styles.cardBody}>
                          <div style={styles.levelInfo}>
                            <div style={styles.levelName}>{level.name}</div>
                            {completed && (
                              <div style={styles.completedTag}>
                                <span style={styles.checkIcon}>✓</span> ПРОЙДЕН
                              </div>
                            )}
                          </div>
                          <div className="bucket-container" style={styles.bucketContainer}>
                            <div className="bucket-glow" style={styles.bucketGlow} />
                            <img
                              src={`${basePath}images/bucket.png`}
                              alt="bucket"
                              style={styles.bucketImage}
                              className="bucket-float"
                            />
                            <div className="bucket-ring" style={styles.bucketRing} />
                          </div>
                        </div>

                        {/* Прогресс бар */}
                        <div style={styles.progressSection}>
                          <div style={styles.progressLabel}>ПРОГРЕСС</div>
                          <div style={styles.progressBar}>
                            <div
                              className="progress-fill"
                              style={{
                                ...styles.progressFill,
                                width: `${progress}%`,
                              }}
                            />
                            <div style={styles.progressOverlay}>
                              <span style={styles.progressPercent}>{progress}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Кнопка */}
                        <button className="play-btn" style={styles.playButton}>
                          <div className="btn-bg" style={styles.btnBg} />
                          <span style={styles.btnIcon}>▶</span>
                          <span style={styles.btnText}>{completed ? 'ИГРАТЬ СНОВА' : 'ИГРАТЬ'}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // Locked level - game style
                return (
                  <div
                    key={level.id}
                    className={`locked-card ${loaded ? 'level-card-visible' : 'level-card-hidden'}`}
                    style={{
                      ...styles.levelCardLocked,
                      animationDelay: loaded ? `${index * 0.08}s` : undefined,
                    }}
                  >
                    {/* Декоративные уголки */}
                    <div style={styles.lockedCornerTL} />
                    <div style={styles.lockedCornerBR} />

                    <div style={styles.lockedIconContainer}>
                      <div className="lock-hex" style={styles.lockHex}>
                        <LockIcon size={22} color="rgba(120, 150, 200, 0.9)" />
                      </div>
                      <div className="lock-ring" style={styles.lockRing} />
                    </div>

                    <div style={styles.lockedInfo}>
                      <div style={styles.lockedLevelNum}>
                        <span style={styles.lockedPrefix}>УРОВЕНЬ</span>
                        <span style={styles.lockedNumber}>{level.order}</span>
                      </div>
                      <div style={styles.lockedStatus}>
                        <span style={styles.lockedIcon}>◆</span>
                        ЗАБЛОКИРОВАН
                        <span style={styles.lockedIcon}>◆</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Auth Banner for guests */}
              {!isAuthenticated && (
                <div style={styles.authBanner}>
                  <span style={styles.authBannerText}>🔐 Войди, чтобы сохранить прогресс</span>
                  <button className="auth-btn" style={styles.authButton} onClick={onShowAuth}>
                    Войти
                  </button>
                </div>
              )}
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
    overflow: 'hidden',
  },
  levelsPanel: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: 500,
    height: '100%',
    background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.85) 0%, rgba(12, 18, 32, 0.9) 100%)',
    borderRadius: 20,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(100, 150, 255, 0.15)',
    boxShadow: '0 0 60px rgba(0, 100, 255, 0.1), inset 0 0 60px rgba(0, 50, 150, 0.05)',
    boxSizing: 'border-box',
    // iOS smooth scrolling
    WebkitOverflowScrolling: 'touch',
    // Prevent pull-to-refresh and scroll chaining
    overscrollBehavior: 'contain',
    // Enable touch scrolling on mobile
    touchAction: 'pan-y',
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
    gap: 16,
    paddingBottom: 20,  // Extra padding for last item visibility
  },

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE LEVEL CARD - Mobile Game Sci-Fi Style
  // ═══════════════════════════════════════════════════════════════
  levelCard: {
    position: 'relative',
    background: 'linear-gradient(160deg, rgba(15, 25, 45, 0.98) 0%, rgba(25, 40, 70, 0.95) 50%, rgba(20, 35, 60, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '12px 24px 12px 24px',
    overflow: 'visible',
    cursor: 'pointer',
    border: '1px solid rgba(255, 100, 120, 0.35)',
    boxShadow: '0 0 30px rgba(228, 0, 43, 0.2), 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Декоративные уголки - чистые линии без подсветки квадрата
  frameCornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderTop: '3px solid rgba(255, 120, 140, 0.85)',
    borderLeft: '3px solid rgba(255, 120, 140, 0.85)',
    borderTopLeftRadius: 14,
    pointerEvents: 'none',
    zIndex: 20,
  },
  frameCornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderTop: '3px solid rgba(255, 120, 140, 0.85)',
    borderRight: '3px solid rgba(255, 120, 140, 0.85)',
    borderTopRightRadius: 26,
    pointerEvents: 'none',
    zIndex: 20,
  },
  frameCornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderBottom: '3px solid rgba(255, 120, 140, 0.85)',
    borderLeft: '3px solid rgba(255, 120, 140, 0.85)',
    borderBottomLeftRadius: 26,
    pointerEvents: 'none',
    zIndex: 20,
  },
  frameCornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderBottom: '3px solid rgba(255, 120, 140, 0.85)',
    borderRight: '3px solid rgba(255, 120, 140, 0.85)',
    borderBottomRightRadius: 14,
    pointerEvents: 'none',
    zIndex: 20,
  },


  // Голографический блик
  holoShimmer: {
    position: 'absolute',
    top: 0,
    left: '-150%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(100deg, transparent 0%, rgba(255, 255, 255, 0.08) 45%, rgba(255, 200, 220, 0.12) 50%, rgba(255, 255, 255, 0.08) 55%, transparent 100%)',
    animation: 'shimmer 5s ease-in-out infinite',
    zIndex: 5,
    pointerEvents: 'none',
  },

  levelCardContent: {
    padding: '18px',
    position: 'relative',
    zIndex: 2,
  },

  // Header с номером уровня
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  levelPrefix: {
    color: 'rgba(255, 180, 200, 0.7)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 900,
    fontFamily: "'Orbitron', sans-serif",
    textShadow: '0 0 20px rgba(255, 100, 120, 0.6), 0 2px 4px rgba(0,0,0,0.5)',
    lineHeight: 1,
  },
  difficultyPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: '4px 12px 4px 12px',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    border: '1px solid',
    boxShadow: '0 0 15px currentColor',
  },

  // Body с названием и картинкой
  cardBody: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'Rajdhani', sans-serif",
    letterSpacing: 0.5,
    marginBottom: 6,
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  completedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: '#4ADE80',
    background: 'rgba(74, 222, 128, 0.15)',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid rgba(74, 222, 128, 0.3)',
    textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
  },
  checkIcon: {
    fontSize: 12,
  },

  // Картинка с эффектами
  bucketContainer: {
    position: 'relative',
    width: 85,
    height: 85,
    flexShrink: 0,
  },
  bucketGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 100,
    height: 100,
    background: 'radial-gradient(circle, rgba(228, 0, 43, 0.35) 0%, rgba(255, 100, 120, 0.15) 40%, transparent 70%)',
    animation: 'pulse 2.5s ease-in-out infinite',
    zIndex: 1,
  },
  bucketImage: {
    width: 85,
    height: 85,
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 15px rgba(228, 0, 43, 0.4)) drop-shadow(0 5px 15px rgba(0,0,0,0.4))',
    position: 'relative',
    zIndex: 3,
  },
  bucketRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 75,
    height: 75,
    border: '2px solid rgba(255, 100, 120, 0.4)',
    borderRadius: '50%',
    animation: 'ringPulse 3s ease-in-out infinite',
    zIndex: 2,
  },

  // Прогресс бар
  progressSection: {
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: 'rgba(255, 150, 170, 0.7)',
    letterSpacing: 2,
    marginBottom: 5,
  },
  progressBar: {
    position: 'relative',
    height: 28,
    background: 'linear-gradient(180deg, rgba(20, 10, 15, 0.8) 0%, rgba(40, 20, 30, 0.9) 100%)',
    borderRadius: 14,
    border: '1px solid rgba(255, 100, 120, 0.25)',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
  },
  progressFill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    background: 'linear-gradient(90deg, #E4002B 0%, #FF4D6D 60%, #FF8090 100%)',
    borderRadius: 10,
    boxShadow: '0 0 12px rgba(228, 0, 43, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    transition: 'width 0.5s ease-out',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(228, 0, 43, 0.5)',
  },

  // Кнопка играть
  playButton: {
    position: 'relative',
    width: '100%',
    height: 50,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #FF3D5A 0%, #E4002B 40%, #CC0025 100%)',
    borderRadius: '8px 20px 8px 20px',
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.6), 0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  btnIcon: {
    position: 'relative',
    zIndex: 2,
    fontSize: 16,
    color: '#fff',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  btnText: {
    position: 'relative',
    zIndex: 2,
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
    fontFamily: "'Rajdhani', sans-serif",
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
  },

  // ═══════════════════════════════════════════════════════════════
  // LOCKED LEVEL CARD - Game Style
  // ═══════════════════════════════════════════════════════════════
  levelCardLocked: {
    position: 'relative',
    background: 'linear-gradient(160deg, rgba(25, 35, 55, 0.9) 0%, rgba(35, 50, 80, 0.85) 100%)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '12px 24px 12px 24px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    border: '1px solid rgba(80, 120, 180, 0.25)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },

  lockedCornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderTop: '2px solid rgba(100, 140, 200, 0.5)',
    borderLeft: '2px solid rgba(100, 140, 200, 0.5)',
    borderTopLeftRadius: 8,
  },
  lockedCornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderBottom: '2px solid rgba(100, 140, 200, 0.5)',
    borderRight: '2px solid rgba(100, 140, 200, 0.5)',
    borderBottomRightRadius: 8,
  },

  lockedIconContainer: {
    position: 'relative',
    flexShrink: 0,
  },

  lockHex: {
    width: 52,
    height: 52,
    background: 'linear-gradient(135deg, rgba(60, 90, 140, 0.5) 0%, rgba(40, 60, 100, 0.4) 100%)',
    border: '2px solid rgba(100, 150, 220, 0.4)',
    borderRadius: '8px 16px 8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(100, 150, 220, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },

  lockRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 60,
    height: 60,
    border: '1px solid rgba(100, 150, 220, 0.3)',
    borderRadius: '50%',
    animation: 'lockPulse 3s ease-out infinite',
  },

  lockedInfo: {
    flex: 1,
  },

  lockedLevelNum: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  lockedPrefix: {
    color: 'rgba(140, 170, 220, 0.6)',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2,
  },
  lockedNumber: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "'Orbitron', sans-serif",
  },

  lockedStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'rgba(100, 150, 220, 0.7)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
  },
  lockedIcon: {
    fontSize: 6,
    opacity: 0.6,
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTH BANNER
  // ═══════════════════════════════════════════════════════════════
  authBanner: {
    marginTop: 14,
    background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.85) 0%, rgba(30, 45, 70, 0.8) 100%)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 12,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    border: '1px solid rgba(100, 150, 255, 0.2)',
  },
  authBannerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: 500,
  },
  authButton: {
    background: 'linear-gradient(135deg, #E4002B 0%, #CC0025 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
    flexShrink: 0,
    letterSpacing: 1,
    textTransform: 'uppercase',
    boxShadow: '0 4px 16px rgba(228, 0, 43, 0.4)',
    fontFamily: "'Rajdhani', sans-serif",
    transition: 'all 0.2s ease',
  },
};

// Add mobile game sci-fi animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  /* Import fonts */
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap');

  /* Spinner */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Holographic shimmer sweep */
  @keyframes shimmer {
    0% { left: -150%; }
    40%, 100% { left: 150%; }
  }

  /* Pulsing glow for bucket */
  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.15); }
  }

  /* Ring pulse around bucket */
  @keyframes ringPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; border-width: 2px; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; border-width: 3px; }
  }

  /* Floating bucket */
  .bucket-float {
    animation: float 3.5s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-4px) rotate(1deg); }
    50% { transform: translateY(-7px) rotate(0deg); }
    75% { transform: translateY(-4px) rotate(-1deg); }
  }


  /* Progress bar soft glow */
  .progress-fill {
    animation: progressGlow 2s ease-in-out infinite;
  }
  @keyframes progressGlow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    50% {
      box-shadow: 0 0 18px rgba(228, 0, 43, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
  }


  /* Level card hover effects */
  .level-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .level-card:hover {
    box-shadow: 0 0 50px rgba(228, 0, 43, 0.4), 0 15px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  }
  .level-card:hover .bucket-float {
    animation-duration: 2s;
    filter: drop-shadow(0 0 25px rgba(228, 0, 43, 0.6)) drop-shadow(0 5px 15px rgba(0,0,0,0.4));
  }
  .level-card:hover .bucket-ring {
    border-color: rgba(255, 100, 120, 0.7);
    animation-duration: 1.5s;
  }

  /* Play button hover */
  .play-btn:hover .btn-bg {
    background: linear-gradient(135deg, #FF4D6D 0%, #FF1744 40%, #E4002B 100%) !important;
    box-shadow: 0 0 40px rgba(228, 0, 43, 0.8), 0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  }
  .play-btn:active .btn-bg {
    transform: scale(0.98);
  }

  /* Locked card */
  .locked-card {
    transition: all 0.25s ease;
    opacity: 0.75;
  }
  .locked-card:hover {
    opacity: 0.9;
    transform: scale(1.01);
    box-shadow: 0 0 20px rgba(100, 150, 220, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .locked-card:hover .lock-hex {
    border-color: rgba(100, 150, 220, 0.6);
    box-shadow: 0 0 20px rgba(100, 150, 220, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  /* Lock ring pulse */
  @keyframes lockPulse {
    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.5; }
    50% { opacity: 0.3; }
    100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
  }

  /* Auth button */
  .auth-btn {
    clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
    transition: all 0.2s ease;
  }
  .auth-btn:hover {
    transform: scale(1.02);
  }

  /* Hide scrollbar but keep scroll functionality */
  .hide-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;  /* Chrome, Safari, Opera */
  }

  /* Card entrance animation */
  @keyframes levelCardIn {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .level-card-hidden, .locked-card.level-card-hidden {
    opacity: 0;
  }
  .level-card-visible {
    animation: levelCardIn 0.4s ease-out both;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .level-card-visible {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .bucket-float { animation: none !important; }
    .bucket-glow { animation: none !important; }
    .bucket-ring { animation: none !important; }
    .holo-shimmer { animation: none !important; }
    .progress-fill { animation: none !important; }
    .lock-ring { animation: none !important; }
  }

  /* Mobile background for levels screen */
  @media (max-width: 500px) {
    .levels-bg {
      background-image: url('/images/backgroundmob.png') !important;
    }
  }
`;
if (!document.getElementById('level-select-styles')) {
  styleSheet.id = 'level-select-styles';
  document.head.appendChild(styleSheet);
}
