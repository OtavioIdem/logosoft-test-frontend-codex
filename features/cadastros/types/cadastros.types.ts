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
    // Mesmo eixo do `masterOnly` de AppMenuItem (D109): o card sai da Central para quem não é
    // master, mas segue contando para `cadastrosAnyPermissions` — a união do catálogo continua
    // sendo o guard de /cadastros, e a regra de rota não muda.
    masterOnly?: boolean;
}>;

export type CadastroCategoria = Readonly<{
    id: CadastroCategoriaId;
    ordem: number;
    label: string;
    descricao: string;
}>;
