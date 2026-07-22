import { Guid, IsoDateTime, PermissionCode } from '@/types/erp';

export type UsuarioGrupoAcessoResumo = {
    id?: Guid;
    grupoAcessoId?: Guid;
    nome?: string;
    descricao?: string | null;
};

export type UsuarioResponse = {
    id: Guid;
    nome: string;
    email: string;
    login?: string | null;
    empresaId: Guid;
    filialId: Guid | null;
    ativo: boolean;
    bloqueado?: boolean;
    ultimoLoginEm?: IsoDateTime | null;
    gruposAcesso?: UsuarioGrupoAcessoResumo[];
};

export type CriarUsuarioRequest = {
    nome: string;
    email: string;
    login: string;
    senha: string;
    empresaId: Guid;
    filialId: Guid | null;
    gruposAcessoIds?: Guid[];
};

export type UsuarioFormValues = {
    nome: string;
    email: string;
    login?: string | null;
    senha: string;
    empresaId: string;
    filialId?: string | null;
    gruposAcessoIds?: string[];
};

export type UsuarioMotivoRequest = {
    motivo: string;
};

export type ResetSenhaUsuarioRequest = {
    novaSenha: string;
    motivo: string;
};

export type VincularGrupoUsuarioRequest = {
    grupoAcessoId: Guid;
    motivo: string;
};

export type RemoverGrupoUsuarioRequest = {
    motivo: string;
};

export type ResetSenhaUsuarioFormValues = {
    novaSenha: string;
    confirmarSenha: string;
    motivo: string;
};

export type VincularGrupoUsuarioFormValues = {
    grupoAcessoId: string;
    motivo: string;
};

export type GrupoAcessoResponse = {
    id: Guid;
    empresaId?: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
    permissoes?: PermissionCode[];
    ativo: boolean;
    /** Campo textual de status enviado por algumas versões do backend (ex.: "Ativo"/"Inativo"). */
    status?: string | null;
    criadoEm?: IsoDateTime | null;
    alteradoEm?: IsoDateTime | null;
};

export type CriarGrupoAcessoRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
    permissoes: PermissionCode[];
};

export type AtualizarGrupoAcessoRequest = {
    empresaId?: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
    permissoes: PermissionCode[];
};

export type GrupoAcessoFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    descricao?: string | null;
    permissoes: PermissionCode[];
};

export type SegurancaListQuery = {
    empresaId?: string | null;
    filialId?: string | null;
    termo?: string | null;
    ativo?: boolean | null;
};
