import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeRefreshSession } from '@/features/auth/api/authResponseMapper';
import { clearSession, readSession, updateTokens, writeSession } from '@/lib/auth/sessionStorage';

const futureIso = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const oldAccessExpiresAt = futureIso(1);
const oldRefreshExpiresAt = futureIso(7);
const newAccessExpiresAt = futureIso(2);
const newRefreshExpiresAt = futureIso(8);

const baseSession = {
    accessToken: 'old-token',
    accessTokenExpiraEm: oldAccessExpiresAt,
    refreshToken: 'old-refresh',
    refreshTokenExpiraEm: oldRefreshExpiresAt,
    expiresAt: oldAccessExpiresAt,
    user: {
        id: '33333333-3333-3333-3333-333333333333',
        nome: 'Manager',
        email: 'manager@erp.local',
        empresaId: '00000000-0000-0000-0000-000000000000',
        filialId: '00000000-0000-0000-0000-000000000099',
        permissoes: []
    }
};

describe('refresh de sessão', () => {
    beforeEach(() => {
        clearSession();
    });

    it('normaliza o response real do endpoint /api/auth/refresh', () => {
        const refresh = normalizeRefreshSession({
            accessToken: 'novo-jwt',
            accessTokenExpiraEm: newAccessExpiresAt,
            refreshToken: 'novo-refresh-token',
            refreshTokenExpiraEm: newRefreshExpiresAt,
            permissoes: ['PRODUTOS_CONSULTAR']
        });

        expect(refresh).toEqual({
            accessToken: 'novo-jwt',
            accessTokenExpiraEm: newAccessExpiresAt,
            refreshToken: 'novo-refresh-token',
            refreshTokenExpiraEm: newRefreshExpiresAt,
            expiresAt: newAccessExpiresAt,
            permissoes: ['PRODUTOS_CONSULTAR']
        });
    });

    it('atualiza tokens e permissões do usuário salvo', () => {
        writeSession(baseSession);
        updateTokens(
            {
                accessToken: 'novo-jwt',
                accessTokenExpiraEm: newAccessExpiresAt,
                refreshToken: 'novo-refresh-token',
                refreshTokenExpiraEm: newRefreshExpiresAt
            },
            ['PRODUTOS_CONSULTAR']
        );

        const session = readSession();
        expect(session?.accessToken).toBe('novo-jwt');
        expect(session?.refreshToken).toBe('novo-refresh-token');
        expect(session?.user.permissoes).toEqual(['PRODUTOS_CONSULTAR']);
    });
});
