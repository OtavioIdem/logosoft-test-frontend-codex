# Inventário: Naturezas de operação (rodada de arquitetura 14, recorte `b72`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b72-naturezas-operacao`, criada sobre a `b71`.
Recorte: manutenção de Naturezas de Operação (criar, editar, inativar, mapeamento natureza → CFOP).

**Árvore medida:**

- **Frontend:** HEAD `48eb7ff` (`feat(release): v1.11.0a8b71`). `git status --short` fora de `.codex/` e
  `.agents/` mostra só `.claude/settings.local.json` (fora do recorte). Todas as citações `arquivo:linha` do
  frontend valem para esse commit. Conferi o `git status` no início e no fim da sessão: nada do recorte mudou
  durante a medição (diferente da rodada 13, §0 daquele arquivo).
- **Backend** (`../New project 3/src`, só leitura): branch `fix/v1.23.3-g3-crt-com-semantica-de-manutencao`,
  HEAD `ab5d00a`. A árvore **não está limpa** (10 arquivos modificados), mas nenhum é de natureza de operação:
  são de `Fiscal/Tributacao/{Motor,Regras}`, `NotaFiscalXmlBuilder`, `RegraIcmsConfiguration`, o snapshot do
  `AppDbContext` e um teste de XML (`git status --short` no backend). Os arquivos de natureza têm como último
  commit `6657117` (2026-08-19), anterior à rodada 04 (2026-09-17).
  `git log --oneline -5 -- <pasta NaturezaOperacao e controller>`.

**Fontes vivas:** banco dev por `docker exec logosoft-postgres psql -U erp_user -d erp` (só `select`; o Docker foi
aceito). Não houve chamada HTTP autenticada, porque não há credencial. "Confirmado no backend" quer dizer **lido
no C#** (controller, record, domínio, use case, repositório, configuração EF), e não observado em execução. Onde só a
resposta real responderia, a linha diz **não verificado**. Não rodei gate nem teste nenhum: tudo é leitura de código e
consulta ao banco, mais dois experimentos de uma linha com `node` (Zod, §3.1).

**Entrada do briefing que este inventário respeita, sem redecidir:** D47 a D53 e D91 (`DECISOES.md:1406-1475,2361-2385`).

---

## 1. Telas e rotas

**Não existe tela de manutenção de natureza de operação no HEAD.** `ls app/(main)/fiscal` devolve
`excecoes, excecoes-ncm, inutilizacoes, notas, observabilidade, regras, series, simulador`. `grep -rni naturez lib/security
layout app` devolve 0 (o union, o catálogo e o menu não têm entrada de natureza).

| Rota / superfície | Arquivo | Componente | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/fiscal/naturezas-operacao` (nome do plano da b59, não decidido) | **inexistente** | — | — | Sem regra própria em `routePermissions.ts`. Um caminho `/fiscal/...` sem regra cai no catch-all `routePermissions.ts:57`, cujo `anyOf` tem 8 códigos `FISCAL_*` e **nenhum `FISCAL_CADASTROS_*`** |
| Campo "Natureza de operação" do Confirmar Faturamento | `FaturamentoDialogs.tsx:258-263` | `NaturezaOperacaoField` (`features/fiscal/components/NaturezaOperacaoField.tsx`) | consulta: `FISCAL_CADASTROS_CONSULTAR` (`useNaturezasOperacao.ts:20,26`); o diálogo em si: `FATURAMENTO_CONFIRMAR` | union `types/erp.ts:311`; catálogo `permissoesCatalogo.ts:117`; backend `NaturezasOperacaoController.cs:42` |
| Campo "Natureza de operação" do diálogo "Nova nota fiscal manual" | `FiscalActionDialogs.tsx:142` | `InputText disabled`, placeholder "Parametrização fiscal futura" | `FISCAL_EMITIR` (diálogo) | — |
| Campo "Natureza de operação" do diálogo "Gerar NF" de pedido | `FiscalActionDialogs.tsx:203` | idem, `InputText disabled` | `FISCAL_EMITIR` | — |
| Busca de CFOP (`CfopSelect`) | `features/tributacao/components/CadastroFiscalSelects.tsx:60-95` | usado em `RegraFiscalFormDialog.tsx:350` e `ItensTributaveisGrid.tsx:97` | `FISCAL_CADASTROS_CONSULTAR` (`useTributacao.ts:88-89`) | idem |
| Painel de link de erro de cadastro (D50) | `NotaFiscalErroCadastroPanel.tsx`, dentro de `NotaFiscalDetalhePage.tsx:220` | alimentado só por `validar` (`:163-166`) | — | `fiscalErrosCadastro.ts:17-19`: **1 entrada** (série) |
| Grupo de menu "Fiscal" | `layout/AppMenu.tsx:132-143` | pai com 12 códigos; 8 filhos | — | o `anyPermissions` do pai (`:133`) **não tem** `FISCAL_CADASTROS_CONSULTAR`, `FISCAL_CADASTROS_GERENCIAR` nem `FISCAL_MODELOS_CONSULTAR` |

**Precedente de cadastro (D48):** `/fiscal/series` → `app/(main)/fiscal/series/page.tsx` (4 linhas) →
`SeriesFiscaisPage.tsx` (213) + `SerieFiscalDialogs.tsx` (336) + `SerieFiscalBuracosDialog.tsx`; regra
`routePermissions.ts:56` (`FISCAL_SERIES_CONSULTAR`, `FISCAL_SERIES_GERENCIAR`); menu `AppMenu.tsx:136`.

## 2. Endpoints consumidos e existentes

O `scripts/backend-contract-map.allowlist.json` está em `audit-only-no-suppressions`: `suppressions: []`,
`documentedDivergences: []`, e **0 ocorrências** de `naturez` (`grep -i`). O gate compara a rota consumida com o
catálogo de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, e não com a allowlist. As 5 rotas de natureza constam desse
catálogo (`:1432-1446`). Não rodei `npm run validate:backend-contract-map`: **não verificado** por gate.

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/fiscal/naturezas-operacao` | `features/fiscal/api/naturezasOperacaoApi.ts:43` (**consumido desde a b71**, só para o combo) | `naturezaOperacaoResponseSchema` (6 de 15 campos), `naturezaOperacaoListQuerySchema` (`.strict()`) | `CONTRATO-API-v1.23.md:9129-9136` ("❌ não consome" em `:9133`, desatualizado); `BACKEND-ESTADO…md:1438` | sim, `NaturezasOperacaoController.cs:41-73`. `PagedResult<NaturezaOperacaoResponse>` (`NaturezaOperacaoConsultas.cs:72-109`), ordenado por `Codigo` (`NaturezaOperacaoRepository.cs:67`), `tamanhoPagina` ≤ 200 e default 20 (`:60-61,101`) |
| `POST /api/fiscal/naturezas-operacao` | **nenhum** | nenhum | `CONTRATO…:9138-9164`; `BACKEND-ESTADO…:1439` | sim, `:75-88`; **201** com `NaturezaOperacaoResponse` e `Location` |
| `PUT /api/fiscal/naturezas-operacao/{id}` | **nenhum** | nenhum | `CONTRATO…:9165-9188`; `BACKEND-ESTADO…:1440` | sim, `:90-104`; **200** com `NaturezaOperacaoResponse` |
| `POST /api/fiscal/naturezas-operacao/{id}/inativar` | **nenhum** | nenhum | `CONTRATO…:9198-9206`; `BACKEND-ESTADO…:1441` | sim, `:106-120`; **204 sem corpo** |
| `GET /api/fiscal/naturezas-operacao/{id}/cfop` | **nenhum** | nenhum | `CONTRATO…:9189-9197` (com `tipoItem?`); `BACKEND-ESTADO…:1442` **sem** `tipoItem` | sim, `:128-145`; `CfopResolvidoResponse` |
| `GET /api/fiscal/cadastros/cfop` (busca para o mapeamento) | `features/tributacao/api/tributacaoApi.ts:238-243` | **nenhum** (resposta crua, tipo `CfopResumoResponse`) | `BACKEND-ESTADO…:1384` | sim, `CadastrosFiscaisController.cs:165-180`; paginado (`pagina`, `tamanhoPagina`), filtros `termo, codigo, tipo, ambito, ativo, …` |

**Não há `GET /api/fiscal/naturezas-operacao/{id}`** (`grep` no controller: 5 rotas, nenhuma por id sem sufixo). A edição
parte do item da listagem, que já traz `cfops`.

Contagem: **5 rotas de natureza, 1 consumida (20%)**. O `GAP-FRONTEND-BACKEND.md:228-232` ainda diz "faltam 5 de 5"
(e `:232` "0/5"). A contagem certa no HEAD é 1 de 5.

## 3. Campos

**Como medi:** li o record C# e o tipo TypeScript lado a lado, nome a nome. O destino vem de `grep` por
`<objeto>.<campo>` e de leitura dos componentes do HEAD. **Fórmula:** declarados pelo frontend = entregues com destino
+ divergência (lido e não entregue) + sem uso. Campo que o backend entrega e o frontend **não declara** fica numa
linha à parte, porque não há campo no frontend para receber um dos quatro destinos.

### 3.1 `NaturezaOperacaoResponse` (`NaturezaOperacaoContracts.cs:53-68`, 15 campos) × `naturezasOperacao.types.ts:11-18` (6 campos)

| Campo | Tipo no frontend | Origem | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `.Id` | sim | enviado (`value` do combo, `useNaturezasOperacao.ts:34` → `naturezaOperacaoId` do Confirmar) |
| `empresaId` | `Guid` | `.EmpresaId` | sim | sem uso (nada lê `item.empresaId`, `grep` no hook, no campo e no diálogo: 0) |
| `filialId` | `Guid?` | `.FilialId` | sim | sem uso (idem) |
| `codigo` | `string` | `.Codigo` | sim | exibido (rótulo `código — descrição`, `useNaturezasOperacao.ts:34`) |
| `descricao` | `string` | `.Descricao` | sim | exibido (idem) |
| `ativa` | `boolean` | `.Ativa` (← `IsActive`, `NaturezaOperacaoMapper.cs:22`) | sim | sem uso (o filtro de ativas é do servidor, `naturezasOperacaoApi.ts:31`) |

