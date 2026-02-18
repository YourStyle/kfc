import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTexts } from '../contexts/TextsContext';
import api from '../services/api';
import type { QuestResultData } from '../services/api';

const QuestResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTexts();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestResultData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const rafRef = useRef<number>(0);

  // Load quest results on mount
  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const { data, error: apiError } = await api.getQuestResult();

        if (apiError || !data) {
          setError(apiError || 'Не удалось загрузить результаты');
          return;
        }

        setResult(data);

        // Start score animation with requestAnimationFrame
        const duration = 2000;
        const target = data.total_score;
        const start = performance.now();

        const tick = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic for decelerating feel
          const eased = 1 - Math.pow(1 - progress, 3);
          setAnimatedScore(Math.round(eased * target));

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            // Show confetti if score is 30+
            if (target >= 120) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);
            }
          }
        };
        rafRef.current = requestAnimationFrame(tick);

        // Check if promo code already claimed
        if (data.claimed_code) {
          setPromoCode(data.claimed_code);
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить результаты');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
  }, []);

  // Get tier info based on score (200 = gold, 160 = silver, 120 = bronze)
  const getTier = (score: number): { name: string; color: string; label: string } | null => {
    if (score >= 200) return { name: 'gold', color: '#FFD700', label: 'ЗОЛОТОЙ' };
    if (score >= 160) return { name: 'silver', color: '#C0C0C0', label: 'СЕРЕБРЯНЫЙ' };
    if (score >= 120) return { name: 'bronze', color: '#CD7F32', label: 'БРОНЗОВЫЙ' };
    return null;
  };

  const handleClaimPromo = async () => {
    if (!result || claiming) return;

    try {
      setClaiming(true);
      const { data, error: apiError } = await api.claimPromoCode();

      if (apiError || !data) {
        alert(apiError || 'Не удалось получить промокод');
        return;
      }

      setPromoCode(data.code);
    } catch (err: any) {
      alert(err.message || 'Не удалось получить промокод');
    } finally {
      setClaiming(false);
    }
  };

  const handleCopyPromo = async () => {
    if (!promoCode) return;

    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Не удалось скопировать промокод');
    }
  };

  if (loading) {
    return (
      <div className="quest-result-screen loading">
        <div className="spinner"></div>
        <p>Подводим итоги...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="quest-result-screen error">
        <div className="error-card">
          <h2>Ошибка</h2>
          <p>{error || 'Не удалось загрузить результаты'}</p>
          <button onClick={() => navigate('/spacequest')} className="primary-button">
            Вернуться к квесту
          </button>
        </div>
      </div>
    );
  }

  const tier = getTier(result.total_score);

  return (
    <div className="quest-result-screen">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                backgroundColor: ['#FFD700', '#ED1C29', '#FF4D6D', '#C0C0C0', '#CD7F32'][
                  Math.floor(Math.random() * 5)
                ],
              }}
            />
          ))}
        </div>
      )}

      <div className="result-container">
        {/* Main Result Card */}
        <div className="result-card main-card">
          <div className="corner-decoration top-left"></div>
          <div className="corner-decoration top-right"></div>
          <div className="corner-decoration bottom-left"></div>
          <div className="corner-decoration bottom-right"></div>

          <h1 className="result-title">{t('quest.result_title', 'КВЕСТ ЗАВЕРШЕН')}</h1>

          {/* Score Display */}
          <div className="score-display">
            <div className="score-label">ИТОГОВЫЙ СЧЕТ</div>
            <div className="score-value">{animatedScore}</div>
            <div className="score-max">из {result.total_pages * 10}</div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card stat-stagger-0">
              <div className="stat-icon correct">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="stat-value">{result.correct_answers}</div>
              <div className="stat-label">ПРАВИЛЬНЫХ</div>
            </div>

            <div className="stat-card stat-stagger-1">
              <div className="stat-icon answered">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="stat-value">
                {result.answered_pages}/{result.total_pages}
              </div>
              <div className="stat-label">ОТВЕЧЕНО</div>
            </div>

            <div className="stat-card stat-stagger-2">
              <div className="stat-icon skipped">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13 5L20 12L13 19M6 5L13 12L6 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="stat-value">{result.skipped_answers}</div>
              <div className="stat-label">ПРОПУЩЕНО</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-label">
              <span>ТОЧНОСТЬ</span>
              <span>
                {result.answered_pages > 0
                  ? Math.round((result.correct_answers / result.answered_pages) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width:
                    result.answered_pages > 0
                      ? `${(result.correct_answers / result.answered_pages) * 100}%`
                      : '0%',
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Promo Code Section */}
        {tier ? (
          <div className="promo-section">
            <div className="tier-badge" style={{ borderColor: tier.color }}>
              <div className="tier-icon" style={{ color: tier.color }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <div className="tier-label" style={{ color: tier.color }}>
                {tier.label} ПРОМОКОД
              </div>
            </div>

            {promoCode ? (
              <div className="promo-code-card">
                <div className="promo-code-label">ВАШ ПРОМОКОД</div>
                <div className="promo-code-value">{promoCode}</div>
                <button
                  onClick={handleCopyPromo}
                  className={`copy-button ${copied ? 'copied' : ''}`}
                >
                  {copied ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Скопировано!
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      Скопировать
                    </>
                  )}
                </button>
                <p className="promo-hint">{t('quest.promo_hint', "Используйте промокод в ресторанах Rostic's")}</p>
              </div>
            ) : (
              <button
                onClick={handleClaimPromo}
                disabled={claiming}
                className="claim-button primary-button"
              >
                {claiming ? 'Получение...' : 'Получить промокод'}
              </button>
            )}
          </div>
        ) : (
          <div className="no-prize-section">
            <div className="no-prize-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M8 12H16M12 8V16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>{t('quest.result_no_prize', 'Вы отлично справились!')}</h3>
            <p>{t('quest.result_no_prize_hint', "Наберите 120 баллов или больше, чтобы получить промокод в ресторанах Rostic's")}</p>
            <p className="score-diff">Вам не хватило всего {120 - result.total_score} баллов</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button onClick={() => navigate('/spacequest')} className="secondary-button">
            {t('quest.btn_back', 'Вернуться к квесту')}
          </button>
          <button onClick={() => navigate('/match3')} className="primary-button game-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 3H21V9M9 21H3V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 3L14 10M3 21L10 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('quest.btn_game', "Играть в Rostic's Легенды космоса")}
          </button>
        </div>

        {/* Partner Logos */}
        <div className="quest-partner-logos">
          <img src="/images/logoRostics.png" alt="ROSTIC'S" className="quest-partner-logo-rost" />
          <div className="quest-partner-divider"></div>
          <img src="/images/logoMk.png" alt="Музей Космонавтики" className="quest-partner-logo-mk" />
        </div>

        <div className="quest-copyright">
          {t('quest.copyright', '© Музей космонавтики, 2026  |  © Юнирест')}
        </div>
      </div>

      <style>{`

        .quest-result-screen {
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            rgba(21, 21, 21, 1) 0%,
            rgba(20, 28, 48, 1) 50%,
            rgba(21, 21, 21, 1) 100%
          );
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .quest-result-screen::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 30%, rgba(228, 0, 43, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255, 77, 109, 0.08) 0%, transparent 40%);
          pointer-events: none;
        }

        /* Loading & Error States */
        .quest-result-screen.loading,
        .quest-result-screen.error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ED1C29;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px 36px 20px 36px;
          padding: 40px;
          max-width: 400px;
          text-align: center;
        }

        .error-card h2 {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #ED1C29;
          margin-bottom: 16px;
        }

        .error-card p {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 24px;
        }

        /* Confetti Animation */
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 100;
          overflow: hidden;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) translateX(15px) rotate(90deg);
          }
          50% {
            transform: translateY(50vh) translateX(-10px) rotate(180deg);
          }
          75% {
            transform: translateY(75vh) translateX(12px) rotate(270deg);
            opacity: 0.6;
          }
          100% {
            transform: translateY(100vh) translateX(-8px) rotate(360deg);
            opacity: 0;
          }
        }

        /* Stat card stagger entrance */
        @keyframes statCardIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .stat-stagger-0 { animation: statCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s both; }
        .stat-stagger-1 { animation: statCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.7s both; }
        .stat-stagger-2 { animation: statCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both; }

        /* Main Container */
        .result-container {
          max-width: 800px;
          width: 100%;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Main Card */
        .result-card.main-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px 36px 20px 36px;
          padding: 40px;
          position: relative;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Corner Decorations */
        .corner-decoration {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 2px solid #ED1C29;
        }

        .corner-decoration.top-left {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
          border-radius: 20px 0 0 0;
        }

        .corner-decoration.top-right {
          top: -1px;
          right: -1px;
          border-left: none;
          border-bottom: none;
          border-radius: 0 36px 0 0;
        }

        .corner-decoration.bottom-left {
          bottom: -1px;
          left: -1px;
          border-right: none;
          border-top: none;
          border-radius: 0 0 0 20px;
        }

        .corner-decoration.bottom-right {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
          border-radius: 0 0 36px 0;
        }

        /* Title */
        .result-title {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 32px;
          font-weight: 700;
          text-align: center;
          color: #fff;
          letter-spacing: 2px;
          margin-bottom: 32px;
          text-transform: uppercase;
          animation: fadeInDown 0.6s ease-out 0.2s both;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Score Display */
        .score-display {
          text-align: center;
          margin-bottom: 40px;
          animation: fadeInScale 0.8s ease-out 0.4s both;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .score-label {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .score-value {
          font-family: 'RosticsCeraCondensed', monospace;
          font-size: 72px;
          font-weight: 900;
          color: #ED1C29;
          text-shadow: 0 0 20px rgba(228, 0, 43, 0.6), 0 0 40px rgba(228, 0, 43, 0.4),
            0 0 60px rgba(228, 0, 43, 0.2);
          line-height: 1;
          margin-bottom: 8px;
        }

        .score-max {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
          animation: fadeInUp 0.8s ease-out 0.6s both;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px 16px 8px 16px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(228, 0, 43, 0.3);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .stat-icon.correct {
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
        }

        .stat-icon.answered {
          color: #2196f3;
          background: rgba(33, 150, 243, 0.1);
        }

        .stat-icon.skipped {
          color: #ff9800;
          background: rgba(255, 152, 0, 0.1);
        }

        .stat-value {
          font-family: 'RosticsCeraCondensed', monospace;
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 8px;
          line-height: 1;
        }

        .stat-label {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        /* Progress Section */
        .progress-section {
          animation: fadeInUp 0.8s ease-out 0.8s both;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .progress-bar-container {
          height: 28px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          background: #ED1C29;
          transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1) 1s;
          box-shadow: 0 0 20px rgba(228, 0, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
        }

        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Promo Section */
        .promo-section {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px 36px 20px 36px;
          padding: 32px;
          margin-bottom: 24px;
          text-align: center;
          animation: fadeInUp 0.8s ease-out 1s both;
        }

        .tier-badge {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px;
          border: 2px solid;
          border-radius: 12px 24px 12px 24px;
          background: rgba(0, 0, 0, 0.2);
          margin-bottom: 24px;
        }

        .tier-icon {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        .tier-label {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        /* Promo Code Card */
        .promo-code-card {
          background: rgba(0, 0, 0, 0.3);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 24px;
          margin-top: 20px;
        }

        .promo-code-label {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .promo-code-value {
          font-family: 'RosticsCeraCondensed', monospace;
          font-size: 32px;
          font-weight: 800;
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
          margin-bottom: 16px;
          letter-spacing: 4px;
        }

        .copy-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 10px 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 12px;
        }

        .copy-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #ED1C29;
        }

        .copy-button.copied {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4caf50;
          color: #4caf50;
        }

        .promo-hint {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        /* No Prize Section */
        .no-prize-section {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px 36px 20px 36px;
          padding: 40px;
          text-align: center;
          margin-bottom: 24px;
          animation: fadeInUp 0.8s ease-out 1s both;
        }

        .no-prize-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          color: rgba(255, 255, 255, 0.3);
        }

        .no-prize-section h3 {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
        }

        .no-prize-section p {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }

        .score-diff {
          font-family: 'RosticsCeraCondensed', monospace;
          font-size: 18px;
          font-weight: 700;
          color: #ff9800 !important;
          margin-top: 16px !important;
        }

        /* Buttons */
        .primary-button,
        .secondary-button,
        .claim-button {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 14px 32px;
          border-radius: 10px 24px 10px 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .primary-button {
          background: #ED1C29;
          color: #fff;
          box-shadow: 0 4px 20px rgba(228, 0, 43, 0.4);
          position: relative;
          overflow: hidden;
        }

        .primary-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .primary-button:hover::before {
          left: 100%;
        }

        .primary-button:hover {
          box-shadow: 0 6px 30px rgba(228, 0, 43, 0.6);
          transform: translateY(-2px);
        }

        .primary-button:active {
          transform: translateY(0);
        }

        .secondary-button {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .claim-button {
          width: 100%;
          margin-top: 20px;
        }

        .claim-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Navigation Buttons */
        .navigation-buttons {
          display: flex;
          gap: 16px;
          animation: fadeInUp 0.8s ease-out 1.2s both;
        }

        .navigation-buttons button {
          flex: 1;
        }

        .game-link svg {
          flex-shrink: 0;
        }

        .quest-partner-logos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 32px;
          animation: fadeInUp 0.8s ease-out 1.4s both;
        }

        .quest-partner-logo-rost {
          width: 80px;
          height: auto;
          filter: drop-shadow(0 0 15px rgba(228,0,43,0.4));
        }

        .quest-partner-divider {
          width: 1px;
          height: 40px;
          background: linear-gradient(180deg, transparent, rgba(255,120,140,0.5), transparent);
        }

        .quest-partner-logo-mk {
          width: 64px;
          height: auto;
          filter: drop-shadow(0 0 10px rgba(140,140,220,0.3));
          background: rgba(255, 255, 255, 0.9);
          border-radius: 6px;
          padding: 3px;
        }

        .quest-copyright {
          text-align: center;
          margin-top: 16px;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 1px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .quest-result-screen {
            padding: 16px;
          }

          .result-card.main-card {
            padding: 24px;
            border-radius: 16px 28px 16px 28px;
          }

          .result-title {
            font-size: 24px;
            margin-bottom: 24px;
          }

          .score-value {
            font-size: 56px;
          }

          .score-max {
            font-size: 16px;
          }

          .stats-grid {
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
          }

          .stat-icon svg {
            width: 20px;
            height: 20px;
          }

          .stat-value {
            font-size: 24px;
          }

          .stat-label {
            font-size: 9px;
          }

          .promo-section {
            padding: 24px;
            border-radius: 16px 28px 16px 28px;
          }

          .tier-badge {
            padding: 20px;
          }

          .tier-icon svg {
            width: 40px;
            height: 40px;
          }

          .tier-label {
            font-size: 16px;
          }

          .promo-code-value {
            font-size: 24px;
            letter-spacing: 2px;
          }

          .no-prize-section {
            padding: 32px 24px;
            border-radius: 16px 28px 16px 28px;
          }

          .no-prize-icon {
            width: 64px;
            height: 64px;
          }

          .no-prize-section h3 {
            font-size: 20px;
          }

          .no-prize-section p {
            font-size: 14px;
          }

          .navigation-buttons {
            flex-direction: column;
          }

          .primary-button,
          .secondary-button {
            width: 100%;
            padding: 12px 24px;
            font-size: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .result-container,
          .result-title,
          .score-display,
          .stats-grid,
          .progress-section,
          .promo-section,
          .no-prize-section,
          .navigation-buttons { animation: none !important; opacity: 1; transform: none; }
          .stat-stagger-0,
          .stat-stagger-1,
          .stat-stagger-2 { animation: none !important; opacity: 1; transform: none; }
          .confetti { animation: none; display: none; }
          .spinner { animation: none; }
          .tier-icon { animation: none; }
          .progress-bar-fill { transition: none; }
          .progress-bar-fill::after { animation: none; }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .stat-card {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 12px;
            align-items: center;
            text-align: left;
          }

          .stat-icon {
            margin: 0;
          }

          .stat-value {
            text-align: center;
          }

          .stat-label {
            text-align: right;
          }

          .score-value {
            font-size: 48px;
          }

          .promo-code-value {
            font-size: 20px;
            word-break: break-all;
          }
        }
      `}</style>
    </div>
  );
};

export default QuestResultScreen;
