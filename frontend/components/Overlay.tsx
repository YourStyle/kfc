
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { TUTORIAL_STEPS, GAME_URL, FIGURINE_INFO } from '../constants';

interface LevelTargets {
  collect?: Record<string, number>;
  combos?: Record<string, number>;
  min_score?: number;
}

interface OverlayProps {
  score: number;
  moves: number;
  collected: Record<string, number>;
  isGameOver: boolean;
  onReset: () => void;
  basketShaking?: boolean;
  levelName?: string;
  targets?: LevelTargets;
  onBackToMenu?: () => void;
  earnedStars?: number;
  onNextLevel?: () => void;
  hasNextLevel?: boolean;
  completionPercent?: number;
}

const ITEM_NAMES: Record<string, string> = {
  drumstick: 'Ножки',
  wing: 'Крылышки',
  burger: 'Бургеры',
  fries: 'Картофель фри',
  bucket: 'Баскеты',
  ice_cream: 'Мороженое',
  donut: 'Донаты',
  cappuccino: 'Капучино',
  belka: 'Белка',
  strelka: 'Стрелка',
  sputnik: 'Спутник',
  vostok: 'Восток',
  spaceship: 'Ракета',
};

const TUTORIAL_COMPLETED_KEY = 'rostics_tutorial_completed';

