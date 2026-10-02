import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, appId } from '@/config/firebase';
import { UserProfile, UserRole } from '@/types/user';
import { normalizeName, normalizePhone } from '@/utils/normalize';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    loading: boolean;
    loginStudent: (name: string, phone: string, usersList: UserProfile[]) => Promise<{ success: boolean; message?: string }>;
    requestStaffOTP: (phone: string, name: string, usersList: UserProfile[]) => Promise<{ success: boolean; step?: 'otp'; message?: string; roleFound?: UserRole }>;
    verifyStaffOTP: (otp: string, pendingUser?: UserProfile | null) => Promise<{ success: boolean; message?: string }>;
    loginStaffWithStaticPasscode: (name: string, phone: string, passcode: string, usersList: UserProfile[]) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'hanhaga_profile';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const getStaffToken = (phone: string = '') => {
    const passcode = (import.meta.env.VITE_STAFF_PASSCODE || '').trim();
    if (!passcode || !phone) return '';
    try {
        return btoa(`${phone}:${passcode}`);
    } catch {
        return '';
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                    localStorage.removeItem(STORAGE_KEY);
                    return null;
                }
                const p = parsed.profile || parsed;
                if (!p) return null;

                // SEC-05: Prevent client-side role escalation via localStorage tampering
                if (p.role && p.role !== 'student') {
                    const expectedToken = getStaffToken(p.phone || p.id);
                    if (!expectedToken || parsed.staffToken !== expectedToken) {
                        console.warn('[SECURITY] Forged or unverified staff session detected in localStorage. Clearing session.');
                        localStorage.removeItem(STORAGE_KEY);
                        return null;
                    }
                }
                return p;
            }
            return null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [pendingStaffUser, setPendingStaffUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        // Ensure anonymous fallback auth so Firebase Firestore calls are authenticated
        signInAnonymously(auth).catch((err) => {
            console.error('Anonymous auth error:', err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Ensure auth is active whenever a profile exists (e.g. restored from localStorage)
    useEffect(() => {
        if (profile && !auth.currentUser) {
            signInAnonymously(auth).catch((err) => {
                console.error('Re-auth error for active profile:', err);
            });
        }
    }, [profile, user]);

    // Security Guard: Verify privileged roles (admin, instructor, assistant, inspector) to prevent client-side role escalation
    useEffect(() => {
        if (!profile || profile.role === 'student') return;
        const phone = profile.phone || profile.id;
        if (!phone) return;

        const verifyStaffSession = async () => {
            try {
                await ensureAuth();
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', phone));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role !== profile.role) {
                        console.warn('[SECURITY] Role mismatch detected! Demoting session.');
                        setSessionProfile({ ...profile, role: (data.role || 'student') });
                    }
                } else {
                    const bootstrapPhone = import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE;
                    if (!bootstrapPhone || phone !== bootstrapPhone) {
                        console.warn('[SECURITY] Forged staff profile detected! Clearing session.');
                        setSessionProfile(null);
                    }
                }
            } catch (err) {
                console.warn('Role verification check failed:', err);
            }
        };
        verifyStaffSession();
    }, [profile?.role, profile?.id, profile?.phone]);

    const ensureAuth = async () => {
        if (!auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (err) {
                console.error('Ensure auth error:', err);
            }
        }
    };

    const role: UserRole | null = profile?.role ? (profile.role.toLowerCase() as UserRole) : null;

    const setSessionProfile = (p: UserProfile | null) => {
        setProfile(p);
        if (p) {
            const expiresAt = Date.now() + SESSION_DURATION_MS;
            const staffToken = (p.role && p.role !== 'student') ? getStaffToken(p.phone || p.id || '') : undefined;
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: p, expiresAt, staffToken }));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    // Student Login: No SMS required, validates against user list or direct Firestore lookup
    const loginStudent = async (name: string, phone: string, usersList: UserProfile[]): Promise<{ success: boolean; message?: string }> => {
        const normName = normalizeName(name);
        const normPhone = normalizePhone(phone);

        if (!normName) return { success: false, message: 'הכנס שם מלא' };
        if (!normPhone || normPhone.length < 9) return { success: false, message: 'הכנס מספר טלפון תקין' };

        let found = (usersList || []).find((u) => {
            const uName = normalizeName(u.name || u.fullName);
            const uPhone = normalizePhone(u.phone || u.id);
            return uName === normName && uPhone === normPhone;
        });

        // Cold-load direct document lookup: resolves race conditions when usersList is not yet loaded
        if (!found) {
            try {
                await ensureAuth();
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', normPhone));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const uName = normalizeName(data.name || data.fullName);
                    if (uName === normName) {
                        found = { id: userDoc.id, phone: userDoc.id, ...data } as UserProfile;
                    }
                }
            } catch (err) {
                console.warn('Direct user lookup fallback failed:', err);
            }
        }

        if (!found) {
            return { success: false, message: 'משתמש לא נמצא. וודא שהפרטים מופעים במערכת.' };
        }

        const userRole = (found.role || 'student').toLowerCase() as UserRole;
        if (userRole !== 'student') {
            return { success: false, message: 'חשבון זה משויך לסגל. אנא התחבר דרך כרטיסיית כניסת צוות.' };
        }

        await ensureAuth();
        const fullProfile: UserProfile = { ...found, role: 'student' };
        setSessionProfile(fullProfile);
        return { success: true };
    };

    // Request Staff OTP via Firebase Phone Auth
    const requestStaffOTP = async (
        phone: string,
        name: string,
        usersList: UserProfile[]
    ): Promise<{ success: boolean; step?: 'otp'; message?: string; roleFound?: UserRole }> => {
        const normName = normalizeName(name);
        const normPhone = normalizePhone(phone);

        if (!normName) return { success: false, message: 'הכנס שם מלא' };
        if (!normPhone || normPhone.length < 9) return { success: false, message: 'הכנס מספר טלפון תקין' };

        const found = usersList.find((u) => {
            const uName = normalizeName(u.name || u.fullName);
            const uPhone = normalizePhone(u.phone || u.id);
            return uName === normName && uPhone === normPhone;
        });

        if (!found) {
            return { success: false, message: 'איש צוות לא נמצא במערכת.' };
        }

        const userRole = (found.role || 'student').toLowerCase() as UserRole;
        if (userRole === 'student') {
            return { success: false, message: 'חשבון זה מוגדר כחניך. אנא התחבר דרך כרטיסיית חניכים.' };
        }

        setPendingStaffUser(found);

        try {
            const formattedPhone = normPhone.startsWith('0') ? '+972' + normPhone.substring(1) : normPhone;
            const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

            // @ts-ignore
            if (!window.recaptchaVerifier) {
                // @ts-ignore
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                });
            }

            // @ts-ignore
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            // @ts-ignore
            window.confirmationResult = confirmationResult;

            return { success: true, step: 'otp', roleFound: userRole };
        } catch (error: any) {
            console.error('Firebase SMS Error:', error);
            // @ts-ignore
            window.recaptchaVerifier = null;
            if (error?.code === 'auth/too-many-requests') {
                return { success: false, message: 'נשלחו יותר מדי בקשות. נסה שוב מאוחר יותר או השתמש בקוד גישה סטטי.' };
            }
            return { success: false, message: `שגיאה בשליחת SMS: ${error?.message || error}` };
        }
    };

    // Verify Staff OTP
    const verifyStaffOTP = async (otp: string, pendingUserOverride?: UserProfile | null): Promise<{ success: boolean; message?: string }> => {
        if (!otp || otp.length < 6) return { success: false, message: 'הזן קוד בן 6 ספרות' };

        const targetUser = pendingUserOverride || pendingStaffUser;

        try {
            // @ts-ignore
            if (!window.confirmationResult) {
                return { success: false, message: 'פג תוקף הבקשה. נסה לשלוח קוד מחדש.' };
            }

            // @ts-ignore
            await window.confirmationResult.confirm(otp);

            if (targetUser) {
                setSessionProfile(targetUser);
            }
            setPendingStaffUser(null);
            return { success: true };
        } catch (error: any) {
            return { success: false, message: 'קוד אימות שגוי. נסה שוב.' };
        }
    };

    // Staff Login via Static Passcode
    const loginStaffWithStaticPasscode = async (
        name: string,
        phone: string,
        passcode: string,
        usersList: UserProfile[]
    ): Promise<{ success: boolean; message?: string }> => {
        const normName = normalizeName(name);
        const normPhone = normalizePhone(phone);
        const expectedPasscode = (import.meta.env.VITE_STAFF_PASSCODE || '').trim();

        if (!normName) return { success: false, message: 'הכנס שם מלא' };
        if (!normPhone || normPhone.length < 9) return { success: false, message: 'הכנס מספר טלפון תקין' };
        if (!passcode || !expectedPasscode || passcode.trim() !== expectedPasscode) {
            return { success: false, message: 'קוד גישה סטטי שגוי' };
        }

        let found = (usersList || []).find((u) => {
            const uName = normalizeName(u.name || u.fullName);
            const uPhone = normalizePhone(u.phone || u.id);
            return uName === normName && uPhone === normPhone;
        });

        // Cold-load direct document lookup fallback
        if (!found) {
            try {
                await ensureAuth();
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', normPhone));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const uName = normalizeName(data.name || data.fullName);
                    if (uName === normName) {
                        found = { id: userDoc.id, phone: userDoc.id, ...data } as UserProfile;
                    }
                }
            } catch (err) {
                console.warn('Direct staff lookup error:', err);
            }
        }

        const bootstrapName = import.meta.env.VITE_ADMIN_BOOTSTRAP_NAME;
        const bootstrapPhone = import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE;

        if (!found && bootstrapName && bootstrapPhone) {
            if (normName === normalizeName(bootstrapName) && normPhone === normalizePhone(bootstrapPhone)) {
                const masterAdmin: UserProfile = {
                    id: normPhone,
                    name: bootstrapName,
                    fullName: bootstrapName,
                    phone: normPhone,
                    role: 'admin',
                    school: 'מנהלה',
                    tags: []
                };
                await ensureAuth();
                setSessionProfile(masterAdmin);
                return { success: true };
            }
        }

        if (!found) {
            return { success: false, message: 'איש צוות לא נמצא במערכת.' };
        }

        const userRole = (found.role || 'student').toLowerCase() as UserRole;
        if (userRole === 'student') {
            return { success: false, message: 'חשבון זה מוגדר כחניך. אנא התחבר דרך כרטיסיית חניכים.' };
        }

        await ensureAuth();
        setSessionProfile(found);
        return { success: true };
    };

    const logout = async () => {
        setSessionProfile(null);
        setPendingStaffUser(null);
        try {
            await signOut(auth);
        } catch (err) {
            console.warn('Sign out error:', err);
        }
        try {
            await signInAnonymously(auth);
        } catch (err) {
            console.error('Sign in anonymously error on logout:', err);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                role,
                loading,
                loginStudent,
                requestStaffOTP,
                verifyStaffOTP,
                loginStaffWithStaticPasscode,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
