import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarItemPedidoVendaSchema,
    aprovarPedidoVendaSchema,
    atualizarItemPedidoVendaSchema,
    atualizarPedidoVendaSchema,
    criarPedidoVendaSchema,
    faturarPedidoVendaSchema,
    motivoPedidoVendaSchema
} from '@/features/vendas/schemas/vendasSchemas';
import {
    AprovarPedidoVendaRequest,
    AtualizarPedidoVendaRequest,
    CancelarPedidoVendaRequest,
    CriarPedidoVendaRequest,
    FaturarPedidoVendaRequest,
    PedidoVendaListQuery,
    PedidoVendaResponse,
    RemoverItemPedidoVendaRequest,
    SalvarItemPedidoVendaRequest
} from '@/features/vendas/types/vendas.types';

type Schema<T> = { parse: (value: unknown) => T };

const runVendasRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: PedidoVendaListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, clienteId: query?.clienteId, status: query?.status, termo: query?.termo });

export const buildCriarPedidoVendaPayload = (values: unknown): CriarPedidoVendaRequest => parseSchema(criarPedidoVendaSchema, values);
export const buildAtualizarPedidoVendaPayload = (values: unknown): AtualizarPedidoVendaRequest => parseSchema(atualizarPedidoVendaSchema, values);
export const buildAdicionarItemPedidoVendaPayload = (values: unknown): SalvarItemPedidoVendaRequest => parseSchema(adicionarItemPedidoVendaSchema, values);
export const buildAtualizarItemPedidoVendaPayload = (values: unknown): SalvarItemPedidoVendaRequest => parseSchema(atualizarItemPedidoVendaSchema, values);
export const buildRemoverItemPedidoVendaPayload = (motivo: string): RemoverItemPedidoVendaRequest => parseSchema(motivoPedidoVendaSchema, { motivo });
export const buildCancelarPedidoVendaPayload = (motivo: string): CancelarPedidoVendaRequest => parseSchema(motivoPedidoVendaSchema, { motivo });
export const buildAprovarPedidoVendaPayload = (values: unknown): AprovarPedidoVendaRequest => parseSchema(aprovarPedidoVendaSchema, values);
export const buildFaturarPedidoVendaPayload = (values: unknown): FaturarPedidoVendaRequest => parseSchema(faturarPedidoVendaSchema, values);

export const vendasApi = {
    async listar(query?: PedidoVendaListQuery) {
        return runVendasRequest(async () => {
            const response = await httpClient.get<PedidoVendaResponse[]>('/api/vendas/pedidos', { params: params(query) });
            return response.data;
        });
    },
    async buscar(id: string) {
        return runVendasRequest(async () => {
            const response = await httpClient.get<PedidoVendaResponse>(`/api/vendas/pedidos/${id}`);
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>('/api/vendas/pedidos', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.put<PedidoVendaResponse>(`/api/vendas/pedidos/${id}`, payload);
            return response.data;
        });
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = buildAdicionarItemPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/itens`, payload);
            return response.data;
        });
    },
    async atualizarItem(id: string, itemId: string, values: unknown) {
        const payload = buildAtualizarItemPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.put<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/itens/${itemId}`, payload);
            return response.data;
        });
    },
    async removerItem(id: string, itemId: string, motivo: string) {
        const payload = buildRemoverItemPedidoVendaPayload(motivo);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/itens/${itemId}/remover`, payload);
            return response.data;
        });
    },
    async enviarParaAprovacao(id: string) {
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/enviar-para-aprovacao`);
            return response.data;
        });
    },
    async aprovar(id: string, values: unknown) {
        const payload = buildAprovarPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/aprovar`, payload);
            return response.data;
        });
    },
    async cancelar(id: string, motivo: string) {
        const payload = buildCancelarPedidoVendaPayload(motivo);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/cancelar`, payload);
            return response.data;
        });
    },
    async faturar(id: string, values: unknown) {
        const payload = buildFaturarPedidoVendaPayload(values);
        return runVendasRequest(async () => {
            const response = await httpClient.post<PedidoVendaResponse>(`/api/vendas/pedidos/${id}/faturar`, payload);
            return response.data;
        });
    }
};
