import React, { useState, useMemo, useRef } from 'react';
import {
    Users, Plus, ClipboardCheck, GraduationCap,
    FileText, Download, Trash2, UserPlus,
    Edit2, Search, Check, Eye, EyeOff, PieChart, TrendingUp, X, BarChart3, Lock, Unlock, BookOpen, ChevronDown, Calendar, AlertCircle, MessageSquare, KeyRound, Smartphone
} from 'lucide-react';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { LOGO_URL, SCHOOL_LIST, TAGS_CATALOG, getTagColorClasses } from '../config/constants';
import { parseUsersCSV, exportUsersToCSV } from '../utils/csv';
import { StudentProfileModal } from '../components/users/StudentProfileModal';
import { UserFormModal } from '../components/users/UserFormModal';
import { UserManagementTable } from '../components/users/UserManagementTable';
import { ExamBuilderModal } from '../components/exams/ExamBuilderModal';
import { GradeEntryModal } from '../components/exams/GradeEntryModal';
import { EventBuilderModal } from '../components/events/EventBuilderModal';
import { AttendanceReportTable } from '../components/events/AttendanceReportTable';

export default function AdminView({ profile, usersList, exams, grades, attendance, notes, eventsList = [], deleteUser, setView, showToast, showAlert, siteSettings }) {
    const [adminSubView, setAdminSubViewInternal] = useState('reports');
    const [selectedStudentCard, setSelectedStudentCardInternal] = useState(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [examToEdit, setExamToEdit] = useState(null);
    const [gradeModalExam, setGradeModalExam] = useState(null);
    const [gradeModalStudent, setGradeModalStudent] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState(null);
    const fileInputRef = useRef(null);

    const handlePushState = (newSubView, studentId) => {
        const newState = {
            view: profile?.role === 'admin' || profile?.role === 'inspector' ? profile.role : 'login',
            adminSubView: newSubView,
            selectedStudentCard: studentId
        };
        window.history.pushState(newState, '', '');
    };

    const setAdminSubView = (v, push = true) => {
        setAdminSubViewInternal(v);
        if (push) handlePushState(v, selectedStudentCard?.id || null);
    };

    const setSelectedStudentCard = (student, push = true) => {
        setSelectedStudentCardInternal(student);
        if (push) handlePushState(adminSubView, student?.id || null);
    };

    React.useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && (event.state.view === 'admin' || event.state.view === 'inspector')) {
                setAdminSubViewInternal(event.state.adminSubView || 'reports');
                const student = usersList.find(u => u.id === event.state.selectedStudentCard);
                setSelectedStudentCardInternal(student || null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [usersList]);

    const [filterDept, setFilterDept] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const uniqueUsersList = usersList;

    const attendanceEvents = useMemo(() => {
        return (eventsList || [])
            .filter(e => e.type !== 'יום חשיפה')
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [eventsList]);

    const filteredStudents = useMemo(() => {
        return uniqueUsersList.filter(u => {
            const role = (u.role || 'student').toLowerCase();
            const matchRole = role === 'student';
            const normGroup = parseInt(u.group) || 0;
            const matchDept = filterDept === 'all' || normGroup.toString() === filterDept;
            const nameStr = (u.name || u.fullName || '').toLowerCase();
            const phoneStr = (u.phone || u.id || u.firestoreId || '').toString();
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || nameStr.includes(q) || phoneStr.includes(q);
            return matchRole && matchDept && matchSearch;
        });
    }, [uniqueUsersList, filterDept, searchQuery]);

    const stats = useMemo(() => {
        const students = uniqueUsersList.filter(u => u.role === 'student');
        const total = students.length;

        const schools = students.reduce((acc, s) => {
            acc[s.school] = (acc[s.school] || 0) + 1;
            return acc;
        }, {});

        const attByMeeting = attendanceEvents.map(ev => {
            const present = students.filter(s => attendance[s.id]?.[ev.id]).length;
            return { meeting: ev.title, count: present, percent: total ? Math.round((present / total) * 100) : 0 };
        });

        const groupGrades = [...new Set(students.map(s => parseInt(s.group) || 0))]
            .filter(g => g > 0)
            .sort((a, b) => a - b)
            .map(gNum => {
                const gStudents = students.filter(s => (parseInt(s.group) || 0) === gNum);
                let totalSum = 0;
                let count = 0;
                gStudents.forEach(s => {
                    exams.forEach(e => {
                        const gData = grades[`${s.id}_${e.id}`];
                        if (gData && gData.scores) {
                            const sum = Object.values(gData.scores).reduce((a, b) => a + (parseInt(b) || 0), 0);
                            totalSum += sum;
                            count++;
                        }
                    });
                });
                return { group: gNum.toString(), avg: count ? (totalSum / count).toFixed(1) : 0, studentCount: gStudents.length };
            });

        return { total, schools, attByMeeting, groupGrades };
    }, [uniqueUsersList, attendance, grades, exams, attendanceEvents]);

    const isIdan = profile?.name?.trim() === "עידן קרבצ'יק";

    const handleImportCSV = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const { users, errors, count } = parseUsersCSV(text);

            if (users.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < users.length; i += batchSize) {
                    const chunk = users.slice(i, i + batchSize);
                    const batch = writeBatch(db);
                    chunk.forEach((u) => {
                        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id);
                        batch.set(userRef, u, { merge: true });
                    });
                    await batch.commit();
                }
                showToast(`יובאו ${count} משתמשים בהצלחה!`);
            }
            if (errors.length > 0) {
                showAlert('אזהרות ייבוא CSV', `היו ${errors.length} שורות שלא יובאו. בדוק את הקובץ.`);
            }
        };
        reader.readAsText(file);
    };

    const handleExportCSV = () => {
        exportUsersToCSV(uniqueUsersList, attendance, grades, eventsList, exams, 'דוח_מנהיגות');
        showToast('הדוח יוצא בהצלחה!');
    };

    if (selectedStudentCard) {
        const studentAtt = attendance[selectedStudentCard.id] || {};
        const studentNote = notes[selectedStudentCard.id]?.content || '';
        const studentTags = selectedStudentCard.tags || [];

        return (
            <div className="fixed inset-0 z-50 bg-[#202124]/50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[24px] border border-[#dadce0] flex flex-col overflow-hidden text-right" dir="rtl">
                    <header className="p-6 border-b border-[#dadce0] bg-[#f8f9fa] flex justify-between items-start shrink-0 text-right" dir="rtl">
                        <div>
                            <h2 className="text-[24px] font-medium text-[#202124] mb-2">{selectedStudentCard.name}</h2>
                            <div className="flex gap-2 text-[13px] font-normal text-[#5f6368] flex-wrap">
                                <span className="bg-white px-3 py-0.5 rounded-full border border-[#dadce0] text-[#3c4043]">מחלקה {selectedStudentCard.group}</span>
                                <span className="bg-white px-3 py-0.5 rounded-full border border-[#dadce0] text-[#3c4043]">{selectedStudentCard.school}</span>
                                <span className="bg-white px-3 py-0.5 rounded-full border border-[#dadce0] text-[#3c4043]" dir="ltr">{selectedStudentCard.phone}</span>
                            </div>
                            
                            {studentTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {studentTags.map((tag, idx) => {
                                        const tagDef = TAGS_CATALOG.find(t => t.id === tag.id);
                                        const badgeClass = getTagColorClasses(tagDef?.color);
                                        return (
                                            <span key={idx} className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
                                                {tag.label}{tag.detail ? `: ${tag.detail}` : ''}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setSelectedStudentCard(null)} className="p-2 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </header>

                    <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right" dir="rtl">
                        {/* Notes Section */}
                        <section className="bg-[#e8f0fe] p-5 rounded-[24px] border border-[#dadce0]">
                            <div className="flex items-center gap-2 mb-3 text-[#1a73e8]">
                                <BookOpen size={18} />
                                <h3 className="font-medium text-[16px] text-[#202124]">מעקב מדריך (תיק אישי)</h3>
                            </div>
                            {studentNote ? (
                                <p className="font-normal text-[#3c4043] text-[14px] whitespace-pre-wrap leading-relaxed">{studentNote}</p>
                            ) : (
                                <p className="text-[#5f6368] text-[13px] font-normal italic">לא נרשמו הערות בתיק האישי.</p>
                            )}
                        </section>

                        {/* Attendance Section */}
                        <section>
                            <h3 className="font-medium text-[#202124] text-[16px] mb-3 flex items-center gap-2"><Check size={18} className="text-[#188038]" /> נוכחות הכנות</h3>
                            <div className="flex flex-wrap gap-2">
                                {attendanceEvents.map(ev => {
                                    const status = studentAtt[ev.id];
                                    let badgeStyle = 'bg-[#f8f9fa] text-[#3c4043] border-[#dadce0]';
                                    if (status === true) badgeStyle = 'bg-[#188038] text-white border-[#188038]';
                                    if (status === false) badgeStyle = 'bg-[#d93025] text-white border-[#d93025]';
                                    return (
                                        <div key={ev.id} className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[12px] font-medium border ${badgeStyle}`}>
                                            {ev.title} {status === true && <Check size={14} />}
                                            {status === false && <X size={14} />}
                                            {status === undefined && <span className="text-[10px] opacity-75">-</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Grades Section */}
                        <section>
                            <h3 className="font-medium text-[#202124] text-[16px] mb-3 flex items-center gap-2"><GraduationCap size={18} className="text-[#1a73e8]" /> פירוט מבחנים</h3>
                            <div className="space-y-4">
                                {exams.map(exam => {
                                    const g = grades[`${selectedStudentCard.id}_${exam.id}`];
                                    if (!g) return null;
                                    const total = Object.values(g.scores).reduce((a, b) => (parseInt(a) || 0) + (parseInt(b) || 0), 0);

                                    return (
                                        <div key={exam.id} className="p-5 border border-[#dadce0] rounded-[24px] bg-white">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-[16px] text-[#202124]">{exam.title}</h4>
                                                <span className="text-[20px] font-medium text-[#1a73e8] tabular-nums">{total} נק'</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
                                                {exam.categories.map((cat, i) => (
                                                    <div key={i} className="bg-[#f8f9fa] p-3 rounded-lg border border-[#dadce0] flex justify-between items-center">
                                                        <span className="font-normal text-[#5f6368] text-[12px]">{cat.name}</span>
                                                        <span className="font-medium text-[#202124] text-[13px] tabular-nums">{g.scores[cat.name] || 0} / {cat.max}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {g.comment && (
                                                <div className="bg-[#f8f9fa] p-3.5 rounded-lg border border-[#dadce0] mt-2">
                                                    <span className="text-[12px] font-medium text-[#3c4043] block mb-1">הערת מעריך:</span>
                                                    <p className="font-normal text-[#3c4043] text-[13px] leading-relaxed">"{g.comment}"</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 text-right text-[#202124] font-sans" dir="rtl">
            <header className="bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <img src={LOGO_URL} className="w-9 h-9 sm:w-10 sm:h-10 object-contain" alt="Logo" />
                    <h2 className="text-[17px] sm:text-[20px] font-medium text-[#202124] leading-tight">ניהול קורס - {profile.name}</h2>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {(isIdan || profile?.role === 'admin') && (
                        <>
                            <button
                                onClick={async () => {
                                    const nextMethod = siteSettings?.staffLoginMethod === 'otp' ? 'passcode' : 'otp';
                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'config'), { staffLoginMethod: nextMethod }, { merge: true });
                                    showToast(nextMethod === 'otp' ? "מצב כניסת צוות שונה ל-SMS (OTP)" : "מצב כניסת צוות שונה לקוד גישה סטטי");
                                }}
                                className="h-9 px-3 rounded-full transition-colors bg-[#f8f9fa] text-[#1a73e8] border border-[#dadce0] hover:bg-[#e8f0fe] flex items-center gap-1.5 font-medium text-[13px]"
                                title={siteSettings?.staffLoginMethod === 'otp' ? 'שנה מצב כניסת צוות לקוד סטטי' : 'שנה מצב כניסת צוות ל-SMS OTP'}
                            >
                                {siteSettings?.staffLoginMethod === 'otp' ? <Smartphone size={16} /> : <KeyRound size={16} />}
                                <span className="hidden sm:inline">{siteSettings?.staffLoginMethod === 'otp' ? 'כניסת צוות: SMS' : 'כניסת צוות: קוד סטטי'}</span>
                            </button>
                            <button
                                onClick={async () => {
                                    const isClosed = !siteSettings?.isSiteClosed;
                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'config'), { isSiteClosed: isClosed }, { merge: true });
                                    showToast(isClosed ? "האתר נסגר כעת למשתמשים" : "האתר נפתח מחדש למשתמשים", isClosed ? "error" : "success");
                                }}
                                className={`h-9 px-3 rounded-full transition-colors border ${siteSettings?.isSiteClosed ? 'bg-[#fce8e6] text-[#d93025] border-[#fce8e6]' : 'bg-[#f8f9fa] text-[#5f6368] border-[#dadce0] hover:text-[#202124]'}`}
                                title={siteSettings?.isSiteClosed ? 'פתח אתר' : 'נעילת אתר חירום למשתמשים'}
                            >
                                {siteSettings?.isSiteClosed ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                        </>
                    )}
                    <button onClick={() => setView('login')} className="h-9 px-4 rounded-full text-[#d93025] font-medium bg-[#fce8e6] hover:bg-[#fad2cf] transition-colors text-[13px]">התנתק</button>
                </div>
            </header>

            {/* Admin Subview Navigation Bar */}
            <div className="flex w-full bg-white p-1 rounded-full border border-[#dadce0] gap-1 overflow-x-auto no-scrollbar shrink-0">
                <button onClick={() => setAdminSubView('reports')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${adminSubView === 'reports' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>דוחות קורס</button>
                <button onClick={() => setAdminSubView('analytics')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${adminSubView === 'analytics' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>אנליטיקה</button>
                <button onClick={() => setAdminSubView('users')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${adminSubView === 'users' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>משתמשים</button>
                <button onClick={() => setAdminSubView('exams')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${adminSubView === 'exams' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>מבחנים</button>
                <button onClick={() => setAdminSubView('events')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all ${adminSubView === 'events' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}>לוח אירועים</button>
            </div>

            {/* SubView Contents */}
            {adminSubView === 'events' && (
                <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto" dir="rtl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0]">
                        <div>
                            <h3 className="text-[18px] sm:text-[20px] font-medium text-[#202124]">לוח אירועים ומפגשים ({eventsList.length})</h3>
                            <p className="text-[12px] text-[#5f6368] font-normal mt-0.5">ניהול מפגשים, מסעות ודיווחי נוכחות</p>
                        </div>
                        <button
                            onClick={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                            className="h-10 px-5 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                        >
                            <Plus size={16} /> הוסף אירוע חדש
                        </button>
                    </div>

                    {selectedAttendanceEvent ? (
                        <AttendanceReportTable
                            event={selectedAttendanceEvent}
                            students={filteredStudents}
                            attendance={attendance}
                            onClose={() => setSelectedAttendanceEvent(null)}
                            showToast={showToast}
                        />
                    ) : (
                        <div className="bg-white rounded-[24px] overflow-hidden border border-[#dadce0]">
                            <div className="divide-y divide-[#dadce0]">
                                {eventsList.length === 0 ? (
                                    <div className="p-8 text-center text-[#5f6368] text-[14px] font-normal">אין אירועים בלו"ז. לחץ על "הוסף אירוע חדש" כדי להתחיל.</div>
                                ) : (
                                    [...(eventsList || [])]
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map((ev) => (
                                            <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f8f9fa] transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[12px] font-normal border border-[#dadce0] bg-[#f8f9fa] text-[#3c4043]">
                                                            {ev.type}
                                                        </span>
                                                        <span className="text-[12px] text-[#5f6368] font-normal" dir="ltr">
                                                            {ev.date ? new Date(ev.date).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-medium text-[16px] text-[#202124]">{ev.title}</h4>
                                                    {ev.location && <p className="text-[12px] text-[#5f6368] font-normal mt-0.5">מיקום: {ev.location}</p>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {ev.type !== 'יום חשיפה' && (
                                                        <button
                                                            onClick={() => setSelectedAttendanceEvent(ev)}
                                                            className="h-8 px-3 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] text-[12px] font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <Calendar size={14} /> הזן נוכחות
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setEventToEdit(ev); setIsEventModalOpen(true); }}
                                                        className="p-2 hover:bg-[#f8f9fa] text-[#5f6368] hover:text-[#202124] rounded-full transition-colors"
                                                        title="ערוך אירוע"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`האם למחוק את האירוע "${ev.title}"?`)) {
                                                                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', ev.id));
                                                                showToast('האירוע נמחק');
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-[#fce8e6] text-[#d93025] rounded-full transition-colors"
                                                        title="מחק אירוע"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {adminSubView === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-[24px] border border-[#dadce0]">
                            <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-1">חניכים רשומים</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[36px] font-medium text-[#202124] tabular-nums">{stats.total}</span>
                                <div className="bg-[#e8f0fe] text-[#1a73e8] p-3 rounded-full"><Users size={20} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-[#dadce0]">
                            <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-1">ממוצע קורס</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[36px] font-medium text-[#202124] tabular-nums">
                                    {(stats.groupGrades.reduce((a, b) => a + parseFloat(b.avg), 0) / (stats.groupGrades.length || 1)).toFixed(1)}
                                </span>
                                <div className="bg-[#e8f0fe] text-[#1a73e8] p-3 rounded-full"><TrendingUp size={20} /></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-[#dadce0] col-span-2">
                            <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-3">נוכחות במפגשים (כמות אבסולוטית)</p>
                            <div className="grid grid-cols-4 gap-2">
                                {stats.attByMeeting.map(m => (
                                    <div key={m.meeting} className="text-center">
                                        <div className="h-14 w-full bg-[#f8f9fa] rounded-lg border border-[#dadce0] relative overflow-hidden mb-1">
                                            <div className="absolute bottom-0 left-0 right-0 bg-[#1a73e8]/30 transition-all duration-700" style={{ height: `${m.percent}% ` }}></div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 leading-none">
                                                <span className="text-[14px] font-medium text-[#202124]">{m.count}</span>
                                                <span className="text-[9px] font-normal text-[#5f6368]">מתוך {stats.total}</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-medium text-[#5f6368] truncate">{m.meeting}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <section className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden h-fit">
                            <div className="p-5 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center gap-2">
                                <GraduationCap size={18} className="text-[#1a73e8]" />
                                <span className="font-medium text-[#202124] text-[16px]">חניכים לפי בית ספר</span>
                            </div>
                            <div className="p-5 max-h-[450px] overflow-y-auto space-y-2.5">
                                {Object.entries(stats.schools).sort((a, b) => b[1] - a[1]).map(([school, count]) => (
                                    <div key={school} className="flex items-center justify-between p-3.5 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                                        <span className="font-normal text-[#3c4043] text-[14px]">{school}</span>
                                        <span className="bg-white px-3 py-0.5 rounded-full font-medium text-[#1a73e8] border border-[#dadce0] text-[13px]">{count}</span>
                                    </div>
                                ))}
                                {Object.entries(stats.schools).length === 0 && <div className="text-center py-10 italic text-[#5f6368]">אין נתונים להצגה</div>}
                            </div>
                        </section>

                        <section className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden h-fit">
                            <div className="p-5 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center gap-2">
                                <BarChart3 size={18} className="text-[#1a73e8]" />
                                <span className="font-medium text-[#202124] text-[16px]">ביצועים לפי מחלקה</span>
                            </div>
                            <div className="p-5 overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="text-[#5f6368] text-[12px] font-medium border-b border-[#dadce0]">
                                            <th className="p-4 pt-0">מחלקה</th>
                                            <th className="p-4 pt-0">חניכים</th>
                                            <th className="p-4 pt-0 text-center">ממוצע ציונים</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#dadce0]">
                                        {stats.groupGrades.map(g => (
                                            <tr key={g.group} className="hover:bg-[#f8f9fa] transition-colors">
                                                <td className="p-4 font-medium text-[#202124] text-[15px]">מחלקה {g.group}</td>
                                                <td className="p-4 text-[#5f6368] text-[14px] font-normal">{g.studentCount} חניכים</td>
                                                <td className="p-4 text-center">
                                                    <span className="text-[20px] font-medium tabular-nums text-[#1a73e8]">
                                                        {g.avg}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {stats.groupGrades.length === 0 && (
                                            <tr><td colSpan={3} className="text-center py-10 italic text-[#5f6368] font-normal text-[13px]">אין מחלקות פעילות</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {adminSubView === 'users' && (
                <div className="space-y-6">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                    <UserManagementTable
                        usersList={uniqueUsersList}
                        currentRole={profile?.role || 'admin'}
                        onSelectStudent={(student) => setSelectedStudentProfile(student)}
                        onEditUser={(user) => { setUserToEdit(user); setIsAddUserModalOpen(true); }}
                        onDeleteUser={(userId) => deleteUser(userId)}
                        onOpenAddModal={() => { setUserToEdit(null); setIsAddUserModalOpen(true); }}
                        onImportCSV={() => fileInputRef.current?.click()}
                        onExportCSV={handleExportCSV}
                    />
                </div>
            )}

            {adminSubView === 'exams' && (
                <div className="space-y-6" dir="rtl">
                    <div className="flex items-center justify-between bg-white p-6 rounded-[24px] border border-[#dadce0]">
                        <div>
                            <h3 className="text-[20px] font-medium text-[#202124]">ניהול מבחנים והערכות ({exams.length})</h3>
                            <p className="text-[12px] text-[#5f6368] font-normal">הגדרת מבחנים, משקלים (סכום 100), חשיפה לצוות ולחניכים</p>
                        </div>
                        <button
                            onClick={() => { setExamToEdit(null); setIsExamModalOpen(true); }}
                            className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] flex items-center gap-1.5 transition-all shrink-0"
                        >
                            <Plus size={16} /> צור מבחן חדש
                        </button>
                    </div>

                    <div className="bg-white rounded-[24px] overflow-hidden border border-[#dadce0]">
                        <div className="divide-y divide-[#dadce0]">
                            {exams.length === 0 ? (
                                <div className="p-8 text-center text-[#5f6368] text-[14px] font-normal">אין מבחנים במערכת. לחץ על "צור מבחן חדש" כדי להתחיל.</div>
                            ) : (
                                exams.map((exam) => (
                                    <div key={exam.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f8f9fa] transition-colors">
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
                                                קטגוריות: {(exam.categories || []).map((c) => `${c.name} (${c.maxScore || c.max} נק')`).join(', ')}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <button
                                                onClick={async () => {
                                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { isVisible: !exam.isVisible }, { merge: true });
                                                    showToast(exam.isVisible ? "המבחן הוסתר מהצוות" : "המבחן נפתח לצוות");
                                                }}
                                                className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${exam.isVisible ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                                                title="פתיחת/הסתרת הזנת ציונים לצוות"
                                            >
                                                {exam.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                {exam.isVisible ? 'צוות: פתוח' : 'צוות: מוסתר'}
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { isStudentVisible: !exam.isStudentVisible }, { merge: true });
                                                    showToast(exam.isStudentVisible ? "הציונים הוסתרו מהחניכים" : "הציונים גלויים לחניכים");
                                                }}
                                                className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${exam.isStudentVisible ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                                                title="חשיפת ציונים לחניכים"
                                            >
                                                {exam.isStudentVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                {exam.isStudentVisible ? 'חניכים: גלוי' : 'חניכים: מוסתר'}
                                            </button>

                                            <button
                                                onClick={async () => {
                                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { showVerbalOnly: !exam.showVerbalOnly }, { merge: true });
                                                    showToast(exam.showVerbalOnly ? "הורדת הגדרת הערכה מילולית בלבד" : "הוגדר: לחניכים תוצג הערכה מילולית בלבד");
                                                }}
                                                className={`px-3 py-1 rounded-full font-medium text-[12px] transition-colors flex items-center gap-1.5 whitespace-nowrap ${exam.showVerbalOnly ? 'bg-[#f8f9fa] text-[#3c4043] border border-[#dadce0]' : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'}`}
                                                title="הצגת הערכה מילולית בלבד לחניכים"
                                            >
                                                <MessageSquare size={14} />
                                                {exam.showVerbalOnly ? 'מילולי בלבד' : 'ציון + מילולי'}
                                            </button>

                                            <button
                                                onClick={() => { setExamToEdit(exam); setIsExamModalOpen(true); }}
                                                className="p-2 hover:bg-[#f8f9fa] text-[#5f6368] hover:text-[#202124] rounded-full transition-colors"
                                                title="ערוך מבחן"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm(`האם למחוק את המבחן "${exam.title}"?`)) {
                                                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id));
                                                        showToast('המבחן שנבחר נמחק');
                                                    }
                                                }}
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
            )}


            {adminSubView === 'reports' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[24px] border border-[#dadce0] flex gap-6 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[13px] font-medium text-[#3c4043] block mb-2 mr-1">חיפוש חניך</label>
                            <div className="relative">
                                <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                                <input
                                    type="text"
                                    placeholder="שם או טלפון..."
                                    className="w-full h-10 pr-10 pl-4 rounded border border-[#dadce0] bg-white font-normal text-[13px] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors text-right text-[#202124] outline-none"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-[13px] font-medium text-[#3c4043] block mb-2 mr-1">סנן לפי מחלקה</label>
                            <select className="w-full h-10 px-3 rounded border border-[#dadce0] bg-white font-normal text-[13px] text-right text-[#3c4043] outline-none focus:border-[#1a73e8]" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                                <option value="all">כל המחלקות</option>
                                {[...new Set(uniqueUsersList.map(u => parseInt(u.group) || 0))].filter(g => g > 0).sort((a, b) => a - b).map(g => <option key={g} value={g.toString()}>מחלקה {g}</option>)}
                            </select>
                        </div>
                        <button onClick={handleExportCSV} className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] flex items-center gap-2 transition-all shrink-0"><Download size={18} /> ייצוא CSV</button>
                    </div>
                    <div className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-right border-collapse" dir="rtl">
                                <thead className="sticky top-0 z-10 bg-[#f8f9fa] border-b border-[#dadce0]">
                                    <tr className="text-[#5f6368] text-[12px] font-medium border-b border-[#dadce0]">
                                        <th className="p-4">חניך</th>
                                        <th className="p-4">מחלקה</th>
                                        <th className="p-4">בית ספר</th>
                                        <th className="p-2 text-center" colSpan={attendanceEvents.length}>נוכחות</th>
                                        {exams.map(e => <th key={e.id} className="p-4 text-center">{e.title}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#dadce0]">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={3 + attendanceEvents.length + exams.length} className="text-center p-8 text-[13px] font-normal text-[#5f6368]">
                                                אין חניכים במערכת התואמים את המסננים הנבחרים.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map(student => {
                                            const att = attendance[student.id] || attendance[student.phone] || attendance[student.firestoreId] || {};
                                            return (
                                                <tr key={student.firestoreId || student.id || student.phone} className="hover:bg-[#f8f9fa] transition-colors group cursor-pointer" onClick={() => setSelectedStudentProfile(student)}>
                                                    <td className="p-4 font-medium text-[#1a73e8] hover:underline text-[14px]">{student.name || student.fullName}</td>
                                                    <td className="p-4 text-[#202124] font-normal text-[14px]">{student.group || 0}</td>
                                                    <td className="p-4 text-[#5f6368] text-[13px] font-normal">{student.school || 'לא שויך'}</td>
                                                    {attendanceEvents.map(ev => {
                                                        const status = att[ev.id];
                                                        return (
                                                            <td key={ev.id} className="p-1 text-center">
                                                                <div className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center ${status === true ? 'bg-[#188038] text-white' : status === false ? 'bg-[#d93025] text-white' : 'bg-[#f8f9fa] text-[#5f6368]'}`}>
                                                                    {status === true && <Check size={12} />}
                                                                    {status === false && <X size={12} className="stroke-[2.5]" />}
                                                                    {status === undefined && <span className="text-[10px]">-</span>}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    {exams.map(exam => {
                                                        const g = grades[`${student.id}_${exam.id}`] || grades[`${student.phone}_${exam.id}`] || grades[`${student.firestoreId}_${exam.id}`];
                                                        const total = g && g.scores ? Object.values(g.scores).reduce((a, b) => (parseInt(a) || 0) + (parseInt(b) || 0), 0) : null;
                                                        return <td key={exam.id} className="p-4 text-center font-medium text-[16px] tabular-nums text-[#202124]">
                                                            {total !== null ? <span className={total >= 85 ? 'text-emerald-600' : 'text-slate-900'}>{total}</span> : "--"}
                                                        </td>;
                                                    })}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {selectedStudentProfile && (
                <StudentProfileModal
                    student={selectedStudentProfile}
                    onClose={() => setSelectedStudentProfile(null)}
                    currentProfile={profile}
                    exams={exams}
                    grades={grades}
                    attendance={attendance}
                    notes={notes}
                    eventsList={eventsList}
                    showToast={showToast}
                />
            )}

            {isAddUserModalOpen && (
                <UserFormModal
                    userToEdit={userToEdit}
                    onClose={() => { setIsAddUserModalOpen(false); setUserToEdit(null); }}
                    showToast={showToast}
                />
            )}

            {isExamModalOpen && (
                <ExamBuilderModal
                    examToEdit={examToEdit}
                    onClose={() => { setIsExamModalOpen(false); setExamToEdit(null); }}
                    showToast={showToast}
                />
            )}

            {gradeModalExam && gradeModalStudent && (
                <GradeEntryModal
                    exam={gradeModalExam}
                    student={gradeModalStudent}
                    existingGrade={grades[`${gradeModalStudent.id || gradeModalStudent.phone}_${gradeModalExam.id}`]}
                    onClose={() => { setGradeModalExam(null); setGradeModalStudent(null); }}
                    showToast={showToast}
                />
            )}

            {isEventModalOpen && (
                <EventBuilderModal
                    eventToEdit={eventToEdit}
                    onClose={() => { setIsEventModalOpen(false); setEventToEdit(null); }}
                    showToast={showToast}
                />
            )}
        </div>
    );
}
