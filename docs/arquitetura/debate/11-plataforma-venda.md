
# Posição — `arquiteto-plataforma-frontend`, rodada 11 (`venda`)

Viés declarado: ano cinco. A pergunta não é se a `b69` funciona, é quanto custa mudar isto depois
que Compra e Financeiro (`b70`) e Faturamento (`b71`) já estiverem escritos contra o que esta
versão fixar.

## 0. O achado que muda a moldura da rodada: o artefato que o gate estrutural usaria como prova está errado para Tabelas de Preço

O inventário (seção 0, Divergência V1) já prova por leitura de C# duplo (`TabelaPrecoPagedResponse`
× `normalizePaged` × `PagedResult<T>`) que `GET /api/tabelas-preco` embrulha a resposta em
`{ "resultado": {...} }` e o client nunca desembrulha. Fui verificar se o mesmo caminho que a
rodada 10 usou para fechar `D71` (gate contra `docs/backend-v1.23/CONTRATO-API-v1.23.md`, sem
precisar de backend rodando) está disponível aqui. **Não está — e o motivo é mais grave do que "a
seção não existe".**

Medido, não intuído:

```
docs/backend-v1.23/CONTRATO-API-v1.23.md:15471  ### `GET /api/tabelas-preco`
  — bloco só tem `| Query | ... |`, sem linha `Response DTO`, sem bloco ```csharp```` nenhum.
docs/backend-v1.23/CONTRATO-API-v1.23.md:15480  ### `POST /api/tabelas-preco`
  — `| Response DTO | `UsuarioResponse` |`, e o bloco C# colado é literalmente `UsuarioResponse`
  (`Guid Id, string Nome, string Email, Guid EmpresaId, Guid? FilialId, bool Ativo, bool Bloqueado,
  DateTimeOffset? UltimoLoginEm`) — nada a ver com `TabelaPrecoResponse`.
docs/backend-v1.23/CONTRATO-API-v1.23.md:15515  ### `GET /api/tabelas-preco/{id}`
  — mesmo erro, mesmo bloco `UsuarioResponse` colado de novo.
```

Isto não é uma lacuna passiva (seção ausente); é um **artefato canônico com o schema errado** para
três dos dez endpoints de Tabelas de Preço — provavelmente um bug de geração do próprio documento
(copiar-colar do bloco anterior na extração automática). O que isso significa para esta rodada:
**não dá para estender `BACKEND_TYPE_MAP` de `gate-contract-fields.mjs` para `TabelaPrecoResponse`
hoje** — se eu apontasse o gate para este documento, ele validaria o tipo do frontend contra
`UsuarioResponse`, e criaria uma classe de defeito nova (gate verde comparando a coisa errada) em
vez de fechar a que já existe. Achado adicional, separado de V1/V2/V4 do inventário, que devolvo
como `needs_decision` de documentação — não é código, não é minha fronteira corrigir o `.md`, mas é
o motivo pelo qual a correção de Q1 nesta rodada **tem que ser feita e comprovada contra o C# fonte
(`TabelasPrecoResponses.cs`, `TabelasPrecoController.cs`), não contra o documento**, e por que o
gate de campos para este módulo só pode nascer **depois** que alguém (fora do meu papel) corrigir
o bloco do documento — senão o "gate" nasce mentindo.

Achado de contraste, para não generalizar demais: `PedidoVendaResponse` **está** documentado
corretamente e em quatro lugares (`:4541`, `:9918`, `:11326`, `:11526` e mais), com os 17 campos que
o inventário já conferiu. O problema de artefato é específico da seção `## TabelasPreco` do
documento (`:15469` em diante) — os primeiros três blocos que consultei (`GET` lista, `POST`,
`GET {id}`) têm o defeito; não verifiquei os sete restantes, e não preciso: já basta para provar que
o documento não pode ser fonte única de verdade aqui.

## 1. Pontos de não-retorno da camada

