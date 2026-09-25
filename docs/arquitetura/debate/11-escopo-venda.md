# Debate 11 — escopo e entrega — `venda` (candidato a `v1.11.0a8b69`)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend`, `arquiteto-design-system`, mesmo briefing.

## 0. Base fixada

```text
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
  → 1.11.0-a.8.b68   1.11.0a8b68

ls docs/fatias/ | tail -8
  → ...v1.11.0a8b67-classificacoes-pessoa.md, v1.11.0a8b68-estoque.md
    (nenhum arquivo de b69 ainda — a fatia não existe)

git log --oneline -5
  → 048d930 test(e2e): AC-9 espera 'Movimentos de estoque' ... (D72)
    666ca50 Merge pull request #30 ... codex/v1.11.0a8b68-estoque
    e87e2b7 feat(release): v1.11.0a8b68 — ...
```

`b68` fechou (release commitado, no topo da `main`; a branch corrente já está aberta sobre ele).
Nenhuma versão está bloqueada. O próximo slot funcional é `b69`, exatamente como a D67 travou —
sem reindexação nesta rodada. B-15 (dois livros-razão de estoque não se reconciliam) aparece na
tabela do plano como "antes de `b69`/`b70`", mas a D72 já qualificou isso: é pergunta de backend/
produto sobre **unificar** avançado e básico, não um bloqueio de leitura para `b69`. O inventário
(§4) confirma que a aprovação de venda já integra exclusivamente o sistema **básico**
(`IEstoqueService`, o mesmo que Compras usa) — `b69` não toca o avançado, não decide B-15, e não
depende da resposta. Não vejo motivo para tratar B-15 como bloqueio desta versão.

## 1. O achado que decide a ordem interna de `b69`: o diagnóstico do plano já existe, e aponta para outro bug do que a hipótese registrada

O plano (`PLANO-FRONTEND-ONDA-OPERACAO.md`, `b69`) abre com: *"Diagnóstico autenticado de Tabelas
de preço antes de qualquer outra coisa. Ver `v1.11.0a8b58.c4`."* A hipótese registrada em
"Correções fora da sequência funcional" dizia: *"`TabelasPrecoPage.tsx:53` nunca envia
`empresaId`/`filialId`, e manda `termo`, que o endpoint não declara."*

O inventário (`11-inventario-venda.md`, seção 0) mediu as duas metades separadamente e a hipótese
**erra a causa**: `empresaId`/`filialId` ausentes são inofensivos porque o backend resolve sozinho
pela empresa do usuário logado (`TabelaPrecoConsultaContextoResolver.cs:14-20`), e `termo` não
declarado é ignorado silenciosamente pelo model binding do ASP.NET — mesmo padrão já registrado na
rodada 10. A causa real é outra: `GET /api/tabelas-preco` embrulha a resposta em
`{ "resultado": { "items": [...] } }` (`TabelaPrecoPagedResponse`, um record com uma única
propriedade `Resultado`), e o client do frontend só sabe ler `PagedResult` na raiz — a tela sempre
renderiza vazia, com dado real gravado no banco (3 tabelas, confirmado por `select count(*)`).

