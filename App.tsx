import React, { useRef, useState, useEffect } from 'react';
import { PixiGame } from './game/PixiGame';
import Overlay from './components/Overlay';

const App: React.FC = () => {
  const gameRef = useRef<PixiGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ score: 0, moves: 30, wingsCollected: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [basketShaking, setBasketShaking] = useState(false);

  const handleBasketHit = () => {
    setBasketShaking(true);
    setTimeout(() => setBasketShaking(false), 500);
  };

  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    gameRef.current = new PixiGame(
      containerRef.current,
      (newStats) => setStats(newStats),
      () => setIsGameOver(true),
      () => setIsAssetsLoading(false),
      handleBasketHit
    );

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    setIsGameOver(false);
    gameRef.current?.reset();
  };

  return (
    <div className="relative w-full h-screen bg-gray-50 flex items-center justify-center overflow-hidden font-['Oswald']">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-50 to-white"></div>

      {isAssetsLoading && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-10 text-center">
          <div className="text-9xl mb-10 animate-bounce">🍗</div>
          <h2 className="text-4xl font-black text-red-600 mb-4 uppercase italic tracking-tight">Подготовка кухни...</h2>
          <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-sm">Загружаем сочные ассеты</p>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[600px] h-full max-h-[800px] shadow-2xl bg-white sm:rounded-[40px] overflow-hidden">
        <div ref={containerRef} id="game-container" className="w-full h-full" />
        <Overlay
          score={stats.score}
          moves={stats.moves}
          wingsCollected={stats.wingsCollected}
          isGameOver={isGameOver}
          onReset={handleReset}
          basketShaking={basketShaking}
        />
      </div>
    </div>
  );
};

export default App;