1. **O envelope `resultado` de `GET /api/tabelas-preco` (V1) é decisão de contrato, não de tela.**
   Duas correções possíveis: desembrulhar no client (`normalizePaged` passa a checar
   `data?.resultado ?? data`), ou o backend remover o wrapper. **Reversível dos dois lados** — não é
   ponto de não-retorno em si, mas a *ausência* de decisão é: enquanto ninguém decidir, qualquer
   outra tela que reuse `tabelasPrecoApi.listar` (ex.: um seletor de tabela de preço num formulário
   de Cliente, D66 já citou esse padrão) herda a mesma leitura errada silenciosamente — sem erro de
   compilação, sem 400, só lista vazia. Corrigir agora, no client, custa uma função; corrigir depois
   de um segundo consumidor copiar o padrão custa dois lugares mais o mesmo pente-fino que a
   rodada 10 já documentou para `estoqueUxUtils.ts` herdando enum do avançado.
2. **`GET /api/vendas/pedidos` tem `.Take(200)` fixo, sem `page`/`pageSize`/`totalItems` no
   contrato** (`VendasRepository.cs:39`, citado pelo inventário V7). Isto é o mesmo padrão que a
   rodada 10 registrou para `GET /api/estoque/movimentos` — mas aqui o teto (200) é **mais baixo e
   mais fácil de estourar** que o de Histórico de estoque, porque Pedido de Venda é o documento
   operacional mais frequentemente criado num ERP comercial (uma linha por venda, não por
   movimentação de saldo). Medido no próprio código: `PedidosVendaPage.tsx:47`
   (`records.slice(first, first+rows)`) pagina **visualmente** sobre um array que o servidor já
   cortou em 200 — o "próximo pedido" que sumiu não aparece em lugar nenhum da resposta (sem
   `hasMore`, sem contagem total real). Isto é fato de contrato, não estimativa de volume: **o teto
   existe e é fixo**; quantos clientes o alcançam hoje, não medido — **isto é intuição, não
   medição**.
3. **`GET /api/vendas/pedidos` exige `empresaId: Guid` obrigatório, e a primeira chamada sai sem
   ele** (`V5`, `PedidosVendaPage.tsx` monta `filters={}`, `usePedidosVenda` sem `enabled`). O
   inventário já mediu o efeito: para usuário comum, `EmpresaFilialFilter` corrige via `useEffect`
   quase de imediato; para usuário "global" (`EmpresaId == Guid.Empty`), a lista fica vazia sem
   sinal, indistinguível de "não há pedidos". Diferente de Tabelas de Preço (onde o **backend**
   resolve sozinho via `TabelaPrecoConsultaContextoResolver`), aqui **não há fallback no backend** —
   quem resolve é só o frontend, e só depois de um efeito assíncrono. Reversível (é `enabled:
   Boolean(filters.empresaId)` num hook), mas enquanto não corrigido é uma segunda causa de "lista
   vazia sem erro" na mesma rodada que já tem uma (V1) — duas classes do mesmo defeito shipando
   juntas seria o pior resultado possível para a fatia que abre com "corrigir Tabelas de Preço".

## 2. Onde a proposta da operação quebra sob volume, cache ou contrato

> **Discordo de `arquiteto-operacao-erp`, antecipando o ponto mais provável** (não vi o texto dele;
> se a posição real for outra, este ponto cai). O inventário nomeia a fila de pendentes de
> aprovação como "listagem com filtro de status sobre a lista existente" — se a proposta da operação
> for fazer isso **sem** também corrigir a ausência de paginação de servidor (ponto 1.2 acima), o
> "atalho de produtividade" (um link/rota que já chega filtrado em `AguardandoAprovacao`) esconde o
> mesmo teto de 200 atrás de uma UX mais confiante. Hoje o operador que filtra manualmente pelo
> dropdown já sofre o corte; uma rota dedicada com contagem em destaque (ex.: badge "N pendentes")
> **calculada sobre um array truncado em 200** pode mostrar um número que já nasce errado assim que
> uma empresa tiver mais de 200 pedidos em qualquer status combinado no filtro. Isto não é hipotético
> como volume — é **certo por contrato**: o `.Take(200)` corta antes de qualquer filtro de cliente
> rodar. Alternativa: se a fila vai virar rota própria nesta versão, o card de contagem some ou vem
> acompanhado de um aviso "mostrando até 200" enquanto o backend não abrir paginação — não custa
> reescrever tela, é uma frase e uma condição.
> Reversível: sim — trocar "contagem confiável" por "contagem com aviso de teto" é texto, não
> arquitetura. Cai se a operação trouxer medição real (contagem de pedidos por empresa no ambiente
> de produção) abaixo de 200.

