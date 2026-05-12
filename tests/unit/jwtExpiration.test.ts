import { describe, expect, it } from 'vitest';
import { getJwtExpirationTime, isJwtExpired } from '@/lib/auth/jwt';

const createFakeJwt = (payload: Record<string, unknown>) => {
    const encode = (value: Record<string, unknown>) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
};

describe('jwt expiration', () => {
    it('interpreta exp como segundos Unix e converte para milissegundos', () => {
        const token = createFakeJwt({ exp: 1_800_000_000 });
        expect(getJwtExpirationTime(token)).toBe(1_800_000_000 * 1000);
    });

    it('não marca como expirado um token com exp futuro', () => {
        const token = createFakeJwt({ exp: Math.floor(Date.now() / 1000) + 900 });
        expect(isJwtExpired(token)).toBe(false);
    });
});
