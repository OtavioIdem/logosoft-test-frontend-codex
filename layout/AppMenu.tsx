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
                anyPermissions: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR', 'SEGURANCA_PERMISSOES_GERENCIAR'],
                items: [
                    { label: 'Usuários', icon: 'pi pi-fw pi-users', to: '/seguranca/usuarios', anyPermissions: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR'] },
                    { label: 'Grupos de acesso', icon: 'pi pi-fw pi-shield', to: '/seguranca/grupos-acesso', permission: 'SEGURANCA_PERMISSOES_GERENCIAR' }
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
                    { label: 'Inventários', icon: 'pi pi-fw pi-clipboard', to: '/estoque/inventarios', anyPermissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR'] }
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
                    { label: 'Formas de pagamento', icon: 'pi pi-fw pi-credit-card', to: '/financeiro/formas-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FORMAS_PAGAMENTO_GERENCIAR'] },
                    { label: 'Condições de pagamento', icon: 'pi pi-fw pi-calendar-plus', to: '/financeiro/condicoes-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR'] }
                ]
            },
            {
                label: 'Compras',
                anyPermissions: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR'],
                items: [{ label: 'Pedidos de compra', icon: 'pi pi-fw pi-shopping-bag', to: '/compras/pedidos', anyPermissions: ['COMPRAS_CONSULTAR', 'COMPRAS_GERENCIAR'] }]
            },
            {
                label: 'Fiscal',
                anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_INUTILIZAR', 'FISCAL_CARTA_CORRECAO'],
                items: [
                    { label: 'Notas fiscais', icon: 'pi pi-fw pi-file', to: '/fiscal/notas', anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR'] },
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
                label: 'Atividades',
                anyPermissions: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_GERENCIAR'],
                items: [{ label: 'Workflow operacional', icon: 'pi pi-fw pi-check-square', to: '/atividades', anyPermissions: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_GERENCIAR'] }]
            },
            {
                label: 'Relatórios',
                permission: 'RELATORIOS_CONSULTAR',
                items: [{ label: 'Operacionais e gerenciais', icon: 'pi pi-fw pi-chart-bar', to: '/relatorios', permission: 'RELATORIOS_CONSULTAR' }]
            },
            {
                label: 'Auditoria',
                permission: 'AUDITORIA_CONSULTAR',
                items: [
                    { label: 'Auditoria operacional', icon: 'pi pi-fw pi-search', to: '/auditoria/operacional', permission: 'AUDITORIA_CONSULTAR' },
                    { label: 'Eventos de auditoria', icon: 'pi pi-fw pi-history', to: '/auditoria/eventos', permission: 'AUDITORIA_CONSULTAR' }
                ]
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