> **Discordo de `arquiteto-operacao-erp`, segundo ponto antecipado**: se a proposta para o resumo de
> aprovação (Q3) incluir pré-carregar o detalhe de cada linha da lista para mostrar um preview antes
> de abrir (ex.: badge de valor no hover), o inventário já mediu que hoje **não há** pré-carga
> (`usePedidoVenda` roda só com `enabled: Boolean(id)`, ao abrir `/vendas/pedidos/{id}`). Adicionar
> N chamadas de detalhe para N linhas visíveis multiplica requisições sem necessidade — o resumo de
> aprovação já tem tela própria (o detalhe), não precisa duplicar dado ali. Alternativa: resumo
> vem do mesmo `GET /pedidos/{id}` já carregado ao abrir a tela de detalhe (dado que já está em
> cache sob `pedidoVendaQueryKey(id)`), não de uma chamada nova no diálogo de aprovação.
> Reversível: sim — é composição de tela sobre dado já buscado, não mudança de contrato.

## 3. Onde o corte de escopo vira dívida cara, e onde não

**Vira dívida cara:**

- **Corrigir V1 (envelope) sem também corrigir V2 (`isTabelaAtiva`) no mesmo diff.** O inventário já
  mostra que V2 é invisível hoje só porque V1 esconde a lista inteira — no instante em que V1 for
  corrigido, as 3 tabelas do banco aparecem, e a primeira coisa que o operador vê é uma tabela em
  Rascunho marcada "Ativa" (dado real, não hipotético: `select "StatusTabela" from
  erp.tabelas_preco` no inventário mostrou as 3 em `Rascunho`). Corrigir os dois juntos custa a
  mesma sessão de trabalho; corrigir só V1 entrega uma tela "funcionando" com um bug de rótulo
  visível no primeiro clique — a mesma classe de erro que a rodada 10 já registrou como cara
  (defeito visível herdado por quem copia o padrão).
- **Adiar a limpeza das permissões órfãs (Q6, V9) para depois da `b69`.** O backend já documentou a
  remoção deliberada (`PermissoesCatalogoDefinition.cs:118-121,128-130`, decisão `D3, v1.21.3/G1`
  — decisão do **backend**, não confundir com o `D3` deste repositório de frontend, que é sobre o
  guard de Tabelas de Preço). Enquanto o frontend não sincroniza, as duas permissões seguem
  atribuíveis em qualquer tela de grupo de acesso, sem efeito real — cada grupo criado ou revisado
  nesse meio-tempo pode incluir "conceder `POLITICA_COMERCIAL_GERENCIAR`" como se fizesse algo.
  Corrigir agora é remover duas entradas de três arquivos (union, catálogo, e onde routePermissions
  as referencia, se referenciar); corrigir depois de um cliente pedir "por que dei essa permissão e
  nada mudou" custa suporte, não só código.

**Não vira dívida cara — pode cortar sem medo:**

- **V10 (integração Pedido de Venda × Tabela de Preço) ficar fora da `b69`.** É o achado estrutural
  mais importante da rodada segundo o próprio inventário, e concordo — mas não é dívida por ficar
  de fora: hoje não existe conexão em **nenhuma** ponta do backend (nenhum use case de Vendas
  referencia `TabelasPreco`), então não há comportamento em produção que dependa disso. Adiar é
  puramente aditivo: quando o backend decidir a política (preencher automaticamente? avisar preço
  abaixo do mínimo? bloquear?), a integração entra como uma chamada nova a `usePrecoVigente` dentro
  do diálogo de item — local a um arquivo (`PedidoVendaItemDialog.tsx`), sem migração de dado.
- **`historicos` de `TabelaPrecoItemResponse` (histórico de alteração de preço) ficar fora.** O
  backend grava, o frontend não lê — é aditivo puro trazer depois (nova coluna/painel), sem custo
  de reverter nada porque nada foi construído em cima da ausência.
