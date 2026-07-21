import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, normalizeGuidOrNull, sanitizePayload } from '@/lib/http/requestUtils';
import {
    AtualizarGrupoAcessoRequest,
    CriarGrupoAcessoRequest,
    CriarUsuarioRequest,
    GrupoAcessoFormValues,
    GrupoAcessoResponse,
    RemoverGrupoUsuarioRequest,
    ResetSenhaUsuarioFormValues,
    ResetSenhaUsuarioRequest,
    SegurancaListQuery,
    UsuarioFormValues,
    UsuarioMotivoRequest,
    UsuarioResponse,
    VincularGrupoUsuarioFormValues,
    VincularGrupoUsuarioRequest
} from '@/features/seguranca/types/seguranca.types';
import { grupoAcessoSchema, motivoSegurancaSchema, resetSenhaUsuarioSchema, vincularGrupoUsuarioSchema } from '@/features/seguranca/schemas/segurancaSchemas';
import { PermissionCode } from '@/types/erp';

const runSecurityRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const params = (query?: SegurancaListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo, ativo: query?.ativo ?? undefined });

export const buildCriarUsuarioPayload = (values: UsuarioFormValues): CriarUsuarioRequest => {
    const empresaId = normalizeGuidOrNull(values.empresaId);
    if (!empresaId) {
        throw new Error('Informe uma empresa válida para criar o usuário.');
    }

    const gruposAcessoIds = (values.gruposAcessoIds ?? []).map((value) => normalizeGuidOrNull(value)).filter((value): value is string => Boolean(value));
    const email = values.email.trim();
    const login = values.login?.trim() || email;

    return sanitizePayload({
        nome: values.nome.trim(),
        email,
        login,
        senha: values.senha,
        empresaId,
        filialId: normalizeGuidOrNull(values.filialId) ?? null,
        gruposAcessoIds: gruposAcessoIds.length ? gruposAcessoIds : undefined
    }) as CriarUsuarioRequest;
};

export const buildUsuarioMotivoPayload = (motivo: string): UsuarioMotivoRequest => sanitizePayload(motivoSegurancaSchema.parse({ motivo })) as UsuarioMotivoRequest;

export const buildResetSenhaUsuarioPayload = (values: ResetSenhaUsuarioFormValues): ResetSenhaUsuarioRequest => {
    const parsed = resetSenhaUsuarioSchema.parse(values);
    return sanitizePayload({ novaSenha: parsed.novaSenha, motivo: parsed.motivo }) as ResetSenhaUsuarioRequest;
};

export const buildVincularGrupoUsuarioPayload = (values: VincularGrupoUsuarioFormValues): VincularGrupoUsuarioRequest => {
    const parsed = vincularGrupoUsuarioSchema.parse(values);
    return sanitizePayload(parsed) as VincularGrupoUsuarioRequest;
};

export const buildRemoverGrupoUsuarioPayload = (motivo: string): RemoverGrupoUsuarioRequest => sanitizePayload(motivoSegurancaSchema.parse({ motivo })) as RemoverGrupoUsuarioRequest;

export const buildGrupoAcessoPayload = (values: GrupoAcessoFormValues): CriarGrupoAcessoRequest | AtualizarGrupoAcessoRequest => {
    const parsed = grupoAcessoSchema.parse(values);
    const empresaId = normalizeGuidOrNull(parsed.empresaId);
    if (!empresaId) {
        throw new Error('Informe uma empresa válida para o grupo de acesso.');
    }
    return sanitizePayload({
        empresaId,
        filialId: normalizeGuidOrNull(parsed.filialId ?? null) ?? null,
        nome: parsed.nome.trim(),
        descricao: parsed.descricao?.trim() || null,
        permissoes: parsed.permissoes as PermissionCode[]
    }) as CriarGrupoAcessoRequest;
};

export const segurancaApi = {
    async listarUsuarios(query?: SegurancaListQuery) {
        return runSecurityRequest(async () => {
            const response = await httpClient.get<UsuarioResponse[]>('/api/seguranca/usuarios', { params: params(query) });
            return response.data;
        });
    },

    async obterUsuario(id: string) {
        return runSecurityRequest(async () => {
            const response = await httpClient.get<UsuarioResponse>(`/api/seguranca/usuarios/${id}`);
            return response.data;
        });
    },

    async criarUsuario(values: UsuarioFormValues) {
        const payload = buildCriarUsuarioPayload(values);
        return runSecurityRequest(async () => {
            const response = await httpClient.post<UsuarioResponse>('/api/seguranca/usuarios', payload);
            return response.data;
        });
    },

    async inativarUsuario(id: string, motivo: string) {
        const payload = buildUsuarioMotivoPayload(motivo);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/usuarios/${id}/inativar`, payload);
        });
    },

    async reativarUsuario(id: string, motivo: string) {
        const payload = buildUsuarioMotivoPayload(motivo);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/usuarios/${id}/reativar`, payload);
        });
    },

    async resetarSenhaUsuario(id: string, values: ResetSenhaUsuarioFormValues) {
        const payload = buildResetSenhaUsuarioPayload(values);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/usuarios/${id}/reset-senha`, payload);
        });
    },

    async vincularGrupoUsuario(id: string, values: VincularGrupoUsuarioFormValues) {
        const payload = buildVincularGrupoUsuarioPayload(values);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/usuarios/${id}/grupos-acesso`, payload);
        });
    },

    async removerGrupoUsuario(id: string, grupoAcessoId: string, motivo: string) {
        const payload = buildRemoverGrupoUsuarioPayload(motivo);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/usuarios/${id}/grupos-acesso/${grupoAcessoId}/remover`, payload);
        });
    },

    async listarGruposAcesso(query?: SegurancaListQuery) {
        return runSecurityRequest(async () => {
            const response = await httpClient.get<GrupoAcessoResponse[]>('/api/seguranca/grupos-acesso', { params: params(query) });
            return response.data;
        });
    },

    async obterGrupoAcesso(id: string) {
        return runSecurityRequest(async () => {
            const response = await httpClient.get<GrupoAcessoResponse>(`/api/seguranca/grupos-acesso/${id}`);
            return response.data;
        });
    },

    async criarGrupoAcesso(values: GrupoAcessoFormValues) {
        const payload = buildGrupoAcessoPayload(values);
        return runSecurityRequest(async () => {
            const response = await httpClient.post<GrupoAcessoResponse>('/api/seguranca/grupos-acesso', payload);
            return response.data;
        });
    },

    async atualizarGrupoAcesso(id: string, values: GrupoAcessoFormValues) {
        const payload = buildGrupoAcessoPayload(values);
        return runSecurityRequest(async () => {
            const response = await httpClient.put<GrupoAcessoResponse>(`/api/seguranca/grupos-acesso/${id}`, payload);
            return response.data;
        });
    },

    async inativarGrupoAcesso(id: string, motivo: string) {
        const payload = buildUsuarioMotivoPayload(motivo);
        return runSecurityRequest(async () => {
            await httpClient.post<void>(`/api/seguranca/grupos-acesso/${id}/inativar`, payload);
        });
    }
};
