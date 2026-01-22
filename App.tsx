
import React, { useRef, useState, useEffect } from 'react';
import Phaser from 'phaser';
import { Match3Scene } from './game/Match3Scene';
import Overlay from './components/Overlay';

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState({ score: 0, moves: 30, wingsCollected: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);

  useEffect(() => {
    if (gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 600,
      height: 800,
      backgroundColor: '#f8f9fa',
      antialias: true,
      pixelArt: false,
      roundPixels: true,
      scene: Match3Scene,
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Слушатели событий из Phaser
    game.events.on('assets-loaded', () => setIsAssetsLoading(false));
    game.events.on('update-stats', (data: any) => setStats(data));
    game.events.on('game-over', () => setIsGameOver(true));

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    setIsGameOver(false);
    // Use the Match3Scene instance to emit the reset event.
    // Casting to any to bypass strict type checking where inherited Scene properties might not be resolved.
    const scene = gameRef.current?.scene.getScene('Match3Scene') as any;
    if (scene) scene.events.emit('reset-game');
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
        <div id="game-container" className="w-full h-full" />
        <Overlay 
          score={stats.score} 
          moves={stats.moves} 
          wingsCollected={stats.wingsCollected}
          isGameOver={isGameOver} 
          onReset={handleReset} 
        />
      </div>
    </div>
  );
};

export default App;
