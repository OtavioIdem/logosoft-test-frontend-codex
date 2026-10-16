import { PermissionCode } from '@/types/erp';

export type CadastroCategoriaId =
    | 'estrutura-organizacional'
    | 'pessoas-parceiros'
    | 'catalogo-estoque'
    | 'comercial-financeiro'
    | 'fiscal'
    | 'operacao-especializada'
    | 'contabil-patrimonio'
    | 'seguranca-acessos';

export type CadastroItem = Readonly<{
    id: string;
    categoriaId: CadastroCategoriaId;
    ordem: number;
    label: string;
    descricao: string;
    icon: string;
    to: string;
    anyPermissions: readonly PermissionCode[];
}>;

export type CadastroCategoria = Readonly<{
    id: CadastroCategoriaId;
    ordem: number;
    label: string;
    descricao: string;
}>;
