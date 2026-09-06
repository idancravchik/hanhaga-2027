import React, { useState, useEffect } from 'react';
import { Plus, X, Smartphone, RotateCw } from 'lucide-react';
import { kioskUtils } from '../utils/kioskUtils';

interface RegistrationScreenProps {
  onStartGame: (teamName: string, members: string[]) => void;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onStartGame }) => {
  const [teamName, setTeamName] = useState('');
  const [newMember, setNewMember] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsRotation, setNeedsRotation] = useState(false);

  // Check orientation change while waiting for rotation
  useEffect(() => {
    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (needsRotation && isLandscape) {
        setNeedsRotation(false);
        proceedToStart();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [needsRotation, teamName, members]);

  const handleAddMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (members.includes(trimmed)) return;
    setMembers((prev) => [...prev, trimmed]);
    setNewMember('');
    setError(null);
  };

  const handleRemoveMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const proceedToStart = async () => {
    await kioskUtils.requestFullscreen();
    await kioskUtils.requestWakeLock();
    onStartGame(teamName.trim(), members);
  };

  const handleStartClick = () => {
    if (!teamName.trim()) {
      setError('הזינו שם קבוצה');
      return;
    }
    if (members.length === 0) {
      setError('הוסיפו משתתף/ת');
      return;
    }

    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      // Prompt user to rotate to landscape before starting
      setNeedsRotation(true);
      return;
    }

    proceedToStart();
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none bg-[#70C1B3] flex items-center justify-center p-3 touch-none">
      {/* Cartoon Background SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <rect width="1000" height="600" fill="#87CEEB" />
        <circle cx="850" cy="90" r="50" fill="#FFD166" stroke="#222" strokeWidth="4" />
        <path d="M-50 500 Q 250 420, 550 480 T 1050 450 L 1050 600 L -50 600 Z" fill="#4CAF50" stroke="#222" strokeWidth="4" />
      </svg>

      {/* Rotation Prompt Overlay if they clicked start while in portrait */}
      {needsRotation && (
        <div className="fixed inset-0 z-50 bg-[#70C1B3] flex flex-col items-center justify-center p-4">
          <div className="bg-[#FFFDF0] border-6 border-black rounded-3xl p-6 text-center max-w-xs flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FFD166] border-4 border-black flex items-center justify-center mb-3 relative">
              <Smartphone className="w-8 h-8 text-black transform rotate-90" />
              <div className="absolute -bottom-1.5 -right-1.5 bg-[#FF6B35] rounded-full p-1 border-2 border-black">
                <RotateCw className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
            <h3 className="text-xl font-black text-black mb-1">
              סובבו את המכשיר לרוחב 🔄
            </h3>
            <button
              onClick={() => proceedToStart()}
              className="mt-3 text-xs font-bold text-black/60 underline"
            >
              המשך בכל זאת
            </button>
          </div>
        </div>
      )}

      {/* Registration Card (Flat, Compact, Zero Scroll) */}
      <div className="relative z-10 w-full max-w-md bg-[#FFFDF0] border-6 border-black rounded-3xl p-4 sm:p-5 flex flex-col justify-between max-h-[96vh]">
        <h1 className="text-2xl font-black text-black text-center mb-3">
          הרשמת קבוצה
        </h1>

        <div className="space-y-3 mb-3">
          {/* Team Name Input */}
          <div>
            <input
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="שם הקבוצה"
              className="w-full bg-white border-4 border-black rounded-xl px-3 py-2 text-black font-black text-base outline-none"
            />
          </div>

          {/* Member Input */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="text"
              value={newMember}
              onChange={(e) => {
                setNewMember(e.target.value);
                if (error) setError(null);
              }}
              placeholder="שם משתתף/ת"
              className="flex-1 bg-white border-4 border-black rounded-xl px-3 py-2 text-black font-black text-base outline-none"
            />
            <button
              type="submit"
              className="bg-[#FFD166] text-black border-4 border-black px-3.5 py-2 rounded-xl font-black cursor-pointer active:translate-y-0.5"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </form>

          {/* Chips list */}
          <div className="min-h-[44px] max-h-[64px] overflow-hidden bg-white border-4 border-black rounded-xl p-1.5 flex flex-wrap gap-1.5 items-center">
            {members.length === 0 ? (
              <span className="text-xs text-black/40 font-bold px-1">
                הוסיפו משתתפים
              </span>
            ) : (
              members.map((member, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-[#FFD166] border-2 border-black text-black text-xs font-black px-2 py-0.5 rounded-lg"
                >
                  <span>{member}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3 stroke-[3]" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="mb-2 bg-[#FF6B6B] border-2 border-black rounded-lg py-0.5 text-center text-xs font-black text-black">
            {error}
          </div>
        )}

        <button
          onClick={handleStartClick}
          className="w-full bg-[#4CAF50] hover:bg-[#43A047] active:translate-y-1 text-black font-black text-xl py-3 rounded-2xl border-4 border-black cursor-pointer select-none"
        >
          התחל
        </button>
      </div>
    </div>
  );
};
