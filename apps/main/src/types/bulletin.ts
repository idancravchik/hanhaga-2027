export interface BulletinLinkChip {
    id: string;
    label: string;
    url: string;
}

export interface BulletinImage {
    id: string;
    downloadUrl: string;
    caption?: string;
    storagePath?: string;
}

export interface BulletinBoardData {
    id: 'students' | 'instructors';
    isEnabled: boolean;
    htmlContent: string;
    images: BulletinImage[];
    links: BulletinLinkChip[];
    updatedAt?: string;
    updatedBy?: {
        name?: string;
        phone?: string;
    };
}
