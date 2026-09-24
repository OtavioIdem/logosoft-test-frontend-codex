# Posição — `arquiteto-design-system` · Rodada 10 · `estoque`

Lidos por completo antes desta posição: `docs/arquitetura/debate/10-inventario-estoque.md` (fonte
principal), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (seção `b68`, B-3), `docs/arquitetura/DECISOES.md`
D56, D66–D68, `docs/arquitetura/debate/08-design-cliente-fornecedor.md` (forma da rodada anterior),
`docs/DIRETRIZES_UX_REFERENCIAS.md`. Código lido: `features/estoque/components/{MovimentoOperacionalPage,
MovimentosEstoquePage,TransferenciaEstoquePage,EstoqueFilterBar,estoqueUxUtils}.tsx/.ts`,
`features/estoque-avancado/components/{EstoqueAvancadoPage,AjusteEstoqueTab,BloqueiosEstoqueTab}.tsx`,
`features/financeiro-avancado/components/FinanceiroAvancadoPage.tsx`,
`features/portaria/components/PortariaPage.tsx`, `features/rh/components/{AusenciasPage,BeneficiosPage}.tsx`,
`lib/security/routePermissions.ts:19-28`, `layout/AppMenu.tsx:86-98`. Não abri o `preview_start` — a
mudança em disputa (D-B) ainda não existe em nenhuma rota (o próprio inventário confirma isso em §1:
"é trabalho a fazer, não uma constatação de estado atual divergente"); o que existe hoje eu li
direto do código de cada rota atual (`/estoque/entradas`, `/saidas`, `/movimentos`, `/transferencias`,
`/avancado`), não de memória. Se alguém quiser confirmar o rótulo/estado atual renderizado, o preview
sobe essas rotas normalmente — não há tela nova a navegar ainda.

---

## D-A — escopo: o defeito de nome de campo (fato 2) fecha junto com a reforma da aba, não depois

**Decisão de template: o defeito de `tipo`/`tipoMovimento` e `dataMovimento`/`criadoEm` (fato 2, fato 3
do inventário) precisa estar corrigido *na mesma versão* que reorganiza Entrada/Saída/Histórico em
abas — não é aceitável entrar como `.cN` posterior, nem esperar indefinidamente por confirmação HTTP.**

Por quê, do ângulo de template: a aba "Histórico" que a `b68` cria é a peça mais visível da entrega —
é ela que o operador vai abrir para conferir o resultado de toda entrada/saída/ajuste/transferência
que acabou de fazer nas abas vizinhas. Se a coluna "Tipo" mostra `'-'`, a coluna "Data" mostra `'-'`
e os quatro contadores do resumo mostram `0` (efeito documentado no fato 2/3 do inventário), a
tela nova nasce parecendo quebrada no primeiro dia — não é debt tolerável em "polimento pendente",
é a tela mentindo sobre o que aconteceu (a régua dos sete estados trata isso como estado ausente,
não estética). A evidência é forte o bastante para agir mesmo sem HTTP real: nome de propriedade C#
sem `JsonPropertyName`, ausência de política de nomenclatura customizada em `Program.cs`, e ASP.NET
Core usa camelCase por padrão — a mesma cadeia de evidência que já bastou para o inventariante
marcar como divergência, não hipótese. Registro como fato com esta origem, não como medição HTTP.

**Como isto se encaixa nas regras do time**: o `00_padrao_de_execucao.md` pede parar e escalar quando
"o contrato do backend diverge do que a tela lê" — é exatamente este caso. A escolha entre `.c`
separada rodando antes da `b68` ou dentro do mesmo diff da `b68` é do `arquiteto-escopo-entrega`; a
minha posição de template é só sobre **ordem**: não aceito a aba nova ir ao ar sem a correção, porque
isso cria a pior espécie de dívida visual — um padrão novo, correto na forma, mostrando dado errado
no conteúdo, e cada módulo que copiar a forma da aba (o próximo candidato natural: Vendas, na `b69`,
tem sua própria tela de pedidos com o mesmo tipo de rótulo de status) herdaria a tentação de "só
copiar como está".

**O que entra junto, por ser a mesma classe de defeito e a mesma aba**: fato 4 do inventário
(`TipoMovimentoEstoque` sem os valores 8/9/10 — toda transferência, que sempre gera dois desses
tipos, mostraria `"8"`/`"9"` cru em vez de rótulo). Corrigir só o nome do campo sem adicionar os
três valores de enum deixaria a aba nova mostrando números crus para transferências — mesmo
sintoma, outra causa, mesma vitrine.

