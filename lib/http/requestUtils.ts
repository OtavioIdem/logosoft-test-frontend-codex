const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVALID_GUID_SENTINELS = new Set(['', '0', '99', '00000000-0000-0000-0000-000000000000']);

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue>;
export type JsonPayload = Record<string, unknown>;

export const isValidGuid = (value: unknown): value is string => typeof value === 'string' && GUID_REGEX.test(value.trim());

export const isInvalidGuidLikeValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return false;
    }

    if (typeof value === 'number') {
        return value === 0 || value === 99;
    }

    if (typeof value !== 'string') {
        return false;
    }

    const normalized = value.trim();
    return INVALID_GUID_SENTINELS.has(normalized) || (normalized.length > 0 && !isValidGuid(normalized));
};

export const isGuidField = (fieldName: string) => /(^id$|id$|Id$)/.test(fieldName);

export const normalizeGuidOrNull = (value: unknown): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return isValidGuid(normalized) ? normalized : null;
};

export const toIsoDateTimeOrNull = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const timestamp = Date.parse(trimmed);
        return Number.isFinite(timestamp) ? trimmed : null;
    }

    return null;
};

const shouldOmitValue = (value: unknown) => value === undefined || value === '';

const sanitizeArray = (items: unknown[]): unknown[] => items.map((item) => sanitizePayload(item)).filter((item) => item !== undefined);

export const sanitizePayload = (payload: unknown): unknown => {
    if (payload instanceof Date) {
        return payload.toISOString();
    }

    if (Array.isArray(payload)) {
        return sanitizeArray(payload);
    }

    if (payload === null || typeof payload !== 'object') {
        return payload;
    }

    const source = payload as JsonPayload;
    const result: JsonPayload = {};

    Object.entries(source).forEach(([key, value]) => {
        if (shouldOmitValue(value)) {
            return;
        }

        if (isGuidField(key)) {
            if (value === null) {
                result[key] = null;
                return;
            }

            if (isInvalidGuidLikeValue(value)) {
                return;
            }
        }

        result[key] = sanitizePayload(value);
    });

    return result;
};

export const cleanQueryParams = (params: QueryParams) =>
    Object.fromEntries(
        Object.entries(params).flatMap(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return [];
            }

            if (isGuidField(key) && isInvalidGuidLikeValue(value)) {
                return [];
            }

            if (value instanceof Date) {
                return [[key, value.toISOString()]];
            }

            return [[key, value]];
        })
    );

export const toTermQueryParams = ({ termo, search, ...rest }: QueryParams & { termo?: QueryValue; search?: QueryValue }) =>
    cleanQueryParams({
        ...rest,
        termo: termo ?? search
    });
