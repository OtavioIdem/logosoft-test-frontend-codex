
# Posição — `arquiteto-plataforma-frontend`, rodada 10 (`estoque`)

Viés declarado: ano cinco. A pergunta não é se a `b68` funciona, é quanto custa mudar isto depois
que Compras, Vendas e Faturamento já tiverem escrito contra o formato que ela fixar.

## 0. O achado que muda a moldura da rodada: básico e avançado não são um sistema duplicado, são dois livros-razão que não se falam

O inventário (seção 0 e Divergência 10) já registrava "dois sistemas paralelos sob o mesmo item de
menu". Fui ao domínio confirmar **o que** diverge, porque "duplicação" e "dados desencontrados" têm
custo de reversão completamente diferentes.

**Medido, não intuído** (leitura direta em `../New project 3/src`, comando
`grep -rln "EstoqueSaldo" Erp.Application/Estoque/Avancado/ Erp.Domain/Estoque/Avancado/
Erp.Infrastructure/Estoque/`):

```
Erp.Infrastructure/Estoque/EstoqueRepository.cs
```

Um único resultado. `EstoqueSaldo` — a entidade que `/estoque/saldos` lê e que `RegistrarEntrada`/
`RegistrarSaida`/`Reservar`/`BaixarReserva` (`Erp.Domain/Estoque/EstoqueSaldo.cs:40-97`) mutam — não
é referenciada em **nenhum** arquivo da árvore `Avancado`. Conferido caso a caso:

- `CriarAjusteEstoqueAvancadoUseCase.cs:44-46` persiste `AjusteEstoqueOperacional` via
  `IEstoqueAvancadoRepository`; nunca chama `EstoqueSaldo.AjustarPara`, que é o único caminho pelo
  qual o básico muda saldo (`AjustarSaldoEstoqueUseCase.cs:54`).
- `BloqueioEstoqueOperacional` (`Erp.Domain/Estoque/Avancado/BloqueioEstoqueOperacional.cs:12-40`) é
  uma entidade **própria**, com sua própria `Quantidade`, sem vínculo com
  `EstoqueSaldo.QuantidadeReservada`. Bloquear estoque pelo avançado não reduz
  `QuantidadeDisponivel` no básico, e portanto não impede uma saída manual de vender o que "está
  bloqueado".
- O único ponto de integração real que o backend tem com outros módulos —
  `ReceberPedidoCompraUseCase.cs:238` (Compras) e `VendaPedidoEstoqueOrchestrator.cs:13` (Vendas) —
  chama o estoque **básico**. Não há grep positivo de Vendas/Compras chamando qualquer coisa em
  `Erp.Application/Estoque/Avancado/`.

Isto não é "dois CRUDs parecidos". É dois livros-contábeis que não se reconciliam: um operador que
bloqueia estoque pelo avançado, ajusta pelo avançado, ou fecha um inventário operacional pelo
avançado, e depois olha `/estoque/saldos` (básico), vê um número que nunca soube do bloqueio nem do
ajuste. **Ponto de não-retorno real**: quanto mais tela se constrói sobre `avancado` tratando-o como
"a verdade do estoque", mais caro fica descobrir depois que ele nunca foi. Corrigir isso não é
renomear campo — é escolher qual dos dois vira o livro-razão único, ou desenhar a reconciliação, o
que é migração de dado, não refatoração de tela.

**Isto responde, com evidência de código e não de preferência, a pergunta "qual dos dois é a
base"**: é o **básico**. É o que Compras e Vendas já pressupõem, é o que tem o histórico auditável
único (`GET /movimentos`), e é o que o próprio recorte `b68` do plano já mira (seção 1 do
inventário: as três rotas do plano — Entrada, Saída, Histórico — são todas `features/estoque/**`).
Isso não é uma escolha desta rodada: já está feita, no código do backend, há tempo. O que falta é
dizer isso em voz alta antes que alguém proponha migrar Ajuste ou Inventário do básico para o
avançado "porque tem paginação" — trocaria o sistema integrado pelo isolado.

## 1. Pontos de não-retorno da camada

1. **Qual dos dois livros de estoque é o canônico** (seção 0). Decidido pelo backend, não por esta
   rodada — mas se o frontend não declarar isso em algum lugar visível (nem que seja um comentário
   em `estoqueApi.ts`), a próxima pessoa que abrir `features/estoque-avancado/` vai presumir que é
   "a versão nova" e investir errado. Custo de reverter depois de investimento adicional em
   avançado: migração de dado real (reconciliar dois saldos), não apenas troca de import.
