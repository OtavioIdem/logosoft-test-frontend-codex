# Implementação v1.11.0a8b49

## 1. Versão

`v1.11.0a8b49` — `logosoftVersion: 1.11.0a8b49`, `package.json.version: 1.11.0-a.8.b49`.

## 2. Base utilizada

`main` (`392ba42`, com a onda F0 já mesclada — gate de permissões e CI religado), branch
`codex/v1.11.0a8b49-f1-contrato-monetario-financeiro`.

## 3. Objetivo

Onda F1 do plano `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` — itens **F1.1** (contrato
monetário de Contas a Pagar/Receber) e **F1.5** (remover `Origem = Compra` do fluxo manual de
Conta a Pagar). Corrige o **P1** da seção 2 do plano: a tela de dinheiro exibia R$ 0,00 em
toda listagem porque o frontend declarava campos que não existem no wire (`valorTotal`,
`saldo`, `parcela.valor`, `pagamento.parcelaId`) e `formatMoney` faz `value ?? 0` — o campo
ausente não aparecia vazio, aparecia como um zero plausível e errado. Também corrige o item 10
do plano (fixture E2E), sem o qual nenhum teste consegue provar esta entrega.

**Escopo explicitamente fora desta fatia** (por instrução do solicitante, para as próximas
fatias F1.2/F1.3/F1.4): `types/erp.ts`, `features/seguranca/**`,
`lib/security/routePermissions.ts`, `layout/AppMenu.tsx` (permissões — b51/b52) e `formatMoney`
em si (continua com `?? 0` nesta versão — vira erro visível em dev/`—` em produção na b50; o
que muda aqui é que os campos monetários passam a existir de verdade). `features/financeiro-avancado/**`
também não foi tocado — tem DTO próprio, fora da F1.

## 4. Arquivos adicionados

- `docs/IMPLEMENTACAO_V1_11_0A8B49.md` — este arquivo.

## 5. Arquivos alterados

- `features/financeiro/types/financeiro.types.ts` — `ParcelaReceberResponse`/`ParcelaPagarResponse`
  passam a `{ id, numero, vencimento, valorOriginal, valorPago, valorJuros, valorMulta,
  valorDesconto, valorSaldo, status? }`; `RecebimentoResponse.parcelaId` → `parcelaReceberId`;
  `PagamentoResponse.parcelaId` → `parcelaPagarId`; `ContaReceberResponse`/`ContaPagarResponse`
  trocam `valorTotal`/`saldo`/`status`+`statusConta` por `valorOriginal`/`valorJuros`/
  `valorMulta`/`valorDesconto`/`valorSaldo`/`status` (campo único), com
  `ContaReceberResponse.valorRecebido` e `ContaPagarResponse.valorPago` — ver seção 10 sobre a
  correção ao texto do plano. `ParcelaFinanceiraRequest`, `ReceberContaRequest.parcelaId` e
  `PagarContaRequest.parcelaId` **não foram tocados** — o rename de `parcelaId` vale só para
  os records de response, o contrato do endpoint `POST /contas-pagar/{id}/pagar` continua
  declarando `parcelaId` no request.
- `features/financeiro/components/financeiroUiUtils.ts` — `countOpenFinancialRecords` lê
  `{ valorSaldo }` em vez de `{ saldo }`. `origemFinanceiraOptions` intacto (alimenta o
  dropdown de criação e o `origemFinanceiraLabel` da coluna "Origem" — remover `Compra` ali
  quebraria a coluna para toda conta derivada de compra pelo backend).
- `features/financeiro/components/ContasFinanceirasPage.tsx` — cards "Valor total
  listado"/"Saldo em aberto" e colunas "Total"/"Saldo" leem `valorOriginal`/`valorSaldo`;
  `displayStatus` lê só `record.status`.
