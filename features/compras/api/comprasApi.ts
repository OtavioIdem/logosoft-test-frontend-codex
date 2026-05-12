import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarItemPedidoCompraSchema,
    aprovarPedidoCompraSchema,
    atualizarItemPedidoCompraSchema,
    atualizarPedidoCompraSchema,
    criarPedidoCompraSchema,
    motivoPedidoCompraSchema,
    receberPedidoCompraSchema
} from '@/features/compras/schemas/comprasSchemas';
import {
    AprovarPedidoCompraRequest,
    AtualizarPedidoCompraRequest,
    CancelarPedidoCompraRequest,
    CriarPedidoCompraRequest,
    PedidoCompraListQuery,
    PedidoCompraResponse,
    ReceberPedidoCompraRequest,
    RemoverItemPedidoCompraRequest,
    SalvarItemPedidoCompraRequest
} from '@/features/compras/types/compras.types';

type Schema<T> = { parse: (value: unknown) => T };

const runComprasRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: PedidoCompraListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, fornecedorId: query?.fornecedorId, status: query?.status, termo: query?.termo });

export const buildCriarPedidoCompraPayload = (values: unknown): CriarPedidoCompraRequest => parseSchema(criarPedidoCompraSchema, values);
export const buildAtualizarPedidoCompraPayload = (values: unknown): AtualizarPedidoCompraRequest => parseSchema(atualizarPedidoCompraSchema, values);
export const buildAdicionarItemPedidoCompraPayload = (values: unknown): SalvarItemPedidoCompraRequest => parseSchema(adicionarItemPedidoCompraSchema, values);
export const buildAtualizarItemPedidoCompraPayload = (values: unknown): SalvarItemPedidoCompraRequest => parseSchema(atualizarItemPedidoCompraSchema, values);
export const buildRemoverItemPedidoCompraPayload = (motivo: string): RemoverItemPedidoCompraRequest => parseSchema(motivoPedidoCompraSchema, { motivo });
export const buildCancelarPedidoCompraPayload = (motivo: string): CancelarPedidoCompraRequest => parseSchema(motivoPedidoCompraSchema, { motivo });
export const buildAprovarPedidoCompraPayload = (values: unknown): AprovarPedidoCompraRequest => parseSchema(aprovarPedidoCompraSchema, values);
export const buildReceberPedidoCompraPayload = (values: unknown): ReceberPedidoCompraRequest => parseSchema(receberPedidoCompraSchema, values);

export const comprasApi = {
    async listar(query?: PedidoCompraListQuery) {
        return runComprasRequest(async () => {
            const response = await httpClient.get<PedidoCompraResponse[]>('/api/compras/pedidos', { params: params(query) });
            return response.data;
        });
    },
    async buscar(id: string) {
        return runComprasRequest(async () => {
            const response = await httpClient.get<PedidoCompraResponse>(`/api/compras/pedidos/${id}`);
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>('/api/compras/pedidos', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.put<PedidoCompraResponse>(`/api/compras/pedidos/${id}`, payload);
            return response.data;
        });
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = buildAdicionarItemPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/itens`, payload);
            return response.data;
        });
    },
    async atualizarItem(id: string, itemId: string, values: unknown) {
        const payload = buildAtualizarItemPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.put<PedidoCompraResponse>(`/api/compras/pedidos/${id}/itens/${itemId}`, payload);
            return response.data;
        });
    },
    async removerItem(id: string, itemId: string, motivo: string) {
        const payload = buildRemoverItemPedidoCompraPayload(motivo);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/itens/${itemId}/remover`, payload);
            return response.data;
        });
    },
    async enviarParaAprovacao(id: string) {
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/enviar-para-aprovacao`);
            return response.data;
        });
    },
    async aprovar(id: string, values: unknown) {
        const payload = buildAprovarPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/aprovar`, payload);
            return response.data;
        });
    },
    async cancelar(id: string, motivo: string) {
        const payload = buildCancelarPedidoCompraPayload(motivo);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/cancelar`, payload);
            return response.data;
        });
    },
    async receber(id: string, values: unknown) {
        const payload = buildReceberPedidoCompraPayload(values);
        return runComprasRequest(async () => {
            const response = await httpClient.post<PedidoCompraResponse>(`/api/compras/pedidos/${id}/receber`, payload);
            return response.data;
        });
    }
};

export const pedidosCompraApi = comprasApi;
