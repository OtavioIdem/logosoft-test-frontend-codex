# Inventário — Impostos e valores acessórios da nota fiscal (fatia `v1.11.0a8b56`)

Agente: `inventariante-contrato-tela`. Nó: `inventario`. Não propõe solução nem desenho — confere as
contagens do `planner` campo a campo contra o backend e a tela, para o `dev-senior-react` (Bloco de
trabalho) trabalhar sobre número medido, não estimado.

Recorte lido (frontend):

```text
features/fiscal/components/NotaFiscalDetalhePage.tsx
features/fiscal/components/FiscalActionDialogs.tsx (só ImpostoNotaFiscalDialog e o que lê nota.*/row.*)
features/fiscal/components/fiscalUiUtils.ts
features/fiscal/types/fiscal.types.ts:113-171 (ImpostoNotaFiscalResponse, NotaFiscalResponse)
features/fiscal/schemas/fiscalSchemas.ts (confirmação de ausência)
features/fiscal/api/fiscalApi.ts, features/fiscal/hooks/useFiscalResources.ts (confirmação de ausência)
types/erp.ts (StatusNotaFiscal)
features/seguranca/permissoesCatalogo.ts, types/erp.ts (só FISCAL_GERENCIAR)
```

Backend, só leitura, lido:

```text
Erp.Application/Fiscal/NotasFiscais/NotaFiscalResponse.cs:43-86 (NotaFiscalResponse), :220-234 (ImpostoNotaFiscalResponse)
Erp.Application/Fiscal/NotasFiscais/NotaFiscalRequests.cs:104-107 (DefinirValoresAcessoriosNotaFiscalRequest), :133-140 (AdicionarImpostoNotaFiscalRequest)
Erp.Application/Fiscal/NotasFiscais/NotaFiscalValidators.cs:108-116
Erp.Application/Fiscal/FiscalNotaFiscalMapper.cs:8-45 (ParaResponse(NotaFiscal)), :73-85 (ParaResponse(ImpostoNotaFiscal))
Erp.Domain/Fiscal/ImpostoNotaFiscal.cs:1-137 (OrigemImpostoNotaFiscal, entidade)
Erp.Domain/Fiscal/EnumsFiscal.cs:35-56 (StatusNotaFiscal, com Descartada = 11)
Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:85-110
Erp.Api/Program.cs (grep JsonStringEnumConverter) + grep recursivo no repo inteiro
docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1444-1483 (catálogo + adendo D22/D36)
docs/backend-v1.23/CONTRATO-API-v1.23.md:10130-10200 (bloco de NotaFiscalResponse e da rota valores-acessorios)
```

Sem acesso a backend em execução: toda coluna "o backend entrega?" desta rodada vem de leitura direta
do código-fonte do backend (`New project 3/src`), nunca de resposta real de endpoint. Segundo degrau da
hierarquia de `01_fontes_de_verdade.md`.

---

## 1. `NotaFiscalResponse` — backend (33 campos) × frontend (27 campos)

**Contagem do planner:** "C# 33, TS 27 = 27 − `pessoaId` (sem par) + 7 ausentes." **Confirmado, exato.**

Medição: parâmetros posicionais do `record` em `NotaFiscalResponse.cs:44-86` (linha por campo, 33
nomes: `Id, EmpresaId, FilialId, TipoDocumento, TipoOperacao, Origem, OrigemId, Serie, Numero,
NumeroDocumento, ChaveAcesso, ProtocoloAutorizacao, DataEmissao, AutorizadaEm, CanceladaEm, StatusFiscal,
ValorProdutos, ValorDesconto, ValorFrete, ValorSeguro, ValorOutrasDespesas, ValorTotal, CodigoRejeicao,
MensagemRejeicao, MotivoCancelamento, Observacao, Itens, Impostos, Xmls, Eventos, ValorIpi, ValorIcmsSt,
ValorFcpSt`), confirmado igual à ordem do construtor do mapper (`FiscalNotaFiscalMapper.cs:9-45`) —
nenhum campo do record fica sem argumento no `new(...)`, nenhum argumento sobra. Lado frontend:
propriedades do `type NotaFiscalResponse` em `fiscal.types.ts:143-171` (27 nomes, incluindo `pessoaId`
que o backend não tem).

