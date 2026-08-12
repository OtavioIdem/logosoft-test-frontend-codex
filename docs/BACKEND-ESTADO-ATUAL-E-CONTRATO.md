# Backend ERP Logosoft — estado atual e contrato para o frontend

> Levantamento feito por leitura direta do código do backend (`Documents/New project 3`), branch
> `feat/v1.18.0-g1-identidade-fiscal-do-item`, em **2026-08-12**.
> Substitui, para efeito de integração, os documentos `CONTRATO_FRONTEND_BACKEND_B38.md` e
> `BACKEND_OPERATIONAL_CONTRACTS.md` naquilo que divergir — **o que está aqui foi lido no código**,
> não inferido de conversa.
>
> **Números do levantamento:** 94 controllers · 576 endpoints · 712 records de contrato ·
> 153 enums · 177 códigos de permissão.

---

## 0. Como usar este documento

Ele tem duas metades e elas servem a propósitos diferentes:

| Parte | Seções | Para quê |
| --- | --- | --- |
| **Normativa** | 1 a 8 | Regras. Como autenticar, como tratar erro, o que enviar, o que o backend faz e o que **não** faz. Ler inteiro antes de codar. |
| **Catálogo** | 9 a 12 | Referência gerada mecanicamente do código: todas as rotas, todos os payloads, todos os enums, todas as permissões. Consultar sob demanda. |

**Três avisos que economizam dias de retrabalho — leia antes de qualquer coisa:**

1. **Enums viajam como número inteiro no JSON, não como string.** Não há `JsonStringEnumConverter`
   registrado. `status: 3`, nunca `status: "Aprovado"`. Detalhe em §2.7.
2. **Endpoint de listagem devolve `200 []` quando o usuário não tem acesso à empresa/filial**, em vez
   de `403`. É dívida conhecida do backend (D10). Não trate lista vazia como "não há dados". §2.10.
3. **Não existe vínculo Colaborador ↔ Usuário, nem criação automática de usuário na admissão.**
   O comportamento que se espera ("criei um funcionário, saiu um usuário com grupo, setor e centro de
   custo") **não existe no backend hoje**, em nenhuma forma. Isso é a seção §6, e é a parte mais
   importante deste documento.

---

## 1. Topologia, ambiente e versão

| Item | Valor |
| --- | --- |
| Stack | .NET 10, Clean Architecture (Domain → Application → Infrastructure/Api) |
| Base URL padrão | `http://localhost:8080` (`NEXT_PUBLIC_API_URL` no frontend, `config/app.ts`) |
| Container | `logosoft-backend`, porta `8080:8080` |
| Banco | PostgreSQL 16 (`logosoft-postgres`), Redis 7 (`logosoft-redis`, blacklist de token) |
| Swagger | `/swagger`, **só quando `Swagger:Enabled` ou ambiente Development** |
| Health | `GET /health` |
| Versão da imagem | tag = versão do bloco entregue (`LOGOSOFT_VERSION`); default do compose ainda `v1.14.0` |
| CORS | política `ApiCors`; em Development libera qualquer origem, fora dele usa lista explícita de origens |
| Migrations | aplicadas no startup (`Database__ApplyMigrationsOnStartup: true`) |

Prefixo de rota: **todas** as rotas começam com `api/`. Não há versionamento na URL (`/v1/` não existe).

---

## 2. Contrato transversal HTTP

Isto vale para **todos** os 576 endpoints. É o que deve viver no `httpClient`, não repetido por feature.

### 2.1 Autenticação — o fluxo real

São **três** chamadas possíveis no login, e a ordem importa.

```
┌─ (opcional, tela de identificação da empresa)
│  POST /api/auth/validar-empresa   { codigoEmpresa }
│  → 200 { codigoEmpresa, ativa, origemValidacao, mensagem }
│  → 400 se a empresa não existir/estiver inativa
│
├─ POST /api/auth/login   { email, password, codigoEmpresa? }
│  → 200 LoginResponse (abaixo)
│  → 401 { code, message, ... }  ← credencial inválida, usuário bloqueado, empresa inválida
│
└─ a partir daqui: Authorization: Bearer <accessToken> em toda chamada
```

**`LoginRequest`** — atenção ao nome do campo: é `password`, em inglês, **não** `senha`.

```jsonc
{ "email": "user@empresa.com", "password": "…", "codigoEmpresa": "0001" } // codigoEmpresa opcional
```

**`LoginResponse`**

```jsonc
{
  "usuarioId": "guid",
  "nome": "string",
  "email": "string",
  "empresaId": "guid",          // Guid.Empty ("000…0") no login master = contexto global
  "filialId": "guid|null",
  "codigoEmpresa": "string|null",
  "empresaValidada": true,
  "accessToken": "jwt",
  "accessTokenExpiraEm": "2026-08-12T14:30:00+00:00",
  "refreshToken": "opaco",
  "refreshTokenExpiraEm": "2026-08-19T14:15:00+00:00",
  "permissoes": ["PESSOAS_CONSULTAR", "…"]
}
```

**Renovação e encerramento**

| Rota | Auth | Corpo | Notas |
| --- | --- | --- | --- |
| `POST /api/auth/refresh` | anônimo | `{ refreshToken }` | devolve **novo par** access+refresh (rotação). Falha → `401`, force logout. |
| `POST /api/auth/logout` | Bearer | `{ refreshToken? }` | `204`. Revoga o refresh **e** põe o `jti` do access na blacklist Redis — o access token morre na hora, não só no vencimento. |
| `GET /api/auth/me` | Bearer | — | fonte de verdade da sessão. Ver abaixo. |
| `POST /api/auth/bootstrap-admin` | anônimo | `CriarUsuarioRequest` | só funciona com `Security:AllowBootstrapAdmin=true`. Não usar em tela de produto. |

**Tempos padrão:** access token **15 min**, refresh **7 dias**. `ClockSkew` de 1 minuto.
Programe o refresh proativo em ~13 min, ou reativo no primeiro `401`.

### 2.2 `GET /api/auth/me` e as claims do JWT

`MeResponse` é **derivado das claims do token**, não do banco. Ele não faz round-trip de permissão.

```jsonc
{ "usuarioId":"guid", "nome":"…", "email":"…", "empresaId":"guid",
  "filialId":"guid|null", "isMaster":false, "permissoes":["…"] }
```

Claims presentes no access token:

| Claim | Conteúdo |
| --- | --- |
| `sub` / `nameidentifier` | id do usuário |
| `jti` | id do token (usado pela blacklist de logout) |
| `name`, `email` | dados do usuário |
| `empresa_id` | empresa do usuário — **`Guid.Empty` significa contexto global** |
| `filial_id` | filial do usuário, ou string vazia |
| `permission` | **repetida N vezes**, uma por código de permissão |
| `is_master` | `"true"` **apenas** para o login fixo master |
| `empresa_referencia`, `filial_referencia` | só no master |

> **Breaking change já entregue (v1.17.0/G3):** a conta fixa `manager` foi **removida** e a claim
> `is_manager` **não existe mais**. Qualquer código do frontend que leia `is_manager`/`IsManager`
> está morto. Só sobrou `master`, agora auditada e com bloqueio por IP.

### 2.3 Autorização — modelo de permissão

- Formato do código: **`MODULO_RECURSO_ACAO`** (`PESSOAS_CONSULTAR`, `SEGURANCA_USUARIOS_GERENCIAR`,
  `FISCAL_EMITIR`). Catálogo completo em §12.
- Cada endpoint declara **uma** permissão via atributo. Quem não tem → `403`.
- **Curto-circuito de master:** claim `is_master=true` **ou** permissão `*` passa em tudo, sem checar
  nada. Um usuário master enxerga qualquer empresa.
- O frontend recebe a lista efetiva em `login.permissoes` e em `/me`. Use-a para esconder ação, **mas
  nunca como autorização** — a decisão é do servidor.
- `GET /api/seguranca/permissoes/catalogo` devolve o catálogo estruturado (módulo/recurso/ação),
  que é o que alimenta a tela de matriz de permissões.

### 2.4 Contexto organizacional — `empresaId` e `filialId`

Este é o ponto onde mais integração quebra. A regra exata, lida do `OrganizationalContextGuard`:

1. **`empresaId` é obrigatório** na maioria esmagadora dos endpoints operacionais — como
   **query string** no `GET` e como **campo do corpo** no `POST`/`PUT`. Sem ele: `400` com código
   `<Modulo>.EmpresaObrigatoria`.
2. Se o usuário tem `empresa_id` preenchida e ela **difere** da `empresaId` enviada → `403`
   `<Modulo>.EmpresaContextoUsuario`.
3. Se o usuário tem `filial_id` e a `filialId` enviada difere → `403` `<Modulo>.FilialContextoUsuario`.
4. **Usuário com `empresa_id = Guid.Empty` tem contexto global** e passa por qualquer empresa/filial.
   Hoje é só o login master.
5. Em consulta, `ResolverFilialConsulta` **impõe** a filial do usuário quando ele tem uma: mandar
   `filialId` diferente dá `403`; não mandar nada faz o backend filtrar pela filial dele de qualquer
   forma. **O frontend não consegue "ver todas as filiais" com um usuário preso a uma filial.**

**Consequência prática para o frontend:** `empresaId` (e `filialId` quando houver) precisa ser estado
global da aplicação, injetado automaticamente pelo cliente HTTP ou por um hook de contexto — não pode
ser passado à mão em cada tela. Fonte: `/me`.

**Exceções conhecidas (endpoints sem `empresaId`):** `GET /api/administracao/empresas`,
`GET /api/seguranca/grupos-acesso`, `GET /api/seguranca/permissoes`, `GET /api/seguranca/permissoes/catalogo`.
E o módulo **Administração inteiro não aplica o guard** — ver §2.10 (D10/IDOR).

### 2.5 Envelope de erro — único e uniforme para todo `4xx`

Um filtro global (`ApiErrorResponseFilter`) normaliza **qualquer** resposta 400–499 para esta forma.
O middleware de exceção faz o mesmo para `500` e para `DomainException`.

```jsonc
{
  "code": "Fiscal.NotaNaoEncontrada",
  "message": "Nota fiscal não encontrada.",
  "userMessage": "Não foi possível consultar a nota fiscal. Motivo: Nota fiscal não encontrada.",
  "operation": "consultar a nota fiscal",
  "traceId": "0HN7…",
  "errors": { "campo": ["mensagem"] }   // presente só em erro de validação de model binding
}
```

Como usar:

- **`userMessage` é a mensagem pronta para o usuário final.** Já vem em português, já contém a
  operação. É o que vai no toast. Não reconstrua a frase no frontend.
- **`code` é a chave de decisão programática.** Estável, hierárquico (`Modulo.Motivo`). Use para
  tratamento especial (ex.: `*.EmpresaContextoUsuario` → trocar contexto; `*.NaoEncontrado` → 404 view).
- **`traceId`** deve aparecer na UI de erro (rodapé do toast/modal). É o que liga o problema ao log
  do backend.
- **`errors`** é o dicionário campo → mensagens do model binding. Alimenta erro por campo no formulário.
  **Só existe em erro de binding**, não em erro de regra de negócio.

**Erros de regra de negócio não populam `errors`.** Validação de FluentValidation vira uma
`message` única concatenada (até 5 mensagens). Se o formulário precisa de erro por campo em regra de
negócio, hoje não tem — é limitação do backend, não do contrato.

### 2.6 Códigos de status por padrão de ação

O backend é consistente nisso; dá para programar o cliente genericamente.

| Ação | Sucesso | Falha típica |
| --- | --- | --- |
| `GET` lista | `200` array (ou `PagedResult`) | `403` sem permissão · **mas ver D10** |
| `GET` por id | `200` | `404` quando o `Result` falha |
| `POST` criar | `201 Created` + `Location` + corpo | `400` regra/validação |
| `POST` ação de estado (`/aprovar`, `/cancelar`, `/faturar`) | `200` com o recurso atualizado | `400` estado inválido |
| `PUT` atualizar | `200` com o recurso | `400` |
| `POST /{id}/inativar` | `200` ou `204` | `400` |
| Sem permissão | — | `403` sem corpo padronizado do domínio |
| Token ausente/expirado/revogado | — | `401` |

**Não existe `DELETE` de dado operacional.** É invariante do projeto: nada é apagado fisicamente.
Toda "exclusão" é `POST /{id}/inativar` **e exige `motivo` no corpo**. O único `DELETE` do sistema é
`DELETE /api/administracao/{empresas|filiais}/{id}/endereco-fiscal/municipio`, que desvincula um
município — e mesmo assim não apaga registro.

**Consequência de UX:** o modal de "excluir" precisa ser um modal de **inativar com motivo
obrigatório**, em todo lugar. O mesmo vale para cancelamento de documento e estorno financeiro.

### 2.7 Serialização — as três regras

1. **Propriedades em `camelCase`.** Padrão do System.Text.Json do ASP.NET Core. Os records do backend
   são `PascalCase` no C#; no JSON chegam `camelCase`. Os catálogos das §10 mostram o nome C# — leia
   com a primeira letra minúscula.
2. **Enums são inteiros.** Não há converter de string registrado em lugar nenhum do projeto (verificado).
   - **Response:** `"status": 3`.
   - **Request `[FromBody]`:** aceita **só número**. Mandar `"Aprovado"` dá `400` de binding.
   - **Request `[FromQuery]`:** aqui o binder do MVC é mais tolerante e aceita **nome ou número**.
     Ainda assim, **envie sempre número** — uniformidade evita o bug que só aparece quando o filtro
     migra de query para corpo.
   - No TypeScript, declare os enums como `const enum` numérico espelhando §11, nunca union de string.
3. **Datas são `DateTimeOffset` em ISO 8601 com offset** (`2026-08-12T14:30:00+00:00`). Envie com
   offset explícito. `DateOnly` aparece em poucos campos de vigência (`vigenteDesde`, `vigenteAte`) e
   serializa como `"2026-08-12"`.
4. **Dinheiro é `decimal`** e serializa como número JSON. Não é string, não é centavo inteiro.
   Cuidado com precisão no JS em valores fiscais — trate como string na borda se for exibir/reenviar
   sem alterar.

### 2.8 Paginação — parcial, e é preciso saber quem tem

A maioria das listagens **não é paginada**: devolve array cru. Onde há paginação, o formato é:

```jsonc
{ "resultado": {
    "items": [ … ],
    "page": 1, "pageSize": 20, "totalItems": 137,
    "totalPages": 7, "hasPreviousPage": false, "hasNextPage": true } }
```

Note o embrulho: a resposta é `{ resultado: PagedResult<T> }`, não o `PagedResult` na raiz.
Query params: `page` (1-based, default 1) e `pageSize` (default 20).

**Endpoints paginados hoje:** Atividades, Auditoria operacional, Tabelas de preço, Inventários de
estoque, Contas financeiras (Financeiro avançado). Todo o resto devolve array completo — o que
significa que **filtro e busca têm que ir para o servidor via query string**, não para uma tabela
client-side, em qualquer listagem que possa crescer.

### 2.9 Padrões de rota que se repetem

Reconhecer estes cinco padrões cobre a maior parte dos 576 endpoints e permite generalizar o data layer:

| Padrão | Forma | Exemplo |
| --- | --- | --- |
| Listar com filtro | `GET /api/<modulo>/<recurso>?empresaId=&filialId=&…` | `/api/vendas/pedidos?empresaId=…&status=3` |
| Obter | `GET /api/<modulo>/<recurso>/{id:guid}` | |
| Criar | `POST /api/<modulo>/<recurso>` | `201` + `Location` |
| Atualizar | `PUT /api/<modulo>/<recurso>/{id:guid}` | |
| Transição de estado | `POST /api/<modulo>/<recurso>/{id:guid}/<verbo>` | `/aprovar`, `/cancelar`, `/faturar`, `/inativar`, `/receber` |
| Coleção-filha | `POST /{id}/itens`, `PUT /{id}/itens/{itemId}`, `POST /{id}/itens/{itemId}/remover` | note: **remover item é POST**, não DELETE |

### 2.10 Armadilhas conhecidas do contrato (dívidas registradas do backend)

Estas estão documentadas como dívida no backend e **não vão mudar sem uma fatia dedicada**. O frontend
tem que conviver com elas hoje.

| # | O que acontece | O que o frontend deve fazer |
| --- | --- | --- |
| **D10** | ~40 endpoints de listagem usam `Array.Empty<>()` no caminho de negação: **sem permissão devolve `200 []`**, indistinguível de "não há registros". | Nunca escrever "Nenhum registro cadastrado" com certeza. Texto neutro ("Nada a exibir com os filtros atuais"). Se a tela depender de distinguir, confirme com um `GET` por id. Corrigir isso é breaking change combinado — **não implemente esperando `403`**. |
| **D1** | Guard cross-tenant no módulo Fiscal responde **`400`, não `403`/`404`**. | Trate `400` com `code` terminado em `.EmpresaContextoUsuario`/`.FilialContextoUsuario` como problema de contexto, não como erro de formulário. |
| **D2** | O `ResultadoTributacao` do domínio é exposto direto no REST. | Mudança nesses records é **breaking change de API sem aviso de versão**. Isole o tipo num adapter só seu; não espalhe pela UI. |
| **D11** | O guard **falha aberto** quando não há usuário autenticado. | Sem impacto prático (endpoints são `[Authorize]`), mas não construa nada que dependa de chamada anônima passar pelo guard. |
| **D13** | `ContabilRepository` filtra `FilialId == filialId` **sem fallback para `null`**: usuário preso a uma filial **não vê** plano de contas, regras de contabilização nem períodos, que são cadastro de empresa (filial nula). | Tela de Contábil só funciona hoje com usuário de escopo empresa. Sinalize isso na UI em vez de mostrar tela vazia. |
| **D14/D15** | O item da nota fiscal não tem identidade fiscal e o motor tributário **não é chamado por nenhum fluxo de documento**: o imposto da nota é **o que o operador digitou**. | Ver §5.3 e §7. Não prometa cálculo automático na tela de nota. |
| **D7** | Teste de boleto quebrado (código de barras com 45 dígitos). | Módulo Bancos/Boletos não é confiável para produção. |

---

## 3. Mapa de módulos — o que existe e quanto dá para confiar

O backend tem 35 módulos previstos. O que está exposto hoje, com o grau de maturidade real (não o
"tem endpoint", mas o "a regra está certa"):

| Módulo | Rota base | Maturidade | O que isso significa para o frontend |
| --- | --- | --- | --- |
| **Auth / Segurança** | `api/auth`, `api/seguranca/*` | 🟢 **Sólido** | Endurecido na v1.17.0/G3. Pode construir em cima sem medo. |
| **Administração** (empresa, filial, setor, cargo, centro de custo) | `api/administracao/*` | 🟡 **Funcional, inseguro** | CRUD completo, **sem guard organizacional** (D10/IDOR). Funciona; a correção virá e não muda o contrato. |
| **Pessoas / Clientes / Fornecedores / Transportadoras** | `api/pessoas/*`, `api/clientes`… | 🟢 **Sólido** | Módulo 02 fechado (v1.12.0). Padrão par (Id, código) com escritor único. |
| **Produtos / Categorias / Marcas / Unidades** | `api/produtos/*` | 🟢 **Sólido** | Bloco fiscal estrutural (NCM/CEST/origem) presente. |
| **Cadastros fiscais** (NCM, CFOP, CST, natureza de operação, regras) | `api/fiscal/cadastros`, `api/fiscal/regras`, `api/fiscal/excecoes*` | 🟢 **Sólido** | Módulo 04 fechado (v1.13.0). Carga oficial de alíquotas interestaduais completa (702 rotas). |
| **Motor de tributação** | `POST api/fiscal/tributacao/simular` | 🟢 **Calcula certo, isolado** | Módulo 05 fechado (v1.14.0). **Só é acessível por simulação** — nenhum documento o usa. |
| **Documento fiscal / SEFAZ** | `api/fiscal/notas-fiscais`, `api/fiscal/sefaz` | 🔴 **Andaime correto, conteúdo fiscal errado** | Máquina de estados, contingência, XML, DANFE existem. **O imposto é digitado, o CFOP é único por nota, o item não tem NCM real.** Teste verde aqui **não prova correção fiscal**. |
| **Vendas** (pedido) | `api/vendas/pedidos` | 🟡 **Fluxo completo, cadastro subaproveitado** | Ciclo rascunho→faturado funciona. Mas o pedido não carrega condição de pagamento, natureza de operação, tabela de preço nem vendedor. Ver §5.4. |
| **Compras** (solicitação → cotação → pedido → recebimento) | `api/compras/*` | 🟢 **O mais bem ligado do sistema** | Cadeia completa e encadeada, com condição de pagamento vinda do cadastro. Use como modelo mental. |
| **Faturamento** | `api/faturamento` | 🟡 **Orquestra bem** | `ConfirmarFaturamentoUseCase` é a orquestração order-to-cash de referência. |
| **Financeiro** (CR/CP, formas, condições) | `api/financeiro/*` | 🟡 **Funcional** | Baixa gera lançamento contábil. Limite de crédito do cliente **nunca é verificado** (só o booleano de bloqueio). |
| **Estoque** | `api/estoque*` | 🟡 **Movimenta, não valora** | Saldo e movimento funcionam. **Zero valoração/custo** — CMV não é calculável. |
| **Contábil** | `api/contabil/*` | 🟠 **Recebe quase nada** | Só baixa financeira e depreciação chegam ao razão. Sem balancete/DRE/ECD reais. Somado à D13, tela pouco utilizável. |
| **Produção / MRP / Ficha técnica** | `api/producao/*` | 🟡 | Custo usa `Produto.CustoReferencial`, que nunca é atualizado pelo recebimento. |
| **PDV / Caixa** | `api/pdv/*` | 🟡 | Abrir/sangria/suprimento/fechar + venda. Não consome tabela de preço. |
| **RH** | `api/rh/*` | 🟠 **Cadastro isolado** | Colaborador, jornada, ponto, férias, afastamento, benefício, evento. **Sem vínculo com Usuário e sem centro de custo.** Ver §6. |
| **Patrimônio / Frota / Portaria / Qualidade / Contratos / CRM / Serviços / Alimentar** | vários | 🟠 **Andaime** | CRUD e máquina de estado existem; integração com o resto é fraca ou nula. |
| **Anexos, Notificações, Integrações, Atividades, Auditoria, Relatórios, Deploy, Infraestrutura** | vários | 🟡 | Transversais, funcionam. Relatórios gerenciais sem guard organizacional (mesma D10). |

Legenda: 🟢 construir à vontade · 🟡 construir com as ressalvas anotadas · 🟠 andaime, não prometer ao
usuário final · 🔴 existe mas produz resultado fiscalmente errado.

---

## 4. Fluxos de trabalho — sequência exata de chamadas

Cada fluxo abaixo é uma máquina de estados no backend. **Transição fora de ordem devolve `400`.**
Os números nos estados são os valores serializados do enum (§11).

### 4.1 Order-to-cash (venda → nota → estoque → financeiro)

```
StatusPedidoVenda: Rascunho(1) → AguardandoAprovacao(2) → Aprovado(3) → Faturado(5)
                                        └──────────────→ Cancelado(4)
```

```
1. POST /api/vendas/pedidos                              → pedido em Rascunho
2. POST /api/vendas/pedidos/{id}/itens                   (repetir por item)
   PUT  /api/vendas/pedidos/{id}/itens/{itemId}          (editar)
   POST /api/vendas/pedidos/{id}/itens/{itemId}/remover  (remover — POST, com motivo)
3. POST /api/vendas/pedidos/{id}/enviar-para-aprovacao   → AguardandoAprovacao
4. POST /api/vendas/pedidos/{id}/aprovar                 → Aprovado   [perm VENDAS_APROVAR]
5. POST /api/vendas/pedidos/{id}/faturar                 → Faturado   [perm VENDAS_FATURAR]
```

A partir do pedido aprovado, existem **dois caminhos** que fazem coisas parecidas — e o frontend
precisa escolher um e não misturar:

**Caminho A — orquestrado (recomendado):** módulo Faturamento faz o encadeamento.

```
POST /api/faturamento/preparar        { pedidoVendaId, … }  → Rascunho(1)
POST /api/faturamento/{id}/confirmar  { … }                 → percorre PendenteFiscal(2) →
                                                              FiscalAutorizado(3) →
                                                              EstoqueProcessado(4) → Faturado(5)
GET  /api/faturamento/{id}/historico     ← trilha de transição, alimenta o stepper da UI
GET  /api/faturamento/{id}/ocorrencias   ← erros/avisos do processo
POST /api/faturamento/{id}/cancelar
```

`StatusFaturamento` tem `Erro(7)`: quando cai lá, `ocorrencias` diz por quê. A UI deve oferecer
retomada, não recomeço.

**Caminho B — manual, passo a passo:** o frontend chama cada peça. Serve para telas de correção e
para casos que o orquestrador não cobre. Ver §4.3.

### 4.2 Purchase-to-pay (compras — a cadeia mais bem construída)

```
Solicitação → Cotação → Pedido de compra → Recebimento → Conferência fiscal
```

```
POST /api/compras/solicitacoes            → StatusSolicitacaoCompra
POST /api/compras/solicitacoes/{id}/itens
POST /api/compras/solicitacoes/{id}/aprovar        [perm COMPRAS_SOLICITACOES_APROVAR]

POST /api/compras/cotacoes                → StatusCotacaoCompra
POST /api/compras/cotacoes/{id}/itens
POST /api/compras/cotacoes/{id}/aprovar   |  /recusar  |  /cancelar

POST /api/compras/pedidos                 → Rascunho(1)
POST /api/compras/pedidos/{id}/itens
POST /api/compras/pedidos/{id}/enviar-para-aprovacao  → AguardandoAprovacao(2)
POST /api/compras/pedidos/{id}/aprovar                → Aprovado(3)     [COMPRAS_APROVAR]
POST /api/compras/pedidos/{id}/receber                → ParcialmenteRecebido(4) ou Recebido(5)
                                                        [COMPRAS_RECEBER]
GET  /api/compras/recebimentos/{id}
GET  /api/compras/recebimentos/divergencias?empresaId=&pedidoCompraId=
POST /api/compras/recebimentos/{id}/conferencia-fiscal  [COMPRAS_CONFERENCIA_FISCAL_REGISTRAR]
```

Recebimento parcial é de primeira classe: `Receber` pode ser chamado várias vezes e o status vai para
`ParcialmenteRecebido` até fechar. A UI precisa de tela de recebimento por item com quantidade, não um
botão "receber tudo". `divergencias` alimenta o alerta de quantidade/valor fora do pedido.

**Este é o único fluxo em que o pedido puxa `CondicaoPagamento` do cadastro do fornecedor e gera as
parcelas sozinho.** Vendas não faz isso (§5.4).

### 4.3 Documento fiscal e SEFAZ — o fluxo mais longo do sistema

```
StatusNotaFiscal: Rascunho(1) → Validada(2) → Assinada(3) → Transmitida(4) → Autorizada(5)
                                                                 ├→ Rejeitada(6)
                                                                 ├→ Denegada(9)
                                                                 └→ Contingencia(10)
                  Autorizada(5) → Cancelada(7)          |  numeração → Inutilizada(8)
```

```
── origem ──────────────────────────────────────────────────────────────
POST /api/fiscal/notas-fiscais                      (CRUD direto)
POST /api/fiscal/notas-fiscais/gerar-de-pedido-venda { pedidoVendaId, … }   [FISCAL_EMITIR]

── montagem ────────────────────────────────────────────────────────────
POST /api/fiscal/notas-fiscais/{id}/itens
POST /api/fiscal/notas-fiscais/{id}/impostos        ⚠ imposto DIGITADO (ver aviso abaixo)

── emissão ─────────────────────────────────────────────────────────────
POST /api/fiscal/notas-fiscais/{id}/validar             → Validada
POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio
POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio   → Assinada     [FISCAL_EMITIR]
POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz    → Transmitida/Autorizada/Rejeitada
POST /api/fiscal/notas-fiscais/{id}/consultar-protocolo-sefaz   ← reconciliação
POST /api/fiscal/notas-fiscais/{id}/reprocessar-sefaz           ← idempotente
POST /api/fiscal/notas-fiscais/{id}/habilitar-contingencia      → Contingencia

── pós-autorização ─────────────────────────────────────────────────────
POST /api/fiscal/notas-fiscais/{id}/danfe               → gera documento auxiliar
GET  /api/fiscal/notas-fiscais/documentos-auxiliares/{documentoAuxiliarId}/download
POST /api/fiscal/notas-fiscais/{id}/baixar-estoque      [perm ESTOQUE_MOVIMENTAR]
POST /api/fiscal/notas-fiscais/{id}/gerar-conta-receber [perm FINANCEIRO_GERENCIAR]
POST /api/fiscal/notas-fiscais/{id}/cartas-correcao     [FISCAL_CARTA_CORRECAO]
POST /api/fiscal/notas-fiscais/{id}/cancelar-sefaz      [FISCAL_CANCELAR]

── apoio de tela ───────────────────────────────────────────────────────
GET  /api/fiscal/notas-fiscais/{id}/resumo-operacional     ← cabeçalho consolidado
GET  /api/fiscal/notas-fiscais/{id}/workflow-operacional   ← qual passo já ocorreu (monta o stepper)
GET  /api/fiscal/notas-fiscais/{id}/integracoes            ← tentativas SEFAZ
GET  /api/fiscal/notas-fiscais/exportacoes/csv             [FISCAL_EXPORTAR]
POST /api/fiscal/sefaz/status-servico                      ← health da SEFAZ
GET  /api/fiscal/sefaz/status-servico/historico
POST /api/fiscal/sefaz/contingencia/avaliar
GET  /api/fiscal/sefaz/contingencia/historico
POST /api/fiscal/inutilizacoes                             [FISCAL_INUTILIZAR]
```

> ⚠ **Aviso obrigatório sobre este fluxo.** `POST /{id}/impostos` recebe
> `{ nome, cstCsosn, baseCalculo, aliquota, valor }` como **texto e número livres**. Não há chamada ao
> motor de tributação em nenhum ponto do pipeline de documento. O imposto que sai na nota é
> **exatamente o que foi enviado no payload**. Isso está registrado como dívida D14 e é o objeto da
> fatia em execução (v1.18.0/G1). **Não construa uma tela que sugira ao operador que o sistema
> calculou o imposto.** Enquanto isso não fecha, o caminho honesto é: chamar
> `POST /api/fiscal/tributacao/simular` para **exibir** o cálculo correto e deixar claro que o valor
> gravado no documento é o informado.

`GET /{id}/workflow-operacional` foi feito exatamente para o frontend: devolve quais etapas já
aconteceram. Use-o para renderizar o stepper em vez de inferir do status.

### 4.4 Financeiro

```
StatusContaFinanceira: Aberta(1) → ParcialmenteBaixada/Quitada(2) → Quitada(3)
                                 → Cancelada(4) | Estornada(5)
```

```
POST /api/financeiro/contas-receber
POST /api/financeiro/contas-receber/pedido-venda/{pedidoVendaId}   ← gera a partir do pedido
POST /api/financeiro/contas-receber/{id}/receber            [FINANCEIRO_RECEBER]
POST /api/financeiro/contas-receber/{id}/estornar-recebimento  [FINANCEIRO_ESTORNAR]
POST /api/financeiro/contas-receber/{id}/cancelar           [FINANCEIRO_CANCELAR]
(mesma forma em contas-pagar, com /pagar e /estornar-pagamento)
```

**Cuidado:** existem **dois** enums `StatusContaFinanceira` no backend (namespaces `Financeiro` e
`Financeiro.Avancado`) com o valor `2` nomeado diferente (`ParcialmenteBaixada` × `ParcialmenteQuitada`).
Os números batem; só o rótulo diverge. Escolha **um** rótulo no frontend e documente.

Baixa financeira **gera lançamento contábil automaticamente**. Estorno é operação de primeira classe
e exige motivo — não é "desfazer", é um evento auditado.

### 4.5 Estoque

```
GET  /api/estoque/saldos?empresaId=&produtoId=&localEstoqueId=
GET  /api/estoque/saldos/produto/{produtoId}/local/{localEstoqueId}?empresaId=
GET  /api/estoque/movimentos?empresaId=&produtoId=&inicio=&fim=
POST /api/estoque/entradas | /saidas | /ajustes | /transferencias   [ESTOQUE_MOVIMENTAR]
+ api/estoque/locais, /reservas, /inventarios, /avancado
```

`MovimentoEstoque.OrigemModulo` é **string livre** vinda do request (até 80 chars). A rastreabilidade
depende do frontend enviar sempre a mesma string. **Padronize essas constantes num único módulo do
frontend** — se cada tela digitar a sua, o relatório de origem vira lixo.

### 4.6 RH

```
StatusColaborador: Ativo(1) → Afastado(2) | Ferias(3) → Desligado(4)
```

```
GET  /api/rh/colaboradores?empresaId=&filialId=&status=&setorId=&cargoId=&termo=
POST /api/rh/colaboradores          (admitir)      [RH_GERENCIAR]
PUT  /api/rh/colaboradores/{id}
POST /api/rh/colaboradores/{id}/desligar
+ api/rh/jornadas, /ponto, /ausencias (férias e afastamento), /beneficios, /eventos
```

Ver §6 — este é o módulo com o gap que motivou o documento.

### 4.7 PDV

```
POST /api/pdv/caixas/abrir → POST /{id}/suprimento | /sangria → POST /{id}/fechar
POST /api/pdv/vendas   (registro de venda vinculado ao caixa)
```

---

## 5. Vínculos entre cadastros — o mapa de ligações

Esta seção responde diretamente ao que foi observado: **"quase não existe vínculo entre processos que
deveriam existir"**. A observação está correta e o backend já a levantou formalmente
(`docs/00-ANALISE-VINCULOS-CADASTROS.md`, 2026-08-11).

O diagnóstico do backend, na frase dele: *o esqueleto de processo existe e está encadeado; o que falta
é quase sempre conteúdo vindo de cadastro em vez de parâmetro de chamada*. O padrão dominante **não é
"falta código"** — é **peça correta sem chamador**.

Para o frontend isso tem uma tradução direta e desconfortável: **existem campos de cadastro que a UI
coleta, o backend salva, e que nenhum processo lê.** Preencher aquele campo não muda absolutamente
nada no comportamento do sistema. Saber quais são evita prometer ao usuário algo que não acontece.

### 5.1 Grafo organizacional — o que realmente liga

```
Empresa ──1:N── Filial
   │               │
   │               └── EnderecoFiscal (VO) ──> MunicipioIbge   [opcional no cadastro,
   │                                                             OBRIGATÓRIO na emissão fiscal]
   ├── Setor ──1:N── Cargo            (Cargo.SetorId, opcional)
   │                   ▲
   └── CentroCusto ────┘              (CentroCusto.SetorId?, CentroCusto.CargoId? — ambos opcionais)
```

Toda entidade operacional herda de `AuditableEntity` e portanto carrega:

| Campo | Tipo | Semântica |
| --- | --- | --- |
| `empresaId` | `Guid` | **sempre obrigatório** |
| `filialId` | `Guid?` | nulo = registro da empresa, não de uma filial |
| `status` | `EntityStatus` | `Ativo(1) Inativo(2) Cancelado(3) Bloqueado(4) Pendente(5)` |
| `createdAt/By`, `updatedAt/By`, `inactivatedAt/By` | | auditoria — exiba em telas de detalhe |

**A leitura importante do desenho:** a direção da seta em `CentroCusto` é **invertida** em relação ao
que se espera. Não é o colaborador/cargo que aponta para um centro de custo — é o **centro de custo
que aponta para setor e cargo**, e ambos são opcionais. Consequência: **não existe "o centro de custo
de um colaborador"**. Não há como responder essa pergunta com uma consulta, em nenhum endpoint.

### 5.2 Segurança — o grafo de permissão (este é completo e funciona)

```
Usuario ──N:N── GrupoAcesso ──N:N── Permissao
   │  (UsuarioGrupoAcesso)      (GrupoAcessoPermissao)
   │
   └──N:N── CargoAcesso ──N:N── GrupoAcesso
      (UsuarioCargoAcesso,        (CargoAcessoGrupo)
       com Escopo + vigência)

GrupoAcesso ──1:N── GrupoAcessoMatrizPermissao   (modulo, recurso, acao, permissionCode, permitido)
```

Dois caminhos de atribuição, ambos ativos e **somados**:

1. **Direto:** `POST /api/seguranca/usuarios/{id}/grupos-acesso` `{ grupoAcessoId, … }`
2. **Por cargo de acesso:** `POST /api/seguranca/usuarios/{id}/cargos-empresa` ou `/cargos-filial`,
   e o cargo carrega grupos (`POST /api/seguranca/cargos-acesso/{id}/grupos`).

`UsuarioCargoAcesso` tem **escopo** (`Empresa(1)` / `Filial(2)`) e **vigência** (`vigenteDesde`,
`vigenteAte`) — permissão com validade temporal. A UI precisa expor essas datas.

**Endpoint que resolve a soma para você:**
`GET /api/seguranca/usuarios/{id}/permissoes-efetivas?empresaId=&filialId=` — devolve o conjunto
final. **Use-o na tela de gestão de usuário em vez de recomputar a união no cliente.**

> ⚠ **Correção de um documento existente do frontend.** `docs/ESPEC-BACKEND-usuario-colaborador-vinculo.md`
> afirma que `CriarUsuarioRequest` tem `login` e `gruposAcessoIds`. **Não tem.** O contrato real é:
> ```jsonc
> { "nome": "…", "email": "…", "senha": "…", "empresaId": "guid", "filialId": "guid|null" }
> ```
> Não há `login` (a identidade é o e-mail) e **não há atribuição de grupo na criação** — grupo é uma
> segunda chamada, depois que o usuário existe.

### 5.3 Cadeia fiscal — o que liga e o que está solto

**Liga corretamente (não refazer):** `PedidoVenda → Cliente` · `ItemPedidoVenda → Produto / LocalEstoque
/ ReservaEstoque` · `PedidoCompra → CondicaoPagamento` (cadastro → documento → parcelas, completo) ·
pagamento/recebimento → forma de pagamento · baixa financeira → lançamento contábil ·
`Produto → NCM / CEST / Origem / UnidadeTributável` · `Pessoa → município / país / regime` ·
`NotaFiscal → Modelo / Série` · `Empresa|Filial → EnderecoFiscal.MunicipioIbgeId`.

**Está solto e bloqueia emissão fiscal real:**

| # | O quê | Impacto na tela |
| --- | --- | --- |
| 1 | **O item da nota não tem identidade fiscal.** `ncm` e `cfop` são texto de até 20 chars vindos do request. Não existem `ncmId`, `cfopId`, CST/CSOSN, origem, CEST, unidade tributável. `produtoId` é `Guid?` **sem FK**. | O formulário de item da nota é digitação livre. O NCM correto **está no cadastro do produto** e não chega ao documento. |
| 2 | **CFOP é um texto único por nota**, aplicado igual a todos os itens. | Venda interestadual sai com CFOP interno se foi o que digitaram. `NaturezaOperacao.ResolverCfop` **existe e está pronto**, mas só é chamado por um endpoint de consulta — por nenhum fluxo de documento. |
| 3 | **O motor de tributação não tem chamador.** | §4.3. O imposto é o digitado. |
| 4 | **`NotaFiscal.pessoaId` recebe um `Cliente.Id`** quando a nota vem de pedido, e um `Pessoa.Id` quando vem do CRUD — mesma coluna, dois significados, **sem FK**. | **Não filtre nota por pessoa esperando resultado completo.** O resultado é silenciosamente parcial. |
| 5 | **Unidade comercial é uma string única para todos os itens.** | Pedido com 10 CX e 5 KG emite tudo na mesma unidade. |
| 6 | **Nota fiscal de entrada é modelo paralelo** (`NotaFiscalEntradaCompra`), com CNPJ em texto, sem itens fiscais, sem `fornecedorId`, sem ligação com `NotaFiscal`. | Entrada não gera crédito nem entra na apuração. Trate como duas entidades distintas na UI, porque são. |

### 5.4 FKs que existem, a UI preenche, e **nenhum processo lê**

Este é o padrão mais traiçoeiro do sistema, e é o que mais gera a sensação de "vínculo que não
funciona". O campo existe, é validado na gravação, aparece no response — e nenhum fluxo o consulta.

| Campo | Gravado? | **Lido por algum processo?** | O que a UI não deve prometer |
| --- | --- | --- | --- |
| `Cliente.tabelaPrecoPadraoId` | sim, validado | **não** | O preço do item vem do request. Selecionar tabela padrão **não** precifica nada. |
| `Cliente.condicaoPagamentoPadraoId` | sim, validado | **não** | O faturamento pede a condição de novo no payload. |
| `Cliente.classificacaoId` | sim, validado | **não** | Não afeta preço, crédito nem regra alguma. |
| `Cliente.limiteCredito` | sim | **não** | **Só o booleano `creditoBloqueado` é checado.** O limite nunca é comparado com o saldo em aberto. Não exiba "crédito disponível" como se fosse controle. |
| `Fornecedor.condicaoPagamentoPadraoId` | sim, validado | **não** | |
| `NotaFiscal.naturezaOperacaoId` | sim, do request, **sem validar e sem FK** | **não** | Nenhum passo do pipeline consulta. |
| `PartidaContabil.centroCustoId` | só em lançamento manual | contabilização automática passa `null` fixo | Relatório por centro de custo só enxerga lançamento manual. |
| `Produto.precoVendaBase` | sim | **não** | Preço do item vem do request. |
| `ConfiguracaoFiscalFilial.serieNFePadrao` / `serieNFCePadrao` | sim, pelo CRUD | **zero leitores** | Configurar a série padrão não faz a emissão usá-la. |
| **Módulo Tabelas de Preço inteiro** (`api/comercial/tabelas-preco`) | CRUD + controller completos | **nenhum consumidor** em Vendas, Faturamento ou PDV | O módulo funciona isoladamente e não influencia nenhuma venda. |
| `Transportadora` | CRUD completo | **zero referências** — não existe `transportadoraId` em lugar nenhum do `src` | Cadastro órfão. O grupo `transp` da NF-e não tem origem de dado. |

**Como tratar isso na UI, sem mentir e sem esconder:** manter os campos (o dado está sendo coletado e
será usado quando o backend ligar), mas **não prometer efeito**. Nada de "preço será calculado pela
tabela padrão do cliente" ou "compra bloqueada ao exceder o limite". Se for necessário mostrar,
marque como *cadastro* e não como *regra ativa*.

### 5.5 Onde há FK de verdade no banco

Nem todo `Guid` é uma FK. O backend tem FK física declarada nos módulos abaixo (contagem de arquivos
de configuração EF com `HasForeignKey`):

```
Fiscal 11 · Compras 11 · Security 8 · Bancos 8 · Estoque 6 · Produção 5 · Pessoas 5 ·
Administração 5 · PDV 4 · Contábil 4 · Vendas 3 · Patrimônio 3 · Financeiro 3 · Faturamento 3 ·
CRM 3 · Serviços 2 · Qualidade 2 · Produtos 2 · Comercial 2 ·
Workflow 1 · RH 1 · Portaria 1 · Integrações 1 · Frota 1 · Deploy 1 · Contratos 1 · Alimentar 1
```

**Regra prática para o frontend:** onde não há FK, **o backend não garante que o id existe**. `Guid`
inventado é aceito e gravado em silêncio. Valide a seleção no cliente (só ofereça ids vindos de um
`GET` de listagem) e nunca aceite id digitado à mão.

---

## 6. O vínculo Colaborador ↔ Usuário — o que existe, o que não existe, o que fazer

Este é o item que motivou o documento. A resposta curta: **o vínculo não existe, em nenhuma forma, e
nenhum passo dele é automático.**

### 6.1 O que o código realmente tem

`Colaborador` (`src/Erp.Domain/Rh/Colaborador.cs`), campos completos:

```
empresaId, filialId?, status          ← herdados de AuditableEntity
matricula, nome, cpf
cargoId          → Administration.Cargo    [FK real, obrigatório]
setorId?         → Administration.Setor    [FK real, opcional]
pessoaId?        → Pessoas.Pessoa          [FK real, opcional]
jornadaId?       → Rh.JornadaTrabalho      [FK real, opcional]
regime (RegimeTrabalho), salarioBase, dataAdmissao, dataNascimento?,
email?, telefone?, dataDemissao?, motivoDesligamento?, statusColaborador
```

`Usuario` (`src/Erp.Domain/Security/Usuario.cs`), campos completos:

```
empresaId, filialId?, status          ← herdados de AuditableEntity
nome, email, emailNormalizado, senhaHash,
ativo, bloqueado, motivoBloqueio?, bloqueadoAte?, tentativasLoginFalhas,
ultimoLoginEm?, ultimaTrocaSenhaEm?
```

**O que está ausente, confirmado por varredura:**

| Ausência | Consequência |
| --- | --- |
| `Colaborador.usuarioId` | não dá para ir do funcionário ao login |
| `Usuario.colaboradorId` / `Usuario.pessoaId` | não dá para ir do login ao funcionário |
| `Colaborador.centroCustoId` | **não existe centro de custo de colaborador**, em nenhuma direção útil (§5.1) |
| Qualquer papel/tipo no usuário (`vendedor`, `comprador`, …) | não dá para filtrar usuários por função |
| `vendedorId` em Pedido de Venda / Oportunidade / OS | **venda não é atribuível a ninguém** |
| Evento de domínio, handler ou orquestração na admissão | `AdmitirColaboradorAsync` **só grava o colaborador e audita** |

O que `POST /api/rh/colaboradores` faz, na íntegra: valida o payload → checa contexto organizacional →
verifica que `cargoId` existe (e `setorId`/`jornadaId`, se enviados) → checa que a `matricula` é única
na empresa → cria o `Colaborador` → grava evento de auditoria → salva. **Fim.** Nenhuma outra entidade
é tocada.

### 6.2 O que o frontend pode fazer hoje

Não há endpoint agregado. O fluxo "admitir funcionário e dar acesso" tem que ser **orquestrado pelo
cliente**, como uma sequência explícita:

```
1. (pré-requisitos, telas de Administração — precisam existir antes)
   GET  /api/administracao/setores?empresaId=
   GET  /api/administracao/cargos?empresaId=
   GET  /api/rh/jornadas?empresaId=
   GET  /api/pessoas?…                          (se for vincular a uma Pessoa)

2. POST /api/rh/colaboradores
   { empresaId, filialId?, matricula, nome, cpf, cargoId, setorId?, pessoaId?,
     jornadaId?, regime, salarioBase, dataAdmissao, dataNascimento?, email?, telefone? }
   → 201 ColaboradorResponse   ⟵ guarde o id

3. POST /api/seguranca/usuarios          [perm SEGURANCA_USUARIOS_GERENCIAR]
   { nome, email, senha, empresaId, filialId? }
   → 201 UsuarioResponse       ⟵ guarde o id
   ⚠ senha inicial é responsabilidade do cliente; política 12 chars, 3 de 4 classes

4. POST /api/seguranca/usuarios/{usuarioId}/grupos-acesso    [SEGURANCA_GRUPOS_ACESSO_GERENCIAR]
   { grupoAcessoId, … }                                       (repetir por grupo)
   — ou —
   POST /api/seguranca/usuarios/{usuarioId}/cargos-empresa    [SEGURANCA_PERMISSOES_GERENCIAR]
   POST /api/seguranca/usuarios/{usuarioId}/cargos-filial
   { cargoAcessoId, vigenteDesde, vigenteAte? }

5. GET /api/seguranca/usuarios/{usuarioId}/permissoes-efetivas?empresaId=&filialId=
   → confirmação na tela de que o acesso saiu como esperado
```

**Quatro coisas que essa orquestração não resolve, e que precisam estar na UI:**

1. **Não é transacional.** Se o passo 3 falhar, o colaborador do passo 2 já existe. O frontend precisa
   de estado de "colaborador sem usuário" e de um caminho para retomar do passo 3 — não pode assumir
   tudo-ou-nada.
2. **A ligação não fica registrada em lugar nenhum.** Depois de criados, colaborador e usuário são
   dois registros sem relação. O único elo é a coincidência de `email`. **Não construa lógica de
   negócio em cima dessa coincidência** — e-mail é editável nos dois lados, independentemente.
3. **Não há filtro `?semUsuario=true`.** A tela de admissão não consegue saber quais colaboradores já
   têm login.
4. **Centro de custo não entra nesse fluxo, de forma nenhuma.** Não existe campo para preencher.

### 6.3 O que precisa ser pedido ao backend

O frontend já escreveu uma proposta em `docs/ESPEC-BACKEND-usuario-colaborador-vinculo.md`. Ela está
**alinhada com a realidade do backend** (corrigido o ponto do `login`/`gruposAcessoIds`, §5.2) e o
levantamento do backend confirma que RH está fora da análise de vínculos dele — ou seja, **ninguém
está trabalhando nisso hoje**. A fatia em execução (v1.18.0/G1) é identidade fiscal do item, não isto.

Ordem sugerida de pedido, do mais barato ao mais caro:

| # | Pedido | Custo | Destrava |
| --- | --- | --- | --- |
| 1 | `Usuario.colaboradorId` (`Guid?`, FK, único) + `colaboradorId?` em `CriarUsuarioRequest`, ecoado em `UsuarioResponse` | baixo | rastreabilidade nos dois sentidos |
| 2 | `GET /api/rh/colaboradores?semUsuario=true` | baixo | seletor de admissão sem duplicar login |
| 3 | `POST /{id}/vincular-colaborador` e `/desvincular-colaborador` com `motivo` | baixo | corrigir vínculo sem recriar usuário |
| 4 | `Colaborador.centroCustoId` (`Guid?`, FK) — **ou** a decisão explícita de que centro de custo é dimensão de lançamento e não de pessoa | médio | rateio, relatório por centro de custo |
| 5 | `papeis: TipoPapelUsuario[]` no usuário | médio | filtrar usuário por função |
| 6 | `vendedorUsuarioId?` em Pedido de Venda | médio | atribuição de venda, comissão |
| 7 | Use case agregado `POST /api/rh/colaboradores/admitir-com-acesso`, transacional | alto | o fluxo de uma tela só |

**Recomendação:** peça 1–3 juntos, como uma fatia. São baratos, não mexem em cálculo nem em fiscal, e
destravam a tela de gestão de usuário que já existe no frontend. O item 7 é o único que realmente
entrega o comportamento "criei funcionário, saiu usuário" — mas ele só faz sentido **depois** de 1–3,
porque sem o campo de vínculo o endpoint agregado não teria onde registrar o resultado.

Sobre o item 4, vale registrar a pergunta antes de pedir a implementação: hoje `CentroCusto` aponta
para `Setor` e `Cargo`, não o contrário. Antes de pedir `Colaborador.centroCustoId`, decida se centro
de custo é **atributo da pessoa** (um colaborador pertence a um) ou **dimensão do lançamento** (o
mesmo colaborador rateia entre vários). As duas leituras são legítimas e levam a modelos diferentes —
e pedir a errada custa uma migration em tabela com dado.

---

## 7. Comportamento que o frontend deve adotar

Regras normativas. Cada uma existe porque o backend se comporta de um jeito específico.

### 7.1 Sessão e contexto

1. `empresaId`/`filialId` vêm de `/me` e vivem em contexto global. Injete-os no cliente HTTP; não passe
   à mão por tela.
2. `empresa_id = Guid.Empty` (`"00000000-0000-0000-0000-000000000000"`) significa **contexto global**
   (master). A UI precisa, nesse caso, oferecer um seletor de empresa — e enviar a escolha em toda
   chamada. Para os demais usuários, o seletor deve estar **travado**.
3. Refresh proativo aos ~13 min. `401` em qualquer chamada → tentar `refresh` uma vez; falhou → logout
   e limpar tudo.
4. Logout **sempre** chama `POST /api/auth/logout` com o refresh token. Sem isso, o access token
   continua válido até vencer — a blacklist só é populada pelo endpoint.
5. `is_manager` não existe mais. Só `isMaster`.

### 7.2 Erro

6. Toast usa `userMessage`. Sempre. Nunca `message` cru, nunca frase montada no frontend.
7. `traceId` visível na UI de erro (rodapé, `code` + `traceId` em fonte menor).
8. Erro de campo vem de `errors` — e **só existe em erro de model binding**. Regra de negócio vem como
   `message` única; exiba no topo do formulário, não tente distribuir por campo.
9. Trate `code` como contrato estável e `message` como texto que pode mudar.

### 7.3 Envio de dados

10. Enum sempre número. Tipos numéricos no TS, espelhando §11.
11. Data sempre ISO com offset.
12. Só envie `Guid` que veio de um `GET`. Onde não há FK, o backend aceita id inexistente em silêncio.
13. Toda ação destrutiva (inativar, cancelar, estornar, remover item) exige **`motivo`**. Modal com
    campo de motivo obrigatório é padrão de UI, não exceção.
14. Nunca envie campo calculado que o backend deveria calcular — mas saiba que **na nota fiscal ele
    hoje não calcula** (§4.3). Isso é exceção conhecida, não permissão para generalizar.

### 7.4 Listagem

15. Lista vazia ≠ "sem dados" (D10). Texto neutro.
16. Filtro e busca vão para a **query string**, não para filtro client-side — a maioria das listagens
    não é paginada e devolve tudo.
17. Onde há `PagedResult`, lembre do embrulho `{ resultado: { items, page, … } }`.

### 7.5 Máquinas de estado

18. Habilite botão de transição pelo **estado atual**, não por permissão apenas. Ambos precisam bater.
19. Em Faturamento e Nota Fiscal, use os endpoints de apoio (`/workflow-operacional`, `/historico`,
    `/ocorrencias`) para montar o stepper. Não infira do status.
20. `StatusFaturamento.Erro(7)` é retomável. Ofereça retomar, não recomeçar.
21. Recebimento de compra é parcial por natureza. Tela por item com quantidade.

### 7.6 Honestidade de produto

22. Não prometa efeito de campo que nenhum processo lê (§5.4). Rotule como cadastro.
23. Não sugira que o sistema calculou imposto na nota fiscal (§4.3).
24. Módulos 🟠 (§3) não devem ser apresentados ao usuário final como funcionalidade pronta.

---

## 8. O que **não** construir agora

Custo alto, retorno nenhum enquanto o backend não fechar a peça correspondente.

| Não construir | Por quê | Quando revisitar |
| --- | --- | --- |
| Cálculo de imposto na tela de nota fiscal | O motor não é chamado pelo documento (D14). O que a tela mostrasse seria diferente do que a nota grava. | Quando a Trilha A (A1→A5) fechar |
| Precificação automática por tabela de preço | O módulo não tem consumidor nenhum em Vendas/PDV/Faturamento | Quando `TabelaPreco` ganhar chamador |
| Controle de limite de crédito | O limite nunca é comparado com saldo em aberto | Quando houver leitor de `limiteCredito` |
| Transporte/frete na NF-e | `Transportadora` tem zero referências no código inteiro | Trilha B2 |
| CMV, margem, custo de produto | Estoque não tem valoração nenhuma | Trilha C1 |
| Balancete / DRE / demonstrações | O razão só recebe baixa financeira e depreciação | Trilha C3 |
| Rastreabilidade de lote ponta a ponta | Lote é estoque paralelo; não existe `loteId` em movimento, saldo ou item de nota — **recall não aponta quais notas levaram o lote** | Junto com C1, por decisão do backend |
| Comissão / painel de vendedor | Não existe vendedor no domínio | §6.3 item 6 |
| Nota fiscal de entrada como parte do fiscal | É modelo paralelo, sem crédito e sem apuração | Módulo 12 |

---

## 9. Catálogo de rotas

Formato: `MÉTODO caminho — permissão — assinatura`. Caminho relativo à rota base do controller.
`ANON` = `[AllowAnonymous]`. Vazio = autenticado sem permissão específica.
Gerado do código; a ordem é a dos arquivos.


### `api/administracao/cargos`

<sub>Administration/CargosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AdministracaoConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `AdministracaoGerenciar` | `Criar([FromBody] CriarCargoRequest request)` |
| `PUT` | `/{id:guid}` | `AdministracaoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarCargoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `AdministracaoGerenciar` | `Inativar(Guid id, [FromBody] InativarCargoRequest request)` |

### `api/administracao/centros-custo`

<sub>Administration/CentrosCustoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AdministracaoConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `AdministracaoGerenciar` | `Criar([FromBody] CriarCentroCustoRequest request)` |
| `PUT` | `/{id:guid}` | `AdministracaoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarCentroCustoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `AdministracaoGerenciar` | `Inativar(Guid id, [FromBody] InativarCentroCustoRequest request)` |

### `api/administracao/empresas`

<sub>Administration/EmpresasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AdministracaoConsultar` | `Listar()` |
| `POST` | `/` | `AdministracaoGerenciar` | `Criar([FromBody] CriarEmpresaRequest request)` |
| `PUT` | `/{id:guid}` | `AdministracaoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarEmpresaRequest request)` |
| `PUT` | `/{id:guid}/endereco-fiscal` | `AdministracaoGerenciar` | `DefinirEnderecoFiscal(Guid id, [FromBody] DefinirEnderecoFiscalRequest request)` |
| `DELETE` | `/{id:guid}/endereco-fiscal/municipio` | `AdministracaoGerenciar` | `DesvincularMunicipioEnderecoFiscal(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `AdministracaoGerenciar` | `Inativar(Guid id, [FromBody] InativarEmpresaRequest request)` |

### `api/administracao/filiais`

<sub>Administration/FiliaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AdministracaoConsultar` | `Listar([FromQuery] Guid empresaId)` |
| `POST` | `/` | `AdministracaoGerenciar` | `Criar([FromBody] CriarFilialRequest request)` |
| `PUT` | `/{id:guid}` | `AdministracaoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarFilialRequest request)` |
| `PUT` | `/{id:guid}/endereco-fiscal` | `AdministracaoGerenciar` | `DefinirEnderecoFiscal(Guid id, [FromBody] DefinirEnderecoFiscalRequest request)` |
| `DELETE` | `/{id:guid}/endereco-fiscal/municipio` | `AdministracaoGerenciar` | `DesvincularMunicipioEnderecoFiscal(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `AdministracaoGerenciar` | `Inativar(Guid id, [FromBody] InativarFilialRequest request)` |

### `api/administracao/setores`

<sub>Administration/SetoresController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AdministracaoConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `AdministracaoGerenciar` | `Criar([FromBody] CriarSetorRequest request)` |
| `PUT` | `/{id:guid}` | `AdministracaoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarSetorRequest request)` |
| `POST` | `/{id:guid}/inativar` | `AdministracaoGerenciar` | `Inativar(Guid id, [FromBody] InativarSetorRequest request)` |

### `api/alimentar/lotes`

<sub>Alimentar/LotesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AlimentarConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] StatusLote? status, [FromQuery] bool? vencidos, [FromQuery] string? termo)` |
| `GET` | `/a-vencer` | `AlimentarConsultar` | `ListarAVencer([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] int dias = 30,)` |
| `GET` | `/{id:guid}` | `AlimentarConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `AlimentarLotesGerenciar` | `Criar([FromBody] CriarLoteRequest request)` |
| `POST` | `/{id:guid}/bloquear` | `AlimentarLotesGerenciar` | `Bloquear(Guid id, [FromBody] BloquearLoteRequest request)` |
| `POST` | `/{id:guid}/desbloquear` | `AlimentarLotesGerenciar` | `Desbloquear(Guid id)` |
| `GET` | `/{id:guid}/movimentacoes` | `AlimentarConsultar` | `ListarMovimentacoes(Guid id, [FromQuery] Guid empresaId)` |
| `POST` | `/movimentacoes` | `AlimentarLotesGerenciar` | `RegistrarMovimentacao([FromBody] RegistrarMovimentacaoLoteRequest request)` |

