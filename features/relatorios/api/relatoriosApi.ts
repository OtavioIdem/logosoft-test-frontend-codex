import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { relatorioPeriodoQuerySchema } from '@/features/relatorios/schemas/relatoriosSchemas';
import {
    RelatorioAreaExportavel,
    RelatorioDashboardConsolidadoResponse,
    RelatorioFormatoExportacao,
    RelatorioGerencialComprasResponse,
    RelatorioGerencialEstoqueResponse,
    RelatorioGerencialFinanceiroResponse,
    RelatorioGerencialFiscalResponse,
    RelatorioGerencialProducaoResponse,
    RelatorioGerencialVendasResponse,
    RelatorioOperacionalResponse,
    RelatorioPeriodoQuery
} from '@/features/relatorios/types/relatorios.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRelatoriosRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query: RelatorioPeriodoQuery) => {
    const payload = buildRelatorioPeriodoQuery(query);
    return cleanQueryParams({ empresaId: payload.empresaId, filialId: payload.filialId, dataInicial: payload.dataInicial, dataFinal: payload.dataFinal });
};

export const buildRelatorioPeriodoQuery = (values: unknown): RelatorioPeriodoQuery => parseSchema(relatorioPeriodoQuerySchema, values);

export const relatoriosApi = {
    async operacional(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioOperacionalResponse>('/api/relatorios/operacionais', { params: params(query) });
            return response.data;
        });
    },
    async gerencialVendas(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialVendasResponse>('/api/relatorios/gerenciais/vendas', { params: params(query) });
            return response.data;
        });
    },
    async gerencialCompras(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialComprasResponse>('/api/relatorios/gerenciais/compras', { params: params(query) });
            return response.data;
        });
    },
    async gerencialFinanceiro(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialFinanceiroResponse>('/api/relatorios/gerenciais/financeiro', { params: params(query) });
            return response.data;
        });
    },
    async gerencialEstoque(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialEstoqueResponse>('/api/relatorios/gerenciais/estoque', { params: params(query) });
            return response.data;
        });
    },
    async gerencialFiscal(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialFiscalResponse>('/api/relatorios/gerenciais/fiscal', { params: params(query) });
            return response.data;
        });
    },
    async gerencialProducao(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioGerencialProducaoResponse>('/api/relatorios/gerenciais/producao', { params: params(query) });
            return response.data;
        });
    },
    async dashboardConsolidado(query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<RelatorioDashboardConsolidadoResponse>('/api/relatorios/gerenciais/dashboard', { params: params(query) });
            return response.data;
        });
    },
    async exportar(area: RelatorioAreaExportavel, formato: RelatorioFormatoExportacao, query: RelatorioPeriodoQuery) {
        return runRelatoriosRequest(async () => {
            const response = await httpClient.get<Blob>('/api/relatorios/gerenciais/exportar', { params: { ...params(query), area, formato }, responseType: 'blob' });
            return response.data;
        });
    }
};
