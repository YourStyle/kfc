import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const QuestStartScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logoVisible, setLogoVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    setTimeout(() => setLogoVisible(true), 300);
    setTimeout(() => setContentVisible(true), 700);
    setTimeout(() => setButtonsVisible(true), 1000);
  }, []);

  const handleStartQuest = () => {
    navigate(user ? '/kfc-quest/play' : '/kfc-quest/auth');
  };

  return (
    <div style={styles.container}>
      <div className="quest-start-bg" style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${basePath}images/loginbg.png)`,
      }} />
      <div style={styles.vignette} />

      <div style={styles.scrollWrapper}>
        <div style={styles.contentWrapper}>
          {/* Hero Card */}
          <div className="quest-glass-card" style={{
            ...styles.glassCard,
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          }}>
            <div style={styles.cornerTL} />
            <div style={styles.cornerTR} />
            <div style={styles.cornerBL} />
            <div style={styles.cornerBR} />

            {/* Logo */}
            <div style={{
              ...styles.logoContainer,
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? 'translateY(0)' : 'translateY(-20px)',
            }}>
              <img src={`${basePath}images/logoRost.png`} alt="ROSTIC'S" style={styles.logo} />
              <div className="quest-logo-glow" style={styles.logoGlow} />
            </div>

            {/* Co-branding */}
            <div style={styles.branding}>
              <div style={styles.dividerLine} />
              <span style={styles.brandSub}>Музей Космонавтики</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Title */}
            <div style={{
              ...styles.taglineContainer,
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? 'translateY(0)' : 'translateY(15px)',
            }}>
              <h1 style={styles.title}>Космический Квест</h1>
              <p style={styles.description}>
                Исследуйте музей, сканируйте QR&#8209;коды у экспонатов и зарабатывайте призы!
              </p>
            </div>

            {/* Features */}
            <div className="quest-features" style={{
              ...styles.features,
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? 'translateY(0)' : 'translateY(15px)',
            }}>
              {[
                { icon: '🔍', label: '5 загадок' },
                { icon: '📱', label: 'QR-коды' },
                { icon: '🎁', label: 'Призы' },
              ].map((f, i) => (
                <div key={i} className="quest-feature-item" style={styles.feature}>
                  <div style={styles.featureIcon}><span style={{ fontSize: 26 }}>{f.icon}</span></div>
                  <span style={styles.featureText}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Card */}
          <div className="quest-glass-card" style={{
            ...styles.sectionCard,
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '0.2s',
          }}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>✦</span>
              Как участвовать
            </h2>
            <div style={styles.rulesList}>
              {[
                'Прочитайте загадку на экране — она приведёт вас к нужному экспонату',
                'Найдите QR-код рядом с экспонатом и отсканируйте его',
                'За каждый верный скан — 10 баллов. Можно пропустить без штрафа',
                'Наберите максимум баллов и получите промокод ROSTIC\'S!',
              ].map((rule, i) => (
                <div key={i} style={styles.ruleItem}>
                  <div style={styles.ruleNumber}>{i + 1}</div>
                  <span style={styles.ruleText}>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prize Tiers */}
          <div className="quest-glass-card" style={{
            ...styles.sectionCard,
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
            transitionDelay: '0.3s',
          }}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>✦</span>
              Призы
            </h2>
            <div style={styles.prizesGrid}>
              {[
                { pts: '50', label: 'Золото', reward: 'Скидка 15%', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.12)' },
                { pts: '40+', label: 'Серебро', reward: 'Скидка 10%', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.1)' },
                { pts: '30+', label: 'Бронза', reward: 'Пирожок за 1₽', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.1)' },
              ].map((tier, i) => (
                <div key={i} className="quest-prize-card" style={{ ...styles.prizeCard, background: tier.bg, borderColor: `${tier.color}44` }} data-color={tier.color}>
                  <div>
                    <div style={{ ...styles.prizePoints, color: tier.color }}>{tier.pts}</div>
                    <div style={styles.prizeLabel}>{tier.label}</div>
                  </div>
                  <div style={styles.prizeReward}>{tier.reward}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{
            ...styles.ctaWrapper,
            opacity: buttonsVisible ? 1 : 0,
            transform: buttonsVisible ? 'translateY(0)' : 'translateY(15px)',
          }}>
            <button className="quest-cta-button" style={styles.primaryButton} onClick={handleStartQuest}>
              <span style={styles.buttonIcon}>→</span>
              {user ? 'Продолжить квест' : 'Начать квест'}
            </button>
          </div>

          <div style={{
            ...styles.footer,
            opacity: buttonsVisible ? 1 : 0,
          }}>
            <span style={styles.footerText}>
              {user ? `Добро пожаловать, ${user.username}!` : '© ММК, 2026  |  © Юнирест'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
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
  scrollWrapper: {
    position: 'relative',
    zIndex: 10,
    height: '100%',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px 40px',
    gap: 16,
    minHeight: '100%',
    boxSizing: 'border-box',
  },
  glassCard: {
    position: 'relative',
    background: 'linear-gradient(165deg, rgba(15,20,35,0.88) 0%, rgba(25,35,55,0.92) 50%, rgba(20,28,45,0.9) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '20px 36px 20px 36px',
    padding: '36px 32px 28px',
    width: '100%',
    maxWidth: 480,
    border: '1px solid rgba(255,100,120,0.2)',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(228,0,43,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
    transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)',
    textAlign: 'center',
  },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 32, height: 32, borderTop: '3px solid rgba(255,120,140,0.7)', borderLeft: '3px solid rgba(255,120,140,0.7)', borderTopLeftRadius: 22, pointerEvents: 'none' },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 32, height: 32, borderTop: '3px solid rgba(255,120,140,0.7)', borderRight: '3px solid rgba(255,120,140,0.7)', borderTopRightRadius: 38, pointerEvents: 'none' },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 32, height: 32, borderBottom: '3px solid rgba(255,120,140,0.7)', borderLeft: '3px solid rgba(255,120,140,0.7)', borderBottomLeftRadius: 38, pointerEvents: 'none' },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 32, height: 32, borderBottom: '3px solid rgba(255,120,140,0.7)', borderRight: '3px solid rgba(255,120,140,0.7)', borderBottomRightRadius: 22, pointerEvents: 'none' },
  logoContainer: {
    position: 'relative',
    marginBottom: 12,
    transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
    transitionDelay: '0.1s',
  },
  logo: {
    width: 180,
    height: 'auto',
    display: 'block',
    margin: '0 auto',
    filter: 'drop-shadow(0 0 25px rgba(228,0,43,0.5))',
  },
  logoGlow: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 260, height: 130,
    background: 'radial-gradient(ellipse, rgba(228,0,43,0.35) 0%, transparent 70%)',
    zIndex: -1,
    animation: 'questLogoGlow 3s ease-in-out infinite',
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  brandSub: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,120,140,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: "'Rajdhani', sans-serif",
    whiteSpace: 'nowrap',
  },
  dividerLine: {
    width: 40,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,120,140,0.5), transparent)',
  },
  taglineContainer: {
    marginBottom: 24,
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.2s',
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontFamily: "'Oswald', sans-serif",
    textShadow: '0 0 30px rgba(255,255,255,0.2), 0 2px 10px rgba(0,0,0,0.5)',
    lineHeight: 1.2,
  },
  description: {
    fontSize: 15,
    color: 'rgba(200,215,240,0.85)',
    lineHeight: 1.7,
    margin: '0 auto',
    maxWidth: 340,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.3s',
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 60, height: 60,
    background: 'linear-gradient(145deg, rgba(40,55,85,0.8) 0%, rgba(25,35,55,0.9) 100%)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px 20px 12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,120,140,0.25)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
    transition: 'all 0.3s ease',
  },
  featureText: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(180,200,230,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: "'Rajdhani', sans-serif",
  },

  // Section cards
  sectionCard: {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(12,18,32,0.9) 0%, rgba(18,28,48,0.92) 100%)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '16px 28px 16px 28px',
    padding: '24px',
    width: '100%',
    maxWidth: 480,
    border: '1px solid rgba(255,100,120,0.15)',
    boxShadow: '0 0 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'all 0.6s ease-out',
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: "'Oswald', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    color: 'rgba(255,120,140,0.7)',
    fontSize: 12,
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  ruleItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 52,
  },
  ruleNumber: {
    width: 32, height: 32,
    minWidth: 32,
    background: 'linear-gradient(135deg, #FF4D6D 0%, #E4002B 100%)',
    borderRadius: '6px 10px 6px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Orbitron', sans-serif",
    boxShadow: '0 0 15px rgba(228,0,43,0.3)',
    flexShrink: 0,
    marginTop: 2,
  },
  ruleText: {
    fontSize: 16,
    color: 'rgba(200,215,240,0.85)',
    lineHeight: 1.6,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
    minHeight: 52,
    display: 'flex',
    alignItems: 'center',
  },

  // Prizes
  prizesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  prizeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderRadius: '8px 16px 8px 16px',
    border: '1px solid',
    transition: 'all 0.3s ease',
  },
  prizePoints: {
    fontSize: 22,
    fontWeight: 800,
    fontFamily: "'Orbitron', sans-serif",
    textShadow: '0 0 15px currentColor',
  },
  prizeLabel: {
    fontSize: 11,
    color: 'rgba(140,180,240,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 600,
    marginTop: 2,
  },
  prizeReward: {
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: "'Rajdhani', sans-serif",
    textAlign: 'right',
  },

  // CTA
  ctaWrapper: {
    width: '100%',
    maxWidth: 480,
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.4s',
  },
  primaryButton: {
    width: '100%',
    padding: '18px 28px',
    background: 'linear-gradient(135deg, #FF4D6D 0%, #E4002B 50%, #B8001F 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px 24px 10px 24px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 35px rgba(228,0,43,0.5), 0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    fontFamily: "'Oswald', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: 2,
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIcon: {
    fontSize: 14,
    opacity: 0.9,
  },

  footer: {
    textAlign: 'center',
    transition: 'opacity 0.6s ease-out',
    transitionDelay: '0.5s',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    fontFamily: "'Rajdhani', sans-serif",
  },
};

// Inject keyframes + responsive styles
const questStartStyleId = 'quest-start-styles';
if (!document.getElementById(questStartStyleId)) {
  const sheet = document.createElement('style');
  sheet.id = questStartStyleId;
  sheet.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

    @keyframes questLogoGlow {
      0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%,-50%) scale(1.15); }
    }

    .quest-glass-card::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.03) 45%, rgba(255,200,220,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 100%);
      animation: questCardShimmer 8s ease-in-out infinite;
      border-radius: inherit;
      pointer-events: none;
    }
    @keyframes questCardShimmer {
      0% { left: -100%; }
      40%, 100% { left: 150%; }
    }

    .quest-cta-button {
      position: relative;
      overflow: hidden;
    }
    .quest-cta-button::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    .quest-cta-button:hover::before { left: 100%; }
    .quest-cta-button:hover {
      background: linear-gradient(135deg, #FF6080 0%, #FF1744 50%, #E4002B 100%) !important;
      box-shadow: 0 0 50px rgba(228,0,43,0.7), 0 10px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3) !important;
      transform: translateY(-3px);
    }
    .quest-cta-button:active { transform: translateY(0); }

    .quest-feature-item:hover > div:first-child {
      transform: translateY(-4px) scale(1.05);
      border-color: rgba(255,120,140,0.5);
      box-shadow: 0 12px 35px rgba(0,0,0,0.4), 0 0 25px rgba(228,0,43,0.2), inset 0 1px 0 rgba(255,255,255,0.12);
    }

    /* Prize card hover glow */
    .quest-prize-card {
      transition: all 0.3s ease, box-shadow 0.3s ease;
    }
    .quest-prize-card:hover {
      transform: translateX(4px);
      box-shadow: 0 0 20px rgba(255,255,255,0.08), 0 4px 15px rgba(0,0,0,0.3);
      border-color: rgba(255,255,255,0.25) !important;
    }

    @media (max-width: 500px) {
      .quest-start-bg {
        background-image: url('/images/loginbgmob.png') !important;
      }
      .quest-glass-card {
        padding: 28px 20px 24px !important;
        border-radius: 16px 28px 16px 28px !important;
      }
    }

    @media (min-width: 768px) and (max-width: 1024px) {
      .quest-glass-card {
        max-width: 540px !important;
        padding: 40px 36px 32px !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .quest-glass-card::before { animation: none; }
      .quest-cta-button::before { transition: none; }
      .quest-cta-button:hover { transform: none; }
      .quest-logo-glow { animation: none; }
      .quest-feature-item:hover > div:first-child { transform: none; }
      .quest-prize-card:hover { transform: none; }
    }
  `;
  document.head.appendChild(sheet);
}

export default QuestStartScreen;
