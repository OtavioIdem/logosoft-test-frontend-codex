# Inventário: Faturamento completo e corrigível (rodada de arquitetura 13, recorte `b71`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b71-faturamento`, sobre a `b70`.

**Árvore medida:** o frontend foi lido no **HEAD `9713de4`**. Todas as citações `arquivo:linha` do
frontend valem para esse commit (`git show HEAD:<arquivo>`), e não para a árvore de trabalho, que
mudou durante esta sessão (ver §0). O backend foi lido em `../New project 3/src`, branch
`fix/v1.23.3-g3-crt-com-semantica-de-manutencao`, HEAD `ab5d00a`, árvore limpa (`git status` vazio).

**Fontes vivas:** usei o banco dev (`docker exec logosoft-postgres psql`, só leitura). Não houve
chamada HTTP autenticada, porque não há credencial. Onde só a resposta real responderia, a linha
diz **não verificado**. "Confirmado no backend" quer dizer lido no C# (controller, record,
validator, use case), e não observado em execução.

---

## 0. Aviso: o recorte mudou durante a medição

Isto é fato medido, e não opinião sobre o que fazer:

| Quando (mtime, 2026-09-29) | O quê | Como medi |
| --- | --- | --- |
| 14:11 | Uma versão anterior **deste arquivo**, escrita por outro processo (129 linhas). Ela não estava no `git status` do início da sessão. Cópia integral: scratchpad da sessão, `13-inventario-faturamento.anterior-14h11.md`. Este arquivo a substitui. | `stat`, `git status --short` |
| 14:17 | `docs/fatias/v1.11.0a8b59-naturezas-operacao-cfop.md` (não rastreado), com `noCorrente: planner` | idem |
| 14:44 | `docs/arquitetura/DECISOES.md` ganha a **D91**, que se declara da "Rodada: `13-faturamento`" e fixa o desenho da `b71`: seletor de natureza ativa, CFOP por catálogo enviando o código, confirmar indisponível sem catálogo e `accessRisk: AUTO_BLOQUEIO` | `git diff docs/arquitetura/DECISOES.md` |
| 14:44–15:04 | Arquivos alterados: `docs/fatias/v1.11.0a8b71-faturamento.md` (novo), `features/faturamento/{types,schemas,components/FaturamentoDialogs,components/FaturamentoDetalhePage}` (M), `features/fiscal/{api,hooks,schemas,types}/naturezasOperacaoConsulta*` (novos), `tests/unit/faturamento{Payload,Structure}.test.ts` (M), `tests/components/ConfirmarFaturamentoDialog.test.tsx` (novo), `tests/mocks/faturamento/` (novo) | `git status --short`, `stat` |

Não tratei a D91 nem esse código novo como insumo. Eles chegaram por mudança de arquivo, e não
pelo briefing. O inventário descreve o **que está em produção no HEAD**, que é o estado sobre o qual a
rodada foi convocada. O status final é `needs_decision` por esse motivo (ver bloco JSON).

---

## 1. Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/faturamento` | `app/(main)/faturamento/page.tsx` | `FaturamentoPage.tsx` + `PrepararFaturamentoDialog` | tela: `FATURAMENTO_CONSULTAR` (`FaturamentoPage.tsx:49-50`); Preparar: `FATURAMENTO_PREPARAR` (`:72`) | rota `routePermissions.ts:59` (`anyOf` CONSULTAR, PREPARAR, CONFIRMAR, CANCELAR); menu `AppMenu.tsx:153-157` (pai: os mesmos 4; filho: CONSULTAR ou PREPARAR); union `types/erp.ts:331-335`; catálogo `permissoesCatalogo.ts:140-144`; backend `FaturamentosController.cs:22,58` |
| `/faturamento/[id]` | `app/(main)/faturamento/[id]/page.tsx` | `FaturamentoDetalhePage.tsx` + `ConfirmarFaturamentoDialog`, `ReasonDialog` (cancelar), `RetomarReversaoDialog` | tela: `FATURAMENTO_CONSULTAR` (`:49-50`); Confirmar: `FATURAMENTO_CONFIRMAR` (`:97`); Cancelar: `FATURAMENTO_CANCELAR` (`:114`); Retomar: `FATURAMENTO_RETOMAR_REVERSAO` (`:173`) | mesmos registros; backend `FaturamentosController.cs:31,67,86,100`, mais a checagem interna de `FATURAMENTO_REVERTER_INTEGRACAO` em `CancelarFaturamentoUseCase.cs:144-146` |
| `/vendas/pedidos/[id]` (ação Faturar, herança da D80) | `app/(main)/vendas/pedidos/[id]/page.tsx` | `PedidoVendaDetalhePage.tsx:232` + `FaturarPedidoVendaDialog` (`PedidoVendaActionDialogs.tsx:84-105`) | `VENDAS_FATURAR` | `types/erp.ts:282`; `permissoesCatalogo.ts:77`; backend `PedidosVendaController.cs:112-113` |
| `/vendas/pedidos/[id]` (ação Gerar NF, caminho paralelo) | idem | `PedidoVendaDetalhePage.tsx:233` + `GerarNotaFiscalPedidoVendaDialog` (`features/fiscal/components/FiscalActionDialogs.tsx`) | `FISCAL_EMITIR` | backend `NotasFiscaisController.cs:77-78` |

Não há rota própria de natureza de operação no HEAD (`grep -rn naturez app/ lib/security layout/` → só `contabil`).

## 2. Endpoints consumidos

Os oito de `api/faturamento` constam de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1278-1297` (§9,
com o adendo D22 para `retomar-reversao`). Nenhum aparece em
`scripts/backend-contract-map.allowlist.json` (`grep -i faturament` → 0). Não rodei
`npm run validate:backend-contract-map`: **não verificado** por gate, só por leitura.

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/faturamento` | `faturamentoApi.ts:35-40` | não se aplica | §9 `:1284` | sim, `FaturamentosController.cs:21-28`. Resposta `PagedResult<FaturamentoResponse>` sem envelope (`FaturamentoConsultaUseCases.cs:64`). **Exige `EmpresaId`**: `ListarFaturamentosRequest.EmpresaId` é `Guid` não anulável (`FaturamentoContracts.cs:144`), e `OrganizationalContextGuard.cs:14-19` devolve 400 `Faturamento.EmpresaObrigatoria` com `Guid.Empty` (FT-9) |
| `GET /api/faturamento/{id}` | `:41-46` | não se aplica | §9 `:1285` | sim, `:30-37`; carrega legs (`FaturamentoConsultaUseCases.cs:27-28`) |
| `GET /api/faturamento/{id}/historico` | `:47-52` | não se aplica | §9 | sim, `:39-46` |
| `GET /api/faturamento/{id}/ocorrencias` | `:53-58` | não se aplica | §9 | sim, `:48-55` |
| `POST /api/faturamento/preparar` | `:59-65` | `prepararFaturamentoSchema` (`faturamentoSchemas.ts:17-20`) | §9 | sim, `:57-64` (201) |
| `POST /api/faturamento/{id}/confirmar` | `:66-72` | `confirmarFaturamentoSchema` (`:22-32`) | §9; `CONTRATO-API-v1.23.md:5695-5722` | sim, `:66-73`. **O schema cobre 9 dos 12 campos do record** (§3.6) |
| `POST /api/faturamento/{id}/cancelar` | `:73-79` | `cancelarFaturamentoSchema` (`:34`) | §9 | sim, `:85-92` |
| `POST /api/faturamento/{id}/retomar-reversao` | `:80-86` | `retomarReversaoLegSchema` (`:37-43`, `.strict()`) | §9 (adendo D22); `CONTRATO-API-v1.23.md:5771` ainda diz "❌ não consome" (desatualizado, FT-19) | sim, `:99-106` |
| `POST /api/vendas/pedidos/{id}/faturar` | `features/vendas/api/vendasApi.ts:116-121` | `faturarPedidoVendaSchema` (`vendasSchemas.ts:51-55`) | §9 `:2119` | sim, `PedidosVendaController.cs:112-116` |
| `GET /api/vendas/pedidos` (combo do Preparar) | `vendasApi.ts:49-54` | não se aplica | §9 | sim; corta em 200 (`VendasRepository.cs:40`) |
| `GET /api/financeiro/condicoes-pagamento` (combo do Confirmar) | via `useCondicoesPagamentoOptions` | não se aplica | §9 | sim, `CondicoesPagamentoController.cs:19-20`, `FINANCEIRO_CONSULTAR` |

Catálogos que o recorte cita e a feature **não consome no HEAD**: ver §6.

## 3. Campos, com a conta que fecha

**Como medi, para todas as tabelas:** li o record C# e o tipo TypeScript lado a lado, nome a nome e
anulabilidade a anulabilidade. O destino vem de `grep` por `<objeto>.<campo>` e `row.<campo>` nos
componentes do HEAD, com leitura das linhas encontradas.

**Fórmula:** declarados pelo frontend = entregues com destino + divergência (lido e não entregue) +
sem uso.

**Convenção herdada do inventário 12:** um `id` usado só como chave de linha ou navegação conta como
`exibido`.

