import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearSession,
    getSessionPolicyStatus,
    readSession,
    SESSION_IDLE_TIMEOUT_MS,
    SESSION_MAX_AGE_MS,
    touchSessionActivity,
    writeSession
} from '@/lib/auth/sessionStorage';
import { AuthSession } from '@/types/erp';

const baseSession: AuthSession = {
    accessToken: 'access-token',
    accessTokenExpiraEm: '2026-05-12T13:00:00.000Z',
    refreshToken: 'refresh-token',
    refreshTokenExpiraEm: '2026-05-12T18:00:00.000Z',
    expiresAt: '2026-05-12T13:00:00.000Z',
    user: {
        id: 'manager-id',
        nome: 'Manager',
        email: 'manager@erp.local',
        permissoes: []
    }
};

describe('politica de sessao', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-12T12:00:00.000Z'));
        window.localStorage.clear();
    });

    afterEach(() => {
        clearSession();
        vi.useRealTimers();
    });

    it('carimba inicio e ultima atividade ao salvar a sessao', () => {
        writeSession(baseSession);

        const session = readSession();

        expect(session?.sessionStartedAt).toBe('2026-05-12T12:00:00.000Z');
        expect(session?.lastActivityAt).toBe('2026-05-12T12:00:00.000Z');
    });

    it('expira por inatividade apos 30 minutos', () => {
        expect(
            getSessionPolicyStatus(
                {
                    sessionStartedAt: '2026-05-12T11:00:00.000Z',
                    lastActivityAt: new Date(Date.now() - SESSION_IDLE_TIMEOUT_MS).toISOString()
                },
                Date.now()
            )
        ).toBe('idle-expired');
    });

    it('expira por tempo maximo apos 5 horas mesmo com atividade recente', () => {
        expect(
            getSessionPolicyStatus(
                {
                    sessionStartedAt: new Date(Date.now() - SESSION_MAX_AGE_MS).toISOString(),
                    lastActivityAt: '2026-05-12T11:59:00.000Z'
                },
                Date.now()
            )
        ).toBe('max-age-expired');
    });

    it('remove sessao persistida quando a politica expira', () => {
        writeSession({
            ...baseSession,
            sessionStartedAt: '2026-05-12T11:00:00.000Z',
            lastActivityAt: '2026-05-12T11:30:00.000Z'
        });

        expect(readSession()).toBeNull();
    });

    it('atualiza ultima atividade sem alterar inicio da sessao', () => {
        writeSession({
            ...baseSession,
            sessionStartedAt: '2026-05-12T10:00:00.000Z',
            lastActivityAt: '2026-05-12T11:45:00.000Z'
        });

        touchSessionActivity();

        const session = readSession();
        expect(session?.sessionStartedAt).toBe('2026-05-12T10:00:00.000Z');
        expect(session?.lastActivityAt).toBe('2026-05-12T12:00:00.000Z');
    });
});
