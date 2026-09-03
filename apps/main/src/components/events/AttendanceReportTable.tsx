import React, { useState } from 'react';
import { Check, X, Search, Calendar, UserCheck } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '@/config/firebase';
import { CourseEvent, AttendanceMap } from '@/types/event';
import { UserProfile } from '@/types/user';
import { getUserAvatar } from '@/config/constants';

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
    const [tempAtt, setTempAtt] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        students.forEach((s) => {
            const studentId = s.id || s.phone || '';
            const status = attendance[studentId]?.[event.id];
            if (status !== undefined) {
                initial[studentId] = status;
            }
        });
        return initial;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const filteredStudents = students.filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.phone?.includes(q);
    });

    const handleToggleStatus = (studentId: string, status: boolean) => {
        setTempAtt((prev) => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            // Save attendance for each student in Firestore under public/data/attendance/${studentId}
            const studentIds = Object.keys(tempAtt);
            for (const sId of studentIds) {
                const status = tempAtt[sId];
                await setDoc(
                    doc(db, 'artifacts', appId, 'public', 'data', 'attendance', sId),
                    { [event.id]: status },
                    { merge: true }
                );
            }
            showToast(`נוכחות עבור "${event.title}" עודכנה בהצלחה!`);
            setLoading(false);
            if (onClose) onClose();
        } catch (err: any) {
            setLoading(false);
            showToast(`שגיאה בעדכון הנוכחות: ${err?.message || err}`, 'error');
        }
    };

    const attendedCount = Object.values(tempAtt).filter((v) => v === true).length;
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

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[12px] font-medium bg-white text-[#188038] px-3 py-1 rounded-full border border-[#188038]/40">
                        נכחו: {attendedCount}
                    </span>
                    <span className="text-[12px] font-medium bg-white text-[#d93025] px-3 py-1 rounded-full border border-[#d93025]/40">
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

            {/* Students List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pl-1">
                {filteredStudents.map((s) => {
                    const sId = s.id || s.phone || '';
                    const status = tempAtt[sId];

                    return (
                        <div
                            key={sId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#f8f9fa] hover:bg-white rounded-lg border border-[#dadce0] transition-all gap-2"
                        >
                            <div className="flex items-center gap-2.5">
                                <img
                                    src={getUserAvatar(s.role)}
                                    alt={s.name}
                                    className="w-8 h-8 rounded-full border border-[#dadce0] object-cover"
                                />
                                <div>
                                    <span className="font-medium text-[13px] text-[#202124] block">{s.name}</span>
                                    <span className="text-[11px] text-[#5f6368] font-normal">מחלקה {s.group || '-'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleToggleStatus(sId, true)}
                                    className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all ${
                                        status === true
                                            ? 'bg-[#188038] text-white'
                                            : 'bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed]'
                                    }`}
                                >
                                    <Check size={14} /> נכח
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleStatus(sId, false)}
                                    className={`px-3 py-1 rounded-full text-[12px] font-medium flex items-center gap-1 transition-all ${
                                        status === false
                                            ? 'bg-[#d93025] text-white'
                                            : 'bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed]'
                                    }`}
                                >
                                    <X size={14} /> נעדר
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

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
                    className="flex-1 h-10 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] transition-all disabled:opacity-50"
                >
                    {loading ? 'שומר נוכחות...' : 'עדכן נוכחות'}
                </button>
            </div>
        </div>
    );
};
