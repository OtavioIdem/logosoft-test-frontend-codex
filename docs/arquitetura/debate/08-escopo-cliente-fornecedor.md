# Debate 08 — escopo e entrega — `cliente-fornecedor` (candidato a `v1.11.0a8b66`)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend`, `arquiteto-design-system`, mesmo briefing.

## 0. Base fixada

```text
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
  → 1.11.0-a.8.b65   1.11.0a8b65

ls -1 docs/IMPLEMENTACAO_*.md | tail -3
  → docs/IMPLEMENTACAO_V9_6_8_1.md, docs/IMPLEMENTACAO_V9_6_9.md, docs/IMPLEMENTACAO_V9_6_9_1.md
  (rastro histórico pré-onda; a documentação viva da onda corrente é o CHANGELOG.md, §7.6 do
  plano já fechou essa prática — não crio docs/IMPLEMENTACAO_* novo)

ls docs/fatias/ | tail -5
  → v1.11.0a8b64.c2-produto-fiscal-em-branco.md, v1.11.0a8b65-inventario.md,
    v1.11.0a8b65-produtos-fiscais.md

git log --oneline -5
  → 77c1ec5 feat(release): v1.11.0a8b65 (topo, commitado)
```

`b65` fechou (release já commitado, `CHANGELOG.md` topo confirma QA aprovado). Nenhuma versão
está bloqueada. O próximo slot funcional legítimo é `b66` — não corretivo. A tabela "Correções
fora da sequência funcional" do plano da onda cita `b58.c3` como `QA BLOCKED`, mas isso é anterior
a `b62`–`b65`, todas já commitadas depois dela; trato como entrada desatualizada do documento, não
como bloqueio real — registrado como risco de documentação, não como achado que me impede de
propor `b66`.

## 1. O que muda desde a D58: o gatilho de volta já disparou

A D58 tirou Cliente/Fornecedor de `b65` com dois gatilhos escritos: (1) inventário próprio pronto;
(2) evidência de que `b67` trava sem a configuração comercial do cliente. O inventário desta
rodada (`docs/arquitetura/debate/08-inventario-cliente-fornecedor.md`) fecha o primeiro gatilho —
cinco endpoints, semântica de gravação, catálogos e permissões, todos conferidos no C#. O segundo
gatilho **não** disparou: o fato 6 do briefing (confirmado por leitura completa de
`VendaClienteValidator`, `AdicionarItemPedidoVendaUseCase` e `PedidoVendaItemDialog.tsx`) mostra
que a venda hoje não lê nenhum dos cinco campos — preço é digitado, não calculado por tabela do
cliente. Isso não significa que a regra de negócio *deveria* continuar assim; significa que este
recorte não é pré-requisito técnico de `b67` **hoje**, e é essa pergunta técnica, não a de opinião
de produto, que me cabe responder aqui.

## 2. D-A — estrutura de tela: diálogo próprio por ação de linha, não aba

**Posição: diálogo separado, aberto por uma ação de linha nova ("Configuração comercial" em
Cliente, "Configuração de compra" em Fornecedor) — não aba dentro de `ClienteFormDialog`/
`FornecedorFormDialog`.**

Razão de custo, não de gosto: o fato 2 do briefing (`PUT` substitui o bloco inteiro; `null` apaga,
não mantém) dá a esses cinco/três campos um ciclo de vida diferente do resto do cadastro — o
formulário precisa sempre partir de um snapshot lido do registro corrente e reenviar tudo, mesmo
os campos não tocados nesta sessão. Misturar isso num único formulário que já grava
`empresaId/filialId/pessoaId/codigo/limiteCredito/observacao` (Cliente, 6 campos hoje) por um
único `PUT /clientes/{id}` teria duas semânticas de gravação diferentes convivendo no mesmo
`onSubmit` — risco real de o desenvolvedor enviar o payload errado no endpoint errado, ou de um
`Salvar` genérico acabar tocando dois recursos numa chamada só. Diálogo próprio isola a chamada.

