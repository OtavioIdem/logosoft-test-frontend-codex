import { CadastroCategoria, CadastroItem } from './types/cadastros.types';

export const cadastroCategorias: readonly CadastroCategoria[] = [
    { id: 'estrutura-organizacional', ordem: 1, label: '1. Estrutura organizacional', descricao: 'Defina a empresa e a estrutura que organiza os demais cadastros.' },
    { id: 'pessoas-parceiros', ordem: 2, label: '2. Pessoas e parceiros', descricao: 'Cadastre as pessoas e seus papéis comerciais.' },
    { id: 'catalogo-estoque', ordem: 3, label: '3. Catálogo e estoque', descricao: 'Prepare o catálogo de itens e os locais onde serão controlados.' },
    { id: 'comercial-financeiro', ordem: 4, label: '4. Comercial e financeiro', descricao: 'Parametrize preços e condições usadas nas operações.' },
    { id: 'fiscal', ordem: 5, label: '5. Fiscal', descricao: 'Configure séries, naturezas e regras para emissão e tributação.' },
    { id: 'operacao-especializada', ordem: 6, label: '6. Operação especializada', descricao: 'Complete os cadastros próprios de RH, frota e produção.' },
    { id: 'contabil-patrimonio', ordem: 7, label: '7. Contábil e patrimônio', descricao: 'Estruture contas, períodos, regras e bens.' },
    { id: 'seguranca-acessos', ordem: 8, label: '8. Segurança e acessos', descricao: 'Defina quem pode acessar as rotinas já parametrizadas.' }
];

