// Client ÚNICO de natureza de operação (v1.11.0a8b71 combo, D91; v1.11.0a8b72 manutenção, D98). Nome pelo
// recurso (D47). Segue `seriesFiscaisApi.ts`: o erro NÃO é reembrulhado aqui -- sobe cru (`AxiosError`), e
// `mapApiError` extrai `code`/`status`/`traceId` no painel da tela e do campo (o código
// `FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO` precisa sobreviver até o diálogo).
//
// Filtro de ativas: NO SERVIDOR. `GET /api/fiscal/naturezas-operacao` aceita `somenteAtivas`
// (`NaturezasOperacaoController.cs:50`), e o repositório filtra `Status == Ativo` só quando ele vem `true`
// (`NaturezaOperacaoRepository.cs:34-37`): `false` devolve TUDO (NO-3), então o client nunca promete
// "somente inativas". O filtro por empresa é obrigatório e também é do servidor
// (`NaturezaOperacaoRepository.cs:29-32`), com o guard de contexto em `NaturezaOperacaoConsultas.cs:86-90`.

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarNaturezaOperacaoSchema, cfopResolvidoResponseSchema, criarNaturezaOperacaoSchema, inativarNaturezaOperacaoSchema, naturezaOperacaoListQuerySchema, naturezaOperacaoResponseSchema, resolverCfopNaturezaQuerySchema } from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { AtualizarNaturezaOperacaoRequest, CfopResolvidoResponse, CriarNaturezaOperacaoRequest, InativarNaturezaOperacaoRequest, NaturezaOperacaoListQuery, NaturezaOperacaoResponse, ResolverCfopNaturezaQuery } from '@/features/fiscal/types/naturezasOperacao.types';
import { PagedResult } from '@/types/erp';

const ROTA = '/api/fiscal/naturezas-operacao';

/** Sem empresa a listagem não sai: 0 chamada HTTP (o backend exige `empresaId`, controller :44). */
export class NaturezasOperacaoEmpresaObrigatoriaError extends Error {
    code = 'Fiscal.NaturezasOperacao.EmpresaObrigatoria';

    constructor() {
        super('Selecione uma empresa para consultar as naturezas de operação.');
        this.name = 'NaturezasOperacaoEmpresaObrigatoriaError';
    }
}

const listParams = (query: NaturezaOperacaoListQuery) => {
    const parsed = naturezaOperacaoListQuerySchema.parse(query);
    return cleanQueryParams({
        empresaId: parsed.empresaId,
        termo: parsed.termo,
        codigo: parsed.codigo,
        tipoDocumento: parsed.tipoDocumento,
        tipoOperacao: parsed.tipoOperacao,
        finalidade: parsed.finalidade,
        // `true` filtra; "Todas" omite o parâmetro (nunca `false`: o servidor devolveria tudo do mesmo jeito).
        somenteAtivas: parsed.somenteAtivas === true ? true : undefined,
        pagina: parsed.pagina,
        tamanhoPagina: parsed.tamanhoPagina
    });
};

const parseNatureza = (data: unknown): NaturezaOperacaoResponse => naturezaOperacaoResponseSchema.parse(data) as NaturezaOperacaoResponse;

// POST e PUT sempre levam `cfops` como lista (o schema exige); nunca `null` por omissão (D98).
export const buildCriarNaturezaOperacaoPayload = (values: unknown): CriarNaturezaOperacaoRequest => sanitizePayload(criarNaturezaOperacaoSchema.parse(values)) as CriarNaturezaOperacaoRequest;
export const buildAtualizarNaturezaOperacaoPayload = (values: unknown): AtualizarNaturezaOperacaoRequest => sanitizePayload(atualizarNaturezaOperacaoSchema.parse(values)) as AtualizarNaturezaOperacaoRequest;
export const buildInativarNaturezaOperacaoPayload = (values: unknown): InativarNaturezaOperacaoRequest => sanitizePayload(inativarNaturezaOperacaoSchema.parse(values)) as InativarNaturezaOperacaoRequest;

export const naturezasOperacaoApi = {
    async listar(query: NaturezaOperacaoListQuery): Promise<PagedResult<NaturezaOperacaoResponse>> {
        if (!query.empresaId) {
            throw new NaturezasOperacaoEmpresaObrigatoriaError();
        }

        const response = await httpClient.get<PagedResult<NaturezaOperacaoResponse>>(ROTA, { params: listParams(query) });
        return { ...response.data, items: (response.data.items ?? []).map(parseNatureza) };
    },
    // `POST` devolve 201 com a natureza completa e `Location` (`NaturezasOperacaoController.cs:75-88`).
    async criar(values: unknown): Promise<NaturezaOperacaoResponse> {
        const payload = buildCriarNaturezaOperacaoPayload(values);
        const response = await httpClient.post<NaturezaOperacaoResponse>(ROTA, payload);
        return parseNatureza(response.data);
    },
    // `PUT` devolve 200 com a natureza completa (`:90-104`); o código não entra no corpo.
    async atualizar(id: string, values: unknown): Promise<NaturezaOperacaoResponse> {
        const payload = buildAtualizarNaturezaOperacaoPayload(values);
        const response = await httpClient.put<NaturezaOperacaoResponse>(`${ROTA}/${id}`, payload);
        return parseNatureza(response.data);
    },
    // `inativar` devolve 204 sem corpo (`:106-120`) -- nunca ler `response.data` como natureza.
    async inativar(id: string, values: unknown): Promise<void> {
        const payload = buildInativarNaturezaOperacaoPayload(values);
        await httpClient.post<void>(`${ROTA}/${id}/inativar`, payload);
    },
    // `GET {id}/cfop` (`:128-145`): resolve o CFOP da natureza para um par de UFs. Sem consumidor de tela nesta fatia.
    async resolverCfop(id: string, query: ResolverCfopNaturezaQuery): Promise<CfopResolvidoResponse> {
        const parsed = resolverCfopNaturezaQuerySchema.parse(query);
        const response = await httpClient.get<CfopResolvidoResponse>(`${ROTA}/${id}/cfop`, {
            params: cleanQueryParams({ ufOrigem: parsed.ufOrigem.toUpperCase(), ufDestino: parsed.ufDestino.toUpperCase(), tipoItem: parsed.tipoItem, operacaoComExterior: parsed.operacaoComExterior })
        });
        return cfopResolvidoResponseSchema.parse(response.data) as CfopResolvidoResponse;
    }
};
