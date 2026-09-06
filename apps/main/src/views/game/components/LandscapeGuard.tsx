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
      // If width < height and screen width is mobile/tablet size, it's portrait
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] text-white p-6 select-none">
        {/* Background decorative fruit & tree badges */}
        <div className="absolute -top-10 -right-10 text-8xl opacity-10 pointer-events-none">🍊</div>
        <div className="absolute -bottom-10 -left-10 text-8xl opacity-10 pointer-events-none">🫒</div>

        <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center">
          {/* Animated Rotating Phone Icon */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-pulse">
              <Smartphone className="w-12 h-12 text-[#ffb703] transition-transform duration-700 transform rotate-90" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#f77f00] rounded-full p-2 text-white shadow-lg animate-spin" style={{ animationDuration: '4s' }}>
              <RotateCw className="w-5 h-5" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-2 text-[#ffb703] drop-shadow-md">
            סובבו את המכשיר לרוחב! 🔄
          </h2>
          <p className="text-base sm:text-lg text-emerald-100 mb-6 leading-relaxed">
            משחק הניווט בפרדס חנה מעוצב לתצוגת רוחב חווייתית ואינטראקטיבית. סובבו את הטלפון כדי לצאת לדרך!
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <div className="px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-xs text-emerald-200">
              💡 טיפ: ודאו שסיבוב המסך האוטומטי בהגדרות הטלפון שלכם פעיל.
            </div>

            <button
              onClick={() => setForceBypass(true)}
              className="mt-2 text-xs text-emerald-300/80 underline hover:text-white transition-colors cursor-pointer"
            >
              המכשיר כבר לרוחב? לחצו כאן כדי להמשיך
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
