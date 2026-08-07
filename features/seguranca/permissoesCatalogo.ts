import { PermissionCode } from '@/types/erp';

export type PermissaoCatalogoItem = { grupo: string; label: string };

// Catálogo de permissões com rótulos amigáveis agrupados por módulo.
// É um Record<PermissionCode, …>: se uma permissão nova for adicionada ao union
// PermissionCode e não for catalogada aqui, o TypeScript acusa erro de compilação.
export const PERMISSOES_CATALOGO: Record<PermissionCode, PermissaoCatalogoItem> = {
    // Segurança
    SEGURANCA_USUARIOS_CONSULTAR: { grupo: 'Segurança', label: 'Usuários · Consultar' },
    SEGURANCA_USUARIOS_GERENCIAR: { grupo: 'Segurança', label: 'Usuários · Gerenciar' },
    SEGURANCA_PERMISSOES_GERENCIAR: { grupo: 'Segurança', label: 'Grupos de acesso · Gerenciar' },
    SEGURANCA_SESSOES_GERENCIAR: { grupo: 'Segurança', label: 'Sessões · Gerenciar' },
    // Administração
    ADMINISTRACAO_CONSULTAR: { grupo: 'Administração', label: 'Consultar' },
    ADMINISTRACAO_GERENCIAR: { grupo: 'Administração', label: 'Gerenciar' },
    // Auditoria / Atividades / Relatórios
    AUDITORIA_CONSULTAR: { grupo: 'Auditoria', label: 'Consultar' },
    ATIVIDADES_CONSULTAR: { grupo: 'Atividades', label: 'Consultar' },
    ATIVIDADES_GERENCIAR: { grupo: 'Atividades', label: 'Gerenciar' },
    RELATORIOS_CONSULTAR: { grupo: 'Relatórios', label: 'Consultar' },
    RELATORIOS_EXPORTAR: { grupo: 'Relatórios', label: 'Exportar' },
    // Cadastros
    PESSOAS_CONSULTAR: { grupo: 'Pessoas', label: 'Consultar' },
    PESSOAS_GERENCIAR: { grupo: 'Pessoas', label: 'Gerenciar' },
    CLIENTES_CONSULTAR: { grupo: 'Clientes', label: 'Consultar' },
    CLIENTES_GERENCIAR: { grupo: 'Clientes', label: 'Gerenciar' },
    FORNECEDORES_CONSULTAR: { grupo: 'Fornecedores', label: 'Consultar' },
    FORNECEDORES_GERENCIAR: { grupo: 'Fornecedores', label: 'Gerenciar' },
    PRODUTOS_CONSULTAR: { grupo: 'Produtos', label: 'Consultar' },
    PRODUTOS_GERENCIAR: { grupo: 'Produtos', label: 'Gerenciar' },
    PRODUTOS_INATIVAR: { grupo: 'Produtos', label: 'Inativar' },
    PRODUTOS_DADOS_FISCAIS_GERENCIAR: { grupo: 'Produtos', label: 'Dados fiscais · Gerenciar' },
    CATEGORIAS_PRODUTO_GERENCIAR: { grupo: 'Produtos', label: 'Categorias · Gerenciar' },
    UNIDADES_MEDIDA_GERENCIAR: { grupo: 'Produtos', label: 'Unidades de medida · Gerenciar' },
    MARCAS_GERENCIAR: { grupo: 'Produtos', label: 'Marcas · Gerenciar' },
    // Estoque
    ESTOQUE_CONSULTAR: { grupo: 'Estoque', label: 'Consultar' },
    ESTOQUE_MOVIMENTAR: { grupo: 'Estoque', label: 'Movimentar' },
    ESTOQUE_RESERVAR: { grupo: 'Estoque', label: 'Reservar' },
    ESTOQUE_AJUSTAR: { grupo: 'Estoque', label: 'Ajustar' },
    ESTOQUE_BLOQUEIO_GERENCIAR: { grupo: 'Estoque', label: 'Bloqueios · Gerenciar' },
    ESTOQUE_INVENTARIO_GERENCIAR: { grupo: 'Estoque', label: 'Inventário · Gerenciar' },
    LOCAIS_ESTOQUE_GERENCIAR: { grupo: 'Estoque', label: 'Locais · Gerenciar' },
    // Vendas / Tabelas de preço
    VENDAS_CONSULTAR: { grupo: 'Vendas', label: 'Consultar' },
    VENDAS_GERENCIAR: { grupo: 'Vendas', label: 'Gerenciar' },
    VENDAS_APROVAR: { grupo: 'Vendas', label: 'Aprovar' },
    VENDAS_CANCELAR: { grupo: 'Vendas', label: 'Cancelar' },
    VENDAS_FATURAR: { grupo: 'Vendas', label: 'Faturar' },
    TABELAS_PRECO_CONSULTAR: { grupo: 'Tabelas de preço', label: 'Consultar' },
    TABELAS_PRECO_GERENCIAR: { grupo: 'Tabelas de preço', label: 'Gerenciar' },
    // Financeiro
    FINANCEIRO_CONSULTAR: { grupo: 'Financeiro', label: 'Consultar' },
    FINANCEIRO_GERENCIAR: { grupo: 'Financeiro', label: 'Gerenciar' },
    FINANCEIRO_RECEBER: { grupo: 'Financeiro', label: 'Receber' },
    FINANCEIRO_PAGAR: { grupo: 'Financeiro', label: 'Pagar' },
    FINANCEIRO_ESTORNAR: { grupo: 'Financeiro', label: 'Estornar' },
    FINANCEIRO_CANCELAR: { grupo: 'Financeiro', label: 'Cancelar' },
    FINANCEIRO_FLUXO_CAIXA_CONSULTAR: { grupo: 'Financeiro', label: 'Fluxo de caixa · Consultar' },
    FORMAS_PAGAMENTO_GERENCIAR: { grupo: 'Financeiro', label: 'Formas de pagamento · Gerenciar' },
    CONDICOES_PAGAMENTO_GERENCIAR: { grupo: 'Financeiro', label: 'Condições de pagamento · Gerenciar' },
    // Compras
    COMPRAS_CONSULTAR: { grupo: 'Compras', label: 'Consultar' },
    COMPRAS_GERENCIAR: { grupo: 'Compras', label: 'Gerenciar' },
    COMPRAS_APROVAR: { grupo: 'Compras', label: 'Aprovar' },
    COMPRAS_CANCELAR: { grupo: 'Compras', label: 'Cancelar' },
    COMPRAS_RECEBER: { grupo: 'Compras', label: 'Receber' },
    COMPRAS_SOLICITACOES_CONSULTAR: { grupo: 'Compras', label: 'Solicitações · Consultar' },
    COMPRAS_SOLICITACOES_GERENCIAR: { grupo: 'Compras', label: 'Solicitações · Gerenciar' },
    COMPRAS_SOLICITACOES_APROVAR: { grupo: 'Compras', label: 'Solicitações · Aprovar' },
    COMPRAS_COTACOES_CONSULTAR: { grupo: 'Compras', label: 'Cotações · Consultar' },
    COMPRAS_COTACOES_GERENCIAR: { grupo: 'Compras', label: 'Cotações · Gerenciar' },
    COMPRAS_COTACOES_APROVAR: { grupo: 'Compras', label: 'Cotações · Aprovar' },
    COMPRAS_CONFERENCIA_FISCAL_REGISTRAR: { grupo: 'Compras', label: 'Conferência fiscal · Registrar' },
    // Fiscal
    FISCAL_CONSULTAR: { grupo: 'Fiscal', label: 'Consultar' },
    FISCAL_EXPORTAR: { grupo: 'Fiscal', label: 'Exportar' },
    FISCAL_GERENCIAR: { grupo: 'Fiscal', label: 'Gerenciar' },
    FISCAL_EMITIR: { grupo: 'Fiscal', label: 'Emitir' },
    FISCAL_CANCELAR: { grupo: 'Fiscal', label: 'Cancelar' },
    FISCAL_INUTILIZAR: { grupo: 'Fiscal', label: 'Inutilizar' },
    FISCAL_CARTA_CORRECAO: { grupo: 'Fiscal', label: 'Carta de correção' },
    FISCAL_REGRAS_CONSULTAR: { grupo: 'Fiscal', label: 'Regras de tributação · Consultar' },
    FISCAL_REGRAS_GERENCIAR: { grupo: 'Fiscal', label: 'Regras de tributação · Gerenciar' },
    FISCAL_CADASTROS_CONSULTAR: { grupo: 'Fiscal', label: 'Cadastros fiscais · Consultar' },
    // Notificações / Anexos
    NOTIFICACOES_CONSULTAR: { grupo: 'Notificações', label: 'Consultar' },
    NOTIFICACOES_GERENCIAR: { grupo: 'Notificações', label: 'Gerenciar' },
    ANEXOS_CONSULTAR: { grupo: 'Anexos', label: 'Consultar' },
    ANEXOS_BAIXAR: { grupo: 'Anexos', label: 'Baixar' },
    ANEXOS_GERENCIAR: { grupo: 'Anexos', label: 'Gerenciar' },
    // Serviços / PDV / Faturamento
    SERVICOS_CONSULTAR: { grupo: 'Serviços', label: 'Consultar' },
    SERVICOS_GERENCIAR: { grupo: 'Serviços', label: 'Gerenciar' },
    SERVICOS_APONTAR: { grupo: 'Serviços', label: 'Apontar' },
    SERVICOS_FATURAR: { grupo: 'Serviços', label: 'Faturar' },
    PDV_CONSULTAR: { grupo: 'PDV', label: 'Consultar' },
    PDV_CAIXA_GERENCIAR: { grupo: 'PDV', label: 'Caixa · Gerenciar' },
    PDV_VENDER: { grupo: 'PDV', label: 'Vender' },
    FATURAMENTO_CONSULTAR: { grupo: 'Faturamento', label: 'Consultar' },
    FATURAMENTO_PREPARAR: { grupo: 'Faturamento', label: 'Preparar' },
    FATURAMENTO_CONFIRMAR: { grupo: 'Faturamento', label: 'Confirmar' },
    FATURAMENTO_CANCELAR: { grupo: 'Faturamento', label: 'Cancelar' },
    // Frota / Portaria / Alimentar
    FROTA_CONSULTAR: { grupo: 'Frota', label: 'Consultar' },
    FROTA_GERENCIAR: { grupo: 'Frota', label: 'Gerenciar' },
    PORTARIA_CONSULTAR: { grupo: 'Portaria', label: 'Consultar' },
    PORTARIA_PRE_AUTORIZAR: { grupo: 'Portaria', label: 'Pré-autorizar' },
    PORTARIA_OPERAR: { grupo: 'Portaria', label: 'Operar' },
    ALIMENTAR_CONSULTAR: { grupo: 'Alimentar', label: 'Consultar' },
    ALIMENTAR_LOTES_GERENCIAR: { grupo: 'Alimentar', label: 'Lotes · Gerenciar' },
    ALIMENTAR_RECALL_GERENCIAR: { grupo: 'Alimentar', label: 'Recall · Gerenciar' },
    // RH
    RH_CONSULTAR: { grupo: 'RH', label: 'Consultar' },
    RH_GERENCIAR: { grupo: 'RH', label: 'Gerenciar' },
    RH_PONTO_REGISTRAR: { grupo: 'RH', label: 'Ponto · Registrar' },
    RH_EVENTOS_GERENCIAR: { grupo: 'RH', label: 'Eventos de folha · Gerenciar' },
    // Qualidade / Produção
    QUALIDADE_CONSULTAR: { grupo: 'Qualidade', label: 'Consultar' },
    QUALIDADE_INSPECIONAR: { grupo: 'Qualidade', label: 'Inspecionar' },
    QUALIDADE_NAO_CONFORMIDADE_GERENCIAR: { grupo: 'Qualidade', label: 'Não-conformidade · Gerenciar' },
    PRODUCAO_CONSULTAR: { grupo: 'Produção', label: 'Consultar' },
    PRODUCAO_FICHA_TECNICA_GERENCIAR: { grupo: 'Produção', label: 'Ficha técnica · Gerenciar' },
    PRODUCAO_ORDENS_GERENCIAR: { grupo: 'Produção', label: 'Ordens · Gerenciar' },
    PRODUCAO_ORDENS_LIBERAR: { grupo: 'Produção', label: 'Ordens · Liberar' },
    PRODUCAO_ORDENS_APONTAR: { grupo: 'Produção', label: 'Ordens · Apontar' },
    PRODUCAO_ORDENS_ENCERRAR: { grupo: 'Produção', label: 'Ordens · Encerrar' },
    PRODUCAO_ORDENS_CANCELAR: { grupo: 'Produção', label: 'Ordens · Cancelar' },
    // Contratos / CRM
    CONTRATOS_CONSULTAR: { grupo: 'Contratos', label: 'Consultar' },
    CONTRATOS_GERENCIAR: { grupo: 'Contratos', label: 'Gerenciar' },
    CONTRATOS_FATURAR: { grupo: 'Contratos', label: 'Faturar' },
    CRM_CONSULTAR: { grupo: 'CRM', label: 'Consultar' },
    CRM_LEADS_GERENCIAR: { grupo: 'CRM', label: 'Leads · Gerenciar' },
    CRM_OPORTUNIDADES_GERENCIAR: { grupo: 'CRM', label: 'Oportunidades · Gerenciar' },
    CRM_CONVERTER: { grupo: 'CRM', label: 'Converter em pedido' },
    CRM_PROPOSTAS_GERENCIAR: { grupo: 'CRM', label: 'Propostas · Gerenciar' },
    // Contábil / Patrimônio / Bancos
    CONTABIL_CONSULTAR: { grupo: 'Contábil', label: 'Consultar' },
    CONTABIL_PLANO_CONTAS_GERENCIAR: { grupo: 'Contábil', label: 'Plano de contas · Gerenciar' },
    CONTABIL_PERIODOS_GERENCIAR: { grupo: 'Contábil', label: 'Períodos · Gerenciar' },
    CONTABIL_LANCAMENTOS_GERENCIAR: { grupo: 'Contábil', label: 'Lançamentos · Gerenciar' },
    CONTABIL_LANCAMENTOS_ESTORNAR: { grupo: 'Contábil', label: 'Lançamentos · Estornar' },
    CONTABIL_REGRAS_GERENCIAR: { grupo: 'Contábil', label: 'Regras · Gerenciar' },
    PATRIMONIO_CONSULTAR: { grupo: 'Patrimônio', label: 'Consultar' },
    PATRIMONIO_BENS_GERENCIAR: { grupo: 'Patrimônio', label: 'Bens · Gerenciar' },
    PATRIMONIO_TRANSFERIR: { grupo: 'Patrimônio', label: 'Transferir' },
    PATRIMONIO_BAIXAR: { grupo: 'Patrimônio', label: 'Baixar' },
    PATRIMONIO_DEPRECIAR: { grupo: 'Patrimônio', label: 'Depreciar' },
    PATRIMONIO_INVENTARIO_GERENCIAR: { grupo: 'Patrimônio', label: 'Inventário · Gerenciar' },
    BANCOS_CONSULTAR: { grupo: 'Bancos', label: 'Consultar' },
    BANCOS_GERENCIAR: { grupo: 'Bancos', label: 'Gerenciar' },
    BOLETOS_GERAR: { grupo: 'Bancos', label: 'Boletos · Gerar' },
    BOLETOS_CANCELAR: { grupo: 'Bancos', label: 'Boletos · Cancelar' },
    CNAB_REMESSA_GERAR: { grupo: 'Bancos', label: 'CNAB · Gerar remessa' },
    CNAB_RETORNO_PROCESSAR: { grupo: 'Bancos', label: 'CNAB · Processar retorno' },
    // Deploy
    DEPLOY_CONSULTAR: { grupo: 'Deploy', label: 'Consultar' },
    DEPLOY_GERENCIAR: { grupo: 'Deploy', label: 'Gerenciar' }
};

export const TODAS_PERMISSOES = Object.keys(PERMISSOES_CATALOGO) as PermissionCode[];

export type PermissaoOptionGroup = { label: string; items: { label: string; value: PermissionCode }[] };

export const permissoesAgrupadas = (): PermissaoOptionGroup[] => {
    const grupos = new Map<string, { label: string; value: PermissionCode }[]>();
    for (const codigo of TODAS_PERMISSOES) {
        const item = PERMISSOES_CATALOGO[codigo];
        const lista = grupos.get(item.grupo) ?? [];
        lista.push({ label: item.label, value: codigo });
        grupos.set(item.grupo, lista);
    }
    return Array.from(grupos.entries()).map(([label, items]) => ({ label, items }));
};

export const permissaoLabel = (codigo: PermissionCode) => {
    const item = PERMISSOES_CATALOGO[codigo];
    return item ? `${item.grupo} · ${item.label}` : codigo;
};
