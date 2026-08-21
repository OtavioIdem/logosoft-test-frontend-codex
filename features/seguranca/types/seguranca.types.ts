import { Guid, IsoDateTime, PermissionCode } from '@/types/erp';

export type UsuarioGrupoAcessoResumo = {
    id?: Guid;
    grupoAcessoId?: Guid;
    nome?: string;
    descricao?: string | null;
};

/**
 * Escopo de um vínculo de acesso: 1 = Empresa, 2 = Filial.
 */
export type EscopoAcesso = 1 | 2;

export type OrigemPermissaoEfetivaResponse = {
    escopo: EscopoAcesso;
    cargoAcessoId: Guid;
    grupoAcessoId: Guid;
    permissionCode: string;
    permitido: boolean;
};

export type PermissoesEfetivasUsuarioResponse = {
    usuarioId: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    permissoes: string[];
    origens: OrigemPermissaoEfetivaResponse[];
};

/**
 * Projeção de tela do acesso efetivo. `origemIndisponivel` marca o caso em que o backend
 * confirma permissões mas não devolve a origem por grupo — a tela precisa dizer isso
 * explicitamente em vez de exibir "-" e parecer que o vínculo não existe.
 */
export type AcessoEfetivoUsuario = {
    grupos: Array<{ id: Guid; nome: string }>;
    totalPermissoes: number;
    origemIndisponivel: boolean;
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
    // Campo tolerado, ausente do contrato atual (UsuarioResponse do backend não devolve grupos).
    // Mantido para ser preferido automaticamente caso o backend passe a enviá-lo.
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