| # | Campo backend (linha, tipo C#) | Campo frontend (linha, tipo TS) | Onde a UI lê hoje (arquivo:linha) | Destino |
|---|---|---|---|---|
| 1 | `Id` — `:44` (`Guid`) | `id` — `:144` (`Guid`) | ausente nos 3 arquivos (`grep -n "nota\.id\b" ...` sem ocorrência) | **sem destino** |
| 2 | `EmpresaId` — `:45` | `empresaId` — `:145` | `NotaFiscalDetalhePage.tsx:209,328,342` | entregue e lido |
| 3 | `FilialId` — `:46` (`Guid?`) | `filialId` — `:146` | `NotaFiscalDetalhePage.tsx:210,328,342` | entregue e lido |
| 4 | `TipoDocumento` — `:47` | `tipoDocumento` — `:147` | `NotaFiscalDetalhePage.tsx:207` (`tipoDocumentoFiscalLabel`) | entregue e lido |
| 5 | `TipoOperacao` — `:48` | `tipoOperacao` — `:148` | `NotaFiscalDetalhePage.tsx:208` | entregue e lido |
| 6 | `Origem` — `:49` | `origem` — `:149` | `NotaFiscalDetalhePage.tsx:211` (`fiscalOrigemContextLabel`) | entregue e lido |
| 7 | `OrigemId` — `:50` (`Guid?`) | `origemId` — `:150` | `NotaFiscalDetalhePage.tsx:211` | entregue e lido |
| — | *(sem par)* | `pessoaId` — `:151` (`Guid \| null` opcional) | ausente nos 3 arquivos (usado só em filtros de listagem/`GerarNotaFiscalPedidoVendaRequest`, fora do recorte) | **divergência** (campo do tipo sem par no record `NotaFiscalResponse`; existe só em `NotaFiscalListagemItemResponse` do backend) |
| 8 | `Serie` — `:51` | `serie` — `:152` | `NotaFiscalDetalhePage.tsx:184` (título) | entregue e lido |
| 9 | `Numero` — `:52` | `numero` — `:153` | `NotaFiscalDetalhePage.tsx:184,341,342` | entregue e lido |
| 10 | `NumeroDocumento` — `:59` (`int?`) | **ausente** | n/a | fora do escopo, destino declarado: "fatia da classe de campo fantasma do fiscal, depois de B-2" (§8 do plano) |
| 11 | `ChaveAcesso` — `:60` (`string?`) | `chaveAcesso` — `:154` | `NotaFiscalDetalhePage.tsx:212` | entregue e lido |
| 12 | `ProtocoloAutorizacao` — `:61` (`string?`) | `protocoloAutorizacao` — `:155` | `NotaFiscalDetalhePage.tsx:213` | entregue e lido |
| 13 | `DataEmissao` — `:62` | `dataEmissao` — `:156` | `NotaFiscalDetalhePage.tsx:214` | entregue e lido |
| 14 | `AutorizadaEm` — `:63` (`DateTimeOffset?`) | `autorizadaEm` — `:157` | `NotaFiscalDetalhePage.tsx:215` | entregue e lido |
| 15 | `CanceladaEm` — `:64` (`DateTimeOffset?`) | `canceladaEm` — `:158` | `NotaFiscalDetalhePage.tsx:216` | entregue e lido |
| 16 | `StatusFiscal` — `:65` | `statusFiscal` — `:159` | `NotaFiscalDetalhePage.tsx:206,226`; `fiscalUiUtils.ts:207-236` (todas as `notaPode*` e `notaFiscalBloqueiosVisuais`) | entregue e lido |
| 17 | `ValorProdutos` — `:66` (`decimal`) | `valorProdutos` — `:160` (`number`) | ausente nos 3 arquivos | entregue e não lido — **entra na b56** (objetivo §1: "vê do que o total é feito — produtos, desconto...") |
| 18 | `ValorDesconto` — `:67` | `valorDesconto` — `:161` | ausente nos 3 arquivos | entregue e não lido — **entra na b56** (mesmo motivo) |
| 19 | `ValorFrete` — `:69` (`decimal`) | **ausente** | n/a | **entra na b56** (objetivo §1 + D33, escrita via `DefinirValoresAcessoriosNotaFiscalRequest`) |
| 20 | `ValorSeguro` — `:70` | **ausente** | n/a | **entra na b56** |
| 21 | `ValorOutrasDespesas` — `:71` | **ausente** | n/a | **entra na b56** |
| 22 | `ValorTotal` — `:72` | `valorTotal` — `:162` | `NotaFiscalDetalhePage.tsx:217` (`formatFiscalMoney`) | entregue e lido |
| 23 | `CodigoRejeicao` — `:73` (`string?`) | `codigoRejeicao` — `:163` | `NotaFiscalDetalhePage.tsx:219` | entregue e lido |
| 24 | `MensagemRejeicao` — `:74` (`string?`) | `mensagemRejeicao` — `:164` | `NotaFiscalDetalhePage.tsx:219` | entregue e lido |
| 25 | `MotivoCancelamento` — `:75` (`string?`) | `motivoCancelamento` — `:165` | `NotaFiscalDetalhePage.tsx:220` | entregue e lido |
| 26 | `Observacao` — `:76` (`string?`) | `observacao` — `:166` | ausente nos 3 arquivos | **sem destino** |
| 27 | `Itens` — `:77` | `itens` — `:167` | `NotaFiscalDetalhePage.tsx:280-291` (`DataTable`), `:208(validar)`, `FiscalActionDialogs.tsx:228` (`ImpostoNotaFiscalDialog itens=`) | entregue e lido |
| 28 | `Impostos` — `:78` | `impostos` — `:168` | `NotaFiscalDetalhePage.tsx:293-301` (`DataTable`) | entregue e lido |
| 29 | `Xmls` — `:79` | `xmls` — `:169` | `NotaFiscalDetalhePage.tsx:303-311` (`DataTable`) | entregue e lido |
| 30 | `Eventos` — `:80` | `eventos` — `:170` | `NotaFiscalDetalhePage.tsx:313-321` (`DataTable`) | entregue e lido |
| 31 | `ValorIpi` — `:84` (`decimal = 0m`) | **ausente** | n/a | **entra na b56** (D34: agregado lido, não re-somado) |
| 32 | `ValorIcmsSt` — `:85` (`decimal = 0m`) | **ausente** | n/a | **entra na b56** (D34) |
| 33 | `ValorFcpSt` — `:86` (`decimal = 0m`) | **ausente** | n/a | **entra na b56** (D34) |