Nenhum dos dois diálogos de cadastro hoje tem `TabView` (inventário §4). Introduzir abas seria
adotar um padrão de tela novo nesses dois componentes — decisão de template, território do
`arquiteto-design-system`, não algo que decido sob o chapéu de corte de escopo. Um diálogo
autônomo reaproveita o padrão que já existe em produção (`FormDialog`/diálogo modal simples,
mesma forma de `ClienteFormDialog` hoje) sem inventar infraestrutura de aba. Se o design-system
propuser abas mesmo assim, aceito — não é um corte irreversível de minha parte, é orçamento
default até haver argumento melhor.

**O que fico decidindo, independente de quem escolher aba vs. diálogo:** a tela, qualquer que
seja sua casca, **sempre** carrega o snapshot atual (os cinco/três campos já vêm na resposta de
`GET /api/clientes`/`GET /api/fornecedores` hoje — divergência #1/#2 do inventário, só falta o
tipo do frontend declará-los) e **sempre** reenvia o bloco inteiro no `PUT`, nunca um PATCH
parcial. Isso não é opcional — é a única forma de não apagar em silêncio um valor gravado por
outra sessão.

## 3. D-B — homologação: ações de linha, padrão bloquear/desbloquear crédito

**Posição: dentro, sem negociação, mesmo padrão de duas ações de estado mutuamente exclusivas por
linha que `ClientesPage` já tem em produção para crédito.**

`Homologar` (sem motivo, `POST` sem corpo) e `RevogarHomologacao` (com motivo obrigatório) cabem
literalmente no componente que já existe: `ReasonDialog`, hoje reutilizado por
`bloquear`/`desbloquear`/`inativar` em `ClientesPage.tsx` e por `inativar` em
`FornecedoresPage.tsx` (inventário §4). Custo de replicar é baixo — uma ação sem motivo (chamada
direta) e uma com motivo (o `ReasonDialog` já resolve). Um indicador "Homologado" na listagem
(coluna ou badge) é o que decide qual dos dois botões fica habilitado, no mesmo padrão de
`row.creditoBloqueado` (`ClientesPage.tsx:114`).

Esta não é uma peça de conforto: sem ela, **nenhum fornecedor no sistema jamais fica homologado
pela tela** — o único caminho seria carga direta em banco, que não é produção. É exatamente a
mesma classe de achado que fechou o item 5 da rodada 07 (`tipoItemSped`): capacidade
permanentemente inacessível sem controle de UI, não campo a mais. Trato como pré-requisito da
fatia fechar, não como item negociável.

## 4. D-C — `situacao-compra`: fora desta fatia, com gatilho

**Posição: fora.** Não por causa do fato 5 isolado (parâmetro sem tela) — por causa do que esse
fato implica na prática: `podeReceberPedidoCompra`/`motivo` são **derivados** de um parâmetro de
sistema (`COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`) que não tem nenhuma tela de administração
hoje (inventário §3.4, confirmado por `grep` vazio em `features/`). Mostrar esse indicador na tela
seria expor um "não pode receber pedido de compra, motivo: bloqueio por parâmetro" sem qualquer
caminho para o operador entender ou corrigir a causa — é a classe `ILUSAO` do `risk.yaml` aplicada
a dado, não a botão: informação que não tem ação nem explicação editável atrás dela.

Diferente de `homologado` (que já está em `FornecedorResponse`, sem chamada extra, e vira ação —
homologar/revogar — que o operador entende e controla), `situacao-compra` é um endpoint de leitura
separado, cujo único consumidor hoje seria uma tela que eu não tenho evidência de que `b68`
(Compra) precise: o inventário não verificou dependência de `b68` com este endpoint, e eu não
inventei essa verificação aqui — devolvo como pendência, não como fato.

**Gatilho de volta:** (1) tela de parâmetros do sistema que exponha/edite
`COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`; **ou** (2) evidência concreta de que `b68` precisa
bloquear a criação de pedido de compra usando `podeReceberPedidoCompra` — nesse caso o corte vira
pré-requisito disfarçado e minha posição muda, igual ao padrão de discordância que registrei na
rodada 07. **Reversível:** sim — é leitura adicional pura, sem payload, sem cache compartilhado,
sem campo que o usuário digita.

## 5. D-D — `classificacaoId`: fora da UI editável, dentro do payload como round-trip

**Posição: fora do seletor editável nesta fatia; dentro como campo que a tela lê do registro
atual e reenvia sem alteração, nunca omitido do `PUT`.**

Três alternativas do briefing, descartando duas:

