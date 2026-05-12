import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeRefreshSession } from '@/features/auth/api/authResponseMapper';
import { clearSession, readSession, updateTokens, writeSession } from '@/lib/auth/sessionStorage';

const baseSession = {
    accessToken: 'old-token',
    accessTokenExpiraEm: '2026-05-05T20:30:00+00:00',
    refreshToken: 'old-refresh',
    refreshTokenExpiraEm: '2026-05-12T20:15:00+00:00',
    expiresAt: '2026-05-05T20:30:00+00:00',
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
            accessTokenExpiraEm: '2026-05-05T21:00:00+00:00',
            refreshToken: 'novo-refresh-token',
            refreshTokenExpiraEm: '2026-05-12T20:45:00+00:00',
            permissoes: ['PRODUTOS_CONSULTAR']
        });

        expect(refresh).toEqual({
            accessToken: 'novo-jwt',
            accessTokenExpiraEm: '2026-05-05T21:00:00+00:00',
            refreshToken: 'novo-refresh-token',
            refreshTokenExpiraEm: '2026-05-12T20:45:00+00:00',
            expiresAt: '2026-05-05T21:00:00+00:00',
            permissoes: ['PRODUTOS_CONSULTAR']
        });
    });

    it('atualiza tokens e permissões do usuário salvo', () => {
        writeSession(baseSession);
        updateTokens(
            {
                accessToken: 'novo-jwt',
                accessTokenExpiraEm: '2026-05-05T21:00:00+00:00',
                refreshToken: 'novo-refresh-token',
                refreshTokenExpiraEm: '2026-05-12T20:45:00+00:00'
            },
            ['PRODUTOS_CONSULTAR']
        );

        const session = readSession();
        expect(session?.accessToken).toBe('novo-jwt');
        expect(session?.refreshToken).toBe('novo-refresh-token');
        expect(session?.user.permissoes).toEqual(['PRODUTOS_CONSULTAR']);
    });
});