**Confirmação de par exato nos 22 campos hoje lidos e nos demais 5 já existentes no TS (`ValorProdutos`,
`ValorDesconto`, `Id`, `Observacao`, `pessoaId` à parte):** nenhuma divergência de tipo — `Guid?`/`Guid |
null` opcional, `decimal`/`number`, `DateTimeOffset?`/`IsoDateTime | null` opcional, todos batem. A única
divergência estrutural é `pessoaId` (linha "—" acima), que existe no TS e não tem par no record
`NotaFiscalResponse` do backend (existe só em `NotaFiscalListagemItemResponse.cs:9-...`, tipo diferente,
já coberto por B-2 no plano).

**Fechamento da conta (34 linhas = 33 campos do backend + 1 campo extra do frontend sem par):**

```text
entregue e lido hoje        = 22
entra na b56                = 8   (ValorProdutos, ValorDesconto, ValorFrete, ValorSeguro,
                                    ValorOutrasDespesas, ValorIpi, ValorIcmsSt, ValorFcpSt)
fora do escopo, com destino = 1   (NumeroDocumento -> depois de B-2)
sem destino                 = 2   (Id, Observacao)
divergência (sem par)       = 1   (pessoaId, extra no TS)

22 + 8 + 1 + 2 = 33  ✓ fecha o universo dos 33 campos do backend.
+ 1 divergência (pessoaId) fora do universo dos 33, contada à parte.
```

Como foi medido: contagem manual de cada uma das 33 linhas do backend, cruzada com grep de cada nome de
campo (`grep -n "nota\.<campo>\b"`) nos três arquivos do recorte.

---

## 2. `ImpostoNotaFiscalResponse`, `DefinirValoresAcessoriosNotaFiscalRequest` e `OrigemImpostoNotaFiscal`

### 2a. `ImpostoNotaFiscalResponse` — backend (11 campos) × frontend (8 campos)

**Contagem do planner:** "11 × 8." **Confirmado, exato.** Medição: parâmetros posicionais de
`NotaFiscalResponse.cs:220-234` (`Id, ItemNotaFiscalId, Nome, CstCsosn, BaseCalculo, Aliquota, Valor,
Observacao, Origem, RegraFiscalAplicadaId, ExcecaoFiscalAplicadaId` = 11), confirmado igual à ordem do
`new(...)` em `FiscalNotaFiscalMapper.cs:74-85`. Frontend: `fiscal.types.ts:113-122` (`id,
itemNotaFiscalId, nome, cstCsosn, baseCalculo, aliquota, valor, observacao` = 8).