**O que fica fora desta rodada, com gatilho**: fato 5 (campos `quantidadeAnterior/Posterior` etc.) —
ver D-E, não é regressão introduzida por esta versão, é capacidade nunca exposta.

---

## D-B — Entrada, Saída e Histórico: um componente, três rotas, um padrão já com cinco consumidores

**Padrão proposto**: um único componente de página (a extensão natural do que já existe em
`MovimentoOperacionalPage`, que já hoje é instanciado três vezes com um prop `kind` diferenciando
comportamento — `app/(main)/estoque/{entradas,saidas,ajustes}/page.tsx`) ganha uma quarta forma:
Entrada, Saída e Histórico viram três `TabPanel` dentro de um `TabView` do Prime, dentro de uma
página com `PageHeader` único (sem `actions` — ver abaixo) e `UnauthorizedState` de guarda geral por
`hasAnyPermission(['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'])`. **Ajuste e Transferência não entram
nesta aba** — o texto do plano fala só de Entrada/Saída/Histórico, e ambos já são operações com forma
própria (Ajuste compartilha `MovimentoOperacionalPage kind="ajuste"`, mas fica de fora do `TabView`
porque o plano não pediu; Transferência já é página cheia com formulário inline, D-C não muda isso).

**Onde este padrão já existe — régua de três já ultrapassada em 5, não em 3**:
`EstoqueAvancadoPage.tsx` (Inventários/Ajustes/Bloqueios), `FinanceiroAvancadoPage.tsx` (Contas a
receber/Contas a pagar/Fluxo de caixa), `PortariaPage.tsx` (Pré-autorizações/Registros/Ocorrências),
`AusenciasPage.tsx` (Férias/Afastamentos), `BeneficiosPage.tsx` (Benefícios/Concessões) — cinco
módulos, forma idêntica em todos: `PageHeader` no topo **sem** `actions`, guarda de página por
`hasAnyPermission` (união de todas as permissões das abas), `TabView` logo abaixo, cada `TabPanel`
um componente próprio que não renderiza `PageHeader` de novo e que resolve sua própria permissão
internamente (`PermissionGuard mode="disable"` no botão de ação, como em `AjusteEstoqueTab.tsx:63`
e `BloqueiosEstoqueTab.tsx:74,85,86`). Propor este padrão para Estoque não é o segundo caso — é o
sexto, e recusá-lo aqui, depois de cinco módulos usarem a mesma forma, criaria a segunda maneira de
organizar operações relacionadas dentro de um item de menu, sem motivo.

**Por que não colapsar as três rotas em uma só.** A forma "hub com uma rota" dos cinco precedentes
funciona porque, nos cinco casos, o menu já tinha **um único item** apontando para o hub
(`AppMenu.tsx:98` "Estoque avançado", e o equivalente para os outros quatro). Aqui o menu tem hoje
**três itens separados** — Entradas, Saídas, Movimentos (`AppMenu.tsx:91-93`) — e um operador que
faz entrada de mercadoria dez vezes por turno usa o atalho de menu direto, não abre um hub e depois
escolhe aba. Colapsar em uma rota e cortar dois itens de menu economiza dívida de template (um hub a
menos para manter) ao custo de um clique a mais numa operação de alta frequência — exatamente o
anti-padrão que a minha própria skill nomeia: "padronizar contra o fluxo: consistência que obriga o
operador a mais cliques não é consistência". Não faço essa troca.

**A solução que fecha as duas pontas: mesma forma de página (`PageHeader` + `TabView` de 3 abas),
mas instanciada três vezes por prop, uma por rota, com a aba correspondente pré-selecionada** —
`app/(main)/estoque/entradas/page.tsx` continua existindo e renderiza o componente com
`initialTab="entrada"`; `.../saidas/page.tsx` com `initialTab="saida"`; `.../movimentos/page.tsx`
com `initialTab="historico"`. Os três itens de menu continuam existindo, cada um leva direto à
operação de sempre com um clique, e uma vez lá o operador pode trocar de aba sem voltar ao menu se
precisar da operação vizinha. Isto não é um padrão novo: é a mesma técnica que
`MovimentoOperacionalPage({ kind })` já usa hoje para as mesmas três rotas — só que agora o prop
também decide qual aba abre por padrão, em vez de qual formulário renderizar sozinho.