2. **`queryKey` de Estoque** (`estoqueQueryKeys`, `hooks/useEstoqueResources.ts:11-16`). Hoje é
   `['estoque', <recurso>, query]`, exportada, com o objeto de filtro inteiro (incluindo
   `empresaId`/`filialId`) dentro da chave. Isto está correto e é **barato** de manter — não é
   ponto de não-retorno, é o padrão que a `b68` deve preservar. Custo de errar aqui seria alto (cinco
   telas leem o mesmo prefixo), mas não há erro para corrigir agora.
3. **Ausência de paginação de servidor em `GET /api/estoque/movimentos`**
   (`Erp.Infrastructure/Estoque/EstoqueRepository.cs:52-60`, sem `Skip`/`Take`). Isto não é decisão
   do frontend — é limite do contrato. Uma vez que uma tela em produção depender de "carregar tudo e
   paginar no cliente" (`MovimentosEstoquePage.tsx:29-31`), a saída não é trocar `DataTableServer`
   por lazy — é o backend abrir `page`/`pageSize`, que é mudança de contrato, não de tela. Enquanto
   isso não acontece, todo esforço de UI sobre Histórico herda o teto físico do que o navegador
   aguenta materializar de uma vez.
4. **`TransferirEstoqueRequest.OrigemId` não é referência a entidade** (seção 2 do inventário,
   `TransferirEstoqueUseCase.cs:103`: `transferenciaId = request.OrigemId ?? Guid.NewGuid()`). Se a
   tela expuser esse campo como "ID de outro módulo" e o operador aprender a colar GUIDs de pedido
   ali, systematiza um hábito que nenhuma validação sustenta — não quebra hoje, mas ensina o
   comportamento errado a quem opera.

## 2. Onde a proposta da operação quebra sob volume, cache ou contrato

> **Discordo de `arquiteto-operacao-erp`, antecipando o argumento mais provável da posição dele**
> (não vi o texto dele; a leitura abaixo é sobre o que o inventário e o padrão de rodadas anteriores
> sugerem que a operação vai pedir — se a posição real for outra, este ponto cai e digo onde).
>
> Se a proposta for **enriquecer o Histórico com as quatro colunas que hoje faltam**
> (`quantidadeAnterior`, `quantidadePosterior`, `quantidadeReservadaAnterior`,
> `quantidadeReservadaPosterior` — Divergência 5, campos que o backend já entrega) **dentro da
> mesma consulta sem paginação**, o custo é: cada linha carregada no cliente cresce ~30% em peso
> (quatro `decimal` a mais por objeto), sobre uma lista que **já cresce mais rápido que clique do
> operador** — medido no próprio backend: cada transferência grava **duas** linhas
> (`TransferirEstoqueUseCase.cs:113-114`), cada baixa de reserva grava uma, cada recebimento de
> pedido de compra grava uma (`ReceberPedidoCompraUseCase.cs:238`). Isto não é medição de volume real
> (não hei acesso a banco populado — **isto é intuição, não medição** sobre a contagem, mas é fato
> sobre o multiplicador de escrita). Sob esse multiplicador, "mostrar tudo" piora mais rápido do que
> parece.
>
> Alternativa: manter as quatro colunas fora da tabela principal e trazê-las só no diálogo de
> detalhe de uma linha (uma consulta, não uma coluna a mais em N linhas), e usar `inicio`/`fim` (que
> o endpoint já aceita, `EstoqueController.cs:48-54`) com um default de janela curta (ex.: últimos
> 30 dias) em vez de nenhum filtro, para reduzir o corpo da resposta sem esperar paginação de
> servidor.
>
> Reversível: sim, dos dois lados — trocar "colunas na tabela" por "colunas no diálogo" é troca de
> `<Column>` por prop de diálogo, não migração de dado. Se a operação trouxer medição real de que o
> volume por empresa é baixo (ex.: contagem de linhas de uma empresa piloto), este ponto cai e eu
> assino a versão com as colunas na tabela.

