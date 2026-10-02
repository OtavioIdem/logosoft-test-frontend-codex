import { EntityStatus, Guid, IsoDateTime, TipoPessoa } from '@/types/erp';

export type PessoaListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type PessoaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    tipoPessoa: TipoPessoa;
    nomeRazaoSocial: string;
    nomeFantasia: string | null;
    documento: string;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    observacao: string | null;
    status: EntityStatus;
    /** A UI lê (`OperationalGovernancePanel`) e o backend não entrega (`PessoaResponse.cs:7-29`): opcional (PF-3). */
    createdAt?: IsoDateTime;
    // Os 11 campos que o backend entrega e o frontend não declarava (`PessoaResponse.cs:17-28`; inventário §3.1, PF-4).
    // Enum chega como NÚMERO (o backend não usa `JsonStringEnumConverter`). Opcionais no tipo para não quebrar quem
    // monta `PessoaResponse` à mão, mas o backend sempre os devolve (nulos incluídos): a aba "Dados fiscais" trata a
    // AUSÊNCIA da chave como registro incompleto e não grava (PF-1).
    /** `IndicadorContribuinteIcms`: 1 Contribuinte, 2 Isento, 3 Não contribuinte (`IndicadorContribuinteIcms.cs:12-17`). */
    indicadorContribuinteIcms?: number | null;
    /** `IndicadorIeDestinatario` DERIVADO pelo servidor: 1, 2 ou 9 (`IndicadorIeDestinatario.cs:12-17`). Nunca vai no request. */
    indicadorIeDestinatario?: number | null;
    inscricaoEstadualSt?: string | null;
    suframa?: string | null;
    /** `RegimeTributario` sem valores explícitos: 0 Simples Nacional, 1 Lucro Presumido, 2 Lucro Real (`RegimeTributario.cs:3-8`). */
    regimeTributarioParceiro?: number | null;
    /** Guid do município do bloco fiscal. O PATCH recebe o CÓDIGO, e nenhuma busca filtra por Id (emenda da D104, B-44). */
    municipioIbgeId?: Guid | null;
    /** Guid do país do bloco fiscal. O PATCH recebe o código BACEN (idem). */
    paisId?: Guid | null;
    /** Fora da b75 (D53): declarados só porque o backend os devolve. */
    bloqueada?: boolean;
    motivoBloqueio?: string | null;
    contribuinteIpi?: boolean | null;
    tomadorOrgaoPublico?: boolean | null;
};

export type CriarPessoaRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    tipoPessoa: TipoPessoa;
    nomeRazaoSocial: string;
    nomeFantasia?: string | null;
    documento: string;
    inscricaoEstadual?: string | null;
    inscricaoMunicipal?: string | null;
    observacao?: string | null;
};

export type AtualizarPessoaRequest = {
    nomeRazaoSocial: string;
    nomeFantasia?: string | null;
    inscricaoEstadual?: string | null;
    inscricaoMunicipal?: string | null;
    observacao?: string | null;
};

export type InativarPessoaRequest = {
    motivo: string;
};

/**
 * `AtualizarDadosFiscaisPessoaRequest`, `PessoaRequests.cs:37-45` (8 campos). O PATCH SUBSTITUI o bloco inteiro
 * (`PessoaDadosFiscaisResolver.cs:31-36`, `Pessoa.cs:118-126`): campo omitido apaga o valor gravado. Por isso os 8
 * campos são obrigatórios no tipo, com `null` explícito para "não informado" (PF-1).
 */
export type AtualizarDadosFiscaisPessoaRequest = {
    indicadorContribuinteIcms: number | null;
    inscricaoEstadualSt: string | null;
    suframa: string | null;
    regimeTributarioParceiro: number | null;
    /** código IBGE de 7 dígitos; a aba só o envia nulo (emenda da D104) */
    municipioIbgeCodigo: string | null;
    /** código BACEN de até 4 dígitos; a aba só o envia nulo (emenda da D104) */
    paisCodigoBacen: string | null;
    contribuinteIpi: boolean | null;
    tomadorOrgaoPublico: boolean | null;
};

/** Os 6 campos que a aba "Dados fiscais" edita. Município e país não são editáveis (emenda da D104). */
export type PessoaFiscalFormValues = {
    indicadorContribuinteIcms: number | null;
    inscricaoEstadualSt: string;
    suframa: string;
    regimeTributarioParceiro: number | null;
    contribuinteIpi: boolean | null;
    tomadorOrgaoPublico: boolean | null;
};

export type PessoaFormValues = Partial<CriarPessoaRequest & AtualizarPessoaRequest> & { id?: Guid };

export type ClassificacaoPessoaListQuery = {
    empresaId?: Guid | null;
    termo?: string | null;
};

export type ClassificacaoPessoaResponse = {
    id: Guid;
    empresaId: Guid;
    codigo: string;
    nome: string;
    descricao: string | null;
    status: EntityStatus;
};

export type CriarClassificacaoPessoaRequest = {
    empresaId: Guid;
    codigo: string;
    nome: string;
    descricao?: string | null;
};

// O PUT busca o registro escopado por empresa (`ObterClassificacaoPessoaPorIdAsync(empresaId, id, ...)`,
// inventário §2) — `empresaId` não altera o registro, só valida que o id pertence à empresa do payload.
export type AtualizarClassificacaoPessoaRequest = {
    empresaId: Guid;
    nome: string;
    descricao?: string | null;
};

export type InativarClassificacaoPessoaRequest = {
    empresaId: Guid;
    motivo: string;
};

export type ClassificacaoPessoaFormValues = {
    id?: Guid;
    empresaId: Guid;
    codigo: string;
    nome: string;
    descricao?: string | null;
};