| # | Campo backend (linha, tipo C#) | Campo frontend (linha, tipo TS) | Onde a UI lê hoje | Destino |
|---|---|---|---|---|
| 1 | `Id` — `:221` | `id` — `:114` | ausente (`grep -n "row\.id\b" NotaFiscalDetalhePage.tsx` sem ocorrência) | **sem destino** |
| 2 | `ItemNotaFiscalId` — `:222` (`Guid?`) | `itemNotaFiscalId` — `:115` | ausente hoje | **entra na b56** (D34: chave de agrupamento `(itemNotaFiscalId ?? null, nome)`) |
| 3 | `Nome` — `:223` | `nome` — `:116` | `NotaFiscalDetalhePage.tsx:296` (`field="nome"`) | entregue e lido |
| 4 | `CstCsosn` — `:224` (`string?`) | `cstCsosn` — `:117` | `NotaFiscalDetalhePage.tsx:297` (`field="cstCsosn"`) | entregue e lido |
| 5 | `BaseCalculo` — `:225` | `baseCalculo` — `:118` | `NotaFiscalDetalhePage.tsx:298` (`body` com `formatFiscalMoney`) | entregue e lido |
| 6 | `Aliquota` — `:226` | `aliquota` — `:119` | `NotaFiscalDetalhePage.tsx:299` (`field="aliquota"`) | entregue e lido |
| 7 | `Valor` — `:227` | `valor` — `:120` | `NotaFiscalDetalhePage.tsx:300` (`body` com `formatFiscalMoney`) | entregue e lido |
| 8 | `Observacao` — `:228` (`string?`) | `observacao` — `:121` | ausente na tabela; **distinto** de `values.observacao` do `ImpostoNotaFiscalDialog` (`FiscalActionDialogs.tsx:227,238`), que é o valor a **enviar**, não a linha existente a exibir | **sem destino** |
| 9 | `Origem` — `:232` (`OrigemImpostoNotaFiscal = Manual`) | **ausente** | n/a | **entra na b56** (D34/D35: coluna Origem + regra de composição) |
| 10 | `RegraFiscalAplicadaId` — `:233` (`Guid? = null`) | **ausente** | n/a | fora do escopo, destino declarado: "F5, classe de referência por GUID" (§8) |
| 11 | `ExcecaoFiscalAplicadaId` — `:234` (`Guid? = null`) | **ausente** | n/a | fora do escopo, destino declarado: "F5" (§8) |

**Fechamento:** `5 (lido) + 2 (entra b56: ItemNotaFiscalId, Origem) + 2 (fora com destino: Regra/Exceção)
+ 2 (sem destino: Id, Observacao) = 11` ✓ fecha.

### 2b. `DefinirValoresAcessoriosNotaFiscalRequest` — backend (3 campos) × frontend (inexistente)

**Contagem do planner:** "3 campos." **Confirmado.** Medição: `NotaFiscalRequests.cs:104-107`
(`ValorFrete, ValorSeguro, ValorOutrasDespesas`), validados `>= 0` em `NotaFiscalValidators.cs:108-116`
(`DefinirValoresAcessoriosNotaFiscalRequestValidator`, um `RuleFor` por campo).

| # | Campo backend (linha, validação) | Frontend hoje | Destino |
|---|---|---|---|
| 1 | `ValorFrete` — `:105` (`decimal`, `>= 0`) | ausente — `grep -rn "valores-acessorios\|ValoresAcessorios" features/fiscal/api features/fiscal/hooks` sem ocorrência | **entra na b56** |
| 2 | `ValorSeguro` — `:106` (`decimal`, `>= 0`) | ausente, mesma medição | **entra na b56** |
| 3 | `ValorOutrasDespesas` — `:107` (`decimal`, `>= 0`) | ausente, mesma medição | **entra na b56** |

O record é posicional sem `default`, os três parâmetros são **obrigatórios** na assinatura C#
(`NotaFiscalRequests.cs:104-107`) — confirma a armadilha 3 do plano por leitura direta, não por citação.
A rota não é consumida hoje em nenhum lugar de `features/`, `app/` nem `lib/`
(`grep -rn "valores-acessorios" features/ app/ lib/` sem ocorrência).

### 2c. Enum `OrigemImpostoNotaFiscal` — backend (2 valores) × frontend (inexistente)

**Contagem do planner:** "2 valores." **Confirmado.**

| Valor | Backend (`ImpostoNotaFiscal.cs:11-15`) | Frontend |
|---|---|---|
| 1 | `Manual` | ausente |
| 2 | `Motor` | ausente |

**Serialização numérica confirmada:** `grep -rln "JsonStringEnumConverter" --include=*.cs .` a partir da
raiz de `New project 3/src` devolve **zero arquivos** (não só `Erp.Api/Program.cs` — o repo inteiro). Os
quatro enums fiscais envolvidos nesta fatia (`OrigemImpostoNotaFiscal`, e os já existentes
`StatusNotaFiscal`, `TipoDocumentoFiscal`, `TipoOperacaoFiscal`) trafegam como `int`, o que o padrão do
frontend (`| number` em todo campo de enum de `fiscal.types.ts`) já pressupõe.

---

## 3. O que a tela lê hoje — consolidado por arquivo

