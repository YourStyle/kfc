
import React from 'react';

interface OverlayProps {
  score: number;
  moves: number;
  isGameOver: boolean;
  onReset: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ score, moves, isGameOver, onReset }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 select-none">
      {/* Top Header */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        <div className="bg-red-600 border-4 border-white shadow-xl rounded-xl px-6 py-2 text-white">
          <div className="text-sm font-bold uppercase tracking-widest">Score</div>
          <div className="text-3xl font-black">{score.toLocaleString()}</div>
        </div>

        <div className="flex flex-col items-center">
            <div className="bg-white px-4 py-1 rounded-full text-red-600 font-black shadow-lg mb-2">
                KFC KITCHEN
            </div>
        </div>

        <div className="bg-white border-4 border-red-600 shadow-xl rounded-xl px-6 py-2 text-red-600">
          <div className="text-sm font-bold uppercase tracking-widest">Moves</div>
          <div className="text-3xl font-black">{moves}</div>
        </div>
      </div>

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto flex items-center justify-center z-50">
          <div className="bg-white border-8 border-red-600 rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-black text-red-600 mb-2">GAME OVER!</h2>
            <p className="text-gray-600 text-lg mb-8">You cooked a feast!</p>
            
            <div className="bg-gray-100 rounded-2xl p-6 mb-8">
                <div className="text-sm uppercase text-gray-500 font-bold mb-1">Final Score</div>
                <div className="text-5xl font-black text-black">{score.toLocaleString()}</div>
            </div>

            <button 
              onClick={onReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 px-8 rounded-2xl text-2xl shadow-lg transition-transform active:scale-95 transform"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Decoration */}
      <div className="w-full flex justify-center mt-auto pointer-events-none">
        <div className="bg-red-600 h-2 w-32 rounded-full opacity-50 mb-4"></div>
      </div>
    </div>
  );
};

export default Overlay;
