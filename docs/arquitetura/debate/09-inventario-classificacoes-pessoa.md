# Inventário — Classificações de Pessoa (rodada 09, `v1.11.0a8b67`)

Agente: `inventariante-contrato-tela`. Branch: `codex/v1.11.0a8b67-classificacoes-pessoa`, em cima de
`b66` (`d47161e`). Acesso ao backend: `../New project 3/src` disponível e usado como fonte
primária. Banco: não verificado (sem container subido nesta rodada, conforme instrução do
briefing).

Recorte: (1) o CRUD de Classificações de Pessoa que o backend já expõe e que esta versão vai
cobrir com tela; (2) o campo `classificacaoId` no Cliente, hoje sem seletor (D65); (3) o que falta
em permissão/rota/menu/gate para a tela nova.

**Achado de partida, medido, não deduzido**: `grep -rln "ClassificacaoPessoa\|classificacoes-pessoa\|classificacaoPessoa" features/ app/ lib/ components/ layout/` não retornou nenhum arquivo. O único
rastro do assunto no frontend hoje é a permissão já cadastrada em `types/erp.ts:253` e
`features/seguranca/permissoesCatalogo.ts:50`, e o campo `classificacaoId` que já trafega dentro do
Cliente (D65, rodada 08). Não existe rota, página, componente, schema, tipo, hook nem client de API
para o catálogo em si. `docs/backend-v1.23/CONTRATO-API-v1.23.md:2502` confirma pelo lado do
backend: `## ClassificacoesPessoa — 0/4 consumidos pelo frontend`.

---

## 1. Endpoints — verbo, rota, permissão, request/response campo a campo

Fonte: `../New project 3/src/Erp.Api/Controllers/Pessoas/ClassificacoesPessoaController.cs`,
`Erp.Application/Pessoas/Classificacoes/ClassificacaoPessoaRequests.cs`,
`ClassificacaoPessoaResponse.cs`, `ClassificacaoPessoaValidators.cs`,
`Erp.Domain/Pessoas/ClassificacaoPessoa.cs`, `Erp.Infrastructure/Pessoas/PessoasRepository.cs:128-140`.

