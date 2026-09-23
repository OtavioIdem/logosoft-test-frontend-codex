import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    atualizarClassificacaoPessoaSchema,
    atualizarPessoaSchema,
    criarClassificacaoPessoaSchema,
    criarPessoaSchema,
    inativarClassificacaoPessoaSchema,
    inativarPessoaSchema
} from '@/features/pessoas/schemas/pessoasSchemas';
import {
    AtualizarClassificacaoPessoaRequest,
    AtualizarPessoaRequest,
    ClassificacaoPessoaListQuery,
    ClassificacaoPessoaResponse,
    CriarClassificacaoPessoaRequest,
    CriarPessoaRequest,
    InativarClassificacaoPessoaRequest,
    InativarPessoaRequest,
    PessoaListQuery,
    PessoaResponse
} from '@/features/pessoas/types/pessoas.types';

const runPessoaRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: { parse: (value: unknown) => T }, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: PessoaListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });

export const buildCriarPessoaPayload = (values: unknown): CriarPessoaRequest => parseSchema(criarPessoaSchema, values);
export const buildAtualizarPessoaPayload = (values: unknown): AtualizarPessoaRequest => parseSchema(atualizarPessoaSchema, values);
export const buildInativarPessoaPayload = (motivo: string): InativarPessoaRequest => parseSchema(inativarPessoaSchema, { motivo });

export const buildCriarClassificacaoPessoaPayload = (values: unknown): CriarClassificacaoPessoaRequest => parseSchema(criarClassificacaoPessoaSchema, values);
export const buildAtualizarClassificacaoPessoaPayload = (values: unknown): AtualizarClassificacaoPessoaRequest => parseSchema(atualizarClassificacaoPessoaSchema, values);
export const buildInativarClassificacaoPessoaPayload = (empresaId: string, motivo: string): InativarClassificacaoPessoaRequest => parseSchema(inativarClassificacaoPessoaSchema, { empresaId, motivo });

export const pessoasApi = {
    async listar(query?: PessoaListQuery) {
        return runPessoaRequest(async () => {
            const response = await httpClient.get<PessoaResponse[]>('/api/pessoas', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarPessoaPayload(values);
        return runPessoaRequest(async () => {
            const response = await httpClient.post<PessoaResponse>('/api/pessoas', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarPessoaPayload(values);
        return runPessoaRequest(async () => {
            const response = await httpClient.put<PessoaResponse>(`/api/pessoas/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildInativarPessoaPayload(motivo);
        return runPessoaRequest(async () => {
            await httpClient.post<void>(`/api/pessoas/${id}/inativar`, payload);
        });
    }
};

export const classificacoesPessoaApi = {
    async listar(query: ClassificacaoPessoaListQuery) {
        return runPessoaRequest(async () => {
            const response = await httpClient.get<ClassificacaoPessoaResponse[]>('/api/pessoas/classificacoes', { params: cleanQueryParams({ empresaId: query.empresaId, termo: query.termo }) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarClassificacaoPessoaPayload(values);
        return runPessoaRequest(async () => {
            const response = await httpClient.post<ClassificacaoPessoaResponse>('/api/pessoas/classificacoes', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarClassificacaoPessoaPayload(values);
        return runPessoaRequest(async () => {
            const response = await httpClient.put<ClassificacaoPessoaResponse>(`/api/pessoas/classificacoes/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, empresaId: string, motivo: string) {
        const payload = buildInativarClassificacaoPessoaPayload(empresaId, motivo);
        return runPessoaRequest(async () => {
            await httpClient.post<void>(`/api/pessoas/classificacoes/${id}/inativar`, payload);
        });
    }
};