**O que muda dentro de cada aba, em relação ao que existe hoje:**
- **Entrada / Saída**: o conteúdo de `MovimentoOperacionalPage` de hoje (cards de "impacto" +
  botão que abre `MovimentoEstoqueFormDialog`) migra para dentro do `TabPanel`, **sem** o
  `PageHeader` próprio que a página tem hoje (linha 49) — título e descrição saem daqui e vão para
  o `PageHeader` único do topo da página nova. O modal `MovimentoEstoqueFormDialog` não muda: seria
  o 3º e 4º consumidor do mesmo diálogo que Ajuste básico já usa, então nenhuma reescrita de forma,
  só de local de montagem. **Não** troco para o padrão "formulário inline no Card" que
  `AjusteEstoqueTab`/`BloqueiosEstoqueTab` usam no sistema avançado — isso seria reescrever um
  componente testado sem necessidade; o plano pede reorganização de UX, não fusão de forma de
  operação, e um diálogo modal para uma operação pontual continua sendo a leitura correta da regra
  "uma ação primária por tela" quando a tela agora hospeda três operações candidatas na mesma
  página.
- **Histórico**: o conteúdo de `MovimentosEstoquePage` (filtros, quatro cards de resumo, tabela)
  migra para dentro do `TabPanel`, também sem `PageHeader` próprio — a barra de filtros
  (`EstoqueFilterBar`), hoje montada como `actions` do `PageHeader` (linha 41), passa a ser uma
  barra própria no topo do conteúdo da aba, porque o `PageHeader` da página não carrega `actions`
  (nenhum dos cinco precedentes carrega — ver acima). Isto é obrigatório para não repetir cabeçalho
  a cada troca de aba.

**Permissão, por camada, replicando a granularidade que `EstoqueAvancadoPage` já usa:**
- Página: `hasAnyPermission(['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'])` — quem não tem nenhuma das
  duas nunca vê a página.
- Aba Entrada/Saída: conteúdo sempre visível para quem passou a guarda de página, mas o botão
  "Registrar entrada/saída" fica com `PermissionGuard permission="ESTOQUE_MOVIMENTAR" mode="disable"`
  — quem só tem `ESTOQUE_CONSULTAR` vê a aba, entende o que ela faz, mas não consegue disparar a
  ação (ação indisponível com motivo, não ilusão de botão habilitado que falha depois).
- Aba Histórico: quem não tem `ESTOQUE_CONSULTAR` vê a aba com `UnauthorizedState` **dentro do
  `TabPanel`**, não a página inteira bloqueada — mesma técnica que a divergência 15 do inventário
  mostra que `ReservasEstoquePage` deveria ter usado e não usou.

**O que fica compartilhado, o que fica no módulo.** Nada novo em `components/`: `TabView`/`TabPanel`
é Prime nativo, já com cinco consumidores; a técnica "componente de página parametrizado por prop,
montado em rotas irmãs" já existe neste próprio módulo. Não há um `AbaOperacaoPage` genérico a
extrair — os cinco precedentes já resolveram o problema de forma idêntica sem precisar de um
componente compartilhado por trás (cada um é feito à mão com `PageHeader` + `TabView` + guarda de
permissão), e forçar uma abstração agora, com seis instâncias já divergindo em pequenos detalhes
(quais permissões, quantas abas), seria abstrair a forma errada — a dívida aqui não é "falta de
componente", é "falta de disciplina para repetir a mesma receita", que se resolve documentando o
padrão, não codificando-o.

**Dívida se a régua for quebrada:**
- Se `Entrada`/`Saída`/`Histórico` viram uma rota só (a alternativa que rejeito acima): 1 clique a
  mais em 2 das 3 operações mais frequentes do módulo, permanente, sem gatilho de reversão barato
  (voltar a 3 rotas depois exige desfazer o merge de estado/estado do `TabView` e reeditar
  `AppMenu.tsx`+`routePermissions.ts` de novo).
- Se a forma da aba não seguir os cinco precedentes (`PageHeader` com `actions`, por exemplo, para
  manter o botão de "Registrar entrada" sempre visível trocando de aba): nasce o primeiro dos seis
  casos com cabeçalho dinâmico por aba — um padrão que os outros cinco não têm e que os próximos
  módulos (Compra `b70`, Faturamento `b71`, se adotarem abas) teriam dois exemplos contraditórios
  para copiar.

---

## D-C — `origemId` e `documento` na transferência: um vira campo, o outro não

**`Documento` entra como `InputText` opcional**, réplica exata do campo já em produção em
`MovimentoEstoqueFormDialog.tsx:72` (Entrada/Saída/Ajuste básico) — mesmo rótulo "Documento", mesmo
tipo, mesma posição relativa (perto de "Motivo"). Zero decisão nova de forma: é o 4º consumidor de
um `InputText` que já existe three vezes no mesmo módulo.

