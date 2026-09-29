# Posição — `arquiteto-operacao-erp` — rodada 11, Venda, preço e aprovação (`b69`)

Fonte: `docs/arquitetura/debate/11-inventario-venda.md` (inventariante), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`
(seção `b69`, B-5, B-15, hipótese `v1.11.0a8b58.c4`), `docs/arquitetura/DECISOES.md` (D56, D67, D71/D-A
por precedente de rodada anterior — não há Dn de Vendas ainda). Leitura direta confirmada nesta rodada:
`features/vendas/components/PedidoVendaDetalhePage.tsx`, `PedidosVendaPage.tsx`,
`PedidoVendaActionDialogs.tsx` (linhas 15-45), `features/tabelas-preco/hooks/useTabelasPreco.ts`
(confirma que `usePrecoVigente` já existe e está pronto para import cruzado). Comando:
`grep -rn "precoMinimo\|PrecoMinimo" features/vendas` → zero resultados, confirma V10 do lado do
frontend também.

## 1. O fluxo do operador, ponta a ponta

Quem vende faz três trabalhos distintos que passam pela mesma tela. Escrevo os três porque a `b69`
mexe nos três com o mesmo componente (`PedidoVendaDetalhePage`), e fechar dois com o terceiro
quebrado ainda deixa a rotina incompleta.

**A. Vendedor monta o pedido (Rascunho)**
1. Abre `/vendas/pedidos`, clica "Novo pedido" (módulo Vendas). `VENDAS_GERENCIAR` exigido —
   **fecha**.
2. Escolhe Empresa/Filial, Cliente (`EntitySelect`), Tipo, datas — **fecha** (seleção por rótulo,
   não GUID digitado).
3. Salva o cabeçalho, cai no detalhe (`/vendas/pedidos/{id}`) — **fecha**.
4. Adiciona item: Produto (`EntitySelect`), Local de estoque (`EntitySelect`), Quantidade — **fecha**
   os vínculos.
5. Quer saber **quanto cobrar** por aquele produto: hoje digita `valorUnitario` de cabeça ou
   consultando uma fonte fora do ERP (papel, planilha, memória) — **quebra**. O pedido não lê
   `preco-vigente`, e a única tela que mostraria isso (`/tabelas-preco`) está com a listagem vazia
   por V1 (seção 0 do inventário) — mesmo que o vendedor sasse abrir a tela certa, ela não mostra
   nada hoje. Repete até esgotar os itens.
6. Confirma cada item. **Fecha** tecnicamente (o valor digitado é salvo), mas sem apoio de preço.
7. Revisa os totais no card "Totais" (produtos, desconto, total) — **fecha**, campos batem 1:1 com
   o backend (seção 7 do inventário).

**B. Alguém aprova (Rascunho/AguardandoAprovacao → Aprovado)**
1. Abre `/vendas/pedidos`, precisa achar os pedidos esperando aprovação — hoje isso é ajustar
   manualmente o `Dropdown` de status para "AguardandoAprovacao" **toda vez**, porque o filtro não
   persiste entre sessões (`useState` local, seção 3 do inventário) — **quebra parcialmente**: o
   passo existe, mas não é um atalho, é repetição.
2. Clica "Abrir" no pedido certo. Chega no detalhe — **fecha**.
3. Antes de aprovar, quer conferir o que está aprovando: cliente, itens, valor total. O card
   "Totais"/"Dados do pedido" está na mesma tela, **atrás** do modal de aprovação — em telas
   estreitas (tablet, a maioria dos operadores de campo) o modal cobre o conteúdo. **Quebra**: o
   diálogo `AprovarPedidoVendaDialog` (`PedidoVendaActionDialogs.tsx:15-35`) não repete nenhum dado
   do pedido — nem número, nem cliente, nem valor total, nem contagem de itens. É um checkbox
   ("Reservar estoque") e um campo de observação livre. Quem aprova não vê o que está aprovando
   dentro do próprio ato de aprovar.
4. Decide sobre "Reservar estoque na aprovação" (checkbox, default marcado) sem nenhuma explicação
   do que isso faz — **quebra**: o texto não diz que a reserva exige `localEstoqueId` em cada item
   que controla estoque (senão o backend recusa, seção 4 do inventário: `IEstoqueService` exige
   local), nem que reserva é o único jeito hoje de "segurar" saldo para este pedido antes do
   faturamento.
5. Confirma. Se o backend recusar (produto revalidado e reprovado, cliente inválido, falha de
   reserva por saldo insuficiente) — o erro vem `BadRequest` genérico, sem campo (seção 4 do
   inventário) — **fecha tecnicamente** (o toast de erro aparece via `useMutationWithToast`), mas o
   operador não sabe **qual item ou qual regra** falhou, só que falhou.
6. Erra e quer voltar atrás: não existe "reprovar" (B-5 confirmado como ausência de operação, não
   lacuna escondida). O único caminho de saída do fluxo de aprovação é Cancelar, que é terminal
   (não reabre) — **isto não é bug de tela, é a regra do domínio**; a tela **não avisa** disso no
   momento em que o operador olha o botão "Aprovar" e pergunta "e se eu errar?".

**C. Alguém fatura (Aprovado → Faturado)** — já implementado, fora do redesenho descrito no plano
(seção 5 abaixo). Vale registrar que está na **mesma tela**, mesmo componente: o operador que
aprovou pode, sem sair da página, clicar "Faturar" — isso já fecha hoje.

## 2. Onde o fluxo quebra hoje — resumo com origem

| Passo | Módulo/tela | Quebra | Evidência |
| --- | --- | --- | --- |
| A.5 | Item do pedido | sem preço de referência; tela de Tabelas de preço vazia por bug | V1/V10 do inventário; `PedidoVendaItemDialog` sem `usePrecoVigente` |
| B.1 | Listagem de pedidos | filtro de status não persiste, sem atalho para "aguardando aprovação" | `PedidosVendaPage.tsx:37` (`useState` local); seção 3 do inventário |
| B.3 | Diálogo de aprovação | nenhum dado do pedido repetido no modal de confirmação | `PedidoVendaActionDialogs.tsx:27-33` |
| B.4 | Diálogo de aprovação | checkbox "Reservar estoque" sem explicação do efeito/pré-requisito | mesmo arquivo, linha 30 |
| B.5 | Aprovação | erro de domínio sem campo, operador não sabe qual item falhou | `AprovarPedidoVendaUseCase.cs:43-83` (seção 4 do inventário) |
| B.6 | Aprovação | ausência de "reprovar" não é explicada na tela | seção 2/4 do inventário (B-5 respondida: não existe) |

## 3. Q1 — Tabela de preço: correção isolada **antes** da `b69`, mesma lógica da D-A (rodada 10)

**Posição**: entra como `.cN` própria, não dentro da `b69` funcional. A causa (V1, envelope
`resultado`) é achado de código com cadeia de evidência direta (nome do `record` C#, ausência de
qualquer `JsonPropertyName`/`JsonStringEnumConverter` no backend inteiro) — mesmo padrão que já
decidiu a D-A para Estoque: forte o bastante para não esperar confirmação HTTP. A diferença para
Estoque é de **causa**, não de urgência: lá era campo com nome trocado; aqui é envelope errado —
mas o efeito operacional é pior: a tela de Tabelas de preço **nunca mostra nenhuma linha**, então
não há sequer como o operador entrar em "Itens" para ver preço algum. Enquanto V1 não for corrigido,
qualquer coisa que a `b69` construa assumindo "o vendedor pode consultar preço" (mesmo que
manualmente, fora do pedido) é construída sobre uma tela que não funciona.

**O que entra junto na mesma correção**, porque são a mesma classe de "campo lido errado numa tela
já em produção" e ficam invisíveis um atrás do outro: V2 (status/`isTabelaAtiva` lendo campo
inexistente), V3 (`margemPercentual` ausente em `PrecoProdutoVigenteResponse`, `.toFixed` sem
checagem) e V4 (anulabilidade de `precoMinimo`/`margemPercentual`). V3 e V4 são risco de
`TypeError` em runtime, não só dado errado — corrigir separadamente da correção do envelope
deixaria a tela abrir e quebrar na primeira linha com margem nula.

**O que eu abro mão**: não peço que essa correção espere confirmação por HTTP autenticado (pergunta
1 da seção "Pendências" do inventário) — aceito o risco de a leitura de código estar incompleta
(algum middleware de serialização não encontrado na busca) em troca de não segurar a rodada inteira
por falta de credencial. Se a correção sair errada, o QA da `.cN` isolada teria que provar de novo —
custo aceitável porque é uma correção pequena e isolada, não a `b69` inteira revertendo.

## 4. Q2 — Fila de pendentes: sem rota nova; atalho pré-filtrado e persistente sobre a listagem existente

O backend não pagina (`.Take(200)` fixo, sem `page`/`totalItems`, V7 do inventário) — criar uma
"fila" com contrato de paginação de servidor que não existe repetiria o antipadrão já identificado
em Estoque (`origemId`/Divergência 16 lá, aqui V7). Uma rota/aba dedicada sem paginação de servidor
não resolveria o problema real do operador (volume), só mudaria a URL.

**Minha posição**: mesma rota, mesmo componente, dois ajustes que fecham o passo B.1 sem pedir
contrato novo:
1. O card "Aguardando aprovação" (já existe, é só um número hoje) vira **clicável**, aplicando o
   filtro de status e navegando/scrollando para a lista já filtrada — destrava "achar a fila" sem
   digitar nada.
2. O filtro de status (e demais filtros) persiste via querystring (`?status=2`) em vez de `useState`
   puro — permite favoritar/compartilhar o link "pedidos aguardando aprovação" e sobrevive a voltar
   da tela de detalhe. Resolve "o filtro não é lembrado entre sessões" (seção 3 do inventário) sem
   exigir estado de servidor.

**O que eu abro mão**: sem paginação de servidor, sem contagem confiável acima de 200 pedidos por
filtro (V7) — se uma empresa tiver mais de 200 pedidos aguardando aprovação simultaneamente, os mais
antigos somem silenciosamente da lista, sem qualquer indicação. Aceitável **enquanto** ninguém medir
esse volume em produção (pergunta 4, seção 8); deixa de ser aceitável no primeiro relato real.

## 5. Q3 — Resumo da aprovação: repetir os dados do pedido dentro do diálogo, explicar `reservarEstoque`, refletir erro sem inventar campo

**O resumo precisa mostrar, dentro do próprio `AprovarPedidoVendaDialog`** (não só na tela atrás
dele): número do pedido, cliente, quantidade de itens ativos, `valorProdutos`/`valorDesconto`/
`valorTotal` — todos campos que o `PedidoVendaResponse` já entrega e a página já formata
(`TotaisPanel`, `clienteLabelMap`). Não é campo novo do backend, é repetir no modal o que a página
já sabe, para o passo B.3 fechar sem depender de o operador conseguir ver por trás do overlay.

**`reservarEstoque`**: mantenho o default `true` (já é o padrão no código, e reservar é o
comportamento mais seguro — não reservar deixa o pedido aprovado competindo por saldo sem
prioridade). O que falta é uma frase de apoio junto ao checkbox: "reserva o saldo dos itens com
controle de estoque nos locais informados; itens sem local informado e que controlam estoque
impedem a aprovação com reserva" — isso não é regra nova, é o que `VendaPedidoEstoqueOrchestrator`
já faz (seção 4 do inventário), só não está comunicado.

**Erros de domínio**: o backend devolve `BadRequest` genérico sem `field` (mesma limitação
estrutural de B-10 em Compras) — **não invento** mapeamento de erro para item específico no
frontend, porque não há como saber qual item causou a falha sem o backend dizer. O que a tela deve
fazer é exibir a mensagem crua do backend (já faz, via `ApiErrorPanel`/toast) e, se a mensagem
mencionar "estoque" ou "produto", sugerir genericamente "revise os itens do pedido antes de tentar
novamente" — texto de apoio, não regra nova.

**O que eu abro mão**: não peço que o frontend tente adivinhar qual item falhou destacando linha na
tabela de itens — isso exigiria parsear a string de erro (frágil, quebra a cada mudança de texto no
backend) ou pedir ao backend um contrato de erro por campo que não existe hoje. Vira pergunta.

## 6. Q4 — "Até a liberação": para em Aprovado; Faturamento não é reescrito, mas não sai da tela

O inventário é categórico: "liberação" não é termo do domínio de Vendas (zero resultados em
`Liberar`/`Liberação`), o estado mais próximo é `Aprovado`, e Faturamento já está implementado e em
produção na mesma tela. **Minha posição, do ponto de vista do fluxo**: como Faturar já vive dentro
do mesmo `PedidoVendaDetalhePage` (mesmo botão, mesmo diálogo, seção 1.C acima), não há como "parar
em Aprovado" fisicamente cortando a tela ao meio — o operador que aprovou continua vendo o botão
"Faturar" do lado, porque é a mesma página. O recorte que faz sentido não é "esconder Faturar", é:
**a `b69` não redesenha nada do fluxo de Faturar** (sem resumo novo, sem revisão de erro, sem
mudança de UX ali) — ele fica exatamente como está, só continua acessível porque é parte da mesma
tela de detalhe que a `b69` toca para os passos anteriores.

**O que eu abro mão**: não peço que a `b69` aplique o mesmo padrão de resumo/confirmação (seção 5)
ao diálogo de Faturar, mesmo ele tendo o mesmo defeito estrutural (nenhum resumo do pedido dentro do
`FaturarPedidoVendaDialog`, mesma limitação de erro sem campo). Isso é fluxo mais pobre para quem
fatura: mesma lacuna que aprovar tinha, sem correção nesta rodada. Aceitável **se** "até a
liberação" for confirmado como "não inclui Faturar" (pendência 2 do inventário — vira pergunta minha
também, seção 8); não aceitável se a resposta for "o recorte é o ciclo de vida inteiro", porque nesse
caso a mesma lacuna do resumo se repete lá e ninguém vai corrigir por já achar "coberto pela b69".

## 7. Q5 — Pedido × Tabela de preço: sem integração automática nesta versão; consulta manual dentro do diálogo do item, sem enforcement de preço mínimo

V10 é o achado estrutural mais importante da rodada, e concordo com o inventariante nisso: nenhuma
das duas pontas do backend integra hoje (`AdicionarItemPedidoVendaUseCase` não referencia
`TabelasPreco`; nenhuma regra de `precoMinimo` existe no fluxo de venda, confirmei por grep próprio:
zero ocorrências de `precoMinimo`/`PrecoMinimo` em `features/vendas`). Construir pré-preenchimento
automático de `valorUnitario` a partir de `preco-vigente`, com bloqueio de preço abaixo do mínimo,
seria **inventar regra de negócio no frontend** que o backend não valida — exatamente o tipo de erro
que a skill deste agente proíbe (regra crítica mora no backend).

**O que a tela pode fazer nesta versão, sem inventar regra**: `usePrecoVigente`
(`features/tabelas-preco/hooks/useTabelasPreco.ts:24`) já existe, já está testado em produção pela
tela de Tabelas de preço — dá para importar no `PedidoVendaItemDialog` e mostrar, ao lado do campo
`valorUnitario`, um texto informativo "preço vigente para este produto: R$ X" **sem preencher nada
automaticamente e sem bloquear nada abaixo dele** — é leitura, não regra. Isso fecha o passo A.5
parcialmente: o vendedor não precisa mais sair da tela e abrir outra aba para saber o preço de
referência, mas continua digitando por conta própria, e o backend continua sem verificar preço
mínimo.

**O que eu abro mão**: sem bloqueio de preço abaixo do mínimo, sem checagem da permissão
`VENDAS_PRECO_MINIMO_SOBRESCREVER` (que aliás está órfã, seção 8) — quem quiser vender abaixo do
custo consegue, porque o backend não impede e o frontend não deveria fingir que impede. Isso é
aceitável **hoje**, porque não há regra nenhuma para refletir; deixa de ser aceitável se/quando o
backend implementar a validação de preço mínimo — nesse momento vira campo obrigatório do escopo,
não opcional.

## 8. Q6 — Permissões órfãs: `accessRisk: NENHUM`, remover nesta fatia

`VENDAS_PRECO_MINIMO_SOBRESCREVER` e `POLITICA_COMERCIAL_GERENCIAR` não guardam nenhum endpoint —
o próprio backend documenta a remoção deliberada (D3, v1.21.3/G1, citado no inventário). Removê-las
do union/catálogo/guards do frontend **não tira capacidade real de ninguém**, porque não há
capacidade real associada a elas hoje — classifico como `accessRisk: NENHUM`, mesmo critério que a
rodada 10 usou para a correção de `ReservasEstoquePage` (D-F). A única ressalva operacional: se
algum grupo de acesso em produção já tiver uma dessas permissões marcada, a remoção do union pode
fazer a tela de edição de grupo mostrar um "código de permissão desconhecido" para esse grupo
específico — não é perda de capacidade, é um efeito colateral cosmético que vale avisar ao QA antes
de remover, não travar a remoção por causa disso.

**O que eu abro mão**: nada — esta é uma limpeza sem custo de fluxo. Só ressalvo que ela não deveria
disfarçar a resposta à pergunta 3 do inventário (se V10 entra ou não): remover as duas permissões
não é decidir "preço mínimo nunca vai existir", é só parar de fingir que existe hoje.

## 9. Q7 — `empresaId` (V5) e money on screen: corrigir o guard de disparo da primeira chamada; ampliar o gate de campos

**V5**: a primeira chamada de `GET /api/vendas/pedidos` sai sem `empresaId` até o `EmpresaFilialFilter`
resolver o contexto — diferente de Tabelas de Preço (onde o backend tem fallback), aqui o backend
recusa e o use case converte silenciosamente em lista vazia. Do ponto de vista do operador, isso é
**ilusão de "nenhum pedido"** por uma fração de segundo (ou indefinidamente, para o login "global"
`master@erp.local`, que nunca tem `EmpresaId` resolvido) — mesma categoria de defeito que o gate de
campos de resposta já existe para pegar do lado errado (aqui é request, não response, então o gate
`gate-contract-fields.mjs` não cobre isto). **Minha posição**: `usePedidosVenda` deveria receber
`enabled: Boolean(filters.empresaId)` (o mesmo padrão que outras telas do ERP já usam para evitar
disparo sem contexto), trocando "lista vazia falsa" por "carregando contexto" durante a janela em
que o filtro ainda não resolveu.

**Money on screen**: apoio estender `scripts/gate-contract-fields.mjs` (que já cobre
`MovimentoEstoque` desde a `b68`, D71) para `PedidoVendaResponse`/`ItemPedidoVendaResponse` (V5 do
inventário mostra 17/17 e 8/8 batendo hoje — o gate serve para não regredir, não para corrigir nada
agora) e, mais importante, para `TabelaPrecoItemResponse`/`PrecoVigenteResponse` **com asserção de
anulabilidade**, não só de nome — é isso que pegaria V3/V4 antes de um `.toFixed` quebrar em runtime.

**O que eu abro mão**: não peço `enabled` guard equivalente em todas as outras `usePedidos*`/
`useTabelas*` do sistema nesta rodada — só nas duas que o inventário mediu com evidência de código
(`vendas`, já quebrada; `tabelas-preco`, coberta pela correção V1). Auditoria completa de todo
`useQuery` do ERP por esse padrão é tarefa de plataforma, não desta fatia.

## 10. Q8 — Fatiamento: `.cN` (Tabela de preço + V2/V3/V4) antes de `b69` funcional; `b69` fecha em Aprovado

Concordo com a mesma lógica da D-A (rodada 10): misturar "campo/envelope lido errado numa tela em
produção" com "fila + resumo + explicação de fluxo" faz o QA da `b69` provar duas coisas ao mesmo
tempo, e se a correção do envelope estiver incompleta, a fatia inteira trava por um problema que não
é dela.

**Proposta de sequência**:
1. `.cN` (antes de `b69`): V1 (envelope `resultado`) + V2 (status) + V3/V4 (anulabilidade de preço
   mínimo/margem) — tudo na tela de Tabelas de preço, isolado, testável sozinho.
2. `b69`: fila com atalho persistente (Q2), resumo + explicação no diálogo de aprovação (Q3),
   consulta de preço vigente dentro do item do pedido sem enforcement (Q5, se aprovado — ver
   pendência), correção de `empresaId`/`enabled` (Q7), limpeza de permissões órfãs (Q6). Fecha em
   `Aprovado`; Faturamento não é tocado (Q4).
3. Fora da `b69`, sem data: enforcement de preço mínimo (V10 completo), reprovar (se B-5 responder
   que deveria existir), exposição de `HistoricoStatusPedidoVenda` (V8) e das quatro colunas
   ausentes de item (`reservaEstoqueId`, `quantidadeBaixadaEstoque`, `sequencia`, `valorBruto`) —
   nenhuma delas bloqueia o fluxo descrito na seção 1, todas são "sem uso" hoje, não "mostrando
   errado".

## 11. Impacto em módulo vizinho

- **Estoque**: aprovação com `reservarEstoque=true` cria reserva via `IEstoqueService` (sistema
  **básico**, mesmo que Compras usa — confirma B-15 para o lado de Vendas, mesma reconciliação
  pendente que a rodada 10 já registrou entre básico e avançado). A tela de Vendas não pode mostrar
  "saldo disponível" com precisão enquanto o avançado não atualizar o mesmo `EstoqueSaldo` — isso
  não é um item da `b69`, é a mesma pergunta B-15 já aberta.
- **Fiscal**: "Gerar NF" já existe no mesmo detalhe do pedido (`GerarNotaFiscalPedidoVendaDialog`),
  disponível a partir de `Aprovado`/`pedidoPodeFaturar`. A `b69` não mexe nisso; só registro que é
  outro botão na mesma tela que sobrevive ao corte em "até a liberação" pelo mesmo motivo do
  Faturar (seção 6).
- **Financeiro**: nenhum vínculo direto observado nesta leitura — o faturamento (fora do escopo da
  `b69`) é quem, presumivelmente, gera título. Não verificado nesta rodada (fora do recorte de
  arquivo lido).
- **Tabelas de preço**: acoplamento **pretendido, não implementado** — é o próprio V10. Enquanto a
  correção V1 não sobe, o acoplamento nem pode ser avaliado de verdade (a tela de origem do preço
  está vazia).

## 12. O que eu abro mão — resumo

- Sem paginação de servidor na fila de aprovação: acima de 200 pedidos por filtro, os mais antigos
  somem sem aviso (Q2). Aceito enquanto o volume real não for medido.
- Sem mapeamento de erro de aprovação por item: mensagem genérica do backend, sem destacar linha
  (Q3). Aceito porque inventar o mapeamento no frontend seria frágil e sem contrato.
- Sem resumo/explicação equivalente no diálogo de Faturar: a mesma lacuna do diálogo de aprovação
  continua lá, porque a `b69` não redesenha Faturamento (Q4). Aceito só se "até a liberação"
  confirmar que Faturar fica fora — vira pendência formal.
- Sem enforcement de preço mínimo nem pré-preenchimento automático de `valorUnitario`: só consulta
  informativa dentro do diálogo do item (Q5). Aceito porque o backend não tem a regra; inventá-la no
  frontend seria pior que não ter.
- Sem auditoria de `enabled`/contexto em todo `useQuery` do ERP: só nas duas rotas que o inventário
  mediu com evidência de código (Q7). Auditoria completa é tarefa de plataforma.

## 13. Onde discordo (antecipando os outros três)

> Discordo de quem propuser resolver Q1 (Tabela de preço) **dentro** da `b69` funcional em vez de
> correção isolada antes dela. A `b69` já depende de a tela de Tabelas de preço existir para
> qualquer coisa relacionada a preço (mesmo a consulta informativa da Q5); entregar as duas juntas
> faz o QA validar "a tela de preço passou a funcionar" e "a fila/aprovação melhorou" no mesmo teste
> de aceitação — se a correção do envelope falhar, a `b69` inteira trava por um problema que é de
> uma tela diferente. Aceitável só se `plataforma`/`escopo` já tiverem um jeito barato de isolar as
> duas provas no mesmo commit sem misturar critério de aceite.

> Discordo de qualquer proposta que use Q5 (V10) para justificar pré-preenchimento automático de
> `valorUnitario` a partir de `preco-vigente` nesta rodada. Sem regra de backend para preço mínimo,
> pré-preencher sem bloquear cria a aparência de que existe uma tabela de preço "oficial" guiando a
> venda, quando na prática o vendedor pode sobrescrever livremente sem nenhum aviso do sistema —
> pior do que a situação atual (100% manual, sem sugestão de "oficialidade" nenhuma). Aceitável só
> como consulta informativa lado a lado, nunca como valor pré-preenchido no campo.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "arquitetura",
  "assunto": "venda",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/11-operacao-venda.md",
  "decisoesPropostas": [
    {
      "id": "D-A-venda",
      "resumo": "V1 (envelope 'resultado' em GET /api/tabelas-preco) + V2 (status) + V3/V4 (anulabilidade preco mínimo/margem) viram correção .cN isolada, antes da b69 funcional — mesma lógica da D-A de Estoque na rodada 10."
    },
    {
      "id": "D-B-venda",
      "resumo": "Fila de pendentes de aprovação: sem rota nova, sem paginação de servidor (backend não suporta). Card 'Aguardando aprovação' vira clicável e o filtro de status passa a persistir via querystring."
    },
    {
      "id": "D-C-venda",
      "resumo": "Diálogo de aprovação passa a repetir número/cliente/itens/valores do pedido e explicar o efeito de 'Reservar estoque'. Erro de domínio sem campo: exibido cru, sem tentativa de mapear a item específico."
    },
    {
      "id": "D-D-venda",
      "resumo": "'Até a liberação' = para em Aprovado. Faturamento (já em produção, mesma tela) não é redesenhado nesta rodada, mas continua acessível por estar na mesma página."
    },
    {
      "id": "D-E-venda",
      "resumo": "V10 (Pedido × Tabela de Preço): sem pré-preenchimento nem enforcement de preço mínimo nesta versão. No máximo, consulta informativa de preço vigente dentro do diálogo de item, reaproveitando usePrecoVigente já existente."
    },
    {
      "id": "D-F-venda",
      "resumo": "VENDAS_PRECO_MINIMO_SOBRESCREVER e POLITICA_COMERCIAL_GERENCIAR: accessRisk NENHUM, remover do union/catálogo/guards nesta fatia."
    },
    {
      "id": "D-G-venda",
      "resumo": "usePedidosVenda ganha enabled: Boolean(filters.empresaId) para não disparar a primeira chamada sem contexto (V5). Gate de campos de resposta estendido a PedidoVendaResponse/ItemPedidoVendaResponse e TabelaPrecoItemResponse/PrecoVigenteResponse, com asserção de anulabilidade."
    }
  ],
  "discordancias": [
    "Quem resolver Q1 (Tabela de preço) dentro da b69 funcional, em vez de correção isolada antes dela, mistura a prova de 'a tela de preço passou a funcionar' com 'a fila/aprovação melhorou' no mesmo teste de aceitação.",
    "Quem propuser pré-preenchimento automático de valorUnitario a partir de preco-vigente nesta rodada está inventando regra de 'preço oficial' que o backend não valida — cria falsa sensação de governança de preço."
  ],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "'Até a liberação' confirma que Faturamento (já implementado) fica fora do redesenho desta rodada, inclusive sem receber o mesmo tratamento de resumo/confirmação que o diálogo de Aprovar recebe?", "decide": "se o diálogo de Faturar herda a mesma lacuna de resumo sem correção, ou se entra no escopo" },
    { "tipo": "backend", "pergunta": "Confirma B-5: 'reprovar' não existe por design (cancelar é a única saída)? A tela precisa dizer isso explicitamente ao operador no momento em que ele considera aprovar.", "decide": "se entra texto de apoio explicando a ausência, ou se B-5 abre um item de backend novo" },
    { "tipo": "funcional", "pergunta": "A consulta informativa de preço vigente dentro do diálogo de item do pedido (sem pré-preencher, sem bloquear) é aceitável como primeiro passo de V10, ou o produto prefere nenhuma integração até que preço mínimo tenha regra de backend?", "decide": "se Q5 entra na b69 como consulta informativa ou fica inteiramente fora" },
    { "tipo": "backend", "pergunta": "Algum grupo de acesso em produção já tem VENDAS_PRECO_MINIMO_SOBRESCREVER ou POLITICA_COMERCIAL_GERENCIAR atribuída? A remoção do union não tira capacidade real, mas pode mostrar 'permissão desconhecida' na tela de edição desse grupo.", "decide": "se a limpeza (Q6) precisa de aviso prévio ao QA/admin antes de subir" },
    { "tipo": "funcional", "pergunta": "Existe medição real de volume de pedidos aguardando aprovação por empresa (acima de 200)?", "decide": "se a ausência de paginação de servidor na fila (Q2) é risco teórico ou item urgente de backend" }
  ],
  "riscos": [
    "V1/V2/V3/V4 tratados como certos sem confirmação HTTP real (sem credencial disponível na sessão do inventariante); se a leitura de código estiver incompleta, a correção .cN proposta pode ser desnecessária ou incompleta.",
    "Sem paginação de servidor na fila de aprovação: acima de 200 pedidos por filtro, os mais antigos desaparecem sem aviso — aceito nesta rodada, não medido em produção.",
    "Sem mapeamento de erro de aprovação por item — operador só sabe que falhou, não qual item ou regra, porque o backend não devolve campo (mesma limitação de B-10 em Compras).",
    "Diálogo de Faturar mantém a mesma lacuna de resumo que o diálogo de Aprovar tinha antes desta rodada, porque Faturamento está fora do redesenho — risco assumido, não corrigido.",
    "Consulta de preço vigente dentro do item do pedido (Q5) depende de reaproveitar um hook de outra feature (tabelas-preco dentro de vendas) — acoplamento entre features que o arquiteto-design-system ou arquiteto-plataforma-frontend pode preferir resolver diferente (ex.: mover o hook para uma camada compartilhada); não decidi isso, é chamada de organização de código, não de fluxo."
  ]
}
```