### `api/alimentar/recalls`

<sub>Alimentar/RecallsController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AlimentarConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusRecall? status)` |
| `GET` | `/{id:guid}` | `AlimentarConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/lotes` | `AlimentarConsultar` | `ListarLotes(Guid id)` |
| `POST` | `/` | `AlimentarRecallGerenciar` | `Abrir([FromBody] AbrirRecallRequest request)` |
| `POST` | `/{id:guid}/lotes` | `AlimentarRecallGerenciar` | `AdicionarLote(Guid id, [FromBody] AdicionarLoteRecallRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `AlimentarRecallGerenciar` | `Encerrar(Guid id)` |
| `POST` | `/{id:guid}/cancelar` | `AlimentarRecallGerenciar` | `Cancelar(Guid id, [FromBody] CancelarRecallRequest request)` |

### `api/anexos`

<sub>Anexos/AnexosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AnexosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? modulo, [FromQuery] string? entidade, [FromQuery] Guid? entidadeId, [FromQuery] CategoriaAnexo? categoria, [FromQuery] bool incluirInativos)` |
| `GET` | `/{id:guid}` | `AnexosConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `AnexosGerenciar` | `Anexar([FromForm] AnexarDocumentoFormRequest form)` |
| `GET` | `/{id:guid}/download` | `AnexosBaixar` | `Download(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `AnexosGerenciar` | `Inativar(Guid id, [FromBody] InativarDocumentoAnexoRequest request)` |

### `api/atividades`

<sub>Atividades/AtividadesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `AtividadesConsultar` | `Listar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? responsavelUsuarioId, [FromQuery] StatusAtividade? status, [FromQuery] PrioridadeAtividade? prioridade, [FromQuery] DateTimeOffset? prazoInicial, [FromQuery] DateTimeOffset? prazoFinal, [FromQuery] string? entidadeOrigem, [FromQuery] Guid? entidadeOrigemId, [FromQuery] string? termo, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `GET` | `/{id:guid}` | `AtividadesConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `AtividadesCriar` | `Criar([FromBody] CriarAtividadeRequest request)` |
| `PUT` | `/{id:guid}` | `AtividadesAtualizar` | `Atualizar(Guid id, [FromBody] AtualizarAtividadeRequest request)` |
| `POST` | `/{id:guid}/atribuir` | `AtividadesAtribuir` | `Atribuir(Guid id, [FromBody] AtribuirResponsavelAtividadeRequest request)` |
| `POST` | `/{id:guid}/status` | `AtividadesAtualizar` | `AlterarStatus(Guid id, [FromBody] AlterarStatusAtividadeRequest request)` |
| `POST` | `/{id:guid}/comentarios` | `AtividadesComentar` | `Comentar(Guid id, [FromBody] ComentarAtividadeRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `AtividadesCancelar` | `Cancelar(Guid id, [FromBody] CancelarAtividadeRequest request)` |

### `api/auditoria`

<sub>AuditoriaController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/eventos` | `AuditoriaConsultar` | `ListarEventos()` |
| `GET` | `/operacional` | `AuditoriaOperacionalConsultar` | `ConsultarOperacional([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? usuarioId, [FromQuery] string? modulo, [FromQuery] string? entidade, [FromQuery] Guid? entidadeId, [FromQuery] AuditoriaAcao? acao, [FromQuery] DateTimeOffset? dataInicial, [FromQuery] DateTimeOffset? dataFinal, [FromQuery] string? termo, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `GET` | `/eventos-recentes` | `AuditoriaOperacionalConsultar` | `ListarEventosRecentes()` |

### `api/bancos`

<sub>Bancos/BancosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/` | `BancosGerenciar` | `CriarBanco([FromBody] CriarBancoRequest request)` |
| `POST` | `/contas-bancarias` | `BancosGerenciar` | `CriarContaBancaria([FromBody] CriarContaBancariaRequest request)` |
| `POST` | `/convenios` | `BancosGerenciar` | `CriarConvenio([FromBody] CriarConvenioBancarioRequest request)` |
| `POST` | `/carteiras` | `BancosGerenciar` | `CriarCarteira([FromBody] CriarCarteiraCobrancaRequest request)` |

### `api/bancos/boletos`

<sub>Bancos/BoletosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `BancosConsultar` | `Listar([FromQuery] ListarBoletosRequest request)` |
| `GET` | `/{id:guid}` | `BancosConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/historico` | `BancosConsultar` | `ListarHistorico(Guid id)` |
| `POST` | `/gerar` | `BoletosGerar` | `Gerar([FromBody] GerarBoletoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `BoletosCancelar` | `Cancelar(Guid id, [FromBody] CancelarBoletoRequest request)` |

### `api/bancos/cnab`

<sub>Bancos/CnabController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/remessas` | `CnabRemessaGerar` | `GerarRemessa([FromBody] GerarRemessaCnabRequest request)` |
| `POST` | `/retornos/importar` | `CnabRetornoProcessar` | `ImportarRetorno([FromForm] ImportarRetornoCnabFormRequest form)` |
| `GET` | `/retornos/{id:guid}` | `BancosConsultar` | `ObterRetorno(Guid id)` |

### `api/tabelas-preco`

<sub>Comercial/TabelasPrecoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `TabelasPrecoConsultar` | `Listar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusTabelaPreco? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,) =>` |
| `GET` | `/{id:guid}` | `TabelasPrecoConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `TabelasPrecoGerenciar` | `Criar([FromBody] CriarTabelaPrecoRequest request)` |
| `PUT` | `/{id:guid}` | `TabelasPrecoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarTabelaPrecoRequest request)` |
| `POST` | `/{id:guid}/ativar` | `TabelasPrecoAtivar` | `Ativar(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `TabelasPrecoInativar` | `Inativar(Guid id, [FromBody] InativarTabelaPrecoRequest request)` |
| `POST` | `/{id:guid}/itens` | `TabelasPrecoItensGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarTabelaPrecoItemRequest request)` |
| `PUT` | `/{id:guid}/itens/{itemId:guid}` | `TabelasPrecoItensGerenciar` | `AtualizarItem(Guid id, Guid itemId, [FromBody] AtualizarTabelaPrecoItemRequest request)` |
| `POST` | `/{id:guid}/itens/{itemId:guid}/inativar` | `TabelasPrecoItensGerenciar` | `InativarItem(Guid id, Guid itemId, [FromBody] InativarTabelaPrecoItemRequest request)` |
| `GET` | `/produtos/{produtoId:guid}/preco-vigente` | `TabelasPrecoConsultar` | `PrecoVigente(Guid produtoId, [FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly dataReferencia)` |

### `api/compras/cotacoes`

<sub>Compras/CotacoesCompraController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ComprasCotacoesConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? fornecedorId, [FromQuery] StatusCotacaoCompra? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ComprasCotacoesConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ComprasCotacoesGerenciar` | `Criar([FromBody] CriarCotacaoCompraRequest request)` |
| `POST` | `/{id:guid}/itens` | `ComprasCotacoesGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemCotacaoCompraRequest request)` |
| `POST` | `/{id:guid}/recusar` | `ComprasCotacoesGerenciar` | `Recusar(Guid id)` |
| `POST` | `/{id:guid}/cancelar` | `ComprasCotacoesGerenciar` | `Cancelar(Guid id, [FromBody] CancelarCotacaoCompraRequest request)` |
| `POST` | `/{id:guid}/aprovar` | `ComprasCotacoesAprovar` | `Aprovar(Guid id, [FromBody] AprovarCotacaoCompraRequest request)` |

### `api/compras/pedidos`

<sub>Compras/PedidosCompraController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ComprasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? fornecedorId, [FromQuery] StatusPedidoCompra? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ComprasConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ComprasGerenciar` | `Criar([FromBody] CriarPedidoCompraRequest request)` |
| `PUT` | `/{id:guid}` | `ComprasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarPedidoCompraRequest request)` |
| `POST` | `/{id:guid}/itens` | `ComprasGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemPedidoCompraRequest request)` |
| `PUT` | `/{id:guid}/itens/{itemId:guid}` | `ComprasGerenciar` | `AtualizarItem(Guid id, Guid itemId, [FromBody] AtualizarItemPedidoCompraRequest request)` |
| `POST` | `/{id:guid}/itens/{itemId:guid}/remover` | `ComprasGerenciar` | `RemoverItem(Guid id, Guid itemId, [FromBody] RemoverItemPedidoCompraRequest request)` |
| `POST` | `/{id:guid}/enviar-para-aprovacao` | `ComprasGerenciar` | `EnviarParaAprovacao(Guid id)` |
| `POST` | `/{id:guid}/aprovar` | `ComprasAprovar` | `Aprovar(Guid id, [FromBody] AprovarPedidoCompraRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `ComprasCancelar` | `Cancelar(Guid id, [FromBody] CancelarPedidoCompraRequest request)` |
| `POST` | `/{id:guid}/receber` | `ComprasReceber` | `Receber(Guid id, [FromBody] ReceberPedidoCompraRequest request)` |

### `api/compras/recebimentos`

<sub>Compras/RecebimentosCompraController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/{id:guid}` | `ComprasConsultar` | `Obter(Guid id)` |
| `GET` | `/divergencias` | `ComprasConsultar` | `ListarDivergencias([FromQuery] Guid empresaId, [FromQuery] Guid? pedidoCompraId, [FromQuery] Guid? recebimentoCompraId)` |
| `POST` | `/{id:guid}/conferencia-fiscal` | `ComprasConferenciaFiscalRegistrar` | `RegistrarConferenciaFiscal(Guid id, [FromBody] RegistrarConferenciaFiscalEntradaRequest request)` |

### `api/compras/solicitacoes`

<sub>Compras/SolicitacoesCompraController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ComprasSolicitacoesConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusSolicitacaoCompra? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ComprasSolicitacoesConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ComprasSolicitacoesGerenciar` | `Criar([FromBody] CriarSolicitacaoCompraRequest request)` |
| `POST` | `/{id:guid}/itens` | `ComprasSolicitacoesGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemSolicitacaoCompraRequest request)` |
| `POST` | `/{id:guid}/aprovar` | `ComprasSolicitacoesAprovar` | `Aprovar(Guid id)` |
| `POST` | `/{id:guid}/cancelar` | `ComprasSolicitacoesGerenciar` | `Cancelar(Guid id, [FromBody] CancelarSolicitacaoCompraRequest request)` |

### `api/contabil/lancamentos`

<sub>Contabil/LancamentosContabeisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ContabilConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] DateTimeOffset? inicio, [FromQuery] DateTimeOffset? fim, [FromQuery] StatusLancamentoContabil? status)` |
| `GET` | `/{id:guid}` | `ContabilConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ContabilLancamentosGerenciar` | `Criar([FromBody] CriarLancamentoManualRequest request)` |
| `POST` | `/{id:guid}/estornar` | `ContabilLancamentosEstornar` | `Estornar(Guid id, [FromBody] EstornarLancamentoRequest request)` |

### `api/contabil/periodos`

<sub>Contabil/PeriodosContabeisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ContabilConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusPeriodoContabil? status)` |
| `POST` | `/` | `ContabilPeriodosGerenciar` | `Abrir([FromBody] AbrirPeriodoContabilRequest request)` |
| `POST` | `/{id:guid}/fechar` | `ContabilPeriodosGerenciar` | `Fechar(Guid id, [FromBody] FecharPeriodoContabilRequest request)` |
| `POST` | `/{id:guid}/reabrir` | `ContabilPeriodosGerenciar` | `Reabrir(Guid id)` |

### `api/contabil/plano-contas`

<sub>Contabil/PlanoContasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ContabilConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] TipoContaContabil? tipo, [FromQuery] StatusContaContabil? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ContabilConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ContabilPlanoContasGerenciar` | `Criar([FromBody] CriarContaContabilRequest request)` |
| `POST` | `/{id:guid}/inativar` | `ContabilPlanoContasGerenciar` | `Inativar(Guid id)` |

### `api/contabil/regras`

<sub>Contabil/RegrasContabilizacaoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ContabilConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusRegraContabilizacao? status)` |
| `POST` | `/` | `ContabilRegrasGerenciar` | `Criar([FromBody] CriarRegraContabilizacaoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `ContabilRegrasGerenciar` | `Inativar(Guid id)` |

### `api/contratos`

<sub>Contratos/ContratosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ContratosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? clienteId, [FromQuery] StatusContrato? status, [FromQuery] TipoFaturamentoContrato? tipo, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ContratosConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ContratosGerenciar` | `Criar([FromBody] CriarContratoRequest request)` |
| `PUT` | `/{id:guid}` | `ContratosGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarContratoRequest request)` |
| `POST` | `/{id:guid}/aprovar` | `ContratosGerenciar` | `Aprovar(Guid id)` |
| `POST` | `/{id:guid}/reajustar` | `ContratosGerenciar` | `Reajustar(Guid id, [FromBody] ReajustarContratoRequest request)` |
| `POST` | `/{id:guid}/renovar` | `ContratosGerenciar` | `Renovar(Guid id, [FromBody] RenovarContratoRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `ContratosGerenciar` | `Encerrar(Guid id, [FromBody] EncerrarContratoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `ContratosGerenciar` | `Cancelar(Guid id, [FromBody] CancelarContratoRequest request)` |
| `POST` | `/{id:guid}/faturamentos` | `ContratosFaturar` | `GerarFaturamento(Guid id, [FromBody] GerarFaturamentoContratoRequest request)` |

### `api/crm/leads`

<sub>Crm/LeadsController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `CrmConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusLead? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `CrmConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `CrmLeadsGerenciar` | `Criar([FromBody] CriarLeadRequest request)` |
| `PUT` | `/{id:guid}` | `CrmLeadsGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarLeadRequest request)` |
| `POST` | `/{id:guid}/qualificar` | `CrmLeadsGerenciar` | `Qualificar(Guid id, [FromBody] QualificarLeadRequest request)` |
| `POST` | `/{id:guid}/descartar` | `CrmLeadsGerenciar` | `Descartar(Guid id, [FromBody] DescartarLeadRequest request)` |

### `api/crm/oportunidades`

<sub>Crm/OportunidadesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `CrmConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? clienteId, [FromQuery] StatusOportunidade? status, [FromQuery] EstagioOportunidade? estagio, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `CrmConsultar` | `Obter(Guid id)` |
| `PUT` | `/{id:guid}` | `CrmOportunidadesGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarOportunidadeRequest request)` |
| `POST` | `/{id:guid}/estagio` | `CrmOportunidadesGerenciar` | `AlterarEstagio(Guid id, [FromBody] AlterarEstagioOportunidadeRequest request)` |
| `POST` | `/{id:guid}/ganhar` | `CrmOportunidadesGerenciar` | `Ganhar(Guid id, [FromBody] GanharOportunidadeRequest request)` |
| `POST` | `/{id:guid}/perder` | `CrmOportunidadesGerenciar` | `Perder(Guid id, [FromBody] PerderOportunidadeRequest request)` |
| `POST` | `/{id:guid}/converter` | `CrmConverter` | `Converter(Guid id, [FromBody] ConverterOportunidadeRequest request)` |

### `api/crm/propostas`

<sub>Crm/PropostasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `CrmConsultar` | `Listar([FromQuery] Guid oportunidadeId)` |
| `GET` | `/{id:guid}` | `CrmConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `CrmPropostasGerenciar` | `Criar([FromBody] CriarPropostaRequest request)` |
| `POST` | `/{id:guid}/aceitar` | `CrmPropostasGerenciar` | `Aceitar(Guid id)` |
| `POST` | `/{id:guid}/recusar` | `CrmPropostasGerenciar` | `Recusar(Guid id)` |

### `api/deploy`

<sub>Deploy/DeployController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/ambiente` | `DeployConsultar` | `StatusAmbiente()` |
| `GET` | `/migracoes` | `DeployConsultar` | `Migracoes()` |
| `GET` | `/` | `DeployConsultar` | `Listar([FromQuery] string? ambiente, [FromQuery] StatusDeploy? status)` |
| `GET` | `/{id:guid}` | `DeployConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `DeployGerenciar` | `Registrar([FromBody] RegistrarDeployRequest request)` |
| `POST` | `/{id:guid}/concluir` | `DeployGerenciar` | `Concluir(Guid id, [FromBody] ConcluirDeployRequest request)` |
| `POST` | `/{id:guid}/falhar` | `DeployGerenciar` | `Falhar(Guid id, [FromBody] FalharDeployRequest request)` |
| `POST` | `/{id:guid}/reverter` | `DeployGerenciar` | `Reverter(Guid id, [FromBody] ReverterDeployRequest request)` |
| `GET` | `/{id:guid}/checklist` | `DeployConsultar` | `ListarChecklist(Guid id)` |
| `POST` | `/checklist` | `DeployGerenciar` | `AdicionarItem([FromBody] AdicionarItemChecklistRequest request)` |
| `POST` | `/checklist/{id:guid}/resultado` | `DeployGerenciar` | `RegistrarResultado(Guid id, [FromBody] RegistrarResultadoItemRequest request)` |

### `api/estoque/avancado`

