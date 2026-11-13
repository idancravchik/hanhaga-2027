import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Users, Plus, GraduationCap,
    FileText, PieChart, Lock, Unlock, Calendar, KeyRound, Smartphone, Megaphone
} from 'lucide-react';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../config/firebase';
import { LOGO_URL } from '../config/constants';
import { parseUsersCSV, exportUsersToCSV } from '../utils/csv';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { UserProfile, UserRole } from '../types/user';
import { Exam, GradeRecord } from '../types/exam';
import { CourseEvent, AttendanceMap } from '../types/event';
import { BulletinBoardBanner } from '../components/bulletin/BulletinBoardBanner';

import { AdminEventsView } from './admin/AdminEventsView';
import { AdminAnalyticsView } from './admin/AdminAnalyticsView';
import { AdminUsersView } from './admin/AdminUsersView';
import { AdminExamsView } from './admin/AdminExamsView';
import { AdminReportsView } from './admin/AdminReportsView';

const StudentProfileModal = React.lazy(() => import('../components/users/StudentProfileModal').then(m => ({ default: m.StudentProfileModal })));
const UserFormModal = React.lazy(() => import('../components/users/UserFormModal').then(m => ({ default: m.UserFormModal })));
const ExamBuilderModal = React.lazy(() => import('../components/exams/ExamBuilderModal').then(m => ({ default: m.ExamBuilderModal })));
const GradeEntryModal = React.lazy(() => import('../components/exams/GradeEntryModal').then(m => ({ default: m.GradeEntryModal })));
const EventBuilderModal = React.lazy(() => import('../components/events/EventBuilderModal').then(m => ({ default: m.EventBuilderModal })));
const BulletinEditorModal = React.lazy(() => import('../components/bulletin/BulletinEditorModal').then(m => ({ default: m.BulletinEditorModal })));

export interface SiteSettings {
    isSiteClosed?: boolean;
    staffLoginMethod?: 'otp' | 'passcode';
    [key: string]: any;
}

export interface AdminViewProps {
    profile: UserProfile;
    usersList: UserProfile[];
    exams: Exam[];
    grades: Record<string, GradeRecord | any>;
    attendance: AttendanceMap;
    notes: Record<string, any>;
    eventsList?: CourseEvent[];
    deleteUser: (userId: string) => Promise<void> | void;
    setView: (view: string) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    showAlert: (title: string, message: string) => void;
    siteSettings?: SiteSettings;
}

type AdminSubView = 'reports' | 'analytics' | 'users' | 'exams' | 'events';