export const cadastroItens: readonly CadastroItem[] = [
    { id: 'empresas', categoriaId: 'estrutura-organizacional', ordem: 1, label: 'Empresas', descricao: 'Cadastre as empresas que compõem a organização.', icon: 'pi pi-building', to: '/administracao/empresas', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
    { id: 'filiais', categoriaId: 'estrutura-organizacional', ordem: 2, label: 'Filiais', descricao: 'Vincule as unidades operacionais às empresas.', icon: 'pi pi-map-marker', to: '/administracao/filiais', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
    { id: 'setores', categoriaId: 'estrutura-organizacional', ordem: 3, label: 'Setores', descricao: 'Organize as áreas responsáveis pela operação.', icon: 'pi pi-sitemap', to: '/administracao/setores', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
    { id: 'cargos', categoriaId: 'estrutura-organizacional', ordem: 4, label: 'Cargos', descricao: 'Defina os cargos vinculados à estrutura organizacional.', icon: 'pi pi-id-card', to: '/administracao/cargos', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },
    { id: 'centros-custo', categoriaId: 'estrutura-organizacional', ordem: 5, label: 'Centros de custo', descricao: 'Cadastre os centros usados para apropriação gerencial.', icon: 'pi pi-wallet', to: '/administracao/centros-custo', anyPermissions: ['ADMINISTRACAO_CONSULTAR', 'ADMINISTRACAO_GERENCIAR'] },

    { id: 'classificacoes-pessoa', categoriaId: 'pessoas-parceiros', ordem: 1, label: 'Classificações de pessoa', descricao: 'Mantenha as classificações aplicadas às pessoas.', icon: 'pi pi-tag', to: '/pessoas/classificacoes', anyPermissions: ['PESSOAS_CONSULTAR'] },
    { id: 'pessoas', categoriaId: 'pessoas-parceiros', ordem: 2, label: 'Pessoas', descricao: 'Cadastre pessoas físicas e jurídicas.', icon: 'pi pi-address-book', to: '/pessoas', anyPermissions: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'] },
    { id: 'clientes', categoriaId: 'pessoas-parceiros', ordem: 3, label: 'Clientes', descricao: 'Vincule pessoas ao papel comercial de cliente.', icon: 'pi pi-user-plus', to: '/clientes', anyPermissions: ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR'] },
    { id: 'fornecedores', categoriaId: 'pessoas-parceiros', ordem: 4, label: 'Fornecedores', descricao: 'Vincule pessoas ao papel comercial de fornecedor.', icon: 'pi pi-truck', to: '/fornecedores', anyPermissions: ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'] },

    { id: 'unidades-medida', categoriaId: 'catalogo-estoque', ordem: 1, label: 'Unidades de medida', descricao: 'Defina as unidades usadas pelos produtos.', icon: 'pi pi-sort-numeric-up', to: '/produtos/unidades-medida', anyPermissions: ['PRODUTOS_CONSULTAR', 'UNIDADES_MEDIDA_GERENCIAR'] },
    { id: 'marcas', categoriaId: 'catalogo-estoque', ordem: 2, label: 'Marcas', descricao: 'Cadastre as marcas do catálogo.', icon: 'pi pi-star', to: '/produtos/marcas', anyPermissions: ['PRODUTOS_CONSULTAR', 'MARCAS_GERENCIAR'] },
    { id: 'categorias-produto', categoriaId: 'catalogo-estoque', ordem: 3, label: 'Categorias', descricao: 'Organize os produtos por categoria.', icon: 'pi pi-tags', to: '/produtos/categorias', anyPermissions: ['PRODUTOS_CONSULTAR', 'CATEGORIAS_PRODUTO_GERENCIAR'] },
    { id: 'produtos', categoriaId: 'catalogo-estoque', ordem: 4, label: 'Produtos', descricao: 'Cadastre produtos, serviços e seus dados comerciais e fiscais.', icon: 'pi pi-box', to: '/produtos', anyPermissions: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'] },
    { id: 'locais-estoque', categoriaId: 'catalogo-estoque', ordem: 5, label: 'Locais de estoque', descricao: 'Cadastre os locais onde os itens serão movimentados.', icon: 'pi pi-warehouse', to: '/estoque/locais', anyPermissions: ['ESTOQUE_CONSULTAR', 'LOCAIS_ESTOQUE_GERENCIAR'] },

    { id: 'tabelas-preco', categoriaId: 'comercial-financeiro', ordem: 1, label: 'Tabelas de preço', descricao: 'Parametrize preços para a operação comercial.', icon: 'pi pi-tags', to: '/tabelas-preco', anyPermissions: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR'] },
    { id: 'formas-pagamento', categoriaId: 'comercial-financeiro', ordem: 2, label: 'Formas de pagamento', descricao: 'Defina formas permitidas para recebimento e pagamento.', icon: 'pi pi-credit-card', to: '/financeiro/formas-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'FORMAS_PAGAMENTO_GERENCIAR'] },
    { id: 'condicoes-pagamento', categoriaId: 'comercial-financeiro', ordem: 3, label: 'Condições de pagamento', descricao: 'Configure parcelamento, intervalo e entrada.', icon: 'pi pi-calendar-plus', to: '/financeiro/condicoes-pagamento', anyPermissions: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR'] },

    { id: 'series-fiscais', categoriaId: 'fiscal', ordem: 1, label: 'Séries fiscais', descricao: 'Cadastre as séries e faixas de numeração fiscal.', icon: 'pi pi-hashtag', to: '/fiscal/series', anyPermissions: ['FISCAL_SERIES_CONSULTAR', 'FISCAL_SERIES_GERENCIAR'] },
    { id: 'naturezas-operacao', categoriaId: 'fiscal', ordem: 2, label: 'Naturezas de operação', descricao: 'Configure naturezas e o mapeamento de CFOP.', icon: 'pi pi-book', to: '/fiscal/naturezas-operacao', anyPermissions: ['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'] },
    { id: 'regras-fiscais', categoriaId: 'fiscal', ordem: 3, label: 'Regras fiscais', descricao: 'Parametrize regras usadas pelo motor de tributação.', icon: 'pi pi-sliders-h', to: '/fiscal/regras', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },
    { id: 'excecoes-fiscais', categoriaId: 'fiscal', ordem: 4, label: 'Exceções e benefícios', descricao: 'Cadastre exceções e benefícios fiscais.', icon: 'pi pi-percentage', to: '/fiscal/excecoes', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },
    { id: 'excecoes-ncm', categoriaId: 'fiscal', ordem: 5, label: 'Exceções por NCM', descricao: 'Cadastre exceções fiscais específicas por NCM.', icon: 'pi pi-tags', to: '/fiscal/excecoes-ncm', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },

    { id: 'colaboradores', categoriaId: 'operacao-especializada', ordem: 1, label: 'Colaboradores', descricao: 'Cadastre colaboradores e seus dados de RH.', icon: 'pi pi-users', to: '/rh/colaboradores', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
    { id: 'jornadas', categoriaId: 'operacao-especializada', ordem: 2, label: 'Jornadas', descricao: 'Configure jornadas de trabalho.', icon: 'pi pi-clock', to: '/rh/jornadas', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
    { id: 'beneficios', categoriaId: 'operacao-especializada', ordem: 3, label: 'Benefícios', descricao: 'Cadastre benefícios e suas regras de concessão.', icon: 'pi pi-gift', to: '/rh/beneficios', anyPermissions: ['RH_CONSULTAR', 'RH_GERENCIAR'] },
    { id: 'veiculos', categoriaId: 'operacao-especializada', ordem: 4, label: 'Veículos', descricao: 'Cadastre veículos e acompanhe sua situação operacional.', icon: 'pi pi-car', to: '/frota/veiculos', anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'] },
    { id: 'motoristas', categoriaId: 'operacao-especializada', ordem: 5, label: 'Motoristas', descricao: 'Cadastre motoristas utilizados nas viagens.', icon: 'pi pi-user', to: '/frota/motoristas', anyPermissions: ['FROTA_CONSULTAR', 'FROTA_GERENCIAR'] },
    { id: 'fichas-tecnicas', categoriaId: 'operacao-especializada', ordem: 6, label: 'Fichas técnicas', descricao: 'Defina estruturas e insumos para produção.', icon: 'pi pi-sitemap', to: '/producao/fichas-tecnicas', anyPermissions: ['PRODUCAO_CONSULTAR', 'PRODUCAO_FICHA_TECNICA_GERENCIAR'] },

    { id: 'plano-contas', categoriaId: 'contabil-patrimonio', ordem: 1, label: 'Plano de contas', descricao: 'Cadastre a estrutura contábil da empresa.', icon: 'pi pi-sitemap', to: '/contabil/plano-contas', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_PLANO_CONTAS_GERENCIAR'] },
    { id: 'periodos', categoriaId: 'contabil-patrimonio', ordem: 2, label: 'Períodos', descricao: 'Configure os períodos contábeis.', icon: 'pi pi-calendar', to: '/contabil/periodos', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_PERIODOS_GERENCIAR'] },
    { id: 'regras-contabilizacao', categoriaId: 'contabil-patrimonio', ordem: 3, label: 'Regras de contabilização', descricao: 'Parametrize as regras de contabilização.', icon: 'pi pi-sliders-h', to: '/contabil/regras', anyPermissions: ['CONTABIL_CONSULTAR', 'CONTABIL_REGRAS_GERENCIAR'] },
    { id: 'bens', categoriaId: 'contabil-patrimonio', ordem: 4, label: 'Bens', descricao: 'Cadastre os bens patrimoniais.', icon: 'pi pi-building', to: '/patrimonio/bens', anyPermissions: ['PATRIMONIO_CONSULTAR', 'PATRIMONIO_BENS_GERENCIAR'] },

    { id: 'usuarios', categoriaId: 'seguranca-acessos', ordem: 1, label: 'Usuários', descricao: 'Cadastre usuários que operarão as rotinas.', icon: 'pi pi-users', to: '/seguranca/usuarios', anyPermissions: ['SEGURANCA_USUARIOS_CONSULTAR', 'SEGURANCA_USUARIOS_GERENCIAR'] },
    { id: 'grupos-acesso', categoriaId: 'seguranca-acessos', ordem: 2, label: 'Grupos de acesso', descricao: 'Configure os grupos e as permissões de acesso.', icon: 'pi pi-shield', to: '/seguranca/grupos-acesso', anyPermissions: ['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR'] }
];

export const cadastrosAnyPermissions = Array.from(new Set(cadastroItens.flatMap((item) => item.anyPermissions)));
