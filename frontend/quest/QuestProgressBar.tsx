import React, { useEffect, useState, useRef } from 'react';

interface QuestProgressBarProps {
  current: number;
  total: number;
  score: number;
}

const QuestProgressBar: React.FC<QuestProgressBarProps> = ({ current, total, score }) => {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const [displayScore, setDisplayScore] = useState(score);
  const prevScoreRef = useRef(score);
  const rafRef = useRef<number>(0);

  // Animate score counter when it changes
  useEffect(() => {
    const from = prevScoreRef.current;
    const to = score;
    prevScoreRef.current = score;

    if (from === to) { setDisplayScore(to); return; }

    const duration = 600;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
  }, [score]);

  return (
    <div
      style={styles.wrapper}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Прогресс квеста: ${current} из ${total}, ${score} очков`}
    >
      <div style={styles.info}>
        <span style={styles.step}>
          <span style={styles.stepCurrent}>{current}</span>
          <span style={styles.stepSlash}>/</span>
          <span style={styles.stepTotal}>{total}</span>
        </span>
        <span style={styles.score}>
          <span style={styles.scoreIcon}>★</span>
          <span className="quest-progress-score-value" style={styles.scoreValue}>{displayScore}</span>
          <span style={styles.scoreSuffix}>очк.</span>
        </span>
      </div>
      <div style={styles.barOuter}>
        <div style={styles.barTrack}>
          <div
            className={`quest-progress-fill ${pct >= 25 ? 'quest-progress-milestone' : ''}`}
            style={{
              ...styles.barFill,
              width: `${pct}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  info: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    padding: '0 4px',
  },
  step: {
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    color: 'rgba(200,215,240,0.8)',
    letterSpacing: 1,
  },
  stepCurrent: {
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
  },
  stepSlash: {
    margin: '0 3px',
    opacity: 0.5,
  },
  stepTotal: {
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    fontWeight: 500,
    fontSize: 13,
    opacity: 0.7,
  },
  score: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  scoreIcon: {
    color: '#FF4D6D',
    fontSize: 14,
    filter: 'drop-shadow(0 0 4px rgba(228,0,43,0.5))',
  },
  scoreValue: {
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
    textShadow: '0 0 10px rgba(255,77,109,0.4)',
  },
  scoreSuffix: {
    fontFamily: "'RosticsCeraPro', sans-serif",
    fontWeight: 500,
    fontSize: 11,
    color: 'rgba(140,180,240,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barOuter: {
    padding: 4,
    background: 'linear-gradient(180deg, rgba(20,10,15,0.8) 0%, rgba(40,20,30,0.9) 100%)',
    borderRadius: 14,
    border: '1px solid rgba(255,100,120,0.25)',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
  },
  barTrack: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(0,0,0,0.2)',
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    background: 'linear-gradient(90deg, #ED1C29 0%, #FF4D6D 60%, #FF8090 100%)',
    boxShadow: '0 0 15px rgba(228,0,43,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
    transition: 'width 0.5s ease-out',
    position: 'relative',
  },
};

const progressStyleId = 'quest-progress-styles';
if (!document.getElementById(progressStyleId)) {
  const sheet = document.createElement('style');
  sheet.id = progressStyleId;
  sheet.textContent = `
    .quest-progress-fill::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      animation: questProgressGlow 2s ease-in-out infinite;
    }
    @keyframes questProgressGlow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* Milestone pulse glow at 25%/50%/75%/100% thresholds */
    .quest-progress-fill.quest-progress-milestone {
      animation: questMilestonePulse 1.5s ease-in-out 1;
    }
    @keyframes questMilestonePulse {
      0%, 100% { box-shadow: 0 0 15px rgba(228,0,43,0.5), inset 0 1px 0 rgba(255,255,255,0.2); }
      50% { box-shadow: 0 0 30px rgba(228,0,43,0.8), 0 0 50px rgba(255,77,109,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
    }

    @media (prefers-reduced-motion: reduce) {
      .quest-progress-fill::after { animation: none; }
      .quest-progress-fill.quest-progress-milestone { animation: none; }
    }
  `;
  document.head.appendChild(sheet);
}

export default QuestProgressBar;
