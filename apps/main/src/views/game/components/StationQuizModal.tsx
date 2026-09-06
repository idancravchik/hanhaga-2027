import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, Check, ArrowLeft } from 'lucide-react';
import { Station } from '../constants/gameConstants';
import { soundEngine } from '../utils/audioUtils';

interface StationQuizModalProps {
  station: Station;
  onComplete: (stationId: string, earnedScore: number, answers: number[]) => void;
  onClose: () => void;
}

export const StationQuizModal: React.FC<StationQuizModalProps> = ({
  station,
  onComplete,
}) => {
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState<boolean>(false);

  const currentQuestion = station.questions[currentQIndex];

  const handleSelectOption = (optIndex: number) => {
    if (selectedOpt !== null) return; // Prevent double click
    setSelectedOpt(optIndex);
    soundEngine.playSuccessChime();

    const updatedAnswers = [...answers, optIndex];
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (currentQIndex < 2) {
        setCurrentQIndex((prev) => prev + 1);
        setSelectedOpt(null);
      } else {
        // Completed all 3 questions!
        triggerCompletion(updatedAnswers);
      }
    }, 450);
  };

  const triggerCompletion = (finalAnswers: number[]) => {
    setShowSuccessCheck(true);
    soundEngine.playStationComplete();

    // Fire confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2d6a4f', '#f77f00', '#ffb703', '#52b788'],
      });
    } catch (e) {
      // ignore
    }

    // Auto-return to navigation after celebration
    setTimeout(() => {
      onComplete(station.id, station.pointsPerQuestion * 3, finalAnswers);
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#1b4332] border-2 border-[#ffb703] rounded-3xl p-5 sm:p-7 shadow-2xl text-white overflow-hidden flex flex-col justify-between min-h-[420px]">
        
        {/* Animated Checkmark V Screen (כשעונים על כל 3 השאלות) */}
        {showSuccessCheck ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto animate-scaleUp">
            {/* Big Glowing Checkmark */}
            <div className="relative mb-6">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#52b788] to-[#ffb703] p-1.5 shadow-[0_0_50px_rgba(82,183,136,0.8)] animate-bounce" style={{ animationDuration: '2s' }}>
                <div className="w-full h-full rounded-full bg-[#1b4332] flex items-center justify-center">
                  <Check className="w-20 h-20 text-[#ffb703] stroke-[3.5]" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 text-4xl animate-spin" style={{ animationDuration: '6s' }}>
                ✨
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">
              מעולה! התחנה הושלמה!
            </h2>
            <p className="text-xl text-[#ffb703] font-bold mb-3">
              +300 נקודות לקבוצה! 🎉
            </p>
            <p className="text-sm text-emerald-200">
              חוזרים למסך הניווט וממשיכים לתחנה הבאה...
            </p>
          </div>
        ) : (
          <>
            {/* Header: Station info & Questions Progress */}
            <div>
              <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{station.emoji}</span>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">{station.name}</h2>
                    <span className="text-xs text-emerald-200">{station.subtitle}</span>
                  </div>
                </div>

                {/* Question Step Indicator */}
                <div className="flex items-center gap-1.5 bg-black/40 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold text-[#ffb703]">
                  <span>שאלה {currentQIndex + 1} מתוך 3</span>
                </div>
              </div>

              {/* Progress Bars for 3 questions */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx < currentQIndex
                        ? 'bg-[#ffb703]'
                        : idx === currentQIndex
                        ? 'bg-[#52b788] animate-pulse'
                        : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div className="my-auto py-2">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/10 mb-4">
                <div className="flex items-start gap-2.5">
                  <span className="bg-[#ffb703] text-[#1b4332] w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                    {currentQIndex + 1}
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white leading-snug">
                    {currentQuestion.text}
                  </p>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isChosen = selectedOpt === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={selectedOpt !== null}
                      className={`text-right p-3.5 rounded-xl font-bold text-sm sm:text-base border-2 transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-95 select-none ${
                        isChosen
                          ? 'bg-[#ffb703] text-[#1b4332] border-[#ffb703] shadow-lg scale-[1.02]'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-[#ffb703]/60'
                      }`}
                    >
                      <span>{opt}</span>
                      {isChosen ? (
                        <CheckCircle2 className="w-5 h-5 text-[#1b4332] shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/40 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom info banner */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#ffb703]" />
                ענו על 3 השאלות יחד כדי לקבל אישור תחנה
              </span>
              <span className="text-[#ffb703] font-bold">100 נקודות לכל שאלה</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