> **Discordo de `arquiteto-operacao-erp`, segundo ponto antecipado**: se a proposta para "origem do
> ajuste como dropdown" (B-3) for fechar a pergunta hoje copiando o padrão já em produção de
> `ReservaEstoqueDialogs.tsx:21-26` (`origemEstoqueOptions` fixo, sem catálogo) — o próprio plano já
> nomeou esse padrão como o que **não** quer ("Hardcode no frontend apenas disfarça texto livre",
> `PLANO-FRONTEND-ONDA-OPERACAO.md:167-168`). Sob volume de módulos que hoje chamam o estoque com
> valor fixo próprio (`ReceberPedidoCompraUseCase.cs:28: "Compras.PedidoCompra"`,
> `VendaPedidoEstoqueOrchestrator.cs:13: "Vendas.PedidoVenda"`, mais três de Produção), um dropdown
> hardcoded no Ajuste manual precisaria adivinhar um vocabulário que o backend nunca declarou, e
> qualquer valor novo que o backend crie (um sexto módulo chamando o estoque no futuro) não aparece
> na lista sem uma versão de frontend. Ver D-D abaixo — este é o caso em que a "solução mais simples
> e pior" (texto livre) é also a mais honesta.
> Reversível: sim — texto livre para dropdown é aditivo. Dropdown-para-dropdown-com-catálogo-real
> depois de já existirem valores digitados livremente no banco é o caro: alguém vai ter que
> normalizar dado histórico. É por isso que registro isto agora, e não depois.

## 3. Onde o corte de escopo vira dívida cara, e onde não

**Vira dívida cara:**

- **Adiar a correção do nome de campo em `MovimentoEstoqueResponse` (fato 2/3) para depois da
  `b68`.** A `b68` já vai reescrever `MovimentosEstoquePage.tsx` para virar aba — se o campo errado
  não for corrigido no mesmo diff, a aba nova nasce com o mesmo defeito herdado, e a próxima pessoa
  que tocar o arquivo vê `tipoMovimento`/`criadoEm` como se fossem reais e copia o padrão para outro
  lugar (é exatamente como `estoqueUxUtils.ts:58-59` herdou `'EmContagem'` do avançado para o
  básico, Divergência 11 do inventário — cópia de nome sem checar a origem já aconteceu neste mesmo
  módulo). Corrigir agora custa um `git mv` de dois nomes de campo mais um teste de regressão;
  corrigir depois de mais uma tela copiar o padrão custa duas correções e um pente-fino.
- **Não fechar a `LACUNA_DESTINO` desatualizada no gate** (`gate-contract-request-fields.mjs:376-377`,
  apontando para `'b66'`, renumerado para `b68` pela D67). Se a `b68` adicionar `origemId`/
  `documento` sem também limpar essa linha, o mapa fica com referência morta — barato agora (é a
  mesma entrega, mesmo arquivo já sendo tocado pelo gate), caro depois porque ninguém vai lembrar
  por que uma constante aponta para uma versão que não existe (o mesmo tipo de achado que a
  rodada 07 já registrou em `docs/arquitetura/debate/07-plataforma-produtos-fiscais.md:280-296`
  para o mesmo mapa).

**Não vira dívida cara — pode cortar sem medo:**

- **Bloqueios (GUID digitado, sem `GET` de listagem) ficar fora da `b68`.** O plano não pede
  Bloqueios nesta versão (só Entrada/Saída/Histórico/Transferência/Ajuste). Não construir aqui não
  cria débito novo — o antipadrão já existe em produção desde antes desta rodada, e corrigi-lo exige
  endpoint que não existe. Adiar é reversível: quando o backend responder a pergunta de listagem, a
  troca de `InputText` por `EntitySelect` é local a um arquivo (`BloqueiosEstoqueTab.tsx`).
- **Não consolidar básico/avançado agora.** É tentador usar a `b68` para "resolver a duplicação",
  mas isso é migração de dado (seção 0) — decisão que precisa de inventário e rodada próprios, não
  um efeito colateral de reorganizar abas. Cortar isso da `b68` é o corte certo, não o preguiçoso.
- **Não expor `origemId` da transferência como campo editável nesta versão** (ver D-C). Cortar aqui
  é barato: adicionar um `InputText` opcional depois, se algum módulo vizinho vier a precisar de
  correlação real, é aditivo puro.

## 4. Os gates que a camada precisa

### 4.1 Estender `gate-contract-fields.mjs` para cobrir `MovimentoEstoqueResponse` — não é gate novo, é uma entrada de mapa

