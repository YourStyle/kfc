import React, { useRef, useState, useEffect } from 'react';
import { PixiGame } from './game/PixiGame';
import Overlay, { FigurineModal } from './components/Overlay';
import { BottomNav } from './components/BottomNav';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './screens/AuthScreen';
import { LandingScreen } from './screens/LandingScreen';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RulesScreen } from './screens/RulesScreen';
import api, { Level } from './services/api';

type Screen = 'landing' | 'levels' | 'game' | 'leaderboard' | 'profile' | 'rules';

const AppContent: React.FC = () => {
  const { isAuthenticated, refreshUser, isLoading } = useAuth();
  const gameRef = useRef<PixiGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    score: 0,
    moves: 30,
    collected: { drumstick: 0, wing: 0, burger: 0, fries: 0, bucket: 0, ice_cream: 0, donut: 0, cappuccino: 0, belka: 0, strelka: 0, sputnik: 0, vostok: 0, spaceship: 0 }
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [basketShaking, setBasketShaking] = useState(false);
  const [screen, setScreen] = useState<Screen>('landing');
  const [showAuth, setShowAuth] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [levels, setLevels] = useState<Level[]>([]);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [figurineToShow, setFigurineToShow] = useState<string | null>(null);

  // Load levels once
  useEffect(() => {
    const loadLevels = async () => {
      const { data } = await api.getLevels();
      if (data?.levels) {
        setLevels(data.levels);
      }
    };
    loadLevels();
  }, []);

  // Toggle body class for game screen (prevents scroll during gameplay)
  useEffect(() => {
    if (screen === 'game') {
      document.body.classList.add('game-active');
    } else {
      document.body.classList.remove('game-active');
    }
    return () => {
      document.body.classList.remove('game-active');
    };
  }, [screen]);

  // Auto-redirect authenticated users from landing to levels
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true);
      if (isAuthenticated && screen === 'landing') {
        setScreen('levels');
      }
    }
  }, [isAuthenticated, isLoading, hasCheckedAuth, screen]);

  const handleBasketHit = () => {
    setBasketShaking(true);
    setTimeout(() => setBasketShaking(false), 500);
  };

  const handleFigurineAppeared = (type: string) => {
    const seen = JSON.parse(localStorage.getItem('rostics_seen_figurines') || '[]');
    if (!seen.includes(type)) {
      seen.push(type);
      localStorage.setItem('rostics_seen_figurines', JSON.stringify(seen));
      setFigurineToShow(type);
    }
  };

  useEffect(() => {
    if (screen !== 'game' || gameRef.current || !containerRef.current) return;

    const levelConfig = currentLevel
      ? {
          gridWidth: currentLevel.grid_width,
          gridHeight: currentLevel.grid_height,
          maxMoves: currentLevel.max_moves,
          itemTypes: currentLevel.item_types,
          targets: currentLevel.targets,
          obstacles: currentLevel.obstacles,
        }
      : undefined;

    gameRef.current = new PixiGame(
      containerRef.current,
      (newStats) => setStats(newStats),
      (finalStats) => handleGameOver(finalStats),
      () => setIsAssetsLoading(false),
      handleBasketHit,
      handleFigurineAppeared,
      levelConfig
    );

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [screen, currentLevel]);

  const calculateStars = (score: number, targets?: Level['targets']): number => {
    if (!targets?.min_score) {
      if (score >= 5000) return 3;
      if (score >= 2500) return 2;
      if (score >= 1000) return 1;
      return 0;
    }

    const minScore = targets.min_score;
    if (score >= minScore * 2) return 3;
    if (score >= minScore * 1.5) return 2;
    if (score >= minScore) return 1;
    return 0;
  };

  // Рассчитывает процент выполнения уровня
  // Сбор предметов: 50%, Очки: 50%
  // Уровень пройден если ЛЮБАЯ категория выполнена на 100%
  const calculateCompletion = (
    score: number,
    collected: Record<string, number>,
    targets?: Level['targets']
  ): { percent: number; isWon: boolean } => {
    let collectionPercent = 100;
    let scorePercent = 100;

    // Рассчитываем процент сбора предметов
    if (targets?.collect) {
      let totalRequired = 0;
      let totalCollected = 0;
      for (const [item, required] of Object.entries(targets.collect)) {
        totalRequired += required;
        totalCollected += Math.min(collected[item] || 0, required);
      }
      if (totalRequired > 0) {
        collectionPercent = Math.min(100, (totalCollected / totalRequired) * 100);
      }
    }

    // Рассчитываем процент очков
    if (targets?.min_score && targets.min_score > 0) {
      scorePercent = Math.min(100, (score / targets.min_score) * 100);
    }

    // Общий процент: 50% сбор + 50% очки
    const overallPercent = (collectionPercent * 0.5) + (scorePercent * 0.5);

    // Уровень пройден если ЛЮБАЯ категория на 100%
    const isWon = collectionPercent >= 100 || scorePercent >= 100;

    return { percent: Math.round(overallPercent), isWon };
  };

  const handleGameOver = async (finalStats?: { score: number; moves: number; collected: Record<string, number> }) => {
    const gameStats = finalStats || stats;
    setIsGameOver(true);
    setFigurineToShow(null); // Dismiss figurine modal if showing
    setStats(gameStats); // Update React state with final stats

    // Рассчитываем процент выполнения и статус победы
    const completion = calculateCompletion(gameStats.score, gameStats.collected, currentLevel?.targets);
    setCompletionPercent(completion.percent);

    // Звёзды только если уровень пройден
    const stars = completion.isWon ? calculateStars(gameStats.score, currentLevel?.targets) : 0;
    setEarnedStars(stars);

    if (isAuthenticated && sessionId && currentLevel) {
      const duration = Math.floor((Date.now() - gameStartTime) / 1000);
      const movesUsed = currentLevel.max_moves - gameStats.moves;
      // targets_met contains all collected items
      const targetsMet = {
        collect: gameStats.collected
      };
      await api.completeGame(
        sessionId,
        gameStats.score,
        movesUsed > 0 ? movesUsed : currentLevel.max_moves,
        targetsMet,
        duration
      );
      refreshUser();
    }
  };

  const handleSelectLevel = async (level: Level) => {
    setCurrentLevel(level);
    setIsGameOver(false);
    setIsAssetsLoading(true);
    setEarnedStars(0);
    setCompletionPercent(0);

    if (isAuthenticated) {
      const { data } = await api.startGame(level.id);
      if (data) setSessionId(data.session_id);
    }

    setGameStartTime(Date.now());
    setScreen('game');
  };

  const handleNextLevel = async () => {
    if (!currentLevel || levels.length === 0) return;

    // Find the next level
    const currentIndex = levels.findIndex((l) => l.id === currentLevel.id);
    if (currentIndex === -1 || currentIndex >= levels.length - 1) return;

    const nextLevel = levels[currentIndex + 1];

    // Destroy current game
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }

    // Start next level
    await handleSelectLevel(nextLevel);
  };

  const hasNextLevel = (): boolean => {
    if (!currentLevel || levels.length === 0) return false;
    const currentIndex = levels.findIndex((l) => l.id === currentLevel.id);
    return currentIndex !== -1 && currentIndex < levels.length - 1;
  };

  const handleReset = async () => {
    setIsGameOver(false);
    setEarnedStars(0);

    if (isAuthenticated && currentLevel) {
      const { data } = await api.startGame(currentLevel.id);
      if (data) setSessionId(data.session_id);
    }

    setGameStartTime(Date.now());
    gameRef.current?.reset();
  };

  const handleBackToMenu = () => {
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
    setCurrentLevel(null);
    setSessionId(null);
    setScreen('levels');
  };

  const handleNavigation = (item: 'levels' | 'leaderboard' | 'profile' | 'rules') => {
    setScreen(item);
  };

  const handleLoginFromLanding = () => {
    setShowAuth(true);
  };

  const handlePlayFromLanding = () => {
    setScreen('levels');
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setScreen('levels');
  };

  const getActiveNav = (): 'levels' | 'leaderboard' | 'profile' | 'rules' | null => {
    if (screen === 'levels') return 'levels';
    if (screen === 'leaderboard') return 'leaderboard';
    if (screen === 'profile') return 'profile';
    if (screen === 'rules') return 'rules';
    return null;
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.logo}>ROSTIC'S</div>
        <div style={loadingStyles.spinner} />
      </div>
    );
  }

  // Show bottom nav on all screens except game and landing
  const showBottomNav = screen !== 'game' && screen !== 'landing';

  // Landing screen
  if (screen === 'landing') {
    return (
      <>
        <LandingScreen onPlay={handlePlayFromLanding} onLogin={handleLoginFromLanding} />
        {showAuth && (
          <AuthScreen onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
        )}
      </>
    );
  }

  // Level select screen
  if (screen === 'levels') {
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: '#FFF5F5' }}>
        <LevelSelectScreen
          onSelectLevel={handleSelectLevel}
          onBack={() => setScreen('landing')}
          onShowAuth={() => setShowAuth(true)}
          onShowLeaderboard={() => setScreen('leaderboard')}
        />
        {showBottomNav && <BottomNav active={getActiveNav()} onNavigate={handleNavigation} />}
        {showAuth && (
          <AuthScreen onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
        )}
      </div>
    );
  }

  // Leaderboard screen
  if (screen === 'leaderboard') {
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: '#FFF5F5' }}>
        <LeaderboardScreen onBack={() => setScreen('levels')} />
        {showBottomNav && <BottomNav active={getActiveNav()} onNavigate={handleNavigation} />}
      </div>
    );
  }

  // Profile screen
  if (screen === 'profile') {
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: '#FFF5F5' }}>
        <ProfileScreen onBack={() => setScreen('levels')} onShowAuth={() => setShowAuth(true)} />
        {showBottomNav && <BottomNav active={getActiveNav()} onNavigate={handleNavigation} />}
        {showAuth && (
          <AuthScreen onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
        )}
      </div>
    );
  }

  // Rules screen
  if (screen === 'rules') {
    return (
      <div style={{ paddingBottom: 100, minHeight: '100vh', background: '#FFF5F5' }}>
        <RulesScreen onBack={() => setScreen('levels')} />
        {showBottomNav && <BottomNav active={getActiveNav()} onNavigate={handleNavigation} />}
      </div>
    );
  }

  // Game screen (no bottom nav)
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden font-['RosticsCeraCondensed']" style={{ background: '#0a0f1e' }}>
      {/* Game background with darkening overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${basePath}images/gamebg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Darkening layer */}
      <div className="absolute inset-0 z-0" style={{ background: 'rgba(0, 0, 0, 0.55)' }} />
      {/* Edge glow - top */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(to bottom, rgba(237, 28, 41, 0.06) 0%, transparent 25%)',
        pointerEvents: 'none',
      }} />
      {/* Edge glow - bottom */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(to top, rgba(237, 28, 41, 0.06) 0%, transparent 25%)',
        pointerEvents: 'none',
      }} />
      {/* Edge glow - left */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(to right, rgba(237, 28, 41, 0.04) 0%, transparent 20%)',
        pointerEvents: 'none',
      }} />
      {/* Edge glow - right */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(to left, rgba(237, 28, 41, 0.04) 0%, transparent 20%)',
        pointerEvents: 'none',
      }} />

      {isAssetsLoading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-10 text-center" style={{ background: 'rgba(21, 21, 21, 0.95)' }}>
          <div className="text-9xl mb-10 animate-bounce">🍗</div>
          <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tight">
            {currentLevel ? currentLevel.name : 'Подготовка кухни...'}
          </h2>
          <p className="font-bold mb-8 uppercase tracking-widest text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Загружаем сочные ассеты
          </p>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[600px] h-full max-h-[800px] overflow-hidden">
        <div ref={containerRef} id="game-container" className="w-full h-full" />
        <Overlay
          score={stats.score}
          moves={stats.moves}
          collected={stats.collected}
          isGameOver={isGameOver}
          onReset={handleReset}
          basketShaking={basketShaking}
          levelName={currentLevel?.name}
          targets={currentLevel?.targets}
          onBackToMenu={handleBackToMenu}
          earnedStars={earnedStars}
          onNextLevel={handleNextLevel}
          hasNextLevel={hasNextLevel()}
          completionPercent={completionPercent}
        />

        {figurineToShow && (
          <FigurineModal
            type={figurineToShow}
            onDismiss={() => setFigurineToShow(null)}
          />
        )}
      </div>

      {showAuth && (
        <AuthScreen onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#FFF5F5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  logo: {
    fontSize: 48,
    fontWeight: 900,
    color: '#ED1C29',
    letterSpacing: 4,
    fontFamily: "'RosticsCeraCondensed', sans-serif",
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid rgba(228,0,43,0.2)',
    borderTopColor: '#ED1C29',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
