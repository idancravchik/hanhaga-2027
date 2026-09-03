import React, { useState, useMemo } from 'react';
import { ChevronLeft, Search, Calendar, UserCircle, BookOpen, AlertCircle, Check, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { LOGO_URL, getUserAvatar, TAGS_CATALOG, getTagColorClasses } from '../config/constants';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { StudentProfileModal } from '../components/users/StudentProfileModal';
import { AttendanceReportTable } from '../components/events/AttendanceReportTable';

export default function InstructorView({ profile, usersList, exams, grades, attendance, notes, eventsList, setView, showToast, isMixedAssessment = false }) {
    const [instructorSubView, setInstructorSubViewInternal] = useState('students');
    const [selectedExam, setSelectedExamInternal] = useState(null);
    const [selectedStudent, setSelectedStudentInternal] = useState(null);
    const [selectedMeeting, setSelectedMeetingInternal] = useState(null);
    const [scores, setScores] = useState({});
    const [comment, setComment] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

    const handlePushState = (newSubView, examId, studentId, meeting) => {
        const newState = {
            view: 'instructor',
            instructorSubView: newSubView,
            selectedExam: examId,
            selectedStudent: studentId,
            selectedMeeting: meeting
        };
        window.history.pushState(newState, '', '');
    };

    const setInstructorSubView = (v, push = true) => {
        setInstructorSubViewInternal(v);
        if (push) handlePushState(v, null, null, null);
    };
    const setSelectedExam = (e, push = true) => {
        setSelectedExamInternal(e);
        if (push) handlePushState(instructorSubView, e?.id, selectedStudent?.id, selectedMeeting);
    };
    const setSelectedStudent = (s, push = true) => {
        setSelectedStudentInternal(s);
        if (push) handlePushState(instructorSubView, selectedExam?.id, s?.id, selectedMeeting);
    };
    const setSelectedMeeting = (m, push = true) => {
        setSelectedMeetingInternal(m);
        if (push) handlePushState(instructorSubView, null, null, m);
    };

    React.useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.view === 'instructor') {
                setInstructorSubViewInternal(event.state.instructorSubView || 'students');
                const exam = exams.find(e => e.id === event.state.selectedExam);
                setSelectedExamInternal(exam || null);
                const student = usersList.find(u => u.id === event.state.selectedStudent);
                setSelectedStudentInternal(student || null);
                setSelectedMeetingInternal(event.state.selectedMeeting || null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [exams, usersList]);

    const groupStudents = usersList.filter(u => (profile?.group?.toString() === '0' || isMixedAssessment || u.group?.toString() === profile?.group?.toString()) && u.role === 'student');

    const filteredGroupStudents = useMemo(() => {
        if (!searchQuery) return groupStudents;
        return groupStudents.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [groupStudents, searchQuery]);

    const attendanceEvents = useMemo(() => {
        return (eventsList || [])
            .filter(e => e.type !== 'יום חשיפה')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [eventsList]);

    const handleUpdateGrade = async () => {
        const payload = { studentId: selectedStudent.id, examId: selectedExam.id, scores, comment, updatedAt: new Date().toISOString() };
        const key = `${selectedStudent.id}_${selectedExam.id}`;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grades', key), payload);
        showToast("עודכן בענן!");
        setSelectedStudent(null);
    };



    const handleSaveNote = async () => {
        const payload = { studentId: selectedStudent.id, content: comment, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', selectedStudent.id), payload, { merge: true });
        setSelectedStudent(null);
    };

    // Grade Entry or Notes Edit Modal/Form
    if (selectedStudent) {
        return (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto font-sans pb-20 text-right text-[#202124]" dir="rtl">
                <button onClick={() => setSelectedStudent(null)} className="mb-6 flex items-center text-[#1a73e8] font-medium text-[14px] gap-1 hover:underline"><ChevronLeft size={18} /> חזרה לרשימה</button>
                <div className="bg-white p-6 rounded-[24px] border border-[#dadce0] relative">
                    <div className="flex items-center gap-3 mb-4 mt-2">
                        <img src={getUserAvatar(selectedStudent.role)} alt={selectedStudent.role} className="w-12 h-12 rounded-full border border-[#dadce0] object-cover" />
                        <div>
                            <h3 className="text-[20px] font-medium text-[#202124] leading-tight">{selectedStudent.name}</h3>
                            <p className="text-[#5f6368] text-[12px] font-normal mt-1">מחלקה {selectedStudent.group} | {selectedStudent.school}</p>
                        </div>
                    </div>

                    {selectedStudent.isNoteMode ? (
                        <div className="space-y-5 mt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="text-[#1a73e8]" size={20} />
                                <h4 className="font-medium text-[#202124] text-[18px]">תיק אישי - מעקב מדריך</h4>
                            </div>
                            <p className="text-[14px] font-normal text-[#5f6368] leading-relaxed">
                                כאן תוכל לכתוב הערות, נקודות לשימור ולשיפור, ומעקב כללי על החניך לאורך הקורס.
                            </p>
                            <textarea
                                className="w-full p-4 border border-[#dadce0] rounded bg-white min-h-[220px] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all font-normal text-[#202124] text-right leading-relaxed resize-y text-[14px]"
                                placeholder="כתוב כאן על ההתקדמות של החניך..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                            <button onClick={handleSaveNote} className="w-full h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white font-medium rounded-full transition-all text-[14px] flex items-center justify-center gap-2 mt-4">
                                <BookOpen size={16} />
                                שמור תיק אישי
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-[#5f6368] text-[12px] mb-4 font-medium uppercase tracking-wider">{selectedExam.title}</p>
                            <div className="space-y-4">
                                {selectedExam.categories.map((cat, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between mb-1.5 leading-none">
                                             <label className="font-medium text-[#202124] text-[14px]">{cat.name}</label>
                                             <span className="text-[#5f6368] text-[12px] font-normal">מקס' {cat.max}</span>
                                        </div>
                                        <input type="number" className="w-full h-11 px-3 border border-[#dadce0] rounded text-[16px] bg-white font-medium focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all tabular-nums text-center text-[#202124]" max={cat.max} value={scores[cat.name] || ''} onChange={(e) => setScores({ ...scores, [cat.name]: Math.min(parseInt(e.target.value) || 0, cat.max) })} />
                                    </div>
                                ))}
                                <div className="space-y-1.5">
                                    <label className="block font-medium text-[#3c4043] text-[14px] mr-1">הערכה מילולית</label>
                                    <textarea className="w-full p-3 border border-[#dadce0] rounded bg-white h-28 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all font-normal text-[#202124] text-right text-[14px]" placeholder="דגשים ושיפורים..." value={comment} onChange={(e) => setComment(e.target.value)} />
                                </div>
                                <button onClick={handleUpdateGrade} className="w-full h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white font-medium rounded-full transition-all text-[14px]">עדכן נתונים</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (selectedMeeting) {
        const currentEvent = eventsList.find(e => e.id === selectedMeeting) || { id: selectedMeeting, title: selectedMeeting, type: 'מפגש', date: '' };
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full font-sans pb-20 text-right text-[#202124]" dir="rtl">
                <button onClick={() => setSelectedMeetingInternal(null)} className="mb-4 flex items-center text-[#1a73e8] font-medium text-[14px] gap-1 hover:underline"><ChevronLeft size={16} /> חזרה למפגשים</button>
                <AttendanceReportTable
                    event={currentEvent}
                    students={filteredGroupStudents}
                    attendance={attendance}
                    onClose={() => setSelectedMeetingInternal(null)}
                    showToast={showToast}
                />
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-20 text-right text-[#202124]" dir="rtl">
            <header className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0] mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                    <img src={LOGO_URL} className="w-9 h-9 sm:w-10 sm:h-10 object-contain" alt="Logo" />
                    <div className="w-px h-6 bg-[#dadce0]" />
                    <img src={getUserAvatar(profile?.role)} alt={profile?.role} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#dadce0] object-cover" />
                    <div>
                        <h2 className="text-[17px] sm:text-[20px] font-medium text-[#202124] leading-tight">{profile?.name}</h2>
                        <p className="text-[#1a73e8] font-medium text-[12px] mt-1 leading-none">{profile?.role === 'assistant' ? 'מנהלן' : (profile?.group?.toString() === '0' ? 'מדריך כללי' : `מחלקה ${profile?.group}`)}</p>
                    </div>
                </div>
                <button onClick={() => setView('login')} title="התנתקות" className="bg-[#fce8e6] hover:bg-[#fad2cf] p-2.5 rounded-full text-[#d93025] transition-all"><UserCircle size={22} /></button>
            </header>

            {profile?.role !== 'assistant' && (
                <div className="flex bg-white rounded-full p-1 border border-[#dadce0] mb-4 sm:mb-6 gap-1 overflow-x-auto no-scrollbar shrink-0">
                    <button onClick={() => setInstructorSubView('students')} className={`flex-1 min-w-[110px] py-2 rounded-full font-medium text-[13px] sm:text-[14px] transition-all ${instructorSubView === 'students' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>כרטיסי חניכים</button>
                    <button onClick={() => setInstructorSubView('meetings')} className={`flex-1 min-w-[110px] py-2 rounded-full font-medium text-[13px] sm:text-[14px] transition-all ${instructorSubView === 'meetings' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>נוכחות במפגשים</button>
                </div>
            )}

            {instructorSubView === 'students' ? (
                <div className="space-y-4">
                    <div className="relative mb-6">
                        <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                        <input
                            type="text"
                            placeholder="חיפוש חניך..."
                            className="w-full h-11 pr-10 pl-4 rounded border border-[#dadce0] bg-white font-normal text-[14px] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors text-[#202124] outline-none"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        {filteredGroupStudents.map(student => {
                            const studentKey = student.id || student.phone || student.firestoreId;
                            const isExpanded = expandedStudentId === studentKey;
                            const studentTags = student.tags || [];
                            const studentNote = notes[student.id]?.content || notes[student.phone]?.content || notes[student.firestoreId]?.content || '';

                            return (
                                <div key={studentKey} className="bg-white rounded-[24px] border border-[#dadce0] text-right overflow-hidden transition-all">
                                    {/* Collapsed Header Bar */}
                                    <div
                                        onClick={() => setExpandedStudentId(isExpanded ? null : studentKey)}
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={getUserAvatar(student.role)} alt={student.name} className="w-10 h-10 rounded-full border border-[#dadce0] object-cover" />
                                            <div>
                                                <h3 className="text-[16px] font-medium text-[#202124] leading-tight">{student.name}</h3>
                                                <p className="text-[#5f6368] text-[12px] font-normal mt-0.5">מחלקה {student.group || 0} | {student.school || 'לא שויך'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentForModal(student);
                                                }}
                                                className="h-8 px-3 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-medium text-[12px] flex items-center gap-1 transition-colors"
                                            >
                                                <Eye size={14} /> תיק חניך
                                            </button>
                                            {isExpanded ? <ChevronUp size={20} className="text-[#5f6368]" /> : <ChevronDown size={20} className="text-[#5f6368]" />}
                                        </div>
                                    </div>

                                    {/* Expanded Body */}
                                    {isExpanded && (
                                        <div className="p-4 border-t border-[#dadce0] space-y-4 bg-[#f8f9fa]">
                                            {studentTags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {studentTags.map((tag, idx) => {
                                                        const tagDef = TAGS_CATALOG.find(t => t.id === tag.id);
                                                        const badgeClass = getTagColorClasses(tagDef?.color);
                                                        return (
                                                            <span key={idx} className={`px-2.5 py-0.5 rounded-full text-[12px] font-normal border border-[#dadce0] bg-white text-[#3c4043] ${badgeClass}`}>
                                                                {tag.label}{tag.detail ? `: ${tag.detail}` : ''}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2.5">
                                                {exams
                                                    .filter(e => profile?.role === 'assistant' ? e.isAssistantVisible : e.isVisible)
                                                    .map(exam => {
                                                        const g = grades[`${student.id}_${exam.id}`] || grades[`${student.phone}_${exam.id}`] || grades[`${student.firestoreId}_${exam.id}`];
                                                        const total = g ? Object.values(g.scores || {}).reduce((a, b) => (parseInt(a) || 0) + (parseInt(b) || 0), 0) : null;
                                                        const isGraded = total !== null && total > 0;

                                                        return (
                                                            <button
                                                                key={exam.id}
                                                                onClick={() => {
                                                                    setSelectedExam(exam);
                                                                    setSelectedStudent(student);
                                                                    setScores(g?.scores || {});
                                                                    setComment(g?.comment || '');
                                                                }}
                                                                className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between h-20 ${isGraded ? 'bg-[#e8f0fe] border-[#1a73e8]/30 text-[#202124]' : 'bg-white border-[#dadce0] text-[#3c4043]'}`}
                                                            >
                                                                <span className="text-[12px] font-medium block truncate w-full">{exam.title}</span>
                                                                {isGraded ? (
                                                                    <div className="flex justify-between items-center w-full mt-2">
                                                                        <span className="text-[10px] bg-white text-[#188038] border border-[#188038]/30 px-1.5 py-0.5 rounded font-medium">מעודכן</span>
                                                                        <span className="text-[14px] font-medium tabular-nums text-[#1a73e8]">{total} נק'</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-between items-center w-full mt-2 text-[#d93025]">
                                                                        <span className="text-[10px] bg-white text-[#d93025] border border-[#d93025]/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><AlertCircle size={10} /> הזן ציון</span>
                                                                        <span className="text-[14px] font-medium">-</span>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                }
                                            </div>

                                            <div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedStudent({ ...student, isNoteMode: true });
                                                        setComment(studentNote);
                                                    }}
                                                    className={`w-full p-3 rounded-lg border text-right transition-all flex items-center justify-between bg-white ${studentNote ? 'border-[#1a73e8] text-[#202124]' : 'border-[#dadce0] text-[#5f6368]'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen size={16} className={studentNote ? 'text-[#1a73e8]' : 'text-[#5f6368]'} />
                                                        <span className="text-[12px] font-medium">תיק מעקב אישי</span>
                                                    </div>
                                                    {studentNote ? (
                                                        <span className="text-[12px] text-[#1a73e8] font-normal max-w-[150px] truncate">{studentNote}</span>
                                                    ) : (
                                                        <span className="text-[12px] text-[#5f6368] italic">לא נרשמו הערות</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredGroupStudents.length === 0 && <div className="text-center py-10 italic text-[#5f6368]">לא נמצאו חניכים</div>}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {attendanceEvents.map(ev => (
                        <button key={ev.id} onClick={() => setSelectedMeeting(ev.id)} className="w-full bg-white p-5 rounded-[24px] border border-[#dadce0] flex items-center justify-between group transition-all text-right hover:border-[#1a73e8]">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#f8f9fa] text-[#1a73e8] w-11 h-11 rounded-full flex items-center justify-center border border-[#dadce0]">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <span className="font-medium text-[#202124] text-[16px] block">{ev.title}</span>
                                    <span className="text-[12px] font-normal text-[#5f6368] block mt-0.5" dir="ltr">
                                        {ev.date ? new Date(ev.date).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[14px] font-medium text-[#1a73e8] group-hover:underline">הזן נוכחות</span>
                        </button>
                    ))}
                    {attendanceEvents.length === 0 && <div className="text-center py-10 italic text-[#5f6368]">אין מפגשים רשומים</div>}
                </div>
            )}

            {(selectedStudent || selectedStudentForModal) && (
                <StudentProfileModal
                    student={selectedStudent || selectedStudentForModal}
                    onClose={() => { setSelectedStudentInternal(null); setSelectedStudentForModal(null); }}
                    currentProfile={profile}
                    exams={exams}
                    grades={grades}
                    attendance={attendance}
                    notes={notes}
                    eventsList={eventsList}
                    showToast={showToast}
                />
            )}
        </div>
    );
};
