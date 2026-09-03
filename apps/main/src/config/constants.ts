import { TagCatalogItem, UserRole } from '../types/user';

export const LOGO_URL = "/logo.png";
export const BACKGROUND_IMAGE_URL = "/background.jpg";

export const SCHOOL_LIST: readonly string[] = [
    "אורט חקלאי פרדס חנה", "רעות", "אורט טבעון", "אורט יצחק נבון", "ריאלי בית בירם", "תוער", "תיכון חדש בית אליעזר",
    "עוספיא", "קופטאן חלבי", "כפר גלים", "אליאנס", "תיכון למנהיגות דאלית אל כרמל", "עירוני ג",
    "רבין קריית ים", "ליאו בק", "דרכא שיפמן", "תיכון מקיף נשר", "עמל חדרה", "רוגוזין ב", "גוונים",
    "תיכון עירוני מקיף קריית חיים", "אורט מוצקין", "פלך זכרון יעקב", "עירוני ו", "רודמן קריית ים", "עירוני א",
    "רבין קריית מוצקין", "חטיבת עתידים אור עקיבא", "הקמפוס הבינתחומי למדעים ואומנויות טירת כרמל", "רוגוזין א", "אולפנת סגולה", "כרמים בנימינה גבעת עדה",
    "תיכון חדרה", "אולפנת שחם", "ישיבת בני עקיבא יבנה חיפה", "אורט אפק קריית ביאליק", "אולפנת אלישבע", "נעימת הלב חריש", "שבילי העמק",
    "חוגים"
];

export const TAGS_CATALOG: readonly TagCatalogItem[] = [
    { id: 'religion_jewish', label: 'דתי יהודי', color: 'purple', requiresDetail: false },
    { id: 'religion_arab', label: 'דתי ערבי', color: 'purple', requiresDetail: false },
    { id: 'vegan', label: 'טבעוני', color: 'green', requiresDetail: false },
    { id: 'vegetarian', label: 'צמחוני', color: 'green', requiresDetail: false },
    { id: 'sensitivity', label: 'רגישות', color: 'red', requiresDetail: true },
    { id: 'allergy', label: 'אלרגיה', color: 'red', requiresDetail: true },
    { id: 'special_ed', label: 'חנ"מ', color: 'blue', requiresDetail: false },
    { id: 'school_sole', label: 'בודד מבית ספר', color: 'blue', requiresDetail: false },
    { id: 'epilepsy', label: 'אפילפסיה', color: 'red', requiresDetail: false },
    { id: 'asthma', label: 'אסטמה', color: 'red', requiresDetail: false },
    { id: 'diabetes', label: 'סוכרת', color: 'red', requiresDetail: false },
    { id: 'medical_extra', label: 'מצב רפואי חריג', color: 'red', requiresDetail: true }
];

export const getTagColorClasses = (color?: string): string => {
    switch (color) {
        case 'green': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'red': return 'bg-rose-50 text-rose-700 border-rose-200';
        case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
};

export const ROLE_AVATARS: Record<UserRole, string> = {
    admin: '/avatars/admin.png',
    inspector: '/avatars/inspector.png',
    instructor: '/avatars/instructor.png',
    assistant: '/avatars/instructor.png',
    student: '/avatars/student.png'
};

export const getUserAvatar = (role?: string): string => {
    const r = (role || 'student').toLowerCase() as UserRole;
    return ROLE_AVATARS[r] || ROLE_AVATARS.student;
};
