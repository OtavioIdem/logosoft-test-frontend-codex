import { PermissionCode } from '@/types/erp';

export type RoutePermissionRule = {
    pattern: RegExp;
    anyOf: PermissionCode[];
    description: string;
};

export const routePermissionRules: RoutePermissionRule[] = [
    { pattern: /^\/seguranca\/usuarios(?:\/.*)?$/, anyOf: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR'], description: 'Usuários' },
    { pattern: /^\/seguranca\/grupos-acesso(?:\/.*)?$/, anyOf: ['SEGURANCA_PERMISSOES_GERENCIAR'], description: 'Grupos de acesso' },
    { pattern: /^\/administracao(?:\/.*)?$/, anyOf: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'], description: 'Administração' },
    { pattern: /^\/pessoas(?:\/.*)?$/, anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'], description: 'Pessoas' },
    { pattern: /^\/clientes(?:\/.*)?$/, anyOf: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR'], description: 'Clientes' },
    { pattern: /^\/fornecedores(?:\/.*)?$/, anyOf: ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'], description: 'Fornecedores' },
    { pattern: /^\/produtos(?:\/.*)?$/, anyOf: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR', 'CATEGORIAS_PRODUTO_GERENCIAR', 'UNIDADES_MEDIDA_GERENCIAR', 'MARCAS_GERENCIAR'], description: 'Produtos e catálogo' },
    { pattern: /^\/estoque\/entradas(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Entradas de estoque' },
    { pattern: /^\/estoque\/saidas(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Saídas de estoque' },
    { pattern: /^\/estoque\/ajustes(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Ajustes de estoque' },
    { pattern: /^\/estoque\/reservas(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_RESERVAR'], description: 'Reservas de estoque' },
    { pattern: /^\/estoque\/inventarios(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR'], description: 'Inventários de estoque' },
    { pattern: /^\/estoque(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_MOVIMENTAR', 'ESTOQUE_RESERVAR', 'ESTOQUE_INVENTARIO_GERENCIAR'], description: 'Estoque' },
    { pattern: /^\/tabelas-preco(?:\/.*)?$/, anyOf: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR', 'VENDAS_CONSULTAR', 'VENDAS_GERENCIAR'], description: 'Tabelas de preço' },
    { pattern: /^\/vendas(?:\/.*)?$/, anyOf: ['VENDAS_CONSULTAR', 'VENDAS_GERENCIAR', 'VENDAS_APROVAR', 'VENDAS_CANCELAR', 'VENDAS_FATURAR'], description: 'Vendas' },
    { pattern: /^\/financeiro\/contas-receber(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Contas a receber' },
    { pattern: /^\/financeiro\/contas-pagar(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Contas a pagar' },
    { pattern: /^\/financeiro\/formas-pagamento(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FORMAS_PAGAMENTO_GERENCIAR'], description: 'Formas de pagamento' },
    { pattern: /^\/financeiro\/condicoes-pagamento(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR'], description: 'Condições de pagamento' },
    { pattern: /^\/financeiro(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Financeiro' },
    { pattern: /^\/compras(?:\/.*)?$/, anyOf: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR', 'COMPRAS_APROVAR', 'COMPRAS_CANCELAR', 'COMPRAS_RECEBER'], description: 'Compras' },
    { pattern: /^\/fiscal\/notas(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_CARTA_CORRECAO'], description: 'Notas fiscais' },
    { pattern: /^\/fiscal\/observabilidade(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR'], description: 'Observabilidade fiscal' },
    { pattern: /^\/fiscal\/inutilizacoes(?:\/.*)?$/, anyOf: ['FISCAL_INUTILIZAR'], description: 'Inutilizações fiscais' },
    { pattern: /^\/fiscal(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_INUTILIZAR', 'FISCAL_CARTA_CORRECAO'], description: 'Fiscal' },
    { pattern: /^\/auditoria(?:\/.*)?$/, anyOf: ['AUDITORIA_CONSULTAR'], description: 'Auditoria' }
];

export const findRoutePermissionRule = (pathname: string) => routePermissionRules.find((rule) => rule.pattern.test(pathname));
