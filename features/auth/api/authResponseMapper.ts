import { AuthSession, AuthTokens, CurrentUser, PermissionCode } from '@/types/erp';
import { decodeJwtPayload } from '@/lib/auth/jwt';
import { MeResponse, meResponseSchema } from '@/features/auth/schemas/authSchemas';

const ENVELOPE_KEYS = ['data', 'Data', 'value', 'Value', 'result', 'Result'] as const;

const ACCESS_TOKEN_KEYS = ['accessToken', 'AccessToken', 'token', 'Token', 'jwt', 'Jwt', 'jwtToken', 'JwtToken'] as const;
const ACCESS_TOKEN_EXPIRES_AT_KEYS = ['accessTokenExpiraEm', 'AccessTokenExpiraEm', 'accessTokenExpiresAt', 'AccessTokenExpiresAt', 'expiresAt', 'ExpiresAt', 'expiration', 'Expiration'] as const;
const REFRESH_TOKEN_KEYS = ['refreshToken', 'RefreshToken', 'refresh', 'Refresh'] as const;
const REFRESH_TOKEN_EXPIRES_AT_KEYS = ['refreshTokenExpiraEm', 'RefreshTokenExpiraEm', 'refreshTokenExpiresAt', 'RefreshTokenExpiresAt'] as const;
const USER_KEYS = ['user', 'User', 'usuario', 'Usuario', 'currentUser', 'CurrentUser'] as const;
const PERMISSION_KEYS = ['permissoes', 'Permissoes', 'permissions', 'Permissions', 'permission', 'Permission', 'roles', 'Roles', 'role', 'Role'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (source: Record<string, unknown>, keys: readonly string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return undefined;
};

const getRecord = (source: Record<string, unknown>, keys: readonly string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (isRecord(value)) {
            return value;
        }
    }

    return undefined;
};

const extractEnvelopePayload = (payload: unknown): unknown => {
    let current = payload;

    for (let index = 0; index < 4; index += 1) {
        if (!isRecord(current)) {
            return current;
        }

        const success = current.success ?? current.Success ?? current.succeeded ?? current.Succeeded ?? current.isSuccess ?? current.IsSuccess;
        if (success === false) {
            const error = isRecord(current.error) ? current.error : isRecord(current.Error) ? current.Error : undefined;
            const message = getString(error ?? current, ['message', 'Message', 'title', 'Title']) ?? 'Não foi possível autenticar.';
            throw new Error(message);
        }

        const currentRecord = current;
        const envelopeKey = ENVELOPE_KEYS.find((key) => currentRecord[key] !== undefined && currentRecord[key] !== null);
        if (!envelopeKey) {
            return currentRecord;
        }

        current = currentRecord[envelopeKey];
    }

    return current;
};

export const normalizePermissions = (source?: Record<string, unknown> | null): PermissionCode[] => {
    if (!source) {
        return [];
    }

    const values = PERMISSION_KEYS.flatMap((key) => {
        const value = source[key];
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.includes(',') ? value.split(',') : [value];
        }
        return [];
    });

    return Array.from(new Set(values.filter((value): value is PermissionCode => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim() as PermissionCode)));
};

export const normalizeAuthTokens = (payload: unknown): AuthTokens => {
    const data = extractEnvelopePayload(payload);

    if (!isRecord(data)) {
        throw new Error('Resposta de autenticação inválida: corpo da resposta não é um objeto JSON.');
    }

    const accessToken = getString(data, ACCESS_TOKEN_KEYS);
    if (!accessToken) {
        throw new Error('Resposta de autenticação inválida: access token não foi retornado pela API.');
    }

    const accessTokenExpiraEm = getString(data, ACCESS_TOKEN_EXPIRES_AT_KEYS);
    const refreshTokenExpiraEm = getString(data, REFRESH_TOKEN_EXPIRES_AT_KEYS);

    return {
        accessToken,
        accessTokenExpiraEm,
        refreshToken: getString(data, REFRESH_TOKEN_KEYS) ?? '',
        refreshTokenExpiraEm,
        expiresAt: accessTokenExpiraEm
    };
};

export type RefreshSessionResponse = AuthTokens & {
    permissoes: PermissionCode[];
};

export const normalizeRefreshSession = (payload: unknown): RefreshSessionResponse => {
    const data = extractEnvelopePayload(payload);

    if (!isRecord(data)) {
        throw new Error('Resposta de refresh inválida: corpo da resposta não é um objeto JSON.');
    }

    return {
        ...normalizeAuthTokens(data),
        permissoes: normalizePermissions(data)
    };
};

export const normalizeUser = (payload: Record<string, unknown>, accessToken: string): CurrentUser => {
    const tokenClaims: Record<string, unknown> = decodeJwtPayload(accessToken) ?? {};
    const userPayload = getRecord(payload, USER_KEYS) ?? payload;
    const userPermissions = normalizePermissions(userPayload);
    const topLevelPermissions = normalizePermissions(payload);
    const tokenPermissions = normalizePermissions(tokenClaims);
    const permissions = userPermissions.length > 0 ? userPermissions : topLevelPermissions.length > 0 ? topLevelPermissions : tokenPermissions;

    const id =
        getString(userPayload, ['id', 'Id', 'usuarioId', 'UsuarioId', 'userId', 'UserId']) ??
        getString(tokenClaims, ['sub', 'nameid', 'id', 'usuarioId', 'userId']) ??
        getString(userPayload, ['email', 'Email']) ??
        getString(tokenClaims, ['email', 'Email']) ??
        'usuario-autenticado';

    const email = getString(userPayload, ['email', 'Email']) ?? getString(tokenClaims, ['email', 'Email', 'unique_name']) ?? '';
    const nome = getString(userPayload, ['nome', 'Nome', 'name', 'Name', 'displayName', 'DisplayName']) ?? getString(tokenClaims, ['nome', 'name', 'unique_name']) ?? (email || 'Usuário');

    return {
        id,
        nome,
        email,
        empresaId: getString(userPayload, ['empresaId', 'EmpresaId']) ?? getString(tokenClaims, ['empresaId', 'EmpresaId']),
        filialId: getString(userPayload, ['filialId', 'FilialId']) ?? getString(tokenClaims, ['filialId', 'FilialId']),
        permissoes: permissions
    };
};

export const normalizeMeResponse = (payload: unknown): MeResponse => meResponseSchema.parse(extractEnvelopePayload(payload));

export const normalizeCurrentUserResponse = (payload: unknown): CurrentUser => {
    const me = normalizeMeResponse(payload);
    return {
        id: me.usuarioId,
        nome: me.nome,
        email: me.email,
        empresaId: me.empresaId,
        filialId: me.filialId,
        isMaster: me.isMaster,
        permissoes: me.permissoes as PermissionCode[]
    };
};
export const normalizeLoginSession = (payload: unknown): AuthSession => {
    const data = extractEnvelopePayload(payload);

    if (!isRecord(data)) {
        throw new Error('Resposta de login inválida: corpo da resposta não é um objeto JSON.');
    }

    const tokens = normalizeAuthTokens(data);
    return {
        ...tokens,
        user: normalizeUser(data, tokens.accessToken)
    };
};
