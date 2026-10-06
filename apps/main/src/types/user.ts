export type UserRole = 'student' | 'instructor' | 'assistant' | 'admin' | 'inspector';

export interface TagCatalogItem {
    id: string;
    label: string;
    color: 'green' | 'purple' | 'red' | 'blue' | string;
    requiresDetail: boolean;
}

export interface UserTag {
    id: string;
    label: string;
    detail?: string;
}

export interface UserProfile {
    id?: string;
    firestoreId?: string;
    phone?: string;
    name?: string;
    fullName?: string;
    role: UserRole;
    group?: number | string;
    school?: string;
    tags?: UserTag[];
    [key: string]: any;
}
