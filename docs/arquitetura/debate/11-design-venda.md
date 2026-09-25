# Posição — `arquiteto-design-system` · Rodada 11 · `venda`

Lidos por completo antes desta posição: `docs/arquitetura/debate/11-inventario-venda.md` (fonte
principal), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (seção `b69`, B-5, B-15, tabela "Fora de escopo,
com gatilho"), `docs/arquitetura/DECISOES.md` (D67, grep por "fila"/"aprovação" sem decisão travada
específica para este recorte — D67 só fixa a ordem `b66`→`b71`, não o conteúdo de cada uma),
`docs/arquitetura/debate/10-design-estoque.md` (forma da rodada anterior, usada como precedente de
formato desta posição), `docs/DIRETRIZES_UX_REFERENCIAS.md`. Código lido por completo:
`features/vendas/components/{PedidosVendaPage,PedidoVendaDetalhePage,PedidoVendaActionDialogs,
vendasUiUtils}.tsx/.ts`, `features/tabelas-preco/components/TabelasPrecoPage.tsx`,
`features/fiscal/components/FiscalActionDialogs.tsx` (trecho `GerarNotaFiscalPedidoVendaDialog`,
usado para procurar precedente de "resumo antes de confirmar"), `components/feedback/*`,
`components/forms/*` (listagem). Não abri `preview_start`: as três telas em disputa (`/vendas/
pedidos`, `/vendas/pedidos/[id]`, `/tabelas-preco`) já estão em produção e o próprio inventário já
mediu o estado real (banco, C#, TypeScript concordando entre si, seção 0) — abrir o preview sem
credencial autenticada (o inventariante registra que não obteve token nesta sessão) só repetiria o
sintoma "tela vazia" já provado por três fontes independentes; não acrescentaria evidência nova ao
julgamento de template. Se alguém precisar confirmar visualmente o envelope quebrado, a rota sobe
normalmente em `logosoft-dev` e mostra `EmptyState` mesmo com dado existente, exatamente como o
inventário descreve.

---

## Q1 — Tabelas de preço: o defeito é o envelope, não `empresaId`/`termo`; corrige em `.cN` antes da `b69`, mesma régua que D-A da rodada 10

**A hipótese `c4` está errada na causa** (inventário, seção 0, com prova por três fontes: schema do
banco, código C# das duas pontas do contrato, e o próprio `normalizePaged` do frontend). Não vou
propor "corrigir `empresaId`/`termo`" — isso não muda nada, o backend já resolve a empresa sozinha
para usuário comum. **A correção de template é: `tabelasPrecoApi.ts` (`normalizePaged`) precisa
saber ler `{ resultado: { items, page, pageSize, totalItems } }`, não só array puro ou
`PagedResult` na raiz.**

**Isto fecha antes de qualquer outra peça da `b69`, no mesmo padrão que D-A fixou para Estoque na
rodada 10**: lá, o defeito de nome de campo tinha que fechar antes/junto da aba nova porque a aba
nova seria a vitrine da entrega e não podia nascer mentindo. Aqui o raciocínio é mais forte, não
mais fraco — **a tela inteira de Tabelas de preço está inoperante hoje** (`EmptyState` sempre ativo,
mesmo com 3 tabelas reais no banco), então não há "vitrine nova" a proteger: há uma tela existente
100% quebrada que qualquer trabalho de fila/aprovação da `b69` vai continuar assumindo saudável
(o pedido de venda, na Q5, nem lê tabela de preço hoje — mas qualquer solução futura de Q5
depende de a listagem funcionar). Concordo com o texto do próprio plano ("Diagnóstico autenticado
de Tabelas de preço **antes** de qualquer outra coisa") — a única correção que proponho ao texto do
plano é que a palavra "diagnóstico" já foi feita por este inventário com evidência forte o
suficiente para virar correção direta, sem esperar captura HTTP (mesma lógica que D-A da rodada 10
usou para agir sem confirmação HTTP real: nome de propriedade sem `JsonPropertyName`/
`JsonStringEnumConverter`, comportamento padrão do ASP.NET Core, mais aqui reforçado por três tabelas
reais gravadas no banco que provam que há dado a mostrar).

**V2 (`isTabelaAtiva` lendo campo inexistente + comparando enum numérico contra string) entra na
mesma correção, mesma vitrine.** É a mesma classe de raciocínio que o "bônus" de D-A (fato 4,
`TipoMovimentoEstoque`): corrigir só o envelope sem corrigir a leitura de status deixaria a tela
"funcionando" mostrando toda tabela em Rascunho como "Ativa" e toda Ativa como "Inativa" — o pior
tipo de correção, porque parece resolvida e continua mentindo. `isTabelaAtiva` fica:
`Number(tabela.status) === StatusTabelaPreco.Ativa` (valor 2), sem a checagem `tabela.ativo` (campo
que não existe no backend) nem a comparação de string.

**V3/V4 (anulabilidade de `precoMinimo`/`margemPercentual`, `.toFixed` sem checagem de nulo)
entram junto, mesmo arquivo, baixo custo marginal.** `item.margemPercentual?.toFixed(2) ?? '—'`,
`formatMoney(item.precoMinimo ?? null)` com o mesmo padrão que `formatMoney`/`formatDate` já tratam
nulo em outras telas do módulo (`PedidosVendaPage.tsx` usa `formatDate`/`formatMoney` sobre campos
opcionais sem crashar). Não é um padrão novo — é aplicar a mesma defesa contra `null` que o resto da
tela já pratica em outros campos, só que faltando aqui.

**Onde este padrão de "corrigir o envelope de paginação" já existe**: é a primeira vez que vejo esse
formato específico (`{ resultado: {...} }`) no repositório — busquei `resultado.*items\|Resultado`
em `features/*/api` e não achei outro client tratando esse envelope. **Régua de três: 1 caso.** Não
proponho generalizar `normalizePaged` para aceitar N formatos de envelope "só por precaução" — isso
seria abstração prematura sem segundo consumidor. A correção fica local a
`tabelasPrecoApi.ts`, documentada com um comentário citando `TabelaPrecoPagedResponse` como origem
do formato, para que quem ler depois não ache que foi descuido.

**Isto é `.cN` antes da `b69` ou primeiro item do mesmo diff — decisão de calendário, não de
template**, mesma divisão de responsabilidade que assumi na rodada 10 (D-A): a ordem exata é do
`arquiteto-escopo-entrega`. Minha posição de template é só que nenhuma peça nova de fila/aprovação
pode ir ao ar assumindo Tabelas de preço saudável sem esta correção estar dentro do mesmo lote.

---

## Q2 — Fila de pendentes: filtro pré-selecionado sobre a listagem existente, não rota nova nem item de menu — régua de um caso, e o único caso já existe

**Não crio rota nova, não crio item de menu novo.** A "fila" que o plano pede
("Fila de pedidos pendentes com listagem e detalhe sob demanda") já existe como capacidade —
`/vendas/pedidos` com `Dropdown` de status e `GET /api/vendas/pedidos/{id}` sob demanda
(`usePedidoVenda`, `enabled: Boolean(id)`, confirmado no inventário seção 3). O que falta não é
tela nova: é **um atalho que pré-seleciona `status = AguardandoAprovacao`** sem o operador ter que
abrir o dropdown toda vez, mais o card "Aguardando aprovação" do resumo (já existe,
`PedidosVendaPage.tsx:73`) virando clicável.

**Padrão proposto, por elemento:**
- O card de resumo "Aguardando aprovação" (`PedidosVendaPage.tsx:73`) ganha `onClick` que chama
  `updateFilter('status', StatusPedidoVenda.AguardandoAprovacao)` — o mesmo `setState` que o
  `Dropdown` já dispara, nenhuma rota nova, nenhum novo estado a sincronizar. Cursor de ponteiro e
  leve destaque visual (`className` condicional, ex.: borda quando o filtro ativo bate com o card)
  para o card comunicar que é clicável — sem inventar um componente de "KPI clicável" novo (ver
  abaixo, régua de três não bate ainda).
- Rota nova (`/vendas/pedidos/aprovacao`) **não entra**. Custaria a mesma dívida que já registrei
  contra colapsar rotas na rodada 10, só na direção oposta: multiplicar rota para um filtro que é
  puramente de estado local, sem nenhuma regra de negócio ou permissão diferente da listagem geral
  (mesmo endpoint, mesma permissão `VENDAS_CONSULTAR`, mesmas colunas). Duas rotas mostrando o
  mesmo componente com um filtro pré-setado diferente é a mesma classe de erro que a Q2 do plano
  evitaria se pedisse "rota própria" sem justificar por quê — aqui a régua de UX ("uma tela por
  capacidade distinta, não por atalho de filtro") pesa mais que a metáfora de "fila" do nome.
- Item de menu novo **não entra**: o menu já tem "Pedidos de venda"; um segundo item para o mesmo
  componente com filtro diferente duplicaria a decisão de navegação que Estoque (D-B, rodada 10)
  evitou fazer na direção contrária (lá, resisti a colapsar três itens em um; aqui resisto a abrir
  um segundo item para a mesma tela).
- **O filtro server-side por `termo` que existe no client e nunca é usado (inventário, seção 3)
  entra nesta correção**: trocar a busca 100% local (`localSearch`/`filterLocal`) por
  `filters.termo` no próprio `usePedidosVenda`, mantendo o campo de busca visualmente idêntico —
  hoje a busca é um sintoma de "tela mentindo sobre o volume real": o operador digita e filtra só
  os até 200 registros já carregados (`.Take(200)`, inventário V7), quando o backend tem um filtro
  de servidor pronto e implementado no client, só nunca acionado. Baixo custo (troca de `useState`
  local por escrita em `filters`), fecha uma divergência que o próprio inventário já provou existir
  nos dois lados do contrato.
- **Paginação de servidor real não entra** (mesma resposta que D-E deu para Estoque): o backend não
  tem `page`/`pageSize` nesta rota, só `.Take(200)` fixo. Mantenho a paginação visual
  (`records.slice`), e adiciono o mesmo `Message severity="info"` compacto que propus para Estoque
  quando não há filtro de status/termo ativo — "Sem filtro, esta lista mostra até 200 pedidos mais
  recentes; pedidos mais antigos podem não aparecer." — mesmo tom, mesma severidade, precedente
  direto em D-E (rodada 10).

**Régua de três aplicada ao "card clicável de resumo que vira filtro"**: procurei
`onClick.*setFilters\|onClick.*updateFilter` em cards de resumo (`Card` com `strong className="text-xl"`)
em outras telas (`grep -rn "text-xl" features/*/components` retorna 14 arquivos com o mesmo padrão
visual de card-métrica, nenhum deles clicável hoje). **Zero casos existentes de card-resumo
clicável.** Isto é o primeiro caso — fica como interação local desta tela, não vira componente
compartilhado (`KpiCard`/`ClickableSummaryCard`) agora. Se um segundo módulo (por exemplo, Compras na
`b70`, que tem os mesmos cards "Aguardando aprovação" via texto do plano) copiar a mesma interação,
aí sim são dois casos — ainda coincidência, registro como observação, não como padrão a extrair.

**Onde este padrão de "filtro por clique em resumo" resolveria algo parecido no repositório**: não
achei — os cards de resumo existentes (Estoque, RH, Financeiro avançado) são todos somente leitura.
Não é reforma de um padrão ruim; é extensão pequena de um card que já existe, sem tocar em nenhum
outro módulo.

---

## Q3 — Aprovação com resumo e confirmação: o resumo entra no diálogo que já existe, não em diálogo novo; `reservarEstoque` mantém `true` como padrão, mas com aviso textual do que ele significa

**O diálogo já existe (`AprovarPedidoVendaDialog`, `PedidoVendaActionDialogs.tsx`) e já é uma
confirmação — só não tem resumo.** Hoje ele mostra um `Checkbox` e um `Textarea`, sem nenhum dado do
pedido que está sendo aprovado. O padrão que falta:

**O que o resumo mostra, e de quais campos**: um bloco de leitura no topo do diálogo, antes do
formulário, com os campos que o próprio pedido já carrega no detalhe (não requer chamada nova):
`numero`, `clienteLabelMap.get(clienteId)` (rótulo operacional, não GUID — a página pai já resolve
esse mapa e pode passar como prop), `valorTotal` (`formatMoney`), contagem de itens
(`pedidoVendaItensCount`, já existe em `vendasUiUtils.ts`, usado em `TotaisPanel`). Não invento
campo novo: são os mesmos quatro dados que `TotaisPanel`/cabeçalho do detalhe já exibem uma tela
atrás — a diferença é trazê-los para dentro do diálogo, para o operador confirmar "estou aprovando
o pedido X, do cliente Y, valor Z, N itens" sem precisar rolar a tela de trás para checar antes de
clicar em "Aprovar". Isto é a leitura operacional da diretriz "vínculo de entidade sempre por rótulo
legível" aplicada ao momento de confirmação, não só ao formulário.

**`reservarEstoque` — padrão e visibilidade**: mantenho `true` como valor inicial (é o que já está
em produção, `PedidoVendaActionDialogs.tsx:16`, e o inventário não registra reclamação sobre esse
padrão — B-5 pergunta se existe "padrão de `reservarEstoque` na aprovação rápida", e a resposta que
o código já dá é "sim, reservar por padrão"). O que falta é **explicar a consequência**: hoje o
`Checkbox` só tem o rótulo "Reservar estoque na aprovação", sem dizer o que acontece se desmarcar.
Acrescento uma `<small>` de apoio abaixo do checkbox: "Se marcado, cada item com controle de estoque
reserva quantidade no local informado; falha de saldo interrompe a aprovação (o pedido continua
aguardando). Se desmarcado, o pedido é aprovado sem reservar — a reserva pode ser feita depois." —
isto é leitura direta do que `AprovarPedidoVendaUseCase` faz (inventário seção 4, passo 4), não uma
regra nova. B-5 (padrão de `reservarEstoque` na "aprovação rápida") segue como pendência de produto
para saber se deveria existir um *segundo* caminho de aprovação sem diálogo nenhum ("aprovação
rápida" direto na lista) — isso eu **não decido aqui**: se existir, é uma ação nova na
`DataTableActions` da listagem, e antes de desenhá-la preciso saber se "rápida" significa "sem
resumo" (o que contradiz Q3) ou "com valor padrão pré-aceito e um clique a menos". Fica como
`needs_decision` de produto, não de template.

**Como a tela trata os erros de domínio do §4**: hoje todos os erros de `AprovarPedidoVendaUseCase`
(pedido não encontrado, contexto organizacional inválido, cliente inválido, produto inválido,
`DomainException` de status/sem item, falha de reserva) voltam como `BadRequest` genérico, sem
`field` por erro — mesma limitação estrutural que a rodada 10 já registrou para Compras (B-10). O
diálogo de aprovação **não tem `ApiErrorPanel` hoje** — `onSubmit={aprovar}` propaga a exceção
(`rethrow: true`), e o toast de erro do `useMutationWithToast` mostra só "Erro ao aprovar pedido" /
"Não foi possível aprovar o pedido", sem `code`/`status`/`traceId`. **Isto entra como correção de
piso, não como melhoria opcional**: a regra "erro de API aparece com `code`, `status`, `traceId` e
erro por campo, via `ApiErrorPanel`" é piso (`DIRETRIZES_UX_REFERENCIAS.md`, e a própria skill deste
agente, item 5). O diálogo ganha um `ApiErrorPanel` interno que aparece se `onSubmit` rejeitar,
mesmo padrão que os outros diálogos de ação já usam onde existe validação server-side visível — sem
inventar `field` por erro que o backend não entrega (o próprio inventário confirma que não existe
`field` na resposta; o piso aqui é mostrar `code`/`status`/`traceId` do erro genérico, não fingir que
existe granularidade que o contrato não tem).

**Onde este padrão de "diálogo de confirmação com resumo de leitura + ação" já existe**: procurei
`Card.*Resumo\|resumo` em diálogos de ação (`grep -rn "field col-12.*Resumo\|<Card title=\"Resumo" features/*/components`)
e não achei nenhum diálogo com bloco de resumo de leitura hoje — `GerarNotaFiscalPedidoVendaDialog`
(Fiscal, usado a partir do mesmo detalhe de pedido) é um formulário de escolha, não um resumo do que
já existe. **Régua de três: 1 caso.** Não crio um `ConfirmationSummaryDialog` compartilhado agora —
o bloco de resumo fica como JSX local dentro de `AprovarPedidoVendaDialog`, reutilizando
`formatMoney`/rótulo já disponíveis. Se `FaturarPedidoVendaDialog` (ação vizinha, mesmo arquivo,
mesma classe de decisão crítica — baixa estoque) ganhar o mesmo tratamento depois — o que eu
recomendaria por consistência dentro do próprio módulo, mesmo fora do recorte "até a liberação" —,
aí são dois casos dentro do mesmo arquivo; ainda não justifica extrair componente cross-módulo, só
uma função local compartilhada entre os dois diálogos do mesmo arquivo (`PedidoResumoBox`, function
local, não `components/`).

---

## Q4 — "Até a liberação": o recorte para em Aprovado; Faturar fica fora, com uma exceção pequena e já resolvida por Q3

**O inventário (seção 5) e o próprio plano concordam, e eu leio os dois na mesma direção.**
"Liberação" não é termo do domínio de Vendas (zero ocorrências em `Erp.Domain/Vendas`); o estado
mais próximo é `Aprovado`. Mais forte que isso: **o plano já resolveu a pergunta em outro lugar do
mesmo documento** — a tabela de fatias lista `b71` como "Faturamento (era `b69`, D67)" com escopo
próprio (`naturezaOperacaoId`, `correlationId`, dropdowns de UF/CFOP/unidade, layout de modal
ampliado). Faturamento **já tem versão dedicada planejada**; não é orfão que a `b69` precisaria
adotar por omissão. Isto não é uma leitura nova minha — é o plano dizendo, em duas seções
diferentes, a mesma coisa sem se citar: a pergunta 2 do inventário ("é pergunta ao produto") já
tinha resposta escrita antes de ser feita.

**Decisão de template: recorte para em `Aprovado`. Nenhuma mudança de forma na tela de Faturar
nesta rodada.** A única exceção que abro é a que já descrevi na Q3: se o diálogo de Aprovar ganha
resumo+`ApiErrorPanel`, replicar a mesma forma no diálogo de Faturar (que é vizinho, mesmo arquivo,
mesmo padrão de bloco) é custo marginal baixo o bastante para eu recomendar fazer junto — mas isto é
**forma do diálogo já existente**, não redesenho da tela de Faturamento que a `b71` vai fazer
(dropdowns fiscais, `naturezaOperacaoId`). Não colide com o escopo da `b71`; só evita que os dois
diálogos vizinhos do mesmo arquivo fiquem visualmente inconsistentes por uma versão inteira
(um com resumo, outro sem) até a `b71` chegar.

---

## Q5 — Pedido de Venda × Tabela de Preço: não entra como integração nesta rodada; a permissão órfã (Q6) é a única peça que se resolve agora

**V10 é o achado estrutural mais importante do inventário, e concordo com a leitura dele: não há
integração em nenhuma ponta do backend hoje** (`AdicionarItemPedidoVendaUseCase.cs`,
`VendaProdutoValidator.cs` — zero referência a `TabelasPreco`). Construir uma integração no
frontend — pré-preencher `valorUnitario` a partir de `GET /produtos/{id}/preco-vigente` ao escolher
produto no item do pedido — seria **inventar comportamento que o contrato não sustenta**, exatamente
o anti-padrão que `00_padrao_de_execucao.md` proíbe para qualquer agente e que eu, como arquiteto de
template, vetaria mesmo se fosse "só uma sugestão de preenchimento, não travamento": o backend não
valida `precoMinimo` contra nada ao gravar o item, então um preenchimento automático no frontend
criaria a ilusão de uma política de preço que o servidor não aplica — pior do que não ter
preenchimento nenhum, porque o operador passaria a confiar num número que ninguém valida.

**V10 não entra na `b69`.** Fica como pergunta de produto/backend (pendência 3 do inventário, que eu
subscrevo sem alteração): decide se a integração é escopo de uma versão futura, e só nesse caso o
padrão de UI (autocompletar + permitir sobrescrever com aviso, mesma forma que outras telas do ERP
usam para "valor sugerido, editável" — não constatei nenhum precedente existente neste módulo
específico para copiar; seria decisão nova quando a pergunta for respondida) é discutido.

---

## Q6 — Permissões órfãs: removo do union/catálogo/guards nesta fatia; `accessRisk = ilusão de clicar`

**Classificação em `accessRisk`**: `VENDAS_PRECO_MINIMO_SOBRESCREVER` e
`POLITICA_COMERCIAL_GERENCIAR` são **ilusão de clicar**, não capacidade real e não risco de
auto-bloqueio. O próprio backend documenta a remoção deliberada (`PermissoesCatalogoDefinition.cs:
118-121,128-130`, decisão `D3, v1.21.3/G1`, citada no inventário seção 6) — nenhum `[RequiredPermission]`
referencia as duas constantes em nenhum controller hoje. Conceder qualquer uma delas numa tela de
grupo de acesso do frontend cria a aparência de estar dando um poder a alguém (o rótulo existe, o
checkbox marca, o grupo "parece" ter a capacidade) sem abrir nem fechar nenhuma rota real no
backend. Isto é exatamente a categoria "ilusão de clicar" e não a "capacidade real" (que exigiria
confirmação do usuário) nem "auto-bloqueio" (que exigiria ordem de concessão escrita no changelog) —
remover as duas não tira acesso de ninguém a nada que funcione hoje.

**Onde isto já foi resolvido no repositório como precedente de forma**: não há remoção de permissão
anterior neste projeto que eu tenha achado registrada como padrão de tela — é a primeira vez que o
achado aparece nesta série de rodadas (a rodada 10 tratou de permissão *faltando* em rota, não de
permissão *sobrando* no catálogo). Não é uma decisão de template visual (não há tela a redesenhar
para isto — é edição do union `PermissionCode`, do catálogo, e checagem se alguma tela de grupo de
acesso já lista as duas, o que é trabalho de `dev-senior-react`, não meu). Minha posição de arquiteto
de design system é só sobre o que a tela de administração de grupos mostraria depois: **nenhuma
mudança visual na tela de grupos de acesso** — ela já lista permissões dinamicamente a partir do
catálogo; remover as duas entradas do catálogo já as tira da lista sem tocar em nenhum componente.

**Dívida se isto não for feito nesta fatia**: zero módulo novo divergiria (não é um padrão de tela),
mas cada versão que passar sem a correção mantém duas entradas "mortas" na tela de grupos de acesso
que um administrador pode marcar acreditando que fazem algo — o custo não cresce por módulo, cresce
por tempo (cada grupo configurado com a permissão marcada precisaria ser revisitado quando alguém
finalmente notar). Não tenho como medir quantos grupos já marcaram essas duas permissões sem acesso
ao banco de grupos — não verificado, fora do meu escopo de leitura.

---

## Q7 — `empresaId` ausente na primeira chamada e money on screen: corrige o padrão de `enabled`, aplica gate de campos igual ao que a `b68` já fez para `MovimentoEstoque`

**V5 (`GET /api/vendas/pedidos` sem `empresaId` no primeiro render) — padrão proposto**: a mesma
técnica que Tabelas de preço **não precisa** (porque o backend resolve sozinho) mas que Vendas
**precisa** (porque o backend não tem fallback e trata `Guid.Empty` como filtro que devolve `[]`
silencioso): `usePedidosVenda` ganha `enabled: Boolean(filters.empresaId)` (ou equivalente,
aguardando contexto organizacional hidratar antes da primeira chamada), em vez de disparar a query
assim que a página monta. Isto substitui "efeito assíncrono que corrige depois" por "não busca até
ter o que buscar" — é o mesmo padrão `enabled` que `usePedidoVenda` já usa para o detalhe
(`enabled: Boolean(id)`, citado no próprio inventário seção 3) e que `precoVigenteQuery` usa em
Tabelas de preço (`Boolean(produtoId && precoEnabled)`) — **não é padrão novo, é o mesmo `enabled`
condicional já usado duas vezes no mesmo par de módulos, agora faltando no terceiro lugar
(listagem de pedidos)**. Zero componente novo; é uma linha de configuração do hook React Query.
Enquanto a query fica `enabled: false`, a tela mostra o loading normal (`DataTableServer
loading={pedidosQuery.isFetching}`) — não preciso de um estado novo, porque `isFetching` já cobre
"aguardando para buscar" de forma visualmente idêntica a "buscando".

**Usuário "global" (`master@erp.local`, `EmpresaId = Guid.Empty`)**: mesmo com o `enabled` corrigido,
esse usuário nunca teria um `filters.empresaId` preenchido pelo contexto organizacional (ele não tem
empresa própria). Isto não é um caso que o template resolve sozinho — ou o backend aceita
`Guid.Empty` como "sem filtro, mostrar tudo que o usuário pode ver" (mudança de contrato, fora do
meu escopo), ou a tela precisa forçar esse usuário a escolher uma empresa antes de listar (mesmo
padrão que `EmpresaFilialFilter` já é, só que como pré-condição obrigatória em vez de opcional).
**Registro como pendência, não decido**: não sei se "global" é um papel real de operação nesta tela
ou só do login fixo de suporte — sem essa resposta, não proponho UI para um caso de uso que talvez
não exista em produção.

**Money on screen — o que precisa de correção, e com que gate**: leio a seção 7 do inventário como
"maioria correta, três pontos de risco real":
- `motivoCancelamento`/`canceladoEm` sem uso (dado que o backend entrega, ninguém lê) — **correção
  de baixo custo, mesmo padrão que `aprovadoEm`/`faturadoEm` já usam**: `canceladoEm` ganha a mesma
  leitura booleana (`Tag` no bloco "Eventos" do cabeçalho do detalhe, `PedidoVendaDetalhePage.tsx:254`,
  que já tem dois `Tag` de evento — vira três). `motivoCancelamento` aparece como texto de apoio
  quando o pedido está cancelado (mesmo lugar onde `observacao` já é exibida hoje) — o operador
  digitou o motivo no `ReasonDialog` e nunca mais o via; isto fecha esse ciclo sem campo novo,
  só exibindo o que o backend já devolve.
- `precoMinimo`/`margemPercentual` anuláveis lidos como obrigatórios (V3/V4) — já tratado na Q1,
  mesmo lote de correção de Tabelas de preço.
- `ValorBruto`, `sequencia`, `reservaEstoqueId`, `quantidadeBaixadaEstoque` do item do pedido —
  **não entram como coluna nova nesta rodada**, mesma régua de densidade que apliquei para Estoque
  (D-E, rodada 10): a tabela de itens já tem 6 colunas (Produto, Local, Qtd., Unitário, Desconto,
  Total); adicionar 4 colunas de auditoria fina (sequência, valor bruto, vínculo de reserva,
  quantidade baixada) para uma tabela que o operador escaneia rapidamente ao montar um pedido é
  ruído, não densidade útil — `reservaEstoqueId`, em particular, teria uso real (mostrar que o item
  tem reserva vinculada após aprovação), mas como indicador visual pequeno (`Tag`/ícone), não coluna
  cheia — **fica com gatilho**: se Q3 avançar a ponto de a tela de detalhe precisar mostrar "quais
  itens já têm reserva" de forma clara (o que a rodada não pede explicitamente), aí vale um ícone
  condicional na coluna "Ações" ou um `Tooltip`, sem abrir coluna nova.

**Gate de campos**: a `b68` já cobre `MovimentoEstoque` em `scripts/gate-contract-fields.mjs`
(citado no meu próprio precedente da rodada 10 e confirmado no briefing desta rodada). **Proponho
que `PedidoVendaResponse`, `ItemPedidoVendaResponse` e `TabelaPrecoItemResponse` entrem no mesmo
gate** — não como decisão de template (o formato do gate é `arquiteto-plataforma-frontend`/
`dev-senior-react`), mas como constatação de que a mesma classe de defeito que motivou o gate para
Estoque (nome de campo divergente, anulabilidade não capturada) está presente aqui em três records
diferentes (V1 indiretamente, V3, V4) — recusar estender o gate para Vendas/Tabelas de preço, depois
de ele já existir para Estoque, seria aceitar que o mesmo tipo de bug volte a acontecer sem rede de
segurança no próximo módulo.

---

## Q8 — Fatiamento: uma `b69` só, com a correção de Tabelas de preço entrando como primeiro item do mesmo lote (ou `.cN` imediatamente anterior) — não separo em `b69`+`b70`

Do ângulo de template, não vejo motivo para dividir. As peças que decidi (Q1 correção de envelope,
Q2 filtro pré-selecionado sobre listagem existente, Q3 resumo dentro do diálogo já existente, Q6
remoção de duas entradas de catálogo, Q7 `enabled` condicional + leitura de dois campos sem uso) são
todas de baixo custo de forma — nenhuma cria componente novo, nenhuma abre rota nova, nenhuma exige
um padrão que ainda não existe no repositório. A única peça com peso de decisão de produto (Q5, V10)
já fica fora por definição, não por falta de tempo. **Divido em ordem interna, não em versões**: Q1
primeiro (destrava a tela hoje inoperante), depois Q7 (corrige o silêncio de `empresaId`), depois
Q2/Q3/Q6 (podem andar em paralelo, não dependem uma da outra). Se o `arquiteto-escopo-entrega`
achar que o volume de arquivos tocados (estimativa: `tabelasPrecoApi.ts`, `TabelasPrecoPage.tsx`,
`PedidosVendaPage.tsx`, `useVendasResources.ts`, `PedidoVendaActionDialogs.tsx`,
`PedidoVendaDetalhePage.tsx`, `types/erp.ts`, `permissoesCatalogo.ts` — 8 arquivos, contagem por
leitura desta posição, não medição de diff real) justifica quebrar em duas entregas, a linha de
corte que eu proponho é **Q1 sozinho como `.cN`, resto como `b69`** — não `b69`+`b70`, porque
`b70` já tem conteúdo próprio (D67: Compra e financeiro) e misturar assuntos quebraria a mesma regra
que a rodada 10 usou para não empurrar Vendas para dentro do escopo de Estoque.

---

## Estados e regras de UX que são piso nesta rodada

| Elemento | `loading` | `vazio` | `erro recuperável` | `erro bloqueante` | `sucesso` | `permissão negada` | `ação indisponível com motivo` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tabelas de preço, lista (Q1) | já existe | **corrigido**: passa a refletir dado real (hoje sempre ativo por bug, mesmo com dado existente) | já existe (`ApiErrorPanel`) | não verificado (sem mudança nesta rodada) | já existe (toast) | já existe (`UnauthorizedState`) | botões Ativar/Inativar continuam `disabled` sem tooltip — **não corrigido nesta rodada**; a lógica fica certa (Q1), o motivo textual no botão fica fora, mesmo padrão de dívida aceita que registrei para Estoque (D-F, bloqueios) |
| Pedidos de venda, lista (Q2/Q7) | já existe, cobre também o `enabled` condicional novo (Q7) | já existe (`EmptyState`) | já existe (`ApiErrorPanel`) | não verificado | já existe (toast) | já existe (`UnauthorizedState`) | `Message` informativo sobre teto de 200 registros sem filtro (Q2) — aviso, não bloqueio |
| Diálogo Aprovar (Q3) | já existe (`loading` no botão) | n/a | **entra**: `ApiErrorPanel` interno para erro de domínio da aprovação, hoje ausente (toast genérico só) | não verificado | já existe (toast) | herda o guard da página (`VENDAS_APROVAR`) | `<small>` de apoio explicando a consequência de `reservarEstoque` marcado/desmarcado — **entra**, hoje ausente |
| Diálogo Faturar (Q3/Q4) | já existe | n/a | recomendado replicar `ApiErrorPanel` por consistência de arquivo (custo marginal baixo, não obrigatório nesta rodada) | não verificado | já existe (toast) | herda o guard da página (`VENDAS_FATURAR`) | ausente, fora do recorte "até a liberação" |
| Detalhe do pedido — eventos (Q7) | já existe | n/a | já existe | não verificado | já existe | já existe | n/a — `canceladoEm`/`motivoCancelamento` passam de "sem uso" para exibidos, sem mudar estado de ação |
| Grupos de acesso — catálogo de permissões (Q6) | n/a (edição de catálogo estático) | n/a | n/a | n/a | n/a | n/a | n/a — a tela não muda de forma, só a lista de permissões disponíveis encolhe em duas entradas |

Nenhuma linha é opcional para quem implementar: em particular, o `ApiErrorPanel` no diálogo de
Aprovar é a diferença entre "toast genérico depois de uma ação crítica que mexe em estoque e status"
e a regra de piso que este agente aplica a toda tela — erro de API sempre com `code`/`status`/
`traceId`, nunca substituído por texto fixo.

---

## Dívida visual — resumo

**Fecha:** Tabelas de preço sai de "sempre mostra `EmptyState` mesmo com dado real" para uma tela
funcional (Q1) — esta é a maior dívida fechada da rodada, porque hoje a tela está 100% inoperante,
não parcialmente divergente. `isTabelaAtiva` para de inverter Ativa/Inativa (Q1/V2). O filtro
`termo` deixa de existir tipado-mas-morto nos dois lados do contrato (Q2). Duas permissões deixam de
ser atribuíveis sem efeito real (Q6). `canceladoEm`/`motivoCancelamento` deixam de ser dado
capturado e nunca mostrado (Q7).

**Cria, se aceito como proposto:** zero componente novo em `components/` — todas as correções ficam
dentro dos arquivos de módulo já existentes (`tabelasPrecoApi.ts`, `TabelasPrecoPage.tsx`,
`PedidosVendaPage.tsx`, `PedidoVendaActionDialogs.tsx`, `PedidoVendaDetalhePage.tsx`). Nenhum padrão
novo de template nasce nesta rodada — cada correção reaproveita uma técnica que já existe em pelo
menos um outro ponto do mesmo módulo (`enabled` condicional, `formatMoney`/`formatDate` tolerantes a
nulo, `ApiErrorPanel` em diálogo, `Tag` de evento). Isto é deliberado: a régua de três não foi
atingida em nenhum dos elementos novos desta rodada (card de resumo clicável: 1 caso; resumo dentro
de diálogo de confirmação: 1 caso), então nada aqui deveria virar componente compartilhado ainda.

**Cria, se a dívida não for fechada:** cada versão futura que tocar Tabelas de preço sem saber do
bug do envelope corre o risco de "consertar" sintomas errados (como a própria hipótese `c4` já fez,
mirando `empresaId`/`termo`); cada tela nova que copiar o padrão "checkbox de reserva sem explicar
consequência" (se outro módulo de aprovação nascer, ex.: Compra na `b70`) herdaria a mesma lacuna de
clareza que decido fechar aqui — 1 tela hoje, custo de alinhar depois cresce para 2 se Compra copiar
antes de ser corrigido.

---

## O que eu abro mão

- **Não crio rota nem item de menu para a fila de aprovação (Q2).** Abro mão de uma "vitrine"
  dedicada em troca de reaproveitar 100% da listagem existente — se o produto achar que "fila"
  precisa de identidade própria de navegação (não só filtro), a decisão de reverter é barata: trocar
  o `onClick` do card por `router.push` para uma rota nova que recebe o filtro por query string, sem
  desfazer nada do que proponho.
- **Não construo o card-resumo clicável como componente compartilhado.** Abro mão de generalizar
  agora; fica como interação local de uma tela. Gatilho de reversão: um segundo módulo copiando a
  mesma interação.
- **Não proponho `ApiErrorPanel` como obrigatório no diálogo de Faturar nesta rodada**, só como
  recomendação de consistência — abro mão de forçar simetria total entre os dois diálogos do mesmo
  arquivo para não expandir o recorte "até a liberação" além do que Q4 decide.
- **Não decido a "aprovação rápida" que B-5 menciona.** Abro mão de desenhar uma segunda forma de
  aprovar (sem diálogo) até que o produto diga se ela deveria existir — desenhar agora seria
  redesenhar de memória uma capacidade que ainda não tem contrato nem confirmação de que é desejada.
- **Não desenho indicador de reserva por item (`reservaEstoqueId`) como coluna.** Abro mão de
  densidade extra na tabela de itens em troca de manter a tabela escaneável; gatilho: se Q3 evoluir
  para exigir visibilidade de reserva por item, um ícone/tooltip resolve sem reabrir a tabela.

---

## Onde discordo

Não vi ainda as posições dos outros três arquitetos (escrevo em paralelo). Registro uma
**discordância antecipada**, no mesmo espírito da que fixei na rodada 10, contra uma leitura
possível que eu quero nomear antes que apareça:

> **Discordo, antecipadamente, de qualquer proposta que resolva Q1 como "fora de escopo da `b69`,
> decidir depois".** Adiar a correção do envelope de Tabelas de preço significa que qualquer decisão
> de Q5 (integração Pedido×Tabela, mesmo que fique fora desta rodada) segue sendo avaliada contra uma
> tela que não funciona — e qualquer operador que precisar consultar preço mínimo/vigente durante
> este intervalo continua sem conseguir. Custo de alinhar depois: não é "N telas divergindo" (é bug
> de contrato, não de template), mas é tempo perdido por quem tentar usar a tela achando que não há
> tabela cadastrada, quando há três. Reversível: sim, a correção é pequena (1 arquivo de client) e
> não compromete nenhuma decisão de Q2–Q8 se vier depois — mas não há razão de template para adiar
> algo tão barato e tão claramente causal.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "arquitetura",
  "assunto": "venda",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/11-design-venda.md",
  "decisoesPropostas": [
    {
      "id": "Q1",
      "decisao": "Corrigir tabelasPrecoApi.ts (normalizePaged) para ler o envelope real { resultado: { items, page, pageSize, totalItems } } de GET /api/tabelas-preco, em vez do formato hipotético (empresaId/termo) da c4, que a evidência do inventário já refuta como causa. Junto, no mesmo lote: corrigir isTabelaAtiva para Number(status) === StatusTabelaPreco.Ativa, sem o campo 'ativo' inexistente nem comparação de string; e blindar precoMinimo/margemPercentual contra null (V3/V4) com o mesmo padrão de formatMoney/formatDate tolerante a nulo já usado em outras telas do módulo. Régua de três: 1 caso, correção local, sem generalizar o parser de envelope."
    },
    {
      "id": "Q2",
      "decisao": "Fila de pendentes de aprovação não vira rota nem item de menu novo: o card de resumo 'Aguardando aprovação' já existente vira clicável (seta filters.status), e o filtro termo (implementado no client, nunca acionado) passa a alimentar filters.termo em vez de busca 100% local. Paginação de servidor não entra (backend não tem page/pageSize); mantém paginação visual, com Message informativo sobre o teto de 200 registros sem filtro."
    },
    {
      "id": "Q3",
      "decisao": "O resumo de aprovação entra dentro do AprovarPedidoVendaDialog já existente (numero, cliente por rótulo, valorTotal, contagem de itens), sem diálogo novo. reservarEstoque mantém true como padrão (já em produção), ganha texto de apoio explicando a consequência de marcar/desmarcar. O diálogo ganha ApiErrorPanel interno para os erros de domínio da aprovação, hoje reduzidos a toast genérico. Recomendo replicar a mesma forma no diálogo de Faturar por consistência, sem tornar obrigatório nesta rodada. B-5 ('aprovação rápida') não é decidido aqui — needs_decision de produto."
    },
    {
      "id": "Q4",
      "decisao": "O recorte b69 para no status Aprovado. Faturamento fica fora, já planejado com escopo próprio na b71 (o próprio plano confirma isso em outra seção, sem se citar). Única exceção: se o diálogo de Aprovar ganhar resumo+ApiErrorPanel, replicar a mesma forma no diálogo de Faturar (vizinho, mesmo arquivo) é custo marginal baixo, mas não é redesenho da tela de Faturamento que a b71 fará."
    },
    {
      "id": "Q5",
      "decisao": "V10 (Pedido de Venda × Tabela de Preço, sem integração em nenhuma ponta do backend) não entra na b69. Não construo preenchimento automático de preço nem checagem de preço mínimo no frontend sem que o backend valide nada — seria inventar contrato e criar falsa sensação de política de preço aplicada. Fica como pergunta de produto/backend (pendência do inventário, subscrita sem alteração)."
    },
    {
      "id": "Q6",
      "decisao": "Remover VENDAS_PRECO_MINIMO_SOBRESCREVER e POLITICA_COMERCIAL_GERENCIAR do union PermissionCode, do catálogo e de qualquer regra de rota/menu que as referencie, nesta fatia. accessRisk = ilusao_de_clicar (o próprio backend já removeu as duas do seu catálogo, decisão D3 v1.21.3/G1, sem endpoint algum as usar). Nenhuma mudança visual na tela de grupos de acesso — ela já lista permissões a partir do catálogo dinamicamente."
    },
    {
      "id": "Q7",
      "decisao": "usePedidosVenda ganha enabled condicional a filters.empresaId estar preenchido (mesmo padrão enabled já usado em usePedidoVenda e precoVigenteQuery), corrigindo a primeira chamada sem empresaId que hoje devolve [] silencioso (V5). Usuário 'global' (EmpresaId vazio) fica como pendência — não decido UI para um caso de uso não confirmado. Money on screen: canceladoEm/motivoCancelamento passam a ser exibidos (mesmo padrão de aprovadoEm/faturadoEm); ValorBruto/sequencia/reservaEstoqueId/quantidadeBaixadaEstoque não viram coluna nova por densidade (mesma régua de D-E da rodada 10), reservaEstoqueId fica com gatilho para indicador pequeno se Q3 exigir visibilidade por item. Recomendo estender scripts/gate-contract-fields.mjs para PedidoVendaResponse/ItemPedidoVendaResponse/TabelaPrecoItemResponse, mesma cobertura que já existe para MovimentoEstoque desde a b68 — decisão de formato é de plataforma/execução, não minha."
    },
    {
      "id": "Q8",
      "decisao": "Uma b69 só, sem split para b70 (que já tem conteúdo próprio, D67). Se o volume de arquivos exigir quebra por calendário, a linha de corte proposta é Q1 como .cN imediatamente anterior (destrava a tela hoje inoperante) e o resto (Q2/Q3/Q6/Q7) como b69 — não b69+b70, para não misturar assuntos."
    }
  ],
  "discordancias": [
    "Discordo, antecipadamente (sem posição publicada ainda para confrontar), de qualquer proposta que adie a correção do envelope de Tabelas de preço (Q1) para depois da b69. É a correção mais barata da rodada (1 arquivo de client) e fecha uma tela hoje 100% inoperante (EmptyState sempre ativo mesmo com dado real no banco) — adiar não economiza risco de template, só estende o tempo em que a tela mente para o operador."
  ],
  "pendencias": [
    { "tipo": "produto", "pergunta": "B-5 pergunta se existe 'aprovação rápida' distinta do fluxo com diálogo/resumo (Q3). Se existir, precisa de forma própria (ação direta na listagem?) que ainda não foi desenhada.", "decide": "produto, antes de estender DataTableActions da listagem de pedidos" },
    { "tipo": "produto", "pergunta": "Usuário 'global' (EmpresaId vazio) é um papel real de operação para /vendas/pedidos, ou só do login fixo de suporte? Sem resposta, não desenho pré-condição de escolha obrigatória de empresa para esse caso (Q7).", "decide": "se a tela precisa de um estado de 'escolha empresa antes de listar' para esse perfil" },
    { "tipo": "backend/produto", "pergunta": "V10 (integração Pedido×Tabela de preço) entra em versão futura? Sem isso, não há padrão de 'preço sugerido, editável' a desenhar.", "decide": "escopo de uma rodada futura, não da b69" }
  ],
  "riscos": [
    "Não abri preview_start nesta rodada: as três telas já estão em produção e o inventário já mediu o estado real por três fontes concordantes (banco, C#, TypeScript); sem credencial autenticada, subir o preview só repetiria o mesmo EmptyState já documentado, sem evidência nova.",
    "A estimativa de 8 arquivos tocados (Q8) é contagem por leitura desta posição, não medição de diff real — se a implementação achar acoplamento maior (por exemplo, useVendasResources.ts exigindo mudança de assinatura em mais de um hook), o corte de calendário proposto pode precisar ser revisto pelo arquiteto-escopo-entrega.",
    "A recomendação de estender scripts/gate-contract-fields.mjs para os records de Vendas/Tabelas de preço não foi validada rodando o script — é inferência de que a mesma classe de defeito (V1/V3/V4) justifica a mesma cobertura que MovimentoEstoque já tem, não confirmação de que o gate aceitaria esses records sem ajuste de configuração."
  ]
}
```