<sub>Estoque/EstoqueAvancadoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/inventarios` | `EstoqueInventarioGerenciar` | `CriarInventario([FromBody] CriarInventarioEstoqueRequest request)` |
| `GET` | `/inventarios` | `EstoqueConsultar` | `ListarInventarios([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? localEstoqueId, [FromQuery] StatusInventarioEstoque? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,) =>` |
| `GET` | `/inventarios/{id:guid}` | `EstoqueConsultar` | `ObterInventario(Guid id)` |
| `POST` | `/inventarios/{id:guid}/itens` | `EstoqueInventarioGerenciar` | `AdicionarItem(Guid id, [FromBody] ItemInventarioEstoqueRequest request)` |
| `POST` | `/inventarios/{id:guid}/iniciar-contagem` | `EstoqueInventarioGerenciar` | `IniciarContagem(Guid id)` |
| `POST` | `/inventarios/{id:guid}/concluir` | `EstoqueInventarioGerenciar` | `Concluir(Guid id, [FromBody] ConcluirInventarioEstoqueRequest request)` |
| `POST` | `/inventarios/{id:guid}/cancelar` | `EstoqueInventarioGerenciar` | `CancelarInventario(Guid id, [FromBody] CancelarInventarioEstoqueRequest request)` |
| `POST` | `/ajustes` | `EstoqueAjustar` | `Ajustar([FromBody] CriarAjusteEstoqueRequest request)` |
| `POST` | `/bloqueios` | `EstoqueBloqueioGerenciar` | `CriarBloqueio([FromBody] CriarBloqueioEstoqueRequest request)` |
| `POST` | `/bloqueios/{id:guid}/liberar` | `EstoqueBloqueioGerenciar` | `LiberarBloqueio(Guid id, [FromBody] EncerrarBloqueioEstoqueRequest request)` |
| `POST` | `/bloqueios/{id:guid}/cancelar` | `EstoqueBloqueioGerenciar` | `CancelarBloqueio(Guid id, [FromBody] EncerrarBloqueioEstoqueRequest request)` |

### `api/estoque`

<sub>Estoque/EstoqueController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/saldos` | `EstoqueConsultar` | `ListarSaldos([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] Guid? localEstoqueId)` |
| `GET` | `/saldos/produto/{produtoId:guid}/local/{localEstoqueId:guid}` | `EstoqueConsultar` | `ObterSaldo([FromQuery] Guid empresaId, Guid produtoId, Guid localEstoqueId)` |
| `POST` | `/transferencias` | `EstoqueMovimentar` | `Transferir([FromBody] TransferirEstoqueRequest request)` |
| `GET` | `/movimentos` | `EstoqueConsultar` | `ListarMovimentos([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] Guid? localEstoqueId, [FromQuery] DateTimeOffset? inicio, [FromQuery] DateTimeOffset? fim)` |
| `POST` | `/entradas` | `EstoqueMovimentar` | `RegistrarEntrada([FromBody] RegistrarEntradaEstoqueRequest request)` |
| `POST` | `/saidas` | `EstoqueMovimentar` | `RegistrarSaida([FromBody] RegistrarSaidaEstoqueRequest request)` |
| `POST` | `/ajustes` | `EstoqueMovimentar` | `Ajustar([FromBody] AjustarEstoqueRequest request)` |

### `api/estoque/inventarios`

<sub>Estoque/InventariosEstoqueController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `EstoqueConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? localEstoqueId)` |
| `POST` | `/` | `EstoqueInventarioGerenciar` | `Abrir([FromBody] AbrirInventarioRequest request)` |
| `POST` | `/{id:guid}/itens` | `EstoqueInventarioGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemInventarioRequest request)` |
| `POST` | `/{id:guid}/fechar` | `EstoqueInventarioGerenciar` | `Fechar(Guid id, [FromBody] FecharInventarioRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `EstoqueInventarioGerenciar` | `Cancelar(Guid id, [FromBody] CancelarInventarioRequest request)` |

### `api/estoque/locais`

<sub>Estoque/LocaisEstoqueController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `EstoqueConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `LocaisEstoqueGerenciar` | `Criar([FromBody] CriarLocalEstoqueRequest request)` |
| `PUT` | `/{id:guid}` | `LocaisEstoqueGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarLocalEstoqueRequest request)` |
| `POST` | `/{id:guid}/inativar` | `LocaisEstoqueGerenciar` | `Inativar(Guid id, [FromBody] InativarLocalEstoqueRequest request)` |

### `api/estoque/reservas`

<sub>Estoque/ReservasEstoqueController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `EstoqueConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] Guid? origemId)` |
| `POST` | `/` | `EstoqueReservar` | `Criar([FromBody] CriarReservaEstoqueRequest request)` |
| `POST` | `/{id:guid}/baixar` | `EstoqueReservar` | `Baixar(Guid id, [FromBody] BaixarReservaEstoqueRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `EstoqueReservar` | `Cancelar(Guid id, [FromBody] CancelarReservaEstoqueRequest request)` |

### `api/faturamento`

<sub>Faturamento/FaturamentosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FaturamentoConsultar` | `Listar([FromQuery] ListarFaturamentosRequest request)` |
| `GET` | `/{id:guid}` | `FaturamentoConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/historico` | `FaturamentoConsultar` | `ListarHistorico(Guid id)` |
| `GET` | `/{id:guid}/ocorrencias` | `FaturamentoConsultar` | `ListarOcorrencias(Guid id)` |
| `POST` | `/preparar` | `FaturamentoPreparar` | `Preparar([FromBody] PrepararFaturamentoRequest request)` |
| `POST` | `/{id:guid}/confirmar` | `FaturamentoConfirmar` | `Confirmar(Guid id, [FromBody] ConfirmarFaturamentoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `FaturamentoCancelar` | `Cancelar(Guid id, [FromBody] CancelarFaturamentoRequest request)` |

### `api/financeiro/condicoes-pagamento`

<sub>Financeiro/CondicoesPagamentoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FinanceiroConsultar` | `Listar([FromQuery] Guid empresaId) =>` |
| `POST` | `/` | `CondicoesPagamentoGerenciar` | `Criar([FromBody] CriarCondicaoPagamentoRequest request)` |
| `PUT` | `/{id:guid}` | `CondicoesPagamentoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarCondicaoPagamentoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `CondicoesPagamentoGerenciar` | `Inativar(Guid id, [FromBody] InativarCondicaoPagamentoRequest request)` |

### `api/financeiro/contas-pagar`

<sub>Financeiro/ContasPagarController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FinanceiroConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? fornecedorId, [FromQuery] StatusContaFinanceira? status) =>` |
| `GET` | `/{id:guid}` | `FinanceiroConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FinanceiroGerenciar` | `Criar([FromBody] CriarContaPagarRequest request)` |
| `POST` | `/{id:guid}/pagar` | `FinanceiroPagar` | `Pagar(Guid id, [FromBody] PagarParcelaRequest request)` |
| `POST` | `/{id:guid}/estornar-pagamento` | `FinanceiroEstornar` | `EstornarPagamento(Guid id, [FromBody] EstornarPagamentoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `FinanceiroCancelar` | `Cancelar(Guid id, [FromBody] CancelarContaPagarRequest request)` |

### `api/financeiro/contas-receber`

<sub>Financeiro/ContasReceberController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FinanceiroConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? clienteId, [FromQuery] StatusContaFinanceira? status) =>` |
| `GET` | `/{id:guid}` | `FinanceiroConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FinanceiroGerenciar` | `Criar([FromBody] CriarContaReceberRequest request)` |
| `POST` | `/pedido-venda/{pedidoVendaId:guid}` | `FinanceiroGerenciar` | `GerarDePedidoVenda(Guid pedidoVendaId, [FromBody] GerarContaReceberPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/receber` | `FinanceiroReceber` | `Receber(Guid id, [FromBody] ReceberParcelaRequest request)` |
| `POST` | `/{id:guid}/estornar-recebimento` | `FinanceiroEstornar` | `EstornarRecebimento(Guid id, [FromBody] EstornarRecebimentoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `FinanceiroCancelar` | `Cancelar(Guid id, [FromBody] CancelarContaReceberRequest request)` |

### `api/financeiro/avancado`

<sub>Financeiro/FinanceiroAvancadoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/contas-receber` | `FinanceiroConsultar` | `ListarReceber([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? participanteId, [FromQuery] StatusContaFinanceira? status, [FromQuery] string? dataInicial, [FromQuery] string? dataFinal, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `POST` | `/contas-receber` | `FinanceiroGerenciar` | `CriarReceber([FromBody] CriarContaFinanceiraRequest request)` |
| `GET` | `/contas-pagar` | `FinanceiroConsultar` | `ListarPagar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? participanteId, [FromQuery] StatusContaFinanceira? status, [FromQuery] string? dataInicial, [FromQuery] string? dataFinal, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `POST` | `/contas-pagar` | `FinanceiroGerenciar` | `CriarPagar([FromBody] CriarContaFinanceiraRequest request)` |
| `GET` | `/contas/{id:guid}` | `FinanceiroConsultar` | `Obter(Guid id)` |
| `POST` | `/contas-receber/{id:guid}/baixar` | `FinanceiroReceber` | `BaixarReceber(Guid id, [FromBody] BaixarContaFinanceiraRequest request)` |
| `POST` | `/contas-pagar/{id:guid}/baixar` | `FinanceiroPagar` | `BaixarPagar(Guid id, [FromBody] BaixarContaFinanceiraRequest request)` |
| `POST` | `/contas/{id:guid}/estornar` | `FinanceiroEstornar` | `Estornar(Guid id, [FromBody] EstornarBaixaFinanceiraRequest request)` |
| `POST` | `/contas/{id:guid}/cancelar` | `FinanceiroCancelar` | `Cancelar(Guid id, [FromBody] CancelarContaFinanceiraRequest request)` |
| `POST` | `/contas-receber/{id:guid}/estornar` | `FinanceiroEstornar` | `EstornarReceber(Guid id, [FromBody] EstornarBaixaFinanceiraRequest request) =>` |
| `POST` | `/contas-pagar/{id:guid}/estornar` | `FinanceiroEstornar` | `EstornarPagar(Guid id, [FromBody] EstornarBaixaFinanceiraRequest request) =>` |
| `POST` | `/contas-receber/{id:guid}/cancelar` | `FinanceiroCancelar` | `CancelarReceber(Guid id, [FromBody] CancelarContaFinanceiraRequest request) =>` |
| `POST` | `/contas-pagar/{id:guid}/cancelar` | `FinanceiroCancelar` | `CancelarPagar(Guid id, [FromBody] CancelarContaFinanceiraRequest request) =>` |
| `GET` | `/fluxo-caixa` | `FinanceiroFluxoCaixaConsultar` | `FluxoCaixa([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] string? dataInicial, [FromQuery] string? dataFinal)` |

### `api/financeiro/formas-pagamento`

<sub>Financeiro/FormasPagamentoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FinanceiroConsultar` | `Listar([FromQuery] Guid empresaId) =>` |
| `POST` | `/` | `FormasPagamentoGerenciar` | `Criar([FromBody] CriarFormaPagamentoRequest request)` |
| `PUT` | `/{id:guid}` | `FormasPagamentoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarFormaPagamentoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FormasPagamentoGerenciar` | `Inativar(Guid id, [FromBody] InativarFormaPagamentoRequest request)` |

### `api/fiscal/cadastros`

<sub>Fiscal/CadastrosFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/uf` | `FiscalCadastrosConsultar` | `ListarUf([FromQuery] string? termo, [FromQuery] bool? ativo)` |
| `GET` | `/paises` | `FiscalCadastrosConsultar` | `ListarPaises([FromQuery] string? termo, [FromQuery] string? codigoBacen, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/municipios` | `FiscalCadastrosConsultar` | `ListarMunicipios([FromQuery] string? ufSigla, [FromQuery] string? termo, [FromQuery] string? codigoIbge, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/cst-icms` | `FiscalCadastrosConsultar` | `ListarCstIcms([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/csosn` | `FiscalCadastrosConsultar` | `ListarCsosn([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/cst-ipi` | `FiscalCadastrosConsultar` | `ListarCstIpi([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] IndicadorOperacaoCst? indicadorOperacao, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/cst-pis-cofins` | `FiscalCadastrosConsultar` | `ListarCstPisCofins([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] IndicadorOperacaoCst? indicadorOperacao, [FromQuery] bool? geraCredito, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/origens-mercadoria` | `FiscalCadastrosConsultar` | `ListarOrigensMercadoria([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/unidades-tributaveis` | `FiscalCadastrosConsultar` | `ListarUnidadesTributaveis([FromQuery] string? termo, [FromQuery] string? sigla, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/cfop` | `FiscalCadastrosConsultar` | `ListarCfop([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] TipoCfop? tipo, [FromQuery] AmbitoCfop? ambito, [FromQuery] bool? indicadorDevolucao, [FromQuery] bool? indicadorTransferencia, [FromQuery] bool? indicadorIndustrializacao, [FromQuery] bool? geraFinanceiro, [FromQuery] bool? movimentaEstoque, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/ncm` | `FiscalCadastrosConsultar` | `ListarNcm([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] DateOnly? vigenteEm, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/cest` | `FiscalCadastrosConsultar` | `ListarCest([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] string? segmento, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/ncm-cest` | `FiscalCadastrosConsultar` | `ListarNcmCest([FromQuery] string? ncmCodigo, [FromQuery] string? cestCodigo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/ncm/{codigo}/validacao` | `FiscalCadastrosConsultar` | `ValidarNcmCest(string codigo, [FromQuery] string? cestCodigo, [FromQuery] DateOnly? dataOperacao,)` |
| `GET` | `/codigos-servico` | `FiscalCadastrosConsultar` | `ListarCodigosServico([FromQuery] string? municipioCodigoIbge, [FromQuery] string? codigoLc116, [FromQuery] string? termo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `POST` | `/importar/{tabela}` | `FiscalCadastrosGerenciar` | `ImportarTabelaOficial(TabelaOficialFiscal tabela)` |

### `api/fiscal/excecoes`

<sub>Fiscal/ExcecoesFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalRegrasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? uf, [FromQuery] bool? somenteAtivas, [FromQuery] string? termo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/{id:guid}` | `FiscalRegrasConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FiscalRegrasGerenciar` | `Criar([FromBody] CriarExcecaoFiscalRequest request)` |
| `PUT` | `/{id:guid}` | `FiscalRegrasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarExcecaoFiscalRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FiscalRegrasGerenciar` | `Inativar(Guid id, [FromBody] InativarExcecaoFiscalRequest request)` |

### `api/fiscal/excecoes-ncm`

<sub>Fiscal/ExcecoesFiscaisNcmController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalRegrasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? ncmId, [FromQuery] string? uf, [FromQuery] bool? somenteAtivas, [FromQuery] string? termo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/{id:guid}` | `FiscalRegrasConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FiscalRegrasGerenciar` | `Criar([FromBody] CriarExcecaoFiscalNcmRequest request)` |
| `PUT` | `/{id:guid}` | `FiscalRegrasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarExcecaoFiscalNcmRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FiscalRegrasGerenciar` | `Inativar(Guid id, [FromBody] InativarExcecaoFiscalNcmRequest request)` |

### `api/fiscal/inutilizacoes`

<sub>Fiscal/InutilizacoesFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/` | `FiscalInutilizar` | `Inutilizar([FromBody] InutilizarNumeracaoSefazRequest request)` |

### `api/fiscal/modelos-documento`

<sub>Fiscal/ModelosDocumentoFiscalController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalModelosConsultar` | `Listar([FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] bool? ativo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |

### `api/fiscal/naturezas-operacao`

<sub>Fiscal/NaturezasOperacaoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalCadastrosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] string? termo, [FromQuery] string? codigo, [FromQuery] TipoDocumentoFiscal? tipoDocumento, [FromQuery] TipoOperacaoFiscal? tipoOperacao, [FromQuery] FinalidadeNaturezaOperacao? finalidade, [FromQuery] bool? somenteAtivas, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `POST` | `/` | `FiscalCadastrosGerenciar` | `Criar([FromBody] CriarNaturezaOperacaoRequest request)` |
| `PUT` | `/{id:guid}` | `FiscalCadastrosGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarNaturezaOperacaoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FiscalCadastrosGerenciar` | `Inativar(Guid id, [FromBody] InativarNaturezaOperacaoRequest request)` |
| `GET` | `/{id:guid}/cfop` | `FiscalCadastrosConsultar` | `ResolverCfop(Guid id, [FromQuery] string ufOrigem, [FromQuery] string ufDestino, [FromQuery] bool operacaoComExterior = false,)` |

### `api/fiscal/notas-fiscais`

<sub>Fiscal/NotasFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalConsultar` | `Listar([FromQuery] ListarNotasFiscaisRequest request)` |
| `GET` | `/exportacoes/csv` | `FiscalExportar` | `ExportarCsv([FromQuery] ExportarNotasFiscaisRequest request)` |
| `GET` | `/{id:guid}` | `FiscalConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/resumo-operacional` | `FiscalConsultar` | `ObterResumoOperacional(Guid id)` |
| `GET` | `/{id:guid}/workflow-operacional` | `FiscalConsultar` | `ObterWorkflowOperacional(Guid id)` |
| `POST` | `/` | `FiscalGerenciar` | `Criar([FromBody] CriarNotaFiscalRequest request)` |
| `POST` | `/gerar-de-pedido-venda` | `FiscalEmitir` | `GerarDePedidoVenda([FromBody] GerarNotaFiscalPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/itens` | `FiscalGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/impostos` | `FiscalGerenciar` | `AdicionarImposto(Guid id, [FromBody] AdicionarImpostoNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/xmls` | `FiscalGerenciar` | `ArmazenarXml(Guid id, [FromBody] ArmazenarXmlNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/validar` | `FiscalGerenciar` | `Validar(Guid id)` |
| `POST` | `/{id:guid}/gerar-xml-envio` | `FiscalGerenciar` | `GerarXmlEnvio(Guid id, [FromBody] GerarXmlEnvioNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/assinar-xml-envio` | `FiscalEmitir` | `AssinarXmlEnvio(Guid id, [FromBody] AssinarXmlNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/transmitir-sefaz` | `FiscalEmitir` | `TransmitirSefaz(Guid id, [FromBody] TransmitirNotaFiscalSefazRequest request)` |
| `POST` | `/{id:guid}/reprocessar-sefaz` | `FiscalEmitir` | `ReprocessarSefaz(Guid id, [FromBody] ReprocessarTransmissaoSefazRequest request)` |
| `GET` | `/{id:guid}/integracoes` | `FiscalConsultar` | `ListarIntegracoes(Guid id)` |
| `POST` | `/{id:guid}/habilitar-contingencia` | `FiscalEmitir` | `HabilitarContingencia(Guid id, [FromBody] HabilitarContingenciaNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/consultar-protocolo-sefaz` | `FiscalEmitir` | `ConsultarProtocoloSefaz(Guid id, [FromBody] ConsultarProtocoloSefazRequest request)` |
| `POST` | `/{id:guid}/rejeicao` | `FiscalGerenciar` | `RegistrarRejeicao(Guid id, [FromBody] RegistrarRejeicaoNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `FiscalCancelar` | `Cancelar(Guid id, [FromBody] CancelarNotaFiscalRequest request)` |
| `POST` | `/{id:guid}/cancelar-sefaz` | `FiscalCancelar` | `CancelarSefaz(Guid id, [FromBody] CancelarNotaFiscalSefazRequest request)` |
| `POST` | `/{id:guid}/cartas-correcao` | `FiscalCartaCorrecao` | `EmitirCartaCorrecao(Guid id, [FromBody] EmitirCartaCorrecaoSefazRequest request)` |
| `POST` | `/{id:guid}/baixar-estoque` | `EstoqueMovimentar` | `BaixarEstoque(Guid id, [FromBody] BaixarEstoqueNotaFiscalAutorizadaRequest request)` |
| `POST` | `/{id:guid}/gerar-conta-receber` | `FinanceiroGerenciar` | `GerarContaReceber(Guid id, [FromBody] GerarContaReceberNotaFiscalAutorizadaRequest request)` |
| `POST` | `/{id:guid}/danfe` | `FiscalEmitir` | `GerarDanfe(Guid id, [FromBody] GerarDanfeNotaFiscalRequest request)` |
| `GET` | `/documentos-auxiliares/{documentoAuxiliarId:guid}/download` | `FiscalConsultar` | `BaixarDocumentoAuxiliar(Guid documentoAuxiliarId)` |

### `api/fiscal/observabilidade`

<sub>Fiscal/ObservabilidadeFiscalController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/integracoes` | `FiscalConsultar` | `ObterIntegracoes([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] DateTimeOffset? registradoApos, [FromQuery] int take)` |

### `api/fiscal/regras`

<sub>Fiscal/RegrasFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalRegrasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] TipoCfop? tipoOperacao, [FromQuery] string? ufDestino, [FromQuery] Guid? ncmId, [FromQuery] Guid? cfopId, [FromQuery] bool? somenteAtivas, [FromQuery] string? termo, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/{id:guid}` | `FiscalRegrasConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FiscalRegrasGerenciar` | `Criar([FromBody] CriarRegraFiscalOperacaoRequest request)` |
| `PUT` | `/{id:guid}` | `FiscalRegrasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarRegraFiscalOperacaoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FiscalRegrasGerenciar` | `Inativar(Guid id, [FromBody] InativarRegraFiscalOperacaoRequest request)` |

### `api/fiscal/sefaz`

<sub>Fiscal/SefazController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/status-servico` | `FiscalConsultar` | `ConsultarStatusServico([FromBody] ConsultarStatusServicoSefazRequest request)` |
| `GET` | `/status-servico/historico` | `FiscalConsultar` | `ListarHistoricoStatusServico([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] int take)` |
| `POST` | `/contingencia/avaliar` | `FiscalEmitir` | `AvaliarContingencia([FromBody] AvaliarContingenciaFiscalRequest request)` |
| `GET` | `/contingencia/historico` | `FiscalConsultar` | `ListarHistoricoContingencia([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] int take)` |

### `api/fiscal/series`

<sub>Fiscal/SeriesFiscaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FiscalSeriesConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? modeloDocumentoFiscalId, [FromQuery] bool? somenteAtivas, [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 20,)` |
| `GET` | `/{id:guid}` | `FiscalSeriesConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/buracos` | `FiscalSeriesConsultar` | `ConsultarBuracos(Guid id)` |
| `POST` | `/` | `FiscalSeriesGerenciar` | `Criar([FromBody] CriarSerieFiscalRequest request)` |
| `POST` | `/{id:guid}/ampliar` | `FiscalSeriesGerenciar` | `Ampliar(Guid id, [FromBody] AmpliarNumeroFinalSerieFiscalRequest request)` |
| `POST` | `/{id:guid}/encerrar-vigencia` | `FiscalSeriesGerenciar` | `EncerrarVigencia(Guid id, [FromBody] EncerrarVigenciaSerieFiscalRequest request)` |
| `POST` | `/{id:guid}/inativar` | `FiscalSeriesGerenciar` | `Inativar(Guid id, [FromBody] InativarSerieFiscalRequest request)` |

### `api/fiscal/tributacao`

<sub>Fiscal/TributacaoSimulacaoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/simular` | `FiscalRegrasConsultar` | `Simular([FromBody] DocumentoTributavelRequest request)` |

### `api/frota/motoristas`

<sub>Frota/MotoristasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FrotaConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `FrotaConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FrotaGerenciar` | `Criar([FromBody] CriarMotoristaRequest request)` |
| `PUT` | `/{id:guid}` | `FrotaGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarMotoristaRequest request)` |

### `api/frota/veiculos`

<sub>Frota/VeiculosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FrotaConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusVeiculo? status, [FromQuery] TipoVeiculo? tipo, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `FrotaConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FrotaGerenciar` | `Criar([FromBody] CriarVeiculoRequest request)` |
| `PUT` | `/{id:guid}` | `FrotaGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarVeiculoRequest request)` |
| `POST` | `/{id:guid}/status` | `FrotaGerenciar` | `AlterarStatus(Guid id, [FromBody] AlterarStatusVeiculoRequest request)` |
| `GET` | `/abastecimentos` | `FrotaConsultar` | `ListarAbastecimentos([FromQuery] Guid empresaId, [FromQuery] Guid? veiculoId)` |
| `POST` | `/abastecimentos` | `FrotaGerenciar` | `RegistrarAbastecimento([FromBody] RegistrarAbastecimentoRequest request)` |
| `GET` | `/manutencoes` | `FrotaConsultar` | `ListarManutencoes([FromQuery] Guid empresaId, [FromQuery] Guid? veiculoId, [FromQuery] StatusManutencao? status)` |
| `POST` | `/manutencoes` | `FrotaGerenciar` | `RegistrarManutencao([FromBody] RegistrarManutencaoRequest request)` |
| `POST` | `/manutencoes/{id:guid}/concluir` | `FrotaGerenciar` | `ConcluirManutencao(Guid id)` |
| `POST` | `/manutencoes/{id:guid}/cancelar` | `FrotaGerenciar` | `CancelarManutencao(Guid id)` |
| `GET` | `/despesas` | `FrotaConsultar` | `ListarDespesas([FromQuery] Guid empresaId, [FromQuery] Guid? veiculoId)` |
| `POST` | `/despesas` | `FrotaGerenciar` | `RegistrarDespesa([FromBody] RegistrarDespesaVeiculoRequest request)` |
| `GET` | `/documentos` | `FrotaConsultar` | `ListarDocumentos([FromQuery] Guid empresaId, [FromQuery] Guid? veiculoId)` |
| `POST` | `/documentos` | `FrotaGerenciar` | `RegistrarDocumento([FromBody] RegistrarDocumentoVeiculoRequest request)` |

### `api/frota/viagens`

<sub>Frota/ViagensController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FrotaConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? veiculoId, [FromQuery] Guid? motoristaId, [FromQuery] StatusViagem? status)` |
| `GET` | `/{id:guid}` | `FrotaConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `FrotaGerenciar` | `Iniciar([FromBody] IniciarViagemRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `FrotaGerenciar` | `Encerrar(Guid id, [FromBody] EncerrarViagemRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `FrotaGerenciar` | `Cancelar(Guid id, [FromBody] CancelarViagemRequest request)` |

### `api/health`

<sub>HealthController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | _(autenticado)_ | `Get() => Ok(new { status = "ok", service = "logosoft-backend", versao = _configuration["Aplicacao:Versao"] ?? "desconhecida", utcNow = DateTimeOffset.UtcNow });` |
| `GET` | `/database` | _(autenticado)_ | `Database()` |
| `GET` | `/redis` | _(autenticado)_ | `Redis()` |

### `api/infraestrutura`

<sub>Infraestrutura/InfraestruturaProducaoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/health` | `InfraestruturaConsultar` | `ObterHealth()` |
| `GET` | `/health/dependencies` | `InfraestruturaConsultar` | `ObterDependencias()` |
| `GET` | `/backups/status` | `InfraestruturaBackupConsultar` | `ObterStatusBackup()` |

### `api/integracoes`

<sub>Integracoes/IntegracoesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/externas` | `IntegracoesConsultar` | `ListarIntegracoes([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] bool incluirInativas = false,)` |
| `POST` | `/externas` | `IntegracoesGerenciar` | `CriarIntegracao([FromBody] CriarIntegracaoExternaRequest request)` |
| `PUT` | `/externas/{id:guid}` | `IntegracoesGerenciar` | `AtualizarIntegracao(Guid id, [FromBody] AtualizarIntegracaoExternaRequest request)` |
| `POST` | `/externas/{id:guid}/inativar` | `IntegracoesGerenciar` | `InativarIntegracao(Guid id, [FromQuery] string motivo)` |
| `POST` | `/externas/{id:guid}/reativar` | `IntegracoesGerenciar` | `ReativarIntegracao(Guid id, [FromQuery] string motivo)` |
| `GET` | `/eventos` | `IntegracoesConsultar` | `ListarEventos([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? integracaoExternaId, [FromQuery] SituacaoEventoIntegracao? situacao, [FromQuery] DirecaoEventoIntegracao? direcao, [FromQuery] string? tipoEvento, [FromQuery] string? correlationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `POST` | `/eventos` | `IntegracoesGerenciar` | `CriarEvento([FromBody] CriarEventoIntegracaoRequest request)` |
| `POST` | `/eventos/{id:guid}/sucesso` | `IntegracoesGerenciar` | `RegistrarSucesso(Guid id, [FromBody] RegistrarSucessoIntegracaoRequest request)` |
| `POST` | `/eventos/{id:guid}/falha` | `IntegracoesGerenciar` | `RegistrarFalha(Guid id, [FromBody] RegistrarFalhaIntegracaoRequest request)` |
| `POST` | `/eventos/{id:guid}/reprocessar` | `IntegracoesReprocessar` | `Reprocessar(Guid id, [FromBody] ReprocessarEventoIntegracaoRequest request)` |

### `api/notificacoes`

<sub>Notificacoes/NotificacoesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `NotificacoesConsultar` | `Listar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? usuarioDestinoId, [FromQuery] StatusNotificacao? situacao, [FromQuery] SeveridadeNotificacao? severidade, [FromQuery] string? categoria, [FromQuery] string? moduloOrigem, [FromQuery] bool incluirExpiradas = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,)` |
| `GET` | `/nao-lidas/contagem` | `NotificacoesConsultar` | `ContarNaoLidas([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `NotificacoesGerenciar` | `Criar([FromBody] CriarNotificacaoInternaRequest request)` |
| `POST` | `/{id:guid}/marcar-lida` | `NotificacoesConsultar` | `MarcarComoLida(Guid id)` |
| `POST` | `/marcar-todas-lidas` | `NotificacoesConsultar` | `MarcarTodasComoLidas([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/{id:guid}/arquivar` | `NotificacoesConsultar` | `Arquivar(Guid id)` |

### `api/patrimonio/bens`

<sub>Patrimonio/BensPatrimoniaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PatrimonioConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] CategoriaBemPatrimonial? categoria, [FromQuery] StatusBemPatrimonial? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `PatrimonioConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `PatrimonioBensGerenciar` | `Cadastrar([FromBody] CadastrarBemRequest request)` |
| `PUT` | `/{id:guid}` | `PatrimonioBensGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarBemRequest request)` |
| `POST` | `/{id:guid}/transferir` | `PatrimonioTransferir` | `Transferir(Guid id, [FromBody] TransferirBemRequest request)` |
| `POST` | `/{id:guid}/bloquear` | `PatrimonioBensGerenciar` | `Bloquear(Guid id, [FromBody] BloquearBemRequest request)` |
| `POST` | `/{id:guid}/desbloquear` | `PatrimonioBensGerenciar` | `Desbloquear(Guid id)` |
| `POST` | `/{id:guid}/baixar` | `PatrimonioBaixar` | `Baixar(Guid id, [FromBody] BaixarBemRequest request)` |

### `api/patrimonio/depreciacao`

<sub>Patrimonio/DepreciacaoPatrimonialController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/processar` | `PatrimonioDepreciar` | `Processar([FromBody] ProcessarDepreciacaoPeriodoRequest request)` |

### `api/patrimonio/inventarios`

<sub>Patrimonio/InventariosPatrimoniaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PatrimonioConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusInventarioPatrimonial? status)` |
| `GET` | `/{id:guid}` | `PatrimonioConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `PatrimonioInventarioGerenciar` | `Abrir([FromBody] AbrirInventarioRequest request)` |
| `POST` | `/{id:guid}/contagem` | `PatrimonioInventarioGerenciar` | `RegistrarContagem(Guid id, [FromBody] RegistrarContagemRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `PatrimonioInventarioGerenciar` | `Encerrar(Guid id)` |

### `api/pdv/caixas`

<sub>Pdv/CaixasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PdvConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusCaixa? status, [FromQuery] Guid? operadorId)` |
| `GET` | `/{id:guid}` | `PdvConsultar` | `Obter(Guid id)` |
| `POST` | `/abrir` | `PdvCaixaGerenciar` | `Abrir([FromBody] AbrirCaixaRequest request)` |
| `POST` | `/{id:guid}/suprimento` | `PdvCaixaGerenciar` | `Suprimento(Guid id, [FromBody] MovimentoCaixaRequest request)` |
| `POST` | `/{id:guid}/sangria` | `PdvCaixaGerenciar` | `Sangria(Guid id, [FromBody] MovimentoCaixaRequest request)` |
| `POST` | `/{id:guid}/fechar` | `PdvCaixaGerenciar` | `Fechar(Guid id, [FromBody] FecharCaixaRequest request)` |

### `api/pdv/vendas`

<sub>Pdv/VendasPdvController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PdvConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? caixaId, [FromQuery] StatusVendaPdv? status)` |
| `GET` | `/{id:guid}` | `PdvConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `PdvVender` | `Registrar([FromBody] RegistrarVendaPdvRequest request)` |

### `api/pessoas/classificacoes`

<sub>Pessoas/ClassificacoesPessoaController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PessoasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] string? termo)` |
| `POST` | `/` | `ClassificacoesPessoaGerenciar` | `Criar([FromBody] CriarClassificacaoPessoaRequest request)` |
| `PUT` | `/{id:guid}` | `ClassificacoesPessoaGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarClassificacaoPessoaRequest request)` |
| `POST` | `/{id:guid}/inativar` | `ClassificacoesPessoaGerenciar` | `Inativar(Guid id, [FromBody] InativarClassificacaoPessoaRequest request)` |

### `api/clientes`

<sub>Pessoas/ClientesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ClientesConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `ClientesGerenciar` | `Criar([FromBody] CriarClienteRequest request)` |
| `PUT` | `/{id:guid}` | `ClientesGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarClienteRequest request)` |
| `POST` | `/{id:guid}/bloquear-credito` | `ClientesGerenciar` | `BloquearCredito(Guid id, [FromBody] AlterarBloqueioCreditoRequest request)` |
| `PUT` | `/{id:guid}/configuracao-comercial` | `ClientesGerenciar` | `ConfigurarComercial(Guid id, [FromBody] ConfigurarComercialClienteRequest request)` |
| `POST` | `/{id:guid}/desbloquear-credito` | `ClientesGerenciar` | `DesbloquearCredito(Guid id, [FromBody] AlterarBloqueioCreditoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `ClientesGerenciar` | `Inativar(Guid id, [FromBody] InativarPessoaRequest request)` |

### `api/fornecedores`

<sub>Pessoas/FornecedoresController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `FornecedoresConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `FornecedoresGerenciar` | `Criar([FromBody] CriarFornecedorRequest request)` |
| `PUT` | `/{id:guid}` | `FornecedoresGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarFornecedorRequest request)` |
| `PUT` | `/{id:guid}/configuracao-compra` | `FornecedoresGerenciar` | `ConfigurarCompra(Guid id, [FromBody] ConfigurarCompraFornecedorRequest request)` |
| `POST` | `/{id:guid}/homologar` | `FornecedoresGerenciar` | `Homologar(Guid id)` |
| `POST` | `/{id:guid}/revogar-homologacao` | `FornecedoresGerenciar` | `RevogarHomologacao(Guid id, [FromBody] RevogarHomologacaoFornecedorRequest request)` |
| `GET` | `/{id:guid}/situacao-compra` | `FornecedoresConsultar` | `SituacaoCompra(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `FornecedoresGerenciar` | `Inativar(Guid id, [FromBody] InativarPessoaRequest request)` |

### `api/pessoas`

<sub>Pessoas/PessoasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PessoasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `PessoasGerenciar` | `Criar([FromBody] CriarPessoaRequest request)` |
| `PUT` | `/{id:guid}` | `PessoasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarPessoaRequest request)` |
| `PATCH` | `/{id:guid}/dados-fiscais` | `PessoasDadosFiscaisGerenciar` | `AtualizarDadosFiscais(Guid id, [FromBody] AtualizarDadosFiscaisPessoaRequest request)` |
| `POST` | `/{id:guid}/bloquear` | `PessoasBloquear` | `Bloquear(Guid id, [FromBody] BloquearPessoaRequest request)` |
| `POST` | `/{id:guid}/desbloquear` | `PessoasBloquear` | `Desbloquear(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `PessoasGerenciar` | `Inativar(Guid id, [FromBody] InativarPessoaRequest request)` |
| `GET` | `/{id:guid}/enderecos` | `PessoasConsultar` | `ListarEnderecos(Guid id)` |
| `POST` | `/{id:guid}/enderecos` | `PessoasGerenciar` | `AdicionarEndereco(Guid id, [FromBody] AdicionarEnderecoPessoaRequest request)` |
| `PUT` | `/{id:guid}/enderecos/{enderecoId:guid}` | `PessoasGerenciar` | `AtualizarEndereco(Guid id, Guid enderecoId, [FromBody] AtualizarEnderecoPessoaRequest request)` |
| `POST` | `/{id:guid}/enderecos/{enderecoId:guid}/principal` | `PessoasGerenciar` | `DefinirEnderecoPrincipal(Guid id, Guid enderecoId)` |
| `DELETE` | `/{id:guid}/enderecos/{enderecoId:guid}` | `PessoasGerenciar` | `RemoverEndereco(Guid id, Guid enderecoId)` |
| `PATCH` | `/{id:guid}/enderecos/{enderecoId:guid}/municipio` | `PessoasDadosFiscaisGerenciar` | `VincularMunicipioEndereco(Guid id, Guid enderecoId, [FromBody] VincularMunicipioEnderecoPessoaRequest request)` |
| `POST` | `/enderecos/backfill-municipios` | `PessoasDadosFiscaisGerenciar` | `BackfillMunicipiosEnderecos([FromBody] BackfillMunicipiosEnderecosPessoaRequest request)` |
| `GET` | `/{id:guid}/contatos` | `PessoasConsultar` | `ListarContatos(Guid id)` |
| `POST` | `/{id:guid}/contatos` | `PessoasGerenciar` | `AdicionarContato(Guid id, [FromBody] AdicionarContatoPessoaRequest request)` |
| `PUT` | `/{id:guid}/contatos/{contatoId:guid}` | `PessoasGerenciar` | `AtualizarContato(Guid id, Guid contatoId, [FromBody] AtualizarContatoPessoaRequest request)` |
| `POST` | `/{id:guid}/contatos/{contatoId:guid}/principal` | `PessoasGerenciar` | `DefinirContatoPrincipal(Guid id, Guid contatoId)` |
| `DELETE` | `/{id:guid}/contatos/{contatoId:guid}` | `PessoasGerenciar` | `RemoverContato(Guid id, Guid contatoId)` |

### `api/transportadoras`

<sub>Pessoas/TransportadorasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `TransportadorasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `TransportadorasGerenciar` | `Criar([FromBody] CriarTransportadoraRequest request)` |
| `PUT` | `/{id:guid}` | `TransportadorasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarTransportadoraRequest request)` |
| `POST` | `/{id:guid}/inativar` | `TransportadorasGerenciar` | `Inativar(Guid id, [FromBody] InativarPessoaRequest request)` |

### `api/portaria`

<sub>Portaria/PortariaController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/pre-autorizacoes` | `PortariaConsultar` | `ListarPreAutorizacoes([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusPreAutorizacao? status, [FromQuery] string? termo)` |
| `GET` | `/pre-autorizacoes/{id:guid}` | `PortariaConsultar` | `ObterPreAutorizacao(Guid id)` |
| `POST` | `/pre-autorizacoes` | `PortariaPreAutorizar` | `CriarPreAutorizacao([FromBody] CriarPreAutorizacaoRequest request)` |
| `POST` | `/pre-autorizacoes/{id:guid}/cancelar` | `PortariaPreAutorizar` | `CancelarPreAutorizacao(Guid id, [FromBody] CancelarPreAutorizacaoRequest request)` |
| `GET` | `/registros` | `PortariaConsultar` | `ListarRegistros([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusRegistroAcesso? status, [FromQuery] string? termo)` |
| `GET` | `/registros/{id:guid}` | `PortariaConsultar` | `ObterRegistro(Guid id)` |
| `POST` | `/registros/entrada` | `PortariaOperar` | `RegistrarEntrada([FromBody] RegistrarEntradaRequest request)` |
| `POST` | `/registros/{id:guid}/validar-documento` | `PortariaOperar` | `ValidarDocumento(Guid id, [FromBody] ValidarDocumentoRequest request)` |
| `POST` | `/registros/{id:guid}/saida` | `PortariaOperar` | `RegistrarSaida(Guid id, [FromBody] RegistrarSaidaRequest request)` |
| `POST` | `/registros/{id:guid}/cancelar` | `PortariaOperar` | `CancelarRegistro(Guid id, [FromBody] CancelarRegistroAcessoRequest request)` |
| `GET` | `/ocorrencias` | `PortariaConsultar` | `ListarOcorrencias([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? registroAcessoId, [FromQuery] StatusOcorrenciaAcesso? status)` |
| `POST` | `/ocorrencias` | `PortariaOperar` | `RegistrarOcorrencia([FromBody] RegistrarOcorrenciaAcessoRequest request)` |
| `POST` | `/ocorrencias/{id:guid}/resolver` | `PortariaOperar` | `ResolverOcorrencia(Guid id, [FromBody] ResolverOcorrenciaAcessoRequest request)` |

### `api/producao/fichas-tecnicas`

<sub>Producao/FichasTecnicasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProducaoConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] StatusFichaTecnica? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ProducaoConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ProducaoFichaTecnicaGerenciar` | `Criar([FromBody] CriarFichaTecnicaRequest request)` |
| `POST` | `/{id:guid}/componentes` | `ProducaoFichaTecnicaGerenciar` | `AdicionarComponente(Guid id, [FromBody] AdicionarComponenteFichaTecnicaRequest request)` |
| `POST` | `/{id:guid}/ativar` | `ProducaoFichaTecnicaGerenciar` | `Ativar(Guid id)` |
| `POST` | `/{id:guid}/inativar` | `ProducaoFichaTecnicaGerenciar` | `Inativar(Guid id)` |

### `api/producao/ordens`

<sub>Producao/OrdensProducaoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProducaoConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? produtoId, [FromQuery] StatusOrdemProducao? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ProducaoConsultar` | `Obter(Guid id)` |
| `GET` | `/{id:guid}/necessidade` | `ProducaoConsultar` | `Necessidade(Guid id)` |
| `POST` | `/` | `ProducaoOrdensGerenciar` | `Criar([FromBody] CriarOrdemProducaoRequest request)` |
| `POST` | `/{id:guid}/liberar` | `ProducaoOrdensLiberar` | `Liberar(Guid id)` |
| `POST` | `/{id:guid}/apontamentos` | `ProducaoOrdensApontar` | `Apontar(Guid id, [FromBody] RegistrarApontamentoOrdemProducaoRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `ProducaoOrdensEncerrar` | `Encerrar(Guid id, [FromBody] EncerrarOrdemProducaoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `ProducaoOrdensCancelar` | `Cancelar(Guid id, [FromBody] CancelarOrdemProducaoRequest request)` |

### `api/produtos/categorias`

<sub>Produtos/CategoriasProdutoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProdutosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `CategoriasProdutoGerenciar` | `Criar([FromBody] CriarCategoriaProdutoRequest request)` |
| `PUT` | `/{id:guid}` | `CategoriasProdutoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarCategoriaProdutoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `CategoriasProdutoGerenciar` | `Inativar(Guid id, [FromBody] InativarCategoriaProdutoRequest request)` |

### `api/produtos/marcas`

<sub>Produtos/MarcasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProdutosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `MarcasGerenciar` | `Criar([FromBody] CriarMarcaRequest request)` |
| `PUT` | `/{id:guid}` | `MarcasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarMarcaRequest request)` |
| `POST` | `/{id:guid}/inativar` | `MarcasGerenciar` | `Inativar(Guid id, [FromBody] InativarMarcaRequest request)` |

### `api/produtos`

<sub>Produtos/ProdutosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProdutosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ProdutosConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ProdutosGerenciar` | `Criar([FromBody] CriarProdutoRequest request)` |
| `PUT` | `/{id:guid}` | `ProdutosGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarProdutoRequest request)` |
| `PATCH` | `/{id:guid}/preco-custo` | `ProdutosGerenciar` | `AtualizarPrecoCusto(Guid id, [FromBody] AtualizarPrecoCustoProdutoRequest request)` |
| `PATCH` | `/{id:guid}/dados-fiscais` | `ProdutosDadosFiscaisGerenciar` | `AtualizarDadosFiscais(Guid id, [FromBody] AtualizarDadosFiscaisProdutoRequest request)` |
| `POST` | `/{id:guid}/codigos-barras` | `ProdutosGerenciar` | `AdicionarCodigoBarras(Guid id, [FromBody] AdicionarCodigoBarrasProdutoRequest request)` |
| `POST` | `/{id:guid}/fornecedores` | `ProdutosGerenciar` | `VincularFornecedor(Guid id, [FromBody] VincularProdutoFornecedorRequest request)` |
| `POST` | `/{id:guid}/inativar` | `ProdutosInativar` | `Inativar(Guid id, [FromBody] InativarProdutoRequest request)` |

### `api/produtos/unidades-medida`

<sub>Produtos/UnidadesMedidaController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ProdutosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo)` |
| `POST` | `/` | `UnidadesMedidaGerenciar` | `Criar([FromBody] CriarUnidadeMedidaRequest request)` |
| `PUT` | `/{id:guid}` | `UnidadesMedidaGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarUnidadeMedidaRequest request)` |
| `POST` | `/{id:guid}/inativar` | `UnidadesMedidaGerenciar` | `Inativar(Guid id, [FromBody] InativarUnidadeMedidaRequest request)` |

### `api/qualidade/inspecoes`

<sub>Qualidade/InspecoesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `QualidadeConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] OrigemInspecao? origem, [FromQuery] StatusInspecao? status, [FromQuery] Guid? produtoId, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `QualidadeConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `QualidadeInspecionar` | `Criar([FromBody] CriarInspecaoRequest request)` |
| `POST` | `/{id:guid}/criterios` | `QualidadeInspecionar` | `AdicionarCriterio(Guid id, [FromBody] AdicionarCriterioRequest request)` |
| `POST` | `/{id:guid}/resultados` | `QualidadeInspecionar` | `RegistrarResultado(Guid id, [FromBody] RegistrarResultadoCriterioRequest request)` |
| `POST` | `/{id:guid}/aprovar` | `QualidadeInspecionar` | `Aprovar(Guid id)` |
| `POST` | `/{id:guid}/reprovar` | `QualidadeInspecionar` | `Reprovar(Guid id, [FromBody] ReprovarInspecaoRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `QualidadeInspecionar` | `Encerrar(Guid id, [FromBody] EncerrarInspecaoRequest request)` |

### `api/qualidade/nao-conformidades`

<sub>Qualidade/NaoConformidadesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `QualidadeConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? inspecaoId, [FromQuery] StatusNaoConformidade? status)` |
| `GET` | `/{id:guid}` | `QualidadeConsultar` | `Obter(Guid id)` |
| `POST` | `/{id:guid}/acoes` | `QualidadeNaoConformidadeGerenciar` | `AdicionarAcao(Guid id, [FromBody] AdicionarAcaoCorretivaRequest request)` |
| `POST` | `/{id:guid}/acoes/{acaoId:guid}/iniciar` | `QualidadeNaoConformidadeGerenciar` | `IniciarAcao(Guid id, Guid acaoId)` |
| `POST` | `/{id:guid}/acoes/{acaoId:guid}/concluir` | `QualidadeNaoConformidadeGerenciar` | `ConcluirAcao(Guid id, Guid acaoId)` |
| `POST` | `/{id:guid}/acoes/{acaoId:guid}/cancelar` | `QualidadeNaoConformidadeGerenciar` | `CancelarAcao(Guid id, Guid acaoId, [FromBody] CancelarAcaoCorretivaRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `QualidadeNaoConformidadeGerenciar` | `Encerrar(Guid id)` |

### `api/relatorios/gerenciais`

<sub>Relatorios/RelatoriosGerenciaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/vendas` | `RelatoriosVendasConsultar` | `Vendas([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/compras` | `RelatoriosComprasConsultar` | `Compras([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/financeiro` | `RelatoriosFinanceiroConsultar` | `Financeiro([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/estoque` | `RelatoriosEstoqueConsultar` | `Estoque([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/fiscal` | `RelatoriosFiscalConsultar` | `Fiscal([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/producao` | `RelatoriosProducaoConsultar` | `Producao([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/dashboard` | `RelatoriosDashboardConsultar` | `Dashboard([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |
| `GET` | `/exportar` | `RelatoriosExportar` | `Exportar([FromQuery] string indicador, [FromQuery] FormatoExportacao formato, [FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] DateOnly? dataInicial, [FromQuery] DateOnly? dataFinal)` |

### `api/relatorios/operacional`

<sub>Relatorios/RelatoriosOperacionaisController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/geral` | `RelatoriosOperacionaisConsultar` | `ObterGeral([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] DateTimeOffset? inicio, [FromQuery] DateTimeOffset? fim)` |

### `api/rh`

<sub>Rh/AusenciasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/ferias` | `RhConsultar` | `ListarFerias([FromQuery] Guid empresaId, [FromQuery] Guid? colaboradorId, [FromQuery] StatusFerias? status)` |
| `POST` | `/ferias` | `RhGerenciar` | `SolicitarFerias([FromBody] SolicitarFeriasRequest request)` |
| `POST` | `/ferias/{id:guid}/aprovar` | `RhGerenciar` | `AprovarFerias(Guid id)` |
| `POST` | `/ferias/{id:guid}/rejeitar` | `RhGerenciar` | `RejeitarFerias(Guid id, [FromBody] RejeitarFeriasRequest request)` |
| `POST` | `/ferias/{id:guid}/iniciar` | `RhGerenciar` | `IniciarFerias(Guid id)` |
| `POST` | `/ferias/{id:guid}/concluir` | `RhGerenciar` | `ConcluirFerias(Guid id)` |
| `POST` | `/ferias/{id:guid}/cancelar` | `RhGerenciar` | `CancelarFerias(Guid id, [FromBody] CancelarFeriasRequest request)` |
| `GET` | `/afastamentos` | `RhConsultar` | `ListarAfastamentos([FromQuery] Guid empresaId, [FromQuery] Guid? colaboradorId, [FromQuery] StatusAfastamento? status)` |
| `POST` | `/afastamentos` | `RhGerenciar` | `RegistrarAfastamento([FromBody] RegistrarAfastamentoRequest request)` |
| `POST` | `/afastamentos/{id:guid}/encerrar` | `RhGerenciar` | `EncerrarAfastamento(Guid id, [FromBody] EncerrarAfastamentoRequest request)` |

### `api/rh/beneficios`

<sub>Rh/BeneficiosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `RhConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `RhGerenciar` | `Criar([FromBody] CriarBeneficioRequest request)` |
| `PUT` | `/{id:guid}` | `RhGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarBeneficioRequest request)` |
| `GET` | `/concessoes` | `RhConsultar` | `ListarConcessoes([FromQuery] Guid empresaId, [FromQuery] Guid? colaboradorId, [FromQuery] StatusColaboradorBeneficio? status)` |
| `POST` | `/concessoes` | `RhGerenciar` | `Conceder([FromBody] ConcederBeneficioRequest request)` |
| `POST` | `/concessoes/{id:guid}/encerrar` | `RhGerenciar` | `EncerrarConcessao(Guid id, [FromBody] EncerrarConcessaoBeneficioRequest request)` |

### `api/rh/colaboradores`

<sub>Rh/ColaboradoresController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `RhConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] StatusColaborador? status, [FromQuery] Guid? setorId, [FromQuery] Guid? cargoId, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `RhConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `RhGerenciar` | `Admitir([FromBody] AdmitirColaboradorRequest request)` |
| `PUT` | `/{id:guid}` | `RhGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarColaboradorRequest request)` |
| `POST` | `/{id:guid}/desligar` | `RhGerenciar` | `Desligar(Guid id, [FromBody] DesligarColaboradorRequest request)` |

### `api/rh/eventos`

<sub>Rh/EventosRhController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `RhConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? colaboradorId, [FromQuery] int? competencia, [FromQuery] TipoEventoRh? tipo)` |
| `POST` | `/` | `RhEventosGerenciar` | `Registrar([FromBody] RegistrarEventoRhRequest request)` |

### `api/rh/jornadas`

<sub>Rh/JornadasController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `RhConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `POST` | `/` | `RhGerenciar` | `Criar([FromBody] CriarJornadaRequest request)` |
| `PUT` | `/{id:guid}` | `RhGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarJornadaRequest request)` |

### `api/rh/ponto`

<sub>Rh/PontoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `RhConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? colaboradorId, [FromQuery] DateTimeOffset? de, [FromQuery] DateTimeOffset? ate)` |
| `POST` | `/` | `RhPontoRegistrar` | `Registrar([FromBody] RegistrarPontoRequest request)` |

### `api/auth`

<sub>Security/AuthController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/login` | **anônimo** | `Login([FromBody] LoginRequest request)` |
| `POST` | `/validar-empresa` | **anônimo** | `ValidarEmpresa([FromBody] ValidarEmpresaRequest request)` |
| `GET` | `/me` | _(autenticado)_ | `Me()` |
| `POST` | `/refresh` | **anônimo** | `Refresh([FromBody] RefreshTokenRequest request)` |
| `POST` | `/logout` | _(autenticado)_ | `Logout([FromBody] LogoutRequest request)` |
| `POST` | `/bootstrap-admin` | **anônimo** | `CriarAdministradorInicial([FromBody] CriarUsuarioRequest request)` |

### `api/seguranca/cargos-acesso`

<sub>Security/CargosAcessoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PermissoesConsultar` | `Listar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] EscopoAcesso? escopo, [FromQuery] bool? ativo)` |
| `GET` | `/{id:guid}` | `PermissoesConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `PermissoesGerenciar` | `Criar([FromBody] CriarCargoAcessoRequest request)` |
| `PUT` | `/{id:guid}` | `PermissoesGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarCargoAcessoRequest request)` |
| `POST` | `/{id:guid}/grupos` | `PermissoesGerenciar` | `VincularGrupo(Guid id, [FromBody] VincularGrupoCargoAcessoRequest request)` |
| `POST` | `/{id:guid}/grupos/{grupoAcessoId:guid}/remover` | `PermissoesGerenciar` | `RemoverGrupo(Guid id, Guid grupoAcessoId, [FromBody] RemoverGrupoCargoAcessoRequest request)` |

### `api/seguranca/grupos-acesso`

<sub>Security/GruposAcessoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `GruposAcessoConsultar` | `Listar()` |
| `GET` | `/{id:guid}` | `GruposAcessoConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `GruposAcessoGerenciar` | `Criar([FromBody] CriarGrupoAcessoRequest request)` |
| `PUT` | `/{id:guid}` | `GruposAcessoGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarGrupoAcessoRequest request)` |
| `POST` | `/{id:guid}/inativar` | `GruposAcessoGerenciar` | `Inativar(Guid id, [FromBody] InativarGrupoAcessoRequest request)` |
| `POST` | `/{id:guid}/permissoes` | `GruposAcessoGerenciar` | `AdicionarPermissao(Guid id, [FromBody] AdicionarPermissaoGrupoRequest request)` |
| `POST` | `/{id:guid}/permissoes/{permissaoId:guid}/remover` | `GruposAcessoGerenciar` | `RemoverPermissao(Guid id, Guid permissaoId, [FromBody] RemoverPermissaoGrupoRequest request)` |

### `api/seguranca/grupos-acesso`

<sub>Security/GruposAcessoMatrizController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/{id:guid}/matriz-permissoes` | `GruposAcessoConsultar` | `ObterMatriz(Guid id)` |
| `PUT` | `/{id:guid}/matriz-permissoes` | `GruposAcessoGerenciar` | `SalvarMatriz(Guid id, [FromBody] SalvarMatrizPermissoesGrupoRequest request)` |

### `api/parametros`

<sub>Security/ParametrosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ParametrosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |
| `PUT` | `/` | `ParametrosGerenciar` | `Definir([FromBody] DefinirParametroRequest request)` |

### `api/seguranca/permissoes`

<sub>Security/PermissoesCatalogoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/catalogo` | `PermissoesConsultar` | `ObterCatalogo()` |

### `api/seguranca/permissoes`

<sub>Security/PermissoesController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `PermissoesConsultar` | `Listar()` |

### `api/seguranca/usuarios`

<sub>Security/UsuariosCargosAcessoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `POST` | `/{id:guid}/cargos-empresa` | `PermissoesGerenciar` | `AtribuirCargoEmpresa(Guid id, [FromBody] AtribuirCargoEmpresaUsuarioRequest request)` |
| `POST` | `/{id:guid}/cargos-filial` | `PermissoesGerenciar` | `AtribuirCargoFilial(Guid id, [FromBody] AtribuirCargoFilialUsuarioRequest request)` |
| `GET` | `/{id:guid}/permissoes-efetivas` | `PermissoesConsultar` | `ObterPermissoesEfetivas(Guid id, [FromQuery] Guid empresaId, [FromQuery] Guid? filialId)` |

### `api/seguranca/usuarios`

<sub>Security/UsuariosController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `UsuariosConsultar` | `Listar([FromQuery] Guid? empresaId, [FromQuery] Guid? filialId, [FromQuery] string? termo, [FromQuery] bool? ativo)` |
| `GET` | `/{id:guid}` | `UsuariosConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `UsuariosGerenciar` | `Criar([FromBody] CriarUsuarioRequest request)` |
| `POST` | `/{id:guid}/inativar` | `UsuariosInativar` | `Inativar(Guid id, [FromBody] InativarUsuarioRequest request)` |
| `POST` | `/{id:guid}/reativar` | `UsuariosGerenciar` | `Reativar(Guid id, [FromBody] ReativarUsuarioRequest request)` |
| `POST` | `/{id:guid}/reset-senha` | `UsuariosResetarSenha` | `ResetarSenha(Guid id, [FromBody] ResetarSenhaUsuarioRequest request)` |
| `POST` | `/{id:guid}/grupos-acesso` | `GruposAcessoGerenciar` | `AtribuirGrupo(Guid id, [FromBody] AtribuirGrupoUsuarioRequest request)` |
| `POST` | `/{id:guid}/grupos-acesso/{grupoAcessoId:guid}/remover` | `GruposAcessoGerenciar` | `RemoverGrupo(Guid id, Guid grupoAcessoId, [FromBody] RemoverGrupoUsuarioRequest request)` |

### `api/servicos/ordens`

<sub>Servicos/OrdensServicoController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `ServicosConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? clienteId, [FromQuery] StatusOrdemServico? status, [FromQuery] Guid? tecnicoResponsavelId, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `ServicosConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `ServicosGerenciar` | `Criar([FromBody] CriarOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/triar` | `ServicosGerenciar` | `Triar(Guid id, [FromBody] TriarOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/planejar` | `ServicosGerenciar` | `Planejar(Guid id, [FromBody] PlanejarOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/iniciar-execucao` | `ServicosGerenciar` | `IniciarExecucao(Guid id)` |
| `POST` | `/{id:guid}/itens` | `ServicosApontar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/encerrar` | `ServicosGerenciar` | `Encerrar(Guid id, [FromBody] EncerrarOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `ServicosGerenciar` | `Cancelar(Guid id, [FromBody] CancelarOrdemServicoRequest request)` |
| `POST` | `/{id:guid}/faturar` | `ServicosFaturar` | `Faturar(Guid id, [FromBody] FaturarOrdemServicoRequest request)` |

### `api/vendas/pedidos`

<sub>Vendas/PedidosVendaController</sub>

| Método | Caminho | Permissão | Assinatura |
| --- | --- | --- | --- |
| `GET` | `/` | `VendasConsultar` | `Listar([FromQuery] Guid empresaId, [FromQuery] Guid? filialId, [FromQuery] Guid? clienteId, [FromQuery] StatusPedidoVenda? status, [FromQuery] string? termo)` |
| `GET` | `/{id:guid}` | `VendasConsultar` | `Obter(Guid id)` |
| `POST` | `/` | `VendasGerenciar` | `Criar([FromBody] CriarPedidoVendaRequest request)` |
| `PUT` | `/{id:guid}` | `VendasGerenciar` | `Atualizar(Guid id, [FromBody] AtualizarPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/itens` | `VendasGerenciar` | `AdicionarItem(Guid id, [FromBody] AdicionarItemPedidoVendaRequest request)` |
| `PUT` | `/{id:guid}/itens/{itemId:guid}` | `VendasGerenciar` | `AtualizarItem(Guid id, Guid itemId, [FromBody] AtualizarItemPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/itens/{itemId:guid}/remover` | `VendasGerenciar` | `RemoverItem(Guid id, Guid itemId, [FromBody] RemoverItemPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/enviar-para-aprovacao` | `VendasGerenciar` | `EnviarParaAprovacao(Guid id)` |
| `POST` | `/{id:guid}/aprovar` | `VendasAprovar` | `Aprovar(Guid id, [FromBody] AprovarPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/cancelar` | `VendasCancelar` | `Cancelar(Guid id, [FromBody] CancelarPedidoVendaRequest request)` |
| `POST` | `/{id:guid}/faturar` | `VendasFaturar` | `Faturar(Guid id, [FromBody] FaturarPedidoVendaRequest request)` |

## 10. Catálogo de payloads

Todos os `record` de contrato da camada Application, agrupados por pasta. **Lembre: no JSON os nomes
chegam em `camelCase`.** `?` no tipo = anulável.


### `Abstractions/Anexos`

```csharp
ArquivoAnexoConteudo(string CaminhoRelativo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoAnexoSalvarRequest(Guid EmpresaId, Guid? FilialId, string ModuloOrigem, string EntidadeVinculada, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoAnexoSalvo(string CaminhoRelativo, string NomeArquivo, long TamanhoBytes)

```
### `Abstractions/Atividades`

```csharp
AtividadeFiltro( Guid? EmpresaId, Guid? FilialId, Guid? ResponsavelUsuarioId, StatusAtividade? Status, PrioridadeAtividade? Prioridade, DateTimeOffset? PrazoInicial, DateTimeOffset? PrazoFinal, string? EntidadeOrigem, Guid? EntidadeOrigemId, string? Termo, int Page, int PageSize)
AtividadeResumoProjection( Guid Id, Guid EmpresaId, Guid? FilialId, string Titulo, string? Descricao, StatusAtividade Status, PrioridadeAtividade Prioridade, Guid? ResponsavelUsuarioId, Guid CriadoPorUsuarioId, DateTimeOffset? PrazoEm, DateTimeOffset? ConcluidaEm, string? EntidadeOrigem, Guid? EntidadeOrigemId, DateTimeOffset CreatedAt)

```
### `Abstractions/Auditoria`

```csharp
AuditoriaConsultaFiltro( Guid? EmpresaId, Guid? FilialId, Guid? UsuarioId, string? Modulo, string? Entidade, Guid? EntidadeId, AuditoriaAcao? Acao, DateTimeOffset? DataInicial, DateTimeOffset? DataFinal, string? Termo, int Page, int PageSize)
AuditoriaEventoResumo( Guid Id, string Modulo, string Entidade, Guid? EntidadeId, AuditoriaAcao Acao, string Descricao, Guid? UsuarioId, Guid? EmpresaId, Guid? FilialId, DateTimeOffset CriadoEm)
AuditoriaRegistro( string Modulo, string Entidade, Guid? EntidadeId, AuditoriaAcao Acao, string Descricao, string? PayloadJson = null)

```
### `Abstractions/Bancos`

```csharp
ArquivoCnabConteudo(string CaminhoRelativo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoCnabSalvarRequest( Guid EmpresaId, Guid? FilialId, Guid ContaBancariaId, TipoArquivoCnab Tipo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoCnabSalvo(string CaminhoRelativo, string NomeArquivo, string ContentType, long TamanhoBytes)
CnabRemessaBoletoItem( long NossoNumero, string NumeroDocumento, DateTimeOffset DataVencimento, decimal ValorTitulo, string NomeSacado, string DocumentoSacado, string LogradouroSacado, string BairroSacado, string CidadeSacado, string UfSacado, string CepSacado)
CnabRemessaContexto( string CodigoBanco, string NomeEmpresa, string CnpjEmpresa, string Agencia, string? AgenciaDv, string Conta, string? ContaDv, string CodigoConvenio, string CodigoCedente, string CodigoCarteira, int SequencialRemessa, DateTimeOffset DataGeracao)
CnabRetornoOcorrenciaItem( long NossoNumero, string CodigoOcorrencia, string DescricaoOcorrencia, DateTimeOffset DataOcorrencia, decimal ValorPago, decimal ValorJuros, decimal ValorDesconto, decimal ValorAbatimento, bool Liquidacao)
CnabRetornoParseado( int QuantidadeRegistros, IReadOnlyCollection<CnabRetornoOcorrenciaItem> Ocorrencias)

```
### `Abstractions/Comercial`

```csharp
TabelaPrecoResumoProjection(Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, DateOnly DataInicioVigencia, DateOnly? DataFimVigencia, bool Padrao, StatusTabelaPreco Status)

```
### `Abstractions/Compras`

```csharp
ArquivoConferenciaFiscalConteudo(string CaminhoRelativo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoConferenciaFiscalSalvarRequest( Guid EmpresaId, Guid? FilialId, Guid RecebimentoCompraId, TipoArquivoConferenciaFiscal Tipo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoConferenciaFiscalSalvo(string CaminhoRelativo, string NomeArquivo, string ContentType, long TamanhoBytes)

```
### `Abstractions/Deploy`

```csharp
MigracoesInfoProjection(int TotalConhecidas, int TotalAplicadas, IReadOnlyList<string> Pendentes, IReadOnlyList<string> AplicadasDesconhecidas)

```
### `Abstractions/Estoque/Avancado`

```csharp
InventarioEstoqueResumoProjection(Guid Id, Guid EmpresaId, Guid? FilialId, Guid LocalEstoqueId, string Descricao, DateOnly DataReferencia, StatusInventarioEstoque Status)

```
### `Abstractions/Faturamento`

```csharp
FaturamentoListagemFiltro( Guid EmpresaId, Guid? FilialId, Guid? PedidoVendaId, StatusFaturamento? Etapa, int Page = 1, int PageSize = 20)

```
### `Abstractions/Financeiro/Avancado`

```csharp
ContaFinanceiraFiltro( TipoContaFinanceira Tipo, Guid? EmpresaId, Guid? FilialId, Guid? ParticipanteId, StatusContaFinanceira? Status, DateOnly? DataInicial, DateOnly? DataFinal, int Page, int PageSize)
ContaFinanceiraResumoProjection( Guid Id, Guid EmpresaId, Guid? FilialId, TipoContaFinanceira Tipo, Guid ParticipanteId, string Descricao, decimal ValorOriginal, decimal Saldo, DateOnly DataVencimento, StatusContaFinanceira Status)
FluxoCaixaProjection( decimal EntradasPrevistas, decimal SaidasPrevistas, decimal EntradasRealizadas, decimal SaidasRealizadas)

```
### `Abstractions/Fiscal`

```csharp
ArquivoFiscalConteudo( string CaminhoRelativo, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoFiscalSalvarRequest( Guid EmpresaId, Guid? FilialId, Guid NotaFiscalId, TipoDocumentoAuxiliarFiscal Tipo, FormatoDocumentoAuxiliarFiscal Formato, string NomeArquivo, string ContentType, byte[] Conteudo)
ArquivoFiscalSalvo( string CaminhoRelativo, string NomeArquivo, string ContentType, long TamanhoBytes)
AssinarXmlFiscalRequest( TipoDocumentoFiscal TipoDocumento, string Xml, string CertificateThumbprint, string? ReferenceAttributeName = null, string? SignatureParentXPath = null)
CestFiltro( string? Termo, string? Codigo, string? Segmento, bool? Ativo, int Page, int PageSize)
CfopFiltro( string? Termo, string? Codigo, TipoCfop? Tipo, AmbitoCfop? Ambito, bool? IndicadorDevolucao, bool? IndicadorTransferencia, bool? IndicadorIndustrializacao, bool? GeraFinanceiro, bool? MovimentaEstoque, bool? Ativo, int Page, int PageSize)
CodigoServicoMunicipalFiltro( string? MunicipioCodigoIbge, string? CodigoLc116, string? Termo, bool? Ativo, int Page, int PageSize)
CsosnFiltro( string? Termo, string? Codigo, bool? Ativo, int Page, int PageSize)
CstIcmsFiltro( string? Termo, string? Codigo, bool? Ativo, int Page, int PageSize)
CstIpiFiltro( string? Termo, string? Codigo, IndicadorOperacaoCst? IndicadorOperacao, bool? Ativo, int Page, int PageSize)
CstPisCofinsFiltro( string? Termo, string? Codigo, IndicadorOperacaoCst? IndicadorOperacao, bool? GeraCredito, bool? Ativo, int Page, int PageSize)
DanfeGerado( FormatoDocumentoAuxiliarFiscal Formato, string NomeArquivo, string ContentType, byte[] Conteudo, IReadOnlyCollection<string> Alertas)
FiscalSchemaValidationResult(bool IsValid, IReadOnlyCollection<string> Errors)
FiscalXmlProfile( TipoDocumentoFiscal TipoDocumento, string Namespace, string Versao, string SchemaSetName, string ReferenceAttributeName, string? SignatureParentXPath)
ModeloDocumentoFiscalFiltro( string? Termo, string? Codigo, bool? Ativo, int Page, int PageSize)
MunicipioIbgeFiltro( string? UfSigla, string? Termo, string? CodigoIbge, bool? Ativo, int Page, int PageSize)
NaturezaOperacaoFiltro( Guid EmpresaId, string? Termo, string? Codigo, TipoDocumentoFiscal? TipoDocumento, TipoOperacaoFiscal? TipoOperacao, FinalidadeNaturezaOperacao? Finalidade, bool? SomenteAtivas, int Page, int PageSize)
NcmCestFiltro( string? NcmCodigo, string? CestCodigo, bool? Ativo, int Page, int PageSize)
NcmFiltro( string? Termo, string? Codigo, DateOnly? VigenteEm, bool? Ativo, int Page, int PageSize)
NotaFiscalListagemFiltro( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal? TipoDocumento, TipoOperacaoFiscal? TipoOperacao, StatusNotaFiscal? StatusFiscal, OrigemNotaFiscal? Origem, Guid? OrigemId, Guid? PessoaId, string? Serie, string? Numero, string? ChaveAcesso, string? ProtocoloAutorizacao, DateTimeOffset? DataEmissaoInicial, DateTimeOffset? DataEmissaoFinal, DateTimeOffset? DataAutorizacaoInicial, DateTimeOffset? DataAutorizacaoFinal, DateTimeOffset? DataCancelamentoInicial, DateTimeOffset? DataCancelamentoFinal, decimal? ValorTotalMinimo, decimal? ValorTotalMaximo, bool? PossuiXmlAutorizado, bool? PossuiDanfe, bool? ContaReceberGerada, StatusPedidoVenda? StatusPedidoVenda, bool SomenteComPendenciaXmlAutorizado, bool SomenteComPendenciaDanfe, bool SomenteComPendenciaEstoque, bool SomenteComPendenciaFinanceira, int Page, int PageSize)
NotaFiscalListagemProjection( Guid Id, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, StatusNotaFiscal StatusFiscal, OrigemNotaFiscal Origem, Guid? OrigemId, Guid? PessoaId, string Serie, string Numero, string? ChaveAcesso, string? ProtocoloAutorizacao, DateTimeOffset DataEmissao, DateTimeOffset? AutorizadaEm, DateTimeOffset? CanceladaEm, decimal ValorTotal, string? CodigoRejeicao, string? MensagemRejeicao, bool PossuiXmlEnvio, bool PossuiXmlAutorizado, bool PossuiDanfe, int ItensAtivosNotaFiscal, bool PedidoVendaLocalizado, bool PedidoVendaMesmoContexto, StatusPedidoVenda? StatusPedidoVenda, int ItensPedidoVendaAtivos, int ItensPedidoVendaPendentesEstoque, bool ContaReceberGerada)
OrigemMercadoriaFiltro( string? Termo, string? Codigo, bool? Ativo, int Page, int PageSize)
PaisFiltro( string? Termo, string? CodigoBacen, bool? Ativo, int Page, int PageSize)
SefazRequest( Guid EmpresaId, Guid? FilialId, Guid NotaFiscalId, TipoDocumentoFiscal TipoDocumento, TipoAmbienteFiscal Ambiente, string UfAutorizadora, TipoServicoSefaz Servico, string XmlAssinado, string? CorrelationId = null)
SefazResponse( bool SucessoComunicacao, bool Autorizada, string? CodigoStatus, string? Motivo, string? Protocolo, string? ChaveAcesso, string? XmlRetorno, bool DeveReprocessar, string? ErroTecnico = null)
SerieFiscalFiltro( Guid EmpresaId, Guid? FilialId, Guid? ModeloDocumentoFiscalId, bool? SomenteAtivas, int Page, int PageSize)
UfFiltro( string? Termo, bool? Ativo)
UnidadeTributavelFiltro( string? Termo, string? Sigla, bool? Ativo, int Page, int PageSize)

```
### `Abstractions/Fiscal/Tributacao`

```csharp
ExcecaoFiscalFiltro( Guid EmpresaId, Guid? FilialId, string? Uf, bool? SomenteAtivas, string? Termo, int Pagina, int TamanhoPagina)
ExcecaoFiscalNcmFiltro( Guid EmpresaId, Guid? FilialId, Guid? NcmId, string? Uf, bool? SomenteAtivas, string? Termo, int Pagina, int TamanhoPagina)
RegraFiscalOperacaoFiltro( Guid EmpresaId, Guid? FilialId, TipoCfop? TipoOperacao, string? UfDestino, Guid? NcmId, Guid? CfopId, bool? SomenteAtivas, string? Termo, int Pagina, int TamanhoPagina)
ValoresItemUtilizadoResponse( decimal Quantidade, decimal ValorUnitario, decimal ValorProduto, decimal ValorFreteRateado, decimal ValorSeguroRateado, decimal ValorOutrasDespesasRateado, decimal ValorDescontoRateado, decimal BaseBruta)

```
### `Abstractions/Infraestrutura`

```csharp
InfraestruturaBackupStatusProjection( InfraestruturaHealthStatus Status, string Diretorio, bool DiretorioExiste, string? UltimoArquivo, DateTimeOffset? UltimoBackupEm, long? TamanhoBytes, string Mensagem)
InfraestruturaDependenciaProjection( string Nome, InfraestruturaHealthStatus Status, string Mensagem, long? LatenciaMs, IReadOnlyDictionary<string, string> Detalhes)
InfraestruturaRuntimeInfoProjection(string Aplicacao, string Ambiente)

```
### `Abstractions/Integracoes`

```csharp
EventoIntegracaoFiltro( Guid? EmpresaId, Guid? FilialId, Guid? IntegracaoExternaId, SituacaoEventoIntegracao? Situacao, DirecaoEventoIntegracao? Direcao, string? TipoEvento, string? CorrelationId, int Page, int PageSize)

```
### `Abstractions/Notificacoes`

```csharp
NotificacaoFiltro( Guid? EmpresaId, Guid? FilialId, Guid? UsuarioDestinoId, StatusNotificacao? Situacao, SeveridadeNotificacao? Severidade, string? Categoria, string? ModuloOrigem, bool IncluirExpiradas, DateTimeOffset Agora, int Page, int PageSize)

```
### `Abstractions/Pessoas`

```csharp
SituacaoCompraFornecedor(Guid FornecedorId, bool Ativo, bool Homologado, bool PodeReceberPedidoCompra, string? Motivo)
SituacaoPessoa(Guid PessoaId, bool Ativa, bool Bloqueada, string? MotivoBloqueio)

```
### `Abstractions/Relatorios/Exportacao`

```csharp
RelatorioExportacao(byte[] Conteudo, string ContentType, string NomeArquivo)
RelatorioTabular(string Titulo, string? Subtitulo, IReadOnlyList<string> Colunas, IReadOnlyList<IReadOnlyList<string>> Linhas)

```
### `Abstractions/Relatorios/Gerenciais`

```csharp
IndicadorQuantidadeProjection(string Nome, long Quantidade)
RelatorioComprasGerencialProjection( long TotalPedidos, long TotalItens, long TotalFornecedoresComPedido, long RecebimentosRegistrados, long PedidosComFinanceiroGerado)
RelatorioEstoqueGerencialProjection( long InventariosAbertos, long InventariosEmContagem, long InventariosConcluidos, long InventariosCancelados, long AjustesEntrada, long AjustesSaida, decimal QuantidadeEntradaAjustada, decimal QuantidadeSaidaAjustada, long BloqueiosAtivos, long BloqueiosLiberados, long MovimentosRegistrados)
RelatorioFinanceiroGerencialProjection( long ContasReceber, long ContasPagar, decimal ValorReceberOriginal, decimal ValorPagarOriginal, decimal SaldoReceberEmAberto, decimal SaldoPagarEmAberto, decimal EntradasRealizadas, decimal SaidasRealizadas, decimal SaldoProjetado, decimal SaldoRealizado)
RelatorioFiscalGerencialProjection( long NotasRegistradas, long ItensRegistrados, long EventosRegistrados, long CartasCorrecaoRegistradas, long CancelamentosRegistrados, long InutilizacoesRegistradas, long XmlsArmazenados)
RelatorioGerencialFiltro( Guid? EmpresaId, Guid? FilialId, DateOnly DataInicial, DateOnly DataFinal)
RelatorioProducaoGerencialProjection( long OrdensPlanejadas, long OrdensLiberadas, long OrdensEmProducao, long OrdensEncerradas, long OrdensCanceladas, decimal QuantidadePlanejada, decimal QuantidadeProduzida, decimal QuantidadePerdas, decimal CustoConsolidado)
RelatorioVendasGerencialProjection( long TotalPedidos, long TotalItens, long TotalClientesComPedido, long PedidosComFinanceiroGerado, long PedidosComEstoqueMovimentado)

```
### `Abstractions/Security`

```csharp
ParametroResolvido(string Chave, string Valor, TipoParametro Tipo, OrigemParametro Origem)
TokenGerado( string AccessToken, DateTimeOffset ExpiraEm, string Jti)

```
### `Abstractions/Security/Estruturado`

```csharp
PermissaoEstruturadaProjection( EscopoAcesso Escopo, Guid CargoAcessoId, Guid GrupoAcessoId, string PermissionCode, bool Permitido)

```
### `Administration`

```csharp
DefinirEnderecoFiscalRequest( string Logradouro, string Numero, string? Complemento, string Bairro, string Cidade, string Uf, string Cep, string? CodigoMunicipioIbge = null)
EnderecoFiscalResponse( string Logradouro, string Numero, string? Complemento, string Bairro, string Cidade, string Uf, string Cep, Guid? MunicipioIbgeId, bool EstaCompleto)

```
### `Administration/Cargos`

```csharp
AtualizarCargoRequest(Guid? SetorId, string Nome, string? Descricao, int NivelHierarquico)
CargoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid? SetorId, string Nome, string? Descricao, int NivelHierarquico, EntityStatus Status, DateTimeOffset CreatedAt)
CriarCargoRequest(Guid EmpresaId, Guid? FilialId, Guid? SetorId, string Nome, string? Descricao, int NivelHierarquico)
InativarCargoRequest(string Motivo)

```
### `Administration/CentrosCusto`

```csharp
AtualizarCentroCustoRequest(string Nome, string? Descricao)
CentroCustoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao, Guid? SetorId, Guid? CargoId, EntityStatus Status, DateTimeOffset CreatedAt)
CriarCentroCustoRequest(Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao)
InativarCentroCustoRequest(string Motivo)

```
### `Administration/Empresas`

```csharp
AtualizarEmpresaRequest( string RazaoSocial, string NomeFantasia, string? InscricaoEstadual, string? InscricaoMunicipal, RegimeTributario RegimeTributario, Crt? Crt, /// <summary> /// <c>null</c> = <b>mantém o valor atual</b>; só um booleano explícito altera o indicador. /// <para> /// Aqui, diferente de <see cref="CriarEmpresaRequest"/>, o default <c>false</c> era um ponto cego: num /// <c>PUT</c>, cliente que não enviasse o campo — qualquer um ainda não atualizado, e o frontend é /// repositório separado — resetaria em silêncio uma empresa marcada como contribuinte. A simulação /// seguinte passaria a derivar <c>false</c> do cadastro e a <b>silenciar o IPI inteiro</b>, sem ninguém /// ter decidido isso: exatamente o modo de falha que o indicador foi criado para eliminar, um nível acima. /// </para> /// </summary> bool? ContribuinteIpi = null)
CriarEmpresaRequest( string RazaoSocial, string NomeFantasia, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal, RegimeTributario RegimeTributario, Crt? Crt, bool ContribuinteIpi = false)
EmpresaResponse( Guid Id, string RazaoSocial, string NomeFantasia, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal, RegimeTributario RegimeTributario, Crt? Crt, bool ContribuinteIpi, EntityStatus Status, DateTimeOffset CreatedAt, EnderecoFiscalResponse? EnderecoFiscal)
InativarEmpresaRequest(string Motivo)

```
### `Administration/Filiais`

```csharp
AtualizarFilialRequest( string Nome, string? InscricaoEstadual, string? InscricaoMunicipal)
CriarFilialRequest( Guid EmpresaId, string Nome, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal)
FilialResponse( Guid Id, Guid EmpresaId, string Nome, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal, EntityStatus Status, DateTimeOffset CreatedAt, EnderecoFiscalResponse? EnderecoFiscal)
InativarFilialRequest(string Motivo)

```
### `Administration/Setores`

```csharp
AtualizarSetorRequest(string Nome, string? Descricao)
CriarSetorRequest(Guid EmpresaId, Guid? FilialId, string Nome, string? Descricao)
InativarSetorRequest(string Motivo)
SetorResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, string? Descricao, EntityStatus Status, DateTimeOffset CreatedAt)

```
### `Alimentar`

```csharp
AbrirRecallRequest(Guid EmpresaId, Guid? FilialId, Guid? ProdutoId, string Codigo, string Motivo, string? Descricao, GravidadeRecall Gravidade, DateTimeOffset? DataAbertura)
AdicionarLoteRecallRequest(Guid LoteId)
BloquearLoteRequest(string Motivo)
CancelarRecallRequest(string Motivo)
CriarLoteRequest(Guid EmpresaId, Guid? FilialId, Guid ProdutoId, string NumeroLote, LoteOrigem Origem, DateTimeOffset? DataFabricacao, DateTimeOffset DataValidade, decimal QuantidadeInicial, Guid? FornecedorId, Guid? LocalEstoqueId, string? DocumentoOrigem)
LoteResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid ProdutoId, string NumeroLote, LoteOrigem Origem, DateTimeOffset? DataFabricacao, DateTimeOffset DataValidade, decimal QuantidadeInicial, decimal QuantidadeAtual, Guid? FornecedorId, Guid? LocalEstoqueId, StatusLote StatusLote, string? MotivoBloqueio, bool Vencido)
MovimentacaoLoteResponse(Guid Id, Guid LoteId, Guid ProdutoId, TipoMovimentacaoLote Tipo, decimal Quantidade, DateTimeOffset Data, string? DocumentoOrigem, string? Observacao)
RecallLoteResponse(Guid Id, Guid RecallId, Guid LoteId, decimal QuantidadeAfetada, Guid? BloqueioEstoqueId, string? AcaoTomada)
RecallResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid? ProdutoId, string Codigo, string Motivo, string? Descricao, GravidadeRecall Gravidade, DateTimeOffset DataAbertura, DateTimeOffset? DataEncerramento, StatusRecall StatusRecall)
RegistrarMovimentacaoLoteRequest(Guid LoteId, TipoMovimentacaoLote Tipo, decimal Quantidade, DateTimeOffset? Data, string? DocumentoOrigem, string? Observacao)

```
### `Anexos`

```csharp
AnexarDocumentoRequest( Guid EmpresaId, Guid? FilialId, string ModuloOrigem, string EntidadeVinculada, Guid EntidadeVinculadaId, CategoriaAnexo Categoria, string? Descricao, string NomeArquivo, string ContentType, byte[] Conteudo)
DocumentoAnexoConteudoResult(byte[] Conteudo, string ContentType, string NomeArquivo)
DocumentoAnexoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string ModuloOrigem, string EntidadeVinculada, Guid EntidadeVinculadaId, CategoriaAnexo Categoria, string NomeArquivo, string ContentType, long TamanhoBytes, string HashSha256, string? Descricao, bool Ativo, string? MotivoInativacao, DateTimeOffset CriadoEm)
InativarDocumentoAnexoRequest(string Motivo)

```
### `Atividades`

```csharp
AlterarStatusAtividadeRequest( StatusAtividade Status, string? Comentario)
AtividadeComentarioResponse( Guid Id, Guid UsuarioId, string Mensagem, DateTimeOffset CriadoEm)
AtividadeHistoricoResponse( Guid Id, StatusAtividade? StatusAnterior, StatusAtividade StatusNovo, Guid UsuarioId, DateTimeOffset CriadoEm, string Comentario)
AtividadePagedResponse(PagedResult<AtividadeResumoResponse> Resultado)
AtividadeResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Titulo, string? Descricao, StatusAtividade Status, PrioridadeAtividade Prioridade, Guid? ResponsavelUsuarioId, Guid CriadoPorUsuarioId, DateTimeOffset? PrazoEm, DateTimeOffset? ConcluidaEm, DateTimeOffset? CanceladaEm, string? MotivoCancelamento, string? EntidadeOrigem, Guid? EntidadeOrigemId, DateTimeOffset CreatedAt, IReadOnlyList<AtividadeHistoricoResponse> Historicos, IReadOnlyList<AtividadeComentarioResponse> Comentarios)
AtividadeResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Titulo, string? Descricao, StatusAtividade Status, PrioridadeAtividade Prioridade, Guid? ResponsavelUsuarioId, Guid CriadoPorUsuarioId, DateTimeOffset? PrazoEm, DateTimeOffset? ConcluidaEm, string? EntidadeOrigem, Guid? EntidadeOrigemId, DateTimeOffset CreatedAt)
AtribuirResponsavelAtividadeRequest(Guid? ResponsavelUsuarioId)
AtualizarAtividadeRequest( string Titulo, string? Descricao, PrioridadeAtividade Prioridade, DateTimeOffset? PrazoEm)
CancelarAtividadeRequest(string Motivo)
ComentarAtividadeRequest(string Mensagem)
CriarAtividadeRequest( Guid EmpresaId, Guid? FilialId, string Titulo, string? Descricao, PrioridadeAtividade Prioridade, Guid? ResponsavelUsuarioId, DateTimeOffset? PrazoEm, string? EntidadeOrigem, Guid? EntidadeOrigemId)

```
### `Auditoria`

```csharp
AuditoriaEventoResponse( Guid Id, string Modulo, string Entidade, Guid? EntidadeId, string Acao, string Descricao, Guid? UsuarioId, Guid? EmpresaId, Guid? FilialId, DateTimeOffset CriadoEm)
AuditoriaOperacionalItemResponse( Guid Id, string Modulo, string Entidade, Guid? EntidadeId, string Acao, string Descricao, Guid? UsuarioId, Guid? EmpresaId, Guid? FilialId, DateTimeOffset CriadoEm)
AuditoriaOperacionalResponse(PagedResult<AuditoriaOperacionalItemResponse> Resultado)

```
### `Bancos`

```csharp
ArquivoRetornoResponse( Guid Id, Guid ContaBancariaId, string CaminhoRelativo, int QuantidadeRegistros, int QuantidadeProcessados, int QuantidadeComErro, DateTimeOffset ProcessadoEm, IReadOnlyCollection<OcorrenciaRetornoResponse> Ocorrencias)
BancoResponse(Guid Id, string Codigo, string Nome)
BoletoHistoricoResponse(Guid Id, StatusBoleto StatusAnterior, StatusBoleto StatusNovo, string Observacao, Guid? UsuarioId, DateTimeOffset Data)
BoletoResponse( Guid Id, Guid ContaReceberId, Guid ParcelaReceberId, Guid CarteiraCobrancaId, long NossoNumero, string NumeroDocumento, DateTimeOffset DataEmissao, DateTimeOffset DataVencimento, decimal ValorTitulo, StatusBoleto StatusBoleto, string? LinhaDigitavel, string? CodigoBarras, DateTimeOffset? DataLiquidacao, decimal? ValorPago)
CancelarBoletoRequest(string Motivo)
CarteiraCobrancaResponse(Guid Id, Guid ConvenioBancarioId, string Codigo, TipoCobranca TipoCobranca, long UltimoNossoNumero)
ContaBancariaResponse(Guid Id, Guid BancoId, string Agencia, string? AgenciaDv, string Conta, string? ContaDv)
ConvenioBancarioResponse(Guid Id, Guid ContaBancariaId, string CodigoConvenio, string CodigoCedente)
CriarBancoRequest(Guid EmpresaId, Guid? FilialId, string Codigo, string Nome)
CriarCarteiraCobrancaRequest(Guid ConvenioBancarioId, string Codigo, TipoCobranca TipoCobranca)
CriarContaBancariaRequest(Guid EmpresaId, Guid? FilialId, Guid BancoId, string Agencia, string? AgenciaDv, string Conta, string? ContaDv)
CriarConvenioBancarioRequest(Guid ContaBancariaId, string CodigoConvenio, string CodigoCedente)
GerarBoletoRequest(Guid ContaReceberId, Guid ParcelaReceberId, Guid CarteiraCobrancaId, string? NumeroDocumento)
GerarBoletoResponse(BoletoResponse Boleto, IReadOnlyCollection<string> Alertas)
GerarRemessaCnabRequest(Guid CarteiraCobrancaId)
GerarRemessaCnabResponse(Guid ArquivoRemessaCnabId, int Sequencial, int QuantidadeBoletos, string NomeArquivo, IReadOnlyCollection<string> Alertas)
ImportarRetornoCnabRequest(Guid ContaBancariaId, string NomeArquivo, byte[] Conteudo)
ImportarRetornoCnabResponse( Guid ArquivoRetornoCnabId, bool JaProcessadoAnteriormente, int QuantidadeRegistros, int QuantidadeProcessados, int QuantidadeComErro, IReadOnlyCollection<string> Alertas)
OcorrenciaRetornoResponse( Guid Id, Guid? BoletoId, string CodigoOcorrencia, string DescricaoOcorrencia, decimal? ValorInformado, DateTimeOffset DataOcorrencia, bool Processada)

```
### `Comercial/TabelasPreco`

```csharp
AdicionarTabelaPrecoItemRequest( Guid ProdutoId, decimal PrecoVenda, decimal? PrecoMinimo, decimal? MargemPercentual)
AtualizarTabelaPrecoItemRequest( decimal PrecoVenda, decimal? PrecoMinimo, decimal? MargemPercentual)
AtualizarTabelaPrecoRequest( string Nome, DateOnly DataInicioVigencia, DateOnly? DataFimVigencia, bool Padrao)
CriarTabelaPrecoRequest( Guid EmpresaId, Guid? FilialId, string Nome, DateOnly DataInicioVigencia, DateOnly? DataFimVigencia, bool Padrao)
HistoricoPrecoProdutoResponse( Guid Id, decimal? PrecoAnterior, decimal PrecoNovo, Guid UsuarioId, DateTimeOffset CriadoEm, string Motivo)
InativarTabelaPrecoItemRequest(string Motivo)
InativarTabelaPrecoRequest(string Motivo)
PrecoProdutoVigenteResponse(Guid TabelaPrecoId, Guid ItemId, Guid ProdutoId, decimal PrecoVenda, decimal? PrecoMinimo, DateOnly DataReferencia)
TabelaPrecoItemResponse( Guid Id, Guid ProdutoId, decimal PrecoVenda, decimal? PrecoMinimo, decimal? MargemPercentual, bool Ativo, IReadOnlyList<HistoricoPrecoProdutoResponse> Historicos)
TabelaPrecoPagedResponse(PagedResult<TabelaPrecoResumoResponse> Resultado)
TabelaPrecoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, DateOnly DataInicioVigencia, DateOnly? DataFimVigencia, bool Padrao, StatusTabelaPreco Status, IReadOnlyList<TabelaPrecoItemResponse> Itens)
TabelaPrecoResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, DateOnly DataInicioVigencia, DateOnly? DataFimVigencia, bool Padrao, StatusTabelaPreco Status)
ValidarPrecoVendaRequest( Guid ProdutoId, decimal PrecoPedido, bool PossuiPermissaoPrecoMinimo)

```
### `Compras/Cotacoes`

```csharp
AdicionarItemCotacaoCompraRequest( Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, string? Observacao)
AprovarCotacaoCompraRequest( string NumeroPedido, DateTimeOffset DataEmissaoPedido, DateTimeOffset? DataPrevisaoEntrega, Guid? CondicaoPagamentoId, string? Observacao, IReadOnlyList<ItemPedidoOrigemCotacaoRequest>? ItensLocalEstoque)
CancelarCotacaoCompraRequest(string? Motivo)
CotacaoCompraItemResponse( Guid Id, int Sequencia, Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorTotal, string? Observacao)
CotacaoCompraResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid FornecedorId, Guid? SolicitacaoCompraId, DateTimeOffset DataCotacao, DateTimeOffset? Validade, string? Observacao, StatusCotacaoCompra StatusCotacao, IReadOnlyList<CotacaoCompraItemResponse> Itens)
CriarCotacaoCompraRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid FornecedorId, DateTimeOffset DataCotacao, DateTimeOffset? Validade, Guid? SolicitacaoCompraId, string? Observacao)
ItemPedidoOrigemCotacaoRequest(Guid CotacaoCompraItemId, Guid? LocalEstoqueId)

```
### `Compras/Pedidos`

```csharp
AdicionarItemPedidoCompraRequest( Guid ProdutoId, Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
AprovarPedidoCompraRequest(string? Observacao)
AtualizarItemPedidoCompraRequest( Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
AtualizarPedidoCompraRequest( DateTimeOffset? DataPrevisaoEntrega, Guid? CondicaoPagamentoId, string? Observacao)
CancelarPedidoCompraRequest(string Motivo)
CriarPedidoCompraRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid FornecedorId, DateTimeOffset DataEmissao, DateTimeOffset? DataPrevisaoEntrega, Guid? CondicaoPagamentoId, string? Observacao)
ItemPedidoCompraResponse( Guid Id, int Sequencia, Guid ProdutoId, Guid? LocalEstoqueId, decimal Quantidade, decimal QuantidadeRecebida, decimal QuantidadePendente, decimal ValorUnitario, decimal ValorBruto, decimal ValorDesconto, decimal ValorTotal, string? Observacao, string Status)
ItemRecebimentoCompraResponse( Guid Id, Guid PedidoCompraItemId, int Sequencia, Guid ProdutoId, Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorTotal)
PedidoCompraResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid FornecedorId, DateTimeOffset DataEmissao, DateTimeOffset? DataPrevisaoEntrega, Guid? CondicaoPagamentoId, StatusPedidoCompra StatusPedido, decimal ValorProdutos, decimal ValorDesconto, decimal ValorTotal, string? Observacao, IReadOnlyList<ItemPedidoCompraResponse> Itens)
ReceberItemCompraRequest( Guid ItemPedidoCompraId, decimal Quantidade, Guid? LocalEstoqueId, decimal? ValorUnitario)
ReceberPedidoCompraRequest( string Documento, DateTimeOffset DataRecebimento, bool PermiteReceberAcimaDoPedido, bool GerarContaPagar, DateTimeOffset? PrimeiroVencimento, string? Observacao, IReadOnlyList<ReceberItemCompraRequest> Itens)
RecebimentoCompraResponse( Guid Id, Guid PedidoCompraId, string Documento, DateTimeOffset DataRecebimento, decimal ValorTotalRecebido, string? Observacao, IReadOnlyList<ItemRecebimentoCompraResponse> Itens)
RemoverItemPedidoCompraRequest(string Motivo)

```
### `Compras/Recebimentos`

```csharp
RecebimentoCompraDetalheResponse( Guid Id, Guid PedidoCompraId, string Documento, DateTimeOffset DataRecebimento, decimal ValorTotalRecebido, string? Observacao, IReadOnlyList<ItemRecebimentoCompraResponse> Itens, IReadOnlyList<RecebimentoDivergenciaResponse> Divergencias, ConferenciaFiscalEntradaResponse? ConferenciaFiscal)
RecebimentoDivergenciaResponse( Guid Id, Guid RecebimentoCompraId, Guid? ItemPedidoCompraId, Guid? ProdutoId, TipoDivergenciaRecebimento Tipo, decimal ValorEsperado, decimal ValorInformado, decimal Diferenca, DateTimeOffset RegistradaEm, string? Observacao)

```
### `Compras/Recebimentos/ConferenciaFiscal`

```csharp
ConferenciaFiscalEntradaResponse( Guid Id, Guid RecebimentoCompraId, string? ChaveAcesso, string Serie, string Numero, string CnpjEmitente, DateTimeOffset DataEmissaoNota, decimal ValorTotalNota, StatusConferenciaFiscalEntrada StatusConferencia, DateTimeOffset RegistradaEm, string? Observacao)
RegistrarConferenciaFiscalEntradaRequest( string? ChaveAcesso, string Serie, string Numero, string CnpjEmitente, DateTimeOffset DataEmissaoNota, decimal ValorTotalNota, string? Observacao, byte[]? ArquivoXml, string? NomeArquivoXml, byte[]? ArquivoPdf, string? NomeArquivoPdf)

```
### `Compras/Solicitacoes`

```csharp
AdicionarItemSolicitacaoCompraRequest( Guid ProdutoId, decimal Quantidade, string? Observacao)
CancelarSolicitacaoCompraRequest(string? Motivo)
CriarSolicitacaoCompraRequest( Guid EmpresaId, Guid? FilialId, string Numero, DateTimeOffset DataSolicitacao, string Solicitante, string? Justificativa)
SolicitacaoCompraItemResponse( Guid Id, int Sequencia, Guid ProdutoId, decimal Quantidade, string? Observacao)
SolicitacaoCompraResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, DateTimeOffset DataSolicitacao, string Solicitante, string? Justificativa, StatusSolicitacaoCompra StatusSolicitacao, IReadOnlyList<SolicitacaoCompraItemResponse> Itens)

```
### `Contabil/Contabilizacao`

```csharp
ContabilizarBaixaFinanceiraRequest( Guid EmpresaId, Guid? FilialId, TipoEventoContabil TipoEvento, OrigemFinanceira OrigemFinanceira, Guid OrigemId, Guid MovimentoId, decimal Valor, DateTimeOffset Data, string Historico)
ContabilizarBaixaFinanceiraResultado(bool Contabilizado, Guid? LancamentoContabilId)
ContabilizarDepreciacaoRequest( Guid EmpresaId, Guid? FilialId, Guid ContaDespesaId, Guid ContaDepreciacaoAcumuladaId, Guid OrigemId, decimal Valor, DateTimeOffset Data, string Historico)
ContabilizarDepreciacaoResultado(bool Contabilizado, Guid? LancamentoContabilId)
ReverterContabilizacaoBaixaRequest( Guid EmpresaId, TipoEventoContabil TipoEvento, Guid OrigemId, DateTimeOffset Data, string Motivo)
ReverterContabilizacaoBaixaResultado(bool Revertido, Guid? LancamentoEstornoId)

```
### `Contabil/Lancamentos`

```csharp
CriarLancamentoManualRequest( Guid EmpresaId, Guid? FilialId, DateTimeOffset Data, string Historico, IReadOnlyList<PartidaContabilRequest> Partidas)
EstornarLancamentoRequest(string Motivo)
LancamentoContabilResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, DateTimeOffset Data, string Historico, OrigemLancamentoContabil Origem, Guid? OrigemId, StatusLancamentoContabil StatusLancamento, Guid? LancamentoEstornoId, decimal TotalDebito, decimal TotalCredito, IReadOnlyList<PartidaContabilResponse> Partidas)
PartidaContabilRequest( Guid ContaContabilId, TipoPartida Tipo, decimal Valor, Guid? CentroCustoId, string? Historico)
PartidaContabilResponse( Guid Id, int Sequencia, Guid ContaContabilId, TipoPartida Tipo, decimal Valor, Guid? CentroCustoId, string? Historico)

