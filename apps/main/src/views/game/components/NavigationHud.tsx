import React, { useState } from 'react';
import {
  Camera,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  LogOut,
  Maximize2,
  Users,
  Compass,
} from 'lucide-react';
import { Station, STATIONS } from '../constants/gameConstants';
import { GameSessionState } from '../hooks/useGameSession';
import { soundEngine } from '../utils/audioUtils';
import { kioskUtils } from '../utils/kioskUtils';

interface NavigationHudProps {
  session: GameSessionState;
  onOpenScanner: () => void;
  onManualSelectStation?: (stationId: string) => void;
  onFinishGame: () => void;
  onResetGame: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  session,
  onOpenScanner,
  onFinishGame,
  onResetGame,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const completedCount = session.completedStationIds.length;
  const totalStations = STATIONS.length;
  const progressPercent = Math.round((completedCount / totalStations) * 100);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#1b4332] text-white flex flex-col overflow-hidden select-none p-2 sm:p-4">
      {/* Background Ornaments */}
      <div className="fixed -bottom-10 -left-10 text-9xl opacity-10 pointer-events-none">🍊</div>
      <div className="fixed -top-10 -right-10 text-9xl opacity-10 pointer-events-none">🫒</div>

      {/* TOP HUD BAR */}
      <header className="relative z-10 w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-xl shrink-0">
        {/* Left: Team Info & Members */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f77f00] to-[#ffb703] flex items-center justify-center text-2xl shadow-md border border-white/20">
            🍊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {session.teamName || 'קבוצת הניווט'}
              </h2>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full text-emerald-200 hidden sm:inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {session.members.length} משתתפים
              </span>
            </div>
            <div className="text-xs text-emerald-300 font-medium">
              ניווט שטח פרדס חנה • מפה פיזית ביד
            </div>
          </div>
        </div>

        {/* Center: Live Timer & Progress */}
        <div className="flex items-center gap-4 bg-black/30 px-4 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 text-[#ffb703]">
            <Timer className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-xl sm:text-2xl font-black tracking-wider">
              {formatTime(session.elapsedSeconds)}
            </span>
          </div>

          <div className="h-6 w-px bg-white/20" />

          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ffb703]" />
            <span className="font-black text-lg sm:text-xl text-white">
              {session.totalScore} <span className="text-xs font-normal text-emerald-200">נקודות</span>
            </span>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => kioskUtils.requestFullscreen()}
            title="מסך מלא"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-emerald-200 hover:text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            title={isMuted ? 'הפעל צלילים' : 'השתק צלילים'}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-emerald-200 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowExitConfirm(true)}
            title="סיום או יציאה"
            className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 flex items-center justify-center transition-colors cursor-pointer text-red-200 hover:text-red-100"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN PLAYING AREA (Split into Center Action and Stations Shelf) */}
      <main className="relative z-10 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-3 py-3 overflow-hidden">
        
        {/* Center Scanner Action Panel (7 Cols in Landscape) */}
        <div className="md:col-span-7 bg-black/25 backdrop-blur-md border border-white/15 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
          {/* Subtle nature pattern in center */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb703]/20 border border-[#ffb703]/40 text-[#ffb703] text-xs font-bold mb-2">
              <Compass className="w-3.5 h-3.5" /> נווטו עם המפה הפיזית
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              הגעתם לתחנה בפרדס חנה?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200 max-w-sm mt-1">
              חפשו את קוד ה-QR המוצב בנקודה, לחצו על הכפתור וסרקו אותו כדי לפתוח את 3 השאלות!
            </p>
          </div>

          {/* Giant Pulsating Center Scanner Button */}
          <div className="relative my-2">
            {/* Outer animated ripple rings */}
            <div className="absolute inset-0 rounded-full bg-[#ffb703]/20 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#f77f00] to-[#ffb703] opacity-40 blur-lg animate-pulse" />

            <button
              onClick={onOpenScanner}
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#f77f00] via-[#ffb703] to-[#f77f00] p-1.5 shadow-[0_0_40px_rgba(247,127,0,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-[#1b4332] group select-none border-4 border-white/40"
            >
              <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 p-2 text-center group-hover:bg-white/30 transition-all">
                <Camera className="w-10 h-10 sm:w-14 sm:h-14 text-[#1b4332] stroke-[2.2] group-hover:scale-110 transition-transform" />
                <span className="font-black text-sm sm:text-base leading-tight">
                  סריקת תחנה
                </span>
                <span className="text-[10px] font-bold text-[#1b4332]/80 uppercase tracking-wider">
                  QR SCANNER
                </span>
              </div>
            </button>
          </div>

          {/* Quick status under scanner */}
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-200 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <span>הושלמו {completedCount} מתוך {totalStations} תחנות ({progressPercent}%)</span>
          </div>
        </div>

        {/* Stations Shelf / List (5 Cols in Landscape) */}
        <div className="md:col-span-5 bg-black/25 backdrop-blur-md border border-white/15 rounded-3xl p-3 sm:p-4 flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/15 shrink-0">
            <h4 className="text-sm font-black text-[#ffb703] flex items-center gap-1.5">
              <span>📍 תחנות הניווט במסלול</span>
              <span className="text-[11px] font-normal text-white/60">(סדר חופשי)</span>
            </h4>
            <span className="text-xs font-bold text-emerald-300">
              {completedCount}/{totalStations}
            </span>
          </div>

          {/* Overall Progress Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full mb-3 overflow-hidden shrink-0 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#52b788] via-[#ffb703] to-[#f77f00] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stations Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {STATIONS.map((station, index) => {
              const isCompleted = session.completedStationIds.includes(station.id);
              return (
                <div
                  key={station.id}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    isCompleted
                      ? 'bg-[#52b788]/20 border-[#52b788]/50 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-2xl shrink-0">{station.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black truncate text-white">
                        {index + 1}. {station.name}
                      </div>
                      <div className="text-[11px] text-white/60 truncate">
                        {station.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 bg-[#52b788] text-[#1b4332] text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" /> הושלם
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-white/10 text-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                        <Clock className="w-3 h-3 text-[#ffb703]" /> ממתין
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finish Button if all stations are done or team finished */}
          <div className="pt-2 border-t border-white/15 shrink-0">
            {completedCount === totalStations ? (
              <button
                onClick={onFinishGame}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#ffb703] to-[#f77f00] text-[#1b4332] font-black text-sm rounded-xl shadow-lg border border-white/30 animate-pulse hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>סיימתם את כל התחנות! לחצו לסיכום 🏆</span>
              </button>
            ) : (
              <div className="text-center text-[11px] text-emerald-300/80">
                נווטו לכל נקודה וסרקו את הקוד כדי להשלים את המשחק
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Exit / Reset Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#1b4332] border-2 border-red-400/50 rounded-3xl p-5 max-w-sm w-full text-center text-white shadow-2xl">
            <h3 className="text-lg font-black mb-2 text-[#ffb703]">
              האם לסיים את המשחק?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200 mb-4 leading-relaxed">
              ההתקדמות והזמן שלכם נשמרים תמיד! תוכלו לעבור למסך הסיכום או לאפס את המשחק ולהתחיל מחדש.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onFinishGame();
                }}
                className="w-full py-2 bg-[#ffb703] text-[#1b4332] font-black text-sm rounded-xl cursor-pointer hover:bg-white transition-colors"
              >
                עבור למסך סיכום המשחק 📊
              </button>

              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onResetGame();
                }}
                className="w-full py-2 bg-red-600/60 hover:bg-red-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                איפוס משחק והתחלה מחדש 🔄
              </button>

              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                המשך לשחק ➡️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
