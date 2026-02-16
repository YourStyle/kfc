import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LandingScreenProps {
  onPlay: () => void;
  onLogin: () => void;
}

export function LandingScreen({ onPlay, onLogin }: LandingScreenProps) {
  const { isAuthenticated } = useAuth();
  const [logoVisible, setLogoVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    // Staged animation
    setTimeout(() => setLogoVisible(true), 300);
    setTimeout(() => setContentVisible(true), 700);
    setTimeout(() => setButtonsVisible(true), 1000);
  }, []);

  return (
    <div style={styles.container}>
      {/* Background */}
      <div
        className="landing-bg"
        style={{
          ...styles.backgroundImage,
          backgroundImage: `url(${basePath}images/loginbg.png)`,
        }}
      />

      {/* Subtle vignette overlay */}
      <div style={styles.vignette} />

      {/* Main Content Card with Glassmorphism */}
      <div style={styles.contentWrapper}>
        <div
          className="landing-card"
          style={{
            ...styles.glassCard,
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          }}
        >
          {/* Decorative corner accents */}
          <div style={styles.cornerTL} />
          <div style={styles.cornerTR} />
          <div style={styles.cornerBL} />
          <div style={styles.cornerBR} />

          {/* Logo */}
          <div
            style={{
              ...styles.logoContainer,
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? 'translateY(0)' : 'translateY(-20px)',
            }}
          >
            <img
              src={`${basePath}images/logoRost.png`}
              alt="ROSTIC'S КУХНЯ"
              style={styles.logo}
            />
            <div className="logo-glow" style={styles.logoGlow} />
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <div style={styles.dividerIcon}>✦</div>
            <div style={styles.dividerLine} />
          </div>

          {/* Tagline */}
          <div
            style={{
              ...styles.taglineContainer,
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? 'translateY(0)' : 'translateY(15px)',
            }}
          >
            <h2 style={styles.tagline}>Космически вкусная игра</h2>
            <p style={styles.description}>
              Собирай комбо из любимых блюд, проходи уровни
              и соревнуйся за призы в галактическом рейтинге!
            </p>
          </div>

          {/* Features */}
          <div
            className="features-row"
            style={{
              ...styles.features,
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? 'translateY(0)' : 'translateY(15px)',
            }}
          >
            <div className="feature-item" style={styles.feature}>
              <div className="feature-icon-float" style={{ ...styles.featureIcon, animationDelay: '0s' }}>
                <img src={`${basePath}images/drumstick.png`} alt="" style={styles.featureImg} />
              </div>
              <span style={styles.featureText}>Уровни</span>
            </div>
            <div className="feature-item" style={styles.feature}>
              <div className="feature-icon-float" style={{ ...styles.featureIcon, animationDelay: '1s' }}>
                <img src={`${basePath}images/bucket.png`} alt="" style={styles.featureImg} />
              </div>
              <span style={styles.featureText}>Рейтинг</span>
            </div>
            <div className="feature-item" style={styles.feature}>
              <div className="feature-icon-float" style={{ ...styles.featureIcon, animationDelay: '2s' }}>
                <img src={`${basePath}images/burger.png`} alt="" style={styles.featureImg} />
              </div>
              <span style={styles.featureText}>Призы</span>
            </div>
          </div>

          {/* CTA Button */}
          <div
            style={{
              ...styles.actions,
              opacity: buttonsVisible ? 1 : 0,
              transform: buttonsVisible ? 'translateY(0)' : 'translateY(15px)',
            }}
          >
            {isAuthenticated ? (
              <button className="cta-button" style={styles.primaryButton} onClick={onPlay}>
                <span style={styles.buttonIcon}>▶</span>
                Продолжить игру
              </button>
            ) : (
              <button className="cta-button" style={styles.primaryButton} onClick={onLogin}>
                <span style={styles.buttonIcon}>→</span>
                Войти / Регистрация
              </button>
            )}
          </div>
        </div>

        {/* Footer outside card */}
        <div
          style={{
            ...styles.footer,
            opacity: buttonsVisible ? 1 : 0,
          }}
        >
          <span style={styles.footerText}>© 2026 ROSTIC'S. Все права защищены</span>
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
    overscrollBehavior: 'none',
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
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 10,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  },
  glassCard: {
    position: 'relative',
    background: 'linear-gradient(165deg, rgba(21, 21, 21, 0.92) 0%, rgba(30, 30, 30, 0.95) 50%, rgba(21, 21, 21, 0.93) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: `
      0 25px 60px rgba(0, 0, 0, 0.5),
      0 0 80px rgba(228, 0, 43, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2)
    `,
    transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
    textAlign: 'center',
    overflow: 'hidden',
  },
  // Corner accents
  cornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 32,
    height: 32,
    borderTop: '3px solid rgba(244, 166, 152, 0.7)',
    borderLeft: '3px solid rgba(244, 166, 152, 0.7)',
    borderTopLeftRadius: 20,
    pointerEvents: 'none',
  },
  cornerTR: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 32,
    height: 32,
    borderTop: '3px solid rgba(244, 166, 152, 0.7)',
    borderRight: '3px solid rgba(244, 166, 152, 0.7)',
    borderTopRightRadius: 20,
    pointerEvents: 'none',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -1,
    left: -1,
    width: 32,
    height: 32,
    borderBottom: '3px solid rgba(244, 166, 152, 0.7)',
    borderLeft: '3px solid rgba(244, 166, 152, 0.7)',
    borderBottomLeftRadius: 20,
    pointerEvents: 'none',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 32,
    height: 32,
    borderBottom: '3px solid rgba(244, 166, 152, 0.7)',
    borderRight: '3px solid rgba(244, 166, 152, 0.7)',
    borderBottomRightRadius: 20,
    pointerEvents: 'none',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transitionDelay: '0.1s',
  },
  logo: {
    width: 200,
    height: 'auto',
    display: 'block',
    margin: '0 auto',
    filter: 'drop-shadow(0 0 25px rgba(228, 0, 43, 0.5))',
  },
  logoGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 280,
    height: 140,
    background: 'radial-gradient(ellipse, rgba(228, 0, 43, 0.35) 0%, transparent 70%)',
    zIndex: -1,
    animation: 'logoGlowPulse 3s ease-in-out infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    width: 50,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(244, 166, 152, 0.5), transparent)',
  },
  dividerIcon: {
    color: 'rgba(244, 166, 152, 0.7)',
    fontSize: 10,
    animation: 'starTwinkle 2s ease-in-out infinite',
  },
  taglineContainer: {
    marginBottom: 24,
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.2s',
  },
  tagline: {
    fontSize: 24,
    fontWeight: 900,
    color: '#fff',
    margin: '0 0 14px 0',
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 30px rgba(255, 255, 255, 0.2), 0 2px 10px rgba(0, 0, 0, 0.5)',
    lineHeight: 1.2,
  },
  description: {
    fontSize: 15,
    color: 'rgba(244, 166, 152, 0.85)',
    lineHeight: 1.7,
    margin: '0 auto',
    maxWidth: 300,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 500,
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 28,
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.3s',
  },
  feature: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 64,
    height: 64,
    background: 'linear-gradient(145deg, rgba(40, 40, 40, 0.8) 0%, rgba(21, 21, 21, 0.9) 100%)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s ease',
  },
  featureImg: {
    width: 38,
    height: 38,
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
  },
  featureText: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(244, 166, 152, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  actions: {
    width: '100%',
    transition: 'all 0.6s ease-out',
    transitionDelay: '0.4s',
  },
  primaryButton: {
    width: '100%',
    padding: '18px 28px',
    background: '#ED1C29',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 35px rgba(228, 0, 43, 0.5), 0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: 0,
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
    marginTop: 24,
    textAlign: 'center',
    transition: 'opacity 0.6s ease-out',
    transitionDelay: '0.5s',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
};

// Add keyframes and hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  /* @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap'); */

  @keyframes logoGlowPulse {
    0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  }

  @keyframes starTwinkle {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.3); }
  }

  /* Card shimmer effect */
  .landing-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      100deg,
      transparent 0%,
      rgba(255, 255, 255, 0.03) 45%,
      rgba(255, 200, 220, 0.05) 50%,
      rgba(255, 255, 255, 0.03) 55%,
      transparent 100%
    );
    animation: cardShimmer 8s ease-in-out infinite;
    border-radius: inherit;
    pointer-events: none;
  }

  @keyframes cardShimmer {
    0% { left: -100%; }
    40%, 100% { left: 150%; }
  }

  /* Feature icon float animation */
  @keyframes featureIconFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .feature-icon-float {
    animation: featureIconFloat 3s ease-in-out infinite;
  }

  /* Feature hover */
  .feature-item:hover > div:first-child {
    transform: translateY(-4px) scale(1.05);
    border-color: rgba(237, 28, 41, 0.4);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(228, 0, 43, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  /* CTA Button effects */
  .cta-button {
    position: relative;
    overflow: hidden;
  }
  .cta-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  .cta-button:hover::before {
    left: 100%;
  }
  .cta-button:hover {
    background: #ED1C29 !important;
    box-shadow: 0 0 50px rgba(228, 0, 43, 0.7), 0 10px 35px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
    transform: translateY(-3px);
  }
  .cta-button:active {
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .landing-card::before { animation: none; }
    .logo-glow { animation: none; }
    .cta-button::before { transition: none; }
    .cta-button:hover { transform: none; }
    .feature-item:hover > div:first-child { transform: none; }
    .feature-icon-float { animation: none; }
  }

  /* Mobile background */
  @media (max-width: 500px) {
    .landing-bg {
      background-image: url('/images/loginbgmob.png') !important;
    }
    .landing-card {
      padding: 32px 24px !important;
      border-radius: 16px !important;
    }
  }
`;
if (!document.getElementById('landing-styles')) {
  styleSheet.id = 'landing-styles';
  document.head.appendChild(styleSheet);
}
