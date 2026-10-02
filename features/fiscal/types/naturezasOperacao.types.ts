// Tipos de natureza de operação (v1.11.0a8b71 combo, D91; v1.11.0a8b72 manutenção, D98).
// Origem: `NaturezaOperacaoContracts.cs:15-68` e `NaturezasOperacaoController.cs:41-145`
// (`../New project 3/src`). Cadastro POR EMPRESA: a listagem exige `empresaId`.
//
// O backend serializa enum como NÚMERO (sem `JsonStringEnumConverter`, `Program.cs:28-31`); os valores e os
// rótulos vivem em `components/naturezasOperacaoLabels.ts`, cada um com a linha do C# de onde veio.

import { Guid } from '@/types/erp';

/**
 * `MapeamentoCfopResponse` (`NaturezaOperacaoContracts.cs:51`). `tipoItem` nulo = "qualquer item" do âmbito
 * (`NaturezaOperacao.cs:166-175`). O mapeamento não traz a descrição do CFOP.
 */
export type MapeamentoCfopResponse = {
    ambito: number;
    cfopId: Guid;
    cfopCodigo: string;
    tipoItem: number | null;
};

/** `NaturezaOperacaoResponse` (`NaturezaOperacaoContracts.cs:53-68`), os 15 campos. */
export type NaturezaOperacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    descricao: string;
    tipoDocumento: number;
    tipoOperacao: number;
    finalidade: number;
    indicadorPresencaComprador: number;
    indicadorConsumidorFinal: boolean;
    movimentaEstoque: boolean;
    geraFinanceiro: boolean;
    observacao?: string | null;
    ativa: boolean;
    cfops: MapeamentoCfopResponse[];
};

/**
 * `MapeamentoCfopRequest` (`NaturezaOperacaoContracts.cs:15`): o CFOP vai pelo CÓDIGO, não pelo id. `tipoItem`
 * nulo é o mapeamento genérico e é enviado como `null` explícito.
 */
export type MapeamentoCfopRequest = {
    ambito: number;
    cfopCodigo: string;
    tipoItem: number | null;
};

/** `CriarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:17-30`), 13 campos. `cfops` sai sempre como lista. */
export type CriarNaturezaOperacaoRequest = {
    empresaId: Guid;
    filialId: Guid | null;
    codigo: string;
    descricao: string;
    tipoDocumento: number;
    tipoOperacao: number;
    finalidade: number;
    indicadorPresencaComprador: number;
    indicadorConsumidorFinal: boolean;
    movimentaEstoque: boolean;
    geraFinanceiro: boolean;
    observacao: string | null;
    cfops: MapeamentoCfopRequest[];
};

/**
 * `AtualizarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:36-46`), 10 campos: sem `empresaId`,
 * `filialId` e `codigo` (o código é a identidade). `cfops` é SUBSTITUIÇÃO COMPLETA: `null` preserva, `[]` apaga
 * tudo, lista substitui (`ResolvedorMapeamentoCfop.cs:15-70`). Por isso o tipo não admite `null`.
 */
export type AtualizarNaturezaOperacaoRequest = {
    descricao: string;
    tipoDocumento: number;
    tipoOperacao: number;
    finalidade: number;
    indicadorPresencaComprador: number;
    indicadorConsumidorFinal: boolean;
    movimentaEstoque: boolean;
    geraFinanceiro: boolean;
    observacao: string | null;
    cfops: MapeamentoCfopRequest[];
};

/** `InativarNaturezaOperacaoRequest` (`NaturezaOperacaoContracts.cs:48`). A resposta é 204, sem corpo. */
export type InativarNaturezaOperacaoRequest = {
    motivo: string;
};

/**
 * Query de `GET /api/fiscal/naturezas-operacao` (`NaturezasOperacaoController.cs:43-52`). `somenteAtivas`:
 * só `true` filtra no servidor (`NaturezaOperacaoRepository.cs:34-37`); "Todas" omite o parâmetro. A listagem
 * NÃO aceita `filialId`. O teto de página do backend é 200 (`NaturezaOperacaoConsultas.cs:61,101`).
 */
export type NaturezaOperacaoListQuery = {
    empresaId: Guid;
    termo?: string | null;
    codigo?: string | null;
    tipoDocumento?: number | null;
    tipoOperacao?: number | null;
    finalidade?: number | null;
    somenteAtivas?: boolean | null;
    pagina?: number;
    tamanhoPagina?: number;
};

/** `CfopResolvidoResponse` (`NaturezaOperacaoContracts.cs:74-82`), 8 campos: o CFOP que a natureza resolve para um par de UFs. */
export type CfopResolvidoResponse = {
    naturezaOperacaoId: Guid;
    naturezaCodigo: string;
    ambito: number;
    cfopId: Guid;
    cfopCodigo: string;
    cfopDescricao: string;
    geraFinanceiro: boolean;
    movimentaEstoque: boolean;
};

/** Query de `GET {id}/cfop` (`NaturezasOperacaoController.cs:130-136`): 4 parâmetros. */
export type ResolverCfopNaturezaQuery = {
    ufOrigem: string;
    ufDestino: string;
    tipoItem?: number | null;
    operacaoComExterior?: boolean;
};
