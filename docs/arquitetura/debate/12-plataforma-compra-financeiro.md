
# Posição — `arquiteto-plataforma-frontend`, rodada 12 (`compra-financeiro`)

Viés declarado: ano cinco. A pergunta não é se a `b70` funciona, é quanto custa mudar isto depois
que Faturamento (`b71`) já tiver escrito contra o que esta versão fixar — e depois que Compra e
Financeiro tiverem acumulado registros gravados sob a origem que esta rodada decidir aceitar ou
recusar.

## 0. O achado que muda a moldura da rodada: a mesma classe de defeito de volume da rodada 11 (`.Take(200)`), agora em cinco endpoints, mais um sexto num módulo diferente

O inventário não mede volume/paginação — não era o seu recorte. Fui medir, porque é o eixo 2 do meu
mandato, e o resultado é maior do que a rodada 11 sozinha sugeria.

```
../New project 3/src/Erp.Infrastructure/Compras/ComprasRepository.cs:40   .Take(200)  — ListarPedidosAsync
../New project 3/src/Erp.Infrastructure/Compras/ComprasRepository.cs:74   .Take(200)  — ListarSolicitacoesAsync
../New project 3/src/Erp.Infrastructure/Compras/ComprasRepository.cs:103  .Take(200)  — ListarCotacoesAsync
../New project 3/src/Erp.Infrastructure/Compras/ComprasRepository.cs:140  .Take(200)  — ListarRecebimentosAsync (sem page/pageSize; :128 tem `if (empresaId.HasValue)` — é o único dos quatro em que EmpresaId é opcional no repositório)
../New project 3/src/Erp.Infrastructure/Financeiro/FinanceiroRepository.cs:50   .Take(300) — ListarContasPagarAsync
../New project 3/src/Erp.Infrastructure/Financeiro/FinanceiroRepository.cs:78   .Take(300) — ListarContasReceberAsync
```

Contraste medido no mesmo grep: `FinanceiroAvancadoRepository.cs:63-64` usa `.Skip((page-1)*pageSize)`
+ `.Take(pageSize)` real — o módulo avançado **já pagina no servidor**; o básico, em Compras inteiro
e em Financeiro básico, não. É exatamente o padrão que a rodada 10 registrou para Estoque
(básico sem paginação, avançado com) e que a rodada 11 registrou para `GET /api/vendas/pedidos`
(`.Take(200)`, sem `page`/`pageSize`/`totalItems`) — aqui não é uma repetição pontual, é **seis
endpoints na mesma condição**, quatro deles no próprio recorte "compra e financeiro" desta rodada.

E o cliente reforça o problema: as quatro telas de Compras (`PedidosCompraPage.tsx:85`,
`CotacoesCompraPage.tsx:81`, `SolicitacoesCompraPage.tsx:81`) e as duas de Financeiro
(`ContasFinanceirasPage.tsx:123`) usam `DataTableServer` com `totalRecords={records.length}` e
`visibleRecords = records.slice(first, first+rows)` — **paginação visual sobre um array que o
servidor já cortou em 200/300**. O padrão é idêntico ao que fechei contra a operação na rodada 11
(seção 2 daquela posição): a paginação da tela é honesta sobre os 200/300 registros que chegaram, e
nenhuma delas sabe dizer "existem mais". Fato de contrato, não estimativa: **o teto existe e é
fixo nos seis lugares**; quantas empresas o alcançam hoje, não medido — isto é intuição, não medição.

## 0.1 Segundo achado, direto no eixo 3 (cache): a mesma classe do V5/D82 não foi corrigida aqui, e já é a segunda vez que aparece sem correção

A `D82` (rodada 11) corrigiu `usePedidosVenda` para só disparar com `empresaId` resolvido, porque
`GET /api/vendas/pedidos` exige `EmpresaId: Guid` não-anulável no repositório e a primeira chamada
saía sem ele, devolvendo `[]` em silêncio para usuário "global". Medido agora nos três hooks de lista
do recorte:

