import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    criarPreAutorizacaoSchema,
    motivoSchema,
    registrarEntradaSchema,
    registrarOcorrenciaSchema,
    registrarSaidaSchema,
    resolverOcorrenciaSchema,
    validarDocumentoSchema
} from '@/features/portaria/schemas/portariaSchemas';
import {
    OcorrenciaAcessoResponse,
    OcorrenciasListQuery,
    PreAutorizacaoResponse,
    PreAutorizacoesListQuery,
    RegistroAcessoResponse,
    RegistrosAcessoListQuery
} from '@/features/portaria/types/portaria.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const PRE_AUTORIZACOES = '/api/portaria/pre-autorizacoes';
const REGISTROS = '/api/portaria/registros';
const OCORRENCIAS = '/api/portaria/ocorrencias';

const preAutorizacoesParams = (query?: PreAutorizacoesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo });
const registrosParams = (query?: RegistrosAcessoListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo });
const ocorrenciasParams = (query?: OcorrenciasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, gravidade: query?.gravidade });

export const portariaApi = {
    // ---- Pré-autorizações ----
    async listarPreAutorizacoes(query?: PreAutorizacoesListQuery) {
        return runRequest(async () => (await httpClient.get<PreAutorizacaoResponse[]>(PRE_AUTORIZACOES, { params: preAutorizacoesParams(query) })).data);
    },
    async criarPreAutorizacao(values: unknown) {
        const payload = parseSchema(criarPreAutorizacaoSchema, values);
        return runRequest(async () => (await httpClient.post<PreAutorizacaoResponse>(PRE_AUTORIZACOES, payload)).data);
    },
    async cancelarPreAutorizacao(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<PreAutorizacaoResponse>(`${PRE_AUTORIZACOES}/${id}/cancelar`, payload)).data);
    },

    // ---- Registros de acesso ----
    async listarRegistros(query?: RegistrosAcessoListQuery) {
        return runRequest(async () => (await httpClient.get<RegistroAcessoResponse[]>(REGISTROS, { params: registrosParams(query) })).data);
    },
    async obterRegistro(id: string) {
        return runRequest(async () => (await httpClient.get<RegistroAcessoResponse>(`${REGISTROS}/${id}`)).data);
    },
    async registrarEntrada(values: unknown) {
        const payload = parseSchema(registrarEntradaSchema, values);
        return runRequest(async () => (await httpClient.post<RegistroAcessoResponse>(`${REGISTROS}/entrada`, payload)).data);
    },
    async validarDocumento(id: string, values: unknown) {
        const payload = parseSchema(validarDocumentoSchema, values);
        return runRequest(async () => (await httpClient.post<RegistroAcessoResponse>(`${REGISTROS}/${id}/validar-documento`, payload)).data);
    },
    async registrarSaida(id: string, values: unknown) {
        const payload = parseSchema(registrarSaidaSchema, values);
        return runRequest(async () => (await httpClient.post<RegistroAcessoResponse>(`${REGISTROS}/${id}/saida`, payload)).data);
    },
    async cancelarRegistro(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<RegistroAcessoResponse>(`${REGISTROS}/${id}/cancelar`, payload)).data);
    },

    // ---- Ocorrências ----
    async listarOcorrencias(query?: OcorrenciasListQuery) {
        return runRequest(async () => (await httpClient.get<OcorrenciaAcessoResponse[]>(OCORRENCIAS, { params: ocorrenciasParams(query) })).data);
    },
    async registrarOcorrencia(values: unknown) {
        const payload = parseSchema(registrarOcorrenciaSchema, values);
        return runRequest(async () => (await httpClient.post<OcorrenciaAcessoResponse>(OCORRENCIAS, payload)).data);
    },
    async resolverOcorrencia(id: string, resolucao: string) {
        const payload = parseSchema(resolverOcorrenciaSchema, { resolucao });
        return runRequest(async () => (await httpClient.post<OcorrenciaAcessoResponse>(`${OCORRENCIAS}/${id}/resolver`, payload)).data);
    }
};
