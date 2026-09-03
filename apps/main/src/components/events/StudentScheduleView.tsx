import React from 'react';
import { Calendar, MapPin, Clock, Check, X, Sparkles } from 'lucide-react';
import { CourseEvent, AttendanceMap } from '@/types/event';

interface StudentScheduleViewProps {
    events: CourseEvent[];
    attendance: AttendanceMap;
    studentId: string;
}

export const StudentScheduleView: React.FC<StudentScheduleViewProps> = ({ events, attendance, studentId }) => {
    const studentAtt = attendance[studentId] || {};

    const sortedEvents = [...(events || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!sortedEvents || sortedEvents.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-[24px] border border-[#dadce0]" dir="rtl">
                <Calendar className="mx-auto text-[#5f6368] mb-3" size={36} />
                <h3 className="text-[14px] font-medium text-[#3c4043]">אין אירועים בלו"ז כרגע</h3>
            </div>
        );
    }

    const now = new Date();
    // Find the next upcoming event (or the latest event if all in past)
    const upcomingEvent = sortedEvents.find((e) => e.date && new Date(e.date) >= now) || sortedEvents[sortedEvents.length - 1];
    const upcomingAttStatus = studentAtt[upcomingEvent?.id];
    const upcomingDate = upcomingEvent?.date ? new Date(upcomingEvent.date) : null;

    return (
        <div className="space-y-4 text-[#202124]" dir="rtl">
            <h2 className="text-[20px] font-medium text-[#202124] flex items-center gap-2">
                <Calendar className="text-[#1a73e8]" size={22} />
                יומן אירועים ולוח זמנים
            </h2>

            {/* Featured Next Event Card */}
            {upcomingEvent && (
                <div className="bg-[#e8f0fe] text-[#202124] p-6 rounded-[24px] border border-[#dadce0] relative overflow-hidden text-right">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-0.5 bg-white text-[#1a73e8] rounded-full text-[12px] font-medium flex items-center gap-1.5 shadow-sm">
                            <Sparkles size={14} /> המפגש הקרוב
                        </span>
                        <span className="text-[12px] font-normal text-[#5f6368]">{upcomingEvent.type}</span>
                    </div>

                    <h3 className="text-[22px] font-medium mb-2 leading-tight text-[#202124]">{upcomingEvent.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-[13px] font-normal text-[#3c4043] mb-4">
                        {upcomingDate && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                                <Clock size={16} className="text-[#1a73e8]" />
                                <span>
                                    {upcomingDate.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' })} •{' '}
                                    {upcomingDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                        {upcomingEvent.location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-[#1a73e8]" />
                                <span>{upcomingEvent.location}</span>
                            </div>
                        )}
                    </div>

                    {upcomingEvent.type !== 'יום חשיפה' && (
                        <div className="pt-3 border-t border-[#dadce0] flex items-center justify-between text-[13px] font-normal">
                            <span className="text-[#5f6368]">סטטוס נוכחות שלך:</span>
                            <div className="flex items-center gap-1 bg-white px-3 py-0.5 rounded-full shadow-sm">
                                {upcomingAttStatus === true && (
                                    <span className="text-[#188038] font-medium flex items-center gap-1">
                                        נכח <Check size={14} />
                                    </span>
                                )}
                                {upcomingAttStatus === false && (
                                    <span className="text-[#d93025] font-medium flex items-center gap-1">
                                        נעדר <X size={14} />
                                    </span>
                                )}
                                {upcomingAttStatus === undefined && <span className="text-[#5f6368]">טרם נרשם</span>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Compact List of All Course Events */}
            <div className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden text-right">
                <div className="p-4 bg-[#f8f9fa] border-b border-[#dadce0] text-[13px] font-medium text-[#3c4043] flex items-center justify-between">
                    <span>כלל מפגשי ואירועי הקורס ({sortedEvents.length})</span>
                </div>

                <div className="divide-y divide-[#dadce0]">
                    {sortedEvents.map((ev) => {
                        const status = studentAtt[ev.id];
                        const evDate = ev.date ? new Date(ev.date) : null;
                        const tracksAttendance = ev.type !== 'יום חשיפה';
                        const isPast = evDate ? evDate < now : false;

                        return (
                            <div key={ev.id} className={`p-4 flex items-center justify-between gap-3 hover:bg-[#f8f9fa] transition-colors ${isPast ? 'opacity-85' : ''}`}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[12px] font-normal text-[#5f6368]" dir="ltr">
                                            {evDate ? evDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : ''}
                                        </span>
                                        <span className="text-[12px] font-normal px-2.5 py-0.5 rounded-full bg-[#f8f9fa] border border-[#dadce0] text-[#3c4043]">
                                            {ev.type}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-[15px] text-[#202124] truncate">{ev.title}</h4>
                                    {ev.location && <p className="text-[12px] text-[#5f6368] font-normal truncate">{ev.location}</p>}
                                </div>

                                <div>
                                    {tracksAttendance ? (
                                        <div
                                            className={`px-3 py-1 rounded-full text-[12px] font-medium border flex items-center gap-1 ${
                                                status === true
                                                    ? 'bg-white text-[#188038] border-[#188038]/40'
                                                    : status === false
                                                    ? 'bg-white text-[#d93025] border-[#d93025]/40'
                                                    : 'bg-[#f8f9fa] text-[#5f6368] border-[#dadce0]'
                                            }`}
                                        >
                                            {status === true && (
                                                <>
                                                    <span>נכח</span>
                                                    <Check size={14} />
                                                </>
                                            )}
                                            {status === false && (
                                                <>
                                                    <span>נעדר</span>
                                                    <X size={14} />
                                                </>
                                            )}
                                            {status === undefined && <span>-</span>}
                                        </div>
                                    ) : (
                                        <span className="text-[12px] text-[#5f6368] font-normal">ללא נוכחות</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
