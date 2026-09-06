import React from 'react';
import { GameSessionState } from '../hooks/useGameSession';

interface GameSummaryScreenProps {
  session: GameSessionState;
  onRestart: () => void;
}

function formatFinalTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const GameSummaryScreen: React.FC<GameSummaryScreenProps> = ({
  session,
  onRestart,
}) => {
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none bg-[#70C1B3] flex items-center justify-center p-3 touch-none">
      {/* Cartoon Background Elements (Flat SVG) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <rect width="1000" height="600" fill="#87CEEB" />
        <circle cx="150" cy="100" r="50" fill="#FFD166" stroke="#222" strokeWidth="4" />
        <path d="M-50 500 Q 250 420, 550 480 T 1050 450 L 1050 600 L -50 600 Z" fill="#4CAF50" stroke="#222" strokeWidth="4" />
      </svg>

      {/* Flat Cartoon Summary Card */}
      <div className="relative z-10 w-full max-w-sm bg-[#FFFDF0] border-6 border-black rounded-3xl p-5 text-center flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl font-black text-black mb-3">
          סיום המשחק 🏁
        </h1>

        <div className="w-full grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white border-4 border-black rounded-xl p-2.5 flex flex-col items-center">
            <span className="text-xs font-black text-black">זמן</span>
            <span className="font-mono text-2xl font-black text-black">
              {formatFinalTime(session.elapsedSeconds)}
            </span>
          </div>

          <div className="bg-white border-4 border-black rounded-xl p-2.5 flex flex-col items-center">
            <span className="text-xs font-black text-black">ניקוד</span>
            <span className="font-mono text-2xl font-black text-[#FF6B35]">
              {session.totalScore}
            </span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="bg-[#FFD166] hover:bg-[#F4A261] active:translate-y-1 text-black font-black text-base py-2 px-6 rounded-xl border-4 border-black cursor-pointer select-none"
        >
          משחק חדש 🔄
        </button>
      </div>
    </div>
  );
};
