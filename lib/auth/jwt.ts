const base64UrlToJson = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    if (typeof window !== 'undefined') {
        return decodeURIComponent(
            Array.from(window.atob(padded))
                .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join('')
        );
    }

    return Buffer.from(padded, 'base64').toString('utf-8');
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const decodeJwtPayload = (accessToken: string): Record<string, unknown> | null => {
    const [, payload] = accessToken.split('.');
    if (!payload) {
        return null;
    }

    try {
        const decoded = JSON.parse(base64UrlToJson(payload));
        return isRecord(decoded) ? decoded : null;
    } catch {
        return null;
    }
};

export const getJwtExpirationTime = (accessToken?: string): number | null => {
    if (!accessToken) {
        return null;
    }

    const decoded = decodeJwtPayload(accessToken);
    const exp = decoded?.exp;

    if (typeof exp === 'number') {
        return exp * 1000;
    }

    if (typeof exp === 'string' && /^\d+$/.test(exp)) {
        return Number(exp) * 1000;
    }

    return null;
};

export const isJwtExpired = (accessToken?: string, clockSkewMs = 30_000) => {
    const expirationTime = getJwtExpirationTime(accessToken);
    if (!expirationTime) {
        return false;
    }

    return expirationTime - clockSkewMs <= Date.now();
};
