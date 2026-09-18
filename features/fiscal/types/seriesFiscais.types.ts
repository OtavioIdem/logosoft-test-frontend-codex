// Tipos da fatia Séries fiscais (v1.11.0a8b58, F3.1). Origem: `SerieFiscalContracts.cs` e
// `SeriesFiscaisController.cs` (`../New project 3/src/Erp.Application/Fiscal/Documentos`,
// `../New project 3/src/Erp.Api/Controllers/Fiscal`). `vigenciaInicio`/`vigenciaFim` são `DateOnly` do
// backend (`yyyy-MM-dd`, sem fuso) -- nunca usar `toISOString()` neles (armadilha 3 do plano).

import { Guid } from '@/types/erp';

/** `SerieFiscalContracts.cs:21-32` -- 11 campos. */
export type SerieFiscalResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    modeloDocumentoFiscalId: Guid;
    numero: number;
    numeroInicial: number;
    numeroFinal: number;
    proximoNumero: number;
    vigenciaInicio: string;
    vigenciaFim?: string | null;
    ativa: boolean;
};

/** `SerieFiscalContracts.cs:35-40` -- 5 campos (D4: números alocados sem documento que os justifique). */
export type BuracosSerieFiscalResponse = {
    serieFiscalId: Guid;
    numero: number;
    numeroInicial: number;
    ultimoNumeroAlocado: number;
    numerosSemDocumentoAutorizado: number[];
};

/** `SerieFiscalContracts.cs:5-13` -- 8 campos. */
export type CriarSerieFiscalRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    modeloDocumentoFiscalId: Guid;
    numero: number;
    numeroInicial: number;
    numeroFinal: number;
    vigenciaInicio: string;
    vigenciaFim?: string | null;
};

/** `SerieFiscalContracts.cs:15`. */
export type AmpliarNumeroFinalSerieFiscalRequest = {
    novoNumeroFinal: number;
};

/** `SerieFiscalContracts.cs:17`. */
export type EncerrarVigenciaSerieFiscalRequest = {
    vigenciaFim: string;
};

/** `SerieFiscalContracts.cs:19`. */
export type InativarSerieFiscalRequest = {
    motivo: string;
};

/** `SeriesFiscaisController.cs:48-55`. */
export type SerieFiscalListQuery = {
    empresaId: Guid;
    filialId?: Guid | null;
    modeloDocumentoFiscalId?: Guid | null;
    somenteAtivas?: boolean;
    pagina?: number;
    tamanhoPagina?: number;
};
