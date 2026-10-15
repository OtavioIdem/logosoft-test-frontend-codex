# Inventário — centralização de cadastros

Agente: `inventariante-contrato-tela`. Nó: `projeto`. Assunto: `central-cadastros`.

## 1. Recorte e fonte

Missão desta rodada: mapear, no frontend atual, todos os itens exibidos em `layout/AppMenu.tsx` e
separar dados mestres/configurações de fluxos operacionais, ligando cada item de cadastro à rota,
ao componente e às permissões existentes. O pedido do cliente inclui explicitamente empresas,
filiais, setores, cargos e séries fiscais.

Fronteiras:

- não foi proposto desenho, componente, ordem de abas ou fatiamento;
- nenhum código de produção foi alterado;
- o backend não foi aberto: contratos de resposta permanecem `não verificado`;
- campos internos dos 34 formulários filhos não foram reinventariados, pois a mudança em debate é
  de composição/navegação e os componentes atuais continuam donos desses contratos.

Fontes lidas:

- `layout/AppMenu.tsx:46-274` — 82 destinos visíveis no modelo do menu;
- `types/layout.d.ts:49-71` — contrato de `MenuModel`/`AppMenuItem`;
- `layout/AppMenu.tsx:278-285` — filtragem efetiva por `permission`, `anyPermissions` e
  `allPermissions`;
- `lib/security/routePermissions.ts:9-75` — guard de rota vigente;
- `app/(main)/**/page.tsx` — ligação entre rota e componente;
- `features/**/api/*.ts` e `features/**/schemas/*.ts` — confirmação do tipo de operação das telas.

Comandos de medição:

```text
Select-String layout/AppMenu.tsx -Pattern "label: ... to: ..."  => 82 destinos
rg --files "app/(main)" -g "page.tsx"                          => wrappers de rota
Test-Path "app/(main)/cadastros/page.tsx"                       => false
rg -n "/cadastros" layout app lib features                      => nenhuma rota /cadastros
```

## 2. Telas e rotas de cadastro/configuração

Critério descritivo usado na coluna `Classificação`:

- `cadastro`: entidade reutilizada por fluxos posteriores;
- `configuração`: parametrização reutilizada por um módulo;
- `misto`: a própria tela combina cadastro com transições operacionais;
- `operação`: documento, evento ou processo transacional (inventariado na seção 3).

As permissões abaixo são as do item de menu. Quando o guard de rota é mais amplo, isso aparece na
coluna `Guard da rota`. A origem de cada item e permissão é `layout/AppMenu.tsx` nas linhas indicadas;
a origem do guard é `lib/security/routePermissions.ts` nas linhas indicadas. Os componentes vêm do
`import` na linha 1 de cada `page.tsx` indicado.

