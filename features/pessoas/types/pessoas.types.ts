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
    createdAt?: IsoDateTime;
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