```text
NotaFiscalDetalhePage.tsx  — lê 22 campos de NotaFiscalResponse (tabela 1) + 5 campos de
                              ImpostoNotaFiscalResponse (tabela 2a) via `nota.impostos` -> `Column`.
                              Legenda falsa na linha 294: "Impostos são parametrizados/manuais nesta
                              etapa. O frontend não calcula ICMS, IPI, PIS, COFINS ou ISS
                              automaticamente." — confirma a armadilha do plano (§1 da fatia), sem
                              reabrir: falsa porque o motor de tributação (Módulo 05) já calcula, e a
                              linha silencia a origem de cada valor.
FiscalActionDialogs.tsx    — ImpostoNotaFiscalDialog (:226-243) não lê campo de NotaFiscalResponse nem de
                              ImpostoNotaFiscalResponse; monta e envia 7 campos de
                              AdicionarImpostoNotaFiscalRequest (itemNotaFiscalId, nome, cstCsosn,
                              baseCalculo, aliquota, valor, observacao — confirmado par exato contra
                              NotaFiscalRequests.cs:133-140, fora do escopo desta fatia). Valor padrão do
                              campo `observacao`: "Imposto parametrizado manualmente." (:227); hint fixo:
                              "O frontend não calcula imposto automaticamente nesta etapa." (:238) —
                              confirma a armadilha 5 do plano por leitura direta.
fiscalUiUtils.ts            — lê só `nota.statusFiscal` e `nota.itens` (linha 207-236); nenhuma função
                              lê valorProdutos/valorDesconto/valorFrete/valorIpi/observacao/impostos.
                              `notaPodeDefinirValoresAcessorios` (D33) **não existe** hoje
                              (`grep -rn "notaPodeDefinirValoresAcessorios" features/fiscal/` sem
                              ocorrência) — confirma que é função a criar, não a corrigir.
```

---

## 4. Permissão da rota nova

| Endpoint | Permissão do controller (arquivo:linha) | Registrada no catálogo? | Situação |
|---|---|---|---|
| `POST /api/fiscal/notas-fiscais/{id}/valores-acessorios` | `FiscalGerenciar` — `NotasFiscaisController.cs:95-97` (`[RequiredPermission(SystemPermissions.FiscalGerenciar)]`) | Sim — `FISCAL_GERENCIAR` já está no union (`types/erp.ts:283`) e no catálogo (`permissoesCatalogo.ts:113`), pré-existente, sem diff nesta fatia | bate; guard novo é só de UI (botão), não de permissão nova |

`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §9 já tem o adendo v1.11.0a8b56 (D22, D36), linhas 1478-1483,
citando `NotasFiscaisController.cs:95-102` e o `RequiredPermission(SystemPermissions.FiscalGerenciar)` —
**confirmado, texto e arquivo:linha batem** com o controller lido diretamente. O adendo também registra
corretamente que `calcular-tributos` fica fora (D36) e que o cabeçalho "576 endpoints" não foi alterado
(o número vigente no teste é 577, de `retomar-reversao`/D22 da `b55` — ver §6).

---

## 5. `docs/backend-v1.23/CONTRATO-API-v1.23.md` — o que falta, com contagem

```text
grep -c "ValorIpi" docs/backend-v1.23/CONTRATO-API-v1.23.md              = 0
grep -c "RegraFiscalAplicadaId" docs/backend-v1.23/CONTRATO-API-v1.23.md = 0
grep -c "OrigemImpostoNotaFiscal" docs/backend-v1.23/CONTRATO-API-v1.23.md = 0
grep -c "BaseCalculo\|CstCsosn\|ExcecaoFiscalAplicadaId" docs/backend-v1.23/CONTRATO-API-v1.23.md = 0
```

O documento nunca define `ImpostoNotaFiscalResponse` com campo próprio — a string aparece 9 vezes
(linhas 9323, 9371, 9484, 9541, 9858, 9990, 10161, 10218, 10304), sempre só como
`IReadOnlyCollection<ImpostoNotaFiscalResponse> Impostos` dentro de outro record, nunca como bloco
próprio com `Id, ItemNotaFiscalId, Nome...`. Confirma o item 5 do briefing.

No bloco de `NotaFiscalResponse` publicado sob a rota `valores-acessorios`
(`CONTRATO-API-v1.23.md:10130-10165`), o gerador do documento cola o comentário do código-fonte ao nome
do campo seguinte e **omite `ValorIpi` inteiramente**: a sequência publicada salta de `Eventos` direto
para `decimal ValorIcmsSt = 0m` / `decimal ValorFcpSt = 0m`, sem nenhuma linha `ValorIpi` entre elas —
achado adicional ao item 5 do briefing (que já esperava a ausência de `ValorIpi`, mas por um mecanismo
mais grave: não é omissão pontual, é o extrator do documento perdendo o campo por causa de um comentário
em `NotaFiscalResponse.cs:81-83` que precede `ValorIpi` diretamente. B-2 do plano já registra a causa-raiz:
"O gerador de `CONTRATO-API-v1.23.md` perde campos depois de comentário", com o mesmo exemplo).

O request da rota (`:10170-` no plano; confirmado em `:10166-10175` nesta leitura) publica os três campos
como **opcionais** (`valorFrete?: number`, `valorSeguro?: number`, `valorOutrasDespesas?: number`),
confirmando a armadilha 3 do plano — divergente do record C# (`NotaFiscalRequests.cs:104-107`), que os
declara posicionais sem `default`, logo obrigatórios.

---

## 6. Confirmação das contagens do planner (resumo)

| Contagem do planner | Medição desta rodada | Resultado |
|---|---|---|
| `NotaFiscalResponse`: C# 33, TS 27 = 27 − `pessoaId` + 7 ausentes | 33 × 27, com `pessoaId` sem par e 7 ausentes (`numeroDocumento, valorFrete, valorSeguro, valorOutrasDespesas, valorIpi, valorIcmsSt, valorFcpSt`) | **confirma exatamente**, campo a campo |
| `ImpostoNotaFiscalResponse`: 11 × 8 | 11 × 8, com 3 ausentes (`Origem, RegraFiscalAplicadaId, ExcecaoFiscalAplicadaId`) | **confirma exatamente** |
| `DefinirValoresAcessoriosNotaFiscalRequest`: 3 campos | 3 (`ValorFrete, ValorSeguro, ValorOutrasDespesas`), todos obrigatórios no record, `>= 0` nos 3 validadores | **confirma** |
| `OrigemImpostoNotaFiscal`: 2 valores | 2 (`Manual = 1, Motor = 2`) | **confirma** |
| Serialização de enum numérica | `grep -rln "JsonStringEnumConverter" --include=*.cs .` no repo backend inteiro = 0 arquivos | **confirma** |
| `POST .../valores-acessorios` exige `FISCAL_GERENCIAR` | `NotasFiscaisController.cs:95-97` | **confirma** |
| Adendo D22 em `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §9 | linhas 1478-1483, já presente e com citação correta | **confirma** |

