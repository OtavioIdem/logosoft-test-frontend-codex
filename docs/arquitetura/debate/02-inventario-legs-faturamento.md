# Inventário — legs de integração do faturamento e retomada de reversão (fatia `v1.11.0a8b55`)

Agente: `inventariante-contrato-tela`. Nó: `inventario`. Não propõe solução nem desenho — confere as
contagens do `planner` campo a campo contra o backend e a tela, para o `dev-senior-react` (Bloco A)
trabalhar sobre número medido, não estimado.

Recorte lido:

```text
features/faturamento/components/FaturamentoDetalhePage.tsx
features/faturamento/components/FaturamentoDialogs.tsx
features/faturamento/components/faturamentoLabels.ts
features/faturamento/components/FaturamentoPage.tsx        (só para confirmar D26)
features/faturamento/types/faturamento.types.ts
features/faturamento/schemas/faturamentoSchemas.ts
features/faturamento/api/faturamentoApi.ts
features/faturamento/hooks/useFaturamentoResources.ts
types/erp.ts                                                (só FATURAMENTO_*)
features/seguranca/permissoesCatalogo.ts                    (só FATURAMENTO_*)
lib/security/routePermissions.ts                            (só /faturamento)
```

Backend, só leitura, lido:

```text
docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1278-1297, 3624-3627 (com o adendo D22 já aplicado)
../New project 3/src/Erp.Domain/Faturamento/FaturamentoLegIntegracao.cs
../New project 3/src/Erp.Domain/Faturamento/StatusFaturamento.cs
../New project 3/src/Erp.Domain/Faturamento/FaturamentoOcorrencia.cs
../New project 3/src/Erp.Domain/Faturamento/CatalogoLegIntegracaoFaturamento.cs
../New project 3/src/Erp.Application/Faturamento/FaturamentoContracts.cs
../New project 3/src/Erp.Application/Faturamento/FaturamentoValidators.cs
../New project 3/src/Erp.Application/Faturamento/FaturamentoErrors.cs
../New project 3/src/Erp.Application/Faturamento/FaturamentoMapper.cs
../New project 3/src/Erp.Application/Faturamento/FaturamentoConsultaUseCases.cs
../New project 3/src/Erp.Application/Faturamento/ConfirmarFaturamentoUseCase.cs
../New project 3/src/Erp.Application/Faturamento/RetomarReversaoLegUseCase.cs
../New project 3/src/Erp.Application/Faturamento/CatalogoLegIntegracaoFaturamento.cs
../New project 3/src/Erp.Application/Common/Permissions/SystemPermissions.cs
../New project 3/src/Erp.Api/Controllers/Faturamento/FaturamentosController.cs
../New project 3/src/Erp.Api/Filters/ApiErrorResponseFilter.cs
```

Sem acesso a backend em execução: toda coluna "o backend entrega?" desta rodada vem de leitura direta
do código-fonte do backend (`New project 3/src`), nunca de resposta real de endpoint. Isso é o segundo
degrau da hierarquia de `01_fontes_de_verdade.md`, e é o que está disponível.

---

## 1. Tabela campo a campo

Cinco valores de destino, exatamente como o briefing definiu: `entregue e lido`, `entregue e não lido —
entra na b55 (AC-n)`, `entregue e não lido — fora (motivo/Dn)`, `divergência`, `sem destino`. Para as
duas tabelas de request (`CancelarFaturamentoRequest`, `RetomarReversaoLegRequest`), "onde a UI lê"
significa onde a UI **monta e envia** o campo — a direção do dado é invertida, o rótulo da coluna não.

### 1a. `FaturamentoResponse` — backend `FaturamentoContracts.cs:32-50` (18 campos) × frontend `faturamento.types.ts:28-42` (13 campos)

