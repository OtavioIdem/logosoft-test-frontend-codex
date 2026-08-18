import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export type OrganizationalScope = 'global' | 'lookup' | 'query' | 'body' | 'resource';

export type OrganizationalRequestMetadata = {
    scope: OrganizationalScope;
    required?: boolean;
    includeFilial?: boolean;
    snapshot?: OrganizationalContextSnapshot;
};

export type OrganizationalContextSnapshot = Readonly<{
    empresaId: string | null;
    filialId: string | null;
    isMaster: boolean;
    revision: number;
}>;

declare module 'axios' {
    interface AxiosRequestConfig {
        organizationalContext?: OrganizationalRequestMetadata;
    }

    interface InternalAxiosRequestConfig {
        organizationalContext?: OrganizationalRequestMetadata;
    }
}

export class OrganizationalContextPolicyError extends Error {
    readonly code = 'OrganizationalContextRequired';

    constructor(message = 'Selecione uma empresa antes de consultar este recurso.') {
        super(message);
        this.name = 'OrganizationalContextPolicyError';
    }
}

export const organizationalScopeKey = (snapshot: OrganizationalContextSnapshot) =>
    `${snapshot.isMaster ? 'master' : 'user'}:${snapshot.empresaId ?? 'global'}:${snapshot.filialId ?? 'all'}:${snapshot.revision}`;

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const assertContextValue = (field: 'empresaId' | 'filialId', explicitValue: unknown, snapshotValue: string | null) => {
    if (explicitValue !== undefined && explicitValue !== null && snapshotValue && explicitValue !== snapshotValue) {
        throw new OrganizationalContextPolicyError(`O ${field} explícito diverge do contexto organizacional ativo.`);
    }
};

const requireEmpresa = (snapshot: OrganizationalContextSnapshot) => {
    if (!snapshot.empresaId) throw new OrganizationalContextPolicyError();
};

const withLookupContext = (config: AxiosRequestConfig, metadata: OrganizationalRequestMetadata, snapshot?: OrganizationalContextSnapshot) => {
    const requestSnapshot = metadata.snapshot ?? snapshot;
    if (!requestSnapshot) throw new OrganizationalContextPolicyError('O contexto organizacional desta consulta não está disponível.');
    requireEmpresa(requestSnapshot);
    if (config.params instanceof URLSearchParams) {
        const params = new URLSearchParams(config.params);
        const explicitEmpresaId = params.get('empresaId');
        if (!explicitEmpresaId) throw new OrganizationalContextPolicyError('Informe a empresa para consultar as filiais.');
        assertContextValue('empresaId', explicitEmpresaId, requestSnapshot.empresaId);
        if (params.has('filialId')) throw new OrganizationalContextPolicyError('A consulta de filiais não aceita filtro de filial.');
        return { ...config, params };
    }
    const params = config.params && typeof config.params === 'object' && !(config.params instanceof URLSearchParams) ? { ...config.params } : {};
    if (!hasOwn(params, 'empresaId') || !params.empresaId) {
        throw new OrganizationalContextPolicyError('Informe a empresa para consultar as filiais.');
    }
    assertContextValue('empresaId', params.empresaId, requestSnapshot.empresaId);
    if (hasOwn(params, 'filialId')) {
        throw new OrganizationalContextPolicyError('A consulta de filiais não aceita filtro de filial.');
    }
    return { ...config, params };
};

const withQueryContext = (config: AxiosRequestConfig, snapshot: OrganizationalContextSnapshot, metadata: OrganizationalRequestMetadata) => {
    if (!snapshot.empresaId && metadata.required === false) return config;
    if (metadata.required !== false) requireEmpresa(snapshot);
    if (config.params instanceof URLSearchParams) {
        const params = new URLSearchParams(config.params);
        assertContextValue('empresaId', params.get('empresaId'), snapshot.empresaId);
        assertContextValue('filialId', params.get('filialId'), snapshot.filialId);
        if (!params.has('empresaId')) params.set('empresaId', snapshot.empresaId as string);
        if (metadata.includeFilial !== false && snapshot.filialId && !params.has('filialId')) params.set('filialId', snapshot.filialId);
        return { ...config, params };
    }
    const params = config.params && typeof config.params === 'object' ? { ...config.params } : {};
    assertContextValue('empresaId', params.empresaId, snapshot.empresaId);
    assertContextValue('filialId', params.filialId, snapshot.filialId);
    if (!hasOwn(params, 'empresaId')) params.empresaId = snapshot.empresaId;
    if (metadata.includeFilial !== false && snapshot.filialId && !hasOwn(params, 'filialId')) params.filialId = snapshot.filialId;
    return { ...config, params };
};

const withBodyContext = (config: AxiosRequestConfig, snapshot: OrganizationalContextSnapshot, metadata: OrganizationalRequestMetadata) => {
    if (metadata.required !== false) requireEmpresa(snapshot);
    if (config.data instanceof FormData) return config;
    if (!snapshot.empresaId && metadata.required === false) return config;
    if (!config.data || typeof config.data !== 'object' || Array.isArray(config.data)) return config;
    const data = { ...config.data } as Record<string, unknown>;
    assertContextValue('empresaId', data.empresaId, snapshot.empresaId);
    if (snapshot.filialId) assertContextValue('filialId', data.filialId, snapshot.filialId);
    if (!hasOwn(data, 'empresaId')) data.empresaId = snapshot.empresaId;
    if (snapshot.filialId && !hasOwn(data, 'filialId')) data.filialId = snapshot.filialId;
    return { ...config, data };
};

export const applyOrganizationalContextPolicy = <T extends AxiosRequestConfig>(config: T, snapshot?: OrganizationalContextSnapshot): T => {
    const metadata = config.organizationalContext;
    if (!metadata || metadata.scope === 'global' || metadata.scope === 'resource') return config;
    const requestSnapshot = metadata.snapshot ?? snapshot;
    if (!requestSnapshot) throw new OrganizationalContextPolicyError('O contexto organizacional desta consulta não está disponível.');
    if (metadata.scope === 'lookup') return withLookupContext(config, metadata, requestSnapshot) as T;
    if (metadata.scope === 'query') return withQueryContext(config, requestSnapshot, metadata) as T;
    return withBodyContext(config, requestSnapshot, metadata) as T;
};

export type OrganizationalAxiosRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};
