import { PermissionCode } from '@/types/erp';

export type RoutePermissionRule = {
    pattern: RegExp;
    anyOf: PermissionCode[];
    description: string;
};

export const routePermissionRules: RoutePermissionRule[] = [
    { pattern: /^\/seguranca\/usuarios(?:\/.*)?$/, anyOf: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR'], description: 'Usuários' },
    { pattern: /^\/seguranca\/grupos-acesso(?:\/.*)?$/, anyOf: ['SEGURANCA_PERMISSOES_GERENCIAR'], description: 'Grupos de acesso' },
    { pattern: /^\/administracao\/deploy(?:\/.*)?$/, anyOf: ['DEPLOY_CONSULTAR', 'DEPLOY_GERENCIAR'], description: 'Deploy / Ambiente' },
    { pattern: /^\/administracao(?:\/.*)?$/, anyOf: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'], description: 'Administração' },
    { pattern: /^\/pessoas(?:\/.*)?$/, anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'], description: 'Pessoas' },
    { pattern: /^\/clientes(?:\/.*)?$/, anyOf: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR'], description: 'Clientes' },
    { pattern: /^\/fornecedores(?:\/.*)?$/, anyOf: ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'], description: 'Fornecedores' },
    { pattern: /^\/produtos(?:\/.*)?$/, anyOf: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR', 'CATEGORIAS_PRODUTO_GERENCIAR', 'UNIDADES_MEDIDA_GERENCIAR', 'MARCAS_GERENCIAR'], description: 'Produtos e catálogo' },
    { pattern: /^\/estoque\/entradas(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Entradas de estoque' },
    { pattern: /^\/estoque\/saidas(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Saídas de estoque' },
    { pattern: /^\/estoque\/ajustes(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Ajustes de estoque' },
    { pattern: /^\/estoque\/transferencias(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Transferências de estoque' },
    { pattern: /^\/estoque\/bloqueios(?:\/.*)?$/, anyOf: ['ESTOQUE_MOVIMENTAR'], description: 'Bloqueios de estoque' },
    { pattern: /^\/estoque\/reservas(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_RESERVAR'], description: 'Reservas de estoque' },
    { pattern: /^\/estoque\/inventarios(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR'], description: 'Inventários de estoque' },
    { pattern: /^\/estoque\/avancado(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR', 'ESTOQUE_AJUSTAR', 'ESTOQUE_BLOQUEIO_GERENCIAR'], description: 'Estoque avançado' },
    { pattern: /^\/estoque(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR', 'ESTOQUE_MOVIMENTAR', 'ESTOQUE_RESERVAR', 'ESTOQUE_INVENTARIO_GERENCIAR'], description: 'Estoque' },
    { pattern: /^\/tabelas-preco(?:\/.*)?$/, anyOf: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR', 'VENDAS_CONSULTAR', 'VENDAS_GERENCIAR'], description: 'Tabelas de preço' },
    { pattern: /^\/vendas(?:\/.*)?$/, anyOf: ['VENDAS_CONSULTAR', 'VENDAS_GERENCIAR', 'VENDAS_APROVAR', 'VENDAS_CANCELAR', 'VENDAS_FATURAR'], description: 'Vendas' },
    { pattern: /^\/financeiro\/contas-receber(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Contas a receber' },
    { pattern: /^\/financeiro\/contas-pagar(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Contas a pagar' },
    { pattern: /^\/financeiro\/fluxo-caixa(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR'], description: 'Fluxo de caixa' },
    { pattern: /^\/financeiro\/avancado(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR', 'FINANCEIRO_FLUXO_CAIXA_CONSULTAR'], description: 'Financeiro avançado' },
    { pattern: /^\/financeiro\/formas-pagamento(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FORMAS_PAGAMENTO_GERENCIAR'], description: 'Formas de pagamento' },
    { pattern: /^\/financeiro\/condicoes-pagamento(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR'], description: 'Condições de pagamento' },
    { pattern: /^\/financeiro(?:\/.*)?$/, anyOf: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'], description: 'Financeiro' },
    { pattern: /^\/compras\/solicitacoes(?:\/.*)?$/, anyOf: ['COMPRAS_SOLICITACOES_CONSULTAR', 'COMPRAS_SOLICITACOES_GERENCIAR', 'COMPRAS_SOLICITACOES_APROVAR'], description: 'Solicitações de compra' },
    { pattern: /^\/compras\/cotacoes(?:\/.*)?$/, anyOf: ['COMPRAS_COTACOES_CONSULTAR', 'COMPRAS_COTACOES_GERENCIAR', 'COMPRAS_COTACOES_APROVAR'], description: 'Cotações de compra' },
    { pattern: /^\/compras\/recebimentos(?:\/.*)?$/, anyOf: ['COMPRAS_CONSULTAR', 'COMPRAS_CONFERENCIA_FISCAL_REGISTRAR'], description: 'Recebimentos e conferência fiscal' },
    { pattern: /^\/compras(?:\/.*)?$/, anyOf: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR', 'COMPRAS_APROVAR', 'COMPRAS_CANCELAR', 'COMPRAS_RECEBER'], description: 'Compras' },
    { pattern: /^\/fiscal\/notas(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_CARTA_CORRECAO'], description: 'Notas fiscais' },
    { pattern: /^\/fiscal\/observabilidade(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR'], description: 'Observabilidade fiscal' },
    { pattern: /^\/fiscal\/inutilizacoes(?:\/.*)?$/, anyOf: ['FISCAL_INUTILIZAR'], description: 'Inutilizações fiscais' },
    { pattern: /^\/fiscal\/simulador(?:\/.*)?$/, anyOf: ['FISCAL_REGRAS_CONSULTAR'], description: 'Simulador de tributação' },
    { pattern: /^\/fiscal\/regras(?:\/.*)?$/, anyOf: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'], description: 'Regras fiscais' },
    { pattern: /^\/fiscal\/excecoes-ncm(?:\/.*)?$/, anyOf: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'], description: 'Exceções fiscais por NCM' },
    { pattern: /^\/fiscal\/excecoes(?:\/.*)?$/, anyOf: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'], description: 'Exceções e benefícios fiscais' },
    { pattern: /^\/fiscal(?:\/.*)?$/, anyOf: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_INUTILIZAR', 'FISCAL_CARTA_CORRECAO'], description: 'Fiscal' },
    { pattern: /^\/pdv(?:\/.*)?$/, anyOf: ['PDV_CONSULTAR', 'PDV_CAIXA_GERENCIAR', 'PDV_VENDER'], description: 'PDV (Caixa e Venda)' },
    { pattern: /^\/faturamento(?:\/.*)?$/, anyOf: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR', 'FATURAMENTO_CONFIRMAR', 'FATURAMENTO_CANCELAR'], description: 'Faturamento' },
    { pattern: /^\/servicos(?:\/.*)?$/, anyOf: ['SERVICOS_CONSULTAR', 'SERVICOS_GERENCIAR', 'SERVICOS_APONTAR', 'SERVICOS_FATURAR'], description: 'Serviços (Ordem de Serviço)' },
    { pattern: /^\/frota(?:\/.*)?$/, anyOf: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'], description: 'Frota (veículos, motoristas, viagens)' },
    { pattern: /^\/portaria(?:\/.*)?$/, anyOf: ['PORTARIA_CONSULTAR', 'PORTARIA_PRE_AUTORIZAR', 'PORTARIA_OPERAR'], description: 'Portaria (controle de acesso)' },
    { pattern: /^\/alimentar(?:\/.*)?$/, anyOf: ['ALIMENTAR_CONSULTAR', 'ALIMENTAR_LOTES_GERENCIAR', 'ALIMENTAR_RECALL_GERENCIAR'], description: 'Alimentar (lotes e recall)' },
    { pattern: /^\/rh(?:\/.*)?$/, anyOf: ['RH_CONSULTAR', 'RH_GERENCIAR', 'RH_PONTO_REGISTRAR', 'RH_EVENTOS_GERENCIAR'], description: 'RH (colaboradores, ponto, ausências, benefícios, eventos)' },
    { pattern: /^\/qualidade(?:\/.*)?$/, anyOf: ['QUALIDADE_CONSULTAR', 'QUALIDADE_INSPECIONAR', 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR'], description: 'Qualidade (inspeções e não-conformidades)' },
    { pattern: /^\/producao(?:\/.*)?$/, anyOf: ['PRODUCAO_CONSULTAR', 'PRODUCAO_FICHA_TECNICA_GERENCIAR', 'PRODUCAO_ORDENS_GERENCIAR', 'PRODUCAO_ORDENS_LIBERAR', 'PRODUCAO_ORDENS_APONTAR', 'PRODUCAO_ORDENS_ENCERRAR', 'PRODUCAO_ORDENS_CANCELAR'], description: 'Produção (fichas técnicas e ordens de produção)' },
    { pattern: /^\/contratos(?:\/.*)?$/, anyOf: ['CONTRATOS_CONSULTAR', 'CONTRATOS_GERENCIAR', 'CONTRATOS_FATURAR'], description: 'Contratos (faturamento recorrente e por consumo)' },
    { pattern: /^\/crm(?:\/.*)?$/, anyOf: ['CRM_CONSULTAR', 'CRM_LEADS_GERENCIAR', 'CRM_OPORTUNIDADES_GERENCIAR', 'CRM_CONVERTER', 'CRM_PROPOSTAS_GERENCIAR'], description: 'CRM (leads, oportunidades e propostas)' },
    { pattern: /^\/contabil(?:\/.*)?$/, anyOf: ['CONTABIL_CONSULTAR', 'CONTABIL_PLANO_CONTAS_GERENCIAR', 'CONTABIL_PERIODOS_GERENCIAR', 'CONTABIL_LANCAMENTOS_GERENCIAR', 'CONTABIL_LANCAMENTOS_ESTORNAR', 'CONTABIL_REGRAS_GERENCIAR'], description: 'Contábil (plano de contas, períodos, lançamentos, regras)' },
    { pattern: /^\/patrimonio(?:\/.*)?$/, anyOf: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_BENS_GERENCIAR', 'PATRIMONIO_TRANSFERIR', 'PATRIMONIO_BAIXAR', 'PATRIMONIO_DEPRECIAR', 'PATRIMONIO_INVENTARIO_GERENCIAR'], description: 'Patrimônio (bens, depreciação e inventário)' },
    { pattern: /^\/bancos(?:\/.*)?$/, anyOf: ['BANCOS_CONSULTAR', 'BANCOS_GERENCIAR', 'BOLETOS_GERAR', 'BOLETOS_CANCELAR', 'CNAB_REMESSA_GERAR', 'CNAB_RETORNO_PROCESSAR'], description: 'Bancos, boletos e CNAB' },
    { pattern: /^\/atividades(?:\/.*)?$/, anyOf: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_GERENCIAR'], description: 'Atividades' },
    { pattern: /^\/relatorios(?:\/.*)?$/, anyOf: ['RELATORIOS_CONSULTAR'], description: 'Relatórios' },
    { pattern: /^\/auditoria(?:\/.*)?$/, anyOf: ['AUDITORIA_CONSULTAR'], description: 'Auditoria' }
];

export const findRoutePermissionRule = (pathname: string) => routePermissionRules.find((rule) => rule.pattern.test(pathname));
