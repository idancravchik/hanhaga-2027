import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Timer, Star, Users, RotateCcw, CheckCircle2, Award } from 'lucide-react';
import { GameSessionState } from '../hooks/useGameSession';
import { STATIONS } from '../constants/gameConstants';
import { soundEngine } from '../utils/audioUtils';

interface GameSummaryScreenProps {
  session: GameSessionState;
  onRestart: () => void;
}

function formatFinalTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins} דקות ו-${secs} שניות`;
}

export const GameSummaryScreen: React.FC<GameSummaryScreenProps> = ({
  session,
  onRestart,
}) => {
  useEffect(() => {
    soundEngine.playGameVictory();

    // Trigger double confetti blast
    const blast = () => {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#f77f00', '#ffb703', '#52b788', '#2d6a4f'],
        });
      } catch (e) {
        // ignore
      }
    };

    blast();
    const t = setTimeout(blast, 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] text-white flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none">
      {/* Cartoon Background Badges */}
      <div className="fixed top-2 left-6 text-8xl opacity-15 pointer-events-none animate-bounce" style={{ animationDuration: '5s' }}>
        🍊
      </div>
      <div className="fixed bottom-3 right-6 text-8xl opacity-15 pointer-events-none animate-pulse">
        🫒
      </div>
      <div className="fixed top-1/3 right-4 text-6xl opacity-15 pointer-events-none">
        🏆
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-black/35 backdrop-blur-xl border-2 border-[#ffb703] rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col items-center text-center my-auto">
        {/* Animated Trophy & Cartoon Citrus Crown */}
        <div className="relative mb-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#f77f00] to-[#ffb703] p-1.5 shadow-[0_0_50px_rgba(255,183,3,0.7)] flex items-center justify-center border-2 border-white/40 transform -rotate-2 animate-pulse">
            <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-[#1b4332] stroke-[2.2]" />
          </div>
          <div className="absolute -top-3 -right-3 text-3xl">🍊</div>
          <div className="absolute -bottom-2 -left-2 text-3xl">🫒</div>
        </div>

        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ffb703]/20 border border-[#ffb703]/40 text-[#ffb703] text-xs font-black uppercase tracking-wider mb-2">
          <Award className="w-4 h-4" /> מסע הניווט הושלם בהצלחה!
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 drop-shadow-md">
          אלופי פרדס חנה! 🎉
        </h1>
        <p className="text-lg sm:text-xl font-bold text-[#ffb703] mb-5">
          כל הכבוד לצוות {session.teamName || 'הניווט'}!
        </p>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Time Stat */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 flex flex-col items-center">
            <Timer className="w-6 h-6 text-[#ffb703] mb-1" />
            <span className="text-xs text-emerald-200">זמן כולל בשטח</span>
            <span className="text-lg sm:text-xl font-black text-white mt-1">
              {formatFinalTime(session.elapsedSeconds)}
            </span>
          </div>

          {/* Score Stat */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 flex flex-col items-center">
            <Star className="w-6 h-6 text-[#ffb703] mb-1" />
            <span className="text-xs text-emerald-200">ניקוד סופי</span>
            <span className="text-2xl font-black text-[#ffb703] mt-1">
              {session.totalScore}
            </span>
          </div>

          {/* Stations Stat */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-[#52b788] mb-1" />
            <span className="text-xs text-emerald-200">תחנות שנכבשו</span>
            <span className="text-lg sm:text-xl font-black text-white mt-1">
              {session.completedStationIds.length} מתוך {STATIONS.length}
            </span>
          </div>
        </div>

        {/* Members Pill Shelf */}
        {session.members.length > 0 && (
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-6 text-right">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold mb-2">
              <Users className="w-4 h-4 text-[#ffb703]" />
              <span>חברי וחברות הצוות:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.members.map((member, idx) => (
                <span
                  key={idx}
                  className="bg-[#f77f00]/30 border border-[#f77f00]/50 text-white text-xs font-bold px-3 py-1 rounded-full"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onRestart}
          className="bg-gradient-to-r from-[#f77f00] via-[#ffb703] to-[#f77f00] hover:brightness-110 active:scale-95 text-[#1b4332] font-black text-lg py-3 px-8 rounded-2xl shadow-xl border-2 border-white/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          <span>משחק חדש 🔄</span>
        </button>
      </div>
    </div>
  );
};
