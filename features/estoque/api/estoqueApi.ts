import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarItemInventarioSchema,
    ajusteEstoqueSchema,
    atualizarLocalEstoqueSchema,
    baixarReservaEstoqueSchema,
    cancelarReservaEstoqueSchema,
    bloqueioEstoqueAcaoSchema,
    concluirInventarioSchema,
    criarBloqueioEstoqueSchema,
    criarLocalEstoqueSchema,
    criarReservaEstoqueSchema,
    motivoSchema,
    movimentoManualEstoqueSchema,
    transferenciaEstoqueSchema,
    abrirInventarioSchema
} from '@/features/estoque/schemas/estoqueSchemas';
import {
    AdicionarItemInventarioRequest,
    AjusteEstoqueRequest,
    AtualizarLocalEstoqueRequest,
    BaixarReservaEstoqueRequest,
    CancelarReservaEstoqueRequest,
    CriarBloqueioEstoqueRequest,
    CriarLocalEstoqueRequest,
    CriarReservaEstoqueRequest,
    EstoqueListQuery,
    EstoqueSaldoResponse,
    InventarioResponse,
    LocalEstoqueResponse,
    MovimentoEstoqueResponse,
    MovimentoManualEstoqueRequest,
    MotivoRequest,
    ConcluirInventarioRequest,
    AbrirInventarioRequest,
    ReservaEstoqueResponse,
    TransferenciaEstoqueRequest
} from '@/features/estoque/types/estoque.types';

type Schema<T> = { parse: (value: unknown) => T };

const runEstoqueRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: EstoqueListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, produtoId: query?.produtoId, localEstoqueId: query?.localEstoqueId, origemId: query?.origemId, inicio: query?.inicio, fim: query?.fim, termo: query?.termo });

export const buildCriarLocalEstoquePayload = (values: unknown): CriarLocalEstoqueRequest => parseSchema(criarLocalEstoqueSchema, values);
export const buildAtualizarLocalEstoquePayload = (values: unknown): AtualizarLocalEstoqueRequest => parseSchema(atualizarLocalEstoqueSchema, values);
export const buildMovimentoManualEstoquePayload = (values: unknown): MovimentoManualEstoqueRequest => parseSchema(movimentoManualEstoqueSchema, values);
export const buildAjusteEstoquePayload = (values: unknown): AjusteEstoqueRequest => parseSchema(ajusteEstoqueSchema, values);
export const buildTransferenciaEstoquePayload = (values: unknown): TransferenciaEstoqueRequest => parseSchema(transferenciaEstoqueSchema, values);
export const buildCriarBloqueioEstoquePayload = (values: unknown): CriarBloqueioEstoqueRequest => parseSchema(criarBloqueioEstoqueSchema, values);
export const buildCriarReservaEstoquePayload = (values: unknown): CriarReservaEstoqueRequest => parseSchema(criarReservaEstoqueSchema, values);
export const buildBaixarReservaEstoquePayload = (values: unknown): BaixarReservaEstoqueRequest => parseSchema(baixarReservaEstoqueSchema, values);
export const buildCancelarReservaEstoquePayload = (values: unknown): CancelarReservaEstoqueRequest => parseSchema(cancelarReservaEstoqueSchema, values);
export const buildAbrirInventarioPayload = (values: unknown): AbrirInventarioRequest => parseSchema(abrirInventarioSchema, values);
export const buildAdicionarItemInventarioPayload = (values: unknown): AdicionarItemInventarioRequest => parseSchema(adicionarItemInventarioSchema, values);
export const buildConcluirInventarioPayload = (motivo: string): ConcluirInventarioRequest => parseSchema(concluirInventarioSchema, { motivoAjuste: motivo });
export const buildBloqueioEstoqueAcaoPayload = (values: unknown): { bloqueioId: string; motivo: string } => parseSchema(bloqueioEstoqueAcaoSchema, values);
export const buildMotivoPayload = (motivo: string): MotivoRequest => parseSchema(motivoSchema, { motivo });

