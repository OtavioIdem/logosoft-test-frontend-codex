import { Guid, IsoDateTime } from '@/types/erp';

export type UsuarioResponse = {
    id: Guid;
    nome: string;
    email: string;
    empresaId: Guid;
    filialId: Guid | null;
    ativo: boolean;
    bloqueado: boolean;
    ultimoLoginEm: IsoDateTime | null;
};

export type CriarUsuarioRequest = {
    nome: string;
    email: string;
    senha: string;
    empresaId: Guid;
    filialId: Guid | null;
};

export type UsuarioFormValues = {
    nome: string;
    email: string;
    senha: string;
    empresaId: string;
    filialId?: string | null;
};
