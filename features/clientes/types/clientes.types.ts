import { EntityStatus, Guid } from '@/types/erp';

export type ClienteListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type ClienteResponse = {
    id: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    pessoaId: Guid;
    codigo: string;
    limiteCredito: number;
    creditoBloqueado: boolean;
    motivoBloqueioCredito: string | null;
    observacao: string | null;
    status: EntityStatus;
};

export type CriarClienteRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    pessoaId: Guid;
    codigo: string;
    limiteCredito: number;
    observacao?: string | null;
};

export type AtualizarClienteRequest = {
    limiteCredito: number;
    observacao?: string | null;
};

export type ClienteMotivoRequest = {
    motivo: string;
};

export type ClienteFormValues = Partial<CriarClienteRequest & AtualizarClienteRequest> & { id?: Guid };
