import { describe, expect, it } from 'vitest';
import { normalizeCurrentUserResponse, normalizeLoginSession } from '@/features/auth/api/authResponseMapper';

const tokenPayload = {
    sub: 'manager-id',
    email: 'manager@erp.local',
    nome: 'Manager',
    permissoes: ['ADMINISTRACAO_CONSULTAR'],
    exp: Math.floor(Date.now() / 1000) + 900
};

const createFakeJwt = (payload: Record<string, unknown>) => {
    const encode = (value: Record<string, unknown>) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
};

describe('normalizeLoginSession', () => {
    it('normaliza a resposta real do backend do login manager', () => {
        const session = normalizeLoginSession({
            accessToken: createFakeJwt(tokenPayload),
            accessTokenExpiraEm: '2026-05-05T20:30:00+00:00',
            refreshToken: 'refresh-token',
            refreshTokenExpiraEm: '2026-05-12T20:15:00+00:00',
            permissoes: []
        });

        expect(session.accessToken).toContain('.');
        expect(session.accessTokenExpiraEm).toBe('2026-05-05T20:30:00+00:00');
        expect(session.refreshToken).toBe('refresh-token');
        expect(session.refreshTokenExpiraEm).toBe('2026-05-12T20:15:00+00:00');
        expect(session.expiresAt).toBe('2026-05-05T20:30:00+00:00');
        expect(session.user.email).toBe('manager@erp.local');
    });

    it('normaliza resposta direta com user', () => {
        const session = normalizeLoginSession({
            accessToken: createFakeJwt(tokenPayload),
            refreshToken: 'refresh-token',
            user: {
                id: 'user-id',
                nome: 'Manager logosoft',
                email: 'manager@erp.local',
                permissoes: ['SEGURANCA_USUARIOS_CONSULTAR']
            }
        });

        expect(session.accessToken).toContain('.');
        expect(session.refreshToken).toBe('refresh-token');
        expect(session.user.nome).toBe('Manager logosoft');
        expect(session.user.permissoes).toContain('SEGURANCA_USUARIOS_CONSULTAR');
    });

    it('normaliza resposta envelopada no padrão ApiResult', () => {
        const session = normalizeLoginSession({
            success: true,
            data: {
                accessToken: createFakeJwt(tokenPayload),
                refreshToken: 'refresh-token'
            }
        });

        expect(session.user.email).toBe('manager@erp.local');
        expect(session.user.nome).toBe('Manager');
        expect(session.user.permissoes).toContain('ADMINISTRACAO_CONSULTAR');
    });

    it('normaliza nomes PascalCase comuns em APIs .NET', () => {
        const session = normalizeLoginSession({
            Success: true,
            Data: {
                AccessToken: createFakeJwt(tokenPayload),
                RefreshToken: 'refresh-token',
                Usuario: {
                    Id: 'usuario-id',
                    Nome: 'Usuário API',
                    Email: 'manager@erp.local',
                    Permissoes: ['VENDAS_CONSULTAR']
                }
            }
        });

        expect(session.accessToken).toContain('.');
        expect(session.refreshToken).toBe('refresh-token');
        expect(session.user.id).toBe('usuario-id');
        expect(session.user.permissoes).toContain('VENDAS_CONSULTAR');
    });
});

describe('normalizeCurrentUserResponse', () => {
    const mePayload = {
        usuarioId: '11111111-1111-1111-1111-111111111111',
        nome: 'Usuario autorizado',
        email: 'usuario@erp.local',
        empresaId: '22222222-2222-2222-2222-222222222222',
        filialId: '33333333-3333-3333-3333-333333333333',
        isMaster: true,
        permissoes: ['PRODUTOS_CONSULTAR']
    };

    it('mapeia o contrato /api/auth/me e usa as claims devolvidas pela API', () => {
        expect(normalizeCurrentUserResponse({ success: true, data: mePayload })).toEqual({
            id: mePayload.usuarioId,
            nome: mePayload.nome,
            email: mePayload.email,
            empresaId: mePayload.empresaId,
            filialId: mePayload.filialId,
            isMaster: true,
            permissoes: ['PRODUTOS_CONSULTAR']
        });
    });

    it.each([
        ['usuarioId', undefined],
        ['empresaId', undefined],
        ['isMaster', undefined],
        ['permissoes', undefined],
        ['filialId', 'nao-e-guid'],
        ['permissoes', ['']]
    ])('rejeita payload /me sem claim obrigatoria ou invalida: %s', (field, value) => {
        expect(() => normalizeCurrentUserResponse({ ...mePayload, [field]: value })).toThrow();
    });
});