**`OrigemId` não vira campo de formulário.** O inventário (seção 2, "O que `TransferirEstoqueRequest.
OrigemId`... significam no domínio") já resolveu a pergunta que faria sentido eu levantar: não é um
vínculo com outra entidade consultável — é um `Guid?` de correlação entre as duas pernas do
movimento, que o backend **gera sozinho** quando omitido, e que **nenhum endpoint valida contra
tabela nenhuma**. Um operador humano não tem, no mundo real, um GUID de correlação para digitar —
diferente de `Documento` (número de nota, requisição, algo que existe em papel ou em outro
sistema). Colocar um `InputText` rotulado "Id de origem" aqui não seria "seleção por API" (não há
API de onde vir), mas também não seria o mesmo tipo de campo técnico livre que a diretriz already
exempts (`correlationId`, linha 39 de `docs/DIRETRIZES_UX_REFERENCIAS.md`) — porque `correlationId`
nesses outros fluxos é gerado e **exibido** pelo próprio frontend (ver `b18`: "`correlationId` deve
ser gerado pelo frontend... e exibido como leitura"), nunca digitado por um humano. Aqui não há
frontend gerando nada — é o backend que gera se vier vazio. A leitura correta é: **não expor este
campo na UI, não enviá-lo, deixar o backend seguir gerando o `Guid.NewGuid()` que já gera hoje**. A
LACUNA do gate (`gate-contract-request-fields.mjs:376-377`) fecha ao nível do schema (o campo pode
existir como opcional no tipo/schema, documentado como "nunca preenchido pela UI, deixado ao
backend"), não ao nível de um input em tela. Não é a mesma resposta para os dois campos da mesma
LACUNA — e é importante documentar por quê, para quem ler o gate depois não achar que faltou um
campo por descuido.

**Divergência 9 (transferência esconde `origemModulo`) fica registrada, não corrigida por mim.** As
outras três telas (Entrada, Saída, Ajuste básico) mostram `origemModulo` como `InputText` visível;
Transferência manda `'ESTOQUE'` fixo e invisível. Isto é uma 4ª forma inconsistente dentro do mesmo
grupo de quatro formulários irmãos — cheap de corrigir (é o mesmo `InputText` já usado nos outros
três), mas o plano da `b68` não pede isso explicitamente. **Abro mão de exigir a correção nesta
versão**; deixo registrado que, se `b68` mexer no formulário de Transferência de qualquer forma
(e vai mexer, para adicionar `Documento`), o custo marginal de adicionar `origemModulo` visível no
mesmo diff é baixo e fecha uma divergência que already existe hoje. Gatilho: se a implementação
tocar este arquivo, resolver os dois junto é mais barato que abrir uma correção `.cN` só para isso
depois.

---

## D-D — origem do ajuste (B-3): nenhum dropdown nasce sem catálogo, para nenhum dos dois ajustes

**Ajuste básico (`POST /api/estoque/ajustes`) continua com `origemModulo` como `InputText` livre,
sem mudança.** B-3 segue sem resposta no C# (nenhum enum, nenhum catálogo) — o próprio texto do
plano veta a saída fácil ("Hardcode no frontend apenas disfarça texto livre"), e eu concordo com o
veto: um array fixo no frontend não é dropdown, é a mesma liberdade de digitação com uma interface
que finge ser catálogo. **Não construo esse dropdown.** Isto significa que o item "origem do ajuste
como dropdown" do plano da `b68` **não entra nesta versão** para o ajuste básico — fica bloqueado
por B-3, com gatilho explícito: catálogo publicado no backend (enum ou endpoint de consulta).

**Ajuste avançado não tem o que trocar por dropdown — o campo nem existe como input.**
`CriarAjusteEstoqueRequest` não tem `OrigemModulo`; `Origem` é decidida pelo domínio
(`"Estoque.AjusteManual"` ou `"Estoque.Inventario"`) e só aparece na resposta. A única ação de
template disponível aqui é **exibir o que o backend já calculou**, não inventar um campo de escolha
que o backend não aceita. Proposta pequena, de baixo custo: depois de `criarMutation.mutateAsync`
ter sucesso em `AjusteEstoqueTab.tsx`, o toast de sucesso (ou um `Tag` de leitura ao lado do
formulário) mostra o valor de `response.origem` — fecha a "sem uso" do campo (seção "Tabela de
campos" do inventário) sem construir controle nenhum, só lendo o que a resposta já entrega.

**Não replico `origemEstoqueOptions` de `ReservaEstoqueDialogs.tsx:21-26`.** Este precedente já em
produção é exatamente o antipadrão que o plano pede para evitar aqui — quatro valores fixos sem
catálogo. Copiá-lo para o Ajuste, mesmo que "mais rápido", criaria o 2º consumidor de um padrão que
já deveria ser corrigido, não expandido. **Registro como dívida existente, fora do escopo desta
rodada** (Reserva não está no recorte da `b68`), com o alerta de que se um terceiro módulo copiar a
mesma forma antes de alguém revisar Reserva, o custo de alinhar sobe de 1 tela para 2.

---

## D-E — Histórico: filtro de período entra, paginação de servidor não pode entrar (não existe no
backend), densidade contida

**Filtro de período (`inicio`/`fim`) entra em `EstoqueFilterBar`, atrás de um prop opcional
(`showPeriodo`), sem afetar os outros cinco consumidores do componente** (`SaldosEstoquePage`,
`LocaisEstoquePage`, `InventariosEstoquePage`, `ReservasEstoquePage`, e agora a aba Histórico). O
endpoint já aceita `inicio`/`fim` (`EstoqueController.cs:48-54`) e hoje nenhuma tela os expõe — é a
única alavanca que o frontend tem, sem depender do backend, para reduzir o volume que uma lista sem
paginação de servidor devolve inteira a cada consulta (fato do inventário, seção 7: "cresce sem
limite por construção"). Isto é o 6º consumidor de `EstoqueFilterBar`, adicionando um prop opcional
— não quebra a régua de três, é extensão de um componente já compartilhado.

**Paginação de servidor não entra, porque não existe no backend** (`ListarMovimentosEstoqueUseCase`
não tem `Skip`/`Take`) — inventar uma paginação client-side "de verdade" (ex.: infinite scroll,
carregar em lotes) seria construir comportamento que o contrato não sustenta e que ninguém pediu;
mantenho a paginação **visual** que já existe (`records.slice(first, first + rows)`), documentada
como o que é: fatiamento de uma lista que já veio inteira, não paginação real. Adiciono um único
`Message severity="info"` compacto acima da tabela, condicional a existir filtro de período/produto/
local ativo ou não: "Sem filtro de período, esta lista traz todos os movimentos do período
disponível." — mesmo tom neutro que `D-C` da rodada 08 usou para `situacao-compra`, informação, não
bloqueio.

**Densidade: não adiciono as quatro colunas de saldo antes/depois** (`quantidadeAnterior`,
`quantidadePosterior`, `quantidadeReservadaAnterior`, `quantidadeReservadaPosterior`, fato 5 do
inventário). A tabela hoje já tem 8 colunas (Produto, Local, Tipo, Quantidade, Origem, Impacto,
Documento, Data); 12 colunas para uma tela que um operador escaneia rapidamente é o oposto de
"coluna que ninguém confere é ruído" — quatro colunas de auditoria fina pertencem a uma visão de
detalhe (linha expandida ou painel lateral), não à listagem principal, e o repositório não tem hoje
um padrão de `rowExpansion` para eu apontar como precedente — construir um agora, só para isto,
seria exatamente a abstração prematura que a skill veta. **Fica fora, com gatilho**: se um módulo
futuro (ex.: auditoria de estoque num painel dedicado) precisar desses quatro campos, aí sim há
massa crítica para desenhar uma visão de detalhe; até lá, ficam "sem uso", capturados como dívida
sabida, não como esquecimento.

**Adiciono a coluna `Motivo`** (hoje "sem uso" apesar de estar na resposta) — é auditoria direta do
"por que este movimento aconteceu", cabe no orçamento de colunas de uma tabela operacional, e é o
tipo de dado que um operador confere ao investigar uma divergência de saldo (diferente das quatro
colunas de saldo antes/depois, que são redundantes com o próprio saldo atual consultável em
`/estoque/saldos`).

---

## D-F — ilusão de acesso (saldos/movimentos) entra; GUID digitado em bloqueios não fecha nesta
versão, por falta de endpoint

**Saldos e Movimentos ganham regra própria em `routePermissions.ts`**, fechando a divergência 14 —
`{ pattern: /^\/estoque\/saldos(?:\/.*)?$/, anyOf: ['ESTOQUE_CONSULTAR'] }` e o equivalente para
`/estoque/movimentos` (que, com D-B, passa a ser a mesma rota que também serve Entrada/Saída — a
regra da rota, com D-B aplicado, precisa cobrir `anyOf: ['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR']`,
igual à união que a página já checa). É uma correção de duas linhas, sem custo de template, e sem
ela a aba nova de D-B herdaria a mesma ilusão que hoje afeta a rota solteira de Movimentos. **Entra
nesta versão.**

Divergência 15 (`ReservasEstoquePage` mais restritiva que o backend) **não é a pergunta que D-F fez**
(o briefing cita só saldos, movimentos e bloqueios) — registro que existe, mas não a decido aqui;
fica para quem revisar Reservas com escopo próprio.

**Bloqueios: não construo seletor de entidade, porque não há endpoint de listagem para alimentar
um.** A regra de piso ("seleção por API, busca server-side") pressupõe que exista uma API — aqui não
existe (`EstoqueAvancadoController.cs` só tem `POST bloqueios`, `POST .../liberar`, `POST
.../cancelar`, sem `GET`). Inventar um endpoint não é decisão minha para tomar (o `00_padrao_de_
execucao.md` proíbe "inventar endpoint, campo, enum ou regra" para qualquer agente, e eu não abro
exceção para mim). **Isto fica fora desta versão, com gatilho explícito: `GET` de listagem de
bloqueios publicado pelo backend.** Até lá, o máximo que o template pode entregar sem inventar
capacidade é honestidade de rótulo: o campo de `InputText` deixa de se chamar implicitamente "ID do
bloqueio" como se fosse um campo de busca e passa a ter texto de apoio explícito — "Cole aqui o
identificador do bloqueio informado por quem o registrou. Não há hoje uma lista de bloqueios ativos
para consultar." Isto **não corrige o antipadrão** (ainda é um Guid digitado à mão) — é a
diferença entre uma tela que finge ser um seletor incompleto e uma tela que admite a limitação. Não
é a resposta que eu prefiro; é a resposta que cabe sem inventar contrato. Como `Bloqueios` é do
sistema avançado e a `b68`, pelo texto do plano, só toca o sistema básico, **não decido se esse
texto de apoio entra nesta versão ou fica para quando alguém tocar o sistema avançado de novo** —
sinalizo o custo (uma frase de `Message`, sem componente novo) para quem decidir o escopo exato.

---

## Estados e regras de UX que são piso nesta rodada

| Elemento | `loading` | `vazio` | `erro recuperável` | `erro bloqueante` | `sucesso` | `permissão negada` | `ação indisponível com motivo` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aba Entrada/Saída (D-B) | `loading` no botão do diálogo (já existe) | n/a | toast de erro (já existe) | não verificado — mesmo estado que hoje, não corrigido nesta rodada | toast de sucesso (já existe) | página bloqueada por `hasAnyPermission` se faltar as duas; aba visível sem `ESTOQUE_MOVIMENTAR` | botão "Registrar entrada/saída" com `PermissionGuard mode="disable"`, mesmo padrão de `AjusteEstoqueTab.tsx:63` — motivo é o texto padrão do componente, não texto livre novo |
| Aba Histórico (D-B+D-E) | `DataTableServer loading` (já existe) | `EmptyState` (já existe) | `ApiErrorPanel` (já existe) | não verificado | n/a (consulta) | `UnauthorizedState` **dentro do `TabPanel`**, não bloqueando a página inteira | `Message` informativo sobre ausência de paginação de servidor quando sem filtro de período (D-E) — não é bloqueio, é aviso |
| Transferência — campo `Documento` (D-C) | herda o `loading` do botão existente | n/a | `FieldError` por campo (já existe) | ausente/não verificado (já registrado no inventário, não fechado aqui) | toast (já existe) | `UnauthorizedState` (já existe) | n/a — campo sempre editável quando a tela abre |
| Ajuste básico — origem (D-D) | n/a (sem mudança de campo) | n/a | n/a | n/a | n/a | n/a | **campo `origemModulo` continua livre, com motivo implícito**: B-3 sem catálogo é o motivo, registrado em texto (pendência), não em tela — não travo a tela com um aviso permanente sobre uma decisão de backend pendente |
| Ajuste avançado — leitura de `origem` (D-D) | n/a | n/a | n/a | n/a | toast/leitura mostrando `response.origem` | herda o guard de página existente | n/a |
| Bloqueios — campo de ID (D-F) | já existe | n/a | já existe (toast) | ausente | já existe (toast) | herda o guard de página existente | **texto de apoio explícito substituindo o silêncio atual** — motivo: ausência de endpoint de listagem, não falta de permissão |

Nenhuma linha desta tabela é opcional para quem implementar: em particular, a UnauthorizedState
"dentro do TabPanel" (não a página inteira) é a diferença entre repetir o erro que a divergência 15
já documentou para Reservas e não repeti-lo numa tela nova.

---

## Dívida visual — resumo

**Fecha:** a assimetria entre "página solteira" (Entrada/Saída/Movimentos hoje) e "hub com abas"
(Estoque avançado, Financeiro avançado, Portaria, Ausências, Benefícios) diminui — Estoque
básico ganha a mesma forma que o resto do ERP já usa para operações relacionadas dentro do mesmo
item de menu; divergência 14 (ilusão de acesso em saldos/movimentos) fecha; a `Tipo`/`Data` do
Histórico deixa de mentir (D-A).

**Cria, se aceito como proposto:** zero módulo novo divergindo — `TabView` chega ao 6º consumidor
com a mesma forma dos cinco anteriores; `EstoqueFilterBar` ganha um prop opcional sem quebrar os
outros cinco usos.

**Cria, se D-B for implementado como rota única em vez de três rotas com aba pré-selecionada:** a
navegação de Estoque diverge de "um clique por operação frequente" que o resto do menu (inclusive
o próprio Estoque, para Locais/Reservas/Inventários) preserva — 1 padrão de clique a mais, sem
precedente nos cinco hubs existentes, que nasceram todos com **um único** item de menu apontando
para eles desde o início (nunca colapsaram itens pré-existentes).

**Cria, se o Ajuste básico ganhar um dropdown hardcoded para "resolver" B-3 mais rápido:** o 2º
consumidor do antipadrão que hoje só existe em `ReservaEstoqueDialogs.tsx` — custo de alinhar
depois: 2 telas (Reserva e Ajuste) em vez de 1, e a decisão fica mais difícil de reverter porque
"já tem dois lugares fazendo assim" vira argumento a favor de manter.

---

## Onde discordo

Não identifiquei, na leitura desta rodada, um ponto de discordância explícita e endereçável contra
os outros três arquitetos — ainda não vi as posições deles. Registro uma **discordância antecipada**
contra uma leitura possível de `arquiteto-escopo-entrega` que eu quero nomear antes que ela apareça:

> **Discordo, antecipadamente, de qualquer proposta que resolva D-B colapsando Entradas/Saídas/
> Movimentos numa única rota para "simplificar a entrega".** Isso adia o custo errado: economiza
> uma rota e três linhas de `routePermissions.ts`, mas cobra o preço todo turno de trabalho, para
> sempre, de quem faz entrada/saída de estoque — a operação mais frequente do módulo. Custo de
> alinhar depois (se a decisão for tomada e precisar ser revertida): reeditar `AppMenu.tsx`,
> `routePermissions.ts` e as três rotas de novo, mais desfazer o estado de aba compartilhado entre
> três URLs. Reversível: sim, mas caro o bastante para eu preferir travar a posição correta agora.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "arquitetura",
  "assunto": "estoque",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/10-design-estoque.md",
  "decisoesPropostas": [
    {
      "id": "D-A",
      "decisao": "O defeito de nomes de campo (tipo/tipoMovimento, dataMovimento/criadoEm, fato 2/3 do inventário) e a ausência dos valores 8/9/10 em TipoMovimentoEstoque (fato 4) fecham na mesma versão que reorganiza Entrada/Saída/Histórico em abas, antes ou junto, nunca depois — a aba Histórico é a vitrine da entrega e não pode nascer mostrando '-' e contadores zerados. Ordem exata (.cN prévia ou mesmo diff) é decisão de arquiteto-escopo-entrega."
    },
    {
      "id": "D-B",
      "decisao": "Entrada, Saída e Histórico viram um único componente de página com PageHeader (sem actions) + TabView de 3 TabPanel, seguindo a forma já usada por 5 módulos (EstoqueAvancadoPage, FinanceiroAvancadoPage, PortariaPage, AusenciasPage, BeneficiosPage). Continuam existindo 3 rotas (/estoque/entradas, /saidas, /movimentos) e 3 itens de menu, cada uma instanciando o mesmo componente com uma aba inicial diferente via prop (mesma técnica que MovimentoOperacionalPage já usa com o prop kind). Guarda de página por hasAnyPermission(união); guarda por aba (PermissionGuard mode=disable no botão de Entrada/Saída; UnauthorizedState dentro do próprio TabPanel de Histórico, não bloqueando a página). Ajuste e Transferência ficam fora do TabView."
    },
    {
      "id": "D-C",
      "decisao": "Documento entra como InputText opcional, réplica do campo já usado em Entrada/Saída/Ajuste básico (4º consumidor, zero forma nova). OrigemId não vira campo de UI: é Guid de correlação sem catálogo e sem validação (o backend gera sozinho se omitido), sem uso legítimo de digitação manual por um operador humano — fica não exposto e não enviado, e a LACUNA do gate fecha no nível de schema/documentação, não de input em tela."
    },
    {
      "id": "D-D",
      "decisao": "Nenhum dropdown de origem do ajuste nasce nesta versão, para nenhum dos dois sistemas: o ajuste básico mantém origemModulo como InputText livre (B-3 segue sem catálogo publicado, bloqueio explícito); o ajuste avançado ganha apenas leitura do campo origem já calculado pelo backend na resposta (toast ou Tag), sem input novo, porque o campo nem existe como entrada no contrato. Não replico o array hardcoded de ReservaEstoqueDialogs.tsx — é antipadrão já em produção, não precedente a seguir."
    },
    {
      "id": "D-E",
      "decisao": "EstoqueFilterBar ganha prop opcional showPeriodo (filtro inicio/fim) usado pela aba Histórico, sem afetar os outros 5 consumidores do componente. Paginação de servidor não entra (o backend não tem Skip/Take); mantém-se a paginação visual existente, com um Message informativo quando não há filtro de período ativo. Coluna Motivo entra na tabela; as quatro colunas de saldo antes/depois (quantidadeAnterior/Posterior/ReservadaAnterior/Posterior) ficam fora por densidade, sem padrão de linha expandida no repositório para justificar criar um agora."
    },
    {
      "id": "D-F",
      "decisao": "Saldos e Movimentos ganham regra própria em routePermissions.ts, fechando a divergência 14 (ilusão de acesso). Bloqueios não recebe seletor de entidade nesta versão — não há endpoint de listagem para alimentar um, e inventar um não é decisão de frontend; o máximo que entra é um texto de apoio explicando a ausência de busca, sem fingir capacidade de seletor. Gatilho de revisita: GET de listagem de bloqueios publicado pelo backend. Divergência 15 (Reservas mais restritiva que o backend) não é decidida aqui — fora do escopo da pergunta D-F."
    }
  ],
  "discordancias": [
    "Discordo, antecipadamente (sem posição publicada ainda para confrontar), de qualquer proposta que colapse Entradas/Saídas/Movimentos numa única rota para simplificar a entrega. Isso adia o custo errado: economiza edição de rota/menu uma vez, mas cobra um clique extra em uma das operações mais frequentes do módulo, todo turno, para sempre. Reversível, mas caro o bastante para travar a posição (3 rotas + aba pré-selecionada) desde já."
  ],
  "pendencias": [
    { "tipo": "execucao", "pergunta": "A correção do defeito de nome de campo (D-A) entra como .cN antes da b68 ou no mesmo diff da b68 — decisão de calendário, não de template.", "decide": "arquiteto-escopo-entrega / orquestrador" },
    { "tipo": "backend", "pergunta": "B-3 (catálogo de origemModulo) segue sem resposta — enquanto não vier, o item 'origem do ajuste como dropdown' do plano da b68 fica formalmente bloqueado para o ajuste básico.", "decide": "resposta de backend, fora desta rodada" },
    { "tipo": "backend", "pergunta": "GET de listagem de bloqueios — sem ele, o antipadrão de GUID digitado em Bloqueios não tem correção estrutural possível só no frontend.", "decide": "resposta de backend, fora desta rodada" }
  ],
  "riscos": [
    "Não abri preview_start nesta rodada: a forma proposta em D-B ainda não existe em nenhuma rota (confirmado pelo próprio inventário, seção 1), então não havia tela nova para navegar; a leitura de código das 5 páginas-precedente e das rotas atuais de Estoque é a evidência usada, citada por arquivo.",
    "D-A assume que a cadeia de evidência do inventário (nome de propriedade C#, ausência de JsonPropertyName, comportamento padrão do ASP.NET Core) é suficiente para agir sem confirmação HTTP real — se uma policy de serialização não capturada na leitura de código estiver ativa, a correção proposta (renomear no tipo do frontend) seria desnecessária ou trocada por outra.",
    "D-B assume que reaproveitar MovimentoOperacionalPage com um prop de aba inicial é tecnicamente equivalente ao padrão dos 5 precedentes (que não têm prop de aba inicial, porque só existe 1 rota cada) — é uma extensão nova da técnica, não uma cópia literal; se a implementação achar essa extensão mais cara do que estimado aqui, a alternativa de rota única volta à mesa e a discordância registrada precisa ser resolvida pelo orquestrador."
  ]
}
```
