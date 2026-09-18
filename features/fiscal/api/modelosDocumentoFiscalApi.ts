// Client do combo de modelo de documento fiscal (v1.11.0a8b58, F3.5 -- só combo, D53). Cadastro global,
// sem `empresaId` (D9); teto de página do backend é 100 (`ModeloDocumentoFiscalRepository.cs:25`).

import { httpClient } from '@/lib/http/httpClient';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { modeloDocumentoFiscalResponseSchema } from '@/features/fiscal/schemas/modelosDocumentoFiscalSchemas';
import { ModeloDocumentoFiscalListQuery, ModeloDocumentoFiscalResponse } from '@/features/fiscal/types/modelosDocumentoFiscal.types';
import { PagedResult } from '@/types/erp';

const listParams = (query?: ModeloDocumentoFiscalListQuery) =>
    cleanQueryParams({
        termo: query?.termo,
        codigo: query?.codigo,
        ativo: query?.ativo,
        pagina: query?.pagina ?? 1,
        tamanhoPagina: query?.tamanhoPagina ?? 100
    });

export const modelosDocumentoFiscalApi = {
    async listar(query?: ModeloDocumentoFiscalListQuery): Promise<PagedResult<ModeloDocumentoFiscalResponse>> {
        const response = await httpClient.get<PagedResult<ModeloDocumentoFiscalResponse>>('/api/fiscal/modelos-documento', { params: listParams(query) });
        return { ...response.data, items: (response.data.items ?? []).map((item) => modeloDocumentoFiscalResponseSchema.parse(item) as ModeloDocumentoFiscalResponse) };
    }
};
