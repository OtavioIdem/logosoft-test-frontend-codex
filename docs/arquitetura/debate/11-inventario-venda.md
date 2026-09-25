# Inventário — Venda, preço e aprovação (rodada de arquitetura 11, recorte `b69`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b69-venda`, em cima da `b68`.
Fonte de verdade do backend: `../New project 3/src` (C#, leitura). **Houve acesso ao ambiente vivo**:
containers `logosoft-backend` (saudável), `logosoft-postgres` (saudável) rodando via Docker (não
subidos por este agente — já estavam de pé). Consultei o banco diretamente
(`docker exec logosoft-postgres psql -U erp_user -d erp -c "..."`) e o log do backend. **Não obtive
token de autenticação** (não há senha documentada no repositório para `otavio.idem@triplos.com.br`
nem para o login fixo `master@erp.local`, e adivinhar credencial está fora do escopo deste agente) —
por isso nenhuma chamada HTTP autenticada foi feita; toda coluna "confirmado no backend?" que
dependeria de resposta HTTP real está **não verificado**, mas está apoiada em duas fontes vivas mais
fortes que o código sozinho: o schema real do banco (`information_schema.columns`,
`\d`) e as linhas realmente gravadas nas tabelas. Onde cito uma tabela do Postgres, é consulta
executada nesta sessão, colada.

## 0. Diagnóstico Tabelas de preço — a hipótese `c4` está **parcialmente certa no sintoma, errada na causa**

O plano (`docs/PLANO-FRONTEND-ONDA-OPERACAO.md`, "Correções fora da sequência funcional") registra a
hipótese: *"`TabelasPrecoPage.tsx:53` nunca envia `empresaId`/`filialId`, e manda `termo`, que o
endpoint não declara"*. Medi as duas metades separadamente.

**`termo` não declarado**: confirmado — `TabelasPrecoController.cs:24` (`Listar([FromQuery] Guid?
empresaId, Guid? filialId, StatusTabelaPreco? status, int page = 1, int pageSize = 20, ...)`) não tem
parâmetro `termo`. Mas isso é inofensivo: ASP.NET Core ignora silenciosamente um parâmetro de query
sem correspondência no model binding — não gera 400. Mesmo padrão já registrado na rodada 10
(Divergência 16, estoque).

**`empresaId`/`filialId` nunca enviados**: confirmado no código
(`TabelasPrecoPage.tsx:53`, `listQuery = { termo, page, pageSize }`, sem `empresaId`/`filialId`) —
mas isso **não é a causa da tela vazia**. O backend resolve os dois sozinho:
`TabelaPrecoConsultaContextoResolver.cs:14-20` — se o usuário não é "global"
(`currentUser.EmpresaId != Guid.Empty`, o caso normal), `empresaEfetiva = currentUser.EmpresaId ??
empresaId`, ou seja, o backend substitui pela empresa do próprio usuário logado, **independente do
que a query trouxer**. Confirmei a claim `empresa_id` no JWT vem sempre de `usuario.EmpresaId`
(`JwtTokenService.cs:42`, gerado a partir do cadastro do usuário, nunca vazio para usuário comum).
Consultei o usuário real do ambiente: `select "Email","EmpresaId","FilialId" from erp.usuarios` →
`otavio.idem@triplos.com.br` tem `EmpresaId = 122c2dcb-5581-4aab-8bd1-0da9b97be900`, `FilialId` nulo.
Ou seja, para esse usuário a chamada sem `empresaId` filtra corretamente pela empresa dele.

**A causa real, medida em três camadas (banco, C#, TypeScript) que concordam entre si**: o endpoint
de listagem **embrulha** a resposta numa propriedade extra que o mapeador do frontend não desembrulha.

- `ListarTabelasPrecoUseCase.ExecutarAsync` (`.../ListarTabelasPrecoUseCase.cs:20-32`) devolve
  `TabelaPrecoPagedResponse`, que é `public sealed record TabelaPrecoPagedResponse(PagedResult<
  TabelaPrecoResumoResponse> Resultado)` (`TabelasPrecoResponses.cs:44`) — **uma propriedade só,
  chamada `Resultado`**, que contém o `PagedResult`. Sem `JsonStringEnumConverter` nem qualquer
  outro `JsonPropertyName` custom em todo o backend (`grep -rln "JsonStringEnumConverter\|
  AddJsonOptions" src` → zero resultados), o corpo HTTP real de `GET /api/tabelas-preco` é
  `{ "resultado": { "items": [...], "page": 1, "pageSize": 20, "totalItems": N, "totalPages": ... } }`
  — **não** `{ "items": [...], "page": 1, ... }` na raiz.
- O client do frontend (`tabelasPrecoApi.ts:23-28`, `normalizePaged`) só sabe tratar dois formatos:
  array puro, ou um objeto já no formato `PagedResult<T>` **na raiz** (`items`/`page`/`pageSize`/
  `totalItems` direto, conforme `types/erp.ts:405`). Como a resposta real não é array
  (`Array.isArray(data)` é `false`), `normalizePaged` devolve `data` sem tocar — ou seja, devolve
  `{ resultado: {...} }` inalterado.
- `TabelasPrecoPage.tsx:60-62`: `const paged = tabelasQuery.data; const tabelas = paged?.items ?? [];
  const totalRecords = paged?.totalItems ?? 0;` — como `paged` é `{ resultado: {...} }`,
  `paged.items` é `undefined` → `tabelas = []`, `totalRecords = 0`. A tela sempre renderiza
  `EmptyState`, **mesmo com a empresa certa e a query certa**, porque lê a chave errada do envelope.

**Prova por dado real**: `select count(*) from erp.tabelas_preco` → 3 linhas, todas da empresa
`122c2dcb-...` (a mesma do usuário), todas com `"StatusTabela" = 'Rascunho'` (texto, mas a coluna é
armazenada como enum mapeado — ver abaixo). Ou seja, existe dado que o GET alcançaria e filtraria
corretamente; ele só não chega à tabela por causa do envelope.

**Sintoma real, portanto**: não é 400, não é 403, não é lista vazia por falta de dado — é
**200 com corpo correto, e a tela ignora o corpo inteiro** por um `items`/`resultado.items` trocado.
A parte da hipótese `c4` que fala em `empresaId`/`filialId` ausente **não teria causado o sintoma
relatado** para um usuário comum (o backend já resolve sozinho); só causaria lista vazia/errada para
um usuário "global" (`master@erp.local`, `EmpresaId = Guid.Empty`, `MasterLogin.cs:14`) — não testado
por falta de credencial.

`GET /api/tabelas-preco/{id}` (detalhe, usado ao clicar em "Itens") **não** tem esse problema —
`ObterTabelaPrecoUseCase.cs:20-31` devolve `Result<TabelaPrecoResponse>` sem envelope extra, e o
controller faz `Ok(result.Value)` direto. Mas como a lista nunca mostra nenhuma linha, não há como o
operador clicar em "Itens" para chegar lá — o efeito prático da lista quebrada é bloquear a tela
inteira, não só a listagem.

**Bônus, achado durante a mesma leitura**: `isTabelaAtiva` (`TabelasPrecoPage.tsx:33`) verifica
`tabela.ativo === true` primeiro — mas `TabelaPrecoResponse`/`TabelaPrecoResumoResponse` do backend
**não tem campo `Ativo`** (só `Status: StatusTabelaPreco`, enum `Rascunho=1/Ativa=2/Inativa=3/
Expirada=4`, `StatusTabelaPreco.cs`). Sem `JsonStringEnumConverter`, `Status` serializa como número.
A segunda checagem (`status.toLowerCase() === 'ativa'`) nunca bate (`"1"`≠`"ativa"`). A terceira
(`Number(status) === 1`) bate para `Rascunho` (valor 1) — ou seja, **uma tabela em rascunho seria
exibida com a tag "Ativa"**, e uma tabela realmente ativa (`Status=2`) seria exibida como "Inativa".
Isto é adicional ao bug do envelope, independente dele, e só ficará visível depois que o envelope for
corrigido. Ver Divergência V1/V2.

## 1. Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida (backend) | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/vendas/pedidos` | `app/(main)/vendas/pedidos/page.tsx` | `PedidosVendaPage.tsx` | leitura `VENDAS_CONSULTAR` (`PedidosVendaController.cs:24`) | `routePermissions.ts:37` (`anyOf` inclui as cinco `VENDAS_*`); `AppMenu.tsx:105`; catálogo `permissoesCatalogo.ts:73-77`; união `types/erp.ts:276-280`. Componente checa só `VENDAS_CONSULTAR` (`PedidosVendaPage.tsx:55`) |
| `/vendas/pedidos/novo` | `app/(main)/vendas/pedidos/novo/page.tsx` | `PedidoVendaDetalhePage` (mesma, `pedidoId` indefinido) | leitura `VENDAS_CONSULTAR`; criação `VENDAS_GERENCIAR` (`PedidosVendaController.cs:41`) | idem acima |
| `/vendas/pedidos/[id]` | `app/(main)/vendas/pedidos/[id]/page.tsx` | `PedidoVendaDetalhePage.tsx` | leitura `VENDAS_CONSULTAR`; editar/itens `VENDAS_GERENCIAR`; aprovar `VENDAS_APROVAR`; cancelar `VENDAS_CANCELAR`; faturar `VENDAS_FATURAR` (`PedidosVendaController.cs`, linha por ação, ver seção 2) | idem acima. Botões usam `PermissionGuard mode="disable"` por ação (`PedidoVendaDetalhePage.tsx:229-234`) |
| `/tabelas-preco` | `app/(main)/tabelas-preco/page.tsx` | `TabelasPrecoPage.tsx` | leitura `TABELAS_PRECO_CONSULTAR` (`TabelasPrecoController.cs:23`); gerenciar/ativar/inativar/itens conforme ação (`:41,54,67,79,91,105,116`) | `routePermissions.ts:36`; `AppMenu.tsx:106`; catálogo `permissoesCatalogo.ts:78-84`; união `types/erp.ts:281-287`. Componente checa `TABELAS_PRECO_CONSULTAR` (`TabelasPrecoPage.tsx:66`) |

Não existe rota/tela dedicada a "fila de pedidos pendentes de aprovação" (ver seção 3). A
única forma de ver pedidos aguardando aprovação hoje é `/vendas/pedidos` com o filtro de `status`
(`Dropdown`, `PedidosVendaPage.tsx:62`) ajustado manualmente para `AguardandoAprovacao` — não há
rota própria, nem contagem em destaque além do card "Aguardando aprovação" no resumo da própria
listagem geral (`:73`).

## 2. Endpoints consumidos

Fonte: `PedidosVendaController.cs`, `PedidoVendaRequests.cs`, `PedidoVendaResponse.cs`;
`TabelasPrecoController.cs`, `TabelasPrecoRequests.cs`, `TabelasPrecoResponses.cs`.

### Pedidos de venda (`features/vendas/api/vendasApi.ts`)

| Método + rota | Permissão backend | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/vendas/pedidos` | `VENDAS_CONSULTAR` | — (query só) | não achei entrada própria em `docs/CONTRATO_*`/`docs/contracts/` para Vendas; não procurado a fundo (fora do recorte de tempo) | sim — assinatura lida em `PedidosVendaController.cs:23-29`. **`empresaId` é `Guid` obrigatório, não `Guid?`** |
| `GET /api/vendas/pedidos/{id}` | `VENDAS_CONSULTAR` | — | idem | sim (`:31-38`) |
| `POST /api/vendas/pedidos` | `VENDAS_GERENCIAR` | `criarPedidoVendaSchema` | idem | sim (`:40-47`) |
| `PUT /api/vendas/pedidos/{id}` | `VENDAS_GERENCIAR` | `atualizarPedidoVendaSchema` | idem | sim (`:49-56`) |
| `POST /api/vendas/pedidos/{id}/itens` | `VENDAS_GERENCIAR` | `adicionarItemPedidoVendaSchema` | idem | sim (`:58-65`) |
| `PUT /api/vendas/pedidos/{id}/itens/{itemId}` | `VENDAS_GERENCIAR` | `atualizarItemPedidoVendaSchema` | idem | sim (`:67-74`) |
| `POST /api/vendas/pedidos/{id}/itens/{itemId}/remover` | `VENDAS_GERENCIAR` | `motivoPedidoVendaSchema` | idem | sim (`:76-83`) |
| `POST /api/vendas/pedidos/{id}/enviar-para-aprovacao` | `VENDAS_GERENCIAR` | — (sem corpo) | idem | sim (`:85-92`) |
| `POST /api/vendas/pedidos/{id}/aprovar` | `VENDAS_APROVAR` | `aprovarPedidoVendaSchema` | idem | sim (`:94-101`) |
| `POST /api/vendas/pedidos/{id}/cancelar` | `VENDAS_CANCELAR` | `motivoPedidoVendaSchema` | idem | sim (`:103-110`) |
| `POST /api/vendas/pedidos/{id}/faturar` | `VENDAS_FATURAR` | `faturarPedidoVendaSchema` | idem | sim (`:112-119`) |

Não há endpoint de "reprovar" — busquei `Reprovar` em `Erp.Domain/Vendas`, `Erp.Application/Vendas`,
`Erp.Api/Controllers/Vendas` (grep case-insensitive) e o resultado é zero. Responde B-5 pela metade:
a operação simplesmente **não existe** (não é "existe mas está escondida"); a única forma de tirar um
pedido do fluxo de aprovação é `Cancelar` (com motivo obrigatório), que é semanticamente diferente
(cancelamento é terminal — `PedidoVenda.cs:130-141`, um pedido cancelado não pode ser reaberto).

### Tabelas de preço (`features/tabelas-preco/api/tabelasPrecoApi.ts`)

| Método + rota | Permissão backend | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/tabelas-preco` | `TABELAS_PRECO_CONSULTAR` | — | não achei entrada própria | sim, mas **resposta embrulhada em `resultado`** (seção 0) — a UI não usa o que o endpoint entrega |
| `GET /api/tabelas-preco/{id}` | `TABELAS_PRECO_CONSULTAR` | — | idem | sim, sem embrulho |
| `POST /api/tabelas-preco` | `TABELAS_PRECO_GERENCIAR` | `tabelaPrecoSchema` | idem | sim |
| `PUT /api/tabelas-preco/{id}` | `TABELAS_PRECO_GERENCIAR` | `tabelaPrecoSchema` | idem | sim |
| `POST /api/tabelas-preco/{id}/ativar` | `TABELAS_PRECO_ATIVAR` | — | idem | sim |
| `POST /api/tabelas-preco/{id}/inativar` | `TABELAS_PRECO_INATIVAR` | `tabelaPrecoMotivoSchema` | idem | sim |
| `POST /api/tabelas-preco/{id}/itens` | `TABELAS_PRECO_ITENS_GERENCIAR` | `tabelaPrecoItemSchema` | idem | sim |
| `PUT /api/tabelas-preco/{id}/itens/{itemId}` | `TABELAS_PRECO_ITENS_GERENCIAR` | `tabelaPrecoItemSchema` (parcial) | idem | sim |
| `POST /api/tabelas-preco/{id}/itens/{itemId}/inativar` | `TABELAS_PRECO_ITENS_GERENCIAR` | `tabelaPrecoMotivoSchema` | idem | sim |
| `GET /api/tabelas-preco/produtos/{produtoId}/preco-vigente` | `TABELAS_PRECO_CONSULTAR` | — | idem | sim (`TabelasPrecoController.cs:126-137`); `dataReferencia` é `DateOnly` obrigatório na assinatura, mas a UI sempre inicializa com `new Date()` (`TabelasPrecoPage.tsx:49`), então nunca fica ausente na prática |

Nenhuma das dez rotas de Vendas nem das nove de Tabelas de preço aparece em
`scripts/backend-contract-map.allowlist.json` (nem em `legacyReferences`, nem em
`documentedDivergences`) — consistente com "endpoint compatível, nada a registrar", **mas o bug do
envelope `resultado` também não está registrado em lugar nenhum**; não rodei o gate
`validate:backend-contract-map` nesta sessão (não verificado se ele captura esse tipo de mismatch de
corpo — pela leitura anterior de gates equivalentes, ele valida rota/verbo, não formato do corpo).

## 3. Fila de pedidos pendentes de aprovação

**Não existe uma fila dedicada.** `/vendas/pedidos` é uma listagem geral com filtro `status`
opcional — mesma rota, mesmo componente, mesmo endpoint (`GET /api/vendas/pedidos`) usado para
qualquer status. Não há:

- Rota própria (`/vendas/pedidos/aprovacao` ou equivalente) — não existe.
- Endpoint de fila com paginação de servidor — não existe; `VendasRepository.ListarPedidosAsync`
  (`Erp.Infrastructure/Vendas/VendasRepository.cs:27-39`) devolve até **200 registros**
  (`.Take(200)`, linha 39), ordenados por `DataEmissao` desc, sem `page`/`pageSize`/`skip`/`hasMore`
  no contrato — se uma empresa tiver mais de 200 pedidos que casem com o filtro, os excedentes
  (os mais antigos) somem silenciosamente, sem qualquer sinal na resposta de que a lista foi
  truncada. A paginação que `PedidosVendaPage.tsx:47` faz (`records.slice(first, first+rows)`) é só
  visual, sobre o array já truncado em 200 pelo servidor.
- Detalhe sob demanda: **existe**, via `GET /api/vendas/pedidos/{id}` (`usePedidoVenda`,
  `useVendasResources.ts:23-28`, com `enabled: Boolean(id)` — só busca ao abrir
  `/vendas/pedidos/{id}`, não pré-carrega no detalhe de cada linha da lista).
- Filtro por status no backend: **existe** (`StatusPedidoVenda? status` na assinatura do controller,
  `PedidosVendaController.cs:25`), e a UI expõe um `Dropdown` para ele
  (`statusPedidoVendaOptions`, `PedidosVendaPage.tsx:62`) — mas não há um atalho/link direto
  pré-filtrado para "aguardando aprovação"; o operador tem que selecionar manualmente toda vez, e o
  filtro não é lembrado entre sessões (estado local `useState`, perdido ao sair da página).
- O parâmetro `termo` (busca por `Numero`, `VendasRepository.cs:35`) está **implementado no client**
  (`vendasApi.ts:37`, `params()` inclui `termo`) mas **nunca é preenchido pela tela** —
  `PedidosVendaPage.tsx` usa uma busca inteiramente local (`localSearch`/`filterLocal`, linha 28-32,
  38, 63) sobre os dados já carregados, e nunca escreve em `filters.termo`. O filtro server-side por
  termo existe nos dois lados do contrato e nunca é acionado — campo do `PedidoVendaListQuery`
  `sem uso` na prática, apesar de tipado e implementado no client de API.

## 4. Aprovação

`POST /api/vendas/pedidos/{id}/aprovar`, permissão `VENDAS_APROVAR`
(`PedidosVendaController.cs:94-101`, `SystemPermissions.VendasAprovar`).

**Request** (`AprovarPedidoVendaRequest(bool ReservarEstoque, string? Observacao)`,
`PedidoVendaRequests.cs:37`) — casa 1:1 com o schema `aprovarPedidoVendaSchema`
(`vendasSchemas.ts:46-49`) e o tipo do frontend. Validador (`PedidoVendaValidators.cs:57-63`) só
limita `Observacao` a 300 caracteres — nada no `ReservarEstoque`.

**O que dispara** (`AprovarPedidoVendaUseCase.cs:43-83`):

1. Valida contexto organizacional (empresa/filial do pedido contra o usuário logado —
   `OrganizationalContextGuard`).
2. Revalida o cliente (`VendaClienteValidator`) e cada produto ativo do pedido
   (`VendaProdutoValidator.ValidarVendaAsync`) — pode falhar mesmo que o pedido já tivesse itens
   válidos quando foram adicionados (produto pode ter sido desativado/alterado depois).
3. `pedido.Aprovar(...)` (domínio) — aceita pedido em **Rascunho OU AguardandoAprovacao**
   (`PedidoVenda.cs:95-106`, `StatusPedido is not (Rascunho or AguardandoAprovacao)` lança). Exige
   ao menos um item ativo.
4. **Se `ReservarEstoque == true`**: `VendaPedidoEstoqueOrchestrator.ReservarAsync`
   (`VendaPedidoEstoqueOrchestrator.cs:24-48`) — para cada item ativo sem reserva prévia, se o
   produto controla estoque, exige `LocalEstoqueId` informado e chama
   `IEstoqueService.CriarReservaAsync` com `OrigemModulo = "Vendas.PedidoVenda"`,
   `origemId = pedido.Id`. **Responde B-15 para o recorte de venda**: `IEstoqueService` é a
   interface de `Erp.Application.Estoque` (o sistema **básico**, o mesmo que move
   `EstoqueSaldo` e que a rodada 10/D72 já identificou como o único que Compras e Vendas integram)
   — não é o `IEstoqueAvancadoService`. Vínculo gravado de volta no item
   (`pedido.VincularReservaItem`, grava `ItemPedidoVenda.ReservaEstoqueId`).
5. Registra histórico de status (`VendaHistoricoStatusRegistrar`, grava em
   `HistoricoStatusPedidoVenda` — tabela sem endpoint de leitura, ver Divergência V8) e auditoria
   (`VendaAuditoria`, entidade `"PedidoVenda"`).

**Erros de domínio possíveis**: pedido não encontrado; contexto organizacional inválido; cliente
inválido; produto não encontrado/não vende/controla estoque sem local; `DomainException` de
`Aprovar()` (status errado, sem item ativo); falha de reserva (saldo insuficiente — propagada como
`VendaErrors.FalhaEstoque`). Todos retornam `BadRequest` genérico (sem `field` por erro — mesma
limitação estrutural que B-10 já registra para Compras).

**Reprovar**: não existe (confirmado seção 2).

**Direto de Rascunho, sem passar por "aguardando aprovação"**: o domínio permite (`Aprovar()` aceita
`Rascunho`), mas a UI **não permite** — `pedidoPodeAprovar` (`vendasUiUtils.ts:68`) só libera o botão
"Aprovar" quando `statusPedido === AguardandoAprovacao`. Um pedido em Rascunho só pode ser aprovado
pela API se alguém chamar o endpoint fora da tela; a UI força sempre o caminho
Rascunho→(Enviar)→AguardandoAprovacao→Aprovar, mais estrito que o contrato. Ver Divergência V6.

## 5. "Até a liberação"

**"Liberação" não é um termo do domínio de Vendas.** Busquei `Liberar`/`Liberacao`/`Liberação` em
`Erp.Domain/Vendas`, `Erp.Application/Vendas`, `Erp.Api/Controllers/Vendas` — zero resultados. O
termo existe no backend só em Produção (`LiberarOrdemProducao...UseCase.cs`, já catalogado na
rodada 10 como uma das origens hardcoded de `OrigemModulo`). Para Pedido de Venda, o fluxo de status é
`Rascunho(1) → AguardandoAprovacao(2) → Aprovado(3) → Faturado(5)`, com `Cancelado(4)` como desvio
terminal a partir de qualquer um dos três primeiros (`StatusPedidoVenda.cs`,
`PedidoVenda.ExigirPodeCancelar`). O estado mais próximo de "liberado" é **Aprovado** — é o único
status a partir do qual `Faturar`, `GerarNotaFiscalRascunho` e `BaixarEstoquePorNotaFiscalAutorizada`
ficam disponíveis (`PedidoVenda.cs:158-194`). **Faturamento já existe e já está implementado** no
código atual (`FaturarPedidoVendaUseCase.cs`, botão "Faturar" em produção na tela de detalhe,
`PedidoVendaDetalhePage.tsx:232`) — não é um recurso novo a construir na `b69`; se "até a liberação"
significa que o recorte da rodada para *nesta versão* no status Aprovado e deixa Faturamento como já
resolvido/fora de escopo de mudança, isso não está declarado em lugar nenhum do plano nem do código.
**Isto é uma pergunta ao produto, não uma leitura de contrato** — devolvida como pendência.

## 6. Permissões

Permissões do backend (`SystemPermissions.cs:72-76,94-100`): `VENDAS_CONSULTAR`,
`VENDAS_GERENCIAR`, `VENDAS_APROVAR`, `VENDAS_CANCELAR`, `VENDAS_FATURAR`,
`TABELAS_PRECO_CONSULTAR`, `TABELAS_PRECO_GERENCIAR`, `TABELAS_PRECO_ATIVAR`,
`TABELAS_PRECO_INATIVAR`, `TABELAS_PRECO_ITENS_GERENCIAR` — todas as dez existem no union
(`types/erp.ts:276-285`), no catálogo (`permissoesCatalogo.ts:73-82`) e em pelo menos uma regra de
`routePermissions.ts` e um item do `AppMenu.tsx`. Nenhuma permissão órfã nessa direção
(backend tem, frontend não sabe).

**Órfãs na direção contrária** (frontend declara, backend não amarra a nenhum endpoint):
`VENDAS_PRECO_MINIMO_SOBRESCREVER` (`types/erp.ts:287`, `permissoesCatalogo.ts:84`) e
`POLITICA_COMERCIAL_GERENCIAR` (`types/erp.ts:286`, `permissoesCatalogo.ts:83`). O próprio backend
documenta a remoção deliberada: `PermissoesCatalogoDefinition.cs:118-121` e `:128-130` —
"`sobrescreverPrecoMinimo` (`SystemPermissions.VendasPrecoMinimoSobrescrever`) saiu do catálogo: não
guarda nenhum endpoint... Volta quando existir o endpoint que a usa" (decisão `D3, v1.21.3/G1`,
mesma nota para `politicaComercial`/`PoliticaComercialGerenciar`). A constante C# ainda existe
(`SystemPermissions.cs:99-100`) e ainda está em `SystemPermissions.TodasComMaster`
(`:340-341`), mas nenhum `[RequiredPermission]` a referencia em nenhum controller. O frontend nunca
recebeu essa remoção: as duas seguem no union, no catálogo, e portanto **atribuíveis** em qualquer
tela de grupo de acesso — concedê-las hoje não abre nem fecha nenhuma capacidade real no backend.
Este é exatamente o tipo de achado que `npm run validate:backend-permissions` deveria capturar
(união × snapshot do backend); não rodei o gate nesta sessão.

## 7. Money on screen

| Onde aparece | Campo exibido | Vem de | Nome bate com o record C#? |
| --- | --- | --- | --- |
| Lista de pedidos, coluna "Total"; cards de resumo | `pedido.valorTotal` | `PedidoVendaResponse.ValorTotal` | sim |
| Detalhe do pedido, card "Totais" | `pedido.valorProdutos`, `pedido.valorDesconto`, `pedido.valorTotal` | `PedidoVendaResponse.ValorProdutos/ValorDesconto/ValorTotal` | sim, os três |
| Itens do pedido, colunas "Unitário"/"Desconto"/"Total" | `item.valorUnitario`, `item.valorDesconto`, `item.valorTotal ?? quantidade*unitario-desconto` | `ItemPedidoVendaResponse.ValorUnitario/ValorDesconto/ValorTotal` | sim; o fallback do `??` nunca dispara porque `ValorTotal` é sempre enviado (não anulável no backend) |
| Item do pedido — `ValorBruto` | **não exibido em lugar nenhum** | `ItemPedidoVendaResponse.ValorBruto` (entregue) | campo existe no backend, ausente do tipo do frontend — sem uso |
| Diálogo de item, "Total visual" | calculado no cliente (`quantidade*valorUnitario - valorDesconto`) | derivado, não vem de campo de resposta (é pré-visualização antes de salvar) | n/a — `derivado` |
| Tabelas de preço, coluna "Preço"/"Mínimo"/"Margem" | `item.precoVenda`, `item.precoMinimo`, `item.margemPercentual` | `TabelaPrecoItemResponse.PrecoVenda/PrecoMinimo/MargemPercentual` | nome bate, **anulabilidade não bate** — `PrecoMinimo`/`MargemPercentual` são `decimal?` no backend e nulos na coluna do banco (`information_schema.columns`: `PrecoMinimo`/`MargemPercentual` = `is_nullable: YES`), mas `number` obrigatório no tipo do frontend (`tabelasPreco.types.ts:33-34`). `item.margemPercentual.toFixed(2)` (`TabelasPrecoPage.tsx:156`) **quebra em runtime** (`TypeError`) se algum item tiver `MargemPercentual` nulo — não observado ainda porque a tabela hoje tem zero itens gravados (`select count(*) from erp.tabelas_preco_itens` → 0), mas o caminho de escrita do backend permite null (`AdicionarTabelaPrecoItemRequestValidator`, sem `NotNull`) mesmo que o formulário do frontend sempre force um valor (`tabelaPrecoItemSchema`, `required_error`) — a lacuna só se materializa se algum dado for gravado por outro caminho (seed, endpoint futuro, import) |
| "Preço vigente" (consulta ad hoc) | `precoVigenteQuery.data.precoVenda/precoMinimo/margemPercentual` | `PrecoProdutoVigenteResponse.PrecoVenda/PrecoMinimo/DataReferencia` | **`margemPercentual` não existe no `PrecoProdutoVigenteResponse` do backend** (`TabelasPrecoResponses.cs:46`: só `TabelaPrecoId, ItemId, ProdutoId, PrecoVenda, PrecoMinimo, DataReferencia` — sem margem) mas o tipo do frontend declara `margemPercentual: number` (`tabelasPreco.types.ts:99`) e a tela chama `.toFixed(2)` sobre ele (`TabelasPrecoPage.tsx:174`) sem checagem de nulo — **campo lido pela UI que o backend não entrega neste endpoint**, e também aqui o `.toFixed` quebra se o valor vier `undefined` |
| Item de venda × preço de tabela | **não existe conexão nenhuma** | — | Pedido de Venda não lê `TabelaPreco`/`preco-vigente` em nenhum ponto do backend (`AdicionarItemPedidoVendaUseCase.cs`, `VendaProdutoValidator.cs` — sem qualquer referência a `TabelasPreco`); `valorUnitario`/`valorDesconto` do item são 100% digitação manual (`PedidoVendaItemDialog.tsx:61-62`, `MoneyInput` livre, sem pré-preenchimento por `usePrecoVigente`). O nome do recorte ("Venda, preço...") sugere integração que **não existe hoje em nenhuma das duas pontas** |

## 8. Estados de tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pedidos de venda (`PedidosVendaPage`) | presente (`DataTableServer loading={pedidosQuery.isFetching}`) | presente (`EmptyState`, `:88`) | presente (`ApiErrorPanel`, `:78`) | não verificado (sem distinção de bloqueante vs. recuperável no código) | presente (dados renderizam, cards de resumo) | presente (`UnauthorizedState`, `:55`) | ausente — "Novo pedido" usa `PermissionGuard mode="disable"` sem tooltip/motivo (`:64`); linha "Abrir" sempre disponível se `VENDAS_CONSULTAR` |
| Detalhe do pedido (`PedidoVendaDetalhePage`) | presente (`LoadingState variant="detail"`, `:242`) | n/a (registro único) | presente (`ApiErrorPanel`, `:243`) | não verificado | presente (toast via `useMutationWithToast` em cada ação) | presente (`UnauthorizedState`, `:138`) | presente parcialmente — botões (`Editar`/`Enviar`/`Aprovar`/`Faturar`/`Cancelar`) ficam `disabled` sem texto próprio, **mas** o card "Ações disponíveis" (`AcoesDisponiveisPanel`, `:92-106`) lista bloqueios em texto (`Message severity="warn"`, via `pedidoVendaBloqueiosVisuais`) — a explicação existe, só não está colada no botão |
| Tabelas de preço (`TabelasPrecoPage`) | presente (`DataTableServer loading`, mais `detalheQuery.isFetching` na sub-tabela de itens) | presente (`EmptyState`, `:140`) — **hoje sempre ativo**, mesmo com dado existente, por causa do bug do envelope (seção 0) | presente (`ApiErrorPanel`, `:127`) | não verificado | presente (toast) | presente (`UnauthorizedState`, `:67`) | ausente — botões "Ativar"/"Inativar" usam `disabled` sem motivo textual, e a lógica de `disabled` em si está incorreta (seção 0, `isTabelaAtiva`) |

## Tabela de campos

### Pedido de venda — cabeçalho

`PedidoVendaResponse` do frontend (`vendas.types.ts:22-41`) declara 17 campos escalares (fora
`itens`). Os 17 batem em nome e existência com `PedidoVendaResponse` do backend
(`PedidoVendaResponse.cs:5-23`) — **entregue = 17/17**. Nenhuma divergência de nome. Dentro desses
17, dois nunca são lidos por nenhum componente:

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `PedidoVendaResponse.Id` | sim | exibido (chave/navegação) |
| `empresaId` | `Guid` | `.EmpresaId` | sim | exibido (escopo de queries relacionadas) + enviado (criação) |
| `filialId` | `Guid?` | `.FilialId` | sim | exibido + enviado (criação) |
| `numero` | `string` | `.Numero` | sim | exibido (coluna) + enviado (criação) |
| `clienteId` | `Guid` | `.ClienteId` | sim | exibido (via label) + enviado (criação) |
| `dataEmissao` | `IsoDateTime` | `.DataEmissao` | sim | exibido + enviado (criação) |
| `dataPrevisaoEntrega` | `IsoDateTime?` | `.DataPrevisaoEntrega` | sim | exibido + enviado (criar/editar) |
| `tipo` | `TipoPedidoVenda\|number` | `.Tipo` | sim | exibido (label) + enviado (criar/editar) |
| `statusPedido` | `StatusPedidoVenda\|number` | `.StatusPedido` | sim | exibido (tag, motor de toda regra de habilitação de botão) |
| `valorProdutos` | `number` | `.ValorProdutos` | sim | exibido |
| `valorDesconto` | `number` | `.ValorDesconto` | sim | exibido |
| `valorTotal` | `number` | `.ValorTotal` | sim | exibido (lista + detalhe + soma do resumo) |
| `observacao` | `string?` | `.Observacao` | sim | exibido + enviado (criar/editar) |
| `motivoCancelamento` | `string?` | `.MotivoCancelamento` | sim | **sem uso** — declarado no tipo, nunca lido em nenhum `.tsx` (`grep motivoCancelamento features/vendas` só acha a própria declaração de tipo). O operador digita o motivo ao cancelar (`ReasonDialog`) mas nunca mais o vê de volta |
| `aprovadoEm` | `IsoDateTime?` | `.AprovadoEm` | sim | exibido só como booleano (`pedido.aprovadoEm ? 'Aprovado' : ...'`, `:254`) — o timestamp em si nunca aparece |
| `canceladoEm` | `IsoDateTime?` | `.CanceladoEm` | sim | **sem uso** — nem a leitura booleana existe; `grep "\.canceladoEm" features/vendas` não acha nenhum uso fora da declaração de tipo |
| `faturadoEm` | `IsoDateTime?` | `.FaturadoEm` | sim | exibido só como booleano (mesmo padrão de `aprovadoEm`) |

Conta (cabeçalho): **17 lidos pela UI = 15 com destino (exibido/enviado) + 0 divergência + 2 sem
uso** (`motivoCancelamento`, `canceladoEm`). Fecha.

Campos que o backend entrega e o **tipo do frontend nem declara** (não entram na conta acima porque
não são "lidos pela UI" — a UI não tem como lê-los): `AprovadoPor`, `CanceladoPor`, `FaturadoPor`
(três `Guid?`, quem executou cada ação) **não existem em `PedidoVendaResponse.cs` também** — são
campos só do domínio (`PedidoVenda.cs:37,39,41`), o mapper (`VendaMapper.cs:8-27`) não os inclui na
resposta. Não é uma lacuna do frontend: o próprio backend não expõe "quem aprovou/cancelou/faturou"
em nenhum endpoint hoje.

### Pedido de venda — item

`ItemPedidoVendaResponse` do frontend (`vendas.types.ts:11-20`) declara 8 campos. O backend
(`ItemPedidoVendaResponse` em `PedidoVendaResponse.cs:25-37`) entrega **12**.

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido (chave/ações) |
| `produtoId` | `Guid` | `.ProdutoId` | sim | exibido (via label) |
| `localEstoqueId` | `Guid?` | `.LocalEstoqueId` | sim | exibido (via label, "-" se nulo) |
| `quantidade` | `number` | `.Quantidade` | sim | exibido (coluna) |
| `valorUnitario` | `number` | `.ValorUnitario` | sim | exibido (coluna) |
| `valorDesconto` | `number` | `.ValorDesconto` | sim | exibido (coluna) |
| `valorTotal` | `number?` | `.ValorTotal` | sim, obrigatório (mais forte que o `?` do frontend) | exibido (coluna) |
| `observacao` | `string?` | `.Observacao` | sim | exibido, mas só dentro do diálogo de edição — **sem coluna na tabela de itens** |
| — (ausente do tipo) | — | `.Sequencia` (`int`) | sim | **sem uso** — ordena a exibição no backend (`VendaMapper.cs:27`, `OrderBy(x => x.Sequencia)`), mas não é exposto para o frontend renderizar um número de linha próprio |
| — (ausente do tipo) | — | `.ValorBruto` (`decimal`) | sim | **sem uso** (ver seção 7) |
| — (ausente do tipo) | — | `.ReservaEstoqueId` (`Guid?`) | sim | **sem uso** — não há nenhuma indicação visual de que um item tem ou não reserva vinculada, mesmo esse sendo o efeito direto da ação "Aprovar com reserva de estoque" |
| — (ausente do tipo) | — | `.QuantidadeBaixadaEstoque` (`decimal`) | sim | **sem uso** — não há indicação de quanto de cada item já foi baixado do estoque pelo faturamento (relevante para faturamento parcial, se algum dia existir) |

Conta (item): **8 lidos pela UI = 8 com destino declarado (exibido) + 0 divergência + 0 sem uso**.
Fecha. Separadamente, **4 campos entregues pelo backend e ausentes do tipo do frontend**
(`sequencia`, `valorBruto`, `reservaEstoqueId`, `quantidadeBaixadaEstoque`) — não entram na conta de
"lidos" porque o frontend não os declara; ficam registrados como achado na seção de Divergências.

### Tabela de preço — cabeçalho e item

`TabelaPrecoResponse` do frontend (`tabelasPreco.types.ts:14-27`) declara 12 campos.

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido/chave |
| `empresaId` | `Guid` | `.EmpresaId` | sim | enviado implícito (escopo), não exibido em coluna |
| `filialId` | `Guid?` | `.FilialId` | sim | não exibido em coluna |
| `nome` | `string` | `.Nome` | sim | exibido (coluna) |
| `dataInicioVigencia`/`dataFimVigencia` | `string`/`string?` | `.DataInicioVigencia`/`.DataFimVigencia` | sim | exibido (coluna "Vigência") |
| `padrao` | `boolean` | `.Padrao` | sim | exibido (coluna "Padrão") |
| `status` | `TabelaPrecoStatus` | `.Status` (`StatusTabelaPreco`, serializa como número) | sim | exibido — **mas a lógica que o lê (`isTabelaAtiva`) está incorreta** (seção 0) |
| `ativo` | `boolean?` | — | **não** — `TabelaPrecoResponse`/`TabelaPrecoResumoResponse` do backend não têm campo `Ativo` | **sem uso** (checagem sempre falsa, campo nunca populado) |
| `itens` | `TabelaPrecoItemResponse[]?` | `.Itens` (só no detalhe, `GET /{id}`) | sim, no detalhe; ausente na listagem (`TabelaPrecoResumoResponse` não tem `Itens` — correto, a UI só lê `itens` via `tabelaDetalhe`, nunca da linha da lista) | exibido (sub-tabela) |
| `criadoEm`/`alteradoEm` | `IsoDateTime?` | — | **não** — não existem em nenhum dos dois records de resposta do backend | **sem uso** |

Conta (cabeçalho tabela): **12 lidos pela UI = 9 com destino (id, empresaId, filialId, nome,
dataInicioVigencia+dataFimVigencia contados como 1 uso de coluna, padrao, status, itens) + 1
divergência apontada (`status`, entregue mas lido com lógica errada) + 2 sem uso** (`ativo`,
`criadoEm`/`alteradoEm` contados juntos como par) — a soma exata depende de como se conta
`dataInicioVigencia`/`dataFimVigencia` (2 campos, 1 coluna); somando campo a campo: 12 = 10 com
destino + 2 sem uso (`ativo`, e o par `criadoEm`+`alteradoEm` conta como 2) — **não fecha em 12 com
essa contagem** porque marquei `status` tanto como "com destino" quanto como "divergência"; o correto
é: 12 lidos = 9 com destino limpo + 1 com destino errado (divergência, `status`) + 2 sem uso
(`ativo`) + ... isso ainda deixa `criadoEm`/`alteradoEm` (2 campos) sem contar. Registro à parte para
não forçar a aritmética: **12 campos lidos = 8 corretos e exibidos, 1 exibido com lógica quebrada
(`status`), 3 nunca populados pelo backend (`ativo`, `criadoEm`, `alteradoEm`)** → 8+1+3 = 12. Fecha
assim.

`TabelaPrecoItemResponse` do frontend (`tabelasPreco.types.ts:29-36`) declara 6 campos; o backend
entrega 7.

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido/chave |
| `produtoId` | `Guid` | `.ProdutoId` | sim | exibido (via label) |
| `precoVenda` | `number` | `.PrecoVenda` | sim, não anulável — bate | exibido |
| `precoMinimo` | `number` (obrigatório) | `.PrecoMinimo` | sim, **`decimal?` anulável** (coluna do banco `is_nullable: YES`) | exibido — **anulabilidade divergente**, risco de crash se vier nulo |
| `margemPercentual` | `number` (obrigatório) | `.MargemPercentual` | sim, **`decimal?` anulável** | exibido via `.toFixed(2)` sem checagem de nulo — **mesmo risco**, e o único dos dois já com `.toFixed` direto no JSX (`TabelasPrecoPage.tsx:156`) |
| `ativo` | `boolean?` | `.Ativo` | sim, `bool` não anulável | exibido (`disabled: item.ativo === false`) |
| — (ausente do tipo) | — | `.Historicos` (`HistoricoPrecoProdutoResponse[]`) | sim | **sem uso** — histórico de alteração de preço por item (preço anterior, preço novo, usuário, data, motivo) é gravado pelo backend a cada `AtualizarItemTabelaPrecoUseCase` e nunca lido/exibido pelo frontend |

Conta (item tabela): **6 lidos pela UI = 4 com destino limpo (id, produtoId, precoVenda, ativo) + 2
divergência apontada (precoMinimo, margemPercentual — anulabilidade)**. 4+2 = 6. Fecha. Separado: 1
campo entregue e ausente do tipo (`historicos`).

## Divergências

**V1 — `GET /api/tabelas-preco` embrulha a resposta em `{ "resultado": {...} }`; o client do
frontend só sabe ler `PagedResult` na raiz.** Causa raiz da tela "Tabela de preços não carrega"
(seção 0). `TabelasPrecoResponses.cs:44` (`TabelaPrecoPagedResponse(PagedResult<...> Resultado)`) ×
`tabelasPrecoApi.ts:23-28` (`normalizePaged`) × `types/erp.ts:405` (`PagedResult<T>` sem campo
`resultado`). Confirmado por leitura de código nas duas pontas; não confirmado por resposta HTTP real
(sem credencial), mas reforçado por dado real no banco (3 tabelas existentes, 0 aparecem na tela por
construção do bug, independente de dado).

**V2 — `isTabelaAtiva` (`TabelasPrecoPage.tsx:33`) usa um campo que o backend não envia (`ativo`) e
depois compara um enum serializado como número contra a string `'ativa'`.** Resultado: toda tabela em
`Rascunho` (valor 1) aparece marcada "Ativa"; toda tabela realmente `Ativa` (valor 2) aparece marcada
"Inativa". Independente de V1 — só fica visível depois que V1 for corrigido e linhas passarem a
aparecer na tela.

**V3 — `PrecoProdutoVigenteResponse` (backend) não tem `MargemPercentual`, mas o tipo do frontend
`PrecoVigenteResponse` declara `margemPercentual: number` e a tela chama `.toFixed(2)` sobre ele sem
checagem.** `TabelasPrecoResponses.cs:46` × `tabelasPreco.types.ts:94-101` ×
`TabelasPrecoPage.tsx:174`. Campo lido pela UI que o backend não entrega neste endpoint específico —
risco de `TypeError` em runtime na consulta de "Preço vigente".

**V4 — `TabelaPrecoItemResponse.PrecoMinimo`/`.MargemPercentual` são `decimal?` no backend e
`is_nullable: YES` no banco (`erp.tabelas_preco_itens`), mas `number` obrigatório no tipo do
frontend; `margemPercentual.toFixed(2)` é chamado direto, sem `?.`.** Sem dado hoje para provar em
produção (tabela de itens está vazia — `select count(*) from erp.tabelas_preco_itens` → 0), mas o
caminho de escrita do backend (`AdicionarTabelaPrecoItemRequestValidator`, sem `NotNull` em nenhum
dos dois) permite gravar nulo mesmo que o formulário do frontend sempre envie um valor — a lacuna
existe por contrato, não por uso atual.

**V5 — `GET /api/vendas/pedidos` exige `empresaId` como `Guid` obrigatório
(`PedidosVendaController.cs:25`), e a lógica que trata `empresaId == Guid.Empty` como erro de
validação (`OrganizationalContextGuard.cs:16-19`) devolve `Result.Failure`, que
`ListarPedidosVendaUseCase.cs:21,24` converte silenciosamente em `Array.Empty<PedidoVendaResponse>()`
— HTTP 200, corpo `[]`, sem qualquer sinal de erro.** `PedidosVendaPage.tsx` monta `filters={}` no
primeiro render e `usePedidosVenda` (`useVendasResources.ts:17-21`) não tem `enabled` — a primeira
chamada sai sem `empresaId`. Na prática o efeito é atenuado (não é um "brick" permanente): o
componente usa `EmpresaFilialFilter`, que sincroniza `filters.empresaId` com o contexto organizacional
global do topbar via `useEffect` (`EmpresaFilialFilter.tsx:22-31`) e refaz a busca quase
imediatamente — mas só se esse contexto já tiver uma empresa resolvida. Diferença chave em relação a
`TabelasPreco` (que tem o mesmo padrão de omitir `empresaId`, V1 à parte): lá o **backend** resolve
sozinho via `TabelaPrecoConsultaContextoResolver` (usa `currentUser.EmpresaId` quando a query vem
vazia); aqui o **backend não tem esse fallback** — quem resolve é só o frontend, e só depois de um
efeito assíncrono. Para um usuário "global" (`EmpresaId == Guid.Empty`, caso do login fixo
`master@erp.local`) ou antes do contexto organizacional hidratar, a lista fica vazia sem erro visível,
indistinguível de "não há pedidos". Não verificado contra resposta HTTP real.

**V6 — `pedidoPodeAprovar` (`vendasUiUtils.ts:68`) só libera "Aprovar" quando
`statusPedido === AguardandoAprovacao`, mas `PedidoVenda.Aprovar()` (`PedidoVenda.cs:95-106`) aceita
também `Rascunho`.** A UI é mais restrita que o contrato — não é bug de contrato quebrado, é uma
política de fluxo (sempre passar por "enviar para aprovação") que a tela impõe e o backend não exige.
Vale registrar porque muda o que "aprovável" significa nos dois lados, e a rodada 10 já usou esse
mesmo vocabulário para a discrepância de anulabilidade de filiais na transferência de estoque.

**V7 — `VendasRepository.ListarPedidosAsync` tem `.Take(200)` fixo (`VendasRepository.cs:39`), sem
`page`/`pageSize`/`totalItems`/`hasMore` no contrato.** Acima de 200 pedidos por combinação de
filtro, os mais antigos desaparecem da resposta sem qualquer sinal — mesma classe de risco que a
rodada 10 registrou para `GET /api/estoque/movimentos` (crescimento sem paginação de servidor), aqui
com um teto ao menos existente (200), mas silencioso.

**V8 — `HistoricoStatusPedidoVenda` é gravado a cada troca de status (`VendaHistoricoStatusRegistrar`)
e nunca exposto por nenhum endpoint** (`grep -rn "HistoricoStatusPedidoVenda" Erp.Api` → zero). O
`StatusFlowPanel`/`AcoesDisponiveisPanel` da tela reconstroem uma linha do tempo aproximada só a
partir do status atual e dos três timestamps (`aprovadoEm`/`canceladoEm`/`faturadoEm`) — não é uma
lacuna do frontend, é um dado que o backend guarda e não abre para leitura.

**V9 — `VENDAS_PRECO_MINIMO_SOBRESCREVER` e `POLITICA_COMERCIAL_GERENCIAR` existem no union e no
catálogo do frontend, mas o próprio backend documenta tê-las removido do seu catálogo por não
guardarem endpoint algum** (`PermissoesCatalogoDefinition.cs:118-121,128-130`, decisão `D3,
v1.21.3/G1`). Atribuíveis via tela de grupos de acesso hoje, sem efeito real.

**V10 — Pedido de Venda e Tabela de Preço não têm nenhuma integração no backend.** `valorUnitario`/
`valorDesconto` do item do pedido são 100% manuais (`PedidoVendaItemDialog.tsx`, sem chamada a
`usePrecoVigente`); nenhum use case de Vendas referencia `TabelasPreco`. O nome do recorte ("Venda,
preço e aprovação") descreve uma integração que ainda não existe em nenhuma ponta — acho que isto é o
achado estrutural mais importante para a rodada decidir escopo, mais do que qualquer campo isolado.

**V11 — `AprovarPedidoVendaRequest`/`FaturarPedidoVendaRequest.Documento` são mais permissivos no
backend do que no frontend.** `FaturarPedidoVendaRequest.Documento` é `string?` sem `.NotEmpty()`
(`PedidoVendaValidators.cs:73-79`), mas o frontend exige `min(1)` (`vendasSchemas.ts:53`) — frontend
mais estrito, mesmo padrão já catalogado na rodada 10 (Divergência 6, lá para `FilialOrigemId`).

## Pendências

Perguntas que só o backend/produto resolvem, separadas do que já foi lido no contrato:

1. **(backend, confirma sozinho o achado de maior impacto da seção 0)** A resposta real de
   `GET /api/tabelas-preco` é de fato `{ "resultado": { "items": [...] } }`? A leitura de código é
   inequívoca (`TabelaPrecoPagedResponse(PagedResult<...> Resultado)`, sem `JsonPropertyName`), mas
   não foi confirmada por captura de tráfego HTTP real (sem credencial disponível nesta sessão).
2. **(produto)** "Até a liberação" (recorte `b69`) significa que a rodada trava deliberadamente no
   status `Aprovado` e considera Faturamento (`FaturarPedidoVendaUseCase`, já implementado e em
   produção) fora do redesenho desta versão? Ou "liberação" é sinônimo pretendido de algo que ainda
   não existe no domínio?
3. **(produto/backend, decide se V10 é escopo da `b69`)** A integração Pedido de Venda × Tabela de
   Preço (preencher `valorUnitario` a partir de `preco-vigente`, e a checagem de `precoMinimo` com a
   permissão `VENDAS_PRECO_MINIMO_SOBRESCREVER`) entra nesta rodada, ou fica para depois — e nesse
   caso, o que justifica a permissão continuar declarada nos dois catálogos do frontend sem o
   endpoint que a use?
4. **(backend)** Confirma B-5: não existe "reprovar" (checado, zero resultados) — é intencional
   (cancelar é a única saída) ou é uma lacuna a preencher nesta rodada?

## Contrato de saída

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "venda",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/11-inventario-venda.md",
  "pendencias": [
    { "tipo": "backend", "pergunta": "Confirmar por captura HTTP real que GET /api/tabelas-preco devolve o corpo embrulhado em 'resultado' (hoje só confirmado por leitura de TabelaPrecoPagedResponse/ListarTabelasPrecoUseCase, sem credencial para chamar a API autenticada nesta sessão).", "decide": "se a correção é só no client (desembrulhar 'resultado') ou também no backend (remover o wrapper)" },
    { "tipo": "funcional", "pergunta": "'Até a liberação' (título do recorte b69) significa parar deliberadamente no status Aprovado e tratar Faturamento (já implementado) como fora desta rodada, ou outra coisa?", "decide": "se o escopo da b69 inclui revisão da tela de Faturar, ou só Rascunho→Aprovação→Aprovado" },
    { "tipo": "funcional", "pergunta": "A integração Pedido de Venda × Tabela de Preço (V10) entra no escopo da b69 ou fica para depois, e o que fazer com VENDAS_PRECO_MINIMO_SOBRESCREVER/POLITICA_COMERCIAL_GERENCIAR enquanto isso (remover do union/catálogo do frontend para bater com a remoção já feita no backend, D3 v1.21.3/G1)?", "decide": "escopo da b69 e limpeza de permissão órfã" },
    { "tipo": "backend", "pergunta": "B-5: confirma que 'reprovar' não existe por design (cancelar é a única saída do fluxo de aprovação), ou é lacuna a fechar nesta rodada?", "decide": "se a tela precisa de uma ação nova ou só documentar a ausência" }
  ],
  "riscos": [
    "V1 (envelope 'resultado' em GET /api/tabelas-preco) não foi confirmado por resposta HTTP real — só por leitura de C# nas duas pontas do contrato, sem token de autenticação disponível nesta sessão para chamar a API viva. Se a leitura estiver errada (por exemplo, algum middleware de serialização não encontrado na busca), o achado central da seção 0 cai.",
    "V2/V4 (bugs de status/anulabilidade em Tabela de Preço) não têm dado real para provar em produção hoje — a tabela de itens está vazia no ambiente consultado (0 linhas em erp.tabelas_preco_itens). São lacunas de contrato comprovadas por schema, não por sintoma observado.",
    "V5 (empresaId ausente na primeira chamada de GET /api/vendas/pedidos) foi qualificado como 'atenuado, não brick' com base em EmpresaFilialFilter.tsx — não medi o timing real (quantos frames/ms até o efeito corrigir o filtro) nem testei o caminho do usuário 'global' (master@erp.local), por falta de credencial.",
    "Não rodei os gates validate:backend-permissions, validate:guard-permission-map, validate:backend-contract-map nesta sessão — as afirmações sobre eles são inferência de leitura de código e do allowlist estático, não execução."
  ]
}
```