```
features/compras/hooks/useComprasResources.ts:17-21   usePedidosCompra — useQuery sem `enabled`
features/financeiro/hooks/useFinanceiroResources.ts:74-78  useContasReceber — sem `enabled`
features/financeiro/hooks/useFinanceiroResources.ts:80-84  useContasPagar — sem `enabled`
```

E do lado do servidor, `EmpresaId` é parâmetro obrigatório do repositório nos três casos
(`ComprasRepository.cs:29`, `FinanceiroRepository.cs:44,72` — `Where(x => x.EmpresaId == empresaId)`,
sem `.HasValue`). `ContasFinanceirasPage.tsx:39` inicializa `filters` como `{}` — a primeira
renderização dispara a query sem `empresaId`, e o `EmpresaFilialFilter` corrige via `useEffect`
depois, exatamente o mesmo timing que a `D82` já descreveu para Vendas. Isto **não é intuição**: é o
mesmo hook (`useQuery` sem `enabled`), o mesmo tipo de parâmetro obrigatório no repositório, e o
mesmo componente de correção (`EmpresaFilialFilter`) já usado nas outras telas — só que aqui ninguém
aplicou a correção que a `D82` já provou barata. Terceira ocorrência da classe (Estoque avançado,
Vendas, agora Compras+Financeiro básico) é o tipo de repetição que, na minha skill, é "achado deixado
em cima da mesa" se eu não registrar — registro e recomendo entrar na `b70`.

## 1. Pontos de não-retorno da camada

1. **CF-4 (reversão de recebimento) não é um ponto de não-retorno para a plataforma — é ausência de
   dado, não decisão de tela.** Não existe endpoint, não existe caminho de domínio; nenhuma decisão
   de frontend cria ou destrói essa possibilidade. O ponto de não-retorno real é **outro**: se a `b70`
   construir uma tela que *implica* reversibilidade que não existe (ex.: um botão "corrigir
   recebimento" que só reabre o formulário de edição do pedido, sem checar que
   `StatusPedido is ParcialmenteRecebido or Recebido` bloqueia qualquer edição de item depois do
   recebimento — não verifiquei se `AtualizarItemPedidoCompraUseCase` bloqueia isso; **não
   verificado nesta sessão**, fica como risco), o custo de reverter essa UI depois é alto: usuário já
   aprendeu um fluxo que promete o que o backend não cumpre, e corrigir é reeducação, não só código.
   Recomendo tela honesta: mostrar "sem caminho de correção — gere um recebimento complementar ou
   registre divergência" (a divergência já existe no recorte, `RecebimentoDivergenciaResponse`), e
   não inventar um verbo de reversão que o backend não tem. Reversível: sim, é texto de UI.

2. **CF-1 (origem sem vínculo em Contas a Receber) é barato de corrigir agora e caro de corrigir
   depois de outras telas passarem a confiar em `origemId`.** Hoje nada mais lê `origemId` de Contas
   a Receber (medido: `ContasAvancadoTab.tsx` e o básico não filtram por origem, seção 1 do
   inventário). Mas a `b70` propõe justamente tornar a origem **visível e navegável** (Q2) — no
   instante em que uma coluna "Origem" vira link para o documento de origem, e existem títulos com
   `Origem = Contrato`/`NotaFiscal`/`AjusteAutorizado` e `origemId = null` (o próprio inventário prova
   que isso é possível hoje, `unsupportedOriginReference`), o link quebra silenciosamente para
   qualquer título lançado manualmente com essa combinação. Corrigir agora é restringir o dropdown
   (Q3); corrigir depois é decidir o que fazer com títulos já gravados nesse estado — migração de
   dado, não código. Isto é o ponto de não-retorno real do eixo Q2/Q3: **não é a validação em si,
   é o momento em que a coluna Origem passa a ser navegável sobre um campo que pode ser falso.**

