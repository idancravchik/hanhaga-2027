import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface LandscapeGuardProps {
  children: React.ReactNode;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [forceBypass, setForceBypass] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortrait && !forceBypass) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#70C1B3] text-black p-6 select-none">
        <div className="w-full max-w-sm bg-[#FFFDF0] border-6 border-black rounded-3xl p-6 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-[#FFD166] border-4 border-black flex items-center justify-center mb-4 relative">
            <Smartphone className="w-10 h-10 text-black transform rotate-90" />
            <div className="absolute -bottom-2 -right-2 bg-[#FF6B35] rounded-full p-1 border-2 border-black">
              <RotateCw className="w-4 h-4 text-black" />
            </div>
          </div>

          <h2 className="text-2xl font-black mb-2 text-black">
            סובבו את המכשיר לרוחב! 🔄
          </h2>
          <p className="text-sm font-bold text-black/80 mb-5">
            המשחק מעוצב לתצוגת רוחב ללא גלילה.
          </p>

          <button
            onClick={() => setForceBypass(true)}
            className="text-xs text-black/60 underline hover:text-black font-bold cursor-pointer"
          >
            המכשיר כבר לרוחב? לחצו כאן
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
