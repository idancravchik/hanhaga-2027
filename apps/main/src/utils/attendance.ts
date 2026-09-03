import { CourseEvent, AttendanceMap } from '@/types/event';
import { UserProfile } from '@/types/user';

export interface StudentAttendanceStats {
    totalEvents: number;
    attendedCount: number;
    absentCount: number;
    percentage: number;
}

export const calculateStudentAttendanceStats = (
    studentId: string,
    attendance: AttendanceMap,
    events: CourseEvent[]
): StudentAttendanceStats => {
    // Only consider meetings/events that require attendance (exclude exposure days)
    const validEvents = (events || []).filter((e) => e.type !== 'יום חשיפה');
    if (!validEvents || validEvents.length === 0) {
        return { totalEvents: 0, attendedCount: 0, absentCount: 0, percentage: 100 };
    }

    const studentAtt = attendance[studentId] || {};
    let attendedCount = 0;
    let absentCount = 0;

    validEvents.forEach((ev) => {
        const status = studentAtt[ev.id];
        if (status === true) {
            attendedCount++;
        } else if (status === false) {
            absentCount++;
        }
    });

    const percentage = Math.round((attendedCount / validEvents.length) * 100);

    return {
        totalEvents: validEvents.length,
        attendedCount,
        absentCount,
        percentage,
    };
};

export const calculateGroupAttendanceStats = (
    usersList: UserProfile[],
    attendance: AttendanceMap,
    events: CourseEvent[]
) => {
    const students = usersList.filter((u) => u.role === 'student');
    if (students.length === 0) return { averagePercentage: 100, studentStats: [] };

    const studentStats = students.map((s) => {
        const stats = calculateStudentAttendanceStats(s.id || s.phone || '', attendance, events);
        return {
            student: s,
            stats,
        };
    });

    const totalPercentage = studentStats.reduce((sum, item) => sum + item.stats.percentage, 0);
    const averagePercentage = Math.round(totalPercentage / students.length);

    return {
        averagePercentage,
        studentStats,
    };
};
