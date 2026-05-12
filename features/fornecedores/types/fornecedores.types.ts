import { EntityStatus, Guid } from '@/types/erp';

export type FornecedorListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type FornecedorResponse = {
    id: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    pessoaId: Guid;
    codigo: string;
    observacao: string | null;
    status: EntityStatus;
};

export type CriarFornecedorRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    pessoaId: Guid;
    codigo: string;
    observacao?: string | null;
};

export type AtualizarFornecedorRequest = {
    observacao?: string | null;
};

export type FornecedorMotivoRequest = {
    motivo: string;
};

export type FornecedorFormValues = Partial<CriarFornecedorRequest & AtualizarFornecedorRequest> & { id?: Guid };
