# Posição — `arquiteto-operacao-erp` — rodada 10, Estoque (`b68`)

Fonte: `docs/arquitetura/debate/10-inventario-estoque.md` (inventariante), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`
(`b68`, B-3), `docs/arquitetura/DECISOES.md` (D56, D62, D67, D68). Leitura direta confirmada nesta
rodada: `features/estoque/components/MovimentoEstoqueFormDialog.tsx`,
`features/estoque/components/TransferenciaEstoquePage.tsx`,
`features/estoque/components/MovimentosEstoquePage.tsx`,
`features/estoque/components/ReservaEstoqueDialogs.tsx`, `features/estoque-avancado/components/BloqueiosEstoqueTab.tsx`.

## 1. O fluxo do operador, ponta a ponta

Quem movimenta estoque no dia a dia faz um de quatro trabalhos. Escrevo os quatro porque a `b68`
mexe nos quatro ao mesmo tempo (mesmo sistema básico, mesmas rotas), e um fluxo fechado nos três
primeiros com o quarto quebrado ainda é operação incompleta.

**A. Entrada manual (recebimento fora do fluxo de Compras, ou ajuste de saldo inicial)**
1. Abre `/estoque/entradas` (módulo Estoque).
2. Escolhe Empresa/Filial (contexto).
3. Busca Produto por nome/código (`EntitySelect`, catálogo carregado por empresa) — **fecha**.
4. Busca Local de estoque por nome (`EntitySelect`) — **fecha**.
5. Digita a quantidade — **fecha**.
6. Preenche "Origem" (`InputText` livre, hoje default `'ESTOQUE'`) e "Documento" (`InputText`
   livre) — **fecha tecnicamente** (a chamada vai), mas sem apoio: o operador não sabe se deve
   digitar `"COMPRAS"`, `"Compras.PedidoCompra"` ou o número da nota, porque não existe rótulo,
   ajuda nem catálogo (seção 3 do inventário).
7. Digita o Motivo (obrigatório) — **fecha**.
8. Confirma. Toast de sucesso ou erro. **Fecha** (o `PermissionGuard`/`hasPermission` cobre
   `ESTOQUE_MOVIMENTAR`).
9. Quer conferir se a entrada realmente subiu o saldo: sai da tela de Entrada, abre
   `/estoque/saldos` **em outra aba/rota** — hoje são páginas separadas, sem link cruzado.

**B. Saída manual** — idêntico ao A, trocando o sinal; mesmas lacunas de Origem/Documento.

**C. Transferência entre locais/filiais**
1. Abre `/estoque/transferencias`.
2. Empresa, Filial origem, Filial destino, Local origem, Local destino, Produto, Quantidade,
   Motivo — todos com seletor guiado (`EntitySelect`/`FilialSelect`), **fecha**.
3. Confirma. O backend gera duas pernas (saída na origem, entrada no destino) numa transação —
   **fecha do lado do domínio**.
4. Quer registrar a que evento essa transferência se refere (ex.: "requisição de produção nº 42",
   ou vincular às duas pernas por um mesmo identificador de correlação para futura auditoria) —
   **quebra**: não há campo `origemId`/`documento` na tela (Divergência 1 do inventário), embora
   o backend aceite os dois.
5. Quer saber se a transferência aconteceu — vai para `/estoque/movimentos`, filtra por produto e
   data, e tenta identificar as duas linhas geradas — **quebra em dois pontos**: (i) a coluna
   "Tipo" está vazia porque a tela lê `row.tipoMovimento` e o backend serializa `tipo`
   (Divergência 2, `MovimentosEstoquePage.tsx:53`); mesmo corrigido o nome, os valores 8/9
   (`TransferenciaSaida`/`TransferenciaEntrada`) não têm rótulo no frontend (Divergência 4); (ii)
   a coluna "Data" também está vazia pelo mesmo motivo de nome de campo (Divergência 3,
   `:58`).

**D. Ajuste de inventário/contagem**
1. Abre `/estoque/ajustes` (básico) OU a aba Ajustes de `/estoque/avancado` — **primeira quebra
   de rotina**: são dois formulários, dois conceitos de "origem" e dois efeitos, sob o mesmo
   rótulo de menu "Estoque". Um operador que aprendeu o fluxo básico não sabe que existe um
   segundo caminho, com regras diferentes (o avançado recusa contagem que não muda o
   `StatusInventarioEstoque` de um inventário aberto; o básico ajusta o saldo direto).
2. No básico: Empresa/Filial, Produto, Local, Quantidade contada, Origem (texto livre), Documento,
   Motivo. O backend calcula a diferença e recusa se for zero — **a tela não avisa antes de
   submeter**, o operador só descobre no toast de erro depois de preencher tudo.
3. Confirma. **Fecha** no caminho feliz.
4. Errou a contagem e quer corrigir — não existe "desfazer ajuste": um novo ajuste, com a
   quantidade certa, é o único caminho (seção 4 do inventário: sem estorno genérico de
   movimento manual). Isso é regra de domínio, não defeito de tela — mas a tela **não diz isso
   ao operador**, que pode tentar procurar um botão "estornar" que não existe em lugar nenhum.

**E. Consulta de Histórico** (hoje `/estoque/movimentos`, isolada das três acima)
1. Filtra por Empresa (obrigatório), Filial/Produto/Local/período (opcionais).
2. Lê Tipo, Quantidade, Origem, Documento, Data — **dois desses cinco campos vêm vazios hoje**
   (Divergência 2/3), o que **derruba o objetivo da tela**: "histórico" que não mostra tipo nem
   data não serve para auditoria nem para conferência de uma entrada específica.
3. O resumo no topo (contadores de entradas/saídas/reservas) também some, porque depende do mesmo
   campo `tipoMovimento` inexistente (`estoqueUxUtils.ts:89-95`, citado no inventário).

**F. Liberar/cancelar um bloqueio de estoque** (ex.: Qualidade bloqueou um lote/local e alguém
precisa liberar depois da inspeção)
1. Abre `/estoque/avancado`, aba Bloqueios.
2. Cria um bloqueio novo: formulário guiado, **fecha**.
3. Quer liberar um bloqueio existente: a tela pede que ele **digite o GUID do bloqueio à mão**
   (`BloqueiosEstoqueTab.tsx:82`, `label="ID do bloqueio *"`) — e não existe, em lugar nenhum do
   backend, um `GET` para listar bloqueios ativos e escolher um (Divergência 13). **Quebra
   completo**: o operador não tem de onde copiar esse GUID dentro do próprio ERP. Na prática, ou
   ele guarda o GUID de quando criou (raro, ninguém copia GUID manualmente no dia a dia), ou pede
   para alguém rodar uma consulta no banco — o que definitivamente não é "fechar o trabalho na
   tela".

## 2. Onde o fluxo quebra hoje — resumo com origem

| Passo | Módulo/tela | Quebra | Evidência |
| --- | --- | --- | --- |
| C.4 | Transferência | sem `origemId`/`documento` | `TransferenciaEstoquePage.tsx` (form sem os dois campos); `estoqueSchemas.ts:52-62`; Divergência 1 |
| C.5 / E.2 | Histórico | Tipo e Data sempre vazios | `MovimentosEstoquePage.tsx:53,58` lê `tipoMovimento`/`criadoEm`; backend serializa `tipo`/`dataMovimento` — Divergência 2/3, **não verificado contra HTTP real** |
| C.5 | Histórico | Transferência sem rótulo mesmo corrigido o nome | `TipoMovimentoEstoque` (frontend) sem 8/9/10 — Divergência 4 |
| D.1 | Ajuste (básico vs. avançado) | dois formulários, duas semânticas de origem, mesmo menu | seção 0 e 3 do inventário |
| D.2 | Ajuste | sem aviso prévio de "diferença zero recusada" | `AjustarSaldoEstoqueUseCase.cs:54-58`, sem espelho na tela |
| F.3 | Bloqueios | GUID digitado, sem catálogo de onde vir | `BloqueiosEstoqueTab.tsx:82`; sem `GET` no `EstoqueAvancadoController.cs`; Divergência 13 |
| A.9 | Entrada/Saldos | sem link cruzado entre lançar e conferir | rotas isoladas, sem navegação de uma para outra |

## 3. D-A — escopo: o fato 2 (Divergência 2/3) é defeito de tela em produção, entra como correção

**Posição**: o achado do inventário — `MovimentosEstoquePage.tsx` lendo `row.tipoMovimento`/
`row.criadoEm` quando o backend (por leitura de código, sem override de serialização) devolve
`tipo`/`dataMovimento` — é a mesma classe de problema que abriu a `c2`/`c3` de Produto: campo que
existe na resposta e a tela não lê, com efeito visível (coluna vazia, contador zerado) numa tela
**já em produção**. Pelo critério da D56 ("campo que corrompe dado hoje vira `.cN`; campo novo na
tela vira `bNN`") isto não corrompe dado — não há escrita errada, é leitura que sempre mostra
`'-'` — mas é uma tela que hoje **mente por omissão**: mostra "Impacto controlado pelo backend" e
severidade sempre neutra para toda transferência, toda entrada, toda saída, há quem sabe quantas
versões. Registro do que abro mão adiante.

**O que decido, dado que não há como confirmar por HTTP sem subir Docker (fora do pedido do
usuário)**: trato como **defeito confirmado por evidência de código, não por medição em
produção**, e escrevo os dois nomes como se fossem verdade até prova em contrário — porque a
cadeia de evidência é direta (nome do `record` C#, ausência de qualquer `JsonPropertyName`,
política de serialização padrão do ASP.NET Core) e o custo de esperar é uma tela de auditoria
inútil por mais uma versão. Isso é a mesma lógica que já decidiu Divergência 2/3 no inventário:
"forte o bastante para não ser tratada como 'provavelmente'".

**Onde entra**: correção `.c1` **antes** da `b68` funcional, não dentro dela. Motivo prático de
operação, não só de processo: se a `b68` reorganiza Entrada/Saída/Histórico em abas **sobre** um
componente de Histórico que já está com duas colunas quebradas, a pessoa que revisa a nova aba
não vai saber se o defeito é da reorganização ou preexistente — mistura dois problemas na mesma
revisão. Corrigir primeiro, isolado, com o teste que já existe apontando para o nome errado
(nenhum teste unitário cobre isso hoje, verifiquei por `grep -rn "tipoMovimento\|criadoEm"
tests/unit` — **não encontrei asserção que trave o nome do campo lido**, o que também é achado:
o defeito não tem teste de regressão nenhum guardando ele).

Comando usado para essa checagem: `grep -rn "tipoMovimento" tests/unit --include=*.ts` (não
listado aqui por já estar registrado como comando, resultado: nenhuma ocorrência fora do próprio
componente/util de produção).

**Correção mínima da `.c1`, do ponto de vista do operador**: trocar os dois nomes lidos, ampliar
`TipoMovimentoEstoque` para incluir 8/9/10 com rótulo (Divergência 4 anda junto — corrigir só o
nome sem o enum troca "sempre `'-'`" por "sempre `'8'`"/"sempre `'9'`" em toda transferência, que
não é melhor). Não entra nesta `.c1`: as quatro colunas de rastreabilidade
(`quantidadeAnterior/Posterior`, `quantidadeReservadaAnterior/Posterior` — Divergência 5) nem os
seis campos do Inventário básico sem exibição (Divergência 12). São "sem uso", não "mostrando
errado" — categoria de risco diferente, cabem na `b68` como parte de "Histórico fecha de verdade"
(seção 5).

## 4. D-B — Entrada/Saída/Histórico em abas: sobre o sistema básico, os dois sistemas continuam existindo

O plano fala do sistema **básico** (`/estoque/entradas`, `/saidas`, `/movimentos`) — confirmado
pelo inventário, seção 0. Concordo em não tocar o avançado nesta fatia: consolidar os dois
"Ajuste" e os dois "Inventário" (Divergência 7, 10) é decisão de modelo de domínio (qual dos dois
formatos sobrevive, o que acontece com dados já gravados no outro), não de agrupamento de UI —
não é trabalho de uma versão que também mexe em quatro outras coisas.

**O que a tela precisa permitir para o fluxo fechar** (o que a reorganização em abas destrava):
1. Entrada, Saída e Histórico na mesma tela, com o Histórico **filtrado por padrão pelo que acabou
   de ser lançado** (produto/local da última operação) — destrava o passo A.9/B (conferir sem sair
   da tela).
2. Cada aba mantém confirmação e motivo **próprios** — nenhuma fusão de operação, como o plano já
   define. Abas são navegação, a chamada HTTP continua sendo três (`registrarEntrada`,
   `registrarSaida`, `listarMovimentos`), o que o inventário já confirma que não muda
   `guard-permission-map` nem `backend-contract-map`.
3. O Histórico dentro da aba **só serve o propósito se a Divergência 2/3 estiver corrigida antes**
   (seção 3) — caso contrário a `b68` entrega uma aba nova sobre uma tabela que não mostra tipo
   nem data, e o defeito herda visibilidade maior, não menor.

**O que eu abro mão**: não peço navegação cruzada Entrada↔Saldos↔Movimentos fora dessas três abas
(ex.: um link "ver saldo atual deste produto" dentro do formulário de Entrada). O operador que
quer conferir saldo antes de lançar continua abrindo `/estoque/saldos` à parte. Isso é fluxo mais
pobre: quem lança uma entrada não sabe, sem sair da tela, se o saldo atual já é suficiente para
decidir a quantidade (por exemplo, saber que já tem excesso antes de receber mais). Aceito porque
`/estoque/saldos` é consulta simples (sem filtro complexo) e abrir em nova aba do navegador é
custo baixo comparado ao de embutir uma segunda tabela de dados dentro do formulário de
lançamento — decisão que cabe ao `arquiteto-design-system` questionar se acha o custo menor do
que estou medindo.

## 5. D-C — `origemId` e `documento` na transferência: campo de correlação livre, não vínculo validado

O inventário é claro (seção 2 e "O que `TransferirEstoqueRequest.OrigemId`/`.Documento`
significam"): o backend **não valida** que `OrigemId` exista em nenhuma tabela — é um GUID de
correlação entre as duas pernas da transferência, gerado pelo próprio backend se omitido. Isto
**não é** o caso de vínculo de entidade (cliente, produto, pedido) que o gate de GUID digitado
existe para proteger — é mais parecido com um `correlationId` técnico, que a lista de exceção do
gate (`allowedTechnicalFields`, `validate-guid-references.mjs:35-40`) já reconhece como categoria
distinta (`correlationId`, `traceId`).

**Minha posição**: nesta versão, **`Documento` entra como `InputText` livre** (mesmo padrão já
usado em Entrada/Saída/Ajuste, mesmo `MaxLength(80)`), e **`OrigemId` não entra como campo digitável
pelo operador**. Se o objetivo é permitir correlacionar a transferência com um evento de outro
módulo (uma requisição, uma ordem de produção), o caminho correto — e o precedente já em
produção, `ReservaEstoqueDialogs.tsx:69-71` — é: `origemModulo` como dropdown fixo de módulos
conhecidos, e **quando** o operador escolhe um módulo com catálogo consultável (ex.: "Vendas" →
`EntitySelect` de pedido de venda, do jeito que a Reserva já faz), o `origemId` vem selecionado,
não digitado. Mas a Transferência **não tem** hoje nenhum evento de outro módulo que a dispare
(ela é sempre lançada manualmente pelo operador de estoque, ao contrário da Reserva, que nasce de
um Pedido de Venda) — então, para esta versão, **não há nenhum catálogo para popular o seletor**,
e o campo certo é: não expor `OrigemId` na tela, deixar o backend gerar o correlacionador sozinho
(como já faz quando omitido), e reservar o `EntitySelect` condicional para quando/se a
Transferência passar a nascer de um evento de outro módulo (ex.: uma requisição de produção que
hoje não existe como gatilho automático).

**O que eu abro mão**: quem quiser correlacionar manualmente duas transferências ao mesmo evento
externo perde essa possibilidade nesta versão — o `Documento` livre cobre "digitar o número da
requisição", mas não cria um vínculo estruturado. Aceito, porque estruturar esse vínculo sem
nenhuma validação por trás (o backend não confere nada) daria uma falsa sensação de integridade
que não existe — pior do que não ter o campo.

## 6. D-D (B-3) — origem do ajuste: nenhum dropdown de catálogo nesta versão, porque não existe catálogo para nenhum dos dois "ajustes"

O inventário fecha isso: **não existe** `enum OrigemModulo`/catálogo em lugar nenhum do C# para o
ajuste básico (texto livre `NotEmpty`, `MaxLength(80)`), e o ajuste avançado **nem aceita o campo**
como input — a origem é fixada pelo domínio (`"Estoque.AjusteManual"`/`"Estoque.Inventario"`),
somente-leitura. O plano pediu "dropdown só com catálogo publicado" — a condição da própria frase
não se cumpre hoje.

**Minha posição, do ponto de vista de quem faz um ajuste de contagem 20 vezes por dia**: um
dropdown com os quatro valores que a Reserva já hardcoda (`ESTOQUE`/`VENDAS`/`COMPRAS`/`AJUSTE`,
Divergência 8) **parece** resolver, mas repete um padrão que já é ruim onde existe — um dropdown
sem fonte de verdade trava o operador em quatro opções que podem não bater com o que a operação
real usa (ex.: alguém que ajusta por causa de perda em produção não tem `"PRODUCAO"` na lista) e
ele digitava livremente antes. Trocar texto livre por dropdown fechado **sem catálogo** é regressão
de UX disfarçada de melhoria — o operador que hoje digita `"Producao.PerdaFabril"` (livre) passa a
não conseguir descrever a origem real, porque a lista não previu esse caso.

**O que decido**: mantenho o `InputText` livre no ajuste básico nesta versão. Documento no rótulo
do campo o que o valor **deveria** conter (ex.: sublabel "informe o processo ou módulo de
origem"), sem fingir estrutura que não existe — isso é UX honesta, não regra de negócio. O ajuste
**avançado** não muda (`Origem` continua somente-leitura, calculada pelo domínio) — não há decisão
a tomar aí, o backend já decidiu.

**O que eu abro mão**: não entrego o dropdown que o plano pediu. Quem precisar de relatório
consistente por origem de ajuste ("quantos ajustes vieram de perda de produção este mês") não vai
conseguir agregar de forma confiável — texto livre gera variações de grafia. Aceitável **se** B-3
virar pergunta formal ao backend e travar como pendência explícita (seção 8), não aceitável se a
`b68` fechar a fatia como se B-3 estivesse resolvida.

## 7. D-E — Histórico: filtro e paginação, dado o volume medido pelo padrão de código

Não medi volume real (sem banco populado — mesma limitação do inventário). O que sei, por leitura
de código: `EstoqueRepository.ListarMovimentosAsync` não pagina (`Skip`/`Take` ausentes,
`EstoqueRepository.cs:52-60`), cada transferência gera **duas** linhas, cada recebimento de compra
gera uma (`ReceberPedidoCompraUseCase.cs:238`), cada baixa/cancelamento de reserva gera uma. Do
ponto de vista de quem consulta: hoje a tela já busca tudo e pagina só no cliente
(`records.slice`, `MovimentosEstoquePage.tsx:30-31,50`) — o fluxo de consulta **fecha
funcionalmente enquanto o volume for pequeno**, e degrada sem aviso (sem indicação de "muitos
resultados, refine o filtro") conforme cresce.

**Minha posição**: a `b68` não deveria assumir paginação de servidor que o backend não tem —
implementar `page`/`pageSize` no frontend sem o parâmetro correspondente no `GET
/api/estoque/movimentos` (que hoje não existe) seria repetir o antipadrão já achado em
`origemId` (Divergência 16): parâmetro que o frontend manda e o backend ignora silenciosamente.
O que a tela **pode** e deve fazer nesta versão, sem depender de contrato novo: exigir que o
filtro por período (`inicio`/`fim`) tenha um intervalo default razoável (ex.: últimos 30 dias) em
vez de trazer tudo por padrão, e mostrar um aviso quando o resultado bater um teto arbitrário do
lado do cliente (ex.: 500 linhas) dizendo "refine o período ou produto" — isso é UX que não
inventa paginação de servidor, só evita que o operador espere uma tabela carregando dezenas de
milhares de linhas sem feedback.

**O que eu abro mão**: não entrego paginação de verdade. Quem precisar de histórico completo de
um produto de alto giro, ao longo de meses, vai continuar recebendo uma resposta grande e lenta.
Isso é aceitável **enquanto** o volume real não for medido (pergunta 4, seção 8); deixa de ser
aceitável no primeiro relato real de tela travando, momento em que a paginação de servidor vira
item de backend, não algo que o frontend resolve sozinho.

## 8. D-F — ilusão de acesso nas rotas e o GUID digitado em bloqueios

Classificação por `accessRisk` (`.claude/graph/risk.yaml`):

- **`/estoque/saldos` e `/estoque/movimentos` sem regra própria em `routePermissions.ts`**
  (Divergência 14): dar a essas duas rotas uma regra própria exigindo `ESTOQUE_CONSULTAR`
  (em vez do catch-all que aceita `ESTOQUE_MOVIMENTAR`/`RESERVAR`/`INVENTARIO_GERENCIAR`) —
  **`accessRisk: ILUSAO`**. Quem tem só `ESTOQUE_MOVIMENTAR` hoje já chega nas duas telas e já
  vê `UnauthorizedState`, porque o componente exige `ESTOQUE_CONSULTAR` especificamente
  (`SaldosEstoquePage.tsx:36`, `MovimentosEstoquePage.tsx:36`) — corrigir a rota não tira
  capacidade de ninguém que hoje conclui algo, só fecha a rota mais cedo para quem já era barrado
  depois. O próprio inventário já rotula assim ("mesma classe de risco que a `b62`"). **Entra na
  `b68`** — é o mesmo tipo de correção já aceito na `b62` para `/estoque/bloqueios`.

- **`ReservasEstoquePage` exige `ESTOQUE_RESERVAR` para listar, quando o backend aceita
  `ESTOQUE_CONSULTAR` sozinho no `GET`** (Divergência 15): corrigir isso **dá** acesso de leitura
  a quem só tem `ESTOQUE_CONSULTAR` — **`accessRisk: NENHUM`** (ninguém perde nada, alguém ganha
  o que o backend já permitiria). Não depende de decisão de usuário, mas fica fora do fluxo
  crítico da `b68` (não é Entrada/Saída/Histórico/Transferência/Ajuste) — recomendo entrar junto
  por ser trivial e de risco zero, mas não bloqueio a fatia se ficar para depois.

- **GUID digitado em `BloqueiosEstoqueTab.tsx:82`**: não é questão de guard/permissão, é ausência
  de endpoint (`GET` de listagem de bloqueios não existe no `EstoqueAvancadoController.cs`).
  **Não entra na `b68`** como correção de frontend isolada — não há de onde popular um seletor.
  Aceitar continuar com o `InputText` de GUID **nesta versão** é o que abro mão aqui, com uma
  ressalva de operação: o texto de ajuda ao lado do campo precisa dizer explicitamente de onde
  vem esse ID (hoje não diz nada) — por exemplo, "cole o ID retornado ao criar o bloqueio; ainda
  não há lista de bloqueios ativos". Sem isso, o operador não sabe nem que está diante de uma
  limitação conhecida, e vai procurar um seletor que não existe a cada vez. Viro pergunta ao
  backend na seção 9. Nota lateral, não é decisão da rodada: o gate de GUID digitado
  (`validate-guid-references.mjs`, lista `referenceFields`) **não** inclui `bloqueioId` no
  conjunto vigiado — hoje esse campo passa pelo gate sem ser pego, então corrigir a lista do gate é
  trabalho de plataforma/gate, fora do meu escopo de não tocar código.

## 9. Impacto em módulo vizinho

- **Compras**: `ReceberPedidoCompraUseCase.cs:238` gera movimento de estoque ao receber pedido —
  a Entrada manual da `b68` é um caminho **paralelo** ao recebimento de compra, não o mesmo. Se um
  operador usar Entrada manual para registrar o que já devia vir do recebimento formal de Compras,
  o pedido de compra fica sem o registro de recebimento correspondente (divergência entre "Compras
  diz que não recebeu" e "Estoque diz que entrou"). A tela **não impede** isso — não há como, sem
  regra de backend vinculando entrada manual a pedido pendente — mas o texto de ajuda em Entrada
  deveria orientar "para recebimento de pedido de compra, use a tela de Recebimento em Compras",
  o que hoje não existe (`MovimentoEstoqueFormDialog.tsx` não tem nenhum aviso desse tipo).
- **Vendas**: `VendaPedidoEstoqueOrchestrator.cs` baixa reserva/estoque na confirmação de venda —
  Saída manual da `b68` é o mesmo tipo de caminho paralelo. Mesmo risco de divergência, mesma
  ausência de aviso.
- **Qualidade**: bloqueio de estoque (aba Bloqueios) é o ponto de acoplamento — Qualidade bloqueia,
  Estoque libera. O GUID digitado (seção 8) é exatamente onde esse acoplamento quebra: se Qualidade
  não tiver hoje uma tela própria que mostre o `bloqueioId` de forma copiável, o vínculo entre os
  dois módulos depende de comunicação fora do sistema (chat, planilha). Pergunta 3, seção 10.
- **Faturamento/Fiscal**: nenhum. O único "estorno" ligado a Fiscal (`EstornoBaixaReserva`,
  tipo 10) é lançado pelo próprio backend ao cancelar nota — a `b68` não cria tela para isso, e
  não deveria (é reflexo de workflow fiscal, não ação livre do operador de estoque).

## 10. Perguntas que só o cliente ou o backend respondem

1. **B-3 formal**: o catálogo de `origemModulo` do ajuste será publicado como endpoint, ou o campo
   fica texto livre por definição de produto? Decide se a `.c2`/versão futura troca `InputText`
   por `Dropdown` real, ou se a orientação passa a ser permanente (texto livre com sublabel).
2. **Bloqueios**: haverá `GET /api/estoque/avancado/bloqueios` de listagem? Decide se o antipadrão
   de GUID digitado em `BloqueiosEstoqueTab.tsx` é corrigível só no frontend (não é, hoje) ou
   exige item de backend antes de qualquer tela nova ali.
3. **Qualidade → Estoque**: quando Qualidade bloqueia um saldo, existe hoje alguma tela em
   Qualidade que mostra o `bloqueioId` gerado, de forma que o operador de Estoque consiga
   encontrá-lo sem pedir a outra pessoa? Decide se o fluxo de liberação de bloqueio fecha dentro
   do ERP ou depende de canal externo.
4. **Volume real de `GET /api/estoque/movimentos`**: alguma empresa cliente já roda em produção
   com histórico de estoque de mais de, digamos, 50 mil linhas? Decide se a ausência de paginação
   de servidor é um risco teórico (posso aceitar filtro com default de 30 dias e seguir) ou um
   problema ativo que precisa virar item de backend antes da `b68`.
5. **Confirmação de Divergência 2/3 por HTTP real**: quando o backend puder ser exercitado (com
   autorização do usuário para subir o ambiente), alguém precisa chamar `POST /api/estoque/entradas`
   uma vez e olhar o corpo da resposta cru, só para confirmar `tipo`/`dataMovimento` antes de a
   `.c1` trocar os nomes — decide se a correção proposta na seção 3 é a certa ou se existe algum
   `JsonPropertyName`/naming policy que a leitura de código não achou.

## 11. O que eu abro mão — resumo

- Sem link cruzado entre as abas de lançamento e `/estoque/saldos` (seção 4): operador confere
  saldo em aba/rota separada.
- Sem `EntitySelect` de correlação estruturada na Transferência: `origemId` fica interno ao
  backend, o operador só tem `Documento` livre (seção 5).
- Sem dropdown de origem no Ajuste básico nesta versão: mantenho texto livre, com orientação de
  preenchimento (seção 6).
- Sem paginação de servidor no Histórico: só filtro de período com default e aviso de volume
  (seção 7).
- Sem correção do GUID digitado em Bloqueios: fica como está, com texto de ajuda adicionado
  (seção 8), até existir endpoint de listagem.

## 12. Onde discordo (antecipando os outros três)

> Discordo de quem propuser tratar Divergência 2/3 como item comum da `b68` em vez de correção
> isolada antes dela. Misturar "campo lido com nome errado numa tela em produção" com "reorganizar
> em abas" faz o QA da `b68` ter que provar duas coisas ao mesmo tempo, e se a correção do nome
> falhar (por exemplo, se a Divergência 2 estiver errada e o campo real for outro), a fatia inteira
> trava por um problema que não é dela. Aceitável se `plataforma`/`escopo` já tiverem um jeito
> barato de isolar as duas coisas no mesmo commit sem misturar prova; não é aceitável se a pressão
> de calendário empurrar as duas para o mesmo teste de aceitação.

> Discordo de qualquer proposta de dropdown fechado para `origemModulo` do ajuste (mesmo com os
> quatro valores hardcoded da Reserva) sem tratar isso como o que é: uma lista sem fonte de
> verdade. Ela resolve a queixa visual de "campo livre parece desleixado", mas troca "o operador
> descreve a origem real" por "o operador escolhe a opção mais parecida", e ninguém audita depois
> se a opção escolhida bate com o que aconteceu. Aceitável só se vier junto com o compromisso
> explícito de que a lista é provisória e sujeita a substituição quando B-3 responder.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "arquitetura",
  "assunto": "estoque",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/10-operacao-estoque.md",
  "decisoesPropostas": [
    {
      "id": "D-A",
      "resumo": "Divergência 2/3 (tipo/tipoMovimento, dataMovimento/criadoEm) vira correção .c1 isolada, antes da b68 funcional, mesmo sem confirmação por HTTP real — evidência de código é forte o bastante."
    },
    {
      "id": "D-B",
      "resumo": "Entrada/Saída/Histórico em abas sobre o sistema básico apenas; sistema avançado não muda nesta fatia; Histórico só entrega valor real depois da D-A."
    },
    {
      "id": "D-C",
      "resumo": "Documento como InputText livre na transferência; origemId não vira campo digitável — é correlacionador interno do backend, sem catálogo nem entidade validável."
    },
    {
      "id": "D-D",
      "resumo": "Origem do ajuste básico continua InputText livre nesta versão, com texto de orientação; ajuste avançado não muda (somente-leitura). Dropdown fica pendente de B-3."
    },
    {
      "id": "D-E",
      "resumo": "Sem paginação de servidor (backend não suporta); filtro de período com default de 30 dias e aviso de volume no cliente."
    },
    {
      "id": "D-F",
      "resumo": "Corrigir routePermissions de /estoque/saldos e /estoque/movimentos para ESTOQUE_CONSULTAR: accessRisk ILUSAO, entra na b68. Afrouxar ReservasEstoquePage para ESTOQUE_CONSULTAR na leitura: accessRisk NENHUM, desejável mas não bloqueante. GUID digitado em Bloqueios não é corrigível só no frontend — fica fora, com texto de ajuda adicionado."
    }
  ],
  "discordancias": [
    "Quem tratar Divergência 2/3 como item comum da b68 (não isolado antes dela) mistura prova de correção de defeito com prova de reorganização de UI, e arrisca travar a fatia inteira por um problema que não é dela.",
    "Quem propuser dropdown fechado para origemModulo do ajuste sem catálogo do backend está trocando texto livre honesto por lista sem fonte de verdade, e cria uma sensação de estrutura que os dados não sustentam."
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-3 terá catálogo publicado de origemModulo, ou o campo é texto livre por definição de produto?", "decide": "se a origem do ajuste vira dropdown real numa versão futura" },
    { "tipo": "backend", "pergunta": "Haverá GET de listagem de bloqueios de estoque?", "decide": "se o GUID digitado em BloqueiosEstoqueTab é corrigível só no frontend ou exige endpoint novo" },
    { "tipo": "funcional", "pergunta": "Qualidade expõe o bloqueioId de forma copiável para quem vai liberar em Estoque?", "decide": "se o fluxo de liberação de bloqueio fecha dentro do ERP" },
    { "tipo": "funcional", "pergunta": "Algum cliente já roda com histórico de estoque de grande volume (dezenas de milhares de linhas)?", "decide": "se a ausência de paginação de servidor é risco teórico ou item urgente de backend" },
    { "tipo": "backend", "pergunta": "Confirmação por resposta HTTP real de que MovimentoEstoqueResponse serializa tipo/dataMovimento (não tipoMovimento/criadoEm).", "decide": "se a correção proposta na .c1 é a certa" }
  ],
  "riscos": [
    "Sem navegação cruzada entre as abas de lançamento e /estoque/saldos: operador confere saldo fora da tela de lançamento, custo aceito nesta versão.",
    "Sem EntitySelect de correlação na transferência: quem queria vincular formalmente a um evento de outro módulo só tem Documento livre.",
    "Sem paginação de servidor no Histórico: consulta de grande volume degrada sem limite conhecido, sem medição de quando isso vira problema real.",
    "GUID digitado em Bloqueios permanece sem solução nesta versão por ausência de endpoint — antipadrão documentado, não corrigido.",
    "Divergência 2/3 tratada como certa sem confirmação HTTP; se a leitura de código estiver errada, a correção da .c1 é desnecessária ou incompleta."
  ]
}
```
