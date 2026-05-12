import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    AdministracaoListQuery,
    AtualizarCargoRequest,
    AtualizarCentroCustoRequest,
    AtualizarEmpresaRequest,
    AtualizarFilialRequest,
    AtualizarSetorRequest,
    CargoResponse,
    CentroCustoResponse,
    CriarCargoRequest,
    CriarCentroCustoRequest,
    CriarEmpresaRequest,
    CriarFilialRequest,
    CriarSetorRequest,
    EmpresaResponse,
    FilialResponse,
    InativarAdministracaoRequest,
    SetorResponse
} from '@/features/administracao/types/administracao.types';
import {
    atualizarCargoSchema,
    atualizarCentroCustoSchema,
    atualizarEmpresaSchema,
    atualizarFilialSchema,
    atualizarSetorSchema,
    criarCargoSchema,
    criarCentroCustoSchema,
    criarEmpresaSchema,
    criarFilialSchema,
    criarSetorSchema,
    motivoAdministracaoSchema
} from '@/features/administracao/schemas/administracaoSchemas';

const runAdministracaoRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: { parse: (value: unknown) => T }, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const parseMotivo = (motivo: string): InativarAdministracaoRequest => parseSchema(motivoAdministracaoSchema, { motivo });
const params = (query?: AdministracaoListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });

export const buildCriarEmpresaPayload = (values: unknown): CriarEmpresaRequest => parseSchema(criarEmpresaSchema, values);
export const buildAtualizarEmpresaPayload = (values: unknown): AtualizarEmpresaRequest => parseSchema(atualizarEmpresaSchema, values);
export const buildCriarFilialPayload = (values: unknown): CriarFilialRequest => parseSchema(criarFilialSchema, values);
export const buildAtualizarFilialPayload = (values: unknown): AtualizarFilialRequest => parseSchema(atualizarFilialSchema, values);
export const buildCriarSetorPayload = (values: unknown): CriarSetorRequest => parseSchema(criarSetorSchema, values);
export const buildAtualizarSetorPayload = (values: unknown): AtualizarSetorRequest => parseSchema(atualizarSetorSchema, values);
export const buildCriarCargoPayload = (values: unknown): CriarCargoRequest => parseSchema(criarCargoSchema, values);
export const buildAtualizarCargoPayload = (values: unknown): AtualizarCargoRequest => parseSchema(atualizarCargoSchema, values);
export const buildCriarCentroCustoPayload = (values: unknown): CriarCentroCustoRequest => parseSchema(criarCentroCustoSchema, values);
export const buildAtualizarCentroCustoPayload = (values: unknown): AtualizarCentroCustoRequest => parseSchema(atualizarCentroCustoSchema, values);

export const administracaoApi = {
    async listarEmpresas() {
        return runAdministracaoRequest(async () => {
            const response = await httpClient.get<EmpresaResponse[]>('/api/administracao/empresas');
            return response.data;
        });
    },
    async criarEmpresa(values: unknown) {
        const payload = buildCriarEmpresaPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.post<EmpresaResponse>('/api/administracao/empresas', payload);
            return response.data;
        });
    },
    async atualizarEmpresa(id: string, values: unknown) {
        const payload = buildAtualizarEmpresaPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.put<EmpresaResponse>(`/api/administracao/empresas/${id}`, payload);
            return response.data;
        });
    },
    async inativarEmpresa(id: string, motivo: string) {
        const payload = parseMotivo(motivo);
        return runAdministracaoRequest(async () => {
            await httpClient.post<void>(`/api/administracao/empresas/${id}/inativar`, payload);
        });
    },
    async listarFiliais(query?: AdministracaoListQuery) {
        return runAdministracaoRequest(async () => {
            const response = await httpClient.get<FilialResponse[]>('/api/administracao/filiais', { params: params(query) });
            return response.data;
        });
    },
    async criarFilial(values: unknown) {
        const payload = buildCriarFilialPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.post<FilialResponse>('/api/administracao/filiais', payload);
            return response.data;
        });
    },
    async atualizarFilial(id: string, values: unknown) {
        const payload = buildAtualizarFilialPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.put<FilialResponse>(`/api/administracao/filiais/${id}`, payload);
            return response.data;
        });
    },
    async inativarFilial(id: string, motivo: string) {
        const payload = parseMotivo(motivo);
        return runAdministracaoRequest(async () => {
            await httpClient.post<void>(`/api/administracao/filiais/${id}/inativar`, payload);
        });
    },
    async listarSetores(query?: AdministracaoListQuery) {
        return runAdministracaoRequest(async () => {
            const response = await httpClient.get<SetorResponse[]>('/api/administracao/setores', { params: params(query) });
            return response.data;
        });
    },
    async criarSetor(values: unknown) {
        const payload = buildCriarSetorPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.post<SetorResponse>('/api/administracao/setores', payload);
            return response.data;
        });
    },
    async atualizarSetor(id: string, values: unknown) {
        const payload = buildAtualizarSetorPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.put<SetorResponse>(`/api/administracao/setores/${id}`, payload);
            return response.data;
        });
    },
    async inativarSetor(id: string, motivo: string) {
        const payload = parseMotivo(motivo);
        return runAdministracaoRequest(async () => {
            await httpClient.post<void>(`/api/administracao/setores/${id}/inativar`, payload);
        });
    },
    async listarCargos(query?: AdministracaoListQuery) {
        return runAdministracaoRequest(async () => {
            const response = await httpClient.get<CargoResponse[]>('/api/administracao/cargos', { params: params(query) });
            return response.data;
        });
    },
    async criarCargo(values: unknown) {
        const payload = buildCriarCargoPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.post<CargoResponse>('/api/administracao/cargos', payload);
            return response.data;
        });
    },
    async atualizarCargo(id: string, values: unknown) {
        const payload = buildAtualizarCargoPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.put<CargoResponse>(`/api/administracao/cargos/${id}`, payload);
            return response.data;
        });
    },
    async inativarCargo(id: string, motivo: string) {
        const payload = parseMotivo(motivo);
        return runAdministracaoRequest(async () => {
            await httpClient.post<void>(`/api/administracao/cargos/${id}/inativar`, payload);
        });
    },
    async listarCentrosCusto(query?: AdministracaoListQuery) {
        return runAdministracaoRequest(async () => {
            const response = await httpClient.get<CentroCustoResponse[]>('/api/administracao/centros-custo', { params: params(query) });
            return response.data;
        });
    },
    async criarCentroCusto(values: unknown) {
        const payload = buildCriarCentroCustoPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.post<CentroCustoResponse>('/api/administracao/centros-custo', payload);
            return response.data;
        });
    },
    async atualizarCentroCusto(id: string, values: unknown) {
        const payload = buildAtualizarCentroCustoPayload(values);
        return runAdministracaoRequest(async () => {
            const response = await httpClient.put<CentroCustoResponse>(`/api/administracao/centros-custo/${id}`, payload);
            return response.data;
        });
    },
    async inativarCentroCusto(id: string, motivo: string) {
        const payload = parseMotivo(motivo);
        return runAdministracaoRequest(async () => {
            await httpClient.post<void>(`/api/administracao/centros-custo/${id}/inativar`, payload);
        });
    }
};
