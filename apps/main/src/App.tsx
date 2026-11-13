import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { Toast } from './components/ui/Toast';
import { Modal } from './components/ui/Modal';
import { A2HSPrompt } from './components/A2HSPrompt';
import { UpdatePromptToast } from './components/ui/UpdatePromptToast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, appId } from './config/firebase';
import { UserProfile, UserRole } from './types/user';
import { ModalState, ToastState } from './types/ui';

const LoginView = React.lazy(() => import('./views/LoginView'));
const AdminView = React.lazy(() => import('./views/AdminView'));
const InstructorView = React.lazy(() => import('./views/InstructorView'));
const StudentView = React.lazy(() => import('./views/StudentView'));
const GameView = React.lazy(() => import('./views/game/GameView'));

const ViewSkeleton: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" dir="rtl" aria-busy="true" aria-live="polite">
        <Loader2 className="animate-spin text-[#1a73e8] mb-3" size={36} />
        <p className="text-[14px] text-[#5f6368] font-medium animate-pulse">טוען תצוגה...</p>
    </div>
);

const AppContent: React.FC = () => {
    const { user, profile, loading: authLoading, logout } = useAuth();

    const isGameRoute = () => {
        if (typeof window === 'undefined') return false;
        const p = window.location.pathname.toLowerCase();
        const h = window.location.hash.toLowerCase();
        const s = window.location.search.toLowerCase();
        return p === '/game' || p.startsWith('/game/') || h.includes('game') || s.includes('game');
    };

    const [view, setViewInternal] = useState<string>(() => {
        if (isGameRoute()) return 'game';
        return profile ? (profile.role || 'student').toLowerCase() : 'login';
    });

    useEffect(() => {
        if (view === 'game' || isGameRoute()) return;
        if (profile) {
            setViewInternal((profile.role || 'student').toLowerCase());
        } else {
            setViewInternal('login');
        }
    }, [profile, view]);

    const setView = (newView: string, push = true) => {
        if (newView === 'login') {
            logout();
        }
        setViewInternal(newView);
        if (push) {
            window.history.pushState({ view: newView }, '', '');
        }
    };

    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [grades, setGrades] = useState<Record<string, any>>({});
    const [attendance, setAttendance] = useState<Record<string, any>>({});
    const [notes, setNotes] = useState<Record<string, any>>({});
    const [siteSettings, setSiteSettings] = useState<any>(null);
    const [eventsList, setEventsList] = useState<any>([]);

    const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
    const [modal, setModal] = useState<ModalState>({ show: false, title: '', message: '', isConfirm: false });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    };

    const showAlert = (title: string, message: string) => {
        setModal({ show: true, title, message, isConfirm: false, onConfirm: () => setModal((m) => ({ ...m, show: false })) });
    };

    // Public site configuration subscription (needed on LoginView for isSiteClosed & staffLoginMethod)
    useEffect(() => {
        if (!user) return;
        const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'config'), (d) => {
            if (d.exists()) setSiteSettings(d.data());
        });
        return () => unsubSettings();
    }, [user]);

    // SEC-HIGH-02: Gate authenticated Firestore subscriptions (exams, users, events) until a verified profile is active
    useEffect(() => {
        if (!user || !profile) {
            setUsersList([]);
            setExams([]);
            setEventsList([]);
            return;
        }

        const unsubExams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), (s) =>
            setExams(s.docs.map((d) => ({ id: d.id, ...d.data() })))
        );

        // SEC-02: Isolate user list to staff only. Students never receive the full roster.
        let unsubUsers = () => {};
        if (profile.role !== 'student') {
            unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (s) =>
                setUsersList(s.docs.map((d) => ({ id: d.id, phone: d.id, firestoreId: d.id, ...d.data() } as unknown as UserProfile)))
            );
        } else if (profile.role === 'student' && profile.id) {
            unsubUsers = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'users', profile.id), (d) => {
                if (d.exists()) {
                    setUsersList([{ id: d.id, phone: d.id, firestoreId: d.id, ...d.data() } as unknown as UserProfile]);
                }
            });
        }

        const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), async (s) => {
            const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            setEventsList(docs);

            // Only allow staff/admin sessions to seed initial default events
            if (s.empty && profile.role !== 'student') {
                const defaultMeetings = [1, 2, 3, 4, 'פסח', 5, 6, 'קורס קיץ'];
                const now = new Date();
                const batch = writeBatch(db);
                defaultMeetings.forEach((m, idx) => {
                    const id = m.toString();
                    const dateStr = new Date(now.getTime() - (defaultMeetings.length - idx) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T17:00';
                    const eventRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', id);
                    batch.set(eventRef, {
                        title: typeof m === 'number' ? `מפגש הכנה ${m}` : m,
                        type: 'מפגש',
                        date: dateStr,
                        location: 'בית ספר המארח',
                    });
                });
                try {
                    await batch.commit();
                } catch (err) {
                    console.error('Failed to seed default meetings:', err);
                }
            }
        });
        return () => {
            unsubExams();
            unsubUsers();
            unsubEvents();
        };
    }, [user, profile]);

    // Auto-persist admin profile to Firestore if not already present
    useEffect(() => {
        if (!user || !profile || profile.role !== 'admin' || !profile.phone) return;
        const phone = profile.phone;
        const adminName = (profile.name || profile.fullName || '').trim();
        if (!adminName) return;
        const exists = usersList.some((u) => u.phone === phone || u.id === phone);
        if (!exists) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', phone);
            setDoc(userRef, {
                id: phone,
                name: adminName,
                fullName: adminName,
                phone: phone,
                role: 'admin',
                school: profile.school || 'מנהלה',
                tags: profile.tags || [],
                createdAt: new Date().toISOString()
            }, { merge: true }).catch((err) => {
                console.warn('Syncing admin user to Firestore:', err);
            });
        }
    }, [user, profile, usersList]);

    // Scoped Data Fetching for Student vs Staff
    useEffect(() => {
        if (!user || !profile) {
            setTimeout(() => {
                setGrades({});
                setAttendance({});
                setNotes({});
            }, 0);
            return;
        }

        if (profile.role === 'student') {
            const unsubGrades = onSnapshot(
                query(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), where('studentId', '==', profile.id)),
                (s) => {
                    const m: Record<string, any> = {};
                    s.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
                    setGrades(m);
                }
            );
            const unsubNotes = onSnapshot(
                query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('studentId', '==', profile.id)),
                (s) => {
                    const m: Record<string, any> = {};
                    s.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
                    setNotes(m);
                }
            );
            const unsubAtt = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', profile.id || ''), (d) => {
                const m: Record<string, any> = {};
                if (d.exists()) m[d.id] = { id: d.id, ...d.data() };
                setAttendance(m);
            });
            return () => {
                unsubGrades();
                unsubNotes();
                unsubAtt();
            };
        } else {
            // Staff global sync
            const unsubGrades = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'grades'), (s) => {
                const m: Record<string, any> = {};
                s.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
                setGrades(m);
            });
            const unsubAtt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), (s) => {
                const m: Record<string, any> = {};
                s.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
                setAttendance(m);
            });
            const unsubNotes = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), (s) => {
                const m: Record<string, any> = {};
                s.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
                setNotes(m);
            });
            return () => {
                unsubGrades();
                unsubAtt();
                unsubNotes();
            };
        }
    }, [user, profile]);

    // Check Site Closed status (strictly role-based, no hardcoded name bypass)
    useEffect(() => {
        if (siteSettings?.isSiteClosed && profile && profile.role !== 'admin') {
            setTimeout(() => {
                logout();
                showAlert('המערכת סגורה', 'הי! האתר סגור כרגע לכניסה, ניפגש בהמשך!');
            }, 0);
        }
    }, [siteSettings?.isSiteClosed, profile]);

    // Handle Browser Back / Forward
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.view) {
                setViewInternal(event.state.view);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const deleteUser = async (userId: string) => {
        if (!userId) {
            showToast('מזהה משתמש לא תקין', 'error');
            return;
        }

        try {
            // Ensure auth is active before writing to Firestore
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
            // Optimistically filter out from local state immediately
            setUsersList((prev) => prev.filter((u) => u.id !== userId && u.phone !== userId));
            showToast('המשתמש נמחק בהצלחה');
        } catch (err: any) {
            console.error('Delete user error:', err);
            showToast(`שגיאה במחיקת המשתמש: ${err?.message || err}`, 'error');
        }
    };

    if (view === 'game' || isGameRoute()) {
        return (
            <React.Suspense fallback={<ViewSkeleton />}>
                <GameView />
            </React.Suspense>
        );
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
                <Loader2 className="animate-spin text-[#1a73e8]" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-sans text-[#202124]">
            {/* A11Y-01: Accessible Skip to Content Link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-100 focus:px-4 focus:py-2.5 focus:bg-[#1a73e8] focus:text-white focus:font-medium focus:text-[14px] focus:rounded-lg focus:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-white"
            >
                דלג לתוכן המרכזי
            </a>

            <Toast toast={toast} />
            <Modal modal={modal} setModal={setModal} />
            <A2HSPrompt />
            <UpdatePromptToast />

            <main id="main-content" tabIndex={-1} className="outline-hidden">
                <React.Suspense fallback={<ViewSkeleton />}>
                    {!profile || view === 'login' ? (
                        <LoginView
                            usersList={usersList}
                            siteSettings={siteSettings}
                            showToast={showToast}
                            onLoginSuccess={() => {
                                const targetView = profile ? (profile.role || 'student').toLowerCase() : 'student';
                                setView(targetView);
                            }}
                        />
                    ) : (
                        <>
                            {view === 'student' && (
                                <ProtectedRoute allowedRoles={['student', 'instructor', 'assistant', 'admin', 'inspector'] as UserRole[]}>
                                    <StudentView
                                        profile={profile}
                                        exams={exams}
                                        grades={grades}
                                        attendance={attendance}
                                        eventsList={eventsList}
                                        setView={setView}
                                    />
                                </ProtectedRoute>
                            )}

                            {(view === 'instructor' || view === 'assistant') && (
                                <ProtectedRoute allowedRoles={['instructor', 'assistant', 'admin', 'inspector'] as UserRole[]}>
                                    <InstructorView
                                        profile={profile}
                                        usersList={usersList}
                                        exams={exams}
                                        grades={grades}
                                        attendance={attendance}
                                        notes={notes}
                                        eventsList={eventsList}
                                        setView={setView}
                                        showToast={showToast}
                                    />
                                </ProtectedRoute>
                            )}

                            {(view === 'admin' || view === 'inspector') && (
                                <ProtectedRoute allowedRoles={['admin', 'inspector'] as UserRole[]}>
                                    <AdminView
                                        profile={profile}
                                        usersList={usersList}
                                        exams={exams}
                                        grades={grades}
                                        attendance={attendance}
                                        notes={notes}
                                        eventsList={eventsList}
                                        deleteUser={deleteUser}
                                        setView={setView}
                                        showToast={showToast}
                                        showAlert={showAlert}
                                        siteSettings={siteSettings}
                                    />
                                </ProtectedRoute>
                            )}
                        </>
                    )}
                </React.Suspense>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
