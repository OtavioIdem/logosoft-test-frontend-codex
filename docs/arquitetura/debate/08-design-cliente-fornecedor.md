# Posição — `arquiteto-design-system` · Rodada 08 · `cliente-fornecedor`

Lidos por completo antes desta posição: `docs/arquitetura/debate/08-inventario-cliente-fornecedor.md`
(fonte principal), `docs/arquitetura/DECISOES.md` D58–D61, `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`
(§sequência `b65`–`b69`), `features/clientes/components/{ClienteFormDialog,ClientesPage}.tsx`,
`features/fornecedores/components/{FornecedorFormDialog,FornecedoresPage}.tsx`,
`components/feedback/ReasonDialog.tsx`, `docs/DIRETRIZES_UX_REFERENCIAS.md`, e o padrão irmão em
`features/produtos/components/{ProdutoFormDialog,ProdutosPage}.tsx` e
`features/pessoas/components/PessoaFormDialog.tsx`. Comandos de busca ficam citados por seção.

---

## D-A — estrutura de tela: aba nova no diálogo existente, não diálogo separado

**Aba dentro de `ClienteFormDialog`/`FornecedorFormDialog`, usando `TabPanel`/`TabView` do
PrimeReact, no mesmo formato de `ProdutoFormDialog.tsx:208-376` (4 abas: "Dados gerais",
"Comercial e estoque", "Dados fiscais", "Códigos e fornecedores") e de
`PessoaFormDialog.tsx:84-137` (3 abas: "Dados gerais", "Documentos e observações", "LGPD e
auditoria visual").**

**Onde já existe no repositório — régua de três casos já passada antes desta rodada:**
`grep -rln "TabView" features/*/components` devolve 9 arquivos; dos quais dois são diálogos de
cadastro mestre com o mesmo formato do que esta rodada propõe (`ProdutoFormDialog.tsx`,
`PessoaFormDialog.tsx`). Cliente e Fornecedor não introduzem `TabView` — entram como **3º e 4º
consumidor** do padrão "diálogo de cadastro mestre com abas", não como caso novo. Recusar a aba
aqui, depois de `TabView` já estar em produção em dois diálogos irmãos do mesmo domínio de
Pessoas (o próprio `PessoaFormDialog` é vizinho direto de Cliente/Fornecedor), criaria a terceira
forma de organizar campo adicional num diálogo que já tem duas.

**Por que não diálogo separado.** Um diálogo próprio aberto por ação de linha (como `ReasonDialog`)
faz sentido para uma **ação** — evento discreto, motivo, confirmação. Configuração comercial não é
um evento: é estado do cadastro, do mesmo tipo que `limiteCredito` ou `observacao`, só que grava em
outro endpoint. Separar em diálogo próprio replicaria o padrão de "duplo formulário para o mesmo
registro" que a `b65` já rejeitou para `dadosFiscais` de Produto — lá, os campos fiscais moram na
mesma tela porque são o mesmo cadastro visto de outro ângulo, não uma transação à parte.

**O que o operador entende quando o mesmo diálogo grava em dois endpoints.** É o comportamento **já
em produção** em `ProdutoFormDialog`/`ProdutosPage.tsx:126-152`: um único botão "Salvar" dispara
`saveMutation` (PUT base) e, condicionalmente, `dadosFiscaisMutation` (PATCH da aba fiscal),
sequencialmente, sob o mesmo toast de sucesso/erro. O operador nunca soube que eram dois
`request`; sabe que clicou "Salvar" uma vez. Replico a mesma orquestração para Cliente
(`saveMutation` PUT base + `configuracaoComercialMutation` PUT) e Fornecedor (`saveMutation` PUT
base + `configuracaoCompraMutation` PUT), chamadas em sequência dentro do mesmo `save()` da
página, sob o mesmo `runWithToast`.

**Diferença relevante em relação a Produto, que simplifica a implementação (não a UI):** o
inventário (fato 2, §2 do inventário) prova que não existe aqui a trava
"`TipoItemSpedObrigatorio`"-like de Produto, nem a lógica de "bloco em branco pula a chamada"
(`dadosFiscaisEstaoEmBranco`, `ProdutosPage.tsx:60`). A segunda chamada de Cliente/Fornecedor pode
ser **incondicional a cada salvamento** — sempre envia os 5/3 campos do estado atual da aba,
porque `null`/`false` é uma chamada válida no backend. Isso é decisão de implementação
(`dev-senior-react`), mas registro aqui porque afeta o que a tela pode prometer: **não há um
terceiro estado "salvo parcialmente"** a desenhar — ou os dois PUT completam, ou o segundo falha e
o erro aparece por cima do formulário já salvo (ver estados, abaixo).

**Round-trip obrigatório pelo fato 2.** Os valores iniciais da aba nova vêm do mesmo
`ClienteResponse`/`FornecedorResponse` que a listagem já busca — o backend já devolve os 5/4 campos
hoje (divergência 1 e 2 do inventário); só falta declará-los no tipo frontend
(`features/clientes/types/clientes.types.ts`, `features/fornecedores/types/fornecedores.types.ts`)
e inicializar `buildInitialValues` com eles. **Nenhuma chamada de rede nova é necessária só para
abrir o diálogo** — ponto que a implementação não pode perder, porque criar uma segunda `useQuery`
para reidratar dados que já vieram na listagem seria dívida de outra categoria (requisição
redundante).

**O que vira compartilhado, o que fica no módulo.** Nada de novo compartilhado aqui: `TabView` é
componente nativo do Prime, já em uso; a orquestração de duas mutations sob um botão é padrão de
página (`ProdutosPage.tsx`), não de componente — não há um `MultiEndpointFormDialog` a extrair com
dois consumidores (Produto e Cliente/Fornecedor seriam 2, no máximo 3 contando Fornecedor
separadamente) até um quarto módulo repetir a mesma forma. **Abro mão de propor esse componente
agora.** Gatilho para propô-lo: o quinto módulo (depois de Produto, Cliente, Fornecedor) que
precise da mesma orquestração — nesse ponto os três primeiros já teriam pago o preço de descobrir
a forma certa, e extrair vira barato.

---

## D-B — homologação: duas ações de linha assimétricas, não um par simétrico

**Estrutura de linha igual à de `bloquear`/`desbloquear` crédito (`ClientesPage.tsx:114`,
`DataTableActions` com `disabled` mutuamente exclusivo por `row.homologado`), mas o diálogo por
trás de cada botão não é o mesmo componente para as duas ações — e isso é uma divergência
deliberada, não um descuido.**

- **Revogar homologação** exige `Motivo` (`RevogarHomologacaoFornecedorRequest.Motivo`,
  não-anulável, máx. 500) → **`ReasonDialog`**, reaproveitado tal como está
  (`components/feedback/ReasonDialog.tsx`), no mesmo formato de `bloquear-credito`/`inativar` já
  em produção nas duas telas. Este é o **3º consumidor** do componente (Cliente já usa em 3 ações,
  Fornecedor em 1) — nenhuma mudança no componente é necessária.
- **Homologar** é `POST` sem corpo — não existe campo para o operador preencher. Colocar um
  `ReasonDialog` aqui seria pedir um motivo que o backend não pede e não grava, criando a
  expectativa de que existe rastro de "por que foi homologado" que não existe. A forma correta é
  **confirmação simples**, no formato de `ConfirmDialog` do PrimeReact — único precedente direto no
  repositório é `EnderecoFiscalSection.tsx:274-282` ("Remover município fiscal"), mesmo padrão
  (`header`, `message`, `acceptLabel`, `rejectLabel`, `accept`). É **1 caso existente**; esta
  rodada não vira o 3º de nada — é o Prime nativo, sem componente próprio a criar, e por isso não
  fica reservado para "quando aparecer o terceiro caso": não há componente a extrair, só um uso a
  mais do `ConfirmDialog` da biblioteca.

**Indicador na listagem.** Nova coluna `Homologado` em `FornecedoresPage.tsx`, com `Tag`
(`severity="success"`/`"warning"`), no mesmo padrão da coluna "Crédito" de `ClientesPage.tsx:112`.
É o 2º caso deste uso específico de `Tag` para estado binário de linha — ainda "coincidência", não
"padrão" pela régua de três, mas não é abstração nenhuma: é o componente `Tag` do Prime
parametrizado, que já é reuso de biblioteca, não de componente próprio.

**Dívida se isto ficar fora.** Sem estas duas ações, `Fornecedor.Homologado` continua congelado no
valor de criação (o backend não expõe outra via de gravação) — pior do que "capacidade ausente" do
inventário, porque cria um campo que a UI já herdaria no tipo (se D-A for aceita, o tipo
`FornecedorResponse` ganha `homologado` para outros fins) sem nenhuma ação para mudá-lo. Se este
recorte entrar sem D-B, o campo aparece na tela como fato consumado sem explicação de como mudou —
pior do que não aparecer.

---

## D-C — `situacao-compra`: entra, como painel de leitura, não como ação

**Entra nesta entrega**, mas com um recorte deliberadamente pequeno: um bloco de leitura (não uma
coluna extra na tabela, não um dropdown, não um diálogo) exibido no detalhe do fornecedor ou como
badge auxiliar ao lado da ação de homologação — decisão de posição exata é de execução, o que
travo aqui é que **não é um formulário nem uma ação, é dado derivado com `motivo` já pronto**.

**Por que a lacuna do fato 5 (parâmetro `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO` sem tela) não
bloqueia isto.** A regra dos sete estados exige "ação indisponível com motivo, sempre com o motivo
visível" — e o backend **já entrega o motivo pronto e legível** em
`SituacaoCompraFornecedor.Motivo` (`"Fornecedor não homologado e bloqueio por parâmetro ativo."`,
`"Fornecedor inativo."`, ou `null` quando pode). A UI não precisa explicar o parâmetro de sistema
para satisfazer o piso — precisa exibir o texto que o backend já calculou. Construir uma tela de
administração do parâmetro é trabalho de outro módulo (parâmetros do sistema), fora deste recorte;
**não construir a leitura de `situacao-compra` por causa disso é privar o operador de compras de
uma informação que já existe pronta**, só porque a origem de uma delas (o parâmetro) não é
editável ainda.

**O que abro mão.** Não incluo `situacao-compra` como gatilho de bloqueio de nenhuma ação na tela
de Fornecedor (não desabilito "editar" nem crio um badge de erro vermelho amplo) — é leitura
informativa, exibida com o mesmo tom neutro de `Message severity="info"`/`"warn"` conforme
`podeReceberPedidoCompra`. Gatilho para revisitar: se `b68` (compra) precisar bloquear a criação de
pedido de compra a partir deste dado, a leitura muda de lugar (ou ganha uma segunda superfície no
formulário de pedido de compra) — mas isso é decisão da rodada de `b68`, não desta.

---

## D-D — `classificacaoId`: seletor por busca, mesmo sem tela de CRUD

**Entra com seletor**, no mesmo formato dos outros dois catálogos da aba (`EntitySelect`
alimentado por hook próprio de `features/clientes/`), **não** fica fora, e **não** trava esta fatia
como pré-requisito de uma tela de Classificação de Pessoa.

**Por que não é bloqueio.** `GET /api/pessoas/classificacoes?empresaId&termo` (confirmado em
`ClassificacoesPessoaController.cs:22-28`) é suficiente para alimentar um seletor — a regra do
piso é "seleção por API, busca server-side, rótulo legível, nunca Id digitado"
(`docs/DIRETRIZES_UX_REFERENCIAS.md:9-13`), e essa regra não exige que o catálogo tenha CRUD
próprio no frontend. UF e Município, hoje selecionáveis em Endereço fiscal
(`useEnderecoFiscalCatalogos.ts`), também não têm tela de CRUD no app — são referência somente
leitura por design (dado nacional). Classificação de Pessoa é dado da própria empresa
(`empresaId` no filtro), então a ausência de CRUD é lacuna de produto real (registrada no
inventário, divergência 4) — mas não é motivo para recusar o seletor de leitura.

**Forma do seletor.** `EntitySelect` (não o `SearchSelect` assíncrono com `comSelecionado` de
D60) — o catálogo é filtrado por empresa como `condicaoPagamentoPadraoId` (ver D-E), não é
catálogo nacional grande como UF/Município/NCM. Réplica do padrão já em produção em
`useCondicoesPagamentoOptions` (`features/financeiro/hooks/useFinanceiroResources.ts:63-67`): hook
que busca a lista inteira por `empresaId` e mapeia para `SelectOption[]`, sem paginação nem
debounce — o parâmetro `termo` do endpoint fica disponível para quando o catálogo crescer, mas não
é exigido pela regra de UX quando a lista é pequena e por empresa (mesma leitura que já vale hoje
para condição de pagamento, consumida sem debounce em `PedidoCompraFormDialog.tsx:89`).

**O que abro mão.** Não incluo, nesta fatia, uma tela de cadastro de Classificação de Pessoa — isso
é escopo de outro recorte (o próprio inventário já registra que `ClassificacoesPessoaGerenciar`
existe na união e no catálogo, sem rota nem menu). Se a operação decidir que o cadastro dessa
classificação é urgente, é uma fatia própria com seu próprio inventário — não decido isso aqui.
Gatilho de revisita: se o seletor ficar frequentemente vazio na prática (nenhuma classificação
cadastrada, porque não há onde cadastrá-la), o campo se torna um `EntitySelect` de lista sempre
vazia — nesse caso a UI deveria trocar a `emptyMessage` padrão por uma que diga explicitamente
"Nenhuma classificação cadastrada" em vez do genérico "Nenhum(a) classificação encontrado(a)" da
`EntitySelect` — ajuste pequeno, não redesenho.

---

## D-E — permissão dos catálogos: aviso único por seção, não um aviso por campo

**Não replico literalmente a D61 campo a campo.** A D61 escopou o guard a **um único campo**
(`unidadeTributavelSigla`) dentro de uma aba de nove outros campos que não dependiam de catálogo —
lá, um aviso isolado ao lado de um campo isolado fazia sentido. Aqui a aba "Comercial" do Cliente
tem **três dos cinco campos** dependentes de catálogo externo (tabela de preço, condição de
pagamento, classificação), cada um com sua própria permissão de consulta
(`TABELAS_PRECO_CONSULTAR`, `FINANCEIRO_CONSULTAR`, `PESSOAS_CONSULTAR`). Três blocos `Message
severity="warn"` empilhados, um por campo, é a resposta errada à própria pergunta que a D61
levanta ("quantos avisos cabem antes de virar ruído?") — a resposta, medida contra o layout real
de `ProdutoFormDialog` (que já usa 1 `Message` para 1 permissão faltante numa aba inteira), é **no
máximo um bloco de aviso por aba, consolidado**, não um por campo.

**Padrão proposto:**
1. Cada campo, individualmente, fica `disabled` quando falta a permissão específica dele (mesmo
   comportamento de D61 — capacidade real retirada, não ilusão de clicar).
2. Um único `Message severity="warn"` no topo da aba, condicional, listando só as permissões que
   **faltam** (não lista as três sempre): por exemplo, se falta só `FINANCEIRO_CONSULTAR`, o aviso
   cita só essa; se faltam as três, cita as três numa frase, não em três parágrafos.
3. Valor já gravado continua visível mesmo com o campo desabilitado (D61: opção sintética a partir
   do valor corrente) — sem essa regra, editar o cadastro de um cliente que já tem
   `tabelaPrecoPadraoId` preenchido, na mão de quem não tem `TABELAS_PRECO_CONSULTAR`, apagaria o
   vínculo por PUT (fato 2: `null` sobrescreve) só porque o campo não conseguiu resolver o rótulo —
   isto **não é refinamento visual, é proteção contra perda de dado por permissão parcial**.
   Mesma regra vale para `FornecedorFormDialog` com o único campo `condicaoPagamentoPadraoId`.

**Onde já existe.** `useEnderecoFiscalCatalogos.ts` + `EnderecoFiscalFormSection.tsx:212,295`
(campo único) e `ProdutoFormDialog.tsx:291` (aba inteira via `PermissionGuard` — mas ali é
permissão de **ação**, `PRODUTOS_DADOS_FISCAIS_GERENCIAR`, não de **catálogo**; não se aplica aqui
porque `CLIENTES_GERENCIAR` já cobre a ação inteira da aba comercial — fato 3 do inventário. Não
confundir os dois: Produto tem duas permissões empilhadas (ação da aba + catálogo do campo
específico); Cliente/Fornecedor têm uma permissão de ação (a mesma do resto do diálogo) e até três
permissões de catálogo por campo, sem permissão de ação intermediária).

**Dívida se isto virar aviso por campo em vez de consolidado.** Nenhum módulo hoje tem 3 avisos de
catálogo na mesma aba — este seria o primeiro. Se a implementação optar por 3 avisos separados em
vez de 1 consolidado, cria a primeira instância de um padrão que, se replicado num quarto módulo
com mais catálogos (ex.: uma tela futura com 4-5 seletores externos), vira ruído visual que ninguém
vai querer desfazer depois (custo: reescrever N telas > custo de acertar agora, que é zero — é a
mesma decisão de texto, só agrupada).

---

## D-F — fatiamento e número: uma versão só, entra entre `b65` e `b66`

**Cliente e Fornecedor entram juntos, numa única versão**, não dois `bNN` separados. Do ângulo do
template: são o mesmo padrão (aba nova + PUT de bloco + seletor de catálogo com guard) aplicado a
duas entidades irmãs, com o Fornecedor sendo estritamente um subconjunto do Cliente (3 campos e uma
ação a mais contra 5 campos e nenhuma ação extra). Separar em duas versões arrisca o padrão nascer
num módulo e divergir no outro por decisão tomada "no calor" da segunda fatia, sem o debate desta
rodada — o próprio inventário já teve que revalidar campo a campo os dois porque nasceram do mesmo
gatilho (D58); construir separado desfaria esse trabalho conjunto.

**Onde entra na sequência.** O plano (`docs/PLANO-FRONTEND-ONDA-OPERACAO.md:63-67`) já reserva
`b66` para Estoque e não tem hoje nenhuma versão livre para Cliente/Fornecedor — a linha 63 do
mesmo documento ainda lista "`b65` | Produto, cliente e fornecedor..." como a intenção original
que a D58 cortou. Do ponto de vista de template, não tenho argumento de design para forçar a
posição exata na sequência (isso é `arquiteto-escopo-entrega`/orquestrador, considerando
dependência real com `b67`) — mas registro que o inventário (§6) já respondeu, por leitura de
código, que **não há dependência de dado entre este recorte e o pedido de venda hoje** (preço é
digitado manualmente, sem leitura de `tabelaPrecoPadraoId`). Isso remove o único argumento técnico
que forçaria esta fatia para antes de `b66`; posicioná-la como `b66` (empurrando Estoque para
`b67` e assim por diante) ou como uma fatia intercalada sem tocar a numeração de Estoque/Venda são
igualmente aceitáveis do ponto de vista de template — a diferença é só onde a dívida "cinco
endpoints existentes sem consumidor" fecha antes.

**O que abro mão.** Não travo o número exato nem a posição na fila — devolvo essa parte para quem
julga entrega e calendário. O que travo é a unidade: não aceito a fatia dividida por entidade
(Cliente numa versão, Fornecedor noutra) só por causa de tamanho de PR — o padrão fica mais barato
de acertar com as duas telas lado a lado no mesmo diff do que revisitado duas vezes.

---

## Estados e regras de UX que são piso nesta tela

| Estado | Cliente (aba Comercial) | Fornecedor (aba Compra + homologação) |
| --- | --- | --- |
| `loading` | `loading` do botão Salvar cobre as duas mutations em sequência (como `ProdutosPage.tsx:208`, `mutationLoading = saveMutation.isPending \|\| ... .isPending`) | idem, mais `loading` isolado no `ConfirmDialog` de Homologar e no `ReasonDialog` de Revogar |
| `vazio` | catálogo de tabela de preço/condição/classificação sem itens para a empresa → `EntitySelect` com `emptyMessage` específico, nunca convite a digitar Id | idem para condição de pagamento |
| `erro recuperável` | falha no PUT de `configuracao-comercial` depois do PUT base já ter sucesso → toast de erro **distinto** do de sucesso do cadastro base (não pode virar um único toast genérico que esconda que metade salvou) | mesmo requisito para `configuracao-compra` |
| `erro bloqueante` | Cliente/Fornecedor inativo (`IsActive` — fato §2 do inventário) → aba inteira (ou ao menos os campos de gravação) desabilitada, com o mesmo guard que `ClientesPage.tsx:114` já aplica a `editar` | idem, e também bloqueia Homologar/Revogar |
| `sucesso` | toast único cobrindo o resultado combinado das duas chamadas | idem |
| `permissão negada` | dialog não abre para quem não tem `CLIENTES_GERENCIAR` (já coberto hoje) | idem para `FORNECEDORES_GERENCIAR` |
| `ação indisponível com motivo` | campo de catálogo desabilitado com aviso consolidado (D-E) quando falta permissão de consulta | Homologar desabilitado quando já homologado; Revogar desabilitado quando não homologado (D-B, espelha `bloquear`/`desbloquear` de crédito); `situacao-compra` exibe `motivo` do próprio backend quando `podeReceberPedidoCompra = false` (D-C) |

Nenhum destes é opcional para o plano da versão: a coluna "erro recuperável" em particular é a
que mais diverge do padrão de Produto (lá, o bloco fiscal só dispara se não estiver em branco;
aqui, dispara sempre) — se a implementação decidir replicar o toast único de `ProdutosPage.tsx`
sem diferenciar qual das duas chamadas falhou, o operador não vai saber se o cadastro base salvou
e só a parte comercial falhou, ou se nada salvou. Isto é regra de piso, não polimento.

---

## Dívida visual — resumo

**Fecha:** os cinco endpoints do inventário deixam de ser capacidade morta; Fornecedor ganha o
indicador de homologação que Cliente já tem para crédito (reduz a assimetria entre as duas telas
irmãs — hoje Fornecedor tem só 1 ação de linha contra 4 de Cliente).

**Cria, se aceita como proposto:** zero — cada elemento novo (`TabView`, `EntitySelect` alimentado
por hook de empresa, `Tag` de estado, `ReasonDialog`, `ConfirmDialog`) já tem pelo menos um
consumidor em produção; nenhum é o primeiro caso do repositório.

**Cria, se D-E for implementado como aviso por campo em vez de consolidado:** 1 módulo diverge
(o primeiro com 3 avisos empilhados) — custo de alinhar depois: 1 tela, baixo, mas evitável agora
sem custo, então não deveria acontecer.

**Cria, se D-A for rejeitada em favor de diálogo separado:** o padrão de "uma ação por diálogo"
que `ReasonDialog` estabeleceu passaria a conviver com "formulário de 5 campos por diálogo próprio"
sob o mesmo guarda-chuva visual de "ação de linha" — dois consumidores (Cliente, Fornecedor) já
divergindo do próprio Produto no primeiro mês da fatia. Custo de alinhar depois: 2 telas
reescritas, mais a decisão de qual das duas formas vira a canônica.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "arquitetura",
  "assunto": "cliente-fornecedor-comercial",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/08-design-cliente-fornecedor.md",
  "decisoesPropostas": [
    {
      "id": "D-A",
      "decisao": "Configuração comercial (Cliente) e de compra (Fornecedor) entram como aba nova em ClienteFormDialog/FornecedorFormDialog (TabView do Prime), não como diálogo separado. Um único botão Salvar dispara o PUT base e o PUT de configuração em sequência, sob o mesmo toast — réplica da orquestração já em produção em ProdutosPage.tsx (base + dadosFiscais). Valores iniciais da aba nova vêm do mesmo GET de listagem, sem chamada de rede extra."
    },
    {
      "id": "D-B",
      "decisao": "Homologar e Revogar são duas ações de linha em FornecedoresPage, espelhando bloquear/desbloquear crédito de Cliente, mas com diálogos assimétricos: Revogar usa ReasonDialog (motivo obrigatório, 3º consumidor do componente); Homologar usa ConfirmDialog nativo do Prime (sem motivo, POST sem corpo), não ReasonDialog. Nova coluna Tag 'Homologado' na listagem, no padrão da coluna 'Crédito' de Cliente."
    },
    {
      "id": "D-C",
      "decisao": "GET .../situacao-compra entra nesta fatia como painel de leitura (não ação, não coluna de bloqueio), exibindo o campo motivo que o próprio backend já calcula. A ausência de tela para o parâmetro COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO não bloqueia isto, porque o motivo textual já vem pronto do backend."
    },
    {
      "id": "D-D",
      "decisao": "classificacaoId entra com EntitySelect alimentado por hook de features/clientes/ que consome GET /api/pessoas/classificacoes?empresaId&termo, no mesmo formato de useCondicoesPagamentoOptions (lista por empresa, sem debounce, sem paginação) — não SearchSelect assíncrono estilo D60 (catálogo pequeno por empresa, não nacional). Não trava esta fatia como pré-requisito de tela de CRUD de Classificação de Pessoa."
    },
    {
      "id": "D-E",
      "decisao": "Cada campo de catálogo fica disabled individualmente quando falta a permissão de consulta específica (TABELAS_PRECO_CONSULTAR/FINANCEIRO_CONSULTAR/PESSOAS_CONSULTAR), com valor gravado sempre visível (proteção contra apagar vínculo via PUT de bloco). Mas o aviso textual é UM bloco Message consolidado por aba, listando só as permissões que faltam — não um Message por campo. Diverge da D61 (campo único) porque aqui são até três campos na mesma aba."
    },
    {
      "id": "D-F",
      "decisao": "Cliente e Fornecedor entram juntos numa única versão, não dois bNN. Posição exata na sequência (antes ou depois de b66-Estoque) fica para arquiteto-escopo-entrega/orquestrador — o inventário já mostrou que não há dependência de dado com b67 (venda) hoje, o que remove o único argumento técnico para forçar prioridade sobre Estoque."
    }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "execucao", "pergunta": "A ordem exata de b66 (Estoque) vs. este recorte na fila de versões — decisão de escopo/calendário, não de template.", "decide": "arquiteto-escopo-entrega / orquestrador" },
    { "tipo": "execucao", "pergunta": "Se o backend expõe algum corpo de erro por campo para os dois PUT de bloco (configuracao-comercial/compra), para diferenciar visualmente 'PUT base salvou, PUT comercial falhou' de 'nada salvou' no toast — não verificado nesta rodada, é o mesmo tipo de pergunta que B-10 já levantou para Produto.", "decide": "inventariante-contrato-tela, se necessário, ou confirmação direta no C#" }
  ],
  "riscos": [
    "Se a implementação disparar o PUT de configuração comercial/compra de forma condicional (só quando a aba foi tocada) em vez de incondicional a cada salvamento, precisa rastrear 'dirty' por aba — complexidade que o backend não exige (fato 2: request em branco é válido) e que esta posição não recomenda, mas que pode parecer mais 'seguro' na implementação; se isso acontecer, o comportamento diverge do que este documento descreve e precisa voltar para revisão.",
    "Não abri o preview desta vez porque as duas telas envolvidas (ClientesPage, FornecedoresPage) não mudaram desde a última verificação registrada no inventário e os componentes-precedente (ProdutoFormDialog, PessoaFormDialog, EnderecoFiscalSection) foram lidos direto do arquivo — nenhuma leitura de tela real via preview_start nesta rodada, só leitura de código-fonte."
  ]
}
```