3. **O gate de campos de response (D83) não cobre nenhum record deste recorte — `BACKEND_TYPE_MAP`
   e o snapshot (`scripts/backend-response-records.snapshot.json`) só têm `estoque`, `tabelas-preco`
   e `vendas` (medido: `node -e "console.log(Object.keys(require('./scripts/backend-response-records.snapshot.json').records))"`
   por módulo não aplicável direto, confirmado por grep vazio de `ContaPagarResponse`/
   `PedidoCompraResponse` no snapshot).** Isto não é um ponto de não-retorno em si — é a ausência da
   proteção que teria transformado CF-2 (enum incompleto), CF-6 (anulabilidade de
   `localEstoqueId`) e CF-7 (5 campos de item ausentes) em gate vermelho em vez de achado de
   inventário. Cada versão que passa sem esse gate é uma versão em que um campo aditivo do backend
   pode silenciosamente não aparecer na tela — exatamente a classe de defeito que a v1.11.0a8b49 já
   pagou caro (citada no meu próprio manual).

## 2. Onde a proposta da operação quebra sob volume, cache ou contrato

> **Discordo de `arquiteto-operacao-erp`, antecipando o ponto mais provável** (não vi o texto dele;
> se a posição real for outra, este ponto cai). Se a proposta para "origem visível" incluir um
> **filtro de listagem por origem** (ex.: dropdown "Origem = Compra" na tela de Contas a Pagar, ou um
> link "ver pedido de origem" a partir da lista), sob `.Take(300)` (Financeiro básico) e
> `.Take(200)` (Compras), qualquer filtro teria que ser aplicado **depois** do corte do servidor —
> os mesmos 300/200 registros mais recentes, filtrados no cliente, escondendo títulos mais antigos
> que existem mas nunca chegaram. Alternativa: se o filtro por origem entrar nesta rodada, ele
> precisa ser parâmetro de query enviado ao backend (`FinanceiroListQuery` já tem espaço para
> `status`, adicionar `origem` é o mesmo padrão), nunca `.filter()` client-side sobre o array
> truncado — senão o filtro "funciona" só até a 301ª conta.
> Reversível: sim — é a diferença entre um parâmetro de query e uma função `.filter()`, mesmo
> tamanho de código, escolha de onde a filtragem roda. Cai se a operação trouxer medição real de
> volume por empresa abaixo do teto.

