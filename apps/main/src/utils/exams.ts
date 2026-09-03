import { ExamCategory } from '@/types/exam';

export interface ExamValidationResult {
    isValid: boolean;
    totalWeight: number;
    error?: string;
}

export const validateExamWeight = (categories: ExamCategory[]): ExamValidationResult => {
    if (!categories || categories.length === 0) {
        return { isValid: false, totalWeight: 0, error: 'יש להגדיר לפחות קטגוריה אחת במבחן' };
    }

    let totalWeight = 0;
    for (const cat of categories) {
        if (!cat.name || !cat.name.trim()) {
            return { isValid: false, totalWeight: 0, error: 'כל הקטגוריות חייבות להכיל שם' };
        }
        const score = Number(cat.maxScore);
        if (isNaN(score) || score <= 0) {
            return { isValid: false, totalWeight: 0, error: 'הניקוד המרבי לכל קטגוריה חייב להיות חיובי' };
        }
        totalWeight += score;
    }

    if (totalWeight !== 100) {
        return {
            isValid: false,
            totalWeight,
            error: `סכום משקלי הקטגוריות חייב להיות בדיוק 100 (כעת: ${totalWeight})`,
        };
    }

    return { isValid: true, totalWeight: 100 };
};

export const calculateTotalScore = (scores: Record<string, number> | undefined): number => {
    if (!scores) return 0;
    return Object.values(scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
};