- **Campo fora da tela por completo (nem round-trip):** descartada. O fato 2 é explícito — omitir
  o campo do request o zera. Se o operador editar `tabelaPrecoPadraoId` e salvar sem tocar em
  `classificacaoId`, um `PUT` que não reenvie o valor atual apaga uma classificação que outra
  pessoa gravou (hoje, nem que fosse por carga direta de banco — mas o comportamento vale para
  qualquer origem futura do dado). Isso seria o mesmo tipo de dado-perdido-em-silêncio que a `b65`
  existiu para corrigir em Produto. Não repito o erro aqui.
- **Seletor por busca (`SearchSelect`), mesmo sem tela de cadastro:** descartada, por um motivo
  diferente do de `unidadeTributavelSigla` (D60, rodada 07). Lá o catálogo é uma tabela oficial
  global (Mód.04), sempre populada, sem necessidade de CRUD por definição. `Classificação de
  Pessoa` é um catálogo de negócio interno (algo como "VIP", "Revenda", "Atacado") sem **nenhuma**
  tela de CRUD no app inteiro (inventário §5, achado 4) — oferecer um seletor de busca sobre um
  catálogo que ninguém consegue povoar pela UI é a mesma classe de `ILUSAO` do item anterior:
  lista provavelmente vazia, sem caminho de correção. Também descarto, por regra explícita do
  padrão de execução, aceitar um campo de texto livre para Id (`00_padrao_de_execucao.md`:
  "Aceitar GUID digitado para vínculo de entidade" é anti-padrão listado).
- **Tela de Classificações de Pessoa como pré-requisito desta fatia:** descartada como
  pré-requisito **desta** fatia — é trabalho de CRUD de um módulo (`Pessoas`) que não pertence ao
  recorte de Cliente/Fornecedor comercial, e nada nos cinco endpoints do inventário exige que
  exista antes. Vira "depois", não "fora" (ver §7).

**Gatilho de volta do corte:** tela de CRUD (ainda que mínima — listar e cadastrar) de
Classificação de Pessoa existir. **Reversível:** sim — habilitar o campo depois é puramente
aditivo (o payload já carrega o valor correto; só ganha um controle de edição, igual ao que a
`b65` fez com `tipoItemSped`).

## 6. D-E — permissão dos catálogos: guarda escopada ao campo, replicando D61

**Posição: dentro, sem negociação.** Mesmo raciocínio da D61: quem tem `CLIENTES_GERENCIAR` sem
`TABELAS_PRECO_CONSULTAR`/`FINANCEIRO_CONSULTAR` vê os `SearchSelect` de `tabelaPrecoPadraoId` e
`condicaoPagamentoPadraoId` desabilitados com aviso explícito, não escondidos — a guarda é do
campo, não do diálogo inteiro nem da rota. Aplicar a permissão ao diálogo inteiro tiraria de quem
só falta a permissão de catálogo a edição de `diaVencimentoPreferencial`/`permiteVendaAPrazo`
(Cliente) ou `prazoEntregaMedio`/`categoriaFornecimento` (Fornecedor), que não dependem de nenhum
catálogo — mudaria `accessRisk` de `NENHUM` para `CAPACIDADE` sem decisão explícita, o mesmo erro
que a D61 já vetou para o caso irmão de Produto. Cortar a guarda inteira não economiza nada real:
sem ela, o operador vê um seletor que nunca resolve nada — `ILUSAO`, a classe mais barata de
evitar e mais cara de deixar acontecer. Não é corte disponível.

## 7. D-F — fatiamento e número: uma versão, `b66`, cadastros mestres continuam a história de `b65`

### 7.1 Uma versão só, cobrindo Cliente e Fornecedor juntos

Cliente e Fornecedor são entidades independentes (formulários, páginas, permissões e a maior parte
dos catálogos são distintos — só `condicaoPagamentoPadraoId` é compartilhado), mas isso por si só
não obriga separar em duas versões: o precedente já pago em `b64` (Empresa **e** Filial, duas
entidades distintas, uma versão) mostra que o critério de fatiamento deste projeto é tamanho e
coesão de história, não "uma entidade por versão". O tamanho combinado (5 campos + 2 ações +
indicador em Cliente/Fornecedor) é comparável ao que `b65` já entregou sozinho (4 campos + 1
dropdown + guarda). Separar em duas versões dobraria o custo de ritual (carimbo de versão,
`CHANGELOG`, QA, PR) para um ganho real pequeno — o único benefício seria isolar o risco de review
de um lado do outro, e isso pode ser preservado dentro de uma versão só, documentando os dois
blocos separadamente no `CHANGELOG` (mesmo padrão que `b64` já usou para Empresa/Filial), de forma
que uma correção pontual em Fornecedor vire `.c1` sem reabrir Cliente.