```
### `Contabil/Periodos`

```csharp
AbrirPeriodoContabilRequest(Guid EmpresaId, Guid? FilialId, int Ano, int Mes)
FecharPeriodoContabilRequest(string? Observacao)
PeriodoContabilResponse( Guid Id, Guid EmpresaId, Guid? FilialId, int Ano, int Mes, DateTimeOffset DataInicio, DateTimeOffset DataFim, StatusPeriodoContabil StatusPeriodo, DateTimeOffset? FechadoEm)

```
### `Contabil/PlanoContas`

```csharp
ContaContabilResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, TipoContaContabil Tipo, NaturezaContaContabil Natureza, bool Analitica, Guid? ContaPaiId, StatusContaContabil StatusConta)
CriarContaContabilRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, TipoContaContabil Tipo, NaturezaContaContabil Natureza, bool Analitica, Guid? ContaPaiId)

```
### `Contabil/Regras`

```csharp
CriarRegraContabilizacaoRequest( Guid EmpresaId, Guid? FilialId, string Descricao, TipoEventoContabil TipoEvento, OrigemFinanceira? OrigemFinanceira, Guid ContaDebitoId, Guid ContaCreditoId)
RegraContabilizacaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, TipoEventoContabil TipoEvento, OrigemFinanceira? OrigemFinanceira, Guid ContaDebitoId, Guid ContaCreditoId, StatusRegraContabilizacao StatusRegra)

