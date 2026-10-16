# Plano de implementação — v1.11.0a8b77 — Central de Cadastros

Agente: `arquiteto-frontend`. Nó: `planner`. Decisão de entrada: `D106`.

## 0. Contrato da fatia

```yaml
slice:
  id: v1.11.0a8b77
  module: Cadastros / Navegação / Segurança
  feature: Índice único dos 34 cadastros e configurações
  item_do_plano: D106

regime: implementacao

risk: HIGH
accessRisk: RELOCACAO_SEM_AMPLIACAO

requirements:
  contractChange:        false
  permissionChange:      true
  moneyOnScreen:         false
  uiPattern:             true
  organizationalContext: false
  navigationChange:      true
  structuralGate:        false
  platformChange:        false
  newScreen:             true

graphNodes: [builder, design, tests, e2e, qa_review]

testPlan:
  UNIT: required
  COMPONENT: required
  E2E_MOCKADO: required
  CONTRATO: not_required
  PERMISSAO: required
  CONTEXTO_ORGANIZACIONAL: not_required
  GATE_ESTRUTURAL: covered_by_unit_matrix
  REGRESSAO_TEXTUAL: required
```

`permissionChange=true` significa alteração de menu e inclusão do guard de `/cadastros`; não há
novo `PermissionCode`, concessão automática ou mudança no catálogo do backend. O risco de acesso é
de **relocação**: os atalhos deixam os grupos de origem somente depois de a entrada central provar a
mesma visibilidade. As 34 rotas canônicas continuam válidas.

## 1. Base e versão alvo

- Base funcional: `v1.11.0a8b76` (`package.json.version=1.11.0-a.8.b76`,
  `logosoftVersion=1.11.0a8b76`, `config/app.ts=1.11.0a8b76`). O plano da `b76` registra
  `qa_review#3-APROVADO` em `docs/fatias/v1.11.0a8b76-fiscal-v124-validacoes.md`.
- Versão alvo: **funcional `v1.11.0a8b77`**. A decisão é nova navegação, não correção de uma
  versão bloqueada.
- A árvore de trabalho contém mudanças fiscais e de harness alheias a esta fatia. O executor deve
  preservá-las, não reformatá-las e reconciliar a base antes do fechamento da `b77`; este plano não
  as incorpora por inferência.
- Fontes da decisão: inventário e posições da rodada 21, com prioridade para
  `21-inventario-central-cadastros.md`, `21-operacao-central-cadastros.md` e
  `21-plataforma-central-cadastros.md`; arbitragem em `docs/arquitetura/DECISOES.md`, D106.

## 2. Objetivo funcional em 3 linhas

Criar `/cadastros` como o único ponto visual de descoberta dos 34 cadastros/configurações, ordenados
pela cadeia de preparação do ERP e filtrados pela permissão de cada recurso. Cada atalho abre a rota
canônica atual; nenhum CRUD, endpoint, payload, query key ou workflow é movido para a central. Retirar
os atalhos cadastrais dispersos do menu somente junto da prova de paridade e manter as rotas antigas.

Fluxo ERP representado:

```text
Estrutura organizacional
→ Pessoas e parceiros
→ Catálogo e estoque
→ Comercial e financeiro
→ Fiscal
→ Operação especializada
→ Contábil e patrimônio
→ Segurança e acessos
→ operação diária nos módulos atuais
```

A ordem é orientação de implantação, não regra de domínio. A central não calcula prontidão, não
marca etapa como concluída e não bloqueia um cadastro pela ausência de outro sem contrato do backend.

## 3. Impacto por módulo, tela, endpoint e permissão

### 3.1 Contrato HTTP

`GET /cadastros` é uma rota do Next.js, não uma rota da API. Ao abrir a página, o número esperado de
chamadas de domínio é **zero**. Não há método, rota de backend ou payload novo.

Ao clicar, o navegador monta a página filha e ela continua consumindo os clients e schemas atuais
inventariados na rodada 21 §4. Segurança, Administração, Pessoas, Clientes, Fornecedores, Produtos,
Estoque, Tabelas de preço, Financeiro, Fiscal/Tributação, Frota, RH, Produção, Contábil e Patrimônio
continuam donos de seus métodos, payloads, Zod, React Query e invalidações. Logo:

