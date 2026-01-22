
import React, { useState } from 'react';
import { TUTORIAL_STEPS } from '../constants';

interface OverlayProps {
  score: number;
  moves: number;
  wingsCollected: number;
  isGameOver: boolean;
  onReset: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ score, moves, wingsCollected, isGameOver, onReset }) => {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);

  const nextStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
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
          КУХНЯ KFC
        </div>
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-md flex justify-between items-stretch gap-2 pointer-events-auto">
        <div className="flex-1 bg-white border-b-4 border-gray-200 shadow-lg rounded-3xl p-2 flex items-center justify-center gap-2">
          <div className="text-3xl">🧺</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-red-600 leading-none">Крылышки</span>
            <span className="text-xl font-black text-black leading-none">{wingsCollected}</span>
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
          <div className="bg-white border-8 border-red-600 rounded-[50px] p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-7xl mb-4 drop-shadow-lg">🍗🔥</div>
            <h2 className="text-5xl font-black text-red-600 mb-2 leading-tight uppercase italic">СМЕНА ОКОНЧЕНА!</h2>
            <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-sm">Ты отлично поработал, шеф!</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-gray-100 rounded-3xl p-4 border-b-4 border-gray-200">
                <div className="text-[10px] uppercase text-gray-500 font-black mb-1">Итоговый счёт</div>
                <div className="text-2xl font-black text-black">{score.toLocaleString()}</div>
              </div>
              <div className="bg-red-50 rounded-3xl p-4 border-b-4 border-red-200">
                <div className="text-[10px] uppercase text-red-600 font-black mb-1">Собрано</div>
                <div className="text-2xl font-black text-red-600">{wingsCollected} 🍗</div>
              </div>
            </div>

            <button 
              onClick={onReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 px-8 rounded-[30px] text-3xl shadow-[0_10px_0_rgb(180,0,30)] transition-all active:translate-y-2 active:shadow-none uppercase italic tracking-tighter"
            >
              НОВЫЙ ЗАКАЗ
            </button>
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
