import React, { useState } from 'react';
import { Loader2, KeyRound, UserCheck, Shield } from 'lucide-react';
import { LOGO_URL } from '@/config/constants';
import { useAuth } from '@/context/AuthContext';
import { UserProfile } from '@/types/user';

interface LoginViewProps {
    usersList: UserProfile[];
    siteSettings?: {
        isSiteClosed?: boolean;
        staffLoginMethod?: 'otp' | 'passcode';
    };
    showToast: (message: string, type?: 'success' | 'error') => void;
    onLoginSuccess?: () => void;
}

type LoginTab = 'student' | 'staff';

export const LoginView: React.FC<LoginViewProps> = ({ usersList, siteSettings, showToast, onLoginSuccess }) => {
    const { loginStudent, requestStaffOTP, verifyStaffOTP, loginStaffWithStaticPasscode } = useAuth();

    const [tab, setTab] = useState<LoginTab>('student');
    const staffMode = siteSettings?.staffLoginMethod || 'passcode';

    // Form inputs
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [passcode, setPasscode] = useState('');

    const [step, setStep] = useState<'input' | 'otp_verify'>('input');
    const [loading, setLoading] = useState(false);

    // Handle Student Login
    const handleStudentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const res = loginStudent(name, phone, usersList);
        if (res.success) {
            showToast('התחברת בהצלחה!', 'success');
            if (onLoginSuccess) onLoginSuccess();
        } else {
            showToast(res.message || 'שגיאה בהתחברות', 'error');
        }
    };

    // Handle Staff Login Request (SMS OTP or Static Passcode based on global siteSettings)
    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (staffMode === 'passcode') {
            const res = loginStaffWithStaticPasscode(name, phone, passcode, usersList);
            if (res.success) {
                showToast('התחברת בהצלחה כאיש צוות!', 'success');
                if (onLoginSuccess) onLoginSuccess();
            } else {
                showToast(res.message || 'שגיאה בהתחברות', 'error');
            }
            return;
        }

        // SMS OTP mode
        setLoading(true);
        const res = await requestStaffOTP(phone, name, usersList);
        setLoading(false);

        if (res.success && res.step === 'otp') {
            setStep('otp_verify');
            showToast('קוד אימות נשלח ב-SMS!', 'success');
        } else {
            showToast(res.message || 'שגיאה בשליחת קוד אימות', 'error');
        }
    };

    // Handle OTP Verification
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await verifyStaffOTP(otp);
        setLoading(false);

        if (res.success) {
            showToast('אימות SMS הושלם בהצלחה!', 'success');
            if (onLoginSuccess) onLoginSuccess();
        } else {
            showToast(res.message || 'קוד אימות שגוי', 'error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-3 sm:p-6 bg-transparent" dir="rtl">
            <div className="bg-white p-5 sm:p-10 rounded-[24px] border border-[#dadce0] w-full max-w-md text-right relative transition-all">
                <div id="recaptcha-container"></div>

                {/* Logo & Title */}
                <div className="flex justify-center mb-4">
                    <img src={LOGO_URL} className="w-16 h-16 sm:w-20 sm:h-20 object-contain" alt="Logo" />
                </div>

                <h1 className="text-[28px] font-medium text-center text-[#202124] tracking-tight mb-1 font-sans">מערכת הנהגה</h1>
                <p className="text-center text-[#5f6368] text-[14px] mb-6 font-normal">ניהול והערכה לקורסי מנהיגות</p>

                {/* Tab Switcher */}
                <div className="flex bg-white p-1 rounded-full mb-6 border border-[#dadce0]">
                    <button
                        type="button"
                        onClick={() => { setTab('student'); setStep('input'); }}
                        className={`flex-1 py-2 rounded-full font-medium text-[14px] transition-all flex items-center justify-center gap-2 ${tab === 'student' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}
                    >
                        <UserCheck size={16} />
                        כניסת חניכים
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTab('staff'); setStep('input'); }}
                        className={`flex-1 py-2 rounded-full font-medium text-[14px] transition-all flex items-center justify-center gap-2 ${tab === 'staff' ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#202124]'}`}
                    >
                        <Shield size={16} />
                        כניסת צוות
                    </button>
                </div>

                {/* Student Login Form */}
                {tab === 'student' && (
                    <form onSubmit={handleStudentSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="student-name" className="text-[14px] font-medium text-[#3c4043] block mr-0.5">שם מלא</label>
                            <input
                                id="student-name"
                                className="w-full h-11 px-3 border border-[#dadce0] rounded text-[14px] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                                placeholder="שם מלא כפי שנרשמת"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="student-phone" className="text-[14px] font-medium text-[#3c4043] block mr-0.5">מספר טלפון נייד</label>
                            <input
                                id="student-phone"
                                type="tel"
                                className="w-full h-11 px-3 border border-[#dadce0] rounded text-[14px] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                                placeholder="050-0000000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                dir="ltr"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all mt-4"
                        >
                            התחבר למערכת
                        </button>
                    </form>
                )}

                {/* Staff Login Form */}
                {tab === 'staff' && step === 'input' && (
                    <form onSubmit={handleStaffSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="staff-name" className="text-[14px] font-medium text-[#3c4043] block mr-0.5">שם איש הצוות</label>
                            <input
                                id="staff-name"
                                className="w-full h-11 px-3 border border-[#dadce0] rounded text-[14px] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                                placeholder="שם מלא"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="staff-phone" className="text-[14px] font-medium text-[#3c4043] block mr-0.5">מספר טלפון נייד</label>
                            <input
                                id="staff-phone"
                                type="tel"
                                className="w-full h-11 px-3 border border-[#dadce0] rounded text-[14px] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                                placeholder="050-0000000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                dir="ltr"
                                required
                            />
                        </div>

                        {staffMode === 'passcode' && (
                            <div className="space-y-1">
                                <label htmlFor="staff-passcode" className="text-[14px] font-medium text-[#3c4043] block mr-0.5">קוד גישה</label>
                                <div className="relative">
                                    <input
                                        id="staff-passcode"
                                        type="password"
                                        className="w-full h-11 px-3 border border-[#dadce0] rounded text-[14px] bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124] pl-10"
                                        placeholder="קוד גישה"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        required
                                    />
                                    <KeyRound className="absolute left-3 top-3 text-[#5f6368]" size={18} />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all mt-4 disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : staffMode === 'otp' ? 'שלח קוד אימות ב-SMS' : 'התחבר כאיש צוות'}
                        </button>
                    </form>
                )}

                {/* OTP Verification Form */}
                {tab === 'staff' && step === 'otp_verify' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <label htmlFor="otp-input" className="block text-[14px] font-medium text-[#3c4043] text-center mb-4">
                            הזן את 6 הספרות שנשלחו למספר {phone}
                        </label>
                        <input
                            id="otp-input"
                            type="number"
                            className="w-full h-12 px-3 border border-[#dadce0] rounded text-[20px] font-medium tracking-[0.2em] text-center bg-white focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                            placeholder="------"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            dir="ltr"
                            autoFocus
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all mt-4 disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'אישור קוד חד-פעמי'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('input')}
                            className="w-full h-10 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] rounded-full font-medium text-[14px] transition-all mt-2 flex items-center justify-center"
                        >
                            חזרה למסך ההתחברות
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginView;
