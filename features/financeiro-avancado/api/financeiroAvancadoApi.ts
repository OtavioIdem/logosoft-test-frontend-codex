import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { baixarContaSchema, cancelarContaSchema, criarContaSchema, estornarBaixaSchema } from '@/features/financeiro-avancado/schemas/financeiroAvancadoSchemas';
import {
    ContaFinanceiraResponse,
    ContaFinanceiraResumoResponse,
    ContasListQuery,
    ContasPaginadas,
    FluxoCaixaQuery,
    FluxoCaixaResponse,
    TipoConta
} from '@/features/financeiro-avancado/types/financeiroAvancado.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const listParams = (query?: ContasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, participanteId: query?.participanteId, status: query?.status, dataInicial: query?.dataInicial, dataFinal: query?.dataFinal, page: query?.page, pageSize: query?.pageSize });

type RawList = ContaFinanceiraResumoResponse[] | ContasPaginadas | { resultado: ContasPaginadas };
const normalizePaged = (data: RawList, query?: ContasListQuery): ContasPaginadas => {
    if (Array.isArray(data)) return { items: data, page: query?.page ?? 1, pageSize: query?.pageSize ?? (data.length || 20), totalItems: data.length, totalPages: 1 };
    if ('resultado' in data && data.resultado) return data.resultado;
    return data as ContasPaginadas;
};

const base = (tipo: TipoConta) => `/api/financeiro/avancado/contas-${tipo}`;

export const financeiroAvancadoApi = {
    async listar(tipo: TipoConta, query?: ContasListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<RawList>(base(tipo), { params: listParams(query) });
            return normalizePaged(response.data, query);
        });
    },
    async obter(id: string) {
        return runRequest(async () => (await httpClient.get<ContaFinanceiraResponse>(`/api/financeiro/avancado/contas/${id}`)).data);
    },
    async criar(tipo: TipoConta, values: unknown) {
        const payload = parseSchema(criarContaSchema, values);
        return runRequest(async () => (await httpClient.post<ContaFinanceiraResponse>(base(tipo), payload)).data);
    },
    async baixar(tipo: TipoConta, id: string, values: unknown) {
        const payload = parseSchema(baixarContaSchema, values);
        return runRequest(async () => (await httpClient.post<ContaFinanceiraResponse>(`${base(tipo)}/${id}/baixar`, payload)).data);
    },
    async estornar(tipo: TipoConta, id: string, values: unknown) {
        const payload = parseSchema(estornarBaixaSchema, values);
        return runRequest(async () => (await httpClient.post<ContaFinanceiraResponse>(`${base(tipo)}/${id}/estornar`, payload)).data);
    },
    async cancelar(tipo: TipoConta, id: string, motivo: string) {
        const payload = parseSchema(cancelarContaSchema, { motivo });
        return runRequest(async () => (await httpClient.post<ContaFinanceiraResponse>(`${base(tipo)}/${id}/cancelar`, payload)).data);
    },
    async fluxoCaixa(query?: FluxoCaixaQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<FluxoCaixaResponse>('/api/financeiro/avancado/fluxo-caixa', { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, dataInicial: query?.dataInicial, dataFinal: query?.dataFinal }) });
            return response.data;
        });
    }
};
