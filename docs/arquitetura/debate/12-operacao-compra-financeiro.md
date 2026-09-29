# Posição — `arquiteto-operacao-erp` — rodada 12, Compra e financeiro (`b70`)

Fonte: `docs/arquitetura/debate/12-inventario-compra-financeiro.md` (inventariante),
`docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (seção `b70`, tabela "fora de escopo", B-4/B-12/B-15),
`docs/arquitetura/DECISOES.md` (D64, D67, D77–D83 como precedente de método da rodada 11 — não há
Dn própria de Compra/Financeiro ainda). Medição direta nesta rodada:

```bash
grep -rn "FINANCEIRO_CAIXA_GERENCIAR\|FINANCEIRO_BANCO_GERENCIAR" --include=*.ts --include=*.tsx .
# só permissoesCatalogo.ts:93-94 e types/erp.ts:294-295 — nenhum guard, nenhuma rota, nenhum menu
grep -n "compras\|financeiro" layout/AppMenu.tsx
# 10 itens (6 Financeiro, 4 Compras), todos batendo com routePermissions.ts (seção "Telas e rotas"
# do inventário) — nenhum item ausente ou apontando permissão errada
```

## 1. O fluxo do operador, ponta a ponta

Três pessoas passam por este recorte com trabalhos diferentes: quem compra, quem lança/baixa
título, quem precisa desfazer algo que já aconteceu. Escrevo os três porque a `b70` promete
"reversão explícita" — se o terceiro fluxo não fecha, o título da rodada não se sustenta.

**A. Comprador monta e recebe um pedido**
1. Abre `/compras/pedidos`, clica "Novo pedido". `COMPRAS_GERENCIAR` — **fecha**.
2. Escolhe Fornecedor (`EntitySelect`), Condição de pagamento (`EntitySelect`), datas — **fecha**
   (seleção por rótulo).
3. Adiciona item: Produto, Local de estoque, Quantidade, Valor — **fecha**. Não é obrigado a passar
   por solicitação nem cotação; o backend aceita pedido direto (`CriarPedidoCompraUseCase.cs:50-88`,
   confirmado pelo inventário) e D64 já fechou a pergunta de "recusar fornecedor não homologado" como
   fora de escopo. Nenhuma pendência aqui.
4. Envia para aprovação, alguém aprova (`COMPRAS_APROVAR`) — **fecha**, fluxo já existente.
5. Chega a mercadoria. Comprador clica "Receber" (`COMPRAS_RECEBER`), lança quantidade recebida por
   item, marca "Gerar conta a pagar" — **fecha**: o título nasce aqui, com idempotência garantida por
   índice único no banco (seção 2 do inventário).
6. **Erra o recebimento** — lança quantidade errada, ou recebe o item errado. Aqui o fluxo **quebra
   de verdade, não na tela**: não existe endpoint de estorno de recebimento em lugar nenhum do
   backend (`grep -rln "EstornarRecebimento\|ReverterRecebimento\|CancelarRecebimento"
   Erp.Application/Compras Erp.Api/Controllers/Compras` → zero, CF-4). O comprador não tem para onde
   ir dentro do ERP para desfazer o que acabou de lançar errado — nem a tela pode inventar esse
   caminho, porque não há regra nenhuma para refletir.

**B. Financeiro lança e baixa um título manual**
1. Abre `/financeiro/contas-pagar` ou `/contas-receber`, clica "Nova conta" — **fecha**
   (`FINANCEIRO_GERENCIAR`).
2. Em Contas a Pagar, escolhe Origem: só "Manual" está disponível, `disabled` no resto — **fecha**,
   e é honesto (D7/P3, confirmado no inventário).
3. Em Contas a Receber, o mesmo passo **quebra silenciosamente**: o dropdown oferece
   `NotaFiscal`/`Contrato`/`AjusteAutorizado` sem nenhuma busca de referência, mostra um aviso
   genérico e deixa enviar mesmo assim (`unsupportedOriginReference`, CF-1). O operador escolhe
   "Origem = Contrato" para um lançamento que não tem contrato nenhum por trás, e o sistema aceita.
   Isso não é um passo que falta — é um passo que **mente**, porque o rótulo escolhido sugere um
   vínculo que não existe.
4. Baixa o título, ou precisa desfazer uma baixa errada: `EstornarBaixaDialog`/`EstornoFinanceiroDialog`
   filtram baixas já estornadas antes de oferecer no dropdown, exigem motivo — **fecha**, esse é o
   único ponto do recorte inteiro onde reversão de fato existe e é usável.

**C. Alguém precisa entender "de onde veio" um título, sem abrir outra tela**
1. Olha a lista de Contas a Pagar/Receber (básico), coluna "Origem" — **fecha para 6 dos 8 valores**
   do enum; um título com `OrigemFinanceira.OrdemServico` (7) ou `.Frota` (8) mostra "-"
   (`origemFinanceiraLabel` cai no fallback, CF-2). Sem confirmação de que esses dois valores já são
   gerados em produção (o inventário não achou gerador em `Erp.Application`), então **hoje** não sei
   se isso quebra alguém de verdade ou é lacuna teórica — vira pergunta (Q2 abaixo).
2. Vai ao Financeiro avançado, olha uma conta com `origemModulo`/`origemId` preenchidos pelo backend
   — **quebra**: nenhum componente lê esses dois campos (CF-3, `grep origemModulo
   features/financeiro-avancado/components/*.tsx` → zero). O dado chega e a tela não mostra. Pior
   ainda: é justamente o módulo cujo request já aceita `OrigemModulo` livre — a capacidade de
   registrar origem rica existe e não aparece em lugar nenhum na leitura.
3. Quer ir do título até o documento de origem (o pedido de compra, o pedido de venda) — **quebra**
   nos dois módulos: nem o básico nem o avançado oferecem link/navegação a partir de `origemId`. Hoje
   é um Guid opaco no wire, sem rótulo e sem destino clicável em nenhum dos dois.

## 2. Onde o fluxo quebra hoje — resumo com origem

| Passo | Módulo/tela | Quebra | Evidência |
| --- | --- | --- | --- |
| A.6 | Recebimento de compra | sem endpoint de estorno/reversão em qualquer forma | CF-4, inventário seção 2/6 |
| B.3 | `ContaFinanceiraFormDialog` (Contas a Receber) | origem de sistema sem vínculo real aceita e enviada | CF-1, `ContaFinanceiraFormDialog.tsx:62,113,142` |
| C.1 | `ContasFinanceirasPage` (básico) | 2 dos 8 valores de `OrigemFinanceira` caem no fallback `'-'` | CF-2, `types/erp.ts:94-101` |
| C.2 | `ContasAvancadoTab`/`ContaDialogs` (avançado) | `origemModulo`/`origemId` chegam e não são exibidos | CF-3 |
| C.3 | ambos os módulos | sem link ao documento de origem a partir do título | ausência confirmada por leitura de componente, sem contra-evidência |

## 3. Q1 — CF-4: a `b70` entrega tela honesta sobre reversão de compra, não reversão que não existe

**Discordo de qualquer leitura do título da `b70` ("reversão explícitas") que peça um botão de
estornar recebimento nesta versão.** Não há onde esse botão chamaria — nenhum endpoint, nenhuma
regra de domínio (CF-4, medido por `grep` no backend inteiro). Inventar esse caminho no frontend
seria regra de negócio nova sem backend por trás, proibido pela skill deste agente.

**O que a `b70` entrega no lugar**: a tela precisa **dizer** que não há reversão de recebimento, no
momento em que o operador está prestes a confirmar um recebimento — mesmo tratamento que a D79 deu
ao checkbox `reservarEstoque` na rodada 11 (explicar o efeito de uma ação irreversível, não inventar
a ação inversa). Um texto de apoio no diálogo de recebimento: "confirmar o recebimento grava a
quantidade recebida e não pode ser desfeito nesta versão; um recebimento com erro exige um
recebimento complementar ou ajuste manual de estoque fora deste fluxo, e a conta a pagar gerada só
pode ser corrigida por estorno de pagamento, sem reverter a quantidade recebida." Isso fecha o
passo A.6 do jeito que dá para fechar hoje: sem inventar capacidade, mas sem deixar o operador
descobrir a limitação por tentativa e erro.

"Reversão explícita" no lado que **existe de verdade** é o estorno de pagamento/recebimento de
título (`EstornarPagamentoRequest`/`EstornarRecebimentoRequest`, seção 6 do inventário) — aí sim a
`b70` pode melhorar o que já roda: `EstornoFinanceiroDialog` lista baixas e exige motivo, mas (regra
de operação, não de tela) precisa deixar claro que estornar o pagamento **não** desfaz a entrada de
estoque nem a quantidade recebida do item — mesmo aviso do parágrafo anterior, agora no ponto onde o
operador pode achar que estornar "desfaz a compra".

**O que eu abro mão**: não peço reversão de recebimento nesta versão, nem finjo que existe com um
botão que devolveria erro genérico. O comprador que errar uma quantidade recebida continua sem
caminho dentro do ERP — corrige por fora (planilha, novo recebimento complementar se o backend
aceitar um segundo lançamento sobre o mesmo pedido, não confirmado) até o backend responder a
pendência 1 do inventário. Aceitável **enquanto** a pergunta ao backend não voltar; deixa de ser
aceitável se o volume de recebimento errado em produção for medido e for alto — nesse caso a `b70`
não é o lugar certo para essa resposta, e sim uma versão nova assim que o backend abrir o endpoint.

## 4. Q2 — Origem do título: rótulo nos dois módulos nesta versão; link ao documento fica fora

**Rótulo (nome legível da origem) entra nos dois módulos.** É o mínimo que "origem visível" promete
e custa pouco: no básico, corrigir o enum de 6 para 8 valores (CF-2) fecha o fallback `'-'` — mas só
depois de responder a pendência 2 do inventário (se `OrdemServico`/`Frota` já são gerados por algum
módulo fora do recorte; sem essa resposta, adicionar os dois valores é seguro de qualquer forma,
porque só amplia o enum, não sujeita a nenhuma regra nova). No avançado, exibir `origemModulo` (texto
livre do backend) na tabela e no card de detalhe fecha CF-3 sem exigir nenhum campo novo — o dado já
chega, só não é lido.

**Link ao documento de origem**: fica **fora** desta versão. `origemId` é um `Guid` sem indicação de
para onde apontar de forma genérica (o mesmo `Guid` pode ser um `PedidoCompraId` ou um
`PedidoVendaId`, dependendo de `origem`/`origemModulo`) — navegar corretamente exigiria mapear cada
valor de origem para uma rota de destino, o que é possível hoje só para os casos com enum fechado do
lado básico (`Compra` → `/compras/pedidos/{origemId}`, `PedidoVenda` → `/vendas/pedidos/{origemId}`),
mas não para o avançado, onde `origemModulo` é string livre sem contrato de valores válidos (B-3,
ainda em aberto no plano). Fazer só para os dois casos fechados do básico e nada para o avançado
criaria uma tela que "às vezes" leva ao documento — pior para a rotina do que nunca levar, porque o
operador aprende a clicar e às vezes não acontece nada.

**Filtro por origem**: não entra. Nenhum dos dois módulos oferece hoje filtro de listagem por origem
(inventário não achou), e criar um filtro novo é capacidade nova de contrato de query, fora do que o
inventário mediu como existente.

**O que eu abro mão**: quem quiser confirmar "este título veio deste pedido específico" continua
tendo que copiar o número do documento (se aparecer em algum texto legível) ou pedir para o
financeiro/compras cruzar manualmente — sem link, é busca manual fora da tela. Aceitável **até** B-3
responder o catálogo de `origemModulo`, porque só aí dá para mapear origem→rota de forma completa e
sem criar navegação que funciona só às vezes.

## 5. Q3 — CF-1: restringir a tela a "manual" agora; não esperar o backend

**Restringir.** A mesma leitura que fechou D7 do lado de Contas a Pagar vale aqui: um dropdown que
oferece `NotaFiscal`/`Contrato`/`AjusteAutorizado` sem nenhuma busca de referência não é uma
capacidade a mais, é uma origem que **parece** vinculada e não é — o oposto do que "origem visível"
promete no título da rodada. O custo de restringir na tela sem o backend também recusar
(`ContaReceberValidators.cs`/`ContaReceberUseCases.cs:83-92` não têm a regra, CF-1) é que a API
continua aceitando essas três origens por qualquer outro cliente (script, chamada direta) — a
restrição de tela **não fecha o buraco**, só impede que o operador humano crie o dado ruim pela
tela.

**O custo de esperar o backend**: cada dia que passa, mais um lançamento manual nasce marcado
"Origem = Contrato" sem vínculo real, porque o dropdown continua oferecendo a opção. Isso é dado
sujo que entra no banco e não se limpa sozinho — o custo de esperar cresce com o tempo, o custo de
restringir na tela é fixo (uma mudança pequena em `ContaFinanceiraFormDialog.tsx`, replicando o
padrão já existente do lado Pagar).

**O que eu abro mão**: restringir a tela não impede que alguém já tenha lançado títulos sujos antes
da correção — não há limpeza retroativa nesta rodada, e não proponho nenhuma, porque não há como
distinguir "Contrato genuíno sem `OrigemId` porque o vínculo é anterior ao sistema" de "Contrato
apontado por engano/pressa" sem revisão humana caso a caso. Isso é droga de dado histórico que fica
para uma auditoria fora desta versão.

## 6. Q4 — Caminhos de compra: explicar com o que o DTO já entrega; CF-6 entra, CF-5 vira pergunta

**"Explicar a compra pela origem" com o que existe hoje**: o pedido nascido de cotação aprovada tem
o vínculo gravado no domínio (`PedidoCompra.CotacaoCompraId`), mas o DTO de resposta nunca o inclui
(CF-5 — `PedidoCompraMapper.Mapear` não projeta o campo). **Não dá para mostrar "este pedido veio da
cotação N" nesta versão sem o backend expor o campo** — não é ausência de tela, é ausência de dado no
wire. Isso é a pergunta ao backend mais direta da rodada (pendência 4 do inventário): o dado existe,
já está gravado, só precisa ser mapeado — é o tipo de pedido que costuma voltar rápido.

**Enquanto CF-5 não volta**: a tela pode, no máximo, dizer "pedido criado diretamente" vs. "pedido
criado a partir de solicitação/cotação" só nos casos em que outro sinal já denuncia a origem — não
há nenhum hoje (nem mesmo um booleano), então **não há caminho parcial**: sem `CotacaoCompraId` no
DTO, a explicação de origem do pedido de compra fica inteiramente fora da `b70`, não parcialmente.

**CF-6 (`ItensLocalEstoque` na aprovação de cotação): entra.** Diferente de CF-5, este não depende do
backend — o campo já existe no request (`AprovarCotacaoCompraRequest.ItensLocalEstoque`), a UI só
nunca o envia. Adicionar um seletor de local de estoque por item no diálogo de aprovação de cotação
(`AprovarCotacaoDialog`) fecha uma lacuna real: hoje o pedido nasce com `LocalEstoqueId = null` em
todo item vindo de cotação, e só é preenchido manualmente no recebimento — atrasar essa decisão para
o recebimento é aceitável operacionalmente (o inventário confirma que é recuperável lá), mas
**expor a capacidade que já existe no backend e nunca foi ligada** é ganho direto de fluxo sem
depender de ninguém.

**O que eu abro mão**: sem CF-5, o comprador que quer saber "este pedido nasceu de que cotação"
continua tendo que lembrar de cabeça ou abrir a lista de Cotações e procurar pelo fornecedor/data —
navegação manual fora da tela do pedido. Aceitável até a pergunta 4 do inventário voltar; deixa de
ser aceitável se a resposta for "não, é deliberadamente invisível", porque aí a promessa de
"caminhos de compra explicados pela origem" do plano (seção `b70`) não tem como se cumprir para o
caminho cotação→pedido, só para pedido direto (que já é visível, é a ausência do outro vínculo).

## 7. Q5 — CF-7: os cinco campos de item não entram na `b70` sem antes virar pergunta ao backend

Sem `quantidadeRecebida`/`quantidadePendente`/`status` por item, a tela não tem como mostrar
progresso de recebimento parcial — e "recebimento parcial" é estado real do domínio
(`ParcialmenteRecebido` é status do pedido). Isso é sintoma direto do mesmo problema estrutural que
CF-4: sem visibilidade por item, o operador que recebeu uma parte não sabe, olhando a tela do pedido,
o que falta chegar item a item — só o status do cabeçalho ("Parcialmente recebido"), sem o detalhe.

**Não é decisão de tela, é ausência de dado no wire** — os cinco campos existem no backend
(`Pedidos/PedidoCompraResponse.cs:24-37`) e o mapper não os projeta. Diferente de CF-6 (que é
"a UI não envia o que o backend já aceita"), aqui é "o backend tem o dado e não entrega" — mais
parecido com CF-5. **Proponho que a `b70` só use os campos se eles entrarem no DTO antes do corte da
versão** (mesma condição de CF-5); se o backend confirmar que vai mapear os 13 campos do item
(atualmente só 8 chegam), a coluna de progresso por item entra como parte natural da tela de
Recebimento, que já existe e só precisa de mais colunas. Se não vier a tempo, fica para a versão
seguinte de Compras — não travo a `b70` inteira por isso, porque o cabeçalho do pedido já mostra
`statusPedido` e isso cobre o caso mais grosso ("tem pendência" vs. "está completo"), só não o
detalhe por item.

**O que eu abro mão**: sem os cinco campos, quem recebe um pedido em duas ou mais remessas não vê,
item a item, quanto falta — precisa somar de cabeça ou manter controle fora do ERP (planilha) até a
próxima versão. Aceitável **se** o volume de recebimento parcial for baixo (a maioria dos pedidos
recebidos de uma vez só); deixa de ser aceitável se medição em produção mostrar que recebimento
parcial é rotina, não exceção — nesse caso a ausência destes cinco campos é o achado mais caro desta
rodada inteira, mais caro até que CF-4.

## 8. Q6 — Título de venda: já tem tela; pertence à `b70` só como leitura, não como redesenho

`GerarContaReceberDePedidoVendaUseCase` já tem endpoint próprio e botão na tela de Contas a Receber
("Gerar por pedido", `GerarContaReceberPedidoDialog`, confirmado pelo inventário seção 2). **Isso já
fecha hoje** — o operador financeiro que quer gerar o título de um pedido faturado não precisa sair
do módulo Financeiro para fazer isso. O que falta não é a ação em si, é o mesmo problema da seção 4C:
o título gerado por esse caminho carrega `origem = PedidoVenda` e `origemId`, mas a tela de Contas a
Receber não linka de volta ao pedido nem mostra número/cliente do pedido de origem — mesma lacuna de
"origem visível sem link" já registrada na Q2.

**Pertence à `b70`, não à `b71`.** A ação de gerar o título já está pronta e é operada de dentro do
Financeiro — Faturamento (`b71`, D67) é sobre o pedido de venda virar nota fiscal, um fluxo
diferente, mesmo que ambos partam de "pedido Faturado". Ligar Q6 à `b71` misturaria duas telas de
módulos diferentes numa mesma versão sem necessidade: a melhoria de origem visível do título de venda
é exatamente o mesmo trabalho de "rótulo de origem" da seção 4C, cabe no mesmo corte.

**O que eu abro mão**: nenhum — este passo já fecha operacionalmente hoje; só peço que o rótulo de
origem (Q2) cubra também `origem = PedidoVenda`, o que já está incluído na seção 4C e não é trabalho
adicional.

## 9. Q7 — CF-9: mesmo tratamento da D81, `accessRisk: NENHUM`, medido nesta rodada

Medi eu mesmo, como a skill pede, em vez de aceitar a leitura do inventário sem checagem própria:

```bash
grep -rn "FINANCEIRO_CAIXA_GERENCIAR\|FINANCEIRO_BANCO_GERENCIAR" --include=*.ts --include=*.tsx .
```

Resultado: só `permissoesCatalogo.ts:93-94` (rótulo do catálogo) e `types/erp.ts:294-295` (union).
Nenhuma ocorrência em `lib/security/routePermissions.ts`, `layout/AppMenu.tsx` ou em qualquer
`PermissionGuard`/`hasPermission` de componente. Conferi também `AppMenu.tsx` linha a linha nos
trechos de Compras/Financeiro (10 itens) — nenhum usa as duas permissões órfãs.

**Isso é exatamente o mesmo caso da D81** (Vendas), não uma variação: nenhum guard, nenhuma regra de
rota, nenhum item de menu depende delas hoje. O briefing pede que eu confirme se difere "medindo se
algum guard, regra de rota ou item de menu as usa hoje" — medi, e a resposta é não, igual à D81.
`accessRisk: NENHUM`. Proponho remover as duas do union e do catálogo do frontend nesta fatia, na
mesma condição da D81: o snapshot documental (`backend-permissions.snapshot.json`) continua as
listando porque é gerado do contrato/catálogo do backend que ainda não foi atualizado — cada uma
entra em `coberturaPendente` do allowlist, não editar o snapshot à mão.

**O que eu abro mão**: nada — é limpeza sem custo de fluxo, mesma lógica da D81/V9. Só ressalvo
(mesma ressalva que fiz na rodada 11): se algum grupo de acesso em produção já tiver uma das duas
atribuída, a tela de edição de grupo pode mostrar "permissão desconhecida" para esse grupo — efeito
cosmético, não perda de capacidade, avisar QA antes de subir.

## 10. Q8 — Gate e dívida documental

**Estender o gate de campos de response**: apoio, na mesma lógica da D83 (rodada 11). O gate hoje
cobre Tabelas de Preço/Pedido de Venda; estendê-lo a `ContaPagarResponse`/`ContaReceberResponse` e
`PedidoCompraResponse`/`ItemPedidoCompraResponse` fecha o mesmo tipo de buraco que P1 já mostrou ser
caro (campo renomeado silenciosamente quebra a tela). Sem isso, se a `b70` mexer nesses tipos para
resolver CF-2/CF-5/CF-6/CF-7, fica sem rede de proteção contra regressão futura — o próprio ponto da
D83 era gerar snapshot versionado do C#, não ler `../New project 3` em tempo de execução; a extensão
usa a mesma infraestrutura, não cria uma nova.

**CF-10 (allowlist desatualizado)**: não é bloqueio de gate (`audit-only-no-suppressions`, confirmado
pelo inventário), mas é dívida documental que engana quem lê o allowlist como lista de problemas
abertos. Do ponto de vista de operação (não sou eu quem decide formato de gate — isso é
`arquiteto-plataforma-frontend`), só registro que as seis linhas de `legacyReferences:28-33` deveriam
ser removidas ou marcadas como resolvidas na mesma fatia que mexe em Financeiro, porque é o momento
mais barato de fazer essa limpeza — quem já está lendo o arquivo por outro motivo.

## 11. Q9 — Fatiamento

**Uma `b70` só**, seguindo o mesmo raciocínio da D82 (Vendas): os itens em debate (rótulo de origem,
restrição de origem em Contas a Receber, CF-6, permissões órfãs, gate) são todos do mesmo par de
módulos e não têm dependência sequencial forte entre si — dá para provar tudo no mesmo QA, como a
`b69` fez em blocos A/B/C/D. Diferente da rodada 11 (onde V1 — envelope quebrado — travava
literalmente a tela de Tabelas de Preço, exigindo correção isolada antes), aqui **nenhum achado
impede o resto de funcionar**: CF-4 é ausência estrutural (não há regressão para causar), CF-1/CF-2/
CF-3 são leitura/exibição independentes entre si, CF-6 é aditivo. Não há candidato a `.cN` isolada
nesta rodada.

**Divisão em blocos dentro da `b70`** (mesmo padrão da D82): A (rótulo de origem básico+avançado,
Q2/Q6), B (restrição de origem em Contas a Receber, Q3), C (local de estoque na aprovação de cotação,
Q4/CF-6), D (permissões órfãs, Q7), E (gate estendido, Q8). CF-5, CF-7 e a reversão de recebimento
(Q1) ficam **fora do código desta versão**, condicionados às respostas do backend — a tela ganha só o
texto explicativo de Q1 (sem depender de endpoint novo), que entra no bloco B/C junto do resto do
diálogo de recebimento.

## 12. O que eu abro mão — resumo

- Sem reversão de recebimento de compra (Q1/CF-4): comprador que erra a quantidade recebida não tem
  caminho de correção dentro do ERP nesta versão — corrige por fora ou espera resposta do backend
  (pendência 1 do inventário).
- Sem link ao documento de origem a partir do título (Q2): quem quer confirmar o pedido por trás de
  um título continua cruzando manualmente por número/fornecedor, fora da tela.
- Sem filtro por origem na listagem de títulos (Q2): não é capacidade nova de contrato, fica fora.
- Sem limpeza retroativa dos títulos já lançados com origem sem vínculo antes da restrição de Q3:
  fica para auditoria fora desta versão, porque não há como distinguir caso a caso pela tela.
- Sem explicação de origem por cotação no pedido de compra (Q4/CF-5) até o backend expor
  `CotacaoCompraId` no DTO: comprador continua checando de cabeça ou pela lista de Cotações.
- Sem progresso de recebimento parcial por item (Q5/CF-7) nesta versão, condicionado à resposta do
  backend sobre os cinco campos ausentes: quem recebe em várias remessas não vê o detalhe por item,
  só o status do cabeçalho.

## 13. Impacto em módulo vizinho

- **Estoque**: o recebimento de compra grava entrada de estoque via `IEstoqueService` (sistema
  básico, mesma reconciliação pendente com o avançado já registrada em B-15/rodada 11) — a `b70` não
  mexe nisso, mas a ausência de reversão de recebimento (Q1) significa que um erro de recebimento
  também fica preso do lado de estoque: não há como desfazer a entrada gerada por um recebimento
  errado, só ajuste manual fora do fluxo de compra (que é outra tela, `Ajustes de estoque`, fora
  deste recorte).
- **Fiscal**: nenhum vínculo direto lido nesta rodada entre o recorte `b70` e conferência fiscal além
  do que já existe (`COMPRAS_CONFERENCIA_FISCAL_REGISTRAR`, tela de Recebimentos já cobre). Não
  verificado se a conferência fiscal também precisa dos cinco campos de item de CF-7 — vira pergunta.
- **Vendas**: o único ponto de contato é Q6 (geração de conta a receber por pedido de venda), e ele
  já fecha operacionalmente pela tela de Financeiro sem precisar voltar a Vendas.
- **Faturamento (`b71`)**: nenhum acoplamento de código — Q6 fica inteiramente resolvido dentro da
  `b70`, sem dependência da `b71`.

## 14. Onde discordo (antecipando os outros três)

> Discordo de quem propuser resolver CF-5 (vínculo pedido↔cotação) e CF-7 (progresso por item) com
> algum truque de frontend — por exemplo, inferir "veio de cotação" comparando `valorUnitario` do
> pedido com o da cotação, ou inferir progresso comparando quantidade do pedido com o total já
> lançado em recebimentos separados. Os dois são regra de negócio inventada sobre dado que não é
> garantidamente correto (dois pedidos podem ter o mesmo valor por coincidência; múltiplos
> recebimentos por pedido não estão listados de forma agregada em nenhuma tela hoje) — pior do que
> não mostrar nada, porque parece dado confiável e não é.

> Discordo de quem tratar CF-1 (origem sem vínculo em Contas a Receber) como "já resolvido pelo
> aviso `unsupportedOriginReference`". O aviso existe, mas não impede o envio — é aviso decorativo.
> Restringir de verdade (desabilitar as três origens sem busca de referência) é o que fecha o passo,
> não o texto ao lado do dropdown.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "arquitetura",
  "assunto": "compra-financeiro",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/12-operacao-compra-financeiro.md",
  "decisoesPropostas": [
    {
      "id": "D-A-compra-financeiro",
      "resumo": "CF-4: sem endpoint de reversão de recebimento nesta versão. A b70 entrega texto explícito no diálogo de recebimento e no diálogo de estorno de pagamento dizendo o que não pode ser desfeito, em vez de inventar um botão sem backend por trás. Reversão real de recebimento vira pergunta ao backend (pendência 1 do inventário)."
    },
    {
      "id": "D-B-compra-financeiro",
      "resumo": "Origem do título: rótulo (nome legível) entra nos dois módulos — enum de 8 valores no básico (CF-2), origemModulo exibido no avançado (CF-3), incluindo origem=PedidoVenda (Q6). Link ao documento de origem e filtro por origem ficam fora desta versão até B-3 (catálogo de origemModulo) responder."
    },
    {
      "id": "D-C-compra-financeiro",
      "resumo": "CF-1: Contas a Receber passa a restringir a origem a 'Manual' na tela, mesmo padrão de Contas a Pagar (D7), sem esperar o backend implementar a validação equivalente. Não corrige dado já lançado."
    },
    {
      "id": "D-D-compra-financeiro",
      "resumo": "CF-6 entra: seletor de local de estoque por item no diálogo de aprovação de cotação, usando o campo ItensLocalEstoque que o backend já aceita e a UI nunca envia. CF-5 (CotacaoCompraId no DTO do pedido) fica condicionado a resposta do backend — sem o dado no wire, não há tela possível."
    },
    {
      "id": "D-E-compra-financeiro",
      "resumo": "CF-7 (quantidadeRecebida/quantidadePendente/status/sequencia/valorBruto por item) só entra na b70 se o backend confirmar que vai expor os cinco campos antes do corte da versão; senão fica para a versão seguinte de Compras, sem travar o resto da b70."
    },
    {
      "id": "D-F-compra-financeiro",
      "resumo": "CF-9: accessRisk NENHUM, medido nesta rodada (grep confirma zero uso em guard/rota/menu) — mesmo tratamento da D81. FINANCEIRO_CAIXA_GERENCIAR e FINANCEIRO_BANCO_GERENCIAR saem do union e do catálogo do frontend nesta fatia."
    },
    {
      "id": "D-G-compra-financeiro",
      "resumo": "Gate de campos de response estendido a ContaPagarResponse/ContaReceberResponse e PedidoCompraResponse/ItemPedidoCompraResponse, mesma infraestrutura da D83. CF-10 (allowlist desatualizado) limpo na mesma fatia, sem bloquear gate."
    },
    {
      "id": "D-H-compra-financeiro",
      "resumo": "Uma b70 só, em blocos A (origem, Q2/Q6) / B (restrição CF-1, Q3) / C (local de estoque na cotação + texto de aviso de recebimento, Q4/Q1) / D (permissões, Q7) / E (gate, Q8) — sem candidato a .cN isolada, porque nenhum achado desta rodada bloqueia o resto de funcionar (diferente de V1 na rodada 11)."
    }
  ],
  "discordancias": [
    "Quem propuser inferir CF-5 (vínculo cotação) ou CF-7 (progresso por item) por heurística no frontend, sem o dado vir do backend, está inventando regra sobre dado não confiável — pior do que não mostrar nada.",
    "Quem tratar o aviso unsupportedOriginReference como resolução de CF-1 está confundindo aviso decorativo com restrição — o aviso não impede o envio."
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "A ausência de qualquer reversão de recebimento de compra (CF-4) é intencional — corrige-se só com recebimento complementar/ajuste manual de estoque fora do fluxo — ou é lacuna a fechar? Se vier resposta 'lacuna', qual o formato pretendido (estorno total, estorno parcial por item)?", "decide": "se a b70 (ou uma versão seguinte dedicada) ganha um endpoint/botão real de reversão, ou se o texto explicativo desta rodada é a resposta definitiva" },
    { "tipo": "backend", "pergunta": "OrigemFinanceira.OrdemServico (7) e .Frota (8) já são atribuídos por algum use case de módulo fora do recorte (Ordem de Serviço, Frota)?", "decide": "se ampliar o enum do frontend para 8 valores é correção preventiva ou já corrige um sintoma real em produção" },
    { "tipo": "backend", "pergunta": "CotacaoCompraId (domínio) e os cinco campos de progresso do item (quantidadeRecebida/quantidadePendente/status/sequencia/valorBruto) entram no próximo contrato de leitura de Pedido de Compra, e com que prazo relativo ao corte da b70?", "decide": "se Q4 (explicação de origem por cotação) e Q5 (progresso de recebimento parcial) entram no código desta versão ou ficam adiados" },
    { "tipo": "funcional", "pergunta": "A ausência de validação de origem em Contas a Receber (CF-1) já produziu títulos reais marcados com origem sem vínculo em produção/homologação? Se sim, há necessidade de auditoria/correção retroativa desses registros?", "decide": "se a restrição na tela (Q3) precisa vir acompanhada de um levantamento de dados sujos existentes" },
    { "tipo": "funcional", "pergunta": "Existe medição de volume de recebimento parcial (pedidos recebidos em mais de uma remessa) em produção?", "decide": "se a ausência de CF-7 nesta versão é risco teórico ou item urgente a priorizar mesmo sem resposta imediata do backend" }
  ],
  "riscos": [
    "CF-4 (sem reversão de recebimento) é o único ponto do recorte inteiro sem nenhum caminho de correção dentro do ERP — se o volume de recebimento errado for alto, o texto explicativo proposto nesta rodada não é suficiente, e a lacuna precisa virar prioridade de backend antes da próxima versão de Compras.",
    "Sem link ao documento de origem a partir do título, nos dois módulos — aceito nesta rodada, mas é busca manual fora da tela toda vez que alguém precisa confirmar a origem de um lançamento.",
    "CF-5 e CF-7 dependem de resposta do backend com prazo compatível com o corte da b70; se a resposta vier tarde, os blocos que dependem deles (Q4 parcial, Q5) saem da versão sem aviso prévio ao QA.",
    "Não medi nesta rodada se a conferência fiscal (RecebimentosCompraController) também precisaria dos cinco campos de CF-7 para mostrar progresso — fica como pergunta aberta, não resposta.",
    "Restringir Contas a Receber a origem Manual (Q3) sem o backend também validar deixa a API aberta para qualquer cliente que não seja esta tela continuar gravando origem sem vínculo — a correção de tela não fecha o buraco de contrato."
  ]
}
```