```
### `Contratos`

```csharp
AtualizarContratoRequest( string Descricao, int DiaVencimento, decimal ValorRecorrente, decimal ValorBaseConsumo, decimal FranquiaQuantidade, decimal ValorUnitarioExcedente, Guid? ResponsavelId, string? IndiceReajuste)
CancelarContratoRequest(string Motivo)
ContratoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, string Descricao, TipoFaturamentoContrato TipoFaturamento, PeriodicidadeContrato Periodicidade, DateTimeOffset DataInicio, DateTimeOffset DataFim, int DiaVencimento, decimal ValorRecorrente, decimal ValorBaseConsumo, decimal FranquiaQuantidade, decimal ValorUnitarioExcedente, Guid? ResponsavelId, string? IndiceReajuste, StatusContrato StatusContrato, DateTimeOffset? AprovadoEm, decimal? UltimoPercentualReajuste, DateTimeOffset? ReajustadoEm, DateTimeOffset? RenovadoEm, DateTimeOffset? EncerradoEm, DateTimeOffset? CanceladoEm, IReadOnlyList<FaturamentoContratoResponse> Faturamentos)
CriarContratoRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, string Descricao, TipoFaturamentoContrato TipoFaturamento, PeriodicidadeContrato Periodicidade, DateTimeOffset DataInicio, DateTimeOffset DataFim, int DiaVencimento, decimal ValorRecorrente, decimal ValorBaseConsumo, decimal FranquiaQuantidade, decimal ValorUnitarioExcedente, Guid? ResponsavelId, string? IndiceReajuste)
EncerrarContratoRequest(string Motivo)
FaturamentoContratoResponse( Guid Id, int Ano, int Mes, int Competencia, DateTimeOffset DataVencimento, decimal ValorFaturado, decimal? ConsumoRegistrado, decimal ExcedenteQuantidade, bool TemDivergencia, Guid? ContaReceberId, StatusFaturamentoContrato StatusFaturamento, DateTimeOffset GeradoEm)
GerarFaturamentoContratoRequest(int Ano, int Mes, decimal? ConsumoRegistrado)
GerarFaturamentoContratoResponse( Guid ContratoId, FaturamentoContratoResponse Faturamento, Guid? ContaReceberId, bool DivergenciaNotificada)
ReajustarContratoRequest(decimal Percentual)
RenovarContratoRequest(DateTimeOffset NovaDataFim)

```
### `Crm/Leads`

```csharp
AtualizarLeadRequest( string Nome, string? Empresa, string? Email, string? Telefone, OrigemLead Origem, Guid? ResponsavelId, string? Observacao)
CriarLeadRequest( Guid EmpresaId, Guid? FilialId, string Nome, string? Empresa, string? Email, string? Telefone, OrigemLead Origem, Guid? ResponsavelId, string? Observacao)
DescartarLeadRequest(string Motivo)
LeadResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, string? Empresa, string? Email, string? Telefone, OrigemLead Origem, Guid? ResponsavelId, string? Observacao, StatusLead StatusLead, Guid? ClienteId, Guid? OportunidadeId, DateTimeOffset? QualificadoEm, string? MotivoDescarte)
QualificarLeadRequest(Guid ClienteId, string Titulo, decimal ValorEstimado, Guid? ResponsavelId, DateTimeOffset? DataPrevisaoFechamento)

```
### `Crm/Oportunidades`

```csharp
AlterarEstagioOportunidadeRequest(EstagioOportunidade Estagio)
AtualizarOportunidadeRequest(string Titulo, decimal ValorEstimado, Guid? ResponsavelId, DateTimeOffset? DataPrevisaoFechamento)
ConverterOportunidadeRequest(string NumeroPedido, TipoPedidoVenda Tipo, DateTimeOffset? DataEmissao, DateTimeOffset? DataPrevisaoEntrega, string? Observacao)
ConverterOportunidadeResponse(Guid OportunidadeId, Guid PedidoVendaId, string NumeroPedido, decimal ValorTotal)
GanharOportunidadeRequest(Guid? PropostaVencedoraId)
OportunidadeResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Titulo, Guid ClienteId, Guid? LeadId, decimal ValorEstimado, Guid? ResponsavelId, DateTimeOffset? DataPrevisaoFechamento, EstagioOportunidade Estagio, StatusOportunidade StatusOportunidade, MotivoPerdaOportunidade? MotivoPerda, string? JustificativaPerda, Guid? PropostaVencedoraId, Guid? PedidoVendaId, DateTimeOffset? GanhaEm, DateTimeOffset? PerdidaEm)
PerderOportunidadeRequest(MotivoPerdaOportunidade Motivo, string Justificativa)

```
### `Crm/Propostas`

```csharp
CriarPropostaRequest( Guid OportunidadeId, DateTimeOffset? DataValidade, string? Observacao, IReadOnlyList<ItemPropostaRequest> Itens)
ItemPropostaRequest(Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
ItemPropostaResponse( Guid Id, int Sequencia, Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, decimal ValorTotal, string? Observacao)
PropostaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid OportunidadeId, int Numero, DateTimeOffset? DataValidade, string? Observacao, StatusProposta StatusProposta, decimal ValorTotal, IReadOnlyList<ItemPropostaResponse> Itens)

```
### `Deploy`

```csharp
AdicionarItemChecklistRequest(Guid RegistroDeployId, string Descricao, bool Obrigatorio)
ConcluirDeployRequest(string? Observacao)
FalharDeployRequest(string Motivo)
ItemChecklistDeployResponse(Guid Id, Guid RegistroDeployId, string Descricao, bool Obrigatorio, StatusItemChecklist StatusItem, string? Observacao, DateTimeOffset CriadoEm, DateTimeOffset? VerificadoEm, Guid? VerificadoPor)
MigracoesInfoResponse(int TotalConhecidas, int TotalAplicadas, int TotalPendentes, bool TemPendencias, bool Consistente, IReadOnlyList<string> Pendentes, IReadOnlyList<string> AplicadasDesconhecidas)
RegistrarDeployRequest(string Versao, string? Ambiente, string? Descricao, int? MigracoesAplicadasInformadas)
RegistrarResultadoItemRequest(StatusItemChecklist Status, string? Observacao)
RegistroDeployResponse(Guid Id, string Versao, string Ambiente, string? Descricao, int? MigracoesAplicadasInformadas, Guid? UsuarioId, DateTimeOffset DataInicio, DateTimeOffset? DataConclusao, StatusDeploy StatusDeploy, string? Observacao, DateTimeOffset? RevertidoEm, string? MotivoRollback, string? VersaoRollbackAlvo)
ReverterDeployRequest(string Motivo, string? VersaoAlvo)
StatusAmbienteResponse(string Aplicacao, string Ambiente, string? VersaoAtual, RegistroDeployResponse? UltimoDeploy, MigracoesInfoResponse Migracoes)

```
### `Estoque`

```csharp
EstoqueMovimentoContexto(Produto Produto, LocalEstoque Local, EstoqueSaldo Saldo)

```
### `Estoque/Avancado`

```csharp
AjusteEstoqueResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid LocalEstoqueId, Guid ProdutoId, TipoAjusteEstoque Tipo, decimal Quantidade, string Motivo, string Origem)
BloqueioEstoqueResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid LocalEstoqueId, Guid ProdutoId, decimal Quantidade, string Motivo, StatusBloqueioEstoque Status)
CancelarInventarioEstoqueRequest(string Motivo)
ConcluirInventarioEstoqueRequest(string MotivoAjuste)
CriarAjusteEstoqueRequest(Guid EmpresaId, Guid FilialId, Guid LocalEstoqueId, Guid ProdutoId, TipoAjusteEstoque Tipo, decimal Quantidade, string Motivo)
CriarBloqueioEstoqueRequest(Guid EmpresaId, Guid FilialId, Guid LocalEstoqueId, Guid ProdutoId, decimal Quantidade, string Motivo)
CriarInventarioEstoqueRequest(Guid EmpresaId, Guid FilialId, Guid LocalEstoqueId, string Descricao, DateOnly DataReferencia)
EncerrarBloqueioEstoqueRequest(string Motivo)
InventarioEstoquePagedResponse(PagedResult<InventarioEstoqueResumoResponse> Resultado)
InventarioEstoqueResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid LocalEstoqueId, string Descricao, DateOnly DataReferencia, StatusInventarioEstoque Status, IReadOnlyList<ItemInventarioEstoqueResponse> Itens)
InventarioEstoqueResumoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid LocalEstoqueId, string Descricao, DateOnly DataReferencia, StatusInventarioEstoque Status)
ItemInventarioEstoqueRequest(Guid ProdutoId, decimal QuantidadeSistema, decimal QuantidadeContada, string? Observacao)
ItemInventarioEstoqueResponse(Guid Id, Guid ProdutoId, decimal QuantidadeSistema, decimal QuantidadeContada, decimal Divergencia, string? Observacao)

```
### `Estoque/Inventarios`

```csharp
AbrirInventarioRequest( Guid EmpresaId, Guid? FilialId, string Codigo, Guid LocalEstoqueId, string Descricao)
AdicionarItemInventarioRequest( Guid ProdutoId, decimal QuantidadeContada, string? Observacao)
CancelarInventarioRequest(string Motivo)
FecharInventarioRequest(string Motivo)
InventarioResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, Guid LocalEstoqueId, string Descricao, StatusInventario StatusInventario, DateTimeOffset AbertoEm, DateTimeOffset? FechadoEm, string? MotivoFechamento, IReadOnlyCollection<ItemInventarioResponse> Itens)
ItemInventarioResponse( Guid Id, Guid ProdutoId, Guid LocalEstoqueId, decimal QuantidadeSistema, decimal QuantidadeContada, decimal Diferenca, string? Observacao)

```
### `Estoque/Locais`

```csharp
AtualizarLocalEstoqueRequest( string Nome, string? Descricao)
CriarLocalEstoqueRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao)
InativarLocalEstoqueRequest(string Motivo)
LocalEstoqueResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao, EntityStatus Status)

```
### `Estoque/Movimentos`

```csharp
AjustarEstoqueRequest( Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal QuantidadeContada, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo)
MovimentoEstoqueResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, TipoMovimentoEstoque Tipo, decimal Quantidade, decimal QuantidadeAnterior, decimal QuantidadePosterior, decimal QuantidadeReservadaAnterior, decimal QuantidadeReservadaPosterior, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo, DateTimeOffset DataMovimento)
RegistrarEntradaEstoqueRequest( Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal Quantidade, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo)
RegistrarSaidaEstoqueRequest( Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal Quantidade, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo)
TransferenciaEstoqueResponse( Guid EmpresaId, Guid ProdutoId, Guid LocalEstoqueOrigemId, Guid LocalEstoqueDestinoId, Guid? FilialOrigemId, Guid? FilialDestinoId, decimal Quantidade, MovimentoEstoqueResponse MovimentoSaida, MovimentoEstoqueResponse MovimentoEntrada, EstoqueSaldoResponse SaldoOrigem, EstoqueSaldoResponse SaldoDestino)
TransferirEstoqueRequest( Guid EmpresaId, Guid? FilialOrigemId, Guid? FilialDestinoId, Guid ProdutoId, Guid LocalEstoqueOrigemId, Guid LocalEstoqueDestinoId, decimal Quantidade, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo)

```
### `Estoque/Reservas`

```csharp
BaixarReservaEstoqueRequest( decimal Quantidade, string OrigemModulo, Guid? OrigemId, string? Documento, string Motivo)
CancelarReservaEstoqueRequest( decimal? Quantidade, string Motivo)
CriarReservaEstoqueRequest( Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal Quantidade, string OrigemModulo, Guid? OrigemId, string? Observacao)
ReservaEstoqueResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal Quantidade, decimal QuantidadeBaixada, decimal QuantidadeCancelada, decimal QuantidadePendente, StatusReservaEstoque StatusReserva, string OrigemModulo, Guid? OrigemId, string? Observacao)

```
### `Estoque/Saldos`

```csharp
EstoqueSaldoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid ProdutoId, Guid LocalEstoqueId, decimal QuantidadeAtual, decimal QuantidadeReservada, decimal QuantidadeDisponivel)

```
### `Faturamento`

```csharp
CancelarFaturamentoRequest( string Motivo)
ConfirmarFaturamentoRequest( string UfAutorizadora, TipoDocumentoFiscal TipoDocumento, string Serie, string Numero, Guid? NaturezaOperacaoId, string? CfopPadrao, string UnidadeComercialPadrao, bool ValidarDadosFiscaisProduto, string? CertificateThumbprint, Guid? CondicaoPagamentoId, DateTimeOffset PrimeiraDataVencimentoContaReceber, string? CorrelationId)
ConfirmarFaturamentoResponse( FaturamentoResponse Faturamento, IReadOnlyCollection<string> Alertas)
FaturamentoHistoricoResponse( Guid Id, StatusFaturamento StatusAnterior, StatusFaturamento StatusNovo, string Observacao, Guid? UsuarioId, DateTimeOffset Data)
FaturamentoOcorrenciaResponse( Guid Id, TipoOcorrenciaFaturamento Tipo, string Mensagem, DateTimeOffset Data)
FaturamentoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid PedidoVendaId, Guid? NotaFiscalId, Guid? ContaReceberId, StatusFaturamento Etapa, decimal ValorTotal, DateTimeOffset? ConfirmadoEm, Guid? ConfirmadoPor, DateTimeOffset? CanceladoEm, Guid? CanceladoPor, string? MotivoCancelamento)
PrepararFaturamentoRequest( Guid PedidoVendaId, string? Observacao)
PrepararFaturamentoResponse( FaturamentoResponse Faturamento, bool JaExistia, IReadOnlyCollection<string> Alertas)

```
### `Financeiro/Avancado`

```csharp
BaixaFinanceiraResponse( Guid Id, decimal Valor, DateOnly DataBaixa, Guid UsuarioId, bool Estornada, string? MotivoEstorno)
BaixarContaFinanceiraRequest( decimal Valor, DateOnly DataBaixa, string? Observacao)
CancelarContaFinanceiraRequest(string Motivo)
ContaFinanceiraPagedResponse(PagedResult<ContaFinanceiraResumoResponse> Resultado)
ContaFinanceiraResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoContaFinanceira Tipo, Guid ParticipanteId, string Descricao, string? Documento, decimal ValorOriginal, decimal Saldo, DateOnly DataEmissao, DateOnly DataVencimento, StatusContaFinanceira Status, string? OrigemModulo, Guid? OrigemId, IReadOnlyList<BaixaFinanceiraResponse> Baixas)
ContaFinanceiraResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoContaFinanceira Tipo, Guid ParticipanteId, string Descricao, decimal ValorOriginal, decimal Saldo, DateOnly DataVencimento, StatusContaFinanceira Status)
CriarContaFinanceiraRequest( Guid EmpresaId, Guid? FilialId, Guid ParticipanteId, string Descricao, string? Documento, decimal ValorOriginal, DateOnly DataEmissao, DateOnly DataVencimento, string? OrigemModulo, Guid? OrigemId)
EstornarBaixaFinanceiraRequest( Guid BaixaId, DateOnly DataEstorno, string Motivo)
FluxoCaixaRequest( Guid? EmpresaId, Guid? FilialId, DateOnly DataInicial, DateOnly DataFinal)
FluxoCaixaResponse( Guid? EmpresaId, Guid? FilialId, DateOnly DataInicial, DateOnly DataFinal, decimal EntradasPrevistas, decimal SaidasPrevistas, decimal EntradasRealizadas, decimal SaidasRealizadas, decimal SaldoPrevisto, decimal SaldoRealizado, decimal SaldoProjetado)

```
### `Financeiro/CondicoesPagamento`

```csharp
AtualizarCondicaoPagamentoRequest( string Nome, int QuantidadeParcelas, int IntervaloDias, bool PermiteEntrada)
CondicaoPagamentoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, int QuantidadeParcelas, int IntervaloDias, bool PermiteEntrada, string Status)
CriarCondicaoPagamentoRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, int QuantidadeParcelas, int IntervaloDias, bool PermiteEntrada)
InativarCondicaoPagamentoRequest(string Motivo)

```
### `Financeiro/ContasPagar`

```csharp
CancelarContaPagarRequest(string Motivo)
ContaPagarResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid FornecedorId, string Documento, OrigemFinanceira Origem, Guid? OrigemId, DateTimeOffset DataEmissao, decimal ValorOriginal, decimal ValorPago, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, decimal ValorSaldo, StatusContaFinanceira Status, string? Observacao, IReadOnlyList<ParcelaPagarResponse> Parcelas, IReadOnlyList<PagamentoResponse> Pagamentos)
CriarContaPagarRequest( Guid EmpresaId, Guid? FilialId, Guid FornecedorId, string Documento, OrigemFinanceira Origem, Guid? OrigemId, DateTimeOffset DataEmissao, string? Observacao, IReadOnlyList<ParcelaPagarRequest> Parcelas)
EstornarPagamentoRequest( Guid PagamentoId, string Motivo)
PagamentoResponse( Guid Id, Guid ParcelaPagarId, Guid FormaPagamentoId, DateTimeOffset DataPagamento, decimal ValorPago, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, bool Estornado, string? MotivoEstorno)
PagarParcelaRequest( Guid ParcelaId, Guid FormaPagamentoId, DateTimeOffset DataPagamento, decimal ValorPago, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, bool GerarMovimentoCaixa, bool GerarMovimentoBancario, string? ContaBancariaReferencia, string? Observacao)
ParcelaPagarRequest( int Numero, DateTimeOffset Vencimento, decimal Valor)
ParcelaPagarResponse( Guid Id, int Numero, DateTimeOffset Vencimento, decimal ValorOriginal, decimal ValorPago, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, decimal ValorSaldo, StatusParcelaFinanceira Status)

```
### `Financeiro/ContasReceber`

```csharp
CancelarContaReceberRequest(string Motivo)
ContaReceberResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid ClienteId, string Documento, OrigemFinanceira Origem, Guid? OrigemId, DateTimeOffset DataEmissao, decimal ValorOriginal, decimal ValorRecebido, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, decimal ValorSaldo, StatusContaFinanceira Status, string? Observacao, IReadOnlyList<ParcelaReceberResponse> Parcelas, IReadOnlyList<RecebimentoResponse> Recebimentos)
CriarContaReceberRequest( Guid EmpresaId, Guid? FilialId, Guid ClienteId, string Documento, OrigemFinanceira Origem, Guid? OrigemId, DateTimeOffset DataEmissao, string? Observacao, IReadOnlyList<ParcelaFinanceiraRequest> Parcelas)
EstornarRecebimentoRequest( Guid RecebimentoId, string Motivo)
GerarContaReceberPedidoVendaRequest( Guid? CondicaoPagamentoId, DateTimeOffset PrimeiraDataVencimento, string? Documento, string? Observacao)
ParcelaFinanceiraRequest( int Numero, DateTimeOffset Vencimento, decimal Valor)
ParcelaReceberResponse( Guid Id, int Numero, DateTimeOffset Vencimento, decimal ValorOriginal, decimal ValorRecebido, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, decimal ValorSaldo, StatusParcelaFinanceira Status)
ReceberParcelaRequest( Guid ParcelaId, Guid FormaPagamentoId, DateTimeOffset DataRecebimento, decimal ValorRecebido, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, bool GerarMovimentoCaixa, bool GerarMovimentoBancario, string? ContaBancariaReferencia, string? Observacao)
RecebimentoResponse( Guid Id, Guid ParcelaReceberId, Guid FormaPagamentoId, DateTimeOffset DataRecebimento, decimal ValorRecebido, decimal ValorJuros, decimal ValorMulta, decimal ValorDesconto, bool Estornado, string? MotivoEstorno)

```
### `Financeiro/FormasPagamento`

```csharp
AtualizarFormaPagamentoRequest( string Nome, bool PermiteRecebimento, bool PermitePagamento)
CriarFormaPagamentoRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, bool PermiteRecebimento, bool PermitePagamento)
FormaPagamentoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, bool PermiteRecebimento, bool PermitePagamento, string Status)
InativarFormaPagamentoRequest(string Motivo)