**Trade-off aceito, com custo declarado:** bundlar os dois acopla o release — se o QA bloquear por
causa da homologação de Fornecedor, a configuração comercial de Cliente (pronta e sem achado)
espera junto. Dói quando: um dos dois lados tiver um defeito de gravação real (a classe que gerou
`.c2` em Produto) e o outro lado, limpo, ficar represado até a correção. Reversível: sim — nada
impede, se isso acontecer, promover uma corretiva `.c1` que toque só o lado quebrado, exatamente
como já aconteceu com Produto (`b64.c2` corrigiu só o bloco fiscal, sem reabrir Empresa/Filial).

### 7.2 Onde entra: `b66`, com o slot atual de Estoque empurrado para `b67`

A D58 registrou dois gatilhos de volta e um deles — "decidir a numeração antes do inventário
existir é o mesmo erro que a D56 já puniu" — **não se aplica mais**: o inventário existe agora,
então numerar deixou de ser prematuro. A pergunta que resta é só **onde**, e aqui a dependência
que decide não é técnica (nenhum dos cinco endpoints deste recorte toca Estoque, Venda, Compra ou
Faturamento, nem o inverso) — é a presença de pergunta externa pendente:

```text
b66 (plano atual) — Estoque: "Origem do ajuste como dropdown só com catálogo publicado (B-3)"
  — depende de resposta do cliente sobre valores válidos de origemModulo, ainda em aberto na
  tabela "As perguntas que destravam a onda". Não bloqueia a fatia inteira (Entrada/Saída/
  Histórico em abas e origemId/documento na transferência não dependem de B-3), mas bloqueia
  parte dela — um pedaço da versão fica esperando uma resposta que ninguém pediu ainda.

Cliente/Fornecedor (este recorte) — zero pendência externa. As quatro pendências que o
  inventário registrou (estrutura de tela, onde a homologação aparece, situacao-compra,
  classificacaoId) são todas resolvidas dentro desta própria rodada (D-A a D-E) — nenhuma
  depende de resposta do cliente real ou do backend.
```

Por "o que o cliente decide, não nós": uma fatia com pergunta externa em aberto é escopo em
suspenso e custa zero enquanto a pergunta não volta. Faz mais sentido preencher o próximo slot com
o trabalho que está 100% decidível agora do que reservar `b66` para um item parcialmente esperando
B-3 e deixar Cliente/Fornecedor — pronto, sem pendência — encostado no fim da fila.

**Proposta: este recorte vira `b66`; o plano da onda reindexa Estoque → `b67`, Venda → `b68`,
Compra → `b69`, Faturamento → `b70`.** Custo de reindexar, medido, não estimado: `grep -c "b66\|
b67\|b68\|b69" docs/PLANO-FRONTEND-ONDA-OPERACAO.md` mostra que essas quatro versões só aparecem
em texto de plano e na tabela de perguntas (B-3→b66, B-5→b67, B-4→b68, B-6→b69) — nenhuma delas
tem arquivo em `docs/fatias/`, nenhuma tem entrada no `CHANGELOG.md`, nenhuma tem branch ou commit.
É reindexação de prosa, não de código ou artefato publicado — a mesma distinção que separa "corte
reversível" de "corte irreversível" na régua de fatiamento. Se o time que mantém o plano da onda
preferir não mexer nessas quatro referências (por exemplo, se já foram citadas fora deste
repositório, em conversa com quem não vê o Git), a alternativa de menor atrito é anexar este
recorte ao fim, como `b70` — funciona, mas paga o custo de "cadastros mestres" (Produto + Cliente +
Fornecedor) ficarem espalhados por toda a onda em vez de fechados em sequência, sem nenhum ganho
técnico em troca. Não decido essa segunda parte sozinho — quem mantém o arquivo do plano é quem
resolve, registro aqui a recomendação e o custo de cada lado, como a rodada 07 já fez para a
pergunta irmã.

