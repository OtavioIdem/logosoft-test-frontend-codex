# Debate 10 — escopo e entrega — `estoque` (candidato a `v1.11.0a8b68`)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend`, `arquiteto-design-system`, mesmo briefing.

## 0. Base fixada

```text
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
  → 1.11.0-a.8.b67   1.11.0a8b67

ls docs/fatias/ | tail -5
  → v1.11.0a8b65-produtos-fiscais.md, v1.11.0a8b66-cliente-fornecedor.md,
    v1.11.0a8b67-classificacoes-pessoa.md  (nenhum arquivo de b68 ainda — a fatia não existe)

git log --oneline -5
  → eabe03c feat(release): v1.11.0a8b67 (topo, commitado)
```

`b67` fechou (release commitado, `CHANGELOG.md` topo confirma QA aprovado, nenhuma entrada
`BLOCKED` no topo do arquivo). Nenhuma versão está bloqueada. O próximo slot funcional é `b68`,
exatamente como a D67 já travou — não há motivo de reindexação nesta rodada.

## 1. O achado que muda a ordem interna de `b68`: a prova que deveria pegar a Divergência 2/3 está calibrada para não pegar

O briefing pede que eu decida se o "possível defeito ativo" (fato 2 — `MovimentoEstoqueResponse`
serializa `tipo`/`dataMovimento`, a UI lê `tipoMovimento`/`criadoEm`) vira `.cN`, entra em `b68`,
ou espera confirmação. Antes de decidir isso, fui atrás de como essa confirmação aconteceria sem
subir Docker, porque o inventário já tinha me dito que não há acesso a backend em execução.

Achei duas coisas, e as duas mudam a resposta:

```text
grep -rn "tipoMovimento|dataMovimento|MovimentoEstoqueResponse" tests/
  → tests/e2e/fixtures/logosoft.ts:711
  → tests/contract/operational-backend.contract.spec.ts:127-133
  → tests/unit/estoqueUxRules.test.ts
```

**`tests/e2e/fixtures/logosoft.ts:711`** — o mock do E2E devolve
`{ ..., tipoMovimento: 1, ..., criadoEm: '2026-05-08T12:00:00.000Z' }`: o fixture foi escrito para
bater com o que a tela **já lê hoje**, não com o nome real do campo no C#. Isso não prova nada
sobre o backend — prova que o mock foi calibrado sobre o sintoma, um padrão que a própria D56 já
nomeou (§3, "teste verde pode estar defendendo o defeito").

**`tests/contract/operational-backend.contract.spec.ts:3-12,60-63,130`** — este é exatamente o
teste que existiria para confirmar isto contra um backend real: só roda se
`LOGOSOFT_OPERATIONAL_CONTRACT_API_URL`/`_ACCESS_TOKEN`/`_EMPRESA_ID` estiverem no ambiente
(`shouldRun = Boolean(apiUrl && accessToken && empresaId)`, linha 12) — não é acionado pela suíte
padrão, e eu não tenho essas credenciais nem vou subir backend sem pedido explícito. Mas mesmo que
alguém o rode contra staging hoje, **ele não vai acusar a Divergência 2**: a linha 130 chama
`requireOptionalNumber(movimento, 'tipoMovimento', label)`, e `requireOptionalNumber`
(linhas 60-63) só valida o tipo **se o campo existir** — se o nome real for `tipo`, `tipoMovimento`
vem `undefined`, a checagem passa em silêncio, e o teste fica verde sobre um campo que nunca
existiu na resposta. É o mesmo padrão do ACH-5 da onda: prova que roda, greens, e não prova nada.

**Isto não é medição do valor real** (não troquei uma chamada HTTP; é leitura de dois arquivos de
teste, citados por linha) — é medição de que **a prova que confirmaria o fato 2 está inutilizada
por construção**, o que muda o cálculo de custo: esperar confirmação significa esperar por uma
prova que hoje não prova nada, sem prazo de quando alguém vai rodá-la com credenciais reais e sem
plano de corrigi-la primeiro.

### Decisão de sequência derivada disto

Não decido isolado se o campo se chama `tipo` ou `tipoMovimento` — quem tem autoridade sobre o
contrato C# é o `arquiteto-plataforma-frontend`/inventariante, e a cadeia de evidência (nenhum
`JsonPropertyName`, nenhuma `NamingPolicy` em `Program.cs`, já checado pelo inventário) é forte o
bastante para agir. O que decido, do meu lugar, é **onde** essa correção entra: dentro de `b68`,
como o primeiro bloco de trabalho da versão — não como `.cN` isolado antes dela, e não como "espera
confirmação real" (ver §2, D-A).

## 2. D-A — o defeito de Movimentos entra em `b68`, como Bloco A, antes de qualquer tab nova

**Posição: dentro de `b68`, primeiro bloco. Não vira `.cN` separado; não fica pendente de
confirmação HTTP.**

Comparei com o precedente explícito do briefing, `v1.11.0a8b64.c2`
(`docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md`), e a diferença de severidade é a razão
de não replicar a forma:

