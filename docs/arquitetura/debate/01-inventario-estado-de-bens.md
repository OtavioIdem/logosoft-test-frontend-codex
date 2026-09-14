# Inventário — recorte de Bens patrimoniais (fatia `v1.11.0a8b54.c2`)

Agente: `inventariante-contrato-tela`. Nó: `inventario`. Não propõe solução nem desenho — lista o
que existe, para o `dev-senior-react` (Bloco A) discutir contra `D18`.

Recorte lido:

```text
features/patrimonio/components/BensPage.tsx
features/patrimonio/components/PatrimonioDialogs.tsx      (BemFormDialog, TransferirBemDialog, BaixarBemDialog)
features/patrimonio/components/patrimonioLabels.ts        (só o de Bens)
features/patrimonio/types/patrimonio.types.ts             (BemPatrimonialResponse, BensListQuery, StatusBem)
features/patrimonio/api/patrimonioApi.ts                  (params de listagem de bens)
features/patrimonio/schemas/patrimonioSchemas.ts          (aberto para checar o payload das ações)
features/patrimonio/hooks/usePatrimonioResources.ts       (aberto para checar quando a query de listagem dispara)
components/forms/EmpresaFilialFilter.tsx                  (aberto para checar quando empresaId chega ao filtro)
```

Backend, só leitura, lido:

```text
docs/backend-v1.23/CONTRATO-API-v1.23.md:1155-1530
../New project 3/src/Erp.Domain/Patrimonio/PatrimonioEnums.cs
../New project 3/src/Erp.Domain/Patrimonio/BemPatrimonial.cs
../New project 3/src/Erp.Api/Controllers/Patrimonio/BensPatrimoniaisController.cs
../New project 3/src/Erp.Application/Patrimonio/Bens/BemPatrimonialContracts.cs
../New project 3/src/Erp.Application/Patrimonio/PatrimonioService.cs
../New project 3/src/Erp.Application/Patrimonio/IPatrimonioService.cs
```

---

## Tabela 1 — campos

### 1a. Campos de `BemPatrimonialResponse` (frontend) — os que a UI de Bens lê de um registro