- **`sequencia`, `valorBruto`, `reservaEstoqueId`, `quantidadeBaixadaEstoque` do item de pedido
  ficarem fora do tipo do frontend.** Mesma lógica: campos entregues e não lidos, adicionar depois é
  estender um tipo e uma coluna, não reescrever fluxo. A única exceção que eu sinalizaria como
  quase-obrigatória (não bloqueante) é `reservaEstoqueId`: é o efeito visível direto da ação
  "Aprovar com `reservarEstoque=true`" (Q3), e sua ausência total na tela é uma lacuna de feedback,
  não de contrato — decisão de UX, encaminho para `arquiteto-operacao-erp`, não decido aqui.

## 4. Os gates que a camada precisa

### 4.1 `gate-contract-fields.mjs` para `TabelaPrecoResponse` — bloqueado pela seção 0, registro a ordem de trabalho

**Classe de defeito que fecha**: tipo do frontend declara campo sob nome/anulabilidade que o
backend não entrega (V2: `ativo`, inexistente; V4: `precoMinimo`/`margemPercentual` opcionais no
backend, obrigatórios no frontend). Mesma classe que `D71` já fechou para `MovimentoEstoque`.

**O que deixa vermelho, e em que ordem**: hoje, nada — porque a fonte que o gate leria
(`CONTRATO-API-v1.23.md:15480,15515`) está errada (seção 0). A sequência correta é: (1) esta rodada
corrige o client contra o C# fonte direto, comprovado por leitura de `TabelasPrecoResponses.cs` e
`TabelaPrecoConsultaContextoResolver.cs` (o mesmo padrão de evidência que o inventário já usou); (2)
o documento canônico precisa ser corrigido — fora da minha fronteira, encaminho como achado a quem
gera/mantém `docs/backend-v1.23/CONTRATO-API-v1.23.md`; (3) só depois de (2), `BACKEND_TYPE_MAP`
ganha `'tabelas-preco': { TabelaPrecoResponse: 'TabelaPrecoResponse', TabelaPrecoItemResponse:
'TabelaPrecoItemResponse' }`. Propor o gate antes de (2) criaria um gate verde comparando contra o
schema errado — pior que não ter gate, porque simula confiança.

**Custo aproximado**: a correção do client (1) é do tamanho de D71 — poucas linhas, um teste. A
correção do documento (2) não é estimável por mim (não é meu código). O gate (3) é uma entrada de
mapa, como sempre.

### 4.2 Gate de anulabilidade não é genérico ainda, e este módulo é o **terceiro** caso real

A rodada 10 já registrou (4.2 daquela posição) um gate de paridade de enum pedido pela rodada 07 e
nunca construído, com um segundo caso real medido. Esta rodada acrescenta munição a um problema
**correlato mas distinto**: **anulabilidade**, não nome. `precoMinimo`/`margemPercentual` (`decimal?`
no backend, `number` obrigatório no frontend, V4) e `PrecoProdutoVigenteResponse` sem
`margemPercentual` nenhum (V3) são dois sabores do mesmo defeito — campo lido pela UI com
`.toFixed(2)` direto, sem `?.`, sobre um valor que o contrato permite nulo/ausente. `gate-contract-
fields.mjs` hoje compara **existência de nome**, não **anulabilidade nem uso sem guarda**; não fecha
V3/V4 mesmo depois de corrigido 4.1. Não proponho construir esse gate nesta rodada — é escopo maior
(parsear `?` do C# e cruzar com uso de `.toFixed`/`.toUpperCase` sem `?.` no `.tsx`, uma classe de
análise estática que none dos gates atuais faz). Registro como achado de segunda ocorrência
(bancos/contábil já tiveram campo monetário sem guarda, `D5`/`D6`) para quem decidir se vale a pena
nesta ou noutra rodada — **não é gold-plating pedir isso na terceira vez**, mas também não vou travar
a `b69` por ele: é `.toFixed` sobre tabela hoje com **zero linhas gravadas** (`select count(*) from
erp.tabelas_preco_itens` → 0, medido pelo inventário), então o crash não tem como acontecer com o
dado atual.

### 4.3 `scripts/backend-contract-map.allowlist.json` não tem nenhuma das 19 rotas de Vendas/Tabelas de Preço

