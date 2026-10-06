export interface ExamCategory {
    name: string;
    maxScore: number;
    max?: number;
}

export interface Exam {
    id: string;
    title: string;
    date?: string;
    categories: ExamCategory[];
    showVerbalOnly?: boolean;
    isStudentVisible?: boolean;
    isVisible?: boolean;
    isAssistantVisible?: boolean;
}

export interface GradeRecord {
    id: string;
    studentId: string;
    examId: string;
    scores: Record<string, number>;
    verbalComment?: string;
    updatedAt?: string;
}