**Classe de defeito que fecha**: tipo do frontend declara campo sob um nome que o backend não
serializa (o eixo mais caro deste frontend, citado na missão desta skill e a razão de existir da
`v1.11.0a8b49`). É a mesma classe que `D10`–`D19` já fecharam para Bancos, Contábil e Patrimônio —
`BACKEND_TYPE_MAP` em `scripts/gate-contract-fields.mjs:24-35` hoje só lista três módulos; `estoque`
não está lá.

**O que deixa vermelho**: o documento canônico já tem o bloco no formato exato que o parser espera —
conferido, não presumido:

```
docs/backend-v1.23/CONTRATO-API-v1.23.md:4838
**Response** (C#, `MovimentoEstoqueResponse`)
```csharp
{ ... TipoMovimentoEstoque Tipo ... DateTimeOffset DataMovimento }
```
```

Acrescentar `estoque: { MovimentoEstoque: 'MovimentoEstoqueResponse' }` ao `BACKEND_TYPE_MAP` faz o
gate comparar `types/erp.ts:451` contra este bloco e acusar `tipoMovimento` e `criadoEm` como campos
que o frontend declara e o backend não serializa sob esse nome — **hoje**, sem precisar de backend
rodando, porque o gate já lê o documento estático, não uma resposta HTTP. Isto eleva o fato 2/3 do
inventário de "não verificado, só leitura de C#" para "confirmado contra o artefato de contrato
versionado que o próprio CI já usa como fonte" — o mesmo padrão evidenciário que `D10`–`D19` usaram
para corrigir Boletos, Lançamentos e Bens sem nunca acessar banco.

**Custo aproximado**: uma linha em `BACKEND_TYPE_MAP`, e o gate corre. Comparável ao que `D18`/`D15`
já pagaram para os outros três módulos.

### 4.2 Gate de paridade de enum espelhado — a rodada 07 já desenhou, ainda não foi construído, e agora tem um segundo caso confirmado

**Classe de defeito que fecha**: enum do frontend diverge em nome ou valor do enum do backend, sem
acusar nada porque o enum trafega como número (`Erp.Api/Program.cs:28-31` não registra
`JsonStringEnumConverter`, conferido nesta rodada de novo). A rodada 07
(`docs/arquitetura/debate/07-plataforma-produtos-fiscais.md:242-278`) já propôs este gate para
`TipoItemSped`/`TipoItemFiscal`/`TipoProduto` e não foi construído. Esta rodada é o **segundo** caso
real, medido, não hipotético: `TipoMovimentoEstoque` do frontend (`types/erp.ts:54-62`) tem seis
valores; o catálogo do backend
(`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3496`) lista nove (`Entrada=1` .. `TransferenciaEntrada=9`)
e o domínio C# tem dez (`Erp.Domain/Estoque/TipoMovimentoEstoque.cs:12-20`, inclui
`EstornoBaixaReserva=10`, que **nem o catálogo em Markdown lista** — divergência dentro do próprio
material de referência, achado novo desta rodada). Dois módulos diferentes, mesma classe de defeito,
zero gates construídos: o argumento "é gold-plating" já não se sustenta na segunda ocorrência.