const Overlay: React.FC<OverlayProps> = ({ score, moves, collected, isGameOver, onReset, basketShaking = false, levelName, targets, onBackToMenu, earnedStars = 0, onNextLevel, hasNextLevel = false, completionPercent = 0 }) => {
  // Общее количество собранных предметов
  const totalCollected = Object.values(collected).reduce((sum, val) => sum + val, 0);
  const [tutorialStep, setTutorialStep] = useState(0);
  // Показываем туториал только если пользователь его ещё не прошёл
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem(TUTORIAL_COMPLETED_KEY);
  });
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Animated score counter for HUD
  const [displayScore, setDisplayScore] = useState(score);
  const prevScoreRef = useRef(score);
  const rafRef = useRef(0);

  // Animated score counter for game over
  const [displayFinalScore, setDisplayFinalScore] = useState(0);
  const finalRafRef = useRef(0);

  const isShaking = basketShaking;

  // Animate HUD score changes
  useEffect(() => {
    const from = prevScoreRef.current;
    const to = score;
    if (from === to) return;

    const start = performance.now();
    const duration = 600;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevScoreRef.current = to;
        rafRef.current = 0;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [score]);

  // Animate game over final score
  useEffect(() => {
    if (!isGameOver) {
      setDisplayFinalScore(0);
      return;
    }
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayFinalScore(Math.round(score * eased));
      if (t < 1) {
        finalRafRef.current = requestAnimationFrame(tick);
      } else {
        finalRafRef.current = 0;
      }
    };
    cancelAnimationFrame(finalRafRef.current);
    finalRafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(finalRafRef.current);
      finalRafRef.current = 0;
    };
  }, [isGameOver, score]);

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      // Сохраняем что туториал пройден
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      setShowTutorial(false);
    }
  };

  const prevStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#0a0f1e',
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'rostics-score.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: "Мой результат в ROSTIC'S Kitchen!",
              text: `Я набрал ${score.toLocaleString()} очков и собрал ${totalCollected} предметов! 🍗`,
              files: [file],
            });
          } catch (err) {
            // User cancelled sharing
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rostics-score.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div style={styles.tutorialOverlay}>
          <div style={styles.tutorialModal}>
            <div style={styles.tutorialContent}>
              <div style={styles.tutorialIcon}>{TUTORIAL_STEPS[tutorialStep].icon}</div>
              <h2 style={styles.tutorialTitle}>
                {TUTORIAL_STEPS[tutorialStep].title}
              </h2>
              <p style={styles.tutorialText}>
                {TUTORIAL_STEPS[tutorialStep].text}
              </p>
            </div>

            {/* Pagination */}
            <div style={styles.pagination}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.paginationDot,
                    ...(i === tutorialStep ? styles.paginationDotActive : {}),
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div style={styles.tutorialButtons}>
              {tutorialStep > 0 && (
                <button onClick={prevStep} style={styles.tutorialBackButton}>
                  ←
                </button>
              )}
              <button onClick={nextStep} style={styles.tutorialNextButton}>
                {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'ПОГНАЛИ!' : 'ДАЛЕЕ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section: Branding */}
      <div style={styles.topSection}>
        {onBackToMenu && (
          <button onClick={onBackToMenu} style={styles.backButton}>
            ←
          </button>
        )}
        <div style={styles.logosRow}>
          <img src={`${import.meta.env.BASE_URL}images/logoRostics.png`} alt="ROSTIC'S" style={styles.logoRostics} />
          <div style={styles.logoDivider} />
          <img src={`${import.meta.env.BASE_URL}images/logoMk.png`} alt="Музей Космонавтики" style={styles.logoMk} />
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={{
          ...styles.statCard,
          ...(isShaking ? styles.statCardShaking : {}),
        }}>
          <img
            src={`${import.meta.env.BASE_URL}images/sputnik.png`}
            alt="Собрано"
            style={{
              ...styles.bucketImage,
              ...(isShaking ? { animation: 'shake 0.5s ease-in-out' } : {}),
            }}
          />
          <div style={styles.statContent}>
            <span style={styles.statLabel}>Собрано</span>
            <span style={{
              ...styles.statValue,
              ...(isShaking ? styles.statValueHighlight : {}),
            }}>
              {totalCollected}
            </span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statContent}>
            <span style={styles.statLabel}>Ходы</span>
            <span style={{
              ...styles.statValue,
              ...(moves <= 5 ? styles.statValueWarning : {}),
            }}>
              {moves}
            </span>
          </div>
        </div>

        <div style={styles.statCardHighlight}>
          <div style={styles.statContent}>
            <span style={styles.statLabelLight}>Счёт</span>
            <span style={styles.statValueLight}>{displayScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Targets Display */}
      {targets && (
        <div style={styles.targetsContainer}>
          <div style={styles.targetsInner}>
            {targets.collect && Object.entries(targets.collect).map(([item, required]) => {
              const current = collected[item] || 0;
              const completed = current >= required;
              return (
                <div
                  key={item}
                  style={{
                    ...styles.targetPill,
                    ...(completed ? styles.targetPillCompleted : {}),
                  }}
                >
                  {completed ? '✓' : ''} {ITEM_NAMES[item] || item}: {current}/{required}
                </div>
              );
            })}
            {targets.min_score && (
              <div style={{
                ...styles.targetPill,
                ...(score >= targets.min_score ? styles.targetPillCompleted : {}),
              }}>
                {score >= targets.min_score ? '✓' : ''} Очки: {score}/{targets.min_score}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div style={styles.gameOverOverlay}>
          <div ref={shareCardRef} style={styles.gameOverModal}>
            {/* Circular Progress */}
            <div className="game-over-stagger-0" style={styles.progressCircleContainer}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={earnedStars > 0 ? '#ED1C29' : '#F4A698'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${completionPercent * 3.27} 327`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
              <div style={styles.progressCircleText}>
                <span style={styles.progressPercent}>{completionPercent}%</span>
              </div>
            </div>

            <h2 className="game-over-stagger-1" style={styles.gameOverTitle}>
              {earnedStars > 0 ? 'УРОВЕНЬ ПРОЙДЕН!' : 'СМЕНА ОКОНЧЕНА!'}
            </h2>
            <p className="game-over-stagger-2" style={styles.gameOverSubtitle}>
              {earnedStars >= 3 ? 'Превосходно!' : earnedStars >= 2 ? 'Отличная работа!' : earnedStars >= 1 ? 'Хороший результат!' : completionPercent >= 75 ? 'Почти получилось!' : completionPercent >= 50 ? 'Неплохо, но можно лучше!' : 'Попробуй ещё раз!'}
            </p>

            <div className="game-over-stagger-3" style={styles.resultsGrid}>
              <div style={styles.resultCard}>
                <div style={styles.resultLabel}>Итоговый счёт</div>
                <div style={styles.resultValue}>{displayFinalScore.toLocaleString()}</div>
              </div>
              <div style={styles.resultCardHighlight}>
                <div style={styles.resultLabelHighlight}>Собрано</div>
                <div style={styles.resultValueHighlight}>{totalCollected} 🍗</div>
              </div>
            </div>

            <div className="game-over-stagger-4" style={styles.gameOverLogos}>
              <img src={`${import.meta.env.BASE_URL}images/logoRostics.png`} alt="ROSTIC'S" style={styles.gameOverLogoRostics} />
              <div style={styles.gameOverLogoDivider} />
              <img src={`${import.meta.env.BASE_URL}images/logoMk.png`} alt="Музей Космонавтики" style={styles.gameOverLogoMk} />
            </div>
            <div style={styles.gameUrl}>
              {GAME_URL}
            </div>

            <div className="game-over-stagger-5" style={styles.gameOverButtons}>
              {/* Ряд 1: Назад + Следующий уровень */}
              <div style={styles.buttonRow}>
                {onBackToMenu && (
                  <button onClick={onBackToMenu} style={styles.menuButton}>
                    ← Меню
                  </button>
                )}
                {earnedStars > 0 && hasNextLevel && onNextLevel ? (
                  <button onClick={onNextLevel} style={styles.nextLevelButton}>
                    Далее →
                  </button>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </div>

              {/* Ряд 2: Поделиться + Заново */}
              <div style={styles.buttonRow}>
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  style={{
                    ...styles.shareButton,
                    ...(isSharing ? { opacity: 0.5 } : {}),
                  }}
                >
                  {isSharing ? '...' : 'Поделиться'}
                </button>
                <button onClick={onReset} style={styles.retryButton}>
                  Заново
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.bottomTagline}>
        <div style={styles.taglineText}>
          © ММК, 2026 &nbsp;|&nbsp; © Юнирест
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    userSelect: 'none',
  },

  // Tutorial styles
  tutorialOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 24,
  },
  tutorialModal: {
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)',
    border: '2px solid rgba(228, 0, 43, 0.5)',
    borderRadius: 32,
    padding: 32,
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 0 40px rgba(228, 0, 43, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 480,
    fontFamily: "'RosticsCeraPro', 'Verdana', sans-serif",
  },
  tutorialContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  tutorialIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  tutorialTitle: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    color: '#fff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0,
    margin: 0,
  },
  tutorialText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.5,
    minHeight: 72,
    margin: 0,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  paginationDot: {
    height: 8,
    width: 32,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s',
  },
  paginationDotActive: {
    width: 48,
    backgroundColor: '#ED1C29',
    boxShadow: '0 0 10px rgba(228, 0, 43, 0.5)',
  },
  tutorialButtons: {
    display: 'flex',
    gap: 12,
  },
  tutorialBackButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '16px 24px',
    borderRadius: 16,
    fontSize: 24,
    cursor: 'pointer',
  },
  tutorialNextButton: {
    flex: 1,
    background: '#ED1C29',
    border: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '16px 32px',
    borderRadius: 16,
    fontSize: 20,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3)',
  },

  // Top section
  topSection: {
    marginTop: 4,
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    pointerEvents: 'auto',
    width: 40,
    height: 40,
    background: 'rgba(21, 21, 21, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 900,
    fontSize: 20,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  logosRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(21, 21, 21, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 20,
    padding: '6px 16px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  logoRostics: {
    height: 28,
    width: 'auto',
  },
  logoDivider: {
    width: 1,
    height: 24,
    background: 'rgba(255, 255, 255, 0.2)',
  },
  logoMk: {
    height: 28,
    width: 'auto',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 6,
    padding: 3,
  },

  // Stats bar
  statsBar: {
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
    pointerEvents: 'auto',
  },
  statCard: {
    flex: 1,
    background: 'rgba(21, 21, 21, 0.8)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s',
  },
  statCardShaking: {
    transform: 'scale(1.05)',
  },
  statCardHighlight: {
    flex: 1,
    background: 'rgba(237, 28, 41, 0.8)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: 16,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  bucketImage: {
    width: 40,
    height: 40,
    objectFit: 'contain',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1,
  },
  statLabelLight: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    marginTop: 2,
    transition: 'all 0.2s',
  },
  statValueLight: {
    fontSize: 20,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    marginTop: 2,
  },
  statValueHighlight: {
    transform: 'scale(1.25)',
    color: '#ED1C29',
  },
  statValueWarning: {
    color: '#ED1C29',
    animation: 'movesWarning 0.8s ease-in-out infinite',
  },

  // Targets
  targetsContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 4,
    background: 'rgba(21, 21, 21, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: '4px 6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  targetsInner: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    fontSize: 11,
  },
  targetPill: {
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 700,
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  targetPillCompleted: {
    background: 'rgba(237, 28, 41, 0.15)',
    color: '#F4A698',
    border: '1px solid rgba(237, 28, 41, 0.3)',
    boxShadow: '0 0 10px rgba(237, 28, 41, 0.15)',
  },

  // Game Over
  gameOverOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 24,
  },
  gameOverModal: {
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)',
    border: '2px solid rgba(228, 0, 43, 0.5)',
    borderRadius: 32,
    padding: 32,
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 0 40px rgba(228, 0, 43, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
    fontFamily: "'RosticsCeraPro', 'Verdana', sans-serif",
  },
  gameOverEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  progressCircleContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    margin: '0 auto 16px',
  },
  progressCircleText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 32,
    fontWeight: 900,
    color: '#fff',
  },
  starsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  star: {
    fontSize: 48,
    transition: 'all 0.3s',
  },
  starEarned: {
    color: '#fbbf24',
    textShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
    animation: 'bounce 1s infinite',
  },
  starEmpty: {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    color: '#fff',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0,
    margin: '0 0 8px 0',
  },
  gameOverSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 700,
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    margin: '0 0 24px 0',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 24,
  },
  resultCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardHighlight: {
    background: 'rgba(228, 0, 43, 0.15)',
    borderRadius: 20,
    padding: 16,
    border: '1px solid rgba(228, 0, 43, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(228, 0, 43, 0.1)',
  },
  resultLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 900,
    lineHeight: 1,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    marginTop: 4,
  },
  resultLabelHighlight: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#ED1C29',
    fontWeight: 900,
    lineHeight: 1,
  },
  resultValueHighlight: {
    fontSize: 24,
    fontWeight: 900,
    color: '#ED1C29',
    lineHeight: 1,
    marginTop: 4,
  },
  gameOverLogos: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  gameOverLogoRostics: {
    height: 32,
    width: 'auto',
  },
  gameOverLogoDivider: {
    width: 1,
    height: 28,
    background: 'rgba(255, 255, 255, 0.2)',
  },
  gameOverLogoMk: {
    height: 32,
    width: 'auto',
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 4,
  },
  gameUrl: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 24,
    wordBreak: 'break-all',
  },
  gameOverButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    width: '100%',
  },
  nextLevelButton: {
    flex: 1,
    background: '#ED1C29',
    border: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '14px 20px',
    borderRadius: 16,
    fontSize: 16,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
    boxShadow: '0 0 20px rgba(237, 28, 41, 0.3), 0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  menuButton: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '14px 20px',
    borderRadius: 16,
    fontSize: 14,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  shareButton: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(228, 0, 43, 0.5)',
    color: '#ED1C29',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '14px 20px',
    borderRadius: 16,
    fontSize: 14,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  retryButton: {
    flex: 1,
    background: '#ED1C29',
    border: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '14px 20px',
    borderRadius: 16,
    fontSize: 16,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.3), 0 4px 15px rgba(0, 0, 0, 0.3)',
  },

  // Bottom tagline
  bottomTagline: {
    marginTop: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  taglineText: {
    background: 'rgba(21, 21, 21, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '6px 20px',
    borderRadius: 20,
    border: '1px solid rgba(228, 0, 43, 0.3)',
    color: '#ED1C29',
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

// Add animations
const overlayStyleSheet = document.createElement('style');
overlayStyleSheet.textContent = `
  @keyframes movesWarning {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px) rotate(-3deg); }
    40% { transform: translateX(4px) rotate(3deg); }
    60% { transform: translateX(-3px) rotate(-2deg); }
    80% { transform: translateX(3px) rotate(2deg); }
  }

  @keyframes gameOverStaggerIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .game-over-stagger-0 { animation: gameOverStaggerIn 0.4s ease-out 0.1s both; }
  .game-over-stagger-1 { animation: gameOverStaggerIn 0.4s ease-out 0.2s both; }
  .game-over-stagger-2 { animation: gameOverStaggerIn 0.4s ease-out 0.3s both; }
  .game-over-stagger-3 { animation: gameOverStaggerIn 0.4s ease-out 0.4s both; }
  .game-over-stagger-4 { animation: gameOverStaggerIn 0.4s ease-out 0.5s both; }
  .game-over-stagger-5 { animation: gameOverStaggerIn 0.4s ease-out 0.6s both; }

  @media (prefers-reduced-motion: reduce) {
    .game-over-stagger-0, .game-over-stagger-1, .game-over-stagger-2,
    .game-over-stagger-3, .game-over-stagger-4, .game-over-stagger-5 {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;
if (!document.getElementById('overlay-styles')) {
  overlayStyleSheet.id = 'overlay-styles';
  document.head.appendChild(overlayStyleSheet);
}

// Fullscreen modal for figurine first appearance
export const FigurineModal: React.FC<{ type: string; onDismiss: () => void }> = ({ type, onDismiss }) => {
  const info = FIGURINE_INFO[type];
  if (!info) return null;

  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <div style={figurineStyles.overlay} onClick={onDismiss}>
      <div className="figurine-modal-entrance" style={figurineStyles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Декоративные звёзды */}
        <div className="figurine-star figurine-star-1" style={figurineStyles.star}>✦</div>
        <div className="figurine-star figurine-star-2" style={figurineStyles.star}>✦</div>
        <div className="figurine-star figurine-star-3" style={figurineStyles.star}>✧</div>
        <div className="figurine-star figurine-star-4" style={figurineStyles.star}>✦</div>

        {/* Изображение фигурки */}
        <div className="figurine-image-float" style={figurineStyles.imageContainer}>
          <div className="figurine-glow" style={figurineStyles.imageGlow} />
          <img
            src={`${basePath}images/${type}.png`}
            alt={info.name}
            style={figurineStyles.image}
          />
        </div>

        {/* Название */}
        <h2 className="figurine-title-entrance" style={figurineStyles.title}>
          {info.name}
        </h2>

        {/* Описание */}
        <p className="figurine-desc-entrance" style={figurineStyles.description}>
          {info.description}
        </p>

        {/* Подсказка механики */}
        <p className="figurine-hint-entrance" style={figurineStyles.hint}>
          Собирай ряды рядом с фигуркой, чтобы получить бонус!
        </p>

        {/* Кнопка */}
        <button className="figurine-btn-entrance" onClick={onDismiss} style={figurineStyles.button}>
          КРУТО!
        </button>
      </div>
    </div>
  );
};

const figurineStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    padding: 24,
    animation: 'figurineOverlayIn 0.4s ease-out both',
  },
  modal: {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)',
    border: '2px solid rgba(237, 28, 41, 0.5)',
    borderRadius: 32,
    padding: '40px 32px 32px',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 0 60px rgba(237, 28, 41, 0.15), 0 0 120px rgba(237, 28, 41, 0.05), 0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    fontFamily: "'RosticsCeraPro', 'Verdana', sans-serif",
  },
  star: {
    position: 'absolute',
    color: 'rgba(244, 166, 152, 0.6)',
    fontSize: 18,
    pointerEvents: 'none',
  },
  imageContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(237, 28, 41, 0.25) 0%, rgba(237, 28, 41, 0.05) 60%, transparent 80%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  image: {
    width: 120,
    height: 120,
    objectFit: 'contain',
    position: 'relative',
    zIndex: 1,
    filter: 'drop-shadow(0 4px 20px rgba(237, 28, 41, 0.3))',
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    color: '#ED1C29',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0,
    margin: '0 0 12px 0',
    textShadow: '0 0 20px rgba(237, 28, 41, 0.3)',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  hint: {
    color: 'rgba(244, 166, 152, 0.6)',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    margin: '0 0 24px 0',
  },
  button: {
    width: '100%',
    background: '#ED1C29',
    border: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', 'RosticsCeraPro', 'Verdana', sans-serif",
    fontWeight: 900,
    padding: '16px 32px',
    borderRadius: 16,
    fontSize: 20,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 0,
    boxShadow: '0 0 30px rgba(237, 28, 41, 0.3), 0 4px 15px rgba(0, 0, 0, 0.3)',
  },
};

// Figurine modal animations
const figurineStyleSheet = document.createElement('style');
figurineStyleSheet.textContent = `
  @keyframes figurineOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .figurine-modal-entrance {
    animation: figurineModalIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
  }
  @keyframes figurineModalIn {
    from { opacity: 0; transform: scale(0.6) translateY(30px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .figurine-image-float {
    animation: figurineFloat 3s ease-in-out infinite;
  }
  @keyframes figurineFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .figurine-glow {
    animation: figurineGlowPulse 2s ease-in-out infinite;
  }
  @keyframes figurineGlowPulse {
    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  }

  .figurine-title-entrance {
    animation: figurineSlideUp 0.4s ease-out 0.35s both;
  }
  .figurine-desc-entrance {
    animation: figurineSlideUp 0.4s ease-out 0.45s both;
  }
  .figurine-hint-entrance {
    animation: figurineSlideUp 0.4s ease-out 0.55s both;
  }
  .figurine-btn-entrance {
    animation: figurineSlideUp 0.4s ease-out 0.65s both;
  }
  @keyframes figurineSlideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .figurine-star-1 { top: 20px; left: 25px; animation: figurineStarTwinkle 2s ease-in-out 0.3s infinite; }
  .figurine-star-2 { top: 15px; right: 30px; animation: figurineStarTwinkle 2.5s ease-in-out 0.8s infinite; font-size: 14px !important; }
  .figurine-star-3 { bottom: 80px; left: 20px; animation: figurineStarTwinkle 1.8s ease-in-out 0.1s infinite; font-size: 22px !important; }
  .figurine-star-4 { bottom: 120px; right: 25px; animation: figurineStarTwinkle 2.2s ease-in-out 0.5s infinite; font-size: 12px !important; }

  @keyframes figurineStarTwinkle {
    0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
    50% { opacity: 1; transform: scale(1.2) rotate(20deg); }
  }

  .figurine-btn-entrance:active {
    transform: scale(0.95) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .figurine-modal-entrance,
    .figurine-image-float,
    .figurine-glow,
    .figurine-title-entrance,
    .figurine-desc-entrance,
    .figurine-hint-entrance,
    .figurine-btn-entrance,
    .figurine-star-1,
    .figurine-star-2,
    .figurine-star-3,
    .figurine-star-4 {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;
if (!document.getElementById('figurine-modal-styles')) {
  figurineStyleSheet.id = 'figurine-modal-styles';
  document.head.appendChild(figurineStyleSheet);
}

export default Overlay;
