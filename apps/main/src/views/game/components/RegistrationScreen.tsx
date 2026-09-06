import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
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
      setError('חבר/ה כבר ברשימה');
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setNewMember('');
    setError(null);
  };

  const handleRemoveMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStart = async () => {
    if (!teamName.trim()) {
      setError('נא להזין שם לקבוצה');
      return;
    }
    if (members.length === 0) {
      setError('נא להוסיף לפחות משתתף אחד');
      return;
    }

    await kioskUtils.requestFullscreen();
    await kioskUtils.requestWakeLock();

    onStartGame(teamName.trim(), members);
  };

  return (
    <div className="w-screen h-screen overflow-hidden select-none bg-[#70C1B3] flex items-center justify-center p-4">
      {/* Cartoon Background Elements (Flat SVG) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <rect width="1000" height="600" fill="#87CEEB" />
        <circle cx="900" cy="80" r="50" fill="#FFD166" stroke="#222" strokeWidth="4" />
        <path d="M-50 500 Q 250 420, 550 480 T 1050 450 L 1050 600 L -50 600 Z" fill="#4CAF50" stroke="#222" strokeWidth="4" />
      </svg>

      {/* Flat Cartoon Registration Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#FFFDF0] border-6 border-black rounded-3xl p-5 flex flex-col justify-between max-h-[92vh]">
        
        {/* Title */}
        <div className="text-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-black text-black">
            משחק ניווט פרדס חנה 🍊
          </h1>
        </div>

        {/* 2-Column Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          {/* Team Name */}
          <div className="flex flex-col">
            <label className="text-sm font-black text-black mb-1">
              שם הקבוצה:
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="הקלידו שם קבוצה"
              className="w-full bg-white border-4 border-black rounded-xl px-3 py-2 text-black font-bold text-base outline-none"
            />
          </div>

          {/* Members Input */}
          <div className="flex flex-col">
            <label className="text-sm font-black text-black mb-1">
              שמות המשתתפים:
            </label>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                value={newMember}
                onChange={(e) => {
                  setNewMember(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="שם משתתף/ת"
                className="flex-1 bg-white border-4 border-black rounded-xl px-3 py-2 text-black font-bold text-base outline-none"
              />
              <button
                type="submit"
                className="bg-[#FFD166] hover:bg-[#F4A261] active:translate-y-0.5 text-black border-4 border-black px-4 py-2 rounded-xl font-black text-base cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
              </button>
            </form>
          </div>
        </div>

        {/* Members List Chips (Flat, No Overflow Scroll) */}
        <div className="min-h-[48px] max-h-[70px] overflow-hidden bg-white border-4 border-black rounded-xl p-2 flex flex-wrap gap-2 items-center mb-3">
          {members.length === 0 ? (
            <span className="text-xs font-bold text-black/50">
              עדיין לא הוספתם שמות משתתפים
            </span>
          ) : (
            members.map((member, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-[#FFD166] border-2 border-black text-black text-xs font-black px-2.5 py-0.5 rounded-lg"
              >
                <span>{member}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(idx)}
                  className="hover:text-red-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-2 bg-[#FF6B6B] border-3 border-black rounded-xl p-1 text-center text-xs font-black text-black">
            {error}
          </div>
        )}

        {/* Start Game Button */}
        <button
          onClick={handleStart}
          className="w-full bg-[#4CAF50] hover:bg-[#43A047] active:translate-y-1 text-black font-black text-xl py-3 rounded-2xl border-4 border-black cursor-pointer transition-transform select-none"
        >
          התחל משחק 🚀
        </button>
      </div>
    </div>
  );
};
