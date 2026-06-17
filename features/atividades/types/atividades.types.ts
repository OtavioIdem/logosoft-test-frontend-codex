import { Guid, IsoDateTime } from '@/types/erp';

export type AtividadeStatus = 'Aberta' | 'EmAndamento' | 'Concluida' | 'Cancelada';
export type AtividadePrioridade = 'Baixa' | 'Media' | 'Alta' | 'Critica';

export type AtividadeHistoricoResponse = {
    id: Guid;
    statusAnterior?: AtividadeStatus | string | null;
    statusNovo?: AtividadeStatus | string | null;
    comentario?: string | null;
    usuarioId?: Guid | null;
    criadoEm?: IsoDateTime | null;
};

export type AtividadeComentarioResponse = {
    id: Guid;
    mensagem: string;
    usuarioId?: Guid | null;
    criadoEm?: IsoDateTime | null;
};

export type AtividadeResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    titulo: string;
    descricao?: string | null;
    prioridade: AtividadePrioridade | string;
    responsavelUsuarioId?: Guid | null;
    prazoEm?: IsoDateTime | null;
    entidadeOrigem?: string | null;
    entidadeOrigemId?: Guid | null;
    status?: AtividadeStatus | string | null;
    statusAtividade?: AtividadeStatus | string | null;
    historico?: AtividadeHistoricoResponse[];
    comentarios?: AtividadeComentarioResponse[];
    criadoEm?: IsoDateTime | null;
    atualizadoEm?: IsoDateTime | null;
};

export type AtividadesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    responsavelUsuarioId?: Guid | null;
    status?: AtividadeStatus | string | null;
    prioridade?: AtividadePrioridade | string | null;
    termo?: string | null;
    page?: number | null;
    pageSize?: number | null;
};

export type CriarAtividadeRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    titulo: string;
    descricao?: string | null;
    prioridade: AtividadePrioridade | string;
    responsavelUsuarioId?: Guid | null;
    prazoEm?: IsoDateTime | Date | null;
    entidadeOrigem?: string | null;
    entidadeOrigemId?: Guid | null;
};

export type AtualizarAtividadeRequest = {
    titulo: string;
    descricao?: string | null;
    prioridade: AtividadePrioridade | string;
    prazoEm?: IsoDateTime | Date | null;
};

export type AtividadeFormValues = CriarAtividadeRequest & {
    id?: Guid;
};

export type AtribuirAtividadeRequest = {
    responsavelUsuarioId: Guid;
};

export type AlterarStatusAtividadeRequest = {
    status: AtividadeStatus | string;
    comentario?: string | null;
};

export type ComentarioAtividadeRequest = {
    mensagem: string;
};

export type CancelarAtividadeRequest = {
    motivo: string;
};
