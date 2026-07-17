import { Guid, IsoDateTime } from '@/types/erp';

export enum SeveridadeNotificacao {
    Informativa = 1,
    Sucesso = 2,
    Alerta = 3,
    Critica = 4
}

export enum StatusNotificacao {
    NaoLida = 1,
    Lida = 2,
    Arquivada = 3
}

export type NotificacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    usuarioDestinoId: Guid;
    titulo: string;
    mensagem: string;
    categoria: string;
    moduloOrigem: string;
    severidade: SeveridadeNotificacao | number;
    situacao: StatusNotificacao | number;
    entidadeOrigem?: string | null;
    entidadeOrigemId?: Guid | null;
    acaoUrl?: string | null;
    criadaEm: IsoDateTime;
    lidaEm?: IsoDateTime | null;
    arquivadaEm?: IsoDateTime | null;
    expiraEm?: IsoDateTime | null;
};

export type NotificacoesPaginadas = {
    items: NotificacaoResponse[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

export type ContagemNotificacoes = { naoLidas: number };

export type NotificacoesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    situacao?: StatusNotificacao | number | null;
    severidade?: SeveridadeNotificacao | number | null;
    categoria?: string | null;
    moduloOrigem?: string | null;
    incluirExpiradas?: boolean | null;
    page?: number | null;
    pageSize?: number | null;
};

export type ContagemQuery = { empresaId?: Guid | null; filialId?: Guid | null };