### 3.1 `FaturamentoResponse` (`faturamento.types.ts:62-83` × `FaturamentoContracts.cs:32-50`)

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | exibido (navegação `FaturamentoPage.tsx:86`; `router.push` do Preparar `:62`; `entidadeId` do `AnexosPanel`, `FaturamentoDetalhePage.tsx:208`) |
| `empresaId` | `Guid` | `.EmpresaId` | sim | enviado (`AnexosPanel` `:208`; escopo de `useCondicoesPagamentoOptions` via `ConfirmarFaturamentoDialog`, `:210`) |
| `filialId` | `Guid?` | `.FilialId` | sim | enviado (`AnexosPanel`, `:208`) |
| `pedidoVendaId` | `Guid` | `.PedidoVendaId` | sim | exibido **como GUID cru** (lista `FaturamentoPage.tsx:82`, detalhe `:132`), ver FT-15 |
| `notaFiscalId` | `Guid?` | `.NotaFiscalId` | sim | exibido (botão "Abrir nota fiscal" → `/fiscal/notas/{id}`, `:133`) |
| `contaReceberId` | `Guid?` | `.ContaReceberId` | sim | exibido **como GUID cru** (`:134`), ver FT-15 |
| `etapa` | `StatusFaturamento \| number` | `.Etapa` (JSON numérico: não há `JsonStringEnumConverter` em `src`, medido por `grep`) | sim | exibido (`FaturamentoPage.tsx:85`, detalhe `:129`) e usado nas regras `podeConfirmar`/`podeCancelar` (`faturamentoLabels.ts:83-84`, detalhe `:91,96,114`) |
| `valorTotal` | `number` | `.ValorTotal` | sim | exibido (`FaturamentoPage.tsx:83`, detalhe `:130`) |
| `confirmadoEm` | `IsoDateTime?` | `.ConfirmadoEm` | sim | exibido (`:84`, detalhe `:131`) |
| `confirmadoPor` | `Guid?` | `.ConfirmadoPor` | sim | sem uso (D30 item 2) |
| `canceladoEm` | `IsoDateTime?` | `.CanceladoEm` | sim | sem uso (D30 item 2) |
| `canceladoPor` | `Guid?` | `.CanceladoPor` | sim | sem uso (D30 item 2) |
| `motivoCancelamento` | `string?` | `.MotivoCancelamento` | sim | exibido (`:135`) |
| `legs` | `FaturamentoLegResponse[]?` | `.Legs` | sim, só no detalhe; a listagem devolve vazio (`FaturamentoConsultaUseCases.cs:56-63`, D26) | exibido (`montarLinhasDeLegs`, detalhe `:44,154-189`) |
| `possuiLegComFalha` | `boolean?` | `.PossuiLegComFalha` | sim | sem uso (D30 item 3) |
| `possuiLegRevertido` | `boolean?` | `.PossuiLegRevertido` | sim | sem uso (D30 item 3) |
| `etapaDivergeDosLegs` | `boolean?` | `.EtapaDivergeDosLegs` | sim | exibido (alerta, `:139-145`) |
| `possuiLegEmReversao` | `boolean?` | `.PossuiLegEmReversao` | sim | exibido (alerta `:146-152`) e usado para desabilitar Confirmar (`faturamentoLabels.ts:173`, detalhe `:99-107`, D23) |

Conta: **18 declarados = 13 com destino + 0 divergências + 5 sem uso**. Fecha. O record C# tem os
mesmos 18, e nada fica de fora do tipo. A anulabilidade bate: os booleanos são opcionais no TS e
têm default `false` no C#, e o TS é mais fraco sem mentir.

### 3.2 `FaturamentoLegResponse` (`faturamento.types.ts:53-60` × `FaturamentoContracts.cs:56-62`)

| Campo | Tipo | O backend entrega? | Destino |
| --- | --- | --- | --- |
| `id` | `Guid` | sim | exibido (chave da linha extra, `faturamentoLabels.ts:163`) |
| `leg` | enum 1–6 | sim (enum igual, `FaturamentoLegIntegracao.cs:12-20`) | exibido (`legFaturamentoLabel`, detalhe `:156`) |
| `estado` | enum 1–4 | sim (`:31-`, `EmReversao=4`) | exibido (`:157-166`) e usado para o botão Retomar (`:172`) |
| `ocorreuEm` | `IsoDateTime` | sim | exibido (`:167`) |
| `responsavelId` | `Guid?` | sim | sem uso (D30 item 4) |
| `motivo` | `string?` | sim | exibido (`:168`) |

Conta: **6 = 5 + 0 + 1**. Fecha.

### 3.3 `FaturamentoHistoricoResponse` (`:85-92` × `FaturamentoContracts.cs:64-70`)

`id` exibido (dataKey `:200`), `statusAnterior` exibido (`:201`), `statusNovo` exibido (`:202`),
`observacao` exibido (`:203`), `usuarioId` sem uso (D30), `data` exibido (`:204`). Todos entregues.
Conta: **6 = 5 + 0 + 1**. Fecha.

### 3.4 `FaturamentoOcorrenciaResponse` (`:94-99` × `FaturamentoContracts.cs:72-76`)

`id` (dataKey `:192`), `tipo` (`:193`), `mensagem` (`:194`), `data` (`:195`): os quatro são exibidos
e entregues. Conta: **4 = 4 + 0 + 0**. Fecha.

### 3.5 Envelopes de resposta

| Record | Campos declarados no TS | Entregues | Com destino | Sem uso | Onde |
| --- | --- | --- | --- | --- | --- |
| `FaturamentoPaginado` × `PagedResult<T>` (`Erp.Shared/Kernel/PagedResult.cs:3-11`; as 3 propriedades calculadas também serializam) | 7: `items`, `page`, `pageSize`, `totalItems`, `totalPages`, `hasPreviousPage`, `hasNextPage` | 7 | 2 (`items` `FaturamentoPage.tsx:46`, `totalItems` `:47`) | 5 (a paginação usa `first`/`rows` locais) | **7 = 2 + 0 + 5**. Há também o ramo morto `normalizePaged` para array (`faturamentoApi.ts:29-32`): o backend nunca devolve array |
| `PrepararFaturamentoResponse` (`:111-115` × `FaturamentoContracts.cs:82-85`) | 3 | 3 | 3 (`faturamento.id` `:62`, `jaExistia` `:60`, `alertas` `:61`) | 0 | **3 = 3 + 0 + 0** |
| `ConfirmarFaturamentoResponse` (`:117-120` × `:101-103`) | 2 | 2 | 1 (`alertas`, detalhe `:58`) | 1 (`faturamento`: a tela ignora e reconsulta) | **2 = 1 + 0 + 1**. Ver FT-3: a etapa devolvida aqui é a única prova, na própria resposta, de que a confirmação "bem-sucedida" terminou em `Erro` |
| Resposta de `cancelar` / `retomar-reversao` (`FaturamentoResponse`) | tipada, não lida | entregue | 0 | a resposta inteira | a tela depende de `onSettled` (D27) |

### 3.6 Requests: o que a UI envia × o que o backend aceita

**`ConfirmarFaturamentoRequest`** (`FaturamentoContracts.cs:87-99`, validator
`FaturamentoValidators.cs:15-29`) × `ConfirmarFaturamentoFormValues`
(`faturamento.types.ts:133-143`) e `confirmarFaturamentoSchema` (`faturamentoSchemas.ts:22-32`).
Medi o frontend com **9 campos**. A versão anterior deste arquivo dizia 10. Contei de novo:
`ufAutorizadora`, `tipoDocumento`, `serie`, `numero`, `cfopPadrao`, `unidadeComercialPadrao`,
`validarDadosFiscaisProduto`, `condicaoPagamentoId`, `primeiraDataVencimentoContaReceber`.

