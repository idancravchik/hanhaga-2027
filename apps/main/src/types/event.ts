export type EventType = 'מפגש' | 'מסע' | 'יום היערכות' | 'יום חשיפה' | 'אחר';

export interface CourseEvent {
    id: string;
    title: string;
    type: EventType;
    date: string;
    location?: string;
    description?: string;
}

export type AttendanceStatus = boolean | 'missing' | 'חסר';
export type AttendanceMap = Record<string, Record<string, AttendanceStatus | undefined>>;