```text
c2 (Produto): o PATCH de dados fiscais FALHA — o operador tenta salvar e recebe 400 em dois
  caminhos (criar e editar), o produto grava mas o bloco fiscal não. Bloqueia o fluxo de cadastro
  de QUALQUER produto que toque um campo fiscal, hoje, independente de b65 existir.
Estoque (aqui): a escrita continua funcionando. Entrada, Saída, Ajuste e Transferência gravam
  normalmente; o que quebra é a LEITURA de uma coluna (Tipo, Data) e um resumo (contadores) na
  tela de consulta. Ninguém deixa de registrar um movimento por causa disto.
```

Pela régua de "pré-requisito vs. conforto" (o caminho do operador que fecha o fluxo): o fluxo de
**registrar** um movimento fecha hoje, com ou sem a correção. O fluxo de **consultar** o histórico
não fecha direito, mas é consulta, não confirmação de uma transação — a classe que a skill cita
como raramente pré-requisito. Isso não é motivo para ignorar o achado; é motivo para não pagar o
ritual completo de uma versão `.cN` própria (branch, plano, QA, PR) por um bug que, sozinho, não
impede ninguém de trabalhar.

O que muda o cálculo é que **`b68` está prestes a promover exatamente esta tela** ao papel de aba
"Histórico" do fluxo novo. Se o Bloco B (abas) for construído em cima do componente como está
hoje, a funcionalidade que a versão existe para entregar nasce mostrando "Tipo: -", "Data: -" e um
resumo zerado em toda linha — o dia 1 do recurso novo já é o dia 1 do defeito visível. Corrigir
**depois** de empacotar em aba custaria tocar o mesmo arquivo duas vezes dentro da mesma janela de
poucos dias; corrigir **antes**, como primeiro commit do mesmo branch, é a mesma ordem que a régua
de fatiamento pede ("contrato confirmado antes de tela que o consome") — só que aqui o "contrato"
que precisa estar certo é o nome do campo que a nova aba vai exibir.

**O que o Bloco A entrega, para não ser "correção invisível":**

