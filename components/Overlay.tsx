
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { TUTORIAL_STEPS } from '../constants';

interface OverlayProps {
  score: number;
  moves: number;
  wingsCollected: number;
  isGameOver: boolean;
  onReset: () => void;
  gameRef?: React.RefObject<Phaser.Game | null>;
}

const Overlay: React.FC<OverlayProps> = ({ score, moves, wingsCollected, isGameOver, onReset, gameRef }) => {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const prevWingsRef = useRef(wingsCollected);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Тряска корзины когда добавляются крылышки
  useEffect(() => {
    if (wingsCollected > prevWingsRef.current) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
    prevWingsRef.current = wingsCollected;
  }, [wingsCollected]);

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'rostics-score.png', { type: 'image/png' });

        // Проверяем поддержку Web Share API
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: "Мой результат в ROSTIC'S Kitchen!",
              text: `Я набрал ${score.toLocaleString()} очков и собрал ${wingsCollected} крылышек! 🍗`,
              files: [file],
            });
          } catch (err) {
            // Пользователь отменил шеринг
          }
        } else {
          // Fallback: скачать изображение
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rostics-score.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center p-4 select-none">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl pointer-events-auto flex items-center justify-center z-[100] p-6">
          <div className="bg-white border-8 border-red-600 rounded-[50px] p-8 text-center max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            {/* Анимация bounce убрана по просьбе пользователя */}
            <div className="text-8xl mb-6">{TUTORIAL_STEPS[tutorialStep].icon}</div>
            <h2 className="text-4xl font-black text-red-600 mb-4 uppercase italic leading-tight">
              {TUTORIAL_STEPS[tutorialStep].title}
            </h2>
            <p className="text-gray-600 font-bold mb-10 text-lg leading-relaxed">
              {TUTORIAL_STEPS[tutorialStep].text}
            </p>
            
            <div className="flex justify-center gap-2 mb-8">
                {TUTORIAL_STEPS.map((_, i) => (
                    <div key={i} className={`h-2 w-8 rounded-full transition-all ${i === tutorialStep ? 'bg-red-600 w-12' : 'bg-gray-200'}`} />
                ))}
            </div>

            <button 
              onClick={nextStep}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 px-8 rounded-[30px] text-2xl shadow-[0_8px_0_rgb(150,0,20)] transition-all active:translate-y-2 active:shadow-none uppercase italic"
            >
              {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'ПОГНАЛИ!' : 'ДАЛЕЕ'}
            </button>
          </div>
        </div>
      )}

      {/* Top Section: Branding */}
      <div className="mt-2 mb-4">
        <div className="bg-red-600 px-8 py-2 rounded-full text-white font-black shadow-[0_4px_0_rgb(150,0,20)] transform -rotate-1 tracking-wider border-2 border-white text-lg">
          КУХНЯ ROSTIC'S
        </div>
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-md flex justify-between items-stretch gap-2 pointer-events-auto">
        <div className={`flex-1 bg-white border-b-4 border-gray-200 shadow-lg rounded-3xl p-2 flex items-center justify-center gap-2 transition-transform ${isShaking ? 'scale-105' : ''}`}>
          <img
            src="/images/bucket.png"
            alt="Корзина"
            className="w-10 h-10 object-contain"
            style={isShaking ? { animation: 'shake 0.5s ease-in-out' } : {}}
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-red-600 leading-none">Крылышки</span>
            <span
              className={`text-xl font-black leading-none transition-all duration-200 ${isShaking ? 'scale-125 text-red-600' : 'text-black'}`}
              style={isShaking ? { animation: 'pulse 0.3s ease-in-out' } : {}}
            >
              {wingsCollected}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-white border-b-4 border-gray-200 shadow-lg rounded-3xl p-2 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase text-gray-400 leading-none">Ходы</span>
          <span className={`text-2xl font-black leading-none ${moves <= 5 ? 'text-red-600 animate-pulse' : 'text-black'}`}>
            {moves}
          </span>
        </div>

        <div className="flex-1 bg-red-600 border-b-4 border-red-800 shadow-lg rounded-3xl p-2 flex flex-col items-center justify-center text-white">
          <span className="text-[10px] font-bold uppercase opacity-80 leading-none">Счёт</span>
          <span className="text-xl font-black leading-none">{score.toLocaleString()}</span>
        </div>
      </div>

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md pointer-events-auto flex items-center justify-center z-50 p-6">
          <div ref={shareCardRef} className="bg-white border-8 border-red-600 rounded-[50px] p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-7xl mb-4 drop-shadow-lg">🍗🔥</div>
            <h2 className="text-4xl font-black text-red-600 mb-2 leading-tight uppercase italic">СМЕНА ОКОНЧЕНА!</h2>
            <p className="text-gray-500 font-bold mb-6 uppercase tracking-widest text-sm">Ты отлично поработал, шеф!</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-100 rounded-3xl p-4 border-b-4 border-gray-200">
                <div className="text-[10px] uppercase text-gray-500 font-black mb-1">Итоговый счёт</div>
                <div className="text-2xl font-black text-black">{score.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 rounded-3xl p-4 border-b-4 border-red-200">
                <div className="text-[10px] uppercase text-red-600 font-black mb-1">Собрано</div>
                <div className="text-2xl font-black text-red-600">{wingsCollected} 🍗</div>
              </div>
            </div>

            <div className="bg-red-600 text-white text-xs font-bold py-2 px-4 rounded-full mb-6 inline-block">
              КУХНЯ ROSTIC'S
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex-1 bg-white hover:bg-gray-50 text-red-600 font-black py-4 px-6 rounded-[20px] text-xl border-4 border-red-600 shadow-[0_6px_0_rgb(180,0,30)] transition-all active:translate-y-1 active:shadow-[0_2px_0_rgb(180,0,30)] uppercase italic disabled:opacity-50"
              >
                {isSharing ? '...' : '📤 ПОДЕЛИТЬСЯ'}
              </button>
              <button
                onClick={onReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-[20px] text-xl shadow-[0_6px_0_rgb(150,0,20)] transition-all active:translate-y-1 active:shadow-[0_2px_0_rgb(150,0,20)] uppercase italic"
              >
                🔄 ЕЩЁ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto w-full flex justify-center pb-2">
        <div className="bg-white/80 px-6 py-1 rounded-full border-2 border-red-600 text-red-600 font-black text-[10px] tracking-widest uppercase italic shadow-md">
            ТАК ВКУСНО, ЧТО ПАЛЬЧИКИ ОБЛИЖЕШЬ
        </div>
      </div>
    </div>
  );
};

export default Overlay;
