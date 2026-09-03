import { UserProfile, UserRole } from '@/types/user';
import { normalizeName, normalizePhone } from '@/utils/normalize';
import { SCHOOL_LIST } from '@/config/constants';

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export const validateUserForm = (data: Partial<UserProfile>): ValidationResult => {
    const errors: Record<string, string> = {};

    // Validate Name
    const normName = normalizeName(data.name || data.fullName);
    if (!normName) {
        errors.name = 'שם מלא הוא שדה חובה';
    } else if (normName.length < 2) {
        errors.name = 'שם מלא חייב להכיל לפחות 2 תווים';
    }

    // Validate Phone
    const normPhone = normalizePhone(data.phone || data.id);
    if (!normPhone) {
        errors.phone = 'מספר טלפון הוא שדה חובה';
    } else if (normPhone.length < 9 || normPhone.length > 10) {
        errors.phone = 'מספר טלפון אינו תקין (חייב להכיל 9-10 ספרות)';
    }

    // Validate Role
    const validRoles: UserRole[] = ['student', 'instructor', 'assistant', 'admin', 'inspector'];
    if (data.role && !validRoles.includes(data.role.toLowerCase() as UserRole)) {
        errors.role = 'תפקיד לא תקין';
    }

    // Validate Group Number
    if (data.group !== undefined && data.group !== null && data.group !== '') {
        const groupNum = Number(data.group);
        if (isNaN(groupNum) || groupNum < 0) {
            errors.group = 'מספר קבוצה/מחלקה חייב להיות מספר חיובי';
        }
    }

    // Validate School
    if (data.school && typeof data.school !== 'string') {
        errors.school = 'שם בית ספר אינו תקין';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
