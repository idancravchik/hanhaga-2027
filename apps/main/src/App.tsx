import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { Toast } from './components/ui/Toast';
import { Modal } from './components/ui/Modal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db, appId } from './config/firebase';
import { UserProfile, UserRole } from './types/user';
import { ModalState, ToastState } from './types/ui';

import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import InstructorView from './views/InstructorView';
import StudentView from './views/StudentView';

const AppContent: React.FC = () => {
    const { user, profile, role, loading: authLoading, logout } = useAuth();

    const [view, setViewInternal] = useState<string>(() => {
        return profile ? (profile.role || 'student').toLowerCase() : 'login';
    });

    useEffect(() => {
        if (profile) {
            setViewInternal((profile.role || 'student').toLowerCase());
        } else {
            setViewInternal('login');
        }
    }, [profile]);

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

    // Firebase Data Subscriptions
    useEffect(() => {
        if (!user) return;
        const unsubExams = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), (s) =>
            setExams(s.docs.map((d) => ({ id: d.id, ...d.data() })))
        );
        const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (s) =>
            setUsersList(s.docs.map((d) => ({ id: d.id, phone: d.id, firestoreId: d.id, ...d.data() } as unknown as UserProfile)))
        );
        const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'config'), (d) => {
            if (d.exists()) setSiteSettings(d.data());
        });
        const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), async (s) => {
            const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
            setEventsList(docs);

            if (s.empty) {
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
            unsubSettings();
            unsubEvents();
        };
    }, [user]);

    // Auto-persist admin profile to Firestore if not already present
    useEffect(() => {
        if (!user || !profile || profile.role !== 'admin' || !profile.phone) return;
        const phone = profile.phone;
        const exists = usersList.some((u) => u.phone === phone || u.id === phone);
        if (!exists) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', phone);
            setDoc(userRef, {
                id: phone,
                name: profile.name || profile.fullName || "עידן קרבצ'יק",
                fullName: profile.fullName || profile.name || "עידן קרבצ'יק",
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
                    s.docs.forEach((d) => (m[d.id] = d.data()));
                    setGrades(m);
                }
            );
            const unsubNotes = onSnapshot(
                query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('studentId', '==', profile.id)),
                (s) => {
                    const m: Record<string, any> = {};
                    s.docs.forEach((d) => (m[d.id] = d.data()));
                    setNotes(m);
                }
            );
            const unsubAtt = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', profile.id || ''), (d) => {
                const m: Record<string, any> = {};
                if (d.exists()) m[d.id] = d.data();
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
                s.docs.forEach((d) => (m[d.id] = d.data()));
                setGrades(m);
            });
            const unsubAtt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), (s) => {
                const m: Record<string, any> = {};
                s.docs.forEach((d) => (m[d.id] = d.data()));
                setAttendance(m);
            });
            const unsubNotes = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), (s) => {
                const m: Record<string, any> = {};
                s.docs.forEach((d) => (m[d.id] = d.data()));
                setNotes(m);
            });
            return () => {
                unsubGrades();
                unsubAtt();
                unsubNotes();
            };
        }
    }, [user, profile]);

    // Check Site Closed status
    useEffect(() => {
        if (siteSettings?.isSiteClosed && profile && (profile as any).name?.trim() !== "עידן קרבצ'יק" && profile.role !== 'admin') {
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
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId));
            showToast('המשתמש נמחק בהצלחה');
        } catch (err) {
            showToast('שגיאה במחיקת המשתמש', 'error');
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
                <Loader2 className="animate-spin text-[#1a73e8]" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-sans text-[#202124]">
            <Toast toast={toast} />
            <Modal modal={modal} setModal={setModal} />

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