- `features/financeiro/hooks/useFinanceiroResources.ts` — novos `contaReceberQueryKey(id)`/
  `contaPagarQueryKey(id)` e `useContaReceberDetalhe(id, enabled)`/`useContaPagarDetalhe(id,
  enabled)` (`enabled: Boolean(id) && enabled`, mesmo padrão de `pedidoVendaQueryKey`/
  `usePedidoVenda` em `useVendasResources.ts`). As mutations `receberMutation`,
  `pagarMutation`, `estornarRecebimentoMutation`, `estornarPagamentoMutation`,
  `cancelarReceberMutation`, `cancelarPagarMutation` passam a invalidar o detalhe da conta
  afetada além da lista.
- `features/financeiro/components/FinanceiroActionDialogs.tsx` — `BaixaFinanceiraDialog`
  consome `useContaReceberDetalhe`/`useContaPagarDetalhe(conta?.id, visible && type === X)` em
  vez do registro selecionado da lista. Estados: **loading** do detalhe (dropdown de parcela e
  confirmar desabilitados; `valor` nasce `null`, não `0` — sem placeholder monetário);
  **erro** do detalhe (`Message severity="error"` "Não foi possível carregar as parcelas desta
  conta.", confirmar bloqueado, sem cair para o registro da lista); **sem parcela** (mensagem
  existente preservada, confirmar bloqueado); **sucesso** (lista e detalhe invalidados pela
  mutation). Novo `FieldError` "Informe um valor maior que zero." quando `valor` é preenchido
  e não é positivo — validação só de UX; o teto contra o saldo da parcela é regra de domínio
  do backend, via 400 mapeado por `mapApiError` (deliberadamente fora desta fatia).
- `features/dashboard/api/dashboardApi.ts` — `ContaFinanceiraResumo` (consumidor **não listado
  no plano**, com o mesmo defeito do P1) passa a `{ valorSaldo?, valorOriginal?, status? }`; os
  cards "Contas a receber/pagar em aberto" somam `conta.valorSaldo` filtrando por
  `isOpenFinancialStatus(conta.status)`.
- `features/bancos/components/BancosOperacoesDialogs.tsx` — dropdown de parcela do diálogo de
  boleto (outro consumidor **não listado no plano**) lê `parcela.valorSaldo` em vez de
  `parcela.valor`.
- `features/financeiro/components/ContaFinanceiraFormDialog.tsx` (F1.5) — para `type ===
  'pagar'`, `financialOriginOptions` oferece só `Manual` (decisão do usuário: Manual-only, não
  as demais origens não derivadas pelo backend); o dropdown de Origem fica desabilitado com o
  texto de apoio "A origem de uma conta a pagar é derivada pelo backend a partir do documento
  que a gerou. O lançamento manual nasce com origem Manual." `needsOriginReference`/
  `unsupportedOriginReference` deixam de considerar `OrigemFinanceira.Compra` — como nenhum
  dos dois tipos (`receber`/`pagar`) oferece mais essa origem no dropdown, o `EntitySelect` de
  documento de origem e o `Message` que prometia um envio recusado pelo backend nunca mais
  renderizam para ela. Contas a Receber **não muda**: `Origem = Pedido de venda` continua
  válida, com `EntitySelect` — o guard do backend não existe lá.
- `features/financeiro/hooks/useFinanceiroOriginOptions.ts` (F1.5) — removido o ramo
  `OrigemFinanceira.Compra` (query morta a `/api/compras/pedidos`, que o backend já recusava).
- `tests/e2e/fixtures/logosoft.ts` (item 10 do plano) — `contasReceber`/`contasPagar`
  reescritas no formato real de `ContaReceberResponse`/`ContaPagarResponse`
  (`valorOriginal`/`valorRecebido`|`valorPago`/`valorJuros`/`valorMulta`/`valorDesconto`/
  `valorSaldo`/`status`, com `parcelas[].valorSaldo` preenchido); saldo verificável de
  `R$ 251,00` em Contas a Receber, a partir do pedido de venda de 251 já existente na fixture,
  e `R$ 800,00` em Contas a Pagar. Adicionado roteamento por id
  (`GET /api/financeiro/contas-{receber,pagar}/{id}`) antes do `.includes()` genérico da
  lista, necessário para o novo hook de detalhe do diálogo de baixa não receber o array da
  listagem no lugar do objeto único.
