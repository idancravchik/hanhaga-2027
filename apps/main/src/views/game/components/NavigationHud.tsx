import React from 'react';
import { Camera } from 'lucide-react';
import { GameSessionState } from '../hooks/useGameSession';

interface NavigationHudProps {
  session: GameSessionState;
  onOpenScanner: () => void;
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  session,
  onOpenScanner,
}) => {
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none bg-[#87CEEB] flex flex-col items-center justify-between p-3 touch-none">
      {/* Cartoon Illustrated Vector Background (Flat Orchard & Hills) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        {/* Sky */}
        <rect width="1000" height="600" fill="#87CEEB" />

        {/* Cartoon Sun */}
        <circle cx="120" cy="90" r="50" fill="#FFD166" stroke="#222" strokeWidth="4" />
        <line x1="120" y1="20" x2="120" y2="35" stroke="#222" strokeWidth="4" />
        <line x1="120" y1="145" x2="120" y2="160" stroke="#222" strokeWidth="4" />
        <line x1="50" y1="90" x2="65" y2="90" stroke="#222" strokeWidth="4" />
        <line x1="175" y1="90" x2="190" y2="90" stroke="#222" strokeWidth="4" />

        {/* Cartoon Clouds */}
        <path
          d="M300 100 q20 -30 50 -10 q30 -30 60 0 q30 -10 40 20 q10 30 -20 30 h-110 q-30 0 -20 -40 z"
          fill="#FFFFFF"
          stroke="#222"
          strokeWidth="4"
        />
        <path
          d="M720 80 q25 -30 55 -5 q35 -25 65 5 q25 -5 35 25 q5 25 -25 25 h-110 q-30 0 -20 -50 z"
          fill="#FFFFFF"
          stroke="#222"
          strokeWidth="4"
        />

        {/* Distant Hills */}
        <path
          d="M-50 480 Q 200 320, 500 420 T 1050 380 L 1050 600 L -50 600 Z"
          fill="#70C1B3"
          stroke="#222"
          strokeWidth="4"
        />
        {/* Foreground Hills */}
        <path
          d="M-50 520 Q 300 410, 700 480 T 1050 440 L 1050 600 L -50 600 Z"
          fill="#4CAF50"
          stroke="#222"
          strokeWidth="4"
        />

        {/* Cartoon Citrus Tree (Left) */}
        <rect x="140" y="420" width="22" height="70" fill="#8D6E63" stroke="#222" strokeWidth="4" />
        <circle cx="151" cy="390" r="55" fill="#2E7D32" stroke="#222" strokeWidth="4" />
        <circle cx="130" cy="370" r="10" fill="#FF6B35" stroke="#222" strokeWidth="3" />
        <circle cx="170" cy="385" r="11" fill="#FF6B35" stroke="#222" strokeWidth="3" />
        <circle cx="145" cy="410" r="10" fill="#FF6B35" stroke="#222" strokeWidth="3" />

        {/* Cartoon Olive Tree (Right) */}
        <rect x="820" y="410" width="26" height="80" fill="#6D4C41" stroke="#222" strokeWidth="4" />
        <path
          d="M 833 340 C 770 340, 770 410, 833 410 C 896 410, 896 340, 833 340 Z"
          fill="#558B2F"
          stroke="#222"
          strokeWidth="4"
        />
        <ellipse cx="815" cy="380" rx="6" ry="9" fill="#33691E" stroke="#222" strokeWidth="2" />
        <ellipse cx="850" cy="370" rx="6" ry="9" fill="#33691E" stroke="#222" strokeWidth="2" />

        {/* Cartoon Fence */}
        <path d="M 30 510 L 970 510 M 30 535 L 970 535" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M 60 495 L 60 550 M 160 495 L 160 550 M 260 495 L 260 550 M 360 495 L 360 550 M 640 495 L 640 550 M 740 495 L 740 550 M 840 495 L 840 550 M 940 495 L 940 550" stroke="#FFFFFF" strokeWidth="6" />
      </svg>

      {/* 1. THE TIMER (Top, Flat Comic Card, Zero extra text) */}
      <div className="relative z-10 mt-1 bg-[#FFFDF0] border-4 border-black px-6 py-1.5 rounded-2xl flex items-center">
        <span className="font-mono text-2xl sm:text-3xl font-black text-black tracking-widest">
          {formatTimer(session.elapsedSeconds)}
        </span>
      </div>

      {/* 2. THE BUTTON IN THE MIDDLE (Flat Cartoon Barcode/QR Button) */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <button
          onClick={onOpenScanner}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#FF6B35] hover:bg-[#FF8552] active:translate-y-1 active:scale-95 border-6 border-black flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
        >
          <Camera className="w-16 h-16 sm:w-20 sm:h-20 text-black stroke-[2.5]" />
          <span className="text-black font-black text-xl sm:text-2xl leading-none">
            סרוק ברקוד
          </span>
        </button>
      </div>

      {/* Bottom spacing anchor */}
      <div className="h-2 relative z-10" />
    </div>
  );
};
