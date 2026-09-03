export const normalizePhone = (p?: string | number | null): string => {
    if (!p) return '';
    // Remove all non-digit characters
    let clean = p.toString().replace(/\D/g, '');
    // If it starts with 972, replace it with leading 0
    if (clean.startsWith('972')) {
        clean = '0' + clean.substring(3);
    }
    // Ensure it starts with 0
    if (clean.length === 9 && !clean.startsWith('0')) {
        clean = '0' + clean;
    }
    return clean;
};

export const normalizeName = (name?: string | null): string => {
    if (!name) return '';
    // Trim edges, replace multiple spaces with a single space, and clean quotes to avoid abbreviations issues
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/["׳`׳’]/g, ''); // standardizing varying apostrophe/quote characters in Hebrew
};
