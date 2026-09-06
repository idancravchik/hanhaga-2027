import React, { useState } from 'react';
import { Users, Plus, X, Sparkles, Compass, ShieldCheck } from 'lucide-react';
import { STATIONS } from '../constants/gameConstants';
import { soundEngine } from '../utils/audioUtils';
import { kioskUtils } from '../utils/kioskUtils';

interface RegistrationScreenProps {
  onStartGame: (teamName: string, members: string[]) => void;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onStartGame }) => {
  const [teamName, setTeamName] = useState('');
  const [newMember, setNewMember] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (members.includes(trimmed)) {
      setError('חבר/ה בשם זה כבר קיים ברשימה');
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setNewMember('');
    setError(null);
    soundEngine.playSuccessChime();
  };

  const handleRemoveMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStart = async () => {
    if (!teamName.trim()) {
      setError('נא להזין שם לקבוצה!');
      return;
    }
    if (members.length === 0) {
      setError('נא להוסיף לפחות משתתף אחד לקבוצה');
      return;
    }

    // Try engaging full screen and wake lock
    await kioskUtils.requestFullscreen();
    await kioskUtils.requestWakeLock();
    soundEngine.playStationComplete();

    onStartGame(teamName.trim(), members);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] text-white flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Cartoon Background Elements */}
      <div className="fixed top-2 left-6 text-7xl opacity-20 pointer-events-none select-none animate-bounce" style={{ animationDuration: '6s' }}>
        🍊
      </div>
      <div className="fixed bottom-3 right-6 text-7xl opacity-20 pointer-events-none select-none animate-pulse">
        🫒
      </div>
      <div className="fixed top-1/2 left-2 text-6xl opacity-15 pointer-events-none select-none">
        🌾
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-black/30 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col my-auto">
        {/* Header with Cartoon Badges */}
        <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#f77f00] to-[#ffb703] flex items-center justify-center text-3xl shadow-lg border-2 border-white/30 transform -rotate-3">
              🍊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#ffb703] text-[#1b4332] text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  מושבת פרדס חנה
                </span>
                <span className="text-xs text-emerald-200 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> ניווט שטח {STATIONS.length} תחנות
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide drop-shadow-md">
                הרפתקת הניווט בפרדסים
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-emerald-900/60 border border-emerald-400/30 px-3 py-1.5 rounded-xl text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-[#ffb703]" />
            <span>סשן מאובטח • אין אובדן נתונים</span>
          </div>
        </div>

        {/* Form Body - 2 Columns in Landscape */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Column 1: Team Name */}
          <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div>
              <label className="block text-sm font-bold text-[#ffb703] mb-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 1. שם הקבוצה שלכם
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="לדוגמה: נמרי הפרדס / סיירת התפוז"
                className="w-full bg-black/40 border-2 border-white/20 focus:border-[#ffb703] focus:ring-2 focus:ring-[#ffb703]/30 rounded-xl px-4 py-3 text-white placeholder-white/40 text-base font-semibold transition-all outline-none"
              />
            </div>

            <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed">
              🌲 <strong>איך המשחק עובד?</strong>
              <br />
              המפה המודפסת אצלכם ביד! רצים בין התחנות בפרדס חנה, סורקים את הברקוד באמצע המסך, עונים על 3 שאלות קצרות וצוברים נקודות!
            </div>
          </div>

          {/* Column 2: Members Dynamic List */}
          <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <label className="block text-sm font-bold text-[#ffb703] flex items-center gap-2">
              <Users className="w-4 h-4" /> 2. שמות חברי הצוות ({members.length})
            </label>

            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                value={newMember}
                onChange={(e) => {
                  setNewMember(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="שם משתתף/ת (למשל: דניאל)"
                className="flex-1 bg-black/40 border-2 border-white/20 focus:border-[#ffb703] rounded-xl px-3.5 py-2 text-white placeholder-white/40 text-sm font-medium outline-none"
              />
              <button
                type="submit"
                className="bg-[#2d6a4f] hover:bg-[#40916c] text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 border border-white/20 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> הוסף
              </button>
            </form>

            {/* Chips Container */}
            <div className="flex-1 min-h-[70px] max-h-[110px] overflow-y-auto flex flex-wrap gap-2 p-2 bg-black/20 rounded-xl border border-white/10">
              {members.length === 0 ? (
                <span className="text-xs text-white/40 m-auto">
                  הוסיפו את שמות החניכים/ות שמשחקים יחד
                </span>
              ) : (
                members.map((member, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-[#f77f00]/30 border border-[#f77f00]/60 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm"
                  >
                    <span>{member}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="hover:text-red-300 transition-colors p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/60 border border-red-500/50 rounded-xl text-red-200 text-sm font-bold text-center animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Big Launch Button */}
        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-[#f77f00] via-[#ffb703] to-[#f77f00] hover:brightness-110 active:scale-[0.98] text-[#1b4332] font-black text-xl py-3.5 px-6 rounded-2xl shadow-xl border-2 border-white/40 flex items-center justify-center gap-3 transition-all cursor-pointer select-none"
        >
          <span>יוצאים לדרך ומפעילים טיימר! 🚀</span>
        </button>
      </div>
    </div>
  );
};
