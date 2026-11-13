import React from 'react';
import { Plus, Eye, EyeOff, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { Exam } from '@/types/exam';

export interface AdminExamsViewProps {
    exams: Exam[];
    onOpenAddExam: () => void;
    onEditExam: (exam: Exam) => void;
    onDeleteExam: (exam: Exam) => Promise<void>;
    onToggleExamVisibility: (exam: Exam) => Promise<void>;
    onToggleStudentVisibility: (exam: Exam) => Promise<void>;
    onToggleVerbalOnly: (exam: Exam) => Promise<void>;
}

export const AdminExamsView: React.FC<AdminExamsViewProps> = ({
    exams,
    onOpenAddExam,
    onEditExam,
    onDeleteExam,
    onToggleExamVisibility,
    onToggleStudentVisibility,
    onToggleVerbalOnly,
}) => {
    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center justify-between bg-white p-6 rounded-[24px] border border-[#dadce0]">
                <div>
                    <h3 className="text-[20px] font-medium text-[#202124]">ניהול מבחנים והערכות ({exams.length})</h3>
                    <p className="text-[12px] text-[#5f6368] font-normal">הגדרת מבחנים, משקלים (סכום 100), חשיפה לצוות ולחניכים</p>
                </div>
                <button
                    onClick={onOpenAddExam}
                    className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] flex items-center gap-1.5 transition-all shrink-0"
                >
                    <Plus size={16} /> צור מבחן חדש
                </button>
            </div>

            <div className="bg-white rounded-[24px] overflow-hidden border border-[#dadce0]">
                <div className="divide-y divide-[#dadce0]">
                    {exams.length === 0 ? (
                        <div className="p-8 text-center text-[#5f6368] text-[14px] font-normal">
                            אין מבחנים במערכת. לחץ על "צור מבחן חדש" כדי להתחיל.
                        </div>
                    ) : (
                        exams.map((exam) => (
                            <div
                                key={exam.id}
                                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f8f9fa] transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-[16px] text-[#202124] flex items-center gap-2 flex-wrap">
                                        <span>{exam.title}</span>
                                        {exam.showVerbalOnly && (
                                            <span className="text-[11px] bg-[#f8f9fa] text-[#3c4043] border border-[#dadce0] px-2.5 py-0.5 rounded-full font-normal">
                                                לחניכים: הערכה מילולית בלבד
                                            </span>
                                        )}
                                    </h4>
                                    <div className="text-[12px] text-[#5f6368] font-normal mt-1 truncate">
                                        קטגוריות: {(exam.categories || []).map((c) => `${c.name} (${c.maxScore ?? c.max ?? 100} נק')`).join(', ')}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => onToggleExamVisibility(exam)}
                                        className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                            exam.isVisible ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                                        }`}
                                        title="פתיחת/הסתרת הזנת ציונים לצוות"
                                    >
                                        {exam.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {exam.isVisible ? 'צוות: פתוח' : 'צוות: מוסתר'}
                                    </button>

                                    <button
                                        onClick={() => onToggleStudentVisibility(exam)}
                                        className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                            exam.isStudentVisible ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                                        }`}
                                        title="חשיפת ציונים לחניכים"
                                    >
                                        {exam.isStudentVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                        {exam.isStudentVisible ? 'חניכים: גלוי' : 'חניכים: מוסתר'}
                                    </button>

                                    <button
                                        onClick={() => onToggleVerbalOnly(exam)}
                                        className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                            exam.showVerbalOnly
                                                ? 'bg-[#f8f9fa] text-[#3c4043] border border-[#dadce0]'
                                                : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                                        }`}
                                        title="הצגת הערכה מילולית בלבד לחניכים"
                                    >
                                        <MessageSquare size={14} />
                                        {exam.showVerbalOnly ? 'מילולי בלבד' : 'ציון + מילולי'}
                                    </button>

                                    <button
                                        onClick={() => onEditExam(exam)}
                                        className="p-2 hover:bg-[#f8f9fa] text-[#5f6368] hover:text-[#202124] rounded-full transition-colors"
                                        title="ערוך מבחן"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteExam(exam)}
                                        className="p-2 hover:bg-[#fce8e6] text-[#d93025] rounded-full transition-colors"
                                        title="מחק מבחן"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
