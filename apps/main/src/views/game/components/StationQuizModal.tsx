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
      setShowCheckmark(true);
      setTimeout(() => {
        onComplete(station.id, 300, nextAnswers);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 select-none touch-none">
      <div className="relative w-full max-w-lg bg-[#FFFDF0] border-6 border-black rounded-3xl p-4 overflow-hidden flex flex-col justify-between max-h-[96vh]">
        
        {/* CHECKMARK ANIMATION (כשעונים על 3 שאלות) */}
        {showCheckmark ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-28 h-28 rounded-full bg-[#4CAF50] border-6 border-black flex items-center justify-center mb-3 animate-bounce">
              <Check className="w-18 h-18 text-black stroke-[4]" />
            </div>
            <h2 className="text-3xl font-black text-black">
              מעולה!
            </h2>
          </div>
        ) : (
          <>
            {/* Header: Question Number */}
            <div className="flex items-center justify-between border-b-4 border-black pb-1.5 mb-2">
              <span className="text-sm font-black text-black">
                {station.name}
              </span>
              <span className="bg-[#FFD166] text-black border-2 border-black px-2.5 py-0.5 rounded-lg text-xs font-black">
                {currentQIndex + 1}/3
              </span>
            </div>

            {/* Question Text */}
            <div className="bg-white border-4 border-black rounded-xl p-2.5 mb-2.5 text-center">
              <p className="text-base sm:text-lg font-black text-black leading-snug">
                {currentQuestion.text}
              </p>
            </div>

            {/* 4 Options (2x2 Flat Grid, Zero Scroll) */}
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className="bg-white hover:bg-[#FFD166] active:translate-y-1 text-black font-black text-sm p-2.5 rounded-xl border-4 border-black cursor-pointer text-right transition-transform"
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
