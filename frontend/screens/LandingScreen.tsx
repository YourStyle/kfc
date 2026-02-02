import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LandingScreenProps {
  onPlay: () => void;
  onLogin: () => void;
}

export function LandingScreen({ onPlay, onLogin }: LandingScreenProps) {
  const { isAuthenticated, user } = useAuth();
  const [animatedItems, setAnimatedItems] = useState<number[]>([]);
  const basePath = import.meta.env.BASE_URL || '/';

  useEffect(() => {
    // Animate items appearing
    const items = [0, 1, 2, 3, 4];
    items.forEach((i) => {
      setTimeout(() => {
        setAnimatedItems((prev) => [...prev, i]);
      }, 200 + i * 100);
    });
  }, []);

  const gameItems = [
    { name: 'chicken', label: 'Курочка' },
    { name: 'burger', label: 'Бургер' },
    { name: 'fries', label: 'Картошка' },
    { name: 'cola', label: 'Кола' },
    { name: 'bucket', label: 'Баскет' },
  ];

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.logoContainer}>
          <div style={styles.logoText}>ROSTIC'S</div>
          <div style={styles.logoSubtext}>KITCHEN</div>
        </div>

        {/* Floating game items */}
        <div style={styles.itemsContainer}>
          {gameItems.map((item, index) => (
            <div
              key={item.name}
              style={{
                ...styles.floatingItem,
                transform: animatedItems.includes(index)
                  ? 'translateY(0) scale(1)'
                  : 'translateY(50px) scale(0)',
                opacity: animatedItems.includes(index) ? 1 : 0,
                animationDelay: `${index * 0.2}s`,
              }}
            >
              <img
                src={`${basePath}images/${item.name}.png`}
                alt={item.label}
                style={styles.itemImage}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Description Section */}
      <div style={styles.content}>
        <h2 style={styles.title}>Собирай вкусные комбо!</h2>
        <p style={styles.description}>
          Соединяй 3 и более одинаковых предмета, собирай очки и соревнуйся с
          друзьями в рейтинге. Чем больше комбо — тем больше баллов!
        </p>

        {/* Features */}
        <div style={styles.features}>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <img src={`${basePath}images/chicken.png`} alt="" style={styles.featureImg} />
            </div>
            <div style={styles.featureText}>
              <strong>Уровни</strong>
              <span>Проходи уровни с разными заданиями</span>
            </div>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <img src={`${basePath}images/bucket.png`} alt="" style={styles.featureImg} />
            </div>
            <div style={styles.featureText}>
              <strong>Рейтинг</strong>
              <span>Соревнуйся за место в топе</span>
            </div>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <img src={`${basePath}images/burger.png`} alt="" style={styles.featureImg} />
            </div>
            <div style={styles.featureText}>
              <strong>Призы</strong>
              <span>Выигрывай награды от ROSTIC'S</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        {isAuthenticated ? (
          <button style={styles.primaryButton} onClick={onPlay}>
            Продолжить игру
          </button>
        ) : (
          <>
            <button style={styles.primaryButton} onClick={onLogin}>
              Войти / Регистрация
            </button>
            <button style={styles.secondaryButton} onClick={onPlay}>
              Играть без входа
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>© 2024 ROSTIC'S. Все права защищены</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #E4002B 0%, #B8001F 50%, #8B0016 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  hero: {
    padding: '40px 20px 20px',
    textAlign: 'center',
    position: 'relative',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: 4,
    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
    fontFamily: "'Oswald', sans-serif",
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: 700,
    color: '#FFD700',
    letterSpacing: 8,
    marginTop: -5,
    fontFamily: "'Oswald', sans-serif",
  },
  itemsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  floatingItem: {
    width: 60,
    height: 60,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    animation: 'float 3s ease-in-out infinite',
  },
  itemImage: {
    width: 45,
    height: 45,
    objectFit: 'contain',
  },
  content: {
    flex: 1,
    background: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: '30px 25px',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#E4002B',
    marginTop: 0,
    marginBottom: 12,
    fontFamily: "'Oswald', sans-serif",
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 25,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    padding: 15,
    background: '#FFF5F5',
    borderRadius: 16,
  },
  featureIcon: {
    width: 50,
    height: 50,
    background: '#fff',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(228,0,43,0.15)',
  },
  featureImg: {
    width: 35,
    height: 35,
    objectFit: 'contain',
  },
  featureText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    color: '#333',
    fontSize: 14,
  },
  actions: {
    padding: '0 25px 30px',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #E4002B 0%, #FF1744 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 16,
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(228,0,43,0.4)',
    fontFamily: "'Oswald', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'transparent',
    color: '#E4002B',
    border: '2px solid #E4002B',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Oswald', sans-serif",
  },
  footer: {
    padding: '15px 25px',
    background: '#fff',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
};

// Add keyframes for floating animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(styleSheet);
