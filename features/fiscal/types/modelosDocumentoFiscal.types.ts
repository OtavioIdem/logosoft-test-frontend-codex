// Tipos do combo de modelo de documento fiscal (v1.11.0a8b58, F3.5, só como combo -- D53). Origem:
// `ModeloDocumentoFiscalContracts.cs` (`../New project 3/src/Erp.Application/Fiscal/Documentos`) e
// `ModelosDocumentoFiscalController.cs` (`../New project 3/src/Erp.Api/Controllers/Fiscal`). Cadastro
// global (D9): sem `empresaId`.

import { Guid } from '@/types/erp';

/** `ModeloDocumentoFiscalContracts.cs:7-13` -- 6 campos. */
export type ModeloDocumentoFiscalResponse = {
    id: Guid;
    codigo: string;
    descricao: string;
    sigla: string;
    ativo: boolean;
    motivoInativacao?: string | null;
};

/** `ModelosDocumentoFiscalController.cs:27-33`. */
export type ModeloDocumentoFiscalListQuery = {
    termo?: string | null;
    codigo?: string | null;
    ativo?: boolean | null;
    pagina?: number;
    tamanhoPagina?: number;
};