> **Discordo de `arquiteto-operacao-erp`, segundo ponto antecipado**: se a resposta a Q4/Q5 for
> "mostrar progresso de recebimento parcial por item" usando `quantidade` menos alguma inferência
> local (já que `quantidadeRecebida`/`quantidadePendente`/`status` não chegam do backend, CF-7),
> qualquer heurística de UI (ex.: comparar `quantidade` do pedido com a soma de itens recebidos
> vindos de outro endpoint) cria um cálculo derivado no frontend que o backend já faz e não expõe —
> a mesma classe de risco que `D74` já rejeitou para ajuste de estoque ("nenhum dropdown, a `b68`
> deixa de depender da B-3": não inventar no frontend o que é decisão/cálculo do backend).
> Alternativa: pedir os três campos ao backend (pendência já registrada no inventário) e, até
> chegarem, não simular progresso — mostrar só `statusPedido` (`ParcialmenteRecebido`/`Recebido`),
> que já existe e é fonte real.
> Reversível: sim — é a diferença entre "esperar o campo" e "inventar o cálculo"; o primeiro é
> aditivo quando o campo chegar, o segundo vira heurística que alguém tem que desligar depois.

## 3. Onde o corte de escopo vira dívida cara, e onde não

**Vira dívida cara:**

- **Deixar `usePedidosCompra`/`useContasReceber`/`useContasPagar` sem `enabled: Boolean(empresaId)`
  nesta rodada.** É a terceira ocorrência medida da mesma classe (seção 0.1), a correção é idêntica
  à da `D82` (uma linha por hook), e a `b70` já vai abrir os três arquivos para tratar Q2/Q3/Q7.
  Corrigir agora custa a mesma sessão; corrigir depois de um quarto módulo copiar o padrão sem
  `enabled` (o próximo candidato natural seria Faturamento, `b71`, que já herda `ContasFinanceirasPage`
  como padrão) multiplica o achado por mais um lugar.
- **Publicar `origem`/`origemId` como link navegável (Q2) sem corrigir CF-1 no mesmo diff, em Contas
  a Receber.** Detalhado na seção 1, ponto 2 — não é a validação isolada que é cara, é a combinação
  "link clicável" + "campo pode ser falso" no mesmo lançamento.
- **Adiar a extensão do gate de campos (D83) para depois que a UI já consumir os campos novos.**
  Diferente da rodada 11 (onde o bloqueio era um documento externo errado, fora da minha fronteira),
  aqui o bloqueio é só que **ninguém pediu a extensão ainda** — o gerador
  (`scripts/generate-backend-response-records-snapshot.mjs`) já sabe como extrair um record C#, só
  falta a entrada em `TYPES_TO_EXTRACT` para `PedidoCompraResponse`, `ItemPedidoCompraResponse`,
  `ContaPagarResponse`, `ContaReceberResponse` (e, se Q2 cobrir o avançado, `ContaFinanceiraResponse`).
  Não é escopo maior como o gate de anulabilidade que registrei na rodada 11 (4.2) — é o mesmo
  tamanho de trabalho que a `D83` já fez para Vendas. Adiar significa que qualquer campo que a `b70`
  passar a **exibir** (origem, status, valores) fica sem a mesma rede de segurança que Vendas e
  Tabelas de Preço já têm.

**Não vira dívida cara — pode cortar sem medo:**

- **CF-4 ficar sem solução de UI nesta rodada, além do texto honesto (seção 1).** Não existe
  contrato para consumir; não há nada para o frontend construir errado. Quando o backend responder
  a pendência 1 do inventário, a tela ganha um botão novo — local a um componente, sem migração.
- **CF-7 (campos de item ausentes) ficar fora da exibição em tela.** Concordo com a leitura do
  próprio inventário: são campos aditivos, trazer depois é estender tipo + coluna. A única exceção
  (registrada na seção 2) é não inventar o cálculo equivalente no frontend enquanto eles não chegam.
- **CF-5/CF-6 (CotacaoCompraId, ItensLocalEstoque) ficarem fora do contrato de leitura/escrita desta
  rodada.** São perguntas ao backend (pendência 4 do inventário) — o dado existe no domínio, só não
  sai no DTO; quando sair, é campo novo a mapear, sem custo de reverter nada que exista hoje.
- **Fluxo de caixa básico morto (CF-8) ficar sem remoção nesta rodada.** Peso morto, não bug — tipo,
  schema e página redirecionando; não bloqueia nada do recorte "origem e reversão". Remover é
  faxina, não urgência de plataforma.

## 4. Os gates que a camada precisa

### 4.1 Estender `gate-contract-fields.mjs` (D83) para Compras e Financeiro

**Classe de defeito que fecha**: tipo do frontend declara campo sob nome/anulabilidade que o backend
não entrega, ou omite campo que o backend entrega sob nome diferente — a mesma classe de P1 (money
on screen) e CF-6 (anulabilidade de `localEstoqueId`).

**O que deixa vermelho**: hoje, nada — porque nem `BACKEND_TYPE_MAP`
(`scripts/gate-contract-fields.mjs:30-56`) nem `TYPES_TO_EXTRACT`
(`scripts/generate-backend-response-records-snapshot.mjs:24-31`) têm entrada para `compras` ou
`financeiro`; o snapshot (`scripts/backend-response-records.snapshot.json`) só cobre `estoque`,
`tabelas-preco`, `vendas` (medido por grep vazio de `PedidoCompraResponse`/`ContaPagarResponse` no
arquivo). Diferente da rodada 11 (bloqueio por documento externo errado), aqui o bloqueio é só que
falta a entrada — mesmo trabalho que a `D83` já fez, quatro linhas de mapa e uma regeneração de
snapshot contra `../New project 3/src` por quem tem o backend na máquina.

**Ordem de trabalho**: (1) adicionar `PedidoCompraResponse`, `ItemPedidoCompraResponse`,
`ContaPagarResponse`, `ContaReceberResponse` a `TYPES_TO_EXTRACT`; (2) rodar o gerador e commitar o
snapshot atualizado (artefato gerado, não editar à mão — regra do próprio D83); (3) espelhar as
mesmas quatro entradas em `BACKEND_TYPE_MAP`. Se Q2 estender origem visível ao avançado, adicionar
`ContaFinanceiraResponse` no mesmo lote.

**Custo aproximado**: igual ao que a `D83`/rodada 11 já pagou para Vendas — poucas linhas em dois
arquivos de configuração mais uma regeneração automatizada, não é gold-plating pedir isso na
terceira vez que o padrão se repete.

### 4.2 Filtro de origem, se entrar nesta rodada, precisa ser parâmetro de servidor, não `.filter()` client-side

**Classe de defeito que fecha**: filtro que parece funcionar em ambiente de teste (poucos registros)
e silenciosamente ignora dado fora da janela de 200/300 em produção — mesma classe que a seção 2
detalha. Não proponho gate automatizado para isto (é decisão de implementação, não campo de
contrato) — registro como regra de revisão para o `qa-revisor`: qualquer `.filter()` novo sobre
`records` de Compras/Financeiro básico que dependa de campo de origem é sinal de alerta.

### 4.3 Não proponho gate novo para volume/paginação (seção 0)

Mesma decisão que tomei na rodada 11 para `GET /api/vendas/pedidos`: é limite de contrato
(`.Take(200)`/`.Take(300)`), não algo que um gate de frontend possa fechar sem o backend abrir
paginação. Registro como pergunta ao backend (B-19, abaixo), não como gate.

## 5. O que eu abro mão

- **Não vou bloquear a `b70` por causa dos seis `.Take(200)/.Take(300)` (seção 0).** É o mesmo
  raciocínio que já apliquei na rodada 11: fato de contrato, não fato de volume medido em produção.
  A mitigação que aceito é o mesmo aviso de teto que a `D78` já usou para a fila de pendentes de
  Vendas, se alguma tela desta rodada mostrar contagem em destaque. Sinal para trocar: medição real
  de contagem de pedidos/títulos por empresa acima de 200/300 num ambiente com histórico.
- **Não vou insistir para que CF-4 vire pedido de endpoint nesta rodada.** É pergunta de produto/
  backend (pendência 1 do inventário), não decisão de plataforma — meu papel aqui é só garantir que
  a tela não prometa o que o backend não tem (seção 1). Sinal para trocar: se o backend responder que
  reversão de recebimento é lacuna a fechar, viro a favor de reservar o contrato (queryKey, mutação)
  desde já — mas não antes da resposta.
- **Não vou propor gate de anulabilidade genérico nesta rodada** (o mesmo que registrei e não
  bloqueei na rodada 11, seção 4.2 daquela posição) mesmo com CF-6 sendo o segundo caso real da
  mesma classe (depois de `TabelaPrecoItemResponse.PrecoMinimo`). Continua sendo escopo de análise
  estática maior que uma entrada de mapa. Terceira ocorrência da classe — registro, não bloqueio.
- **Não vou insistir em restringir Contas a Receber a `Origem = Manual` como bloqueio inegociável.**
  É a posição que recomendo (seção 1, ponto 2), mas é pergunta de produto (pendência 3 do
  inventário) tanto quanto de plataforma — se o produto confirmar que "origem disfarçada" é
  capacidade desejada (ex. migração de saldo antigo, hipótese que o próprio inventário levanta), eu
  cedo, desde que a tela deixe de tornar essa origem **navegável** (o link/filtro fica condicionado
  a `origemId != null`, não à presença do enum).
- **Se a operação ou o escopo trouxerem medição real que contradiga qualquer ponto acima, minha
  objeção cai** — nenhum destes pontos é intuição não rotulada; onde só tenho intuição, rotulei.

## Q1–Q9, posição direta

- **Q1 (CF-4, reversão de compra)**: tela honesta, não simulação de reversão. A `b70` mostra
  `statusPedido` real e, quando não há caminho de correção, um texto explícito ("sem reversão —
  registre um recebimento complementar ou uma divergência"), em vez de expor um verbo que o backend
  não tem. O único ponto de reversão real do fluxo — `EstornarPagamento` da `ContaPagar` gerada — já
  tem endpoint e schema (seção 6 do inventário); a `b70` entrega **isso**, rotulado como o que é
  (reversão financeira, não reversão de estoque/recebimento). Pergunta ao backend: a pendência 1 do
  inventário, inalterada por mim.
- **Q2 (origem visível)**: entra nos dois módulos (básico e avançado), mas o avançado só depois de
  CF-3 ganhar uma coluna/exibição no componente (`ContasAvancadoTab.tsx`) — é trabalho de tela, não
  de contrato, porque o campo já chega (`OrigemModulo`/`OrigemId` já estão no tipo). No básico,
  fechar CF-2 (enum incompleto) é pré-requisito barato: sem os 8 valores, qualquer link/rótulo de
  origem cai em "-" para `OrdemServico`/`Frota` mesmo que o backend já os use — pergunta ao backend
  (a mesma pendência 2 do inventário) decide a urgência real, mas o enum completo custa uma edição
  de arquivo e não tem por que esperar a resposta.
- **Q3 (CF-1, restringir Contas a Receber)**: restringir na tela agora, espelhando Contas a Pagar
  (dropdown → só `Manual`, disabled). Custo: uma edição de componente, reversível a qualquer momento
  se o backend fechar a validação D7-equivalente depois (aí a restrição do frontend vira redundante,
  não incorreta). Esperar o backend custa mais: cada título gravado com origem falsa nesse meio-tempo
  é dado a corrigir por migração, não por código, no dia em que a validação fechar. Ver seção 1,
  ponto 2, e "o que eu abro mão".
- **Q4 (CF-5/CF-6, caminhos de compra)**: ficam fora do contrato desta rodada — são perguntas ao
  backend (pendência 4 do inventário). Não simular nem inferir no frontend; ver seção 2, segunda
  discordância. Explicar "a compra pela origem" com o que existe hoje significa mostrar
  `statusPedido` e, quando a cotação existir, o link *já disponível* solicitação→cotação
  (`solicitacaoCompraId`, que a tela já recebe) — não pedido→cotação, que não chega.
- **Q5 (CF-7)**: os campos entram no gate (4.1) mesmo que não entrem na UI ainda — proteger o
  contrato não depende de decidir a tela. A exibição de progresso parcial fica condicionada a receber
  `quantidadeRecebida`/`quantidadePendente`/`status`, que é pergunta ao backend, não decisão de
  plataforma se entra ou não na `b70`.
- **Q6 (título de venda)**: não é decisão de plataforma qual módulo — é sobre onde a tela já existe.
  O inventário confirma que o endpoint (`POST .../contas-receber/pedido-venda/{id}`) e o diálogo
  (`GerarContaReceberPedidoDialog`, `ContasFinanceirasPage.tsx:117`) já existem e já foram entregues
  na `b69` (D79 não menciona isso, mas o próprio inventário cita a tela como existente). Se já existe,
  não há nada para a `b70` construir aqui — é `b71` só se a pergunta for sobre o gatilho automático
  (`GerarContaPagarAsync` no recebimento de compra tem equivalente automático em Vendas? não, é
  manual por decisão de domínio, seção 2 do inventário) — decisão de produto, não de plataforma.
- **Q7 (CF-9, permissões órfãs)**: medido agora (`grep -rn "FINANCEIRO_CAIXA_GERENCIAR\|
  FINANCEIRO_BANCO_GERENCIAR"` fora de `types/erp.ts` e `permissoesCatalogo.ts` → zero), mesmo
  resultado que a `D81` mediu para Vendas: `accessRisk: NENHUM`, nenhum guard, regra de rota ou item
  de menu as referencia. Trato igual — removo do union/catálogo nesta fatia, mesmo padrão de
  `coberturaPendente` no allowlist de permissões que a `D81` já usou (snapshot documental não editado,
  porque vem do contrato v1.23/catálogo §12 não atualizado). Diferença de enunciado da pergunta ("isso
  difere da D81?") não se confirma pela medição: é o mesmo caso, só num módulo diferente.
- **Q8 (gate e dívida documental)**: sim, estender o gate de campos (4.1) — é o trabalho de maior
  retorno da rodada do ponto de vista de plataforma, porque fecha de vez P1-class e CF-6/CF-7 como
  proteção estrutural, não como achado avulso. Sobre CF-10 (allowlist descrevendo problema já
  corrigido): não é minha fronteira editar `scripts/backend-contract-map.allowlist.json`, mas
  registro que ele viola a própria regra do `risk.yaml` (`gateRisk.registro_de_excecao`: "entrada que
  não corresponde mais a divergência observada REPROVA" — aqui o status é `audit-only-no-suppressions`,
  então não reprova nada tecnicamente, mas o princípio é o mesmo). Recomendo que quem mantém o
  arquivo remova as seis linhas `FINANCEIRO_*_LEGADO` (`legacyReferences:28-33`) no mesmo lote em que
  tocar Financeiro nesta rodada — barato, é edição de JSON, não é gate a construir.
- **Q9 (fatiamento)**: uma `b70` só. Nenhum dos achados desta seção (volume, `enabled`, gate) exige
  contrato que ainda não existe — são todos correções sobre o que já está no recorte. O único
  candidato a fatia própria seria se o backend responder as pendências 1/2/4 do inventário com
  "endpoint novo" (reversão de recebimento, ou expor `CotacaoCompraId`/`ItensLocalEstoque`) — aí a
  operação nova teria contrato próprio a esperar e não bloquearia o resto, mesmo raciocínio que já
  apliquei na rodada 11 para B-5.

## Perguntas ao backend (separadas do que já foi lido)

- **B-19 (nova, desta rodada)**: `GET /api/compras/pedidos`, `.../solicitacoes`, `.../cotacoes`,
  `.../recebimentos` (`.Take(200)`) e `GET /api/financeiro/contas-pagar`, `.../contas-receber`
  (`.Take(300)`) vão paginar no servidor (`page`/`pageSize`/`totalItems`), como o Financeiro avançado
  já faz? Sem isso, qualquer contagem ou filtro que a `b70` exiba sobre essas listas herda o mesmo
  teto silencioso que a `D78`/rodada 11 já registrou para Vendas.
- As pendências 1-4 do inventário (reversão de recebimento, `OrdemServico`/`Frota` em uso,
  validação de origem em Contas a Receber, `CotacaoCompraId`/`ItensLocalEstoque` no DTO) seguem como
  estão — não é meu papel reabri-las, só confirmo que decidem exatamente os pontos que registrei
  como "não vira dívida cara por ficar fora" (seção 3) e "abro mão" (seção 5).

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "arquitetura",
  "assunto": "compra-financeiro",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/12-plataforma-compra-financeiro.md",
  "decisoesPropostas": [
    {
      "id": "Q1",
      "titulo": "Tela honesta sobre CF-4: mostra statusPedido real, sem verbo de reversão inexistente; a única reversão entregue é o estorno de pagamento da ContaPagar, rotulada como financeira",
      "reversivel": true,
      "custo": "barato — texto de UI, sem contrato novo a consumir"
    },
    {
      "id": "Q3",
      "titulo": "Contas a Receber restringe o dropdown de Origem a Manual, espelhando Contas a Pagar (CF-1), até o backend fechar a validação equivalente à D7",
      "reversivel": true,
      "custo": "barato — edição de componente; reversão é remover a restrição quando o backend validar"
    },
    {
      "id": "Q7",
      "titulo": "Remover FINANCEIRO_CAIXA_GERENCIAR e FINANCEIRO_BANCO_GERENCIAR do union/catálogo — mesmo accessRisk NENHUM medido para D81",
      "reversivel": true,
      "custo": "barato — nenhuma capacidade real fechada, mesmo padrão de coberturaPendente no allowlist de permissões"
    },
    {
      "id": "Q9 / achado 0.1",
      "titulo": "usePedidosCompra, useContasReceber, useContasPagar ganham enabled: Boolean(empresaId) — terceira ocorrência da classe D82/V5, ainda sem correção",
      "reversivel": true,
      "custo": "barato — enabled condicional, mesmo padrão já aplicado em Vendas"
    },
    {
      "id": "Q8",
      "titulo": "Estender BACKEND_TYPE_MAP/TYPES_TO_EXTRACT (D83) para PedidoCompraResponse, ItemPedidoCompraResponse, ContaPagarResponse, ContaReceberResponse",
      "reversivel": true,
      "custo": "igual ao que a D83 já pagou para Vendas — poucas linhas de configuração + regeneração automatizada do snapshot"
    }
  ],
  "discordancias": [
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "filtro de listagem por origem sobre Contas a Pagar/Receber ou Compras aplicado client-side, escondendo registros fora da janela de 200/300 que o .Take fixo já cortou",
      "antecipada": true,
      "alternativa": "filtro de origem como parâmetro de query enviado ao backend, não .filter() sobre o array truncado",
      "reversivelSeErrado": true
    },
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "simular progresso de recebimento parcial no frontend combinando quantidade do pedido com outro endpoint, na ausência de quantidadeRecebida/quantidadePendente/status (CF-7)",
      "antecipada": true,
      "alternativa": "mostrar só statusPedido real até o backend expor os três campos; não inventar cálculo que é decisão do backend (mesmo padrão da D74)",
      "reversivelSeErrado": true
    }
  ],
  "pendencias": [
    "B-19 (nova): paginação de servidor para os seis endpoints de Compras/Financeiro básico com .Take(200)/.Take(300) fixo — sem isso, qualquer contagem/filtro exibido nesta rodada herda o mesmo teto silencioso já registrado para Vendas (D78)",
    "Não verificado se AtualizarItemPedidoCompraUseCase bloqueia edição de item depois de ParcialmenteRecebido/Recebido — relevante para não construir uma tela de 'correção' de recebimento que na prática está bloqueada pelo domínio",
    "As pendências 1-4 do inventário (CF-4, CF-2, CF-1, CF-5/CF-6) permanecem em aberto; esta posição só decide o que fazer enquanto elas não são respondidas"
  ],
  "riscos": [
    "Volume real (contagem de pedidos/títulos por empresa acima de 200/300) não medido em ambiente de produção — toda a seção 0 é sobre o teto de contrato (fato), não sobre frequência de estouro (intuição, rotulada)",
    "CF-2 (OrdemServico/Frota) segue sem confirmação de uso real em produção — mesmo risco que o inventário já registrou, não ampliado por mim",
    "Se a extensão do gate (4.1) revelar mais divergências de nome/anulabilidade além das já catalogadas pelo inventário (CF-2/CF-6/CF-7), o escopo de correção da b70 cresce — não medido até o gate rodar"
  ]
}
```
