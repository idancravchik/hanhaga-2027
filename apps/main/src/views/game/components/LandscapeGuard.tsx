import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface LandscapeGuardProps {
  children: React.ReactNode;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [forceBypass, setForceBypass] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('landscape_bypass') === 'true';
    } catch {
      return false;
    }
  });

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

  const handleDismiss = () => {
    setForceBypass(true);
    try {
      sessionStorage.setItem('landscape_bypass', 'true');
    } catch {
      // ignore
    }
  };

  if (isPortrait && !forceBypass) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landscape-guard-title"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#70C1B3] text-black p-6 select-none"
      >
        <div className="w-full max-w-sm bg-[#FFFDF0] border-6 border-black rounded-3xl p-6 text-center flex flex-col items-center shadow-[6px_6px_0px_#000]">
          <div className="w-20 h-20 rounded-2xl bg-[#FFD166] border-4 border-black flex items-center justify-center mb-4 relative">
            <Smartphone className="w-10 h-10 text-black transform rotate-90" />
            <div className="absolute -bottom-2 -right-2 bg-[#FF6B35] rounded-full p-1 border-2 border-black">
              <RotateCw className="w-4 h-4 text-black" />
            </div>
          </div>

          <h2 id="landscape-guard-title" className="text-2xl font-black mb-2 text-black">
            סובבו את המכשיר לרוחב! 🔄
          </h2>
          <p className="text-sm font-bold text-black/80 mb-5">
            חוויית המשחק המיטבית מותאמת למסך לרוחב. ניתן להמשיך גם במצב לאורך בכל עת.
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-[#FF6B35] hover:bg-[#e05624] text-white font-black rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all text-sm mb-2.5 cursor-pointer"
          >
            המשך במצב לאורך (או מסך מקובע) 📱
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-black/70 underline hover:text-black font-bold cursor-pointer py-1"
          >
            המכשיר כבר לרוחב? לחצו כאן
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