```text
Sequência proposta:
b65 (feito)   → fecha o recorte fiscal de Produto.
b66 (este)    → Cliente (configuração comercial) + Fornecedor (configuração de compra,
                homologação/revogação, indicador). Depende só de b65 estar em produção — nenhum
                payload, cache ou permissão compartilhados; a dependência real é de calendário
                (zero pendência externa vs. b66 atual, que tem B-3 parcialmente pendente).
b67 (era b66) → Estoque. Depende de b65 + B-3 (só para o item "origem do ajuste"; o resto do
                escopo de Estoque não depende deste recorte nem de B-3).
b68 (era b67) → Venda, preço e aprovação. Depende de b65–b67 (renumerado) + B-5. Fato 6 confirma:
                não depende dos campos de configuração comercial de Cliente que b66 entrega —
                se isso mudar (venda passar a herdar tabela de preço do cliente), é decisão nova
                de b68, não retroativa a b66.
b69 (era b68) → Compra e financeiro. Depende de B-4.
b70 (era b69) → Faturamento. Depende de b59–b69 (renumerado) + B-6.
```

## 8. Fatiamento — o que `b66` entrega quando fechar

```text
Observável na tela:
  - ClientesPage ganha ação de linha "Configuração comercial", abrindo diálogo com
    tabelaPrecoPadraoId (SearchSelect, guarda TABELAS_PRECO_CONSULTAR), condicaoPagamentoPadraoId
    (SearchSelect, guarda FINANCEIRO_CONSULTAR), diaVencimentoPreferencial (número, 1-31),
    permiteVendaAPrazo (booleano). classificacaoId não editável nesta versão, preservado no
    round-trip.
  - FornecedoresPage ganha ação de linha "Configuração de compra", abrindo diálogo com
    condicaoPagamentoPadraoId (SearchSelect, mesma guarda), prazoEntregaMedio (número, >= 0),
    categoriaFornecimento (texto, máx. 80).
  - FornecedoresPage ganha duas ações de linha mutuamente exclusivas — "Homologar" (sem motivo) /
    "Revogar homologação" (com motivo, ReasonDialog) — e uma coluna/indicador "Homologado" na
    listagem.
  - Avisos de permissão ausente nos dois SearchSelect de catálogo, mesmo padrão de D61/b65.

Teste ou gate que protege:
  - Schemas Zod novos para ConfigurarComercialClienteRequest e ConfigurarCompraFornecedorRequest
    entram em scripts/gate-contract-request-fields.mjs (SCHEMA_TO_REQUEST_MAP + recordNames) —
    fecha a divergência #9 do inventário.
  - Teste de payload cobrindo os dois PUT, incluindo o caso nominal "todos os campos em branco é
    uma chamada válida" (§2 do inventário) e o caso "classificacaoId sempre reenviado sem
    alteração".
  - Teste de ação para homologar/revogar (padrão já usado em bloquear/desbloquear crédito) e para
    o guard de permissão escopada nos dois SearchSelect.
  - Estados de tela: os sete, aplicados às duas novas superfícies, reaproveitando ApiErrorPanel,
    toast, loading, disabled-com-motivo já em produção nas duas páginas.

Documento:
  - Entrada no CHANGELOG.md, com os dois blocos (Cliente / Fornecedor) descritos separadamente,
    para que uma corretiva futura possa apontar para o lado certo sem reabrir o outro.
```

## 9. Trade-offs aceitos

