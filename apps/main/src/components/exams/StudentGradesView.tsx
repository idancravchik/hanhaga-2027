import React from 'react';
import { Award, MessageSquare, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Exam, GradeRecord } from '@/types/exam';
import { calculateTotalScore } from '@/utils/exams';

interface StudentGradesViewProps {
    exams: Exam[];
    grades: Record<string, GradeRecord>;
    studentId: string;
    studentPhone?: string;
    studentFirestoreId?: string;
}

export const StudentGradesView: React.FC<StudentGradesViewProps> = ({ exams, grades, studentId, studentPhone, studentFirestoreId }) => {
    if (!exams || exams.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-[24px] border border-[#dadce0]" dir="rtl">
                <Award className="mx-auto text-[#5f6368] mb-3" size={36} />
                <h3 className="text-[14px] font-medium text-[#3c4043]">אין מבחנים במערכת כרגע</h3>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-[#202124]" dir="rtl">
            <h2 className="text-[20px] font-medium text-[#202124] flex items-center gap-2">
                <Award className="text-[#1a73e8]" size={22} />
                הערכות וציוני מבחנים
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => {
                    const gradeRecord =
                        grades[`${studentId}_${exam.id}`] ||
                        (studentPhone ? grades[`${studentPhone}_${exam.id}`] : null) ||
                        (studentFirestoreId ? grades[`${studentFirestoreId}_${exam.id}`] : null);
                    const totalScore = gradeRecord ? calculateTotalScore(gradeRecord.scores) : null;
                    const showVerbalOnly = exam.showVerbalOnly;

                    return (
                        <div key={exam.id} className="bg-white p-6 rounded-[24px] border border-[#dadce0] space-y-4 text-right">
                            {/* Exam Header */}
                            <div className="flex items-center justify-between border-b border-[#dadce0] pb-3">
                                <div>
                                    <h3 className="font-medium text-[16px] text-[#202124]">{exam.title}</h3>
                                    <span className="text-[12px] font-normal text-[#5f6368]">{exam.date || 'ללא תאריך'}</span>
                                </div>
                                {!showVerbalOnly && (
                                    <div className="text-right">
                                        <span className="text-[12px] font-normal text-[#5f6368] block">ציון מסכם</span>
                                        <span className="text-xl font-medium text-[#1a73e8]">
                                            {totalScore !== null ? `${totalScore} / 100` : 'טרם הוזן'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Categories Breakdown */}
                            {!showVerbalOnly && (
                                <div className="space-y-2">
                                    <span className="text-[12px] font-medium text-[#5f6368] block">פירוט רכיבי הניקוד:</span>
                                    {exam.categories.map((cat, idx) => {
                                        const score = gradeRecord?.scores?.[cat.name];
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg border border-[#dadce0] text-[13px]">
                                                <span className="font-normal text-[#3c4043]">{cat.name}</span>
                                                <span className="font-medium text-[#202124]">
                                                    {score !== undefined ? `${score} / ${cat.maxScore}` : `- / ${cat.maxScore}`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Verbal Comment */}
                            {gradeRecord?.verbalComment && (
                                <div className="p-4 bg-[#f8f9fa] rounded-[16px] border border-[#dadce0] space-y-1">
                                    <span className="text-[12px] font-medium text-[#1a73e8] flex items-center gap-1.5">
                                        <MessageSquare size={14} className="text-[#1a73e8]" />
                                        הערכת המדריך:
                                    </span>
                                    <p className="text-[13px] font-normal text-[#3c4043] leading-relaxed">{gradeRecord.verbalComment}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
