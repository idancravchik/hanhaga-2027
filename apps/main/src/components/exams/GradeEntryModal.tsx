import React, { useState, useEffect } from 'react';
import { X, Award, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { Exam, GradeRecord } from '@/types/exam';
import { UserProfile } from '@/types/user';
import { calculateTotalScore } from '@/utils/exams';

interface GradeEntryModalProps {
    exam: Exam;
    student: UserProfile;
    existingGrade?: GradeRecord | null;
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const GradeEntryModal: React.FC<GradeEntryModalProps> = ({
    exam,
    student,
    existingGrade,
    onClose,
    showToast,
}) => {
    const [scores, setScores] = useState<Record<string, number>>(() => {
        if (existingGrade?.scores) return { ...existingGrade.scores };
        const initial: Record<string, number> = {};
        exam.categories.forEach((cat) => {
            initial[cat.name] = 0;
        });
        return initial;
    });

    const [verbalComment, setVerbalComment] = useState(existingGrade?.verbalComment || '');
    const [loading, setLoading] = useState(false);

    const totalScore = calculateTotalScore(scores);

    const handleScoreChange = (catName: string, maxScore: number, value: string) => {
        let num = Number(value);
        if (isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > maxScore) num = maxScore;

        setScores((prev) => ({ ...prev, [catName]: num }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const studentId = student.id || student.phone || '';
        const gradeKey = `${studentId}_${exam.id}`;

        const payload: GradeRecord = {
            id: gradeKey,
            studentId,
            examId: exam.id,
            scores,
            verbalComment: verbalComment.trim(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', gradeKey), payload, { merge: true });
            showToast(`הציון והערכת החניך (${student.name}) נשמרו בהצלחה!`);
            setLoading(false);
            onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בשמירת הציון: ${err?.message || err}`, 'error');
        }
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#202124]/50" dir="rtl">
            <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-[480px] p-5 sm:p-6 relative text-right text-[#202124] max-h-[90vh] overflow-y-auto" dir="rtl">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="סגור חלון"
                    className="absolute top-6 left-6 p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-medium border border-[#dadce0]">
                        <Award size={18} />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-medium text-[#202124]">הזנת ציון והערכה</h2>
                        <p className="text-[12px] text-[#5f6368] font-normal">
                            {student.name} • {exam.title}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Categories Scoring */}
                    <div className="space-y-3">
                        <label className="text-[13px] font-medium text-[#3c4043] block">ציונים לפי קטגוריות</label>
                        {exam.categories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                                <div>
                                    <div className="font-medium text-[13px] text-[#202124]">{cat.name}</div>
                                    <div className="text-[11px] text-[#5f6368]">מקסימום: {cat.maxScore} נקודות</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max={cat.maxScore}
                                        value={scores[cat.name] !== undefined ? scores[cat.name] : ''}
                                        onChange={(e) => handleScoreChange(cat.name, cat.maxScore, e.target.value)}
                                        className="w-16 h-9 px-2 border border-[#dadce0] rounded text-center font-medium text-[13px] bg-white text-[#202124] focus:border-[#1a73e8] outline-none"
                                        required
                                    />
                                    <span className="text-[12px] font-normal text-[#5f6368]">/ {cat.maxScore}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Score Summary */}
                    <div className="p-3 bg-[#e8f0fe] rounded-lg border border-[#dadce0] flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#1a73e8]">סך ציון משוקלל:</span>
                        <span className="text-[18px] font-medium text-[#1a73e8]">{totalScore} / 100</span>
                    </div>

                    {/* Verbal Evaluation */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-[#1a73e8]" />
                            הערכה מילולית ומשוב אישי
                        </label>
                        <textarea
                            rows={3}
                            value={verbalComment}
                            onChange={(e) => setVerbalComment(e.target.value)}
                            placeholder="רשום חוות דעת מפורטת, נקודות לשימור ולשיפור עבור החניך..."
                            className="w-full p-3 border border-[#dadce0] rounded text-[13px] font-normal bg-white text-[#202124] outline-none focus:border-[#1a73e8] transition-all resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#dadce0]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-5 text-[#3c4043] font-medium bg-[#f1f3f4] hover:bg-[#e8eaed] rounded-full transition-all text-[14px]"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all disabled:opacity-50"
                        >
                            {loading ? 'שומר...' : 'שמור ציון והערכה'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
