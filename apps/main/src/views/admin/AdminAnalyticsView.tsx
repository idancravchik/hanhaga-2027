import React from 'react';
import { Users, TrendingUp, GraduationCap, BarChart3 } from 'lucide-react';

export interface AdminAnalyticsStats {
    total: number;
    schools: Record<string, number>;
    attByMeeting: Array<{ meeting: string; count: number; percent: number }>;
    groupGrades: Array<{ group: string; avg: string; studentCount: number }>;
}

export interface AdminAnalyticsViewProps {
    stats: AdminAnalyticsStats;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({ stats }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[24px] border border-[#dadce0]">
                    <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-1">סה"כ חניכים פעילים</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[36px] font-medium text-[#202124] tabular-nums">{stats.total}</span>
                        <div className="bg-[#e8f0fe] text-[#1a73e8] p-3 rounded-full">
                            <Users size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-[#dadce0]">
                    <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-1">ממוצע קורס</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[36px] font-medium text-[#202124] tabular-nums">
                            {(stats.groupGrades.reduce((a, b) => a + parseFloat(b.avg), 0) / (stats.groupGrades.length || 1)).toFixed(1)}
                        </span>
                        <div className="bg-[#e8f0fe] text-[#1a73e8] p-3 rounded-full">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-[#dadce0] col-span-2">
                    <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wider mb-3">נוכחות במפגשים (כמות אבסולוטית)</p>
                    <div className="grid grid-cols-4 gap-2">
                        {stats.attByMeeting.map((m) => (
                            <div key={m.meeting} className="text-center">
                                <div className="h-14 w-full bg-[#f8f9fa] rounded-lg border border-[#dadce0] relative overflow-hidden mb-1">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-[#1a73e8]/30 transition-all duration-700"
                                        style={{ height: `${m.percent}%` }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 leading-none">
                                        <span className="text-[14px] font-medium text-[#202124]">{m.count}</span>
                                        <span className="text-[9px] font-normal text-[#5f6368]">מתוך {stats.total}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] font-medium text-[#5f6368] truncate">{m.meeting}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden h-fit">
                    <div className="p-5 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center gap-2">
                        <GraduationCap size={18} className="text-[#1a73e8]" />
                        <span className="font-medium text-[#202124] text-[16px]">חניכים לפי בית ספר</span>
                    </div>
                    <div className="p-5 max-h-[450px] overflow-y-auto space-y-2.5">
                        {Object.entries(stats.schools)
                            .sort((a, b) => b[1] - a[1])
                            .map(([school, count]) => (
                                <div key={school} className="flex items-center justify-between p-3.5 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                                    <span className="font-normal text-[#3c4043] text-[14px]">{school}</span>
                                    <span className="bg-white px-3 py-0.5 rounded-full font-medium text-[#1a73e8] border border-[#dadce0] text-[13px]">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        {Object.entries(stats.schools).length === 0 && (
                            <div className="text-center py-10 italic text-[#5f6368]">אין נתונים להצגה</div>
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden h-fit">
                    <div className="p-5 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center gap-2">
                        <BarChart3 size={18} className="text-[#1a73e8]" />
                        <span className="font-medium text-[#202124] text-[16px]">ביצועים לפי מחלקה</span>
                    </div>
                    <div className="p-5 overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="text-[#5f6368] text-[12px] font-medium border-b border-[#dadce0]">
                                    <th className="p-4 pt-0">מחלקה</th>
                                    <th className="p-4 pt-0">חניכים</th>
                                    <th className="p-4 pt-0 text-center">ממוצע ציונים</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dadce0]">
                                {stats.groupGrades.map((g) => (
                                    <tr key={g.group} className="hover:bg-[#f8f9fa] transition-colors">
                                        <td className="p-4 font-medium text-[#202124] text-[15px]">מחלקה {g.group}</td>
                                        <td className="p-4 text-[#5f6368] text-[14px] font-normal">{g.studentCount} חניכים</td>
                                        <td className="p-4 text-center">
                                            <span className="text-[20px] font-medium tabular-nums text-[#1a73e8]">{g.avg}</span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.groupGrades.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-10 italic text-[#5f6368] font-normal text-[13px]">
                                            אין מחלקות פעילות
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};