- `features/**/api/**`, `features/**/hooks/**` e `features/**/schemas/**`: **sem alteração**;
- `scripts/backend-contract-map.allowlist.json`: somente carimbo de versão no ritual de release,
  sem nova rota ou divergência;
- confirmação do backend: **não requerida para o índice**, pois nenhum contrato de domínio muda;
- respostas reais dos 34 filhos: permanecem fora da prova desta fatia, exceto pela regressão de
  navegação até as rotas existentes.

### 3.2 Registro dos 34 destinos

As permissões abaixo são as atuais do item de menu e formam o contrato de visibilidade do novo
catálogo. O guard da rota filha permanece a barreira efetiva. `types/erp.ts` e
`features/seguranca/permissoesCatalogo.ts` registram os códigos existentes e não recebem código novo.

| Etapa da central | Rotas canônicas | `anyPermissions` por item | Client de domínio preservado |
| --- | --- | --- | --- |
| Estrutura organizacional | `/administracao/empresas`, `/filiais`, `/setores`, `/cargos`, `/centros-custo` | todos: `ADMINISTRACAO_CONSULTAR` ou `ADMINISTRACAO_GERENCIAR` | `features/administracao/api/administracaoApi.ts` |
| Pessoas e parceiros | `/pessoas/classificacoes` | `PESSOAS_CONSULTAR` | `features/pessoas/api/pessoasApi.ts` |
| Pessoas e parceiros | `/pessoas` | `PESSOAS_CONSULTAR` ou `PESSOAS_GERENCIAR` | `features/pessoas/api/pessoasApi.ts` |
| Pessoas e parceiros | `/clientes` | `CLIENTES_CONSULTAR` ou `CLIENTES_GERENCIAR` | `features/clientes/api/clientesApi.ts` |
| Pessoas e parceiros | `/fornecedores` | `FORNECEDORES_CONSULTAR` ou `FORNECEDORES_GERENCIAR` | `features/fornecedores/api/fornecedoresApi.ts` |
| Catálogo e estoque | `/produtos/unidades-medida` | `PRODUTOS_CONSULTAR` ou `UNIDADES_MEDIDA_GERENCIAR` | `features/produtos/api/produtosApi.ts` |
| Catálogo e estoque | `/produtos/categorias` | `PRODUTOS_CONSULTAR` ou `CATEGORIAS_PRODUTO_GERENCIAR` | `features/produtos/api/produtosApi.ts` |
| Catálogo e estoque | `/produtos/marcas` | `PRODUTOS_CONSULTAR` ou `MARCAS_GERENCIAR` | `features/produtos/api/produtosApi.ts` |
| Catálogo e estoque | `/produtos` | `PRODUTOS_CONSULTAR` ou `PRODUTOS_GERENCIAR` | `features/produtos/api/produtosApi.ts` |
| Catálogo e estoque | `/estoque/locais` | `ESTOQUE_CONSULTAR` ou `LOCAIS_ESTOQUE_GERENCIAR` | `features/estoque/api/estoqueApi.ts` |
| Comercial e financeiro | `/financeiro/formas-pagamento` | `FINANCEIRO_CONSULTAR` ou `FORMAS_PAGAMENTO_GERENCIAR` | `features/financeiro/api/financeiroApi.ts` |
| Comercial e financeiro | `/financeiro/condicoes-pagamento` | `FINANCEIRO_CONSULTAR` ou `CONDICOES_PAGAMENTO_GERENCIAR` | `features/financeiro/api/financeiroApi.ts` |
| Comercial e financeiro | `/tabelas-preco` | `TABELAS_PRECO_CONSULTAR` ou `TABELAS_PRECO_GERENCIAR` | `features/tabelas-preco/api/tabelasPrecoApi.ts` |
| Fiscal | `/fiscal/naturezas-operacao` | `FISCAL_CADASTROS_CONSULTAR` ou `FISCAL_CADASTROS_GERENCIAR` | `features/fiscal/api/naturezasOperacaoApi.ts` |
| Fiscal | `/fiscal/series` | `FISCAL_SERIES_CONSULTAR` ou `FISCAL_SERIES_GERENCIAR` | `features/fiscal/api/seriesFiscaisApi.ts` |
| Fiscal | `/fiscal/regras`, `/fiscal/excecoes`, `/fiscal/excecoes-ncm` | cada um: `FISCAL_REGRAS_CONSULTAR` ou `FISCAL_REGRAS_GERENCIAR` | `features/tributacao/api/tributacaoApi.ts` |
| Operação especializada | `/rh/jornadas`, `/rh/beneficios`, `/rh/colaboradores` | cada um: `RH_CONSULTAR` ou `RH_GERENCIAR` | `features/rh/api/rhApi.ts` |
| Operação especializada | `/frota/veiculos`, `/frota/motoristas` | cada um: `FROTA_CONSULTAR` ou `FROTA_GERENCIAR` | `features/frota/api/frotaApi.ts` |
| Operação especializada | `/producao/fichas-tecnicas` | `PRODUCAO_CONSULTAR` ou `PRODUCAO_FICHA_TECNICA_GERENCIAR` | `features/producao/api/producaoApi.ts` |
| Contábil e patrimônio | `/contabil/plano-contas` | `CONTABIL_CONSULTAR` ou `CONTABIL_PLANO_CONTAS_GERENCIAR` | `features/contabil/api/contabilApi.ts` |
| Contábil e patrimônio | `/contabil/periodos` | `CONTABIL_CONSULTAR` ou `CONTABIL_PERIODOS_GERENCIAR` | `features/contabil/api/contabilApi.ts` |
| Contábil e patrimônio | `/contabil/regras` | `CONTABIL_CONSULTAR` ou `CONTABIL_REGRAS_GERENCIAR` | `features/contabil/api/contabilApi.ts` |
| Contábil e patrimônio | `/patrimonio/bens` | `PATRIMONIO_CONSULTAR` ou `PATRIMONIO_BENS_GERENCIAR` | `features/patrimonio/api/patrimonioApi.ts` |
| Segurança e acessos | `/seguranca/grupos-acesso` | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` ou `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` | `features/seguranca/api/segurancaApi.ts` |
| Segurança e acessos | `/seguranca/usuarios` | `SEGURANCA_USUARIOS_CONSULTAR` ou `SEGURANCA_USUARIOS_GERENCIAR` | `features/seguranca/api/segurancaApi.ts` |

Contagem de aceite: `5 + 4 + 5 + 3 + 5 + 6 + 4 + 2 = 34` destinos. A ordem fina de cada seção
segue o fluxo operacional do documento `21-operacao-central-cadastros.md`; a categoria Segurança
fica por último conforme D106, sem sugerir que permissões sejam criadas automaticamente.

### 3.3 Menu e guard

- `layout/AppMenu.tsx`: o grupo visual Cadastros passa a possuir somente o link
  `Cadastros → /cadastros`, sem terceiro nível. Os 34 atalhos saem de Segurança, Administração,
  Cadastros, Estoque, Vendas, Financeiro, Fiscal, Frota, RH, Produção, Contábil e Patrimônio.
  Grupos operacionais e filhos não cadastrais permanecem.
- `lib/security/routePermissions.ts`: adicionar regra própria e literal para `/cadastros` com a
  união das permissões de visibilidade dos 34 itens. A regra não substitui nem alarga os guards
  filhos.
- Não criar `CADASTROS_ACESSAR`, não alterar `PermissionCode`, catálogo de permissões ou snapshot
  do backend por conteúdo. A paridade entre catálogo, guard e menu será testada.
- DIV-2 é preservada: `CLASSIFICACOES_PESSOA_GERENCIAR` sozinha continua sem abrir Classificações;
  visibilidade exige `PESSOAS_CONSULTAR`, como hoje.
- DIV-3 fica fora: os catch-all amplos de Produtos, RH, Produção, Contábil e Patrimônio não serão
  endurecidos incidentalmente.

## 4. Passos de implementação ordenados, com arquivo alvo

### Bloco A — contrato local e página

1. `features/cadastros/types/cadastros.types.ts`
   - declarar categoria, classificação e descritor tipado do item;
   - aceitar apenas `PermissionCode`, rota canônica, ordem e dependências por id;
   - não declarar componente React, payload ou estado de domínio no descritor.
2. `features/cadastros/cadastrosCatalogo.ts`
   - registrar nominalmente os 34 itens e as oito categorias na ordem de D106;
   - exportar a união deduplicada de permissões somente para a página e os testes;
   - manter dados estáticos; nenhuma importação de API, hook ou componente filho.
3. `features/cadastros/components/CadastrosPage.tsx`
   - renderizar `PageHeader`, orientação de que a ordem é recomendada, busca local por nome e
     categorias responsivas;
   - filtrar itens por `usePermissions().hasAnyPermission(item.anyPermissions)` e remover categoria
     sem filho visível;
   - cada cartão/link usa `next/link` e a rota canônica; não fazer `router.push` para rota inventada;
   - não montar nem importar os 34 componentes filhos e não executar `fetch`/React Query.
4. `app/(main)/cadastros/page.tsx`
   - wrapper fino que delega integralmente a `CadastrosPage`.

### Bloco B — segurança e navegação

5. `lib/security/routePermissions.ts`
   - incluir a regra exata de `/cadastros` antes dos catch-all;
   - listar explicitamente a união de permissões aceitas pelo catálogo, para permanecer analisável
     por `validate:guard-permission-map`.
6. `layout/AppMenu.tsx`
   - substituir os itens cadastrais dispersos pela entrada única `/cadastros`;
   - remover permissões cadastrais dos pais operacionais quando elas não servirem mais nenhum filho;
   - preservar Notas fiscais, Simulador, Viagens, Ponto, Ordens, Lançamentos, Inventários e todos os
     demais destinos operacionais;
   - manter somente dois níveis (`grupo → link`), sem categoria intermediária.

### Bloco C — proteção da matriz

7. `tests/unit/cadastrosCatalogo.test.ts`
   - provar exatamente 34 ids/rotas únicos, oito categorias não vazias e a conta `34/34`;
   - provar que dependências apontam para ids existentes e que `/bancos` não foi anunciado;
   - para cada item, provar rota existente e permissões contidas na regra canônica que a protege;
   - provar que a união do catálogo é exatamente a regra de `/cadastros`, sem `arrayContaining`.
8. `tests/unit/routePermissions.test.ts`
   - acrescentar caso nominal de `/cadastros` e de subcaminho inexistente, sem alterar asserções
     dos guards filhos.
9. `tests/components/CadastrosPage.test.tsx`
   - sessões sem permissão, Administração, Fiscal, RH e permissão específica de catálogo;
   - categoria vazia ausente, busca local, vazio da busca e links canônicos;
   - provar que renderizar a central não dispara chamadas de domínio.
10. `tests/components/AppMenuCadastros.test.tsx`
    - provar entrada única e ausência dos 34 atalhos nos grupos antigos;
    - provar que filhos operacionais representativos continuam visíveis;
    - provar visibilidade da central com permissões representativas e ausência sem qualquer uma.
11. `tests/e2e/v1.11.0a8b77-central-cadastros.spec.ts`
    - abrir a central com perfis nominais de Administração, Fiscal e RH e validar isolamento dos
      cartões;
    - navegar por Filiais, Pessoas e Séries e confirmar as URLs canônicas;
    - abrir esses três deep links diretamente para provar compatibilidade;
    - provar acesso negado a `/cadastros` sem permissão e ausência de chamadas de domínio na central;
    - provar que os atalhos removidos não aparecem duplicados no menu.

### Bloco D — ritual de versão e comunicação operacional

12. Atualizar `package.json`, `config/app.ts`, `.env.example`, `.env.test`,
    `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md` e
    `CHANGELOG.md` para `v1.11.0a8b77`.
13. Carimbar, pelo comando previsto pelo projeto, os campos de versão em
    `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
    `scripts/backend-permissions.allowlist.json`, `scripts/guard-permission-map.allowlist.json` e
    `tests/evidence/integrated-e2e.assisted-evidence.example.json`; não editar artefato gerado para
    mascarar divergência.
