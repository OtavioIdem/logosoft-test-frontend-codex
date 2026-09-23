import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarFornecedorSchema, configurarCompraFornecedorSchema, criarFornecedorSchema, fornecedorMotivoSchema, revogarHomologacaoFornecedorSchema } from '@/features/fornecedores/schemas/fornecedoresSchemas';
import { AtualizarFornecedorRequest, ConfigurarCompraFornecedorRequest, CriarFornecedorRequest, FornecedorListQuery, FornecedorMotivoRequest, FornecedorResponse, RevogarHomologacaoFornecedorRequest } from '@/features/fornecedores/types/fornecedores.types';

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
export const buildConfigurarCompraFornecedorPayload = (values: unknown): ConfigurarCompraFornecedorRequest => parseSchema(configurarCompraFornecedorSchema, values);
export const buildRevogarHomologacaoFornecedorPayload = (motivo: string): RevogarHomologacaoFornecedorRequest => parseSchema(revogarHomologacaoFornecedorSchema, { motivo });

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
    },
    async configurarCompra(id: string, values: unknown) {
        const payload = buildConfigurarCompraFornecedorPayload(values);
        return runFornecedorRequest(async () => {
            await httpClient.put<void>(`/api/fornecedores/${id}/configuracao-compra`, payload);
        });
    },
    async homologar(id: string) {
        return runFornecedorRequest(async () => {
            await httpClient.post<void>(`/api/fornecedores/${id}/homologar`);
        });
    },
    async revogarHomologacao(id: string, motivo: string) {
        const payload = buildRevogarHomologacaoFornecedorPayload(motivo);
        return runFornecedorRequest(async () => {
            await httpClient.post<void>(`/api/fornecedores/${id}/revogar-homologacao`, payload);
        });
    }
};
