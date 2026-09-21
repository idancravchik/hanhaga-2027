import { TagCatalogItem, UserRole } from '../types/user';

export const LOGO_URL = "/logo.png";
export const BACKGROUND_IMAGE_URL = "/background.jpg";

export const SCHOOL_LIST: readonly string[] = [
    "נתיבות דרור (אור עקיבא)",
    "תיכון טכנולוגי האופק (אור עקיבא)",
    "תיכון עתידים (אור עקיבא)",
    "כרמים בנימינה (בנימינה-גבעת עדה)",
    "בי\"ס בית אקשטיין (גן שמואל)",
    "מקיף דאלית אל-כרמל (דאלית אל-כרמל)",
    "שש שנתי ע\"ש קופטאן (דאלית אל-כרמל)",
    "תיכון המושבה (זכרון יעקב)",
    "תיכון ממד פלך זכרון יעקב (זכרון יעקב)",
    "אולפ' בנ\"ע מ. ברוך (חדרה)",
    "ישיבת בנ\"ע בית שמואל (חדרה)",
    "מיטב מדעים ויהדות (חדרה)",
    "מקיף למדע ולאמנויות (חדרה)",
    "תיכון חדרה (חדרה)",
    "תיכון טכנולוגי נעמת (חדרה)",
    "תכון חדרה בית-אליעזר (חדרה)",
    "אולפנת אמי\"ת עירוני ו (חיפה)",
    "אופקים (חיפה)",
    "אורים (חיפה)",
    "אחוזת ילדים (חיפה)",
    "בי\"ס ע\"ש גניגר (חיפה)",
    "בית הספר רעות לאמנויות (חיפה)",
    "הנריטה סאלד (חיפה)",
    "הריאלי (חיפה)",
    "חטב עמל' אבן גבירול (חיפה)",
    "חטב עמלנית רגבים (חיפה)",
    "כל ישראל חברים (חיפה)",
    "מקיף ליאו בק (חיפה)",
    "מקיף עירוני ק. חיים (חיפה)",
    "עירוני א' (חיפה)",
    "עירוני ב' ישיבה (חיפה)",
    "עירוני ג' (חיפה)",
    "עירוני ד תיירות ומלונאות (חיפה)",
    "עירוני ה' (חיפה)",
    "עירוני חוגים (חיפה)",
    "עירוני יבנה (חיפה)",
    "רמת הנשיא (חיפה)",
    "אתגרי העתיד על יסודי (חריש)",
    "נעימת הלב (חטיבה חריש) (חריש)",
    "פסגת אמיר על יסודי (חריש)",
    "מקיף דתי אריאל (טירת כרמל)",
    "מקיף ע\"ש שיפמן (טירת כרמל)",
    "תיכון מקיף לאומנויות (טירת כרמל)",
    "אהבה (כפר ביאליק)",
    "תיכון יעדים לחינוך (כפר ביאליק)",
    "כפר גלים (כפר גלים)",
    "כפר הנוער הדתי (כפר הנוער הדתי)",
    "מרום (כפר חסידים א')",
    "משעול (כפר חסידים א')",
    "אולפנת בנ\"ע כפר פינס (כפר פינס)",
    "מקיף שפיה (מאיר שפיה)",
    "מקיף חוף הכרמל (מעגן מיכאל)",
    "התיכון המקיף נשר (נשר)",
    "מקיף גוונים (עין שמר)",
    "מקיף מבואות עירון (עין שמר)",
    "אורט רונסון עוספיה (עספיא)",
    "אלאשראק (עספיא)",
    "אזורי דתי לבנות (פרדס חנה-כרכור)",
    "בית אקשטיין דרור (פרדס חנה-כרכור)",
    "חט\"ב חדשה פרדס חנה (פרדס חנה-כרכור)",
    "חקלאי פרדס-חנה (פרדס חנה-כרכור)",
    "ישיבה תיכונית פרדס חנה (פרדס חנה-כרכור)",
    "אולפנית שחם (קרית אתא)",
    "ישיבה מקיף שש שנתי קרית אתא (קרית אתא)",
    "מקיף ע\"ש רוגוזין (קרית אתא)",
    "מקיף שש שנתי רימון (קרית ביאליק)",
    "צלילים (קרית ביאליק)",
    "קרית חנוך אורט (קרית ביאליק)",
    "מקיף אורט עש גרינברג (קרית טבעון)",
    "רמת הדסה (קרית טבעון)",
    "מקיף דתי ע\"ש לוינסון (קרית ים)",
    "מקיף חדש ע\"ש רבין (קרית ים)",
    "תיכון מקיף ע\"ש רודמן (קרית ים)",
    "אולפנא סגולה (קרית מוצקין)",
    "גמנסיה קריות פ.100 (קרית מוצקין)",
    "מקיף אורט (קרית מוצקין)",
    "עתיד קרית מוצקין (קרית מוצקין)"
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
