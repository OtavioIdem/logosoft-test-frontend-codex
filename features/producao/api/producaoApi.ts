import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarComponenteSchema,
    criarFichaTecnicaSchema,
    criarOrdemProducaoSchema,
    encerrarOrdemProducaoSchema,
    motivoSchema,
    registrarApontamentoSchema
} from '@/features/producao/schemas/producaoSchemas';
import {
    FichaTecnicaResponse,
    FichaTecnicaResumoResponse,
    FichasTecnicasListQuery,
    NecessidadeComponenteResponse,
    OrdemProducaoResponse,
    OrdemProducaoResumoResponse,
    OrdensProducaoListQuery
} from '@/features/producao/types/producao.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const FICHAS = '/api/producao/fichas-tecnicas';
const ORDENS = '/api/producao/ordens';

const fichasParams = (query?: FichasTecnicasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo });
const ordensParams = (query?: OrdensProducaoListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo });

export const producaoApi = {
    // ---- Fichas técnicas ----
    async listarFichas(query?: FichasTecnicasListQuery) {
        return runRequest(async () => (await httpClient.get<FichaTecnicaResumoResponse[]>(FICHAS, { params: fichasParams(query) })).data);
    },
    async obterFicha(id: string) {
        return runRequest(async () => (await httpClient.get<FichaTecnicaResponse>(`${FICHAS}/${id}`)).data);
    },
    async criarFicha(values: unknown) {
        const payload = parseSchema(criarFichaTecnicaSchema, values);
        return runRequest(async () => (await httpClient.post<FichaTecnicaResponse>(FICHAS, payload)).data);
    },
    async adicionarComponente(id: string, values: unknown) {
        const payload = parseSchema(adicionarComponenteSchema, values);
        return runRequest(async () => (await httpClient.post<FichaTecnicaResponse>(`${FICHAS}/${id}/componentes`, payload)).data);
    },
    async ativarFicha(id: string) {
        return runRequest(async () => (await httpClient.post<FichaTecnicaResponse>(`${FICHAS}/${id}/ativar`)).data);
    },
    async inativarFicha(id: string) {
        return runRequest(async () => (await httpClient.post<FichaTecnicaResponse>(`${FICHAS}/${id}/inativar`)).data);
    },

    // ---- Ordens de produção ----
    async listarOrdens(query?: OrdensProducaoListQuery) {
        return runRequest(async () => (await httpClient.get<OrdemProducaoResumoResponse[]>(ORDENS, { params: ordensParams(query) })).data);
    },
    async obterOrdem(id: string) {
        return runRequest(async () => (await httpClient.get<OrdemProducaoResponse>(`${ORDENS}/${id}`)).data);
    },
    async necessidade(id: string) {
        return runRequest(async () => (await httpClient.get<NecessidadeComponenteResponse[]>(`${ORDENS}/${id}/necessidade`)).data);
    },
    async criarOrdem(values: unknown) {
        const payload = parseSchema(criarOrdemProducaoSchema, values);
        return runRequest(async () => (await httpClient.post<OrdemProducaoResponse>(ORDENS, payload)).data);
    },
    async liberarOrdem(id: string) {
        return runRequest(async () => (await httpClient.post<OrdemProducaoResponse>(`${ORDENS}/${id}/liberar`)).data);
    },
    async registrarApontamento(id: string, values: unknown) {
        const payload = parseSchema(registrarApontamentoSchema, values);
        return runRequest(async () => (await httpClient.post<OrdemProducaoResponse>(`${ORDENS}/${id}/apontamentos`, payload)).data);
    },
    async encerrarOrdem(id: string, observacao?: string | null) {
        const payload = parseSchema(encerrarOrdemProducaoSchema, { observacao });
        return runRequest(async () => (await httpClient.post<OrdemProducaoResponse>(`${ORDENS}/${id}/encerrar`, payload)).data);
    },
    async cancelarOrdem(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<OrdemProducaoResponse>(`${ORDENS}/${id}/cancelar`, payload)).data);
    }
};
