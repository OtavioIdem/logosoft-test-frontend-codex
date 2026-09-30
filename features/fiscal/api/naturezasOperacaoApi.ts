// Client do combo de natureza de operação (v1.11.0a8b71, D91). Nome pelo recurso (D47), sem o sufixo
// `Consulta`. Segue `seriesFiscaisApi.ts`: o erro NÃO é reembrulhado aqui -- sobe cru (`AxiosError`), e
// `mapApiError` extrai `code`/`status`/`traceId` no painel do campo.
//
// Filtro de ativas: NO SERVIDOR. `GET /api/fiscal/naturezas-operacao` aceita `somenteAtivas`
// (`NaturezasOperacaoController.cs:50`), e o repositório filtra `Status == Ativo` quando ele vem `true`
// (`NaturezaOperacaoRepository.cs:34-37`). O filtro por empresa é obrigatório e também é do servidor
// (`NaturezaOperacaoRepository.cs:29-32`), com o guard de contexto em `NaturezaOperacaoConsultas.cs:86-90`.

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { naturezaOperacaoListQuerySchema, naturezaOperacaoResponseSchema } from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { NaturezaOperacaoListQuery, NaturezaOperacaoResponse } from '@/features/fiscal/types/naturezasOperacao.types';
import { PagedResult } from '@/types/erp';

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
        somenteAtivas: true,
        pagina: parsed.pagina,
        tamanhoPagina: parsed.tamanhoPagina
    });
};

export const naturezasOperacaoApi = {
    async listar(query: NaturezaOperacaoListQuery): Promise<PagedResult<NaturezaOperacaoResponse>> {
        if (!query.empresaId) {
            throw new NaturezasOperacaoEmpresaObrigatoriaError();
        }

        const response = await httpClient.get<PagedResult<NaturezaOperacaoResponse>>('/api/fiscal/naturezas-operacao', { params: listParams(query) });
        return { ...response.data, items: (response.data.items ?? []).map((item) => naturezaOperacaoResponseSchema.parse(item) as NaturezaOperacaoResponse) };
    }
};
