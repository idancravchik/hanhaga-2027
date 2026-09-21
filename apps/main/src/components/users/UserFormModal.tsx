import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, UserPlus, Edit2, AlertCircle, Search, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { UserProfile, UserRole } from '@/types/user';
import { validateUserForm } from '@/utils/validation';
import { SCHOOL_LIST } from '@/config/constants';
import { normalizePhone } from '@/utils/normalize';

interface UserFormModalProps {
    userToEdit?: UserProfile | null;
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ userToEdit, onClose, showToast }) => {
    const isEdit = !!userToEdit;

    const [name, setName] = useState(userToEdit?.name || userToEdit?.fullName || '');
    const [phone, setPhone] = useState(userToEdit?.phone || userToEdit?.id || '');
    const [school, setSchool] = useState(userToEdit?.school || '');
    const [schoolQuery, setSchoolQuery] = useState(userToEdit?.school || '');
    const [isSchoolOpen, setIsSchoolOpen] = useState(false);
    const schoolContainerRef = useRef<HTMLDivElement>(null);
    const [group, setGroup] = useState<number | string>(userToEdit?.group !== undefined ? userToEdit.group : 1);
    const [role, setRole] = useState<UserRole>(userToEdit?.role || 'student');

    // Close dropup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (schoolContainerRef.current && !schoolContainerRef.current.contains(e.target as Node)) {
                setIsSchoolOpen(false);
                if (school && !schoolQuery.trim()) {
                    setSchoolQuery(school);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [school, schoolQuery]);

    const filteredSchools = useMemo(() => {
        const q = schoolQuery.trim().toLowerCase();
        if (!q) return SCHOOL_LIST;
        return SCHOOL_LIST.filter((s) => s.toLowerCase().includes(q));
    }, [schoolQuery]);

    const handleSelectSchool = (selected: string) => {
        setSchool(selected);
        setSchoolQuery(selected);
        setIsSchoolOpen(false);
    };

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalSchool = (school || schoolQuery || '').trim();
        const formData: Partial<UserProfile> = {
            name,
            phone,
            school: finalSchool || 'לא שויך',
            group: Number(group) || 0,
            role,
        };

        const validation = validateUserForm(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setErrors({});
        setLoading(true);

        const normPhone = normalizePhone(phone);
        const userId = isEdit ? userToEdit.id || userToEdit.phone || normPhone : normPhone;

        const payload: UserProfile = {
            id: userId,
            phone: normPhone,
            firestoreId: userId,
            name: name.trim(),
            fullName: name.trim(),
            school: finalSchool || 'לא שויך',
            group: Number(group) || 0,
            role,
            tags: userToEdit?.tags || [],
        };

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), payload, { merge: true });
            showToast(isEdit ? 'פרטי המשתמש עודכנו בהצלחה!' : 'משתמש חדש נוצר בהצלחה!');
            setLoading(false);
            onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בשמירת המשתמש: ${err?.message || err}`, 'error');
        }
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#202124]/50" dir="rtl">
            <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-[480px] p-5 sm:p-6 relative text-right text-[#202124] max-h-[90vh] overflow-y-auto" dir="rtl">
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="סגור חלון"
                    className="absolute top-6 left-6 p-2 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa] transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-medium border border-[#dadce0]">
                        {isEdit ? <Edit2 size={18} /> : <UserPlus size={18} />}
                    </div>
                    <div>
                        <h2 className="text-[18px] font-medium text-[#202124]">{isEdit ? 'עריכת משתמש' : 'הוספת משתמש חדש'}</h2>
                        <p className="text-[12px] text-[#5f6368] font-normal">{isEdit ? 'עדכון פרטי המשתמש במערכת' : 'הזן את פרטי המשתמש החדש'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">שם מלא</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="שם מלא"
                            className={`w-full h-10 px-3 border rounded text-[13px] font-normal bg-white text-[#202124] outline-none transition-all ${
                                errors.name ? 'border-[#d93025]' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                            }`}
                        />
                        {errors.name && <span className="text-[11px] font-normal text-[#d93025] flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</span>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">מספר טלפון נייד</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={isEdit}
                            placeholder="050-0000000"
                            dir="ltr"
                            className={`w-full h-10 px-3 border rounded text-[13px] font-normal text-[#202124] outline-none transition-all ${
                                isEdit ? 'bg-[#f8f9fa] text-[#5f6368] cursor-not-allowed border-[#dadce0]' : errors.phone ? 'border-[#d93025]' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] bg-white'
                            }`}
                        />
                        {errors.phone && <span className="text-[11px] font-normal text-[#d93025] flex items-center gap-1"><AlertCircle size={12} /> {errors.phone}</span>}
                    </div>

                    {/* School Search with Options Popping Upwards */}
                    <div className="space-y-1 relative" ref={schoolContainerRef}>
                        <label className="text-[13px] font-medium text-[#3c4043] block">בית ספר</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={schoolQuery}
                                onChange={(e) => {
                                    setSchoolQuery(e.target.value);
                                    setSchool(e.target.value);
                                    setIsSchoolOpen(true);
                                }}
                                onFocus={() => setIsSchoolOpen(true)}
                                placeholder="חפש ובחר בית ספר..."
                                className="w-full h-10 pr-9 pl-9 border border-[#dadce0] rounded font-normal bg-white text-[#202124] text-[13px] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                            />
                            <Search className="absolute right-2.5 top-2.5 text-[#5f6368] pointer-events-none" size={16} />
                            <button
                                type="button"
                                onClick={() => setIsSchoolOpen(!isSchoolOpen)}
                                className="absolute left-2.5 top-2.5 text-[#5f6368] hover:text-[#202124] transition-colors"
                                aria-label={isSchoolOpen ? "סגור רשימת בתי ספר" : "פתח רשימת בתי ספר"}
                            >
                                {isSchoolOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {/* Options Popping Upwards */}
                            {isSchoolOpen && (
                                <div
                                    role="listbox"
                                    className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-white border border-[#dadce0] rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 transition-all text-right"
                                >
                                    {filteredSchools.length === 0 ? (
                                        <div className="p-3 text-center text-[12px] text-[#5f6368] italic">
                                            לא נמצאו בתי ספר תואמים לחיפוש
                                        </div>
                                    ) : (
                                        filteredSchools.map((s, idx) => {
                                            const isSelected = s === school;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => handleSelectSchool(s)}
                                                    className={`w-full text-right px-3 py-2 text-[13px] rounded-lg flex items-center justify-between transition-colors ${
                                                        isSelected
                                                            ? 'bg-[#e8f0fe] text-[#1a73e8] font-medium'
                                                            : 'text-[#202124] hover:bg-[#f1f3f4] font-normal'
                                                    }`}
                                                >
                                                    <span className="truncate">{s}</span>
                                                    {isSelected && <Check size={14} className="text-[#1a73e8] shrink-0 mr-2" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Group */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">מחלקה</label>
                        <input
                            type="number"
                            min="0"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            placeholder="מספר מחלקה"
                            className={`w-full h-10 px-3 border rounded font-normal bg-white text-[#202124] text-[13px] outline-none ${
                                errors.group ? 'border-[#d93025]' : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]'
                            }`}
                        />
                        {errors.group && <span className="text-[11px] font-normal text-[#d93025] flex items-center gap-1"><AlertCircle size={12} /> {errors.group}</span>}
                    </div>

                    {/* Role */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#3c4043] block">תפקיד במערכת</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full h-10 px-3 border border-[#dadce0] rounded font-normal bg-white text-[#202124] text-[13px] outline-none focus:border-[#1a73e8]"
                        >
                            <option value="student">חניך (Student)</option>
                            <option value="instructor">מדריך (Instructor)</option>
                            <option value="assistant">מנהלן (Assistant)</option>
                            <option value="inspector">מפקח (Inspector)</option>
                            <option value="admin">מנהל (Admin)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#dadce0]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-5 text-[#3c4043] font-medium bg-[#f1f3f4] hover:bg-[#e8eaed] rounded-full transition-all text-[14px]"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all disabled:opacity-50"
                        >
                            {loading ? 'שומר...' : isEdit ? 'עדכן משתמש' : 'צור משתמש'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