1. `MovimentoEstoqueResponse` do frontend passa a declarar `tipo`/`dataMovimento` (nomes reais do
   C#, `MovimentoEstoqueResponse.cs:5-21`), e todo lugar que lê `tipoMovimento`/`criadoEm`
   (`MovimentosEstoquePage.tsx:53,56,58`, `estoqueUxUtils.ts:8-37,89-95`) passa a ler os nomes
   certos.
2. `TipoMovimentoEstoque` do frontend ganha os três valores que faltam
   (`TransferenciaSaida=8`, `TransferenciaEntrada=9`, `EstornoBaixaReserva=10`,
   `Erp.Domain/Estoque/TipoMovimentoEstoque.cs:12-20`) — sem isso, mesmo com o nome do campo
   corrigido, toda transferência (que sempre gera os tipos 8 e 9) cai no `String(tipo ?? '-')` e
   mostra o número cru.
3. `tests/contract/operational-backend.contract.spec.ts:130` troca `requireOptionalNumber` por uma
   checagem que **exige** o campo presente sob o nome novo (`tipo`), para que a próxima vez que
   alguém rodar essa spec com credenciais reais ela prove alguma coisa. Isto é o custo de provar
   sendo pago, não cortado: eu não tenho como rodar essa prova hoje (precisaria de backend real,
   fora de política sem pedido explícito), mas deixo a prova capaz de falhar da forma certa, que é
   exatamente o critério de aceite de gate deste projeto (`risk.yaml`, "gate é aceito por ficar
   vermelho onde deve").
4. `tests/e2e/fixtures/logosoft.ts:711` deixa de espelhar o sintoma (`tipoMovimento`/`criadoEm`) e
   passa a espelhar o contrato (`tipo`/`dataMovimento`) — senão o E2E mockado continua verde depois
   da correção, por estar testando contra o próprio bug.

**O que não faço**: não declaro a Divergência 2/3 como "confirmada" no sentido forte do padrão de
execução — é uma cadeia de evidência de código (record C#, ausência de atributo, ausência de
política global), sem chamada HTTP real. Se estiver errada — se existir algum override que a
leitura de código não pegou — o pior caso é a coluna continuar mostrando `'-'` exatamente como
mostra hoje: não piora nada, porque não existe leitura correta hoje para regredir.

## 3. D-B — Entrada, Saída e Histórico em abas: sistema básico, sem tocar o avançado

**Posição: dentro. Só o sistema básico (`features/estoque/**`, rotas `/estoque/entradas`,
`/estoque/saidas`, `/estoque/movimentos`). O "avançado" (`/estoque/avancado`) não é tocado.**

O item do plano nunca cita o avançado, e o avançado já resolveu a própria organização em abas
(`EstoqueAvancadoPage.tsx`, três abas: Inventários operacionais, Ajustes, Bloqueios) — não há nada
para "consolidar" ali. O único jeito de o avançado entrar nesta conversa seria se alguém propusesse
**unificar** os dois sistemas (mesmo Ajuste, mesmo Inventário) — isso é a Divergência 10 do
inventário, e fica fora (ver lista "fora" em §8): são duas entidades de domínio diferentes
(`Inventario` vs. `InventarioEstoqueOperacional`), sem relação no C#, e fundir isso é decisão de
modelagem irreversível que nenhuma leitura de tela decide sozinha.

**Custo de consolidar agora** (as três rotas básicas em uma tela com `TabView`): o arquivo que essa
consolidação precisa tocar — `routePermissions.ts` — é o **mesmo arquivo** que D-F (abaixo) já
precisa tocar para corrigir a ilusão de acesso de saldos/movimentos. Fazer os dois na mesma
alteração é mais barato que fazer em duas versões: uma única revisão da regra de rota de
`/estoque/{entradas,saidas,movimentos}`, um único teste de guard atualizado. Farei essa observação
explícita para quem plane o recorte técnico, porque é uma dependência de ordem, não estética:
**corrigir o guard de rota tem de acontecer no mesmo commit que reorganiza as rotas**, não antes
nem depois — mexer duas vezes na mesma regra multiplica a chance de uma reintroduzir o que a outra
corrigiu.

**Custo de não consolidar** (deixar as três rotas como estão, só ajustando o resto do plano): o
item do plano simplesmente não é entregue — Entrada, Saída e Histórico continuam três telas sem
relação visual, o que não é errado, só não é o que a `b68` promete. Não vejo motivo técnico para
não entregar; a única razão de recuar seria a rodada de design não aceitar o padrão de
guarda-por-aba (como o avançado já faz — `EstoqueAvancadoPage.tsx:14`, abre para quem tem
qualquer uma das quatro permissões, cada aba desabilita por conta própria). Se essa rodada de
design rejeitar esse padrão, D-B não muda de "dentro" para "fora" — muda de forma, não de conteúdo,
e isso não é corte, é implementação.

## 4. D-C — `origemId` e `documento` na transferência: os dois entram, com o mesmo tratamento que os três formulários irmãos já têm em produção

**Posição: dentro, os dois campos, replicando o padrão que Entrada/Saída/Ajuste já usam.**

Antes de propor isto, chequei se aceitar `origemId` como campo digitado violaria o anti-padrão do
padrão de execução ("Aceitar GUID digitado para vínculo de entidade"). Não viola, e o motivo está
no próprio domínio: `TransferirEstoqueUseCase.cs:103` faz
`transferenciaId = request.OrigemId ?? Guid.NewGuid()` — o backend **gera um GUID sozinho** se o
campo vier vazio, e nada valida esse valor contra outra tabela (`TransferirEstoqueUseCase.cs:113-114`
usa o mesmo valor nas duas pernas só como correlação). Não é vínculo com uma entidade que exista em
outro lugar — é um token de correlação opcional, do qual o próprio backend não depende para
funcionar. O anti-padrão fala de digitar o Id de um Produto, Cliente, ou Pedido no lugar de um
seletor por busca; aqui não há "o quê" buscar.

Mais importante para o corte: **este exato tratamento já está em produção** nos outros três
formulários de movimento (inventário, seção 2: "`OrigemId` ... sim (opcional, sem seletor guiado —
campo de texto livre tratado como GUID opcional)" para Entrada, Saída e Ajuste). Recusar o mesmo
campo na Transferência não evita o padrão — só cria uma inconsistência entre quatro telas que fazem
a mesma operação de domínio (movimentar estoque), uma delas diferente sem razão. `Documento` já é
texto livre puro nos três irmãos; replicar é o caso mais simples de todos.

**O que isso fecha**: as duas `LACUNA` que o gate já rastreia desde a `b58.c3`
(`gate-contract-request-fields.mjs:376-377`), hoje apontando para o número morto `b66`
(divergência do próprio gate, citada no inventário) — a correção do destino da `LACUNA` acontece
na mesma entrega, senão a `b68` fecha com uma referência a uma versão que não existe mais no plano.

**Custo de provar que não corto**: `tests/unit/estoquePayload.test.ts:31-34` trava hoje que
`buildTransferenciaEstoquePayload(...)` produz um objeto **sem** `origemId`/`documento` — esse
teste muda de asserção na mesma entrega (de "não contém" para "contém quando preenchido"), porque
senão reprova por design, não por defeito. Não é um teste que corto; é um teste que atualizo porque
o comportamento que ele travava deixou de ser o alvo.

## 5. D-D — origem do ajuste (B-3): o dropdown fica fora inteiro, dos dois lados

**Posição: fora. Nem o ajuste básico nem o avançado ganham dropdown de origem nesta versão.**

O inventário fechou os dois lados da pergunta B-3 e nenhum sustenta um dropdown honesto:

```text
Ajuste básico (POST /api/estoque/ajustes): origemModulo é string livre, NotEmpty, MaxLength(80),
  sem enum nem catálogo em lugar nenhum do C# (busca `enum OrigemModulo`/`OrigemModuloEstoque`/
  `CatalogoOrigemModulo` em src/ e docs/, zero resultado — inventário §3). Um dropdown aqui não tem
  de onde vir: seria hardcode disfarçado de catálogo.
Ajuste avançado (POST /api/estoque/avancado/ajustes): o campo nem existe no request
  (`CriarAjusteEstoqueRequest`, oito campos, nenhum OrigemModulo — `EstoqueAvancadoRequests.cs:9`).
  A origem é fixada pelo domínio (`AjusteEstoqueOperacional.cs:73,79`) e nunca chega a ser input.
  Não há o que colocar num dropdown porque não há campo para preencher.
```

O plano pede "dropdown só com catálogo publicado (B-3)" — a condição do próprio texto ("só com
catálogo publicado") já é a resposta: o catálogo não existe, então a condição não se cumpre, nos
dois sistemas. Construir um dropdown de qualquer forma repetiria a Divergência 8 do inventário —
`origemEstoqueOptions` em `ReservaEstoqueDialogs.tsx:21-26`, quatro valores fixos no frontend sem
catálogo por trás — que o próprio texto do plano cita como o padrão a evitar ("Hardcode no
frontend apenas disfarça texto livre"). Copiar um defeito já documentado como defeito não é opção.

**O que fico decidindo, não negociável**: manter o comportamento atual nos dois lados —
`InputText` livre no ajuste básico (já funciona, não regride), nenhuma mudança no avançado (o campo
já não existe como input, nada a fazer). Isso não é adiar a decisão da tela; é reconhecer que a
tela já está no único estado honesto possível hoje.

**Consequência que muda o resto do plano**: com D-D fora, **`b68` deixa de depender de B-3**. A
tabela "As perguntas que destravam a onda" lista `B-3 → b68`; essa dependência só existe porque o
único item do plano que usava B-3 era este dropdown. Removido o item, a pendência externa
desaparece da versão inteira — o mesmo raciocínio que a D67 já usou para priorizar Cliente/
Fornecedor sobre Estoque ("zero pendência externa" venceu "pendência parcial"). `b68`, com D-D
fora, fica 100% decidível com o que já sabemos, sem esperar resposta de ninguém.

**Gatilho de volta**: backend publica um catálogo real de `origemModulo` para movimento manual
(endpoint de listagem, ou um enum documentado e estável) — aí o dropdown do ajuste básico entra
como fatia aditiva, sem reabrir nada desta versão. Reversível: sim, é campo de formulário, não
payload nem cache compartilhado.

## 6. D-E — Histórico: filtros sim, paginação real não — o backend só sustenta o primeiro

**Posição: os filtros que o backend já aceita entram (`filialId`, `produtoId`, `localEstoqueId`,
`inicio`, `fim` — `EstoqueController.cs:48-54`); paginação de servidor fica fora, porque não existe
parâmetro `page`/`pageSize` no endpoint.**

Isto não é um corte meu — é o que o contrato permite. `ListarMovimentosEstoqueUseCase.cs:26-28` e
`EstoqueRepository.cs:52-60` trazem todas as linhas que casam com o filtro, sem `Skip`/`Take`.
"Paginação" no sentido em que o plano usa a palavra — o servidor devolver uma página por vez — não
é uma tela para desenhar, é um endpoint que não existe: `MISSING_CONTRACT`, não decisão de escopo.
O que sobrevive hoje (paginação **visual**, `records.slice(first, first + rows)` sobre a lista
inteira já carregada) continua exatamente como está — não decido regredir isso, porque não tenho
com que substituí-lo.

Os cinco filtros de query, ao contrário, **existem** no backend e reduzem o volume trafegado
mesmo sem paginação real — cabe entrar como filtro de busca na aba Histórico, e ligar isso é o
tipo de trabalho que já é "chamador" no dia 1 (a aba Histórico é o único consumidor, e passa a
existir na mesma versão).

**Risco que carrego sem resolver, declarado, não medido**: o volume real de
`GET /api/estoque/movimentos` não foi medido (sem acesso a banco populado — mesma limitação que o
inventário já registrou). O comportamento é estruturalmente sem teto (cada transferência gera duas
linhas, cada baixa de reserva uma, cada recebimento de compra uma —
`ReceberPedidoCompraUseCase.cs:238`), mas isso já é verdade hoje, antes de qualquer coisa que `b68`
construa; a reorganização em aba não piora nem herda um problema novo, herda um problema existente.
Não proponho um limite artificial no cliente (ex.: cortar em N linhas) porque isso seria inventar
um comportamento que ninguém pediu e que esconderia dados reais sem aviso — pior que o problema
atual. Registro como risco a monitorar, não como item a construir esta versão.

## 7. D-F — ilusão de acesso e o GUID digitado em bloqueios

**Posição: as duas divergências de guard cuja correção só CONCEDE ou reordena checagem
(Divergência 14 e 15) entram em `b68`, no mesmo commit que mexe em `routePermissions.ts` por causa
de D-B. O GUID digitado em bloqueios (parte residual da Divergência 13) fica fora.**

Classificação de `accessRisk` (`.claude/graph/risk.yaml`), item por item:

```text
Divergência 14 — /estoque/saldos e /estoque/movimentos caem no catch-all
  (routePermissions.ts:28), que deixa passar quem só tem ESTOQUE_MOVIMENTAR/ESTOQUE_RESERVAR/
  ESTOQUE_INVENTARIO_GERENCIAR sem ESTOQUE_CONSULTAR; o componente então bloqueia com
  UnauthorizedState porque exige ESTOQUE_CONSULTAR (SaldosEstoquePage.tsx:36,
  MovimentosEstoquePage.tsx:36).
  accessRisk: ILUSAO — quem passa a ser barrado na ROTA já era barrado no COMPONENTE; ninguém que
  hoje completa uma operação deixa de completar. Mesma classe que a b62 já corrigiu para
  /estoque/bloqueios.
  Exige (risk.yaml): CHANGELOG dizendo, com todas as letras, que nenhuma operação que hoje conclui
  deixa de concluir. Faço essa entrada no CHANGELOG de b68, não deixo implícito.

Divergência 15 — ReservasEstoquePage exige ESTOQUE_RESERVAR até para LISTAR (:49), mas o backend
  aceita ESTOQUE_CONSULTAR sozinho para o GET (ReservasEstoqueController.cs:22-23).
  accessRisk: NENHUM — corrigir isto só CONCEDE (quem tem ESTOQUE_CONSULTAR sem ESTOQUE_RESERVAR
  passa a enxergar a listagem, que hoje já podia ver pelo backend e não podia pela tela).
  Ninguém perde nada. Exige: nada além do gate normal.
```

Por que bundlar com D-B em vez de tratar como item isolado: as duas correções vivem no mesmo
arquivo (`routePermissions.ts`) que a consolidação de rotas de D-B já precisa editar. Fazer isso em
duas passagens (uma versão que mexe no arquivo por causa das abas, outra depois que mexe de novo
por causa do guard) é o dobro de revisão sobre a mesma regra, sem nenhum ganho — é exatamente o
tipo de reordenação que "parece natural" mas não tem dependência real contra ela: aqui a dependência
real é "mesmo arquivo, mesma revisão".

**O que fica fora, com risco carregado e não resolvido**: `BloqueiosEstoqueTab.tsx:82-83` pede o
operador digitar o GUID do bloqueio à mão para liberar/cancelar, porque não existe
`GET /api/estoque/avancado/bloqueios` de listagem (`EstoqueAvancadoController.cs:118-155`, só
`POST`). Isto é uma violação nomeada do anti-padrão ("aceitar GUID digitado para vínculo de
entidade") — diferente do `origemId` da Transferência (D-C), aqui o GUID **é** identificador de uma
entidade real (o bloqueio), só que sem endpoint de busca. Não corrijo isto em `b68` porque não há
correção só de frontend possível: sem `GET` de listagem, não existe de onde popular um seletor. Não
é corte por conforto — é ausência de contrato. Também não removo as ações de liberar/cancelar como
"solução" (isso reduziria uma capacidade que talvez alguém já use sabendo o GUID por outro canal —
o próprio inventário registra essa hipótese como pendência não resolvida), porque remover
capacidade que já funciona para quem tem o dado é `accessRisk: CAPACIDADE`, e eu não tenho decisão
explícita do usuário nem ordem de concessão para pagar esse preço.

**Gatilho de volta**: backend publica `GET` de listagem de bloqueios, ou confirmação de que o fluxo
pretendido é mesmo "alguém te passa o Id por outro canal" — nesse caso, o mínimo que eu aceitaria
sem esperar mais é trocar o texto de ajuda do campo para dizer isso explicitamente, em vez de deixar
o campo parecer uma falha de UI. Registro essa segunda opção como candidato barato, não como
posição fechada — decido isso só se sobrar orçamento de versão, não é pré-requisito de `b68`
fechar.

## 8. As três listas

```text
DENTRO
  - Bloco A: nome de campo (tipo/dataMovimento) e enum (8,9,10) corrigidos em MovimentoEstoque;
    contrato ao vivo (operational-backend.contract.spec.ts) e fixture E2E deixam de espelhar o
    sintoma.
  - Bloco B: Entrada/Saída/Histórico do sistema básico em abas, mesmo padrão de guarda por aba do
    avançado.
  - origemId e documento na Transferência, mesmo tratamento dos três formulários irmãos.
  - Filtros de Histórico que o backend aceita (filialId, produtoId, localEstoqueId, inicio, fim).
  - Guard de /estoque/saldos e /estoque/movimentos corrigido (Divergência 14, ILUSAO).
  - Guard de /estoque/reservas ampliado para aceitar ESTOQUE_CONSULTAR na leitura (Divergência 15,
    NENHUM).
  - Correção do destino morto da LACUNA no gate (b66 → referência viva).

FORA (com gatilho de volta)
  - Dropdown de origem do ajuste, básico e avançado (D-D).
    Gatilho: backend publica catálogo/enum real de origemModulo para movimento manual.
  - Paginação real de servidor no Histórico (D-E).
    Gatilho: backend expõe page/pageSize em GET /api/estoque/movimentos.
  - GET de listagem de bloqueios / remoção do GUID digitado (D-F residual).
    Gatilho: backend publica o endpoint, ou confirma o fluxo "Id vem de outro canal" por escrito.
  - Unificação dos dois sistemas de Inventário, básico e avançado (Divergência 10).
    Gatilho: rodada de arquitetura dedicada que decida qual domínio é canônico.
  - Exibir quantidadeAnterior/Posterior/ReservadaAnterior/ReservadaPosterior (Divergência 5).
    Gatilho: necessidade de auditoria/reconciliação que dependa de ver saldo antes/depois na tela.
  - Afrouxar FilialOrigemId/FilialDestinoId para aceitar nulo na Transferência (Divergência 6).
    Gatilho: caso funcional real de transferência sem filial definida.
  - origemModulo visível na Transferência, hoje invisível/hardcoded 'ESTOQUE' (Divergência 9).
    Gatilho: rodada de design decidir que a paridade visual entre os quatro formulários importa
    mais que o custo de tocar o formulário de novo.
  - Colunas extras do Inventário básico (abertoEm, fechadoEm, motivoFechamento, quantidadeSistema,
    diferenca — Divergência 12).
    Gatilho: alguém reportar que falta visibilidade de auditoria no fechamento de inventário.

DEPOIS (não é fora, é ordem)
  - Nada identificado que dependa estritamente de `b68` fechar primeiro. Todos os itens "fora"
    dependem de uma resposta externa (backend ou decisão de produto), não de uma versão futura
    específica desta onda.
```

## 9. Sequência dentro de `b68` (não é reindexação da onda — é ordem interna da versão)

```text
Bloco A (primeiro) → Bloco B (depois), dentro do mesmo branch/versão.
  Dependência: a aba "Histórico" do Bloco B lê o mesmo componente que o Bloco A corrige. Construir
  B sobre A quebrado entrega o recurso novo já com o defeito visível no dia 1. Não há ordem
  inversa defensável aqui — não é preferência, é "contrato de resposta corrigido antes da tela que
  o consome" (regra da régua de fatiamento).

routePermissions.ts (D-F) entra na mesma revisão que a consolidação de rotas de D-B, não antes
  nem depois em commit separado — mesma regra, mesma revisão, custo de revisão pago uma vez.

D-C (Transferência) é independente dos outros dois e pode ser feito em paralelo — não depende de A
  nem de B, e nada em A/B depende dele.

Nenhuma reindexação da onda. b69 (Venda) continua dependendo de b65-b68, sem mudança na dependência
  declarada pela D67, porque D-D (o único item que ligava b68 a B-3) saiu do escopo.
```

## 10. Fatiamento — o que `b68` entrega quando fechar

```text
Observável na tela:
  - Coluna "Tipo" e "Data" da tela de Movimentos/Histórico passam a mostrar valor real (hoje
    mostram '-' sempre); resumo de entradas/saídas/reservas passa a contar de verdade (hoje é
    sempre 0); transferências aparecem com rótulo de tipo, não número cru.
  - Entrada, Saída e Histórico do estoque básico viram abas de uma tela única, guarda por aba
    (quem só tem ESTOQUE_CONSULTAR vê Histórico; quem tem ESTOQUE_MOVIMENTAR vê as três).
  - Transferência de estoque ganha os campos Origem (Id) e Documento, mesmo padrão dos outros três
    formulários de movimento.
  - Histórico ganha filtro por filial, produto, local e período, batendo com os parâmetros que o
    backend já aceita.
  - Quem só tinha ESTOQUE_CONSULTAR passa a acessar /estoque/saldos, /estoque/movimentos e a
    listagem de /estoque/reservas sem ser barrado por checagem de rota/componente mais estrita que
    o contrato.

Teste ou gate que protege:
  - Teste de payload cobrindo tipo/dataMovimento corretos e os três valores novos do enum
    (8, 9, 10), incluindo caso nominal de transferência (gera os dois tipos na mesma operação).
  - tests/contract/operational-backend.contract.spec.ts:130 exige presença do campo sob o nome
    novo, não mais optional silencioso.
  - tests/e2e/fixtures/logosoft.ts:711 espelha o contrato, não o sintoma.
  - tests/unit/estoquePayload.test.ts:31-34 atualizado para exigir origemId/documento quando
    preenchidos na Transferência.
  - Teste de guard para as três rotas corrigidas (saldos, movimentos, reservas), com sessão por
    conjunto de permissões, no padrão de guardPermissionMapMenuRules.test.ts já citado pelo
    inventário.
  - gate-contract-request-fields.mjs: as duas LACUNA da transferência saem da lista; o destino
    morto 'b66' é corrigido.

Documento:
  - Entrada no CHANGELOG.md com dois blocos nomeados (Bloco A: correção de Movimentos; Bloco B:
    abas, Transferência, guardas), mesmo padrão que b66 usou para Cliente/Fornecedor — uma
    corretiva futura pode mirar um lado sem reabrir o outro.
  - Seção operacional do CHANGELOG com a frase exigida pela classe ILUSAO (Divergência 14):
    nenhuma operação que hoje conclui deixa de concluir.
```

## 11. Trade-offs aceitos

```text
1. Corrigir o nome de campo/enum de Movimentos sem confirmação HTTP real.
   Perde: certeza de runtime — a correção se apoia em leitura de código (record C#, ausência de
   JsonPropertyName/NamingPolicy) mais a suíte de contrato tornada capaz de provar, não numa
   chamada de fato executada.
   Dói quando: existir algum mecanismo de serialização que a leitura de código não capturou —
   nesse caso a tela continuaria mostrando '-' exatamente como hoje (não regride).
   Reversível: sim — é remapeamento de nome de campo no frontend, sem mudança de payload nem de
   contrato do backend.

2. Dropdown de origem do ajuste fora, dos dois lados (D-D).
   Perde: o item nomeado explicitamente no texto do plano da onda não é entregue nesta versão.
   Dói quando: alguém do negócio realmente precisar padronizar a origem do ajuste manual e
   descobrir que ainda é texto livre sem validação.
   Reversível: sim — é campo de formulário sobre um catálogo que ainda não existe; nenhum payload
   nem cache muda ao entrar depois.

3. Paginação real do Histórico fora — endpoint não sustenta.
   Perde: a listagem continua carregando tudo de uma vez, sem teto, crescendo com cada
   transferência/baixa/recebimento.
   Dói quando: o volume de movimentos por empresa passar de alguns milhares (estimativa do
   inventário sobre o padrão de código, não uma contagem medida em banco) e a tela ficar lenta.
   Reversível: sim — filtro de servidor já mitiga parte do volume; paginação de verdade é aditiva
   quando o backend expuser page/pageSize.

4. GUID digitado em Bloqueios permanece sem correção.
   Perde: continua violando o anti-padrão nomeado no padrão de execução — o operador digita um Id
   real de entidade à mão, sem seletor.
   Dói quando: alguém errar o GUID e liberar/cancelar o bloqueio errado, sem chance de escolher
   numa lista.
   Reversível: não totalmente por conta própria do frontend — depende de endpoint novo do backend;
   por isso não conto isto como corte reversível meu, conto como risco carregado sem solução
   disponível nesta versão.

5. Guard de reservas e de saldos/movimentos corrigidos no mesmo commit da reorganização de rotas.
   Perde: nenhuma capacidade de ninguém — os dois ajustes são NENHUM/ILUSAO. O trade-off aqui é de
   escopo do diff: routePermissions.ts muda por dois motivos na mesma revisão (reorganização +
   correção de guard), o que exige teste de guard cobrindo os dois efeitos juntos.
   Dói quando: nunca, na prática — é o oposto de dívida: evita revisar o mesmo arquivo duas vezes.
   Reversível: sim, mudança de regra de rota é reversível por natureza.
```

## 12. O que eu abro mão

```text
- Abro mão de exigir confirmação HTTP real antes de corrigir o nome de campo/enum de Movimentos
  (D-A). Decido agir sobre evidência de código forte, mais o reforço da prova viva
  (operational-backend.contract.spec.ts), porque a alternativa — esperar alguém rodar aquele teste
  com credenciais de produção/staging — não tem prazo, e o custo de estar errado é zero regressão
  (a tela já mostra '-' hoje). Se essa leitura estiver errada, é o `arquiteto-plataforma-frontend`
  ou o `inventariante-contrato-tela` quem tem a fonte para me corrigir, não uma opinião minha.

- Abro mão de entregar o item do plano "origem do ajuste como dropdown" nesta versão (D-D), embora
  esteja escrito literalmente no texto de `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`, seção `b68`. Não
  faço isso de ânimo leve: é discordar do documento que travou a onda. A base do corte é que a
  própria condição do plano ("só com catálogo publicado") não se cumpre em nenhum dos dois
  sistemas — não é eu preferindo cortar, é a pré-condição do próprio item nunca tendo sido
  satisfeita. Se o `arquiteto-operacao-erp` tiver evidência de negócio que eu não vi (por exemplo,
  um catálogo informal já em uso fora do sistema que devesse virar a base do dropdown), retiro o
  corte.

- Não abro mão de nenhum gate ou teste existente. Não corto `gate-contract-request-fields.mjs`, não
  corto `estoquePayload.test.ts`, não corto o guard de rota, não corto o teste de contrato ao vivo
  — ao contrário, é este último que eu insisto em **consertar** em vez de deixar mudo (ver §1).

- Corte que NÃO faço por falta de gatilho seguro: remover as ações de liberar/cancelar bloqueio
  para "esconder" o antipadrão do GUID digitado. Seria trocar uma violação por uma perda de
  capacidade real (`accessRisk: CAPACIDADE`) sem decisão explícita do usuário nem ordem de
  concessão — pior que deixar como está. Registrado como corte que não encontrei seguro, não como
  corte que fiz.

- Abro mão de decidir sozinho a forma exata da consolidação de abas (D-B) — se vira uma rota nova
  com `?tab=` ou se as três rotas antigas viram redirect para uma rota única é decisão de
  navegação/URL que cabe ao `arquiteto-plataforma-frontend`; fixo só a regra inegociável: a
  correção de guard de D-F acontece na mesma revisão que essa mudança de rota, não em duas.
```

## 13. Como discordar (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` se ele defender manter "dropdown de origem" em `b68`
> replicando o padrão hardcoded de `origemEstoqueOptions` (Reserva) para o Ajuste.** Isso não é
> pré-requisito do marco em jogo (fechar entrada/saída/histórico/transferência transacionais)
> porque o ajuste básico já funciona hoje com texto livre, sem bloquear nada — e o próprio texto do
> plano nomeia esse hardcode como o padrão a evitar, não a copiar. Proponho fora por ora, gatilho
> de volta: backend publica catálogo real. Reversível: sim, é campo de formulário sem payload nem
> cache compartilhado.

> **Discordo de `arquiteto-plataforma-frontend` se ele defender adiar a correção do
> nome de campo/enum (Bloco A) para uma versão futura, por falta de confirmação HTTP.** O custo de
> esperar não é neutro: `b68` está prestes a promover a mesma tela para "Histórico", e sem a
> correção o recurso novo nasce quebrado. A confirmação HTTP que ele pediria depende de uma prova
> (`operational-backend.contract.spec.ts`) hoje calibrada para nunca acusar o defeito mesmo se
> rodada — não é uma espera neutra, é esperar por uma prova inútil. Reversível: sim, e o pior caso
> de agir errado é idêntico ao estado atual (coluna em branco).

> **Discordo de `arquiteto-design-system` se ele defender resolver a Divergência 10 (unificar os
> dois sistemas de Inventário) dentro de `b68`, sob o argumento de consistência visual entre
> básico e avançado.** Não é pré-requisito do marco em jogo (movimentação transacional), é
> modelagem de domínio (duas entidades C# diferentes, sem relação), e é irreversível sem gatilho
> — não corto, mas também não construo: não encontrei corte seguro para incluir isso agora. Se ele
> tiver argumento de que a inconsistência visual já causa erro de operador hoje, retiro esta
> discordância e escalo para pedir uma rodada de arquitetura dedicada, não para resolver aqui.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "arquitetura",
  "assunto": "estoque",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/10-escopo-estoque.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Correção de MovimentoEstoqueResponse.tipo/dataMovimento e do enum TipoMovimentoEstoque (8,9,10) entra em b68 como Bloco A, primeiro que o Bloco B (abas); a prova ao vivo (operational-backend.contract.spec.ts) e a fixture E2E deixam de espelhar o sintoma. Não vira .cN separado, não espera confirmação HTTP.", "reversivel": true, "gatilho": "evidência de mecanismo de serialização diferente do lido no C#, que reverteria o remapeamento de nome" },
    { "id": "D-B", "titulo": "Entrada/Saída/Histórico do sistema básico em abas, com guarda por aba no padrão que o /estoque/avancado já usa; o sistema avançado não é tocado", "reversivel": true, "gatilho": "rodada de design rejeitar o padrão de guarda-por-aba, exigindo outra forma de tela (não muda o conteúdo, muda a casca)" },
    { "id": "D-C", "titulo": "origemId e documento entram na Transferência com o mesmo tratamento (texto livre) que Entrada/Saída/Ajuste já têm em produção; fecha as duas LACUNA rastreadas pelo gate e corrige o destino morto 'b66'", "reversivel": false, "gatilho": "não se aplica — é inclusão que fecha lacuna de contrato já rastreada, não corte" },
    { "id": "D-D", "titulo": "Dropdown de origem do ajuste (B-3) fica fora, básico e avançado — nenhum dos dois sustenta catálogo publicado hoje; b68 deixa de depender de B-3", "reversivel": true, "gatilho": "backend publica catálogo/enum real de origemModulo para movimento manual" },
    { "id": "D-E", "titulo": "Histórico ganha os filtros que o backend aceita (filialId, produtoId, localEstoqueId, inicio, fim); paginação real de servidor fica fora por ausência de contrato (sem page/pageSize no endpoint)", "reversivel": true, "gatilho": "backend expõe page/pageSize em GET /api/estoque/movimentos" },
    { "id": "D-F", "titulo": "Guard de /estoque/saldos e /estoque/movimentos corrigido (Divergência 14, accessRisk ILUSAO) e guard de /estoque/reservas ampliado para aceitar ESTOQUE_CONSULTAR na leitura (Divergência 15, accessRisk NENHUM), na mesma revisão que a consolidação de rotas de D-B; GUID digitado em Bloqueios (Divergência 13 residual) fica fora, sem correção possível só no frontend", "reversivel": true, "gatilho": "para o item residual: backend publica GET de listagem de bloqueios, ou confirma por escrito o fluxo 'Id vem de outro canal'" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de manter dropdown de origem do ajuste replicando o hardcode de Reserva", "impacto": "medio" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "possível defesa de adiar a correção de nome de campo/enum de Movimentos até haver confirmação HTTP real", "impacto": "alto" },
    { "de": "arquiteto-design-system", "ponto": "possível defesa de unificar os dois sistemas de Inventário (básico/avançado) dentro de b68 por consistência visual", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "O backend confirma, via resposta HTTP real, que MovimentoEstoqueResponse serializa 'tipo'/'dataMovimento' (não 'tipoMovimento'/'criadoEm')?", "decide": "se o remapeamento de nome proposto no Bloco A está certo, ou se existe algum mecanismo de serialização não encontrado na leitura de código" },
    { "tipo": "funcional", "pergunta": "Existe algum consumidor real do GUID de bloqueio vindo de 'outro canal' (ex.: processo de Qualidade), ou o campo digitado é puro acidente de implementação sem uso de fato?", "decide": "se o item residual de D-F fica fora sem mais ação, ou se pelo menos o texto de ajuda do campo precisa mudar nesta versão" },
    { "tipo": "backend", "pergunta": "Há previsão de origemModulo ganhar catálogo/enum publicado para movimento manual de estoque?", "decide": "quando D-D volta a ficar disponível como fatia aditiva" }
  ],
  "riscos": [
    "A correção de nome de campo/enum de Movimentos (D-A) se apoia 100% em leitura de código C# (ausência de JsonPropertyName, ausência de NamingPolicy global) — sem confirmação HTTP real, por não haver backend em execução nem pedido de subir Docker nesta rodada.",
    "Volume de GET /api/estoque/movimentos não foi medido (sem acesso a banco populado); a afirmação de crescimento sem teto é sobre o padrão do código (ausência de Skip/Take), não uma contagem observada.",
    "Bundlar a correção de guard (D-F) na mesma revisão que a consolidação de rotas (D-B) reduz custo de revisão, mas aumenta o raio do diff em routePermissions.ts — um teste de guard mal escrito nessa revisão esconderia dois problemas em vez de um.",
    "O GUID digitado em Bloqueios permanece uma violação nomeada do anti-padrão de execução, sem correção possível só no frontend nesta versão — risco aceito e declarado, não resolvido."
  ]
}
```
