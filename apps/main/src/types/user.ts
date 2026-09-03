export type UserRole = 'student' | 'instructor' | 'assistant' | 'admin' | 'inspector';

export interface TagCatalogItem {
    id: string;
    label: string;
    color: 'green' | 'purple' | 'red' | 'blue' | string;
    requiresDetail: boolean;
}

export interface UserProfile {
    id?: string;
    phone?: string;
    fullName?: string;
    role: UserRole;
    school?: string;
    tags?: string[];
    [key: string]: any;
}
