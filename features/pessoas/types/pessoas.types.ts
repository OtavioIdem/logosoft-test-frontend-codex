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
