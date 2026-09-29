# Debate 12 — escopo e entrega — `compra-financeiro` (candidato a `v1.11.0a8b70`)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend`, `arquiteto-design-system`, mesmo briefing. Fonte: inventário
`docs/arquitetura/debate/12-inventario-compra-financeiro.md` (achados CF-1 a CF-10, B-4, B-12).

## 0. Base fixada

```text
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
  → 1.11.0-a.8.b69   1.11.0a8b69

ls docs/fatias/ | tail -8
  → ...v1.11.0a8b68-estoque.md, v1.11.0a8b69-venda.md
    (nenhum arquivo de b70 ainda — a fatia não existe)

git log --oneline -5
  → 0fc5d03 test(b69): prova de permissões afirma as duas coberturas pendentes da D81 pelo nome
    96a820d feat(release): v1.11.0a8b69 — Tabelas de preço, fila, aprovação
    fb1477f docs(b69): rodada 11 fecha Venda ...
```

`b69` fechou (release commitado no topo da `main`; a branch corrente já está aberta sobre ele, sem
bloqueio pendente). O próximo slot funcional é `b70`, exatamente como a D67 travou. Não proponho
reindexação. `b71` (Faturamento) segue dependendo de `b59`–`b70` pela mesma decisão — nada nesta
rodada muda essa dependência.

## 1. D-A (Q1) — reversão de compra: UI honesta sobre o que existe, não construção de capacidade que não existe

**Posição: dentro, versão restrita. `b70` entrega uma tela que não mente sobre reversão de
compra — não entrega reversão de recebimento, porque ela não existe em nenhuma camada do
backend.**

