import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    criarBancoSchema,
    criarCarteiraSchema,
    criarContaBancariaSchema,
    criarConvenioSchema,
    gerarBoletoSchema,
    gerarRemessaSchema,
    importarRetornoSchema,
    motivoSchema
} from '@/features/bancos/schemas/bancosSchemas';
import {
    BancoResponse,
    ContaBancariaResponse,
    ConvenioBancarioResponse,
    CarteiraCobrancaResponse,
    BoletoHistoricoResponse,
    BoletoResponse,
    BoletoResumoResponse,
    BoletosListQuery,
    RemessaCnabResponse,
    RetornoCnabResponse
} from '@/features/bancos/types/bancos.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const BASE = '/api/bancos';

export const bancosApi = {
    // ---- Cadastros ----
    async criarBanco(values: unknown) {
        const payload = parseSchema(criarBancoSchema, values);
        return runRequest(async () => (await httpClient.post<BancoResponse>(BASE, payload)).data);
    },
    async criarContaBancaria(values: unknown) {
        const payload = parseSchema(criarContaBancariaSchema, values);
        return runRequest(async () => (await httpClient.post<ContaBancariaResponse>(`${BASE}/contas-bancarias`, payload)).data);
    },
    async criarConvenio(values: unknown) {
        const payload = parseSchema(criarConvenioSchema, values);
        return runRequest(async () => (await httpClient.post<ConvenioBancarioResponse>(`${BASE}/convenios`, payload)).data);
    },
    async criarCarteira(values: unknown) {
        const payload = parseSchema(criarCarteiraSchema, values);
        return runRequest(async () => (await httpClient.post<CarteiraCobrancaResponse>(`${BASE}/carteiras`, payload)).data);
    },

    // ---- Boletos ----
    async listarBoletos(query?: BoletosListQuery) {
        return runRequest(async () => (await httpClient.get<BoletoResumoResponse[]>(`${BASE}/boletos`, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo }) })).data);
    },
    async obterBoleto(id: string) {
        return runRequest(async () => (await httpClient.get<BoletoResponse>(`${BASE}/boletos/${id}`)).data);
    },
    async historicoBoleto(id: string) {
        return runRequest(async () => (await httpClient.get<BoletoHistoricoResponse[]>(`${BASE}/boletos/${id}/historico`)).data);
    },
    async gerarBoleto(values: unknown) {
        const payload = parseSchema(gerarBoletoSchema, values);
        return runRequest(async () => (await httpClient.post<BoletoResponse>(`${BASE}/boletos/gerar`, payload)).data);
    },
    async cancelarBoleto(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<BoletoResponse>(`${BASE}/boletos/${id}/cancelar`, payload)).data);
    },

    // ---- CNAB ----
    async gerarRemessa(values: unknown) {
        const payload = parseSchema(gerarRemessaSchema, values);
        return runRequest(async () => (await httpClient.post<RemessaCnabResponse>(`${BASE}/cnab/remessas`, payload)).data);
    },
    async importarRetorno(values: unknown) {
        const payload = parseSchema(importarRetornoSchema, values);
        return runRequest(async () => (await httpClient.post<RetornoCnabResponse>(`${BASE}/cnab/retornos/importar`, payload)).data);
    },
    async obterRetorno(id: string) {
        return runRequest(async () => (await httpClient.get<RetornoCnabResponse>(`${BASE}/cnab/retornos/${id}`)).data);
    }
};