14. `CHANGELOG.md` deve avisar antes do deploy: o acesso não muda, mas os atalhos de cadastro saem
    dos grupos antigos e passam para Cadastros; favoritos/deep links continuam válidos; nenhum grupo
    precisa receber permissão nova.

## 5. Contratos e tipos novos

Assinaturas de intenção, não implementação:

```ts
type CadastroClassificacao = 'cadastro' | 'configuracao' | 'misto';

type CadastroCategoriaId =
    | 'estrutura-organizacional'
    | 'pessoas-parceiros'
    | 'catalogo-estoque'
    | 'comercial-financeiro'
    | 'fiscal'
    | 'operacao-especializada'
    | 'contabil-patrimonio'
    | 'seguranca-acessos';

type CadastroItem = Readonly<{
    id: string;
    categoriaId: CadastroCategoriaId;
    ordem: number;
    label: string;
    descricao: string;
    icon: string;
    to: string;
    anyPermissions: readonly PermissionCode[];
    dependencias: readonly string[];
    classificacao: CadastroClassificacao;
}>;

type CadastroCategoria = Readonly<{
    id: CadastroCategoriaId;
    ordem: number;
    label: string;
    descricao: string;
}>;
```

O catálogo é contrato de navegação local. Não recebe Zod porque não cruza fronteira de rede ou
persistência; tipagem estática e teste nominal da matriz são as proteções. `dependencias` orienta e
gera texto/link, mas nunca habilita/desabilita gravação.

