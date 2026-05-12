import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { normalizeGuidOrNull, sanitizePayload } from '@/lib/http/requestUtils';
import { CriarUsuarioRequest, UsuarioFormValues, UsuarioResponse } from '@/features/seguranca/types/seguranca.types';

const runSecurityRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

export const buildCriarUsuarioPayload = (values: UsuarioFormValues): CriarUsuarioRequest => {
    const empresaId = normalizeGuidOrNull(values.empresaId);
    if (!empresaId) {
        throw new Error('Informe uma empresa válida para criar o usuário.');
    }

    return sanitizePayload({
        nome: values.nome.trim(),
        email: values.email.trim(),
        senha: values.senha,
        empresaId,
        filialId: normalizeGuidOrNull(values.filialId) ?? null
    }) as CriarUsuarioRequest;
};

export const segurancaApi = {
    async listarUsuarios() {
        return runSecurityRequest(async () => {
            const response = await httpClient.get<UsuarioResponse[]>('/api/seguranca/usuarios');
            return response.data;
        });
    },

    async criarUsuario(values: UsuarioFormValues) {
        const payload = buildCriarUsuarioPayload(values);
        return runSecurityRequest(async () => {
            const response = await httpClient.post<UsuarioResponse>('/api/seguranca/usuarios', payload);
            return response.data;
        });
    }
};
