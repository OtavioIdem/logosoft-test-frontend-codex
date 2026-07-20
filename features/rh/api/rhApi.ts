import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    admitirColaboradorSchema,
    atualizarColaboradorSchema,
    concederBeneficioSchema,
    criarBeneficioSchema,
    criarJornadaSchema,
    desligarColaboradorSchema,
    encerrarAfastamentoSchema,
    encerrarConcessaoSchema,
    motivoSchema,
    registrarAfastamentoSchema,
    registrarEventoRhSchema,
    registrarPontoSchema,
    solicitarFeriasSchema
} from '@/features/rh/schemas/rhSchemas';
import {
    AfastamentoResponse,
    AfastamentosListQuery,
    BeneficioResponse,
    BeneficiosListQuery,
    ColaboradorResponse,
    ColaboradoresListQuery,
    ConcessaoBeneficioResponse,
    ConcessoesListQuery,
    EventoRhResponse,
    EventosListQuery,
    FeriasListQuery,
    FeriasResponse,
    JornadaResponse,
    JornadasListQuery,
    PontoListQuery,
    PontoResponse
} from '@/features/rh/types/rh.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const COLABORADORES = '/api/rh/colaboradores';
const JORNADAS = '/api/rh/jornadas';
const PONTO = '/api/rh/ponto';
const FERIAS = '/api/rh/ausencias/ferias';
const AFASTAMENTOS = '/api/rh/ausencias/afastamentos';
const BENEFICIOS = '/api/rh/beneficios';
const CONCESSOES = '/api/rh/beneficios/concessoes';
const EVENTOS = '/api/rh/eventos';

type FeriasAcao = 'aprovar' | 'rejeitar' | 'iniciar' | 'concluir' | 'cancelar';

export const rhApi = {
    // ---- Colaboradores ----
    async listarColaboradores(query?: ColaboradoresListQuery) {
        return runRequest(async () => (await httpClient.get<ColaboradorResponse[]>(COLABORADORES, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo }) })).data);
    },
    async admitirColaborador(values: unknown) {
        const payload = parseSchema(admitirColaboradorSchema, values);
        return runRequest(async () => (await httpClient.post<ColaboradorResponse>(COLABORADORES, payload)).data);
    },
    async atualizarColaborador(id: string, values: unknown) {
        const payload = parseSchema(atualizarColaboradorSchema, values);
        return runRequest(async () => (await httpClient.put<ColaboradorResponse>(`${COLABORADORES}/${id}`, payload)).data);
    },
    async desligarColaborador(id: string, values: unknown) {
        const payload = parseSchema(desligarColaboradorSchema, values);
        return runRequest(async () => (await httpClient.post<ColaboradorResponse>(`${COLABORADORES}/${id}/desligar`, payload)).data);
    },

    // ---- Jornadas ----
    async listarJornadas(query?: JornadasListQuery) {
        return runRequest(async () => (await httpClient.get<JornadaResponse[]>(JORNADAS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId }) })).data);
    },
    async criarJornada(values: unknown) {
        const payload = parseSchema(criarJornadaSchema, values);
        return runRequest(async () => (await httpClient.post<JornadaResponse>(JORNADAS, payload)).data);
    },
    async atualizarJornada(id: string, values: unknown) {
        const payload = parseSchema(criarJornadaSchema, values);
        return runRequest(async () => (await httpClient.put<JornadaResponse>(`${JORNADAS}/${id}`, payload)).data);
    },

    // ---- Ponto ----
    async listarPonto(query?: PontoListQuery) {
        return runRequest(async () => (await httpClient.get<PontoResponse[]>(PONTO, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, colaboradorId: query?.colaboradorId }) })).data);
    },
    async registrarPonto(values: unknown) {
        const payload = parseSchema(registrarPontoSchema, values);
        return runRequest(async () => (await httpClient.post<PontoResponse>(PONTO, payload)).data);
    },

    // ---- Férias ----
    async listarFerias(query?: FeriasListQuery) {
        return runRequest(async () => (await httpClient.get<FeriasResponse[]>(FERIAS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, colaboradorId: query?.colaboradorId, status: query?.status }) })).data);
    },
    async solicitarFerias(values: unknown) {
        const payload = parseSchema(solicitarFeriasSchema, values);
        return runRequest(async () => (await httpClient.post<FeriasResponse>(FERIAS, payload)).data);
    },
    async acaoFerias(id: string, acao: FeriasAcao, motivo?: string) {
        const payload = acao === 'rejeitar' || acao === 'cancelar' ? parseSchema(motivoSchema, { motivo }) : undefined;
        return runRequest(async () => (await httpClient.post<FeriasResponse>(`${FERIAS}/${id}/${acao}`, payload)).data);
    },

    // ---- Afastamentos ----
    async listarAfastamentos(query?: AfastamentosListQuery) {
        return runRequest(async () => (await httpClient.get<AfastamentoResponse[]>(AFASTAMENTOS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, colaboradorId: query?.colaboradorId, status: query?.status }) })).data);
    },
    async registrarAfastamento(values: unknown) {
        const payload = parseSchema(registrarAfastamentoSchema, values);
        return runRequest(async () => (await httpClient.post<AfastamentoResponse>(AFASTAMENTOS, payload)).data);
    },
    async encerrarAfastamento(id: string, values: unknown) {
        const payload = parseSchema(encerrarAfastamentoSchema, values);
        return runRequest(async () => (await httpClient.post<AfastamentoResponse>(`${AFASTAMENTOS}/${id}/encerrar`, payload)).data);
    },

    // ---- Benefícios ----
    async listarBeneficios(query?: BeneficiosListQuery) {
        return runRequest(async () => (await httpClient.get<BeneficioResponse[]>(BENEFICIOS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId }) })).data);
    },
    async criarBeneficio(values: unknown) {
        const payload = parseSchema(criarBeneficioSchema, values);
        return runRequest(async () => (await httpClient.post<BeneficioResponse>(BENEFICIOS, payload)).data);
    },
    async atualizarBeneficio(id: string, values: unknown) {
        const payload = parseSchema(criarBeneficioSchema, values);
        return runRequest(async () => (await httpClient.put<BeneficioResponse>(`${BENEFICIOS}/${id}`, payload)).data);
    },
    async listarConcessoes(query?: ConcessoesListQuery) {
        return runRequest(async () => (await httpClient.get<ConcessaoBeneficioResponse[]>(CONCESSOES, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, colaboradorId: query?.colaboradorId }) })).data);
    },
    async concederBeneficio(values: unknown) {
        const payload = parseSchema(concederBeneficioSchema, values);
        return runRequest(async () => (await httpClient.post<ConcessaoBeneficioResponse>(CONCESSOES, payload)).data);
    },
    async encerrarConcessao(id: string, values: unknown) {
        const payload = parseSchema(encerrarConcessaoSchema, values);
        return runRequest(async () => (await httpClient.post<ConcessaoBeneficioResponse>(`${CONCESSOES}/${id}/encerrar`, payload)).data);
    },

    // ---- Eventos ----
    async listarEventos(query?: EventosListQuery) {
        return runRequest(async () => (await httpClient.get<EventoRhResponse[]>(EVENTOS, { params: cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, colaboradorId: query?.colaboradorId, competencia: query?.competencia }) })).data);
    },
    async registrarEvento(values: unknown) {
        const payload = parseSchema(registrarEventoRhSchema, values);
        return runRequest(async () => (await httpClient.post<EventoRhResponse>(EVENTOS, payload)).data);
    }
};