Nenhuma correção às contagens do planner nesta rodada — todas as seis batem exatamente.

---

## 7. Divergências novas

Nenhuma das quatro abaixo está coberta pelas armadilhas 1-9 do plano nem pelas decisões D33-D37. Não
decido o destino — aponto e devolvo para a sessão principal.

### INV-1 — `NotaFiscalResponse.Id` e `.Observacao` são entregues, tipados e nunca lidos, e não estão no §8

`Id` (`NotaFiscalResponse.cs:44`) e `Observacao` (`:76`) são campos do record de resposta, já existem no
tipo do frontend (`fiscal.types.ts:144,166`), e nenhum dos três arquivos do recorte os lê
(`grep -n "nota\.id\b"` e `grep -n "nota\.observacao\b"` em `NotaFiscalDetalhePage.tsx`,
`FiscalActionDialogs.tsx` e `fiscalUiUtils.ts`: zero ocorrências nos dois). Diferente de `NumeroDocumento`,
`RegraFiscalAplicadaId` e `ExcecaoFiscalAplicadaId`, que o §8 do plano já destina para fora, estes dois
não aparecem em nenhuma linha do §8 nem no objetivo §1. É a mesma classe de achado que motivou a
Divergência #1 da `b55` (campo entregue, tipado, nunca lido, sem decisão que cubra) — só que aqui já
nasce presente antes da `b56` começar, não é introduzido por ela.
Proposta de destino: `sessão principal decide` — aceitar como está (dado que `Observacao` da nota é texto
livre sem consumidor declarado em nenhuma tela fiscal, e `Id` só importa para a chamada HTTP, que já usa
o `notaId` da rota) ou registrar como aceito.

### INV-2 — `ImpostoNotaFiscalResponse.Id` e `.Observacao` (da linha de imposto) também ficam sem destino

Mesma classe do INV-1, um nível abaixo: `Id` (`:221`) e `Observacao` (`:228`) de cada linha de imposto
existem no tipo do frontend (`fiscal.types.ts:114,121`) e não aparecem em nenhuma `Column` da tabela de
Impostos (`NotaFiscalDetalhePage.tsx:295-301`). `Observacao` da linha de imposto é particularmente
sensível: é o motivo do lançamento manual que a D35 torna obrigatório de 1 a 500 caracteres no **diálogo
de escrita** — mas a D35 não manda **exibir** esse motivo de volta na tabela depois de gravado. Um
operador que reabre a nota não vê por que aquela linha foi lançada manualmente, mesmo depois da D35
garantir que o motivo foi digitado de verdade.
Proposta de destino: `sessão principal decide` — acrescentar uma coluna/tooltip com `observacao` quando
`origem === Manual` (reforça o propósito auditável da D35) ou aceitar que o motivo fica só gravado, sem
tela que o mostre nesta fatia.

### INV-3 — o request de acessórios e o de imposto manual não têm par de `.strict()` ainda, porque não existem

Não é achado de código (o schema ainda não existe — `grep -n "valorFrete\|ValorFrete" i
features/fiscal/schemas/fiscalSchemas.ts` sem ocorrência), é uma marcação preventiva para o Bloco de
trabalho: por T5 (`.strict()` só em request), o schema novo de
`definirValoresAcessoriosNotaFiscalRequest` (b56) precisa `.strict()` porque é request; o tipo de
`NotaFiscalResponse`/`ImpostoNotaFiscalResponse` no `types/` continua sem `.strict()` porque são response.
Não é uma divergência hoje — é a checagem que evita a próxima.