| Verbo | Rota | Permissão (`[RequiredPermission]`) | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/api/pessoas/classificacoes` | `PessoasConsultar` (`PESSOAS_CONSULTAR`) | `Listar([FromQuery] Guid empresaId, [FromQuery] string? termo)` — controller:22-28 |
| `POST` | `/api/pessoas/classificacoes` | `ClassificacoesPessoaGerenciar` (`CLASSIFICACOES_PESSOA_GERENCIAR`) | `Criar([FromBody] CriarClassificacaoPessoaRequest)` — controller:30-41 |
| `PUT` | `/api/pessoas/classificacoes/{id}` | `ClassificacoesPessoaGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarClassificacaoPessoaRequest)` — controller:43-54 |
| `POST` | `/api/pessoas/classificacoes/{id}/inativar` | `ClassificacoesPessoaGerenciar` | `Inativar(Guid id, [FromBody] InativarClassificacaoPessoaRequest)` — controller:56-67, retorna `204 NoContent`, sem corpo |

Não existe `POST /{id}/reativar` nem qualquer endpoint de reativação neste controller — confirmado
lendo o arquivo inteiro (68 linhas, 4 ações). `AuditableEntity.Reativar` (`Erp.Domain/Common/AuditableEntity.cs:48-63`)
existe na classe base e teoricamente poderia ser exposto, mas **não é chamado por nenhum use case
de Classificação de Pessoa** (`grep -rn "Reativar" Erp.Application/Pessoas/Classificacoes/` não
retornou nada). O mesmo padrão (inativar sem reativar) já existe em `CondicoesPagamentoController.cs`
(4 rotas: GET/POST/PUT/POST inativar, sem reativar) — não é uma lacuna desta fatia, é o padrão do
módulo de cadastros simples.

**Paginação e filtros da listagem** (`PessoasRepository.cs:128-140`, método real — há um método
homônimo de `Transportadora` nas linhas 105-117 do mesmo arquivo que não deve ser confundido com
este):

- Sem paginação: `ListarClassificacoesPessoaAsync` retorna `IReadOnlyList<ClassificacaoPessoa>`
  completo, ordenado por `Codigo`. Não há `page`/`pageSize` no controller nem no repositório.
- Filtro `termo`: opcional, faz `Codigo.Contains(filtro) || Nome.ToUpper().Contains(filtro)`
  (case-insensitive via `ToUpperInvariant`).
- **Não existe filtro `ativo` em lugar nenhum** — nem no controller (`[FromQuery]` só tem
  `empresaId` e `termo`), nem no repositório. A listagem sempre traz ativos e inativos juntos; a
  UI, se quiser separar, precisa filtrar em memória pelo campo `Status` da resposta.
- `empresaId` é obrigatório na assinatura do `GET` (`Guid empresaId`, não `Guid?`) — a classificação
  é sempre listada por empresa.

**Campos, tipo e anulabilidade** (`ClassificacaoPessoaRequests.cs`, `ClassificacaoPessoaResponse.cs`,
validadores em `ClassificacaoPessoaValidators.cs`):

| Record | Campo | Tipo | Anulável | Limite/validação |
| --- | --- | --- | --- | --- |
| `CriarClassificacaoPessoaRequest` | `EmpresaId` | `Guid` | não | `NotEmpty` |
| | `Codigo` | `string` | não | `NotEmpty`, `MaximumLength(40)`; domínio normaliza para maiúsculo/trim e rejeita espaço interno (`ClassificacaoPessoa.cs:42-51`) |
| | `Nome` | `string` | não | `NotEmpty`, `MaximumLength(120)` |
| | `Descricao` | `string?` | sim | `MaximumLength(300)` |
| `AtualizarClassificacaoPessoaRequest` | `EmpresaId` | `Guid` | não | `NotEmpty` — usado só para escopar a busca do registro (ver §2), não é alterado |
| | `Nome` | `string` | não | `NotEmpty`, `MaximumLength(120)` |
| | `Descricao` | `string?` | sim | `MaximumLength(300)` |
| `InativarClassificacaoPessoaRequest` | `EmpresaId` | `Guid` | não | `NotEmpty` |
| | `Motivo` | `string` | não | `NotEmpty`, `MaximumLength(500)` — **motivo é obrigatório para inativar**, herdado de `AuditableEntity.Inativar` (`AuditableEntity.cs:29-46`, lança `DomainException` se vazio) |
| `ClassificacaoPessoaResponse` | `Id` | `Guid` | não | — |
| | `EmpresaId` | `Guid` | não | — |
| | `Codigo` | `string` | não | — |
| | `Nome` | `string` | não | — |
| | `Descricao` | `string?` | sim | — |
| | `Status` | `EntityStatus` (enum: `Ativo=1, Inativo=2, Cancelado=3, Bloqueado=4, Pendente=5` — `Erp.Domain/Common/EntityStatus.cs`) | não | Classificação só usa `Ativo`/`Inativo` na prática (`AuditableEntity` só tem `Inativar`, nunca seta `Cancelado`/`Bloqueado`/`Pendente` nesse fluxo) |

`ClassificacaoPessoaMapper.ParaResponse` (`ClassificacaoPessoaMapper.cs:7-8`) mapeia os seis campos
1:1, sem transformação — response e entidade batem exatamente.

## 2. Semântica de gravação

- **O `PUT` substitui, não faz merge**, para os dois campos que aceita: `ClassificacaoPessoa.Atualizar(nome, descricao)`
  (`ClassificacaoPessoa.cs:31-40`) reatribui `Nome` e `Descricao` inteiros a cada chamada — omitir
  `Descricao` no payload (enviar `null`) apaga a descrição gravada, o mesmo padrão de "omitir apaga"
  já registrado na D62 para o Cliente.
- **`Codigo` é imutável depois de criado**: não existe em `AtualizarClassificacaoPessoaRequest`, e
  `ClassificacaoPessoa` não tem setter público para `Codigo` fora do construtor. O precedente de UI
  (`CondicaoPagamentoFormDialog.tsx:52`) já trata isso assim — campo `Código` com
  `disabled={loading || editing}`.
- **`Atualizar` falha se a classificação estiver inativa**: `Atualizar` lança `DomainException`
  ("Classificação inativa não pode ser alterada.") se `!IsActive` (`ClassificacaoPessoa.cs:33-36`).
  Isso significa: para editar uma classificação inativa, é preciso reativá-la primeiro — mas **não
  existe endpoint de reativação** (ver §1). Na prática, hoje, uma classificação inativada fica
  travada em Nome/Descrição para sempre. Registro como achado, não decisão.
- **Unicidade por empresa+código**: `CriarClassificacaoPessoaUseCase.ExecutarAsync`
  (`CriarClassificacaoPessoaUseCase.cs:44-47`) consulta
  `_repository.ObterClassificacaoPessoaPorCodigoAsync(classificacao.EmpresaId, classificacao.Codigo, ...)`
  antes de gravar e retorna `PessoaErrors.ClassificacaoCodigoDuplicado` se já existir. A unicidade é
  **por empresa**, não global — duas empresas podem ter a mesma sigla de código.
- **A classificação é por empresa**: `ClassificacaoPessoa` herda `AuditableEntity.EmpresaId`
  (obrigatório, `DefinirContextoOrganizacional`) e não tem `FilialId` setado
  (`ClassificacaoPessoa.cs:21`, passa `null`) — não há recorte por filial, só por empresa.
- **Inativar exige motivo**: sim, `Motivo` é `NotEmpty` no validator e na entidade base (ver tabela
  acima). Não existe inativação sem motivo.
- `Atualizar`/`Inativar` buscam o registro por `ObterClassificacaoPessoaPorIdAsync(empresaId, id, ...)`
  (`PessoasRepository.cs:122-123`) — **escopado por empresa**: um `id` de outra empresa retorna
  "não encontrada" mesmo existindo no banco, então o `EmpresaId` do payload precisa ser o mesmo da
  empresa do registro sendo editado, não é livre.

## 3. Permissões — união, catálogo, rota, menu

**Já existem** (nenhuma edição necessária nestes dois arquivos):

- `types/erp.ts:249` (`PESSOAS_CONSULTAR`) e `:253` (`CLASSIFICACOES_PESSOA_GERENCIAR`) — ambos no
  union `PermissionCode`.
- `features/seguranca/permissoesCatalogo.ts:46` (`PESSOAS_CONSULTAR`) e `:50`
  (`CLASSIFICACOES_PESSOA_GERENCIAR`, grupo `'Pessoas'`, label `'Classificações · Gerenciar'`) —
  ambos no catálogo.

**Faltam** (as "três edições" que o `CLAUDE.md` descreve, mais uma quarta porque o menu tem pai e
filho):

1. **`lib/security/routePermissions.ts`** — hoje a única regra que cobriria uma rota
   `/pessoas/classificacoes` é a genérica de `pessoas`, linha 14:
   `{ pattern: /^\/pessoas(?:\/.*)?$/, anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'], ... }`.
   Essa regra **não contém `CLASSIFICACOES_PESSOA_GERENCIAR`**. Um usuário com só
   `CLASSIFICACOES_PESSOA_GERENCIAR` (sem `PESSOAS_CONSULTAR`/`PESSOAS_GERENCIAR`) seria barrado
   pelo `RoutePermissionGate` mesmo tendo autorização de gerenciar no backend.
   Dois precedentes de como resolver isso já existem na própria lista, e a escolha entre eles é da
   rodada, não minha: (a) dobrar a regra genérica de `/produtos` (`routePermissions.ts:17`), que
   inclui `CATEGORIAS_PRODUTO_GERENCIAR`, `UNIDADES_MEDIDA_GERENCIAR`, `MARCAS_GERENCIAR` junto com
   `PRODUTOS_CONSULTAR`/`PRODUTOS_GERENCIAR` numa única regra; (b) abrir uma regra específica antes
   da genérica, como `/financeiro/condicoes-pagamento` (`routePermissions.ts:35`) faz para não
   herdar todo o `anyOf` de `/financeiro`.
2. **`layout/AppMenu.tsx`, item pai `'Cadastros'`** (linha 73) — `anyPermissions` hoje é
   `['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR', 'CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR', 'FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR', 'PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR', 'CATEGORIAS_PRODUTO_GERENCIAR', 'UNIDADES_MEDIDA_GERENCIAR', 'MARCAS_GERENCIAR']`
   — **não contém `CLASSIFICACOES_PESSOA_GERENCIAR'`**. O padrão do próprio grupo já mostra a regra:
   toda permissão `*_GERENCIAR` de um item-filho aparece também na lista do pai
   (`CATEGORIAS_PRODUTO_GERENCIAR`, `UNIDADES_MEDIDA_GERENCIAR`, `MARCAS_GERENCIAR`,
   `CONDICOES_PAGAMENTO_GERENCIAR` em `'Financeiro'` linha 110). Sem essa entrada, um usuário com só
   `CLASSIFICACOES_PESSOA_GERENCIAR` não vê o grupo `'Cadastros'` inteiro — exatamente o efeito que
   `CLAUDE.md` descreve ("o filtro avalia item pai e item filho de forma independente").
3. **`layout/AppMenu.tsx`, item filho novo** — não existe. Precisa de uma entrada dentro de
   `items` do grupo `'Cadastros'` (linhas 74-82), no padrão de `'Categorias'` (linha 79):
   `{ label: '...', icon: '...', to: '/pessoas/classificacoes' (ou outra rota), anyPermissions: ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR'] }`.
4. Ambos os três pontos acima são também o que `scripts/lib/guard-permission-map.mjs` audita
   estruturalmente (ver §7) — a falta de (1)/(2) não é só um risco de leitura manual, é reprovação de
   gate mensurável.

**Risco de acesso** (vocabulário `risk.yaml`, para o arquiteto de plataforma classificar): um
usuário que hoje tenha `CLASSIFICACOES_PESSOA_GERENCIAR` sozinho (sem `PESSOAS_CONSULTAR`) já
existe em tese no catálogo desde que a permissão foi criada — verifiquei que ninguém no frontend a
usa hoje, então na prática esse grupo de acesso, se existir em produção, está sem nenhuma tela
alcançável por ela. Corrigir as três edições acima é estritamente uma **abertura de acesso** (a
tela passa a existir onde antes não existia nada) — não há remoção de capacidade de ninguém.

## 4. O seletor no Cliente (`classificacaoId`)

- Endpoint: `GET /api/pessoas/classificacoes` (mesmo catálogo). Permissão: `PESSOAS_CONSULTAR`
  (não `CLASSIFICACOES_PESSOA_GERENCIAR` — a leitura para popular um dropdown não exige a permissão
  de gerenciar, o mesmo padrão de `TABELAS_PRECO_CONSULTAR` e `FINANCEIRO_CONSULTAR` para os outros
  dois seletores do mesmo diálogo).
- **O catálogo é por empresa**: confirmado tanto no backend (`GET` exige `empresaId` obrigatório,
  `PessoasRepository.cs:131` filtra `x.EmpresaId == empresaId`) quanto no precedente direto de
  query key — `condicoesPagamentoQueryKey(empresaId)` em
  `features/financeiro/hooks/useFinanceiroResources.ts:61-66`. Um hook novo para classificações
  seguiria o mesmo formato de chave.
- **Precedente de rótulo neutro (D66) já existe e cobre exatamente este caso**: `ClienteFormDialog.tsx:36-39`
  (`comValorGravadoNeutro`) já é usado para `tabelaPrecoPadraoId` (linha 93) e
  `condicaoPagamentoPadraoId` (linha 94) — sem a permissão do catálogo (`TABELAS_PRECO_CONSULTAR`,
  `FINANCEIRO_CONSULTAR`), o campo fica com uma opção sintética de rótulo neutro
  (`'Configurado — sem permissão para ver o nome'`) e o `EntitySelect` correspondente fica
  `disabled`. `classificacaoId` **não tem nenhuma dessas três peças hoje** (nem hook, nem
  `comValorGravadoNeutro`, nem `EntitySelect` na aba Comercial) — confirmado lendo
  `ClienteFormDialog.tsx` inteiro (186 linhas): o campo só aparece nas linhas 52/65
  (`buildInitialValues`), nunca no JSX da `TabPanel header="Comercial"` (linhas 158-181).
- **`classificacaoId` gravado continua indo no `PUT`**: confirmado.
  `features/clientes/schemas/clientesSchemas.ts:41` declara `classificacaoId: nullableGuid` dentro
  de `configurarComercialClienteSchema`; `ClienteFormDialog.tsx:52` hidrata do registro ao editar; o
  comentário nas linhas 47-49 do mesmo arquivo documenta explicitamente que omitir qualquer um dos
  cinco campos da aba Comercial apaga o vínculo no backend (D62). Não há caminho de regressão aqui
  desde que o seletor novo continue escrevendo no mesmo campo do mesmo objeto de estado.

## 5. Precedente de tela — Tabelas de Preço e Condições de Pagamento

Os dois moldes têm formas diferentes; qual dos dois a tela de Classificação de Pessoa deve seguir é
decisão da rodada, não minha, mas os fatos de cada um:

**Condições de Pagamento** — molde mais próximo do CRUD simples que o backend de Classificação de
Pessoa oferece (GET sem paginação, POST, PUT, POST inativar, sem reativar):
- Sem página própria em `features/`: vive dentro do módulo já existente
  (`features/financeiro/components/CondicoesPagamentoPage.tsx`,
  `CondicaoPagamentoFormDialog.tsx`) — não há `features/condicoes-pagamento/`.
- Rota: `app/(main)/financeiro/condicoes-pagamento/page.tsx` (5 linhas, só renderiza a página da
  feature).
- Listagem: sem paginação de servidor, filtro local por `codigo`/`nome` em memória
  (`CondicoesPagamentoPage.tsx:24-28,43-44`), com `DataTableServer` recebendo o array já fatiado.
- Botão "Nova condição": `PermissionGuard permission="CONDICOES_PAGAMENTO_GERENCIAR" mode="disable"`
  (linha 56).
- Ações de linha: `DataTableActions` com `permission: 'CONDICOES_PAGAMENTO_GERENCIAR'` por ação
  (linha 57).
- Inativação: `ReasonDialog` (linha 59) — motivo obrigatório coletado na UI antes de chamar a
  mutação, batendo com o backend exigir `Motivo` não-vazio.
- Bloqueio de tela: `if (!hasPermission('FINANCEIRO_CONSULTAR') && !hasPermission('CONDICOES_PAGAMENTO_GERENCIAR')) return <UnauthorizedState .../>` (linha 46).
- Código imutável na edição: `InputText ... disabled={loading || editing}` (`CondicaoPagamentoFormDialog.tsx:52`).
- Rota registrada em `routePermissions.ts:35` como regra própria (antes da genérica `/financeiro`),
  item de menu em `AppMenu.tsx:117` com `anyPermissions: ['FINANCEIRO_CONSULTAR', 'CONDICOES_PAGAMENTO_GERENCIAR']`,
  e o pai `'Financeiro'` (linha 110) já inclui `CONDICOES_PAGAMENTO_GERENCIAR` no seu `anyPermissions`.

**Tabelas de Preço** — molde mais rico (paginação de servidor, ação extra "Ativar", mestre-detalhe
com itens):
- Módulo próprio: `features/tabelas-preco/{api,components,hooks,schemas,types}`.
- Rota: `app/(main)/tabelas-preco/page.tsx`.
- Listagem: paginação de servidor real (`TabelaPrecoListQuery` com `page`/`pageSize`,
  `TabelasPrecoPage.tsx:52-54`) — não se aplica ao catálogo de Classificação, que não pagina no
  backend.
- Tem uma permissão adicional de ativação (`TABELAS_PRECO_ATIVAR`) que Classificação de Pessoa não
  tem par no backend (sem endpoint de reativar, ver §1) — este molde não se aplica nesse ponto.
- Bloqueio de tela: `if (!hasPermission('TABELAS_PRECO_CONSULTAR')) return <UnauthorizedState .../>` (linha 66-68).

## 6. Gate de contrato (`gate-contract-request-fields.mjs`)

- **Os três records de Classificação de Pessoa não estão em `SCHEMA_TO_REQUEST_MAP` nem em
  `recordNames`** (`scripts/gate-contract-request-fields.mjs:29-56`, listei as 9 entradas — nenhuma
  é `CriarClassificacaoPessoaRequest`, `AtualizarClassificacaoPessoaRequest` ou
  `InativarClassificacaoPessoaRequest`). O gate não vai auditar os schemas Zod que a fatia criar,
  a menos que alguém adicione as três entradas ao mapa.
- **O documento-fonte já tem as assinaturas no formato que o gate precisa**:
  `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3018-3021` tem
  `AtualizarClassificacaoPessoaRequest( Guid EmpresaId, string Nome, string? Descricao)`,
  `ClassificacaoPessoaResponse(...)`, `CriarClassificacaoPessoaRequest( Guid EmpresaId, string Codigo, string Nome, string? Descricao)`,
  `InativarClassificacaoPessoaRequest( Guid EmpresaId, string Motivo)` — cada um em início de linha,
  que é exatamente o padrão `^${recordName}\\s*\\(...` que a regex do gate (`gate-contract-request-fields.mjs:87`)
  procura. Não falta nada no documento-fonte; falta só o cadastro no script.
- Achado paralelo, não desta fatia: `CondicaoPagamentoRequest`/`AtualizarCondicaoPagamentoRequest`
  (o precedente direto, §5) **também não estão** no mapa do gate — a lacuna de cobertura não é
  exclusiva de Classificação de Pessoa, é do padrão de cadastro simples inteiro.

## 7. Gates de permissão (`validate:backend-contract-map`, `validate:guard-permission-map`, `validate:backend-permissions`)

- **`validate:backend-contract-map`** lê `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`
  (`scripts/validate-backend-contract-map.mjs:12`) e escaneia `features/**` e `lib/**` por chamadas
  `httpClient.<verbo>(...)` (`scripts/lib/backend-contract-map.mjs:165-190`), comparando contra as
  rotas que o parser extrai do documento (`### \`caminho\`` seguido de `| \`VERBO\` | \`.../ \` | ...`).
  As quatro rotas de `/api/pessoas/classificacoes` já estão documentadas lá
  (`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1691-1700`, seção `### \`api/pessoas/classificacoes\``).
  **Se o client novo usar exatamente essas quatro rotas com o mesmo formato de path** (inclusive o
  `{id}` resolvendo para `{param}` via uma variável terminada em `Id`), o gate passa sem precisar de
  entrada nova em `scripts/backend-contract-map.allowlist.json` — o allowlist hoje só registra
  divergências conhecidas de outros módulos (Bancos, Estoque, Financeiro, RH, Relatórios), nenhuma
  delas relacionada a Pessoas/Classificações.
- **`validate:guard-permission-map`** usa um documento **diferente**:
  `docs/backend-v1.23/CONTRATO-API-v1.23.md` (`scripts/lib/guard-permission-map.mjs:589`), não o
  `BACKEND-ESTADO-ATUAL-E-CONTRATO.md`. Também já documenta as quatro operações com a permissão
  certa por verbo (`docs/backend-v1.23/CONTRATO-API-v1.23.md:2504-2588`, confirmei GET →
  `PESSOAS_CONSULTAR`, POST/PUT/POST-inativar → `CLASSIFICACOES_PESSOA_GERENCIAR`, batendo com o
  controller). O gate cobra três coisas (C1-C3 em `scripts/lib/guard-permission-map.mjs:662-829`):
  - **C1** (`chamadaSemGuard`): o módulo dono do arquivo que faz a chamada HTTP precisa conter, em
    algum lugar do seu próprio diretório `features/<modulo>/**`, o literal de string da permissão
    exigida (`'PESSOAS_CONSULTAR'`, `'CLASSIFICACOES_PESSOA_GERENCIAR'`) — hoje **nenhum arquivo do
    frontend contém o literal `'CLASSIFICACOES_PESSOA_GERENCIAR'`** (`grep -rn` retornou só
    `permissoesCatalogo.ts:50` e `types/erp.ts:253`, nenhum dos dois em `features/`). A tela nova
    precisa declarar esse literal (via `hasPermission`, `PermissionGuard` ou `DataTableActions`
    `permission:`) dentro do módulo que hospeda a chamada HTTP, senão o gate acusa `chamadaSemGuard`
    novo e estoura o teto fechado do allowlist (`scripts/guard-permission-map.allowlist.json`,
    `"status": "registro-fechado-monotonico"`, `"teto": { "chamadaSemGuard": 9, ... }`).
  - **C2** (`menuHierarquia`): exige que toda permissão do item-filho do menu esteja também no
    `anyPermissions` do grupo pai — é exatamente a falta que registrei no §3, item 2
    (`'Cadastros'` sem `CLASSIFICACOES_PESSOA_GERENCIAR'`). Se o item novo entrar como descrito no
    §3 sem corrigir o pai, este gate **reprova**, não é só um risco de leitura manual.
  - **C3** (`menuSemRegra`/`menuForaDaRegra`): exige que a permissão do item de menu esteja contida
    no `anyOf` da regra de `routePermissions.ts` que casa com a rota do item — é a mesma falta do
    §3, item 1. Se a rota nova cair sob a regra genérica de `/pessoas` sem `CLASSIFICACOES_PESSOA_GERENCIAR`
    no `anyOf`, este gate também reprova.
  - Nenhuma entrada nova precisa ir para `scripts/guard-permission-map.allowlist.json` **se** as
    três edições do §3 forem feitas corretamente — o allowlist registra divergências toleradas
    (módulos órfãos como `bancos`, `auditoria`), não é o lugar para abrir uma permissão nova; o
    arquivo é gerado/fechado e a instrução do projeto proíbe editá-lo à mão para contornar o gate.
- **`validate:backend-permissions`** compara o union `PermissionCode` contra o snapshot do backend
  (`scripts/backend-permissions.snapshot.json`, gerado por `generate-backend-permissions-snapshot.mjs`).
  Como `CLASSIFICACOES_PESSOA_GERENCIAR` e `PESSOAS_CONSULTAR` já existem dos dois lados (§3), este
  gate não tem trabalho novo aqui — não verifiquei a data do snapshot atual contra o backend em
  execução (sem acesso a ambiente rodando nesta rodada), mas o código-fonte do backend já expõe as
  duas constantes em `SystemPermissions.cs:46,50` e ambas aparecem na lista de permissões do sistema
  (`SystemPermissions.cs:294,298`).

---

## Tabela 1 — Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/clientes` (existente) | `app/(main)/clientes/page.tsx` | `features/clientes/components/ClienteFormDialog.tsx`, aba "Comercial" (linhas 158-181) — `classificacaoId` trafega sem seletor (D65) | `CLIENTES_CONSULTAR` / `CLIENTES_GERENCIAR` (rota do Cliente; o campo em si não tem guarda própria) | `lib/security/routePermissions.ts:15` |
| Classificações de Pessoa (proposta, **ausente**) | ausente — nenhum arquivo em `app/(main)/pessoas/` além de `page.tsx` da listagem de Pessoas (`find "app/(main)/pessoas" -type f` só retornou esse) | ausente — `grep -rln "ClassificacaoPessoa"` em `features/` não retornou nada | Backend exige `PESSOAS_CONSULTAR` para listar e `CLASSIFICACOES_PESSOA_GERENCIAR` para criar/editar/inativar (§1); nenhuma das duas está associada a uma rota do frontend hoje | ausente em `routePermissions.ts` e em `layout/AppMenu.tsx` (ver §3) |

## Tabela 2 — Endpoints consumidos

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/pessoas/classificacoes` | ausente — nenhum client consome | ausente | `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1697`; `docs/backend-v1.23/CONTRATO-API-v1.23.md:2504-2510` | Sim — `ClassificacoesPessoaController.cs:22-28` |
| `POST /api/pessoas/classificacoes` | ausente | ausente | `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1698`; `docs/backend-v1.23/CONTRATO-API-v1.23.md:2513-2529` | Sim — `ClassificacoesPessoaController.cs:30-41` |
| `PUT /api/pessoas/classificacoes/{id}` | ausente | ausente | `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1699`; `docs/backend-v1.23/CONTRATO-API-v1.23.md:2544-2571` | Sim — `ClassificacoesPessoaController.cs:43-54` |
| `POST /api/pessoas/classificacoes/{id}/inativar` | ausente | ausente | `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1700`; `docs/backend-v1.23/CONTRATO-API-v1.23.md:2574-2588` | Sim — `ClassificacoesPessoaController.cs:56-67`, resposta `204 NoContent` |

Nenhum dos quatro está em `scripts/backend-contract-map.allowlist.json` (verificado —
`grep -n "pessoas" scripts/backend-contract-map.allowlist.json` não retornou nada) porque nenhum
está sendo consumido; não há divergência de contrato para registrar.

## Tabela 3 — Campos

Contagem: `ClassificacaoPessoaResponse` tem **6 campos** (medido em
`ClassificacaoPessoaResponse.cs:5-11`, confirmado 1:1 pelo `ClassificacaoPessoaMapper.cs:8`).
`CriarClassificacaoPessoaRequest` tem **4** (`ClassificacaoPessoaRequests.cs:3-7`),
`AtualizarClassificacaoPessoaRequest` tem **3** (`:9-12`), `InativarClassificacaoPessoaRequest` tem
**2** (`:14-16`). União de nomes de campo distintos no domínio: `Id`, `EmpresaId`, `Codigo`, `Nome`,
`Descricao`, `Status`, `Motivo` = **7 campos únicos**. Nenhum dos 7 tem tipo declarado no frontend
hoje (medido: `grep -rln "ClassificacaoPessoa" features/` vazio) — por isso a coluna "Destino
declarado" abaixo é `sem uso` para todos, não por engano meu, mas porque é o estado real. Somo a
isso o único campo do domínio de Classificação que **já** tem uma perna no frontend:
`Cliente.classificacaoId`, que referencia o `Id` deste catálogo.

| Campo | Tipo no frontend | Origem (endpoint/campo) | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `Id` | inexistente — sem schema/tipo declarado | `GET/POST/PUT /api/pessoas/classificacoes` → `ClassificacaoPessoaResponse.Id` | Sim (`ClassificacaoPessoaResponse.cs:6`) | sem uso |
| `EmpresaId` | inexistente | idem → `.EmpresaId` | Sim (`:7`) | sem uso |
| `Codigo` | inexistente | idem → `.Codigo` | Sim (`:8`) | sem uso |
| `Nome` | inexistente | idem → `.Nome` | Sim (`:9`) | sem uso |
| `Descricao` | inexistente | idem → `.Descricao` | Sim (`:10`) | sem uso |
| `Status` | inexistente | idem → `.Status` (`EntityStatus`, já compartilhado em `types/erp.ts:6`) | Sim (`:11`) | sem uso |
| `Motivo` (só em `Inativar`) | inexistente | `POST .../inativar` → `InativarClassificacaoPessoaRequest.Motivo` | Exigido pelo backend (`ClassificacaoPessoaValidators.cs:26-32`) | sem uso |
| `classificacaoId` (no Cliente, referencia `Id` deste catálogo) | `Guid \| null` — `features/clientes/types/clientes.types.ts:21,51` | `ClienteResponse.classificacaoId` (lido) / `ConfigurarComercialClienteRequest.classificacaoId` (reenviado) | Sim — confirmado no inventário da rodada 08, `docs/arquitetura/debate/08-inventario-cliente-fornecedor.md:182` | enviado — `ClienteFormDialog.tsx:52,65`, `features/clientes/schemas/clientesSchemas.ts:41`; **não é `exibido`**: não há nenhum controle na aba Comercial que o mostre (confirmei lendo as 186 linhas do arquivo, JSX da aba nas linhas 158-181 não o referencia) |

## Tabela 4 — Estados de tela

Nenhum componente existe para a tela de Classificações de Pessoa — todos os sete estados são
`ausente` por não haver onde procurá-los, não por dedução.

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classificações de Pessoa (proposta) | ausente | ausente | ausente | ausente | ausente | ausente | ausente |

A aba "Comercial" do Cliente (onde `classificacaoId` já trafega) teve seus sete estados cobertos
pelo inventário da rodada 08 (`docs/arquitetura/debate/08-inventario-cliente-fornecedor.md`); não
reproduzo aqui porque D65 manteve o campo sem controle de UI nesta versão — nenhum estado novo foi
adicionado para ele.

---

## Divergências

1. **Campo entregue pelo backend que a UI ignora — os seis campos de `ClassificacaoPessoaResponse`
   inteiros.** Nenhum arquivo do frontend declara tipo para `Id`, `EmpresaId`, `Codigo`, `Nome`,
   `Descricao` ou `Status` deste catálogo (medido por `grep -rln "ClassificacaoPessoa" features/`,
   zero resultados). É o estado de partida que esta rodada existe para fechar, não uma surpresa —
   registro aqui porque é exatamente o tipo de achado que a tabela pede, com a citação exata de onde
   o backend os declara (`ClassificacaoPessoaResponse.cs:5-11`).
2. **Permissão exigida pelo backend (`CLASSIFICACOES_PESSOA_GERENCIAR`) ausente da regra de rota e
   do item de menu, apesar de já estar no union e no catálogo.** Detalhado no §3: falta em
   `lib/security/routePermissions.ts` (não há regra própria nem a genérica de `/pessoas` cobre) e em
   `layout/AppMenu.tsx` no grupo `'Cadastros'` (linha 73). Diferente do item 1, este não é "estado de
   partida esperado" — é uma armadilha operacional concreta: se a tela nova for ligada sem tocar
   nesses dois arquivos, um usuário com só `CLASSIFICACOES_PESSOA_GERENCIAR` fica sem acesso à tela
   que a permissão dele deveria abrir, e dois gates (`validate:guard-permission-map`, C2 e C3)
   reprovam por causa disso — não é hipótese, é o comportamento medido do script
   (`scripts/lib/guard-permission-map.mjs:704-829`).
3. **Gate estrutural sem cobertura — `gate-contract-request-fields.mjs` não inclui os três records
   de Classificação de Pessoa**, apesar de o documento-fonte já ter as assinaturas no formato exato
   que o parser do gate exige (`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3018-3021`). Isso não é uma
   divergência de contrato (documento e backend batem), é uma lacuna de escopo do script — a mesma
   lacuna já existe para o precedente direto, `CondicaoPagamentoRequest`/`AtualizarCondicaoPagamentoRequest`,
   então não é peculiar a este assunto.
4. **Capacidade do domínio sem endpoint correspondente** — `AuditableEntity.Reativar`
   (`Erp.Domain/Common/AuditableEntity.cs:48-63`) existe e exige motivo, mas
   `ClassificacoesPessoaController` não expõe nenhuma rota de reativação. Não é uma divergência entre
   frontend e backend (não há frontend ainda), é uma característica do contrato que qualquer decisão
   de tela precisa levar em conta: hoje, inativar uma classificação por engano não tem desfazer pela
   API — e `Atualizar` também fica bloqueado numa classificação inativa (`ClassificacaoPessoa.cs:33-36`).
   O mesmo padrão existe em `CondicoesPagamentoController` (sem reativar também), então não é um
   comportamento isolado deste endpoint.

Não encontrei, nesta rodada: campo lido pela UI que o backend não entrega (não há UI); tipo
divergente entre schema Zod e resposta real (não há schema Zod); enum fixo no frontend sem par no
backend (o catálogo não usa enum próprio, só `Codigo`/`Nome`/`Descricao` livres); endpoint
consumido fora da allowlist (nenhum endpoint é consumido).

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "inventario",
  "assunto": "classificacoes-pessoa",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/09-inventario-classificacoes-pessoa.md",
  "pendencias": [
    { "tipo": "backend", "pergunta": "Existe (ou está planejado) um endpoint de reativação para Classificação de Pessoa, dado que Atualizar bloqueia sobre registro inativo e não há POST /{id}/reativar hoje?", "decide": "se a tela precisa desenhar um estado 'inativa, sem ação de desfazer' ou se aguarda o endpoint" },
    { "tipo": "funcional", "pergunta": "A tela nova entra sob /pessoas/classificacoes (dobrando a regra genérica de rota, molde Produtos) ou como rota irmã com regra própria antes da genérica (molde Condições de Pagamento)?", "decide": "conteúdo exato de lib/security/routePermissions.ts e o grupo de menu (Pessoas vs Cadastros) que recebe o item novo" },
    { "tipo": "funcional", "pergunta": "O módulo de código vive dentro de features/pessoas/ (molde Categorias/Marcas dentro de features/produtos/) ou em features/classificacoes-pessoa/ novo (molde Tabelas de Preço)?", "decide": "onde o literal de permissão CLASSIFICACOES_PESSOA_GERENCIAR precisa aparecer para C1 do guard-permission-map não acusar módulo órfão" }
  ],
  "riscos": [
    "Sem as três edições descritas no §3 (routePermissions.ts, AppMenu.tsx pai, AppMenu.tsx filho), um usuário com só CLASSIFICACOES_PESSOA_GERENCIAR fica sem acesso a qualquer rota que a permissão deveria abrir, e validate:guard-permission-map reprova por C2/C3 — medido contra o código do gate, não hipótese.",
    "AtualizarClassificacaoPessoaUseCase bloqueia edição de classificação inativa e não há endpoint de reativação — uma classificação inativada por engano fica travada em Nome/Descrição pela API até alguém decidir o que fazer (endpoint novo, ou aceitar a trava)."
  ]
}
```
