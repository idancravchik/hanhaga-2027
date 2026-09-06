import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Station } from '../constants/gameConstants';

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
  const [showCheckmark, setShowCheckmark] = useState<boolean>(false);

  const currentQuestion = station.questions[currentQIndex];

  const handleSelectOption = (optIndex: number) => {
    const nextAnswers = [...answers, optIndex];
    setAnswers(nextAnswers);

    if (currentQIndex < 2) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Completed 3 questions! Show checkmark animation
      setShowCheckmark(true);
      setTimeout(() => {
        onComplete(station.id, 300, nextAnswers);
      }, 1600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 select-none">
      {/* Flat Cartoon Modal Box */}
      <div className="relative w-full max-w-xl bg-[#FFFDF0] border-6 border-black rounded-3xl p-5 overflow-hidden flex flex-col justify-between max-h-[92vh]">
        
        {/* CHECKMARK ANIMATION (כשעונים על 3 שאלות) */}
        {showCheckmark ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            {/* Big Flat Animated Checkmark V */}
            <div className="w-32 h-32 rounded-full bg-[#4CAF50] border-6 border-black flex items-center justify-center mb-4 animate-bounce">
              <Check className="w-20 h-20 text-black stroke-[4]" />
            </div>
            <h2 className="text-3xl font-black text-black">
              התחנה הושלמה!
            </h2>
          </div>
        ) : (
          <>
            {/* Header: Station Name & Question Step */}
            <div className="flex items-center justify-between border-b-4 border-black pb-2 mb-3">
              <span className="text-base sm:text-lg font-black text-black truncate">
                {station.name}
              </span>
              <span className="bg-[#FFD166] text-black border-2 border-black px-3 py-0.5 rounded-xl text-xs sm:text-sm font-black shrink-0">
                שאלה {currentQIndex + 1} מתוך 3
              </span>
            </div>

            {/* Question Text */}
            <div className="bg-white border-4 border-black rounded-2xl p-3 mb-3 text-center">
              <p className="text-base sm:text-lg font-black text-black leading-snug">
                {currentQuestion.text}
              </p>
            </div>

            {/* 4 Options Grid (Flat Buttons) */}
            <div className="grid grid-cols-2 gap-2.5">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className="bg-white hover:bg-[#FFD166] active:translate-y-1 text-black font-black text-sm sm:text-base p-3 rounded-2xl border-4 border-black cursor-pointer transition-transform text-right"
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
