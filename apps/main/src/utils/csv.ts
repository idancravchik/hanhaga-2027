import { UserProfile, UserRole } from '@/types/user';
import { normalizeName, normalizePhone } from '@/utils/normalize';

export interface CSVImportResult {
    users: UserProfile[];
    errors: string[];
    count: number;
}

export const parseUsersCSV = (fileText: string): CSVImportResult => {
    const lines = fileText.split(/\r?\n/);
    const users: UserProfile[] = [];
    const errors: string[] = [];
    let count = 0;

    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip CSV header line if present
        if (idx === 0 && (trimmed.includes('שם') || trimmed.includes('name') || trimmed.includes('טלפון'))) {
            return;
        }

        const parts = trimmed.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        const [name, phone, school, groupStr, roleStr] = parts;

        const normName = normalizeName(name);
        const normPhone = normalizePhone(phone);

        if (!normName || !normPhone) {
            if (parts.length > 1) {
                errors.push(`שורה ${idx + 1}: שם או טלפון חסרים/אינם תקינים (${trimmed})`);
            }
            return;
        }

        const groupNum = parseInt(groupStr, 10);
        const role = (roleStr ? roleStr.toLowerCase() : 'student') as UserRole;

        users.push({
            id: normPhone,
            phone: normPhone,
            firestoreId: normPhone,
            name: normName,
            fullName: normName,
            school: school || 'לא שויך',
            group: isNaN(groupNum) ? 0 : groupNum,
            role,
            tags: [],
        });
        count++;
    });

    return { users, errors, count };
};

export const exportUsersToCSV = (
    students: UserProfile[],
    attendance: Record<string, any>,
    grades: Record<string, any>,
    events: any[],
    exams: any[],
    filenamePrefix = 'דוח_מנהיגות'
) => {
    const validEvents = (events || []).filter((e) => e.type !== 'יום חשיפה');
    const headers = [
        'טלפון',
        'שם',
        'בית ספר',
        'מחלקה/קבוצה',
        ...validEvents.map((ev) => `נוכחות: ${ev.title || ev.id}`),
        ...exams.map((ex) => `מבחן: ${ex.title || ex.id}`),
    ];

    const rows = students.map((student) => {
        const studentId = student.id || student.phone || '';
        const att = attendance[studentId] || {};
        const row = [
            `"${studentId}"`,
            `"${student.name || student.fullName || ''}"`,
            `"${student.school || ''}"`,
            `"${student.group || 0}"`,
            ...validEvents.map((ev) => (att[ev.id] ? '"נכח"' : '"נעדר"')),
        ];

        exams.forEach((exam) => {
            const g = grades[`${studentId}_${exam.id}`];
            if (g) {
                const total = Object.values(g.scores || {}).reduce((a: any, b: any) => (parseInt(a) || 0) + (parseInt(b) || 0), 0);
                row.push(`"${total}"`);
            } else {
                row.push('"חסר ציון"');
            }
        });

        return row.join(',');
    });

    // Add UTF-8 BOM (\uFEFF) for Excel Hebrew support
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