```text
1. Bundlar Cliente e Fornecedor numa versão só.
   Perde: acoplamento de release — bug num lado represa o outro.
   Dói quando: um dos dois lados tiver defeito de gravação real e o outro, limpo, ficar
   represado até a correção.
   Reversível: sim — corretiva .c1 pode tocar só o lado quebrado, precedente já existe (b64.c2).

2. situacao-compra fora desta fatia.
   Perde: FornecedoresPage não mostra "pode receber pedido de compra" nem o motivo de bloqueio
   por parâmetro.
   Dói quando: b68 (Compra) precisar bloquear a criação de pedido de compra usando esse dado, ou
   quando a tela de parâmetros existir e ninguém lembrar de voltar aqui.
   Reversível: sim — leitura adicional pura, sem payload, sem cache.

3. classificacaoId sem seletor editável.
   Perde: Cliente não pode ter a classificação de pessoa alterada pela tela nesta versão.
   Dói quando: alguém identificar clientes por classificação em relatório/regra e descobrir que
   ninguém consegue atribuí-la sem SQL direto.
   Reversível: sim — campo já round-tripa; falta só o controle de edição, exatamente como
   tipoItemSped esperou de b64.c2 para b65.

4. Diálogo próprio em vez de aba nos formulários de cadastro.
   Perde: se o design-system decidir depois que aba era o padrão certo, o diálogo autônomo vira
   trabalho descartado (não reaproveitável dentro de uma TabView).
   Dói quando: a rodada de design registrar essa preferência depois deste recorte já estar em
   produção.
   Reversível: parcialmente — a lógica de formulário (campos, validação, chamada) é reaproveitável
   dentro de uma aba futura; o componente de casca (diálogo modal) seria descartado, não o
   conteúdo.

5. Renumeração de b66-b69 para b67-b70.
   Perde: quem já citou "b66 = Estoque" fora do Git (conversa, e-mail, plano externo) precisa
   reaprender o número.
   Dói quando: alguém fora do repositório já tratou os números atuais como compromisso.
   Reversível: sim — é prosa, sem artefato publicado (medido: nenhum arquivo em docs/fatias/,
   CHANGELOG ou branch cita b66-b69 hoje).
```

## 10. O que eu abro mão

```text
- Abro mão de decidir sozinho entre "diálogo próprio" e "aba" para a configuração comercial/de
  compra (D-A) — fixo só o orçamento (sem TabView nova) e a regra inegociável de round-trip
  completo; a forma exata é território do design-system, e posso estar cortando errado se ele
  tiver argumento de template que eu não vi.
- Abro mão de forçar a renumeração de b66-b69 sozinho — recomendo com o custo medido, mas quem
  mantém docs/PLANO-FRONTEND-ONDA-OPERACAO.md decide se aceita ou prefere anexar ao fim (b70).
  Se a resposta for "anexar ao fim", retiro a proposta de reindexação sem reabrir o resto de D-F.
- Não abro mão de nenhum gate ou teste. Não corto gate-contract-request-fields, não corto teste de
  payload dos dois PUT, não corto o guard de D-E, não corto as ações de homologar/revogar. Se
  alguém propuser cortar algum desses para ganhar prazo, é dívida com juros, não economia.
- Corte que NÃO faço por falta de gatilho seguro: cortar por completo (sem round-trip)
  classificacaoId do payload. Cortei só a edição, não o campo — omitir o campo do PUT seria
  irreversível (apaga dado gravado por terceiros) sem nenhum gatilho de volta que desfaça o
  estrago já feito em produção. Registrado como corte que não encontrei seguro, não como corte
  que fiz.
```

## 11. Como discordar (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` em manter `situacao-compra` dentro de `b66`**, caso ele
> proponha isso citando o fluxo de compra que precisa saber se pode ou não gerar pedido para um
> fornecedor. `situacao-compra` não é pré-requisito do marco em jogo (fechar a capacidade de
> configurar comercialmente Cliente e homologar Fornecedor) porque o inventário não encontrou
> nenhum consumidor hoje nem em `b68`. Proponho fora por ora, gatilho de volta: evidência de que
> `b68` bloqueia a criação de pedido de compra com este dado, ou a tela de parâmetros existir.
> Reversível: sim, porque é leitura adicional pura — se a evidência aparecer, a próxima versão
> apenas soma a leitura, sem desfazer nada do que `b66` construiu.

