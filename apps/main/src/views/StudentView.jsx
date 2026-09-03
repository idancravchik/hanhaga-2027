import React, { useState, useMemo } from 'react';
import { ChevronLeft, UserCircle } from 'lucide-react';
import { LOGO_URL, getUserAvatar, TAGS_CATALOG, getTagColorClasses } from '../config/constants';
import { StudentGradesView } from '../components/exams/StudentGradesView';
import { StudentScheduleView } from '../components/events/StudentScheduleView';

export default function StudentView({ profile, exams, grades, attendance, eventsList, setView }) {
    const [selectedExam, setSelectedExamInternal] = useState(null);

    React.useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.subView === 'exam_detail') {
                const exam = exams.find(e => e.id === event.state.examId);
                setSelectedExamInternal(exam || null);
            } else {
                setSelectedExamInternal(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [exams]);

    const handleSelectExam = (exam) => {
        setSelectedExamInternal(exam);
        window.history.pushState({ view: 'student', subView: exam ? 'exam_detail' : null, examId: exam?.id }, '', '');
    };

    const _attendanceEvents = useMemo(() => {
        return (eventsList || [])
            .filter(e => e.type !== 'יום חשיפה')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [eventsList]);

    const visibleTags = useMemo(() => {
        return (profile?.tags || []).filter(t => t.id !== 'special_ed' && t.id !== 'school_sole' && t.label !== 'חנ"מ' && t.label !== 'בודד מבית ספר');
    }, [profile?.tags]);

    if (selectedExam) {
        const g = grades[`${profile?.id}_${selectedExam.id}`];
        const total = g ? Object.values(g.scores).reduce((a, b) => (parseInt(a) || 0) + (parseInt(b) || 0), 0) : null;
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-20 text-right text-[#202124]" dir="rtl">
                <button onClick={() => handleSelectExam(null)} className="mb-6 flex items-center text-[#1a73e8] font-medium hover:underline gap-1 text-[14px]">
                    <ChevronLeft size={18} /> חזרה
                </button>
                <div className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden">
                    <div className="bg-[#e8f0fe] p-8 text-center border-b border-[#dadce0]">
                        <h3 className="text-[20px] font-medium text-[#202124] mb-2">{selectedExam.title}</h3>
                        {!selectedExam.isStudentVisible && selectedExam.showVerbalOnly ? (
                            <div className="text-3xl font-medium text-[#1a73e8] leading-tight mb-2">הערכה מילולית</div>
                        ) : (
                            <div className="text-[72px] font-medium text-[#1a73e8] leading-none mb-1 tabular-nums">{total !== null ? total : '--'}</div>
                        )}
                        <p className="text-[12px] font-normal text-[#5f6368]">{!selectedExam.isStudentVisible && selectedExam.showVerbalOnly ? 'מדריך' : 'ציון סופי'}</p>
                    </div>
                    <div className="p-6 space-y-5 bg-white">
                        {g ? (
                            <>
                                {selectedExam.isStudentVisible && (
                                    <div className="space-y-3">
                                        {selectedExam.categories.map((cat, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                                                <span className="font-medium text-[#3c4043] text-[14px]">{cat.name}</span>
                                                <div className="font-medium tabular-nums text-[14px]">
                                                    <span className="text-[#1a73e8] text-xl font-medium">{g.scores[cat.name] || 0}</span>
                                                    <span className="text-[#5f6368] text-sm mx-1">/</span>
                                                    <span className="text-[#5f6368]">{cat.max}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={selectedExam.isStudentVisible ? "mt-6" : ""}>
                                    <h4 className="font-medium text-[#3c4043] mb-2 text-[14px]">דבר המדריך:</h4>
                                    <p className="bg-[#f8f9fa] p-5 rounded-[16px] border border-[#dadce0] text-[#3c4043] leading-relaxed font-normal text-[15px]">"{g.comment || "ביצוע טוב מאוד!"}"</p>
                                </div>
                            </>
                        ) : <div className="text-center py-16 italic text-[#5f6368] font-normal">הציון עדיין בעיבוד...</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-10 text-right text-[#202124]" dir="rtl">
            <header className="bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0] mb-4 sm:mb-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <img src={LOGO_URL} className="w-10 h-10 object-contain" alt="Logo" />
                        <div className="w-px h-6 bg-[#dadce0]" />
                        <img src={getUserAvatar(profile?.role)} alt={profile?.role} className="w-10 h-10 rounded-full border border-[#dadce0] object-cover" />
                        <div>
                            <h2 className="text-[20px] font-medium text-[#202124] leading-tight">שלום, {profile?.name}</h2>
                            <p className="text-[#1a73e8] font-medium text-[12px] mt-1 leading-none">מחלקה {profile?.group}</p>
                            
                            {visibleTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {visibleTags.map((tag, idx) => {
                                        const tagDef = TAGS_CATALOG.find(t => t.id === tag.id);
                                        const badgeClass = getTagColorClasses(tagDef?.color);
                                        return (
                                            <span key={idx} className={`px-2.5 py-0.5 rounded-full text-[12px] font-normal border border-[#dadce0] bg-[#f8f9fa] text-[#3c4043] ${badgeClass}`}>
                                                {tag.label}{tag.detail ? `: ${tag.detail}` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setView('login')} title="התנתקות" className="bg-[#f1f3f4] hover:bg-[#e8eaed] p-2.5 rounded-full text-[#3c4043] transition-all"><UserCircle size={22} /></button>
                </div>
            </header>

            <div className="mb-6">
                <StudentScheduleView
                    events={eventsList}
                    attendance={attendance}
                    studentId={profile?.id || profile?.phone || ''}
                />
            </div>

            <StudentGradesView
                exams={exams.filter(e => e.isStudentVisible)}
                grades={grades}
                studentId={profile?.id || profile?.phone || ''}
                studentPhone={profile?.phone}
                studentFirestoreId={profile?.firestoreId}
            />
        </div>
    );
}
