import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { UserProfile, UserRole } from '@/types/user';
import { normalizeName, normalizePhone } from '@/utils/normalize';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    role: UserRole | null;
    loading: boolean;
    loginStudent: (name: string, phone: string, usersList: UserProfile[]) => { success: boolean; message?: string };
    requestStaffOTP: (phone: string, name: string, usersList: UserProfile[]) => Promise<{ success: boolean; step?: 'otp'; message?: string; roleFound?: UserRole }>;
    verifyStaffOTP: (otp: string, pendingUser?: UserProfile | null) => Promise<{ success: boolean; message?: string }>;
    loginStaffWithStaticPasscode: (name: string, phone: string, passcode: string, usersList: UserProfile[]) => { success: boolean; message?: string };
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'hanhaga_profile';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
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

    const role: UserRole | null = profile?.role ? (profile.role.toLowerCase() as UserRole) : null;

    const setSessionProfile = (p: UserProfile | null) => {
        setProfile(p);
        if (p) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    // Student Login: No SMS required, validates against user list
    const loginStudent = (name: string, phone: string, usersList: UserProfile[]): { success: boolean; message?: string } => {
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
            return { success: false, message: 'משתמש לא נמצא. וודא שהפרטים מופעים במערכת.' };
        }

        const userRole = (found.role || 'student').toLowerCase() as UserRole;
        if (userRole !== 'student') {
            return { success: false, message: 'חשבון זה משויך לסגל. אנא התחבר דרך כרטיסיית כניסת צוות.' };
        }

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
    const loginStaffWithStaticPasscode = (
        name: string,
        phone: string,
        passcode: string,
        usersList: UserProfile[]
    ): { success: boolean; message?: string } => {
        const normName = normalizeName(name);
        const normPhone = normalizePhone(phone);
        const expectedPasscode = import.meta.env.VITE_STAFF_PASSCODE || '2027';

        if (!normName) return { success: false, message: 'הכנס שם מלא' };
        if (!normPhone || normPhone.length < 9) return { success: false, message: 'הכנס מספר טלפון תקין' };
        if (!passcode || passcode.trim() !== expectedPasscode.trim()) {
            return { success: false, message: 'קוד גישה סטטי שגוי' };
        }

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

        setSessionProfile(found);
        return { success: true };
    };

    const logout = () => {
        setSessionProfile(null);
        setPendingStaffUser(null);
        signOut(auth).catch(() => {});
        signInAnonymously(auth).catch(() => {});
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