| Campo do record | Tipo/regra no backend | No frontend (HEAD) | Destino declarado | O que o backend faz com ele |
| --- | --- | --- | --- | --- |
| `UfAutorizadora` | `string`, `NotEmpty().Length(2)` (`:19`); a transmissão ainda exige `^[A-Za-z]{2}$` (`NotaFiscalValidators.cs:228-232`) | `InputText maxLength=2` com uppercase (`FaturamentoDialogs.tsx:105`); o schema só pede `min(1)` (`:23`) | enviado | vai para `TransmitirNotaFiscalSefazRequest` (`ConfirmarFaturamentoUseCase.cs:198-199`); o SOAP procura endpoint configurado com essa UF (`SefazSoapClient.cs:82-87`) |
| `TipoDocumento` | enum; o validator **só aceita NFe ou NFCe** (`:20-21`) | `z.nativeEnum` (6 valores) + dropdown com 6 opções (`faturamentoLabels.ts:53-60`) | enviado | FT-4 |
| `Serie` | `NotEmpty().MaximumLength(20)` (`:22`) | `InputText` livre (`:114`), `min(1)` sem máximo | enviado | nota gerada no leg 1 |
| `Numero` | `NotEmpty().MaximumLength(40)` (`:23`) | `InputText` livre (`:119`), `min(1)` sem máximo | enviado | idem; duplicado → `NotaNumeroJaCadastrado` (`GerarNotaFiscalPedidoVendaUseCase.cs:99-106`) |
| `NaturezaOperacaoId` | `Guid?` (`:92`) | **ausente** do tipo, do schema e do diálogo | sem uso (lacuna de request) | com `ValidarDadosFiscaisProduto=true` e natureza nula, **400** `Fiscal.CfopNaturezaOperacaoNaoInformada` no leg 1 (`GerarNotaFiscalPedidoVendaUseCase.cs:165-168`). Ver §4 e FT-2 |
| `CfopPadrao` | `string?`, `MaximumLength(20)` (`:25`) | `InputText` livre (`:124`), `nullableText` | enviado | **só confere** o CFOP derivado; divergente → `CfopDivergenteDoDerivado` (`CfopDoItemResolver.cs:162-184`). **Sem natureza, é ignorado** (`GerarNotaFiscalPedidoVendaUseCase.cs:208`, `possuiContextoCfop=false`) |
| `UnidadeComercialPadrao` | `NotEmpty().MaximumLength(20)` (`:24`) | `InputText` livre (`:128`), `min(1)` | enviado | só serve de fallback quando o produto não tem unidade resolvível; o normal é usar a sigla da unidade do produto (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`) |
| `ValidarDadosFiscaisProduto` | `bool` | checkbox, **padrão `true`** (`FaturamentoDialogs.tsx:79,141`) | enviado | liga o bloqueio sem natureza (acima) e os bloqueios de CFOP por item (`:225-228`) |
| `CertificateThumbprint` | `string?`, `MaximumLength(200)` (`:26`) | ausente | sem uso | repassado à assinatura (`ConfirmarFaturamentoUseCase.cs:172`); nulo usa o certificado do servidor. Ver §7 |
| `CondicaoPagamentoId` | `Guid?` | `EntitySelect` (`:133`) | enviado | leg 6 (`:314-319`) |
| `PrimeiraDataVencimentoContaReceber` | `DateTimeOffset` (não anulável) | `DateInput`, obrigatório no schema (`requiredDate`, `faturamentoSchemas.ts:15`) | enviado | leg 6 |
| `CorrelationId` | `string?`, `MaximumLength(100)` (`:27`) | ausente | sem uso | repassado aos legs 4, 5 e 6 (`ConfirmarFaturamentoUseCase.cs:204,252,319`). **A transmissão o exige `NotEmpty`** (`NotaFiscalValidators.cs:236-238`). Ver §5 e FT-1 |

Conta do request: **12 no backend = 9 enviados + 3 não enviados** (`naturezaOperacaoId`,
`certificateThumbprint`, `correlationId`). O frontend não envia nenhum nome que o record ignore.
Pelo critério D71 (o frontend lê um nome que o backend não serializa), não há divergência de nome.
A lacuna é de campo não enviado.

**Demais requests (medidos campo a campo):**

| Request | Backend | Frontend | Bate? |
| --- | --- | --- | --- |
| `PrepararFaturamentoRequest(PedidoVendaId, Observacao)` (`:78-80`) | `Observacao` ≤ 500 (`FaturamentoValidators.cs:11`) | `prepararFaturamentoSchema` (`:17-20`), observação sem máximo | nomes batem (2 = 2); limite de 500 ausente no cliente (FT-5) |
| `CancelarFaturamentoRequest(Motivo)` | `NotEmpty().MaximumLength(300)` (`:35`) | `.max(300)` (`faturamentoSchemas.ts:34`, D30) | sim |
| `RetomarReversaoLegRequest(Leg, Acao, Motivo)` (`:137-140`) | enums `IsInEnum`; motivo ≤ 500 (`:48-50`) | `.strict()`, max 500 (`:37-43`) | sim (3 = 3) |
| `ListarFaturamentosRequest` (`:142-150`) | `EmpresaId` obrigatório de fato; `PageSize` com clamp 1–100 (`FaturamentoRepository.cs:30`) | `empresaId` opcional; `pedidoVendaId` declarado e nunca preenchido pela UI | FT-9 |
| `FaturarPedidoVendaRequest(bool BaixarEstoque, string? Documento, string? Observacao)` (`PedidoVendaRequests.cs:41`) | `Documento` ≤ 80, `Observacao` ≤ 300, **nenhum `NotEmpty`** (`PedidoVendaValidators.cs:73-79`) | `documento: min(1)` (`vendasSchemas.ts:53`), rótulo "Documento *" (`PedidoVendaActionDialogs.tsx:100`), sem máximo; observação sem máximo | **V11 confirmado** (FT-13) |

---

## 4. `naturezaOperacaoId`

- **Onde o request recebe:** `ConfirmarFaturamentoRequest.NaturezaOperacaoId`, `Guid?`
  (`FaturamentoContracts.cs:92`). Vai sem transformação para `GerarNotaFiscalPedidoVendaRequest`
  (`ConfirmarFaturamentoUseCase.cs:126`) e é gravado na nota (`GerarNotaFiscalPedidoVendaUseCase.cs:127`).
- **É obrigatório?** No validator, não. **Na prática, sim, enquanto `ValidarDadosFiscaisProduto=true`**:
  - sem natureza, a geração falha com `Fiscal.CfopNaturezaOperacaoNaoInformada`
    (`GerarNotaFiscalPedidoVendaUseCase.cs:165-168`, `FiscalErrors.cs:270-273`);
  - o Confirmar devolve 400, e o leg 1 fica `Falhou` (`ConfirmarFaturamentoUseCase.cs:132-145`);
  - com a validação desligada, a nota nasce sem CFOP e com alerta (`:169-172`).
- **De que catálogo vem:** `GET /api/fiscal/naturezas-operacao?empresaId=&somenteAtivas=&termo=&pagina=&tamanhoPagina=`,
  com `FISCAL_CADASTROS_CONSULTAR` (`NaturezasOperacaoController.cs:41-73`, rota `:17`). A resposta é
  `PagedResult<NaturezaOperacaoResponse>` (`NaturezaOperacaoConsultas.cs:72`), com `Id`, `Codigo`,
  `Descricao`, `Ativa` e `Cfops[]` (`NaturezaOperacaoContracts.cs:53-68`). Também há
  `GET .../{id}/cfop?ufOrigem=&ufDestino=&tipoItem=` (`:128-143`), que resolve o CFOP pela natureza.
- **A tela já o oferece?** **Não.** No HEAD não existe client, hook, tipo nem tela de natureza de
  operação em `features/` (`grep -rni naturez features app lib types layout` → só `contabil`, e dois
  campos em `fiscal`, abaixo).
- **A `b59` não foi entregue:**
  - o CHANGELOG salta de `v1.11.0a8b58.c3` para `v1.11.0a8b64` (`grep -o "v1.11.0a8b[0-9]*"`);
  - `git log --all | grep -i b59` → nenhum commit;
  - o plano da fatia existe e não está rastreado (§0).
  - A `b71` depende dela no plano da onda (`PLANO-FRONTEND-ONDA-OPERACAO.md:69,204`) e na D53.
- **O Fiscal mostra texto falso sobre isso** (DIV-2 da rodada 04, ainda aberta):
  - `FiscalActionDialogs.tsx:141` e `:199` exibem o campo "Natureza de operação" como `InputText`
    desabilitado de GUID, com a dica "Ainda sem endpoint operacional no backend";
  - o backend tem as 5 rotas.
- **Banco dev:** `erp.naturezas_operacao` com **0 linhas**, `erp.naturezas_operacao_cfop` com 0
  (`psql`, medido em 2026-09-29). Um seletor de naturezas hoje viria vazio em dev, e não há tela para
  cadastrar.
- **O CFOP é derivado da natureza?** Sim. O âmbito sai do par UF do emitente × UF do destinatário,
  uma vez por nota, e o `TipoItemCfop` sai do produto, item a item. Depois vem
  `CfopDoItemResolver.ResolverCfopItem` (`GerarNotaFiscalPedidoVendaUseCase.cs:137-163,204-231`).
  A UF autorizadora **não** entra nessa derivação.

## 5. `correlationId`

- **Quem gera:** o chamador. O backend não gera nenhum no Confirmar; ele só o repassa aos legs 4, 5
  e 6 (`ConfirmarFaturamentoUseCase.cs:204,252,319`).
- **Para que serve:** chave de idempotência da transmissão. "O mesmo `correlationId` na mesma nota
  e operação é recusado (`IntegracaoFiscalJaProcessada`)" (`docs/backend-v1.23/FLUXOS-E-REGRAS-PARA-A-UI.md:176-179`,
  T1/T2 em `:164-174`). Na baixa de estoque e na conta a receber, o validator só limita o tamanho a
  120 (`NotaFiscalValidators.cs:414,435`).
  - **Não verificado:** se esses dois use cases o usam para idempotência. Não li o corpo de
    `BaixarEstoqueNotaFiscalAutorizadaUseCase`/`GerarContaReceberNotaFiscalAutorizadaUseCase` além da validação.
- **Obrigatoriedade efetiva:**
  - `ConfirmarFaturamentoRequestValidator` aceita nulo, com `MaximumLength(100)`, em `:27`;
  - `TransmitirNotaFiscalSefazRequestValidator` exige `NotEmpty().MaximumLength(120)` (`:236-238`);
  - o use case de transmissão roda esse validator (`FiscalSefazUseCases.cs:272-275`, via
    `FiscalRequestValidator`, registrado por `AddValidatorsFromAssembly`, `DependencyInjection.cs:50`);
  - a regra está commitada no backend desde `055cff4` (2026-09-02), medido por `git log -S`;
  - **consequência pela leitura do código:** sem `correlationId`, o leg 4 sempre falha na validação,
    antes de chamar a SEFAZ. O faturamento vai para `Erro` e a resposta é **200** (FT-1).
- **Onde a tela mostra ou envia:** em lugar nenhum da feature Faturamento no HEAD.
- **Precedente (b57, D43 P-2):** o Fiscal gera com `createFiscalCorrelationId`
  (`fiscalUiUtils.ts:512-524`), no formato `front-<fluxo>-<nota8>-<timestamp14>-<rand6>`, com no
  máximo 85 caracteres pela soma dos segmentos. Isso cabe nos 100 do faturamento. O ID é novo a cada
  abertura do diálogo e fica somente leitura no transmitir (`FiscalActionDialogs.tsx:418,425`). Nos
  diálogos de cancelamento, CC-e e DANFE, ele continua **editável** (`:456,474,526`).

## 6. UF, CFOP e unidade comercial: fontes existentes

| Campo | Catálogo no backend | Formato | Permissão | Hook já existente no frontend (HEAD) | Linhas no banco dev | O backend valida o valor digitado? |
| --- | --- | --- | --- | --- | --- | --- |
| UF autorizadora | `GET /api/fiscal/cadastros/uf?termo=&ativo=` (`CadastrosFiscaisController.cs:38-47`), sem paginação (D52) | `UfResponse(Id, Sigla, Nome, CodigoIbge, …, Ativo)` (`CadastrosFiscaisResponses.cs:6-13`) | `FISCAL_CADASTROS_CONSULTAR` | `useUfCatalogo` (`features/administracao/hooks/useEnderecoFiscalCatalogos.ts:32-45`), `value = sigla` | `erp.uf` = 27 | Só forma (2 letras). **A UF útil é a que tem endpoint SEFAZ configurado** (`SefazSoapClient.cs:82-87`); nenhum endpoint da API expõe essa lista (`SefazController.cs` só tem status e contingência). `SefazOptions.DefaultUfAutorizadora` existe (`SefazOptions.cs:18`) e **não é lido em lugar nenhum** (`grep` → 1 ocorrência, a própria declaração) |
| CFOP | `GET /api/fiscal/cadastros/cfop?termo=&codigo=&tipo=&ambito=&ativo=&pagina=&tamanhoPagina=` (`:165-180`), paginado | `CfopResponse(Id, Codigo, Descricao, Tipo, Ambito, …, Ativo)` (`CadastrosFiscaisResponses.cs:121-133`) | `FISCAL_CADASTROS_CONSULTAR` | `useCfopOptions` (`features/tributacao/hooks/useTributacao.ts:87-100`): **`value = item.id`**, mas o request quer o **código** (FT-7). A D47 item 3 (mover `CadastroFiscalSelects` para `features/fiscal`) não aconteceu, porque era da `b59` | `erp.cfop` = 64 (32 começam por 5/6/7) | O código é normalizado e comparado ao derivado; divergente vira 400 (`CfopDoItemResolver.cs:162-184`). Sem natureza, o valor é **ignorado** |
| Unidade comercial padrão | `GET /api/produtos/unidades-medida?empresaId=` (`UnidadesMedidaController.cs:11,22-23`). Existe também `GET /api/fiscal/cadastros/unidades-tributaveis` (`CadastrosFiscaisController.cs:151-153`, `UnidadeTributavelResponse(Id, Sigla, …)`) | sigla | `PRODUTOS_CONSULTAR` / `FISCAL_CADASTROS_CONSULTAR` | `useUnidadesMedida` (`features/produtos/hooks/useProdutosResources.ts:30-35`) | `produtos_unidades_medida` = 24; `unidade_tributavel` = 42 | Só `NotEmpty ≤ 20`. É fallback: a sigla vem da unidade do produto sempre que resolvível (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`). **Pela leitura do código, a unidade comercial do produto é `UnidadeMedida`, e não `UnidadeTributavel`**; a escolha do catálogo é pergunta, e não inferência (P-4) |
| Série (fora da lista do plano, mesmo diálogo) | `GET /api/fiscal/series` (`SeriesFiscaisController.cs:46-47`) | — | `FISCAL_SERIES_CONSULTAR` (+ `FISCAL_MODELOS_CONSULTAR` no combo) | `NotaFiscalSerieField` (b58), já usado pelo Fiscal; o Faturamento usa `InputText` (`FaturamentoDialogs.tsx:114`) | `series_fiscais` = 1 | `NotEmpty ≤ 20`; buraco e duplicidade só no leg 1 |

