# Design system — rodada 04, `cadastros-fiscais`

Agente: `arquiteto-design-system`. Insumo:
`docs/arquitetura/debate/04-inventario-cadastros-fiscais.md` (29 endpoints, DIV-1 a DIV-9),
`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5/§6, `docs/arquitetura/DECISOES.md`,
`layout/AppMenu.tsx`, `lib/security/routePermissions.ts`. Proponho; não decido.

Busca feita antes de propor (comandos colados, não parafraseados):

```text
grep -n "Fiscal\|fiscal" layout/AppMenu.tsx                          -> grupo "Fiscal" flat, 7 itens, sem subgrupo
grep "items:\s*\[\s*\{[^}]*items:" layout/AppMenu.tsx (regex)        -> 0 ocorrências: nenhum grupo aninhado no arquivo inteiro
grep -rl "ReasonDialog" features/                                     -> 44 arquivos
grep -rl "DataTableServer" features/                                  -> 64 arquivos
grep -rl "EntitySelect\|SearchSelect" features/                       -> 49 arquivos
grep -rl "EntityManagementPage" app/ features/                        -> 1 (o próprio arquivo; zero consumidor)
find app/(main) -type d -name "[id]"                                  -> 7 rotas de detalhe (compras x3, faturamento, fiscal/notas, frota/veiculos, servicos/ordens, vendas/pedidos)
grep -rn "TabView" features/                                          -> 9 arquivos, inclui PessoaFormDialog.tsx e ProdutoFormDialog.tsx
```

---

## Q1 — Fronteira de feature

**P04-DS-1.** Séries fiscais, Naturezas de operação/CFOP e Cadastros fiscais (NCM/CEST/CST/
geografia/unidades/modelos) moram todos em `features/fiscal/{api,schemas,hooks,types,components}`,
como subconjuntos nomeados (`seriesFiscaisApi.ts`, `naturezasOperacaoApi.ts`,
`cadastrosFiscaisApi.ts`, `modelosDocumentoFiscalApi.ts`) — não um feature novo. O bloco fiscal da
Pessoa fica em `features/pessoas`.

Argumento: todos os quatro controllers do recorte (`SeriesFiscaisController`,
`NaturezasOperacaoController`, `CadastrosFiscaisController`, `ModelosDocumentoFiscalController`)
vivem em `Erp.Api/Controllers/Fiscal/*` (inventário, cabeçalho "Backend lido"); `AtualizarDados
FiscaisPessoaUseCase` e as rotas de endereço/contato vivem em `Erp.Application/Pessoas/*` e são
expostas por `PessoasController` (inventário §1.4). `CLAUDE.md` não deixa ambiguidade: a árvore de
feature nasce do contrato do backend, não do primeiro consumidor que aparece. O achado que muda
esta resposta em relação a "deixar como está": `features/tributacao/api/tributacaoApi.ts:232-243`
hoje é dono de `listarNcm`/`listarCfop` — que são rotas de `CadastrosFiscaisController`, não de
tributação — só porque foi o primeiro a precisar de um combo. Com F3.2 (Naturezas precisa de CFOP
por âmbito) e F3.3 (Pessoa precisa de município/país) chegando, `tributacao` deixa de ser o único
consumidor: é o terceiro caso da régua, e o terceiro caso não deveria ter nascido dono do dado.

O que vira compartilhado entre features (não em `components/`, que é para widget genérico, não
dado de domínio): `CadastroFiscalSelects.tsx` (hoje em `features/tributacao/components`) migra para
`features/fiscal/components/`, ganha `MunicipioSelect`/`PaisSelect`/`CestSelect`/`CstSelect`/
`NaturezaOperacaoSelect`/`SerieFiscalSelect`/`ModeloDocumentoFiscalSelect`, e `tributacao` passa a
importar de `features/fiscal` — import cruzado já é prática aceita no repositório:
`features/tabelas-preco/components/TabelasPrecoPage.tsx:23` importa
`useProdutos` de `@/features/produtos/hooks/useProdutosResources` hoje, sem que isso vire feature
nova. Não é abstração nova: é mover o dono do dado para onde o contrato do backend diz que ele mora.

O que eu abro mão: não decido se `features/fiscal` vira grande demais para dividir depois (5
controllers, ~30 endpoints); se crescer mais (ex.: entrar Inutilizações, Observabilidade, que já
estão lá), o corte por sub-diretório dentro do feature já resolve — não é motivo para feature novo
hoje. Devolvo a `arquiteto-plataforma-frontend` a decisão de dividir `features/fiscal` em módulos
menores se o ano 5 pedir.

---

## Q2 — Padrão de tela

**P04-DS-2 — listagem + diálogo + `ReasonDialog`, não um componente novo.** O padrão já existe e
tem consumo maciço: `PageHeader` (título+ações) → `Card` com `DataTableServer` (paginação
server-side) → `DataTableActions` (ações de linha, filtradas por permissão) → diálogo de
criar/editar → `ReasonDialog` para inativação com motivo obrigatório. Medição: `ReasonDialog` tem
44 consumidores, `DataTableServer` tem 64 (`grep -rl`, comandos no topo). Referência mais próxima
do formato que Séries fiscais e Naturezas de operação precisam:
`features/tabelas-preco/components/TabelasPrecoPage.tsx` — lista com `Ativar`/`Inativar` por
permissão granular (`TABELAS_PRECO_ATIVAR`/`_INATIVAR`, linhas 136-137), diálogo de item filho
dentro da mesma tela (linhas 144-163), e `ReasonDialog` só para a ação que exige motivo (linha 181).
É o mesmo três-em-um que `SerieFiscal` (série + faixa + vigência) e `NaturezaOperacao` (natureza +
mapeamentos de CFOP) precisam. Não crio `CrudListPage` genérico: `features/shared/components/
EntityManagementPage.tsx` já é essa tentativa, tem **zero consumidor** (`grep -rl
"EntityManagementPage" app/ features/` devolve só o próprio arquivo) e está marcada para remoção em
F5.6 do plano ("remover a camada de CRUD genérico órfã"). Reusar ou estender um componente que o
próprio plano já descreve como órfão seria construir sobre o padrão errado.

O que eu abro mão: aceito que Séries fiscais tenha uma tela um pouco mais carregada que Tabelas de
Preço (5 ações de linha em vez de 3: editar, ampliar, encerrar vigência, inativar, ver buracos) —
`DataTableActions` já resolve isso colapsando em menu kebab no mobile (`DataTableActions.tsx:41-49`,
"evitando que 3+ botões empilhem"); não é motivo para desenhar tela nova.

**P04-DS-3 — "Ampliar" e "Encerrar vigência" são diálogos de campo único locais ao módulo, não um
componente compartilhado novo.** Cada um tem hoje **um único consumidor possível** (só `SerieFiscal`
tem faixa e vigência editável desta forma — `AmpliarNumeroFinalSerieFiscalRequest`/
`EncerrarVigenciaSerieFiscalRequest`, inventário §1.1). Régua de três casos: 1 caso fica no módulo.
Estrutura-los como `TabelaPrecoItemDialog`-style (`features/tabelas-preco/components/
TabelaPrecoItemDialog.tsx`, diálogo pequeno e dedicado) em
`features/fiscal/components/SerieFiscalDialogs.tsx`, sem inventar um "SingleFieldDialog" genérico ao
lado do `ReasonDialog` — teria um consumidor e seria a abstração prematura que a skill proíbe.

O relatório de **buracos** (`GET /series/{id}/buracos`) é outro padrão: não é formulário, é leitura
tabular derivada, sem paginação no backend (inventário §6: "monta em memória... sem teto"). Proposta:
ação de linha "Ver buracos" abre um `Dialog` com `DataTable` local (paginação client-side sobre o
array já carregado, não `DataTableServer`, que espera paginação de servidor) e, quando
`NumerosSemDocumentoAutorizado.length` passar de um teto (proponho 1000, número de bolso — não
medido em produção, porque não há dado real, o próprio inventário registra isso), mostrar
`Message severity="warn"` sugerindo inutilização formal em vez de renderizar a lista inteira. Não há
tela hoje no repositório que precise defender um array não paginado desse tamanho — é padrão novo,
com um consumidor. Fica módulo, sem componente compartilhado; eu só registro a regra porque, se
aparecer um segundo endpoint "não pagina e monta tudo em memória" (o próprio backend já tem esse
hábito, ver inventário §2 "reentrante"), a régua vira 2 casos, ainda não 3.

**P04-DS-4 — `DataTableActions` ganha `disabledReason` opcional: é o terceiro caso, não o primeiro.**
Hoje `components/data/DataTableActions.tsx:10-18` declara `disabled?: boolean` sem campo de motivo —
nenhum dos 40+ consumidores (mesma contagem de `DataTableServer`) mostra por que um botão de linha
está cinza. Existe precedente isolado fora do componente: `FaturamentoDetalhePage.tsx:106-107` usa
`tooltip`/`tooltipOptions={{ showOnDisabled: true }}` direto no `Button`, decisão travada em D23
("Confirmar fica indisponível, com o motivo visível"). Séries fiscais e Naturezas de operação vão
precisar do mesmo padrão em pelo menos quatro botões de linha (Ampliar/Encerrar vigência/Inativar
desabilitados quando a série está inativa — `SerieFiscal.cs:142-148`; Inativar natureza quando já
inativa). Isso fecha o terceiro caso (D23 bespoke + a regra de piso da skill "ação indisponível
sempre com motivo visível" + F3 com múltiplos botões state-gated): proponho **corrigir o padrão
compartilhado**, não repetir o `tooltip` manual pela quarta vez. Mudança é aditiva (prop opcional,
default `undefined` = comportamento atual preservado), não quebra os 40 consumidores existentes.

O que eu abro mão: não é código meu para escrever, e devolvo ao orquestrador se isso entra como
ajuste ao primitivo dentro da mesma fatia de F3.1 ou como item avulso de F5 (é pequeno o bastante
para não merecer fatia própria, mas toco um arquivo fora de `features/fiscal`, e isso é decisão de
escopo, não de design).

---

## Q3 — Navegação e menu

**P04-DS-5.** Itens novos entram **flat** dentro do grupo "Fiscal" existente
(`layout/AppMenu.tsx:131-143`), não em subgrupo "Cadastros fiscais". Três motivos, em ordem de peso:

1. **Não existe subgrupo em nenhum lugar do arquivo.** `grep` pela forma `items: [ { ..., items: }`
   (grupo dentro de item) devolve zero ocorrências nas 31 declarações de `items:` do arquivo inteiro
   — todo `AppMenu.tsx` é hoje uma árvore de dois níveis (grupo → item). Introduzir um terceiro nível
   por causa de quatro itens fiscais quebraria a consistência para os outros 39 módulos, não só
   criaria uma exceção local.
2. **O gate de menu (D44/D45/D46, fatia `v1.11.0a8b57.c1`) foi reescrito há um commit para essa
   forma de dois níveis.** `scripts/lib/guard-permission-map.mjs` deriva hierarquia de `isVisible`
   com três formas de permissão suportadas por item (`permission`/`anyPermissions`/`allPermissions`,
   D45 item 2) e reprova item com mais de uma forma (D46). Nada nesse código foi escrito pensando em
   grupo aninhado; forçar um terceiro nível reabriria um gate que acabou de fechar, para um caso que
   nenhum outro módulo tem.
3. **Compras já resolve "grupo com itens heterogêneos" flat**: `Fiscal` hoje mistura Notas/
   Simulador/Regras/Exceções/Exceções NCM/Observabilidade/Inutilizações (7 itens de naturezas
   diferentes) sem subgrupo; `Compras` mistura Pedidos/Solicitações/Cotações/Recebimentos (4 itens,
   `AppMenu.tsx:122-130`) do mesmo jeito. Quatro itens novos (Séries fiscais, Naturezas de operação,
   Cadastros fiscais, Modelos de documento) é o mesmo formato, não um caso especial.

Permissões no pai: `anyPermissions` do grupo "Fiscal" (linha 133) ganha
`FISCAL_SERIES_CONSULTAR`, `FISCAL_SERIES_GERENCIAR`, `FISCAL_CADASTROS_CONSULTAR`,
`FISCAL_CADASTROS_GERENCIAR`, `FISCAL_MODELOS_CONSULTAR` — hoje nenhuma das cinco está no array
(confirmado por leitura de `AppMenu.tsx:133`). Sem isso, o grupo "Fiscal" fica invisível para um
usuário que só tenha permissão de série/natureza/cadastro (o defeito exato que D44/D45 corrigiram
para outro módulo — "filho que o pai não admite esconde o grupo inteiro"). "Naturezas de operação" e
"Cadastros fiscais" compartilham as mesmas duas permissões (`FISCAL_CADASTROS_CONSULTAR`/
`_GERENCIAR`, inventário §4: "as mesmas duas constantes... não há permissão própria para naturezas
de operação") — são dois itens de menu distintos com o mesmo `anyPermissions`, o que é permitido
(D46 proíbe duas *formas* no mesmo item, não dois itens com a mesma forma).

Bloco fiscal da Pessoa: **aba, não diálogo separado nem seção solta.** `PessoaFormDialog.tsx:84-137`
já é um `Dialog` com `TabView` de três abas ("Dados gerais", "Documentos e observações", "LGPD e
auditoria visual"). Precedente direto e com o mesmo nome: `features/produtos/components/
ProdutoFormDialog.tsx:241` já tem uma aba **chamada "Dados fiscais"** para o bloco fiscal do Produto.
Bloco fiscal da Pessoa (8 campos, todos escalares — indicador, IE-ST, Suframa, regime, município,
país, contribuinte IPI, tomador órgão público) é uma quarta `TabPanel` "Dados fiscais" no mesmo
diálogo, mesmo nome de aba que Produto já usa — zero padrão novo.

**Endereços e Contatos não cabem na mesma resposta — são listas com CRUD próprio (adicionar, editar,
marcar principal, remover), não campos escalares.** Empilhar uma tabela com diálogo filho dentro de
uma aba de um `Dialog` que já é modal é o antipadrão que este repositório evita — nenhum dos 9
arquivos com `TabView` faz isso hoje (`ProdutoFormDialog` tem uma aba "Códigos e fornecedores" que
só abre depois de salvar e mensagem dizendo para usar as ações da linha da tabela principal, não uma
sub-lista dentro do próprio diálogo). O padrão que o repositório já usa para "entidade com coleções
filhas" é a **rota de detalhe própria**: 7 ocorrências de `app/(main)/**/[id]/page.tsx`
(`compras/{cotacoes,pedidos,solicitacoes}`, `faturamento`, `fiscal/notas`, `frota/veiculos`,
`servicos/ordens`, `vendas/pedidos`), cada uma com `TabView` para as coleções relacionadas
(`VeiculoDetalhePage.tsx:160-172`: abas "Abastecimentos"/"Manutenções", mesma forma). Proponho
`app/(main)/pessoas/[id]/page.tsx` com abas "Dados fiscais" (reaproveitando o formulário), "Endereços"
e "Contatos" (lista + diálogo, `EntityStatus`/principal via `Tag`, mesmo padrão de
`DataTableActions`), e o cabeçalho da página com Bloquear/Desbloquear via `ReasonDialog`
(`PESSOAS_BLOQUEAR`). `PessoasPage.tsx` (a listagem) ganha uma ação de linha "Detalhes" que navega
para a rota, ao lado de "Editar" (que continua abrindo o `Dialog` rápido para os campos que já
existem hoje).

O que eu abro mão: essa divisão (diálogo para campo escalar × rota para coleção filha) é uma leitura
de UX de fluxo, e é exatamente o tipo de julgamento que `arquiteto-operacao-erp` pode preferir
inverter (ex.: manter tudo no diálogo se o operador raramente cadastra endereço/contato fora do
fluxo de criação da pessoa). Gatilho de revisita: se o inventário de uso mostrar que endereço/
contato é preenchido quase sempre junto da criação da pessoa (não depois), o custo de navegar para
uma rota nova por 2 campos vira fricção, e a resposta certa pode ser sub-diálogos abertos a partir da
aba mesmo dentro do modal — abro mão dessa parte se a evidência de fluxo divergir.

---

## Q4 — DIV-5

**P04-DS-6.** As seis mensagens (`SerieFiscalNaoCadastradaParaContexto`,
`CfopSemMapeamentoParaAmbito`, `DestinatarioSemEnderecoFiscal/EnderecoPrincipal/MunicipioIbge/
IndicadorContribuinteIcms`) são hoje texto de `ApiErrorPanel` sem ação — o operador lê "cadastre a
série antes de validar" e não tem para onde ir. A resposta de design não é reescrever o texto (o
texto já é bom: nomeia o quê falta), é **anexar navegação**, porque a partir desta rodada as telas
citadas passam a existir. Proponho um `Message severity="warn"` com um `Button link` para a rota
correta, montado no mesmo `ApiErrorPanel`/local onde a mensagem aparece hoje — não um componente
novo: `ApiErrorPanel` (`components/feedback/ApiErrorPanel.tsx`) já é o único lugar que renderiza
`error.message`/`code`/`traceId`, e é o ponto certo para acrescentar, opcionalmente, um mapa
`código-de-erro → rota`. Isso é compartilhado desde o primeiro consumidor porque **a régua de três
casos já está satisfeita antes de eu escrever a linha**: são seis mensagens diferentes hoje, todas
do mesmo formato "cadastre X antes de Y", nascendo juntas nesta rodada — não é "um caso que pode
virar padrão depois", é seis casos simultâneos do mesmo padrão.

Onde mora: um mapa `FISCAL_ERROR_ROUTES: Record<string, { label: string; to: string }>` em
`features/fiscal/components/fiscalUiUtils.ts` (arquivo que já existe e já concentra utilitário de UI
fiscal, citado em D33-D38), consultado por `error.code` (o inventário confirma que `code` sempre
chega — `ApiErrorResponseFilter`). O botão não substitui o texto do backend, some quando o `code` não
está no mapa (toda mensagem de erro sem rota conhecida continua exatamente como hoje).

O que eu abro mão: não decido se o link deve **navegar para fora do fluxo atual** (perder o rascunho
da nota fiscal em edição) ou **abrir a tela de cadastro numa nova aba/diálogo**. Sem saber se
`NotaFiscalDetalhePage` guarda rascunho local não persistido, um link que navega para fora pode
custar trabalho não salvo — isso é pergunta para `arquiteto-operacao-erp`, que enxerga o fluxo
completo. Se a resposta for "abre em diálogo", o botão vira `onClick` que abre `SerieFiscalFormDialog`
num modal por cima do modal atual — mais uma exceção ao "sem modal sobre modal" da Q3; registro os
dois caminhos e não escolho.

---

## Q5 — DIV-2, DIV-3, DIV-4, DIV-8

**P04-DS-7**, quatro destinos:

- **DIV-2 (legenda falsa "sem endpoint operacional" em `FiscalActionDialogs.tsx:136,187`).** Corrige
  agora, dentro da própria F3.2: o campo "Natureza de operação" deixa de ser `InputText disabled` e
  vira `NaturezaOperacaoSelect` (mesmo componente de `CadastroFiscalSelects.tsx`, escopado por
  `empresaId`). Mesma classe de defeito que o P5 do plano já registrou para a aba de Impostos —
  "campo mente sobre a capacidade real do backend" é exatamente a régua do meu mandato: template que
  mente para o operador é o defeito mais caro que existe, e a linha de código para corrigir já é
  conhecida (troca de widget, não redesenho).
- **DIV-3 (natureza inativa não barrada ao derivar CFOP de item novo).** Não é decisão de UI —
  registro é do inventariante para o backend decidir. Minha contribuição, para não travar em cima
  disso: qualquer que seja a resposta, `NaturezaOperacaoSelect`/`CfopSelect` já devem marcar opção
  inativa com `Tag severity="danger" value="Inativa"` no label (mesmo padrão visual de
  `TabelasPrecoPage.tsx:132`, `Tag value={isTabelaAtiva ? 'Ativa' : 'Inativa'}`), para que o operador
  veja o estado antes de escolher — isso vale independente de o backend acabar bloqueando ou não.
- **DIV-4 (`Error.Conflict` sai como 400, nunca 409).** Não construo fluxo de UI para 409 nestas
  quatro áreas — seria montar tratamento para um estado que o inventário mediu que **nunca chega**
  (`ApiErrorResponseFilter.cs:80-93`, controllers sempre `BadRequest`). O sétimo estado da minha
  lista ("ação indisponível com motivo") não se aplica aqui: o erro chega, tem `code`/`message`, o
  `ApiErrorPanel` já mostra — é o fluxo padrão de 400, sem padrão de "recarregue e confirme" (que
  `FLUXOS-E-REGRAS-PARA-A-UI.md` §4.3 reserva para onde 409 realmente chega).
- **DIV-8 (NCM/CFOP resumo sem Zod).** Os tipos **novos** que F3.4 cria (município, país, CEST, CST,
  CSOSN, origem, unidade, UF, código de serviço) nascem com schema Zod não-`.strict()` desde o
  primeiro commit — é a mesma regra de T5 do plano aplicada no nascimento, não depois. Não estendo
  isso a `NcmResumoResponse`/`CfopResumoResponse` existentes: são código fora do recorte de F3, e
  tocar neles sem plano de teste é o "reescrever arquivo fora do escopo" que `00_padrao_de_execucao`
  proíbe. Fica registrado como dívida não fechada por esta rodada, com o mesmo destino que DIV-8 já
  tinha antes: F5.

O que eu abro mão em todos os quatro: não sou eu quem decide se DIV-3/DIV-4 têm resposta de backend
diferente da leitura atual — só descrevo como a tela se comporta nos dois cenários possíveis, para
não bloquear F3 numa pergunta que `pendencias` do inventariante já endereçou ao backend.

---

## Q6 — Volume e dado amostra

**P04-DS-8.** O componente que já existe (`SearchSelect`/`CadastroFiscalSelects.tsx`) **já é a
resposta correta** para os combos: busca por `termo` no servidor, `pagina/tamanhoPagina` no backend
(default 20), nunca "carrega tudo". Isso não muda quando NCM passar de 17 linhas de amostra para as
~10.000 da TIPI oficial (medição do inventário, `data/fiscal/README.md` + contagem de
`data/fiscal/ncm.csv`) — o componente já não depende do tamanho da tabela, porque nunca lista tudo.
**O que não está pronto hoje e F3.4 herda como defeito, não como decisão nova**: `useNcmOptions`/
`useCfopOptions` (`features/tributacao/hooks/useTributacao.ts:72-99`) disparam uma query nova a cada
tecla (`queryKey: ncmOptionsQueryKey(termo)`, sem `useDebouncedValue`), enquanto o mesmo repositório
já tem o padrão certo ao lado: `FiscalActionDialogs.tsx:116-118` usa
`useDebouncedValue(pessoaSearch.trim())` antes de consultar. Com 17 registros de amostra isso não
dói; com a tabela oficial completa, cada tecla vira uma consulta ao banco de produção. Proponho que
todo select novo de F3.4 (`MunicipioSelect`, `PaisSelect`, etc.) nasça com `useDebouncedValue`, e que
a correção do `useNcmOptions`/`useCfopOptions` existente entre no mesmo diff **se** a fatia já for
tocar `useTributacao.ts` por causa do Q1 (mover o dono do dado) — não abro uma fatia só para isso.

Para telas de **listagem/busca** de cadastro fiscal (não combo — uma tela "Consultar NCM" de fato,
se F3.4 decidir ter uma), o padrão é `DataTableServer` com paginação real, igual a
`TabelasPrecoPage.tsx:128`. Nenhuma tela nova carrega a tabela inteira em memória — nem hoje (17
linhas) nem quando a tabela oficial chegar.

Quando o cadastro oficial chegar (`POST /importar/{tabela}`): nada muda na tela de busca/seleção,
porque ela já pagina. O que muda é o `NcmResumoResponse`/`CfopResumoResponse` reduzido a 4-5 campos
(inventário §1.3.1: "6 campos do `NcmResponse` nunca lidos, 7 do `CfopResponse`") — se uma tela
futura precisar de `VigenciaInicio`/`VigenciaFim`/`ExTipi` (que só fazem sentido quando o cadastro é
oficial, não a amostra), o tipo reduzido não tem esses campos hoje; é dívida que só aparece quando
alguém pedir esses campos, registrada aqui para não surpreender quem tocar nisso depois.

O que eu abro mão: não decido se F3.4 precisa de uma tela de listagem dedicada para NCM/CFOP/CEST/
CST/geografia, ou se combos de busca (para os formulários que os referenciam) bastam nesta fatia — é
decisão de escopo/entrega, não de padrão visual. Se a tela existir, o padrão acima se aplica; se não
existir agora, não fica dívida, porque o combo já é o consumo real hoje.

---

## Q7 — Sequência e fatiamento

**P04-DS-9.** Do ponto de vista de template, a ordem que menos cria campo provisório (disabled/texto
livre "aguardando parametrização", o próprio defeito de DIV-2) é:

1. **Modelos de documento fiscal entra junto de Séries fiscais, não por último.** `CriarSerieFiscal
   Request` exige `ModeloDocumentoFiscalId: Guid` (inventário §1.1, item 2) — sem o select de modelo
   pronto, o formulário de criar série nasceria com o mesmo defeito que estou corrigindo em DIV-2
   (campo obrigatório sem widget real). F3.5 é 1 endpoint, 5 campos, cadastro global, só leitura —
   custo baixo, e destrava F3.1 sem gambiarra.
2. **F3.1 (Séries fiscais)** — fecha a mensagem `SerieFiscalNaoCadastradaParaContexto` (a primeira
   das seis de DIV-5).
3. **F3.2 (Naturezas de operação + CFOP)** — fecha `CfopSemMapeamentoParaAmbito` e corrige DIV-2 (o
   campo "Natureza de operação" no diálogo de nota fiscal). Reaproveita `CfopSelect`, que já existe.
4. **Extração de `CadastroFiscalSelects` para `features/fiscal` + os selects novos (município, país,
   CEST, CST, UF)** — não é uma "onda" funcional nova, é o Q1 sendo pago antes do próximo item
   precisar dele. Sem isso, F3.3 nasceria com o mesmo problema que criou DIV-2: um campo que devia
   ser select e vira texto porque o combo ainda não existe no lugar certo.
5. **F3.3 (bloco fiscal da Pessoa)** — fecha as três últimas mensagens de DIV-5
   (`DestinatarioSemEnderecoFiscal/EnderecoPrincipal/MunicipioIbge/IndicadorContribuinteIcms`). Ponto
   de atenção que não é meu para decidir, mas registro porque é um defeito de tela mentindo: o "+8"
   do plano cobre só o `PATCH /dados-fiscais`; sem os 12 endpoints de endereço/contato (que o próprio
   inventário classifica como "pré-requisito funcional, não-fiscal", §1.4.2), a aba "Dados fiscais"
   da Pessoa deixa o operador preencher `IndicadorContribuinteIcms` sem nunca conseguir vincular um
   endereço com município — a mensagem de erro na nota fiscal continua apontando pra uma tela que
   tecnicamente existe mas está incompleta. Isso é o mesmo "estado ausente = tela mentindo" do
   §3 da minha skill, só que no nível de feature, não de componente: uma aba "Dados fiscais" sem
   "Endereços" ao lado é uma tela que promete resolver DIV-5 e não resolve.

O que fica **fora de F3** (proponho, não decido): `ClassificacoesPessoa` (vizinhança, não numerada,
inventário §1.6 — mesmo módulo (`Pessoas`), zero conflito de padrão se entrar depois). DIV-7 —
proponho que os 9 campos **fiscais** (`IndicadorContribuinteIcms` até `TomadorOrgaoPublico`) entrem
com F3.3 (são os mesmos que a aba "Dados fiscais" já exibe), mas `Bloqueada`/`MotivoBloqueio` **e**
os endpoints `bloquear`/`desbloquear` ficam de fora do recorte estritamente fiscal — é bloqueio
operacional (o próprio inventário já separa isso em §1.4.2, "pré-requisito... não-fiscal"), e a régua
de "documento fiscal deixa de falhar" não pede isso: nenhuma das seis mensagens de DIV-5 menciona
pessoa bloqueada. Gatilho para entrar: se alguém medir que nota fiscal para pessoa bloqueada também
falha hoje sem tela (não medido nesta rodada — é a mesma pergunta que a `pendencias` do
inventariante já registrou para o cliente decidir).

---

## Divergências que espero dos outros três

- `arquiteto-operacao-erp` deve discordar de **Q3** (rota de detalhe para Pessoa) se o fluxo real
  mostrar que endereço/contato é preenchido no mesmo instante da criação — nesse caso o custo de
  navegação supera o ganho de padrão, e a resposta pode ser diálogo com abas mesmo.
- `arquiteto-escopo-entrega` deve discordar de **Q7** no ponto "extrair `CadastroFiscalSelects` antes
  de F3.3" — pode preferir pagar essa extração como dívida explícita (import direto de
  `features/tributacao` a partir de `features/pessoas`, mais feio, porém mais rápido) em vez de
  atrasar a entrega de F3.3 com um passo de reorganização que não é visível para o usuário.
- `arquiteto-plataforma-frontend` deve discordar de **P04-DS-1**: pode achar que 4 controllers e
  ~30 endpoints dentro de um `features/fiscal` já carregado (Notas, Regras, Observabilidade,
  Inutilizações) passa do teto razoável de um feature, e preferir um `features/fiscal-cadastros`
  novo desde já, mesmo com um consumidor a menos que minha régua de três casos pediria.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "cadastros-fiscais",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/04-design-cadastros-fiscais.md",
  "decisoesPropostas": [
    { "id": "P04-DS-1", "resumo": "Séries/Naturezas/CadastrosFiscais/Modelos moram em features/fiscal (subconjuntos nomeados); bloco fiscal da Pessoa fica em features/pessoas; CadastroFiscalSelects migra de features/tributacao para features/fiscal/components e tributacao passa a importar de lá." },
    { "id": "P04-DS-2", "resumo": "Padrão de tela é o existente (PageHeader + Card/DataTableServer + DataTableActions + diálogo + ReasonDialog), referência TabelasPrecoPage.tsx; não reusar nem estender EntityManagementPage (órfã, F5.6 já marca remoção)." },
    { "id": "P04-DS-3", "resumo": "Ampliar/Encerrar vigência são diálogos locais de campo único (1 caso, fica no módulo); relatório de buracos usa Dialog + DataTable local com teto de exibição (1000, não medido) e aviso, não DataTableServer." },
    { "id": "P04-DS-4", "resumo": "DataTableActions ganha prop opcional disabledReason (tooltip + tooltipOptions showOnDisabled), aditivo, aplicável aos 40+ consumidores; nasce do 3º caso (D23 bespoke + piso da skill + F3 com múltiplos botões state-gated)." },
    { "id": "P04-DS-5", "resumo": "Itens novos entram flat no grupo Fiscal existente, sem subgrupo (zero precedente de grupo aninhado, gate D44-D46 não suporta); anyPermissions do grupo pai ganha as 5 permissões novas; bloco fiscal da Pessoa vira aba 'Dados fiscais' em PessoaFormDialog (mesmo nome que ProdutoFormDialog já usa); endereços/contatos ganham rota de detalhe app/(main)/pessoas/[id] com TabView, seguindo o padrão de 7 rotas [id] existentes." },
    { "id": "P04-DS-6", "resumo": "As 6 mensagens de DIV-5 ganham link de navegação opcional no ApiErrorPanel via mapa código-de-erro→rota; destino exato do link (navegar fora vs. diálogo sobreposto) fica em aberto para arquiteto-operacao-erp." },
    { "id": "P04-DS-7", "resumo": "DIV-2 corrige já (widget real); DIV-3 sem decisão de UI, mas select marca opção inativa com Tag; DIV-4 não constrói fluxo de UI para 409 (nunca chega); DIV-8 novos tipos de F3.4 nascem com Zod não-strict, tipos existentes (NcmResumo/CfopResumo) ficam para F5." },
    { "id": "P04-DS-8", "resumo": "Selects já são server-side e não mudam com o volume oficial; débito real é useNcmOptions/useCfopOptions sem debounce, corrigir se a fatia já tocar useTributacao.ts por causa do Q1; novos selects (município/país/etc.) nascem com useDebouncedValue." },
    { "id": "P04-DS-9", "resumo": "Ordem: (Modelos+Séries) -> Naturezas/CFOP -> extração de CadastroFiscalSelects + selects novos -> bloco fiscal da Pessoa (com endereços/contatos juntos, não só o PATCH); ClassificacoesPessoa fora; DIV-7 fiscal entra, Bloqueada/MotivoBloqueio fica fora do recorte fiscal." }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "sobre": "Q3 - rota de detalhe [id] para Pessoa vs. diálogo com abas", "motivo": "depende do fluxo real de quando endereço/contato é preenchido" },
    { "de": "arquiteto-escopo-entrega", "sobre": "Q7 - extrair CadastroFiscalSelects antes de F3.3", "motivo": "pode preferir import cruzado feio e rápido a um passo de reorganização sem valor visível" },
    { "de": "arquiteto-plataforma-frontend", "sobre": "Q1 - features/fiscal como dono único vs. features/fiscal-cadastros novo", "motivo": "teto de tamanho de feature pode pesar mais que a régua de três casos" }
  ],
  "pendencias": [],
  "riscos": [
    "P04-DS-3: teto de 1000 números no relatório de buracos é estimativa de bolso, não medição - não há dado de produção para calibrar.",
    "P04-DS-4: DataTableActions é consumido por 40+ módulos; qualquer erro na prop nova tem raio de explosão amplo, mesmo sendo aditiva.",
    "P04-DS-9: bloco fiscal da Pessoa sem endereços/contatos juntos reproduz o padrão 'tela mentindo' que DIV-5 já denuncia - se escopo/entrega cortar os 12 endpoints não-fiscais desta fatia, a aba 'Dados fiscais' fica incompleta por desenho, não por acidente."
  ]
}
```