```
### `Fiscal`

```csharp
ConfiguracaoFiscalEmissaoResolvida( TipoAmbienteFiscal Ambiente, Guid? CertificadoDigitalId, bool EmitirNFe, bool EmitirNFCe, bool EmitirNFSe)
StatusServicoIndisponibilidadeFiscal( bool StatusServicoIndisponivelDetectado, string? CodigoStatusServico, string? MotivoStatusServico, IReadOnlyCollection<string> Alertas)

```
### `Fiscal/Cadastros`

```csharp
CestResponse( Guid Id, string Codigo, string Descricao, string Segmento, bool Ativo, string? MotivoInativacao)
CfopResponse( Guid Id, string Codigo, string Descricao, TipoCfop Tipo, AmbitoCfop Ambito, bool IndicadorDevolucao, bool IndicadorTransferencia, bool IndicadorIndustrializacao, bool GeraFinanceiro, bool MovimentaEstoque, bool Ativo, string? MotivoInativacao)
CsosnResponse( Guid Id, string Codigo, string Descricao, bool Ativo, string? MotivoInativacao)
CstIcmsResponse( Guid Id, string Codigo, string Descricao, bool Ativo, string? MotivoInativacao)
CstIpiResponse( Guid Id, string Codigo, string Descricao, IndicadorOperacaoCst IndicadorOperacao, bool Ativo, string? MotivoInativacao)
CstPisCofinsResponse( Guid Id, string Codigo, string Descricao, IndicadorOperacaoCst IndicadorOperacao, bool GeraCredito, bool Ativo, string? MotivoInativacao)
MunicipioIbgeResponse( Guid Id, string CodigoIbge, string Nome, Guid UfId, string UfSigla, string? CodigoSiafi, bool Ativo, string? MotivoInativacao)
NcmCestResponse( Guid Id, Guid NcmId, string NcmCodigo, Guid CestId, string CestCodigo, bool Ativo, string? MotivoInativacao)
NcmResponse( Guid Id, string Codigo, string Descricao, string Capitulo, decimal? AliquotaIpiReferencia, DateOnly VigenciaInicio, DateOnly? VigenciaFim, string? ExTipi, bool Ativo, string? MotivoInativacao)
OrigemMercadoriaResponse( Guid Id, string Codigo, string Descricao, bool EhEstrangeira, bool Ativo, string? MotivoInativacao)
PaisResponse( Guid Id, string CodigoBacen, string Nome, string? SiglaIso, bool Ativo, string? MotivoInativacao)
SituacaoTributariaIcmsResponse( RegimeTributario Regime, Crt? Crt, TipoSituacaoTributariaIcms Tipo, string Origem, string CodigoSituacao, string CampoXmlCodigoSituacao, string? CodigoIcmsTresDigitos)
UfResponse( Guid Id, string Sigla, string Nome, string CodigoIbge, decimal? AliquotaInternaPadraoReferencia, bool Ativo, string? MotivoInativacao)
UnidadeTributavelResponse( Guid Id, string Sigla, string Descricao, bool Ativo, string? MotivoInativacao)
ValidacaoNcmCestResponse( string NcmCodigo, bool NcmVigente, bool ExigeCest, IReadOnlyList<string> CestsVinculados, string? CestInformado, bool CestCompativel)

```
### `Fiscal/Cadastros/Importacao`

```csharp
LinhaRejeitadaImportacao(int Linha, string? Codigo, string Motivo)
ResumoImportacaoTabelaOficial( TabelaOficialFiscal Tabela, string Arquivo, int LinhasLidas, int Inseridos, int Atualizados, int Inalterados, IReadOnlyList<LinhaRejeitadaImportacao> Rejeitadas)

```
### `Fiscal/Cadastros/NaturezaOperacao`

```csharp
AtualizarNaturezaOperacaoRequest( string Descricao, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, FinalidadeNaturezaOperacao Finalidade, IndicadorPresencaComprador IndicadorPresencaComprador, bool IndicadorConsumidorFinal, bool MovimentaEstoque, bool GeraFinanceiro, string? Observacao, IReadOnlyList<MapeamentoCfopRequest>? Cfops)
CfopResolvidoResponse( Guid NaturezaOperacaoId, string NaturezaCodigo, AmbitoCfop Ambito, Guid CfopId, string CfopCodigo, string CfopDescricao, bool GeraFinanceiro, bool MovimentaEstoque)
CodigoServicoMunicipalResponse( Guid Id, Guid MunicipioIbgeId, string MunicipioCodigoIbge, string CodigoLc116, string? CodigoMunicipal, string Descricao, decimal? AliquotaIssPadrao, bool Ativo, string? MotivoInativacao)
CriarNaturezaOperacaoRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, FinalidadeNaturezaOperacao Finalidade, IndicadorPresencaComprador IndicadorPresencaComprador, bool IndicadorConsumidorFinal, bool MovimentaEstoque, bool GeraFinanceiro, string? Observacao, IReadOnlyList<MapeamentoCfopRequest>? Cfops)
InativarNaturezaOperacaoRequest(string Motivo)
MapeamentoCfopRequest(AmbitoCfop Ambito, string CfopCodigo)
MapeamentoCfopResponse(AmbitoCfop Ambito, Guid CfopId, string CfopCodigo)
NaturezaOperacaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, FinalidadeNaturezaOperacao Finalidade, IndicadorPresencaComprador IndicadorPresencaComprador, bool IndicadorConsumidorFinal, bool MovimentaEstoque, bool GeraFinanceiro, string? Observacao, bool Ativa, IReadOnlyList<MapeamentoCfopResponse> Cfops)

```
### `Fiscal/Documentos`

```csharp
AmpliarNumeroFinalSerieFiscalRequest(int NovoNumeroFinal)
BuracosSerieFiscalResponse( Guid SerieFiscalId, int Numero, int NumeroInicial, int UltimoNumeroAlocado, IReadOnlyList<int> NumerosSemDocumentoAutorizado)
CriarSerieFiscalRequest( Guid EmpresaId, Guid? FilialId, Guid ModeloDocumentoFiscalId, int Numero, int NumeroInicial, int NumeroFinal, DateOnly VigenciaInicio, DateOnly? VigenciaFim)
EmitenteFiscalResolvido( Guid EmpresaId, Guid? FilialId, string CnpjEmitente, string? InscricaoEstadual, string UfSigla, string CodigoUfIbge, string CodigoMunicipioIbge, Guid MunicipioIbgeId, EnderecoFiscal Endereco)
EncerrarVigenciaSerieFiscalRequest(DateOnly VigenciaFim)
InativarSerieFiscalRequest(string Motivo)
ModeloDocumentoFiscalResponse( Guid Id, string Codigo, string Descricao, string Sigla, bool Ativo, string? MotivoInativacao)
NumeroSerieAlocadoResponse( Guid SerieFiscalId, Guid ModeloDocumentoFiscalId, int NumeroSerie, int NumeroDocumentoAlocado)
SerieFiscalResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid ModeloDocumentoFiscalId, int Numero, int NumeroInicial, int NumeroFinal, int ProximoNumero, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa)

```
### `Fiscal/NotasFiscais`

```csharp
AcaoWorkflowFiscalResponse( string Codigo, string Nome, string MetodoHttp, string Endpoint, string Permissao, bool Habilitada, string? MotivoBloqueio, string? PayloadReferencia)
AcoesOperacionaisNotaFiscalResponse( bool PodeValidar, bool PodeGerarXmlEnvio, bool PodeAssinarXmlEnvio, bool PodeTransmitirSefaz, bool PodeGerarDanfe, bool PodeBaixarEstoque, bool PodeGerarContaReceber, bool PodeCancelar, bool PodeEmitirCartaCorrecao)
AdicionarImpostoNotaFiscalRequest( Guid? ItemNotaFiscalId, string Nome, string? CstCsosn, decimal BaseCalculo, decimal Aliquota, decimal Valor, string? Observacao)
AdicionarItemNotaFiscalRequest( Guid? ProdutoId, string CodigoItem, string Descricao, string? Ncm, string? Cfop, string UnidadeComercial, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
ArmazenarXmlNotaFiscalRequest( TipoXmlFiscal Tipo, string ConteudoXml, string? Protocolo, string? ChaveAcesso)
ArquivoFiscalDownloadResponse( Guid Id, string NomeArquivo, string ContentType, string HashSha256, long TamanhoBytes, byte[] Conteudo)
AssinarXmlNotaFiscalRequest( string? CertificateThumbprint, string? XmlEnvio, bool ArmazenarXmlAssinado, bool ValidarSchemaAntesAssinatura, string? SchemaSetName)
AvaliarContingenciaFiscalRequest( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, string UfAutorizadora, TipoContingenciaFiscal TipoContingencia, string Motivo, bool ExigirStatusServicoIndisponivelRecente, int JanelaStatusServicoMinutos, string? CorrelationId)
BaixaEstoqueNotaFiscalItemResponse( Guid PedidoVendaItemId, Guid ProdutoId, Guid ReservaEstoqueId, Guid MovimentoEstoqueId, decimal QuantidadeBaixada)
BaixaEstoqueNotaFiscalResponse( Guid NotaFiscalId, Guid PedidoVendaId, StatusNotaFiscal StatusFiscal, decimal QuantidadeTotalBaixada, IReadOnlyCollection<BaixaEstoqueNotaFiscalItemResponse> Itens, IReadOnlyCollection<string> Alertas)
BaixarEstoqueNotaFiscalAutorizadaRequest( string Motivo, string? Documento, string? CorrelationId)
CancelarNotaFiscalRequest( string Motivo, string? ProtocoloCancelamento, string? XmlCancelamento)
CancelarNotaFiscalSefazRequest( string UfAutorizadora, string Motivo, string XmlEventoAssinado, bool ValidarSchemaAntesTransmissao, string? SchemaSetName, string? CorrelationId)
CartaCorrecaoResponse( Guid Id, Guid NotaFiscalId, int Sequencia, string TextoCorrecao, string? Protocolo, DateTimeOffset CriadaEm, Guid CriadaPor)
ConsultaProtocoloSefazResponse( Guid NotaFiscalId, StatusNotaFiscal StatusFiscalAntes, StatusNotaFiscal StatusFiscalDepois, TipoServicoTransmissaoFiscal Servico, bool ComunicacaoOk, bool AutorizadaNoAmbiente, bool ReconciliacaoAplicada, string? CodigoStatus, string? Motivo, string? Protocolo, string? ChaveAcesso, bool DeveReprocessar, IReadOnlyCollection<string> Alertas)
ConsultarProtocoloSefazRequest( string UfAutorizadora, TipoServicoTransmissaoFiscal Servico, string XmlConsultaAssinado, bool ValidarSchemaAntesConsulta, string? SchemaSetName, bool AplicarReconciliacaoLocal, string? CorrelationId)
ConsultarStatusServicoSefazRequest( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, string UfAutorizadora, string XmlStatusServico, bool ValidarSchemaAntesConsulta, string? SchemaSetName, string? CorrelationId)
ContaReceberNotaFiscalParcelaResponse( Guid Id, int Numero, DateTimeOffset Vencimento, decimal ValorOriginal, decimal ValorSaldo, StatusParcelaFinanceira Status)
ContaReceberNotaFiscalResponse( Guid NotaFiscalId, Guid PedidoVendaId, Guid ContaReceberId, string Documento, OrigemFinanceira Origem, Guid OrigemId, decimal ValorOriginal, decimal ValorSaldo, StatusContaFinanceira Status, bool JaExistia, IReadOnlyCollection<ContaReceberNotaFiscalParcelaResponse> Parcelas, IReadOnlyCollection<string> Alertas)
ContingenciaFiscalResponse( Guid? NotaFiscalId, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoAmbienteFiscal Ambiente, string UfAutorizadora, TipoContingenciaFiscal TipoContingencia, bool Permitida, bool StatusServicoIndisponivelDetectado, string? CodigoStatusServico, string? MotivoStatusServico, string MotivoOperacional, DateTimeOffset AvaliadaEm, IReadOnlyCollection<string> Alertas)
CriarNotaFiscalRequest( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, OrigemNotaFiscal Origem, Guid? OrigemId, string Serie, string Numero, DateTimeOffset DataEmissao, Guid? NaturezaOperacaoId, Guid? PessoaId, string? Observacao)
DocumentoAuxiliarFiscalResponse( Guid Id, Guid NotaFiscalId, TipoDocumentoAuxiliarFiscal Tipo, FormatoDocumentoAuxiliarFiscal Formato, string NomeArquivo, string ContentType, string HashSha256, long TamanhoBytes, DateTimeOffset GeradoEm, Guid GeradoPor, IReadOnlyCollection<string> Alertas)
EmitirCartaCorrecaoSefazRequest( string UfAutorizadora, string TextoCorrecao, string XmlEventoAssinado, bool ValidarSchemaAntesTransmissao, string? SchemaSetName, string? CorrelationId)
EstoqueResumoFiscalResponse( bool Aplicavel, bool Baixado, int ItensPendentes, decimal QuantidadePendente, IReadOnlyCollection<int> SequenciasPendentes)
EtapaWorkflowFiscalResponse( int Ordem, string Codigo, string Nome, string Status, bool Obrigatoria, string? MetodoHttp, string? Endpoint, string? Permissao, string? MotivoBloqueio)
EventoFiscalOperacionalResponse( Guid NotaFiscalId, StatusNotaFiscal StatusFiscal, TipoEventoFiscal TipoEvento, bool ComunicacaoOk, bool AutorizadoPeloAmbiente, string? CodigoStatus, string? Motivo, string? Protocolo, bool DeveReprocessar)
EventoNotaFiscalResponse( Guid Id, TipoEventoFiscal Tipo, string? Codigo, string Descricao, string? Protocolo, DateTimeOffset DataEvento, Guid? UsuarioId)
FinanceiroResumoFiscalResponse( bool Aplicavel, bool ContaReceberGerada, Guid? ContaReceberId, StatusContaFinanceira? Status, decimal? ValorOriginal, decimal? ValorSaldo)
GerarContaReceberNotaFiscalAutorizadaRequest( Guid? CondicaoPagamentoId, DateTimeOffset PrimeiraDataVencimento, string? Documento, string? Observacao, string? CorrelationId)
GerarDanfeNotaFiscalRequest( string? CorrelationId)
GerarNotaFiscalPedidoVendaRequest( Guid PedidoVendaId, TipoDocumentoFiscal TipoDocumento, string Serie, string Numero, Guid? NaturezaOperacaoId, string? CfopPadrao, string UnidadeComercialPadrao, bool ValidarDadosFiscaisProduto, string? Observacao)
GerarXmlEnvioNotaFiscalRequest( bool ArmazenarXml, bool ValidarSchema, string? SchemaSetName)
HabilitarContingenciaNotaFiscalRequest( string UfAutorizadora, TipoContingenciaFiscal TipoContingencia, string Motivo, bool ExigirStatusServicoIndisponivelRecente, int JanelaStatusServicoMinutos, string? CorrelationId)
ImpostoNotaFiscalResponse( Guid Id, Guid? ItemNotaFiscalId, string Nome, string? CstCsosn, decimal BaseCalculo, decimal Aliquota, decimal Valor, string? Observacao)
InutilizacaoNumeracaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, string Serie, int NumeroInicial, int NumeroFinal, string Motivo, string? Protocolo, DateTimeOffset InutilizadaEm, Guid InutilizadaPor, bool ComunicacaoOk, bool AutorizadaPeloAmbiente, string? CodigoStatus, string? RetornoMotivo, bool DeveReprocessar)
InutilizarNumeracaoSefazRequest( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, string Serie, int NumeroInicial, int NumeroFinal, string Motivo, string UfAutorizadora, string XmlInutilizacaoAssinado, bool ValidarSchemaAntesTransmissao, string? SchemaSetName, string? CorrelationId)
ItemNotaFiscalResponse( Guid Id, int Sequencia, Guid? ProdutoId, string CodigoItem, string Descricao, Guid? NcmId, string? Ncm, Guid? CestId, string? Cest, Guid? OrigemMercadoriaId, string? OrigemMercadoriaCodigo, Guid? CfopId, string? Cfop, string UnidadeComercial, Guid? UnidadeTributavelId, string? UnidadeTributavelSigla, decimal Quantidade, decimal ValorUnitario, decimal ValorBruto, decimal ValorDesconto, decimal ValorTotal, string? Observacao)
LogIntegracaoFiscalResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid? NotaFiscalId, string Operacao, StatusIntegracaoFiscal StatusIntegracao, string? CorrelationId, string? PayloadResumo, string? Mensagem, DateTimeOffset RegistradoEm, bool PodeReprocessar, bool ContemDadoSensivelOcultado)
NotaFiscalListagemItemResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, StatusNotaFiscal StatusFiscal, OrigemNotaFiscal Origem, Guid? OrigemId, Guid? PessoaId, string Serie, string Numero, string? ChaveAcesso, string? ProtocoloAutorizacao, DateTimeOffset DataEmissao, DateTimeOffset? AutorizadaEm, DateTimeOffset? CanceladaEm, decimal ValorTotal, bool PossuiXmlEnvio, bool PossuiXmlAutorizado, bool PossuiDanfe, bool EstoqueAplicavel, bool EstoqueBaixado, bool EstoquePendente, bool FinanceiroAplicavel, bool ContaReceberGerada, bool FinanceiroPendente, string AcaoPrincipalCodigo, string AcaoPrincipalNome, string? AcaoPrincipalMetodoHttp, string? AcaoPrincipalEndpoint, string? AcaoPrincipalPermissao, IReadOnlyCollection<string> Alertas)
NotaFiscalPedidoVendaResponse( NotaFiscalResponse NotaFiscal, Guid PedidoVendaId, string NumeroPedidoVenda, IReadOnlyCollection<string> Alertas)
NotaFiscalResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoOperacaoFiscal TipoOperacao, OrigemNotaFiscal Origem, Guid? OrigemId, string Serie, string Numero, // nNF — número do documento fiscal alocado pela série na validação (v1.16.0/G2). Nulo enquanto a nota é // rascunho, e em documento que não passa pela numeração com chave de acesso. É campo próprio, distinto do // `Numero` acima (texto legado informado pelo chamador): quem valida a nota precisa saber qual número o // sistema efetivamente alocou. O cNF não é exposto — já está nos dígitos 36-43 de `ChaveAcesso` e não tem // uso próprio no cliente. int? NumeroDocumento, string? ChaveAcesso, string? ProtocoloAutorizacao, DateTimeOffset DataEmissao, DateTimeOffset? AutorizadaEm, DateTimeOffset? CanceladaEm, StatusNotaFiscal StatusFiscal, decimal ValorProdutos, decimal ValorDesconto, decimal ValorTotal, string? CodigoRejeicao, string? MensagemRejeicao, string? MotivoCancelamento, string? Observacao, IReadOnlyCollection<ItemNotaFiscalResponse> Itens, IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos, IReadOnlyCollection<XmlNotaFiscalResponse> Xmls, IReadOnlyCollection<EventoNotaFiscalResponse> Eventos)
NotaFiscalResumoOperacionalResponse( Guid NotaFiscalId, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, string Serie, string Numero, StatusNotaFiscal StatusFiscal, OrigemNotaFiscal Origem, Guid? OrigemId, bool PossuiXmlEnvio, bool PossuiXmlAutorizado, bool PossuiDanfe, PedidoVendaResumoFiscalResponse? PedidoVenda, EstoqueResumoFiscalResponse Estoque, FinanceiroResumoFiscalResponse Financeiro, AcoesOperacionaisNotaFiscalResponse Acoes, IReadOnlyCollection<string> Alertas)
NotaFiscalWorkflowOperacionalResponse( Guid NotaFiscalId, Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, StatusNotaFiscal StatusFiscal, string EtapaAtual, int OrdemEtapaAtual, decimal PercentualConcluido, NotaFiscalResumoOperacionalResponse Resumo, IReadOnlyCollection<EtapaWorkflowFiscalResponse> Etapas, IReadOnlyCollection<AcaoWorkflowFiscalResponse> ProximasAcoes, IReadOnlyCollection<string> Bloqueios, IReadOnlyCollection<string> Alertas)
NotaFiscalXmlPipelineResponse( Guid NotaFiscalId, TipoDocumentoFiscal TipoDocumento, StatusNotaFiscal StatusFiscal, TipoXmlFiscal TipoXml, string ConteudoXml, string? SchemaSetName, bool SchemaValidado, bool Armazenado, IReadOnlyCollection<string> Alertas)
ObservabilidadeFiscalRequest( Guid EmpresaId, Guid? FilialId, DateTimeOffset? RegistradoApos, int Take = 50)
ObservabilidadeFiscalResponse( Guid EmpresaId, Guid? FilialId, DateTimeOffset GeradoEm, DateTimeOffset? RegistradoApos, int TotalLogsAnalisados, int TotalSucesso, int TotalFalha, int TotalReprocessamento, int TotalPendente, DateTimeOffset? UltimoRegistroEm, bool PossuiFalhaRecente, bool PossuiPendenciaRecente, IReadOnlyCollection<string> OperacoesComFalha, IReadOnlyCollection<string> Alertas, IReadOnlyCollection<LogIntegracaoFiscalResponse> LogsRecentes)
PedidoVendaResumoFiscalResponse( Guid Id, string Numero, StatusPedidoVenda Status, Guid ClienteId, decimal ValorTotal, DateTimeOffset? FaturadoEm)
RegistrarRejeicaoNotaFiscalRequest( string CodigoRejeicao, string MensagemRejeicao)
ReprocessarTransmissaoSefazRequest( string UfAutorizadora, TipoServicoTransmissaoFiscal Servico, string? XmlEnvioAssinado, bool ValidarSchemaAntesTransmissao, string? SchemaSetName, Guid? LogIntegracaoFiscalId, string? CorrelationIdOriginal, string CorrelationId, string Motivo)
StatusServicoSefazResponse( Guid EmpresaId, Guid? FilialId, TipoDocumentoFiscal TipoDocumento, TipoAmbienteFiscal Ambiente, string UfAutorizadora, bool ComunicacaoOk, bool Disponivel, string? CodigoStatus, string? Motivo, bool DeveReprocessar, DateTimeOffset ConsultadoEm, IReadOnlyCollection<string> Alertas)
TransmissaoSefazResponse( Guid NotaFiscalId, StatusNotaFiscal StatusFiscal, bool ComunicacaoOk, bool Autorizada, string? CodigoStatus, string? Motivo, string? Protocolo, string? ChaveAcesso, bool DeveReprocessar)
TransmitirNotaFiscalSefazRequest( string UfAutorizadora, TipoServicoTransmissaoFiscal Servico, string? XmlEnvioAssinado, bool ValidarSchemaAntesTransmissao, string? SchemaSetName, string? CorrelationId)
XmlNotaFiscalResponse( Guid Id, TipoXmlFiscal Tipo, string HashSha256, string? Protocolo, string? ChaveAcesso, DateTimeOffset ArmazenadoEm)

```
### `Fiscal/Tributacao`

```csharp
AliquotaInterestadualResolvida( string UfOrigem, string UfDestino, decimal Aliquota, decimal AliquotaTabelada, bool AplicouAliquotaMercadoriaImportada, DateOnly VigenciaInicio, DateOnly? VigenciaFim)
FcpUfResolvido( string UfSigla, decimal Percentual, DateOnly VigenciaInicio, DateOnly? VigenciaFim)
TetoInssResolvido( decimal Valor, DateOnly VigenciaInicio, DateOnly? VigenciaFim)

```
### `Fiscal/Tributacao/Excecoes`

```csharp
AtualizarExcecaoFiscalNcmRequest( string Descricao, Guid NcmId, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, ExcecaoIcmsRequest? Icms, ExcecaoPisCofinsRequest? PisCofins)
AtualizarExcecaoFiscalRequest( string Descricao, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, ExcecaoIcmsRequest? Icms, ExcecaoPisCofinsRequest? PisCofins)
CriarExcecaoFiscalNcmRequest( Guid EmpresaId, Guid? FilialId, string Descricao, Guid NcmId, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, ExcecaoIcmsRequest? Icms, ExcecaoPisCofinsRequest? PisCofins)
CriarExcecaoFiscalRequest( Guid EmpresaId, Guid? FilialId, string Descricao, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, ExcecaoIcmsRequest? Icms, ExcecaoPisCofinsRequest? PisCofins)
ExcecaoFiscalNcmResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, Guid NcmId, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa, ExcecaoIcmsResponse? Icms, ExcecaoPisCofinsResponse? PisCofins)
ExcecaoFiscalNcmResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, Guid NcmId, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa)
ExcecaoFiscalResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa, ExcecaoIcmsResponse? Icms, ExcecaoPisCofinsResponse? PisCofins)
ExcecaoFiscalResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, string Uf, string? CodigoBeneficio, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa)
ExcecaoIcmsRequest( string? CstIcmsCodigo, string? CsosnCodigo, decimal Aliquota, decimal PercentualReducaoBase, decimal PercentualDiferimento, decimal? PercentualFcp, decimal PercentualCreditoSimplesNacional)
ExcecaoIcmsResponse( Guid Id, string? CstIcmsCodigo, string? CsosnCodigo, decimal Aliquota, decimal PercentualReducaoBase, decimal PercentualDiferimento, decimal? PercentualFcp, decimal PercentualCreditoSimplesNacional)
ExcecaoPisCofinsRequest( string CstPisCodigo, string CstCofinsCodigo, decimal AliquotaPis, decimal AliquotaCofins, TipoCalculoPisCofins TipoCalculo, decimal ValorPorUnidadePis, decimal ValorPorUnidadeCofins, bool IndicadorCreditaEntrada, bool ExcluirIcmsDaBase)
ExcecaoPisCofinsResponse( Guid Id, string CstPisCodigo, string CstCofinsCodigo, decimal AliquotaPis, decimal AliquotaCofins, TipoCalculoPisCofins TipoCalculo, decimal ValorPorUnidadePis, decimal ValorPorUnidadeCofins, bool IndicadorCreditaEntrada, bool ExcluirIcmsDaBase)
InativarExcecaoFiscalNcmRequest(string Motivo)
InativarExcecaoFiscalRequest(string Motivo)

```
### `Fiscal/Tributacao/Regras`

```csharp
AtualizarRegraFiscalOperacaoRequest( string Descricao, TipoCfop TipoOperacao, string? UfOrigem, string? UfDestino, RegimeTributario? RegimeEmpresa, IndicadorContribuinteIcms? IndicadorContribuinte, bool? ConsumidorFinal, Guid? NcmId, Guid? GrupoProdutoId, Guid? CfopId, int Prioridade, DateOnly VigenciaInicio, DateOnly? VigenciaFim, RegraIcmsRequest? Icms, RegraIpiRequest? Ipi, RegraPisCofinsRequest? PisCofins, RegraIssRequest? Iss, RegraRetencaoRequest? Retencao)
CriarRegraFiscalOperacaoRequest( Guid EmpresaId, Guid? FilialId, string Descricao, TipoCfop TipoOperacao, string? UfOrigem, string? UfDestino, RegimeTributario? RegimeEmpresa, IndicadorContribuinteIcms? IndicadorContribuinte, bool? ConsumidorFinal, Guid? NcmId, Guid? GrupoProdutoId, Guid? CfopId, int Prioridade, DateOnly VigenciaInicio, DateOnly? VigenciaFim, RegraIcmsRequest? Icms, RegraIpiRequest? Ipi, RegraPisCofinsRequest? PisCofins, RegraIssRequest? Iss, RegraRetencaoRequest? Retencao)
InativarRegraFiscalOperacaoRequest(string Motivo)
RegraFiscalOperacaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, TipoCfop TipoOperacao, string? UfOrigem, string? UfDestino, RegimeTributario? RegimeEmpresa, IndicadorContribuinteIcms? IndicadorContribuinte, bool? ConsumidorFinal, Guid? NcmId, Guid? GrupoProdutoId, Guid? CfopId, int Prioridade, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa, RegraIcmsResponse? Icms, RegraIpiResponse? Ipi, RegraPisCofinsResponse? PisCofins, RegraIssResponse? Iss, RegraRetencaoResponse? Retencao)
RegraFiscalOperacaoResumoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, TipoCfop TipoOperacao, string? UfOrigem, string? UfDestino, int Prioridade, DateOnly VigenciaInicio, DateOnly? VigenciaFim, bool Ativa)
RegraIcmsRequest( string? CstIcmsCodigo, string? CsosnCodigo, ModalidadeBaseCalculoIcms ModalidadeBaseCalculo, decimal Aliquota, decimal PercentualReducaoBase, decimal AliquotaInternaDestino, ModalidadeBaseCalculoIcmsSt ModalidadeBaseCalculoSt, decimal Mva, decimal MvaAjustada, decimal PercentualReducaoBaseSt, decimal? PercentualFcp, decimal? PercentualFcpSt, decimal PercentualDiferimento, decimal PercentualCreditoSimplesNacional, string? CodigoBeneficioFiscal, bool BaseDuplaDifal)
RegraIcmsResponse( Guid Id, string? CstIcmsCodigo, string? CsosnCodigo, ModalidadeBaseCalculoIcms ModalidadeBaseCalculo, decimal Aliquota, decimal PercentualReducaoBase, decimal AliquotaInternaDestino, ModalidadeBaseCalculoIcmsSt ModalidadeBaseCalculoSt, decimal Mva, decimal MvaAjustada, decimal PercentualReducaoBaseSt, decimal? PercentualFcp, decimal? PercentualFcpSt, decimal PercentualDiferimento, decimal PercentualCreditoSimplesNacional, string? CodigoBeneficioFiscal, bool BaseDuplaDifal)
RegraIpiRequest( string CstIpiCodigo, TipoCalculoIpi TipoCalculo, decimal Aliquota, decimal ValorPorUnidade, string CodigoEnquadramento, bool IndicadorCreditaEntrada)
RegraIpiResponse( Guid Id, string CstIpiCodigo, TipoCalculoIpi TipoCalculo, decimal Aliquota, decimal ValorPorUnidade, string CodigoEnquadramento, bool IndicadorCreditaEntrada)
RegraIssRequest( string CodigoServicoLc116, decimal Aliquota, MunicipioIncidenciaIss MunicipioIncidencia, bool IndicadorRetido, decimal PercentualReducaoBase)
RegraIssResponse( Guid Id, string CodigoServicoLc116, decimal Aliquota, MunicipioIncidenciaIss MunicipioIncidencia, bool IndicadorRetido, decimal PercentualReducaoBase)
RegraPisCofinsRequest( string CstPisCodigo, string CstCofinsCodigo, RegimePisCofins Regime, decimal AliquotaPis, decimal AliquotaCofins, TipoCalculoPisCofins TipoCalculo, decimal ValorPorUnidadePis, decimal ValorPorUnidadeCofins, bool IndicadorCreditaEntrada, bool ExcluirIcmsDaBase)
RegraPisCofinsResponse( Guid Id, string CstPisCodigo, string CstCofinsCodigo, RegimePisCofins Regime, decimal AliquotaPis, decimal AliquotaCofins, TipoCalculoPisCofins TipoCalculo, decimal ValorPorUnidadePis, decimal ValorPorUnidadeCofins, bool IndicadorCreditaEntrada, bool ExcluirIcmsDaBase)
RegraRetencaoRequest( decimal IrrfAliquota, decimal IrrfBaseMinima, decimal IrrfValorMinimoRecolhimento, decimal InssAliquota, decimal CsllAliquota, decimal PisRetidoAliquota, decimal CofinsRetidoAliquota, decimal PccMinimoDispensa)
RegraRetencaoResponse( Guid Id, decimal IrrfAliquota, decimal IrrfBaseMinima, decimal IrrfValorMinimoRecolhimento, decimal InssAliquota, decimal CsllAliquota, decimal PisRetidoAliquota, decimal CofinsRetidoAliquota, decimal PccMinimoDispensa)

```
### `Frota`

```csharp
AbastecimentoResponse(Guid Id, Guid VeiculoId, Guid? MotoristaId, DateTimeOffset Data, decimal Odometro, decimal Litros, decimal ValorLitro, decimal ValorTotal, TipoCombustivel Combustivel, bool TanqueCheio, string? Posto)
AlterarStatusVeiculoRequest(StatusVeiculo Status)
AtualizarMotoristaRequest(string Nome, string? Cpf, string CnhNumero, string CnhCategoria, DateTimeOffset CnhValidade, string? Telefone)
AtualizarVeiculoRequest(string Modelo, string? Marca, int? Ano, TipoVeiculo Tipo, TipoCombustivel Combustivel, string? Renavam)
CancelarViagemRequest(string Motivo)
CriarMotoristaRequest(Guid EmpresaId, Guid? FilialId, string Nome, string? Cpf, string CnhNumero, string CnhCategoria, DateTimeOffset CnhValidade, string? Telefone)
CriarVeiculoRequest(Guid EmpresaId, Guid? FilialId, string Placa, string Modelo, string? Marca, int? Ano, TipoVeiculo Tipo, TipoCombustivel Combustivel, decimal OdometroInicial, string? Renavam)
DespesaVeiculoResponse(Guid Id, Guid VeiculoId, TipoDespesaVeiculo Tipo, DateTimeOffset Data, decimal Valor, string Descricao, Guid? FornecedorId)
DocumentoVeiculoResponse(Guid Id, Guid VeiculoId, TipoDocumentoVeiculo Tipo, string? Numero, DateTimeOffset? DataEmissao, DateTimeOffset DataVencimento, decimal? Valor, bool Vencido)
EncerrarViagemRequest(decimal OdometroChegada, DateTimeOffset? DataChegada, string? Observacao)
IniciarViagemRequest(Guid VeiculoId, Guid MotoristaId, string Origem, string Destino, DateTimeOffset? DataSaida, decimal OdometroSaida)
ManutencaoResponse(Guid Id, Guid VeiculoId, TipoManutencao Tipo, DateTimeOffset Data, decimal Odometro, string Descricao, decimal Valor, Guid? FornecedorId, StatusManutencao StatusManutencao, DateTimeOffset? DataConclusao)
MotoristaResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, string? Cpf, string CnhNumero, string CnhCategoria, DateTimeOffset CnhValidade, string? Telefone, bool CnhVencida)
RegistrarAbastecimentoRequest(Guid VeiculoId, Guid? MotoristaId, DateTimeOffset? Data, decimal Odometro, decimal Litros, decimal ValorLitro, TipoCombustivel Combustivel, bool TanqueCheio, string? Posto)
RegistrarDespesaVeiculoRequest(Guid VeiculoId, TipoDespesaVeiculo Tipo, DateTimeOffset? Data, decimal Valor, string Descricao, Guid? FornecedorId)
RegistrarDocumentoVeiculoRequest(Guid VeiculoId, TipoDocumentoVeiculo Tipo, string? Numero, DateTimeOffset? DataEmissao, DateTimeOffset DataVencimento, decimal? Valor)
RegistrarManutencaoRequest(Guid VeiculoId, TipoManutencao Tipo, DateTimeOffset? Data, decimal Odometro, string Descricao, decimal Valor, Guid? FornecedorId)
VeiculoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Placa, string Modelo, string? Marca, int? Ano, TipoVeiculo Tipo, TipoCombustivel Combustivel, decimal OdometroAtual, string? Renavam, StatusVeiculo StatusVeiculo)
ViagemResponse(Guid Id, Guid VeiculoId, Guid MotoristaId, string Origem, string Destino, DateTimeOffset DataSaida, decimal OdometroSaida, DateTimeOffset? DataChegada, decimal? OdometroChegada, decimal? Distancia, StatusViagem StatusViagem, string? Observacao)

```
### `Infraestrutura/Producao`

```csharp
InfraestruturaBackupStatusResponse( InfraestruturaHealthStatus Status, DateTimeOffset VerificadoEm, string Diretorio, bool DiretorioExiste, string? UltimoArquivo, DateTimeOffset? UltimoBackupEm, long? TamanhoBytes, string Mensagem)
InfraestruturaDependenciaResponse( string Nome, InfraestruturaHealthStatus Status, string Mensagem, long? LatenciaMs, IReadOnlyDictionary<string, string> Detalhes)
InfraestruturaHealthResponse( InfraestruturaHealthStatus Status, DateTimeOffset VerificadoEm, string Aplicacao, string Ambiente, long DuracaoMs, IReadOnlyCollection<InfraestruturaDependenciaResponse> Dependencias)

```
### `Integracoes`

```csharp
AtualizarIntegracaoExternaRequest( string Nome, TipoIntegracaoExterna Tipo, string? Descricao, string Motivo)
CriarEventoIntegracaoRequest( Guid EmpresaId, Guid? FilialId, Guid? IntegracaoExternaId, string TipoEvento, DirecaoEventoIntegracao Direcao, string? PayloadEntradaSanitizado, string? EntidadeOrigem, Guid? EntidadeOrigemId, string? CorrelationId, int MaxTentativas)
CriarIntegracaoExternaRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, TipoIntegracaoExterna Tipo, string? Descricao)
EventoIntegracaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid? IntegracaoExternaId, string TipoEvento, DirecaoEventoIntegracao Direcao, SituacaoEventoIntegracao Situacao, string? PayloadEntradaSanitizado, string? PayloadSaidaSanitizado, string? ErroSanitizado, string? EntidadeOrigem, Guid? EntidadeOrigemId, string CorrelationId, int Tentativas, int MaxTentativas, DateTimeOffset CriadoEmEvento, DateTimeOffset? ProcessadoEm, DateTimeOffset? ProximoProcessamentoEm)
EventosIntegracaoPaginadosResponse( IReadOnlyCollection<EventoIntegracaoResponse> Items, int Page, int PageSize, int TotalItems, int TotalPages, bool HasPreviousPage, bool HasNextPage)
IntegracaoExternaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, TipoIntegracaoExterna Tipo, string? Descricao, bool Ativa)
RegistrarFalhaIntegracaoRequest(string ErroSanitizado, int DelayMinutos = 15)
RegistrarSucessoIntegracaoRequest(string? PayloadSaidaSanitizado)
ReprocessarEventoIntegracaoRequest(string Motivo, int DelayMinutos = 1)

```
### `Notificacoes`

```csharp
ContagemNotificacoesResponse(int NaoLidas)
CriarNotificacaoInternaRequest( Guid EmpresaId, Guid? FilialId, Guid UsuarioDestinoId, string Titulo, string Mensagem, string Categoria, string ModuloOrigem, SeveridadeNotificacao Severidade, string? EntidadeOrigem, Guid? EntidadeOrigemId, string? AcaoUrl, DateTimeOffset? ExpiraEm)
ListarNotificacoesRequest( Guid? EmpresaId, Guid? FilialId, Guid? UsuarioDestinoId, StatusNotificacao? Situacao, SeveridadeNotificacao? Severidade, string? Categoria, string? ModuloOrigem, bool IncluirExpiradas = false, int Page = 1, int PageSize = 20)
NotificacaoInternaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid UsuarioDestinoId, string Titulo, string Mensagem, string Categoria, string ModuloOrigem, SeveridadeNotificacao Severidade, StatusNotificacao Situacao, string? EntidadeOrigem, Guid? EntidadeOrigemId, string? AcaoUrl, DateTimeOffset CriadaEm, DateTimeOffset? LidaEm, DateTimeOffset? ArquivadaEm, DateTimeOffset? ExpiraEm)
NotificacoesPaginadasResponse( IReadOnlyCollection<NotificacaoInternaResponse> Items, int Page, int PageSize, int TotalItems, int TotalPages, bool HasPreviousPage, bool HasNextPage)

