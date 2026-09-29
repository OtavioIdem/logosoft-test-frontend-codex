# Inventário — Compra e financeiro com origem e reversão explícitas (rodada de arquitetura 12, recorte `b70`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b70-compra-financeiro`, em cima da `b69`.
Fonte de verdade do backend: `../New project 3/src` (C#, leitura). **Não houve acesso ao ambiente vivo
nesta sessão** — não tentei Docker/API autenticada (fora da fronteira do agente); toda linha
"confirmado no backend?" vem de leitura de código nas duas pontas (use case, validator, record C# ×
schema/tipo/api TypeScript), nunca de resposta HTTP real. Onde só uma chamada autenticada resolveria,
a linha diz **não verificado**, nunca "sim".

Módulos do recorte: `features/compras/`, `features/compras-avancado/` (solicitação, cotação,
recebimento/divergência/conferência fiscal), `features/financeiro/` (contas a pagar/receber básicas,
formas e condições de pagamento, fluxo de caixa), `features/financeiro-avancado/` (contas
avançadas com `origemModulo`/`origemId`, fluxo de caixa avançado).

## 0. P1/P3 (v1.23) — as duas correções seguem de pé hoje

O plano cita P1 (Contas a Pagar/Receber com R$ 0,00) e P3 (seletor "Origem = Compra" morto em
Contas a Pagar) como defeitos já corrigidos. Medi as duas de novo, porque o briefing pede
confirmação, não confiança no changelog.

**P1 — corrigido e travado por teste.** `features/financeiro/types/financeiro.types.ts` declara
`valorOriginal`/`valorPago`/`valorSaldo` (não mais `valorTotal`/`saldo`), batendo com
`ContaPagarResponse`/`ContaReceberResponse` do backend
(`Erp.Application/Financeiro/ContasPagar/ContaPagarResponse.cs`,
`.../ContasReceber/ContaReceberResponse.cs` — não lidos linha a linha nesta sessão porque o
`grep` em `ContaPagarRequests.cs`/`ContaReceberRequests.cs` já confirma os mesmos nomes do lado
request, e o `FinanceiroMapper` não foi encontrado divergente em nenhuma leitura). `formatMoney`
(`lib/formatters/money.ts:14-19`) não faz mais `value ?? 0`: valor ausente vira texto de defeito em
dev e "—" em produção — a defesa genérica contra a classe P1 (F1.4) está no código, não só no
changelog. `tests/unit/financeiroContratoMonetario.test.ts` prova os nomes por asserção de string
contra o arquivo de tipos.

**P3 — corrigido.** `ContaFinanceiraFormDialog.tsx:57-63` (`financialOriginOptions`): para
`type === 'pagar'`, o dropdown de Origem só oferece `Manual` e fica `disabled` (`:138`), com nota
explicando que a origem de conta a pagar é derivada pelo backend. Confirmado do lado do backend:
`ContaPagarUseCases.cs:87-90` (`CriarContaPagarUseCase`) recusa qualquer `Origem != Manual` ou
`OrigemId != null` com `FinanceiroErrors.OrigemNaoDerivavelPeloUsuario` (comentário no código cita
literalmente a D7/v1.23.2/G5). Contas a Receber continua permitindo `Origem = Pedido de venda`
(dropdown filtra só `Compra`, `:62`) — como o próprio P3 já registrava, não generalizar.

**Achado novo, fora de P1/P3, no mesmo código:** ver Divergência CF-1 — a validação D7 que fecha
Contas a Pagar **não existe** em `CriarContaReceberUseCase` (`ContaReceberUseCases.cs:83-92`). O
dropdown de Contas a Receber permite `NotaFiscal`, `Contrato` e `AjusteAutorizado` sem nenhuma busca
de referência (`ContaFinanceiraFormDialog.tsx:113,142`, `unsupportedOriginReference` — mostra um
aviso e envia `origemId: null`), e o backend aceita: só verifica duplicidade quando `OrigemId.HasValue`
(`:90-92`). Ou seja, um lançamento manual pode nascer marcado "Origem = Contrato" sem nenhum vínculo
real — o oposto do que "origem visível e honesta" pede para a `b70`.

## 1. Origem do título

**Campo e enum**, lidos no C# (`Erp.Domain/Financeiro/OrigemFinanceira.cs`):

```csharp
public enum OrigemFinanceira { Manual=1, PedidoVenda=2, NotaFiscal=3, Compra=4, Contrato=5, AjusteAutorizado=6, OrdemServico=7, Frota=8 }
```

`ContaPagarResponse.Origem`/`ContaReceberResponse.Origem` (tipo `OrigemFinanceira`) e `OrigemId`
(`Guid?`) carregam a origem no módulo básico. O módulo avançado usa um par diferente:
`ContaFinanceiraResponse.OrigemModulo` (`string?` livre) + `OrigemId` (`Guid?`) —
`FinanceiroAvancadoResponses.cs:5-16`.

**A tela lê isso hoje? Com o nome certo?**

- Módulo básico: **sim, com o nome certo, mas com o enum incompleto.**
  `features/financeiro/types/financeiro.types.ts:70,116` declara `origem: OrigemFinanceira | number`
  e `origemId?: Guid | null` — nomes batem. `ContasFinanceirasPage.tsx:123` exibe a coluna "Origem"
  via `origemFinanceiraLabel(Number(row.origem))`. **Mas** `types/erp.ts:94-101` só declara 6 dos 8
  valores do enum backend — falta `OrdemServico = 7` e `Frota = 8`
  (`financeiroUiUtils.ts:5-12`, `origemFinanceiraOptions` também só tem 6 entradas). Um título com
  `origem = 7` ou `8` cai no fallback `'-'` de `origemFinanceiraLabel` (`:22`) — a origem existe no
  wire e a tela mostra "-". Ver Divergência CF-2.
- Módulo avançado: **não.** `origemModulo`/`origemId` estão no tipo
  (`financeiroAvancado.types.ts:43-44`) mas nenhum componente os lê
  (`grep origemModulo features/financeiro-avancado/components/*.tsx` → zero) — nem na tabela, nem
  no card de detalhe (`ContasAvancadoTab.tsx:76-102`), nem em filtro. Ver Divergência CF-3.

## 2. B-4 por leitura de código

**Que use case cria título a partir de venda e de compra:**

- Compra: `GerarContaPagarAsync`, dentro de `ReceberPedidoCompraUseCase.cs:263-302`, chamado apenas
  se `request.GerarContaPagar == true` no momento do **recebimento** do pedido (não na criação nem
  na aprovação). Idempotência garantida por índice único do banco
  (`IX_contas_pagar_EmpresaId_Origem_OrigemId`, `:304`) mais revalidação dentro da transação
  (`:272-273`) — segunda tentativa de gerar conta para o mesmo `(EmpresaId, Compra, PedidoId)`
  devolve `CompraErrors.ContaPagarJaGerada`, tratado tanto por checagem explícita (fora da
  transação, `:81-83`) quanto por `catch (UniqueConstraintViolationException)` (corrida,
  `:194-203`).
- Venda: **não é automático.** `GerarContaReceberDePedidoVendaUseCase.cs:126-160`
  (`ContaReceberUseCases.cs`) é acionado por um endpoint próprio
  (`POST /api/financeiro/contas-receber/pedido-venda/{pedidoVendaId}`), chamado pela tela por um
  botão manual ("Gerar por pedido", `ContasFinanceirasPage.tsx:117`,
  `GerarContaReceberPedidoDialog`). Exige `pedido.StatusPedido == StatusPedidoVenda.Faturado`
  (`:139`) e barra duplicidade por origem igual (`:141-142`, `FinanceiroErrors.Duplicidade`, sem
  índice de banco dedicado — só checagem de aplicação, diferente do padrão de Compras).

**O que acontece com o título quando a origem é estornada ou cancelada depois de uma baixa: existe
política? idempotência?**

Não existe vínculo de volta. Medido em três pontas:

1. `PedidoCompra.Cancelar` (`Erp.Domain/Compras/PedidoCompra.cs:114-121`) lança `DomainException` se
   `StatusPedido is ParcialmenteRecebido or Recebido` — ou seja, **um pedido de compra só pode ser
   cancelado antes de qualquer recebimento**. Como o título só nasce no recebimento, não existe
   caminho no domínio em que um pedido com título gerado seja depois cancelado. A pergunta "o que
   acontece com o título quando o pedido é cancelado depois" não tem resposta porque **o cenário é
   impossível pelo próprio domínio** — não é política declarada, é efeito colateral de uma regra de
   status.
2. `ContaPagar.Cancelar` (`Erp.Domain/Financeiro/ContaPagar.cs:77-86`) recusa cancelar se
   `ValorPago > 0` ("Conta a pagar com pagamento deve ser estornada antes do cancelamento") — a
   ordem é imposta (estornar pagamentos → cancelar), mas **nada disso volta ao pedido de compra**: a
   `ContaPagar` não referencia o `PedidoCompra` de volta (só o inverso, via `OrigemId`), e não há
   nenhum use case que, ao cancelar/estornar a conta, altere o status do pedido, reverta a entrada de
   estoque ou libere o recebimento para ser refeito.
3. **Não existe estorno de recebimento de compra.** `grep -rln "EstornarRecebimento\|ReverterRecebimento\|CancelarRecebimento" Erp.Application/Compras Erp.Api/Controllers/Compras` → zero resultados. Um recebimento
   registrado por engano (quantidade errada, item errado) não tem caminho de reversão nenhum —
   nem o pedido pode ser cancelado depois (item 1), nem o recebimento em si pode ser desfeito. O
   único ponto de reversão de todo o fluxo de compra é o pagamento da `ContaPagar` gerada, via
   `EstornarPagamento` — e isso não desfaz a entrada de estoque nem a quantidade recebida do
   `ItemPedidoCompra`. Ver Divergência CF-4 — é o achado de maior impacto para o título da rodada
   ("reversão explícitas").

**Pedido direto, sem solicitação nem cotação, é aceito?**

**Sim, sem nenhuma checagem.** `CriarPedidoCompraUseCase.cs:50-88` não referencia
`SolicitacaoCompraId` nem `CotacaoCompraId` em nenhum ponto — `CriarPedidoCompraRequest`
(`PedidoCompraRequests.cs:3-11`) não tem esses campos, e o único caminho para um `PedidoCompra`
nascer vinculado a uma cotação é `AprovarCotacaoCompraUseCase.cs:105` chamando
`PedidoCompra.Criar(..., cotacaoCompraId: cotacao.Id)`. Confirma o plano ("o backend permite pedido
direto") e a D64.

## 3. Caminhos de compra: solicitação → cotação → pedido

| Etapa | Endpoint de ligação | Campo que guarda o elo | A tela mostra? |
| --- | --- | --- | --- |
| Solicitação → Cotação | `POST /api/compras/cotacoes` aceita `SolicitacaoCompraId: Guid?` opcional no corpo (`CriarCotacaoCompraRequest`, `CotacaoCompraContracts.cs:5-13`) | `CotacaoCompraResponse.SolicitacaoCompraId` (`:29`), exposto no frontend como `CotacaoCompraResponse.solicitacaoCompraId` (`comprasAvancado.types.ts:51`) | **Sim** — `CriarCotacaoFormValues.solicitacaoCompraId` existe (`:103`); não confirmei nesta sessão se `CotacaoCompraDetalhePage.tsx` renderiza o campo em tela (não lido linha a linha) — **não verificado** se é só trafegado ou também exibido |
| Cotação → Pedido | `POST /api/compras/cotacoes/{id}/aprovar`, `AprovarCotacaoCompraUseCase.cs:105` cria o `PedidoCompra` com `cotacaoCompraId: cotacao.Id` | `PedidoCompra.CotacaoCompraId` (domínio, `PedidoCompra.cs:19,29`) | **Não.** `PedidoCompraResponse` (Application, `Pedidos/PedidoCompraResponse.cs:5-16`) **não tem** `CotacaoCompraId` no record, e `PedidoCompraMapper.Mapear` (`PedidoCompraMapper.cs:7-22`) não o inclui na projeção. O campo existe no domínio e morre antes do DTO — o frontend não tem como mostrá-lo porque o backend nunca o envia. `features/compras/types/compras.types.ts:22-37` (`PedidoCompraResponse`, frontend) também não o declara, consistente com o que chega. Ver Divergência CF-5. |

**Aprovação de cotação em pedido não carrega local de estoque por item.**
`AprovarCotacaoCompraRequest` (`CotacaoCompraContracts.cs:23-29`) aceita
`ItensLocalEstoque: IReadOnlyList<ItemPedidoOrigemCotacaoRequest>?` (cada item com
`CotacaoCompraItemId` + `LocalEstoqueId?`) — mas `AprovarCotacaoFormValues`
(`comprasAvancado.types.ts:105`) e `AprovarCotacaoDialog`
(`features/compras-avancado/components/CotacaoDialogs.tsx:93-100`) não têm esse campo em nenhum
lugar; a UI nunca envia `itensLocalEstoque`. Efeito prático: o pedido nasce da cotação com os itens
sem `LocalEstoqueId` (fica `null` até alguém informar no recebimento —
`ReceberPedidoCompraUseCase.cs:91`, `itemReceber.LocalEstoqueId ?? itemPedido.LocalEstoqueId`,
recuperável no recebimento, mas não antes). Isso colide com o tipo do frontend
`ItemPedidoCompraResponse.localEstoqueId: Guid` (obrigatório, `compras.types.ts:14`), enquanto o
backend declara `Guid? LocalEstoqueId` (`Pedidos/PedidoCompraResponse.cs:24`, anulável) — a UI se
defende em runtime (`PedidoCompraDetalhePage.tsx:244`, `row.localEstoqueId ? ... : '-'`), então não
quebra, mas o tipo mente sobre a obrigatoriedade. Ver Divergência CF-6.

## 4. B-12 — confirmado: nenhum use case de compra lê `Homologado`

```bash
grep -rln "Homologado" ../New\ project\ 3/src/Erp.Application/Compras ../New\ project\ 3/src/Erp.Domain/Compras
# (sem resultado)
grep -rn "COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO" ../New\ project\ 3/src --include=*.cs
# só a constante do catálogo de parâmetros e um comentário de doc — nenhum use case
```

`CriarPedidoCompraUseCase.ValidarFornecedorAsync` (`:90-96`) checa só `IsActive` e `EmpresaId` do
fornecedor — nada de `Homologado`. `features/compras/components/PedidoCompraFormDialog.tsx` não
referencia `homologado` em nenhum ponto (`grep` vazio). Confirma D64 e o texto do plano ("regra no
backend, por empresa/filial"). Achado adjacente: o diálogo de confirmação de "Homologar" em
`FornecedoresPage.tsx:177` (fora do recorte de `b70`, feature de Fornecedores) já promete
"Fornecedores homologados ficam aptos a receber pedidos de compra conforme a política da empresa" —
texto que descreve uma política que, hoje, **não existe em código nenhum**. Não é bug da `b70`, mas é
o mesmo vocabulário que a D64 já discutiu e vale registrar porque a tela de Fornecedores promete o
que a tela de Pedido de Compra não cumpre.

## 5. Lançamento manual de título

| Ação | Request backend | Schema Zod | Bate? |
| --- | --- | --- | --- |
| Criar conta a pagar manual | `CriarContaPagarRequest(EmpresaId, FilialId, FornecedorId, Documento, Origem, OrigemId, DataEmissao, Observacao, Parcelas[])` (`ContaPagarRequests.cs:9-19`) | `criarContaPagarSchema` (`financeiroSchemas.ts:94-104`) | Sim, campo a campo. `.strict()` não usado (regra do CLAUDE.md: `.strict()` só é obrigatório, não proibido, em request; ausência não é defeito) |
| Criar conta a receber manual | `CriarContaReceberRequest(...)` idêntico em forma | `criarContaReceberSchema` (`:54-64`) | Sim |
| Permissão | `FINANCEIRO_GERENCIAR` nos dois `POST` (`ContasPagarController.cs:38-39`, `ContasReceberController.cs:38-39`) | UI usa `hasPermission`/`PermissionGuard` com `FINANCEIRO_GERENCIAR` no botão "Nova conta" (`ContasFinanceirasPage.tsx:117`) | Sim |
| Validação de origem | Pagar: recusa `Origem != Manual` (D7, ver seção 0). Receber: **sem validação de origem** (`ContaReceberValidators.cs:14-24`, nenhuma `RuleFor(x => x.Origem)`) | UI: dropdown restringe Pagar a Manual (disabled); Receber permite 5 origens, 4 delas sem busca de referência | **Assimétrico** — ver Divergência CF-1 |

Módulo avançado: `CriarContaFinanceiraRequest(EmpresaId, FilialId, ParticipanteId, Descricao,
Documento, ValorOriginal, DataEmissao, DataVencimento, OrigemModulo, OrigemId)`
(`FinanceiroAvancadoRequests.cs:3-13`) × `criarContaSchema`
(`financeiroAvancadoSchemas.ts:17-26`) — o schema **não tem** `origemModulo`/`origemId` (são
opcionais no backend, então omitir é válido; a UI nunca oferece preenchê-los mesmo em teoria — não é
erro de contrato, é ausência de capacidade, coerente com a seção 1).

## 6. Reversão/estorno de título e de baixa

| Módulo | Endpoint | Request | Erros de domínio possíveis | Tratamento na tela |
| --- | --- | --- | --- | --- |
| Básico — Pagar | `POST /api/financeiro/contas-pagar/{id}/estornar-pagamento`, `FINANCEIRO_ESTORNAR` | `EstornarPagamentoRequest(PagamentoId, Motivo)` — bate com `EstornarPagamentoRequest` frontend | Pagamento não encontrado; nenhuma outra checagem de domínio vista em `ContaPagarUseCases.cs:152-194` além de `DomainException` genérica de `EstornarPagamento` (não achei uma regra que bloqueie reestorno de pagamento já estornado — `Pagamento.Estornar`, não lido nesta sessão — **não verificado**) | `EstornoFinanceiroDialog` (`FinanceiroActionDialogs.tsx:112-122`) lista baixas via dropdown, exige motivo; erro de mutação vai a toast (`mapApiError`) |
| Básico — Receber | espelho, `.../estornar-recebimento`, mesmo padrão | idem | idem | idem |
| Básico — Cancelar (Pagar/Receber) | `.../cancelar`, `FINANCEIRO_CANCELAR` | `CancelarContaPagarRequest(Motivo)`/`CancelarContaReceberRequest(Motivo)` | `ContaPagar.Cancelar` recusa se já cancelada ou se `ValorPago > 0` (`ContaPagar.cs:77-86`) — mensagem de domínio genérica, sem `field` (mesma limitação estrutural já registrada para Compras/Vendas nas rodadas anteriores, B-10) | `ReasonDialog` com motivo obrigatório; `isContaEncerrada` (`financeiroUiUtils.ts:47`) já desabilita o botão "Cancelar" para conta Quitada/Cancelada/Estornada — **não** cobre "tem pagamento parcial", que ainda pode ser tentado e recusado pelo backend com erro genérico |
| Avançado — Baixar/Estornar/Cancelar | `.../{tipo}/{id}/baixar`, `.../contas/{id}/estornar`, `.../contas/{id}/cancelar` | `BaixarContaFinanceiraRequest`, `EstornarBaixaFinanceiraRequest(BaixaId, DataEstorno, Motivo)`, `CancelarContaFinanceiraRequest(Motivo)` — todos batem com os tipos/schemas frontend | `EstornarAsync`/`CancelarAsync` não lidos linha a linha nesta sessão (domínio em `Erp.Domain/Financeiro/Avancado`, não aberto) — **não verificado** | `EstornarBaixaDialog` filtra `baixas.filter(b => !b.estornada)` antes de montar o dropdown — impede reestorno pela UI, mesmo sem saber se o backend também bloqueia |

**Reversão de recebimento de compra**: já registrado na seção 2 — **não existe**, em nenhuma forma
(nem endpoint, nem botão). O único "estorno" possível no fluxo de compra é o do pagamento da conta a
pagar gerada.

## 7. Money on screen

| Tela | Campo exibido | Vem de | Nome bate? |
| --- | --- | --- | --- |
| Pedidos de compra (lista + card resumo) | `pedido.valorTotal` | `PedidoCompraResponse.ValorTotal` | sim |
| Detalhe do pedido, card Totais | `valorProdutos`, `valorDesconto`, `valorTotal` | idem, campo a campo | sim |
| Itens do pedido | `valorUnitario`, `valorDesconto`, `valorTotal ?? quantidade*unitario-desconto` | `ItemPedidoCompraResponse.ValorUnitario/ValorDesconto/ValorTotal` (não anulável no backend; o fallback do frontend nunca dispara) | sim |
| Item do pedido — `ValorBruto` | **não exibido** | `ItemPedidoCompraResponse.ValorBruto` (entregue) — campo ausente do tipo frontend | sem uso (ver Divergência CF-7) |
| Cotação — item e total | `valorUnitario`, `valorTotal` | `CotacaoCompraItemResponse.ValorUnitario/ValorTotal` | sim |
| Recebimento/Divergência | `valorEsperado`, `valorInformado`, `diferenca`, `valorTotalRecebido`, `valorUnitario`/`total` do item | `RecebimentoDivergenciaResponse`/`RecebimentoCompraDetalheResponse` — nomes batem 1:1 com o backend (`RecebimentoCompraResponse`/`RecebimentoDivergenciaResponse`, ambos em `Pedidos/PedidoCompraResponse.cs` e `Divergencias`, não abertos linha a linha nesta sessão porque os nomes de campo já batem com os que o frontend consome — **não verificado** campo a campo, só por convergência de nome) | sim, por convergência |
| Contas a pagar/receber (básico) | `valorOriginal`, `valorSaldo` | `ContaPagarResponse`/`ContaReceberResponse` | sim (P1, seção 0) |
| Parcela (diálogo de baixa) | `parcela.valorSaldo` | `ParcelaPagarResponse.ValorSaldo`/`ParcelaReceberResponse.ValorSaldo` | sim |
| Contas avançadas (lista + card) | `valorOriginal`, `saldo` | `ContaFinanceiraResumoResponse.ValorOriginal/Saldo`, `ContaFinanceiraResponse.ValorOriginal/Saldo` | sim |
| Baixas da conta avançada | `baixa.valor` | `BaixaFinanceiraResponse.Valor` | sim |
| Fluxo de caixa (básico) | **tela não usa nenhum campo** — `/financeiro/fluxo-caixa` é hoje uma mensagem estática redirecionando para o Financeiro avançado (`FluxoCaixaPage.tsx:6-11`) | `financeiro.types.ts` ainda declara `FluxoCaixaResponse` e `financeiroSchemas.ts` ainda tem `fluxoCaixaQuerySchema`/`buildFluxoCaixaQuery`, mas `financeiroApi.ts` **não tem** um método `fluxoCaixa` no objeto exportado (`grep "async fluxoCaixa" features/financeiro/api/financeiroApi.ts` → zero) | tipo e schema declarados e **sem uso** — resto morto de uma tela substituída pelo avançado (ver Divergência CF-8) |
| Fluxo de caixa avançado | `entradasPrevistas`, `saidasPrevistas`, `entradasRealizadas`, `saidasRealizadas`, `saldoPrevisto`, `saldoRealizado`, `saldoProjetado` | `FluxoCaixaResponse` avançado (`FinanceiroAvancadoResponses.cs:39-49`) | não lido campo a campo em `FluxoCaixaTab.tsx` nesta sessão — **não verificado** |

## 8. Permissões

Todas as permissões de Compras e Financeiro usadas pelo frontend (`COMPRAS_CONSULTAR/GERENCIAR/
APROVAR/CANCELAR/RECEBER`, `COMPRAS_SOLICITACOES_CONSULTAR/GERENCIAR/APROVAR`,
`COMPRAS_COTACOES_CONSULTAR/GERENCIAR/APROVAR`, `COMPRAS_CONFERENCIA_FISCAL_REGISTRAR`,
`FINANCEIRO_CONSULTAR/GERENCIAR/RECEBER/PAGAR/ESTORNAR/CANCELAR/FLUXO_CAIXA_CONSULTAR`,
`FORMAS_PAGAMENTO_GERENCIAR`, `CONDICOES_PAGAMENTO_GERENCIAR`) existem em `SystemPermissions.cs`
(linhas 78-113), no union `types/erp.ts` (286-300, 336-345), no catálogo
`permissoesCatalogo.ts` e batem 1:1 com o `[RequiredPermission]` de cada endpoint nos quatro
controllers de Compras (`PedidosCompraController`, `SolicitacoesCompraController`,
`CotacoesCompraController`, `RecebimentosCompraController`) e nos dois de Financeiro
(`ContasPagarController`, `ContasReceberController`, `FinanceiroAvancadoController`) — conferido
endpoint a endpoint nas seções 2-6. Nenhuma divergência nominal de permissão de endpoint
encontrada nesta direção (backend exige X, frontend chama com X).

`lib/security/routePermissions.ts:38-48` cobre `/financeiro/contas-receber`, `/financeiro/contas-pagar`,
`/financeiro/fluxo-caixa`, `/financeiro/avancado`, `/financeiro/formas-pagamento`,
`/financeiro/condicoes-pagamento`, `/financeiro` (fallback), `/compras/solicitacoes`,
`/compras/cotacoes`, `/compras/recebimentos`, `/compras` (fallback) — todas as rotas do recorte têm
regra própria ou caem num fallback compatível.

**Órfãs na direção contrária** (frontend declara, backend não amarra a nenhum endpoint) —
**mesmo padrão já registrado na rodada 11 (V9) para Vendas, agora em Financeiro**:
`FINANCEIRO_CAIXA_GERENCIAR` e `FINANCEIRO_BANCO_GERENCIAR` (`types/erp.ts:294-295`,
`permissoesCatalogo.ts:93-94`). O próprio backend documenta a remoção:
`PermissoesCatalogoDefinition.cs:158-161` — "Recurso 'Caixa' ... e Recurso 'Bancos' ... saíram do
catálogo: cada um tinha uma única ação, e nenhuma das duas guarda endpoint em
src/Erp.Api/Controllers (D3, v1.21.3/G1). Voltam junto com o endpoint que as usar — não antes." As
duas constantes C# continuam existindo e em `SystemPermissions.TodasComMaster`, mas nenhum
`[RequiredPermission]` as referencia. O frontend nunca recebeu a remoção: continuam atribuíveis em
qualquer grupo de acesso, sem abrir nenhuma capacidade real. Ver Divergência CF-9.

## 9. Testes transversais em risco

```bash
grep -rl "compras\|financeiro" tests/unit tests/components | grep -iE "compra|financeiro"
```

```text
tests/unit/comprasAvancadoPayload.test.ts
tests/unit/comprasAvancadoStructure.test.ts
tests/unit/comprasPayload.test.ts
tests/unit/comprasUxRules.test.ts
tests/unit/financeiroAvancadoPayload.test.ts
tests/unit/financeiroAvancadoStructure.test.ts
tests/unit/financeiroB42Structure.test.ts
tests/unit/financeiroContratoMonetario.test.ts
tests/unit/financeiroF15Structure.test.ts
tests/unit/financeiroPayload.test.ts
tests/components/financeiroMoneyFormatter.test.tsx
```

```bash
grep -rl "COMPRAS_\|FINANCEIRO_" tests/unit | grep -viE "compra|financeiro"
```

```text
tests/unit/fiscalContract.test.ts             # referencia permissão financeira/compras de relance — checar antes de tocar o union
tests/unit/guardPermissionMapMenuProofHistoric.test.ts   # prova histórica de guard × menu; qualquer permissão nova/removida de Compras/Financeiro precisa deste teste revisitado
tests/unit/routePermissions.test.ts           # cobre as regras de /compras e /financeiro citadas na seção 8
tests/unit/segurancaUsuarioPayload.test.ts    # referência lateral, não específica do recorte — confirmar se cita COMPRAS_/FINANCEIRO_ antes de mexer no union
```

E2E que tocam módulos adjacentes e podem quebrar por engano se `b70` mexer em rota/label
compartilhado:

```text
tests/e2e/financeiro-estoque.spec.ts     # cruza Financeiro com Estoque — nome sugere dependência direta do fluxo de compra→estoque→título
tests/e2e/integrated-backend.spec.ts     # fluxo ponta a ponta, provavelmente cobre criação de conta a partir de pedido
tests/e2e/logosoft-critical-flows.spec.ts
tests/e2e/b66-cliente-fornecedor.spec.ts # Fornecedor/Homologado tocado na seção 4 deste inventário
```

Nenhum destes foi executado nesta sessão (fronteira do agente: não roda teste, só localiza). Ficam
como a lista que o QA revisor recebe pronta — evita o padrão já registrado duas vezes no plano
("teste fora do recorte quebrou o CI").

## Tabelas exigidas pelo formato-padrão

### 1. Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida | Onde é registrada |
| --- | --- | --- | --- | --- |
| `/compras/pedidos` | `app/(main)/compras/pedidos/page.tsx` | `PedidosCompraPage.tsx` | `COMPRAS_CONSULTAR` | `routePermissions.ts:48`; `AppMenu.tsx` (não lido nesta sessão — **não verificado** se o item existe/aponta certo); catálogo e união confirmados (seção 8) |
| `/compras/pedidos/novo` | `app/(main)/compras/pedidos/novo/page.tsx` | `PedidoCompraDetalhePage` (sem `pedidoId`) | leitura `COMPRAS_CONSULTAR`; criar `COMPRAS_GERENCIAR` | idem |
| `/compras/pedidos/[id]` | `app/(main)/compras/pedidos/[id]/page.tsx` | `PedidoCompraDetalhePage.tsx` | leitura `COMPRAS_CONSULTAR`; editar/itens `COMPRAS_GERENCIAR`; aprovar `COMPRAS_APROVAR`; cancelar `COMPRAS_CANCELAR`; receber `COMPRAS_RECEBER` | idem, por ação (seção 2/8) |
| `/compras/solicitacoes` | `app/(main)/compras/solicitacoes/page.tsx` | `SolicitacoesCompraPage.tsx` | `COMPRAS_SOLICITACOES_CONSULTAR` | `routePermissions.ts:45` |
| `/compras/solicitacoes/[id]` | `.../solicitacoes/[id]/page.tsx` | `SolicitacaoCompraDetalhePage.tsx` | `COMPRAS_SOLICITACOES_CONSULTAR` (+ `_GERENCIAR`/`_APROVAR` por ação) | idem |
| `/compras/cotacoes` | `app/(main)/compras/cotacoes/page.tsx` | `CotacoesCompraPage.tsx` | `COMPRAS_COTACOES_CONSULTAR` | `routePermissions.ts:46` |
| `/compras/cotacoes/[id]` | `.../cotacoes/[id]/page.tsx` | `CotacaoCompraDetalhePage.tsx` | `COMPRAS_COTACOES_CONSULTAR` (+ `_GERENCIAR`/`_APROVAR` por ação) | idem |
| `/compras/recebimentos` | `app/(main)/compras/recebimentos/page.tsx` | `RecebimentosCompraPage.tsx` | `COMPRAS_CONSULTAR` (+ `COMPRAS_CONFERENCIA_FISCAL_REGISTRAR` para registrar conferência) | `routePermissions.ts:47` |
| `/financeiro/contas-pagar` | `app/(main)/financeiro/contas-pagar/page.tsx` | `ContasFinanceirasPage` (`type="pagar"`) | `FINANCEIRO_CONSULTAR` (+ `_PAGAR`/`_ESTORNAR`/`_CANCELAR` por ação) | `routePermissions.ts:39` |
| `/financeiro/contas-receber` | `app/(main)/financeiro/contas-receber/page.tsx` | `ContasFinanceirasPage` (`type="receber"`) | `FINANCEIRO_CONSULTAR` (+ `_RECEBER`/`_ESTORNAR`/`_CANCELAR` por ação) | `routePermissions.ts:38` |
| `/financeiro/fluxo-caixa` | `app/(main)/financeiro/fluxo-caixa/page.tsx` | `FluxoCaixaPage.tsx` (mensagem estática, redireciona texto para o avançado) | `FINANCEIRO_CONSULTAR` | `routePermissions.ts:40` |
| `/financeiro/avancado` | `app/(main)/financeiro/avancado/page.tsx` | `FinanceiroAvancadoPage.tsx` | qualquer de `FINANCEIRO_CONSULTAR/_GERENCIAR/_FLUXO_CAIXA_CONSULTAR` (componente checa `hasAnyPermission`) | `routePermissions.ts:41` |
| `/financeiro/formas-pagamento` | `app/(main)/financeiro/formas-pagamento/page.tsx` | `FormasPagamentoPage.tsx` | `FINANCEIRO_CONSULTAR`/`FORMAS_PAGAMENTO_GERENCIAR` | `routePermissions.ts:42` |
| `/financeiro/condicoes-pagamento` | `app/(main)/financeiro/condicoes-pagamento/page.tsx` | `CondicoesPagamentoPage.tsx` | `FINANCEIRO_CONSULTAR`/`CONDICOES_PAGAMENTO_GERENCIAR` | `routePermissions.ts:43` |

### 2. Endpoints consumidos

Fonte: os oito controllers citados na seção 8, mais os records de request/response abertos nas
seções 1-7. Nenhuma das rotas abaixo aparece em `scripts/backend-contract-map.allowlist.json` sob
`documentedDivergences`; **quatro aparecem em `legacyReferences` com rota antiga** (ver nota).

| Método + rota | Schema Zod | Confirmado no backend? |
| --- | --- | --- |
| `GET/POST/PUT /api/compras/pedidos`, `.../itens`, `.../itens/{id}`, `.../itens/{id}/remover`, `.../enviar-para-aprovacao`, `.../aprovar`, `.../cancelar`, `.../receber` (10 rotas) | `criarPedidoCompraSchema`, `atualizarPedidoCompraSchema`, `adicionarItemPedidoCompraSchema`, `atualizarItemPedidoCompraSchema`, `motivoPedidoCompraSchema`, `aprovarPedidoCompraSchema`, `receberPedidoCompraSchema` | sim, 1:1 com `PedidosCompraController.cs` (seção 5, 2) |
| `GET/POST /api/compras/solicitacoes`, `.../itens`, `.../aprovar`, `.../cancelar` (5 rotas) | `criarSolicitacaoSchema`, `itemSolicitacaoSchema`, `motivoOpcionalSchema` | sim, `SolicitacoesCompraController.cs` |
| `GET/POST /api/compras/cotacoes`, `.../itens`, `.../aprovar`, `.../recusar`, `.../cancelar` (6 rotas) | `criarCotacaoSchema`, `itemCotacaoSchema`, `aprovarCotacaoSchema`, `motivoOpcionalSchema` | sim, `CotacoesCompraController.cs` — **`aprovarCotacaoSchema` não cobre `itensLocalEstoque`** (seção 3, Divergência CF-6) |
| `GET /api/compras/recebimentos/{id}`, `GET .../divergencias`, `POST .../{id}/conferencia-fiscal` | `conferenciaFiscalSchema` | sim, `RecebimentosCompraController.cs` |
| `GET/POST /api/financeiro/contas-pagar`, `.../pagar`, `.../estornar-pagamento`, `.../cancelar` (5 rotas) | `criarContaPagarSchema`, `pagarContaSchema`, `estornarPagamentoSchema`, `cancelarContaFinanceiraSchema` | sim, `ContasPagarController.cs` |
| `GET/POST /api/financeiro/contas-receber`, `.../pedido-venda/{id}`, `.../receber`, `.../estornar-recebimento`, `.../cancelar` (6 rotas) | `criarContaReceberSchema`, `gerarContaReceberPedidoSchema`, `receberContaSchema`, `estornarRecebimentoSchema`, `cancelarContaFinanceiraSchema` | sim, `ContasReceberController.cs`; **validação de origem assimétrica com Pagar** (Divergência CF-1) |
| `GET/POST /api/financeiro/formas-pagamento`, `.../inativar`; `.../condicoes-pagamento`, `.../inativar` (4 rotas) | schemas próprios, não abertos nesta sessão (fora do foco "origem e reversão") — **não verificado** campo a campo | não verificado nesta sessão |
| `GET/POST /api/financeiro/avancado/contas-receber`, `contas-pagar`, `GET .../contas/{id}`, `.../{tipo}/{id}/baixar`, `.../contas/{id}/estornar` (+ aliases `contas-receber/estornar`, `contas-pagar/estornar`), `.../contas/{id}/cancelar` (+ aliases), `GET .../fluxo-caixa` (10 rotas efetivas, contando aliases) | `criarContaSchema`, `baixarContaSchema`, `estornarBaixaSchema`, `cancelarContaSchema` | sim, `FinanceiroAvancadoController.cs` — **resposta de listagem embrulhada em `resultado`, e o client já desembrulha corretamente** (`financeiroAvancadoApi.ts:28-33`), ao contrário do bug de Tabelas de Preço na rodada 11 |
| `POST /api/financeiro/contas-receber/{id}/baixar`, `.../estornar`; `.../contas-pagar/{id}/baixar`, `.../estornar`; `GET /api/financeiro/contas/{id}`; `GET /api/financeiro/fluxo-caixa` | — | **Nota**: estas seis linhas existem em `scripts/backend-contract-map.allowlist.json:28-33` como `legacyReferences` `DIVERGENTE_PRODUTIVO`, descrevendo rotas antigas do módulo **básico** que colidiam com as do **avançado**. `features/financeiro/api/financeiroApi.ts` lido nesta sessão **já usa** as rotas corretas (`.../receber`, `.../estornar-recebimento`, `.../pagar`, `.../estornar-pagamento`) — o defeito descrito no allowlist não existe mais no código atual. O allowlist ficou desatualizado: registra como aberto um problema que já foi corrigido. Ver Divergência CF-10 |

### 3. Tabela de campos

#### Pedido de compra — cabeçalho

`PedidoCompraResponse` do frontend (`compras.types.ts:22-37`) declara **13** campos escalares (fora
`itens`). Medição: li os dois lados campo a campo — o record C# `PedidoCompraResponse`
(`Pedidos/PedidoCompraResponse.cs:5-16`) e o `PedidoCompraMapper.Mapear`
(`PedidoCompraMapper.cs:7-22`, que projeta exatamente os 14 argumentos do record, nem mais nem
menos) contra o tipo TypeScript, nome a nome e anulabilidade a anulabilidade; para "destino" abri
`PedidosCompraPage.tsx`, `PedidoCompraDetalhePage.tsx`, `PedidoCompraFormDialog.tsx` e
`comprasUiUtils.ts` e busquei cada campo por `grep` (`pedido\.<campo>`, `values\.<campo>`,
`record\.<campo>`). Os 13 batem em nome e existência com os 13 campos do record C# — **entregue =
13/13**. Nenhuma divergência de nome nem de anulabilidade (`filialId?`, `dataPrevisaoEntrega?`,
`condicaoPagamentoId?`, `observacao?` do frontend batem com `Guid?`/`DateTimeOffset?`/`Guid?`/
`string?` do backend; os demais são obrigatórios nos dois lados).

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido (chave/navegação — usado em toda mutação: `pedido.id`, `PedidoCompraDetalhePage.tsx:146,157,167,176,187,198`) |
| `empresaId` | `Guid` | `.EmpresaId` | sim | exibido (escopo de queries relacionadas ao editar, `PedidoCompraFormDialog.tsx:24,47-49`) + enviado (criação, `CriarPedidoCompraRequest.EmpresaId`) |
| `filialId` | `Guid?` | `.FilialId` | sim | exibido (idem) + enviado (criação) |
| `numero` | `string` | `.Numero` | sim | exibido (coluna da lista, `comprasUiUtils`/`PedidosCompraPage.tsx`) + usado na busca local (`PedidosCompraPage.tsx:32`) + enviado (criação; `AtualizarPedidoCompraRequest` não recebe `numero` — imutável após criado) |
| `fornecedorId` | `Guid` | `.FornecedorId` | sim | exibido (via label, `PedidoCompraDetalhePage.tsx:229`, e na busca local) + enviado (criação) |
| `dataEmissao` | `IsoDateTime` | `.DataEmissao` | sim | exibido (`formatDate(pedido.dataEmissao)`, `:231`) + enviado (criação apenas — `atualizarPedidoCompraSchema`/`AtualizarPedidoCompraRequest` não incluem `dataEmissao`, é imutável após criado) |
| `dataPrevisaoEntrega` | `IsoDateTime?` | `.DataPrevisaoEntrega` | sim | exibido (`:232`) + enviado (criar/editar) |
| `condicaoPagamentoId` | `Guid?` | `.CondicaoPagamentoId` | sim | exibido (via label, `:230`) + enviado (criar/editar) |
| `statusPedido` | `StatusPedidoCompra \| number` | `.StatusPedido` | sim | exibido (tag + cards de resumo + motor de toda regra de habilitação de botão, `comprasUiUtils.ts:60-64,195-196`) |
| `valorProdutos` | `number` | `.ValorProdutos` | sim | exibido (`PedidoCompraDetalhePage.tsx:56`) |
| `valorDesconto` | `number` | `.ValorDesconto` | sim | exibido (`:57`) |
| `valorTotal` | `number` | `.ValorTotal` | sim | exibido (lista + card resumo + detalhe, `PedidosCompraPage.tsx:50`, `:60`) |
| `observacao` | `string?` | `.Observacao` | sim | exibido (detalhe, `:234`, e na busca local, `PedidosCompraPage.tsx:32`) + enviado (criar/editar) |

Conta (cabeçalho pedido de compra): **13 lidos pela UI = 13 com destino (exibido e/ou enviado) + 0
divergência + 0 sem uso**. Fecha.

**Campos que o backend entrega e o tipo não declara: nenhum.** O mapper projeta exatamente os 13
campos escalares + `itens`, sem nenhum campo extra — diferente do Pedido de Venda (rodada 11), cujo
`PedidoVendaResponse` trazia `motivoCancelamento`/`canceladoEm` declarados e sem uso. Aqui a
resposta é mais enxuta: nem chega a expor o que teria dado para não usar.

**Fora da resposta, só no domínio — não é "backend entrega e tipo não declara", porque o endpoint
nunca serializa esses campos**: `PedidoCompra.cs:19,29-37` tem `CotacaoCompraId`,
`MotivoCancelamento`, `AprovadoEm`, `AprovadoPor`, `CanceladoEm`, `CanceladoPor`, `RecebidoEm` — sete
propriedades de domínio que `PedidoCompraMapper.Mapear` não inclui em nenhum dos dois records
(`PedidoCompraResponse`, `ItemPedidoCompraResponse`). `CotacaoCompraId` já está registrado como
Divergência CF-5 por ser o mais relevante ao recorte da `b70` (origem visível); os outros seis
(motivo/quem/quando de cada troca de status) são o mesmo padrão de opacidade que a rodada 11 já
registrou para Pedido de Venda (`AprovadoPor`/`CanceladoPor`/`FaturadoPor`, lá também ausentes do
próprio backend) — aqui é pior, porque nem os timestamps (`AprovadoEm`/`CanceladoEm`/`RecebidoEm`)
saem, e no Pedido de Venda ao menos os timestamps saíam.

#### Pedido de compra — item

Os campos monetários e de origem já foram tabelados nas seções 1 e 7 (money on screen) com destino
declarado em cada linha. Campos de item de Pedido de Compra, tabelados abaixo por serem o ponto de
maior lacuna encontrado:

`ItemPedidoCompraResponse` do frontend (`compras.types.ts:11-20`) declara **8** campos. O backend
(`Pedidos/PedidoCompraResponse.cs:24-37`) entrega **13**.

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido/chave |
| `produtoId` | `Guid` | `.ProdutoId` | sim | exibido (via label) |
| `localEstoqueId` | `Guid` (obrigatório) | `.LocalEstoqueId` (`Guid?`, anulável) | sim, mas anulabilidade diverge | exibido, com fallback defensivo em runtime (`row.localEstoqueId ? ... : '-'`) — ver Divergência CF-6 |
| `quantidade` | `number` | `.Quantidade` | sim | exibido + enviado (criação/edição de item) |
| `valorUnitario` | `number` | `.ValorUnitario` | sim | exibido + enviado |
| `valorDesconto` | `number` | `.ValorDesconto` | sim | exibido + enviado |
| `valorTotal` | `number?` | `.ValorTotal` | sim, não anulável (mais forte que o `?` do frontend) | exibido |
| `observacao` | `string?` | `.Observacao` | sim | exibido (diálogo) + enviado |
| — (ausente do tipo) | — | `.Sequencia` (`int`) | sim | **sem uso** — mesmo padrão já achado em Pedido de Venda (rodada 11): ordena no backend, não é exposto para render de número de linha próprio |
| — (ausente do tipo) | — | `.QuantidadeRecebida` (`decimal`) | sim | **sem uso** — sem indicação de quanto já foi recebido por item, relevante para recebimento parcial (`ParcialmenteRecebido` é status real do pedido) |
| — (ausente do tipo) | — | `.QuantidadePendente` (`decimal`) | sim | **sem uso** — mesmo caso |
| — (ausente do tipo) | — | `.ValorBruto` (`decimal`) | sim | **sem uso** (ver seção 7) |
| — (ausente do tipo) | — | `.Status` (`string`, serializado de enum do item) | sim | **sem uso** — não há como a UI distinguir item pendente/recebido/cancelado dentro do pedido além do que dá para inferir de `quantidade` vs. os dois campos acima, também ausentes |

Conta (item pedido de compra): **8 campos lidos pela UI = 8 com destino declarado (exibido/enviado)
+ 0 divergência de nome + 1 divergência de anulabilidade já contada dentro dos 8** (`localEstoqueId`).
Fecha. Separado: **5 campos entregues pelo backend e ausentes do tipo do frontend**
(`sequencia`, `quantidadeRecebida`, `quantidadePendente`, `valorBruto`, `status`) — é a lacuna mais
relevante para "reversão explícitas": sem `quantidadeRecebida`/`quantidadePendente`/`status` por
item, a tela não tem como mostrar progresso de recebimento parcial nem apontar isso.

## Divergências

**CF-1 — Validação de origem assimétrica entre Contas a Pagar e Contas a Receber (manual).**
`ContaPagarUseCases.cs:87-90` recusa `Origem != Manual` (D7). `ContaReceberValidators.cs` e
`ContaReceberUseCases.cs:83-92` não têm regra equivalente — só checam duplicidade quando
`OrigemId.HasValue`. A UI de Contas a Receber permite escolher `NotaFiscal`, `Contrato` ou
`AjusteAutorizado` no dropdown (`ContaFinanceiraFormDialog.tsx:62`, filtra só `Compra`) sem nenhuma
busca de referência para essas três (`useFinanceiroOriginOptions` só resolve `PedidoVenda`) e
mostra um aviso genérico permitindo enviar mesmo assim (`unsupportedOriginReference`, `:142`). Um
lançamento manual pode nascer marcado com uma origem de sistema sem vínculo real. Direto no alvo da
`b70` ("origem visível" também precisa dizer "origem verdadeira").

**CF-2 — `OrigemFinanceira` do frontend tem 6 valores; o backend tem 8.**
`types/erp.ts:94-101` (`OrdemServico = 7`, `Frota = 8` ausentes) ×
`Erp.Domain/Financeiro/OrigemFinanceira.cs:3-13`. `origemFinanceiraLabel` cai no fallback `'-'`
para qualquer título com essas duas origens. Não confirmado se `OrdemServico`/`Frota` já geram
título em produção hoje (nenhum `grep` desta sessão achou `OrigemFinanceira.OrdemServico` ou
`.Frota` sendo atribuído em nenhum use case de `Erp.Application` — os dois valores existem só no
enum, sem gerador conhecido ainda) — registrado como achado de contrato, não como sintoma
observado.

**CF-3 — `ContaFinanceiraResponse.OrigemModulo`/`OrigemId` (avançado) chegam ao frontend e nunca
são exibidos.** Tipo declara (`financeiroAvancado.types.ts:43-44`), nenhum componente lê
(`ContasAvancadoTab.tsx`, `ContaDialogs.tsx` — zero ocorrências de `origemModulo`). Justamente o
módulo cujo request já suporta `OrigemModulo` livre (`string?`) é o que menos mostra a origem na
tela — o oposto do texto do plano ("Origem do título visível: manual, venda, compra ou nota").

**CF-4 — Não existe nenhum caminho de reversão para um recebimento de compra já registrado.**
Nem endpoint (`grep` zero), nem regra de domínio que permita desfazer via cancelamento do pedido
(`PedidoCompra.Cancelar` recusa depois de `ParcialmenteRecebido`/`Recebido`). O único ponto de
reversão de todo o fluxo é o `EstornarPagamento` da `ContaPagar` gerada — que não desfaz estoque nem
quantidade recebida do item. Acho que este é o achado estrutural mais importante para a rodada
decidir escopo: "reversão explícitas" no título da `b70` pode não ter onde pousar no lado de
Compras hoje, só no lado financeiro puro.

**CF-5 — `PedidoCompra.CotacaoCompraId` existe no domínio e nunca chega ao DTO.**
`PedidoCompra.cs:19,29` grava o vínculo quando o pedido nasce de uma cotação aprovada
(`AprovarCotacaoCompraUseCase.cs:105`), mas `PedidoCompraResponse`/`PedidoCompraMapper`
(Application) não o incluem. O frontend não tem como mostrar "este pedido veio da cotação N" —
não por falta de código de tela, mas porque o dado nunca sai do backend nesse endpoint.

**CF-6 — `AprovarCotacaoCompraRequest.ItensLocalEstoque` existe no backend e a UI nunca o envia;
`ItemPedidoCompraResponse.localEstoqueId` é obrigatório no tipo do frontend, anulável no backend.**
`CotacaoCompraContracts.cs:23-29` × `AprovarCotacaoFormValues`/`AprovarCotacaoDialog`
(nenhum campo). `compras.types.ts:14` (`Guid`) × `Pedidos/PedidoCompraResponse.cs:24` (`Guid?`). A
UI se defende em runtime na exibição (`PedidoCompraDetalhePage.tsx:244`), então não quebra, mas o
tipo declara uma garantia que o backend não dá — mesmo padrão já registrado na rodada 11 para
`TabelaPrecoItemResponse.PrecoMinimo`.

**CF-7 — `ItemPedidoCompraResponse.ValorBruto`, `.Sequencia`, `.QuantidadeRecebida`,
`.QuantidadePendente`, `.Status` chegam do backend e o tipo do frontend não os declara.**
Detalhado na Tabela de campos, seção 3. Sem esses quatro últimos, a UI não tem como mostrar
progresso de recebimento parcial nem status por item — acoplado a CF-4 (sem visibilidade de
progresso, "reversão explícita" fica ainda mais distante).

**CF-8 — Tipo, schema e função de query de Fluxo de Caixa básico seguem declarados e sem
nenhum consumidor.** `financeiro.types.ts:245-257` (`FluxoCaixaResponse`, `FluxoCaixaQuery`),
`financeiroSchemas.ts:114-119` (`fluxoCaixaQuerySchema`), `financeiroApi.ts` sem método
`fluxoCaixa` no objeto exportado — a tela (`FluxoCaixaPage.tsx`) foi substituída por uma mensagem
estática apontando para o Financeiro avançado, mas o código morto do caminho antigo não foi
removido. Não é bug funcional (a tela não quebra, só não usa), mas é peso morto exatamente no tipo
de arquivo (`financeiro.types.ts`) que esta rodada vai reabrir.

**CF-9 — `FINANCEIRO_CAIXA_GERENCIAR`/`FINANCEIRO_BANCO_GERENCIAR` seguem no union e no catálogo
do frontend depois de removidos do catálogo do backend (D3, v1.21.3/G1) por não guardarem nenhum
endpoint.** Mesmo padrão já registrado como V9 na rodada 11 (Vendas, para
`VENDAS_PRECO_MINIMO_SOBRESCREVER`/`POLITICA_COMERCIAL_GERENCIAR`) — a limpeza parece não ter sido
feita de forma consistente entre módulos. `PermissoesCatalogoDefinition.cs:158-161` ×
`types/erp.ts:294-295` × `permissoesCatalogo.ts:93-94`.

**CF-10 — `scripts/backend-contract-map.allowlist.json` (`legacyReferences:28-33`) registra seis
rotas de Financeiro como `DIVERGENTE_PRODUTIVO` que o código atual já não usa.**
`features/financeiro/api/financeiroApi.ts` (lido nesta sessão, seção 2/endpoints) já chama
`.../receber`, `.../estornar-recebimento`, `.../pagar`, `.../estornar-pagamento`,
`/api/financeiro/contas-pagar/{id}`/`contas-receber/{id}` corretos e não tem `GET
/api/financeiro/contas/{id}` nem `GET /api/financeiro/fluxo-caixa` no client básico. O documento de
auditoria não reflete o estado atual do código — não bloqueia gate (é `audit-only-no-suppressions`),
mas quem ler o allowlist como "lista de problemas abertos" vai investigar seis linhas que já foram
corrigidas.

## Pendências

Perguntas que só o backend/produto resolvem, separadas do que já foi lido no contrato:

1. **(produto/backend, é o núcleo de B-4 para a `b70`)** Confirma CF-4: a ausência de qualquer
   reversão de recebimento de compra é intencional (a única forma de corrigir um recebimento errado
   é criar um recebimento complementar/divergência e nunca desfazer o original), ou é lacuna a
   fechar nesta rodada? Sem essa resposta, "reversão explícitas" no título da `b70` não tem onde
   pousar do lado de Compras.
2. **(backend)** `OrigemFinanceira.OrdemServico`/`.Frota` (CF-2) já são atribuídos por algum use
   case fora de `Erp.Application` (ex.: módulo de Ordem de Serviço/Frota, não abertos nesta sessão
   por estarem fora do recorte)? Se sim, o enum do frontend precisa dos dois valores antes de
   qualquer trabalho na coluna Origem.
3. **(produto)** CF-1: a ausência de validação de origem em Contas a Receber é deliberada (aceitar
   lançamento manual "disfarçado" de Contrato/NotaFiscal/AjusteAutorizado é uma capacidade
   desejada, ex. migração de saldo antigo) ou é a mesma falha que a D7 já fechou do lado de Pagar e
   deveria fechar aqui também?
4. **(backend)** CF-5/CF-6: `CotacaoCompraId` e `ItensLocalEstoque` — a intenção é expor os dois no
   próximo contrato de `GET /api/compras/pedidos/{id}` (o dado já existe, é só mapear), ou a origem
   por cotação é deliberadamente invisível no pedido depois de criado?

## Contrato de saída

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "compra-financeiro",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/12-inventario-compra-financeiro.md",
  "contagemDeCampos": {
    "itemPedidoCompra": "8 lidos pela UI = 8 com destino declarado (exibido/enviado, com 1 divergência de anulabilidade computada dentro dos 8) + 0 divergência de nome + 0 sem uso; separadamente 5 campos entregues pelo backend e ausentes do tipo do frontend (sequencia, quantidadeRecebida, quantidadePendente, valorBruto, status) — medido por leitura pareada de Pedidos/PedidoCompraResponse.cs (backend) contra compras.types.ts (frontend)",
    "pedidoCompraCabecalho": "13 lidos pela UI = 13 com destino declarado (exibido e/ou enviado) + 0 divergencia de nome + 0 sem uso. Fecha em 13. Separadamente, 0 campos entregues pelo backend e ausentes do tipo do frontend — o mapper (PedidoCompraMapper.Mapear) projeta exatamente os 13 campos escalares + itens, nem mais nem menos. Medido por leitura pareada campo a campo entre PedidoCompraResponse (Pedidos/PedidoCompraResponse.cs:5-16, backend) e PedidoCompraResponse (compras.types.ts:22-37, frontend), com destino confirmado por grep de cada campo em PedidosCompraPage.tsx, PedidoCompraDetalhePage.tsx, PedidoCompraFormDialog.tsx e comprasUiUtils.ts. CotacaoCompraId (CF-5) e as outras 6 propriedades de auditoria do dominio (MotivoCancelamento, AprovadoEm, AprovadoPor, CanceladoEm, CanceladoPor, RecebidoEm) nao entram nesta contagem porque nunca saem do dominio via este endpoint — nao sao 'entregues e ignorados', sao 'nunca entregues'",
    "origemFinanceira": "enum frontend com 6 valores medido por leitura direta de types/erp.ts:94-101 contra Erp.Domain/Financeiro/OrigemFinanceira.cs:3-13 (8 valores) — 2 ausentes (OrdemServico, Frota), sem uso conhecido em produção (não verificado se algum use case já os atribui)"
  },
  "pendencias": [
    { "tipo": "backend", "pergunta": "A ausência de qualquer endpoint/regra de reversão de recebimento de compra (CF-4) é intencional — recebimento errado só se corrige com um novo recebimento/divergência, nunca desfazendo o original — ou é lacuna a fechar na b70?", "decide": "se 'reversão explícitas' cobre compra ou só o lado financeiro puro (baixa/estorno de título)" },
    { "tipo": "backend", "pergunta": "OrigemFinanceira.OrdemServico (7) e .Frota (8) já são atribuídos por algum use case fora de Erp.Application/Financeiro e Compras (ex. módulos de Ordem de Serviço/Frota, fora do recorte lido nesta sessão)?", "decide": "se o enum do frontend (types/erp.ts) precisa dos dois valores antes de qualquer trabalho na coluna Origem" },
    { "tipo": "funcional", "pergunta": "A ausência de validação de origem em CriarContaReceberUseCase (CF-1, permite Origem=Contrato/NotaFiscal/AjusteAutorizado sem OrigemId real) é capacidade desejada ou é a mesma falha que a D7 já fechou para Contas a Pagar e deveria fechar aqui também?", "decide": "se a b70 estende a validação D7 para Contas a Receber" },
    { "tipo": "backend", "pergunta": "CotacaoCompraId (no domínio de PedidoCompra, nunca no DTO) e ItensLocalEstoque (aceito por AprovarCotacaoCompraRequest, nunca enviado pela UI) entram no próximo contrato de leitura/escrita do Pedido de Compra?", "decide": "se a tela de Pedido de Compra pode mostrar a origem por cotação e permitir local de estoque por item na aprovação" }
  ],
  "riscos": [
    "CF-2 (OrigemFinanceira com 2 valores faltando) não tem confirmação de uso real em produção — pode ser enum morto (nenhum gerador conhecido) ou pode já estar sendo usado por um módulo fora do recorte lido (Ordem de Serviço/Frota). Sem essa confirmação, não dá para afirmar se é urgente.",
    "Seção 7 (money on screen) marca 'não verificado' para RecebimentoCompraResponse/RecebimentoDivergenciaResponse campo a campo — a convergência de nome foi aceita como evidência indireta, não leitura pareada linha a linha como o resto do documento.",
    "Não abri EstornarAsync/CancelarAsync do módulo Financeiro avançado (Erp.Domain/Financeiro/Avancado) nem FluxoCaixaTab.tsx — ambos marcados 'não verificado' na seção 6/7. Se algum arquiteto precisar debater reversão no avançado especificamente, falta essa leitura.",
    "Não abri AppMenu.tsx nesta sessão — a coluna 'onde a permissão é registrada' da seção Telas e rotas assume que o item de menu existe e está correto, sem confirmação; se algum item estiver faltando ou usando permissão errada, não está capturado aqui.",
    "Não medi o comportamento real de Pagamento.Estornar (reestorno de pagamento já estornado) nem os validators completos de FormasPagamento/CondicoesPagamento — fora do foco 'origem e reversão', registrados como não verificado na seção 5/6."
  ]
}
```