**Permissões auxiliares:** o Confirmar exige `FATURAMENTO_CONFIRMAR`. Os catálogos acima exigem
`FISCAL_CADASTROS_CONSULTAR`, `PRODUTOS_CONSULTAR`, `FISCAL_SERIES_CONSULTAR`/`FISCAL_MODELOS_CONSULTAR`
e `FINANCEIRO_CONSULTAR` (condições, este já consumido hoje). Quem tem só `FATURAMENTO_CONFIRMAR`
recebe 403 em cada catálogo. Esses códigos existem no union (`types/erp.ts:266,311,313,315`).

## 7. `certificateThumbprint` (B-6)

- **No request do faturamento:** `string?`, até 200 (`FaturamentoContracts.cs:96`,
  `FaturamentoValidators.cs:26`). Vai para `AssinarXmlNotaFiscalRequest` (`ConfirmarFaturamentoUseCase.cs:172`).
  O validator da assinatura limita a **120** (`NotaFiscalValidators.cs:218`), então um valor entre 121
  e 200 passaria no Confirmar e falharia no leg 3.
- **O que o backend faz com nulo:** `XmlFiscalSigner.cs:26-28` usa
  `_certificateProvider.ObterCertificado()`, que lê o certificado da configuração do servidor
  (`SefazCertificateProvider.cs:15`, `SefazOptions.CertificateThumbprint`, `SefazOptions.cs:13`). Em
  produção, a configuração exige thumbprint ou PFX real (`SefazOptionsValidator.cs:33-37`).
  - **Leitura de código, não resposta do backend:** já existe fonte segura do lado do servidor, e
    enviar `null` usa essa fonte. Se isso basta como resposta à B-6 (um certificado por instalação,
    e não por empresa ou filial) fica como pergunta (P-3).
- **A feature Faturamento expõe o dado?** Não. O campo não existe no tipo, no schema nem no diálogo
  do HEAD.
- **O frontend expõe em outro lugar?** Sim. `XmlPipelineDialog`, no modo "assinar"
  (`FiscalActionDialogs.tsx:390-399`), tem o campo digitável **"Thumbprint certificado"**, com o
  placeholder "Vazio usa configuração do backend", e o schema aceita até 120
  (`fiscalSchemas.ts:97`). O diálogo abre na página de nota (`NotaFiscalDetalhePage.tsx:355`). É o
  "segredo de certificado em campo digitável" que o plano proíbe (`PLANO-FRONTEND-ONDA-OPERACAO.md:209-210`),
  fora da feature Faturamento (FT-16).

## 8. Faturar pedido de venda (herança D80 e V11)

**Existem três ações a partir de um pedido `Aprovado`, com efeitos diferentes.** O backend não as
coordena, e a tela as oferece lado a lado:

| Ação | Endpoint / permissão | O que dispara | Efeito sobre as outras |
| --- | --- | --- | --- |
| **Faturar** (Vendas, `PedidoVendaDetalhePage.tsx:232`) | `POST /api/vendas/pedidos/{id}/faturar`, `VENDAS_FATURAR` | `FaturarPedidoVendaUseCase.cs:39-79`: se `BaixarEstoque`, baixa a reserva ou registra saída (`VendaPedidoEstoqueOrchestrator.cs:50-88`); marca o pedido `Faturado` (`PedidoVenda.cs:170-176`). **Não gera NF nem título.** O histórico grava literalmente "Pedido faturado logicamente. Financeiro e fiscal serao gerados em etapas futuras." (`:75`) | Pedido `Faturado` → `Preparar` é recusado (`ExigirPodeGerarNotaFiscalRascunho` exige `Aprovado`, `PedidoVenda.cs:190-194`). O título só sai depois por Financeiro → "Gerar por pedido", que exige `Faturado` (inventário 12, §2) |
| **Gerar NF** (Fiscal, `:233`) | `POST /api/fiscal/notas-fiscais/gerar-de-pedido-venda`, `FISCAL_EMITIR` (`NotasFiscaisController.cs:77-79`) | nota em Rascunho com origem `PedidoVenda` | Com a nota criada, o leg 1 do faturamento falha para sempre com `NotaJaExisteParaOrigem` (`GerarNotaFiscalPedidoVendaUseCase.cs:93-97`), e o faturamento não reaproveita a nota existente. **Medido no banco dev:** o pedido `00014` (`Aprovado`) tem a nota `7fe4a0d1…` em Rascunho e **dois faturamentos em `Erro`** (2026-09-17 e 2026-09-18), os dois com o leg 1 `Falhou`, motivo "Já existe nota fiscal vinculada à origem 'PedidoVenda'…" |
| **Preparar + Confirmar** (Faturamento) | `FATURAMENTO_PREPARAR` / `FATURAMENTO_CONFIRMAR` | Preparar exige reserva em todo item ativo (`PrepararFaturamentoUseCase.cs:77-86`). Confirmar percorre os 6 legs: NF rascunho → XML → assinatura → SEFAZ → baixa de estoque → conta a receber. O pedido vira `Faturado` pelo handler da autorização (`FiscalPedidoVendaAutorizacaoHandler.cs:55,69`) | — |