**O que deixa vermelho**: `BACKEND_ENUM_MAP` no formato de `BACKEND_TYPE_MAP` (nome do enum →
enum TS), regex sobre `## 11. Catálogo de enums` de
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` (já no formato regular `EnumName = Nome1 = N, ...`). Fecha
comparando **nomes e valores**, não a contagem.

**Limite que registro junto**: o próprio catálogo Markdown está incompleto para
`TipoMovimentoEstoque` (falta o 10). Um gate contra esse documento fecharia oito dos dez valores e
deixaria dois passar até o documento ser atualizado — melhor que zero, mas não perfeito. Vale abrir
uma pergunta de acompanhamento: quem mantém a seção 11 precisa de um lembrete de atualizá-la junto
do enum C#, ou o gate compara direto contra o C# (exige acesso ao repositório do backend, que não é
garantido em toda máquina/CI — trade-off explícito, não escondido).

**Custo aproximado**: mesma ordem de grandeza do gate 4.1 — um mapa mais um parser de regex sobre
texto já regular. Não é gold-plating: dois módulos diferentes já pagaram por não ter isto, e o custo
de escrever o parser não muda com o número de enums cobertos.

### 4.3 `validate:guid-references` tem um ponto cego que `BloqueiosEstoqueTab.tsx` já usa — registro, não gate novo

Não proponho gate novo aqui — é um achado sobre o gate existente, que encaminho e não decido: o
mecanismo (`scripts/validate-guid-references.mjs:89-93`) só acusa `<InputText id="..."/>` quando o
literal do atributo `id`/`name` bate com uma lista fixa de nomes de campo de referência
(`referenceFields`, linhas 7-39). `BloqueiosEstoqueTab.tsx:82` usa `id="blId"` para o estado
`bloqueioId` — nem o nome do atributo bate com `bloqueioId` (não está na lista de qualquer forma), e
mesmo que estivesse, o gate compara o **atributo DOM**, não a variável de estado ou o nome do campo
no payload. Isto significa que renomear o atributo `id`/`name` de um `InputText` para qualquer coisa
que não seja o nome do campo de domínio já basta para passar despercebido pelo gate — vulnerabilidade
de desenho do gate, não do módulo Estoque. Escalo para `qa-revisor`/`dev-senior-react`: não é minha
fronteira decidir se o gate muda para casar contra o nome da variável do estado (mais robusto, mais
caro de escrever) ou se `bloqueioId` simplesmente entra na lista (barato, mas não fecha o ponto cego
geral).

## 5. O que eu abro mão

- **Não vou insistir que a consolidação básico/avançado entre nesta versão.** É o achado mais caro
  desta rodada (seção 0), mas exige inventário e decisão próprios — forçar aqui violaria a mesma
  regra que protegeu `b54.c1` de virar `contractChange` (D5). Sinal para trocar de posição: o
  backend anunciar que vai aposentar um dos dois, ou uma segunda fatia (Venda/Compra, `b69`/`b70`)
  precisar decidir contra qual dos dois integrar — nesse dia a decisão não pode mais esperar.
- **Não vou pedir paginação de servidor em `GET /movimentos` como bloqueio da `b68`.** É limite do
  contrato atual, não decisão de tela, e o custo de contorno (janela de data por default) é baixo o
  suficiente para não travar a versão. Sinal para trocar de posição: alguém medir volume real (ex.:
  `SELECT COUNT(*)` numa empresa com meses de operação) acima de, digamos, 50 mil linhas — aí a
  ausência de paginação deixa de ser "não medido" e vira pergunta ao backend com número na mão.
- **Não vou pedir gate novo para o ponto cego de `validate:guid-references` (4.3).** Registrei e
  encaminhei; construir esse gate é decisão de outra rodada, com custo que não medi (reescrever a
  detecção para variável de estado, não atributo DOM, é ordem de grandeza diferente do gate atual).
- **Aceito texto livre honesto para `origemModulo` no Ajuste básico** (D-D) como a solução mais
  simples e pior — pior porque não impede digitação inconsistente ("Compras" vs "compras" vs
  "COMPRAS"), melhor porque não inventa um catálogo que não existe. Sinal para trocar: B-3 responder
  com um enum ou tabela publicada — nesse dia o campo vira `Dropdown` sobre dado real, não sobre
  suposição.
- **Se a proposta da operação sobre Histórico vier com número medido de volume real por empresa
  (não estimativa), minha objeção de §2 cai** e assino colunas adicionais na tabela principal sem
  reserva.

## Decisões propostas

**D-A — escopo e fatiamento.** O fato 2/3 (campo de resposta lido sob nome errado) entra **na
`b68`**, não em corretiva separada: `MovimentosEstoquePage.tsx` já é a tela que a `b68` reescreve
para virar aba, então a correção de nome é o primeiro passo do mesmo diff, com teste de regressão
que prova o nome antigo zerava contadores (mesmo padrão de `D19`). Confirmação sem Docker: contra o
bloco `MovimentoEstoqueResponse` de `docs/backend-v1.23/CONTRATO-API-v1.23.md:4838-4858`, que é o
artefato que `D10`–`D19` já aceitaram como prova suficiente nesta esteira, sem acesso a backend em
execução. Fato 3 (enum incompleto) entra junto, mesmo diff, porque o backend sempre entrega
`TransferenciaSaida`/`TransferenciaEntrada` em toda transferência que a própria `b68` está tocando —
sem os valores 8/9 no enum do frontend, toda transferência feita depois da `b68` mostra "8"/"9" cru
na coluna Tipo. Fatos 5 e 6 (campos de rastreabilidade sem uso; filtro `origemId` que quatro
controllers ignoram) ficam fora — não quebram nada hoje, são aditivos, não bloqueiam a `b68`.

**D-B — Entrada/Saída/Histórico em abas.** Sobre o sistema **básico** (`features/estoque/**`),
confirmado como o único que o texto do plano cita e como o sistema que Compras e Vendas já
integram (seção 0). O avançado continua existindo, sem tocar. Custo de consolidar agora: migração de
dado entre dois `Saldo`s que nunca se falaram — fora de escopo. Custo de não consolidar: dívida que
já existe, não cresce por causa da `b68`, mas precisa virar pauta antes de `b69`/`b70` decidirem
contra qual dos dois integrar Venda/Compra.

**D-C — `origemId` e `documento` na transferência.** `documento` (texto livre, sem GUID, já exibido
no Histórico para os outros três fluxos) entra como campo visível. `origemId` **não** entra como
campo editável nesta versão — é `Guid?` de correlação que o próprio backend preenche sozinho quando
omitido (`TransferirEstoqueUseCase.cs:103`), sem validação contra nenhuma tabela; expor um
`InputText` para ele ensinaria o operador a colar um GUID que não vincula nada, e o campo já está na
lista de referência de `validate:guid-references.mjs:32`, que forçaria um seletor sobre uma entidade
que não existe. Corrigir a entrada morta `LACUNA_DESTINO: 'b66'` para `'b68'` (ou remover, já
resolvida) no mesmo diff que fecha as duas LACUNA.

**D-D — origem do ajuste (B-3).** Ajuste básico: texto livre honesto, sem dropdown, porque não há
catálogo em lugar nenhum do C# (confirmado por grep vazio no inventário). Construir um dropdown
hardcoded repetiria o antipadrão que já existe em `ReservaEstoqueDialogs.tsx:21-26` e que o próprio
plano nomeou para evitar. Ajuste avançado: nada a fazer — o campo é somente-leitura, fixado pelo
domínio, fora do escopo de input desta versão. B-3 continua aberta ao backend.

**D-E — Histórico.** O backend sustenta filtro (`empresaId`, `filialId`, `produtoId`,
`localEstoqueId`, `inicio`, `fim`), não sustenta paginação de servidor
(`EstoqueRepository.cs:52-60`, sem `Skip`/`Take` — confirmado em código, não em execução). Volume
real não medido — **isto é intuição, não medição**: a única coisa medida é o multiplicador de
escrita (transferência gera 2 linhas, baixa/cancelamento de reserva gera 1, recebimento de compra
gera 1). Mitigação de escopo do frontend, sem esperar contrato novo: filtro de data com default de
janela curta, mantendo `DataTableServer` como paginação **visual** (não finge ser server-side) até o
backend abrir `page`/`pageSize`.

**D-F — ilusão de acesso.** `/estoque/saldos` e `/estoque/movimentos` ganham regra própria em
`routePermissions.ts` exigindo `ESTOQUE_CONSULTAR`, antes do catch-all — o mesmo padrão que `D4` já
aplicou para locais de estoque e que a própria `D4` registrou como faltando aqui
("...inserida antes da genérica para não ampliar acesso a saldos e movimentos de quebra",
`DECISOES.md:148-150`). `accessRisk: ILUSAO` — quem hoje passa pela rota com só
`ESTOQUE_MOVIMENTAR`/`ESTOQUE_RESERVAR`/`ESTOQUE_INVENTARIO_GERENCIAR` já é barrado pelo componente
(`UnauthorizedState`, `SaldosEstoquePage.tsx:36`), então ninguém perde operação que hoje conclui —
exige a frase no CHANGELOG que `risk.yaml` pede para `ILUSAO`. Bloqueios (GUID digitado): fica fora
da `b68` — não é item do plano, e corrigir exige endpoint de listagem que não existe; risco não é de
acesso (`accessRisk: NENHUM`), é de integridade de dado digitado à mão, registrado como pendência ao
backend. Achado adjacente, fora do pedido de D-F mas do mesmo mecanismo: `ReservasEstoquePage.tsx:49`
exige `ESTOQUE_RESERVAR` para **ler**, mais restritivo que o backend (`ESTOQUE_CONSULTAR` basta,
Divergência 15) — correção de sentido oposto (`accessRisk: NENHUM`, alguém **ganha** acesso), barata,
recomendo empacotar junto por tocar o mesmo arquivo de regras, mas não é bloqueante.

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "arquitetura",
  "assunto": "estoque",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/10-plataforma-estoque.md",
  "decisoesPropostas": [
    {
      "id": "D-A",
      "titulo": "Fato 2/3 (campo de resposta sob nome errado, enum incompleto) entram na b68, no mesmo diff que reescreve Movimentos em aba",
      "reversivel": true,
      "custo": "barato — dois renomes de campo, um enum completado, um teste de regressão"
    },
    {
      "id": "D-B",
      "titulo": "Abas sobre o sistema básico; avançado não é tocado; consolidação vira rodada própria",
      "reversivel": true,
      "custo": "caro se adiado além de b69/b70 — Venda/Compra vão precisar saber contra qual saldo integrar"
    },
    {
      "id": "D-C",
      "titulo": "documento entra como campo visível; origemId não entra como input editável nesta versão",
      "reversivel": true,
      "custo": "barato — adicionar depois é aditivo"
    },
    {
      "id": "D-D",
      "titulo": "Ajuste básico usa texto livre honesto para origemModulo; ajuste avançado não recebe input, campo é somente-leitura; B-3 continua aberta",
      "reversivel": true,
      "custo": "barato — trocar texto livre por dropdown quando existir catálogo é aditivo"
    },
    {
      "id": "D-E",
      "titulo": "Histórico mantém paginação visual sobre lista sem paginação de servidor; mitigação é janela de data por default",
      "reversivel": true,
      "custo": "depende de volume não medido; mitigação atual é barata"
    },
    {
      "id": "D-F",
      "titulo": "routePermissions.ts ganha regra própria para saldos e movimentos (ESTOQUE_CONSULTAR), accessRisk ILUSAO; Bloqueios GUID digitado fica fora da b68",
      "reversivel": true,
      "custo": "barato — duas linhas de regra, uma frase de CHANGELOG"
    }
  ],
  "discordancias": [
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "Histórico ganhar as quatro colunas de rastreabilidade (quantidadeAnterior/Posterior, reservadaAnterior/Posterior) na tabela principal, sobre consulta sem paginação de servidor e com multiplicador de escrita medido (2 linhas por transferência, 1 por baixa de reserva, 1 por recebimento de compra)",
      "antecipada": true,
      "alternativa": "colunas no diálogo de detalhe da linha, não na tabela; filtro de data com janela curta por default",
      "reversivelSeErrado": true
    },
    {
      "com": "arquiteto-operacao-erp",
      "ponto": "origem do ajuste (B-3) resolvida com dropdown hardcoded, no padrão já em produção em ReservaEstoqueDialogs.tsx",
      "antecipada": true,
      "alternativa": "texto livre honesto até o backend publicar catálogo real",
      "reversivelSeErrado": true
    }
  ],
  "pendencias": [
    "Confirmar em resposta HTTP real (não só documento de contrato) que MovimentoEstoqueResponse serializa 'tipo'/'dataMovimento' — o documento e o C# convergem, mas nenhum dos dois é a resposta observada",
    "B-3 (catálogo de origemModulo) segue sem resposta do backend",
    "Bloqueios sem GET de listagem — pergunta ao backend sobre endpoint novo, não resolvível só no frontend",
    "Reconciliação entre EstoqueSaldo (básico) e o par Ajuste/Bloqueio/Inventário do avançado — precisa de inventário e decisão próprios antes de b69/b70",
    "docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3496 (Catálogo de enums) não lista TipoMovimentoEstoque=10 (EstornoBaixaReserva), que existe no C#: o próprio documento de referência está incompleto para este enum"
  ],
  "riscos": [
    "Fato 2/3 tratado com confiança alta apesar de 'não verificado contra HTTP real' — a mitigação é dupla fonte estática convergente (C# e documento de contrato), não execução; se alguma delas estiver desatualizada frente ao Swagger vivo, a correção proposta erra pelo mesmo motivo",
    "Achado da seção 0 (EstoqueSaldo nunca referenciado pela árvore Avancado) é grep negativo — prova ausência por não-ocorrência; um caminho de integração indireto (ex.: um domain event que eu não seguiu) derrubaria a conclusão",
    "Volume real de GET /movimentos não medido; toda a argumentação de §2 sobre Histórico é sobre o multiplicador de escrita, rotulado como o que é: intuição sobre padrão de crescimento, não contagem observada"
  ]
}
```