Conta: **6 declarados = 3 com destino + 0 divergências + 3 sem uso**. Fecha.

**Entregues pelo backend e ausentes do tipo do frontend: 9** (15 − 6). O
`naturezaOperacaoResponseSchema` (`naturezasOperacaoSchemas.ts:19-26`) é `z.object` sem `.strict()`, e o Zod remove
chaves desconhecidas por padrão. **Medi:** `node -e` com o `zod@3.25.76` do repositório,
`z.object({id,codigo}).parse({id,codigo,cfops:[1],finalidade:1})` devolveu `{"id":"a","codigo":"b"}`. Logo,
`naturezasOperacaoApi.listar` (`:44`) **descarta** estes 9 na borda, e não só os ignora:

| Campo do backend | Tipo C# | Observação |
| --- | --- | --- |
| `TipoDocumento` | `TipoDocumentoFiscal` (enum numérico, §4) | não declarado; descartado pelo parse |
| `TipoOperacao` | `TipoOperacaoFiscal` | idem |
| `Finalidade` | `FinalidadeNaturezaOperacao` | idem |
| `IndicadorPresencaComprador` | `IndicadorPresencaComprador` | idem; o enum **não existe** no frontend (§4) |
| `IndicadorConsumidorFinal` | `bool` | idem |
| `MovimentaEstoque` | `bool` | idem |
| `GeraFinanceiro` | `bool` | idem |
| `Observacao` | `string?` | idem |
| `Cfops` | `IReadOnlyList<MapeamentoCfopResponse>` | idem; é o conteúdo do mapeamento |

### 3.2 `MapeamentoCfopResponse` (`NaturezaOperacaoContracts.cs:51`, 4 campos) × frontend (0 declarados)

| Campo | Tipo C# | O backend entrega? | Destino |
| --- | --- | --- | --- |
| `Ambito` | `AmbitoCfop` (1 Interno, 2 Interestadual, 3 Exterior) | sim | não declarado (enum inexistente no frontend) |
| `CfopId` | `Guid` | sim | não declarado |
| `CfopCodigo` | `string` | sim | não declarado |
| `TipoItem` | `TipoItemCfop?` (1 Revenda, 2 ProducaoPropria, `null` = "qualquer item") | sim | não declarado |

O mapeamento **não traz a descrição do CFOP**. Para mostrá-la é preciso outra fonte (o catálogo de CFOP, §5).

### 3.3 Envelope `PagedResult<T>` (`Erp.Shared/Kernel/PagedResult.cs:3-11`) × `types/erp.ts:403`

| Campo | Tipo no frontend | O backend entrega? | Destino declarado |
| --- | --- | --- | --- |
| `items` | `T[]` | sim | exibido (`naturezasOperacaoApi.ts:44`, `useNaturezasOperacao.ts:33`) |
| `page` | `number` | sim | sem uso |
| `pageSize` | `number` | sim | sem uso |
| `totalItems` | `number` | sim | exibido, indireto: decide o aviso `listaCortada` (`useNaturezasOperacao.ts:36`) |
| `totalPages` | `number` | sim (propriedade calculada, também serializa) | sem uso |
| `hasPreviousPage`, `hasNextPage` | **não declarados** | sim (calculadas) | não declarados |

Conta: **5 declarados = 2 com destino + 0 divergências + 3 sem uso**; o backend entrega 7, então **2 não declarados**.
Fecha. **Medi:** se o JSON serializa as três propriedades calculadas não foi observado em execução; o rodada 13 já
afirmou isso do mesmo tipo (`13-inventario…md:135`), e eu não refiz.

### 3.4 `CfopResolvidoResponse` (`NaturezaOperacaoContracts.cs:74-82`, 8 campos) × frontend (0 declarados)

`NaturezaOperacaoId, NaturezaCodigo, Ambito, CfopId, CfopCodigo, CfopDescricao, GeraFinanceiro, MovimentaEstoque`.
Todos entregues, nenhum declarado. `GET {id}/cfop` não tem consumidor. **8 = 0 + 0 + 0, mais 8 não declarados.**

### 3.5 `CfopResponse` (catálogo) × `CfopResumoResponse` (`tributacao.types.ts:659-665`)

| Campo | Tipo no frontend | O backend entrega? | Destino declarado |
| --- | --- | --- | --- |
| `id` | `Guid` | sim | enviado (`value` do select; vira `cfopId` em Regra fiscal, `RegraFiscalFormDialog.tsx:350`) |
| `codigo` | `string` | sim | exibido (rótulo) e repassado como 2º argumento `{codigo}` do `onChange` (`CadastroFiscalSelects.tsx:84`) |
| `descricao` | `string` | sim | exibido (rótulo) |
| `tipo` | `TipoCfop \| number` | sim | sem uso |
| `ativo` | `boolean` | sim | sem uso (o filtro é do servidor, `tributacaoApi.ts:240`, `ativo: true`) |

Conta: **5 declarados = 3 com destino + 0 divergências + 2 sem uso**. O backend entrega 12 (`CadastrosFiscaisResponses.cs:121-133`):
**7 não declarados** (`Ambito`, `IndicadorDevolucao`, `IndicadorTransferencia`, `IndicadorIndustrializacao`,
`GeraFinanceiro`, `MovimentaEstoque`, `MotivoInativacao`). Sem schema Zod: o tipo é asserção, a resposta passa crua.

### 3.6 Requests de natureza: o que o backend aceita × o que existe no frontend

**Nenhum dos três requests de escrita tem tipo, schema ou client no frontend** (`grep -rn "CriarNaturezaOperacao\|
AtualizarNaturezaOperacao\|InativarNaturezaOperacao\|MapeamentoCfop" features app lib types tests` → 0).

**`CriarNaturezaOperacaoRequest`** (`NaturezaOperacaoContracts.cs:17-30`, **13** campos; `BACKEND-ESTADO…:2787` e a rodada 04
dizem "12", e o record tem 13):

| Campo | Tipo C# | Regra no backend (domínio, não há FluentValidation) | No frontend |
| --- | --- | --- | --- |
| `EmpresaId` | `Guid` | `Guid.Empty` → 400 `Fiscal.EmpresaObrigatoria` (`OrganizationalContextGuard.cs:14-19`); de outra empresa → `Forbidden` → **404 genérico** | ausente |
| `FilialId` | `Guid?` | opcional; diferente da filial do usuário (quando o usuário tem filial) → `Forbidden` → 404 | ausente |
| `Codigo` | `string` | obrigatório, `Trim`, **≤ 40**, `ToUpperInvariant`, **sem espaço** (`NaturezaOperacao.cs:196-205`); duplicado na empresa → 400 `FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO` (`Error.Conflict`, sai 400), **inclui inativas** (`ObterPorCodigoAsync` sem filtro de status, `NaturezaOperacaoRepository.cs:80-83`); índice único `(EmpresaId, Codigo)` (`NaturezaOperacaoConfiguration.cs:54`) | ausente |
| `Descricao` | `string` | obrigatória, `Trim`, **≤ 200** (`:42`) | ausente |
| `TipoDocumento` | `TipoDocumentoFiscal` | `Enum.IsDefined` (`:43,207-209`): aceita qualquer dos **6** valores | ausente |
| `TipoOperacao` | `TipoOperacaoFiscal` | `IsDefined`: os **9** valores | ausente |
| `Finalidade` | `FinalidadeNaturezaOperacao` | `IsDefined`: 1 a 4 | ausente |
| `IndicadorPresencaComprador` | `IndicadorPresencaComprador` | `IsDefined`: 0,1,2,3,4,5,9 | ausente |
| `IndicadorConsumidorFinal` | `bool` | sem regra | ausente |
| `MovimentaEstoque` | `bool` | sem regra | ausente |
| `GeraFinanceiro` | `bool` | sem regra | ausente |
| `Observacao` | `string?` | opcional, vazio vira `null`, **≤ 500** (`:50,224-235`) | ausente |
| `Cfops` | `IReadOnlyList<MapeamentoCfopRequest>?` | §4.3 | ausente |

**`AtualizarNaturezaOperacaoRequest`** (`:36-46`, **10** campos): os mesmos de cima **sem** `EmpresaId`, `FilialId` e
`Codigo` (o código é a identidade; notas fiscais já emitidas referenciam a natureza, comentário `:33-34`). Natureza
**inativa** → 400 "Natureza de operação inativa não pode ser alterada." (`NaturezaOperacao.cs:188-194`).

**`InativarNaturezaOperacaoRequest`** (`:48`, **1** campo): `Motivo`. Vazio ou só espaços → 400 "Motivo é obrigatório para
inativação." (`AuditableEntity.cs:36-39`). **Sem máximo no domínio.** Já inativa → 400 "Entidade já está inativa."
(`:31-34`). Ver NO-9 sobre o teto da auditoria.

**`MapeamentoCfopRequest`** (`:15`, **3** campos): `Ambito` (`AmbitoCfop`), `CfopCodigo` (`string`, **código, não GUID**),
`TipoItem` (`TipoItemCfop?`, default `null`).

Conta dos requests de escrita: **13 + 10 + 1 + 3 = 27 campos no backend, 0 no frontend, 27 ausentes.**

**Query de listagem** (`NaturezasOperacaoController.cs:43-52`, **9** parâmetros) × `NaturezaOperacaoListQuery` (`naturezasOperacao.types.ts:25-30`) e o que sai
(`naturezasOperacaoApi.ts:26-35`):

| Parâmetro | No frontend | Destino |
| --- | --- | --- |
| `empresaId` | `Guid`, obrigatório (0 GET sem ele, `:39-41`) | enviado |
| `termo` | declarado (`termo?`), **nenhuma tela o preenche** (o hook chama `listar({ empresaId })`) | sem uso |
| `codigo` | ausente | ausente |
| `tipoDocumento` | ausente | ausente |
| `tipoOperacao` | ausente | ausente |
| `finalidade` | ausente | ausente |
| `somenteAtivas` | **fixo `true`** no client (`:31`), não é parâmetro da função | enviado (fixo) |
| `pagina` | `default(1)` no schema | enviado |
| `tamanhoPagina` | `default(200)`, máximo 200 (`naturezasOperacaoSchemas.ts:7,14`) | enviado |