| Grupo atual | Tela / rota | Arquivo de página → componente | Permissão do item de menu | Guard da rota | Classificação |
|---|---|---|---|---|---|
| Segurança | Usuários — `/seguranca/usuarios` | `app/(main)/seguranca/usuarios/page.tsx` → `UsuariosPage` | `SEGURANCA_USUARIOS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:56`) | mesmas (`routePermissions.ts:10`) | configuração de acesso |
| Segurança | Grupos de acesso — `/seguranca/grupos-acesso` | `app/(main)/seguranca/grupos-acesso/page.tsx` → `GruposAcessoPage` | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:57`) | mesmas (`routePermissions.ts:11`) | configuração de acesso |
| Administração | Empresas — `/administracao/empresas` | `app/(main)/administracao/empresas/page.tsx` → `AdministracaoPage resourceKey="empresas"` | `ADMINISTRACAO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:64`) | mesmas (`routePermissions.ts:13`) | cadastro |
| Administração | Filiais — `/administracao/filiais` | `app/(main)/administracao/filiais/page.tsx` → `AdministracaoPage resourceKey="filiais"` | `ADMINISTRACAO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:65`) | mesmas (`routePermissions.ts:13`) | cadastro |
| Administração | Setores — `/administracao/setores` | `app/(main)/administracao/setores/page.tsx` → `AdministracaoPage resourceKey="setores"` | `ADMINISTRACAO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:66`) | mesmas (`routePermissions.ts:13`) | cadastro |
| Administração | Cargos — `/administracao/cargos` | `app/(main)/administracao/cargos/page.tsx` → `AdministracaoPage resourceKey="cargos"` | `ADMINISTRACAO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:67`) | mesmas (`routePermissions.ts:13`) | cadastro |
| Administração | Centros de custo — `/administracao/centros-custo` | `app/(main)/administracao/centros-custo/page.tsx` → `AdministracaoPage resourceKey="centros-custo"` | `ADMINISTRACAO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:68`) | mesmas (`routePermissions.ts:13`) | cadastro |
| Cadastros | Pessoas — `/pessoas` | `app/(main)/pessoas/page.tsx` → `PessoasPage` | `PESSOAS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:75`) | mesmas (`routePermissions.ts:15`) | cadastro |
| Cadastros | Clientes — `/clientes` | `app/(main)/clientes/page.tsx` → `ClientesPage` | `CLIENTES_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:76`) | mesmas (`routePermissions.ts:16`) | cadastro |
| Cadastros | Fornecedores — `/fornecedores` | `app/(main)/fornecedores/page.tsx` → `FornecedoresPage` | `FORNECEDORES_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:77`) | mesmas (`routePermissions.ts:17`) | cadastro |
| Cadastros | Classificações de pessoa — `/pessoas/classificacoes` | `app/(main)/pessoas/classificacoes/page.tsx` → `ClassificacoesPessoaPage` | somente `PESSOAS_CONSULTAR` (`AppMenu.tsx:78`) | somente `PESSOAS_CONSULTAR` (`routePermissions.ts:14`) | cadastro |
| Cadastros | Produtos — `/produtos` | `app/(main)/produtos/page.tsx` → `ProdutosPage` | `PRODUTOS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:79`) | união de cinco permissões do catálogo (`routePermissions.ts:18`) | cadastro |
| Cadastros | Categorias — `/produtos/categorias` | `app/(main)/produtos/categorias/page.tsx` → `CatalogoProdutoPage kind="categoria"` | `PRODUTOS_CONSULTAR` ou `CATEGORIAS_PRODUTO_GERENCIAR` (`AppMenu.tsx:80`) | união de cinco permissões do catálogo (`routePermissions.ts:18`) | cadastro |
| Cadastros | Unidades de medida — `/produtos/unidades-medida` | `app/(main)/produtos/unidades-medida/page.tsx` → `CatalogoProdutoPage kind="unidade"` | `PRODUTOS_CONSULTAR` ou `UNIDADES_MEDIDA_GERENCIAR` (`AppMenu.tsx:81`) | união de cinco permissões do catálogo (`routePermissions.ts:18`) | cadastro |
| Cadastros | Marcas — `/produtos/marcas` | `app/(main)/produtos/marcas/page.tsx` → `CatalogoProdutoPage kind="marca"` | `PRODUTOS_CONSULTAR` ou `MARCAS_GERENCIAR` (`AppMenu.tsx:82`) | união de cinco permissões do catálogo (`routePermissions.ts:18`) | cadastro |
| Estoque | Locais de estoque — `/estoque/locais` | `app/(main)/estoque/locais/page.tsx` → `LocaisEstoquePage` | `ESTOQUE_CONSULTAR` ou `LOCAIS_ESTOQUE_GERENCIAR` (`AppMenu.tsx:89`) | mesmas (`routePermissions.ts:27`) | cadastro |
| Vendas | Tabelas de preço — `/tabelas-preco` | `app/(main)/tabelas-preco/page.tsx` → `TabelasPrecoPage` | `TABELAS_PRECO_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:104`) | mesmas (`routePermissions.ts:36`) | configuração comercial |
| Financeiro | Formas de pagamento — `/financeiro/formas-pagamento` | `app/(main)/financeiro/formas-pagamento/page.tsx` → `FormasPagamentoPage` | `FINANCEIRO_CONSULTAR` ou `FORMAS_PAGAMENTO_GERENCIAR` (`AppMenu.tsx:114`) | mesmas (`routePermissions.ts:42`) | configuração financeira |
| Financeiro | Condições de pagamento — `/financeiro/condicoes-pagamento` | `app/(main)/financeiro/condicoes-pagamento/page.tsx` → `CondicoesPagamentoPage` | `FINANCEIRO_CONSULTAR` ou `CONDICOES_PAGAMENTO_GERENCIAR` (`AppMenu.tsx:115`) | mesmas (`routePermissions.ts:43`) | configuração financeira |
| Fiscal | Séries fiscais — `/fiscal/series` | `app/(main)/fiscal/series/page.tsx` → `SeriesFiscaisPage` | `FISCAL_SERIES_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:133`) | mesmas (`routePermissions.ts:56`) | cadastro fiscal |
| Fiscal | Naturezas de operação — `/fiscal/naturezas-operacao` | `app/(main)/fiscal/naturezas-operacao/page.tsx` → `NaturezasOperacaoPage` | `FISCAL_CADASTROS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:134`) | mesmas (`routePermissions.ts:57`) | cadastro fiscal |
| Fiscal | Regras fiscais — `/fiscal/regras` | `app/(main)/fiscal/regras/page.tsx` → `RegrasFiscaisPage` | `FISCAL_REGRAS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:136`) | mesmas (`routePermissions.ts:53`) | configuração fiscal |
| Fiscal | Exceções e benefícios — `/fiscal/excecoes` | `app/(main)/fiscal/excecoes/page.tsx` → `ExcecoesFiscaisPage variante="geral"` | `FISCAL_REGRAS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:137`) | mesmas (`routePermissions.ts:55`) | configuração fiscal |
| Fiscal | Exceções por NCM — `/fiscal/excecoes-ncm` | `app/(main)/fiscal/excecoes-ncm/page.tsx` → `ExcecoesFiscaisPage variante="ncm"` | `FISCAL_REGRAS_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:138`) | mesmas (`routePermissions.ts:54`) | configuração fiscal |
| Frota | Veículos — `/frota/veiculos` | `app/(main)/frota/veiculos/page.tsx` → `VeiculosPage` | `FROTA_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:165`) | mesmas, catch-all (`routePermissions.ts:62`) | misto: cadastro + status/manutenção |
| Frota | Motoristas — `/frota/motoristas` | `app/(main)/frota/motoristas/page.tsx` → `MotoristasPage` | `FROTA_CONSULTAR` ou `_GERENCIAR` (`AppMenu.tsx:166`) | mesmas, catch-all (`routePermissions.ts:62`) | cadastro operacional |
| RH | Colaboradores — `/rh/colaboradores` | `app/(main)/rh/colaboradores/page.tsx` → `ColaboradoresPage` | `RH_CONSULTAR` ou `RH_GERENCIAR` (`AppMenu.tsx:187`) | união das quatro permissões de RH (`routePermissions.ts:65`) | misto: cadastro + admissão/desligamento |
| RH | Jornadas — `/rh/jornadas` | `app/(main)/rh/jornadas/page.tsx` → `JornadasPage` | `RH_CONSULTAR` ou `RH_GERENCIAR` (`AppMenu.tsx:188`) | união das quatro permissões de RH (`routePermissions.ts:65`) | configuração de RH |
| RH | Benefícios — `/rh/beneficios` | `app/(main)/rh/beneficios/page.tsx` → `BeneficiosPage` | `RH_CONSULTAR` ou `RH_GERENCIAR` (`AppMenu.tsx:191`) | união das quatro permissões de RH (`routePermissions.ts:65`) | misto: configuração + concessão |
| Produção | Fichas técnicas — `/producao/fichas-tecnicas` | `app/(main)/producao/fichas-tecnicas/page.tsx` → `FichasTecnicasPage` | `PRODUCAO_CONSULTAR` ou `PRODUCAO_FICHA_TECNICA_GERENCIAR` (`AppMenu.tsx:207`) | união de sete permissões de produção (`routePermissions.ts:67`) | configuração produtiva |
| Contábil | Plano de contas — `/contabil/plano-contas` | `app/(main)/contabil/plano-contas/page.tsx` → `PlanoContasPage` | `CONTABIL_CONSULTAR` ou `CONTABIL_PLANO_CONTAS_GERENCIAR` (`AppMenu.tsx:234`) | união de seis permissões contábeis (`routePermissions.ts:70`) | cadastro contábil |
| Contábil | Períodos — `/contabil/periodos` | `app/(main)/contabil/periodos/page.tsx` → `PeriodosPage` | `CONTABIL_CONSULTAR` ou `CONTABIL_PERIODOS_GERENCIAR` (`AppMenu.tsx:235`) | união de seis permissões contábeis (`routePermissions.ts:70`) | misto: configuração + fechar/reabrir |
| Contábil | Regras de contabilização — `/contabil/regras` | `app/(main)/contabil/regras/page.tsx` → `RegrasPage` | `CONTABIL_CONSULTAR` ou `CONTABIL_REGRAS_GERENCIAR` (`AppMenu.tsx:237`) | união de seis permissões contábeis (`routePermissions.ts:70`) | configuração contábil |
| Patrimônio | Bens — `/patrimonio/bens` | `app/(main)/patrimonio/bens/page.tsx` → `BensPage` | `PATRIMONIO_CONSULTAR` ou `PATRIMONIO_BENS_GERENCIAR` (`AppMenu.tsx:252`) | união de seis permissões patrimoniais (`routePermissions.ts:71`) | misto: cadastro + transferir/bloquear/baixar |

Medição: **34** rotas exibidas no menu têm comportamento de cadastro, configuração ou misto.
Delas, somente **8** estão hoje sob o grupo visual `Cadastros` (`AppMenu.tsx:72-82`). As outras
**26** estão distribuídas por onze grupos: Segurança, Administração, Estoque, Vendas, Financeiro,
Fiscal, Frota, RH, Produção, Contábil e Patrimônio.

## 3. Rotas exibidas classificadas como operação/ferramenta

Esta tabela fecha os outros 48 destinos do menu, evitando que a palavra “cadastro” seja deduzida
apenas porque uma tela cria registros. Os componentes foram medidos pelo `import` de cada
`app/(main)/**/page.tsx`; as rotas vêm de `AppMenu.tsx:46-274`.

| Grupo | Rotas → componentes | Classificação observada |
|---|---|---|
| Dashboard | `/dashboard` → `DashboardPage` | consulta/indicadores |
| Estoque | `/estoque/saldos` → `SaldosEstoquePage`; `/estoque/movimentos` → `EstoqueMovimentosPage`; `/estoque/transferencias` → `TransferenciaEstoquePage`; `/estoque/ajustes` → `MovimentoOperacionalPage`; `/estoque/reservas` → `ReservasEstoquePage`; `/estoque/inventarios` → `InventariosEstoquePage`; `/estoque/avancado` → `EstoqueAvancadoPage` | operação de estoque (`AppMenu.tsx:90-96`) |
| Vendas | `/vendas/pedidos` → `PedidosVendaPage` | operação comercial (`AppMenu.tsx:103`) |
| Financeiro | `/financeiro/contas-receber` e `/contas-pagar` → `ContasFinanceirasPage`; `/financeiro/fluxo-caixa` → `FluxoCaixaPage` | operação financeira (`AppMenu.tsx:111-113`) |
| Compras | `/compras/pedidos` → `PedidosCompraPage`; `/solicitacoes` → `SolicitacoesCompraPage`; `/cotacoes` → `CotacoesCompraPage`; `/recebimentos` → `RecebimentosCompraPage` | operação de compras (`AppMenu.tsx:122-125`) |
| Fiscal | `/fiscal/notas` → `NotaFiscalConsultaPage`; `/simulador` → `SimuladorTributacaoPage`; `/observabilidade` → `ObservabilidadeFiscalPage`; `/inutilizacoes` → `InutilizacoesFiscaisPage` | operação/ferramenta fiscal (`AppMenu.tsx:132,135,139-140`) |
| PDV | `/pdv/caixas` → `CaixasPdvPage`; `/pdv/vendas` → `VendaPdvPage` | operação de caixa/venda; o client executa abrir, suprimento, sangria e fechar (`features/pdv/api/pdvApi.ts:25-59`) |
| Faturamento | `/faturamento` → `FaturamentoPage` | operação de faturamento (`AppMenu.tsx:154`) |
| Serviços | `/servicos/ordens` → `OrdensServicoPage` | ordem operacional (`AppMenu.tsx:159`) |
| Frota | `/frota/viagens` → `ViagensPage` | operação de viagem (`AppMenu.tsx:167`) |
| Portaria | `/portaria` → `PortariaPage` | controle operacional de acesso (`AppMenu.tsx:173`) |
| Alimentar | `/alimentar/lotes` → `LotesPage`; `/alimentar/recalls` → `RecallsPage` | rastreabilidade/recall operacional (`AppMenu.tsx:179-180`) |
| RH | `/rh/ponto` → `PontoPage`; `/rh/ausencias` → `AusenciasPage`; `/rh/eventos` → `EventosPage` | lançamento/evento operacional (`AppMenu.tsx:189-192`; `features/rh/api/rhApi.ts:92-135,164-168`) |
| Qualidade | `/qualidade/inspecoes` → `InspecoesPage`; `/qualidade/nao-conformidades` → `NaoConformidadesPage` | operação de qualidade (`AppMenu.tsx:199-200`) |
| Produção | `/producao/ordens` → `OrdensProducaoPage` | ordem operacional (`AppMenu.tsx:208`) |
| CRM | `/crm/leads` → `LeadsPage`; `/crm/oportunidades` → `OportunidadesPage`; `/crm/propostas` → `PropostasPage` | pipeline comercial (`AppMenu.tsx:215-217`) |
| Contratos | `/contratos` → `ContratosPage` | documento operacional recorrente (`AppMenu.tsx:223`) |
| Atividades | `/atividades` → `AtividadesPage` | workflow operacional (`AppMenu.tsx:228`) |
| Contábil | `/contabil/lancamentos` → `LancamentosPage` | lançamento operacional (`AppMenu.tsx:236`) |
| Bancos | `/bancos/boletos` → `BoletosPage`; `/bancos/cnab` → `CnabPage` | cobrança/remessa/retorno (`AppMenu.tsx:244-245`) |
| Patrimônio | `/patrimonio/depreciacao` → `DepreciacaoPage`; `/patrimonio/inventarios` → `InventariosPage` | processamento/inventário operacional (`AppMenu.tsx:253-254`) |
| Relatórios | `/relatorios` → `RelatoriosPage` | consulta/relatório (`AppMenu.tsx:260`) |
| Auditoria | `/auditoria/operacional` e `/auditoria/eventos` → `AuditoriaEventosPage` | consulta de auditoria (`AppMenu.tsx:266-267`) |
| Deploy | `/administracao/deploy` → `DeployPage` | configuração técnica de ambiente, não dado mestre de negócio (`AppMenu.tsx:273`) |

## 4. Endpoints preservados pelos componentes filhos

Não existe endpoint da central, pois não existe rota/componente central. A tabela registra apenas
as famílias já consumidas pelos 34 componentes da seção 2. A centralização não altera payload,
schema ou endpoint neste inventário.

| Famílias de tela | Método + rota base consumida | Client / schema Zod | Confirmado no backend? |
|---|---|---|---|
| Segurança | CRUD e ações em `/api/seguranca/usuarios` e `/api/seguranca/grupos-acesso` | `features/seguranca/api/segurancaApi.ts:95-197`; `schemas/segurancaSchemas.ts` | não verificado |
| Administração | CRUD em `/api/administracao/{empresas,filiais,setores,cargos,centros-custo}` | `features/administracao/api/administracaoApi.ts:100-228`; `schemas/administracaoSchemas.ts` | não verificado |
| Pessoas/classificações | CRUD em `/api/pessoas` e `/api/pessoas/classificacoes` | `features/pessoas/api/pessoasApi.ts:48-98`; `schemas/pessoasSchemas.ts` | não verificado |
| Clientes | CRUD/ações em `/api/clientes` | `features/clientes/api/clientesApi.ts:27-66`; `schemas/clientesSchemas.ts` | não verificado |
| Fornecedores | CRUD/ações em `/api/fornecedores` | `features/fornecedores/api/fornecedoresApi.ts:28-66`; `schemas/fornecedoresSchemas.ts` | não verificado |
| Produtos/catálogos | CRUD em `/api/produtos`, `/categorias`, `/unidades-medida`, `/marcas` | `features/produtos/api/produtosApi.ts:75-231`; `schemas/produtosSchemas.ts` | não verificado |
| Locais de estoque | CRUD em `/api/estoque/locais` | `features/estoque/api/estoqueApi.ts:69-90`; `schemas/estoqueSchemas.ts` | não verificado |
| Tabelas de preço | CRUD/itens em `/api/tabelas-preco` | `features/tabelas-preco/api/tabelasPrecoApi.ts:69-118`; `schemas/tabelasPrecoSchemas.ts` | não verificado |
| Formas/condições | CRUD em `/api/financeiro/formas-pagamento` e `/condicoes-pagamento` | `features/financeiro/api/financeiroApi.ts:71-118`; `schemas/financeiroSchemas.ts` | não verificado |
| Séries fiscais | listar/criar/ampliar/encerrar/inativar em `/api/fiscal/series` | `features/fiscal/api/seriesFiscaisApi.ts:49-73`; `schemas/seriesFiscaisSchemas.ts` | não verificado |
| Naturezas | CRUD/CFOP em `/api/fiscal/naturezas-operacao` | `features/fiscal/api/naturezasOperacaoApi.ts:18,59-84`; `schemas/naturezasOperacaoSchemas.ts` | não verificado |
| Regras/exceções fiscais | CRUD em `/api/fiscal/regras`, `/excecoes`, `/excecoes-ncm` | `features/tributacao/api/tributacaoApi.ts:127-221`; `schemas/tributacaoSchemas.ts` | não verificado |
| Frota | CRUD/ações em `/api/frota/veiculos` e `/motoristas` | `features/frota/api/frotaApi.ts:43-122`; `schemas/frotaSchemas.ts` | não verificado |
| RH | CRUD/ações em `/api/rh/colaboradores`, `/jornadas`, `/beneficios` | `features/rh/api/rhApi.ts:50-87,140-159`; `schemas/rhSchemas.ts` | não verificado |
| Produção | CRUD/ações em `/api/producao/fichas-tecnicas` | `features/producao/api/producaoApi.ts:34-60`; `schemas/producaoSchemas.ts` | não verificado |
| Contábil | CRUD/ações em `/api/contabil/plano-contas`, `/periodos`, `/regras` | `features/contabil/api/contabilApi.ts:36-68,89-96`; `schemas/contabilSchemas.ts` | não verificado |
| Patrimônio | CRUD/ações em `/api/patrimonio/bens` | `features/patrimonio/api/patrimonioApi.ts:34-66`; `schemas/patrimonioSchemas.ts` | não verificado |

## 5. Campos da superfície de navegação

Este é o contrato de campos efetivamente afetado pelo assunto da rodada. Os campos dos formulários
filhos permanecem nos schemas citados na seção 4 e não mudam de destino por serem compostos em outra
superfície.

| Campo | Tipo no frontend | Origem | Backend entrega? | Destino declarado |
|---|---|---|---|---|
| `label` | `string` | `MenuModel` (`types/layout.d.ts:49-55`) | n/a | exibido |
| `icon` | `string?` | `MenuModel` (`types/layout.d.ts:51`) | n/a | exibido |
| `to` | `string?` | `MenuModel` (`types/layout.d.ts:54`) | n/a | enviado ao roteador |
| `items` | `AppMenuItem[]?` | `AppMenuItem` (`types/layout.d.ts:60-61`) | n/a | exibido |
| `permission` | `PermissionCode?` | `AppMenuItem` (`types/layout.d.ts:69`) | n/a | enviado ao filtro de visibilidade |
| `anyPermissions` | `PermissionCode[]?` | `AppMenuItem` (`types/layout.d.ts:70`) | n/a | enviado ao filtro de visibilidade |
| `allPermissions` | `PermissionCode[]?` | `AppMenuItem` (`types/layout.d.ts:71`) | n/a | enviado ao filtro de visibilidade |

O destino acima é comprovado por `layout/AppMenu.tsx:278-285`, que aplica as três famílias de
permissão antes de renderizar, e por `layout/AppMenu.tsx:304-310`, que renderiza os itens filtrados.

## 6. Estados da central de cadastros

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
|---|---|---|---|---|---|---|---|
| `/cadastros` unificada | ausente | ausente | ausente | ausente | ausente | ausente | ausente |
| 34 componentes filhos | não verificado neste recorte | não verificado | não verificado | não verificado | não verificado | não verificado | não verificado |

Evidência da primeira linha: `app/(main)/cadastros/page.tsx` não existe, não há regra
`/cadastros` em `lib/security/routePermissions.ts:9-75`, e a única ocorrência de “Cadastros” como
navegação é o grupo de oito links de `layout/AppMenu.tsx:72-82`.

## 7. Divergências

### DIV-1 — “Cadastros” não é uma aba/tela unificada

O frontend atual possui um grupo de menu chamado `Cadastros` com oito rotas independentes
(`layout/AppMenu.tsx:72-82`). Empresas, filiais, setores e cargos permanecem em `Administração`
(`:61-69`), séries/naturezas/regras/exceções permanecem em `Fiscal` (`:129-140`) e os demais 17
itens da seção 2 permanecem em outros grupos. Não existe `/cadastros`, componente central ou guard
de rota para essa central.

### DIV-2 — permissão de Classificações de pessoa não fecha entre menu/rota e ação

Menu e guard exigem somente `PESSOAS_CONSULTAR` (`AppMenu.tsx:78` e
`routePermissions.ts:14`). A tela protege criar/editar/inativar com
`CLASSIFICACOES_PESSOA_GERENCIAR` (`features/pessoas/components/ClassificacoesPessoaPage.tsx:74-109`),
e essa permissão existe no catálogo, no tipo e no snapshot do backend
(`features/seguranca/permissoesCatalogo.ts:50`, `types/erp.ts:259`,
`scripts/backend-permissions.snapshot.json:60`). Porém ela não participa do item, do grupo pai
`Cadastros` nem do guard. Um usuário que tenha somente a permissão específica de gerenciamento não
obtém acesso ao destino pelo menu/rota atual.

### DIV-3 — cinco famílias usam guard de rota mais amplo que o item de menu

- `/produtos/**`: qualquer uma das cinco permissões passa no catch-all
  (`routePermissions.ts:18`), embora cada item tenha união própria (`AppMenu.tsx:79-82`);
- `/rh/**`: permissões de ponto/eventos passam nas rotas de colaboradores/jornadas/benefícios pelo
  catch-all (`routePermissions.ts:65`), embora os itens usem `RH_CONSULTAR|RH_GERENCIAR`;
- `/producao/**`, `/contabil/**` e `/patrimonio/**` repetem o mesmo padrão de catch-all amplo
  (`routePermissions.ts:67,70-71`) diante dos itens específicos
  (`AppMenu.tsx:207,234-237,252`).

Os componentes observados protegem as mutações com permissões próprias — por exemplo,
`FichasTecnicasPage.tsx:86-114`, `PlanoContasPage.tsx:66-83` e `BensPage.tsx:86-105` — mas o
inventário registra a diferença de acesso/visibilidade para a rodada de arquitetura.

### DIV-4 — cadastro bancário existe como rota não exibida e está bloqueado por contrato

`app/(main)/bancos/page.tsx:1-4` monta `CadastrosBancariosPage`, mas `AppMenu.tsx:241-246` expõe
somente Boletos e CNAB. A página declara cadastro de bancos, contas, convênios e carteiras, porém
informa indisponibilidade porque o backend não oferece consultas
(`features/bancos/components/CadastrosBancariosPage.tsx:8-12`). A allowlist registra quatro
divergências GET para esses cadastros (`scripts/backend-contract-map.allowlist.json:18-21`).
Portanto, este cadastro não entra na contagem dos 34 itens **exibidos**, mas existe como superfície
oculta e bloqueada.

### DIV-5 — categorias “mistas” não permitem deduzir destino só pelo nome

Veículos, Colaboradores, Benefícios, Períodos e Bens combinam criação de entidade com transições de
estado. Exemplos medidos: veículos também registram status/manutenção
(`features/frota/api/frotaApi.ts:55-113`); colaboradores têm desligamento
(`features/rh/api/rhApi.ts:62-74`); períodos fecham e reabrem
(`features/contabil/api/contabilApi.ts:56-68`); bens transferem, bloqueiam e baixam
(`features/patrimonio/api/patrimonioApi.ts:44-66`). O inventário marca essas telas como `misto` e
deixa a decisão de composição para os arquitetos.

## 8. Verificação e limites

Verificado por leitura estática:

- contagem dos 82 destinos do menu;
- ligação dos 34 cadastros/configurações às páginas e componentes;
- permissões de menu e guard de rota;
- famílias de endpoints já consumidas;
- ausência de `/cadastros` e presença da rota bancária oculta.

Não verificado:

- comportamento em runtime e responsividade;
- respostas reais do backend;
- estados completos de cada um dos 34 componentes filhos;
- campos internos de cada formulário, pois não há mudança de contrato no recorte do hub;
- build, testes ou E2E, pois este agente não alterou código.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "central-cadastros",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/21-inventario-central-cadastros.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "MISSING_DECISION",
      "pergunta": "As cinco telas mistas (Veículos, Colaboradores, Benefícios, Períodos e Bens) pertencem integralmente à central ou somente sua entrada cadastral?",
      "decide": "se a central incorpora também transições operacionais ou mantém atalhos para os módulos de origem"
    },
    {
      "tipo": "MISSING_CONTRACT",
      "pergunta": "Cadastros bancários permanecem fora enquanto os quatro GETs de bancos, contas, convênios e carteiras não existirem?",
      "decide": "se a superfície bloqueada aparece na cadeia de cadastros ou continua oculta"
    }
  ],
  "riscos": [
    "DIV-2: CLASSIFICACOES_PESSOA_GERENCIAR existe e protege ações, mas não concede visibilidade/acesso ao item nem à rota.",
    "DIV-3: guards catch-all de Produtos, RH, Produção, Contábil e Patrimônio são mais amplos que as permissões dos itens de menu.",
    "DIV-4: cadastro bancário está implementado como placeholder oculto e não possui contrato GET utilizável.",
    "Backend e estados completos dos componentes filhos não foram verificados neste recorte de navegação."
  ]
}
```
