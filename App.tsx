
import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Match3Scene } from './game/Match3Scene';
import Overlay from './components/Overlay';

const App: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState({ score: 0, moves: 30 });
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (!gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: 600,
        height: 800,
        transparent: true,
        physics: {
          default: 'arcade',
          arcade: { debug: false }
        },
        scene: [Match3Scene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.on('update-stats', (data: { score: number; moves: number }) => {
        setStats(data);
      });

      game.events.on('game-over', (score: number) => {
        setIsGameOver(true);
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    setIsGameOver(false);
    const scene = gameRef.current?.scene.getScene('Match3Scene');
    if (scene) {
      scene.events.emit('reset-game');
    }
  };

  return (
    <div className="relative w-full h-screen bg-neutral-900 flex items-center justify-center overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 flex pointer-events-none opacity-20">
        <div className="w-1/3 bg-red-600 h-full"></div>
        <div className="w-1/3 bg-white h-full"></div>
        <div className="w-1/3 bg-red-600 h-full"></div>
      </div>

      {/* Main Game Frame */}
      <div className="relative z-10 w-full max-w-[600px] aspect-[3/4] shadow-2xl">
        <div id="game-container" className="w-full h-full" />
        <Overlay 
          score={stats.score} 
          moves={stats.moves} 
          isGameOver={isGameOver} 
          onReset={handleReset} 
        />
      </div>

      {/* Floating Kitchen Elements */}
      <div className="hidden lg:block absolute left-20 bottom-20 text-8xl grayscale opacity-20 animate-bounce">
        🍗
      </div>
      <div className="hidden lg:block absolute right-20 top-20 text-8xl grayscale opacity-20 animate-pulse">
        🍟
      </div>
    </div>
  );
};

export default App;