- `package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`,
  `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
  `scripts/backend-permissions.allowlist.json` (só o campo `version` — `teto` continua
  `{fantasmas: 3, coberturaPendente: 36}`), `tests/evidence/integrated-e2e.assisted-evidence.example.json`
  — bump de versão.
- `README.md`, `CHANGELOG.md` — nova entrada de topo.
- `docs/CI_GATES_FRONTEND.md` — título atualizado.

## 6. Arquivos preservados (intocados por desenho)

- `types/erp.ts`, `features/seguranca/**`, `lib/security/routePermissions.ts`,
  `layout/AppMenu.tsx` — permissões são b51/b52, fora desta fatia.
- `features/financeiro/components/financeiroUiUtils.ts::formatMoney` — continua `value ?? 0`
  nesta versão; é a b50.
- `features/financeiro-avancado/**` — DTO próprio, fora da F1.
- `tests/unit/financeiroPayload.test.ts` — confirmado verde sem edição; o request de
  `POST /contas-pagar/{id}/pagar` continua `parcelaId`, não `parcelaPagarId`.
- `tests/unit/financeiroB42Structure.test.ts` — confirmado verde sem edição.
- `tests/unit/ciWorkflowYaml.test.ts:85,97` — fixtures YAML negativas inline; o número ali é
  literal de teste, não bump de versão real.
- Nenhuma rota nova; `scripts/backend-contract-map.allowlist.json` não ganhou nenhuma entrada
  em `legacyReferences`/`documentedDivergences` além do bump de `version`.

## 7. O que não foi alterado

Nenhuma regra fiscal, nenhum payload sensível, nenhuma permissão nova, nenhum contrato de
request (`ParcelaFinanceiraRequest`, `ReceberContaRequest`, `PagarContaRequest`). Nenhum teste
foi escrito nesta entrega — `tests/unit/financeiroContratoMonetario.test.ts` e
`tests/components/BaixaFinanceiraDialog.test.tsx` ficam para o engenheiro-testes (ver seção 9).

## 8. Validações executadas

```bash
npm run validate:source     # verde
npm run typecheck           # verde
npm run lint                # verde
npx vitest run tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts
                             # verde, 10 testes, sem edição nos arquivos de teste
npx playwright test tests/e2e/financeiro-estoque.spec.ts
                             # verde, 2 testes (roda contra a fixture corrigida)
```

**Prova visual** (item exigido pelo solicitante — sem ela a entrega não está provada): a porta
3000 padrão do Playwright/`preview_start` estava ocupada por um container Docker preexistente
servindo um build antigo (`v1.11.0a8b47.c3`, visível no rodapé) — não iniciado nem tocado por
esta entrega, apenas detectado. A verificação visual real rodou um `next dev` isolado na porta
3417 e um script Playwright temporário (criado, executado e apagado antes de encerrar; nunca
commitado) reaproveitando `mockApiRoutes`/`writeSession` de `tests/e2e/fixtures/logosoft.ts`:

- `/financeiro/contas-receber`: cards "Valor total listado" e "Saldo em aberto" mostram
  `R$ 251,00` (antes: `R$ 0,00` contra o build antigo); coluna "Saldo" da linha `CR-PV-001`
  mostra `R$ 251,00`.
- Diálogo "Baixar conta a receber": dropdown de parcela mostra "Parcela 1 — R$ 251,00", campo
  Valor nasce preenchido com `R$ 251,00` e a referência "Saldo da parcela: R$ 251,00" aparece
  abaixo do campo.
- `/financeiro/contas-pagar`: mesma prova, com `R$ 800,00`.
- `/dashboard`: cards "Contas a receber em aberto" e "Contas a pagar em aberto" mostram
  `R$ 251,00`/`R$ 800,00`.
- `/financeiro/contas-pagar` → "Nova conta": dropdown de Origem trava em "Manual", desabilitado,
  com o texto de apoio esperado; nenhum `EntitySelect` de documento de origem nem `Message` de
  origem não suportada renderiza.
- Console do navegador sem erro (só um 404 de fonte `Inter-roman.var.woff2`, pré-existente e
  sem relação com esta entrega).

`test-results/` gerado durante a verificação foi apagado; o servidor `next dev` auxiliar
(porta 3417) foi encerrado ao final.

## 9. Validações pendentes por ambiente

- `tests/unit/financeiroContratoMonetario.test.ts` e `tests/components/BaixaFinanceiraDialog.test.tsx`
  — não existem ainda; são do engenheiro-testes, por instrução explícita do solicitante.
- `npm run validate:ci` — não executado nesta sessão por restrição de tempo; `validate:source`
  (que o inclui) rodou verde.
- `npm run test:e2e:integrated:backend`, `prepare:e2e:integrated:seed`,
  `report:e2e:integrated:assisted`, Docker — não executados por instrução explícita do
  solicitante.
- Suíte E2E completa (`npm run test:e2e`) — não executada; só a spec do escopo
  (`financeiro-estoque.spec.ts`) rodou, por instrução de "nunca a suíte inteira".

## 10. Riscos e observações

- **O contrato não expande os records de parcela e pagamento.** `CONTRATO-API-v1.23.md` lista
  `IReadOnlyList<ParcelaPagarResponse>`/`IReadOnlyList<PagamentoResponse>` como tipo de campo,
  mas nunca expande esses records em um bloco `csharp` próprio. Os nomes de campo de
  `ParcelaReceberResponse`/`ParcelaPagarResponse` (`valorOriginal`, `valorPago`, `valorJuros`,
  `valorMulta`, `valorDesconto`, `valorSaldo`) vêm da prosa do plano (§2), não de uma
  declaração literal do contrato. `parcelaReceberId` em `RecebimentoResponse` é inferência por
  simetria com `parcelaPagarId` (esse sim, citado literalmente no plano) — não há confirmação
  literal no contrato.
- **Correção ao texto do plano: `ContaReceberResponse` não usa `valorPago`.** O plano (§2 e a
  tabela do item F1.1) fala genericamente em renomear para "`valorPago`" nas duas entidades.
  O contrato real (`CONTRATO-API-v1.23.md:3268-3450`, conferido nos 4 endpoints de
  `ContasPagar` e nos 5 de `ContasReceber` que devolvem o record — todos consistentes) declara
  `ContaPagarResponse.ValorPago` mas `ContaReceberResponse.ValorRecebido`. O tipo implementado
  segue o contrato medido, não a prosa do plano; ambos os nomes convivem sem ambiguidade
  porque nenhum consumidor desta fatia lê esse campo por nome genérico (a listagem lê
  `valorOriginal`/`valorSaldo`, que são iguais nas duas entidades).
- **Não é possível saber, a partir desta fatia, se a criação manual de parcela também
  mudou.** `ParcelaFinanceiraRequest` (o formulário de criação de conta) não foi tocado — o
  plano não pede e o contrato do request (`ContaReceberRequest`/`ContaPagarRequest`,
  linhas 153-157/178/207) continua declarando `valor` sem prefixo. Se o backend também tiver
  renomeado esse campo do lado do request, é um defeito novo e distinto de P1 (que é só de
  response), fora do escopo desta entrega.
- **Servidor Docker preexistente na porta 3000.** Encontrado já em execução (não relacionado a
  esta sessão, provavelmente resíduo de outra tarefa), servindo um build antigo do frontend.
  Não foi iniciado, parado ou reconstruído por esta entrega — apenas contornado com uma porta
  alternativa para a verificação visual, por instrução explícita de não usar Docker nesta
  tarefa.

## 11. Comandos para aplicar no repositório principal

```bash
git checkout codex/v1.11.0a8b49-f1-contrato-monetario-financeiro
npm install
npm run validate:source
npm run typecheck
npm run lint
npx vitest run tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts
npx playwright test tests/e2e/financeiro-estoque.spec.ts
```
