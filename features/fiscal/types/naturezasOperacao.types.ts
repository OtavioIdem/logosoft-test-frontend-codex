// Tipos do combo de natureza de operação (v1.11.0a8b71, D91 -- só consulta; a manutenção é dívida).
// Origem: `NaturezaOperacaoContracts.cs:53-68` e `NaturezasOperacaoController.cs:41-73`
// (`../New project 3/src`). Cadastro POR EMPRESA: a listagem exige `empresaId`.

import { Guid } from '@/types/erp';

/**
 * `NaturezaOperacaoResponse` (`NaturezaOperacaoContracts.cs:53-68`). O combo só lê `id`, `codigo`,
 * `descricao` e `ativa`; os demais campos do record chegam e são ignorados pelo schema não estrito.
 */
export type NaturezaOperacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    descricao: string;
    ativa: boolean;
};

/**
 * Query de `GET /api/fiscal/naturezas-operacao` (`NaturezasOperacaoController.cs:43-52`). O combo envia
 * sempre `somenteAtivas=true` (filtro no servidor, `NaturezaOperacaoRepository.cs:34-37`); o teto de
 * página do backend é 200 (`NaturezaOperacaoConsultas.cs:61,101`).
 */
export type NaturezaOperacaoListQuery = {
    empresaId: Guid;
    termo?: string | null;
    pagina?: number;
    tamanhoPagina?: number;
};