export default function AdminView({
    profile,
    usersList,
    exams,
    grades,
    attendance,
    notes,
    eventsList = [],
    deleteUser,
    setView,
    showToast,
    showAlert,
    siteSettings
}: AdminViewProps) {
    const [adminSubView, setAdminSubViewInternal] = useState<AdminSubView>('reports');
    const [selectedStudentProfile, setSelectedStudentProfile] = useState<UserProfile | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
    const [gradeModalExam, setGradeModalExam] = useState<Exam | null>(null);
    const [gradeModalStudent, setGradeModalStudent] = useState<UserProfile | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CourseEvent | null>(null);
    const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState<CourseEvent | null>(null);
    const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePushState = (newSubView: AdminSubView, studentId: string | null) => {
        const newState = {
            view: profile?.role === 'admin' || profile?.role === 'inspector' ? profile.role : 'login',
            adminSubView: newSubView,
            selectedStudentId: studentId
        };
        window.history.pushState(newState, '', '');
    };

    const setAdminSubView = (v: AdminSubView, push = true) => {
        setAdminSubViewInternal(v);
        if (push) handlePushState(v, selectedStudentProfile?.id || null);
    };

    const handleSelectStudentProfile = (student: UserProfile | null, push = true) => {
        setSelectedStudentProfile(student);
        if (push) handlePushState(adminSubView, student?.id || null);
    };

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && (event.state.view === 'admin' || event.state.view === 'inspector')) {
                setAdminSubViewInternal((event.state.adminSubView as AdminSubView) || 'reports');
                const student = usersList.find(u => u.id === event.state.selectedStudentId || u.id === event.state.selectedStudentCard);
                setSelectedStudentProfile(student || null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [usersList]);

    const [filterDept, setFilterDept] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const attendanceEvents = useMemo(() => {
        return (eventsList || [])
            .filter((e: CourseEvent) => e.type !== 'יום חשיפה')
            .sort((a: CourseEvent, b: CourseEvent) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [eventsList]);

    const filteredStudents = useMemo(() => {
        return usersList.filter(u => {
            const role = (u.role || 'student').toLowerCase();
            const matchRole = role === 'student';
            const normGroup = parseInt(String(u.group || 0), 10) || 0;
            const matchDept = filterDept === 'all' || normGroup.toString() === filterDept;
            const nameStr = (u.name || u.fullName || '').toLowerCase();
            const phoneStr = (u.phone || u.id || u.firestoreId || '').toString();
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q || nameStr.includes(q) || phoneStr.includes(q);
            return matchRole && matchDept && matchSearch;
        });
    }, [usersList, filterDept, searchQuery]);

    const stats = useMemo(() => {
        const students = usersList.filter(u => u.role === 'student');
        const total = students.length;

        const schools = students.reduce<Record<string, number>>((acc, s) => {
            const schName = s.school || 'לא שויך';
            acc[schName] = (acc[schName] || 0) + 1;
            return acc;
        }, {});

        const attByMeeting = attendanceEvents.map(ev => {
            const present = students.filter(s => {
                const sId = s.id || s.phone || s.firestoreId;
                return sId ? !!attendance[sId]?.[ev.id] : false;
            }).length;
            return { meeting: ev.title, count: present, percent: total ? Math.round((present / total) * 100) : 0 };
        });

        const groupGrades = [...new Set(students.map(s => parseInt(String(s.group || 0), 10) || 0))]
            .filter(g => g > 0)
            .sort((a, b) => a - b)
            .map(gNum => {
                const gStudents = students.filter(s => (parseInt(String(s.group || 0), 10) || 0) === gNum);
                let totalSum = 0;
                let count = 0;
                gStudents.forEach(s => {
                    exams.forEach(e => {
                        const sId = s.id || s.phone || s.firestoreId;
                        const gData = sId ? grades[`${sId}_${e.id}`] : undefined;
                        if (gData && gData.scores) {
                            const sum = Object.values(gData.scores as Record<string, unknown>).reduce((a: number, b: unknown) => a + (parseInt(String(b || 0), 10) || 0), 0);
                            totalSum += sum;
                            count++;
                        }
                    });
                });
                return { group: gNum.toString(), avg: count ? (totalSum / count).toFixed(1) : '0', studentCount: gStudents.length };
            });

        return { total, schools, attByMeeting, groupGrades };
    }, [usersList, attendance, grades, exams, attendanceEvents]);

    const isIdan = profile?.name?.trim() === "עידן קרבצ'יק";

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event: ProgressEvent<FileReader>) => {
            const text = event.target?.result as string;
            if (!text) return;
            const { users, errors, count } = parseUsersCSV(text);

            if (users.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < users.length; i += batchSize) {
                    const chunk = users.slice(i, i + batchSize);
                    const batch = writeBatch(db);
                    chunk.forEach((u: any) => {
                        const userRef = doc(db, `artifacts/${appId}/public/data/users/${u.id}`);
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
        exportUsersToCSV(usersList, attendance, grades, eventsList, exams, 'דוח_מנהיגות');
        showToast('הדוח יוצא בהצלחה!');
    };

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-4 sm:space-y-6 pb-24 sm:pb-8 text-right text-[#202124] font-sans" dir="rtl">
            <header className="bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <img src={LOGO_URL} className="w-9 h-9 sm:w-10 sm:h-10 object-contain" alt="Logo" />
                    <h2 className="text-[17px] sm:text-[20px] font-medium text-[#202124] leading-tight">ניהול קורס - {profile.name || profile.fullName}</h2>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {(isIdan || profile?.role === 'admin') && (
                        <button
                            onClick={() => setIsBulletinModalOpen(true)}
                            className="h-9 px-3.5 rounded-full transition-colors bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] border border-[#d2e3fc] flex items-center gap-1.5 font-medium text-[13px] shadow-2xs hover:shadow-xs cursor-pointer"
                            title="ערוך לוח מודעות ועדכונים (חניכים ומדריכים)"
                            aria-label="ערוך לוח מודעות ועדכונים"
                        >
                            <Megaphone size={16} />
                            <span>לוח מודעות</span>
                        </button>
                    )}
                    {(isIdan || profile?.role === 'admin') && (
                        <>
                            <button
                                onClick={async () => {
                                    const nextMethod = siteSettings?.staffLoginMethod === 'otp' ? 'passcode' : 'otp';
                                    await setDoc(doc(db, 'artifacts', appId, 'public', 'config'), { staffLoginMethod: nextMethod }, { merge: true });
                                    showToast(nextMethod === 'otp' ? "מצב כניסת צוות שונה ל-SMS (OTP)" : "מצב כניסת צוות שונה לקוד גישה סטטי");
                                }}
                                className="h-9 px-3 rounded-full transition-colors bg-[#f8f9fa] text-[#174ea6] border border-[#dadce0] hover:bg-[#e8f0fe] flex items-center gap-1.5 font-medium text-[13px] cursor-pointer"
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
                                className={`h-9 px-3 rounded-full transition-colors border cursor-pointer ${siteSettings?.isSiteClosed ? 'bg-[#fce8e6] text-[#991b1b] border-[#fce8e6]' : 'bg-[#f8f9fa] text-[#3c4043] border-[#dadce0] hover:text-[#202124]'}`}
                                title={siteSettings?.isSiteClosed ? 'פתח אתר' : 'נעילת אתר חירום למשתמשים'}
                            >
                                {siteSettings?.isSiteClosed ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                        </>
                    )}
                    <button onClick={() => setView('login')} className="h-9 px-4 rounded-full text-[#991b1b] font-semibold bg-[#fee2e2] hover:bg-[#fecaca] transition-colors text-[13px] cursor-pointer">התנתק</button>
                </div>
            </header>

            <BulletinBoardBanner
                boardId="instructors"
                showEditButton={true}
                onEditClick={() => setIsBulletinModalOpen(true)}
            />

            {/* Admin Subview Navigation Bar */}
            <div className="hidden sm:flex w-full bg-white p-1 rounded-full border border-[#dadce0] gap-1 overflow-x-auto no-scrollbar shrink-0">
                <button onClick={() => setAdminSubView('reports')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all cursor-pointer ${adminSubView === 'reports' ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:text-[#202124]'}`}>דוחות קורס</button>
                <button onClick={() => setAdminSubView('analytics')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all cursor-pointer ${adminSubView === 'analytics' ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:text-[#202124]'}`}>אנליטיקה</button>
                <button onClick={() => setAdminSubView('users')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all cursor-pointer ${adminSubView === 'users' ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:text-[#202124]'}`}>משתמשים</button>
                <button onClick={() => setAdminSubView('exams')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all cursor-pointer ${adminSubView === 'exams' ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:text-[#202124]'}`}>מבחנים</button>
                <button onClick={() => setAdminSubView('events')} className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-full font-medium text-[13px] sm:text-[14px] whitespace-nowrap transition-all cursor-pointer ${adminSubView === 'events' ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:text-[#202124]'}`}>לוח אירועים</button>
            </div>

            {/* SubView Contents */}
            {adminSubView === 'events' && (
                <AdminEventsView
                    eventsList={eventsList}
                    selectedAttendanceEvent={selectedAttendanceEvent}
                    setSelectedAttendanceEvent={setSelectedAttendanceEvent}
                    filteredStudents={filteredStudents}
                    attendance={attendance}
                    showToast={showToast}
                    onOpenAddEvent={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
                    onEditEvent={(ev) => { setEventToEdit(ev); setIsEventModalOpen(true); }}
                    onDeleteEvent={async (ev) => {
                        if (window.confirm(`האם למחוק את האירוע "${ev.title}"?`)) {
                            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', ev.id));
                            showToast('האירוע שנבחר נמחק');
                        }
                    }}
                />
            )}

            {adminSubView === 'analytics' && (
                <AdminAnalyticsView stats={stats} />
            )}

            {adminSubView === 'users' && (
                <AdminUsersView
                    uniqueUsersList={usersList}
                    currentRole={(profile?.role || 'admin') as UserRole}
                    onSelectStudent={(student) => handleSelectStudentProfile(student)}
                    onEditUser={(user) => { setUserToEdit(user); setIsAddUserModalOpen(true); }}
                    onDeleteUser={(userId) => deleteUser(userId)}
                    onOpenAddModal={() => { setUserToEdit(null); setIsAddUserModalOpen(true); }}
                    onExportCSV={handleExportCSV}
                    fileInputRef={fileInputRef}
                    handleImportCSV={handleImportCSV}
                />
            )}

            {adminSubView === 'exams' && (
                <AdminExamsView
                    exams={exams}
                    onOpenAddExam={() => { setExamToEdit(null); setIsExamModalOpen(true); }}
                    onEditExam={(exam) => { setExamToEdit(exam); setIsExamModalOpen(true); }}
                    onDeleteExam={async (exam) => {
                        if (window.confirm(`האם למחוק את המבחן "${exam.title}"?`)) {
                            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id));
                            showToast('המבחן שנבחר נמחק');
                        }
                    }}
                    onToggleExamVisibility={async (exam) => {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { isVisible: !exam.isVisible }, { merge: true });
                        showToast(exam.isVisible ? "המבחן הוסתר מהצוות" : "המבחן נפתח לצוות");
                    }}
                    onToggleStudentVisibility={async (exam) => {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { isStudentVisible: !exam.isStudentVisible }, { merge: true });
                        showToast(exam.isStudentVisible ? "הציונים הוסתרו מהחניכים" : "הציונים גלויים לחניכים");
                    }}
                    onToggleVerbalOnly={async (exam) => {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', exam.id), { showVerbalOnly: !exam.showVerbalOnly }, { merge: true });
                        showToast(exam.showVerbalOnly ? "הורדת הגדרת הערכה מילולית בלבד" : "הוגדר: לחניכים תוצג הערכה מילולית בלבד");
                    }}
                />
            )}

            {adminSubView === 'reports' && (
                <AdminReportsView
                    uniqueUsersList={usersList}
                    filteredStudents={filteredStudents}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterDept={filterDept}
                    setFilterDept={setFilterDept}
                    attendanceEvents={attendanceEvents}
                    attendance={attendance}
                    exams={exams}
                    grades={grades}
                    handleSelectStudentProfile={(student) => handleSelectStudentProfile(student)}
                    handleExportCSV={handleExportCSV}
                />
            )}

            {/* Global Modals */}
            <React.Suspense fallback={null}>
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

                {isBulletinModalOpen && (
                    <BulletinEditorModal
                        isOpen={isBulletinModalOpen}
                        onClose={() => setIsBulletinModalOpen(false)}
                        showToast={showToast}
                        currentUserName={profile.name || profile.fullName}
                    />
                )}
            </React.Suspense>

            {/* Version Footer */}
            <footer className="mt-8 mb-20 sm:mb-8 text-center text-[12px] text-[#5f6368] font-normal" aria-label="גרסת מערכת">
                קורס הנהגה • גרסה 1.0.0
            </footer>

            <MobileBottomNav
                ariaLabel="ניווט מערכת ניהול למובייל"
                items={[
                    { id: 'reports', label: 'דוחות', icon: FileText, onClick: () => setAdminSubView('reports'), active: adminSubView === 'reports' },
                    { id: 'analytics', label: 'ניתוח', icon: PieChart, onClick: () => setAdminSubView('analytics'), active: adminSubView === 'analytics' },
                    { id: 'users', label: 'משתמשים', icon: Users, onClick: () => setAdminSubView('users'), active: adminSubView === 'users' },
                    { id: 'exams', label: 'מבחנים', icon: GraduationCap, onClick: () => setAdminSubView('exams'), active: adminSubView === 'exams' },
                    { id: 'events', label: 'אירועים', icon: Calendar, onClick: () => setAdminSubView('events'), active: adminSubView === 'events' },
                ]}
            />
        </div>
    );
}
