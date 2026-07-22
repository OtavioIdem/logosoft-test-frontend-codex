import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    alterarStatusVeiculoSchema,
    atualizarVeiculoSchema,
    criarMotoristaSchema,
    criarVeiculoSchema,
    encerrarViagemSchema,
    iniciarViagemSchema,
    motivoSchema,
    registrarAbastecimentoSchema,
    registrarDespesaVeiculoSchema,
    registrarDocumentoVeiculoSchema,
    registrarManutencaoSchema
} from '@/features/frota/schemas/frotaSchemas';
import {
    AbastecimentoResponse,
    DespesaVeiculoResponse,
    DocumentoVeiculoResponse,
    ManutencaoResponse,
    MotoristaResponse,
    MotoristasListQuery,
    VeiculoResponse,
    VeiculoSubRecursoQuery,
    VeiculosListQuery,
    ViagemResponse,
    ViagensListQuery
} from '@/features/frota/types/frota.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const VEICULOS = '/api/frota/veiculos';
const MOTORISTAS = '/api/frota/motoristas';
const VIAGENS = '/api/frota/viagens';

const veiculosParams = (query?: VeiculosListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, tipo: query?.tipo, status: query?.status, termo: query?.termo });
const subParams = (query?: VeiculoSubRecursoQuery) => cleanQueryParams({ veiculoId: query?.veiculoId, empresaId: query?.empresaId, filialId: query?.filialId });
const motoristasParams = (query?: MotoristasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });
const viagensParams = (query?: ViagensListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, veiculoId: query?.veiculoId, motoristaId: query?.motoristaId, status: query?.status });

export const frotaApi = {
    // ---- Veículos ----
    async listarVeiculos(query?: VeiculosListQuery) {
        return runRequest(async () => (await httpClient.get<VeiculoResponse[]>(VEICULOS, { params: veiculosParams(query) })).data);
    },
    async obterVeiculo(id: string) {
        return runRequest(async () => (await httpClient.get<VeiculoResponse>(`${VEICULOS}/${id}`)).data);
    },
    async criarVeiculo(values: unknown) {
        const payload = parseSchema(criarVeiculoSchema, values);
        return runRequest(async () => (await httpClient.post<VeiculoResponse>(VEICULOS, payload)).data);
    },
    async atualizarVeiculo(id: string, values: unknown) {
        const payload = parseSchema(atualizarVeiculoSchema, values);
        return runRequest(async () => (await httpClient.put<VeiculoResponse>(`${VEICULOS}/${id}`, payload)).data);
    },
    async alterarStatusVeiculo(id: string, status: number) {
        const payload = parseSchema(alterarStatusVeiculoSchema, { status });
        return runRequest(async () => (await httpClient.post<VeiculoResponse>(`${VEICULOS}/${id}/status`, payload)).data);
    },

    // ---- Abastecimentos ----
    async listarAbastecimentos(query?: VeiculoSubRecursoQuery) {
        return runRequest(async () => (await httpClient.get<AbastecimentoResponse[]>(`${VEICULOS}/abastecimentos`, { params: subParams(query) })).data);
    },
    async registrarAbastecimento(values: unknown) {
        const payload = parseSchema(registrarAbastecimentoSchema, values);
        return runRequest(async () => (await httpClient.post<AbastecimentoResponse>(`${VEICULOS}/abastecimentos`, payload)).data);
    },

    // ---- Manutenções ----
    async listarManutencoes(query?: VeiculoSubRecursoQuery) {
        return runRequest(async () => (await httpClient.get<ManutencaoResponse[]>(`${VEICULOS}/manutencoes`, { params: subParams(query) })).data);
    },
    async registrarManutencao(values: unknown) {
        const payload = parseSchema(registrarManutencaoSchema, values);
        return runRequest(async () => (await httpClient.post<ManutencaoResponse>(`${VEICULOS}/manutencoes`, payload)).data);
    },
    async concluirManutencao(id: string) {
        return runRequest(async () => (await httpClient.post<ManutencaoResponse>(`${VEICULOS}/manutencoes/${id}/concluir`)).data);
    },
    async cancelarManutencao(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<ManutencaoResponse>(`${VEICULOS}/manutencoes/${id}/cancelar`, payload)).data);
    },

    // ---- Despesas ----
    async listarDespesas(query?: VeiculoSubRecursoQuery) {
        return runRequest(async () => (await httpClient.get<DespesaVeiculoResponse[]>(`${VEICULOS}/despesas`, { params: subParams(query) })).data);
    },
    async registrarDespesa(values: unknown) {
        const payload = parseSchema(registrarDespesaVeiculoSchema, values);
        return runRequest(async () => (await httpClient.post<DespesaVeiculoResponse>(`${VEICULOS}/despesas`, payload)).data);
    },

    // ---- Documentos ----
    async listarDocumentos(query?: VeiculoSubRecursoQuery) {
        return runRequest(async () => (await httpClient.get<DocumentoVeiculoResponse[]>(`${VEICULOS}/documentos`, { params: subParams(query) })).data);
    },
    async registrarDocumento(values: unknown) {
        const payload = parseSchema(registrarDocumentoVeiculoSchema, values);
        return runRequest(async () => (await httpClient.post<DocumentoVeiculoResponse>(`${VEICULOS}/documentos`, payload)).data);
    },

    // ---- Motoristas ----
    async listarMotoristas(query?: MotoristasListQuery) {
        return runRequest(async () => (await httpClient.get<MotoristaResponse[]>(MOTORISTAS, { params: motoristasParams(query) })).data);
    },
    async criarMotorista(values: unknown) {
        const payload = parseSchema(criarMotoristaSchema, values);
        return runRequest(async () => (await httpClient.post<MotoristaResponse>(MOTORISTAS, payload)).data);
    },

    // ---- Viagens ----
    async listarViagens(query?: ViagensListQuery) {
        return runRequest(async () => (await httpClient.get<ViagemResponse[]>(VIAGENS, { params: viagensParams(query) })).data);
    },
    async iniciarViagem(values: unknown) {
        const payload = parseSchema(iniciarViagemSchema, values);
        return runRequest(async () => (await httpClient.post<ViagemResponse>(VIAGENS, payload)).data);
    },
    async encerrarViagem(id: string, values: unknown) {
        const payload = parseSchema(encerrarViagemSchema, values);
        return runRequest(async () => (await httpClient.post<ViagemResponse>(`${VIAGENS}/${id}/encerrar`, payload)).data);
    },
    async cancelarViagem(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<ViagemResponse>(`${VIAGENS}/${id}/cancelar`, payload)).data);
    }
};