| # | Campo backend (arquivo:linha, tipo C#) | Campo frontend (arquivo:linha, tipo TS) | Onde a UI lê (arquivo:linha) | Destino |
|---|---|---|---|---|
| 1 | `Id` — `FaturamentoContracts.cs:33` (`Guid`) | `id` — `faturamento.types.ts:29` (`Guid`) | `FaturamentoDetalhePage.tsx:116` (`entidadeId={faturamento.id}`) | entregue e lido |
| 2 | `EmpresaId` — `:34` (`Guid`) | `empresaId` — `:30` | `FaturamentoDetalhePage.tsx:116` (`empresaId={faturamento.empresaId}`) | entregue e lido |
| 3 | `FilialId` — `:35` (`Guid?`) | `filialId` — `:31` (`Guid \| null` opcional) | `FaturamentoDetalhePage.tsx:116` (`filialId={faturamento.filialId}`) | entregue e lido |
| 4 | `PedidoVendaId` — `:36` (`Guid`) | `pedidoVendaId` — `:32` | `FaturamentoDetalhePage.tsx:92` (exibido cru); `FaturamentoPage.tsx:82` (coluna "Pedido") | entregue e lido |
| 5 | `NotaFiscalId` — `:37` (`Guid?`) | `notaFiscalId` — `:33` | `FaturamentoDetalhePage.tsx:93` (condicional + link para `/fiscal/notas/{id}`) | entregue e lido |
| 6 | `ContaReceberId` — `:38` (`Guid?`) | `contaReceberId` — `:34` | `FaturamentoDetalhePage.tsx:94` (condicional, exibido cru) | entregue e lido |
| 7 | `Etapa` — `:39` (`StatusFaturamento`) | `etapa` — `:35` (`StatusFaturamento \| number`) | `FaturamentoDetalhePage.tsx:68,73,74,89`; `FaturamentoPage.tsx:85` | entregue e lido |
| 8 | `ValorTotal` — `:40` (`decimal`) | `valorTotal` — `:36` (`number`) | `FaturamentoDetalhePage.tsx:90`; `FaturamentoPage.tsx:83` | entregue e lido |
| 9 | `ConfirmadoEm` — `:41` (`DateTimeOffset?`) | `confirmadoEm` — `:37` | `FaturamentoDetalhePage.tsx:91`; `FaturamentoPage.tsx:84` | entregue e lido |
| 10 | `ConfirmadoPor` — `:42` (`Guid?`) | `confirmadoPor` — `:38` | ausente — `grep -rn "confirmadoPor" features/faturamento` só acusa a própria declaração do tipo | **sem destino** (ver Divergência nova #1) |
| 11 | `CanceladoEm` — `:43` (`DateTimeOffset?`) | `canceladoEm` — `:39` | ausente, mesma medição | **sem destino** (ver Divergência nova #1) |
| 12 | `CanceladoPor` — `:44` (`Guid?`) | `canceladoPor` — `:40` | ausente, mesma medição | **sem destino** (ver Divergência nova #1) |
| 13 | `MotivoCancelamento` — `:45` (`string?`) | `motivoCancelamento` — `:41` | `FaturamentoDetalhePage.tsx:95` (condicional, `Message severity="error"`) | entregue e lido |
| 14 | `Legs` — `:46` (`IReadOnlyCollection<FaturamentoLegResponse>? = null`) | **ausente** | n/a | entregue e não lido — entra na b55 (AC-1 cria o campo; AC-2/AC-6 consomem o array) |
| 15 | `PossuiLegComFalha` — `:47` (`bool = false`) | **ausente** | n/a | entregue e não lido — entra na b55 (AC-1 cria o campo; **nenhum AC o consome**, ver Divergência nova #2) |
| 16 | `PossuiLegRevertido` — `:48` (`bool = false`) | **ausente** | n/a | entregue e não lido — entra na b55 (AC-1 cria o campo; **nenhum AC o consome**, ver Divergência nova #2) |
| 17 | `EtapaDivergeDosLegs` — `:49` (`bool = false`) | **ausente** | n/a | entregue e não lido — entra na b55 (AC-1 cria; AC-4 consome) |
| 18 | `PossuiLegEmReversao` — `:50` (`bool = false`) | **ausente** | n/a | entregue e não lido — entra na b55 (AC-1 cria; AC-5 e AC-12 consomem; D23/D27 dependem dele) |

**Confirmação de par exato nos campos já existentes (1-13):** todos os 13 campos declarados hoje no
frontend têm par exato de nome (após a conversão `PascalCase → camelCase`, que é a política padrão do
`AddControllers()` do backend — sem `JsonStringEnumConverter` nem `JsonNamingPolicy` customizada
encontrados em `Erp.Api/Program.cs`, confirmado por grep) e de forma (`Guid?`/`Guid | null opcional`,
`decimal`/`number`, `DateTimeOffset?`/`IsoDateTime | null opcional`). Nenhuma divergência de tipo entre
os dois lados nos 13 campos pré-existentes.

### 1b. `FaturamentoLegResponse` — backend `FaturamentoContracts.cs:56-62` (6 campos) × frontend **inexistente**

| # | Campo backend (arquivo:linha, tipo C#) | Campo frontend | Onde a UI vai ler | Destino |
|---|---|---|---|---|
| 1 | `Id` — `:57` (`Guid`) | ausente | `FaturamentoDetalhePage.tsx` (a criar) | entra na b55 (AC-1 cria o tipo; identidade de linha — D25 mantém as 6 linhas fixas mesmo sem registro) |
| 2 | `Leg` — `:58` (`LegIntegracaoFaturamento`) | ausente | idem | entra na b55 (AC-1; AC-2 coluna "Leg"; AC-6 condição do botão Retomar) |
| 3 | `Estado` — `:59` (`EstadoLegIntegracaoFaturamento`) | ausente | idem | entra na b55 (AC-1; AC-2 coluna "Estado"; AC-3 rótulos; AC-6) |
| 4 | `OcorreuEm` — `:60` (`DateTimeOffset`) | ausente | idem | entra na b55 (AC-2 coluna "Ocorreu em") |
| 5 | `ResponsavelId` — `:61` (`Guid?`) | ausente | idem | entra na b55 (AC-1 cria o campo; **as 5 colunas do AC-2 são "Leg, Estado, Ocorreu em, Motivo e Ação" — `ResponsavelId` não é coluna nenhuma**, ver Divergência nova #3) |
| 6 | `Motivo` — `:62` (`string?`) | ausente | idem | entra na b55 (AC-2 coluna "Motivo") |

### 1c. `FaturamentoHistoricoResponse` — backend `FaturamentoContracts.cs:64-70` (6 campos) × frontend `faturamento.types.ts:44-51` (6 campos)

| # | Campo backend | Campo frontend | Onde a UI lê (arquivo:linha) | Destino |
|---|---|---|---|---|
| 1 | `Id` — `:65` (`Guid`) | `id` — `:45` | `FaturamentoDetalhePage.tsx:108` (`dataKey="id"` da `DataTable` de Histórico) | entregue e lido |
| 2 | `StatusAnterior` — `:66` (`StatusFaturamento`) | `statusAnterior` — `:46` | `FaturamentoDetalhePage.tsx:109` (coluna "De") | entregue e lido |
| 3 | `StatusNovo` — `:67` (`StatusFaturamento`) | `statusNovo` — `:47` | `FaturamentoDetalhePage.tsx:110` (coluna "Para") | entregue e lido |
| 4 | `Observacao` — `:68` (`string`) | `observacao` — `:48` | `FaturamentoDetalhePage.tsx:111` (`field="observacao"`) | entregue e lido |
| 5 | `UsuarioId` — `:69` (`Guid?`) | `usuarioId` — `:49` | ausente — nenhuma `Column` de `FaturamentoDetalhePage.tsx:108-113` lê `usuarioId` | **sem destino** (ver Divergência nova #1) |
| 6 | `Data` — `:70` (`DateTimeOffset`) | `data` — `:50` | `FaturamentoDetalhePage.tsx:112` (coluna "Data") | entregue e lido |

### 1d. `FaturamentoOcorrenciaResponse` — backend `FaturamentoContracts.cs:72-76` (4 campos) × frontend `faturamento.types.ts:53-58` (4 campos)

| # | Campo backend | Campo frontend | Onde a UI lê (arquivo:linha) | Destino |
|---|---|---|---|---|
| 1 | `Id` — `:73` (`Guid`) | `id` — `:54` | `FaturamentoDetalhePage.tsx:100` (`dataKey="id"`) | entregue e lido |
| 2 | `Tipo` — `:74` (`TipoOcorrenciaFaturamento`) | `tipo` — `:55` | `FaturamentoDetalhePage.tsx:101` (coluna "Tipo", `Tag`) | entregue e lido |
| 3 | `Mensagem` — `:75` (`string`) | `mensagem` — `:56` | `FaturamentoDetalhePage.tsx:102` (`field="mensagem"`) | entregue e lido |
| 4 | `Data` — `:76` (`DateTimeOffset`) | `data` — `:57` | `FaturamentoDetalhePage.tsx:103` (coluna "Data") | entregue e lido |

Todos os 4 campos, dos dois lados, batem. Nenhum "sem destino" nesta tabela.

### 1e. `CancelarFaturamentoRequest` — backend `FaturamentoContracts.cs:105-106` (1 campo) × frontend `faturamentoSchemas.ts:34`

| # | Campo backend | Campo frontend | Onde a UI monta/envia (arquivo:linha) | Destino |
|---|---|---|---|---|
| 1 | `Motivo` — `:106` (`string`, `CancelarFaturamentoRequestValidator.cs:35` exige `NotEmpty().MaximumLength(300)`) | `motivo` — `faturamentoSchemas.ts:34` (`cancelarFaturamentoSchema = z.object({ motivo: textRequired(...) })`, sem teto de tamanho) | Capturado em `ReasonDialog` (`FaturamentoDetalhePage.tsx:119`), passado para `cancelar(motivo)` (`:58-66`), enviado por `faturamentoApi.ts:73-78` | entregue e lido — fluxo já funcional hoje, **mas sem o teto de 300 caracteres do backend** (ver Divergência nova #4) |

### 1f. `RetomarReversaoLegRequest` — backend `FaturamentoContracts.cs:137-140` (3 campos) × frontend **inexistente**

| # | Campo backend (arquivo:linha, tipo C#, validação) | Campo frontend | Onde a UI vai montar/enviar | Destino |
|---|---|---|---|---|
| 1 | `Leg` — `:138` (`LegIntegracaoFaturamento`; `FaturamentoValidators.cs:48` `IsInEnum()`) | ausente | `RetomarReversaoDialog` (a criar) | entra na b55 (AC-8: leg vem da linha, só leitura; AC-9: payload) |
| 2 | `Acao` — `:139` (`AcaoRetomadaReversaoLeg`; `:49` `IsInEnum()`) | ausente | idem | entra na b55 (AC-8: `Dropdown` sem valor inicial; AC-9) |
| 3 | `Motivo` — `:140` (`string`; `:50` `NotEmpty().MaximumLength(500)`, e `FaturamentoLegIntegracao.cs:91` trunca em 500 no domínio) | ausente | idem | entra na b55 (AC-8: `InputTextarea` 1-500 após trim; AC-9) |

---

## 2. Enums

Serialização confirmada como numérica: não há `JsonStringEnumConverter` nem política de enum
customizada em `Erp.Api/Program.cs` (grep sem ocorrência), então os quatro enums abaixo trafegam como
`int` no JSON — o que os quatro `nativeEnum`/`Record<number,...>` do frontend já pressupõem.

### `StatusFaturamento` — já existe nos dois lados

| Valor | Backend (`StatusFaturamento.cs:3-12`) | Frontend (`faturamento.types.ts:3-11`) |
|---|---|---|
| 1 | `Rascunho` | `Rascunho` |
| 2 | `PendenteFiscal` | `PendenteFiscal` |
| 3 | `FiscalAutorizado` | `FiscalAutorizado` |
| 4 | `EstoqueProcessado` | `EstoqueProcessado` |
| 5 | `Faturado` | `Faturado` |
| 6 | `Cancelado` | `Cancelado` |
| 7 | `Erro` | `Erro` |

**Par exato.** Os 7 valores batem nome a nome e número a número. Esta é a classe de defeito da
`b54.c1`/`c2` (enum do frontend sem par com o backend), e aqui ela **não** ocorre.

### `TipoOcorrenciaFaturamento` — já existe nos dois lados

| Valor | Backend (`FaturamentoOcorrencia.cs:5-10`) | Frontend (`faturamento.types.ts:13-17`) |
|---|---|---|
| 1 | `Informativa` | `Informativa` |
| 2 | `Alerta` | `Alerta` |
| 3 | `Erro` | `Erro` |

**Par exato.** Mesma conclusão do anterior.

### `LegIntegracaoFaturamento` — não existe no frontend

| Valor | Backend (`FaturamentoLegIntegracao.cs:12-20`) | Frontend |
|---|---|---|
| 1 | `GerarNotaFiscal` | ausente |
| 2 | `GerarXmlEnvio` | ausente |
| 3 | `AssinarXml` | ausente |
| 4 | `TransmitirAutorizarSefaz` | ausente |
| 5 | `BaixarEstoque` | ausente |
| 6 | `GerarContaReceber` | ausente |

Confirma a armadilha 1 do plano, valor a valor, por leitura direta do arquivo (não por confiar no que
o plano já transcreveu).

### `EstadoLegIntegracaoFaturamento` — não existe no frontend

| Valor | Backend (`FaturamentoLegIntegracao.cs:31-65`) | Frontend |
|---|---|---|
| 1 | `Integrado` | ausente |
| 2 | `Falhou` | ausente |
| 3 | `Revertido` | ausente |
| 4 | `EmReversao` | ausente |

Confirma a armadilha 1 e a armadilha 2 (4 estados, não 3 — o documento de fluxos está desatualizado, o
código é quem vale).

### `AcaoRetomadaReversaoLeg` — não existe no frontend

| Valor | Backend (`FaturamentoContracts.cs:124-128`) | Frontend |
|---|---|---|
| 1 | `ReaplicarInversa` | ausente |
| 2 | `DeclararEfeitoDesfeito` | ausente |

Confirma a armadilha 1.

---

## 3. Permissão por endpoint

| Endpoint | Permissão do controller (arquivo:linha) | Guard na tela (arquivo:linha) | Situação |
|---|---|---|---|
| `GET /api/faturamento` | `FaturamentoConsultar` — `FaturamentosController.cs:22` | `hasPermission('FATURAMENTO_CONSULTAR')`, gate de página — `FaturamentoPage.tsx:49-51` | bate |
| `GET /api/faturamento/{id}` | `FaturamentoConsultar` — `:31` | `hasPermission('FATURAMENTO_CONSULTAR')`, gate de página — `FaturamentoDetalhePage.tsx:43-45` | bate |
| `GET /api/faturamento/{id}/historico` | `FaturamentoConsultar` — `:40` | mesmo gate de página, `:43-45` | bate |
| `GET /api/faturamento/{id}/ocorrencias` | `FaturamentoConsultar` — `:49` | mesmo gate de página, `:43-45` | bate |
| `POST /api/faturamento/preparar` | `FaturamentoPreparar` — `:58` | `PermissionGuard permission="FATURAMENTO_PREPARAR"` — `FaturamentoPage.tsx:72` | bate |
| `POST /api/faturamento/{id}/confirmar` | `FaturamentoConfirmar` — `:67` | `PermissionGuard permission="FATURAMENTO_CONFIRMAR"` — `FaturamentoDetalhePage.tsx:73` | bate |
| `POST /api/faturamento/{id}/cancelar` | `FaturamentoCancelar` — `:86` | `PermissionGuard permission="FATURAMENTO_CANCELAR"` — `FaturamentoDetalhePage.tsx:74` | bate |
| `POST /api/faturamento/{id}/retomar-reversao` | `FaturamentoRetomarReversao` — `:100` | ausente hoje; o plano (AC-6/AC-7) exige `PermissionGuard permission="FATURAMENTO_RETOMAR_REVERSAO" mode="disable"` na coluna Ação, só na linha com `estado === EmReversao` | entra na b55 |

`FATURAMENTO_RETOMAR_REVERSAO` **já existe** no union (`types/erp.ts:315`) e no catálogo
(`features/seguranca/permissoesCatalogo.ts:148`) — não é acréscimo desta fatia. Medido por
`git log --all --oneline -S"FATURAMENTO_RETOMAR_REVERSAO" -- types/erp.ts
features/seguranca/permissoesCatalogo.ts`: entrou no commit `4cf6a49`
("v1.11.0a8b50 — fechar o registro de permissões"), muito antes desta fatia existir. Confirma a parte
de D29 que diz "union intacto" e a AC-14 (esses dois arquivos ficam sem diff nesta fatia).

Permissão interna sem atributo de rota, fora do escopo por D24: `FaturamentoReverterIntegracao`
(`SystemPermissions.cs:163`) é checada só dentro de `CancelarFaturamentoUseCase.cs:144`, sem
`[RequiredPermission]` próprio no controller e sem guard nenhum na tela hoje. Confirmado por leitura
direta — não é achado novo, é a mesma coisa que a armadilha 8 já registra.

---

## 4. Conta de campos

Duas contagens, para não deixar ambiguidade sobre o que "o que a UI lê" quer dizer.

**4a. O que a UI lê hoje (produção, antes da b55), contra as seis tabelas do item 1:**

```text
lidos pela UI hoje = 20   (10 de FaturamentoResponse + 5 de Historico + 4 de Ocorrencia + 1 de Cancelar)
entregues e batendo = 20  (nenhuma divergência de forma nos campos já lidos)
divergências = 0
sem destino (dentro do que é lido) = 0

20 = 20 + 0 + 0   ✓ fecha.
```

Como foi medido: contagem de linhas marcadas `entregue e lido` nas tabelas 1a, 1c, 1d e 1e. As
tabelas 1b e 1f (`FaturamentoLegResponse`, `RetomarReversaoLegRequest`) não entram nesta soma porque
nada ali é lido hoje — a feature não existe.

**4b. Todos os campos dos 6 tipos backend inventariados, pelos cinco valores de destino do item 1:**

```text
total de campos nos 6 tipos = 38    (18 + 6 + 6 + 4 + 1 + 3)
entregue e lido               = 20
entregue e não lido, entra b55 = 14  (5 de FaturamentoResponse + 6 de FaturamentoLegResponse + 3 de RetomarReversaoLegRequest)
sem destino                    = 4   (confirmadoPor, canceladoEm, canceladoPor, usuarioId)
divergência                    = 0
entregue e não lido, fora      = 0

38 = 20 + 14 + 4 + 0 + 0   ✓ fecha. Status NÃO é blocked.
```

Como foi medido: soma das linhas de cada uma das tabelas 1a-1f, uma a uma, por destino.
`FaturamentoContracts.cs:32-140` para o lado backend; `faturamento.types.ts:28-58` e
`faturamentoSchemas.ts:34` para o lado frontend.

---

## 5. Divergências novas

Nenhuma das quatro abaixo está coberta pelas armadilhas 1 a 11 nem pelas decisões D21 a D29. Não
decido o destino — aponto e devolvo para a sessão principal.

### #1 — Quatro campos que o backend já entrega e a UI nunca lê, em produção, antes da b55

`FaturamentoResponse.confirmadoPor` (`FaturamentoContracts.cs:42`), `.canceladoEm` (`:43`),
`.canceladoPor` (`:44`) e `FaturamentoHistoricoResponse.usuarioId` (`:69`) estão declarados no tipo do
frontend hoje (`faturamento.types.ts:38-40,49`) e nunca aparecem em nenhuma `Column`, `body` ou string
de `FaturamentoDetalhePage.tsx`. Evidência: `grep -rn "confirmadoPor\|canceladoEm\|canceladoPor"
features/faturamento` só acusa a linha de declaração do tipo; nenhuma leitura em componente.
Diferença para a classe `D10`/`D11`/`D15` (campo lido que não existe no backend): aqui é o oposto — o
campo **existe** dos dois lados, mas ninguém olha "quem confirmou" nem "quem cancelou" nem "quando foi
cancelado" nem "quem fez a transição de histórico". Não é achado desta fatia (os quatro já estavam
assim antes de `b55` começar) e nenhuma decisão cobre isso.
Proposta de destino: `sessão principal decide` — exibir (ex.: "Confirmado por" ao lado de "Confirmado
em", já que a tela mostra a data mas não o autor) ou registrar como aceito.

### #2 — `PossuiLegComFalha` e `PossuiLegRevertido` entram no tipo pela AC-1, mas nenhum AC os lê

`FaturamentoContracts.cs:47-48` declara os dois booleanos, e o Bloco A (item 1) do plano manda
acrescentá-los ao tipo do frontend. Conferi as 16 linhas de critério de aceite (§5 do plano, AC-1 a
AC-16) uma a uma: nenhuma menciona `possuiLegComFalha` nem `possuiLegRevertido`. Só
`etapaDivergeDosLegs` (AC-4) e `possuiLegEmReversao` (AC-5, AC-12) têm consumidor. Se o Bloco A seguir
o plano ao pé da letra, a b55 termina com dois campos novos, tipados, entregues pelo backend, e sem
nenhuma linha de UI que os leia — exatamente o padrão que motivou a Divergência #1, só que nascendo já
nesta fatia em vez de ter sobrado de uma anterior.
Proposta de destino: `sessão principal decide` — criar um AC que os consuma (ex.: um indicador na linha
do faturamento na listagem foi descartado por D26, mas um indicador **no detalhe**, fora da tabela de
legs, não teria o mesmo problema de N+1) ou aceitar que entram "mortos" e documentar.

### #3 — `FaturamentoLegResponse.ResponsavelId` entra no tipo pela AC-1, mas as 5 colunas do AC-2 não o mostram

`FaturamentoContracts.cs:61` declara `Guid? ResponsavelId` na linha do leg — "quem" registrou a última
tentativa. O plano (§6, Bloco A, item 7) descreve a tabela de legs com as colunas "Leg, Estado, Ocorreu
em, Motivo e Ação" — 5 colunas, nenhuma delas "Quem"/"Responsável". Mesma classe da Divergência #2: o
campo entra no tipo (`FaturamentoLegResponse`, AC-1) e fica sem consumidor.
Proposta de destino: `sessão principal decide` — acrescentar uma sexta coluna, ou aceitar que o campo
fica só no tipo por ora (é `Guid`, exigiria resolver nome de usuário, o que nenhuma outra coluna desta
tela faz hoje).

### #4 — `cancelarFaturamentoSchema` não aplica o teto de 300 caracteres que o backend exige

`CancelarFaturamentoRequestValidator.cs:35` (`Erp.Application/Faturamento/FaturamentoValidators.cs`)
exige `NotEmpty().MaximumLength(300)` para `Motivo`. `faturamentoSchemas.ts:34`
(`cancelarFaturamentoSchema = z.object({ motivo: textRequired('Informe o motivo.') })`) só exige
não-vazio, sem teto. Hoje um operador pode digitar um motivo de cancelamento com mais de 300 caracteres,
o formulário aceita, e só o `POST` devolve 400. Não é a armadilha 4 (que é sobre o motivo da retomada,
teto 500, endpoint diferente) — é o mesmo tipo de lacuna, no endpoint de cancelar, que por D24 está fora
do fluxo que esta fatia reconstrói, mas o arquivo de schema que a guarda é o mesmo que o Bloco A vai
editar para criar `retomarReversaoLegSchema`.
Proposta de destino: `sessão principal decide` — corrigir junto (é uma linha, `.max(300, ...)`) ou
registrar como fora por D24 e deixar para a fatia de cancelamento.

---

## 6. Confirmação ou correção das contagens do planner

O plano (`docs/fatias/v1.11.0a8b55-f2-legs-faturamento.md`, §7, passo 2) afirma: "São 17 campos em
`FaturamentoResponse` contra 13 em `faturamento.types.ts:28-42`, 6 em `FaturamentoLegResponse`, 3 no
request e 3 enums."

| Contagem do planner | Medição desta rodada | Como medi | Resultado |
|---|---|---|---|
| 17 campos em `FaturamentoResponse` (backend) | **18** | Contei os parâmetros posicionais do `record` em `FaturamentoContracts.cs:32-50` — são as linhas 33 a 50, uma por campo: `Id, EmpresaId, FilialId, PedidoVendaId, NotaFiscalId, ContaReceberId, Etapa, ValorTotal, ConfirmadoEm, ConfirmadoPor, CanceladoEm, CanceladoPor, MotivoCancelamento, Legs, PossuiLegComFalha, PossuiLegRevertido, EtapaDivergeDosLegs, PossuiLegEmReversao` = 18 nomes | **corrige o planner.** O próprio `risk.yaml`/§0 do plano já apontava a razão: "legs, 4 booleanos" — 1 + 4 = 5 campos novos, e `13 + 5 = 18`, não 17. A conta de `17` estava, ela mesma, inconsistente com a frase "4 booleanos" escrita ao lado |
| 13 em `faturamento.types.ts:28-42` (frontend) | **13** | Contei as propriedades do `type FaturamentoResponse` em `faturamento.types.ts:28-42` — linhas 29 a 41, uma por campo | confirma o planner |
| 6 em `FaturamentoLegResponse` | **6** | Contei os parâmetros de `FaturamentoContracts.cs:56-62` — `Id, Leg, Estado, OcorreuEm, ResponsavelId, Motivo` | confirma o planner |
| 3 no request | **3**, para `RetomarReversaoLegRequest` (`FaturamentoContracts.cs:137-140`: `Leg, Acao, Motivo`) | Contei os parâmetros do `record` | confirma o planner, com uma ressalva: existem **dois** requests nesta fatia. `CancelarFaturamentoRequest` (`:105-106`) tem só **1** campo (`Motivo`) — o planner não estava se referindo a ele, e eu confirmo os dois números separadamente para não deixar ambíguo qual "request" a frase citava |
| 3 enums | **3** | `LegIntegracaoFaturamento` (6 valores), `EstadoLegIntegracaoFaturamento` (4 valores), `AcaoRetomadaReversaoLeg` (2 valores) — nenhum dos três existe hoje em `faturamento.types.ts` (`grep -n "enum Leg\|enum Estado\|enum Acao" features/faturamento/types/faturamento.types.ts` sem ocorrência) | confirma o planner |

A única correção é a primeira, e ela muda a soma de referência que o Bloco A vai usar para conferir o
próprio trabalho: `13 (existentes) + 5 (novos: legs + 4 booleanos) = 18`, não `17`. Um teste de
regressão que afirme "17 campos" (por exemplo, contando chaves de um objeto mockado) nasceria errado.

---

## O que fica fora deste inventário, nomeadamente

- `TipoDocumentoFiscal` e o restante do fluxo de `ConfirmarFaturamentoRequest`/`PrepararFaturamentoRequest` —
  não fazem parte do recorte de legs/retomada; não inventariados.
- `PrepararFaturamentoResponse` e `ConfirmarFaturamentoResponse` — não estão na lista de 6 tipos do
  briefing; ambos **contêm** `FaturamentoResponse` aninhado (`faturamento: FaturamentoResponse`), então
  toda a tabela 1a se aplica a eles por composição, mas não os tratei como tipos próprios.
- Ordem de exibição de histórico/ocorrências (a mais nova embaixo) — já registrado no plano como fora
  de escopo (refino F5), confirmado aqui só por leitura de `FaturamentoConsultaUseCases.cs:87-89,112-114`
  (`OrderBy(x => x.Data)`, ascendente), sem reabrir.
- GUID cru de pedido e de conta a receber no detalhe (`FaturamentoDetalhePage.tsx:92,94`) — já nomeado
  no plano §8 como destino F5; não reaberto aqui.
- A resposta de `cancelar` e de `retomar-reversao`: confirmei por leitura de `IFaturamentoService.cs:13,16`
  e `FaturamentoService.cs:54,57` que os dois retornam `FaturamentoResponse` puro (não
  `OrdemServicoResponse`, que é o que o documento de contrato erra — armadilha 3), e que o frontend já
  tipa `cancelar()` corretamente (`faturamentoApi.ts:76`, `httpClient.post<FaturamentoResponse>`). Não é
  achado novo, é confirmação de algo que o plano já sabia.
- `scripts/backend-contract-map.allowlist.json` não tem nenhuma entrada de `faturamento` em
  `legacyReferences` (`grep -n "faturamento" scripts/backend-contract-map.allowlist.json`, zero
  ocorrências) — esperado, porque esse arquivo só registra rota **divergente**, e a rota de
  `retomar-reversao` bate em caminho; a lacuna que D22 resolve é no documento-fonte que o gate lê, não
  neste allowlist. `tests/unit/backendContractMap.test.ts:68` ainda afirma `toHaveLength(576)` — o
  Bloco B da b55 é quem sobe para 577, como D22 já define.

---

```json
{
  "agent": "inventariante-contrato-tela",
  "slice": "v1.11.0a8b55",
  "node": "inventario",
  "assunto": "legs-faturamento",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/02-inventario-legs-faturamento.md",
  "changedFiles": [
    "docs/arquitetura/debate/02-inventario-legs-faturamento.md"
  ],
  "gates": {
    "validate:source": "not_run",
    "typecheck": "not_run",
    "lint": "not_run",
    "build": "not_run"
  },
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [],
  "measurements": [
    { "o_que": "campos em FaturamentoResponse (backend)", "valor": 18, "como": "contagem dos parametros posicionais do record em FaturamentoContracts.cs:32-50 (linhas 33 a 50)" },
    { "o_que": "campos em FaturamentoResponse (frontend)", "valor": 13, "como": "contagem das propriedades do type literal em faturamento.types.ts:28-42 (linhas 29 a 41)" },
    { "o_que": "campos em FaturamentoLegResponse (backend)", "valor": 6, "como": "contagem dos parametros posicionais em FaturamentoContracts.cs:56-62" },
    { "o_que": "campos em CancelarFaturamentoRequest (backend)", "valor": 1, "como": "contagem dos parametros posicionais em FaturamentoContracts.cs:105-106" },
    { "o_que": "campos em RetomarReversaoLegRequest (backend)", "valor": 3, "como": "contagem dos parametros posicionais em FaturamentoContracts.cs:137-140" },
    { "o_que": "campos em FaturamentoHistoricoResponse, backend x frontend", "valor": "6 x 6, par exato", "como": "FaturamentoContracts.cs:64-70 comparado linha a linha com faturamento.types.ts:44-51" },
    { "o_que": "campos em FaturamentoOcorrenciaResponse, backend x frontend", "valor": "4 x 4, par exato", "como": "FaturamentoContracts.cs:72-76 comparado linha a linha com faturamento.types.ts:53-58" },
    { "o_que": "valores de StatusFaturamento, backend x frontend", "valor": "7 x 7, par exato", "como": "StatusFaturamento.cs:3-12 comparado valor a valor com faturamento.types.ts:3-11" },
    { "o_que": "valores de TipoOcorrenciaFaturamento, backend x frontend", "valor": "3 x 3, par exato", "como": "FaturamentoOcorrencia.cs:5-10 comparado valor a valor com faturamento.types.ts:13-17" },
    { "o_que": "enums novos sem par no frontend (armadilha 1)", "valor": 3, "como": "leitura direta de FaturamentoLegIntegracao.cs:12-20,31-65 e FaturamentoContracts.cs:124-128, confirmado ausente por grep em faturamento.types.ts" },
    { "o_que": "total de campos nos 6 tipos backend inventariados", "valor": 38, "como": "soma 18+6+6+4+1+3, uma tabela por tipo na secao 1" },
    { "o_que": "distribuicao dos 38 campos por destino", "valor": "entregue e lido=20, entra na b55=14, sem destino=4, divergencia=0, fora=0", "como": "contagem manual de cada linha das tabelas 1a-1f por valor de destino; soma fecha 38=20+14+4+0+0" },
    { "o_que": "campos lidos pela UI hoje, antes da b55", "valor": 20, "como": "contagem das linhas 'entregue e lido' nas tabelas 1a, 1c, 1d, 1e" },
    { "o_que": "ocorrencias de legs/possuiLeg/etapaDiverge em FaturamentoPage.tsx", "valor": 0, "como": "grep -n \"legs\\|possuiLeg\\|etapaDiverge\" features/faturamento/components/FaturamentoPage.tsx, exit code 1 (D26 confirmado)" },
    { "o_que": "ocorrencias de retomarReversao/RETOMAR_REVERSAO em features/faturamento hoje", "valor": 0, "como": "grep -rn \"RETOMAR_REVERSAO|retomarReversao|RetomarReversao\" features/faturamento/, exit code 1" },
    { "o_que": "tamanho do catalogo de rotas em backendContractMap.test.ts antes da b55", "valor": 576, "como": "grep \"toHaveLength\" tests/unit/backendContractMap.test.ts:68 -- confirma o ponto de partida que D22 muda para 577" },
    { "o_que": "commit que introduziu FATURAMENTO_RETOMAR_REVERSAO no union e no catalogo", "valor": "4cf6a49 (v1.11.0a8b50)", "como": "git log --all --oneline -S\"FATURAMENTO_RETOMAR_REVERSAO\" -- types/erp.ts features/seguranca/permissoesCatalogo.ts" }
  ],
  "risks": [
    "Divergência nova #1: FaturamentoResponse.confirmadoPor/.canceladoEm/.canceladoPor e FaturamentoHistoricoResponse.usuarioId ja sao entregues pelo backend e declarados no tipo, e nunca sao lidos por nenhuma tela — sem decisao que cubra.",
    "Divergência nova #2: PossuiLegComFalha e PossuiLegRevertido entram no tipo pela AC-1 e nenhum AC do plano os consome — podem terminar a b55 como campo tipado sem leitor.",
    "Divergência nova #3: FaturamentoLegResponse.ResponsavelId entra no tipo pela AC-1 e nenhuma das 5 colunas do AC-2 o exibe.",
    "Divergência nova #4: cancelarFaturamentoSchema nao aplica o teto de 300 caracteres que CancelarFaturamentoRequestValidator.cs:35 exige no backend.",
    "Correção de contagem: FaturamentoResponse tem 18 campos no backend, nao 17 como o planner registrou em docs/fatias/v1.11.0a8b55-f2-legs-faturamento.md secao 7 passo 2 — a soma de referencia do Bloco A deve usar 18."
  ],
  "blockers": [],
  "redTests": [],
  "handoff": {
    "testsRequired": false,
    "e2eRequired": false,
    "qaReviewRequired": false,
    "notes": "Nenhuma divergencia encontrada bloqueia o builder: as quatro sao aditivas (campo que entra sem consumidor, ou validacao que falta), nao contrato quebrado. O Bloco A pode comecar com a contagem corrigida (18, nao 17) como referencia de FaturamentoResponse."
  },
  "nextRecommendedAgent": "dev-senior-react"
}
```