Conta: **9 = 4 enviados (`empresaId`, `somenteAtivas`, `pagina`, `tamanhoPagina`) + 1 declarado sem uso (`termo`) + 4 ausentes.**
**Sem `filialId`:** a listagem **não tem** esse parâmetro; o guard roda com `filialId: null`
(`NaturezaOperacaoConsultas.cs:86`).

**Query de `GET {id}/cfop`** (`:130-136`, **4** parâmetros: `ufOrigem`, `ufDestino`, `tipoItem`, `operacaoComExterior`): 0 no
frontend.

### 3.7 `naturezaOperacaoId` nos requests existentes de outros recursos

| Request | Campo no frontend | Destino |
| --- | --- | --- |
| `ConfirmarFaturamentoRequest` | `naturezaOperacaoId` (`FaturamentoDialogs.tsx:160`), preenchido pelo `NaturezaOperacaoField` | enviado |
| `GerarNotaFiscalPedidoVendaRequest` (`fiscal.types.ts:341`, `fiscalSchemas.ts:47`) | `naturezaOperacaoId` inicia `''` (`FiscalActionDialogs.tsx:161`), o input está `disabled` | enviado, sempre `null` (nada o preenche) |
| `CriarNotaFiscalRequest` (`fiscal.types.ts:331`, `fiscalSchemas.ts:37`) | idem (`:118`) | enviado, sempre `null` |
| `NotaFiscalResponse` (C#, `NotaFiscalResponse.cs`) | **não tem `NaturezaOperacaoId`** (`grep -i natureza` no arquivo: 0) | a nota não diz qual natureza usa (ver §7) |

## 4. Enums, limites e regras de backend relevantes

### 4.1 Enums e serialização

**JSON numérico.** `grep -rn JsonStringEnumConverter` em `src` → 0 (só `RedisCache` usa `JsonOptions`), e `Program.cs:28-31`
chama `AddControllers` sem `AddJsonOptions`. O banco guarda os enums como texto (`HasConversion<string>`,
`NaturezaOperacaoConfiguration.cs:28-45`), mas a API fala número. **Não verificado em execução:** o que o corpo
com enum em texto devolve.

| Enum (backend) | Valores | Equivalente no frontend | Opções oferecidas hoje |
| --- | --- | --- | --- |
| `TipoDocumentoFiscal` (`EnumsFiscal.cs:3-10`) | 1 NFe, 2 NFCe, 3 NFSe, 4 CTe, 5 MDFe, 99 Outro | `types/erp.ts:131-138` (igual) | `tipoDocumentoFiscalOptions` (`fiscalUiUtils.ts:459-462`): **2 de 6** (NFe, NFCe) |
| `TipoOperacaoFiscal` (`:13-23`) | 1 Venda … 8 Transporte, 99 Outro (9) | `types/erp.ts:140-150` (igual) | `tipoOperacaoFiscalOptions` (`fiscalUiUtils.ts:485-495`): 9 de 9 |
| `FinalidadeNaturezaOperacao` (`EnumsCadastrosFiscais.cs:36-42`) | 1 Normal, 2 Complementar, 3 Ajuste, 4 Devolucao | `tributacao.types.ts:56-61` (igual, **em `features/tributacao`**) | `finalidadeOptions` (`tributacaoUiUtils.ts:52-57`): 4 de 4 |
| `IndicadorPresencaComprador` (`:47-55`) | 0 NaoSeAplica, 1 Presencial, 2 Internet, 3 Teleatendimento, 4 EntregaDomicilio, 5 PresencialForaDoEstabelecimento, 9 Outros (7) | **não existe** (`grep -rni indicadorPresenca features types lib` → 0) | — |
| `AmbitoCfop` (`:62-67`) | 1 Interno, 2 Interestadual, 3 Exterior | **não existe** | — |
| `TipoItemCfop` (`TipoItemCfop.cs:15-22`) | 1 Revenda, 2 ProducaoPropria | **não existe** | — |

### 4.2 Regras do mapeamento (`NaturezaOperacaoCfop.cs:25-57`)

- O `CfopCodigo` é normalizado: remove `.`, exige 4 dígitos numéricos e 1º dígito em 1, 2, 3, 5, 6 ou 7
  (`Cfop.cs:91-101,134-141`). Erro → 400 `FISCAL_CADASTROS_VALIDACAO`.
- CFOP inexistente no catálogo → 400 `FISCAL_CADASTROS_CFOP_NAO_ENCONTRADO` (`ResolvedorMapeamentoCfop.cs:53-57`).
- CFOP **inativo** → 400 `FISCAL_CADASTROS_VALIDACAO` "CFOP … está inativo e não pode ser mapeado" (`NaturezaOperacaoCfop.cs:47-50`).
- **Âmbito do CFOP (derivado do 1º dígito) ≠ âmbito do mapeamento** → 400 `FISCAL_CADASTROS_VALIDACAO` (`NaturezaOperacaoCfop.cs:41-45`).
- **Não há validação** de coerência entre `TipoOperacao` da natureza e `Tipo` do CFOP (Entrada/Saída), nem de
  `TipoItem` com o final do CFOP (101/102). Medido no domínio: só âmbito e ativo. No dev, **32 dos 64 CFOPs são
  `Entrada`** (§9).
- A chave do mapeamento é `(Ambito, TipoItem)`, com `TipoItem = null` como "qualquer item". O índice
  `(NaturezaOperacaoId, Ambito, TipoItem)` é único com `AreNullsDistinct(false)`
  (`NaturezaOperacaoCfopConfiguration.cs:41-43`).
- Resolução: combinação exata e, se não achar e `tipoItem` não for nulo, cai no `null` do mesmo âmbito
  (`NaturezaOperacao.cs:166-175`).

### 4.3 Semântica dos `Cfops` no POST e no PUT (`ResolvedorMapeamentoCfop.cs:15-70`)

| Valor enviado | Efeito |
| --- | --- |
| `null` (campo omitido) | **não mexe** nos mapeamentos existentes (`ResolvedorMapeamentoCfop.cs:21-24`). No POST, natureza sem nenhum mapeamento |
| `[]` | no PUT, **remove todos** (o laço de `ResolvedorMapeamentoCfop.cs:32-39` remove cada existente que não está na lista). No POST, natureza sem mapeamento |
| lista | **substituição completa**: o que não está na lista é removido; o que está é criado ou trocado (`MapearCfop` faz `RemoveAll` da chave e inclui, `NaturezaOperacao.cs:129-136`) |
| mesma chave `(Ambito, TipoItem)` duas vezes na lista | **sem erro**: a última vence (mesmo trecho) |

O comentário do backend diz "uma natureza sem CFOP mapeado é inútil" (`NaturezaOperacaoUseCases.cs:28-30`), mas nada
no código rejeita `Cfops` vazio ou nulo na criação. Não há rota incremental de mapeamento.

### 4.4 Inativar

- **Devolve `204 No Content`** (`NaturezasOperacaoController.cs:119`), sem corpo.
- Efeito: `Status = Inativo`, `InactivatedAt/By`, `UpdatedAt/By` (`AuditableEntity.cs:29-44`). **O motivo não é gravado na
  entidade**: `Motivo` só entra no texto do evento de auditoria (`NaturezaOperacaoUseCases.cs:262`). A resposta de
  listagem não tem `motivoInativacao`, `inativadaEm` nem `inativadaPor`.
- **Não há rota para reativar.** `AuditableEntity.Reativar` existe (`:46-59`), e nenhum use case de natureza o chama
  (`grep Reativar` na pasta: 0). Inativar é, pela API, definitivo.
- Não há exclusão física ("notas fiscais já emitidas referenciam esta natureza por Id", `:247`). O `Cascade` do FK
  vale só para os mapeamentos.
- **Natureza inativa continua sendo aceita na derivação de CFOP** (`CfopDoItemResolver.cs:112-124` confere só
  `null` e empresa, não `IsActive`). É a B-7 da D51, **ainda aberta** (não há resposta do backend nos arquivos que li).

### 4.5 Contexto organizacional e erros HTTP

- A listagem exige `empresaId` (tipo `Guid` não anulável, `NaturezasOperacaoController.cs:44`); vazio → 400
  `Fiscal.EmpresaObrigatoria`. O `CONTRATO-API-v1.23.md:9135` escreve `empresaId?` (opcional): NO-5.
- O guard é `OrganizationalContextGuard.EnsureAllowed` via `FiscalContextoOperacional` (`Modulo = "Fiscal"`). Usuário com
  empresa própria só lê e escreve a dela; usuário de contexto global (`EmpresaId == Guid.Empty`) passa em qualquer uma.
- **`Forbidden` e `NotFound` saem como 404 com corpo genérico** `Recurso.NaoEncontrado` (`ApiErrorResponseFilter.cs:80-93`).
  Vale para: empresa do request diferente da do usuário (incluindo a **listagem**, que devolve `BadRequest(Error)` e o
  filtro remapeia), natureza de outra empresa ou filial, e `NaturezaOperacaoNaoEncontrada` (`Error.NotFoundCode`,
  `CadastrosFiscaisErrors.cs:102-103`). Validação e `Conflict` saem 400 (`BadRequest` fixo nos 5 métodos).
- **Códigos de erro que o frontend consegue distinguir** (`CadastrosFiscaisErrors.cs`): `FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO`
  (`:105-106`), `FISCAL_CADASTROS_CFOP_NAO_ENCONTRADO` (`:56-57`), `FISCAL_CADASTROS_CFOP_INATIVO` (`:59-60`, vem da resolução
  `GET {id}/cfop`), `FISCAL_CADASTROS_NATUREZA_SEM_CFOP_PARA_AMBITO` (`:119-124`, idem), `FISCAL_CADASTROS_NATUREZA_NAO_ENCONTRADA`
  (vira 404 genérico). **Todo o resto é `FISCAL_CADASTROS_VALIDACAO`** com texto livre (`:186`).

## 5. Busca de CFOP (D47 item 3 e D52): estado no HEAD

| Ponto | Medido |
| --- | --- |
| Onde mora | `features/tributacao/components/CadastroFiscalSelects.tsx` (95 linhas, `wc -l`). **A D47 item 3 (mover para `features/fiscal`) não aconteceu.** O `tributacao` não importa de `fiscal` |
| Consumidores de `CfopSelect` | `RegraFiscalFormDialog.tsx:15,350` e `ItensTributaveisGrid.tsx:8,97` |
| Consumidores de `NcmSelect` | `ExcecaoFiscalFormDialog.tsx:16`, `RegraFiscalFormDialog.tsx:15`, `ItensTributaveisGrid.tsx:8` (`ProdutoFormDialog.tsx:65` e `EnderecoFiscalFormSection.tsx:62` só citam o arquivo em comentário) |
| Hook e chave | `useCfopOptions` (`useTributacao.ts:87-100`), chave `['tributacao','cadastros','cfop',termo]` (`:17`) |
| `value` do select | **`item.id`** (`:97`). O request de mapeamento quer **código**; o código sai no 2º argumento de `onChange({ codigo })` |
| Debounce | **ausente**: `onSearch={setTermo}` (`CadastroFiscalSelects.tsx:86`) alimenta a `queryKey` a cada tecla. A D52 já registrava "hoje sem debounce" e mandava corrigir |
| Filtros enviados | `termo`, `ativo: true`, `pagina: 1`, `tamanhoPagina: 20` (`tributacaoApi.ts:240`). **Sem `ambito`, sem `tipo`**, embora o backend os aceite (`CadastrosFiscaisController.cs:170-171`) |
| Item já salvo fora da 1ª página | `comSelecionado` (`:15-19`) injeta `{id, codigo, descricao}`; o mapeamento devolve só `cfopId` e `cfopCodigo` (sem descrição), então o rótulo ficaria só com o código |
| Testes por nome | `grep -rln "useCfopOptions\|CfopSelect\|cfopOptionsQueryKey\|cadastros/cfop\|tributacao/cadastros" tests` → **0 arquivos** |

## 6. Permissões

| Código | Backend (`SystemPermissions.cs`) | Banco dev (`erp.permissoes`) | Snapshot (`backend-permissions.snapshot.json`) | Union (`types/erp.ts`) | Catálogo FE (`permissoesCatalogo.ts`) | Catálogo estruturado do backend (`PermissoesCatalogoDefinition.cs`) | Rota | Menu pai / filho |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FISCAL_CADASTROS_CONSULTAR` | `:126`; `[RequiredPermission]` no GET lista (`:42`) e GET cfop (`:129`) | sim | `:114` | `:311` | `:117` | recurso "CadastrosFiscais", rota **`/fiscal/cadastros`** (`:191-195`) | **sem regra** | **não** / **não** (não há filho) |
| `FISCAL_CADASTROS_GERENCIAR` | `:127`; POST (`:76`), PUT (`:91`), inativar (`:107`) | sim | `:115` | `:312` | `:118` | idem | **sem regra** | **não** / **não** |

- As duas permissões são **compartilhadas** com os 16 endpoints de `CadastrosFiscaisController` (NCM, CEST, CFOP, geografia).
  Não há permissão própria de natureza (achado da rodada 04, ainda verdadeiro).
- `GERENCIAR` **não implica** `CONSULTAR` pelo `[RequiredPermission]` de cada rota (não procurei regra de implicação entre permissões no backend: não verificado). Sem `CONSULTAR`, a pessoa não lista naturezas, não busca CFOP
  (mesma permissão, `CadastrosFiscaisController.cs:166`) e não resolve CFOP.
- **Banco dev (medido):** 3 grupos de acesso, **só o grupo `TEC` tem permissões (20 linhas ativas)**, e **nenhuma** é
  `FISCAL_CADASTROS_*` nem `FISCAL_CONSULTAR`. Como o login fixo `master` obtém as suas é **não verificado**.
- A rota `/fiscal/naturezas-operacao` hoje não existe (404 de página), então **nenhum acesso existente seria tirado**
  por uma regra nova; a regra nova tiraria, no caminho, o acesso de quem só tem os `FISCAL_*` do catch-all.
  (Fato registrado; a classificação de `accessRisk` é da rodada.)
- O menu pai (`AppMenu.tsx:133`) lista 12 códigos e **não** os dois `FISCAL_CADASTROS_*`. Quem tiver só esses
  não veria o grupo Fiscal (o filtro avalia pai e filho de forma independente, `CLAUDE.md`).

## 7. Fluxos que produzem `CfopSemMapeamentoParaAmbito` e o painel de link (D50)

O erro é `Fiscal.CfopSemMapeamentoParaAmbito` (`FiscalErrors.cs:283-286`), com o texto "Natureza de operação {código} não tem
CFOP mapeado para o âmbito {ambito} e tipo de item {tipoItem} (nem mapeamento genérico); cadastre o CFOP antes de gerar
o documento fiscal." O texto traz o **código** da natureza, e não o id.

| Quem emite | Onde (backend) | Onde a UI o vê hoje | Com link? |
| --- | --- | --- | --- |
| Adicionar item a nota com natureza vinculada | `NotaFiscalBasicaUseCases.cs:229` | toast, `run()` de `NotaFiscalDetalhePage.tsx:132-139,351` | não |
| Gerar NF a partir de pedido, com natureza | `GerarNotaFiscalPedidoVendaUseCase.cs:211` | toast genérico, `runWithToast` em `PedidoVendaDetalhePage.tsx:204-213` (**a mensagem do backend chegar ao toast é não verificado**) | não |
| Confirmar Faturamento, leg 1 (chama o mesmo use case) | idem | `ApiErrorPanel` dentro do diálogo (`FaturamentoDialogs.tsx:239`), com `code` preservado (D93, `faturamentoApi.ts:19-43`) | não |
| `validar` da nota | **não emite**: os únicos chamadores de `ResolverCfopItem` são os dois use cases acima (`grep` em `Erp.Application`) | painel D50 (`NotaFiscalDetalhePage.tsx:163-166,220`) | só para o código da série |

- `fiscalErrosCadastroMap` tem **1 entrada**, a da série (`fiscalErrosCadastro.ts:17-19`). O comentário do arquivo
  (`:3-5`) diz que `CfopSemMapeamentoParaAmbito` "continua fora até a `b61` (D53)".
- O `NotaFiscalErroCadastroPanel` usa textos **fixos de série** (`SERIE_FISCAL_NAO_CADASTRADA_PANEL.titulo`,
  `.linkCadastrarSerie`, `.semPermissaoTexto`, `NotaFiscalErroCadastroPanel.tsx:26-33`).
- **O teste atual afirma o oposto do que a fatia vai fazer:** `NotaFiscalErroCadastroPanel.test.tsx:42` espera
  `Object.keys(fiscalErrosCadastroMap)` igual a `[codigoSerie]`, e `:45` espera
  `resolveFiscalErroCadastroLink('Fiscal.CfopSemMapeamentoParaAmbito')` **nulo**.
- **A nota não sabe a qual natureza pertence:** `NotaFiscalResponse` não tem `NaturezaOperacaoId` (§3.7). Um link de
  correção não tem id para levar; só o texto do erro cita o código.

## 8. Estados de tela

Procurei os componentes nas linhas do HEAD. Não deduzi nada pelo nome do componente. "Não se aplica" = a tela não tem essa
situação.

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tela de manutenção de naturezas | **não existe** | não existe | não existe | não existe | não existe | não existe | não existe |
| `NaturezaOperacaoField` (Confirmar Faturamento) | presente (`EntitySelect loading`, `disabled={… \|\| isLoading}`, `NaturezaOperacaoField.tsx:84`) | presente: `Message` warn + botão Recarregar (`:66-74`). **O texto diz "O cadastro de naturezas ainda não tem tela; peça a inclusão ao responsável fiscal"** (`fiscalLabels.ts:18`), e o e2e o afirma literalmente (`v1.11.0a8b71-faturamento.spec.ts:36`) | presente: `ApiErrorPanel` + Recarregar (`:57-63`) | não se aplica | não se aplica | presente: `Dropdown` desabilitado + `Message` warn (`:44-51`); também "sem empresa" (`:40-42`) | presente no Confirmar (`motivoIndisponivel`, `FaturamentoDialogs.tsx:206,227`) |
| Campo natureza em "Nova nota manual" / "Gerar NF" | não se aplica | não se aplica | não se aplica | não se aplica | não se aplica | ausente (input desabilitado para todos, sem saber por quê além da dica) | presente só como dica textual (`fiscalLabels.ts:30-31,41-42`) |
| `SeriesFiscaisPage` (precedente) | presente (`DataTableServer loading`, `:169`) | presente **em dobro**: `emptyMessage` + `EmptyState` (`:169,203`); o `EmptyState` também aparece com a consulta em erro (`!isLoading && totalRecords === 0`) | presente (`ApiErrorPanel`, `:168`), **sem botão de tentar de novo** (`ApiErrorPanel.tsx`: sem `retry`) | ausente | **ausente**: fecha o diálogo sem toast (`grep -i toast` em `SeriesFiscaisPage`, `useSeriesFiscais`, `SerieFiscalDialogs` → 0) | presente (`UnauthorizedState`, `:85-86`) | presente no "Nova série" (`title` com a permissão que falta, `:148`); as ações de linha **somem** por permissão (`DataTableActions.tsx:28` filtra) |
| `SerieFiscalDialogs` (precedente de diálogo) | presente (botão `loading`) | não se aplica | presente (`Message` com `error.message`; código de erro → campo via `CRIAR_SERIE_CAMPO_POR_CODIGO`, `:100-102`) | ausente | fecha sem toast | não se aplica | presente (Inativar desabilitado sem motivo, `:323`) |
| `CfopSelect` | presente (`SearchSelect loading`) | presente ("Nenhum CFOP encontrado.") | **ausente** (erro da busca não é mostrado: o select só exibe lista vazia) | ausente | não se aplica | presente ("…não possui FISCAL_CADASTROS_CONSULTAR", `CadastroFiscalSelects.tsx:21,89`) | não se aplica |

## 9. Banco dev (medido, só leitura)

`docker exec logosoft-postgres psql -U erp_user -d erp -At -c "select …"`. Nomes de coluna são PascalCase entre aspas.

| O quê | Valor | Como |
| --- | --- | --- |
| `erp.naturezas_operacao` | **0 linhas** | `select count(*)` |
| `erp.naturezas_operacao_cfop` | **0 linhas** | idem |
| `erp.cfop` | 64 (todos `Ativo`); por `Ambito`/`Tipo`: Interno 15 Entrada + 15 Saída, Interestadual 13 + 13, Exterior 4 + 4; **32 começam por 5/6/7** | `group by "Ambito","Tipo"` |
| CFOPs de saída de venda presentes | 5101, 5102, 6101, 6102, 7102 | `select … where "Codigo" in (…)` |
| Empresas | 2 | `select count(*) from erp.empresas` |
| Permissões `FISCAL_CADASTROS_%` em `erp.permissoes` | 2 (`CONSULTAR`, `GERENCIAR`) | `select "Codigo" … like` |
| Grupos de acesso | 3; `grupos_acesso_permissoes`: 20 linhas, todas do grupo `TEC`, nenhuma `FISCAL_CADASTROS_*` | `group by` |
| Colunas de `naturezas_operacao` | 20, incluindo `Finalidade`, `IndicadorPresencaComprador`, `IndicadorConsumidorFinal`, `MovimentaEstoque`, `GeraFinanceiro`, `Status`, `InactivatedAt/By` | `information_schema.columns` |

Conclusão medida: **hoje nenhuma empresa do dev tem natureza**, então o combo da b71 vem vazio e o Confirmar fica
indisponível (`fiscalLabels.ts:17-18`). Sem mapeamento de CFOP também não há derivação possível.

## 10. Plano de referência da b59 (`38e2213`) × backend × HEAD

Comparei o plano (`git show 38e2213:docs/fatias/v1.11.0a8b59-naturezas-operacao-cfop.md`) com o backend e com o HEAD.
É insumo, não decisão. Onde o plano diz X e a fonte diz Y, a linha aponta.

| # | O plano diz | A fonte diz | Fonte |
| --- | --- | --- | --- |
| P-1 | §4 item 6: o erro de código duplicado é `Fiscal.NaturezaOperacaoCodigoDuplicado` | o código real é **`FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO`**; o nome do plano é o da propriedade C# `NaturezaOperacaoCodigoDuplicado` | `CadastrosFiscaisErrors.cs:105-106` |
| P-2 | §4 item 1: "`filialId` é opcional. **Query e `queryKey` precisam carregar ambos**" (`empresaId` e `filialId`) | a **listagem não tem `filialId`**: só o corpo do POST o tem. O guard da listagem usa `filialId: null` | `NaturezasOperacaoController.cs:43-52`; `NaturezaOperacaoConsultas.cs:86` |
| P-3 | §4 item 2: "enviar lista parcial no PUT remove os ausentes" | certo, e **falta**: `null` não mexe em nada; `[]` remove todos; chave duplicada na lista, a última vence sem erro | §4.3 |
| P-4 | §4 item 3 e AC-5: "o seletor pode ler o catálogo por `Id`, mas o payload envia o código" | o `CfopSelect` do HEAD já entrega o código no 2º argumento do `onChange`. O `CfopResumoResponse` do frontend **não declara `ambito`**, e a busca não filtra por âmbito nem `tipo` | §5 |
| P-5 | §4 item 7 e AC-6: "busca de CFOP continua paginada, **com debounce**" | no HEAD **não há debounce**; a D52 já o exigia e ele não foi feito | §5 |
| P-6 | AC-1: "tipos e schemas cobrem `MapeamentoCfop*` … teste de contrato contra os records" | o contrato que os gates leem (`BACKEND-ESTADO…:2789-2790`) tem `MapeamentoCfopRequest(Ambito, CfopCodigo)` e `MapeamentoCfopResponse(Ambito, CfopId, CfopCodigo)`: **sem `TipoItem`**. O C# tem (`NaturezaOperacaoContracts.cs:15,51`). Um teste escrito contra o documento perde a 2ª dimensão da chave | NO-4 |
| P-7 | Bloco A: "**Arquivos novos** previstos: `api/naturezasOperacaoApi.ts`, `types/naturezasOperacao.types.ts`, `schemas/naturezasOperacaoSchemas.ts`, `hooks/useNaturezasOperacao.ts`" | os **quatro já existem** no HEAD (b71), só com o combo: `listar` com `somenteAtivas` fixo em `true`, schema de 6 campos que descarta 9. O plano não conhece esses arquivos | NO-1, NO-2 |
| P-8 | AC-7: "`FiscalActionDialogs.tsx` remove a legenda falsa de 'sem endpoint operacional'" | a legenda **já foi reescrita** pela b71 (`fiscalLabels.ts:27-42`). O que resta é o **campo**: `InputText disabled` com placeholder "Parametrização fiscal futura" (`FiscalActionDialogs.tsx:142,203`) e a dica "este diálogo ainda não oferece a seleção" | NO-13 |
| P-9 | AC-8: a **nota** mostra o texto e o link de `CfopSemMapeamentoParaAmbito` | o erro **não sai do `validar`** (o único gatilho do painel D50). Sai do Adicionar item, do Gerar NF e do Confirmar Faturamento; nenhum tem painel de link. A nota não carrega a natureza | §7, NO-14 |
| P-10 | Plano: a `b71` "fica bloqueada pela conclusão desta fatia" (§7) e a fatia é `b59` | a `b71` **saiu** (HEAD `48eb7ff`) sem ela; a fatia foi renumerada `b72` (`DECISOES.md:2486`); a D91 consome só o GET | `CHANGELOG`, D91 |
| P-11 | AC-3: S1 a S4, "menu e regra de rota usam CONSULTAR ou GERENCIAR, **sem retirar capacidade existente**" | o pai do menu (`AppMenu.tsx:133`) não tem as duas permissões; o catch-all `/fiscal` (`routePermissions.ts:57`) também não. Sem regra de rota e sem pai, S1 e S2 não veem o item | §1, §6 |
| P-12 | AC-3: `GERENCIAR` sem `CONSULTAR` "não acessa" (S3) | coerente: o backend exige `CONSULTAR` para listar e para buscar CFOP; `GERENCIAR` não implica `CONSULTAR` | §6 |
| P-13 | AC-4: "Inativar pede motivo e aceita 204" | certo; **falta** o teto: `Motivo` sem máximo no domínio, e o texto da auditoria tem 500 | NO-9 |
| P-14 | `accessRisk: NENHUM` (§0) | não medi o risco; registro o fato: nenhuma regra de rota nem item de menu de natureza existe, e nenhum grupo do dev concede `FISCAL_CADASTROS_*` | §6 |
| P-15 | §1: a regra "única por empresa" | o índice é `(EmpresaId, Codigo)` (**sem filial**), e a checagem de duplicidade **inclui inativas** | §3.6 |
| P-16 | §5 AC-2: troca de empresa invalida a consulta | o hook do HEAD usa `['fiscal','naturezas-operacao','opcoes',empresaId]` (`useNaturezasOperacao.ts:16-18`), raiz compatível com o plano; o escopo organizacional não entra na chave (Séries usa `organizationalScopeKey`) | `useSeriesFiscais.ts:24` |
| P-17 | Premissa implícita: o plano assume a edição a partir de `GET` por id | **não existe** `GET {id}`; a edição sai do item da listagem | §2 |

## 11. O que ficou obsoleto no inventário 04 (`04-inventario-cadastros-fiscais.md`)

| Onde (04) | O que dizia | Hoje |
| --- | --- | --- |
| `:11` | "F3.2 Naturezas de operação e CFOP derivado **0/5**" | **1/5** (a b71 consome o GET) |
| `:127` | `CriarNaturezaOperacaoRequest` "**12 campos**" | o record tem **13**; o próprio 04 lista 13 nomes |
| `:127` | "sem `default` posicional exceto `Observacao?`/`Cfops?`" | nenhum campo tem `default` nos records de natureza; o único é `MapeamentoCfopRequest.TipoItem = null` (`:15`) |
| `:126,127,128` | `MapeamentoCfopRequest` não descrito (2 campos no contrato); resposta do mapeamento "4 campos" | o 04 já lia 4 na resposta, mas o request real tem **3** (`TipoItem`); o contrato canônico continua com 2 e 3 (NO-4) |
| `:494-496` e DIV-2 (`:621`) | `FiscalActionDialogs.tsx:136,187`, "hint 'Ainda sem endpoint operacional no backend…'" | linhas agora `:142,203`; **a hint foi reescrita** (b71). O campo continua `disabled` |
| `:497` | Série da nota "texto livre" (`FiscalActionDialogs.tsx:109,133,150,183` no 04) | obsoleto desde a b58 (`NotaFiscalSerieField`); fora do recorte |
| `:435-436,447` (§4) | "zero ocorrências" de rota e menu; `types/erp.ts:291-292`, catálogo `:121-122`, `SystemPermissions.cs:126-127` | segue **0** para natureza. As linhas do union são agora `:311-312` e as do catálogo FE `:117-118`. `SystemPermissions.cs:126-127` e o snapshot `:114-115` batem |
| `:119` (§1.2 cabeçalho) | "0/5 consumidos" | 1/5 |
| DIV-3 e DIV-4 | B-7 e B-8 | **continuam abertas** (não achei resposta do backend). A D51 já decidiu o tratamento no frontend (só ativas; 400, sem fluxo de 409) |
| DIV-5 (`:647`) | "seis mensagens apontam para telas inexistentes" | **Séries** tem tela desde a b58; **Naturezas** e as quatro `DestinatarioSem*` continuam sem |
| `:530` | "Naturezas de operação: 0 — nenhuma seed; 5 filtros combináveis" | 0 segue verdade no dev (§9); a listagem tem **6** filtros além de `empresaId` e da paginação (`termo`, `codigo`, `tipoDocumento`, `tipoOperacao`, `finalidade`, `somenteAtivas`) |
| `:564-565` (conta) | "23 campos de response, sem tela = 23" | conta no HEAD: 15 + 8 = 23 **entregues**; o frontend declara **6** dos 15 e **0** dos 8 (§3.1, §3.4) |

O 04 **continua certo** em: o guard por empresa, o 404 genérico de `Forbidden`/`NotFound`, o 400 para `Conflict`, a
substituição completa dos `Cfops`, o `204` do inativar, a natureza inativa aceita na derivação, e a ausência de permissão própria.

## 12. Testes e gates que tocam o recorte (lista para o QA)

Medido com `grep -rli` em `tests/`. **Nenhum foi executado nesta sessão.**

```text
# afirmam o desenho antigo e ficam vermelhos se o mapa de erro, o texto ou a regra mudarem
tests/components/NotaFiscalErroCadastroPanel.test.tsx   :42 (keys do mapa == [série]), :45 (CfopSemMapeamento == null)
tests/e2e/v1.11.0a8b71-faturamento.spec.ts              :36 (texto do vazio: "O cadastro de naturezas ainda não tem tela…")
tests/unit/routePermissions.test.ts                     :43-45 (AC-14 de /fiscal/series); qualquer regra nova de rota

# mencionam "naturez" (nome ou conteúdo)
tests/components/ConfirmarFaturamentoDialog.test.tsx
tests/components/FaturamentoConfirmarResultado.test.tsx
tests/e2e/fiscal-backend.spec.ts
tests/e2e/integrated-backend.spec.ts
tests/unit/faturamentoPayload.test.ts
tests/unit/fiscalPayload.test.ts
tests/unit/gateContractRequestFields.test.ts
tests/unit/tributacaoPayload.test.ts

# leem routePermissions.ts ou AppMenu.tsx (38 arquivos: grep -rln "routePermissions\|AppMenu" tests/unit | wc -l)
tests tocados por qualquer edição de rota/menu do Fiscal: routePermissions, guardPermissionMap*, *Structure

# CFOP select e hook (mover para features/fiscal): 0 arquivos por nome
grep -rln "useCfopOptions\|CfopSelect\|cfopOptionsQueryKey\|cadastros/cfop\|tributacao/cadastros" tests   -> vazio

# gates que não conhecem natureza
scripts/gate-contract-request-fields.mjs    SCHEMA_TO_REQUEST_MAP (:47-78): nenhum dos 3 requests de natureza
scripts/backend-response-records.snapshot.json e gate-contract-fields.*: 0 ocorrências de NaturezaOperacao
scripts/validate-guid-references.mjs:29     lista 'naturezaOperacaoId' entre os nomes de referência por GUID
```

---

## Divergências

**NO-1: o parse do client descarta 9 dos 15 campos de `NaturezaOperacaoResponse`, inclusive `cfops`.**
O backend entrega 15 (`NaturezaOperacaoContracts.cs:53-68`). O frontend declara 6
(`naturezasOperacao.types.ts:11-18`) e o schema é `z.object` não estrito (`naturezasOperacaoSchemas.ts:19-26`), que
**remove** chaves desconhecidas. Medido: `zod@3.25.76` → `{"id":"a","codigo":"b"}`. Tudo o que `naturezasOperacaoApi.listar`
devolve (`:44`) perde `tipoDocumento`, `tipoOperacao`, `finalidade`, `indicadorPresencaComprador`, `indicadorConsumidorFinal`,
`movimentaEstoque`, `geraFinanceiro`, `observacao`, `cfops`. Classe: campo entregue pelo backend que a UI ignora, aqui
por descarte ativo na borda. Dos 6 declarados, 3 são `sem uso` (`empresaId`, `filialId`, `ativa`).

**NO-2: o client e o hook existentes são do combo e não servem a uma lista de manutenção sem mudança.**
`listar` fixa `somenteAtivas: true` (`naturezasOperacaoApi.ts:31`), não aceita `codigo`, `tipoDocumento`, `tipoOperacao`
nem `finalidade`, tem `tamanhoPagina` default 200 (`naturezasOperacaoSchemas.ts:14`) e a chave do hook é `…,'opcoes',empresaId`
(`useNaturezasOperacao.ts:18`). `naturezaOperacaoIndisponivelMotivo` e o texto do vazio (`fiscalLabels.ts:18`) também são do
Confirmar. Não há `POST`, `PUT` nem `inativar` no client.

**NO-3: `somenteAtivas=false` não filtra inativas em naturezas.**
Só `somenteAtivas == true` filtra (`NaturezaOperacaoRepository.cs:34-37`); `false` e `null` devolvem tudo. O
precedente de Séries escreve "Inativas envia `false` explícito" (`seriesFiscaisApi.ts:29-31`). Em naturezas, **não existe filtro
"somente inativas" no servidor**. Classe: precedente que não vale para o novo recurso. Não verifiquei o comportamento de
Séries no backend.

**NO-4: o contrato que alimenta os gates não tem `TipoItem` no mapeamento.**
`BACKEND-ESTADO-ATUAL-E-CONTRATO.md:2789-2790` (data 2026-08-12, branch `feat/v1.18.0-g1…`):
`MapeamentoCfopRequest(Ambito, CfopCodigo)` e `MapeamentoCfopResponse(Ambito, CfopId, CfopCodigo)`. O C# do HEAD tem
`TipoItemCfop? TipoItem` nos dois (`NaturezaOperacaoContracts.cs:15,51`, v1.18.0/G3). A rota `GET {id}/cfop` está
documentada **sem** `tipoItem` (`:1442`; o C# tem, `:134`). `TipoItemCfop`: **0 ocorrências** nos três documentos
(`BACKEND-ESTADO…`, `CONTRATO-API-v1.23.md`, `FLUXOS-E-REGRAS-PARA-A-UI.md`). O `CONTRATO-API-v1.23.md:9138-9188` cita
`MapeamentoCfopRequest[]` só pelo nome, sem expandir os campos. Classe: tipo diferente entre a fonte que o gate lê e a
resposta real; é a mesma classe de FT-19 da rodada 13 (`ResolverCfop` sem `tipoItem`).

**NO-5: o contrato e o GAP estão atrasados e imprecisos.**
- `CONTRATO-API-v1.23.md:9135`: `empresaId?` opcional na listagem. O C# é `Guid empresaId` não anulável
  (`NaturezasOperacaoController.cs:44`); ausente vira `Guid.Empty` e 400 `Fiscal.EmpresaObrigatoria`.
- `:9133` "Frontend ❌ não consome" para o GET: consumido desde a b71. `GAP-FRONTEND-BACKEND.md:228-232` ("faltam 5 de 5") e
  `:232` ("0/5"): são 4 de 5 faltando.
- Os três blocos `GET`, `POST` e `PUT` do contrato não trazem a linha "Response DTO" (as outras seções trazem).

**NO-6: permissões existem nas fontes e estão ausentes da rota e do menu.**
`FISCAL_CADASTROS_CONSULTAR/GERENCIAR` estão no backend, no banco, no snapshot, no union e no catálogo FE. Estão
**ausentes** de `routePermissions.ts` (sem regra de natureza; o catch-all `/fiscal`, `:57`, não as lista) e do pai do menu
(`AppMenu.tsx:133`). O catálogo estruturado do backend dá ao recurso a rota **`/fiscal/cadastros`**
(`PermissoesCatalogoDefinition.cs:191`), e o frontend não tem essa rota (nem a que o plano propõe).

**NO-7: a listagem ignora a filial, e a edição a exige.**
A listagem filtra só por empresa (`NaturezaOperacaoRepository.cs:29-32`; guard com `filialId: null`,
`NaturezaOperacaoConsultas.cs:86`). `PUT` e `inativar` chamam `GarantirAcesso(natureza.EmpresaId, natureza.FilialId)`
(`NaturezaOperacaoUseCases.cs:202-203`). Pela leitura, um usuário com filial própria **vê** a natureza de outra filial
na lista (e no combo do Confirmar) e **recebe 404 genérico** ao editá-la. **Não medido em execução.** Não sei se já existe
natureza com `FilialId` preenchido (o dev tem 0 naturezas).

**NO-8: erros de negócio quase todos com o mesmo código; mapear por `Error.Code` (D50) só serve para 4.**
Não há FluentValidation para natureza (`grep "AbstractValidator<.*Natureza"` → 0). Toda falha do domínio vira
`FISCAL_CADASTROS_VALIDACAO` com texto livre: código vazio, com espaço, > 40; descrição vazia ou > 200; observação > 500;
enum fora do conjunto; CFOP inativo; âmbito incompatível; natureza inativa; motivo vazio; natureza já inativa. Só
`…_NATUREZA_CODIGO_DUPLICADO` e `…_CFOP_NAO_ENCONTRADO` têm código próprio na escrita. Natureza de outra empresa e natureza
inexistente são o mesmo 404 (`Recurso.NaoEncontrado`). Séries tem um mapa código→campo
(`CRIAR_SERIE_CAMPO_POR_CODIGO`); aqui não haveria código para mapear a maioria dos campos.

**NO-9: `Motivo` da inativação sem limite, e a auditoria tem 500.**
`AuditableEntity.Inativar` só exige não vazio (`:36-39`). O use case grava
`$"Natureza de operação {Codigo} inativada. Motivo: {Motivo}"` (`NaturezaOperacaoUseCases.cs:262`) em
`AuditoriaEvento.Descricao`, coluna `HasMaxLength(500)` (`AuditoriaEventoConfiguration.cs:17`); o construtor não corta nem
valida o tamanho (`AuditoriaEvento.cs:28-36`). O texto fixo tem 41 caracteres (contei à mão) mais o código (até 40). Um motivo
muito longo excede a coluna. **O efeito (erro 500, truncamento ou 400) não foi verificado em execução.** O
Cancelar do Faturamento tem `max(300)` no frontend (D30); o de Séries, não conferi.

**NO-10: o mapeamento aceita CFOP de entrada e qualquer combinação com `TipoOperacao`.**
Só âmbito e `Ativo` são validados (`NaturezaOperacaoCfop.cs:39-50`). Medido no dev: 32 dos 64 CFOPs são `Entrada`, e um
`Venda` com `1102` passa pelo domínio. **O `CfopSelect` do HEAD não filtra `tipo` nem `ambito`** (`tributacaoApi.ts:240`). O
backend aceita os dois filtros (`CadastrosFiscaisController.cs:170-171`). Classe: regra de negócio que o backend não
impõe e a UI não guia.

**NO-11: `CfopResumoResponse` no frontend não declara `ambito`; 7 dos 12 campos do backend não entram.**
Ver §3.5. O `ambito` é justamente a dimensão que define em qual linha da grade do mapeamento o CFOP cabe.

**NO-12: `CfopSelect` sem debounce, sem tratamento de erro, em `features/tributacao`.** (A rodada 04, DIV-8 `:676`, e a D51 item 4 pedem Zod não estrito no código movido; o hook atual não tem schema nenhum.)
D47 item 3 (mover) e D52 (debounce) **não foram cumpridas** (`CadastroFiscalSelects.tsx:86`, `useTributacao.ts:17,87-100`). O
erro da busca não é exibido (estado "erro recuperável" ausente na tabela §8). Zero testes por nome.

**NO-13: os dois diálogos de nota ainda têm o campo de natureza desabilitado.**
`FiscalActionDialogs.tsx:142` (nota manual) e `:203` (Gerar NF): `InputText disabled`, placeholder "Parametrização fiscal
futura"; `naturezaOperacaoId` sai sempre `null` (`:118,161`). As dicas (`fiscalLabels.ts:30-31,41-42`) dizem que o diálogo
"ainda não oferece a seleção". O Gerar NF nasce com `validarDadosFiscaisProduto=true` e `cfopPadrao='5102'` (`:162,164`).
Pela leitura do backend (`GerarNotaFiscalPedidoVendaUseCase.cs:165-168`), sem natureza e com a validação ligada, o Gerar NF
recebe 400 `Fiscal.CfopNaturezaOperacaoNaoInformada`: é a mesma classe do FT-2 da rodada 13, agora no Gerar NF.
**Não medido em execução.** O texto do vazio do combo (`fiscalLabels.ts:18`) diz que o cadastro "ainda não tem tela"; é
verdade hoje e é asserido por e2e (`v1.11.0a8b71-faturamento.spec.ts:36`).

**NO-14: o painel D50 é de série e o erro de CFOP não passa por ele.**
Ver §7: 1 entrada no mapa, textos fixos de série, alimentado só por `validar`; `CfopSemMapeamentoParaAmbito` não sai do
`validar`. `NotaFiscalResponse` não tem `NaturezaOperacaoId`. O teste atual exige o mapa com 1 entrada e o link de CFOP nulo
(`NotaFiscalErroCadastroPanel.test.tsx:42,45`).

**NO-15: sem reativação e sem registro do motivo.**
Não há rota para reativar natureza, apesar de `AuditableEntity.Reativar` existir. O motivo da inativação só vive no evento de
auditoria, e a resposta da natureza não traz `motivoInativacao`, `inativadaEm` nem `inativadaPor` (o CFOP traz
`MotivoInativacao`, a natureza não). Natureza inativa segue aceita pela derivação de CFOP (B-7, aberta).

**NO-16: enums de natureza sem equivalente no frontend e com opções restritas.**
`IndicadorPresencaComprador`, `AmbitoCfop` e `TipoItemCfop` **não existem** no frontend. `tipoDocumentoFiscalOptions` oferece
**2 de 6** valores, e o backend aceita os 6 para natureza. `FinalidadeNaturezaOperacao` mora em `features/tributacao`. Sem
enum correspondente no backend: nenhum caso (todo enum do frontend de natureza tem par no C#).

**NO-17: os gates de contrato não cobrem natureza.**
`gate-contract-request-fields.mjs` (`SCHEMA_TO_REQUEST_MAP`) não tem os três requests de natureza;
`backend-response-records.snapshot.json` e `gate-contract-fields.*` têm **0** ocorrências de `NaturezaOperacao`. Por
consequência, o gate hoje não detectaria NO-4. **Não executei nenhum gate.**

**Sem divergência encontrada (afirmação com evidência, não silêncio):**
- **Campo lido pela UI que o backend não entrega:** **0** em 16 posições de campo de resposta declaradas (6 + 5 + 5),
  comparadas uma a uma com o record C#.
- **Tipo diferente entre o schema Zod e a resposta real:** nenhum observado na leitura (`string` × `Guid`, `boolean`,
  `nullable`); **não verificado em resposta real**, porque não houve chamada autenticada.
- **Enum fixo no frontend sem correspondente no backend:** **0**: os três enums de natureza que existem no frontend
  (`TipoDocumentoFiscal`, `TipoOperacaoFiscal`, `FinalidadeNaturezaOperacao`) batem nome a nome e valor a valor com o C#.
- **Endpoint consumido fora da allowlist:** a allowlist é `audit-only` e vazia; a rota consumida (`GET /api/fiscal/naturezas-operacao`)
  consta do catálogo de `BACKEND-ESTADO…:1438`. O gate não foi rodado.

---

## Conta de campos, fechando

**Respostas (o que o backend entrega × o que o frontend declara):**

| Record | Backend entrega | Frontend declara | Com destino | Divergência (lido e não entregue) | Sem uso | Entregue e não declarado |
| --- | --- | --- | --- | --- | --- | --- |
| `NaturezaOperacaoResponse` | 15 | 6 | 3 (`id` enviado, `codigo`, `descricao` exibidos) | 0 | 3 (`empresaId`, `filialId`, `ativa`) | 9 |
| `MapeamentoCfopResponse` | 4 | 0 | 0 | 0 | 0 | 4 |
| `PagedResult<T>` | 7 | 5 | 2 (`items`, `totalItems`) | 0 | 3 (`page`, `pageSize`, `totalPages`) | 2 |
| `CfopResolvidoResponse` | 8 | 0 | 0 | 0 | 0 | 8 |
| `CfopResponse` (catálogo) | 12 | 5 | 3 (`id` enviado, `codigo`, `descricao` exibidos) | 0 | 2 (`tipo`, `ativo`) | 7 |
| **Total** | **46** | **16** | **8** | **0** | **8** | **30** |

Fórmula dos declarados: **16 = 8 + 0 + 8**. Fecha. Fórmula do total: **46 = 16 declarados + 30 não declarados**. Fecha
(9 + 4 + 2 + 8 + 7 = 30).

**Requests e queries (o que o backend aceita × o que o frontend tem):**

| Request ou query | No backend | Enviados | Declarado sem uso | Ausentes |
| --- | --- | --- | --- | --- |
| `CriarNaturezaOperacaoRequest` | 13 | 0 | 0 | 13 |
| `AtualizarNaturezaOperacaoRequest` | 10 | 0 | 0 | 10 |
| `InativarNaturezaOperacaoRequest` | 1 | 0 | 0 | 1 |
| `MapeamentoCfopRequest` | 3 | 0 | 0 | 3 |
| Query `GET` lista | 9 | 4 (`empresaId`, `somenteAtivas` fixo, `pagina`, `tamanhoPagina`) | 1 (`termo`) | 4 |
| Query `GET {id}/cfop` | 4 | 0 | 0 | 4 |
| **Total** | **40** | **4** | **1** | **35** |

Fórmula: **40 = 4 + 1 + 35**. Fecha. Como medi: leitura pareada dos records em `NaturezaOperacaoContracts.cs` e do controller
contra `grep` no frontend (0 ocorrência dos quatro nomes de request), e contagem dos parâmetros da assinatura do controller.

## Destino por item (resumo para a rodada)

| Item | Destino hoje |
| --- | --- |
| `NaturezaOperacaoResponse.id` | enviado (Confirmar Faturamento) |
| `.codigo`, `.descricao` | exibidos (rótulo do combo) |
| `.empresaId`, `.filialId`, `.ativa` | sem uso |
| Os outros 9 campos da natureza e os 4 do mapeamento | sem campo no frontend (descartados pelo parse) |
| `PagedResult.items`, `.totalItems` | exibidos |
| `PagedResult.page`, `.pageSize`, `.totalPages` | sem uso |
| `CfopResponse.id` | enviado (Regra fiscal) |
| `.codigo`, `.descricao` | exibidos |
| `.tipo`, `.ativo` | sem uso |
| `naturezaOperacaoId` em Confirmar | enviado |
| `naturezaOperacaoId` em Gerar NF e Nova nota | enviado, sempre `null` |
| `termo` da query de naturezas | sem uso |

---

## Pendências

**Resolve-se lendo o código (respondido acima, sem pergunta ao backend):**

- Se a listagem é paginada e o shape: sim, `PagedResult<NaturezaOperacaoResponse>`, `pagina`/`tamanhoPagina`, teto 200, ordem por `Codigo` (§2).
- O que o inativar devolve: `204` sem corpo, motivo só na auditoria, sem reativar (§4.4).
- Regra de código duplicado: `Error.Conflict` com código `FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO`, sai 400, por `(EmpresaId, Codigo)`, inclui inativas (§3.6).
- Semântica dos `Cfops` no PUT: substituição completa; `null` preserva; `[]` apaga (§4.3).
- Limites: código 40, descrição 200, observação 500, sem espaço no código; motivo sem teto (§3.6).

**Perguntas ao backend:**

- **P-1 (B-7, já aberta):** `ResolverNaturezaAsync` deveria recusar natureza inativa? Hoje aceita. Decide se a tela precisa avisar
  de natureza inativa em nota já criada.
- **P-2 (B-8, já aberta):** os `Error.Conflict` de natureza passarão a 409? Hoje saem 400, e a D51 já decidiu tratar como 400.
- **P-3:** natureza inativa deve poder ser reativada? Hoje não há rota, e `AuditableEntity.Reativar` existe. Decide se a tela
  oferece "Reativar" ou declara a inativação irreversível.
- **P-4:** qual o comportamento esperado para `Motivo` > ~420 caracteres (NO-9)? Deveria haver `MaximumLength` como nos outros
  cadastros?
- **P-5:** a listagem deveria filtrar por filial, ou a edição deveria ignorá-la (NO-7)? Existe natureza com `FilialId` em uso fora do dev?
- **P-6:** o mapeamento deveria validar `Tipo` do CFOP (Saída) contra o `TipoOperacao` da natureza, e o final do CFOP contra o `TipoItem` (NO-10)?
- **P-7:** `NotaFiscalResponse` poderia expor `NaturezaOperacaoId`? Sem ele, a nota não aponta qual natureza corrigir (§7).
- **P-8:** o contrato canônico (`BACKEND-ESTADO…`) será regenerado com `TipoItem` no mapeamento (NO-4)?

**Perguntas ao produto e à rodada (não ao backend):**

- A rota fica em `/fiscal/naturezas-operacao` (plano da b59) ou em `/fiscal/cadastros` (recurso do catálogo do backend, NO-6)?
- A inativação de natureza é irreversível na tela (P-3)?
- A manutenção inclui o link de `CfopSemMapeamentoParaAmbito` no Confirmar Faturamento e no Gerar NF, ou só na nota (§7)?
- A troca do campo desabilitado dos diálogos de nota (NO-13) entra na `b72`? A D91 a deixou como dívida.

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "naturezas-operacao",
  "slice": "v1.11.0a8b72",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/14-inventario-naturezas-operacao.md",
  "arvoreMedida": "frontend HEAD 48eb7ff (git status limpo fora de .claude/settings.local.json, .codex/, .agents/); backend branch fix/v1.23.3-g3-crt-com-semantica-de-manutencao HEAD ab5d00a, arvore com 10 arquivos modificados, nenhum de natureza de operacao; banco dev via psql (erp_user, erp), so select",
  "motivoWarnings": "Nenhuma chamada HTTP autenticada, nenhum gate e nenhum teste executado. 'Backend entrega' e leitura de C#. Efeito em execucao de NO-7 (filial), NO-9 (motivo longo x auditoria 500) e NO-13 (Gerar NF sem natureza) e nao verificado.",
  "contagemDeCampos": {
    "NaturezaOperacaoResponse": "15 no backend, 6 declarados = 3 com destino + 0 divergencia + 3 sem uso (empresaId, filialId, ativa); 9 entregues e nao declarados (tipoDocumento, tipoOperacao, finalidade, indicadorPresencaComprador, indicadorConsumidorFinal, movimentaEstoque, geraFinanceiro, observacao, cfops), descartados pelo parse z.object. NaturezaOperacaoContracts.cs:53-68 x naturezasOperacao.types.ts:143-150.",
    "MapeamentoCfopResponse": "4 no backend, 0 declarados, 4 nao declarados. NaturezaOperacaoContracts.cs:51.",
    "PagedResult": "7 no backend, 5 declarados = 2 com destino + 0 + 3 sem uso (page, pageSize, totalPages); 2 nao declarados (hasPreviousPage, hasNextPage). PagedResult.cs:3-11 x types/erp.ts:403.",
    "CfopResolvidoResponse": "8 no backend, 0 declarados, 8 nao declarados. NaturezaOperacaoContracts.cs:74-82.",
    "CfopResponse": "12 no backend, 5 declarados = 3 com destino + 0 + 2 sem uso (tipo, ativo); 7 nao declarados. CadastrosFiscaisResponses.cs:121-133 x tributacao.types.ts:659-665.",
    "totalRespostas": "46 entregues = 16 declarados + 30 nao declarados; 16 = 8 com destino + 0 divergencia (lido e nao entregue) + 8 sem uso.",
    "requestsEQueries": "40 no backend = 4 enviados + 1 declarado sem uso (termo) + 35 ausentes. Criar 13, Atualizar 10, Inativar 1, MapeamentoCfopRequest 3, query lista 9 (4 enviados, 1 sem uso, 4 ausentes), query GET cfop 4."
  },
  "medicoes": [
    { "o_que": "zod remove chaves desconhecidas no parse de naturezaOperacaoResponseSchema", "valor": "{\"id\":\"a\",\"codigo\":\"b\"} a partir de {id,codigo,cfops,finalidade}", "como": "node -e com zod@3.25.76 do repositorio" },
    { "o_que": "naturezas e mapeamentos no banco dev", "valor": "0 e 0", "como": "psql select count(*) erp.naturezas_operacao / erp.naturezas_operacao_cfop" },
    { "o_que": "CFOPs no catalogo dev", "valor": "64 (32 Entrada, 32 Saida; Interno 30, Interestadual 26, Exterior 8), 32 comecam por 5/6/7", "como": "psql group by Ambito, Tipo em erp.cfop" },
    { "o_que": "grupos de acesso que concedem FISCAL_CADASTROS_*", "valor": "0 (3 grupos; so TEC tem 20 permissoes)", "como": "psql join erp.grupos_acesso_permissoes x erp.permissoes" },
    { "o_que": "rotas de natureza consumidas pelo frontend", "valor": "1 de 5", "como": "grep de /api/fiscal/naturezas-operacao em features/ (so naturezasOperacaoApi.ts:43)" },
    { "o_que": "testes que referenciam a busca de CFOP por nome", "valor": "0", "como": "grep -rln useCfopOptions|CfopSelect|cfopOptionsQueryKey|cadastros/cfop|tributacao/cadastros tests" },
    { "o_que": "testes que leem routePermissions ou AppMenu", "valor": "38", "como": "grep -rln routePermissions|AppMenu tests/unit | wc -l" },
    { "o_que": "ocorrencias de TipoItemCfop nos tres documentos de contrato", "valor": "0", "como": "grep -c TipoItemCfop em BACKEND-ESTADO-ATUAL-E-CONTRATO.md, CONTRATO-API-v1.23.md, FLUXOS-E-REGRAS-PARA-A-UI.md" },
    { "o_que": "tamanho do texto fixo da auditoria de inativacao", "valor": "41 caracteres mais o codigo (ate 40)", "como": "contagem manual de 'Natureza de operacao ' + ' inativada. Motivo: ' em NaturezaOperacaoUseCases.cs:262; nao executado" }
  ],
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "P-1 (B-7): ResolverNaturezaAsync deveria recusar natureza inativa?", "decide": "se a tela avisa de natureza inativa em nota ja criada" },
    { "tipo": "backend", "pergunta": "P-2 (B-8): Error.Conflict de natureza passara a 409?", "decide": "se o tratamento de codigo duplicado muda (D51 ja fixou 400)" },
    { "tipo": "backend", "pergunta": "P-3: natureza inativa pode ser reativada? Nao ha rota, e AuditableEntity.Reativar existe.", "decide": "se a tela oferece Reativar ou declara a inativacao irreversivel" },
    { "tipo": "backend", "pergunta": "P-4: Motivo de inativacao maior que ~420 caracteres: o que acontece, dado Descricao de auditoria com 500?", "decide": "o maximo do campo motivo no cliente" },
    { "tipo": "backend", "pergunta": "P-5: a listagem deveria filtrar por filial, ou PUT/inativar deveriam ignora-la? Existe natureza com FilialId fora do dev?", "decide": "se a tela mostra coluna/filtro de filial e se o 404 ao editar e esperado" },
    { "tipo": "backend", "pergunta": "P-6: o mapeamento deveria validar Tipo do CFOP (Saida) contra TipoOperacao e o final do CFOP contra TipoItem?", "decide": "se a grade filtra o catalogo de CFOP por tipo no cliente" },
    { "tipo": "backend", "pergunta": "P-7: NotaFiscalResponse pode expor NaturezaOperacaoId?", "decide": "se o link de CfopSemMapeamentoParaAmbito na nota leva a natureza certa" },
    { "tipo": "backend", "pergunta": "P-8: BACKEND-ESTADO-ATUAL-E-CONTRATO.md sera regenerado com TipoItem no mapeamento?", "decide": "se o gate de request-fields e o teste de contrato podem cobrir a 2a dimensao da chave" },
    { "tipo": "funcional", "pergunta": "Rota da tela: /fiscal/naturezas-operacao (plano b59) ou /fiscal/cadastros (recurso do catalogo do backend)?", "decide": "regra de rota, item de menu e link do erro D50" },
    { "tipo": "funcional", "pergunta": "O link de CfopSemMapeamentoParaAmbito entra so na nota ou tambem no Confirmar Faturamento e no Gerar NF?", "decide": "tamanho do ajuste em fiscalErrosCadastro.ts e nos textos fixos de serie do painel" },
    { "tipo": "funcional", "pergunta": "A troca do campo desabilitado de natureza em Nova nota e Gerar NF entra na b72? A D91 a deixou como divida.", "decide": "se FiscalActionDialogs.tsx e fiscalLabels.ts:27-42 entram no recorte" }
  ],
  "riscos": [
    "NO-1: naturezasOperacaoApi.listar descarta 9 dos 15 campos (inclusive cfops) na borda; uma lista de manutencao sobre o client atual nasce sem tipoDocumento, finalidade, flags, observacao e mapeamento. Medido com zod 3.25.76.",
    "NO-4: o contrato lido pelos gates (BACKEND-ESTADO-ATUAL, 2026-08-12) nao tem TipoItem no mapeamento; TipoItemCfop tem 0 ocorrencias nos 3 documentos. Teste de contrato escrito contra o documento perde a 2a dimensao da chave (ambito x tipoItem).",
    "NO-3: somenteAtivas=false nao filtra inativas em naturezas (so true filtra), ao contrario do que o precedente de Series sugere; nao existe filtro 'somente inativas' no servidor.",
    "NO-7: a listagem ignora a filial e PUT/inativar a exigem; por leitura, 404 generico ao editar natureza de outra filial. Nao medido em execucao.",
    "NO-9: Motivo da inativacao sem teto e auditoria com 500; efeito (500, truncamento) nao verificado.",
    "NO-14: NotaFiscalErroCadastroPanel.test.tsx:42 e :45 afirmam o mapa D50 com 1 entrada e CfopSemMapeamentoParaAmbito nulo; ficam vermelhos quando o link entrar. O painel tem textos fixos de serie e so e alimentado por validar, que nao emite esse erro.",
    "NO-12: CfopSelect em features/tributacao, sem debounce e sem tratamento de erro, com 0 testes por nome; D47 item 3 e D52 nao cumpridas.",
    "NO-13: no HEAD, Gerar NF com validacao ligada e sem natureza selecionavel deve falhar com Fiscal.CfopNaturezaOperacaoNaoInformada (leitura de codigo; mesma classe do FT-2 da rodada 13).",
    "Sem reativacao de natureza na API e sem motivo gravado na entidade: inativar e definitivo pela API.",
    "B-7 e B-8 continuam abertas (nenhuma resposta do backend encontrada nos arquivos lidos).",
    "Nenhum grupo de acesso do dev concede FISCAL_CADASTROS_*; como o login master obtem permissoes nao foi verificado, entao nao sei como testar a tela com um usuario real no dev.",
    "Nenhum gate nem teste foi executado nesta sessao (validate:backend-contract-map, validate:guard-permission-map, validate:contract-request-fields, vitest): tudo e leitura de codigo, consulta ao banco e dois experimentos de uma linha com node/zod."
  ]
}
```
