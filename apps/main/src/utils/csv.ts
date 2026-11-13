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

        // Robust RFC-4180 parsing for quoted commas and escaped quotes
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            if (char === '"') {
                if (inQuotes && trimmed[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim().replace(/^["']|["']$/g, ''));

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
        const allowedRoles: UserRole[] = ['student', 'instructor', 'assistant', 'inspector', 'admin'];
        const cleanRole = (roleStr ? roleStr.toLowerCase().trim() : 'student') as UserRole;
        const role: UserRole = allowedRoles.includes(cleanRole) ? cleanRole : 'student';

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

export const sanitizeCSVField = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    // Prevent CSV/Excel formula injection (DDE) if cell starts with =, +, -, @, tab, return, pipe (including after whitespace)
    if (/^[\s]*[=+\-@\t\r\|]/.test(str)) {
        str = `'${str}`;
    }
    return `"${str}"`;
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
        sanitizeCSVField('טלפון'),
        sanitizeCSVField('שם'),
        sanitizeCSVField('בית ספר'),
        sanitizeCSVField('מחלקה/קבוצה'),
        ...validEvents.map((ev) => sanitizeCSVField(`נוכחות: ${ev.title || ev.id}`)),
        ...exams.map((ex) => sanitizeCSVField(`מבחן: ${ex.title || ex.id}`)),
    ];

    const rows = students.map((student) => {
        const studentId = student.id || student.phone || '';
        const att = attendance[studentId] || {};
        const row = [
            sanitizeCSVField(studentId),
            sanitizeCSVField(student.name || student.fullName || ''),
            sanitizeCSVField(student.school || ''),
            sanitizeCSVField(student.group || 0),
            ...validEvents.map((ev) => {
                const s = att[ev.id];
                if (s === true) return '"נכח"';
                if (s === 'missing' || s === 'חסר') return '"חסר"';
                if (s === false) return '"נעדר"';
                return '"לא דווח"';
            }),
        ];

        exams.forEach((exam) => {
            const g = grades[`${studentId}_${exam.id}`];
            if (g) {
                const total = Object.values(g.scores || {}).reduce((a: any, b: any) => (parseInt(a) || 0) + (parseInt(b) || 0), 0);
                row.push(sanitizeCSVField(total));
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
