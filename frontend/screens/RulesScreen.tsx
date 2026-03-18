import React from 'react';
import { useTexts } from '../contexts/TextsContext';

interface RulesScreenProps {
  onBack: () => void;
}

export function RulesScreen({ onBack }: RulesScreenProps) {
  const { t } = useTexts();
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <div style={styles.container}>
      <div className="rules-bg" style={{
        ...styles.backgroundImage,
        backgroundImage: `url(${basePath}images/background.webp)`,
      }} />

      <div style={styles.header}>
        <h1 style={styles.title}>{t('rules.title', 'Правила игры')}</h1>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.contentPanel} className="hide-scrollbar">
          {/* How to Play */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🎮 {t('rules.how_to_play_title', 'Как играть')}</h2>
            <div style={styles.rulesList}>
              <div style={styles.rule}>
                <span style={styles.ruleNumber}>1</span>
                <p style={styles.ruleText}>{t('rules.rule_1', 'Меняй местами соседние элементы и собирай ряды из 3 и более одинаковых блюд')}</p>
              </div>
              <div style={styles.rule}>
                <span style={styles.ruleNumber}>2</span>
                <p style={styles.ruleText}>{t('rules.rule_2', 'Совпавшие элементы исчезают, на их место падают новые')}</p>
              </div>
              <div style={styles.rule}>
                <span style={styles.ruleNumber}>3</span>
                <p style={styles.ruleText}>{t('rules.rule_3', 'Выполняй задание уровня до того, как закончатся ходы')}</p>
              </div>
            </div>
          </div>

          {/* Combos */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💥 Комбо</h2>
            <div style={styles.comboList}>
              <div style={styles.combo}>
                <span style={styles.comboIcon}>3️⃣</span>
                <div>
                  <strong style={styles.comboTitle}>3 в ряд</strong>
                  <p style={styles.comboDesc}>Базовое совпадение</p>
                </div>
              </div>
              <div style={styles.combo}>
                <span style={styles.comboIcon}>4️⃣</span>
                <div>
                  <strong style={styles.comboTitle}>4 в ряд</strong>
                  <p style={styles.comboDesc}>Бонусные очки x2</p>
                </div>
              </div>
              <div style={styles.combo}>
                <span style={styles.comboIcon}>5️⃣</span>
                <div>
                  <strong style={styles.comboTitle}>5+ в ряд</strong>
                  <p style={styles.comboDesc}>Бонусные очки x3</p>
                </div>
              </div>
            </div>
          </div>

          {/* Prizes */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🎁 Призы</h2>
            <p style={styles.text}>
              {t('rules.prizes_intro', "Лучшие игроки по итогам акции получат призы от Rostic's! Рейтинг разделён на два региона — следи за своим местом.")}
            </p>
          </div>

          {/* Moscow Prizes */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏙️ Москва и МО</h2>
            <div style={styles.prizeList}>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🥇</span>
                  <span style={styles.prizePlaceText}>1–20 место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.moscow_prize_1_title', 'Встреча с космонавтом')}</strong>
                  <p style={styles.prizeText}>
                    {t('rules.moscow_prize_1_text', "Пригласительный билет на одного взрослого +1 на встречу с космонавтом А.И. Лавейкиным и набор космического мерча от ROSTIC'S")}
                  </p>
                </div>
              </div>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🎖️</span>
                  <span style={styles.prizePlaceText}>21–50 место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.moscow_prize_2_title', 'Промокод на скидку')}</strong>
                  <p style={styles.prizeText}>{t('rules.moscow_prize_2_text', "Скидка 15% на заказ в ROSTIC'S через мобильное приложение")}</p>
                </div>
              </div>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🏅</span>
                  <span style={styles.prizePlaceText}>51+ место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.moscow_prize_3_title', 'Промокод на скидку')}</strong>
                  <p style={styles.prizeText}>{t('rules.moscow_prize_3_text', "Скидка 7% на заказ в ROSTIC'S через мобильное приложение")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Region Prizes */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🌍 Регионы</h2>
            <div style={styles.prizeList}>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🥇</span>
                  <span style={styles.prizePlaceText}>1–30 место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.region_prize_1_title', 'Промокод на скидку набор мерча')}</strong>
                  <p style={styles.prizeText}>{t('rules.region_prize_1_text', "Промокод на скидку 30% в Rostic's и набор космического мерча от Rostic's")}</p>
                </div>
              </div>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🎖️</span>
                  <span style={styles.prizePlaceText}>31–50 место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.region_prize_2_title', 'Промокод на скидку')}</strong>
                  <p style={styles.prizeText}>{t('rules.region_prize_2_text', "Скидка 15% на заказ в ROSTIC'S через мобильное приложение")}</p>
                </div>
              </div>
              <div style={styles.prizeItem}>
                <div style={styles.prizePlace}>
                  <span style={styles.prizePlaceIcon}>🏅</span>
                  <span style={styles.prizePlaceText}>51+ место</span>
                </div>
                <div style={styles.prizeDesc}>
                  <strong style={styles.prizeTitle}>{t('rules.region_prize_3_title', 'Промокод на скидку')}</strong>
                  <p style={styles.prizeText}>{t('rules.region_prize_3_text', "Скидка 7% на заказ в ROSTIC'S через мобильное приложение")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full rules link */}
          <div style={styles.section}>
            <p style={styles.text}>
              Полный текст правил акции доступен по{' '}
              <a
                href="/rules.pdf"
                download="Правила акции Легенды Космоса.pdf"
                style={styles.rulesLink}
              >
                ссылке
              </a>
            </p>
          </div>

          {/* Back button */}
          <button onClick={onBack} style={styles.backButton}>
            В меню
          </button>
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
    overflow: 'hidden',
  },
  contentPanel: {
    width: '100%',
    maxWidth: 500,
    height: '100%',
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.92) 0%, rgba(30, 30, 30, 0.95) 100%)',
    borderRadius: 20,
    padding: '16px',
    overflowY: 'auto',
    overflowX: 'hidden',
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5), 0 0 80px rgba(228, 0, 43, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxSizing: 'border-box',
    // iOS smooth scrolling
    WebkitOverflowScrolling: 'touch',
    // Prevent pull-to-refresh
    overscrollBehavior: 'contain',
    // Enable touch scrolling
    touchAction: 'pan-y',
  },
  section: {
    background: 'linear-gradient(160deg, rgba(21, 21, 21, 0.9) 0%, rgba(40, 40, 40, 0.85) 100%)',
    backdropFilter: 'blur(15px)',
    borderRadius: 14,
    padding: 16,
    border: '1px solid rgba(237, 28, 41, 0.15)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    marginTop: 0,
    marginBottom: 14,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0,
    textShadow: '0 0 15px rgba(255, 255, 255, 0.15)',
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  rule: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  ruleNumber: {
    width: 32,
    height: 32,
    minWidth: 32,
    borderRadius: 8,
    background: '#ED1C29',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 15,
    flexShrink: 0,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    boxShadow: '0 0 15px rgba(228, 0, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    marginTop: 2,
  },
  ruleText: {
    color: 'rgba(220, 230, 255, 0.85)',
    margin: 0,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 500,
  },
  comboList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  combo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'linear-gradient(160deg, rgba(30, 30, 30, 0.7) 0%, rgba(40, 40, 40, 0.6) 100%)',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(237, 28, 41, 0.12)',
  },
  comboIcon: {
    fontSize: 24,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
  },
  comboTitle: {
    color: '#fff',
    display: 'block',
    marginBottom: 2,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 700,
    fontSize: 17,
  },
  comboDesc: {
    color: 'rgba(244, 166, 152, 0.7)',
    margin: 0,
    fontSize: 15,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0.5,
    fontWeight: 500,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 1.6,
    margin: 0,
    fontSize: 16,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 500,
  },
  prizeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  prizeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'linear-gradient(160deg, rgba(30, 30, 30, 0.7) 0%, rgba(40, 40, 40, 0.6) 100%)',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(237, 28, 41, 0.12)',
  },
  prizePlace: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  prizePlaceIcon: {
    fontSize: 18,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
  },
  prizePlaceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
  },
  prizeDesc: {
    paddingLeft: 26,
  },
  prizeTitle: {
    color: '#fff',
    display: 'block',
    marginBottom: 4,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 700,
    fontSize: 16,
  },
  prizeText: {
    color: 'rgba(244, 166, 152, 0.7)',
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 500,
  },
  rulesLink: {
    color: '#ED1C29',
    textDecoration: 'underline',
    fontWeight: 600,
  },
  backButton: {
    width: '100%',
    padding: '14px 0',
    background: 'linear-gradient(135deg, #ED1C29 0%, #C41622 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 700,
    fontFamily: "'RosticsCeraPro', sans-serif",
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
    boxShadow: '0 4px 20px rgba(228, 0, 43, 0.4)',
    flexShrink: 0,
  },
};

// Add font import
const rulesStyleSheet = document.createElement('style');
rulesStyleSheet.textContent = `
  /* @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap'); */

  /* Mobile background for rules screen */
  @media (max-width: 500px) {
    .rules-bg {
      background-image: url('/images/backgroundmob.webp') !important;
    }
  }
`;
if (!document.getElementById('rules-styles')) {
  rulesStyleSheet.id = 'rules-styles';
  document.head.appendChild(rulesStyleSheet);
}
