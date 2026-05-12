import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarFornecedorSchema, criarFornecedorSchema, fornecedorMotivoSchema } from '@/features/fornecedores/schemas/fornecedoresSchemas';
import { AtualizarFornecedorRequest, CriarFornecedorRequest, FornecedorListQuery, FornecedorMotivoRequest, FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';

const runFornecedorRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: { parse: (value: unknown) => T }, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: FornecedorListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });

export const buildCriarFornecedorPayload = (values: unknown): CriarFornecedorRequest => parseSchema(criarFornecedorSchema, values);
export const buildAtualizarFornecedorPayload = (values: unknown): AtualizarFornecedorRequest => parseSchema(atualizarFornecedorSchema, values);
export const buildFornecedorMotivoPayload = (motivo: string): FornecedorMotivoRequest => parseSchema(fornecedorMotivoSchema, { motivo });

export const fornecedoresApi = {
    async listar(query?: FornecedorListQuery) {
        return runFornecedorRequest(async () => {
            const response = await httpClient.get<FornecedorResponse[]>('/api/fornecedores', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarFornecedorPayload(values);
        return runFornecedorRequest(async () => {
            const response = await httpClient.post<FornecedorResponse>('/api/fornecedores', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarFornecedorPayload(values);
        return runFornecedorRequest(async () => {
            const response = await httpClient.put<FornecedorResponse>(`/api/fornecedores/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildFornecedorMotivoPayload(motivo);
        return runFornecedorRequest(async () => {
            await httpClient.post<void>(`/api/fornecedores/${id}/inativar`, payload);
        });
    }
};