export const estoqueApi = {
    async listarLocais(query?: EstoqueListQuery) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<LocalEstoqueResponse[]>('/api/estoque/locais', { params: params(query) });
            return response.data;
        });
    },
    async criarLocal(values: unknown) {
        const payload = buildCriarLocalEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<LocalEstoqueResponse>('/api/estoque/locais', payload);
            return response.data;
        });
    },
    async atualizarLocal(id: string, values: unknown) {
        const payload = buildAtualizarLocalEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.put<LocalEstoqueResponse>(`/api/estoque/locais/${id}`, payload);
            return response.data;
        });
    },
    async inativarLocal(id: string, motivo: string) {
        const payload = buildMotivoPayload(motivo);
        return runEstoqueRequest(async () => {
            await httpClient.post<void>(`/api/estoque/locais/${id}/inativar`, payload);
        });
    },
    async listarSaldos(query?: EstoqueListQuery) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<EstoqueSaldoResponse[]>('/api/estoque/saldos', { params: params(query) });
            return response.data;
        });
    },
    async listarMovimentos(query?: EstoqueListQuery) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<MovimentoEstoqueResponse[]>('/api/estoque/movimentos', { params: params(query) });
            return response.data;
        });
    },
    async registrarEntrada(values: unknown) {
        const payload = buildMovimentoManualEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<MovimentoEstoqueResponse>('/api/estoque/entradas', payload);
            return response.data;
        });
    },
    async registrarSaida(values: unknown) {
        const payload = buildMovimentoManualEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<MovimentoEstoqueResponse>('/api/estoque/saidas', payload);
            return response.data;
        });
    },
    async registrarAjuste(values: unknown) {
        const payload = buildAjusteEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<MovimentoEstoqueResponse>('/api/estoque/ajustes', payload);
            return response.data;
        });
    },
    async registrarTransferencia(values: unknown) {
        const payload = buildTransferenciaEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<MovimentoEstoqueResponse>('/api/estoque/transferencias', payload);
            return response.data;
        });
    },
    async criarBloqueio(values: unknown) {
        const payload = buildCriarBloqueioEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<MovimentoEstoqueResponse>('/api/estoque/bloqueios', payload);
            return response.data;
        });
    },
    async liberarBloqueio(id: string, motivo: string) {
        const payload = buildMotivoPayload(motivo);
        return runEstoqueRequest(async () => {
            await httpClient.post<void>(`/api/estoque/bloqueios/${id}/liberar`, payload);
        });
    },
    async cancelarBloqueio(id: string, motivo: string) {
        const payload = buildMotivoPayload(motivo);
        return runEstoqueRequest(async () => {
            await httpClient.post<void>(`/api/estoque/bloqueios/${id}/cancelar`, payload);
        });
    },
    async listarReservas(query?: EstoqueListQuery) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<ReservaEstoqueResponse[]>('/api/estoque/reservas', { params: params(query) });
            return response.data;
        });
    },
    async criarReserva(values: unknown) {
        const payload = buildCriarReservaEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<ReservaEstoqueResponse>('/api/estoque/reservas', payload);
            return response.data;
        });
    },
    async baixarReserva(id: string, values: unknown) {
        const payload = buildBaixarReservaEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<ReservaEstoqueResponse>(`/api/estoque/reservas/${id}/baixar`, payload);
            return response.data;
        });
    },
    async cancelarReserva(id: string, values: unknown) {
        const payload = buildCancelarReservaEstoquePayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<ReservaEstoqueResponse>(`/api/estoque/reservas/${id}/cancelar`, payload);
            return response.data;
        });
    },
    async listarInventarios(query?: EstoqueListQuery) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<InventarioResponse[]>('/api/estoque/inventarios', { params: params(query) });
            return response.data;
        });
    },
    async obterInventario(id: string) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.get<InventarioResponse>(`/api/estoque/inventarios/${id}`);
            return response.data;
        });
    },
    async abrirInventario(values: unknown) {
        const payload = buildAbrirInventarioPayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<InventarioResponse>('/api/estoque/inventarios', payload);
            return response.data;
        });
    },
    async adicionarItemInventario(id: string, values: unknown) {
        const payload = buildAdicionarItemInventarioPayload(values);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<InventarioResponse>(`/api/estoque/inventarios/${id}/itens`, payload);
            return response.data;
        });
    },
    async iniciarContagemInventario(id: string) {
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<InventarioResponse>(`/api/estoque/inventarios/${id}/iniciar-contagem`);
            return response.data;
        });
    },
    async concluirInventario(id: string, motivo: string) {
        const payload = buildConcluirInventarioPayload(motivo);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<InventarioResponse>(`/api/estoque/inventarios/${id}/concluir`, payload);
            return response.data;
        });
    },
    async cancelarInventario(id: string, motivo: string) {
        const payload = buildMotivoPayload(motivo);
        return runEstoqueRequest(async () => {
            const response = await httpClient.post<InventarioResponse>(`/api/estoque/inventarios/${id}/cancelar`, payload);
            return response.data;
        });
    }
};