Campos de vínculo de entidade: **nenhum campo novo**. Os vínculos `empresaId`, `filialId`,
`pessoaId`, `produtoId` e semelhantes continuam nos componentes filhos com select/autocomplete por
API. A central não recebe GUID digitável nem propaga id por query string.

## 6. Estados de UI e regras de bloqueio

| Estado obrigatório | Comportamento de `/cadastros` |
| --- | --- |
| `loading` | não se aplica ao catálogo estático; a página não mostra spinner nem espera API. O carregamento da sessão continua responsabilidade do layout/autenticação atual. |
| `vazio` | busca local sem resultado mostra estado vazio específico e ação para limpar a busca. |
| `erro recuperável` | não se aplica: não há request da central para refazer. Erros das páginas filhas permanecem nelas. |
| `erro bloqueante` | catálogo inválido é falha de build/teste e bloqueia release; não há fallback silencioso em runtime. |
| `sucesso` | categorias permitidas, ordem recomendada e links canônicos visíveis; clicar navega sem montar outros CRUDs. |
| `permissão negada` | `RoutePermissionGate` mostra `UnauthorizedState` quando nenhuma permissão da união abre `/cadastros`. Dentro da página, item sem sua permissão fica oculto. |
| `ação indisponível com motivo` | não há ação de domínio na central. Cadastros bancários não aparecem; as cinco telas mistas abrem completas e explicam seus bloqueios no componente filho. |

