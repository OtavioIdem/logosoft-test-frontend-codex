// Client das buscas de NCM e CFOP dos selects (v1.11.0a8b72, D99). Antes em `tributacaoApi.ts`. Os dois
// endpoints exigem `FISCAL_CADASTROS_CONSULTAR` (`CadastrosFiscaisController.cs:166`) e são paginados (D52):
// só por busca no servidor, nunca o catálogo inteiro. O erro sobe cru (`AxiosError`) e `mapApiError` o lê na
// borda do select -- sem fallback para lista vazia: a falha aparece.

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { cfopResumoPagedSchema, ncmResumoPagedSchema } from '@/features/fiscal/schemas/cadastrosFiscaisSchemas';
import { CfopBuscaFiltros, CfopResumoResponse, NcmResumoResponse } from '@/features/fiscal/types/cadastrosFiscais.types';
import { PagedResult } from '@/types/erp';

export const CADASTROS_FISCAIS_TAMANHO_PAGINA = 20;

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
    }
};