| Arquivo:linha da leitura | Campo TS | Campo C# correspondente | Tipo (FE / BE) | Situação | Destino |
|---|---|---|---|---|---|
| `BensPage.tsx:68,72,76,80` (`alvo.id`, usado como `{id}` nas quatro mutações) | `id` | `Guid Id` | `Guid` / `Guid` | bate | fora do escopo com destino nomeado — chave técnica, fora de `D18` |
| `BensPage.tsx:117` (`alvo?.empresaId`, prop de `TransferirBemDialog`) | `empresaId` | `Guid EmpresaId` | `Guid` / `Guid` | bate | fora do escopo com destino nomeado — só alimenta `EntitySelect` de setor/responsável do diálogo de transferência |
| `BensPage.tsx:117` (`alvo?.filialId`, mesma prop) | `filialId` | `Guid? FilialId` | `Guid \| null` opcional / `Guid?` | bate | fora do escopo com destino nomeado |
| `BensPage.tsx:31` (`record.codigo`, filtro local) e `:99` (`<Column field="codigo">`) | `codigo` | `string Codigo` | `string` / `string` | bate | fora do escopo com destino nomeado |
| `BensPage.tsx:31` e `:100` (`<Column field="descricao">`) | `descricao` | `string Descricao` | `string` / `string` | bate | fora do escopo com destino nomeado |
| `BensPage.tsx:101` (`categoriaBemLabel(Number(row.categoria))`) | `categoria` | `CategoriaBemPatrimonial Categoria` | `CategoriaBem \| number` / `CategoriaBemPatrimonial` | **diverge** | **NOVO — sem destino** (ver Divergências #1) |
| `BensPage.tsx:102` (`formatMoney(row.valorContabilAtual)`) | `valorContabilAtual` | `decimal ValorContabilAtual` | `number` / `decimal` | bate | fora do escopo com destino nomeado — corrigido por `D13`, não tocado por `D18` |
| `BensPage.tsx:103,106,107,108,109` (`Number(row.status)`, coluna Status e as quatro guardas) | `status` | **não existe** — o record entrega `StatusBemPatrimonial StatusBem` e `bool Bloqueado` separados | `StatusBem \| number` / *sem par* | **diverge (sem par)** | `D18` itens 1, 3, 4, 5 |

**Campos declarados em `BemPatrimonialResponse` (frontend) e não lidos pela UI de Bens:**

| Campo TS declarado | Campo C# correspondente | Tipo (FE / BE) | Situação | Observação |
|---|---|---|---|---|
| `dataAquisicao` | `DateTimeOffset DataAquisicao` | `IsoDateTime` / `DateTimeOffset` | bate | declarado, sem leitura em `BensPage.tsx` nem em `PatrimonioDialogs.tsx` |
| `valorAquisicao` | `decimal ValorAquisicao` | `number` / `decimal` | bate | idem |
| `valorResidual` | `decimal ValorResidual` | `number` / `decimal` | bate | idem |
| `vidaUtilMeses` | `int VidaUtilMeses` | `number` / `int` | bate | idem |
| `depreciacaoAcumulada` | `decimal DepreciacaoAcumulada` | `number` / `decimal` | bate | corrigido por `D15` item 2; sem leitor nesta tela (é lido em `DepreciacaoPage.tsx`, fora do recorte) |
| `setorId` | `Guid? SetorId` | `Guid \| null` opcional / `Guid?` | bate | idem |
| `responsavelId` | `Guid? ResponsavelId` | `Guid? ResponsavelId` | `Guid \| null` opcional / `Guid?` | bate | idem |

**Campos que o backend entrega (`BemPatrimonialResponse` em `CONTRATO-API-v1.23.md:1193-1225`) e que o tipo do frontend nem declara**, portanto fora de alcance de qualquer leitor da tela: `Metodo`, `ContaAtivoId`, `ContaDepreciacaoAcumuladaId`, `ContaDespesaDepreciacaoId`, `MesesDepreciados`, `UltimaCompetenciaDepreciada`, `Bloqueado`, `MotivoBloqueio`, `DataBaixa`, `MotivoBaixa`, `JustificativaBaixa`, `ValorBaixa`, `Movimentacoes`, `Depreciacoes`. Dos catorze, `StatusBem` e `Bloqueado` são exatamente os dois que `D18` traz para o tipo; os demais ficam fora do escopo desta fatia (nomeados aqui, não deduzidos).

**Conta de campos** (exigida pelo briefing, só sobre os *lidos* — a tabela acima, seção 1a):

```text
lidos pela UI = 8            (id, empresaId, filialId, codigo, descricao, categoria, valorContabilAtual, status)
entregues e batendo = 6      (id, empresaId, filialId, codigo, descricao, valorContabilAtual)
divergências apontadas = 1   (status — D18 itens 1, 3, 4, 5)
sem destino = 1              (categoria — Divergências #1)

8 = 6 + 1 + 1   ✓ fecha.
```

Como foi medido: contagem manual dos campos únicos lidos em `BensPage.tsx` (linhas citadas na tabela
1a), um por leitura de `row.<campo>` ou `alvo.<campo>` distinta; `PatrimonioDialogs.tsx` não lê nenhum
campo de `BemPatrimonialResponse` diretamente — `TransferirBemDialog` recebe `empresaId`/`filialId`
como props já extraídas em `BensPage.tsx:117`.

### 1b. Campos de `BensListQuery` (frontend) enviados ao backend

| Campo TS | Onde é montado/enviado | Campo do controller (`BensPatrimoniaisController.cs:25`) | Tipo (FE / BE) | Situação | Destino |
|---|---|---|---|---|---|
| `empresaId` | `patrimonioApi.ts:38` (`bensParams`), `BensPage.tsx:39,56-59,85` | `[FromQuery] Guid empresaId` (sem `?`, sem valor padrão) | `Guid \| null` **opcional** / `Guid` **obrigatório** | **diverge** | **NOVO — sem destino** (Divergências #2) |
| `filialId` | idem | `[FromQuery] Guid? filialId` | `Guid \| null` opcional / `Guid?` | bate | fora do escopo |
| `categoria` | idem, `:86` | `[FromQuery] CategoriaBemPatrimonial? categoria` | `CategoriaBem \| number \| null` / `CategoriaBemPatrimonial?` | **diverge** | mesmo achado de Divergências #1 |
| `status` | idem, `:87` | `[FromQuery] StatusBemPatrimonial? status` | `StatusBem \| number \| null` / `StatusBemPatrimonial?` | **diverge** | `D18` item 5 (Tabela 3) |
| `termo` | idem, `:88` | `[FromQuery] string? termo` | `string \| null` opcional / `string?` | bate | fora do escopo |

Total: 5 campos de query. 2 batem (`filialId`, `termo`); 1 diverge com destino já travado (`status`, `D18`
item 5); 2 divergem sem destino (`empresaId`, `categoria` — Divergências #1 e #2). O briefing só exige
a conta formal para "lidos pela UI" (seção 1a); esta é apresentada à parte, sem status de bloqueio
associado.

---

## Tabela 2 — guardas de ação

| Ação | Condição atual no frontend | Pré-condições reais no domínio | Regra que `D18` item 4 fixa | Concorda com o domínio? |
|---|---|---|---|---|
| Transferir | `bemPodeTransferir = (status) => n(status) === StatusBem.Ativo` — `patrimonioLabels.ts:52`; chamada em `BensPage.tsx:106` com `Number(row.status)` | `BemPatrimonial.cs:113` chama `GarantirAlteravel()`, que em `:207-210` recusa se `StatusBem == Baixado` ou `Bloqueado == true` | ativo e não bloqueado | **Não.** A função só recebe `status` (um número), nunca `bloqueado` (que no backend é campo booleano independente). Hoje `row.status` é `undefined` (o backend nunca envia esse nome de campo — envia `StatusBem` e `Bloqueado`), `Number(undefined) = NaN`, e `NaN === 1` é sempre `false`. Caso concreto: um bem ativo e não bloqueado deveria oferecer "Transferir" e hoje nunca oferece, para nenhum bem. |
| Bloquear | `bemPodeBloquear = (status) => n(status) === StatusBem.Ativo` — `patrimonioLabels.ts:53`; `BensPage.tsx:107` | `BemPatrimonial.cs:179` (`if (StatusBem != Ativo) throw`) e `:180` (`if (Bloqueado) throw "Bem já está bloqueado."`) | ativo e não bloqueado | **Não**, mesmo motivo estrutural: a condição não modela `bloqueado`, e hoje `NaN !== 1` esconde a ação sempre. |
| Desbloquear | `bemPodeDesbloquear = (status) => n(status) === StatusBem.Bloqueado` — `patrimonioLabels.ts:54`; `BensPage.tsx:108` | `BemPatrimonial.cs:187` (`if (!Bloqueado) throw "Bem não está bloqueado."`) | bloqueado | **Não.** A condição depende do valor 2 do enum de três valores do frontend (`StatusBem.Bloqueado`), que **não tem par** no backend — `StatusBemPatrimonial` só tem `Ativo=1`/`Baixado=2` (`PatrimonioEnums.cs:21-25`); bloqueio no domínio é o booleano `Bloqueado`, não um terceiro estado. Hoje `NaN !== 2`, ação nunca aparece. |
| Baixar | `bemPodeBaixar = (status) => [StatusBem.Ativo, StatusBem.Bloqueado].includes(n(status))` — `patrimonioLabels.ts:55`; `BensPage.tsx:109` | `BemPatrimonial.cs:197` (`if (StatusBem == Baixado) throw`) e `:198` (`if (Bloqueado) throw "Bem bloqueado não pode ser baixado. Desbloqueie antes de baixar."`) | ativo e não bloqueado (regra muda: a guarda antiga aceitava bloqueado) | **Não, em dois níveis.** (1) mesmo problema estrutural das três guardas acima — condição nunca avalia por `status` ausente. (2) mesmo que `status` existisse com o enum antigo de três valores, a lista `[Ativo, Bloqueado]` oferece "Baixar" para bem com `status === Bloqueado`, e o domínio recusa explicitamente essa combinação (`:198`). Caso concreto citado no próprio plano da fatia (armadilha 2): copiar a lista antiga com os nomes novos reproduziria esse erro. |

**Achado fora da guarda de estado, no mesmo fluxo de Baixar** — não é pré-condição de estado, é
divergência de payload, então não cabe nesta tabela por coluna, mas pertence à mesma ação: ver
Divergências #3.

---

## Tabela 3 — enum e filtro

| | Frontend (`StatusBem`, `patrimonio.types.ts:12-16`) | Backend (`StatusBemPatrimonial`, `PatrimonioEnums.cs:21-25`) |
|---|---|---|
| Valores | `Ativo=1`, `Bloqueado=2`, `Baixado=3` | `Ativo=1`, `Baixado=2` |

O backend modela bloqueio como o campo independente `bool Bloqueado` (`BemPatrimonial.cs:69`), não
como um terceiro valor do enum de status. O enum do frontend tem um valor (`Bloqueado=2`) sem
nenhuma correspondência no backend, e o valor `3` do frontend (`Baixado`) não corresponde ao `2` do
backend (`Baixado`) — é exatamente o caso que `D15` descreveu ao decidir não renomear só o campo.

**O que cada opção do filtro atual envia e como o backend interpreta** (`statusBemFilterOptions`,
`patrimonioLabels.ts:35`, construído a partir do mesmo `statusBemMap` de três entradas):

| Opção do filtro | Valor enviado (`status=`) | Como `[FromQuery] StatusBemPatrimonial? status` interpreta | Resultado |
|---|---|---|---|
| "Todos os status" | (nenhum, `null`) | sem filtro | lista completa — correto |
| "Ativo" | `1` | `StatusBemPatrimonial.Ativo` | coincide — único caso que funciona hoje, porque `Ativo=1` é o mesmo valor nos dois enums |
| "Bloqueado" | `2` | `StatusBemPatrimonial.Baixado` (é o que `2` significa no backend) | **filtra por bens baixados**, rotulado como "Bloqueado" na tela — o usuário pede um filtro e recebe outro |
| "Baixado" | `3` | não é nome de membro nenhum; o binder de enum do ASP.NET aceita a string numérica e produz um valor de enum sem nome (`(StatusBemPatrimonial)3`) | filtro nunca corresponde a nenhum bem real (o domínio nunca atribui `3` a `StatusBem`) — lista sempre vazia |

Isto é exatamente o que `D18` item 5 já resolve (troca para duas opções, `Ativo`/`Baixado`, com os
valores corretos `1`/`2`) — registrado aqui como confirmação medida, não como achado novo.

**Serialização de enum no backend — verificação da premissa `medicoes` do plano da fatia:**
Procurei `JsonStringEnumConverter` em `../New project 3/src/Erp.Api` (`grep -rn "JsonStringEnumConverter"`)
— nenhuma ocorrência. Procurei também `AddJsonOptions|JsonOptions|Converters\.Add|PropertyNamingPolicy`
no mesmo diretório — nenhuma ocorrência. Ampliei a busca de `JsonStringEnumConverter` para
`../New project 3/src` inteiro — nenhuma ocorrência em nenhum arquivo. Sem conversor de enum
registrado, o `System.Text.Json` padrão do ASP.NET Core serializa e desserializa enum pelo valor
numérico do tipo subjacente (`int`), nunca pelo nome. Confirma a medição já registrada em
`docs/fatias/v1.11.0a8b54.c2-estado-de-bens.md:178-179`.

---

## Divergências sem destino

Toda divergência abaixo foi checada contra `D15` a `D19` e nenhuma delas cobre o caso. Não são
propostas de correção — são achados para a rodada decidir.

### #1 — `CategoriaBem` (frontend) não corresponde a `CategoriaBemPatrimonial` (backend) a partir do valor 4

```text
Frontend (patrimonio.types.ts:3-10): Movel=1  Imovel=2  Veiculo=3  Equipamento=4  Informatica=5  Outro=6
Backend  (PatrimonioEnums.cs:3-13):  Movel=1  Imovel=2  Veiculo=3  Maquina=4      Equipamento=5   Ferramenta=6  Software=7  Outro=8
```

Os três primeiros valores batem. A partir do quarto, o mesmo número nomeia coisas diferentes nos dois
lados: `4` é "Equipamento" no frontend e "Máquina" no backend; `5` é "Informática" no frontend e
"Equipamento" no backend; `6` é "Outro" no frontend e "Ferramenta" no backend. O backend ainda tem
`Software=7` e um `Outro` real em `8`, que o frontend nunca pode enviar nem rotular (`categoriaBemLabel`,
`patrimonioLabels.ts:6`, cairia no fallback `String(value)` e mostraria o número cru).

Pontos afetados, todos no recorte desta fatia:
- Leitura/rótulo: `BensPage.tsx:101` (`categoriaBemLabel(Number(row.categoria))`).
- Seleção no cadastro: `PatrimonioDialogs.tsx:98` (`Dropdown` com `categoriaBemOptions`), que vem de
  `patrimonioLabels.ts:9-16,33` — construído sobre o enum errado.
- Validação de payload: `patrimonioSchemas.ts:26` (`categoria: z.nativeEnum(CategoriaBem)`) — aceita
  exatamente os seis valores errados e nenhum dos dois que faltam.
- Filtro de listagem: `BensListQuery.categoria`, enviado em `patrimonioApi.ts:38`.

Caso concreto: um usuário cadastra um bem escolhendo "Equipamento" no formulário. O payload envia
`categoria: 4`. O backend grava e devolve `Categoria: 4`, que na definição real do domínio é
"Máquina". A mesma tela volta a mostrar "Equipamento" para esse bem, porque lê com o mesmo mapa
errado — o defeito é silencioso dentro do frontend (ida e volta usam o mesmo enum errado) e só
aparece para quem lê o dado pela definição do backend (relatório, outro cliente, consulta direta ao
banco). É a mesma classe de defeito que `D10`/`D11`/`D18` corrigiram para outros enums, mas em um
campo que `D18` não tocou.

### #2 — `BensListQuery.empresaId` é opcional no tipo do frontend; o controller exige o parâmetro

`BensListQuery.empresaId?: Guid | null` (`patrimonio.types.ts:85`) é opcional. O controller declara
`[FromQuery] Guid empresaId` sem `?` e sem valor padrão (`BensPatrimoniaisController.cs:25`) — em
ASP.NET Core, parâmetro de tipo valor não anulável sem valor padrão é tratado como obrigatório pelo
model binding; requisição sem esse parâmetro tende a falhar a validação de modelo (`[ApiController]`
responde automaticamente com 400). Isto não foi testado contra um backend em execução — é leitura de
assinatura de código, registrada como tal.

`BensPage.tsx:39` inicia `filters` como `{}` (sem `empresaId`), e `bensQuery = useBens(filters,
hasPermission(...))` (`:46`) já dispara com esse estado inicial, porque `enabled` depende só da
permissão. `EmpresaFilialFilter` (`EmpresaFilialFilter.tsx:23-33`) alinha `empresaId` ao contexto
organizacional dentro de um `useEffect`, que roda **depois** da primeira renderização — ou seja, existe
uma janela em que `GET /api/patrimonio/bens` pode sair sem `empresaId`. Não verificado em runtime.

### #3 — `BaixarBemFormValues.motivo` é texto livre; o backend exige um enum obrigatório

`BaixarBemFormValues.motivo: string` (`patrimonio.types.ts:114`) e `baixarBemSchema.motivo:
textRequired('Informe o motivo.')` (`patrimonioSchemas.ts:44`) — campo de texto livre, digitado em
`PatrimonioDialogs.tsx:214` (`InputText`). O backend declara `BaixarBemRequest(DateTimeOffset? Data,
MotivoBaixaPatrimonial Motivo, string Justificativa, decimal? ValorBaixa)`
(`BemPatrimonialContracts.cs:35`) — `Motivo` é `MotivoBaixaPatrimonial`, enum obrigatório (sem `?`),
e — pela mesma medição da Tabela 3 — sem conversor de string registrado, então o `System.Text.Json`
espera um número no corpo da requisição para esse campo, não uma string.

Caso concreto: o usuário abre "Baixar bem", digita um texto qualquer em "Motivo" (ex.: "Equipamento
quebrado") e confirma. `POST /api/patrimonio/bens/{id}/baixar` envia `{ "motivo": "Equipamento
quebrado", ... }`; a desserialização do corpo falha antes mesmo de chegar às regras de domínio (o
tipo esperado para `Motivo` é numérico). A ação "Baixar" está inoperante para qualquer bem, hoje,
independentemente do que a guarda de estado decidir. Este achado é anterior e independente da guarda
de `D18` item 4 — mesmo com a guarda corrigida, a baixa continua falhando pelo tipo do campo.

### #4 — `motivo` de desbloqueio é enviado; o endpoint não tem parâmetro para lê-lo

`patrimonioApi.ts:61-63` (`desbloquearBem`) monta `{ motivo }` via `motivoSchema` e faz `POST
{BENS}/{id}/desbloquear` com esse corpo. O controller declara `Desbloquear(Guid id,
CancellationToken cancellationToken)` (`BensPatrimoniaisController.cs:76-83`) — nenhum parâmetro de
corpo. `IPatrimonioService.DesbloquearBemAsync(Guid id, CancellationToken)` (`IPatrimonioService.cs:17`)
também não recebe motivo, e `BemPatrimonial.Desbloquear()` (`BemPatrimonial.cs:185-190`) não tem
parâmetro algum. O texto que o usuário digita no `ReasonDialog` de desbloqueio (`BensPage.tsx:120`) é
descartado silenciosamente — não gera erro, porque o backend simplesmente não lê o corpo da
requisição nesse endpoint. É "campo enviado que o backend não lê", categoria explícita do briefing.

### Nota sobre `scripts/backend-contract-map.allowlist.json`

Os sete endpoints de Bens (`GET /bens`, `GET /bens/{id}`, `POST /bens`, `POST /bens/{id}/transferir`,
`POST /bens/{id}/bloquear`, `POST /bens/{id}/desbloquear`, `POST /bens/{id}/baixar`) não aparecem em
`legacyReferences` desse arquivo (`grep -n "patrimonio" scripts/backend-contract-map.allowlist.json`
— zero ocorrências). Como o arquivo só registra rotas **divergentes**, ausência aqui é esperada e
consistente com o que a Tabela 1 mediu: a rota em si bate; a divergência encontrada é de campo dentro
do corpo, não de caminho.

---

## O que fica fora deste inventário, nomeadamente

- `PatrimonioDialogs.tsx`: `ProcessarDepreciacaoDialog`, `AbrirInventarioDialog`, `ContagemDialog` — não
  são diálogos de Bens (`Depreciação` e `Inventário`), fora do recorte pedido no briefing.
  `patrimonioLabels.ts`: funções de categoria e inventário só entram nesta lista onde a Tabela 1/3
  precisou delas; `statusInventarioPatrimonioLabel/Severity/FilterOptions` e
  `inventarioPatrimonioAberto` não são de Bens e não foram inventariados.
- Guarda de acesso às ações (`PermissionGuard permission="PATRIMONIO_BENS_GERENCIAR"` em
  `BensPage.tsx:89`, e as strings de permissão passadas a cada ação em `:105-110`) — não avaliadas
  aqui porque `permissionChange: false` no contrato da fatia; não há achado de permissão ausente do
  catálogo a reportar (`PATRIMONIO_CONSULTAR`, `PATRIMONIO_BENS_GERENCIAR`, `PATRIMONIO_TRANSFERIR`,
  `PATRIMONIO_BAIXAR` existem em `types/erp.ts:362-365`, conferido por grep pontual, sem checagem
  completa do catálogo — fora do escopo que o briefing definiu para esta rodada).
- `PUT /api/patrimonio/bens/{id}` — 1 de 8 endpoints não consumido pelo frontend; já registrado em
  `GAP-FRONTEND-BACKEND.md:320` e citado no plano da fatia como fora do escopo (onda F4). Não
  reaberto aqui.

---

```json
{
  "agent": "inventariante-contrato-tela",
  "slice": "v1.11.0a8b54.c2",
  "node": "inventario",
  "assunto": "estado-de-bens",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/01-inventario-estado-de-bens.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "GET /api/patrimonio/bens sem empresaId devolve 400 (parâmetro Guid obrigatório sem valor padrão) ou aceita e trata como Guid.Empty?", "decide": "se a janela descrita em Divergências #2 é defeito real de produção ou só um risco teórico de assinatura" },
    { "tipo": "backend", "pergunta": "POST /api/patrimonio/bens/{id}/baixar com Motivo como string realmente falha na desserialização, ou existe algum binder tolerante não encontrado nesta leitura?", "decide": "se Divergências #3 bloqueia a ação Baixar em produção hoje, ou só em tese" }
  ],
  "riscos": [
    "Divergências #1 (CategoriaBem x CategoriaBemPatrimonial) não tem destino: nenhuma decisão travada cobre correção de categoria nesta fatia.",
    "Divergências #2 (empresaId obrigatório no backend, opcional no frontend) não tem destino.",
    "Divergências #3 (motivo de baixa como string livre contra enum obrigatório) não tem destino e pode ser mais grave que o item central da fatia: mesmo com D18 aplicado, a ação Baixar pode continuar falhando.",
    "Divergências #4 (motivo de desbloqueio descartado pelo backend) não tem destino."
  ]
}
```