```
### `Patrimonio/Bens`

```csharp
AtualizarBemRequest( string Descricao, CategoriaBemPatrimonial Categoria, int VidaUtilMeses, decimal ValorResidual, Guid? ContaAtivoId, Guid? ContaDepreciacaoAcumuladaId, Guid? ContaDespesaDepreciacaoId)
BaixarBemRequest(DateTimeOffset? Data, MotivoBaixaPatrimonial Motivo, string Justificativa, decimal? ValorBaixa)
BemPatrimonialResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, CategoriaBemPatrimonial Categoria, DateTimeOffset DataAquisicao, decimal ValorAquisicao, decimal ValorResidual, int VidaUtilMeses, MetodoDepreciacao Metodo, Guid? SetorId, Guid? ResponsavelId, Guid? ContaAtivoId, Guid? ContaDepreciacaoAcumuladaId, Guid? ContaDespesaDepreciacaoId, decimal DepreciacaoAcumulada, int MesesDepreciados, int? UltimaCompetenciaDepreciada, decimal ValorContabilAtual, StatusBemPatrimonial StatusBem, bool Bloqueado, string? MotivoBloqueio, DateTimeOffset? DataBaixa, MotivoBaixaPatrimonial? MotivoBaixa, string? JustificativaBaixa, decimal? ValorBaixa, IReadOnlyList<MovimentacaoBemResponse> Movimentacoes, IReadOnlyList<DepreciacaoBemResponse> Depreciacoes)
BloquearBemRequest(string Motivo)
CadastrarBemRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, CategoriaBemPatrimonial Categoria, DateTimeOffset DataAquisicao, decimal ValorAquisicao, decimal ValorResidual, int VidaUtilMeses, MetodoDepreciacao Metodo, Guid? SetorId, Guid? ResponsavelId, Guid? ContaAtivoId, Guid? ContaDepreciacaoAcumuladaId, Guid? ContaDespesaDepreciacaoId)
DepreciacaoBemResponse( Guid Id, int Ano, int Mes, int Competencia, DateTimeOffset Data, decimal Valor, decimal ValorContabilApos, Guid? LancamentoContabilId)
MovimentacaoBemResponse( Guid Id, int Sequencia, Guid? SetorAnteriorId, Guid? SetorNovoId, Guid? ResponsavelAnteriorId, Guid? ResponsavelNovoId, DateTimeOffset Data, string? Observacao)
TransferirBemRequest(Guid? SetorNovoId, Guid? ResponsavelNovoId, DateTimeOffset? Data, string? Observacao)

```
### `Patrimonio/Depreciacao`

```csharp
BemDepreciadoResponse( Guid BemId, string Codigo, decimal Valor, decimal ValorContabilApos, bool Contabilizado, Guid? LancamentoContabilId)
ProcessarDepreciacaoPeriodoRequest(Guid EmpresaId, Guid? FilialId, int Ano, int Mes)
ProcessarDepreciacaoPeriodoResponse( int Competencia, int TotalBensDepreciados, decimal ValorTotalDepreciado, int TotalContabilizados, IReadOnlyList<BemDepreciadoResponse> Bens)

```
### `Patrimonio/Inventarios`

```csharp
AbrirInventarioRequest( Guid EmpresaId, Guid? FilialId, string Descricao, DateTimeOffset? DataReferencia, IReadOnlyList<Guid>? BemIds)
InventarioPatrimonialResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Descricao, DateTimeOffset DataReferencia, StatusInventarioPatrimonial StatusInventario, DateTimeOffset? EncerradoEm, int TotalDivergencias, IReadOnlyList<ItemInventarioResponse> Itens)
ItemInventarioResponse( Guid Id, Guid BemPatrimonialId, Guid? SetorEsperadoId, SituacaoItemInventario Situacao, Guid? SetorEncontradoId, string? Observacao, bool Divergencia)
RegistrarContagemRequest(Guid ItemId, bool Localizado, Guid? SetorEncontradoId, string? Observacao)

```
### `Pdv`

```csharp
AbrirCaixaRequest(Guid EmpresaId, Guid? FilialId, string Codigo, string Terminal, decimal ValorAbertura)
CaixaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, Guid OperadorId, string Terminal, DateTimeOffset DataAbertura, decimal ValorAbertura, StatusCaixa StatusCaixa, DateTimeOffset? DataFechamento, decimal TotalSuprimentos, decimal TotalSangrias, decimal TotalRecebimentoDinheiro, decimal TotalRecebimentoCartao, decimal TotalRecebimentoPix, decimal TotalRecebimentoOutro, decimal TotalVendas, decimal SaldoDinheiroEsperado, decimal? ValorEsperadoDinheiro, decimal? ValorInformadoFechamento, decimal? DiferencaFechamento, IReadOnlyList<MovimentoCaixaResponse> Movimentos)
FecharCaixaRequest(decimal ValorInformado)
ItemVendaPdvRequest(Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto)
ItemVendaPdvResponse(Guid Id, int Sequencia, Guid ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, decimal ValorTotal)
MovimentoCaixaRequest(decimal Valor, string Descricao)
MovimentoCaixaResponse(Guid Id, int Sequencia, TipoMovimentoCaixa Tipo, MeioPagamento MeioPagamento, decimal Valor, string Descricao, Guid? VendaPdvId, DateTimeOffset Data)
PagamentoVendaPdvRequest(Guid FormaPagamentoId, MeioPagamento Meio, decimal Valor)
PagamentoVendaPdvResponse(Guid Id, int Sequencia, Guid FormaPagamentoId, MeioPagamento Meio, decimal Valor)
RegistrarVendaPdvRequest( Guid CaixaId, Guid LocalEstoqueId, Guid? ClienteId, IReadOnlyList<ItemVendaPdvRequest> Itens, IReadOnlyList<PagamentoVendaPdvRequest> Pagamentos)
VendaPdvResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid CaixaId, Guid OperadorId, Guid LocalEstoqueId, Guid? ClienteId, DateTimeOffset DataVenda, StatusVendaPdv StatusVenda, decimal ValorBruto, decimal ValorDesconto, decimal ValorLiquido, decimal ValorPago, decimal Troco, IReadOnlyList<ItemVendaPdvResponse> Itens, IReadOnlyList<PagamentoVendaPdvResponse> Pagamentos)

```
### `Pessoas/Classificacoes`

```csharp
AtualizarClassificacaoPessoaRequest( Guid EmpresaId, string Nome, string? Descricao)
ClassificacaoPessoaResponse( Guid Id, Guid EmpresaId, string Codigo, string Nome, string? Descricao, EntityStatus Status)
CriarClassificacaoPessoaRequest( Guid EmpresaId, string Codigo, string Nome, string? Descricao)
InativarClassificacaoPessoaRequest( Guid EmpresaId, string Motivo)

```
### `Pessoas/Clientes`

```csharp
AlterarBloqueioCreditoRequest(string Motivo)
AtualizarClienteRequest(decimal LimiteCredito, string? Observacao)
ClienteResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, decimal LimiteCredito, bool CreditoBloqueado, string? MotivoBloqueioCredito, string? Observacao, Guid? TabelaPrecoPadraoId, Guid? CondicaoPagamentoPadraoId, Guid? ClassificacaoId, int? DiaVencimentoPreferencial, bool PermiteVendaAPrazo, EntityStatus Status)
ConfigurarComercialClienteRequest( Guid? TabelaPrecoPadraoId, Guid? CondicaoPagamentoPadraoId, Guid? ClassificacaoId, int? DiaVencimentoPreferencial, bool PermiteVendaAPrazo)
CriarClienteRequest( Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, decimal LimiteCredito, string? Observacao)

```
### `Pessoas/Fornecedores`

```csharp
AtualizarFornecedorRequest(string? Observacao)
ConfigurarCompraFornecedorRequest( Guid? CondicaoPagamentoPadraoId, int? PrazoEntregaMedio, string? CategoriaFornecimento)
CriarFornecedorRequest( Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, string? Observacao)
FornecedorResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, string? Observacao, Guid? CondicaoPagamentoPadraoId, int? PrazoEntregaMedio, bool Homologado, string? CategoriaFornecimento, EntityStatus Status)
RevogarHomologacaoFornecedorRequest(string Motivo)

```
### `Pessoas/Pessoas`

```csharp
AdicionarContatoPessoaRequest( TipoContato Tipo, string Valor, string? Nome, bool Principal)
AdicionarEnderecoPessoaRequest( TipoEndereco Tipo, string Logradouro, string Numero, string? Complemento, string Bairro, string Cidade, string Uf, string Cep, bool Principal)
AtualizarContatoPessoaRequest( TipoContato Tipo, string Valor, string? Nome, bool Principal)
AtualizarDadosFiscaisPessoaRequest( IndicadorContribuinteIcms? IndicadorContribuinteIcms, string? InscricaoEstadualSt, string? Suframa, RegimeTributario? RegimeTributarioParceiro, string? MunicipioIbgeCodigo, string? PaisCodigoBacen)
AtualizarEnderecoPessoaRequest( TipoEndereco Tipo, string Logradouro, string Numero, string? Complemento, string Bairro, string Cidade, string Uf, string Cep, bool Principal)
AtualizarPessoaRequest( string NomeRazaoSocial, string? NomeFantasia, string? InscricaoEstadual, string? InscricaoMunicipal, string? Observacao)
BackfillMunicipiosEnderecosPessoaRequest(Guid EmpresaId, Guid? FilialId)
BackfillMunicipiosEnderecosPessoaResponse( int Analisados, int Vinculados, IReadOnlyList<DivergenciaMunicipioEnderecoResponse> Divergencias)
BloquearPessoaRequest(string Motivo)
ContatoPessoaResponse( Guid Id, Guid PessoaId, TipoContato Tipo, string Valor, string? Nome, bool Principal, EntityStatus Status)
CriarPessoaRequest( Guid EmpresaId, Guid? FilialId, TipoPessoa TipoPessoa, string NomeRazaoSocial, string? NomeFantasia, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal, string? Observacao)
DivergenciaMunicipioEnderecoResponse( Guid EnderecoId, Guid PessoaId, string Cidade, string Uf, string Motivo)
EnderecoPessoaResponse( Guid Id, Guid PessoaId, TipoEndereco Tipo, string Logradouro, string Numero, string? Complemento, string Bairro, string Cidade, string Uf, string Cep, bool Principal, EntityStatus Status, Guid? MunicipioIbgeId)
InativarPessoaRequest(string Motivo)
PessoaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, TipoPessoa TipoPessoa, string NomeRazaoSocial, string? NomeFantasia, string Documento, string? InscricaoEstadual, string? InscricaoMunicipal, IndicadorContribuinteIcms? IndicadorContribuinteIcms, IndicadorIeDestinatario? IndicadorIeDestinatario, string? InscricaoEstadualSt, string? Suframa, RegimeTributario? RegimeTributarioParceiro, Guid? MunicipioIbgeId, Guid? PaisId, string? Observacao, bool Bloqueada, string? MotivoBloqueio, EntityStatus Status)
VincularMunicipioEnderecoPessoaRequest(string? MunicipioIbgeCodigo)

```
### `Pessoas/Transportadoras`

```csharp
AtualizarTransportadoraRequest( TipoFrete TipoFretePadrao, string? Rntrc, string? Observacao)
CriarTransportadoraRequest( Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, TipoFrete TipoFretePadrao, string? Rntrc, string? Observacao)
TransportadoraResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, string? Rntrc, TipoFrete TipoFretePadrao, string? Observacao, EntityStatus Status)

```
### `Portaria`

```csharp
CancelarPreAutorizacaoRequest(string Motivo)
CancelarRegistroAcessoRequest(string Motivo)
CriarPreAutorizacaoRequest(Guid EmpresaId, Guid? FilialId, string NomeVisitante, TipoDocumentoAcesso DocumentoTipo, string DocumentoNumero, TipoAcesso TipoAcesso, string Destino, string? Motivo, string? PlacaVeiculo, string? Autorizante, DateTimeOffset ValidadeInicio, DateTimeOffset ValidadeFim)
OcorrenciaAcessoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid? RegistroAcessoId, TipoOcorrenciaAcesso Tipo, GravidadeOcorrencia Gravidade, string Descricao, DateTimeOffset DataOcorrencia, StatusOcorrenciaAcesso StatusOcorrenciaAcesso, string? Resolucao, DateTimeOffset? DataResolucao)
PreAutorizacaoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string NomeVisitante, TipoDocumentoAcesso DocumentoTipo, string DocumentoNumero, TipoAcesso TipoAcesso, string Destino, string? Motivo, string? PlacaVeiculo, string? Autorizante, DateTimeOffset ValidadeInicio, DateTimeOffset ValidadeFim, StatusPreAutorizacao StatusPreAutorizacao, bool Expirada)
RegistrarEntradaRequest(Guid EmpresaId, Guid? FilialId, Guid? PreAutorizacaoId, string NomeVisitante, TipoDocumentoAcesso DocumentoTipo, string DocumentoNumero, TipoAcesso TipoAcesso, string Destino, string? Motivo, string? PlacaVeiculo, DateTimeOffset? DataEntrada)
RegistrarOcorrenciaAcessoRequest(Guid EmpresaId, Guid? FilialId, Guid? RegistroAcessoId, TipoOcorrenciaAcesso Tipo, GravidadeOcorrencia Gravidade, string Descricao, DateTimeOffset? DataOcorrencia)
RegistrarSaidaRequest(DateTimeOffset? DataSaida, string? Observacao)
RegistroAcessoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, Guid? PreAutorizacaoId, string NomeVisitante, TipoDocumentoAcesso DocumentoTipo, string DocumentoNumero, TipoAcesso TipoAcesso, string Destino, string? Motivo, string? PlacaVeiculo, DateTimeOffset DataEntrada, bool DocumentoValidado, DateTimeOffset? DataValidacaoDocumento, string? ValidadoPor, string? ObservacaoValidacao, DateTimeOffset? DataSaida, int? PermanenciaMinutos, string? ObservacaoSaida, StatusRegistroAcesso StatusRegistroAcesso)
ResolverOcorrenciaAcessoRequest(string Resolucao)
ValidarDocumentoRequest(bool Aprovado, string? ValidadoPor, string? Observacao)

```
### `Producao/FichasTecnicas`

```csharp
AdicionarComponenteFichaTecnicaRequest( Guid ProdutoId, decimal Quantidade, decimal PerdaPercentual, string? Observacao)
CriarFichaTecnicaRequest( Guid EmpresaId, Guid? FilialId, string Codigo, Guid ProdutoId, string Descricao, decimal QuantidadeBase, string? Versao)
FichaTecnicaComponenteResponse( Guid Id, int Sequencia, Guid ProdutoId, decimal Quantidade, decimal PerdaPercentual, string? Observacao)
FichaTecnicaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, Guid ProdutoId, string Descricao, decimal QuantidadeBase, string? Versao, StatusFichaTecnica StatusFicha, IReadOnlyList<FichaTecnicaComponenteResponse> Componentes)

```
### `Producao/OrdensProducao`

```csharp
CancelarOrdemProducaoRequest(string Motivo)
CriarOrdemProducaoRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid ProdutoId, decimal QuantidadePlanejada, DateTimeOffset DataPlanejada, Guid? LocalEstoqueId, string? Observacao)
EncerrarOrdemProducaoRequest(string? Observacao)
NecessidadeComponenteResponse( Guid ProdutoId, Guid? LocalEstoqueId, decimal QuantidadeNecessaria, decimal QuantidadeDisponivel, decimal QuantidadeFaltante)
NecessidadeOrdemProducaoResponse( Guid OrdemProducaoId, IReadOnlyList<NecessidadeComponenteResponse> Componentes)
OrdemProducaoApontamentoResponse( Guid Id, TipoApontamentoProducao Tipo, Guid? ProdutoId, decimal Quantidade, decimal? Horas, decimal? CustoHoraInformado, string? Observacao, DateTimeOffset DataApontamento)
OrdemProducaoComponenteResponse( Guid Id, int Sequencia, Guid ProdutoId, Guid? LocalEstoqueId, decimal QuantidadeNecessaria, decimal QuantidadeReservada, decimal QuantidadeConsumida, decimal QuantidadePerda, Guid? ReservaEstoqueId, decimal CustoUnitarioSnapshot)
OrdemProducaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid ProdutoId, Guid FichaTecnicaId, Guid? LocalEstoqueId, decimal QuantidadePlanejada, decimal QuantidadeProduzida, decimal QuantidadePerdas, StatusOrdemProducao StatusOrdem, decimal? CustoConsolidado, string? Observacao, IReadOnlyList<OrdemProducaoComponenteResponse> Componentes, IReadOnlyList<OrdemProducaoApontamentoResponse> Apontamentos)
RegistrarApontamentoOrdemProducaoRequest( TipoApontamentoProducao Tipo, Guid? ProdutoId, decimal Quantidade, decimal? Horas, decimal? CustoHoraInformado, string? Observacao, DateTimeOffset? DataApontamento)

```
### `Produtos/Categorias`

```csharp
AtualizarCategoriaProdutoRequest(string Nome, string? Descricao)
CategoriaProdutoResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao, EntityStatus Status)
CriarCategoriaProdutoRequest(Guid EmpresaId, Guid? FilialId, string Codigo, string Nome, string? Descricao)
InativarCategoriaProdutoRequest(string Motivo)

```
### `Produtos/Marcas`

```csharp
AtualizarMarcaRequest(string Nome, string? Descricao)
CriarMarcaRequest(Guid EmpresaId, Guid? FilialId, string Nome, string? Descricao)
InativarMarcaRequest(string Motivo)
MarcaResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, string? Descricao, EntityStatus Status)

```
### `Produtos/Produtos`

```csharp
AdicionarCodigoBarrasProdutoRequest(string Codigo, string? Descricao, bool Principal)
AtualizarDadosFiscaisProdutoRequest( string? NcmCodigo, string? CestCodigo, string? OrigemMercadoriaCodigo, TipoItemSped? TipoItemSped, string? UnidadeTributavelSigla, Guid? UnidadeMedidaTributavelId, string? ExTipi, string? CodigoBeneficioFiscalPadrao, TipoItemFiscal? TipoItemFiscal, string? CodigoFiscalExterno)
AtualizarPrecoCustoProdutoRequest(decimal PrecoVendaBase, decimal CustoReferencial)
AtualizarProdutoRequest( string Descricao, string? DescricaoComercial, TipoProduto TipoProduto, Guid UnidadeMedidaId, Guid? CategoriaProdutoId, Guid? MarcaId, bool ControlaEstoque, bool PermiteVenda, bool PermiteCompra, bool ControlaQualidade, string? Observacao)
CodigoBarrasProdutoResponse(Guid Id, string Codigo, string? Descricao, bool Principal, EntityStatus Status)
CriarProdutoRequest( Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, string? DescricaoComercial, TipoProduto TipoProduto, Guid UnidadeMedidaId, Guid? CategoriaProdutoId, Guid? MarcaId, decimal PrecoVendaBase, decimal CustoReferencial, bool ControlaEstoque, bool PermiteVenda, bool PermiteCompra, bool ControlaQualidade, string? Observacao)
InativarProdutoRequest(string Motivo)
ProdutoFornecedorResponse(Guid Id, Guid FornecedorId, string CodigoFornecedor, string? DescricaoFornecedor, bool Principal, EntityStatus Status)
ProdutoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, string Descricao, string? DescricaoComercial, TipoProduto TipoProduto, Guid UnidadeMedidaId, Guid? CategoriaProdutoId, Guid? MarcaId, decimal PrecoVendaBase, decimal CustoReferencial, bool ControlaEstoque, bool PermiteVenda, bool PermiteCompra, bool ControlaQualidade, Guid? NcmId, string? Ncm, Guid? CestId, string? Cest, Guid? OrigemMercadoriaId, string? OrigemMercadoriaCodigo, TipoItemSped? TipoItemSped, TipoItemFiscal? TipoItemFiscal, Guid? UnidadeTributavelOficialId, string? UnidadeTributavelSigla, Guid? UnidadeMedidaTributavelId, string? GeneroItem, string? ExTipi, string? CodigoBeneficioFiscalPadrao, string? CodigoFiscalExterno, string? Observacao, EntityStatus Status, IReadOnlyCollection<CodigoBarrasProdutoResponse> CodigosBarras, IReadOnlyCollection<ProdutoFornecedorResponse> Fornecedores)
VincularProdutoFornecedorRequest(Guid FornecedorId, string CodigoFornecedor, string? DescricaoFornecedor, bool Principal)

```
### `Produtos/UnidadesMedida`

```csharp
AtualizarUnidadeMedidaRequest(string Descricao, int CasasDecimais, bool PermiteFracionado)
CriarUnidadeMedidaRequest(Guid EmpresaId, Guid? FilialId, string Sigla, string Descricao, int CasasDecimais, bool PermiteFracionado)
InativarUnidadeMedidaRequest(string Motivo)
UnidadeMedidaResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Sigla, string Descricao, int CasasDecimais, bool PermiteFracionado, EntityStatus Status)

```
### `Qualidade/Inspecoes`

```csharp
AdicionarCriterioRequest(string Descricao, bool Critico, string? ValorEsperado)
CriarInspecaoRequest( Guid EmpresaId, Guid? FilialId, OrigemInspecao Origem, Guid? OrigemId, Guid ProdutoId, decimal Quantidade, Guid? LocalEstoqueId, Guid? ResponsavelId, DateTimeOffset? DataInspecao, string? Observacao, IReadOnlyList<CriterioInspecaoItemRequest>? Criterios)
CriterioInspecaoItemRequest(string Descricao, bool Critico, string? ValorEsperado)
CriterioInspecaoResponse( Guid Id, int Sequencia, string Descricao, bool Critico, string? ValorEsperado, string? ValorMedido, ResultadoCriterio Resultado, string? Observacao)
EncerrarInspecaoRequest(string Evidencia)
InspecaoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Codigo, OrigemInspecao Origem, Guid? OrigemId, Guid ProdutoId, decimal Quantidade, Guid? LocalEstoqueId, Guid? ResponsavelId, DateTimeOffset DataInspecao, string? Observacao, StatusInspecao StatusInspecao, Guid? BloqueioEstoqueId, string? Evidencia, DateTimeOffset? EncerradaEm, IReadOnlyList<CriterioInspecaoResponse> Criterios)
RegistrarResultadoCriterioRequest(Guid CriterioId, bool Conforme, string? ValorMedido, string? Observacao)
ReprovarInspecaoRequest(string Descricao)

```
### `Qualidade/NaoConformidades`

```csharp
AcaoCorretivaResponse( Guid Id, int Sequencia, string Descricao, Guid? ResponsavelId, DateTimeOffset? Prazo, StatusAcaoCorretiva StatusAcao, DateTimeOffset? ConcluidaEm, string? MotivoCancelamento)
AdicionarAcaoCorretivaRequest(string Descricao, Guid? ResponsavelId, DateTimeOffset? Prazo)
CancelarAcaoCorretivaRequest(string Motivo)
NaoConformidadeResponse( Guid Id, Guid EmpresaId, Guid? FilialId, Guid InspecaoId, Guid ProdutoId, string Descricao, bool Critica, StatusNaoConformidade StatusNaoConformidade, DateTimeOffset? EncerradaEm, IReadOnlyList<AcaoCorretivaResponse> Acoes)

```
### `Relatorios`

```csharp
IndicadoresAdministrativosData( int EmpresasAtivas, int FiliaisAtivas, int PessoasAtivas, int ClientesAtivos, int FornecedoresAtivos)
IndicadoresAdministrativosResponse( int EmpresasAtivas, int FiliaisAtivas, int PessoasAtivas, int ClientesAtivos, int FornecedoresAtivos)
IndicadoresComprasData( int PedidosTotal, int PedidosAbertos, int PedidosAprovados, int PedidosRecebidos, int PedidosCancelados, decimal ValorTotal)
IndicadoresComprasResponse( int PedidosTotal, int PedidosAbertos, int PedidosAprovados, int PedidosRecebidos, int PedidosCancelados, decimal ValorTotal)
IndicadoresEstoqueData( int LocaisAtivos, int ProdutosComSaldo, decimal QuantidadeAtual, decimal QuantidadeReservada, decimal QuantidadeDisponivel)
IndicadoresEstoqueResponse( int LocaisAtivos, int ProdutosComSaldo, decimal QuantidadeAtual, decimal QuantidadeReservada, decimal QuantidadeDisponivel)
IndicadoresFinanceiroData( int ContasReceberEmAberto, decimal ValorReceberEmAberto, int ContasPagarEmAberto, decimal ValorPagarEmAberto, decimal SaldoFinanceiroProjetado)
IndicadoresFinanceiroResponse( int ContasReceberEmAberto, decimal ValorReceberEmAberto, int ContasPagarEmAberto, decimal ValorPagarEmAberto, decimal SaldoFinanceiroProjetado)
IndicadoresFiscalData( int NotasTotal, int NotasAutorizadas, int NotasRejeitadas, int NotasCanceladas, decimal ValorAutorizado)
IndicadoresFiscalResponse( int NotasTotal, int NotasAutorizadas, int NotasRejeitadas, int NotasCanceladas, decimal ValorAutorizado)
IndicadoresProdutosData( int ProdutosAtivos, int ProdutosInativos, int CategoriasAtivas, int UnidadesAtivas, int MarcasAtivas)
IndicadoresProdutosResponse( int ProdutosAtivos, int ProdutosInativos, int CategoriasAtivas, int UnidadesAtivas, int MarcasAtivas)
IndicadoresVendasData( int PedidosTotal, int PedidosAbertos, int PedidosAprovados, int PedidosFaturados, int PedidosCancelados, decimal ValorTotal)
IndicadoresVendasResponse( int PedidosTotal, int PedidosAbertos, int PedidosAprovados, int PedidosFaturados, int PedidosCancelados, decimal ValorTotal)
RelatorioOperacionalData( IndicadoresAdministrativosData Administracao, IndicadoresProdutosData Produtos, IndicadoresEstoqueData Estoque, IndicadoresVendasData Vendas, IndicadoresComprasData Compras, IndicadoresFinanceiroData Financeiro, IndicadoresFiscalData Fiscal)
RelatorioOperacionalFiltro(Guid EmpresaId, Guid? FilialId, DateTimeOffset? Inicio, DateTimeOffset? Fim)
RelatorioOperacionalGeralResponse( Guid EmpresaId, Guid? FilialId, DateTimeOffset? Inicio, DateTimeOffset? Fim, DateTimeOffset GeradoEm, IndicadoresAdministrativosResponse Administracao, IndicadoresProdutosResponse Produtos, IndicadoresEstoqueResponse Estoque, IndicadoresVendasResponse Vendas, IndicadoresComprasResponse Compras, IndicadoresFinanceiroResponse Financeiro, IndicadoresFiscalResponse Fiscal)

```
### `Relatorios/Gerenciais`

```csharp
ContextoRelatorioGerencialResponse(Guid? EmpresaId, Guid? FilialId)
DashboardGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, RelatorioVendasGerencialResponse Vendas, RelatorioComprasGerencialResponse Compras, RelatorioFinanceiroGerencialResponse Financeiro, RelatorioEstoqueGerencialResponse Estoque, RelatorioFiscalGerencialResponse Fiscal, RelatorioProducaoGerencialResponse Producao)
PeriodoRelatorioGerencialResponse(DateOnly DataInicial, DateOnly DataFinal)
RelatorioComprasGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long TotalPedidos, long TotalItens, long TotalFornecedoresComPedido, long RecebimentosRegistrados, long PedidosComFinanceiroGerado)
RelatorioEstoqueGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long InventariosAbertos, long InventariosEmContagem, long InventariosConcluidos, long InventariosCancelados, long AjustesEntrada, long AjustesSaida, decimal QuantidadeEntradaAjustada, decimal QuantidadeSaidaAjustada, long BloqueiosAtivos, long BloqueiosLiberados, long MovimentosRegistrados)
RelatorioFinanceiroGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long ContasReceber, long ContasPagar, decimal ValorReceberOriginal, decimal ValorPagarOriginal, decimal SaldoReceberEmAberto, decimal SaldoPagarEmAberto, decimal EntradasRealizadas, decimal SaidasRealizadas, decimal SaldoProjetado, decimal SaldoRealizado)
RelatorioFiscalGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long NotasRegistradas, long ItensRegistrados, long EventosRegistrados, long CartasCorrecaoRegistradas, long CancelamentosRegistrados, long InutilizacoesRegistradas, long XmlsArmazenados)
RelatorioProducaoGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long OrdensPlanejadas, long OrdensLiberadas, long OrdensEmProducao, long OrdensEncerradas, long OrdensCanceladas, decimal QuantidadePlanejada, decimal QuantidadeProduzida, decimal QuantidadePerdas, decimal CustoConsolidado)
RelatorioVendasGerencialResponse( ContextoRelatorioGerencialResponse Contexto, PeriodoRelatorioGerencialResponse Periodo, long TotalPedidos, long TotalItens, long TotalClientesComPedido, long PedidosComFinanceiroGerado, long PedidosComEstoqueMovimentado)

```
### `Rh`

```csharp
AdmitirColaboradorRequest(Guid EmpresaId, Guid? FilialId, string Matricula, string Nome, string Cpf, Guid CargoId, Guid? SetorId, Guid? PessoaId, Guid? JornadaId, RegimeTrabalho Regime, decimal SalarioBase, DateTimeOffset DataAdmissao, DateTimeOffset? DataNascimento, string? Email, string? Telefone)
AfastamentoResponse(Guid Id, Guid ColaboradorId, TipoAfastamento Tipo, DateTimeOffset DataInicio, DateTimeOffset? DataFimPrevista, DateTimeOffset? DataFimReal, string? Cid, string? Observacao, StatusAfastamento StatusAfastamento)
AtualizarBeneficioRequest(string Nome, TipoBeneficio Tipo, decimal ValorPadrao, string? Descricao)
AtualizarColaboradorRequest(string Nome, Guid CargoId, Guid? SetorId, Guid? JornadaId, RegimeTrabalho Regime, decimal SalarioBase, string? Email, string? Telefone)
AtualizarJornadaRequest(string Nome, decimal CargaHorariaSemanal, string? HoraEntrada, string? HoraSaida, string? Descricao)
BeneficioResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, TipoBeneficio Tipo, decimal ValorPadrao, string? Descricao)
CancelarFeriasRequest(string Motivo)
ColaboradorBeneficioResponse(Guid Id, Guid ColaboradorId, Guid BeneficioId, decimal Valor, DateTimeOffset DataInicio, DateTimeOffset? DataFim, StatusColaboradorBeneficio StatusColaboradorBeneficio)
ColaboradorResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Matricula, string Nome, string Cpf, Guid CargoId, Guid? SetorId, Guid? PessoaId, Guid? JornadaId, RegimeTrabalho Regime, decimal SalarioBase, DateTimeOffset DataAdmissao, DateTimeOffset? DataNascimento, string? Email, string? Telefone, DateTimeOffset? DataDemissao, string? MotivoDesligamento, StatusColaborador StatusColaborador)
ConcederBeneficioRequest(Guid EmpresaId, Guid? FilialId, Guid ColaboradorId, Guid BeneficioId, decimal Valor, DateTimeOffset DataInicio)
CriarBeneficioRequest(Guid EmpresaId, Guid? FilialId, string Nome, TipoBeneficio Tipo, decimal ValorPadrao, string? Descricao)
CriarJornadaRequest(Guid EmpresaId, Guid? FilialId, string Nome, decimal CargaHorariaSemanal, string? HoraEntrada, string? HoraSaida, string? Descricao)
DesligarColaboradorRequest(DateTimeOffset DataDemissao, string Motivo)
EncerrarAfastamentoRequest(DateTimeOffset? DataFimReal)
EncerrarConcessaoBeneficioRequest(DateTimeOffset? DataFim)
EventoRhResponse(Guid Id, Guid ColaboradorId, int Competencia, TipoEventoRh Tipo, string Codigo, string Descricao, decimal? Referencia, decimal Valor, OrigemEventoRh Origem)
FeriasResponse(Guid Id, Guid ColaboradorId, DateTimeOffset PeriodoAquisitivoInicio, DateTimeOffset PeriodoAquisitivoFim, DateTimeOffset DataInicio, DateTimeOffset DataFim, int DiasGozo, string? Observacao, StatusFerias StatusFerias)
JornadaResponse(Guid Id, Guid EmpresaId, Guid? FilialId, string Nome, decimal CargaHorariaSemanal, string? HoraEntrada, string? HoraSaida, string? Descricao)
RegistrarAfastamentoRequest(Guid EmpresaId, Guid? FilialId, Guid ColaboradorId, TipoAfastamento Tipo, DateTimeOffset DataInicio, DateTimeOffset? DataFimPrevista, string? Cid, string? Observacao)
RegistrarEventoRhRequest(Guid EmpresaId, Guid? FilialId, Guid ColaboradorId, int Competencia, TipoEventoRh Tipo, string Codigo, string Descricao, decimal Valor, decimal? Referencia, OrigemEventoRh Origem)
RegistrarPontoRequest(Guid EmpresaId, Guid? FilialId, Guid ColaboradorId, DateTimeOffset? DataHora, TipoMarcacaoPonto Tipo, OrigemPonto Origem, string? Observacao)
RegistroPontoResponse(Guid Id, Guid ColaboradorId, DateTimeOffset DataHora, TipoMarcacaoPonto Tipo, OrigemPonto Origem, string? Observacao)
RejeitarFeriasRequest(string Motivo)
SolicitarFeriasRequest(Guid EmpresaId, Guid? FilialId, Guid ColaboradorId, DateTimeOffset PeriodoAquisitivoInicio, DateTimeOffset PeriodoAquisitivoFim, DateTimeOffset DataInicio, DateTimeOffset DataFim, string? Observacao)

```
### `Security/Auth`

```csharp
AuthUserSession( TokenGerado AccessToken, string RefreshTokenPlano, string RefreshTokenHash, DateTimeOffset RefreshTokenExpiraEm, IReadOnlyCollection<string> Permissoes)
FixedLoginAttemptResult(Result<LoginResponse> Resultado, string? MotivoFalha)
LoginRequest( string Email, string Password, string? CodigoEmpresa = null)
LoginResponse( Guid UsuarioId, string Nome, string Email, Guid EmpresaId, Guid? FilialId, string? CodigoEmpresa, bool EmpresaValidada, string AccessToken, DateTimeOffset AccessTokenExpiraEm, string RefreshToken, DateTimeOffset RefreshTokenExpiraEm, IReadOnlyCollection<string> Permissoes)
LogoutRequest(string? RefreshToken)
MeResponse( Guid UsuarioId, string Nome, string Email, Guid EmpresaId, Guid? FilialId, bool IsMaster, IReadOnlyCollection<string> Permissoes)
RefreshTokenRequest(string RefreshToken)
RefreshTokenResponse( string AccessToken, DateTimeOffset AccessTokenExpiraEm, string RefreshToken, DateTimeOffset RefreshTokenExpiraEm, Guid EmpresaId, Guid? FilialId, IReadOnlyCollection<string> Permissoes)
ValidarEmpresaRequest(string CodigoEmpresa)
ValidarEmpresaResponse( string CodigoEmpresa, bool Ativa, string OrigemValidacao, string Mensagem)

```
### `Security/CargosAcesso`

```csharp
AtribuirCargoEmpresaUsuarioRequest(Guid CargoAcessoId, DateOnly VigenteDesde, DateOnly? VigenteAte, string Motivo)
AtribuirCargoFilialUsuarioRequest(Guid CargoAcessoId, Guid FilialId, DateOnly VigenteDesde, DateOnly? VigenteAte, string Motivo)
AtualizarCargoAcessoRequest( string Nome, string? Descricao, int NivelHierarquico, string Motivo)
CargoAcessoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, EscopoAcesso Escopo, string Nome, string? Descricao, int NivelHierarquico, bool Ativo, IReadOnlyCollection<Guid> GruposAcessoIds)
CriarCargoAcessoRequest( Guid EmpresaId, Guid? FilialId, EscopoAcesso Escopo, string Nome, string? Descricao, int NivelHierarquico)
OrigemPermissaoEfetivaResponse( EscopoAcesso Escopo, Guid CargoAcessoId, Guid GrupoAcessoId, string PermissionCode, bool Permitido)
PermissoesEfetivasUsuarioResponse( Guid UsuarioId, Guid EmpresaId, Guid? FilialId, IReadOnlyCollection<string> Permissoes, IReadOnlyCollection<OrigemPermissaoEfetivaResponse> Origens)
VincularGrupoCargoAcessoRequest(Guid GrupoAcessoId, string Motivo)

```
### `Security/GruposAcesso`

```csharp
AdicionarPermissaoGrupoRequest( Guid? PermissaoId, string? CodigoPermissao)
AtribuirGrupoUsuarioRequest(Guid GrupoAcessoId)
AtualizarGrupoAcessoRequest( string Nome, string? Descricao)
CriarGrupoAcessoRequest( string Nome, string? Descricao, Guid EmpresaId, Guid? FilialId, IReadOnlyCollection<Guid>? PermissoesIds)
GrupoAcessoPermissaoResponse( Guid Id, Guid PermissaoId, string Codigo, string Modulo, string Descricao, bool Ativo, DateTimeOffset AtribuidoEm, Guid AtribuidoPor)
GrupoAcessoResponse( Guid Id, string Nome, string? Descricao, Guid EmpresaId, Guid? FilialId, bool Sistema, string Status, IReadOnlyCollection<GrupoAcessoPermissaoResponse> Permissoes)
InativarGrupoAcessoRequest(string Motivo)
PermissaoResponse( Guid Id, string Codigo, string Modulo, string Descricao)
RemoverGrupoUsuarioRequest(string Motivo)
RemoverPermissaoGrupoRequest(string Motivo)

```
### `Security/GruposAcesso/Estruturado`

```csharp
GrupoAcessoMatrizResponse( Guid GrupoAcessoId, Guid EmpresaId, Guid? FilialId, EscopoAcesso Escopo, IReadOnlyCollection<MatrizPermissaoModuloResponse> MatrizPermissoes)
MatrizPermissaoAcaoRequest( string Acao, string PermissionCode, bool Permitido)
MatrizPermissaoAcaoResponse( string Acao, string PermissionCode, bool Permitido)
MatrizPermissaoModuloRequest( string Modulo, IReadOnlyCollection<MatrizPermissaoRecursoRequest> Recursos)
MatrizPermissaoModuloResponse( string Modulo, IReadOnlyCollection<MatrizPermissaoRecursoResponse> Recursos)
MatrizPermissaoRecursoRequest( string Recurso, IReadOnlyCollection<MatrizPermissaoAcaoRequest> Acoes)
MatrizPermissaoRecursoResponse( string Recurso, IReadOnlyCollection<MatrizPermissaoAcaoResponse> Acoes)
SalvarMatrizPermissoesGrupoRequest( Guid EmpresaId, Guid? FilialId, EscopoAcesso Escopo, string Motivo, IReadOnlyCollection<MatrizPermissaoModuloRequest> MatrizPermissoes)

```
### `Security/Parametros`

```csharp
DefinirParametroRequest(Guid EmpresaId, Guid? FilialId, string Chave, string Valor)
ParametroEfetivoResponse( string Chave, string Valor, TipoParametro Tipo, OrigemParametro Origem, string Descricao)

```
### `Security/Permissoes`

```csharp
AcaoPermissaoResponse( string Codigo, string Nome, string PermissionCode, bool Critica, int Ordem)
ModuloPermissaoResponse( string Codigo, string Nome, int Ordem, IReadOnlyCollection<RecursoPermissaoResponse> Recursos)
PermissoesCatalogoResponse(IReadOnlyCollection<ModuloPermissaoResponse> Modulos)
RecursoPermissaoResponse( string Codigo, string Nome, string? RotaFrontend, int Ordem, IReadOnlyCollection<AcaoPermissaoResponse> Acoes)