Regras de bloqueio:

- nenhuma etapa anterior bloqueia a seguinte;
- categoria sem item permitido não aparece;
- item sem permissão não aparece como cartão desabilitado, preservando a política atual de ocultação;
- a central não trata sucesso/erro de gravação e não mantém formulário aberto;
- ações operacionais de Veículos, Colaboradores, Benefícios, Períodos e Bens permanecem nas páginas
  atuais e sob seus guards atuais;
- a retirada do atalho antigo bloqueia se a sessão que o via não conseguir ver a central e o mesmo
  item nela.

## 7. Testes e gates exigidos

Testes do recorte:

```powershell
npx vitest run tests/unit/cadastrosCatalogo.test.ts tests/unit/routePermissions.test.ts tests/components/CadastrosPage.test.tsx tests/components/AppMenuCadastros.test.tsx
```

Gates de fonte, permissões e release:

```powershell
npm run validate:source
npm run typecheck
npm run lint
npm run validate:guard-permission-map
npm run validate:backend-permissions
npm run validate:backend-contract-map
npm run validate:ci
npm run build
git diff --check
```

E2E obrigatório por `newScreen=true`, `navigationChange=true` e `permissionChange=true`:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3411'
npx playwright test tests/e2e/v1.11.0a8b77-central-cadastros.spec.ts --config=playwright.isolated.config.ts
npx playwright test tests/e2e/v1.11.0a8b77-central-cadastros.spec.ts --config=playwright.isolated.config.ts
```

Antes de aceitar o E2E, o `devops-frontend` deve confirmar que a porta 3411 é atendida pelo servidor
isolado desta árvore. As duas execuções precisam ser verdes. Resultado inexplicado ou servidor de
outra árvore é `ENVIRONMENT_UNVERIFIED`, não aprovação.

Prova vermelha obrigatória para a matriz unitária, sem criar script estrutural novo:

1. remover nominalmente `Filiais` do catálogo e obter falha `33/34`;
2. trocar a rota de `Séries fiscais` por destino inexistente e obter falha nominal;
3. retirar uma permissão da regra `/cadastros` e obter divergência nominal de união;
4. restaurar os arquivos e conferir o diff antes do verde final.

Critérios de aceite:

| Id | Critério | Evidência |
| --- | --- | --- |
| AC-1 | `/cadastros` exibe 34 destinos em oito categorias e na ordem de D106 | unidade + componente |
| AC-2 | Cada sessão vê somente itens cuja permissão atual possui | componente + E2E |
| AC-3 | A central faz zero chamadas de domínio ao abrir | componente + E2E de rede |
| AC-4 | Cada cartão usa a rota canônica; Filiais, Pessoas e Séries aceitam deep link direto | unidade + E2E |
| AC-5 | Menu tem uma entrada visual Cadastros e não repete os 34 atalhos | componente + `validate:guard-permission-map` |
| AC-6 | Rotas e ações filhas preservam guards; nenhuma permissão nova é criada | unidade + gates de permissão |
| AC-7 | Busca local encontra cadastro por nome e trata zero resultado | componente |
| AC-8 | Nenhum endpoint, schema, payload, query key ou regra fiscal/financeira/estoque muda | diff + backend contract map |

## 8. Riscos, ambiguidades e confirmações externas

1. **Drift entre três fontes.** Catálogo, `routePermissions` e menu terão a mesma união escrita em
   formas diferentes porque o analisador atual precisa de literais. Mitigação: teste de igualdade da
   união e `validate:guard-permission-map`.
2. **Perda de descoberta durante o deploy.** Remover o atalho antigo sem publicar a central para a
   mesma sessão cria perda aparente de acesso. Mitigação: alteração atômica e E2E nominal antes da
   remoção.
3. **DIV-2.** `CLASSIFICACOES_PESSOA_GERENCIAR` sem `PESSOAS_CONSULTAR` continua sem acesso. É
   preservação, não correção; qualquer ampliação exige fatia própria e CHANGELOG de acesso.
4. **DIV-3.** Catch-all de cinco famílias continua mais amplo que alguns itens. Endurecer agora pode
   retirar acesso existente e está nominalmente fora.
5. **Telas mistas.** A central abre a tela inteira; não cria modo `cadastro` e não extrai ações de
   manutenção, desligamento, concessão, fechamento ou baixa.
6. **Backend bancário.** `/bancos` fica fora dos 34 porque quatro GETs continuam sem contrato
   utilizável. Gatilho de inclusão: consultas, permissão e estados reais publicados.
7. **Carga visual.** São 34 links. O design precisa validar desktop e viewport reduzido, foco por
   teclado, ordem semântica e legibilidade; isso não autoriza tabs horizontais nem terceiro nível.
8. **Árvore suja.** O diff final precisa separar a `b77` das mudanças fiscais/harness já presentes.
   Nenhum arquivo alheio pode ser atribuído à central por conveniência.

Não há confirmação de backend bloqueando o início: a fatia é local e não muda contrato. Também não
há autorização para exibir progresso “concluído/pendente”; isso exigiria endpoint de prontidão por
empresa/filial e outra decisão.

Impactos:

- fiscal, financeiro e estoque: somente caminho de navegação; cálculo, saldo, título, emissão e
  escrituração não mudam;
- segurança: alto cuidado de paridade, sem código novo nem ampliação de permissão;
- auditoria: rotas antigas preservadas; links de evento e favoritos continuam válidos;
- LGPD: a central exibe metadados de navegação, não dados pessoais, payloads ou identificadores;
- performance: zero consulta de domínio na central e nenhum import dos 34 componentes filhos.

## 9. O que NÃO será alterado

- as 34 rotas filhas, seus componentes, formulários, APIs, hooks, schemas, query keys e payloads;
- regras fiscais, financeiras, estoque, contabilidade, RH, Frota, Produção ou Patrimônio;
- `types/erp.ts`, `features/seguranca/permissoesCatalogo.ts` e permissões do backend;
- os guards catch-all de Produtos, RH, Produção, Contábil e Patrimônio;
- a divergência de Classificações de pessoa;
- cadastro bancário placeholder e seus quatro contratos ausentes;
- normalização visual/interna dos 34 CRUDs; esta entrega unifica descoberta, ordem, busca e acesso;
- migração de URL para `/cadastros/<recurso>`, redirects ou query string de aba;
- terceiro nível no menu, mega-CRUD, montagem simultânea dos filhos ou cache compartilhado;
- endpoints de prontidão, percentual de implantação ou bloqueio entre etapas;
- arquivos de harness `.agents/**`, `.claude/**`, `.codex/**` e `skills/**`;
- commit, push, deploy ou execução contra backend real por efeito deste plano.

```json
{
  "status": "completed_with_warnings",
  "agent": "arquiteto-frontend",
  "slice": "v1.11.0a8b77",
  "node": "planner",
  "changedFiles": [
    "docs/arquitetura/debate/21-plano-central-cadastros.md"
  ],
  "acceptanceCriteria": {
    "AC-1": "planejado",
    "AC-2": "planejado",
    "AC-3": "planejado",
    "AC-4": "planejado",
    "AC-5": "planejado",
    "AC-6": "planejado",
    "AC-7": "planejado",
    "AC-8": "planejado"
  },
  "decisionsApplied": [
    "D106"
  ],
  "gates": {
    "validate:source": "not_run",
    "typecheck": "not_run",
    "lint": "not_run",
    "validate:guard-permission-map": "not_run",
    "validate:backend-permissions": "not_run",
    "validate:backend-contract-map": "not_run",
    "validate:ci": "not_run",
    "build": "not_run",
    "vitest.recorte": "not_run",
    "e2e": "not_run"
  },
  "measurements": [
    {
      "o_que": "destinos da central",
      "valor": 34,
      "como": "inventário 21 e conta nominal 5+4+5+3+5+6+4+2"
    },
    {
      "o_que": "categorias da cadeia",
      "valor": 8,
      "como": "ordem arbitrada em D106"
    },
    {
      "o_que": "chamadas de domínio esperadas ao abrir a central",
      "valor": 0,
      "como": "desenho de índice local P21-PLAT-1; deve ser provado por componente e E2E"
    }
  ],
  "risks": [
    "A união de permissões fica literal em catálogo, guard e menu e exige teste de paridade.",
    "Retirar atalhos antigos sem sessão nominal equivalente produz perda aparente de acesso.",
    "A árvore atual contém mudanças fiscais e de harness fora da fatia e exige reconciliação do diff.",
    "Cinco telas mistas continuam expondo suas ações operacionais quando abertas pela central.",
    "Cadastros bancários permanecem fora até o backend publicar quatro consultas utilizáveis."
  ],
  "blockers": [],
  "handoff": {
    "testsRequired": true,
    "e2eRequired": true,
    "qaReviewRequired": true,
    "acsToCover": [
      "AC-1",
      "AC-2",
      "AC-3",
      "AC-4",
      "AC-5",
      "AC-6",
      "AC-7",
      "AC-8"
    ],
    "notes": "Implementar o índice completo 34/34 em uma versão; preservar rotas e contratos filhos; não absorver mudanças fiscais ou de harness do working tree."
  },
  "nextRecommendedAgent": "dev-senior-react"
}
```