Medido: `grep -n "vendas\|tabelas-preco" scripts/backend-contract-map.allowlist.json` → zero. O
inventário já registrou isso como "consistente com endpoint compatível, nada a registrar" — concordo
com a leitura, mas com uma ressalva de plataforma: `validate:backend-contract-map` valida
rota/verbo, não formato de corpo (o próprio inventário marca isso como "não verificado, mas por
leitura de gates equivalentes"). Confirmo essa leitura por comparação com o próprio código do gate:
não li `validate-backend-contract-map.mjs` linha a linha nesta sessão (fora do meu recorte de
tempo), então **não afirmo o comportamento exato, só que o inventário está certo em não esperar que
esse gate pegasse V1** — é outra classe de defeito (rota existe vs. corpo lido certo), e é a classe
que 4.1 fecha, não 4.3.

## 5. O que eu abro mão

- **Não vou insistir para que o backend remova o wrapper `resultado` nesta rodada.** A correção mais
  barata e suficiente é no client (`normalizePaged` passa a olhar `data?.resultado ?? data`, além do
  array puro que já trata) — é uma linha a mais na mesma função, não uma renegociação de contrato.
  Sinal para trocar: se um segundo endpoint do backend aparecer com o mesmo padrão de envelope (hoje
  é só `ListarTabelasPrecoUseCase`), aí vale abrir a pergunta ao backend sobre por que o padrão
  existe e se deveria ser removido na fonte.
- **Não vou pedir paginação de servidor em `GET /api/vendas/pedidos` como bloqueio da `b69`.** É
  limite de contrato (`.Take(200)`), não decisão de tela — mas ao contrário da rodada 10 (onde aceitei
  "janela de data" como mitigação), aqui não tenho uma mitigação de UI tão limpa: pedido de venda não
  tem um filtro de período natural como Histórico de estoque tem. A mitigação que aceito é o aviso de
  teto (seção 2) — não travo a versão por isso, mas não assino sem o aviso. Sinal para trocar: alguém
  medir contagem real de pedidos por empresa acima de 200 num ambiente com histórico — aí vira
  pergunta ao backend com número, não suposição.
- **Não vou propor o gate de anulabilidade (4.2) como item obrigatório desta rodada.** É a terceira
  ocorrência da mesma classe, mas o escopo de construção é maior que uma entrada de mapa, e o dado
  real que provaria o crash (itens de tabela de preço) está vazio hoje. Registrei e encaminho; não
  bloqueio.
- **Não vou insistir em corrigir o `CONTRATO-API-v1.23.md` — não é meu arquivo, não é minha
  fronteira.** Registro o achado (seção 0) como bloqueador para o gate 4.1 nascer correto, e devolvo
  a quem mantém esse documento.
- **Se a operação trouxer medição real de volume (contagem de pedidos/tabelas por empresa no
  ambiente vivo) que contradiga meus pontos 1.2/2, minha objeção cai** e assino a fila sem o aviso de
  teto.

## Q1–Q8, posição direta

- **Q1 (Tabelas de preço)**: entra na `b69` como **primeiro item**, exatamente como o plano já
  nomeia ("Diagnóstico autenticado... antes de qualquer outra coisa"). V1+V2 no mesmo diff (seção 3).
  V3/V4 (anulabilidade) entram como correção de tipo (`?`) + guarda (`?.`) no mesmo diff — é barato
  (mudar `number` para `number | null` e um `?.` antes de `.toFixed`), não precisa de rodada própria.
  Confirmação sem HTTP real: contra `TabelasPrecoResponses.cs`/`ListarTabelasPrecoUseCase.cs`
  diretamente, porque o artefato de contrato canônico está errado para este módulo (seção 0) — é a
  mesma decisão que `D71` tomou para Estoque (confiar em fonte estática convergente), só que aqui a
  fonte é o C# puro, não o documento derivado dele.
- **Q2 (fila de pendentes)**: filtro de status sobre a lista existente, não rota nova — concordo com
  o enquadramento do plano. Objeção de plataforma: se vier com contagem em destaque, precisa do
  aviso de teto (seção 2) enquanto `.Take(200)` existir.
- **Q3 (resumo de aprovação)**: o resumo deve vir do `GET /pedidos/{id}` já em cache
  (`pedidoVendaQueryKey`), não de uma chamada nova por linha da lista (seção 2). Sobre
  `reservarEstoque`: não é decisão de plataforma qual o padrão (`true`/`false`) — é decisão de
  operação/produto; a única coisa que registro é que hoje não há feedback visual de
  `reservaEstoqueId` no item (campo entregue, sem uso), o que torna a ação "aprovar com reserva"
  silenciosa depois de feita — decisão de UX, encaminho, não decido.
- **Q4 ("até a liberação")**: leio como o inventário mede — "liberação" não é termo do domínio;
  Aprovado é o estado mais próximo, e Faturamento já está implementado e em produção. Recomendo que
  o recorte pare em Aprovado. Não é decisão minha sozinha (é pergunta de produto, pendência 2 do
  inventário) — mas do ponto de vista de plataforma, revisar Faturar nesta mesma versão empurraria
  `b69` para tocar um fluxo com sua própria complexidade de contrato (`naturezaOperacaoId`,
  `certificateThumbprint`, já reservados para `b71` no plano) — misturar aumenta a superfície de
  contrato revisada numa única versão sem necessidade.
- **Q5 (V10, Pedido × Tabela de Preço)**: sai da `b69` (seção 3) — não existe em nenhuma ponta do
  backend, e forçar a integração no frontend sem regra do backend (preencher automático? bloquear
  preço abaixo do mínimo? quem tem `VENDAS_PRECO_MINIMO_SOBRESCREVER`, que nem existe mais no
  backend?) seria inventar regra de negócio no frontend — antipadrão explícito da skill.
- **Q6 (permissões órfãs)**: removo do union/catálogo nesta fatia. `accessRisk: NENHUM` — não é
  `CAPACIDADE` (não fecha nenhuma ação real, o backend já confirmou zero `[RequiredPermission]`
  referenciando as duas) nem `ILUSAO` no sentido de "usuário acha que pode clicar e não pode" (o
  usuário nunca vê um botão condicionado a essas permissões, porque nenhum endpoint as exige) — é
  puramente **atribuição sem efeito** em tela de grupo de acesso. Reversível: sim, remoção de union é
  aditiva de reverter (basta adicionar de volta se o backend recriar o endpoint).
- **Q7 (`empresaId`/V5, money on screen/§7)**: corrigir `usePedidosVenda`/`PedidosVendaPage` para não
  disparar a primeira busca sem `empresaId` resolvido (`enabled: Boolean(filters.empresaId)` ou
  aguardar o contexto organizacional hidratar) — barato, reversível, mesmo padrão que `EmpresaFilialFilter`
  já resolve nas outras telas. Sobre money on screen: nenhuma correção de campo é urgente por si (a
  tabela "Money on screen" do inventário mostra nomes batendo 1:1, exceto os já cobertos por V3/V4);
  gate a propor é o **4.1**, uma vez destravado pela seção 0 — não abro um gate novo além dele.
- **Q8 (fatiamento)**: **uma versão só, `b69`**, não dividida. V1/V2/V3/V4 (Tabelas de Preço) e o
  `empresaId` de V5 são correções pequenas e sobre telas que a própria `b69` já vai tocar de qualquer
  forma (mesmo raciocínio que `D71` usou para Estoque: "a `b68` já ia reescrever a tela, corrigir
  junto é a mesma sessão"). O único candidato a `.cN` separada seria se o backend confirmar B-5
  (reprovar) como lacuna a fechar — aí a operação nova (endpoint + tela) teria contrato próprio a
  esperar, e não bloquearia o resto. Hoje B-5 já está respondida pela metade (não existe, é decisão
  de design, não lacuna) — não vejo motivo para fatiar preventivamente.

## Perguntas ao backend (separadas do que já foi lido)

- B-5 (reprovar): já respondida pela metade — não existe endpoint, confirmado por grep vazio. Falta
  só a confirmação de intenção (é assim que deve ficar, ou é lacuna). Não é pergunta de plataforma.
- B-15 (consolidação básico/avançado do estoque): a rodada 10 (`D72`) já registrou que precisa ser
  resolvida "antes de `b69`/`b70`" — **não foi**, porque `AprovarPedidoVendaUseCase` já integra o
  estoque **básico** via `VendaPedidoEstoqueOrchestrator` (confirmado pelo inventário, seção 4). Isto
  significa que a `b69` **já decide implicitamente** contra qual dos dois livros de estoque Vendas
  integra — é o básico, sem ambiguidade, porque é o único caminho que o backend implementou. B-15
  continua pendente para Compra (`b70`) decidir o mesmo, mas para Vendas a resposta já está no código,
  não precisa de nova decisão de arquitetura nesta rodada.
- Nova, desta rodada: **quem mantém `docs/backend-v1.23/CONTRATO-API-v1.23.md` precisa corrigir os
  blocos de `## TabelasPreco`** (`:15471`, `:15480`, `:15515` confirmados errados/ausentes) antes que
  qualquer gate estrutural possa nascer confiável para este módulo (seção 0 e 4.1). Não é pergunta ao
  backend C# — é ao processo de geração/manutenção do documento de contrato.

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "arquitetura",
  "assunto": "venda",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/11-plataforma-venda.md",
  "decisoesPropostas": [
    {
      "id": "Q1",
      "titulo": "V1 (envelope resultado) + V2 (isTabelaAtiva) corrigidos no mesmo diff, comprovados contra o C# fonte porque o artefato de contrato (CONTRATO-API-v1.23.md:15471-15538) está errado para este módulo; V3/V4 (anulabilidade) corrigidos no mesmo diff",
      "reversivel": true,
      "custo": "barato no client (uma função, dois tipos, um teste); documento canônico fica fora da minha fronteira, registrado como bloqueio para o gate 4.1"
    },
    {
      "id": "Q6",
      "titulo": "Remover VENDAS_PRECO_MINIMO_SOBRESCREVER e POLITICA_COMERCIAL_GERENCIAR do union/catálogo nesta fatia",
      "reversivel": true,
      "custo": "barato — accessRisk NENHUM, nenhuma capacidade real fechada"
    },
    {
      "id": "Q7",
      "titulo": "usePedidosVenda só dispara com empresaId resolvido (V5); nenhuma correção de campo money-on-screen além do que V3/V4 já cobrem",
      "reversivel": true,
      "custo": "barato — enabled condicional num hook"
    },
    {
      "id": "Q8",
      "titulo": "Uma versão só, b69 — nada nesta rodada exige contrato ainda inexistente que justifique fatiar",
      "reversivel": true,
      "custo": "nenhum custo extra identificado"
    }
  ],
  "discordancias": [
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "fila de pendentes com contagem em destaque sem aviso de que GET /api/vendas/pedidos corta em 200 registros (.Take(200) fixo, VendasRepository.cs:39, sem page/pageSize/hasMore)",
      "antecipada": true,
      "alternativa": "manter o aviso de teto até o backend abrir paginação; não travar a versão por isso",
      "reversivelSeErrado": true
    },
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "resumo de aprovação buscar detalhe por linha da lista para preview, multiplicando chamadas",
      "antecipada": true,
      "alternativa": "resumo vem do GET /pedidos/{id} já em cache sob pedidoVendaQueryKey ao abrir o detalhe",
      "reversivelSeErrado": true
    }
  ],
  "pendencias": [
    "docs/backend-v1.23/CONTRATO-API-v1.23.md:15471,15480,15515 — bloco de GET /api/tabelas-preco sem Response DTO, e blocos de POST/GET{id} colados com o schema errado (UsuarioResponse). Bloqueia a extensão de gate-contract-fields.mjs para TabelaPrecoResponse até ser corrigido; não é minha fronteira editar",
    "V1 (envelope resultado) segue não confirmado por resposta HTTP real, só por leitura de C# nas duas pontas (mesma limitação que o inventário já registrou)",
    "Gate de anulabilidade (4.2, terceira ocorrência da classe) não construído nesta rodada — registrado como achado recorrente, não bloqueante porque a tabela de itens está vazia hoje (0 linhas medidas)"
  ],
  "riscos": [
    "Se o backend corrigir o documento de contrato e o bloco real de TabelaPrecoResponse divergir do que a leitura de C# (TabelasPrecoResponses.cs) sugere nesta rodada, a correção de V1/V2 precisa ser reconferida",
    "V5 (empresaId ausente na primeira chamada) tratado como barato de corrigir, mas o timing exato do efeito de EmpresaFilialFilter não foi medido (mesmo risco que a rodada 10 já registrou para o padrão equivalente)",
    "Contagem real de pedidos por empresa acima de 200 não medida — toda a argumentação da seção 2 sobre a fila é sobre o teto de contrato (fato), não sobre frequência de estouro (intuição, rotulada)"
  ]
}
```
