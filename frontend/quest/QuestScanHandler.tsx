import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { QuestScanResult } from '../services/api';

type ScanState = 'loading' | 'success' | 'error' | 'auth_required';

const QuestScanHandler: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('loading');
  const [result, setResult] = useState<QuestScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const rafRef = useRef<number>(0);
  const basePath = import.meta.env.BASE_URL || '/';

  // Animated points counter using requestAnimationFrame
  const animatePoints = useCallback((target: number) => {
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPoints(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setState('auth_required');
      return;
    }
    if (qrToken) validateScan(qrToken);
  }, [qrToken, isAuthenticated, authLoading]);

  const validateScan = async (token: string) => {
    setState('loading');
    const { data, error } = await api.scanQuestQR(token);
    if (error) {
      setState('error');
      setErrorMsg(error);
      return;
    }
    if (data) {
      setResult(data);
      setState('success');
      animatePoints(data.points_earned);
    }
  };

  const handleNext = () => {
    if (result?.quest_completed) {
      navigate('/kfc-quest/result');
    } else {
      navigate('/kfc-quest/play');
    }
  };

  const handleGoToAuth = () => {
    navigate(`/kfc-quest/auth?return=/kfc-quest/scan/${qrToken}`);
  };

  const handleBackToRiddle = () => {
    navigate('/kfc-quest/play');
  };

  // Loading
  if (authLoading || state === 'loading') {
    return (
      <div style={styles.page}>
        <div className="quest-scan-bg" style={{
          ...styles.bg,
          backgroundImage: `url(${basePath}images/loginbg.png)`,
        }} />
        <div style={styles.vignette} />
        <div style={styles.center}>
          <div className="quest-scan-card" style={{ ...styles.card, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)' }}>
            <div style={styles.cornerTL} /><div style={styles.cornerTR} /><div style={styles.cornerBL} /><div style={styles.cornerBR} />
            <div className="quest-scan-spinner" style={styles.spinner} />
            <p style={styles.loadingText}>Проверяем QR-код...</p>
          </div>
        </div>
      </div>
    );
  }

  // Auth required
  if (state === 'auth_required') {
    return (
      <div style={styles.page}>
        <div className="quest-scan-bg" style={{ ...styles.bg, backgroundImage: `url(${basePath}images/loginbg.png)` }} />
        <div style={styles.vignette} />
        <div style={styles.center}>
          <div className="quest-scan-card" style={{ ...styles.card, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)' }}>
            <div style={styles.cornerTL} /><div style={styles.cornerTR} /><div style={styles.cornerBL} /><div style={styles.cornerBR} />
            <div style={styles.iconCircle}>
              <span style={styles.iconEmoji}>🔐</span>
            </div>
            <h2 style={styles.title}>Авторизация</h2>
            <p style={styles.text}>Для участия в квесте необходимо зарегистрироваться или войти в аккаунт.</p>
            <button className="quest-scan-btn" style={styles.btnPrimary} onClick={handleGoToAuth}>
              <span style={styles.btnIcon}>→</span>
              Войти / Зарегистрироваться
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (state === 'success' && result) {
    return (
      <div style={styles.page}>
        <div className="quest-scan-bg" style={{ ...styles.bg, backgroundImage: `url(${basePath}images/loginbg.png)` }} />
        <div style={styles.vignette} />
        <div style={styles.center}>
          <div className="quest-scan-card" style={{ ...styles.card, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)' }}>
            <div style={styles.cornerTL} /><div style={styles.cornerTR} /><div style={styles.cornerBL} /><div style={styles.cornerBR} />

            {/* Success icon — stagger 0s */}
            <div className="quest-scan-success-icon quest-scan-stagger-0" style={{ ...styles.iconCircle, borderColor: 'rgba(74,222,128,0.4)', boxShadow: '0 0 30px rgba(74,222,128,0.2)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Title — stagger 0.1s */}
            <h2 className="quest-scan-stagger-1" style={{ ...styles.title, textShadow: '0 0 20px rgba(74,222,128,0.4)' }}>Всё верно!</h2>

            {/* Points badge — stagger 0.2s */}
            <div className="quest-scan-stagger-2" style={styles.pointsBadge}>
              <span style={styles.pointsPlus}>+</span>
              <span style={styles.pointsValue}>{animatedPoints}</span>
              <span style={styles.pointsLabel}>баллов</span>
            </div>

            {/* Fact — stagger 0.3s */}
            {result.fact_text && (
              <div className="quest-scan-stagger-3" style={styles.factBox}>
                <div style={styles.factHeader}>
                  <span style={styles.factIcon}>✦</span>
                  Интересный факт
                </div>
                <p style={styles.factText}>{result.fact_text}</p>
              </div>
            )}

            {/* Total score */}
            <div className="quest-scan-stagger-3" style={styles.totalScore}>
              Ваш счёт: <span style={styles.totalScoreValue}>{result.total_quest_score}</span> баллов
            </div>

            {/* Button — stagger 0.4s */}
            <button className="quest-scan-btn quest-scan-stagger-4" style={styles.btnPrimary} onClick={handleNext}>
              <span style={styles.btnIcon}>→</span>
              {result.quest_completed ? 'Посмотреть результаты' : 'Следующая загадка'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error
  return (
    <div style={styles.page}>
      <div className="quest-scan-bg" style={{ ...styles.bg, backgroundImage: `url(${basePath}images/loginbg.png)` }} />
      <div style={styles.vignette} />
      <div style={styles.center}>
        <div className="quest-scan-card quest-scan-shake" style={{ ...styles.card, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)' }}>
          <div style={styles.cornerTL} /><div style={styles.cornerTR} /><div style={styles.cornerBL} /><div style={styles.cornerBR} />

          <div style={{ ...styles.iconCircle, borderColor: 'rgba(239,68,68,0.4)', boxShadow: '0 0 30px rgba(239,68,68,0.2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>

          <h2 style={{ ...styles.title, color: '#ff6b6b', textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>Код неверный</h2>
          <p style={styles.text}>
            {errorMsg || 'Найдите экспонат по текущей подсказке и отсканируйте правильный QR-код.'}
          </p>

          <button className="quest-scan-btn" style={styles.btnPrimary} onClick={handleBackToRiddle}>
            <span style={styles.btnIcon}>←</span>
            Вернуться к загадке
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  bg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
  },
  vignette: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  center: {
    position: 'relative',
    zIndex: 10,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    background: 'linear-gradient(165deg, rgba(15,20,35,0.92) 0%, rgba(25,35,55,0.95) 50%, rgba(20,28,45,0.93) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '20px 36px 20px 36px',
    border: '1px solid rgba(255,100,120,0.2)',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(228,0,43,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
    padding: '36px 32px',
    textAlign: 'center',
    transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
  },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 28, height: 28, borderTop: '3px solid rgba(255,120,140,0.7)', borderLeft: '3px solid rgba(255,120,140,0.7)', borderTopLeftRadius: 22, pointerEvents: 'none' },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 28, height: 28, borderTop: '3px solid rgba(255,120,140,0.7)', borderRight: '3px solid rgba(255,120,140,0.7)', borderTopRightRadius: 38, pointerEvents: 'none' },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 28, height: 28, borderBottom: '3px solid rgba(255,120,140,0.7)', borderLeft: '3px solid rgba(255,120,140,0.7)', borderBottomLeftRadius: 38, pointerEvents: 'none' },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 28, height: 28, borderBottom: '3px solid rgba(255,120,140,0.7)', borderRight: '3px solid rgba(255,120,140,0.7)', borderBottomRightRadius: 22, pointerEvents: 'none' },

  iconCircle: {
    width: 88, height: 88,
    borderRadius: '18px 28px 18px 28px',
    border: '2px solid rgba(255,100,120,0.3)',
    background: 'linear-gradient(145deg, rgba(40,55,85,0.6) 0%, rgba(25,35,55,0.8) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    transition: 'all 0.3s ease',
  },
  iconEmoji: { fontSize: 40 },

  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 12px',
    fontFamily: "'Oswald', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadow: '0 0 20px rgba(255,255,255,0.15)',
  },
  text: {
    color: 'rgba(200,215,240,0.8)',
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 24px',
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
  },

  // Points badge
  pointsBadge: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 4,
    background: 'linear-gradient(135deg, rgba(228,0,43,0.15) 0%, rgba(255,77,109,0.1) 100%)',
    border: '1px solid rgba(255,100,120,0.3)',
    borderRadius: '8px 16px 8px 16px',
    padding: '10px 24px',
    margin: '0 0 20px',
  },
  pointsPlus: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: '#FF4D6D',
  },
  pointsValue: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 800,
    fontSize: 28,
    color: '#fff',
    textShadow: '0 0 15px rgba(228,0,43,0.5)',
  },
  pointsLabel: {
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    color: 'rgba(200,215,240,0.7)',
    marginLeft: 2,
  },

  // Fact
  factBox: {
    background: 'linear-gradient(160deg, rgba(20,30,50,0.9) 0%, rgba(30,45,70,0.85) 100%)',
    border: '1px solid rgba(255,100,120,0.15)',
    borderRadius: '8px 16px 8px 16px',
    padding: '16px 20px',
    margin: '0 0 20px',
    textAlign: 'left',
  },
  factHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    color: 'rgba(255,120,140,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  factIcon: {
    fontSize: 10,
  },
  factText: {
    color: 'rgba(200,215,240,0.85)',
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
  },

  totalScore: {
    color: 'rgba(200,215,240,0.7)',
    fontSize: 14,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
    margin: '0 0 24px',
  },
  totalScoreValue: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
  },

  btnPrimary: {
    width: '100%',
    padding: '16px 28px',
    background: 'linear-gradient(135deg, #FF4D6D 0%, #E4002B 50%, #B8001F 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px 24px 10px 24px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 25px rgba(228,0,43,0.4), 0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    fontFamily: "'Oswald', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: 2,
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnIcon: {
    fontSize: 14,
    opacity: 0.9,
  },

  spinner: {
    width: 48, height: 48,
    border: '3px solid rgba(255,100,120,0.15)',
    borderTopColor: '#E4002B',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'questScanSpin 1s linear infinite',
  },
  loadingText: {
    color: 'rgba(200,215,240,0.6)',
    fontSize: 15,
    margin: 0,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
  },
};

// Inject styles
const scanStyleId = 'quest-scan-styles';
if (!document.getElementById(scanStyleId)) {
  const sheet = document.createElement('style');
  sheet.id = scanStyleId;
  sheet.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

    @keyframes questScanSpin {
      to { transform: rotate(360deg); }
    }

    .quest-scan-card::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.03) 45%, rgba(255,200,220,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 100%);
      animation: questScanShimmer 8s ease-in-out infinite;
      border-radius: inherit;
      pointer-events: none;
    }
    @keyframes questScanShimmer {
      0% { left: -100%; }
      40%, 100% { left: 150%; }
    }

    .quest-scan-btn {
      position: relative;
      overflow: hidden;
    }
    .quest-scan-btn::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    .quest-scan-btn:hover::before { left: 100%; }
    .quest-scan-btn:hover {
      background: linear-gradient(135deg, #FF6080 0%, #FF1744 50%, #E4002B 100%) !important;
      box-shadow: 0 0 40px rgba(228,0,43,0.6), 0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3) !important;
      transform: translateY(-2px);
    }
    .quest-scan-btn:active { transform: translateY(0); }

    .quest-scan-success-icon {
      animation: questScanPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes questScanPop {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .quest-scan-shake {
      animation: questScanShake 0.5s ease-in-out;
    }
    @keyframes questScanShake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    /* Staggered entrance for success state elements */
    @keyframes questScanStaggerIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .quest-scan-stagger-0 { animation: questScanStaggerIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0s both; }
    .quest-scan-stagger-1 { animation: questScanStaggerIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
    .quest-scan-stagger-2 { animation: questScanStaggerIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
    .quest-scan-stagger-3 { animation: questScanStaggerIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
    .quest-scan-stagger-4 { animation: questScanStaggerIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both; }

    @media (max-width: 500px) {
      .quest-scan-bg {
        background-image: url('/images/loginbgmob.png') !important;
      }
      .quest-scan-card {
        padding: 28px 20px !important;
        border-radius: 16px 28px 16px 28px !important;
      }
    }

    @media (min-width: 768px) and (max-width: 1024px) {
      .quest-scan-card {
        max-width: 520px !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .quest-scan-card::before,
      .quest-scan-btn::before { animation: none; }
      .quest-scan-success-icon { animation: none; }
      .quest-scan-shake { animation: none; }
      .quest-scan-spinner { animation: none; }
      .quest-scan-stagger-0,
      .quest-scan-stagger-1,
      .quest-scan-stagger-2,
      .quest-scan-stagger-3,
      .quest-scan-stagger-4 { animation: none; opacity: 1; transform: none; }
      @keyframes questScanShimmer { 0%, 100% { left: -100%; } }
    }
  `;
  document.head.appendChild(sheet);
}

export default QuestScanHandler;
