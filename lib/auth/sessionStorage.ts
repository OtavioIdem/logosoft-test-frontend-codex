import { AuthSession, AuthTokens, CurrentUser, PermissionCode } from '@/types/erp';
import { isJwtExpired } from '@/lib/auth/jwt';

const SESSION_KEY = 'logosoft.session';

export const SESSION_MAX_AGE_MS = 5 * 60 * 60 * 1000;
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type SessionPolicyStatus = 'active' | 'max-age-expired' | 'idle-expired';

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const nowIso = () => new Date().toISOString();

const parseDateTime = (value?: string) => {
    if (!value) {
        return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
};

const isDateExpired = (value?: string, clockSkewMs = 30_000) => {
    const timestamp = parseDateTime(value);
    return timestamp !== null && timestamp - clockSkewMs <= Date.now();
};

const withSessionPolicyTimestamps = (session: AuthSession): AuthSession => {
    const now = nowIso();
    return {
        ...session,
        sessionStartedAt: session.sessionStartedAt ?? now,
        lastActivityAt: session.lastActivityAt ?? now
    };
};

const persistSession = (session: AuthSession) => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getSessionPolicyStatus = (session?: Pick<AuthSession, 'sessionStartedAt' | 'lastActivityAt'> | null, now = Date.now()): SessionPolicyStatus => {
    if (!session) {
        return 'active';
    }

    const sessionStartedAt = parseDateTime(session.sessionStartedAt);
    if (sessionStartedAt !== null && now - sessionStartedAt >= SESSION_MAX_AGE_MS) {
        return 'max-age-expired';
    }

    const lastActivityAt = parseDateTime(session.lastActivityAt ?? session.sessionStartedAt);
    if (lastActivityAt !== null && now - lastActivityAt >= SESSION_IDLE_TIMEOUT_MS) {
        return 'idle-expired';
    }

    return 'active';
};

export const isAccessTokenExpired = (session?: Pick<AuthSession, 'accessToken' | 'accessTokenExpiraEm' | 'expiresAt'> | null) => {
    if (!session?.accessToken) {
        return true;
    }

    if (session.accessTokenExpiraEm || session.expiresAt) {
        return isDateExpired(session.accessTokenExpiraEm ?? session.expiresAt);
    }

    return isJwtExpired(session.accessToken);
};

export const isRefreshTokenExpired = (session?: Pick<AuthSession, 'refreshToken' | 'refreshTokenExpiraEm'> | null) => {
    if (!session?.refreshToken) {
        return true;
    }

    return isDateExpired(session.refreshTokenExpiraEm);
};

export const readSession = (): AuthSession | null => {
    if (!canUseStorage()) return null;

    try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (!raw) {
            return null;
        }

        const parsedSession = JSON.parse(raw) as AuthSession;
        const session = withSessionPolicyTimestamps(parsedSession);
        const policyStatus = getSessionPolicyStatus(session);

        if (policyStatus !== 'active') {
            clearSession();
            return null;
        }

        const accessExpired = isAccessTokenExpired(session);
        const refreshExpired = isRefreshTokenExpired(session);

        if (accessExpired && refreshExpired) {
            clearSession();
            return null;
        }

        if (!parsedSession.sessionStartedAt || !parsedSession.lastActivityAt) {
            persistSession(session);
        }

        return session;
    } catch {
        clearSession();
        return null;
    }
};

export const writeSession = (session: AuthSession) => {
    if (!canUseStorage()) return;
    if (!session.accessToken) {
        throw new Error('Sessão inválida: access token ausente.');
    }

    persistSession(withSessionPolicyTimestamps(session));
};

export const touchSessionActivity = () => {
    if (!canUseStorage()) return null;

    const current = readSession();
    if (!current) return null;

    const session = {
        ...current,
        lastActivityAt: nowIso()
    };
    persistSession(session);
    return session;
};

export const updateTokens = (tokens: AuthTokens, permissoes?: PermissionCode[]) => {
    const current = readSession();
    if (!current) return;

    writeSession({
        ...current,
        ...tokens,
        refreshToken: tokens.refreshToken || current.refreshToken,
        refreshTokenExpiraEm: tokens.refreshTokenExpiraEm || current.refreshTokenExpiraEm,
        expiresAt: tokens.accessTokenExpiraEm || tokens.expiresAt || current.expiresAt,
        user: permissoes
            ? {
                  ...current.user,
                  permissoes
              }
            : current.user
    });
};

export const updateCurrentUser = (user: CurrentUser) => {
    const current = readSession();
    if (!current) return;
    writeSession({ ...current, user });
};

export const clearSession = () => {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(SESSION_KEY);
};

export const getSession = () => readSession();
export const getAccessToken = () => readSession()?.accessToken;
export const getRefreshToken = () => readSession()?.refreshToken;