**Erros de domínio do Faturar (Vendas):** validação (`Documento` ≤ 80, `Observacao` ≤ 300);
`PedidoNaoEncontrado`; contexto organizacional; "Somente pedido aprovado pode ser faturado." e item
ativo obrigatório (`PedidoVenda.cs:164-168`); `ProdutoNaoEncontrado`; `ProdutoControlaEstoqueSemLocal`;
`FalhaEstoque(<msg>)` (`VendaPedidoEstoqueOrchestrator.cs:54-88`). Todos voltam 400 via `VendaErrors`.

**O que o diálogo mostra hoje antes de confirmar** (`PedidoVendaActionDialogs.tsx:84-105`, HEAD):

- um checkbox "Baixar estoque no faturamento", marcado por padrão;
- "Documento \*", `InputText`;
- "Observação".

Não tem resumo (número, cliente, itens, valor), ao contrário da aprovação (`AprovacaoResumo`, `:28-55`,
D79). Não tem `ApiErrorPanel` (a aprovação tem, `:72`). Não diz que não haverá NF nem título. O toast
de sucesso diz "Pedido faturado com baixa de estoque." (`PedidoVendaDetalhePage.tsx:222`). A mutação
reconsulta só em `onSuccess` (`useVendasResources.ts:56`).

**V11, medido nos dois lados:**

- backend: `Documento` é `string?` (`PedidoVendaRequests.cs:41`); o validator só tem
  `MaximumLength(80)` (`PedidoVendaValidators.cs:77`); a baixa aceita `Documento` nulo em
  `BaixarReservaEstoqueRequest`/`RegistrarSaidaEstoqueRequest` (`string?`, só `MaximumLength(80)` em
  `ReservaEstoqueValidators.cs:24`/`MovimentoEstoqueValidators.cs:28`);
- frontend: `documento: z.string().trim().min(1, …)` (`vendasSchemas.ts:53`), tipo `documento: string`
  (`vendas.types.ts:76`), sem `.max(80)`; `observacao` sem `.max(300)`.

**O frontend exige o que o backend não exige, e deixa passar o que o backend recusa.** Confirmado.

## 9. Reversão e retomada (P4 do plano v1.23)

**P4 está de pé no HEAD.** Conferi item a item contra `PLANO-FRONTEND-v1.23.md:111-121`:

- legs e os 4 booleanos no tipo (`faturamento.types.ts:78-82`);
- `retomar-reversao` consumido (`faturamentoApi.ts:80-86`);
- tabela fixa de 6 legs na ordem do catálogo, com "Sem registro", estado desconhecido cru e linha
  extra (`faturamentoLabels.ts:130-170`, D25);
- alerta forte de `etapaDivergeDosLegs` (`FaturamentoDetalhePage.tsx:139-145`) e alerta de
  `possuiLegEmReversao` (`:146-152`);
- botão Retomar só na linha `EmReversao`, sob `FATURAMENTO_RETOMAR_REVERSAO` (`:170-186`);
- diálogo com o leg só para leitura, ação vazia, motivo de 1 a 500 e aviso de "declaração humana"
  (`FaturamentoDialogs.tsx:151-221`, D28);
- Confirmar desabilitado com tooltip quando há leg em reversão (`:96-112`, D23);
- `onSettled` em confirmar, cancelar e retomar (`useFaturamentoResources.ts:37-39`, D27).

O backend continua batendo com isso:

- `RetomarReversaoLegUseCase.cs:92-101` checa a permissão e o estado `EmReversao`;
- o mapper calcula os booleanos (`FaturamentoMapper.cs:78-106`);
- o Confirmar recusa leg em reversão (`ConfirmarFaturamentoUseCase.cs:107-113`).

**O que continua fora (D24) e segue igual:**

- Cancelar fica habilitado em qualquer etapa ≠ `Cancelado` (`faturamentoLabels.ts:84`). Com o leg 4
  `Integrado`, o backend sempre recusa (`CancelarFaturamentoUseCase.cs:117-131`,
  `CancelamentoRecusadoLegSefazIntegrado`, com a lista de legs no texto).
- `FATURAMENTO_REVERTER_INTEGRACAO` é exigida dentro do use case quando há leg integrado a desfazer
  (`:144-146`). Ela existe no backend (`SystemPermissions.cs:163`) e no banco (`erp.permissoes`, 6
  linhas `FATURAMENTO_%`), e **não existe no union do frontend**. Quem tem só `FATURAMENTO_CANCELAR`
  recebe `Error.Forbidden`, e a resposta HTTP exata dessa falha é **não verificada** (o controller
  mapeia toda falha para `BadRequest`, `FaturamentosController.cs:90`).
- `runRequest` descarta o `code` do erro (`faturamentoApi.ts:18-24`); a D27 mandou o assunto para a F5.5.

**Documentação desatualizada sobre isso** (não bloqueia; ver FT-19):

- `FLUXOS-E-REGRAS-PARA-A-UI.md:99,137-150` ainda descreve 3 estados de leg e "a inversa falhou →
  permanece `Integrado`". O código atual tem `EmReversao` (v1.23.2).
- `CONTRATO-API-v1.23.md:5771` marca `retomar-reversao` como não consumido.

## 10. Money on screen

| Tela | Valor exibido | Vem de | Nome bate com o record? |
| --- | --- | --- | --- |
| Lista de faturamentos | coluna "Valor", `formatMoney(row.valorTotal)` (`FaturamentoPage.tsx:83`) | `FaturamentoResponse.ValorTotal` (`FaturamentoContracts.cs:40`); é uma cópia de `pedido.ValorTotal` no Preparar (`PrepararFaturamentoUseCase.cs:88`) | sim |
| Detalhe do faturamento | "Valor total", `formatMoney(faturamento.valorTotal)` (`FaturamentoDetalhePage.tsx:130`) | idem | sim |
| Diálogos Preparar, Confirmar, Retomar e Cancelar | nenhum valor | — | — |
| `FaturarPedidoVendaDialog` | nenhum valor (nem resumo) | — | — |

Não há outro campo monetário no recorte. `formatMoney` é o compartilhado (`lib/formatters/money.ts`,
F1.4). Não há `valor ?? 0`.

## 11. Permissões: union × guards × rota × menu × `[RequiredPermission]`

