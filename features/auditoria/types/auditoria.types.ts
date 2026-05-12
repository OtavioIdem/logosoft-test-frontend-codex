import { Guid, IsoDateTime } from '@/types/erp';

export type AuditoriaEventoResponse = {
    id: Guid;
    modulo: string;
    entidade: string;
    entidadeId: Guid;
    acao: number;
    descricao: string;
    usuarioId: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    criadoEm: IsoDateTime;
};

export type AuditoriaEventoView = AuditoriaEventoResponse & {
    acaoDescricao: string;
    referencia: string;
};

export type AuditoriaFiltro = {
    termo?: string;
    modulo?: string;
    entidade?: string;
};
