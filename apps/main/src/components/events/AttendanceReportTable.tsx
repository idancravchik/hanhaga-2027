import React, { useState, useEffect } from 'react';
import { Check, X, Search, UserCheck } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, appId } from '@/config/firebase';
import { CourseEvent, AttendanceMap, AttendanceStatus } from '@/types/event';
import { UserProfile } from '@/types/user';

interface AttendanceReportTableProps {
    event: CourseEvent;
    students: UserProfile[];
    attendance: AttendanceMap;
    onClose?: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AttendanceReportTable: React.FC<AttendanceReportTableProps> = ({
    event,
    students,
    attendance,
    onClose,
    showToast,
}) => {
    const [tempAtt, setTempAtt] = useState<Record<string, AttendanceStatus | undefined>>(() => {
        const initial: Record<string, AttendanceStatus | undefined> = {};
        students.forEach((s) => {
            const studentId = s.id || s.phone || (s as any).firestoreId || '';
            const status = attendance[studentId]?.[event.id] ??
                           (s.phone ? attendance[s.phone]?.[event.id] : undefined) ??
                           ((s as any).firestoreId ? attendance[(s as any).firestoreId]?.[event.id] : undefined);
            if (status !== undefined) {
                initial[studentId] = status;
            }
        });
        return initial;
    });

    const [isDirty, setIsDirty] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Keep tempAtt in sync with Firestore attendance records unless user has unsaved modifications
    useEffect(() => {
        if (!isDirty) {
            const synced: Record<string, AttendanceStatus | undefined> = {};
            students.forEach((s) => {
                const studentId = s.id || s.phone || (s as any).firestoreId || '';
                const status = attendance[studentId]?.[event.id] ??
                               (s.phone ? attendance[s.phone]?.[event.id] : undefined) ??
                               ((s as any).firestoreId ? attendance[(s as any).firestoreId]?.[event.id] : undefined);
                if (status !== undefined) {
                    synced[studentId] = status;
                }
            });
            setTempAtt(synced);
        }
    }, [attendance, event.id, students, isDirty]);

    // When the event changes, clear dirty state so new event data loads cleanly
    useEffect(() => {
        setIsDirty(false);
    }, [event.id]);

    const filteredStudents = students.filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (s.name || s.fullName || '')?.toLowerCase().includes(q) || s.phone?.includes(q);
    });

    const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
        setIsDirty(true);
        setTempAtt((prev) => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // Ensure auth is active before writing to Firestore
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            // Save attendance for each student in Firestore under public/data/attendance/${studentId}
            const studentIds = Object.keys(tempAtt);
            for (const sId of studentIds) {
                const status = tempAtt[sId];
                if (status !== undefined) {
                    await setDoc(
                        doc(db, 'artifacts', appId, 'public', 'data', 'attendance', sId),
                        { [event.id]: status },
                        { merge: true }
                    );
                }
            }
            setIsDirty(false);
            showToast(`נוכחות עבור "${event.title}" נשמרה בהצלחה!`);
            setLoading(false);
            if (onClose) onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בעדכון הנוכחות: ${err?.message || err}`, 'error');
        }
    };

    const attendedCount = Object.values(tempAtt).filter((v) => v === true).length;
    const missingCount = Object.values(tempAtt).filter((v) => v === 'missing' || v === 'חסר').length;
    const absentCount = Object.values(tempAtt).filter((v) => v === false).length;

    return (
        <div className="bg-white rounded-[24px] p-4 sm:p-6 border border-[#dadce0] space-y-4 sm:space-y-5 text-right text-[#202124]" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dadce0] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-medium border border-[#dadce0] shrink-0">
                        <UserCheck size={18} />
                    </div>
                    <div>
                        <h3 className="font-medium text-[16px] sm:text-[18px] text-[#202124]">דיווח נוכחות: {event.title}</h3>
                        <p className="text-[12px] text-[#5f6368] font-normal">
                            {event.date ? new Date(event.date).toLocaleDateString('he-IL') : ''} • {event.type}
                        </p>
                    </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <span className="text-[12px] font-medium bg-[#e6f4ea] text-[#137333] px-3 py-1 rounded-full border border-[#ceead6]">
                        נכחו: {attendedCount}
                    </span>
                    <span className="text-[12px] font-medium bg-[#fef7e0] text-[#b06000] px-3 py-1 rounded-full border border-[#feefc3] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f9ab00] inline-block" />
                        חסרים: {missingCount}
                    </span>
                    <span className="text-[12px] font-medium bg-[#fce8e6] text-[#c5221f] px-3 py-1 rounded-full border border-[#fad2cf]">
                        נעדרו: {absentCount}
                    </span>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                <input
                    type="text"
                    placeholder="חיפוש חניך לפי שם..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pr-10 pl-4 rounded border border-[#dadce0] bg-white text-[13px] font-normal focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124]"
                />
            </div>

            {/* Clean, Compact Students List (no cards, no departments, with ellipse toggle) */}
            <div className="max-h-96 overflow-y-auto divide-y divide-[#dadce0] border border-[#dadce0] rounded-xl bg-white">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-[#5f6368]">לא נמצאו חניכים התואמים את החיפוש.</div>
                ) : (
                    filteredStudents.map((s) => {
                        const sId = s.id || s.phone || (s as any).firestoreId || '';
                        const status = tempAtt[sId];
                        const isPresent = status === true;
                        const isMissing = status === 'missing' || status === 'חסר';
                        const isAbsent = status === false;

                        return (
                            <div
                                key={sId}
                                className="flex items-center justify-between py-2.5 px-3 hover:bg-[#f8f9fa] transition-colors"
                            >
                                <span className="font-medium text-[14px] text-[#202124]">
                                    {s.name || s.fullName}
                                </span>

                                {/* Ellipse Selection Buttons: Check (V), Dot in middle, X */}
                                <div className="flex items-center bg-[#f1f3f4] p-1 rounded-full border border-[#dadce0] gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(sId, true)}
                                        title="נכח"
                                        aria-label="נכח"
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isPresent
                                                ? 'bg-[#188038] text-white shadow-sm'
                                                : 'text-[#5f6368] hover:text-[#202124]'
                                        }`}
                                    >
                                        <Check size={14} className="stroke-[2.5]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(sId, 'missing')}
                                        title="חסר"
                                        aria-label="חסר"
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isMissing
                                                ? 'bg-[#f9ab00] text-white shadow-sm'
                                                : 'text-[#5f6368] hover:text-[#202124]'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isMissing ? 'bg-white' : 'bg-[#5f6368]'}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(sId, false)}
                                        title="נעדר"
                                        aria-label="נעדר"
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isAbsent
                                                ? 'bg-[#d93025] text-white shadow-sm'
                                                : 'text-[#5f6368] hover:text-[#202124]'
                                        }`}
                                    >
                                        <X size={14} className="stroke-[2.5]" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-2">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-full text-[#3c4043] bg-[#f1f3f4] hover:bg-[#e8eaed] font-medium text-[14px] transition-all"
                    >
                        סגור
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={loading}
                    className="flex-1 h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? 'שומר נוכחות...' : isDirty ? 'שמור שינויים בנוכחות *' : 'שמור נוכחות'}
                </button>
            </div>
        </div>
    );
};