Isto não é medição de valor real (não houve chamada HTTP autenticada — sem credencial disponível
nesta sessão, registrado como risco pelo inventário), é leitura de código nas duas pontas do
contrato (record C#, mapeador do client, tipo do frontend) mais reforço por dado real no banco.
Uso o mesmo critério que a D71 já travou para o Bloco A de `b68`: a prova que confirmaria isto por
HTTP não existe hoje rodando, esperar por ela não tem prazo, e o pior caso de agir errado é a tela
continuar mostrando vazio — exatamente como mostra hoje. Não regride.

### Decisão de sequência derivada disto

Não decido isolado a forma exata da correção (desembrulhar no client ou pedir ajuste no backend) —
isso é do `arquiteto-plataforma-frontend`. Decido **onde** ela entra: dentro de `b69`, como
**Bloco A**, primeiro que fila e aprovação — não como `.cN` separado antes da versão, e não como
"espera confirmação HTTP real".

## 2. D-A — o bug do envelope de Tabelas de preço entra em `b69`, Bloco A, junto com o que ele revela

**Posição: dentro de `b69`, primeiro bloco. Não vira `.cN` isolado; não fica pendente de
confirmação HTTP.**

Comparo com o precedente do próprio projeto (D71, `b68`): lá a diferença entre corrigir dentro da
versão vs. abrir `.cN` foi a severidade (gravação funciona, só a leitura de consulta erra) mais o
fato de a mesma tela estar prestes a virar aba nova. Aqui a severidade é **maior** — a listagem de
Tabela de Preço não mostra **nenhuma** linha, sempre, para qualquer usuário comum, mesmo com dado
existente e query correta. Isso bloqueia o operador de abrir qualquer tabela pelo fluxo normal (não
há como clicar em "Itens" numa linha que nunca aparece). Mas, diferente da `c2` de Produto Fiscal
(que bloqueava a gravação), aqui a **escrita continua funcionando** — `POST`/`PUT`/`ativar`/
`inativar` não passam pelo envelope quebrado, só `GET` da lista. Um operador que já sabe o `id` de
uma tabela (por outro caminho, ex. banco) ainda consegue editar; só não consegue **descobrir** o
id pela tela.

O que decide "dentro de `b69`, Bloco A" e não ".cN antes": o próprio plano já nomeia isto como o
primeiro item do escopo de `b69` ("antes de qualquer outra coisa"), a correção é inteiramente
client-side (sem mudança de payload, sem contrato novo), e a branch da versão já existe
(`codex/v1.11.0a8b69-venda`) — pagar o ritual completo de uma versão `.cN` própria (branch, plano,
QA, PR) por um fix contido não compra nada que sequenciar como primeiro commit da mesma branch não
compre também, e evita o mesmo módulo (`features/tabelas-preco`) sendo tocado em duas revisões
separadas em poucos dias.

**O que o Bloco A entrega, para não ser "correção invisível":**

1. O client de Tabelas de Preço passa a ler `resultado.items`/`resultado.page`/... (ou o formato
   que o `arquiteto-plataforma-frontend` decidir), corrigindo a listagem para exibir as tabelas
   reais.
2. `isTabelaAtiva` para de checar um campo `ativo` que o backend não envia e passa a ler `status`
   (enum numérico, `Ativa=2`) corretamente — bundlado porque só fica visível depois do item 1, e é
   o mesmo arquivo, mesma revisão (`TabelasPrecoPage.tsx`).
3. `precoMinimo`/`margemPercentual` (item de tabela) e `margemPercentual` (preço vigente) deixam de
   ser lidos como obrigatórios onde o backend declara `decimal?` — troca de tipo para opcional mais
   guarda antes de `.toFixed()`. Não há dado hoje que dispare o `TypeError` (0 linhas em
   `tabelas_preco_itens`), mas o caminho de escrita do backend permite nulo por contrato; corrigir
   agora custa uma checagem de nulo, corrigir depois de um incidente custa uma corretiva inteira
   para um `TypeError` em produção.
4. `TabelaPreco`/`TabelaPrecoItem` entram no `BACKEND_TYPE_MAP` de `scripts/gate-contract-fields.mjs`
   (mesmo mecanismo do D71 para `MovimentoEstoque`), prova vermelha contra a árvore de hoje.

**O que não faço**: não declaro V1 "confirmada" no sentido forte do padrão de execução — é cadeia
de evidência de código, sem chamada HTTP real. Registro isso como risco, não como fato medido.

## 3. D-B — fila de pendentes: filtro pré-aplicado sobre a listagem existente, sem rota nova nem paginação de servidor

**Posição: dentro, como ajuste da listagem já existente — não como tela/rota nova, não como
paginação de servidor.**

O inventário (§3) confirma: não existe endpoint de fila dedicado, `VendasRepository.ListarPedidosAsync`
tem `.Take(200)` fixo sem `page`/`pageSize`, e o filtro `status` já existe no backend e já é
exposto por um `Dropdown` na tela — só não há atalho pré-filtrado nem link direto, e o filtro se
perde ao sair da página (`useState` local). Construir uma rota nova (`/vendas/pedidos/aprovacao`)
para consumir o **mesmo endpoint com o mesmo filtro** que a listagem geral já aceita seria abrir
uma segunda tela sobre o mesmo dado — motor sem chamador adicional que não resolve nada que o
filtro não resolva, e multiplica manutenção (duas rotas, duas permissões a manter em sincronia,
dois lugares no `AppMenu`).

O que entra, sem construir infraestrutura nova:
- Atalho que abre a listagem com `status=AguardandoAprovacao` pré-selecionado (link do card de
  resumo já existente, ou query param), sem rota própria.
- Ligar o campo `termo` (busca por número) ao parâmetro server-side que já existe e nunca é
  usado (`vendasApi.ts` já implementa, a tela nunca escreve nele) — troca busca local por busca
  server-side, reduzindo volume trafegado. Fica no mesmo arquivo que D-A não toca (`vendasApi.ts`
  é módulo distinto de `tabelasPrecoApi.ts`), então não amplia o raio do Bloco A.

**O que fica fora**: paginação real de servidor. Não é corte — é ausência de contrato, igual à
D75 do estoque: `.Take(200)` sem `page`/`pageSize`/`totalItems`/`hasMore` não é uma tela para
desenhar, é um endpoint que não existe. `MISSING_CONTRACT`, não decisão de escopo. O teto de 200 é
silencioso (pedidos mais antigos somem sem sinal) — risco herdado, não construído por `b69`,
registrado, não resolvido nesta versão.

## 4. D-C — aprovação com resumo e confirmação, sem inventar comportamento sobre `reservarEstoque`

**Posição: dentro. O diálogo de aprovação mostra resumo (cliente, itens, `valorProdutos`,
`valorDesconto`, `valorTotal` — os três campos que o header já entrega e a UI já lê hoje, sem
inventar campo novo) e pede confirmação explícita antes de chamar `POST .../aprovar`.**

O parâmetro `reservarEstoque` (`AprovarPedidoVendaRequest`) fica **visível e explícito** (checkbox
no diálogo, não flag escondida), porque B-5 ("qual o padrão de `reservarEstoque` na aprovação
rápida?") segue sem resposta do backend/produto — o inventário confirma que essa metade da B-5
continua aberta (só a metade "existe reprovar?" foi respondida: não existe, zero resultados de
busca). Não decido um padrão implícito no lugar do backend: proponho o valor inicial **desmarcado**
(sem reserva), porque é o efeito de menor superfície — reservar estoque aciona
`VendaPedidoEstoqueOrchestrator` e pode falhar por saldo insuficiente (`VendaErrors.FalhaEstoque`);
partir de "não reservar" nunca surpreende o operador com uma falha de estoque no meio de uma
aprovação que ele só queria confirmar. Isto é a leitura mais conservadora do contrato, não a
resposta à B-5 — se o produto decidir que o padrão certo é "reservar sempre", é mudança de um
valor default, reversível, sem tocar payload.

**Erros de domínio no resumo**: o inventário lista que todos retornam `BadRequest` genérico sem
`field` por erro (mesma limitação estrutural que B-10 já registra para Compras). Isso não é algo
que `b69` resolve — é limitação do backend. O que entra é exibir a mensagem genérica de forma
legível (toast/painel), não fingir que existe granularidade de campo que o contrato não entrega.

**O que fica fora**: qualquer ação de "reprovar" — não existe (B-5 metade confirmada, zero
resultados de busca no domínio). Não construo um botão que chama um endpoint inexistente. Cancelar
continua sendo a única saída, como já está em produção.

## 5. D-D — "até a liberação" para no status Aprovado; Faturamento não é tocado

**Posição: fora do recorte de `b69`. `b69` termina no status `Aprovado`; Faturamento
(`FaturarPedidoVendaUseCase`, tela já em produção) não é revisado nesta versão.**

"Liberação" não é termo do domínio de Vendas (inventário §5, busca zero resultados) — o estado mais
próximo é `Aprovado`, o único a partir do qual `Faturar` fica disponível. Faturamento **já existe e
já está implementado e em produção** — não é um recurso a construir. Mais decisivo: o próprio plano
já reserva Faturamento para sua própria versão, `b71` ("era `b69`", D67), na sequência trancada
`b69` venda/preço/aprovação → `b70` compra/financeiro → `b71` faturamento. Tocar Faturamento agora
seria abrir uma frente paralela sem fechar a anterior — exatamente o que a régua de fatiamento
proíbe ("a onda tem começo e fim declarados... não abre frente paralela sem fechar a anterior").
Não há dependência técnica que force `b69` a mexer em Faturamento: o `PedidoVendaDetalhePage` já
tem o botão "Faturar" funcionando, e nada do que entra em `b69` (Bloco A/B/C) toca esse caminho.

**Gatilho de volta**: quando `b71` (Faturamento) começar, na sequência já travada.
**Reversível**: sim — não tocar uma tela não impede tocá-la depois; nada se perde ficando fora.

## 6. D-E — Pedido de Venda × Tabela de Preço (V10): fora, e a permissão órfã sai junto

**Posição: fora. Nenhuma integração de preço nova entra em `b69`. A pergunta vira pendência
formal ao produto/backend, não escopo implícito.**

O inventário (V10) é categórico: nenhum use case de Vendas referencia `TabelasPreco` — o preço do
item é 100% digitado manualmente, sem pré-preenchimento por `usePrecoVigente`, sem checagem de
`precoMinimo`. O nome do recorte ("Venda, **preço** e aprovação") sugere uma integração que **não
existe em nenhuma das duas pontas do contrato hoje**. Construir isso no frontend seria inventar
uma regra de negócio que o backend não define (qual preço prevalece se houver mais de uma tabela
aplicável? o que acontece se o preço digitado for menor que `precoMinimo`? quem tem
`VENDAS_PRECO_MINIMO_SOBRESCREVER`?) — exatamente o anti-padrão nomeado no padrão de execução
("inventar... regra fiscal", extensivo a regra comercial). Não é corte de conforto: é ausência de
contrato nos dois lados, `MISSING_CONTRACT`.

**Consequência para Q6 (permissões órfãs)**: com V10 fora, `VENDAS_PRECO_MINIMO_SOBRESCREVER` e
`POLITICA_COMERCIAL_GERENCIAR` seguem sem qualquer endpoint que as use — e o próprio backend já
documentou a remoção deliberada (`PermissoesCatalogoDefinition.cs:118-121,128-130`, decisão
`D3, v1.21.3/G1`, nota: "volta quando existir o endpoint que a usa"). O frontend nunca recebeu essa
remoção. Proponho remover as duas do union (`types/erp.ts`), do catálogo
(`permissoesCatalogo.ts`) e de qualquer grupo de acesso que as liste hoje, na mesma `b69` —
não porque V10 decidiu isso, mas porque manter uma permissão atribuível que não guarda nenhuma
capacidade real é a mesma classe de dívida que o backend já pagou o custo de identificar.

Classificação `accessRisk` (`.claude/graph/risk.yaml`): **ILUSAO**, não `NENHUM` puro. Diferença
para o exemplo canônico de `NENHUM` (guard ganhando permissão): aqui alguém *pode* perder a
possibilidade de **marcar** a permissão numa tela de grupo de acesso, mesmo que marcá-la hoje não
abra nenhuma capacidade real (nenhum `[RequiredPermission]` a referencia em nenhum controller,
confirmado por grep do inventário) — "perde-se a promessa, não a capacidade", a própria definição
de `ILUSAO` no `risk.yaml`. Exige, portanto, a mesma providência que `ILUSAO` exige: entrada no
`CHANGELOG.md` dizendo, com todas as letras, que nenhuma operação que hoje conclui deixa de
concluir.

**Risco que carrego, não medido**: não sei, sem credencial de banco desta sessão, se algum grupo de
acesso em produção tem uma dessas duas permissões marcada hoje. Se tiver, removê-la do catálogo faz
esse grupo perder a linha na tela de edição (não uma capacidade real, mas um registro visível).
Proponho que quem executar a fatia rode, antes do commit, uma consulta ao banco (mesmo padrão do
inventário: `select count(*) from erp.grupo_acesso_permissoes where codigo in (...)`) para
confirmar zero uso — se houver uso, a remoção ainda é segura (a permissão não faz nada), mas o
`CHANGELOG` precisa nomear quais grupos perdem a marcação visível, não só declarar em abstrato.

**Gatilho de volta**: backend publicar o endpoint que volta a amarrar `VendasPrecoMinimoSobrescrever`
a uma ação real — nesse caso as duas entram de novo no union/catálogo como fatia aditiva, e V10
volta a ser avaliável.

## 7. D-F — `empresaId` ausente na primeira chamada de `GET /api/vendas/pedidos` (V5)

**Posição: dentro. Corrigir com `enabled` na query, não com valor default inventado.**

A diferença que o inventário levanta entre Tabelas de Preço (o backend resolve sozinho quando
`empresaId` vem vazio) e Vendas (o backend **exige** `Guid` não vazio e devolve `[]` silencioso
quando recebe `Guid.Empty`, sem sinal de erro) é a que decide a ação: aqui não há fallback do lado
do servidor, então a tela precisa não disparar a query até ter uma empresa resolvida. A correção é
pequena e do mesmo tipo que outras telas do projeto já usam (`enabled: Boolean(filters.empresaId)`
em vez de disparar a chamada assim que o componente monta) — reversível, sem payload novo. Sem
isso, um usuário "global" (`master@erp.local`, `EmpresaId == Guid.Empty`) veria a lista de pedidos
sempre vazia, indistinguível de "não há pedidos" — o mesmo risco de silêncio que V1 tinha em Tabela
de Preço, só que aqui o `[]` é **legítimo por contrato** (o backend devolve 200 vazio de propósito
para contexto inválido), então a tela é quem precisa não perguntar antes de ter contexto.

## 8. As três listas

```text
DENTRO
  - Bloco A: correção do envelope `resultado` em GET /api/tabelas-preco (client desembrulha),
    isTabelaAtiva lendo `status` em vez de `ativo` inexistente, precoMinimo/margemPercentual como
    opcional com guarda de nulo (item de tabela e preço vigente), TabelaPreco/TabelaPrecoItem no
    gate de campos de response.
  - Bloco B: atalho pré-filtrado para "aguardando aprovação" sobre a listagem existente (sem rota
    nova); busca por `termo` passa a usar o parâmetro server-side já implementado e nunca ligado.
  - Bloco C: diálogo de aprovação com resumo (cliente, valorProdutos, valorDesconto, valorTotal,
    itens) e confirmação explícita; `reservarEstoque` visível como checkbox, default desmarcado.
  - Correção de `GET /api/vendas/pedidos` para não disparar sem `empresaId` resolvido (V5).
  - Remoção de `VENDAS_PRECO_MINIMO_SOBRESCREVER`/`POLITICA_COMERCIAL_GERENCIAR` do union, do
    catálogo e de guards, com nota `ILUSAO` no CHANGELOG.

FORA (com gatilho de volta)
  - Faturamento (D-D) — recorte já reservado para `b71` pela D67; tela já em produção, sem
    dependência técnica que force `b69` a tocá-la.
    Gatilho: início de `b71`, na sequência já travada.
  - Integração Pedido de Venda × Tabela de Preço, V10 (D-E) — nenhuma das duas pontas do contrato
    existe hoje; construir seria inventar regra de negócio.
    Gatilho: backend publicar use case que referencie TabelasPreco a partir de PedidoVenda, e
    produto definir a regra de precedência/precoMinimo.
  - Paginação real de servidor na fila/listagem de pedidos (D-B) — `.Take(200)` sem `page`/
    `pageSize` no contrato.
    Gatilho: backend expõe paginação de servidor em GET /api/vendas/pedidos.
  - Rota/tela dedicada para fila de aprovação (D-B) — o filtro pré-aplicado sobre a listagem
    existente resolve o mesmo caso de uso sem duplicar rota/permissão/menu.
    Gatilho: operação apontar um caso de uso real que o filtro pré-aplicado não cobre (ex.:
    contagem em tempo real fora da própria tela, notificação).
  - Ação de "reprovar" — não existe no backend (B-5, metade confirmada).
    Gatilho: backend publicar o endpoint.
  - Exibir `motivoCancelamento`, `canceladoEm`, `sequencia`, `valorBruto`, `reservaEstoqueId`,
    `quantidadeBaixadaEstoque`, `historicos` de item de tabela de preço — campos que o backend
    entrega e o frontend não lê hoje, sem urgência funcional declarada por ninguém.
    Gatilho: operação apontar necessidade concreta (ex.: indicar visualmente item com reserva
    vinculada, exibir motivo de cancelamento na tela).

DEPOIS (não é fora, é ordem)
  - Nada identificado que dependa estritamente de `b69` fechar primeiro. `b70` (Compra e
    financeiro) e `b71` (Faturamento) seguem a sequência já travada pela D67, sem mudança de
    dependência proposta por esta rodada.
```

## 9. Sequência dentro de `b69`

```text
Bloco A (primeiro) → Bloco B → Bloco C, dentro do mesmo branch/versão.
  Dependência: nenhum bloco depende tecnicamente de outro (tabelas-preco, listagem de pedidos e
  diálogo de aprovação são arquivos/módulos distintos), mas o plano já nomeia A como "antes de
  qualquer outra coisa" e a severidade (tela sempre vazia) justifica não deixá-lo por último —
  se algo tiver de ficar para trás por corte de tempo dentro da versão, não deve ser A.

D-F (empresaId em GET /api/vendas/pedidos) é independente e pode ser feito em paralelo com A —
  arquivo diferente (vendasApi.ts/useVendasResources.ts vs. tabelasPrecoApi.ts), sem dependência.

Remoção de permissão órfã (D-E consequência) entra na mesma revisão que qualquer tela de grupo de
  acesso for tocada por outro motivo, ou como commit isolado pequeno se nenhuma outra tela mexer
  no catálogo — não é motor sem chamador porque a remoção não constrói nada que precise ser
  "chamado"; é subtração de um item já morto no backend.

Nenhuma reindexação da onda. b70 (Compra e financeiro) continua dependendo de b65-b69 pela D67,
  sem mudança de sequência proposta aqui.
```

## 10. Fatiamento — o que `b69` entrega quando fechar

```text
Observável na tela:
  - Tela de Tabelas de Preço passa a listar as tabelas reais (hoje sempre vazia), com o status
    correto (Ativa/Rascunho/Inativa/Expirada, hoje invertido entre Rascunho e Ativa).
  - Listagem de Pedidos de Venda tem atalho para "aguardando aprovação" e busca por número
    funcionando via servidor (hoje busca só local, campo server-side nunca acionado).
  - Diálogo de aprovação mostra resumo do pedido e exige confirmação explícita antes de aprovar,
    com o controle de reserva de estoque visível (hoje é um parâmetro silencioso do request).
  - Usuário "global" (sem empresa fixa) deixa de ver a lista de pedidos sempre vazia por disparo
    prematuro da query.
  - Tela de grupos de acesso deixa de oferecer duas permissões que não guardam nenhum endpoint.

Teste ou gate que protege:
  - TabelaPreco/TabelaPrecoItem no BACKEND_TYPE_MAP de gate-contract-fields.mjs, prova vermelha
    contra o estado atual (mesmo mecanismo do D71 para MovimentoEstoque).
  - Teste unitário do normalizador de paginação de tabelas-preco cobrindo o corpo real
    (`{ resultado: { items, ... } }`), não o formato hipotético anterior.
  - tests/unit/vendasPayload.test.ts ou equivalente cobrindo o payload de aprovação
    (reservarEstoque explícito, default desmarcado).
  - Teste de guard/catálogo confirmando que as duas permissões órfãs saem do union sem quebrar
    nenhuma tela existente (nenhum componente as referencia hoje, confirmado por grep do
    inventário — o teste prova que isso continua verdade).
  - Teste cobrindo que GET /api/vendas/pedidos não dispara sem empresaId resolvido.

Documento:
  - Entrada no CHANGELOG.md com blocos nomeados (Bloco A: Tabelas de Preço; Bloco B: fila; Bloco
    C: aprovação; mais os itens avulsos de D-E/D-F), mesmo padrão que b68 usou.
  - Nota ILUSAO no CHANGELOG para a remoção das duas permissões órfãs, nomeando explicitamente que
    nenhuma operação que hoje conclui deixa de concluir.
```

## 11. Trade-offs aceitos

```text
1. Corrigir o envelope de Tabelas de Preço sem confirmação HTTP real.
   Perde: certeza de runtime — apoiado em leitura de código (record C#, mapeador do client, tipo
   do frontend) mais dado real no banco (3 tabelas gravadas, 0 aparecem na tela).
   Dói quando: existir algum middleware de serialização não encontrado na busca (ex.: um filtro
   de resposta que desembrulha `resultado` antes de sair do backend, o que tornaria a correção do
   client redundante ou até quebraria uma resposta já correta).
   Reversível: sim — é remapeamento de leitura no frontend, sem mudança de contrato do backend.

2. Fila de aprovação como filtro pré-aplicado, sem rota/tela própria.
   Perde: não há URL compartilhável nem item de menu dedicado só para "pendentes"; quem quiser
   voltar à fila usa o mesmo caminho da listagem geral.
   Dói quando: o volume de pedidos aguardando aprovação crescer ao ponto de precisar de uma visão
   permanente (dashboard, contador em tempo real fora da própria tela) — não medido, é o mesmo
   tipo de estimativa que o inventário já registrou para outros módulos.
   Reversível: sim — promover o filtro a rota própria depois é aditivo, sem payload nem cache
   compartilhado em jogo.

3. `reservarEstoque` com default desmarcado, sem esperar resposta da B-5.
   Perde: se o produto decidir depois que o padrão correto era "reservar sempre", o
   comportamento observado nesta versão diverge do padrão futuro — quem aprovou pedidos sem notar
   o checkbox terá pedidos sem reserva que talvez devessem ter.
   Dói quando: a resposta da B-5 vier "reservar por padrão" e existir volume de pedidos aprovados
   no meio tempo sem reserva, exigindo reprocessamento manual.
   Reversível: sim quanto ao código (é um valor default, muda numa linha); não retroativo aos
   pedidos já aprovados sem reserva no período — isso não se desfaz sozinho.

4. Faturamento fora do recorte, apesar do título "até a liberação".
   Perde: quem interpretar "liberação" como incluindo o primeiro passo pós-Aprovado (emitir nota,
   faturar) não vê isso nesta versão.
   Dói quando: o produto quisesse dizer, com "liberação", algo diferente de "chega até Aprovado" —
   risco que só se resolve com a pendência de produto que o inventário já registrou.
   Reversível: sim — Faturamento já existe e funciona; não tocá-lo agora não perde nada, só adia
   revisão.

5. Remoção de duas permissões órfãs do union/catálogo sem medir uso em produção.
   Perde: possibilidade (não medida) de algum grupo de acesso hoje ter uma das duas marcadas e
   perder essa marcação visível — sem perda de capacidade real, porque nenhum endpoint as usa.
   Dói quando: um administrador notar a ausência e perguntar por quê, sem o CHANGELOG explicando
   — mitigado por exigir a nota ILUSAO explícita como parte da entrega, não como opcional.
   Reversível: sim — reintroduzir no union/catálogo é aditivo; o próprio backend já provou que
   remover e reintroduzir (quando existir endpoint) é um ciclo seguro (D3, v1.21.3/G1).
```

## 12. O que eu abro mão

```text
- Abro mão de exigir confirmação HTTP real antes de corrigir o envelope de Tabelas de Preço
  (D-A/Bloco A). Decido agir sobre evidência de código forte (record C#, mapeador do client, tipo
  do frontend, todos lidos e citados por linha) mais dado real no banco, porque esperar por
  alguém rodar uma chamada autenticada não tem prazo e o pior caso de estar errado é a tela
  continuar mostrando vazio, exatamente como mostra hoje. Mesmo raciocínio que a D71 já travou
  para o Bloco A de `b68` — não é precedente que eu inventei, é o mesmo critério aplicado de novo.

- Abro mão de construir a integração Pedido de Venda × Tabela de Preço (V10/D-E), mesmo o nome do
  recorte da rodada ("Venda, preço e aprovação") sugerindo que ela deveria existir. A base do
  corte é que nenhuma das duas pontas do contrato tem essa integração hoje — não é eu preferindo
  cortar, é ausência total de contrato. Se o `arquiteto-operacao-erp` tiver evidência de que o
  negócio já opera com uma regra informal de precedência de tabela de preço que devesse virar a
  base da integração, retiro o corte e escalo como pendência de maior prioridade, não decido
  sozinho a regra.

- Abro mão de propor rota/tela própria para a fila de pendentes de aprovação (D-B), preferindo um
  atalho sobre a listagem existente. Não é economia por preguiça: é que a rota nova consumiria o
  mesmo endpoint com o mesmo filtro que já existe, duplicando permissão/menu/manutenção sem
  resolver nada que o filtro não resolva. Se o `arquiteto-design-system` ou o
  `arquiteto-operacao-erp` apontarem um caso de uso concreto que o filtro pré-aplicado não cobre
  (por exemplo, contagem persistente fora da tela, ou necessidade de navegação direta por link
  externo), retiro o corte.

- Não abro mão de nenhum gate ou teste existente. Não corto o gate de contrato de campos — ao
  contrário, proponho estendê-lo (TabelaPreco/TabelaPrecoItem no BACKEND_TYPE_MAP) exatamente como
  a D71 fez para MovimentoEstoque. Não corto nenhum teste de payload existente.

- Corte que NÃO faço por falta de gatilho seguro: não proponho remover as permissões órfãs sem que
  quem executar a fatia confirme, por consulta ao banco, se algum grupo de acesso em produção as
  tem marcadas hoje. Não é corte que eu recuso — é corte que faço com uma condição de verificação
  explícita anexada, porque não tenho credencial nesta sessão para medir isso eu mesmo.

- Abro mão de decidir sozinho o valor default de `reservarEstoque` no diálogo de aprovação
  (D-C). Proponho "desmarcado" como leitura conservadora do contrato, não como resposta à B-5 —
  quem tem autoridade sobre isso é o produto/backend. Se a resposta da B-5 vier antes do fechamento
  da versão, o default muda antes de qualquer pedido real ser aprovado sob o valor provisório.
```

## 13. Como discordar (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` se ele defender incluir Faturamento no escopo de `b69`
> sob o argumento de que "até a liberação" deveria cobrir o primeiro passo pós-aprovação.**
> Faturamento não é pré-requisito do marco em jogo (fila + aprovação) porque já existe e funciona
> em produção — nada em `b69` depende dele fechar antes. A sequência D67 já reserva `b71` para
> essa tela. Proponho fora por ora, gatilho de volta: início de `b71`. Reversível: sim, não tocar
> uma tela que já funciona não perde nada.

> **Discordo de `arquiteto-plataforma-frontend` se ele defender adiar a correção do envelope de
> Tabelas de Preço (Bloco A) até existir confirmação HTTP real, abrindo uma pendência bloqueante
> em vez de agir.** O custo de esperar não é neutro: a tela está inutilizável hoje (sempre vazia)
> e o próprio plano já nomeia essa correção como o primeiro item de `b69`. A cadeia de evidência de
> código é forte (record C#, ausência de `JsonPropertyName`/política global, mapeador do client,
> tipo do frontend, todos citados por linha) e o pior caso de agir errado é idêntico ao estado
> atual. Reversível: sim.

> **Discordo de `arquiteto-design-system` se ele defender uma rota/tela própria para a fila de
> aprovação como pré-requisito de consistência de padrão de navegação.** Não é pré-requisito do
> marco em jogo — o filtro pré-aplicado sobre a listagem existente entrega a mesma capacidade
> funcional sem duplicar permissão/menu. Se a objeção for puramente de padrão visual (toda "fila"
> do sistema deveria ter rota própria), não estou convencido de que isso supere o custo de manter
> duas rotas para o mesmo dado — mas é reversível: promover o filtro a rota é aditivo, sem gatilho
> irreversível envolvido, então retiro o corte se houver precedente forte de outro módulo do
> projeto seguindo esse padrão.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "venda",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/11-escopo-venda.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Correção do envelope 'resultado' em GET /api/tabelas-preco, isTabelaAtiva lendo status em vez de ativo inexistente, e anulabilidade de precoMinimo/margemPercentual, entram em b69 como Bloco A, antes de fila e aprovação; gate-contract-fields.mjs ganha TabelaPreco/TabelaPrecoItem. Não vira .cN separado, não espera confirmação HTTP.", "reversivel": true, "gatilho": "evidência de mecanismo de serialização diferente do lido no C#, que reverteria o remapeamento" },
    { "id": "D-B", "titulo": "Fila de pendentes de aprovação como atalho/filtro pré-aplicado sobre a listagem de pedidos existente, ligando o parâmetro termo server-side já implementado e nunca acionado; sem rota nova, sem paginação de servidor (contrato não sustenta)", "reversivel": true, "gatilho": "backend expõe paginação de servidor em GET /api/vendas/pedidos, ou operação aponta caso de uso que o filtro pré-aplicado não cobre" },
    { "id": "D-C", "titulo": "Diálogo de aprovação com resumo (cliente, valorProdutos, valorDesconto, valorTotal, itens) e confirmação explícita; reservarEstoque visível como checkbox, default desmarcado até a B-5 responder", "reversivel": true, "gatilho": "resposta da B-5 define o default correto de reservarEstoque" },
    { "id": "D-D", "titulo": "Faturamento fica fora do recorte de b69 — 'até a liberação' para no status Aprovado; a tela já existe e já funciona, e a sequência D67 já reserva b71 para ela", "reversivel": true, "gatilho": "início de b71, na sequência já travada" },
    { "id": "D-E", "titulo": "Integração Pedido de Venda x Tabela de Preço (V10) fica fora — nenhuma ponta do contrato existe hoje; VENDAS_PRECO_MINIMO_SOBRESCREVER e POLITICA_COMERCIAL_GERENCIAR saem do union/catálogo/guards do frontend, alinhando com a remoção já feita pelo backend (D3, v1.21.3/G1), classificado accessRisk ILUSAO", "reversivel": true, "gatilho": "backend publica use case que referencie TabelasPreco a partir de PedidoVenda; para a permissão, endpoint novo que volte a amarrá-la" },
    { "id": "D-F", "titulo": "GET /api/vendas/pedidos passa a usar 'enabled' condicionado a empresaId resolvido, em vez de disparar a query no primeiro render sem contexto organizacional", "reversivel": true, "gatilho": "não se aplica — é correção que fecha um MISSING_CONTRACT de comportamento silencioso, não corte" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de incluir Faturamento no escopo de b69 por interpretação ampla de 'até a liberação'", "impacto": "alto" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "possível defesa de adiar a correção do envelope de Tabelas de Preço até haver confirmação HTTP real", "impacto": "alto" },
    { "de": "arquiteto-design-system", "ponto": "possível defesa de rota/tela própria para a fila de aprovação por consistência de padrão de navegação", "impacto": "medio" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "Confirma por captura HTTP real que GET /api/tabelas-preco devolve o corpo embrulhado em 'resultado' (hoje só confirmado por leitura de código nas duas pontas do contrato, sem credencial nesta sessão)?", "decide": "se a correção do Bloco A está certa como proposta, ou se existe mecanismo de serialização não encontrado" },
    { "tipo": "funcional", "pergunta": "Qual o padrão de 'reservarEstoque' na aprovação rápida (B-5, metade não respondida)?", "decide": "o valor default do checkbox no diálogo de aprovação — proposto 'desmarcado' como leitura provisória, não como resposta" },
    { "tipo": "funcional", "pergunta": "'Até a liberação' confirma que o recorte para em Aprovado e trata Faturamento como fora, na sequência já reservada para b71?", "decide": "se D-D (Faturamento fora) está certo, ou se 'liberação' pretendia outra coisa que precisaria entrar em b69" },
    { "tipo": "backend", "pergunta": "Algum grupo de acesso em produção tem VENDAS_PRECO_MINIMO_SOBRESCREVER ou POLITICA_COMERCIAL_GERENCIAR marcada hoje?", "decide": "se a remoção do catálogo precisa nomear grupos específicos no CHANGELOG, além da nota ILUSAO genérica" }
  ],
  "riscos": [
    "D-A (correção do envelope de Tabelas de Preço) se apoia 100% em leitura de código (record C#, ausência de JsonPropertyName/NamingPolicy, mapeador do client) mais dado real no banco — sem confirmação HTTP real, por falta de credencial autenticada nesta sessão.",
    "D-C (default de reservarEstoque desmarcado) é decisão provisória sobre uma pergunta ainda aberta (B-5); pedidos aprovados durante a janela entre o deploy de b69 e a resposta de B-5 não se corrigem retroativamente se o padrão certo vier a ser 'reservar sempre'.",
    "D-E (remoção de permissão órfã) não foi verificado contra o banco de produção se algum grupo de acesso tem essas permissões marcadas hoje — proposto como condição de execução, não como fato medido.",
    "V7/D-B: o teto de 200 registros em GET /api/vendas/pedidos (sem sinal de truncamento) é herdado, não construído por b69, e permanece sem solução nesta versão — mesma classe de risco que a rodada 10 registrou para /api/estoque/movimentos."
  ]
}
```