### INV-4 — o `CONTRATO-API-v1.23.md` perde `ValorIpi` por um mecanismo de geração, não por omissão manual

Detalhado na seção 5. Registro aqui como divergência formal porque é achado novo desta rodada, não
coberto pela pergunta B-2 do plano em sua redação atual ("0 ocorrências de `ValorIpi`") — a causa
específica (colagem de comentário ao campo seguinte, campo inteiro desaparecendo, não só posição) é mais
grave do que "o documento não publica o campo": significa que **qualquer** campo do backend que vier
logo depois de um comentário de bloco em `NotaFiscalResponse.cs` (ou em qualquer outro record comentado
da mesma forma) pode desaparecer do documento gerado sem aviso, e o padrão de comentário usado ali
(comentário multilinha imediatamente antes do parâmetro) não é incomum no código do backend.
Proposta de destino: `sessão principal decide` — ampliar a pergunta B-2 com esta causa-raiz mais precisa,
ou abrir item de esteira para quem gera `CONTRATO-API-v1.23.md`.

---

## 8. O que fica fora deste inventário, nomeadamente

- `ItemNotaFiscalResponse` — a tabela de Itens (`NotaFiscalDetalhePage.tsx:280-291`) lê 9 campos, mas o
  tipo do backend (`NotaFiscalResponse.cs:193-218`) tem 19 (`NcmId, CestId, CestId, OrigemMercadoriaId,
  OrigemMercadoriaCodigo, CfopId, UnidadeTributavelId, UnidadeTributavelSigla, TipoItemSped` ausentes do
  TS). Não é o recorte desta fatia (nem F2.2 nem F2.3 tocam Itens) e não está nominado no briefing; não
  inventariado campo a campo.
- `XmlNotaFiscalResponse` e `EventoNotaFiscalResponse` — lidos e batendo nas duas tabelas
  correspondentes; não fazem parte do recorte de impostos/acessórios; não reinventariados aqui.
- `NotaFiscalBasicaUseCases.cs:283-360` (override manual, `FiscalErrors.ImpostoManualSemMotivo`) — lido
  só para confirmar que a validação de motivo obrigatório citada pela D35 existe no backend; não é
  reaberto, D35 já decidiu a forma do diálogo.
- `GarantirPodeAlterar` (`NotaFiscal.cs:704`) × `notaPodeEditarItens`
  (`fiscalUiUtils.ts:207`) — divergência de estados alteráveis já é a armadilha 4 do plano, já arbitrada
  pela D33 (o botão de acessórios usa função própria, restrita a Rascunho); não reaberta.
- `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:420,451` (aviso "imposto DIGITADO" desatualizado) — já
  nomeado no §8 do plano com destino próprio; não reaberto.
- Contagem de rotas do catálogo (`tests/unit/backendContractMap.test.ts:68`, hoje `toHaveLength(577)`) —
  confirmado só como ponto de partida (577, herdado da `b55`/D22); a mudança para 578 desta fatia (D36)
  é trabalho do nó `tests`, não deste inventário.

---

