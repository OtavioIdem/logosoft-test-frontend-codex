import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    aprovarCotacaoSchema,
    conferenciaFiscalSchema,
    criarCotacaoSchema,
    criarSolicitacaoSchema,
    itemCotacaoSchema,
    itemSolicitacaoSchema,
    motivoOpcionalSchema
} from '@/features/compras-avancado/schemas/comprasAvancadoSchemas';
import {
    CotacaoCompraResponse,
    CotacoesListQuery,
    DivergenciasListQuery,
    RecebimentoCompraDetalheResponse,
    RecebimentoDivergenciaResponse,
    SolicitacaoCompraResponse,
    SolicitacoesListQuery
} from '@/features/compras-avancado/types/comprasAvancado.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

export const solicitacoesCompraApi = {
    async listar(query?: SolicitacoesListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<SolicitacaoCompraResponse[]>('/api/compras/solicitacoes', { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo }) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<SolicitacaoCompraResponse>(`/api/compras/solicitacoes/${id}`)).data);
    },
    async criar(values: unknown) {
        const payload = parseSchema(criarSolicitacaoSchema, values);
        return runRequest(async () => (await httpClient.post<SolicitacaoCompraResponse>('/api/compras/solicitacoes', payload)).data);
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = parseSchema(itemSolicitacaoSchema, values);
        return runRequest(async () => (await httpClient.post<SolicitacaoCompraResponse>(`/api/compras/solicitacoes/${id}/itens`, payload)).data);
    },
    async aprovar(id: string) {
        return runRequest(async () => (await httpClient.post<SolicitacaoCompraResponse>(`/api/compras/solicitacoes/${id}/aprovar`)).data);
    },
    async cancelar(id: string, motivo?: string | null) {
        const payload = parseSchema(motivoOpcionalSchema, { motivo });
        return runRequest(async () => (await httpClient.post<SolicitacaoCompraResponse>(`/api/compras/solicitacoes/${id}/cancelar`, payload)).data);
    }
};

export const cotacoesCompraApi = {
    async listar(query?: CotacoesListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<CotacaoCompraResponse[]>('/api/compras/cotacoes', { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, fornecedorId: query?.fornecedorId, status: query?.status, termo: query?.termo }) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<CotacaoCompraResponse>(`/api/compras/cotacoes/${id}`)).data);
    },
    async criar(values: unknown) {
        const payload = parseSchema(criarCotacaoSchema, values);
        return runRequest(async () => (await httpClient.post<CotacaoCompraResponse>('/api/compras/cotacoes', payload)).data);
    },
    async adicionarItem(id: string, values: unknown) {
        const payload = parseSchema(itemCotacaoSchema, values);
        return runRequest(async () => (await httpClient.post<CotacaoCompraResponse>(`/api/compras/cotacoes/${id}/itens`, payload)).data);
    },
    async aprovar(id: string, values: unknown) {
        const payload = parseSchema(aprovarCotacaoSchema, values);
        return runRequest(async () => (await httpClient.post<CotacaoCompraResponse>(`/api/compras/cotacoes/${id}/aprovar`, payload)).data);
    },
    async recusar(id: string) {
        return runRequest(async () => (await httpClient.post<CotacaoCompraResponse>(`/api/compras/cotacoes/${id}/recusar`)).data);
    },
    async cancelar(id: string, motivo?: string | null) {
        const payload = parseSchema(motivoOpcionalSchema, { motivo });
        return runRequest(async () => (await httpClient.post<CotacaoCompraResponse>(`/api/compras/cotacoes/${id}/cancelar`, payload)).data);
    }
};

export const recebimentosCompraApi = {
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<RecebimentoCompraDetalheResponse>(`/api/compras/recebimentos/${id}`)).data);
    },
    async listarDivergencias(query?: DivergenciasListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<RecebimentoDivergenciaResponse[]>('/api/compras/recebimentos/divergencias', { params: cleanQueryParams({ empresaId: query?.empresaId, pedidoCompraId: query?.pedidoCompraId, recebimentoCompraId: query?.recebimentoCompraId }) });
            return response.data;
        });
    },
    async registrarConferenciaFiscal(id: string, values: unknown) {
        const payload = parseSchema(conferenciaFiscalSchema, values);
        return runRequest(async () => (await httpClient.post<RecebimentoCompraDetalheResponse>(`/api/compras/recebimentos/${id}/conferencia-fiscal`, payload)).data);
    }
};
