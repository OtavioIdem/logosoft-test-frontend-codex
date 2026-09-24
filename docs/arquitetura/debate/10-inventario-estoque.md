# Inventário — Estoque (rodada de arquitetura 10, recorte `b68`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b68-estoque`, em cima da `b67`.
Fonte de verdade do backend: `../New project 3/src` (C#, leitura), conferido contra
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`. Não houve acesso a backend em execução nem a banco —
toda coluna "o backend entrega?" que dependeria de resposta HTTP real está marcada
**não verificado**; o que está marcado "sim"/"não" vem de leitura de código C# (`record`, enum,
validator), citada por arquivo.

## 0. Superfície: duas famílias de Estoque, não uma

O módulo tem **dois sistemas paralelos** que a UI apresenta sob o mesmo item de menu "Estoque":

- **Estoque "básico"** — `features/estoque/**`, rotas `api/estoque/*` (sem prefixo), controllers
  `EstoqueController.cs`, `LocaisEstoqueController.cs`, `ReservasEstoqueController.cs`,
  `InventariosEstoqueController.cs`. Cobre locais, saldos, movimentos, entrada, saída, ajuste,
  transferência, reserva e um inventário próprio (`Inventario`/`StatusInventario`: Aberto/
  Fechado/Cancelado, sem paginação).
- **Estoque "avançado"** — `features/estoque-avancado/**`, rota única `/estoque/avancado`
  (mais o redirect morto `/estoque/bloqueios` → `/estoque/avancado`, da `b62`), controller
  `EstoqueAvancadoController.cs` (`api/estoque/avancado/*`). Tem o **seu próprio** inventário
  (`InventarioEstoqueOperacional`/`StatusInventarioEstoque`: Aberto/EmContagem/Concluído/
  Cancelado, **com** paginação `page`/`pageSize`), o seu próprio ajuste (`AjusteEstoqueOperacional`,
  com `Origem` fixada pelo backend, nunca pelo operador) e bloqueio (sem endpoint de listagem).

O recorte `b68` ("Entrada, Saída e Histórico em abas... `origemId`/`documento` na transferência...
origem do ajuste como dropdown") toca só o sistema **básico** — mas a pergunta B-3 ("origem do
ajuste") tem duas respostas completamente diferentes dependendo de qual dos dois "ajustes" o
plano quis dizer (item 3 abaixo). Isso não estava explícito no plano e é a primeira pendência
que a rodada precisa resolver antes de desenhar a tela.

## 1. Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida (backend) | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/estoque/locais` | `app/(main)/estoque/locais/page.tsx` | `LocaisEstoquePage.tsx` | leitura `ESTOQUE_CONSULTAR` (`LocaisEstoqueController.cs:23`); criar/editar/inativar `LOCAIS_ESTOQUE_GERENCIAR` (`:31,:40,:49`) | `routePermissions.ts:27` (`anyOf` inclui as duas); `AppMenu.tsx:89`; catálogo `permissoesCatalogo.ts:71`; union `types/erp.ts:271`. Componente checa só `ESTOQUE_CONSULTAR` (`LocaisEstoquePage.tsx:45`), botões usam `PermissionGuard` com `LOCAIS_ESTOQUE_GERENCIAR` (`:74,93`) |
| `/estoque/saldos` | `app/(main)/estoque/saldos/page.tsx` | `SaldosEstoquePage.tsx` | `ESTOQUE_CONSULTAR` (`EstoqueController.cs:23`) | **Sem regra própria** em `routePermissions.ts` — cai no catch-all `/^\/estoque(?:\/.*)?$/` (`routePermissions.ts:28`, `anyOf` inclui `ESTOQUE_MOVIMENTAR`/`ESTOQUE_RESERVAR`/`ESTOQUE_INVENTARIO_GERENCIAR`, nenhum dos quais o componente aceita). Ver Divergência 14. Menu: `AppMenu.tsx:90` |
| `/estoque/movimentos` | `app/(main)/estoque/movimentos/page.tsx` | `MovimentosEstoquePage.tsx` | `ESTOQUE_CONSULTAR` (`EstoqueController.cs:49`) | Mesma lacuna de `routePermissions.ts` que saldos (cai no catch-all da linha 28). Menu: `AppMenu.tsx:91` |
| `/estoque/entradas` | `app/(main)/estoque/entradas/page.tsx` | `MovimentoOperacionalPage kind="entrada"` | `ESTOQUE_MOVIMENTAR` (`EstoqueController.cs:57`) | `routePermissions.ts:19`; `AppMenu.tsx:92`; componente checa `hasPermission('ESTOQUE_MOVIMENTAR')` (`MovimentoOperacionalPage.tsx:30`) |
| `/estoque/saidas` | `app/(main)/estoque/saidas/page.tsx` | `MovimentoOperacionalPage kind="saida"` | `ESTOQUE_MOVIMENTAR` (`:66`) | `routePermissions.ts:20`; `AppMenu.tsx:93` |
| `/estoque/ajustes` | `app/(main)/estoque/ajustes/page.tsx` | `MovimentoOperacionalPage kind="ajuste"` | `ESTOQUE_MOVIMENTAR` (`:75`) | `routePermissions.ts:21`; `AppMenu.tsx:95`. **Este é o ajuste "básico"**, distinto do ajuste do `/estoque/avancado` |
| `/estoque/transferencias` | `app/(main)/estoque/transferencias/page.tsx` | `TransferenciaEstoquePage.tsx` | `ESTOQUE_MOVIMENTAR` (`:40`) | `routePermissions.ts:22`; `AppMenu.tsx:94` |
| `/estoque/reservas` | `app/(main)/estoque/reservas/page.tsx` | `ReservasEstoquePage.tsx` | leitura `ESTOQUE_CONSULTAR` (`ReservasEstoqueController.cs:23`); criar/baixar/cancelar `ESTOQUE_RESERVAR` (`:31,:40,:49`) | `routePermissions.ts:24`; `AppMenu.tsx:96`; componente exige `ESTOQUE_RESERVAR` até para **ver** a lista (`ReservasEstoquePage.tsx:49`) — mais restritivo que o backend, que aceita `ESTOQUE_CONSULTAR` para o `GET`. Ver Divergência 15 |
| `/estoque/inventarios` | `app/(main)/estoque/inventarios/page.tsx` | `InventariosEstoquePage.tsx` | leitura e escrita, ambas `ESTOQUE_INVENTARIO_GERENCIAR` (`InventariosEstoqueController.cs:23,31,40,49,58`) | `routePermissions.ts:25`; `AppMenu.tsx:97`. Componente exige `ESTOQUE_INVENTARIO_GERENCIAR` até para ver (`InventariosEstoquePage.tsx:54`) — coerente aqui, pois o backend também exige isso no `GET` |
| `/estoque/avancado` (abas: Inventários operacionais, Ajustes, Bloqueios) | `app/(main)/estoque/avancado/page.tsx` | `EstoqueAvancadoPage.tsx` (+ `InventariosOperacionaisTab.tsx`, `AjusteEstoqueTab.tsx`, `BloqueiosEstoqueTab.tsx`) | por aba: inventário `ESTOQUE_INVENTARIO_GERENCIAR`/`ESTOQUE_CONSULTAR`; ajuste `ESTOQUE_AJUSTAR`; bloqueio `ESTOQUE_BLOQUEIO_GERENCIAR` (`EstoqueAvancadoController.cs:23,36,54,67,80,93,106,119,132,145`) | `routePermissions.ts:26`; `AppMenu.tsx:98`. Componente exige `hasAnyPermission([CONSULTAR, INVENTARIO_GERENCIAR, AJUSTAR, BLOQUEIO_GERENCIAR])` (`EstoqueAvancadoPage.tsx:14`) — abre a página para quem tem só uma das quatro, mas cada aba desabilita os botões via `PermissionGuard` própria |
| `/estoque/bloqueios` | `app/(main)/estoque/bloqueios/page.tsx` | `redirect('/estoque/avancado')` (sem componente próprio; `BloqueiosEstoquePage.tsx` existe em `features/estoque/components/` mas **não é importado por nenhuma rota** — código morto) | — (rota só redireciona) | `routePermissions.ts:23` guarda `ESTOQUE_MOVIMENTAR`, mas o destino do redirect exige outra família de permissões. Ver Divergência 13 (herdada da `b62`, reconfirmada aqui) |

**Entrada / Saída / Histórico hoje**: são três rotas e três componentes **separados**
(`/estoque/entradas`, `/estoque/saidas`, `/estoque/movimentos`), cada um com seu próprio
`page.tsx`. Não há `TabView`/abas em nenhum desses três. `Ajuste` e `Transferência` também são
rotas isoladas. O item do plano ("Entrada, Saída e Histórico em abas") descreve uma reorganização
que **ainda não existe** — é trabalho a fazer, não uma constatação de estado atual divergente.

## 2. Endpoints de movimentação — campo a campo

Fonte: `MovimentoEstoqueRequests.cs`, `MovimentoEstoqueResponse.cs`,
`TransferenciaEstoqueResponse.cs`, conferidos linha a linha contra
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:2651-2656` (idênticos).

### `POST /api/estoque/entradas` e `POST /api/estoque/saidas`

Mesmo formato em ambos (`RegistrarEntradaEstoqueRequest`/`RegistrarSaidaEstoqueRequest`,
`MovimentoEstoqueRequests.cs:3-23`):

| Campo request | Tipo C# | Anulável | UI envia hoje? |
| --- | --- | --- | --- |
| `EmpresaId` | `Guid` | não | sim |
| `FilialId` | `Guid?` | sim | sim (opcional) |
| `ProdutoId` | `Guid` | não | sim |
| `LocalEstoqueId` | `Guid` | não | sim |
| `Quantidade` | `decimal` | não, `> 0` | sim |
| `OrigemModulo` | `string`, `NotEmpty`, `MaxLength(80)` | não | sim — **`InputText` livre**, default `'ESTOQUE'` (`MovimentoEstoqueFormDialog.tsx:71`) |
| `OrigemId` | `Guid?` | sim | sim (opcional, sem seletor guiado — campo de texto livre tratado como GUID opcional) |
| `Documento` | `string?`, `MaxLength(80)` | sim | sim — `InputText` livre (`:72`) |
| `Motivo` | `string`, `NotEmpty`, `MaxLength(500)` | não | sim |

Nenhuma lacuna de campo aqui — o schema `movimentoManualEstoqueSchema`
(`estoqueSchemas.ts:27-37`) cobre os nove campos.

### `POST /api/estoque/ajustes` (básico)

`AjustarEstoqueRequest` (`MovimentoEstoqueRequests.cs:25-34`): idêntico ao acima trocando
`Quantidade` por `QuantidadeContada` (`decimal`, `>= 0`). Schema `ajusteEstoqueSchema`
(`estoqueSchemas.ts:39-49`) cobre tudo. O backend calcula a diferença
(`AjustarSaldoEstoqueUseCase.cs:54`: `Saldo.AjustarPara(request.QuantidadeContada)`) e **recusa**
se a diferença for zero (`:55-58`, "Ajuste não gerou diferença de estoque").

### `POST /api/estoque/transferencias`

`TransferirEstoqueRequest` (`MovimentoEstoqueRequests.cs:37-48`):

| Campo request | Tipo C# | Anulável | UI envia hoje? |
| --- | --- | --- | --- |
| `EmpresaId` | `Guid` | não | sim |
| `FilialOrigemId` | `Guid?` | **sim** | sim, mas o schema/tipo do frontend a declara como `Guid` obrigatória (`transferenciaEstoqueSchema` usa `requiredGuid`, `TransferenciaEstoqueRequest.filialOrigemId: Guid` sem `?` em `estoque.types.ts:41`) — mais estrito que o contrato, não é uma lacuna de contrato, mas é uma divergência de anulabilidade declarada (Divergência 6) |
| `FilialDestinoId` | `Guid?` | **sim** | idem acima |
| `ProdutoId` | `Guid` | não | sim |
| `LocalEstoqueOrigemId` | `Guid` | não | sim |
| `LocalEstoqueDestinoId` | `Guid` | não | sim |
| `Quantidade` | `decimal` | não, `> 0` | sim |
| `OrigemModulo` | `string`, `NotEmpty`, `MaxLength(80)` | não | **sim, mas invisível** — `transferenciaEstoqueSchema` tem `.default('ESTOQUE')` e a tela não renderiza nenhum campo para ele (`TransferenciaEstoquePage.tsx`, sem `origemModulo` no JSX nem no `initialValues`). Vai sempre `'ESTOQUE'`, sem o operador escolher ou ver (Divergência 9) |
| `OrigemId` | `Guid?` | sim | **não** — LACUNA rastreada pelo gate (`gate-contract-request-fields.mjs:376`) |
| `Documento` | `string?`, `MaxLength(80)` | sim | **não** — LACUNA rastreada pelo gate (`:377`) |
| `Motivo` | `string`, `NotEmpty`, `MaxLength(500)` | não | sim |

O que `TransferirEstoqueRequest.OrigemId`/`.Documento` significam no domínio
(`TransferirEstoqueUseCase.cs:103,113-114`):

- `OrigemId` vira o **id da transação de transferência** (`transferenciaId = request.OrigemId ??
  Guid.NewGuid()`), usado como `OrigemId` **em ambos** os movimentos gerados (saída na origem,
  entrada no destino). Não é um vínculo obrigatório com outro módulo — se omitido, o backend gera
  um `Guid` novo sozinho. Ou seja: o campo existe para permitir que quem chama associe a
  transferência a um evento externo (ex.: um pedido, uma requisição), mas **nada valida** que o
  valor exista em outra tabela — é texto/GUID livre do ponto de vista do backend.
- `Documento` é texto livre (`MaxLength(80)`), gravado igual nos dois movimentos
  (`:113-114`) — mesmo campo usado em entrada/saída manual.
- Não há endpoint nem enum que restrinja de onde viria esse `OrigemId` — a resposta a "catálogo
  ou id de outro módulo" é: **nenhum dos dois hoje**; é um GUID opcional que o backend só usa como
  correlação entre os dois lados do movimento.

### `GET /api/estoque/movimentos` (o "Histórico")

Assinatura (`EstoqueController.cs:48-54`): `empresaId` (obrigatório), `filialId`, `produtoId`,
`localEstoqueId`, `inicio`, `fim` — **sem `page`/`pageSize`/`take`/`skip`**. O use case
(`ListarMovimentosEstoqueUseCase.cs:26-28`) e o repositório
(`EstoqueRepository.cs:52-60`, `OrderByDescending(x => x.DataMovimento).ToListAsync(...)`) trazem
**todas** as linhas que casam com o filtro, sem limite algum. A tela (`MovimentosEstoquePage.tsx`)
busca tudo, filtra por texto no cliente (`filterLocalRecords`, substring em todos os campos do
objeto) e pagina **só visualmente** com `records.slice(first, first + rows)`
(`:30-31,50`). Isto é intuição, não medição: não há teto de linhas hoje nem medição de volume
real; o padrão de código (sem paginação de servidor, filtro textual full-scan no cliente) é o
mesmo que historicamente vira problema quando o número de movimentos por empresa passa de alguns
milhares — e cada transferência gera **dois** movimentos, cada baixa de reserva gera um, cada
recebimento de compra gera um (`ReceberPedidoCompraUseCase.cs:238`), então a tabela cresce mais
rápido do que "uma linha por clique do operador".

### `MovimentoEstoqueResponse` — o corpo devolvido por entradas/saídas/ajustes e por cada perna
da transferência, e por `GET /api/estoque/movimentos`

(`MovimentoEstoqueRequests.cs`... na verdade `MovimentoEstoqueResponse.cs:5-21`):

| Campo (nome C#) | Nome JSON esperado (camelCase, sem override) | A UI lê sob este nome? |
| --- | --- | --- |
| `Id` | `id` | sim |
| `EmpresaId` | `empresaId` | não exibido, mas usado em filtro |
| `FilialId` | `filialId` | não exibido |
| `ProdutoId` | `produtoId` | sim (mapeado para rótulo) |
| `LocalEstoqueId` | `localEstoqueId` | sim (mapeado para rótulo) |
| `Tipo` | **`tipo`** | **não** — a UI lê `row.tipoMovimento` (ver Divergência 2) |
| `Quantidade` | `quantidade` | sim |
| `QuantidadeAnterior` | `quantidadeAnterior` | **não** — sem coluna, sem campo no tipo do frontend |
| `QuantidadePosterior` | `quantidadePosterior` | **não** — idem |
| `QuantidadeReservadaAnterior` | `quantidadeReservadaAnterior` | **não** — idem |
| `QuantidadeReservadaPosterior` | `quantidadeReservadaPosterior` | **não** — idem |
| `OrigemModulo` | `origemModulo` | sim (`field="origemModulo"`) |
| `OrigemId` | `origemId` | não exibido (sem coluna) |
| `Documento` | `documento` | sim (`field="documento"`) |
| `Motivo` | `motivo` | não exibido (sem coluna) |
| `DataMovimento` | **`dataMovimento`** | **não** — a UI lê `row.criadoEm` (ver Divergência 3) |

## 3. Origem do ajuste / `origemModulo` — duas respostas, não uma

**Ajuste básico** (`POST /api/estoque/ajustes`, `AjustarEstoqueRequest.OrigemModulo`): campo
`string`, `NotEmpty`, `MaxLength(80)` (`MovimentoEstoqueValidators.cs:41`). **Não existe enum nem
catálogo em lugar nenhum do C#** — busquei `enum OrigemModulo`, `OrigemModuloEstoque`,
`CatalogoOrigemModulo` em `src/` e `docs/` e não há um único resultado. Os únicos usos de
"origem" como constante são internos a outros módulos que **chamam** o estoque
(`ReceberPedidoCompraUseCase.cs:28: "Compras.PedidoCompra"`,
`VendaPedidoEstoqueOrchestrator.cs:13: "Vendas.PedidoVenda"`,
`CancelarOrdemProducao...UseCase.cs:19` / `EncerrarOrdemProducao...:22` /
`LiberarOrdemProducao...:20: "Producao.OrdemProducao"`) — o **operador nunca escolhe** esses
valores, eles são hardcoded no código de quem dispara a integração. Para o movimento **manual**
(o que a tela de Ajuste/Entrada/Saída expõe), o campo é puro texto livre digitado em
`InputText` (`MovimentoEstoqueFormDialog.tsx:71`). B-3 ("Quais valores válidos para
`origemModulo`? Haverá catálogo?") **segue sem resposta** no C# atual.

**Ajuste avançado** (`POST /api/estoque/avancado/ajustes`, `CriarAjusteEstoqueRequest`): **não
tem campo de origem no request** (`EstoqueAvancadoRequests.cs:9`:
`CriarAjusteEstoqueRequest(EmpresaId, FilialId, LocalEstoqueId, ProdutoId, Tipo, Quantidade,
Motivo)` — oito campos, nenhum `OrigemModulo`). A resposta (`AjusteEstoqueResponse.Origem`)
é preenchida pelo **domínio**, fixa por caminho de código
(`AjusteEstoqueOperacional.cs:73`: `"Estoque.AjusteManual"` para ajuste manual;
`:79`: `"Estoque.Inventario"` para ajuste gerado ao fechar um inventário). O operador nunca
escolhe nem vê essa origem antes de submeter — ela é somente-leitura, um enum de fato com dois
valores conhecidos hoje, nenhum dos dois exposto por endpoint de catálogo.

**Precedente já existente no código para "dropdown hardcoded"**: a tela de Reserva
(`features/estoque/components/ReservaEstoqueDialogs.tsx:21-26`) já faz exatamente o que o plano
adverte para não fazer no Ajuste — um array `origemEstoqueOptions` fixo no frontend
(`ESTOQUE`/`VENDAS`/`COMPRAS`/`AJUSTE`) sem nenhum catálogo do backend por trás, usado tanto na
criação da reserva quanto na baixa (`:69,109`). Isso já está em produção hoje; é evidência viva de
que "hardcode disfarça texto livre" é um padrão já presente, não hipotético.

**Pendência que a rodada precisa fechar antes de desenhar**: quando o plano diz "origem do ajuste
como dropdown", precisa dizer qual dos dois ajustes — porque um aceita `origemModulo` livre e o
outro não aceita o conceito como input nenhum.

## 4. Semântica e regras

- **Saldo negativo**: `EstoqueSaldo.RegistrarSaida` (`Erp.Domain/Estoque/EstoqueSaldo.cs:40-49`)
  recusa saída quando `QuantidadeDisponivel < quantidade`
  ("Saldo disponível insuficiente para saída de estoque."). `RegistrarEntrada` não tem teto.
  `AjustarPara` recusa contagem negativa e recusa contagem menor que a reserva
  (`:99-114`, "Quantidade contada não pode ser menor que a quantidade reservada.").
- **Reserva**: `Reservar`/`BaixarReserva`/`CancelarReserva` (`:51-97`) — reservar recusa se
  `QuantidadeDisponivel < quantidade`; baixar/cancelar recusam se `QuantidadeReservada <
  quantidade`. `BaixarReserva` reduz `QuantidadeAtual` **e** `QuantidadeReservada` juntas —
  cancelar só libera a reserva, não mexe no físico.
- **Lote**: não existe. Nenhum campo `LoteId`/`NumeroLote` em `Erp.Domain/Estoque/**` nem
  `Erp.Application/Estoque/**` (busca por `LoteId|NumeroLote` nesses diretórios, zero
  resultados).
- **Custo/valoração**: não existe. Nenhum campo `CustoUnitario`/`ValorUnitario`/`ValorTotal` em
  `Erp.Domain/Estoque/**`. O próprio contrato documenta isso:
  `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:314`: "**Movimenta, não valora** — Saldo e movimento
  funcionam. Zero valoração/custo — CMV não é calculável."
- **Estorno/cancelamento de movimento**: não existe operação genérica. O único "reverso" no
  domínio é `EstoqueSaldo.EstornarBaixaReserva`/`TipoMovimentoEstoque.EstornoBaixaReserva=10`
  (`Erp.Domain/Estoque/TipoMovimentoEstoque.cs:16-20`), exclusivo do fluxo fiscal (cancelamento de
  nota que já baixou reserva — `tests/Erp.UnitTests/Fiscal/EstornarBaixaEstoqueNotaFiscal...`).
  Não há endpoint para desfazer uma entrada, saída, ajuste ou transferência manual — um erro de
  digitação vira um novo movimento de sinal oposto, não uma reversão do original.
- **Transferência = duas pernas**: sempre gera `TipoMovimentoEstoque.TransferenciaSaida` (8) na
  origem e `TransferenciaEntrada` (9) no destino (`TransferirEstoqueUseCase.cs:113-114`), dentro
  de uma transação (`_unitOfWork.ExecuteInTransactionAsync`, `:99`). Cria o saldo de destino se
  ele não existir (`:90-91,108-110`).
- **Auditoria**: toda operação de movimento chama `EstoqueAuditoria.RegistrarAsync`
  (`Erp.Application/Estoque/EstoqueAuditoria.cs:15-16`), que grava em `IAuditoriaService` com
  entidade `"Estoque"` — confirmado em `RegistrarSaidaEstoqueUseCase.cs:57`,
  `AjustarSaldoEstoqueUseCase.cs:63`, `TransferirEstoqueUseCase.cs:118-119` (duas chamadas, uma
  por perna). Não verificado: se isso persiste na tabela `auditoria_eventos` citada no briefing —
  o acesso disponível foi só ao código-fonte, não ao banco.

## 5. Permissões — união, catálogo, rota e menu

Permissões do backend (`SystemPermissions.cs:66-70,91-92`): `ESTOQUE_CONSULTAR`,
`ESTOQUE_MOVIMENTAR`, `ESTOQUE_RESERVAR`, `ESTOQUE_INVENTARIO_GERENCIAR`,
`LOCAIS_ESTOQUE_GERENCIAR`, `ESTOQUE_AJUSTAR`, `ESTOQUE_BLOQUEIO_GERENCIAR` — todas as sete
existem no union (`types/erp.ts:267-271,341-342`), no catálogo
(`permissoesCatalogo.ts:65-71`) e aparecem em pelo menos uma regra de `routePermissions.ts` e um
item do `AppMenu.tsx:86-98`. Não há permissão órfã (existente num lado e ausente no outro) neste
recorte. As divergências não são de existência — são de **qual regra usa qual permissão em qual
lugar** (rota vs. componente vs. backend), listadas na seção 8.

## 6. Gates

- **`gate-contract-request-fields.mjs`**: já cobre `TransferirEstoqueRequest` via
  `transferenciaEstoqueSchema` (`:38,80`). As duas LACUNA (`origemId`, `documento`) estão
  mapeadas para o destino `'b66'` em `LACUNA_DESTINO` (`:376-377`) — **valor desatualizado**: a
  reindexação D67 moveu Estoque de `b66` para `b68`; o texto do gate não foi atualizado. Isso não
  quebra o gate (LACUNA é só informativo, não reprova — `:461,504`), mas quando a `b68`
  implementar os dois campos, o mapa `LACUNA_DESTINO` fica com uma entrada morta apontando para
  um número que não existe mais no plano atual; alguém vai precisar limpar essa linha na mesma
  entrega. `AtualizarEmpresaRequest.contribuinteIpi` (a terceira LACUNA original) não é mais
  listada — presumo (rotulo como intuição, não medição) que foi resolvida na `b64`, mas não abri
  o diff daquela versão para confirmar.
- **`validate:guard-permission-map`**: uma aba nova (Entrada/Saída/Histórico dentro de uma
  `TabView`) não muda nenhuma chamada HTTP nem introduz permissão nova — os três já usam
  `ESTOQUE_MOVIMENTAR`/`ESTOQUE_CONSULTAR` hoje. Não verificado rodar o gate de fato (script não
  executado nesta sessão), mas pela leitura do que ele confere (chamada HTTP × permissão do
  contrato), agrupar em abas sem trocar `estoqueApi.registrarEntrada/registrarSaida/
  listarMovimentos` não deveria acusar nada novo.
- **`validate:backend-contract-map`**: os endpoints `entradas`, `saidas`, `ajustes`,
  `transferencias`, `movimentos`, `locais`, `saldos`, `reservas`, `inventarios`,
  `avancado/*` já estão em uso hoje pelo frontend — presumo (intuição, não medição, allowlist não
  aberta nesta sessão) que já constam em
  `scripts/backend-contract-map.allowlist.json`, porque os testes estruturais
  (`estoqueB41Structure.test.ts`) já passam contra essas rotas. Adicionar campos a um request já
  mapeado (`origemId`/`documento` na transferência) não deveria exigir entrada nova na allowlist —
  é o mesmo endpoint, o mesmo verbo, o mesmo path.
- **Testes estruturais que leem Estoque** (`grep -rln "features/estoque\|estoque" tests/unit
  tests/components`, comando executado): `estoquePayload.test.ts`, `estoqueUxRules.test.ts`,
  `estoqueB41Structure.test.ts`, `estoqueAvancadoPayload.test.ts`,
  `estoqueAvancadoStructure.test.ts`, mais `gateContractRequestFields.test.ts`,
  `guardPermissionMapMenuRules.test.ts`/`...Historic.test.ts`,
  `operationalBackendContract.test.ts`, `integratedBackendE2e.test.ts`,
  `controlledSeeds.test.ts` (referências indiretas/genéricas). O mais relevante para o recorte:
  `tests/unit/estoquePayload.test.ts:31-34` **trava** hoje que
  `buildTransferenciaEstoquePayload(...)` produz um objeto `toEqual` **sem** `origemId` nem
  `documento` — esse teste precisa mudar na mesma entrega que adicionar os campos, senão ele
  reprova por design (não por bug).

## 7. O "Histórico"

Ver seção 2 (`GET /api/estoque/movimentos`). Resumo: existe endpoint de consulta com filtro por
`empresaId` (obrigatório), `filialId`, `produtoId`, `localEstoqueId`, `inicio`, `fim` — mas
**sem paginação de servidor**. `EstoqueRepository.ListarMovimentosAsync`
(`Erp.Infrastructure/Estoque/EstoqueRepository.cs:52-60`) devolve a lista inteira ordenada por
`DataMovimento` desc, sem `Skip`/`Take`. O volume esperado não foi medido (sem acesso a banco
populado) — é uma listagem que **cresce sem limite** por construção: cada operação manual gera
1 linha, cada transferência gera 2, cada recebimento de compra gera 1
(`ReceberPedidoCompraUseCase.cs:238`), cada baixa/cancelamento de reserva gera 1. Se o recorte
`b68` juntar Entrada/Saída/Histórico numa aba só, a aba "Histórico" herda esse comportamento sem
mudança nenhuma — não é um problema introduzido pela reorganização em abas, é pré-existente.

## 8. Estados de tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Locais (`LocaisEstoquePage`) | presente (`DataTableServer loading={listQuery.isFetching}`) | presente (`EmptyState`, `:95`) | presente (`ApiErrorPanel`, `:87`) | não verificado (nenhuma distinção de erro bloqueante vs. recuperável no código) | presente (toast via `useMutationWithToast`) | presente (`UnauthorizedState`, `:45`) | ausente — botões usam `disabled={!isActive(row)}` sem tooltip/motivo (`DataTableActions` não tem prop de motivo, confirmado em `components/data/DataTableActions.tsx`) |
| Saldos (`SaldosEstoquePage`) | presente (`LoadingState variant="metrics"` nos cards + `DataTableServer loading`) | presente (`EmptyState`) | presente (`ApiErrorPanel`) | não verificado | n/a (tela só de consulta) | presente (`UnauthorizedState`) | n/a (sem ações) |
| Movimentos (`MovimentosEstoquePage`) | presente (`DataTableServer loading`) | presente (`EmptyState`) | presente (`ApiErrorPanel`) | não verificado | n/a | presente (`UnauthorizedState`) | n/a |
| Entrada/Saída/Ajuste (`MovimentoOperacionalPage`) | presente (`loading` nos mutations, botão com `loading`) | n/a (não é lista) | presente (toast de erro) | ausente/não verificado | presente (toast de sucesso) | presente (`UnauthorizedState`) | presente parcialmente — botão principal usa `PermissionGuard mode="disable"`, mas sem texto de motivo visível além do que a página já descreve |
| Transferência (`TransferenciaEstoquePage`) | presente (`loading` no botão) | n/a | presente (toast + `FieldError` por campo) | ausente/não verificado | presente (toast) | presente (`UnauthorizedState`) | ausente (sem `PermissionGuard` no botão — só o `if (!hasPermission(...))` no topo da função, então quem chega até a tela sempre vê o botão habilitado) |
| Reservas (`ReservasEstoquePage`) | presente | presente (`EmptyState`) | presente (`ApiErrorPanel`) | não verificado | presente (toast) | presente (`UnauthorizedState`, mas exige `ESTOQUE_RESERVAR` até para listar — ver Divergência 15) | ausente — `disabled={!canOperate(row)}` sem motivo |
| Inventários básico (`InventariosEstoquePage`) | presente | presente (`EmptyState`) | presente (`ApiErrorPanel`) | não verificado | presente (toast) | presente (`UnauthorizedState`) | ausente — `disabled={!canCount(row)}` sem motivo |
| Estoque avançado — Inventários (`InventariosOperacionaisTab`) | presente | presente (`emptyMessage`) | presente (`ApiErrorPanel`) | não verificado | presente (toast) | presente (nível da página, `EstoqueAvancadoPage`) — a aba em si não tem guarda própria de leitura | presente parcialmente — botões de ação só aparecem se `inventarioPodeX(status)`, então "indisponível" vira "some da tela" em vez de "aparece desabilitado com motivo" |
| Estoque avançado — Ajustes (`AjusteEstoqueTab`) | presente (`loading` no botão) | n/a | presente (toast) | ausente | presente (toast) | presente (nível da página) + `PermissionGuard ESTOQUE_AJUSTAR` no botão | n/a |
| Estoque avançado — Bloqueios (`BloqueiosEstoqueTab`) | presente (`loading` nos botões) | n/a (sem listagem — ver Divergência 13) | presente (toast) | ausente | presente (toast) | presente (nível da página) + `PermissionGuard ESTOQUE_BLOQUEIO_GERENCIAR` | n/a |

## Tabela de campos

Convenção: quando o nome do campo no frontend diverge do nome real da resposta, listo as duas
linhas lado a lado e marco a lacuna. `enviado` = está no payload de mutação; `exibido` = aparece
em tela; `derivado de <x>` = calculado a partir de outro campo; `sem uso` = está no tipo/objeto e
nada o lê.

| Campo | Tipo no frontend | Origem (endpoint/campo) | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `MovimentoManualEstoqueRequest.empresaId` | `Guid` | `POST /entradas`, `/saidas`; `AjustarEstoqueRequest.EmpresaId` | sim (`MovimentoEstoqueRequests.cs:5`) | enviado |
| `MovimentoManualEstoqueRequest.filialId` | `Guid \| null` | idem | sim, `Guid?` | enviado |
| `MovimentoManualEstoqueRequest.produtoId` | `Guid` | idem | sim | enviado |
| `MovimentoManualEstoqueRequest.localEstoqueId` | `Guid` | idem | sim | enviado |
| `MovimentoManualEstoqueRequest.quantidade` | `number` | `/entradas`,`/saidas` | sim, `decimal` | enviado |
| `AjusteEstoqueRequest.quantidadeContada` (básico) | `number` | `/ajustes` | sim | enviado |
| `MovimentoManualEstoqueRequest.origemModulo` | `string` | todos os quatro (`/entradas`,`/saidas`,`/ajustes`,`/transferencias`) | sim, texto livre sem catálogo (seção 3) | enviado (via `InputText` livre nos três primeiros; hardcoded/invisível na transferência) |
| `MovimentoManualEstoqueRequest.origemId` | `Guid \| null` | `/entradas`,`/saidas`,`/ajustes` | sim, opcional | enviado |
| `TransferenciaEstoqueRequest.origemId` | — (campo não existe no tipo) | `/transferencias` | sim, opcional (`TransferirEstoqueRequest.OrigemId`) | **sem uso** — LACUNA (Divergência 1) |
| `MovimentoManualEstoqueRequest.documento` | `string \| null` | `/entradas`,`/saidas`,`/ajustes` | sim, opcional | enviado |
| `TransferenciaEstoqueRequest.documento` | — (campo não existe no tipo) | `/transferencias` | sim, opcional | **sem uso** — LACUNA (Divergência 1) |
| `MovimentoManualEstoqueRequest.motivo` | `string` | todos os quatro | sim, obrigatório | enviado |
| `TransferenciaEstoqueRequest.filialOrigemId` | `Guid` (obrigatório no tipo do FE) | `/transferencias` | `Guid?` (opcional no backend) | enviado (mais estrito que o contrato — Divergência 6) |
| `TransferenciaEstoqueRequest.filialDestinoId` | `Guid` (obrigatório no tipo do FE) | idem | `Guid?` (opcional no backend) | enviado (idem) |
| `MovimentoEstoqueResponse.tipo` (nome real do backend) | — (frontend não declara este nome) | `GET /movimentos`, resposta de `/entradas`,`/saidas`,`/ajustes`,`/transferencias` | sim, obrigatório (`TipoMovimentoEstoque`) | **sem uso** — a UI lê `tipoMovimento`, que não existe na resposta (Divergência 2) |
| `MovimentoEstoqueResponse.tipoMovimento` (nome usado pela UI) | `TipoMovimentoEstoque \| number` | idem | não, sob este nome | exibido (tentativa) — sempre renderiza `'-'`/severidade `info`, resumo conta zero em todas as categorias (Divergência 2) |
| `MovimentoEstoqueResponse.quantidade` | `number` | idem | sim | exibido |
| `MovimentoEstoqueResponse.quantidadeAnterior` | — (ausente do tipo) | idem | sim | **sem uso** (Divergência 5) |
| `MovimentoEstoqueResponse.quantidadePosterior` | — (ausente do tipo) | idem | sim | **sem uso** (Divergência 5) |
| `MovimentoEstoqueResponse.quantidadeReservadaAnterior` | — (ausente do tipo) | idem | sim | **sem uso** (Divergência 5) |
| `MovimentoEstoqueResponse.quantidadeReservadaPosterior` | — (ausente do tipo) | idem | sim | **sem uso** (Divergência 5) |
| `MovimentoEstoqueResponse.origemModulo` | `string` | idem | sim | exibido (coluna "Origem") |
| `MovimentoEstoqueResponse.origemId` | `Guid \| null` | idem | sim | **sem uso** (sem coluna, sem leitura) |
| `MovimentoEstoqueResponse.documento` | `string \| null` | idem | sim | exibido (coluna "Documento") |
| `MovimentoEstoqueResponse.motivo` | `string` | idem | sim | **sem uso** (sem coluna) |
| `MovimentoEstoqueResponse.dataMovimento` (nome real) | — (frontend não declara) | idem | sim, obrigatório | **sem uso** — a UI lê `criadoEm` (Divergência 3) |
| `MovimentoEstoqueResponse.criadoEm` (nome usado pela UI) | `IsoDateTime` | idem | não, sob este nome | exibido (tentativa) — coluna "Data" sempre mostra `'-'` (Divergência 3) |
| `LocalEstoqueResponse.codigo/nome/descricao/status` | `string/string/string?/EntityStatus` | `GET,POST,PUT /locais` | sim, 1:1 (`LocalEstoqueResponse.cs`) | exibido |
| `LocalEstoqueResponse.auditoria`/`.historicoStatus` | `AuditInfo?`/`StatusHistoryItem[]?` (herdados de `BaseOperationalRecord`) | idem | não — `LocalEstoqueResponse.cs:5-12` não tem esses campos | **sem uso** (campos opcionais do tipo genérico, nunca preenchidos por este endpoint, nunca lidos pela tela) |
| `EstoqueSaldoResponse.quantidadeAtual/quantidadeReservada/quantidadeDisponivel` | `number` | `GET /saldos` | sim, 1:1 | exibido |
| `ReservaEstoqueResponse.quantidade/origemModulo/origemId/observacao/statusReserva` | conforme tipo | `GET,POST /reservas`, `.../baixar`, `.../cancelar` | sim, 1:1 (`ReservaEstoqueResponse.cs`) | exibido (exceto `observacao`, sem coluna na tabela — **sem uso** visualmente, embora exista no formulário de criação) |
| `ReservaEstoqueResponse.quantidadeBaixada/quantidadeCancelada/quantidadePendente` | — (ausentes do tipo `ReservaEstoque` em `types/erp.ts:453`) | idem | sim (`ReservaEstoqueResponse.cs:12-14`) | **sem uso** — backend entrega três campos de acompanhamento de baixa parcial que a UI nunca lê nem mostra |
| `InventarioResponse.codigo/localEstoqueId/descricao/statusInventario/itens` (básico) | conforme tipo | `GET,POST /inventarios` | sim, 1:1 (via `Inventario`/`ItemInventario` em `types/erp.ts:454-455`) | exibido |
| `InventarioResponse.abertoEm/fechadoEm/motivoFechamento` (básico) | — (ausentes do tipo) | idem | sim (`InventarioResponse.cs:13-15`) | **sem uso** |
| `ItemInventarioResponse.localEstoqueId/quantidadeSistema/diferenca` (básico) | — (ausentes do tipo `ItemInventario`) | idem | sim (`InventarioResponse.cs:18-25`) | **sem uso** — a tela de detalhe só mostra produto/quantidade contada/observação |
| `CriarAjusteEstoqueRequest.tipo/quantidade/motivo` (avançado) | conforme `AjusteEstoqueFormValues` | `POST /avancado/ajustes` | sim, 1:1 | enviado |
| `AjusteEstoqueResponse.origem` (avançado) | — (ausente do tipo `AjusteEstoqueResponse` do frontend? **não**, está declarado: `origem: string`) | resposta de `POST /avancado/ajustes` | sim, valor fixo (seção 3) | **sem uso** — nenhum componente lê `.origem` da resposta (nem `AjusteEstoqueTab.tsx` nem outro lugar) |
| `CriarBloqueioEstoqueRequest.*`/`BloqueioEstoqueResponse.*` | conforme tipos | `POST /avancado/bloqueios`, `.../liberar`, `.../cancelar` | sim, 1:1 | enviado (request) / **sem uso** (response — a UI não guarda nem lista o resultado, só dispara toast; não há `GET` para consultar depois, seção 8/Divergência 13) |
| `CriarInventarioEstoqueRequest.*`/`InventarioEstoqueResponse.*` (avançado) | conforme tipos | `POST,GET /avancado/inventarios/*` | sim, 1:1 (`EstoqueAvancadoRequests.cs`, `EstoqueAvancadoResponses.cs`) | enviado / exibido |
| `ItemInventarioEstoqueResponse.quantidadeSistema/quantidadeContada/divergencia` (avançado) | conforme tipo | `GET /avancado/inventarios/{id}` | sim, 1:1 | exibido (colunas "Sistema"/"Contada"/"Divergência" — ao contrário do básico, aqui o backend entrega e a tela mostra) |

A conta fecha em: 9 campos de request na família básica de movimento (todos `enviado`), 2 campos
LACUNA na transferência (`sem uso` porque nunca chegam a existir no payload), 15 campos na
resposta de movimento (5 `sem uso` por ausência no tipo, 2 pares de nome divergente marcados
`sem uso`/`exibido-tentativa`, 8 efetivamente `exibido`/`enviado`), mais os campos específicos de
cada um dos outros sete grupos de request/response listados acima.

## Divergências

1. **`TransferirEstoqueRequest.origemId` e `.documento` existem no backend e não existem no
   frontend** — nem no tipo (`estoque.types.ts:39-49`), nem no schema
   (`estoqueSchemas.ts:52-62`), nem no formulário (`TransferenciaEstoquePage.tsx`). É a LACUNA
   que o gate `gate-contract-request-fields.mjs:376-377` já rastreia desde a `b58.c3`, destinada
   (segundo o mapa do próprio gate) à `b66` — nome antigo da fatia que a D67 renumerou para `b68`.
   Teste `estoquePayload.test.ts:31-34` trava hoje o formato **sem** esses campos e precisa mudar
   junto.

2. **`MovimentoEstoqueResponse.Tipo` (C#) serializa como `tipo`; a UI inteira lê
   `row.tipoMovimento`.** Nenhum override de `JsonPropertyName` no C#
   (`grep` vazio em `Erp.Application/Estoque`), nenhuma política de nomenclatura customizada em
   `Program.cs` (só `ApiErrorResponseFilter`, `:28-31`) — ASP.NET Core usa camelCase por padrão
   quando não há override, então o nome real do campo na resposta é `tipo`. Efeito em
   `MovimentosEstoquePage.tsx:53,56` e `estoqueUxUtils.ts:8-37,89-95`: a coluna "Tipo" sempre
   mostra `'-'`, a severidade do `Tag` é sempre `'info'`, a coluna "Impacto" sempre mostra
   "Impacto controlado pelo backend", e os contadores `entradas`/`saidas`/`reservas` do resumo
   (`calcularResumoMovimentos`) são sempre `0`, porque `Number(undefined)` é `NaN` e nenhuma
   comparação bate. **Não verificado contra resposta real** (sem backend em execução) — a
   evidência é 100% código-fonte (nome de propriedade no `record` C#, ausência de atributo de
   serialização, ausência de transformação no `httpClient`), mas é uma cadeia de evidência forte
   o bastante para não ser tratada como "provavelmente".

3. **`MovimentoEstoqueResponse.DataMovimento` serializa como `dataMovimento`; a UI lê
   `row.criadoEm`.** Mesmo mecanismo da Divergência 2. Efeito:
   `MovimentosEstoquePage.tsx:58`, coluna "Data" sempre `'-'` via `formatDateTime(undefined)`.

4. **`TipoMovimentoEstoque` do frontend (`types/erp.ts:54-62`) não tem os valores 8, 9 e 10**
   que existem no domínio do backend (`Erp.Domain/Estoque/TipoMovimentoEstoque.cs:12-20`:
   `TransferenciaSaida=8`, `TransferenciaEntrada=9`, `EstornoBaixaReserva=10`). Mesmo se a
   Divergência 2 for corrigida, toda transferência (que sempre gera esses dois tipos) cairia no
   `?? String(tipo ?? '-')` de `movimentoEstoqueLabel` e mostraria o número cru (`"8"`/`"9"`) em
   vez de um rótulo.

5. **`MovimentoEstoqueResponse.QuantidadeAnterior/QuantidadePosterior/
   QuantidadeReservadaAnterior/QuantidadeReservadaPosterior`** são entregues pelo backend
   (`MovimentoEstoqueResponse.cs:13-16`) e não existem no tipo `MovimentoEstoque` do frontend
   (`types/erp.ts:451`) nem em nenhuma coluna — são quatro campos de rastreabilidade (saldo antes/
   depois de cada movimento) hoje inacessíveis pela UI.

6. **`TransferirEstoqueRequest.FilialOrigemId`/`.FilialDestinoId` são `Guid?` no backend**
   (`MovimentoEstoqueRequests.cs:39-40`) **mas `Guid` obrigatório no tipo e no schema do
   frontend** (`estoque.types.ts:41-42`, `transferenciaEstoqueSchema` usa `requiredGuid`). Não é
   um bug de contrato (o frontend está sendo mais restritivo, não mais permissivo), mas é uma
   declaração de anulabilidade que não bate — vale registrar porque muda o que "válido" significa
   nos dois lados.

7. **B-3 não tem uma resposta única possível** — existem dois "ajustes" com semânticas opostas
   para "origem" (seção 3): um aceita `origemModulo` texto livre do operador, o outro fixa
   `Origem` no domínio sem o operador ver ou escolher nada. O item do plano ("origem do ajuste
   como dropdown") não diz qual dos dois.

8. **Precedente de "dropdown hardcoded sem catálogo" já em produção**: `origemEstoqueOptions`
   em `ReservaEstoqueDialogs.tsx:21-26` — quatro valores fixos no frontend
   (`ESTOQUE`/`VENDAS`/`COMPRAS`/`AJUSTE`) sem catálogo de backend por trás, usados hoje em
   Criar Reserva e Baixar Reserva. É exatamente o padrão que o plano pede para evitar no Ajuste,
   já presente em um módulo vizinho.

9. **`TransferenciaEstoquePage` nunca expõe `origemModulo` ao operador** — o schema tem
   `.default('ESTOQUE')` (`estoqueSchemas.ts:60`), o formulário não tem campo para ele
   (`TransferenciaEstoquePage.tsx`, ausente do JSX e do `initialValues`). O valor é enviado
   (destino `enviado`), mas de forma invisível — diferente de Entrada/Saída/Ajuste, onde o mesmo
   campo é um `InputText` visível.

10. **Dois sistemas de "Inventário" coexistem sob a mesma permissão `ESTOQUE_INVENTARIO_
    GERENCIAR`**: o básico (`/estoque/inventarios`, `StatusInventario`: Aberto/Fechado/
    Cancelado, sem paginação, `InventariosEstoqueController.cs`) e o avançado
    (`/estoque/avancado` → aba Inventários, `StatusInventarioEstoque`: Aberto/EmContagem/
    Concluído/Cancelado, com `page`/`pageSize`, `EstoqueAvancadoController.cs`). São entidades de
    domínio diferentes (`Inventario` vs. `InventarioEstoqueOperacional`), sem nenhuma relação
    entre si no código lido. Um usuário com `ESTOQUE_INVENTARIO_GERENCIAR` enxerga dois "abrir
    inventário" completamente independentes.

11. **`isInventarioEmContagem`/status "EmContagem" é lógica morta na tela básica** —
    `estoqueUxUtils.ts:58-59` trata um status textual `'EmContagem'` que o `StatusInventario`
    básico (`Erp.Domain/Estoque/StatusInventario.cs`: Aberto/Fechado/Cancelado) **nunca produz**;
    esse status só existe no `StatusInventarioEstoque` do sistema avançado. Foi provavelmente
    (rotulado como intuição) copiado de um componente para o outro sem revisar o enum de origem.

12. **`InventarioResponse` (básico) entrega `abertoEm`, `fechadoEm`, `motivoFechamento`** e cada
    item entrega `localEstoqueId`, `quantidadeSistema`, `diferenca`
    (`InventarioResponse.cs:5-25`) — nenhum desses seis campos aparece no tipo do frontend nem em
    qualquer coluna de `InventariosEstoquePage.tsx`. O sistema avançado, para o mesmo conceito
    (sistema/contado/divergência), mostra os três campos equivalentes
    (`InventariosOperacionaisTab.tsx:100-102`) — a tela básica tem a informação disponível e não
    a exibe.

13. **Bloqueios não têm endpoint de listagem** — `EstoqueAvancadoController.cs` só define
    `POST bloqueios`, `POST bloqueios/{id}/liberar`, `POST bloqueios/{id}/cancelar` (`:118-155`);
    não há `GET`. `BloqueiosEstoqueTab.tsx:82-83` pede o operador **digitar o GUID do bloqueio à
    mão** num `InputText` para liberar/cancelar — exatamente o antipadrão listado em
    `skills/agentes/00_padrao_de_execucao.md` ("Aceitar GUID digitado para vínculo de entidade").
    Não é só um problema de tela: mesmo corrigindo o frontend, não há hoje endpoint de onde buscar
    a lista de bloqueios ativos para popular um seletor. `BloqueiosEstoquePage.tsx` (o componente
    antigo em `features/estoque/components/`) existe mas não é referenciado por nenhuma rota —
    código morto candidato a remoção em outra rodada.

14. **`routePermissions.ts` não tem regra própria para `/estoque/saldos` nem `/estoque/
    movimentos`** — ambos caem no catch-all `/^\/estoque(?:\/.*)?$/` (`:28`), cujo `anyOf` inclui
    `ESTOQUE_MOVIMENTAR`, `ESTOQUE_RESERVAR` e `ESTOQUE_INVENTARIO_GERENCIAR` além de
    `ESTOQUE_CONSULTAR`. Um usuário com só `ESTOQUE_MOVIMENTAR` (sem `ESTOQUE_CONSULTAR`) passa a
    guarda de rota e chega em `SaldosEstoquePage`/`MovimentosEstoquePage`, que então bloqueiam com
    `UnauthorizedState` porque o componente exige `ESTOQUE_CONSULTAR` especificamente
    (`SaldosEstoquePage.tsx:36`, `MovimentosEstoquePage.tsx:36`). Mesma classe de risco (`ILUSAO`)
    que a `b62` já documentou para `/estoque/bloqueios`, aqui em dois caminhos adicionais.

15. **`ReservasEstoquePage` exige `ESTOQUE_RESERVAR` até para ver a listagem**
    (`:49`), mas o backend aceita `ESTOQUE_CONSULTAR` sozinho para o `GET`
    (`ReservasEstoqueController.cs:22-23`). Um usuário só-leitura (`ESTOQUE_CONSULTAR`, sem
    `ESTOQUE_RESERVAR`) que o backend deixaria consultar reservas é bloqueado pela tela antes de
    chegar à chamada — o inverso da ILUSAO: aqui é capacidade real negada por checagem de
    componente mais restritiva que o contrato, não uma tela que promete e falha.

16. **`origemId` é enviado como parâmetro de query por um helper compartilhado
    (`estoqueApi.ts:51`, função `params()`) em toda listagem — `locais`, `saldos`, `movimentos`,
    `reservas`, `inventarios`** — mas só `GET /api/estoque/reservas` declara esse parâmetro na
    assinatura (`ReservasEstoqueController.cs:24`). Nos outros quatro controllers
    (`LocaisEstoqueController.cs:24`, `EstoqueController.cs:24,50`,
    `InventariosEstoqueController.cs:24`) não existe `origemId` no `[FromQuery]` — o parâmetro
    extra é silenciosamente ignorado pelo model binding do ASP.NET Core. Sem efeito funcional
    (não quebra nada), mas o código do frontend sugere um filtro que não existe para quatro das
    cinco listagens.

## Contrato de saída

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "estoque",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/10-inventario-estoque.md",
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-3 segue sem catálogo/enum de origemModulo no C#. Quando o plano pede 'origem do ajuste como dropdown', é o ajuste básico (POST /api/estoque/ajustes, origemModulo texto livre) ou o ajuste avançado (POST /api/estoque/avancado/ajustes, Origem fixa pelo domínio, campo nem existe no request)?", "decide": "se a b68 constrói um dropdown sobre um catálogo que ainda não existe, ou se documenta a origem como somente-leitura" },
    { "tipo": "backend", "pergunta": "MovimentoEstoqueResponse.Tipo e .DataMovimento — confirmar em resposta HTTP real (não só leitura de código) que serializam como 'tipo'/'dataMovimento' e não como 'tipoMovimento'/'criadoEm'.", "decide": "se a correção é trocar o nome no tipo do frontend, ou se existe algum JsonPropertyName/naming policy que não encontrei na leitura do C#" },
    { "tipo": "funcional", "pergunta": "Bloqueios não têm GET de listagem no backend. A rodada quer endpoint novo de listagem, ou o fluxo pretendido é sempre 'alguém te passa o ID' (ex.: vindo de Qualidade/Alimentar por outro canal)?", "decide": "se a correção do antipadrão de GUID digitado é viável só no frontend ou exige contrato novo" },
    { "tipo": "funcional", "pergunta": "Existem dois sistemas de Inventário (básico e avançado) sob a mesma permissão. O b68 mexe nos dois, só no básico, ou a duplicação é assunto de outra rodada?", "decide": "escopo exato do recorte de Inventário, hoje fora do texto do plano b68" }
  ],
  "riscos": [
    "Divergência 2/3 (nome de campo tipo/tipoMovimento e dataMovimento/criadoEm) não foi confirmada contra resposta HTTP real — só contra código C# e ausência de override de serialização. Se estiver errada, os achados 2, 3 e 4 caem.",
    "Divergência 6 (anulabilidade de FilialOrigemId/FilialDestinoId) pode ser proposital (o frontend forçando obrigatoriedade que o backend permite omitir) — não sei se isso é intencional ou lacuna de análise anterior.",
    "Não medi volume real de GET /api/estoque/movimentos (sem backend em execução nem banco); a afirmação de 'cresce sem limite' é sobre a ausência de paginação no código, não sobre uma contagem de linhas observada.",
    "LACUNA_DESTINO no gate aponta 'b66' para os dois campos da transferência; valor desatualizado após a reindexação D67, não corrigido nesta rodada porque o agente não edita scripts/."
  ]
}
```
