// Client da fatia Séries fiscais (v1.11.0a8b58, F3.1). Segue `financeiroApi.ts`: `httpClient` +
// `sanitizePayload`/`cleanQueryParams`; a diferença é que o erro NÃO é recapturado e reembrulhado aqui --
// ele sobe cru (`AxiosError`) para quem chama, porque `mapApiError` (`@/lib/http/apiError.ts`) já extrai
// `code`/`status`/`traceId`/`fieldErrors` de um `AxiosError` puro, e o D50 desta fatia (erro por
// `Error.Code`, ex.: `FISCAL_SERIES_JA_EXISTE`) depende de o `code` sobreviver até o diálogo. Reembrulhar em
// `new Error(message)` (o padrão de `tabelasPrecoApi.ts`/`produtosApi.ts`) perderia justamente esse campo.

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import { ampliarNumeroFinalSerieFiscalSchema, buracosSerieFiscalResponseSchema, criarSerieFiscalSchema, encerrarVigenciaSerieFiscalSchema, inativarSerieFiscalSchema, serieFiscalResponseSchema } from '@/features/fiscal/schemas/seriesFiscaisSchemas';
import { AmpliarNumeroFinalSerieFiscalRequest, BuracosSerieFiscalResponse, CriarSerieFiscalRequest, EncerrarVigenciaSerieFiscalRequest, InativarSerieFiscalRequest, SerieFiscalListQuery, SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { PagedResult } from '@/types/erp';

/** AC-4: sem empresa a listagem não sai -- 0 chamada HTTP, erro sintético com código próprio (armadilha 1). */
export class SeriesFiscaisEmpresaObrigatoriaError extends Error {
    code = 'Fiscal.Series.EmpresaObrigatoria';

    constructor() {
        super('Selecione uma empresa para consultar as séries fiscais.');
        this.name = 'SeriesFiscaisEmpresaObrigatoriaError';
    }
}

const listParams = (query: SerieFiscalListQuery) =>
    cleanQueryParams({
        empresaId: query.empresaId,
        filialId: query.filialId,
        modeloDocumentoFiscalId: query.modeloDocumentoFiscalId,
        // "Todas" omite o parâmetro; "Inativas" envia `false` explícito -- `cleanQueryParams` só descarta
        // `undefined`/`null`/`''`, então `false` sobrevive (AC-4).
        somenteAtivas: query.somenteAtivas,
        pagina: query.pagina ?? 1,
        tamanhoPagina: query.tamanhoPagina ?? 20
    });

const parseSerie = (data: unknown): SerieFiscalResponse => serieFiscalResponseSchema.parse(data) as SerieFiscalResponse;

export const buildCriarSerieFiscalPayload = (values: unknown): CriarSerieFiscalRequest => sanitizePayload(criarSerieFiscalSchema.parse(values)) as CriarSerieFiscalRequest;
export const buildAmpliarNumeroFinalSerieFiscalPayload = (numeroFinalAtual: number, values: unknown): AmpliarNumeroFinalSerieFiscalRequest => sanitizePayload(ampliarNumeroFinalSerieFiscalSchema(numeroFinalAtual).parse(values)) as AmpliarNumeroFinalSerieFiscalRequest;
export const buildEncerrarVigenciaSerieFiscalPayload = (vigenciaInicioSerie: string, values: unknown): EncerrarVigenciaSerieFiscalRequest => sanitizePayload(encerrarVigenciaSerieFiscalSchema(vigenciaInicioSerie).parse(values)) as EncerrarVigenciaSerieFiscalRequest;
export const buildInativarSerieFiscalPayload = (values: unknown): InativarSerieFiscalRequest => sanitizePayload(inativarSerieFiscalSchema.parse(values)) as InativarSerieFiscalRequest;

export const seriesFiscaisApi = {
    async listar(query: SerieFiscalListQuery): Promise<PagedResult<SerieFiscalResponse>> {
        if (!query.empresaId) {
            throw new SeriesFiscaisEmpresaObrigatoriaError();
        }

        const response = await httpClient.get<PagedResult<SerieFiscalResponse>>('/api/fiscal/series', { params: listParams(query) });
        return { ...response.data, items: (response.data.items ?? []).map(parseSerie) };
    },
    async criar(values: unknown): Promise<SerieFiscalResponse> {
        const payload = buildCriarSerieFiscalPayload(values);
        const response = await httpClient.post<SerieFiscalResponse>('/api/fiscal/series', payload);
        return parseSerie(response.data);
    },
    async ampliar(id: string, numeroFinalAtual: number, values: unknown): Promise<SerieFiscalResponse> {
        const payload = buildAmpliarNumeroFinalSerieFiscalPayload(numeroFinalAtual, values);
        const response = await httpClient.post<SerieFiscalResponse>(`/api/fiscal/series/${id}/ampliar`, payload);
        return parseSerie(response.data);
    },
    async encerrarVigencia(id: string, vigenciaInicioSerie: string, values: unknown): Promise<SerieFiscalResponse> {
        const payload = buildEncerrarVigenciaSerieFiscalPayload(vigenciaInicioSerie, values);
        const response = await httpClient.post<SerieFiscalResponse>(`/api/fiscal/series/${id}/encerrar-vigencia`, payload);
        return parseSerie(response.data);
    },
    // AC-4: `inativar` devolve 204 sem corpo (armadilha 4) -- nunca ler `response.data` como `SerieFiscalResponse`.
    async inativar(id: string, values: unknown): Promise<void> {
        const payload = buildInativarSerieFiscalPayload(values);
        await httpClient.post<void>(`/api/fiscal/series/${id}/inativar`, payload);
    },
    async buracos(id: string): Promise<BuracosSerieFiscalResponse> {
        const response = await httpClient.get<BuracosSerieFiscalResponse>(`/api/fiscal/series/${id}/buracos`);
        return buracosSerieFiscalResponseSchema.parse(response.data) as BuracosSerieFiscalResponse;
    }
};