```json
{
  "status": "completed",
  "agent": "inventariante-contrato-tela",
  "slice": "v1.11.0a8b56",
  "node": "inventario",
  "assunto": "impostos-nota-fiscal",
  "changedFiles": [
    "docs/arquitetura/debate/03-inventario-impostos-nota-fiscal.md"
  ],
  "gates": {
    "validate:source": "not_run",
    "typecheck": "not_run",
    "lint": "not_run",
    "build": "not_run",
    "conta_de_campos": "passed"
  },
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [],
  "measurements": [
    { "o_que": "campos em NotaFiscalResponse (backend)", "valor": 33, "como": "contagem dos parametros posicionais do record em NotaFiscalResponse.cs:44-86, cruzada com a ordem de construcao em FiscalNotaFiscalMapper.cs:9-45" },
    { "o_que": "campos em NotaFiscalResponse (frontend)", "valor": 27, "como": "contagem das propriedades do type literal em fiscal.types.ts:143-171" },
    { "o_que": "campos de NotaFiscalResponse lidos hoje nos 3 arquivos do recorte", "valor": 22, "como": "grep -n \"nota\\.<campo>\\b\" em NotaFiscalDetalhePage.tsx, FiscalActionDialogs.tsx e fiscalUiUtils.ts, um por campo do backend" },
    { "o_que": "campos de NotaFiscalResponse que entram na b56", "valor": 8, "como": "ValorProdutos, ValorDesconto (existentes, nao lidos, no objetivo §1) + ValorFrete, ValorSeguro, ValorOutrasDespesas, ValorIpi, ValorIcmsSt, ValorFcpSt (ausentes do TS, no objetivo §1/D34)" },
    { "o_que": "campos em ImpostoNotaFiscalResponse (backend)", "valor": 11, "como": "contagem dos parametros posicionais em NotaFiscalResponse.cs:220-234, cruzada com FiscalNotaFiscalMapper.cs:73-85" },
    { "o_que": "campos em ImpostoNotaFiscalResponse (frontend)", "valor": 8, "como": "contagem das propriedades do type literal em fiscal.types.ts:113-122" },
    { "o_que": "campos em DefinirValoresAcessoriosNotaFiscalRequest", "valor": 3, "como": "contagem dos parametros posicionais em NotaFiscalRequests.cs:104-107, cruzada com 3 RuleFor em NotaFiscalValidators.cs:108-116" },
    { "o_que": "valores em OrigemImpostoNotaFiscal", "valor": 2, "como": "leitura direta de ImpostoNotaFiscal.cs:11-15 (Manual=1, Motor=2)" },
    { "o_que": "arquivos .cs com JsonStringEnumConverter no backend inteiro", "valor": 0, "como": "grep -rln \"JsonStringEnumConverter\" --include=*.cs . a partir da raiz de New project 3/src" },
    { "o_que": "ocorrencias de ValorIpi/RegraFiscalAplicadaId/OrigemImpostoNotaFiscal em CONTRATO-API-v1.23.md", "valor": 0, "como": "grep -c de cada termo no arquivo docs/backend-v1.23/CONTRATO-API-v1.23.md" },
    { "o_que": "ocorrencias de BaseCalculo/CstCsosn/ExcecaoFiscalAplicadaId (campos proprios de ImpostoNotaFiscalResponse) em CONTRATO-API-v1.23.md", "valor": 0, "como": "grep -c dos tres termos no mesmo arquivo -- confirma que o documento nunca define o bloco ImpostoNotaFiscalResponse com campo proprio" },
    { "o_que": "ocorrencias de valores-acessorios em features/, app/, lib/", "valor": 0, "como": "grep -rn \"valores-acessorios\" features/ app/ lib/, sem ocorrencia -- endpoint nao consumido hoje" },
    { "o_que": "ocorrencias de notaPodeDefinirValoresAcessorios em features/fiscal", "valor": 0, "como": "grep -rn \"notaPodeDefinirValoresAcessorios\" features/fiscal/, sem ocorrencia -- funcao ainda nao existe" },
    { "o_que": "tamanho do catalogo de rotas em backendContractMap.test.ts antes da b56", "valor": 577, "como": "grep \"toHaveLength\" tests/unit/backendContractMap.test.ts:68 -- ponto de partida que D36 muda para 578" }
  ],
  "risks": [
    "INV-1: NotaFiscalResponse.Id e .Observacao sao entregues, tipados e nunca lidos nos 3 arquivos do recorte, e nenhuma decisao (D33-D37) nem o §8 do plano cobre esses dois campos.",
    "INV-2: ImpostoNotaFiscalResponse.Id e .Observacao (da linha de imposto) tambem ficam sem destino -- em particular, o motivo do lancamento manual que a D35 torna obrigatorio na escrita nunca e mostrado de volta na tabela apos gravado.",
    "INV-3: quando o schema de definirValoresAcessoriosNotaFiscalRequest for criado pelo Bloco de trabalho, e request -- exige .strict() por T5; registrado aqui como lembrete, nao como achado.",
    "INV-4: o CONTRATO-API-v1.23.md perde ValorIpi por colagem de comentario ao campo seguinte no gerador do documento, nao por omissao pontual -- pode repetir em qualquer campo comentado da mesma forma em qualquer record do backend, nao so em NotaFiscalResponse."
  ],
  "blockers": [],
  "redTests": [],
  "handoff": {
    "testsRequired": false,
    "e2eRequired": false,
    "qaReviewRequired": false,
    "notes": "As seis contagens do planner (NotaFiscalResponse 33x27, ImpostoNotaFiscalResponse 11x8, request 3, enum 2, serializacao numerica, permissao FISCAL_GERENCIAR) foram confirmadas exatas, campo a campo -- nenhuma correcao de numero. A conta de campos fecha nos dois tipos de resposta (33 = 22 lido + 8 entra-b56 + 1 fora-com-destino + 2 sem-destino; 11 = 5 lido + 2 entra-b56 + 2 fora-com-destino + 2 sem-destino), mais a divergencia isolada de pessoaId. Quatro achados novos (INV-1 a INV-4) vao para a sessao principal decidir destino; nenhum bloqueia o Bloco de trabalho, todos sao aditivos ou preventivos."
  },
  "nextRecommendedAgent": "dev-senior-react"
}
```
