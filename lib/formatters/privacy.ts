const onlyDigits = (value: string) => value.replace(/\D/g, '');
const onlyDocumentChars = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export const maskDocument = (value?: string | null) => {
    const normalized = onlyDocumentChars(value ?? '');
    if (!normalized) return '-';
    if (normalized.length <= 5) return normalized.replace(/.(?=.{2})/g, '•');
    return `${normalized.slice(0, 3)}••••${normalized.slice(-2)}`;
};

export const maskEmail = (value?: string | null) => {
    const email = (value ?? '').trim();
    const [user, domain] = email.split('@');
    if (!user || !domain) return email || '-';
    const visible = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
    return `${visible}•••@${domain}`;
};

export const maskPhone = (value?: string | null) => {
    const digits = onlyDigits(value ?? '');
    if (!digits) return '-';
    if (digits.length <= 4) return digits;
    return `••••${digits.slice(-4)}`;
};

export const buildPrivacySafeEntityLabel = (name: string, document?: string | null) => {
    const label = name.trim() || 'Sem nome';
    return document ? `${label} — ${maskDocument(document)}` : label;
};