> **Discordo de `arquiteto-plataforma-frontend` em preferir "campo fora por completo" para
> `classificacaoId`** (nem round-trip), caso ele proponha isso para simplificar o schema do
> `PUT`. O fato 2 do briefing torna essa simplificação um corte irreversível — apaga dado gravado
> sem gatilho de volta que desfaça. Retiro meu próprio corte de "sem seletor editável" antes de
> aceitar esse, porque um é reversível (§5) e o outro não é.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "arquitetura",
  "assunto": "cliente-fornecedor-comercial",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/08-escopo-cliente-fornecedor.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Configuração comercial (Cliente) e de compra (Fornecedor) entram como diálogo próprio aberto por ação de linha nova, não como aba nos diálogos de cadastro existentes; a tela sempre carrega o snapshot atual e reenvia o bloco inteiro no PUT (fato 2)", "reversivel": true, "gatilho": "rodada de design-system decidir por padrão de aba nos dois diálogos" },
    { "id": "D-B", "titulo": "Homologar/Revogar entram como duas ações de linha mutuamente exclusivas em FornecedoresPage, mesmo padrão de bloquear/desbloquear crédito, com indicador Homologado na listagem — dentro, sem negociação, é capacidade hoje inexistente", "reversivel": false, "gatilho": "não se aplica — é inclusão obrigatória, não corte" },
    { "id": "D-C", "titulo": "GET .../situacao-compra fica fora desta fatia", "reversivel": true, "gatilho": "tela de parâmetro COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO existir, ou evidência de que b68 (Compra) precisa do dado para bloquear pedido" },
    { "id": "D-D", "titulo": "classificacaoId fica fora do seletor editável, mas dentro do payload como round-trip obrigatório (lido do registro, sempre reenviado)", "reversivel": true, "gatilho": "tela de CRUD de Classificação de Pessoa existir" },
    { "id": "D-E", "titulo": "Guard de TABELAS_PRECO_CONSULTAR/FINANCEIRO_CONSULTAR escopado aos campos de catálogo (tabelaPrecoPadraoId, condicaoPagamentoPadraoId), replicando D61 — dentro, sem negociação", "reversivel": false, "gatilho": "não se aplica — é inclusão obrigatória" },
    { "id": "D-F", "titulo": "Cliente e Fornecedor entram juntos em uma única versão b66 (Estoque/Venda/Compra/Faturamento reindexados para b67-b70), por ausência de pendência externa neste recorte contra a pendência parcial (B-3) do b66 atual", "reversivel": true, "gatilho": "quem mantém docs/PLANO-FRONTEND-ONDA-OPERACAO.md preferir anexar ao fim (b70) em vez de reindexar" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de manter situacao-compra dentro de b66 por o fluxo de compra precisar do dado", "impacto": "medio" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "possível defesa de simplificar o schema do PUT de configuração comercial omitindo classificacaoId por completo em vez de round-trip", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "documentacao", "pergunta": "Quem mantém docs/PLANO-FRONTEND-ONDA-OPERACAO.md aceita reindexar b66-b69 para b67-b70 (custo medido em texto/prosa, sem artefato publicado) ou prefere anexar Cliente/Fornecedor ao fim como b70?", "decide": "número final desta fatia" },
    { "tipo": "funcional", "pergunta": "b68 (Compra, era b67) depende de situacao-compra (podeReceberPedidoCompra) para decidir se bloqueia a criação de pedido para fornecedor não homologado, ou essa regra fica só no backend sem espelho na UI?", "decide": "se D-C permanece fora ou entra como pré-requisito de b69 (era b68)" },
    { "tipo": "funcional", "pergunta": "Existe demanda real (relatório, regra, segmentação comercial) que dependa de classificacaoId ser editável por Cliente, que justifique priorizar a tela de Classificações de Pessoa antes de outros itens da onda?", "decide": "prioridade da tela de CRUD que destrava D-D" }
  ],
  "riscos": [
    "A tabela 'Correções fora da sequência funcional' do plano da onda cita v1.11.0a8b58.c3 como 'QA BLOCKED' — inconsistente com o estado real (b62-b65 já commitadas depois dela, CHANGELOG confirma). Tratado como documentação desatualizada, não como bloqueio; se estiver errado, minha leitura de 'nenhuma versão bloqueada' também está.",
    "Não verifiquei se b68 (Compra, era b67) de fato dispensa situacao-compra — o inventário desta rodada só checou dependência com b67 (Venda), não com b68. D-C pode estar cortando um pré-requisito disfarçado se essa checagem faltante revelar dependência.",
    "grep -c 'b66|b67|b68|b69' em docs/PLANO-FRONTEND-ONDA-OPERACAO.md confirma ausência de artefato publicado (docs/fatias, CHANGELOG, branch) para esses números, mas não descarta menção fora do repositório (conversa, e-mail) que tornaria a reindexação mais cara do que medi aqui."
  ]
}
```
