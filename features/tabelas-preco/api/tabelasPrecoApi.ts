import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, normalizeGuidOrNull, sanitizePayload } from '@/lib/http/requestUtils';
import { tabelaPrecoItemSchema, tabelaPrecoMotivoSchema, tabelaPrecoSchema } from '@/features/tabelas-preco/schemas/tabelasPrecoSchemas';
import {
    AtualizarTabelaPrecoItemRequest,
    AtualizarTabelaPrecoRequest,
    CriarTabelaPrecoItemRequest,
    CriarTabelaPrecoRequest,
    PrecoVigenteQuery,
    PrecoVigenteResponse,
    TabelaPrecoFormValues,
    TabelaPrecoItemFormValues,
    TabelaPrecoListQuery,
    TabelaPrecoMotivoRequest,
    TabelaPrecoResponse
} from '@/features/tabelas-preco/types/tabelasPreco.types';

const runTabelaPrecoRequest = async <T>(request: () => Promise<T>) => {
    try { return await request(); } catch (error) { const apiError = mapApiError(error); throw new Error(apiError.message); }
};

const dateOnly = (value: Date | null | undefined) => value ? value.toISOString().slice(0, 10) : null;
const params = (query?: TabelaPrecoListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo, page: query?.page, pageSize: query?.pageSize });

export const buildCriarTabelaPrecoPayload = (values: TabelaPrecoFormValues): CriarTabelaPrecoRequest => {
    const parsed = tabelaPrecoSchema.parse(values);
    const empresaId = normalizeGuidOrNull(parsed.empresaId);
    if (!empresaId) throw new Error('Selecione uma empresa válida para criar a tabela de preço.');
    return sanitizePayload({ empresaId, filialId: normalizeGuidOrNull(parsed.filialId) ?? null, nome: parsed.nome.trim(), dataInicioVigencia: dateOnly(parsed.dataInicioVigencia), dataFimVigencia: dateOnly(parsed.dataFimVigencia), padrao: parsed.padrao }) as CriarTabelaPrecoRequest;
};

export const buildAtualizarTabelaPrecoPayload = (values: TabelaPrecoFormValues): AtualizarTabelaPrecoRequest => {
    const parsed = tabelaPrecoSchema.parse(values);
    return sanitizePayload({ nome: parsed.nome.trim(), dataInicioVigencia: dateOnly(parsed.dataInicioVigencia), dataFimVigencia: dateOnly(parsed.dataFimVigencia), padrao: parsed.padrao }) as AtualizarTabelaPrecoRequest;
};

export const buildTabelaPrecoMotivoPayload = (motivo: string): TabelaPrecoMotivoRequest => sanitizePayload(tabelaPrecoMotivoSchema.parse({ motivo })) as TabelaPrecoMotivoRequest;
export const buildCriarTabelaPrecoItemPayload = (values: TabelaPrecoItemFormValues): CriarTabelaPrecoItemRequest => sanitizePayload(tabelaPrecoItemSchema.parse(values)) as CriarTabelaPrecoItemRequest;
export const buildAtualizarTabelaPrecoItemPayload = (values: TabelaPrecoItemFormValues): AtualizarTabelaPrecoItemRequest => {
    const parsed = tabelaPrecoItemSchema.parse(values);
    return sanitizePayload({ precoVenda: parsed.precoVenda, precoMinimo: parsed.precoMinimo, margemPercentual: parsed.margemPercentual }) as AtualizarTabelaPrecoItemRequest;
};

export const tabelasPrecoApi = {
    async listar(query?: TabelaPrecoListQuery) {
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.get<TabelaPrecoResponse[]>('/api/tabelas-preco', { params: params(query) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.get<TabelaPrecoResponse>(`/api/tabelas-preco/${id}`);
            return response.data;
        });
    },
    async criar(values: TabelaPrecoFormValues) {
        const payload = buildCriarTabelaPrecoPayload(values);
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.post<TabelaPrecoResponse>('/api/tabelas-preco', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: TabelaPrecoFormValues) {
        const payload = buildAtualizarTabelaPrecoPayload(values);
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.put<TabelaPrecoResponse>(`/api/tabelas-preco/${id}`, payload);
            return response.data;
        });
    },
    async ativar(id: string) { return runTabelaPrecoRequest(async () => { await httpClient.post<void>(`/api/tabelas-preco/${id}/ativar`); }); },
    async inativar(id: string, motivo: string) {
        const payload = buildTabelaPrecoMotivoPayload(motivo);
        return runTabelaPrecoRequest(async () => { await httpClient.post<void>(`/api/tabelas-preco/${id}/inativar`, payload); });
    },
    async adicionarItem(id: string, values: TabelaPrecoItemFormValues) {
        const payload = buildCriarTabelaPrecoItemPayload(values);
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.post<TabelaPrecoResponse>(`/api/tabelas-preco/${id}/itens`, payload);
            return response.data;
        });
    },
    async atualizarItem(id: string, itemId: string, values: TabelaPrecoItemFormValues) {
        const payload = buildAtualizarTabelaPrecoItemPayload(values);
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.put<TabelaPrecoResponse>(`/api/tabelas-preco/${id}/itens/${itemId}`, payload);
            return response.data;
        });
    },
    async inativarItem(id: string, itemId: string, motivo: string) {
        const payload = buildTabelaPrecoMotivoPayload(motivo);
        return runTabelaPrecoRequest(async () => { await httpClient.post<void>(`/api/tabelas-preco/${id}/itens/${itemId}/inativar`, payload); });
    },
    async precoVigente(query: PrecoVigenteQuery) {
        return runTabelaPrecoRequest(async () => {
            const response = await httpClient.get<PrecoVigenteResponse>(`/api/tabelas-preco/produtos/${query.produtoId}/preco-vigente`, { params: cleanQueryParams({ empresaId: query.empresaId, filialId: query.filialId, dataReferencia: dateOnly(query.dataReferencia) }) });
            return response.data;
        });
    }
};
