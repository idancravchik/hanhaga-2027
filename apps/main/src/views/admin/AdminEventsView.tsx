import React from 'react';
import { Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { CourseEvent, AttendanceMap } from '@/types/event';
import { UserProfile } from '@/types/user';

const AttendanceReportTable = React.lazy(() =>
    import('@/components/events/AttendanceReportTable').then((m) => ({ default: m.AttendanceReportTable }))
);

export interface AdminEventsViewProps {
    eventsList: CourseEvent[];
    selectedAttendanceEvent: CourseEvent | null;
    setSelectedAttendanceEvent: (ev: CourseEvent | null) => void;
    filteredStudents: UserProfile[];
    attendance: AttendanceMap;
    showToast: (message: string, type?: 'success' | 'error') => void;
    onOpenAddEvent: () => void;
    onEditEvent: (ev: CourseEvent) => void;
    onDeleteEvent: (ev: CourseEvent) => void;
}

export const AdminEventsView: React.FC<AdminEventsViewProps> = ({
    eventsList,
    selectedAttendanceEvent,
    setSelectedAttendanceEvent,
    filteredStudents,
    attendance,
    showToast,
    onOpenAddEvent,
    onEditEvent,
    onDeleteEvent,
}) => {
    return (
        <div className="space-y-4 sm:space-y-6 w-full" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-[24px] border border-[#dadce0]">
                <div>
                    <h3 className="text-[18px] sm:text-[20px] font-medium text-[#202124]">לוח אירועים ומפגשים ({eventsList.length})</h3>
                    <p className="text-[12px] text-[#5f6368] font-normal mt-0.5">ניהול מפגשים, מסעות ודיווחי נוכחות</p>
                </div>
                <button
                    onClick={onOpenAddEvent}
                    className="h-10 px-5 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                >
                    <Plus size={16} /> הוסף אירוע חדש
                </button>
            </div>

            {selectedAttendanceEvent ? (
                <React.Suspense fallback={<div className="p-8 text-center text-[#5f6368] text-sm animate-pulse">טוען נתוני נוכחות...</div>}>
                    <AttendanceReportTable
                        event={selectedAttendanceEvent}
                        students={filteredStudents}
                        attendance={attendance}
                        onClose={() => setSelectedAttendanceEvent(null)}
                        showToast={showToast}
                    />
                </React.Suspense>
            ) : (
                <div className="bg-white rounded-[24px] overflow-hidden border border-[#dadce0]">
                    <div className="divide-y divide-[#dadce0]">
                        {eventsList.length === 0 ? (
                            <div className="p-8 text-center text-[#5f6368] text-[14px] font-normal">אין אירועים בלו"ז. לחץ על "הוסף אירוע חדש" כדי להתחיל.</div>
                        ) : (
                            [...(eventsList || [])]
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((ev) => (
                                    <div key={ev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f8f9fa] transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-normal border border-[#dadce0] bg-[#f8f9fa] text-[#3c4043]">
                                                    {ev.type}
                                                </span>
                                                <span className="text-[12px] text-[#5f6368] font-normal" dir="ltr">
                                                    {ev.date ? new Date(ev.date).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-[16px] text-[#202124]">{ev.title}</h4>
                                            {ev.location && <p className="text-[12px] text-[#5f6368] font-normal mt-0.5">מיקום: {ev.location}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ev.type !== 'יום חשיפה' && (
                                                <button
                                                    onClick={() => setSelectedAttendanceEvent(ev)}
                                                    className="h-8 px-3 rounded-full bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] text-[12px] font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <Calendar size={14} /> הזן נוכחות
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEditEvent(ev)}
                                                className="p-2 hover:bg-[#f8f9fa] text-[#5f6368] hover:text-[#202124] rounded-full transition-colors"
                                                title="ערוך אירוע"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteEvent(ev)}
                                                className="p-2 hover:bg-[#fce8e6] text-[#d93025] rounded-full transition-colors"
                                                title="מחק אירוע"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
