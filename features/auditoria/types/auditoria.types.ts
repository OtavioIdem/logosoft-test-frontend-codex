import { Guid, IsoDateTime, PagedResult } from '@/types/erp';

export type AuditoriaAcao = number | string;

export type AuditoriaEventoResponse = {
    id: Guid;
    modulo: string;
    entidade: string;
    entidadeId?: Guid | null;
    acao: AuditoriaAcao;
    descricao: string;
    usuarioId?: Guid | null;
    empresaId?: Guid | null;
    filialId?: Guid | null;
    criadoEm: IsoDateTime;
};

export type AuditoriaOperacionalItemResponse = AuditoriaEventoResponse;
export type AuditoriaOperacionalResponse = PagedResult<AuditoriaOperacionalItemResponse>;

export type AuditoriaEventoView = AuditoriaEventoResponse & {
    acaoDescricao: string;
    referencia: string;
    usuarioDescricao: string;
    descricaoSegura: string;
};

export type AuditoriaOperacionalQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    usuarioId?: Guid | null;
    modulo?: string | null;
    entidade?: string | null;
    entidadeId?: Guid | null;
    acao?: string | null;
    termo?: string | null;
    dataInicial?: IsoDateTime | Date | null;
    dataFinal?: IsoDateTime | Date | null;
    page?: number;
    pageSize?: number;
};

export type AuditoriaFiltro = {
    termo?: string;
    modulo?: string;
    entidade?: string;
};