```
### `Security/Usuarios`

```csharp
CriarUsuarioRequest( string Nome, string Email, string Senha, Guid EmpresaId, Guid? FilialId)
InativarUsuarioRequest(string Motivo)
ReativarUsuarioRequest(string Motivo)
ResetarSenhaUsuarioRequest(string NovaSenha, string Motivo)
ResetarSenhaUsuarioResponse(Guid UsuarioId, DateTimeOffset AlteradaEm)
UsuarioResponse( Guid Id, string Nome, string Email, Guid EmpresaId, Guid? FilialId, bool Ativo, bool Bloqueado, DateTimeOffset? UltimoLoginEm)

```
### `Servicos`

```csharp
AdicionarItemOrdemServicoRequest(TipoItemOrdemServico Tipo, string Descricao, Guid? ProdutoId, decimal Quantidade, decimal ValorUnitario)
CancelarOrdemServicoRequest(string Motivo)
CriarOrdemServicoRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, string Descricao, PrioridadeOrdemServico Prioridade, Guid? TecnicoResponsavelId, Guid? LocalEstoqueId, DateTimeOffset? DataAbertura, DateTimeOffset? DataPrevisao)
EncerrarOrdemServicoRequest(string LaudoTecnico)
FaturarOrdemServicoRequest(string? NumeroDocumento, DateTimeOffset? DataVencimento, string? Observacao)
FaturarOrdemServicoResponse(Guid OrdemServicoId, Guid ContaReceberId, decimal ValorTotal)
ItemOrdemServicoResponse( Guid Id, int Sequencia, TipoItemOrdemServico Tipo, string Descricao, Guid? ProdutoId, decimal Quantidade, decimal ValorUnitario, decimal ValorTotal, bool EstoqueBaixado)
OrdemServicoResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, string Descricao, PrioridadeOrdemServico Prioridade, Guid? TecnicoResponsavelId, Guid? LocalEstoqueId, DateTimeOffset DataAbertura, DateTimeOffset? DataPrevisao, DateTimeOffset? DataEncerramento, string? Diagnostico, string? PlanoExecucao, string? LaudoTecnico, StatusOrdemServico StatusOS, decimal ValorMaoDeObra, decimal ValorMaterial, decimal ValorTotal, Guid? ContaReceberId, DateTimeOffset? FaturadoEm, IReadOnlyList<ItemOrdemServicoResponse> Itens)
PlanejarOrdemServicoRequest(string PlanoExecucao)
TriarOrdemServicoRequest(string Diagnostico, Guid? TecnicoResponsavelId)

```
### `Vendas/Pedidos`

```csharp
AdicionarItemPedidoVendaRequest( Guid ProdutoId, Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
AprovarPedidoVendaRequest(bool ReservarEstoque, string? Observacao)
AtualizarItemPedidoVendaRequest( Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorDesconto, string? Observacao)
AtualizarPedidoVendaRequest( DateTimeOffset? DataPrevisaoEntrega, TipoPedidoVenda Tipo, string? Observacao)
CancelarPedidoVendaRequest(string Motivo)
CriarPedidoVendaRequest( Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, DateTimeOffset DataEmissao, DateTimeOffset? DataPrevisaoEntrega, TipoPedidoVenda Tipo, string? Observacao)
FaturarPedidoVendaRequest(bool BaixarEstoque, string? Documento, string? Observacao)
ItemPedidoVendaResponse( Guid Id, int Sequencia, Guid ProdutoId, Guid? LocalEstoqueId, decimal Quantidade, decimal ValorUnitario, decimal ValorBruto, decimal ValorDesconto, decimal ValorTotal, Guid? ReservaEstoqueId, decimal QuantidadeBaixadaEstoque, string? Observacao)
PedidoVendaResponse( Guid Id, Guid EmpresaId, Guid? FilialId, string Numero, Guid ClienteId, DateTimeOffset DataEmissao, DateTimeOffset? DataPrevisaoEntrega, TipoPedidoVenda Tipo, StatusPedidoVenda StatusPedido, decimal ValorProdutos, decimal ValorDesconto, decimal ValorTotal, string? Observacao, string? MotivoCancelamento, DateTimeOffset? AprovadoEm, DateTimeOffset? CanceladoEm, DateTimeOffset? FaturadoEm, IReadOnlyCollection<ItemPedidoVendaResponse> Itens)
RemoverItemPedidoVendaRequest(string Motivo)
```

## 11. Catálogo de enums

Valores exatamente como serializados (inteiros). Enums sem `= n` explícito começam em 0.


```csharp
AmbitoCfop = Interno = 1, Interestadual = 2, Exterior = 3
AuditoriaAcao = Criacao = 1, Atualizacao = 2, Inativacao = 3, Cancelamento = 4, Estorno = 5, Login = 6, Logout = 7, FalhaLogin = 8, AlteracaoStatus = 9, Integracao = 10, Erro = 11, Consulta = 12, Aprovacao = 13, Rejeicao = 14, Baixa = 15, Emissao = 16, Importacao = 17, Exportacao = 18
CategoriaAnexo = Documento = 1, Contrato = 2, NotaFiscal = 3, Comprovante = 4, Foto = 5, Planilha = 6, Outro = 7
CategoriaBemPatrimonial = Movel = 1, Imovel = 2, Veiculo = 3, Maquina = 4, Equipamento = 5, Ferramenta = 6, Software = 7, Outro = 8
Crt = SimplesNacional = 1, SimplesNacionalExcessoSublimite = 2, RegimeNormal = 3
DirecaoEventoIntegracao = Entrada = 1, Saida = 2
EntityStatus = Ativo = 1, Inativo = 2, Cancelado = 3, Bloqueado = 4, Pendente = 5
EscopoAcesso = Empresa = 1, Filial = 2
EstagioOportunidade = Qualificacao = 1, Proposta = 2, Negociacao = 3
FinalidadeNaturezaOperacao = Normal = 1, Complementar = 2, Ajuste = 3, Devolucao = 4
FormatoDocumentoAuxiliarFiscal = Pdf = 1, Html = 2
GravidadeOcorrencia = Baixa = 1, Media = 2, Alta = 3
GravidadeRecall = Baixa = 1, Media = 2, Alta = 3
IndicadorContribuinteIcms = Contribuinte = 1, Isento = 2, NaoContribuinte = 3
IndicadorIeDestinatario = ContribuinteIcms = 1, ContribuinteIsento = 2, NaoContribuinte = 9
IndicadorOperacaoCst = Entrada = 1, Saida = 2
IndicadorPresencaComprador = NaoSeAplica = 0, Presencial = 1, Internet = 2, Teleatendimento = 3, EntregaDomicilio = 4, PresencialForaDoEstabelecimento = 5, Outros = 9
LoteOrigem = Producao = 1, Compra = 2, Outro = 3
MeioPagamento = Dinheiro = 1, Cartao = 2, Pix = 3, Outro = 4
MetodoDepreciacao = Linear = 1, Acelerada = 2
ModalidadeBaseCalculoIcms = MargemValorAgregado = 1, Pauta = 2, PrecoTabelado = 3, ValorOperacao = 4
ModalidadeBaseCalculoIcmsSt = MargemValorAgregado = 1, Pauta = 2, PrecoTabelado = 3, ListaNegativa = 4, ListaPositiva = 5, ListaNeutra = 6
MotivoBaixaPatrimonial = Venda = 1, Obsolescencia = 2, Perda = 3, Doacao = 4, Sinistro = 5, Transferencia = 6, Outro = 7
MotivoPerdaOportunidade = Preco = 1, Concorrencia = 2, SemOrcamento = 3, SemInteresse = 4, ForaDoPerfil = 5, SemResposta = 6, Outro = 7
MunicipioIncidenciaIss = Prestador = 1, Tomador = 2
NaturezaContaContabil = Devedora = 1, Credora = 2
NaturezaTomadorServico = NaoAplicavel = 0, PessoaFisica = 1, PessoaJuridica = 2, OrgaoPublico = 3
OrigemEventoRh = Manual = 1, Ponto = 2, Ferias = 3, Afastamento = 4, Beneficio = 5, Sistema = 6
OrigemFinanceira = Manual = 1, PedidoVenda = 2, NotaFiscal = 3, Compra = 4, Contrato = 5, AjusteAutorizado = 6, OrdemServico = 7, Frota = 8
OrigemInspecao = RecebimentoCompra = 1, OrdemProducao = 2, Devolucao = 3, Avulsa = 4
OrigemLancamentoContabil = Manual = 1, BaixaContaPagar = 2, BaixaContaReceber = 3, Estorno = 4, Depreciacao = 5
OrigemLead = Website = 1, Indicacao = 2, Evento = 3, RedeSocial = 4, LigacaoFria = 5, Parceiro = 6, Outro = 7
OrigemNotaFiscal = Manual = 1, PedidoVenda = 2, PedidoCompra = 3, Servico = 4, Importacao = 5
OrigemPonto = Manual = 1, Dispositivo = 2, Importado = 3
PeriodicidadeContrato = Mensal = 1, Bimestral = 2, Trimestral = 3, Semestral = 4, Anual = 5
PrioridadeAtividade = Baixa = 1, Normal = 2, Alta = 3, Critica = 4
PrioridadeOrdemServico = Baixa = 1, Media = 2, Alta = 3, Urgente = 4
RegimePisCofins = Cumulativo = 1, NaoCumulativo = 2
RegimeTrabalho = Clt = 1, Pj = 2, Estagio = 3, Temporario = 4, Aprendiz = 5, Autonomo = 6
RegimeTributario = SimplesNacional, LucroPresumido, LucroReal
ResultadoCriterio = Pendente = 1, Conforme = 2, NaoConforme = 3
SeveridadeNotificacao = Informativa = 1, Sucesso = 2, Alerta = 3, Critica = 4
SituacaoEventoIntegracao = Pendente = 1, Processando = 2, Sucesso = 3, Falha = 4, ReprocessamentoAgendado = 5, Cancelado = 6
SituacaoItemInventario = Pendente = 1, Localizado = 2, NaoLocalizado = 3
SituacaoRetencao = NaoAplicavel = 1, Dispensado = 2, Retido = 3
StatusAcaoCorretiva = Pendente = 1, EmAndamento = 2, Concluida = 3, Cancelada = 4
StatusAfastamento = Ativo = 1, Encerrado = 2
StatusAtividade = Aberta = 1, EmAndamento = 2, Concluida = 3, Cancelada = 4
StatusBemPatrimonial = Ativo = 1, Baixado = 2
StatusBloqueioEstoque = Ativo = 1, Liberado = 2, Cancelado = 3
StatusBoleto = Gerado = 1, EmRemessa = 2, Liquidado = 3, Cancelado = 4
StatusCaixa = Aberto = 1, Fechado = 2
StatusColaborador = Ativo = 1, Afastado = 2, Ferias = 3, Desligado = 4
StatusColaboradorBeneficio = Ativo = 1, Encerrado = 2
StatusConferenciaFiscalEntrada = Conferida = 1, DivergenciaEncontrada = 2
StatusContaContabil = Ativa = 1, Inativa = 2
StatusContaFinanceira = Aberta = 1, ParcialmenteBaixada = 2, Quitada = 3, Cancelada = 4, Estornada = 5
StatusContaFinanceira = Aberta = 1, ParcialmenteQuitada = 2, Quitada = 3, Cancelada = 4, Estornada = 5
StatusContrato = Rascunho = 1, Aprovado = 2, Encerrado = 3, Cancelado = 4
StatusCotacaoCompra = Aberta = 1, Aprovada = 2, Recusada = 3, Cancelada = 4
StatusDeploy = EmAndamento = 1, Concluido = 2, Falhou = 3, Revertido = 4
StatusFaturamento = Rascunho = 1, PendenteFiscal = 2, FiscalAutorizado = 3, EstoqueProcessado = 4, Faturado = 5, Cancelado = 6, Erro = 7
StatusFaturamentoContrato = Gerado = 1, Cancelado = 2
StatusFerias = Solicitada = 1, Aprovada = 2, Rejeitada = 3, EmGozo = 4, Concluida = 5, Cancelada = 6
StatusFichaTecnica = Rascunho = 1, Ativa = 2, Inativa = 3
StatusInspecao = Aberta = 1, Aprovada = 2, Reprovada = 3, Encerrada = 4
StatusIntegracaoFiscal = Pendente = 1, Sucesso = 2, Falha = 3, Reprocessamento = 4
StatusInventario = Aberto = 1, Fechado = 2, Cancelado = 3
StatusInventarioEstoque = Aberto = 1, EmContagem = 2, Concluido = 3, Cancelado = 4
StatusInventarioPatrimonial = Aberto = 1, Encerrado = 2
StatusItemChecklist = Pendente = 1, Aprovado = 2, Reprovado = 3, NaoAplicavel = 4
StatusLancamentoContabil = Normal = 1, Estornado = 2, Estorno = 3
StatusLead = Novo = 1, Qualificado = 2, Descartado = 3
StatusLote = Ativo = 1, Bloqueado = 2, Esgotado = 3
StatusManutencao = Aberta = 1, Concluida = 2, Cancelada = 3
StatusMovimentoFinanceiro = Registrado = 1, Estornado = 2, Cancelado = 3
StatusNaoConformidade = Aberta = 1, EmTratamento = 2, Encerrada = 3
StatusNotaFiscal = Rascunho = 1, Validada = 2, Assinada = 3, Transmitida = 4, Autorizada = 5, Rejeitada = 6, Cancelada = 7, Inutilizada = 8, Denegada = 9, Contingencia = 10
StatusNotificacao = NaoLida = 1, Lida = 2, Arquivada = 3
StatusOcorrenciaAcesso = Aberta = 1, Resolvida = 2
StatusOportunidade = Aberta = 1, Ganha = 2, Perdida = 3
StatusOrdemProducao = Planejada = 1, Liberada = 2, EmProducao = 3, Encerrada = 4, Cancelada = 5
StatusOrdemServico = Aberta = 1, Triagem = 2, Planejada = 3, EmExecucao = 4, EncerradaTecnicamente = 5, Faturada = 6, Cancelada = 7
StatusParcelaFinanceira = Aberta = 1, ParcialmenteQuitada = 2, Quitada = 3, Cancelada = 4, Estornada = 5
StatusPedidoCompra = Rascunho = 1, AguardandoAprovacao = 2, Aprovado = 3, ParcialmenteRecebido = 4, Recebido = 5, Cancelado = 6
StatusPedidoVenda = Rascunho = 1, AguardandoAprovacao = 2, Aprovado = 3, Cancelado = 4, Faturado = 5
StatusPeriodoContabil = Aberto = 1, Fechado = 2
StatusPreAutorizacao = Pendente = 1, Utilizada = 2, Cancelada = 3
StatusProposta = Aberta = 1, Aceita = 2, Recusada = 3
StatusRecall = Aberto = 1, EmAndamento = 2, Encerrado = 3, Cancelado = 4
StatusRegistroAcesso = Entrada = 1, EmPermanencia = 2, Encerrado = 3, Recusado = 4, Cancelado = 5
StatusRegraContabilizacao = Ativa = 1, Inativa = 2
StatusReservaEstoque = Ativa = 1, ParcialmenteBaixada = 2, Baixada = 3, Cancelada = 4
StatusSolicitacaoCompra = Aberta = 1, Aprovada = 2, Atendida = 3, Cancelada = 4
StatusTabelaPreco = Rascunho = 1, Ativa = 2, Inativa = 3, Expirada = 4
StatusVeiculo = Ativo = 1, EmManutencao = 2, Inativo = 3, Baixado = 4
StatusVendaPdv = EmDigitacao = 1, Finalizada = 2, Cancelada = 3
StatusViagem = EmAndamento = 1, Concluida = 2, Cancelada = 3
TabelaOficialFiscal = Cfop = 1, MunicipioIbge = 2, Pais = 3, Ncm = 4, Cest = 5, NcmCest = 6, AliquotaInterestadual = 7, FcpUf = 8, TetoInss = 9
TipoAcesso = Visitante = 1, Prestador = 2, Fornecedor = 3, Funcionario = 4, Entregador = 5, Outro = 6
TipoAfastamento = Doenca = 1, AcidenteTrabalho = 2, LicencaMaternidade = 3, LicencaPaternidade = 4, Suspensao = 5, Outro = 6
TipoAjusteEstoque = Entrada = 1, Saida = 2
TipoAmbienteFiscal = Homologacao = 1, Producao = 2
TipoApontamentoProducao = ConsumoComponente = 1, Hora = 2, Perda = 3, ProducaoAcabado = 4
TipoBeneficio = ValeTransporte = 1, ValeRefeicao = 2, ValeAlimentacao = 3, PlanoSaude = 4, PlanoOdontologico = 5, SeguroVida = 6, Outro = 7
TipoCalculoIpi = Aliquota = 1, ValorPorUnidade = 2
TipoCalculoPisCofins = Percentual = 1, ValorPorUnidade = 2
TipoCertificadoDigital = A1 = 1, A3 = 2
TipoCfop = Entrada = 1, Saida = 2
TipoCobranca = SemRegistro = 1, ComRegistro = 2
TipoCombustivel = Gasolina = 1, Etanol = 2, Diesel = 3, Flex = 4, Gnv = 5, Eletrico = 6, Outro = 7
TipoContaContabil = Ativo = 1, Passivo = 2, PatrimonioLiquido = 3, Receita = 4, Despesa = 5
TipoContaFinanceira = Receber = 1, Pagar = 2
TipoContato = Email = 1, Telefone = 2, Celular = 3, Whatsapp = 4, Site = 5, Outro = 99
TipoContingenciaFiscal = Svc = 1, Epec = 2, OfflineNfce = 3, OperacionalInterna = 99
TipoDespesaVeiculo = Pedagio = 1, Multa = 2, Estacionamento = 3, Lavagem = 4, Documentacao = 5, Outro = 6
TipoDivergenciaRecebimento = QuantidadeAcimaDoPedido = 1, ValorUnitarioDivergente = 2, ValorFiscalDivergente = 3
TipoDocumentoAcesso = Rg = 1, Cpf = 2, Cnh = 3, Passaporte = 4, CarteiraTrabalho = 5, Outro = 6
TipoDocumentoAuxiliarFiscal = Danfe = 1, Dacte = 2, Damdfe = 3, Outros = 99
TipoDocumentoFiscal = NFe = 1, NFCe = 2, NFSe = 3, CTe = 4, MDFe = 5, Outro = 99
TipoDocumentoVeiculo = Licenciamento = 1, Seguro = 2, Ipva = 3, Crlv = 4, Outro = 5
TipoEmissaoNfe = Normal = 1, ContingenciaFsIa = 2, Scan = 3, Epec = 4, ContingenciaFsDa = 5, SvcAn = 6, SvcRs = 7, OfflineNfce = 9
TipoEndereco = Comercial = 1, Residencial = 2, Entrega = 3, Cobranca = 4, Fiscal = 5, Outro = 99
TipoEventoContabil = Pagamento = 1, Recebimento = 2
TipoEventoFiscal = Criacao = 1, Validacao = 2, Assinatura = 3, Transmissao = 4, Autorizacao = 5, Rejeicao = 6, Cancelamento = 7, CartaCorrecao = 8, Inutilizacao = 9, ErroIntegracao = 10, CorrecaoRascunho = 11, Contingencia = 12, InvalidacaoChave = 13
TipoEventoRh = Provento = 1, Desconto = 2, Informativo = 3
TipoFaturamentoContrato = Recorrente = 1, Consumo = 2
TipoFrete = Cif = 0, Fob = 1, Terceiros = 2, ProprioRemetente = 3, ProprioDestinatario = 4, SemFrete = 9
TipoIntegracaoExterna = Generica = 1, Fiscal = 2, Bancaria = 3, Ecommerce = 4, Mensageria = 5, Webhook = 6
TipoItemFiscal = Mercadoria = 1, Servico = 2, Composicao = 3, Outro = 99
TipoItemOrdemServico = MaoDeObra = 1, Material = 2, ServicoExterno = 3
TipoItemSped = MercadoriaParaRevenda = 0, MateriaPrima = 1, Embalagem = 2, ProdutoEmProcesso = 3, ProdutoAcabado = 4, Subproduto = 5, ProdutoIntermediario = 6, MaterialDeUsoEConsumo = 7, AtivoImobilizado = 8, Servicos = 9, OutrosInsumos = 10, Outras = 99
TipoManutencao = Preventiva = 1, Corretiva = 2
TipoMarcacaoPonto = Entrada = 1, SaidaIntervalo = 2, RetornoIntervalo = 3, Saida = 4
TipoMovimentacaoLote = Entrada = 1, Saida = 2, Consumo = 3, Transferencia = 4, Ajuste = 5, Descarte = 6
TipoMovimentoCaixa = Abertura = 1, Suprimento = 2, Sangria = 3, RecebimentoVenda = 4
TipoMovimentoEstoque = Entrada = 1, Saida = 2, AjusteEntrada = 3, AjusteSaida = 4, Reserva = 5, BaixaReserva = 6, CancelamentoReserva = 7, TransferenciaSaida = 8, TransferenciaEntrada = 9
TipoMovimentoFinanceiro = BaixaReceber = 1, BaixaPagar = 2, EstornoReceber = 3, EstornoPagar = 4, Transferencia = 5, AjusteManual = 6
TipoMovimentoFinanceiro = Recebimento = 1, Pagamento = 2, EstornoRecebimento = 3, EstornoPagamento = 4, Cancelamento = 5
TipoOcorrenciaAcesso = AcessoNegado = 1, DocumentoInvalido = 2, Incidente = 3, Dano = 4, Comportamento = 5, Outro = 6
TipoOcorrenciaFaturamento = Informativa = 1, Alerta = 2, Erro = 3
TipoOperacaoFiscal = Venda = 1, Compra = 2, Devolucao = 3, Remessa = 4, Transferencia = 5, Bonificacao = 6, Servico = 7, Transporte = 8, Outro = 99
TipoParametro = Booleano = 1, Inteiro = 2, Decimal = 3, Texto = 4
TipoPartida = Debito = 1, Credito = 2
TipoPedidoVenda = Orcamento = 1, Pedido = 2
TipoPessoa = Fisica = 1, Juridica = 2
TipoProduto = Mercadoria = 1, Servico = 2, MateriaPrima = 3, ProdutoAcabado = 4, UsoConsumo = 5, AtivoImobilizado = 6, Outro = 99
TipoSituacaoTributariaIcms = Cst = 1, Csosn = 2
TipoVeiculo = Carro = 1, Moto = 2, Caminhao = 3, Van = 4, Onibus = 5, Maquina = 6, Outro = 7
TipoXmlFiscal = Envio = 1, Autorizado = 2, Cancelamento = 3, CartaCorrecao = 4, Inutilizacao = 5, RetornoAutorizador = 6
TratamentoIcmsProprio = Tributado = 1, TributadoComReducao = 2, Isento = 3, Diferido = 4, SubstituidoAnteriormente = 5, SimplesNacional = 6
TratamentoIpi = Tributado = 1, TributadoComAliquotaZero = 2, Isento = 3, NaoTributado = 4, Imune = 5, Suspenso = 6
TratamentoPisCofins = Tributado = 1, Monofasico = 2, SubstituicaoTributaria = 3, AliquotaZero = 4, Isento = 5, SemIncidencia = 6, Suspenso = 7, SemDireitoACredito = 8
```

## 12. Catálogo de permissões

Constante C# → código enviado no token e exigido pelo endpoint.


| Constante C# | Código |
| --- | --- |
| `AuditoriaConsultar` | `AUDITORIA_CONSULTAR` |
| `RelatoriosOperacionaisConsultar` | `RELATORIOS_OPERACIONAIS_CONSULTAR` |
| `RelatoriosVendasConsultar` | `RELATORIOS_VENDAS_CONSULTAR` |
| `RelatoriosComprasConsultar` | `RELATORIOS_COMPRAS_CONSULTAR` |
| `RelatoriosFinanceiroConsultar` | `RELATORIOS_FINANCEIRO_CONSULTAR` |
| `RelatoriosEstoqueConsultar` | `RELATORIOS_ESTOQUE_CONSULTAR` |
| `RelatoriosFiscalConsultar` | `RELATORIOS_FISCAL_CONSULTAR` |
| `RelatoriosProducaoConsultar` | `RELATORIOS_PRODUCAO_CONSULTAR` |
| `RelatoriosDashboardConsultar` | `RELATORIOS_DASHBOARD_CONSULTAR` |
| `RelatoriosExportar` | `RELATORIOS_EXPORTAR` |
| `AuditoriaOperacionalConsultar` | `AUDITORIA_OPERACIONAL_CONSULTAR` |
| `AdministracaoConsultar` | `ADMINISTRACAO_CONSULTAR` |
| `AdministracaoGerenciar` | `ADMINISTRACAO_GERENCIAR` |
| `InfraestruturaConsultar` | `INFRAESTRUTURA_CONSULTAR` |
| `InfraestruturaBackupConsultar` | `INFRAESTRUTURA_BACKUP_CONSULTAR` |
| `DeployConsultar` | `DEPLOY_CONSULTAR` |
| `DeployGerenciar` | `DEPLOY_GERENCIAR` |
| `AnexosConsultar` | `ANEXOS_CONSULTAR` |
| `AnexosBaixar` | `ANEXOS_BAIXAR` |
| `AnexosGerenciar` | `ANEXOS_GERENCIAR` |
| `NotificacoesConsultar` | `NOTIFICACOES_CONSULTAR` |
| `NotificacoesGerenciar` | `NOTIFICACOES_GERENCIAR` |
| `IntegracoesConsultar` | `INTEGRACOES_CONSULTAR` |
| `IntegracoesGerenciar` | `INTEGRACOES_GERENCIAR` |
| `IntegracoesReprocessar` | `INTEGRACOES_REPROCESSAR` |
| `UsuariosConsultar` | `SEGURANCA_USUARIOS_CONSULTAR` |
| `UsuariosGerenciar` | `SEGURANCA_USUARIOS_GERENCIAR` |
| `PermissoesConsultar` | `SEGURANCA_PERMISSOES_CONSULTAR` |
| `PermissoesGerenciar` | `SEGURANCA_PERMISSOES_GERENCIAR` |
| `GruposAcessoConsultar` | `SEGURANCA_GRUPOS_ACESSO_CONSULTAR` |
| `GruposAcessoGerenciar` | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| `SessoesGerenciar` | `SEGURANCA_SESSOES_GERENCIAR` |
| `UsuariosInativar` | `SEGURANCA_USUARIOS_INATIVAR` |
| `UsuariosResetarSenha` | `SEGURANCA_USUARIOS_RESETAR_SENHA` |
| `ParametrosConsultar` | `SEGURANCA_PARAMETROS_CONSULTAR` |
| `ParametrosGerenciar` | `SEGURANCA_PARAMETROS_GERENCIAR` |
| `PessoasConsultar` | `PESSOAS_CONSULTAR` |
| `PessoasGerenciar` | `PESSOAS_GERENCIAR` |
| `PessoasBloquear` | `PESSOAS_BLOQUEAR` |
| `PessoasDadosFiscaisGerenciar` | `PESSOAS_DADOS_FISCAIS_GERENCIAR` |
| `ClassificacoesPessoaGerenciar` | `CLASSIFICACOES_PESSOA_GERENCIAR` |
| `ClientesConsultar` | `CLIENTES_CONSULTAR` |
| `ClientesGerenciar` | `CLIENTES_GERENCIAR` |
| `FornecedoresConsultar` | `FORNECEDORES_CONSULTAR` |
| `FornecedoresGerenciar` | `FORNECEDORES_GERENCIAR` |
| `TransportadorasConsultar` | `TRANSPORTADORAS_CONSULTAR` |
| `TransportadorasGerenciar` | `TRANSPORTADORAS_GERENCIAR` |
| `ProdutosConsultar` | `PRODUTOS_CONSULTAR` |
| `ProdutosGerenciar` | `PRODUTOS_GERENCIAR` |
| `ProdutosInativar` | `PRODUTOS_INATIVAR` |
| `ProdutosDadosFiscaisGerenciar` | `PRODUTOS_DADOS_FISCAIS_GERENCIAR` |
| `CategoriasProdutoGerenciar` | `CATEGORIAS_PRODUTO_GERENCIAR` |
| `UnidadesMedidaGerenciar` | `UNIDADES_MEDIDA_GERENCIAR` |
| `MarcasGerenciar` | `MARCAS_GERENCIAR` |
| `EstoqueConsultar` | `ESTOQUE_CONSULTAR` |
| `EstoqueMovimentar` | `ESTOQUE_MOVIMENTAR` |
| `EstoqueReservar` | `ESTOQUE_RESERVAR` |
| `EstoqueInventarioGerenciar` | `ESTOQUE_INVENTARIO_GERENCIAR` |
| `LocaisEstoqueGerenciar` | `LOCAIS_ESTOQUE_GERENCIAR` |
| `VendasConsultar` | `VENDAS_CONSULTAR` |
| `VendasGerenciar` | `VENDAS_GERENCIAR` |
| `VendasAprovar` | `VENDAS_APROVAR` |
| `VendasCancelar` | `VENDAS_CANCELAR` |
| `VendasFaturar` | `VENDAS_FATURAR` |
| `FinanceiroConsultar` | `FINANCEIRO_CONSULTAR` |
| `FinanceiroGerenciar` | `FINANCEIRO_GERENCIAR` |
| `FinanceiroReceber` | `FINANCEIRO_RECEBER` |
| `FinanceiroPagar` | `FINANCEIRO_PAGAR` |
| `FinanceiroEstornar` | `FINANCEIRO_ESTORNAR` |
| `FinanceiroCancelar` | `FINANCEIRO_CANCELAR` |
| `FormasPagamentoGerenciar` | `FORMAS_PAGAMENTO_GERENCIAR` |
| `CondicoesPagamentoGerenciar` | `CONDICOES_PAGAMENTO_GERENCIAR` |
| `FinanceiroCaixaGerenciar` | `FINANCEIRO_CAIXA_GERENCIAR` |
| `FinanceiroBancoGerenciar` | `FINANCEIRO_BANCO_GERENCIAR` |
| `FinanceiroFluxoCaixaConsultar` | `FINANCEIRO_FLUXO_CAIXA_CONSULTAR` |
| `EstoqueAjustar` | `ESTOQUE_AJUSTAR` |
| `EstoqueBloqueioGerenciar` | `ESTOQUE_BLOQUEIO_GERENCIAR` |
| `TabelasPrecoConsultar` | `TABELAS_PRECO_CONSULTAR` |
| `TabelasPrecoGerenciar` | `TABELAS_PRECO_GERENCIAR` |
| `TabelasPrecoAtivar` | `TABELAS_PRECO_ATIVAR` |
| `TabelasPrecoInativar` | `TABELAS_PRECO_INATIVAR` |
| `TabelasPrecoItensGerenciar` | `TABELAS_PRECO_ITENS_GERENCIAR` |
| `PoliticaComercialGerenciar` | `POLITICA_COMERCIAL_GERENCIAR` |
| `VendasPrecoMinimoSobrescrever` | `VENDAS_PRECO_MINIMO_SOBRESCREVER` |
| `ComprasConsultar` | `COMPRAS_CONSULTAR` |
| `ComprasGerenciar` | `COMPRAS_GERENCIAR` |
| `ComprasAprovar` | `COMPRAS_APROVAR` |
| `ComprasCancelar` | `COMPRAS_CANCELAR` |
| `ComprasReceber` | `COMPRAS_RECEBER` |
| `ComprasSolicitacoesConsultar` | `COMPRAS_SOLICITACOES_CONSULTAR` |
| `ComprasSolicitacoesGerenciar` | `COMPRAS_SOLICITACOES_GERENCIAR` |
| `ComprasSolicitacoesAprovar` | `COMPRAS_SOLICITACOES_APROVAR` |
| `ComprasCotacoesConsultar` | `COMPRAS_COTACOES_CONSULTAR` |
| `ComprasCotacoesGerenciar` | `COMPRAS_COTACOES_GERENCIAR` |
| `ComprasCotacoesAprovar` | `COMPRAS_COTACOES_APROVAR` |
| `ComprasConferenciaFiscalRegistrar` | `COMPRAS_CONFERENCIA_FISCAL_REGISTRAR` |
| `FiscalConsultar` | `FISCAL_CONSULTAR` |
| `FiscalExportar` | `FISCAL_EXPORTAR` |
| `FiscalGerenciar` | `FISCAL_GERENCIAR` |
| `FiscalEmitir` | `FISCAL_EMITIR` |
| `FiscalCancelar` | `FISCAL_CANCELAR` |
| `FiscalInutilizar` | `FISCAL_INUTILIZAR` |
| `FiscalCartaCorrecao` | `FISCAL_CARTA_CORRECAO` |
| `FiscalCadastrosConsultar` | `FISCAL_CADASTROS_CONSULTAR` |
| `FiscalCadastrosGerenciar` | `FISCAL_CADASTROS_GERENCIAR` |
| `FiscalRegrasConsultar` | `FISCAL_REGRAS_CONSULTAR` |
| `FiscalRegrasGerenciar` | `FISCAL_REGRAS_GERENCIAR` |
| `FiscalSeriesConsultar` | `FISCAL_SERIES_CONSULTAR` |
| `FiscalSeriesGerenciar` | `FISCAL_SERIES_GERENCIAR` |
| `FiscalModelosConsultar` | `FISCAL_MODELOS_CONSULTAR` |
| `FaturamentoConsultar` | `FATURAMENTO_CONSULTAR` |
| `FaturamentoPreparar` | `FATURAMENTO_PREPARAR` |
| `FaturamentoConfirmar` | `FATURAMENTO_CONFIRMAR` |
| `FaturamentoCancelar` | `FATURAMENTO_CANCELAR` |
| `ProducaoConsultar` | `PRODUCAO_CONSULTAR` |
| `ProducaoFichaTecnicaGerenciar` | `PRODUCAO_FICHA_TECNICA_GERENCIAR` |
| `ProducaoOrdensGerenciar` | `PRODUCAO_ORDENS_GERENCIAR` |
| `ProducaoOrdensLiberar` | `PRODUCAO_ORDENS_LIBERAR` |
| `ProducaoOrdensApontar` | `PRODUCAO_ORDENS_APONTAR` |
| `ProducaoOrdensEncerrar` | `PRODUCAO_ORDENS_ENCERRAR` |
| `ProducaoOrdensCancelar` | `PRODUCAO_ORDENS_CANCELAR` |
| `ContabilConsultar` | `CONTABIL_CONSULTAR` |
| `ContabilPlanoContasGerenciar` | `CONTABIL_PLANO_CONTAS_GERENCIAR` |
| `ContabilLancamentosGerenciar` | `CONTABIL_LANCAMENTOS_GERENCIAR` |
| `ContabilLancamentosEstornar` | `CONTABIL_LANCAMENTOS_ESTORNAR` |
| `ContabilPeriodosGerenciar` | `CONTABIL_PERIODOS_GERENCIAR` |
| `ContabilRegrasGerenciar` | `CONTABIL_REGRAS_GERENCIAR` |
| `PatrimonioConsultar` | `PATRIMONIO_CONSULTAR` |
| `PatrimonioBensGerenciar` | `PATRIMONIO_BENS_GERENCIAR` |
| `PatrimonioTransferir` | `PATRIMONIO_TRANSFERIR` |
| `PatrimonioDepreciar` | `PATRIMONIO_DEPRECIAR` |
| `PatrimonioBaixar` | `PATRIMONIO_BAIXAR` |
| `PatrimonioInventarioGerenciar` | `PATRIMONIO_INVENTARIO_GERENCIAR` |
| `CrmConsultar` | `CRM_CONSULTAR` |
| `CrmLeadsGerenciar` | `CRM_LEADS_GERENCIAR` |
| `CrmOportunidadesGerenciar` | `CRM_OPORTUNIDADES_GERENCIAR` |
| `CrmPropostasGerenciar` | `CRM_PROPOSTAS_GERENCIAR` |
| `CrmConverter` | `CRM_CONVERTER` |
| `QualidadeConsultar` | `QUALIDADE_CONSULTAR` |
| `QualidadeInspecionar` | `QUALIDADE_INSPECIONAR` |
| `QualidadeNaoConformidadeGerenciar` | `QUALIDADE_NAO_CONFORMIDADE_GERENCIAR` |
| `ContratosConsultar` | `CONTRATOS_CONSULTAR` |
| `ContratosGerenciar` | `CONTRATOS_GERENCIAR` |
| `ContratosFaturar` | `CONTRATOS_FATURAR` |
| `ServicosConsultar` | `SERVICOS_CONSULTAR` |
| `ServicosGerenciar` | `SERVICOS_GERENCIAR` |
| `ServicosApontar` | `SERVICOS_APONTAR` |
| `ServicosFaturar` | `SERVICOS_FATURAR` |
| `PdvConsultar` | `PDV_CONSULTAR` |
| `PdvCaixaGerenciar` | `PDV_CAIXA_GERENCIAR` |
| `PdvVender` | `PDV_VENDER` |
| `FrotaConsultar` | `FROTA_CONSULTAR` |
| `FrotaGerenciar` | `FROTA_GERENCIAR` |
| `PortariaConsultar` | `PORTARIA_CONSULTAR` |
| `PortariaPreAutorizar` | `PORTARIA_PREAUTORIZAR` |
| `PortariaOperar` | `PORTARIA_OPERAR` |
| `RhConsultar` | `RH_CONSULTAR` |
| `RhGerenciar` | `RH_GERENCIAR` |
| `RhPontoRegistrar` | `RH_PONTO_REGISTRAR` |
| `RhEventosGerenciar` | `RH_EVENTOS_GERENCIAR` |
| `AlimentarConsultar` | `ALIMENTAR_CONSULTAR` |
| `AlimentarLotesGerenciar` | `ALIMENTAR_LOTES_GERENCIAR` |
| `AlimentarRecallGerenciar` | `ALIMENTAR_RECALL_GERENCIAR` |
| `BancosConsultar` | `BANCOS_CONSULTAR` |
| `BancosGerenciar` | `BANCOS_GERENCIAR` |
| `BoletosGerar` | `BOLETOS_GERAR` |
| `BoletosCancelar` | `BOLETOS_CANCELAR` |
| `CnabRemessaGerar` | `CNAB_REMESSA_GERAR` |
| `CnabRetornoProcessar` | `CNAB_RETORNO_PROCESSAR` |
| `AtividadesConsultar` | `ATIVIDADES_CONSULTAR` |
| `AtividadesCriar` | `ATIVIDADES_CRIAR` |
| `AtividadesAtualizar` | `ATIVIDADES_ATUALIZAR` |
| `AtividadesCancelar` | `ATIVIDADES_CANCELAR` |
| `AtividadesComentar` | `ATIVIDADES_COMENTAR` |
| `AtividadesAtribuir` | `ATIVIDADES_ATRIBUIR` |
| `MasterGod` | `MASTER_GOD` |
| `MasterWildcard` | `*` |

---

## 13. Fontes

Documentos do repositório do backend que sustentam este texto — consulte-os quando precisar do
**porquê** de uma decisão:

| Assunto | Arquivo (repo `New project 3`) |
| --- | --- |
| Vínculos ausentes entre cadastros (base da §5) | `docs/00-ANALISE-VINCULOS-CADASTROS.md` |
| Estado, prioridades e dívidas (base da §2.10 e §3) | `docs/PROXIMOS-PASSOS-BACKEND.md` |
| Invariantes de arquitetura | `docs/convencoes/00-invariantes-projeto.md` |
| Contrato do motor de tributação | `docs/fiscal/contrato-motor-tributacao-frontend.md` |
| Gap alvo × atual, fases | `docs/00-ANALISE-GAP-ALVO-E-ESCOPO-IMPLEMENTACAO.md` |
| Plano da fatia em execução | `docs/fatias/v1.18.0-g1-identidade-fiscal-do-item.md` |
| Endurecimento do login (breaking change do `is_manager`) | `docs/etapa-v1.17.0-g3-endurecimento-do-login.md` |