O inventário (CF-4, seção 2) mediu três pontas e fechou o caso: nenhum endpoint de estorno/
reversão de recebimento existe (`grep` zero em `Erp.Application/Compras` e
`Erp.Api/Controllers/Compras`), o pedido só pode ser cancelado **antes** de qualquer recebimento
(`PedidoCompra.Cancelar` recusa depois de `ParcialmenteRecebido`/`Recebido`), e o único ponto de
reversão de todo o fluxo é `EstornarPagamento` da `ContaPagar` gerada — que não toca estoque nem
quantidade recebida do item. Construir um botão "desfazer recebimento" no frontend seria inventar
uma capacidade que a API não tem — exatamente o anti-padrão do padrão de execução ("inventar
endpoint, campo, enum ou regra fiscal").

O que "reversão explícita" pode significar nesta versão, sem inventar nada:

1. O estorno de pagamento (que já existe e já funciona, seção 6 do inventário — `EstornoFinanceiroDialog`)
   continua sendo o único caminho de reversão, e a tela **diz isso com todas as letras**: no
   detalhe do pedido de compra recebido (parcial ou total), um aviso explícito (não um botão morto)
   informa que o recebimento não pode ser desfeito pela tela, e que a única reversão possível é o
   estorno do pagamento gerado — que não devolve estoque nem quantidade recebida.
2. Nenhum botão "estornar recebimento" é criado. Nenhum texto promete o que o backend não cumpre —
   o mesmo critério que a D69 já aplicou para Classificação de Pessoa sem endpoint de reativar.

**O que vira pergunta ao backend, não escopo desta versão**: se a ausência de reversão de
recebimento é intencional (corrigir só com recebimento complementar/divergência) ou lacuna a
fechar. Essa é a pergunta B-19, nova nesta rodada — o inventário já a registra como pendência 1,
eu só formalizo o número.

**Por que não bloqueio a versão por essa pergunta**: diferente da D77 (onde agir sem confirmação
HTTP corrigia um defeito observável — tela sempre vazia), aqui não há defeito a corrigir: o
comportamento atual (nenhuma reversão de recebimento) é o comportamento real do sistema hoje, e
declará-lo na tela não piora nada. Esperar a resposta de B-19 para fechar `b70` significaria
travar uma versão inteira por uma pergunta sem prazo — o mesmo erro que a régua de fatiamento
adverte ("pergunta externa pendente é escopo em suspenso e custa zero", não motivo de bloqueio).

## 2. D-B (Q2) — origem do título: rótulo nos dois módulos, sem link nem filtro nesta versão

**Posição: dentro, nos dois módulos, como rótulo. Link ao documento de origem e filtro por
origem ficam fora, como conforto.**

Divido em duas correções independentes, porque os dois módulos estão em estágios diferentes:

- **Básico (`ContasFinanceirasPage.tsx`)**: já mostra a coluna "Origem" com o nome certo
  (`origemFinanceiraLabel`), mas o enum do frontend só tem 6 dos 8 valores do backend (CF-2). Um
  título com `origem = OrdemServico(7)` ou `Frota(8)` cai em "-" hoje. Completar o union
  (`types/erp.ts:94-101`) e as opções (`financeiroUiUtils.ts`) para os 8 valores é correção de
  enum, do mesmo tipo que já entrou como Bloco A em `b69` — reversível, sem payload novo, sem
  contrato a confirmar (o `enum` já está lido do C# no inventário, linha a linha).
- **Avançado (`ContasAvancadoTab.tsx` e o card de detalhe)**: `origemModulo`/`origemId` chegam e
  **nenhum componente os lê** (CF-3, `grep` zero). Aqui o corte não é de enum, é de exibição
  ausente — a coluna/campo simplesmente não existe. Entra uma coluna "Origem" que mostra
  `origemModulo` como texto (é `string?` livre no backend, sem catálogo fechado ainda — B-3 segue
  pendente) e, quando `origemId` existir, um texto auxiliar (não um link clicável).

**Por que não entra link nem filtro nesta versão**: um link precisa saber para onde navegar, e
isso depende do tipo de origem ser reconhecível e ter rota própria — no básico isso só é
verdadeiramente resolvido para `PedidoVenda` (rota existe: `/vendas/pedidos/[id]`); as outras
origens (`NotaFiscal`, `Compra`, `Contrato`, `AjusteAutorizado`, e as duas novas) não têm
navegação óbvia ou o documento de origem nem sempre existe como tela própria hoje. No avançado,
`origemModulo` é string livre sem catálogo — linkar exigiria adivinhar o mapeamento. Rótulo é
pré-requisito (a origem existe e o operador precisa vê-la); link é conforto que exige mapeamento
módulo a módulo, e fica fora com gatilho.

## 3. D-C (Q3) — Contas a Receber: restringir a Manual na tela, como Pagar; pergunta formal ao backend

**Posição: dentro. O dropdown de origem em Contas a Receber manual passa a oferecer só `Manual`
e fica desabilitado, no mesmo padrão de `ContaFinanceiraFormDialog.tsx:57-63` que já existe para
Pagar (P3). A validação D7 equivalente no backend (`CriarContaReceberUseCase`) vira pergunta
formal, não decisão que eu tomo pelo backend.**

O inventário (CF-1) mostra que a capacidade hoje é degradada, não real: a UI já avisa
(`unsupportedOriginReference`) que `NotaFiscal`/`Contrato`/`AjusteAutorizado` não têm busca de
referência, e envia `origemId: null` mesmo assim — um título nasce "marcado" com uma origem de
sistema sem nenhum vínculo. Isso é o oposto do título da rodada ("origem visível" também precisa
dizer "origem verdadeira"). Restringir na tela não inventa uma regra de negócio nova — é a mesma
regra que o próprio Contas a Pagar já aplica (D7), só replicada no lado espelhado da mesma tela
(`ContaFinanceiraFormDialog` atende os dois tipos com o mesmo componente).

**Por que não espero o backend**: a mudança é só de UI (estreitar as opções do dropdown), não
muda contrato nem payload — reversível em uma linha se o produto decidir manter a capacidade. Ao
contrário do que eu faria se a mudança fosse no backend (aí sim seria decisão exclusiva dele), a
tela pode escolher não oferecer uma opção que hoje produz um aviso de "sem suporte".

**O que vira pergunta ao backend/produto, não decisão minha**: se `CriarContaReceberUseCase`
deveria ganhar a mesma validação D7 que `CriarContaPagarUseCase` já tem — isso é mudança de
contrato/regra de domínio, fora do que o frontend decide. Fica como pendência formal (a mesma que
o inventário já registrou como pendência 3).

**Risco que carrego**: não medi se algum fluxo de produção depende hoje de marcar
`Contrato`/`NotaFiscal`/`AjusteAutorizado` sem vínculo real (ex. migração de saldo antigo) — não
tenho acesso a banco de produção nesta sessão. Registro isso na seção "o que eu abro mão".

## 4. D-D (Q4) — caminhos de compra: mostrar o que o contrato permite mostrar, sem inventar o resto

**Posição: parcialmente dentro.**

- **`CotacaoCompraId` no Pedido de Compra (CF-5) — fora, pergunta ao backend.** O dado existe no
  domínio (`PedidoCompra.cs:19,29`) e morre antes do DTO: `PedidoCompraMapper.Mapear` não o
  projeta. Não há como a tela mostrar "este pedido veio da cotação N" porque o backend nunca
  envia o campo nesse endpoint — `MISSING_CONTRACT`, não corte de conforto. Vira B-22.
- **`solicitacaoCompraId` na tela de Cotação — dentro, mas é verificação, não construção.** O
  campo já trafega (`CotacaoCompraResponse.solicitacaoCompraId`), e o inventário registra "não
  verificado" se `CotacaoCompraDetalhePage.tsx` já o exibe. Entra como item pequeno: confirmar e,
  se ausente, adicionar — custo mínimo porque o dado já chega, sem contrato novo.
- **`ItensLocalEstoque` na aprovação de cotação (CF-6, metade comportamental) — fora.** O item
  nasce sem `localEstoqueId` até o recebimento, onde já é recuperável
  (`ReceberPedidoCompraUseCase.cs:91`, `itemReceber.LocalEstoqueId ?? itemPedido.LocalEstoqueId`).
  Não bloqueia o fluxo de compra fechar — o pedido segue até o recebimento normalmente. Construir
  o campo no diálogo de aprovação é capacidade nova (escolher local de estoque antes do
  recebimento), não correção de um caminho quebrado.
- **`localEstoqueId` como tipo obrigatório no frontend quando o backend declara anulável (CF-6,
  metade de tipo) — dentro.** É uma mentira de tipo que hoje não quebra (a tela já se defende em
  runtime), mas o gate de contrato de campos (D-H, seção 9) vai apontar essa divergência se eu
  não corrigir agora — mais barato fechar os dois no mesmo commit do que abrir o gate e encontrar
  a mesma divergência de novo em outra rodada.

## 5. D-E (Q5) — CF-7: progresso de recebimento entra; numeração e valor bruto ficam fora

**Posição: dentro para `quantidadeRecebida`, `quantidadePendente`, `status` por item. Fora para
`sequencia` e `valorBruto`.**

Diferente de CF-5/CF-6 (dado que o backend nunca serializa), aqui o dado **já é entregue**
(`ItemPedidoCompraResponse.QuantidadeRecebida/QuantidadePendente/Status`, seção 3 do inventário) —
só falta declarar no tipo do frontend e renderizar na tabela de itens que já existe em
`PedidoCompraDetalhePage.tsx`. Não é MISSING_CONTRACT, é campo entregue e ignorado — o caso mais
barato de fechar que existe: sem contrato novo, sem endpoint novo, sem tela nova, só declarar o
tipo e adicionar colunas/badge na tabela existente. É também o item que mais diretamente ataca o
título da rodada: sem esses três campos, a tela não tem como distinguir item pendente de item
recebido dentro de um pedido `ParcialmenteRecebido` — a mesma lacuna que torna D-A (reversão
honesta) incompleta sem visibilidade de progresso.

`sequencia` (ordena no backend, sem uso de exibição declarado) e `valorBruto` (valor bruto
pré-desconto, sem necessidade funcional apontada por ninguém até agora) ficam fora: são campos
entregues e sem uso, mas sem urgência — diferente de `status`/`quantidadeRecebida`/
`quantidadePendente`, que servem diretamente ao tema da rodada.

## 6. D-F (Q6) — título de venda: já existe, nenhuma ação nova em `b70`

**Posição: fora, sem gatilho de volta porque não há nada quebrado.**

`GerarContaReceberDePedidoVendaUseCase` já é acionado por endpoint e tela próprios
(`POST /api/financeiro/contas-receber/pedido-venda/{id}`, botão "Gerar por pedido" em
`ContasFinanceirasPage.tsx:117`), exige pedido `Faturado`, e barra duplicidade por origem. Isso já
está em produção — não é `b71` (Faturamento emite/corrige nota) nem `b70` (que trata origem/
reversão de título já existente). A única coisa que este tema tem em comum com `b70` é que a
origem `PedidoVenda` precisa aparecer corretamente rotulada — e isso já é coberto por D-B (básico
já mostra `origem` com nome certo; só faltavam os dois valores extras do enum, que não são
`PedidoVenda`).

## 7. D-G (Q7) — `FINANCEIRO_CAIXA_GERENCIAR`/`FINANCEIRO_BANCO_GERENCIAR`: `accessRisk: NENHUM`, medido, remoção segura

**Posição: dentro. Remoção do union e do catálogo, classificação `NENHUM` — não `ILUSAO`, e não
difere da D81 no resultado da medição, só no módulo.**

Medi com `grep -rn "FINANCEIRO_CAIXA_GERENCIAR\|FINANCEIRO_BANCO_GERENCIAR" --include=*.ts
--include=*.tsx .` (excluindo `node_modules`): três ocorrências, todas em
`features/seguranca/permissoesCatalogo.ts:93-94` e `types/erp.ts:294-295` — nenhuma em guard, em
`routePermissions.ts`, ou em `AppMenu.tsx`. É o mesmo padrão que a D81 mediu para
`VENDAS_PRECO_MINIMO_SOBRESCREVER`/`POLITICA_COMERCIAL_GERENCIAR`, e o critério que separou
`NENHUM` de `ILUSAO` naquela decisão foi justamente esse: quando não existe nenhum guard, regra de
rota ou item de menu condicionado à permissão, não há botão que alguém deixe de ver — a
permissão nunca abriu nem escondeu nada no frontend. `ILUSAO` pede um guard real que hoje é
recusado pelo backend; aqui não há guard nenhum. A diferença que a pergunta Q7 sugeria ("isso
difere da D81") **não se confirma pela medição** — é o mesmo caso, no módulo Financeiro.

**O que não medi, e registro como risco**: a D81 teve confirmação adicional por consulta ao banco
dev (`erp.permissoes`, 0 linhas). Eu não tenho credencial de banco nesta sessão — a medição aqui é
só por grep de código. Como o próprio critério do `risk.yaml` para `NENHUM` fala de "o guard só
ganha permissão, ninguém perde nada" no nível do *código*, a ausência de medição de banco não muda
a classificação, mas é uma lacuna de evidência que registro.

## 8. D-H (Q8) — gate estendido a título e pedido de compra; CF-10 corrigido no mesmo commit

**Posição: dentro, os dois.**

Estender `scripts/gate-contract-fields.mjs` a `ContaPagarResponse`/`ContaReceberResponse`/
`PedidoCompraResponse`/`ItemPedidoCompraResponse` é o mesmo mecanismo que a D71 (Estoque) e a D77/
D82 (Tabela de Preço, Pedido de Venda) já aplicaram — cada correção de campo desta rodada (CF-1
rótulo, CF-6 anulabilidade, CF-7 três campos novos) é exatamente o tipo de divergência que esse
gate existe para travar. Não estender o gate agora significa que a próxima rodada encontra as
mesmas lacunas de novo, sem prova vermelha que as pegue primeiro.

CF-10 (seis linhas de `legacyReferences` no allowlist descrevendo rotas já corrigidas) é limpeza
de baixo custo (seis linhas removidas) que entra junto porque quem mexe no gate de contrato nesta
rodada já está olhando para os mesmos arquivos de auditoria — não abre frente nova.

## 9. D-I (Q9) — `b70` fecha como versão única, em três blocos

**Posição: uma versão só, não dividida.** Mesmo raciocínio da D82 (`b69`): os blocos não têm
dependência técnica forte entre si (Financeiro e Compras são módulos de arquivo distintos), o
tema da rodada é um só ("origem e reversão explícitas"), e dividir pagaria o ritual completo
(branch, plano, QA, PR) duas vezes por um recorte que cabe inteiro numa revisão.

## 10. As três listas

```text
DENTRO
  Bloco A — Financeiro (origem)
    - OrigemFinanceira ganha OrdemServico(7)/Frota(8) no union e nas opções (básico).
    - Financeiro avançado passa a exibir origemModulo/origemId (rótulo, sem link) na listagem
      e no card de detalhe.
    - Contas a Receber manual restringe o dropdown de Origem a "Manual" (espelha P3/D7 de Pagar).
    - Remoção de FINANCEIRO_CAIXA_GERENCIAR/FINANCEIRO_BANCO_GERENCIAR do union e do catálogo
      (accessRisk NENHUM, medido por grep).
    - gate-contract-fields.mjs ganha ContaPagarResponse/ContaReceberResponse.

  Bloco B — Compras (progresso e reversão honesta)
    - ItemPedidoCompraResponse ganha quantidadeRecebida/quantidadePendente/status; a tabela de
      itens do pedido exibe progresso de recebimento parcial.
    - localEstoqueId no tipo do frontend passa a Guid? (anulável, como o backend), mantendo o
      fallback defensivo já existente.
    - Detalhe do pedido de compra recebido ganha aviso explícito: recebimento não pode ser
      desfeito pela tela; a única reversão possível é o estorno do pagamento gerado, que não
      devolve estoque nem quantidade recebida.
    - gate-contract-fields.mjs ganha PedidoCompraResponse/ItemPedidoCompraResponse.

  Bloco C — dívida documental (baixo custo, sem dependência dos outros dois)
    - Confirmar/expor solicitacaoCompraId na tela de Cotação, se ainda ausente.
    - Remoção das 6 linhas obsoletas de legacyReferences em
      scripts/backend-contract-map.allowlist.json (CF-10).

FORA (com gatilho de volta)
  - Reversão real de recebimento de compra (desfazer estoque/quantidade recebida) — não existe
    endpoint nem regra de domínio; MISSING_CONTRACT.
    Gatilho: resposta a B-19 e publicação do endpoint/regra pelo backend.
  - CotacaoCompraId exibido no Pedido de Compra ("veio da cotação N") — o backend nunca serializa
    o campo nesse endpoint.
    Gatilho: backend inclui CotacaoCompraId em PedidoCompraResponse (B-22).
  - ItensLocalEstoque no diálogo de aprovação de cotação — recuperável no recebimento, não
    bloqueia o fluxo de compra fechar.
    Gatilho: operação apontar necessidade concreta de definir local de estoque antes do
    recebimento, ou o recebimento deixar de ser o ponto de recuperação.
  - sequencia e valorBruto do item de pedido de compra — entregues, sem uso funcional apontado.
    Gatilho: necessidade concreta (numeração própria de linha, conferência de valor bruto).
  - Link clicável de origem ao documento de origem, nos dois módulos financeiros — rótulo é
    pré-requisito, link é conforto que exige mapear rota por tipo de origem.
    Gatilho: operação apontar necessidade de navegação rápida a partir do título.
  - Filtro por origem nas listagens de título — mesmo raciocínio do link.
    Gatilho: idem.
  - Extensão da validação D7 (origem só Manual) para dentro do backend de Contas a Receber — é
    mudança de contrato/regra de domínio, decisão do backend/produto.
    Gatilho: resposta à pendência formal (equivalente à antiga pendência 3 do inventário).
  - Situação de compra / homologação de fornecedor (B-12) — já fora pelo próprio plano; nenhum
    use case de Pedido de Compra lê Homologado.
    Gatilho: resposta a B-12.

DEPOIS (não é fora, é ordem)
  - Nada identificado que dependa estritamente de b70 fechar primeiro além do que a D67 já
    travou. b71 (Faturamento) segue dependendo de b59-b70, sem mudança de sequência proposta.
```

## 11. Sequência dentro de `b70`

```text
Bloco A (primeiro) → Bloco B → Bloco C, no mesmo branch/versão.
  Dependência: nenhuma técnica entre os três (arquivos de módulos distintos: financeiro,
  compras, gate/allowlist). A ordem por severidade: A fecha defeitos hoje visíveis (título com
  origem "-", avançado sem exibir origem nenhuma, Contas a Receber aceitando origem falsa) —
  mesmo critério de priorização que a D77 já usou para "Bloco A" em b69. B adiciona capacidade
  nova (progresso de recebimento) e a mensagem honesta de reversão — o núcleo do título da
  rodada, mas não corrige um defeito hoje observável, então vem depois de A. C é limpeza
  documental, sem urgência, entra por último ou em paralelo se sobrar tempo.

Nenhuma reindexação da onda. b71 (Faturamento) continua dependendo de b59-b70 pela D67.
```

## 12. Fatiamento — o que `b70` entrega quando fechar

```text
Observável na tela:
  - Contas financeiras (básico) não mostram mais "-" para título com origem OrdemServico/Frota.
  - Financeiro avançado passa a mostrar a origem do título (hoje não mostra nenhuma).
  - Contas a Receber manual não oferece mais origem "de sistema" sem vínculo real — só Manual,
    como Pagar já faz.
  - Pedido de compra mostra, por item, se já foi recebido/parcialmente recebido/pendente — hoje
    a tela não distingue isso.
  - Pedido de compra recebido mostra aviso explícito de que não há reversão de recebimento, só
    estorno do pagamento gerado (que não desfaz estoque).
  - Duas permissões que não abrem nenhuma tela nem botão saem da tela de grupos de acesso.

Teste ou gate que protege:
  - ContaPagarResponse/ContaReceberResponse e PedidoCompraResponse/ItemPedidoCompraResponse no
    BACKEND_TYPE_MAP de gate-contract-fields.mjs, prova vermelha contra o estado atual (mesmo
    mecanismo da D71/D77/D82).
  - Teste unitário cobrindo o enum OrigemFinanceira com os 8 valores (regressão contra CF-2).
  - Teste cobrindo que o dropdown de origem de Contas a Receber manual só oferece Manual
    (regressão contra CF-1).
  - Teste cobrindo quantidadeRecebida/quantidadePendente/status renderizados na tabela de itens.
  - Teste de guard/catálogo confirmando que as duas permissões órfãs saem do union sem quebrar
    nenhuma tela existente (nenhum componente as referencia hoje, confirmado por grep nesta
    rodada).

Documento:
  - Entrada no CHANGELOG.md com os blocos nomeados (A: origem financeira; B: progresso e
    reversão honesta de compra; C: dívida documental), mesmo padrão que b68/b69 usaram.
  - Registro das perguntas B-19, B-20 (renumerada de B-3 se aplicável — origem OrdemServico/
    Frota já atribuída em algum módulo fora do recorte), B-21, B-22 no plano da onda.
```

## 13. Trade-offs aceitos

```text
1. Restringir Contas a Receber manual a origem "Manual" sem confirmação do backend/produto.
   Perde: possibilidade (hoje degradada, com aviso "sem suporte") de marcar um título como
   Contrato/NotaFiscal/AjusteAutorizado sem vínculo real.
   Dói quando: algum fluxo de produção depender hoje dessa marcação sem vínculo (ex. migração de
   saldo antigo) — não medido, sem acesso a banco de produção nesta sessão.
   Reversível: sim — é dropdown; reabrir as opções depois é aditivo, sem payload em jogo.

2. Declarar a ausência de reversão de recebimento de compra (D-A) em vez de esperar B-19.
   Perde: nada de capacidade (a capacidade nunca existiu); perde-se só a chance de a versão
   entregar reversão real, se a resposta viesse a tempo.
   Dói quando: B-19 responder "é lacuna a fechar" e a operação já tiver acumulado recebimentos
   errados no meio tempo sem caminho de correção — risco herdado, não criado por b70.
   Reversível: sim quanto ao texto da tela (é mensagem, some quando a capacidade existir); não
   retroativo aos recebimentos já registrados errados, mas isso já é verdade hoje.

3. Remover as duas permissões órfãs (CF-9) sem consulta ao banco de produção.
   Perde: confiança adicional que a D81 teve (0 linhas medidas no banco dev) e que eu não tenho
   aqui.
   Dói quando: algum grupo de acesso em produção tiver uma das duas marcadas — a remoção ainda
   não tira capacidade real (nenhum endpoint as usa), mas tira a marcação visível sem aviso.
   Reversível: sim — reintroduzir no union/catálogo é aditivo.

4. Estender o gate de contrato de campos a quatro responses novos no mesmo commit das correções.
   Perde: nada imediatamente; ganha superfície de manutenção — o gate passa a poder quebrar por
   mudança aditiva do backend nesses quatro responses também.
   Dói quando: o backend mudar um desses quatro contratos sem que o ritual de atualização do
   snapshot (D83) seja seguido — o gate acusa divergência até alguém regenerar o snapshot.
   Reversível: sim — é configuração; remover do BACKEND_TYPE_MAP é reversível, embora perca a
   prova.

5. Deixar sequencia e valorBruto do item de pedido de compra fora, mesmo entregues pelo backend.
   Perde: numeração de linha própria e valor bruto pré-desconto na tela.
   Dói quando: conferência fiscal ou relatório precisar do valor bruto separado do valor com
   desconto, ou a UI precisar de uma ordem de linha estável diferente da ordem de chegada.
   Reversível: sim — são campos aditivos; declarar o tipo depois não exige mudança de contrato.
```

## 14. O que eu abro mão

```text
- Abro mão de bloquear b70 até B-19 (reversão de recebimento) ser respondida. Decido que a
  versão fecha com a tela honesta sobre a ausência de reversão, não com a reversão construída.
  A base é que o comportamento atual (sem reversão) não é um defeito que b70 introduz nem
  esconde — é o estado real do sistema, e declará-lo na tela cumpre o "explícita" do título sem
  inventar capacidade. Se o arquiteto-operacao-erp tiver evidência de que essa ausência já causa
  incidente recorrente na operação (recebimento errado sem qualquer correção possível), retiro o
  corte e escalo como bloqueio real, não decido sozinho que "declarar" basta.

- Abro mão de restringir Contas a Receber a Manual sem consulta ao banco de produção sobre uso
  real das outras origens. Decido agir porque a própria UI hoje já avisa "sem suporte" para essas
  origens — não é uma capacidade plena que estou cortando, é uma capacidade já degradada. Se
  alguém confirmar uso real em produção (mesmo degradado), retiro o corte até o backend responder
  a pendência formal sobre estender a D7.

- Abro mão de medir o banco de produção para confirmar zero uso das duas permissões órfãs
  (CF-9), diferente do que a D81 fez para o par de Vendas — não tenho credencial nesta sessão. A
  classificação NENHUM já é sustentada por medição de código (grep, zero guard/rota/menu), mas o
  reforço de banco que a D81 teve, esta rodada não tem. Registro como condição: quem executar a
  fatia deve rodar a mesma consulta (`select count(*) from erp.grupo_acesso_permissoes where
  codigo in (...)`) antes do commit, e se houver uso, nomear os grupos no CHANGELOG mesmo sendo
  NENHUM (não muda a classificação, só a transparência da entrega).

- Não abro mão de nenhum gate ou teste existente. Ao contrário: proponho estender o gate de
  contrato de campos a quatro responses novos (D-H), pagando o custo de manutenção descrito no
  trade-off 4 — não é corte de prova, é aumento de prova.

- Abro mão de construir CotacaoCompraId e ItensLocalEstoque no fluxo de aprovação de cotação
  (D-D). A base é ausência total de contrato de um lado (CotacaoCompraId nunca sai do backend) e
  ausência de urgência funcional do outro (ItensLocalEstoque é recuperável no recebimento). Se o
  arquiteto-operacao-erp apontar que definir local de estoque só no recebimento já causa atraso
  operacional medido, retiro o corte de ItensLocalEstoque e escalo como pendência de maior
  prioridade — mas ainda não como código, porque a UI não teria pra onde enviar o campo sem antes
  o schema Zod (`aprovarCotacaoSchema`) e o request aceitarem, o que por si só é decisão de
  plataforma, não minha.

- Abro mão de propor link clicável de origem ao documento fonte e filtro por origem nas
  listagens (D-B). Não é economia por preguiça: rótulo já cumpre "origem visível" como
  pré-requisito; link e filtro exigem mapear rota por tipo de origem, trabalho que hoje só é
  resolvido de forma completa para PedidoVenda. Se o arquiteto-design-system apontar que o padrão
  visual do projeto já trata "origem" como link clicável em outro módulo (precedente concreto que
  eu não encontrei nesta leitura), retiro o corte para PedidoVenda especificamente, mantendo fora
  as demais origens sem rota conhecida.
```

## 15. Como discordar (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` se ele defender construir alguma forma de "reversão
> aproximada" de recebimento de compra (ex. um lançamento manual de ajuste de estoque disfarçado
> de reversão) para cumprir o título "reversão explícita" sem esperar o backend.** Isso não é
> reversão — é um caminho paralelo que o domínio não reconhece como tal (o pedido continua
> `Recebido`/`ParcialmenteRecebido`, sem nenhum registro de que foi "desfeito"), e cria um estado
> que a próxima leitura do contrato vai encontrar como divergência nova. "Explícita" pede honestidade
> sobre o que existe, não um substituto funcional para o que não existe. Reversível: não — se a
> tela sugerir uma capacidade que o domínio não tem, alguém vai operar confiando nela antes de
> alguém perceber o engano; por isso não é corte que eu aceito sem essa ressalva.

> **Discordo de `arquiteto-plataforma-frontend` se ele defender adiar a extensão do gate de
> contrato de campos (D-H) para uma rodada de "arquitetura" separada, sob o argumento de que
> quatro responses novos de uma vez é risco de gate mal calibrado.** O precedente do próprio
> projeto (D71, D77, D82) sempre estendeu o gate na mesma versão que corrigiu o campo, e a
> "armadilha medida" que o `risk.yaml` registra (conjunto universal, filtro largo) é sobre
> generalizar demais, não sobre adicionar quatro tipos nominais um a um. Se ele apontar uma
> armadilha concreta nesses quatro responses específicos (ex. um campo que dispara falso positivo
> pela forma como o snapshot foi gerado), retiro a objeção para o response específico, não para
> os quatro.

> **Discordo de `arquiteto-design-system` se ele defender um componente visual novo (stepper/
> timeline) para o progresso de recebimento por item (D-E) como pré-requisito desta versão.** Três
> colunas/badges na tabela de itens que já existe entregam a mesma informação
> (`quantidadeRecebida`/`quantidadePendente`/`status`) sem novo padrão a manter. Um componente mais
> rico é conforto sobre um dado que a versão já expõe — não bloqueia o marco (fechar `b70` com
> origem e reversão visíveis). Reversível: sim, trocar a representação visual depois é aditivo, sem
> mudança de contrato.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "compra-financeiro",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/12-escopo-compra-financeiro.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Reversão de compra: sem endpoint/regra de domínio (CF-4), b70 entrega tela honesta (aviso explícito de que recebimento não tem reversão, só estorno de pagamento) em vez de construir capacidade inexistente. Ausência de reversão vira pergunta B-19, não bloqueio da versão.", "reversivel": true, "gatilho": "resposta a B-19 e publicação de endpoint/regra pelo backend" },
    { "id": "D-B", "titulo": "Origem do título visível nos dois módulos como rótulo: OrigemFinanceira ganha OrdemServico/Frota no básico (CF-2); avançado passa a exibir origemModulo/origemId (CF-3). Link ao documento de origem e filtro por origem ficam fora nesta versão.", "reversivel": true, "gatilho": "operação apontar necessidade de navegação/filtro concreta" },
    { "id": "D-C", "titulo": "Contas a Receber manual restringe o dropdown de Origem a Manual, espelhando P3/D7 de Contas a Pagar (CF-1). Extensão da validação D7 ao backend de Receber vira pendência formal, não decisão do frontend.", "reversivel": true, "gatilho": "confirmação de uso real em produção das origens hoje degradadas, ou resposta do backend sobre estender D7" },
    { "id": "D-D", "titulo": "CotacaoCompraId fica fora do Pedido de Compra (MISSING_CONTRACT, backend nunca serializa, vira B-22); ItensLocalEstoque fora do diálogo de aprovação de cotação (recuperável no recebimento); localEstoqueId corrigido para anulável no tipo do frontend (CF-6); solicitacaoCompraId confirmado/exposto na Cotação se ausente.", "reversivel": true, "gatilho": "backend inclui CotacaoCompraId no DTO (B-22), ou operação aponta necessidade concreta de definir local de estoque antes do recebimento" },
    { "id": "D-E", "titulo": "quantidadeRecebida/quantidadePendente/status por item entram (dado já entregue pelo backend, CF-7) para exibir progresso de recebimento parcial; sequencia e valorBruto ficam fora por falta de uso funcional apontado.", "reversivel": true, "gatilho": "necessidade concreta de numeração própria de linha ou valor bruto separado" },
    { "id": "D-F", "titulo": "Título de venda por pedido faturado já existe e funciona (endpoint e tela próprios); nenhuma ação nova em b70 além do rótulo de origem já coberto por D-B.", "reversivel": true, "gatilho": "não se aplica — não há corte, é ausência de trabalho necessário" },
    { "id": "D-G", "titulo": "FINANCEIRO_CAIXA_GERENCIAR/FINANCEIRO_BANCO_GERENCIAR saem do union e do catálogo do frontend; accessRisk NENHUM, medido por grep (zero guard/rota/menu), mesmo critério da D81.", "reversivel": true, "gatilho": "backend publica endpoint novo que volte a amarrar as permissões" },
    { "id": "D-H", "titulo": "gate-contract-fields.mjs ganha ContaPagarResponse/ContaReceberResponse/PedidoCompraResponse/ItemPedidoCompraResponse; allowlist do contract-map perde as 6 linhas obsoletas de legacyReferences (CF-10).", "reversivel": true, "gatilho": "não se aplica — é adição de prova, não corte" },
    { "id": "D-I", "titulo": "b70 fecha como versão única, três blocos (A Financeiro/origem, B Compras/progresso e reversão honesta, C dívida documental), sem dependência técnica forte entre eles, mesmo raciocínio da D82.", "reversivel": true, "gatilho": "não se aplica" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de construir uma reversão aproximada de recebimento de compra sem esperar o backend, em vez de só declarar a ausência", "impacto": "alto" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "possível defesa de adiar a extensão do gate de contrato de campos a quatro responses novos para uma rodada separada", "impacto": "medio" },
    { "de": "arquiteto-design-system", "ponto": "possível defesa de um componente visual novo (stepper/timeline) como pré-requisito para o progresso de recebimento por item", "impacto": "baixo" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-19: a ausência de qualquer caminho de reversão de recebimento de compra (CF-4) é intencional (corrigir só com recebimento complementar/divergência) ou é lacuna a fechar?", "decide": "se uma versão futura constrói reversão real de recebimento, e quando" },
    { "tipo": "backend", "pergunta": "B-20: OrigemFinanceira.OrdemServico(7)/.Frota(8) (CF-2) já são atribuídos por algum use case fora de Erp.Application/Financeiro e Compras (ex. Ordem de Serviço/Frota, fora do recorte lido)?", "decide": "se a urgência de completar o enum é maior do que a leitura desta rodada assumiu (proposto dentro de qualquer forma, por ser correção barata)" },
    { "tipo": "funcional", "pergunta": "B-21: a validação D7 (origem só Manual em lançamento sem vínculo) deve ser estendida a CriarContaReceberUseCase, fechando a assimetria com Contas a Pagar (CF-1)?", "decide": "se o backend fecha a mesma regra que o frontend já vai restringir na tela nesta versão" },
    { "tipo": "backend", "pergunta": "B-22: CotacaoCompraId (existe no domínio de PedidoCompra, nunca no DTO) entra no próximo contrato de leitura do Pedido de Compra?", "decide": "se uma versão futura pode mostrar 'este pedido veio da cotação N'" }
  ],
  "riscos": [
    "D-C (restringir Contas a Receber a Manual) não foi verificado contra o banco de produção se algum fluxo real usa hoje as origens Contrato/NotaFiscal/AjusteAutorizado sem vínculo — decisão tomada só por leitura de código (a própria UI já avisa 'sem suporte').",
    "D-G (remoção de permissões órfãs) não foi verificado contra o banco de produção se algum grupo de acesso as tem marcadas hoje — diferente da D81, que teve essa confirmação (0 linhas no banco dev); aqui só há medição de código (grep, zero guard/rota/menu).",
    "D-A (tela honesta sobre ausência de reversão) assume que declarar a limitação é suficiente para o título 'reversão explícita' desta rodada — se a operação já sofre incidente recorrente por recebimento errado sem correção, essa leitura pode estar subestimando a urgência de B-19.",
    "D-B (avançado exibe origemModulo como texto livre) depende de B-3 (catálogo de valores válidos para origemModulo) seguir sem resposta — o texto exibido pode não ter rótulo amigável até o catálogo existir, herdando o mesmo risco que o plano já registra para B-3."
  ]
}
```
