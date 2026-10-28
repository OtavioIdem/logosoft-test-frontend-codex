// Client das buscas de NCM e CFOP dos selects (v1.11.0a8b72, D99). Antes em `tributacaoApi.ts`. Os dois
// endpoints exigem `FISCAL_CADASTROS_CONSULTAR` (`CadastrosFiscaisController.cs:166`) e são paginados (D52):
// só por busca no servidor, nunca o catálogo inteiro. O erro sobe cru (`AxiosError`) e `mapApiError` o lê na
// borda do select -- sem fallback para lista vazia: a falha aparece.

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { cestResumoPagedSchema, cfopResumoPagedSchema, ncmCestVinculoPagedSchema, ncmResumoPagedSchema, origemMercadoriaPagedSchema } from '@/features/fiscal/schemas/cadastrosFiscaisSchemas';
import { CestResumoResponse, CfopBuscaFiltros, CfopResumoResponse, NcmCestVinculoResponse, NcmResumoResponse, OrigemMercadoriaResponse } from '@/features/fiscal/types/cadastrosFiscais.types';
import { PagedResult } from '@/types/erp';

export const CADASTROS_FISCAIS_TAMANHO_PAGINA = 20;
// Tabelas fechadas e pequenas (origem 0..8) e vínculos de um único NCM cabem numa página; o backend limita em 200 (`CadastrosFiscaisFiltroFactory.cs`, `TamanhoPaginaMaximo`).
// 100 fica abaixo do teto; se os vínculos de um NCM passarem disso, `totalItems` acusa lista parcial (`useCestPorNcm.parcial`).
export const CADASTROS_FISCAIS_TAMANHO_LISTA_FECHADA = 100;

export const cadastrosFiscaisApi = {
    async listarNcm(termo?: string | null): Promise<PagedResult<NcmResumoResponse>> {
        const response = await httpClient.get<unknown>('/api/fiscal/cadastros/ncm', {
            params: cleanQueryParams({ termo, ativo: true, pagina: 1, tamanhoPagina: CADASTROS_FISCAIS_TAMANHO_PAGINA })
        });
        return ncmResumoPagedSchema.parse(response.data) as PagedResult<NcmResumoResponse>;
    },
    // `ambito` e `tipo` filtram no servidor (`CadastrosFiscaisController.cs:170-171`); `ativo: true` sempre.
    async listarCfop(termo?: string | null, filtros: CfopBuscaFiltros = {}): Promise<PagedResult<CfopResumoResponse>> {
        const response = await httpClient.get<unknown>('/api/fiscal/cadastros/cfop', {
            params: cleanQueryParams({ termo, ambito: filtros.ambito, tipo: filtros.tipo, ativo: true, pagina: 1, tamanhoPagina: CADASTROS_FISCAIS_TAMANHO_PAGINA })
        });
        return cfopResumoPagedSchema.parse(response.data) as PagedResult<CfopResumoResponse>;
    },
    // CEST pelo código exato: resolve a descrição de um vínculo `ncm-cest`, que só traz `cestCodigo`.
    async obterCestPorCodigo(codigo: string): Promise<CestResumoResponse | null> {
        const response = await httpClient.get<unknown>('/api/fiscal/cadastros/cest', {
            params: cleanQueryParams({ codigo, ativo: true, pagina: 1, tamanhoPagina: 1 })
        });
        const parsed = cestResumoPagedSchema.parse(response.data) as PagedResult<CestResumoResponse>;
        return parsed.items[0] ?? null;
    },
    // Vínculos ativos do NCM: o conjunto de CESTs que o backend aceita para ele (`ncmCodigo` é o código de 8 dígitos).
    async listarVinculosNcmCest(ncmCodigo: string): Promise<PagedResult<NcmCestVinculoResponse>> {
        const response = await httpClient.get<unknown>('/api/fiscal/cadastros/ncm-cest', {
            params: cleanQueryParams({ ncmCodigo, ativo: true, pagina: 1, tamanhoPagina: CADASTROS_FISCAIS_TAMANHO_LISTA_FECHADA })
        });
        return ncmCestVinculoPagedSchema.parse(response.data) as PagedResult<NcmCestVinculoResponse>;
    },
    async listarOrigensMercadoria(): Promise<PagedResult<OrigemMercadoriaResponse>> {
        const response = await httpClient.get<unknown>('/api/fiscal/cadastros/origens-mercadoria', {
            params: cleanQueryParams({ ativo: true, pagina: 1, tamanhoPagina: 50 })
        });
        return origemMercadoriaPagedSchema.parse(response.data) as PagedResult<OrigemMercadoriaResponse>;
    }
};
