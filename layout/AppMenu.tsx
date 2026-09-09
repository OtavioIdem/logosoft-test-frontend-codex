import React, { useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import AppMenuitem from './AppMenuitem';
import { MenuProvider } from './context/menucontext';
import { AppMenuItem } from '@/types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

const normalizeSearchValue = (value?: string) =>
    (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const itemMatchesSearch = (item: AppMenuItem, term: string) => {
    const searchableText = [item.label, item.to, item.url].filter(Boolean).join(' ');
    return normalizeSearchValue(searchableText).includes(term);
};

const filterMenuBySearch = (items: AppMenuItem[], term: string): AppMenuItem[] => {
    if (!term) {
        return items;
    }

    return items
        .map((item) => {
            const childMatches = item.items ? filterMenuBySearch(item.items, term) : undefined;

            if (itemMatchesSearch(item, term)) {
                return item;
            }

            if (childMatches?.length) {
                return { ...item, items: childMatches };
            }

            return null;
        })
        .filter((item): item is AppMenuItem => Boolean(item));
};

const AppMenu = () => {
    const permissions = usePermissions();
    const [menuSearch, setMenuSearch] = useState('');

    const model = useMemo<AppMenuItem[]>(
        () => [
            {
                label: 'Dashboard',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' }]
            },
            {
                label: 'Segurança',
                anyPermissions: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR', 'SEGURANCA_PERMISSOES_GERENCIAR', 'SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR'],
                items: [
                    { label: 'Usuários', icon: 'pi pi-fw pi-users', to: '/seguranca/usuarios', anyPermissions: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR'] },
                    { label: 'Grupos de acesso', icon: 'pi pi-fw pi-shield', to: '/seguranca/grupos-acesso', anyPermissions: ['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR'] }
                ]
            },
            {
                label: 'Administração',
                anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'],
                items: [
                    { label: 'Empresas', icon: 'pi pi-fw pi-building', to: '/administracao/empresas', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
                    { label: 'Filiais', icon: 'pi pi-fw pi-map-marker', to: '/administracao/filiais', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
                    { label: 'Setores', icon: 'pi pi-fw pi-sitemap', to: '/administracao/setores', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
                    { label: 'Cargos', icon: 'pi pi-fw pi-id-card', to: '/administracao/cargos', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
                    { label: 'Centros de custo', icon: 'pi pi-fw pi-wallet', to: '/administracao/centros-custo', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] }
                ]
            },
            {
                label: 'Cadastros',
                anyPermissions: ['PESSOAS_CONSULTAR', 'CLIENTES_CONSULTAR', 'FORNECEDORES_CONSULTAR', 'PRODUTOS_CONSULTAR'],
                items: [
                    { label: 'Pessoas', icon: 'pi pi-fw pi-address-book', to: '/pessoas', anyPermissions: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'] },
                    { label: 'Clientes', icon: 'pi pi-fw pi-user-plus', to: '/clientes', anyPermissions: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR'] },
                    { label: 'Fornecedores', icon: 'pi pi-fw pi-truck', to: '/fornecedores', anyPermissions: ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'] },
                    { label: 'Produtos', icon: 'pi pi-fw pi-box', to: '/produtos', anyPermissions: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'] },
                    { label: 'Categorias', icon: 'pi pi-fw pi-tags', to: '/produtos/categorias', anyPermissions: ['PRODUTOS_CONSULTAR', 'CATEGORIAS_PRODUTO_GERENCIAR'] },
                    { label: 'Unidades de medida', icon: 'pi pi-fw pi-sort-numeric-up', to: '/produtos/unidades-medida', anyPermissions: ['PRODUTOS_CONSULTAR', 'UNIDADES_MEDIDA_GERENCIAR'] },
                    { label: 'Marcas', icon: 'pi pi-fw pi-star', to: '/produtos/marcas', anyPermissions: ['PRODUTOS_CONSULTAR', 'MARCAS_GERENCIAR'] }
                ]
            },
            {
                label: 'Estoque',
                anyPermissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_MOVIMENTAR', 'ESTOQUE_RESERVAR', 'ESTOQUE_INVENTARIO_GERENCIAR'],
                items: [
                    { label: 'Locais de estoque', icon: 'pi pi-fw pi-warehouse', to: '/estoque/locais', anyPermissions: ['ESTOQUE_CONSULTAR', 'LOCAIS_ESTOQUE_GERENCIAR'] },
                    { label: 'Saldos', icon: 'pi pi-fw pi-database', to: '/estoque/saldos', permission: 'ESTOQUE_CONSULTAR' },
                    { label: 'Movimentos', icon: 'pi pi-fw pi-list', to: '/estoque/movimentos', permission: 'ESTOQUE_CONSULTAR' },
                    { label: 'Entradas', icon: 'pi pi-fw pi-arrow-circle-down', to: '/estoque/entradas', permission: 'ESTOQUE_MOVIMENTAR' },
                    { label: 'Saídas', icon: 'pi pi-fw pi-arrow-circle-up', to: '/estoque/saidas', permission: 'ESTOQUE_MOVIMENTAR' },
                    { label: 'Transferências', icon: 'pi pi-fw pi-send', to: '/estoque/transferencias', permission: 'ESTOQUE_MOVIMENTAR' },
                    { label: 'Ajustes', icon: 'pi pi-fw pi-sliders-h', to: '/estoque/ajustes', permission: 'ESTOQUE_MOVIMENTAR' },
                    { label: 'Bloqueios', icon: 'pi pi-fw pi-lock', to: '/estoque/bloqueios', permission: 'ESTOQUE_MOVIMENTAR' },
                    { label: 'Reservas', icon: 'pi pi-fw pi-bookmark', to: '/estoque/reservas', anyPermissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_RESERVAR'] },
                    { label: 'Inventários', icon: 'pi pi-fw pi-clipboard', to: '/estoque/inventarios', anyPermissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR'] },
                    { label: 'Estoque avançado', icon: 'pi pi-fw pi-sliders-v', to: '/estoque/avancado', anyPermissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR', 'ESTOQUE_AJUSTAR', 'ESTOQUE_BLOQUEIO_GERENCIAR'] }
                ]
            },
            {
                label: 'Vendas',
                anyPermissions: ['VENDAS_CONSULTAR', 'VENDAS_GERENCIAR', 'TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR'],
                items: [
                    { label: 'Pedidos de venda', icon: 'pi pi-fw pi-shopping-cart', to: '/vendas/pedidos', anyPermissions: ['VENDAS_CONSULTAR', 'VENDAS_GERENCIAR'] },
                    { label: 'Tabelas de preço', icon: 'pi pi-fw pi-tags', to: '/tabelas-preco', anyPermissions: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR', 'VENDAS_CONSULTAR', 'VENDAS_GERENCIAR'] }
                ]
            },
            {
                label: 'Financeiro',
                anyPermissions: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_PAGAR'],
                items: [
                    { label: 'Contas a receber', icon: 'pi pi-fw pi-arrow-down-left', to: '/financeiro/contas-receber', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_RECEBER'] },
                    { label: 'Contas a pagar', icon: 'pi pi-fw pi-arrow-up-right', to: '/financeiro/contas-pagar', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_PAGAR'] },
                    { label: 'Fluxo de caixa', icon: 'pi pi-fw pi-chart-line', to: '/financeiro/fluxo-caixa', permission: 'FINANCEIRO_CONSULTAR' },
                    { label: 'Financeiro avançado', icon: 'pi pi-fw pi-money-bill', to: '/financeiro/avancado', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_FLUXO_CAIXA_CONSULTAR'] },
                    { label: 'Formas de pagamento', icon: 'pi pi-fw pi-credit-card', to: '/financeiro/formas-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FORMAS_PAGAMENTO_GERENCIAR'] },
                    { label: 'Condições de pagamento', icon: 'pi pi-fw pi-calendar-plus', to: '/financeiro/condicoes-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR'] }
                ]
            },
            {
                label: 'Compras',
                anyPermissions: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR', 'COMPRAS_SOLICITACOES_CONSULTAR', 'COMPRAS_COTACOES_CONSULTAR'],
                items: [
                    { label: 'Pedidos de compra', icon: 'pi pi-fw pi-shopping-bag', to: '/compras/pedidos', anyPermissions: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR'] },
                    { label: 'Solicitações', icon: 'pi pi-fw pi-file-edit', to: '/compras/solicitacoes', anyPermissions: ['COMPRAS_SOLICITACOES_CONSULTAR', 'COMPRAS_SOLICITACOES_GERENCIAR'] },
                    { label: 'Cotações', icon: 'pi pi-fw pi-dollar', to: '/compras/cotacoes', anyPermissions: ['COMPRAS_COTACOES_CONSULTAR', 'COMPRAS_COTACOES_GERENCIAR'] },
                    { label: 'Recebimentos', icon: 'pi pi-fw pi-inbox', to: '/compras/recebimentos', anyPermissions: ['COMPRAS_CONSULTAR', 'COMPRAS_CONFERENCIA_FISCAL_REGISTRAR'] }
                ]
            },
            {
                label: 'Fiscal',
                anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_INUTILIZAR', 'FISCAL_CARTA_CORRECAO', 'FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'],
                items: [
                    { label: 'Notas fiscais', icon: 'pi pi-fw pi-file', to: '/fiscal/notas', anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR'] },
                    { label: 'Simulador de tributação', icon: 'pi pi-fw pi-calculator', to: '/fiscal/simulador', permission: 'FISCAL_REGRAS_CONSULTAR' },
                    { label: 'Regras fiscais', icon: 'pi pi-fw pi-sliders-h', to: '/fiscal/regras', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },
                    { label: 'Exceções e benefícios', icon: 'pi pi-fw pi-percentage', to: '/fiscal/excecoes', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },
                    { label: 'Exceções por NCM', icon: 'pi pi-fw pi-tags', to: '/fiscal/excecoes-ncm', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },
                    { label: 'Observabilidade', icon: 'pi pi-fw pi-chart-line', to: '/fiscal/observabilidade', permission: 'FISCAL_CONSULTAR' },
                    { label: 'Inutilizações', icon: 'pi pi-fw pi-ban', to: '/fiscal/inutilizacoes', permission: 'FISCAL_INUTILIZAR' }
                ]
            },
            {
                label: 'PDV',
                anyPermissions: ['PDV_CONSULTAR', 'PDV_CAIXA_GERENCIAR', 'PDV_VENDER'],
                items: [
                    { label: 'Caixas', icon: 'pi pi-fw pi-wallet', to: '/pdv/caixas', anyPermissions: ['PDV_CONSULTAR', 'PDV_CAIXA_GERENCIAR'] },
                    { label: 'Venda', icon: 'pi pi-fw pi-shopping-cart', to: '/pdv/vendas', anyPermissions: ['PDV_CONSULTAR', 'PDV_VENDER'] }
                ]
            },
            {
                label: 'Faturamento',
                anyPermissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR', 'FATURAMENTO_CONFIRMAR', 'FATURAMENTO_CANCELAR'],
                items: [{ label: 'Faturamentos', icon: 'pi pi-fw pi-file-export', to: '/faturamento', anyPermissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR'] }]
            },
            {
                label: 'Serviços',
                anyPermissions: ['SERVICOS_CONSULTAR', 'SERVICOS_GERENCIAR', 'SERVICOS_APONTAR', 'SERVICOS_FATURAR'],
                items: [{ label: 'Ordens de serviço', icon: 'pi pi-fw pi-wrench', to: '/servicos/ordens', anyPermissions: ['SERVICOS_CONSULTAR', 'SERVICOS_GERENCIAR'] }]
            },
            {
                label: 'Frota',
                anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'],
                items: [
                    { label: 'Veículos', icon: 'pi pi-fw pi-car', to: '/frota/veiculos', anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'] },
                    { label: 'Motoristas', icon: 'pi pi-fw pi-user', to: '/frota/motoristas', anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'] },
                    { label: 'Viagens', icon: 'pi pi-fw pi-map', to: '/frota/viagens', anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'] }
                ]
            },
            {
                label: 'Portaria',
                anyPermissions: ['PORTARIA_CONSULTAR', 'PORTARIA_PREAUTORIZAR', 'PORTARIA_OPERAR'],
                items: [{ label: 'Controle de acesso', icon: 'pi pi-fw pi-id-card', to: '/portaria', anyPermissions: ['PORTARIA_CONSULTAR', 'PORTARIA_PREAUTORIZAR', 'PORTARIA_OPERAR'] }]
            },
            {
                label: 'Alimentar',
                anyPermissions: ['ALIMENTAR_CONSULTAR', 'ALIMENTAR_LOTES_GERENCIAR', 'ALIMENTAR_RECALL_GERENCIAR'],
                items: [
                    { label: 'Lotes', icon: 'pi pi-fw pi-box', to: '/alimentar/lotes', anyPermissions: ['ALIMENTAR_CONSULTAR', 'ALIMENTAR_LOTES_GERENCIAR'] },
                    { label: 'Recalls', icon: 'pi pi-fw pi-exclamation-circle', to: '/alimentar/recalls', anyPermissions: ['ALIMENTAR_CONSULTAR', 'ALIMENTAR_RECALL_GERENCIAR'] }
                ]
            },
            {
                label: 'RH',
                anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR', 'RH_PONTO_REGISTRAR', 'RH_EVENTOS_GERENCIAR'],
                items: [
                    { label: 'Colaboradores', icon: 'pi pi-fw pi-users', to: '/rh/colaboradores', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
                    { label: 'Jornadas', icon: 'pi pi-fw pi-clock', to: '/rh/jornadas', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
                    { label: 'Ponto', icon: 'pi pi-fw pi-stopwatch', to: '/rh/ponto', anyPermissions: ['RH_CONSULTAR', 'RH_PONTO_REGISTRAR'] },
                    { label: 'Ausências', icon: 'pi pi-fw pi-calendar-times', to: '/rh/ausencias', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
                    { label: 'Benefícios', icon: 'pi pi-fw pi-gift', to: '/rh/beneficios', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
                    { label: 'Eventos de folha', icon: 'pi pi-fw pi-file-edit', to: '/rh/eventos', anyPermissions: ['RH_CONSULTAR', 'RH_EVENTOS_GERENCIAR'] }
                ]
            },
            {
                label: 'Qualidade',
                anyPermissions: ['QUALIDADE_CONSULTAR', 'QUALIDADE_INSPECIONAR', 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR'],
                items: [
                    { label: 'Inspeções', icon: 'pi pi-fw pi-verified', to: '/qualidade/inspecoes', anyPermissions: ['QUALIDADE_CONSULTAR', 'QUALIDADE_INSPECIONAR'] },
                    { label: 'Não-conformidades', icon: 'pi pi-fw pi-exclamation-triangle', to: '/qualidade/nao-conformidades', anyPermissions: ['QUALIDADE_CONSULTAR', 'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR'] }
                ]
            },
            {
                label: 'Produção',
                anyPermissions: ['PRODUCAO_CONSULTAR', 'PRODUCAO_FICHA_TECNICA_GERENCIAR', 'PRODUCAO_ORDENS_GERENCIAR', 'PRODUCAO_ORDENS_LIBERAR', 'PRODUCAO_ORDENS_APONTAR', 'PRODUCAO_ORDENS_ENCERRAR', 'PRODUCAO_ORDENS_CANCELAR'],
                items: [
                    { label: 'Fichas técnicas', icon: 'pi pi-fw pi-sitemap', to: '/producao/fichas-tecnicas', anyPermissions: ['PRODUCAO_CONSULTAR', 'PRODUCAO_FICHA_TECNICA_GERENCIAR'] },
                    { label: 'Ordens de produção', icon: 'pi pi-fw pi-briefcase', to: '/producao/ordens', anyPermissions: ['PRODUCAO_CONSULTAR', 'PRODUCAO_ORDENS_GERENCIAR'] }
                ]
            },
            {
                label: 'CRM',
                anyPermissions: ['CRM_CONSULTAR', 'CRM_LEADS_GERENCIAR', 'CRM_OPORTUNIDADES_GERENCIAR', 'CRM_CONVERTER', 'CRM_PROPOSTAS_GERENCIAR'],
                items: [
                    { label: 'Leads', icon: 'pi pi-fw pi-filter', to: '/crm/leads', anyPermissions: ['CRM_CONSULTAR', 'CRM_LEADS_GERENCIAR'] },
                    { label: 'Oportunidades', icon: 'pi pi-fw pi-chart-line', to: '/crm/oportunidades', anyPermissions: ['CRM_CONSULTAR', 'CRM_OPORTUNIDADES_GERENCIAR'] },
                    { label: 'Propostas', icon: 'pi pi-fw pi-file-edit', to: '/crm/propostas', anyPermissions: ['CRM_CONSULTAR', 'CRM_PROPOSTAS_GERENCIAR'] }
                ]
            },
            {
                label: 'Contratos',
                anyPermissions: ['CONTRATOS_CONSULTAR', 'CONTRATOS_GERENCIAR', 'CONTRATOS_FATURAR'],
                items: [{ label: 'Contratos', icon: 'pi pi-fw pi-file-o', to: '/contratos', anyPermissions: ['CONTRATOS_CONSULTAR', 'CONTRATOS_GERENCIAR'] }]
            },
            {
                label: 'Atividades',
                anyPermissions: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_CRIAR', 'ATIVIDADES_ATUALIZAR', 'ATIVIDADES_CANCELAR', 'ATIVIDADES_COMENTAR', 'ATIVIDADES_ATRIBUIR'],
                items: [{ label: 'Workflow operacional', icon: 'pi pi-fw pi-check-square', to: '/atividades', anyPermissions: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_CRIAR', 'ATIVIDADES_ATUALIZAR', 'ATIVIDADES_CANCELAR', 'ATIVIDADES_COMENTAR', 'ATIVIDADES_ATRIBUIR'] }]
            },
            {
                label: 'Contábil',
                anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_PLANO_CONTAS_GERENCIAR', 'CONTABIL_PERIODOS_GERENCIAR', 'CONTABIL_LANCAMENTOS_GERENCIAR', 'CONTABIL_LANCAMENTOS_ESTORNAR', 'CONTABIL_REGRAS_GERENCIAR'],
                items: [
                    { label: 'Plano de contas', icon: 'pi pi-fw pi-sitemap', to: '/contabil/plano-contas', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_PLANO_CONTAS_GERENCIAR'] },
                    { label: 'Períodos', icon: 'pi pi-fw pi-calendar', to: '/contabil/periodos', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_PERIODOS_GERENCIAR'] },
                    { label: 'Lançamentos', icon: 'pi pi-fw pi-book', to: '/contabil/lancamentos', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_LANCAMENTOS_GERENCIAR'] },
                    { label: 'Regras de contabilização', icon: 'pi pi-fw pi-sliders-h', to: '/contabil/regras', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_REGRAS_GERENCIAR'] }
                ]
            },
            {
                label: 'Bancos',
                anyPermissions: ['BANCOS_CONSULTAR', 'BANCOS_GERENCIAR', 'BOLETOS_GERAR', 'BOLETOS_CANCELAR', 'CNAB_REMESSA_GERAR', 'CNAB_RETORNO_PROCESSAR'],
                items: [
                    { label: 'Boletos', icon: 'pi pi-fw pi-credit-card', to: '/bancos/boletos', anyPermissions: ['BANCOS_CONSULTAR', 'BOLETOS_GERAR'] },
                    { label: 'CNAB', icon: 'pi pi-fw pi-sync', to: '/bancos/cnab', anyPermissions: ['BANCOS_CONSULTAR', 'CNAB_REMESSA_GERAR', 'CNAB_RETORNO_PROCESSAR'] }
                ]
            },
            {
                label: 'Patrimônio',
                anyPermissions: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_BENS_GERENCIAR', 'PATRIMONIO_TRANSFERIR', 'PATRIMONIO_BAIXAR', 'PATRIMONIO_DEPRECIAR', 'PATRIMONIO_INVENTARIO_GERENCIAR'],
                items: [
                    { label: 'Bens', icon: 'pi pi-fw pi-building', to: '/patrimonio/bens', anyPermissions: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_BENS_GERENCIAR'] },
                    { label: 'Depreciação', icon: 'pi pi-fw pi-chart-line', to: '/patrimonio/depreciacao', anyPermissions: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_DEPRECIAR'] },
                    { label: 'Inventário', icon: 'pi pi-fw pi-clipboard', to: '/patrimonio/inventarios', anyPermissions: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_INVENTARIO_GERENCIAR'] }
                ]
            },
            {
                label: 'Relatórios',
                anyPermissions: ['RELATORIOS_OPERACIONAIS_CONSULTAR', 'RELATORIOS_VENDAS_CONSULTAR', 'RELATORIOS_COMPRAS_CONSULTAR', 'RELATORIOS_FINANCEIRO_CONSULTAR', 'RELATORIOS_ESTOQUE_CONSULTAR', 'RELATORIOS_FISCAL_CONSULTAR', 'RELATORIOS_PRODUCAO_CONSULTAR', 'RELATORIOS_DASHBOARD_CONSULTAR', 'RELATORIOS_EXPORTAR'],
                items: [{ label: 'Operacionais e gerenciais', icon: 'pi pi-fw pi-chart-bar', to: '/relatorios', anyPermissions: ['RELATORIOS_OPERACIONAIS_CONSULTAR', 'RELATORIOS_VENDAS_CONSULTAR', 'RELATORIOS_COMPRAS_CONSULTAR', 'RELATORIOS_FINANCEIRO_CONSULTAR', 'RELATORIOS_ESTOQUE_CONSULTAR', 'RELATORIOS_FISCAL_CONSULTAR', 'RELATORIOS_PRODUCAO_CONSULTAR', 'RELATORIOS_DASHBOARD_CONSULTAR', 'RELATORIOS_EXPORTAR'] }]
            },
            {
                label: 'Auditoria',
                permission: 'AUDITORIA_CONSULTAR',
                items: [
                    { label: 'Auditoria operacional', icon: 'pi pi-fw pi-search', to: '/auditoria/operacional', permission: 'AUDITORIA_CONSULTAR' },
                    { label: 'Eventos de auditoria', icon: 'pi pi-fw pi-history', to: '/auditoria/eventos', permission: 'AUDITORIA_CONSULTAR' }
                ]
            },
            {
                label: 'Deploy',
                anyPermissions: ['DEPLOY_CONSULTAR', 'DEPLOY_GERENCIAR'],
                items: [{ label: 'Deploy / Ambiente', icon: 'pi pi-fw pi-server', to: '/administracao/deploy', anyPermissions: ['DEPLOY_CONSULTAR', 'DEPLOY_GERENCIAR'] }]
            }
        ],
        []
    );

    const isVisible = (item: AppMenuItem) => permissions.hasPermission(item.permission) && permissions.hasAnyPermission(item.anyPermissions) && permissions.hasAllPermissions(item.allPermissions);

    const filterMenu = (items: AppMenuItem[]): AppMenuItem[] =>
        items
            .map((item) => ({ ...item, items: item.items ? filterMenu(item.items) : undefined }))
            .filter((item) => isVisible(item) && (!item.items || item.items.length > 0));

    const visibleModel = filterMenu(model);
    const searchTerm = normalizeSearchValue(menuSearch);
    const filteredModel = filterMenuBySearch(visibleModel, searchTerm);

    return (
        <MenuProvider>
            <div className="layout-menu-search">
                <span className="p-input-icon-left w-full">
                    <i className="pi pi-search" aria-hidden="true" />
                    <InputText
                        value={menuSearch}
                        onChange={(event) => setMenuSearch(event.target.value)}
                        placeholder="Buscar tela ou módulo"
                        aria-label="Buscar tela ou módulo no menu"
                        className="w-full"
                    />
                </span>
            </div>
            <ul className="layout-menu">
                {filteredModel.length > 0 ? (
                    filteredModel.map((item, i) => {
                        return !item?.seperator ? <AppMenuitem item={item} root={true} index={i} key={item.label} /> : <li className="menu-separator" key={i}></li>;
                    })
                ) : (
                    <li className="layout-menu-empty">Nenhuma tela encontrada.</li>
                )}
            </ul>
        </MenuProvider>
    );
};

export default AppMenu;
