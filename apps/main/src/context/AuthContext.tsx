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

// Fallback SHA-256 digest of the authorized staff passcode (avoids committing plaintext passwords to repository)
const AUTHORIZED_PASSCODE_HASH = '2441b25cc6a2a3d9831706510f8de574dd684da6a26bce45d3c7e896543a4608';

const computeSHA256 = (str: string): string => {
    function rightRotate(value: number, amount: number) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words: number[] = [];
    const asciiBitLength = str.length * 8;
    const hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;
    const isComposite: Record<number, boolean> = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (let i = 0; i < 313; i += candidate) {
                isComposite[i] = true;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    str += '\x80';
    while ((str.length % 64) !== 56) str += '\x00';
    for (let i = 0; i < str.length; i++) {
        const j = str.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength) | 0;

    for (let j = 0; j < words.length;) {
        const w = words.slice(j, (j += 16));
        const oldHash = [...hash];
        hash.length = 8;

        for (let i = 0; i < 64; i++) {
            const w15 = w[i - 15];
            const w2 = w[i - 2];
            const a = hash[0];
            const e = hash[4];
            const temp1 =
                hash[7] +
                (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
                ((e & hash[5]) ^ (~e & hash[6])) +
                k[i] +
                (w[i] =
                    i < 16
                        ? w[i]
                        : (w[i - 16] +
                              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                              w[i - 7] +
                              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                          0);
            const temp2 =
                (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
                ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash.unshift((temp1 + temp2) | 0);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (let i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (let i = 0; i < 8; i++) {
        for (let j = 3; j >= 0; j--) {
            const b = (hash[i] >> (8 * j)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
};

const isPasscodeValid = (passcode?: string | null): boolean => {
    if (!passcode) return false;
    const clean = passcode.trim();
    const envPasscode = (import.meta.env.VITE_STAFF_PASSCODE || '').trim();
    if (envPasscode && clean === envPasscode) {
        return true;
    }
    return computeSHA256(clean) === AUTHORIZED_PASSCODE_HASH;
};

const getStaffToken = (phone: string = '', passcode?: string) => {
    const normPhone = normalizePhone(phone);
    if (!normPhone) return '';
    const secret = passcode?.trim() || (import.meta.env.VITE_STAFF_PASSCODE || '').trim() || AUTHORIZED_PASSCODE_HASH.substring(0, 16);
    try {
        return btoa(`${normPhone}:${secret}`);
    } catch {
        return '';
    }
};

const isValidStaffToken = (phone: string = '', token?: string): boolean => {
    if (!phone || !token) return false;
    const normPhone = normalizePhone(phone);
    const envPasscode = (import.meta.env.VITE_STAFF_PASSCODE || '').trim();
    const validTokens = [
        envPasscode ? btoa(`${normPhone}:${envPasscode}`) : '',
        btoa(`${normPhone}:${AUTHORIZED_PASSCODE_HASH.substring(0, 16)}`)
    ].filter(Boolean);

    return validTokens.includes(token);
};

const matchesStaffName = (inputName: string, registeredName: string): boolean => {
    const a = normalizeName(inputName);
    const b = normalizeName(registeredName);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const aParts = a.split(/\s+/).filter(Boolean);
    const bParts = b.split(/\s+/).filter(Boolean);
    if (aParts.length > 0 && bParts.length > 0 && aParts[0] === bParts[0]) return true;
    return false;
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
                    const phone = p.phone || p.id;
                    if (!phone || !isValidStaffToken(phone, parsed.staffToken)) {
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
        const rawPhone = profile.phone || profile.id;
        if (!rawPhone) return;
        const normPhone = normalizePhone(rawPhone);

        const verifyStaffSession = async () => {
            try {
                await ensureAuth();
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', normPhone));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role !== profile.role) {
                        console.warn('[SECURITY] Role mismatch detected! Demoting session.');
                        setSessionProfile({ ...profile, role: (data.role || 'student') });
                    }
                } else {
                    const bootstrapPhone = normalizePhone(import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE || '');
                    if (!bootstrapPhone || normPhone !== bootstrapPhone) {
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

    const setSessionProfile = (p: UserProfile | null, usedPasscode?: string) => {
        setProfile(p);
        if (p) {
            const expiresAt = Date.now() + SESSION_DURATION_MS;
            const staffToken = (p.role && p.role !== 'student') ? getStaffToken(p.phone || p.id || '', usedPasscode) : undefined;
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

        if (!normName) return { success: false, message: 'הכנס שם מלא' };
        if (!normPhone || normPhone.length < 9) return { success: false, message: 'הכנס מספר טלפון תקין' };
        if (!isPasscodeValid(passcode)) {
            return { success: false, message: 'קוד גישה סטטי שגוי' };
        }

        // Look for matching staff user in usersList if available
        let found = (usersList || []).find((u) => {
            const uPhone = normalizePhone(u.phone || u.id);
            if (uPhone !== normPhone) return false;
            const uName = normalizeName(u.name || u.fullName);
            return matchesStaffName(normName, uName) || (u.role && u.role !== 'student');
        });

        // Cold-load direct document lookup fallback
        if (!found) {
            try {
                await ensureAuth();
                const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', normPhone));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const uName = normalizeName(data.name || data.fullName);
                    const isStaff = data.role && data.role !== 'student';
                    const bootstrapPhone = normalizePhone(import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE || '');
                    if (isStaff && (matchesStaffName(normName, uName) || (bootstrapPhone && normPhone === bootstrapPhone))) {
                        found = { id: userDoc.id, phone: userDoc.id, ...data } as UserProfile;
                    } else if (uName === normName) {
                        found = { id: userDoc.id, phone: userDoc.id, ...data } as UserProfile;
                    }
                }
            } catch (err) {
                console.warn('Direct staff lookup error:', err);
            }
        }

        // Bootstrap Admin Fallback
        const bootstrapName = import.meta.env.VITE_ADMIN_BOOTSTRAP_NAME;
        const bootstrapPhone = normalizePhone(import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE || '');

        if (!found && bootstrapPhone && normPhone === bootstrapPhone) {
            const adminName = bootstrapName || 'מנהל מערכת';
            if (matchesStaffName(normName, adminName)) {
                const masterAdmin: UserProfile = {
                    id: normPhone,
                    name: adminName,
                    fullName: adminName,
                    phone: normPhone,
                    role: 'admin',
                    school: 'מנהלה',
                    tags: []
                };
                await ensureAuth();
                setSessionProfile(masterAdmin, passcode);
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
        setSessionProfile(found, passcode);
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
