import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    abrirPeriodoSchema,
    criarContaContabilSchema,
    criarLancamentoSchema,
    criarRegraSchema,
    estornarLancamentoSchema,
    fecharPeriodoSchema
} from '@/features/contabil/schemas/contabilSchemas';
import {
    ContaContabilResponse,
    LancamentoContabilResponse,
    LancamentoContabilResumoResponse,
    LancamentosListQuery,
    PeriodoContabilResponse,
    PeriodosListQuery,
    PlanoContasListQuery,
    RegraContabilizacaoResponse,
    RegrasListQuery
} from '@/features/contabil/types/contabil.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const PLANO_CONTAS = '/api/contabil/plano-contas';
const PERIODOS = '/api/contabil/periodos';
const LANCAMENTOS = '/api/contabil/lancamentos';
const REGRAS = '/api/contabil/regras';

export const contabilApi = {
    // ---- Plano de contas ----
    async listarContas(query?: PlanoContasListQuery) {
        return runRequest(async () => (await httpClient.get<ContaContabilResponse[]>(PLANO_CONTAS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, tipo: query?.tipo, termo: query?.termo }) })).data);
    },
    async criarConta(values: unknown) {
        const payload = parseSchema(criarContaContabilSchema, values);
        return runRequest(async () => (await httpClient.post<ContaContabilResponse>(PLANO_CONTAS, payload)).data);
    },
    async inativarConta(id: string) {
        return runRequest(async () => (await httpClient.post<ContaContabilResponse>(`${PLANO_CONTAS}/${id}/inativar`)).data);
    },

    // ---- Períodos ----
    async listarPeriodos(query?: PeriodosListQuery) {
        return runRequest(async () => (await httpClient.get<PeriodoContabilResponse[]>(PERIODOS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, ano: query?.ano, status: query?.status }) })).data);
    },
    async abrirPeriodo(values: unknown) {
        const payload = parseSchema(abrirPeriodoSchema, values);
        return runRequest(async () => (await httpClient.post<PeriodoContabilResponse>(PERIODOS, payload)).data);
    },
    async fecharPeriodo(id: string, observacao?: string | null) {
        const payload = parseSchema(fecharPeriodoSchema, { observacao });
        return runRequest(async () => (await httpClient.post<PeriodoContabilResponse>(`${PERIODOS}/${id}/fechar`, payload)).data);
    },
    async reabrirPeriodo(id: string, observacao?: string | null) {
        const payload = parseSchema(fecharPeriodoSchema, { observacao });
        return runRequest(async () => (await httpClient.post<PeriodoContabilResponse>(`${PERIODOS}/${id}/reabrir`, payload)).data);
    },

    // ---- Lançamentos ----
    async listarLancamentos(query?: LancamentosListQuery) {
        return runRequest(async () => (await httpClient.get<LancamentoContabilResumoResponse[]>(LANCAMENTOS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo }) })).data);
    },
    async obterLancamento(id: string) {
        return runRequest(async () => (await httpClient.get<LancamentoContabilResponse>(`${LANCAMENTOS}/${id}`)).data);
    },
    async criarLancamento(values: unknown) {
        const payload = parseSchema(criarLancamentoSchema, values);
        return runRequest(async () => (await httpClient.post<LancamentoContabilResponse>(LANCAMENTOS, payload)).data);
    },
    async estornarLancamento(id: string, motivo: string) {
        const payload = parseSchema(estornarLancamentoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<LancamentoContabilResponse>(`${LANCAMENTOS}/${id}/estornar`, payload)).data);
    },

    // ---- Regras ----
    async listarRegras(query?: RegrasListQuery) {
        return runRequest(async () => (await httpClient.get<RegraContabilizacaoResponse[]>(REGRAS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId }) })).data);
    },
    async criarRegra(values: unknown) {
        const payload = parseSchema(criarRegraSchema, values);
        return runRequest(async () => (await httpClient.post<RegraContabilizacaoResponse>(REGRAS, payload)).data);
    },
    async inativarRegra(id: string) {
        return runRequest(async () => (await httpClient.post<RegraContabilizacaoResponse>(`${REGRAS}/${id}/inativar`)).data);
    }
};
