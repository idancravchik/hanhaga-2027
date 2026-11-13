import React from 'react';
import { Search, Download, Check, X } from 'lucide-react';
import { UserProfile } from '@/types/user';
import { CourseEvent, AttendanceMap } from '@/types/event';
import { Exam, GradeRecord } from '@/types/exam';

export interface AdminReportsViewProps {
    uniqueUsersList: UserProfile[];
    filteredStudents: UserProfile[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filterDept: string;
    setFilterDept: (d: string) => void;
    attendanceEvents: CourseEvent[];
    attendance: AttendanceMap;
    exams: Exam[];
    grades: Record<string, GradeRecord | any>;
    handleSelectStudentProfile: (student: UserProfile) => void;
    handleExportCSV: () => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
    uniqueUsersList,
    filteredStudents,
    searchQuery,
    setSearchQuery,
    filterDept,
    setFilterDept,
    attendanceEvents,
    attendance,
    exams,
    grades,
    handleSelectStudentProfile,
    handleExportCSV,
}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#dadce0] flex gap-6 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="search-student-report" className="text-[13px] font-medium text-[#3c4043] block mb-2 mr-1">
                        חיפוש חניך
                    </label>
                    <div className="relative">
                        <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                        <input
                            id="search-student-report"
                            type="text"
                            placeholder="שם או טלפון..."
                            className="w-full h-10 pr-10 pl-4 rounded border border-[#dadce0] bg-white font-normal text-[13px] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors text-right text-[#202124] outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="department-filter" className="text-[13px] font-medium text-[#3c4043] block mb-2 mr-1">
                        סנן לפי מחלקה
                    </label>
                    <select
                        id="department-filter"
                        aria-label="סנן לפי מחלקה"
                        className="w-full h-10 px-3 rounded border border-[#dadce0] bg-white font-normal text-[13px] text-right text-[#3c4043] outline-none focus:border-[#1a73e8]"
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                    >
                        <option value="all">כל המחלקות</option>
                        {[...new Set(uniqueUsersList.map((u) => parseInt(String(u.group || 0), 10) || 0))]
                            .filter((g) => g > 0)
                            .sort((a, b) => a - b)
                            .map((g) => (
                                <option key={g} value={g.toString()}>
                                    מחלקה {g}
                                </option>
                            ))}
                    </select>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="h-10 px-6 bg-[#1a73e8] hover:bg-[#1967d2] text-white rounded-full font-medium text-[14px] flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                    <Download size={18} /> ייצוא CSV
                </button>
            </div>
            <div className="bg-white rounded-[24px] border border-[#dadce0] overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto" tabIndex={0} role="region" aria-label="טבלת נתוני דוחות">
                    <table className="w-full text-right border-collapse" dir="rtl">
                        <thead className="sticky top-0 z-10 bg-[#f8f9fa] border-b border-[#dadce0]">
                            <tr className="text-[#3c4043] text-[12px] font-semibold border-b border-[#dadce0]">
                                <th className="p-4">חניך</th>
                                <th className="p-4">מחלקה</th>
                                <th className="p-4">בית ספר</th>
                                <th className="p-2 text-center" colSpan={attendanceEvents.length}>
                                    נוכחות
                                </th>
                                {exams.map((e) => (
                                    <th key={e.id} className="p-4 text-center">
                                        {e.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dadce0]">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={3 + attendanceEvents.length + exams.length}
                                        className="text-center p-8 text-[13px] font-normal text-[#5f6368]"
                                    >
                                        אין חניכים במערכת התואמים את המסננים הנבחרים.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const studentId = student.id || student.phone || student.firestoreId || '';
                                    const att = attendance[studentId] || {};
                                    return (
                                        <tr
                                            key={student.firestoreId || student.id || student.phone}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`פרופיל חניך ${student.name || student.fullName}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleSelectStudentProfile(student);
                                                }
                                            }}
                                            className="hover:bg-[#f8f9fa] transition-colors group cursor-pointer focus:outline-hidden focus:bg-[#e8f0fe]"
                                            onClick={() => handleSelectStudentProfile(student)}
                                        >
                                            <td className="p-4 font-medium text-[#1a73e8] hover:underline text-[14px]">
                                                {student.name || student.fullName}
                                            </td>
                                            <td className="p-4 text-[#202124] font-normal text-[14px]">{student.group || 0}</td>
                                            <td className="p-4 text-[#5f6368] text-[13px] font-normal">{student.school || 'לא שויך'}</td>
                                            {attendanceEvents.map((ev) => {
                                                const status = att[ev.id];
                                                const isPresent = status === true;
                                                const isMissing = status === 'missing' || status === 'חסר';
                                                const isAbsent = status === false;
                                                return (
                                                    <td key={ev.id} className="p-1 text-center">
                                                        <div
                                                            className={`mx-auto w-6 h-6 rounded-full flex items-center justify-center ${
                                                                isPresent
                                                                    ? 'bg-[#188038] text-white'
                                                                    : isMissing
                                                                    ? 'bg-[#f9ab00] text-white'
                                                                    : isAbsent
                                                                    ? 'bg-[#d93025] text-white'
                                                                    : 'bg-[#f8f9fa] text-[#5f6368]'
                                                            }`}
                                                            title={isPresent ? 'נכח' : isMissing ? 'חסר' : isAbsent ? 'נעדר' : 'לא דווח'}
                                                        >
                                                            {isPresent && <Check size={12} />}
                                                            {isMissing && <div className="w-2 h-2 rounded-full bg-white" />}
                                                            {isAbsent && <X size={12} className="stroke-[2.5]" />}
                                                            {status === undefined && <span className="text-[10px]">-</span>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            {exams.map((exam) => {
                                                const g = grades[`${studentId}_${exam.id}`];
                                                const total: number | null =
                                                    g && g.scores
                                                        ? Object.values(g.scores as Record<string, unknown>).reduce(
                                                              (a: number, b: unknown) => a + (parseInt(String(b || 0), 10) || 0),
                                                              0
                                                          )
                                                        : null;
                                                return (
                                                    <td
                                                        key={exam.id}
                                                        className="p-4 text-center font-medium text-[16px] tabular-nums text-[#202124]"
                                                    >
                                                        {total !== null ? (
                                                            <span className={total >= 85 ? 'text-emerald-600' : 'text-slate-900'}>
                                                                {total}
                                                            </span>
                                                        ) : (
                                                            '--'
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