| Código | Backend (`SystemPermissions.cs`) | Banco dev | Snapshot (`scripts/backend-permissions.snapshot.json`) | Union (`types/erp.ts`) | Catálogo FE | Guard | Rota `:59` | Menu pai / filho (`AppMenu.tsx:155/156`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FATURAMENTO_CONSULTAR` | `:137`; 4 GETs | sim | `:102` | `:331` | `:140` | telas (`FaturamentoPage.tsx:42,49`; detalhe `:49`); Abrir (`:86`) | sim | sim / sim |
| `FATURAMENTO_PREPARAR` | `:138`; preparar | sim | `:103` | `:332` | `:141` | `:72` | sim | sim / sim |
| `FATURAMENTO_CONFIRMAR` | `:139`; confirmar | sim | `:101` | `:333` | `:142` | detalhe `:97` | sim | sim / **não** |
| `FATURAMENTO_CANCELAR` | `:140`; cancelar | sim | `:100` | `:334` | `:143` | detalhe `:114` | sim | sim / **não** |
| `FATURAMENTO_RETOMAR_REVERSAO` | `:176`; retomar | sim | `:22,104` | `:335` | `:144` | detalhe `:173` | **não** | **não** / **não** |
| `FATURAMENTO_REVERTER_INTEGRACAO` | `:163`; checada dentro do cancelar | sim | **ausente** | **ausente** | ausente | — | — | — |
| `VENDAS_FATURAR` | faturar | não medido | não medido | `:282` | `:77` | `PedidoVendaDetalhePage.tsx:232` | (rota de vendas, fora) | (fora) |

Divergências nominais (FT-18):

1. **Rota × tela:**
   - `routePermissions.ts:59` admite quem tem só `CONFIRMAR` ou só `CANCELAR`;
   - as duas telas exigem `CONSULTAR` e mostram `UnauthorizedState`;
   - o menu esconde o filho, e o filtro remove grupo vazio (`AppMenu.tsx:283-286`);
   - resultado: essa pessoa não vê o item, e acessa só pela URL, para ver a recusa.
2. **`FATURAMENTO_RETOMAR_REVERSAO` sozinha:** não entra na rota nem no menu. Precisa de `CONSULTAR`
   para ver o botão, o que é coerente com a tela, mas a rota não a lista.
3. **`FATURAMENTO_REVERTER_INTEGRACAO`:** fora do union, do catálogo FE e do snapshot, por decisão
   (D24). O backend a exige em runtime.
4. **Catálogo estruturado do backend:** `PermissoesCatalogoDefinition.cs` não tem módulo Faturamento
   (`grep -i faturament` → 0, com 15 módulos listados em `:9-268`). `SalvarMatrizGrupoAcessoUseCase.cs:83-85`
   recusaria conceder qualquer `FATURAMENTO_*` pela matriz. O frontend não usa a matriz
   (`grep matriz features/seguranca/api` → 0), então **não verificado** se há efeito hoje.

## 12. Estados de tela

Procurei os componentes nas linhas do HEAD. `presente`/`ausente` vêm de leitura. Não deduzi nada pelo
nome do componente.

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FaturamentoPage` | presente (`DataTableServer loading`, `:81`) | presente, **em dobro**: `emptyMessage` (`:81`) + `EmptyState` (`:88`). O `EmptyState` aparece também quando a consulta falhou (`!isLoading && totalRecords===0`) | presente (`ApiErrorPanel`, `:80`), **sem botão de tentar de novo** (o componente não tem `retry`, `grep` → 0) | presente parcial: sem empresa no contexto, `EmpresaFilialFilter` mostra aviso (`EmpresaFilialFilter.tsx:67-72`), mas a consulta sai assim mesmo (FT-9) | presente (toast do Preparar, `:55-66`) | presente (`UnauthorizedState`, `:49-50`) | ausente: o Preparar é desabilitado por `PermissionGuard` sem motivo (`PermissionGuard.tsx:23-24` só passa `disabled`) |
| `PrepararFaturamentoDialog` | presente (`EntitySelect loading`, `FaturamentoDialogs.tsx:60`; botão `loading`) | ausente (combo sem pedido não explica) | presente (toast com a mensagem do backend; `useMutationWithToast.ts` usa `error.message`) | ausente | delegado à página | não se aplica | ausente (o combo lista pedido de qualquer status, FT-11) |
| `FaturamentoDetalhePage` | presente (`LoadingState`, `:122`); tabelas de ocorrências e histórico com `loading` (`:192,200`) | presente em ocorrências e histórico (`emptyMessage`); legs mostram "Sem registro" | presente (`ApiErrorPanel`, `:123`) | presente (alertas de `etapaDivergeDosLegs`/`possuiLegEmReversao`, `:139-152`) | presente (toasts, `:53-89`); **falso positivo** em 200 com etapa `Erro` (FT-3) | presente (`:49-50`) | presente só para Confirmar com leg em reversão (tooltip `:106-107`); ausente para falta de permissão (Confirmar, Cancelar, Retomar) e para Cancelar com leg 4 integrado |
| `ConfirmarFaturamentoDialog` | presente (botão `loading`, `:100`) | não se aplica | presente (erros Zod por campo, `:92-97`; erro de backend vira toast e o diálogo fica aberto via `rethrow`) | ausente (nada informa que, sem natureza e com a validação ligada, o backend vai recusar) | delegado | não se aplica (o botão que abre é guardado) | ausente |
| `RetomarReversaoDialog` | presente (`:182`) | não se aplica | presente (campo, `:196-217`) | não se aplica | delegado | não se aplica | presente (aviso de declaração humana, `:199-205`) |
| Cancelar (`ReasonDialog`) | presente | não se aplica | presente (toast; o limite de 300 é checado no `faturamentoApi.cancelar`, antes da chamada) | ausente (a recusa de leg 4 chega como toast) | presente | não se aplica | ausente |
| `FaturarPedidoVendaDialog` | presente (botão `loading`) | não se aplica | presente (campo `documento`; erro de backend só em toast) | ausente | presente, com texto que omite NF/título (FT-14) | não se aplica | não verificado (fora da feature) |

## 13. Testes transversais em risco (lista para o QA)

Medido no HEAD com `grep -rl`/`grep -rli` em `tests/unit`, `tests/components` e `tests/e2e`.
**Nenhum foi executado nesta sessão.** Arquivos marcados † foram **alterados ou criados na árvore de
trabalho durante esta sessão** (§0) e já afirmam um desenho da `b71`.

```text
# faturamento (nome ou conteúdo)
tests/components/ConfirmarFaturamentoDialog.test.tsx   †novo (não rastreado)
tests/components/FaturamentoDetalhePage.test.tsx
tests/components/RetomarReversaoDialog.test.tsx
tests/e2e/faturamento-legs.spec.ts
tests/e2e/fixtures/logosoft.ts
tests/unit/backendContractMap.test.ts
tests/unit/backendPermissions.test.ts
tests/unit/contratosStructure.test.ts
tests/unit/faturamentoLabels.test.ts
tests/unit/faturamentoPayload.test.ts                  †modificado
tests/unit/faturamentoStructure.test.ts                †modificado
tests/unit/servicosPayload.test.ts
tests/mocks/faturamento/                               †novo (não rastreado)

# FATURAMENTO_* por nome
tests/components/FaturamentoDetalhePage.test.tsx, tests/e2e/faturamento-legs.spec.ts,
tests/unit/backendPermissions.test.ts, tests/unit/faturamentoStructure.test.ts

# faturar / VENDAS_FATURAR / FaturarPedidoVenda
tests/e2e/fixtures/logosoft.ts, tests/unit/servicosPayload.test.ts,
tests/unit/servicosPilotStructure.test.ts, tests/unit/vendasPayload.test.ts
tests/components/AprovarPedidoVendaDialog.test.tsx     # importa PedidoVendaActionDialogs

# natureza de operação
tests/e2e/fiscal-backend.spec.ts, tests/e2e/integrated-backend.spec.ts,
tests/unit/fiscalPayload.test.ts (+ os dois † acima)

# cfopPadrao / ufAutorizadora / unidadeComercialPadrao / certificateThumbprint / correlationId
tests/components/FiscalIntegracoesTableReprocessar.test.tsx, tests/components/FiscalOperationalPanels.test.tsx,
tests/components/TransmitirSefazDialog.test.tsx, tests/components/useFiscalMutationsTransmissao.test.tsx,
tests/e2e/fiscal-backend.spec.ts, tests/e2e/fiscal-transmissao.spec.ts, tests/e2e/integrated-backend.spec.ts,
tests/unit/fiscalContract.test.ts, tests/unit/fiscalPayload.test.ts, tests/unit/fiscalProductionReadiness.test.ts,
tests/unit/fiscalTransmissao.test.ts, tests/unit/fiscalUxRules.test.ts, tests/unit/guidReferenceAudit.test.ts,
tests/unit/requestUtils.test.ts

# FISCAL_CADASTROS_CONSULTAR / FISCAL_EMITIR
tests/unit/fiscalContract.test.ts, tests/unit/fiscalTransmissaoStructure.test.ts, tests/unit/routePermissions.test.ts,
tests/components/FiscalIntegracoesTableReprocessar.test.tsx, tests/e2e/fiscal-transmissao.spec.ts

# regra de rota e menu (qualquer mudança em routePermissions.ts:59 ou AppMenu.tsx:153-157)
tests/unit/routePermissions.test.ts, tests/unit/guardPermissionMap.test.ts,
tests/unit/guardPermissionMapMenuRules.test.ts, tests/unit/guardPermissionMapMenuProofHistoric.test.ts
(+ 30 *Structure.test.ts que leem os dois arquivos: grep -rlE "routePermissions|AppMenu" tests/unit)

# nomes fiscal* (vizinhos, se FiscalActionDialogs/fiscalSchemas forem tocados, ex. FT-16/FT-17)
tests/components/NotaFiscalSerieField.test.tsx, NotaFiscalErroCadastroPanel.test.tsx, SerieFiscalDialogs.test.tsx,
tests/unit/fiscalSeries*.test.ts, fiscalImpostos*.test.ts, fiscalTransmissaoStructure.test.ts,
tests/e2e/fiscal.spec.ts, fiscal-series.spec.ts, fiscal-impostos.spec.ts
```

---

## Divergências

**FT-1: `correlationId` é obrigatório na transmissão, e o Confirmar não o envia. Pela leitura do código, o leg 4 nunca passa.**
`TransmitirNotaFiscalSefazRequestValidator` tem `CorrelationId NotEmpty` (`NotaFiscalValidators.cs:236-238`).
`ConfirmarFaturamentoUseCase.cs:198-204` repassa `request.CorrelationId`, que a UI nunca manda
(`faturamentoSchemas.ts:22-32`). A falha vira `RegistrarErroAsync` (etapa `Erro`, ocorrência, leg 4
`Falhou`) e **HTTP 200** (`:206-210`). **Não medido em execução:** nenhum faturamento do banco dev
chegou ao leg 4 (os 2 existentes pararam no leg 1).

**FT-2: sem `naturezaOperacaoId`, e com "Validar dados fiscais" marcado por padrão, o Confirmar é recusado no leg 1.**
400 `Fiscal.CfopNaturezaOperacaoNaoInformada` (`GerarNotaFiscalPedidoVendaUseCase.cs:165-168`). O
campo não existe na UI, o banco dev tem 0 naturezas, e a `b59`, que criaria o cadastro, não foi
entregue. Somado ao FT-1: **no HEAD, esta tela não conclui nenhum faturamento por nenhum caminho de
entrada.** Com a validação ligada, para no leg 1. Desligada, gera NF sem CFOP e para no leg 4. É
leitura de código, e não medição em execução.

**FT-3: sucesso falso no Confirmar.** Falha nos legs 2 a 6 devolve 200 com etapa `Erro`
(`ConfirmarFaturamentoUseCase.cs:167,176,209,236,257,281,311,324`). O motivo da falha **não entra em
`alertas`** nos legs 2, 3, 4 (falha de chamada), 5 (falha de baixa) e 6 (falha de conta); ele vai só
para ocorrência e leg. A tela mostra o toast verde "Faturamento confirmado / Transmissão registrada."
(`FaturamentoDetalhePage.tsx:60`) e ignora `ConfirmarFaturamentoResponse.faturamento.etapa`. A
reconsulta mostra "Erro" depois, mas o toast já disse o contrário.

**FT-4: tipo de documento.** A UI oferece 6 (`faturamentoLabels.ts:53-60`), e o schema aceita os 6
(`z.nativeEnum`). O backend aceita 2 (`FaturamentoValidators.cs:20-21`), e é enum fixo no frontend
sem restrição correspondente.

**FT-5: limites do request ausentes no cliente.**
- `ufAutorizadora`: sem `length(2)`/regex no schema, só `maxLength` no input.
- `serie` ≤ 20; `numero` ≤ 40; `cfopPadrao` ≤ 20; `unidadeComercialPadrao` ≤ 20.
- Preparar `observacao` ≤ 500.
- Faturar (Vendas): `documento` ≤ 80 e `observacao` ≤ 300.

Em todos esses casos, passa no cliente e o backend devolve 400.

**FT-6: a UF autorizadora útil é a que tem endpoint SEFAZ configurado, e não uma das 27.**
`SefazSoapClient.cs:82-87`. Nenhuma rota expõe a lista configurada, e
`SefazOptions.DefaultUfAutorizadora` não é lido. Um dropdown sobre `GET /api/fiscal/cadastros/uf`
ofereceria UFs sem endpoint. O efeito exato de UF sem endpoint (erro ou reprocessamento) é **não
verificado**.

**FT-7: o CFOP de catálogo tem a forma errada no hook existente e papel secundário no backend.**
`useCfopOptions` devolve `value = id` (`useTributacao.ts:97`), e o request quer código. O backend usa
`cfopPadrao` só como conferência contra o derivado, e o ignora sem natureza. Vizinho: o Fiscal ainda
diz "CFOP obrigatório quando a validação fiscal estiver ativa" (`FiscalActionDialogs.tsx`, diálogo
Gerar NF, e o `superRefine` de `fiscalSchemas.ts:52-56`). O backend deixou de exigir isso na v1.18
(`NotaFiscalValidators.cs:130-133`).

**FT-8: a unidade comercial é fallback, e o catálogo certo é ambíguo.** A sigla vem da unidade do
produto. O request só entra quando o produto não tem unidade (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`),
mas o campo é `NotEmpty`. Há dois catálogos de sigla: `unidades-medida` (produtos, 24) e
`unidades-tributaveis` (fiscal, 42).

**FT-9: a listagem de faturamentos sai sem `empresaId`.** Os filtros começam em `{}`
(`FaturamentoPage.tsx:35`), e `useFaturamentos` só depende da permissão (`:42`). O
`EmpresaFilialFilter` preenche a empresa num `useEffect` (`EmpresaFilialFilter.tsx:22-33`). O backend
recusa `Guid.Empty` com 400 `Faturamento.EmpresaObrigatoria` (`OrganizationalContextGuard.cs:14-19`).
Em contexto global, a empresa fica nula e **toda** consulta volta 400. É a mesma classe de V5, D82 e
D88. O efeito visual exato do primeiro 400 (se o painel pisca) é **não verificado**.

**FT-10: Preparar cria outro faturamento quando o existente está em `Erro`, e a tela promete o contrário.**
`ObterPorPedidoVendaIdAtivoAsync` exclui `Erro` e `Cancelado` (`FaturamentoRepository.cs:21-25`). O
texto do diálogo diz "Se já existir um faturamento para o pedido, ele é reaproveitado."
(`FaturamentoDialogs.tsx:56`). **Medido:** 2 faturamentos `Erro` para o mesmo pedido `00014` no banco dev.

**FT-11: o combo do Preparar lista pedidos de qualquer status.** Ele chama
`usePedidosVenda({ empresaId, filialId })` sem `status` (`FaturamentoDialogs.tsx:45`). O backend só
aceita `Aprovado`, e o combo do Fiscal filtra `Aprovado`. O rótulo mostra só o número, e a lista corta
em 200 sem aviso (`VendasRepository.cs:40`).

**FT-12: três caminhos concorrentes a partir de `Aprovado`**, com efeitos incompatíveis e sem aviso
na tela (§8). **Medido:** "Gerar NF" antes do faturamento prendeu 2 faturamentos no leg 1 para o
pedido `00014`. "Faturar" (Vendas) é faturamento lógico: não gera NF nem título, e bloqueia o
Preparar.

**FT-13 (V11): `Documento` é opcional no backend e obrigatório no frontend.** Medido nos dois lados
(§8).

**FT-14: o diálogo Faturar (Vendas) não tem resumo, `ApiErrorPanel` nem texto de efeito**, ao
contrário da aprovação (D79). O toast de sucesso fala só de estoque.

**FT-15: GUID cru na tela.** `pedidoVendaId` aparece na lista (`FaturamentoPage.tsx:82`) e no detalhe
(`:132`); `contaReceberId`, no detalhe (`:134`). É a classe que a F5 carrega.

**FT-16: `certificateThumbprint` digitável no Fiscal** (`FiscalActionDialogs.tsx:399`), fora do
recorte e contra o plano. Os limites também divergem: 200 (Confirmar) × 120 (assinatura e schema do
Fiscal).

**FT-17: a `b59` não existe, e a `b71` depende dela.** O Fiscal ainda mostra "Natureza de operação:
ainda sem endpoint operacional no backend" (`FiscalActionDialogs.tsx:141,199`), e o backend tem 5
rotas. Dev tem 0 naturezas.

**FT-18: permissões.**
- A rota admite `CONFIRMAR`/`CANCELAR` sem `CONSULTAR`, e as telas recusam.
- `FATURAMENTO_RETOMAR_REVERSAO` fica fora da rota e do menu.
- `FATURAMENTO_REVERTER_INTEGRACAO` fica fora do union e do snapshot (D24), e o backend a exige.
- O catálogo estruturado do backend não tem o módulo Faturamento.

Detalhe em §11.

**FT-19: documentação atrasada em relação ao código.** `CONTRATO-API-v1.23.md:5771` diz que o
frontend não consome `retomar-reversao`. `FLUXOS-E-REGRAS-PARA-A-UI.md:99,137-150` descreve 3 estados
de leg e "falha → permanece Integrado", quando o código tem `EmReversao`. `BACKEND-ESTADO-ATUAL…md:1442`
lista `ResolverCfop` sem `tipoItem`.

**FT-20: código morto no client.** `normalizePaged` trata array (`faturamentoApi.ts:29-32`), e o
backend nunca devolve array. `FaturamentosListQuery.pedidoVendaId` nunca é preenchido.

**Campos entregues pelo backend e ignorados pela UI (resumo):** `confirmadoPor`, `canceladoEm`,
`canceladoPor`, `possuiLegComFalha`, `possuiLegRevertido`, `FaturamentoLegResponse.responsavelId` e
`FaturamentoHistoricoResponse.usuarioId`, todos por decisão (D30); `ConfirmarFaturamentoResponse.faturamento`
(FT-3); 5 campos de paginação.

**Campos lidos pela UI que o backend não entrega:** nenhum. São 0 em 46 posições de campo de resposta
(18 + 6 + 6 + 4 + 7 + 3 + 2). O `faturamento` de Preparar e Confirmar conta uma posição em cada
envelope e não é recontado campo a campo. Não há ocorrência da classe D71 neste recorte.

---

## Pendências

**Resolve-se lendo o contrato (já respondido acima, sem pergunta ao backend):**

- De onde vem a natureza, e se é obrigatória na prática: §4.
- O CFOP é derivado; `cfopPadrao` é conferência: §4, §6.
- A unidade é fallback: §6.
- Thumbprint nulo usa o certificado do servidor: §7.
- `correlationId` obrigatório na transmissão: §5.
- Faturar (Vendas) é lógico: §8.

**Perguntas ao backend:**

- **P-1:** a recusa `CorrelationId NotEmpty` na transmissão chamada pelo Confirmar (FT-1) é
  intencional? O Confirmar deveria exigir o campo no próprio validator, em vez de aceitar nulo e
  falhar 200 no leg 4? Um novo Confirmar após falha do leg 4 exige um `correlationId` **novo**
  (idempotência por nota e operação)?
- **P-2:** existe, ou vai existir, uma fonte das UFs com endpoint SEFAZ configurado (ou o uso de
  `DefaultUfAutorizadora`)? Hoje a UF é livre, e só a configuração do servidor sabe quais valem (FT-6).
- **P-3 (B-6):** "thumbprint nulo usa o certificado configurado no servidor" é a resposta oficial da
  B-6? O modelo é um certificado por instalação, ou haverá certificado por empresa ou filial?
- **P-4:** a unidade comercial padrão deve vir de `UnidadeMedida` (produtos) ou de `UnidadeTributavel`
  (fiscal)? Continuará obrigatória, sendo fallback?
- **P-5:** o Preparar deveria reaproveitar um faturamento em `Erro`, em vez de criar outro (FT-10)? E o
  leg 1 deveria vincular uma nota Rascunho já existente da mesma origem, em vez de falhar para sempre
  (FT-12)?
- **P-6:** a coexistência de "Faturar" (Vendas, lógico), "Gerar NF" (Fiscal) e Faturamento é
  deliberada? Qual é o caminho canônico?
- **P-7:** o Confirmar deveria incluir em `alertas` o motivo das falhas dos legs 2 a 6, que hoje ficam
  só nas ocorrências (FT-3)?

**Perguntas ao produto e à rodada (não ao backend):**

- A D91 (§0) é a decisão desta rodada? Ela chegou por arquivo durante a medição.
- A `b71` segue sem a `b59`, sendo que dev tem 0 naturezas e nenhuma tela para cadastrar?

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "faturamento",
  "slice": "v1.11.0a8b71",
  "status": "needs_decision",
  "arquivo": "docs/arquitetura/debate/13-inventario-faturamento.md",
  "arvoreMedida": "frontend HEAD 9713de4 (git show HEAD:...); backend ab5d00a, arvore limpa; banco dev via psql",
  "motivoNeedsDecision": "Durante a medicao apareceram por mudanca de arquivo: a D91 em DECISOES.md (14:44, 'Rodada: 13-faturamento', decide o desenho da b71 e accessRisk AUTO_BLOQUEIO), um plano docs/fatias/v1.11.0a8b71-faturamento.md e implementacao em curso em features/faturamento, features/fiscal/*naturezasOperacaoConsulta* e testes. Uma versao anterior deste arquivo (14:11, outro processo) foi substituida; copia no scratchpad da sessao. O orquestrador precisa decidir se a rodada 13 ainda debate sobre este inventario (HEAD) ou se a D91 ja a encerrou, e se o inventario deve ser refeito sobre a arvore de trabalho.",
  "contagemDeCampos": {
    "FaturamentoResponse": "18 declarados = 13 com destino + 0 divergencia + 5 sem uso (confirmadoPor, canceladoEm, canceladoPor, possuiLegComFalha, possuiLegRevertido; D30). Medido por leitura pareada faturamento.types.ts:62-83 x FaturamentoContracts.cs:32-50 e grep de destino nos componentes do HEAD.",
    "FaturamentoLegResponse": "6 = 5 + 0 + 1 (responsavelId). faturamento.types.ts:53-60 x FaturamentoContracts.cs:56-62.",
    "FaturamentoHistoricoResponse": "6 = 5 + 0 + 1 (usuarioId). :85-92 x :64-70.",
    "FaturamentoOcorrenciaResponse": "4 = 4 + 0 + 0. :94-99 x :72-76.",
    "FaturamentoPaginado": "7 = 2 + 0 + 5 (page, pageSize, totalPages, hasPreviousPage, hasNextPage). x PagedResult.cs:3-11.",
    "PrepararFaturamentoResponse": "3 = 3 + 0 + 0.",
    "ConfirmarFaturamentoResponse": "2 = 1 + 0 + 1 (faturamento ignorado; ver FT-3).",
    "totalRespostaLidaPelaUI": "46 posicoes de campo (18+6+6+4+7+3+2), 0 lidas sem entrega pelo backend (classe D71 ausente).",
    "ConfirmarFaturamentoRequest": "12 no backend = 9 enviados + 3 nao enviados (naturezaOperacaoId, certificateThumbprint, correlationId). Medido: FaturamentoContracts.cs:87-99 x faturamento.types.ts:133-143 e faturamentoSchemas.ts:22-32. A versao anterior deste arquivo dizia 10 enviados; recontado: 9.",
    "FaturarPedidoVendaRequest": "3 = 3 nomes batem; divergencia de obrigatoriedade em documento (V11) e limites ausentes (80/300)."
  },
  "medicoesBanco": [
    { "o_que": "faturamentos por etapa", "valor": "2, ambos Erro, mesmo pedido 00014", "como": "psql select Etapa,count(*) from erp.faturamentos" },
    { "o_que": "legs", "valor": "2 GerarNotaFiscal Falhou, motivo NotaJaExisteParaOrigem", "como": "psql erp.faturamento_legs_integracao" },
    { "o_que": "naturezas de operacao", "valor": "0 (e 0 mapeamentos CFOP)", "como": "psql count(*) erp.naturezas_operacao / naturezas_operacao_cfop" },
    { "o_que": "catalogos", "valor": "uf 27, cfop 64, unidades_medida 24, unidade_tributavel 42, series_fiscais 1", "como": "psql count(*)" },
    { "o_que": "permissoes FATURAMENTO_%", "valor": "6, incluindo REVERTER_INTEGRACAO", "como": "psql erp.permissoes" }
  ],
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "P-1: CorrelationId NotEmpty na transmissao chamada pelo Confirmar e intencional? O Confirmar deveria exigir no proprio validator? Retry apos falha do leg 4 exige correlationId novo?", "decide": "se o correlationId gerado e somente leitura e novo por abertura ou por tentativa, e se o schema o exige" },
    { "tipo": "backend", "pergunta": "P-2: existe fonte das UFs com endpoint SEFAZ configurado (ou uso de DefaultUfAutorizadora)?", "decide": "se o dropdown de UF usa o catalogo de 27 UFs ou uma lista restrita" },
    { "tipo": "backend", "pergunta": "P-3 (B-6): thumbprint nulo usando o certificado configurado no servidor e a resposta oficial? Certificado por instalacao ou por empresa/filial?", "decide": "se B-6 esta respondida e se a b71 precisa de qualquer campo de certificado" },
    { "tipo": "backend", "pergunta": "P-4: unidade comercial padrao vem de UnidadeMedida (produtos) ou UnidadeTributavel (fiscal)? Continua obrigatoria sendo fallback?", "decide": "catalogo e permissao do dropdown de unidade" },
    { "tipo": "backend", "pergunta": "P-5: Preparar deveria reaproveitar faturamento em Erro, e o leg 1 vincular nota Rascunho existente da mesma origem?", "decide": "texto do Preparar e o destravamento do pedido 00014 e casos iguais" },
    { "tipo": "backend", "pergunta": "P-6: coexistencia de Faturar (Vendas, logico), Gerar NF (Fiscal) e Faturamento e deliberada? Qual o caminho canonico?", "decide": "o que o dialogo Faturar diz e se as tres acoes continuam lado a lado" },
    { "tipo": "backend", "pergunta": "P-7: o Confirmar deveria por em alertas o motivo das falhas dos legs 2 a 6?", "decide": "se a tela pode confiar em alertas ou precisa ler etapa/legs da resposta para nao mostrar sucesso falso" },
    { "tipo": "funcional", "pergunta": "A D91, que chegou por arquivo durante a medicao, e a decisao desta rodada? A b71 segue sem a b59, com 0 naturezas em dev e sem tela de cadastro?", "decide": "se a rodada 13 debate ou se ja esta encerrada" }
  ],
  "riscos": [
    "FT-1 e FT-2 somados: pela leitura do codigo, nenhum faturamento conclui pela tela no HEAD. Nao medido em execucao; os 2 faturamentos do banco pararam no leg 1 por outro motivo (FT-12).",
    "FT-3: o toast verde em 200 com etapa Erro nao tem gate nem teste que o denuncie; a reconsulta corrige a tela, mas nao o toast.",
    "FT-6: efeito de UF sem endpoint SEFAZ configurado (erro x reprocessamento) nao verificado.",
    "Resposta HTTP de Error.Forbidden (REVERTER_INTEGRACAO) no cancelar nao verificada: o controller mapeia toda falha para BadRequest, e nao li o filtro de erro.",
    "Idempotencia por correlationId na baixa de estoque e na conta a receber (legs 5 e 6) nao verificada: so li os validators.",
    "Catalogo estruturado do backend sem modulo Faturamento: efeito pratico hoje nao verificado (o frontend nao usa a matriz).",
    "A arvore de trabalho mudou durante a medicao (features/faturamento, features/fiscal, testes, DECISOES.md). Citacoes de linha valem so para HEAD 9713de4; quem ler a arvore atual vai achar outras linhas.",
    "Nenhum gate nem teste foi executado nesta sessao (validate:backend-contract-map, validate:guard-permission-map, vitest): tudo e leitura de codigo e consulta ao banco."
  ]
}
```
