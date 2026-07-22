import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarAcaoCorretivaSchema,
    adicionarCriterioSchema,
    criarInspecaoSchema,
    encerrarInspecaoSchema,
    motivoSchema,
    registrarResultadoSchema,
    reprovarInspecaoSchema
} from '@/features/qualidade/schemas/qualidadeSchemas';
import {
    InspecaoResponse,
    InspecaoResumoResponse,
    InspecoesListQuery,
    NaoConformidadeResponse,
    NaoConformidadeResumoResponse,
    NaoConformidadesListQuery
} from '@/features/qualidade/types/qualidade.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const INSPECOES = '/api/qualidade/inspecoes';
const NAO_CONFORMIDADES = '/api/qualidade/nao-conformidades';

const inspecoesParams = (query?: InspecoesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, origem: query?.origem, status: query?.status, termo: query?.termo });
const naoConformidadesParams = (query?: NaoConformidadesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status });

export const qualidadeApi = {
    // ---- Inspeções ----
    async listarInspecoes(query?: InspecoesListQuery) {
        return runRequest(async () => (await httpClient.get<InspecaoResumoResponse[]>(INSPECOES, { params: inspecoesParams(query) })).data);
    },
    async obterInspecao(id: string) {
        return runRequest(async () => (await httpClient.get<InspecaoResponse>(`${INSPECOES}/${id}`)).data);
    },
    async criarInspecao(values: unknown) {
        const payload = parseSchema(criarInspecaoSchema, values);
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(INSPECOES, payload)).data);
    },
    async adicionarCriterio(id: string, values: unknown) {
        const payload = parseSchema(adicionarCriterioSchema, values);
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(`${INSPECOES}/${id}/criterios`, payload)).data);
    },
    async registrarResultado(id: string, values: unknown) {
        const payload = parseSchema(registrarResultadoSchema, values);
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(`${INSPECOES}/${id}/resultados`, payload)).data);
    },
    async aprovarInspecao(id: string) {
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(`${INSPECOES}/${id}/aprovar`)).data);
    },
    async reprovarInspecao(id: string, descricao: string) {
        const payload = parseSchema(reprovarInspecaoSchema, { descricao });
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(`${INSPECOES}/${id}/reprovar`, payload)).data);
    },
    async encerrarInspecao(id: string, evidencia: string) {
        const payload = parseSchema(encerrarInspecaoSchema, { evidencia });
        return runRequest(async () => (await httpClient.post<InspecaoResponse>(`${INSPECOES}/${id}/encerrar`, payload)).data);
    },

    // ---- Não-conformidades ----
    async listarNaoConformidades(query?: NaoConformidadesListQuery) {
        return runRequest(async () => (await httpClient.get<NaoConformidadeResumoResponse[]>(NAO_CONFORMIDADES, { params: naoConformidadesParams(query) })).data);
    },
    async obterNaoConformidade(id: string) {
        return runRequest(async () => (await httpClient.get<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}`)).data);
    },
    async adicionarAcao(id: string, values: unknown) {
        const payload = parseSchema(adicionarAcaoCorretivaSchema, values);
        return runRequest(async () => (await httpClient.post<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}/acoes`, payload)).data);
    },
    async iniciarAcao(id: string, acaoId: string) {
        return runRequest(async () => (await httpClient.post<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}/acoes/${acaoId}/iniciar`)).data);
    },
    async concluirAcao(id: string, acaoId: string) {
        return runRequest(async () => (await httpClient.post<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}/acoes/${acaoId}/concluir`)).data);
    },
    async cancelarAcao(id: string, acaoId: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}/acoes/${acaoId}/cancelar`, payload)).data);
    },
    async encerrarNaoConformidade(id: string) {
        return runRequest(async () => (await httpClient.post<NaoConformidadeResponse>(`${NAO_CONFORMIDADES}/${id}/encerrar`)).data);
    }
};
