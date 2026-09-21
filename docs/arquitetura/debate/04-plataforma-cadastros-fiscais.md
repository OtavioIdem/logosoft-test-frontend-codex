# Debate 04 — Cadastros fiscais — posição do `arquiteto-plataforma-frontend`

Assunto: `cadastros-fiscais`. Insumo: `docs/arquitetura/debate/04-inventario-cadastros-fiscais.md`
(inventário, 29 endpoints, DIV-1 a DIV-9), `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5 (F3) e
§6 (T1-T8), `docs/arquitetura/DECISOES.md` (D1-D46). Viés declarado: custo de mudar isto depois que
existirem quarenta módulos — não "funciona hoje".

Nesta rodada eu **proponho**; quem trava `Dn` é o orquestrador.

---

## Q1 — Fronteira de feature

### P04-PLAT-1 — Bloco fiscal da Pessoa fica em `features/pessoas`, sem discussão

O `PATCH /api/pessoas/{id}/dados-fiscais` opera sobre o mesmo agregado que os 4 endpoints já
consumidos hoje (`PessoaResponse`, 22 campos posicionais — inventário §1.4.3), guardado pelo mesmo
contexto (`PessoaContextoOperacional`, não `FiscalContextoOperacional` — inventário §3, tabela).
Separar o bloco fiscal em outro feature significa dois lugares lendo o mesmo `record` C#.

**Isso já aconteceu e já quebrou.** DIV-6 (`createdAt` no TS sem par no backend) e DIV-7 (11 dos 22
campos do `PessoaResponse` chegam pela rede e nenhum tem consumidor) são divergência silenciosa
**dentro do mesmo tipo, num único feature**. Duplicar a leitura do record em dois features dobra a
superfície onde esse drift pode nascer sem que ninguém note — é a classe de defeito que o gate de
`contract-fields` existe para fechar (ver §4, Gate 1), e hoje `features/pessoas` nem está no mapa
dele.

`PESSOAS_DADOS_FISCAIS_GERENCIAR` já é permissão própria (inventário §4), então dividir por
permissão não exige dividir por pasta — o argumento "a ação é fiscal, deveria morar em fiscal" não
tem sustentação estrutural aqui.

**O que eu abro mão:** não tenho posição sobre aba × seção × diálogo para a tela de Pessoas — é
escopo de operação/design. Só afirmo que o código mora dentro de `features/pessoas`.

**Reversível:** sim, e barato — mover um diálogo entre features é `grep`+`sed` de import. Não é
onde eu levanto bandeira.

### P04-PLAT-2 — Séries, Naturezas, Cadastros oficiais e Modelos entram num feature novo (`features/fiscal-cadastros`), não em `features/fiscal` nem em `features/tributacao`

Medição: `features/fiscal/hooks/useFiscalResources.ts:7-14` declara 7 `queryKey`, todas sob o
prefixo `'fiscal'`, e todas sobre o ciclo de vida da `NotaFiscal` (notas, resumo, workflow,
integrações, observabilidade, sefaz). Nenhum dos quatro controllers desta rodada
(`SeriesFiscaisController`, `NaturezasOperacaoController`, `CadastrosFiscaisController`,
`ModelosDocumentoFiscalController`) tem consumidor em `features/fiscal` hoje (0/7, 0/5, 2/16 —
os 2 são de `features/tributacao` —, 0/1, inventário §1).

`features/fiscal` já pratica invalidação por prefixo de string
(`useFiscalResources.ts:111-113`: `invalidateQueries({queryKey:['fiscal','sefaz']})`,
`invalidateQueries({queryKey:['fiscal','observabilidade']})`) — um `queryKey` compartilhado entre
o ciclo de vida de nota fiscal e os cadastros que a alimentam aumenta a superfície que uma
invalidação ampla varre por engano. Não é hipotético: o padrão de invalidar por prefixo já é como
este feature se comporta hoje.

`features/tributacao` é hoje o único consumidor real (2/16), mas só de dois **selects resumidos**
(`NcmResumoResponse`/`CfopResumoResponse`, 4 e 5 campos — inventário §1.3.1), não do CRUD completo.
Colocar 14 telas de leitura/importação dentro de um feature cujo nome e propósito hoje é "regras de
tributação e exceções" (`RegrasFiscaisPage`, `ExcecoesFiscaisPage`) confunde o próximo leitor sobre
o que o feature faz — e o inventário já mostra 97 dos 106 campos de resposta de `CadastrosFiscais`
sem tela (§7): é módulo de dado, não de regra.

Fato do backend que empurra Naturezas e Cadastros para o **mesmo** feature novo (não dois): as duas
únicas permissões deste bloco, `FISCAL_CADASTROS_CONSULTAR`/`_GERENCIAR`, guardam **as 16 rotas de
F3.4 e as 5 de F3.2 ao mesmo tempo** (`NaturezasOperacaoController.cs:42,76,91,107,129` usa as
mesmas duas constantes — inventário §4). Os dois aparecem e somem juntos para qualquer usuário;
separar em dois features criaria dois lugares cuja visibilidade é sempre idêntica.

**O ponto de não-retorno real aqui não é a pasta — é a invalidação depois de `POST
/importar/{tabela}`.** É a única escrita de F3.4 (inventário §1.3, item 16), reescreve NCM/CFOP/CEST
em lote, e **hoje** dois selects em `features/tributacao` já leem esses mesmos dados sob o
namespace `'tributacao'` (`ncmOptionsQueryKey`, `cfopOptionsQueryKey` —
`features/tributacao/hooks/useTributacao.ts:16-17`). Se a tela de importação nascer num feature
novo com outro namespace de `queryKey`, a mutação de importar **precisa invalidar explicitamente o
namespace estrangeiro** (`['tributacao', 'cadastros']`) também, ou o combo de NCM da tela de Regras
Fiscais mostra dado velho até o `staleTime` vencer — falha silenciosa, a classe mais cara desta
skill. Isto vale **qualquer que seja a decisão de pasta** — é achado de cache cruzado, não de
organização de diretório.

**O que eu abro mão:** a escolha entre `features/fiscal-cadastros` (novo) e enfiar em
`features/tributacao` é 100% reversível — é `grep`+`sed` de import e um `queryKey` que hoje tem
zero consumidor externo. Se o `arquiteto-escopo-entrega` mostrar que abrir feature novo custa uma
versão a mais no fatiamento, cedo aqui. O que **não** cedo é a invalidação cruzada: seja qual for a
pasta, `importar/{tabela}` tem que invalidar os dois namespaces.

---

## Q2 — Padrão de tela

### P04-PLAT-3 — reaproveitar o padrão listagem+diálogo+inativar já usado 19 vezes; sem componente novo; buracos de numeração é diálogo próprio, não herdado

Medição: `grep -rln "Inativar\|inativar" features/*/components/*.tsx` devolve 19 arquivos em 15
features, incluindo duas telas fiscais que já combinam listagem + diálogo + vigência
(`features/tributacao/components/RegrasFiscaisPage.tsx`,
`features/tributacao/components/ExcecoesFiscaisPage.tsx`, confirmado por
`grep -rln "Vigencia\|vigencia" features/*/components/*.tsx` = 6 arquivos em 2 features). A regra
dos três casos já está superada para "listagem + diálogo + inativar/vigência" — não crio
abstração nova, copio o molde que já existe.

**Buracos de numeração não é o mesmo padrão**, e não deve herdar de um componente genérico de
vigência: `GET /series/{id}/buracos` não pagina e varre `Enumerable.Range` sobre o intervalo
alocado inteiro **a cada chamada** (`ConsultarBuracosSerieFiscalUseCase.cs:39-54`, citado no
inventário §6). Decisão de plataforma, não de UX: a query desse diálogo nasce com `enabled: false`
até o usuário abrir explicitamente o relatório de uma série — nunca prefetch na linha da lista,
nunca `refetchInterval`. Volume real não medido em produção (0 seed — inventário §6); o risco de
uma série com anos de uso e dezenas de milhares de números é **intuição, não medição**, mas o
desenho do endpoint não tem teto, e "sem teto" é fato lido em código, não opinião.

**O que eu abro mão:** não tenho posição sobre qual tela exata (`RegrasFiscaisPage` vs
`TabelasPrecoPage`) vira o molde literal a copiar — isso é `dev-senior-react`/`design-system`. Só
digo: não construir abstração compartilhada nesta rodada.

---

## Q3 — Navegação e menu

### P04-PLAT-4 — itens planos dentro do grupo "Fiscal" existente; sem subgrupo — o gate de menu tem ponto cego comprovado em 3 níveis

O grupo "Fiscal" já existe com 7 itens filhos (`layout/AppMenu.tsx:131-142`) e **todo** grupo do
arquivo é de 2 níveis (grupo → item), nunca 3 — confirmado por leitura do arquivo inteiro (nenhum
`items` aninhado dentro de outro `items`).

Fato de código que sustenta não introduzir o 3º nível agora: `scripts/lib/guard-permission-map.mjs`
só registra um par de hierarquia (`hierarchy.push`, linhas 355-364) quando o nó tem `to` **e** um
`parentGroup` — e o `parentGroup` passado adiante na recursão (linhas 376-379) é sempre o **nó
imediato**, não a cadeia inteira de ancestrais. Um subgrupo "Cadastros fiscais" sem `to` dentro de
"Fiscal" nunca teria sua própria cobertura de permissão checada contra o pai "Fiscal" — ele só
aparece como pai dos *seus* filhos. É um ponto cego estrutural que `D45`/`D46` nunca exercitaram
(as fixtures citadas nessas decisões são de 2 níveis). Se a rodada decidir por subgrupo, isso é
gate próprio antes de entrar (ver §4, Gate 2) — não depois, pelo mesmo argumento de `D44`
("gate vácuo dá sensação de proteção, que é pior que ausência").

Fato do backend que simplifica a decisão: `FISCAL_CADASTROS_CONSULTAR`/`_GERENCIAR` guardam
Naturezas **e** Cadastros juntos (mesmo argumento de P04-PLAT-2) — os dois itens de menu aparecem e
somem sempre em conjunto, então não há ganho de navegação em separá-los visualmente por subgrupo.

Pai "Fiscal": ganha os 5 códigos novos em `anyPermissions`
(`FISCAL_SERIES_CONSULTAR`, `FISCAL_SERIES_GERENCIAR`, `FISCAL_CADASTROS_CONSULTAR`,
`FISCAL_CADASTROS_GERENCIAR`, `FISCAL_MODELOS_CONSULTAR`), somados aos 10 já presentes
(`layout/AppMenu.tsx:132`) = 15. Nenhuma forma combinada por item (regra de `D46`): cada item novo
usa `permission` ou `anyPermissions`, nunca os dois.

Bloco fiscal da Pessoa: **sem item de menu novo, sem linha nova em `routePermissions.ts`**.
`/pessoas` já tem entrada catch-all (`lib/security/routePermissions.ts:14`,
`anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR']`), e um diálogo/aba dentro da mesma tela não abre
rota — `PESSOAS_DADOS_FISCAIS_GERENCIAR` vira `PermissionGuard` local, não regra de rota. É o item
mais barato desta rodada inteira: zero edição no menu, zero edição na regra de rota.

**Reversível:** sim. **O que eu abro mão:** não decido se "Cadastros fiscais" deveria ter nome de
item diferente ou ordem diferente na lista — cosmético, fora do meu eixo.

---

## Q4 — DIV-5 (mensagens que apontam para telas inexistentes)

### P04-PLAT-5 — mapear por `Error.Code`, nunca por texto de `Error.Message`

O próprio backend documenta que `Message` não é contrato:
`Erp.Api/Filters/ApiErrorResponseFilter.cs:4-8` — "sem farejar o texto do `Error.Code`... o nome do
código é convenção humana e o projeto tem duas convenções vivas (`SCREAMING_SNAKE` e `camelCase`)".
Só `Code` e `Kind` são dado estável, preenchido na origem pela fábrica de erro
(`Erp.Shared/Kernel/Error.cs:21-54`). O frontend **já** extrai esse campo:
`lib/http/apiError.ts:101,106` lê `code`/`Code` do corpo da resposta e o expõe em `ApiError.code`
— não é plumbing novo, é dado que já chega e não é usado para roteamento ainda.

Proposta: um dicionário pequeno, `{ 'Fiscal.SerieFiscalNaoCadastradaParaContexto': {...},
'Fiscal.CfopSemMapeamentoParaAmbito': {...}, 'Fiscal.DestinatarioSemEnderecoFiscal': {...},
'Fiscal.DestinatarioSemEnderecoPrincipal': {...}, 'Fiscal.DestinatarioSemMunicipioIbge': {...},
'Fiscal.DestinatarioSemIndicadorContribuinteIcms': {...} }` (os 6 códigos citados no inventário §2
e §5), consumido por `ApiErrorPanel` (já em uso em 6+ pontos de `features/fiscal`, confirmado por
`grep -rn "ApiErrorPanel" features/fiscal`) via prop opcional. Regra dos três casos: 6 códigos, um
único recorte — não crio um sistema de erro genérico para o repositório inteiro.

O link só navega para rota que **já exista** (decidida em Q1/Q3); enquanto a tela de destino não
tiver nascido na sequência (Q7), o mapa mostra só o texto, nunca um link morto.

**Custo de reverter:** baixíssimo — é uma tabela de dados. Se a convenção de `Code` mudar amanhã (o
próprio comentário do backend avisa que duas convivem), só a chave da tabela muda, nunca a lógica.

**O que eu abro mão:** não decido se a UI deve navegar automaticamente (`router.push`) ou só exibir
link clicável — é fluxo de operador, escala para `arquiteto-operacao-erp`.

---

## Q5 — DIV-2, DIV-3, DIV-4, DIV-8

**DIV-2** (texto falso "sem endpoint operacional" para Naturezas, que existe e tem teste de
contrato no backend — `NaturezasOperacaoEndpointContractTests.cs`, inventário §Divergências):
corrige-se **dentro desta F3**, não antes — trocar o disabled por combo real só faz sentido depois
que a tela de Naturezas nascer (Q7). Não é decisão de plataforma quando exatamente; é decisão de
plataforma que a correção **não é reversível de graça enquanto a mentira estiver na tela**: cada
release que mantém o texto é mais um operador que acredita numa limitação que não existe.

**DIV-3** (natureza inativa ainda deriva CFOP em item novo): pendência de backend, já registrada
pelo inventariante. Meu único comentário de plataforma — qualquer resposta muda `enabled`/validação
condicional, não schema nem `queryKey`. Custo baixo em qualquer direção; não travar a rodada nisso.

**DIV-4** (`Error.Conflict` sai como 400, não 409, nos 4 erros de Series/Naturezas): aceitar como
está nesta fatia. `NotaFiscal`/`PedidoVenda` já têm 409 real hoje e um fluxo próprio de "recarregue
e confirme" (`FLUXOS-E-REGRAS-PARA-A-UI.md` §4.3, citado no inventário) — tratar os 4 casos de F3
como 400 comum (mensagem + permanece no formulário) é o caminho que **não inventa** comportamento
novo sobre um contrato que hoje não entrega 409. Dar paridade com o padrão 409 exigiria o backend
remapear `Kind.Conflict` no `ApiErrorResponseFilter`, que hoje só remapeia
`NotFound`/`Forbidden`/`Unauthorized` (`ApiErrorResponseFilter.cs`, método `ClassificarResposta`) —
fora do alcance do frontend; vira pergunta ao backend, não escolha nossa.

**DIV-8** (NCM/CFOP resumido sem `.strict()`/Zod): ver Gate 3, §4.

---

## Q6 — Volume e dado amostra

### P04-PLAT-6 — reaproveitar o combo servidor-paginado já provado; DataTable de F3.4 nasce com `lazy`+`paginator` mesmo com 17 linhas hoje

Medição: `features/tributacao/hooks/useTributacao.ts:72-96` (`useNcmOptions`/`useCfopOptions`) +
`features/tributacao/components/CadastroFiscalSelects.tsx` já implementam busca incremental
servidor-paginada (`SearchSelect` com `onSearch` → `termo` → `queryKey`), e
`features/tributacao/api/tributacaoApi.ts:232-243` fixa `tamanhoPagina: 20` por chamada. Este
padrão **nunca carregou tudo** — pede página 1 de 20 filtrada por termo — então o comportamento não
muda quando o cadastro oficial completo (~10 mil NCM, ~5.570 municípios — inventário §6)
substituir a amostra (17/32 linhas hoje). Proposta: todo combo novo que F3.2 (CFOP no mapeamento de
natureza) e F3.3 (município/país da Pessoa) precisarem reaproveita esse hook/componente — zero
código de busca novo.

Para as **telas de listagem/CRUD completas** de F3.4 (não combo): `DataTable` com `lazy`+
`paginator`+`rows` server-side desde o primeiro `bNN`, mesmo a amostra caber hoje numa página única.
14 dos 16 endpoints já entregam `pagina`/`tamanhoPagina` na API (inventário §1, tabela); nascer sem
paginação client-side e trocar depois é exatamente o padrão que a skill deste agente veta
("módulo que no legado tem centenas de milhares de linhas não vira tabela carregada inteira") — o
custo de nascer com `lazy` é a mesma linha de props do PrimeReact; o custo de descobrir depois que
uma tela carrega os 10 mil NCM de uma vez é reescrita de tela em produção.

`GET /uf` é a exceção deliberada: 27 linhas, completo, fixo (27 estados+DF, não cresce), sem
paginação na própria API (inventário §6) — carregar tudo de uma vez é aceitável aqui porque o dado
é fechado por definição, não porque é pequeno hoje. Não é o mesmo risco de NCM/município/CFOP.

**Reversível:** sim, e o custo de reverter (tirar `lazy` de uma tabela pequena) é menor que o custo
de introduzir depois (tabela sem paginação, com filtro no cliente, testada contra 17 linhas,
quebrando sob 10 mil).

---

## Q7 — Sequência e fatiamento

### P04-PLAT-7 — ordem por dependência de runtime, não por tamanho de tela

Critério do próprio briefing: "o documento fiscal deixar de falhar por cadastro ausente". Ordeno
pelas dependências cruzadas do inventário §5:

1. **Modelos de documento fiscal (F3.5)** — 1 endpoint, leitura, 4 seeds fixos
   (`20260807140503_...:122-125`). É **pré-requisito de Séries** (`SerieFiscal.
   ModeloDocumentoFiscalId`), custo de decisão zero (read-only, sem CRUD no backend — inventário
   §1.5).
2. **Séries fiscais (F3.1)** — fecha a 1ª mensagem da DIV-5
   (`Fiscal.SerieFiscalNaoCadastradaParaContexto`), é o bloqueio mais citado no inventário (§5,
   primeiro consumidor cruzado: toda nota fiscal validada passa por aqui).
3. **Naturezas + CFOP derivado (F3.2)** — fecha a 2ª mensagem da DIV-5
   (`Fiscal.CfopSemMapeamentoParaAmbito`) e a DIV-2 (mentira do disabled em
   `FiscalActionDialogs.tsx:136,187`).
4. **Bloco fiscal estrito da Pessoa (F3.3, os 3 endpoints de §1.4.1)** — fecha as 4 mensagens
   restantes da DIV-5 (`DestinatarioSemEnderecoFiscal`/`SemEnderecoPrincipal`/`SemMunicipioIbge`/
   `SemIndicadorContribuinteIcms`).

   **Risco de plataforma que registro aqui, não decido:** o inventário §1.4.2 mostra que
   endereço/contato de Pessoa (12 dos 15 endpoints "faltantes" do plano) é **pré-requisito
   funcional, não-fiscal**, e hoje tem **0/15** telas. Se a fatia entregar só os 3 campos
   estritamente fiscais sem as telas de endereço, o operador preenche o bloco fiscal mas não tem
   onde cadastrar o endereço que `DestinatarioSemEnderecoFiscal`/`SemMunicipioIbge` exigem — 3 das
   6 mensagens da DIV-5 ficam resolvidas com aparência de "DIV-5 fechada" que não é. Não decido se
   endereço entra na mesma leva (é escopo/operação); registro o custo de deixar fora **sem
   declarar** isso no changelog, que é o mesmo padrão de `ACCESS_LOSS_UNDECLARED` do contrato de
   saída, aplicado a capacidade funcional em vez de permissão.
5. **Cadastros fiscais NCM/CEST/CST/geografia (F3.4)** — 97 dos 106 campos de resposta "sem tela"
   hoje (inventário §7), mas **consumidos indiretamente** antes de ter tela própria (F3.2 precisa
   de CFOP, F3.3 precisa de município) — os selects (Q6) entram **junto** com F3.2/F3.3, seguindo o
   padrão que já existe hoje em `features/tributacao`. As telas de listagem completa (14 tabelas
   sem consumidor) e a importação oficial (`POST /importar/{tabela}`) podem vir por último, sem
   bloquear runtime — o inventário §5 não cita `CadastrosFiscais` como bloqueio de nenhum fluxo,
   só como fonte de dado para os outros.

**Fora da F3, proposto:**

- Parte não-fiscal da DIV-7 (`Bloqueada`/`MotivoBloqueio`) — bloqueio operacional, não fiscal; traz
  decisão de fluxo (bloquear/desbloquear pessoa) sem paralelo hoje. Custo de deixar fora: baixo —
  os 2 campos já chegam pela rede e continuam ignorados por mais uma fatia; não é regressão.
- Endereço/contato completo de Pessoa, **se** a rodada decidir separar do item 4 acima — mesmo
  risco já registrado.
- Telas completas de CRUD/listagem de F3.4 (14 sem consumidor hoje) além do mínimo de combo —
  cauda, sem consumidor cruzado esperando.
- DIV-3 e DIV-4 — pendência de backend, não código nosso.

**Quantas versões `bNN`:** não numero. Não tenho medição de tamanho de diff por tela — isto é
intuição, não medição, e cabe ao `arquiteto-escopo-entrega`/`dev-senior-react`. Ofereço só a ordem
de dependência acima como critério de corte.

---

## §4 — Gates que esta camada precisa

**Gate 1 — estender `validate:contract-fields` (`scripts/gate-contract-fields.mjs`,
`BACKEND_TYPE_MAP`) para `PessoaResponse` e os novos tipos de resposta de F3.**
Classe de defeito: campo lido pela UI sem par no backend (P1). Já materializado duas vezes nesta
base: as 3 telas monetárias que originaram `D5`-`D12`, e **agora** DIV-6/DIV-7 dentro de
`PessoaResponse`, que o gate não vê porque `BACKEND_TYPE_MAP`
(`scripts/gate-contract-fields.mjs:31-43`) só cobre `bancos`, `contabil`, `patrimonio` — Pessoas
não está lá, e a divergência já existe sem que o gate a acuse. Sinal de vermelho: acrescentar
`PessoaResponse` ao mapa e rodar contra a árvore atual tem que acusar `createdAt`
(campo TS sem par no backend); se não acusar, o gate está errado. Custo aproximado: baixo — é dado
(entrada no mapa), o motor já existe e já prova saber ficar vermelho (`D16`-`D19`).

**Gate 2 — fixture de 3 níveis para o gate de menu (`guard-permission-map`, C2/C3), condicional a
Q3 decidir por subgrupo.** Classe de defeito: pai não cobre a permissão de um neto
(grupo → subgrupo → item), invisível hoje porque `D45`/`D46` só testaram 2 níveis — ver P04-PLAT-4
para a leitura de código que sustenta o ponto cego. Sinal de vermelho: fixture "Fiscal → Cadastros
fiscais → Séries" com a permissão do item ausente do `anyPermissions` do avô "Fiscal" tem que
reprovar. Custo aproximado: médio — exige a recursão de `scripts/lib/guard-permission-map.mjs:308-382`
acumular a cadeia inteira de ancestrais, não só o `parentGroup` imediato. **Só entra se Q3 decidir
por subgrupo** — se a rodada aceitar P04-PLAT-4 (lista plana), este gate não é necessário agora.

**Gate 3 — `.strict()`/Zod nos combos servidor-paginados de F3, incluindo os dois que já existem
sem schema (DIV-8).** Classe de defeito: campo renomeado/removido no backend vira `undefined` em
silêncio — já registrado como ativo em `FLUXOS-E-REGRAS-PARA-A-UI.md` §7 (citado no inventário).
Sinal de vermelho: resposta mock com campo faltante deve lançar no `.parse()`, não passar
silenciosamente. Custo aproximado: baixo por schema (4-5 campos por resumo), mas **não é gate
automático** como o Gate 1 — cada select novo (CFOP em Naturezas, município em Pessoas) precisa do
seu próprio schema; é disciplina de código, não regra estrutural nova.

**Gate que não proponho:** paginação obrigatória em `DataTable` acima de N linhas, medida
estaticamente. Não tenho forma confiável de distinguir por AST "paginada mas com poucos dados
hoje" de "carregada inteira" sem falso positivo/negativo alto, e F3.4 já nasce com paginação real
na API (Q6). Fica registrado como observação, não como gate.

---

## Divergências que espero dos outros três

- **`arquiteto-operacao-erp`** provavelmente quer reduzir cliques no relatório de buracos e nos
  combos (ex.: mostrar descrição completa de CFOP direto na lista, carregar mais itens por página
  para não precisar digitar). Sob o volume real do cadastro oficial (10 mil NCM), isso é
  `DataTable` carregada inteira disfarçada de conveniência.
- **`arquiteto-escopo-entrega`** provavelmente quer juntar F3.2+F3.3+F3.4 numa fatia só para
  "fechar a DIV-5 de uma vez". Meu ponto de custo (Q7, item 4): a parte de endereço/contato (0/15)
  não está orçada em nenhum item de F3 hoje, e entregar o bloco fiscal sem ela é fechamento parcial
  com aparência de completo.
- **`arquiteto-design-system`** provavelmente propõe um componente `<CadastroFiscalCrud>` genérico
  já nesta rodada, para as 5+ telas de F3.4. A regra dos três casos ainda não bateu para esse
  formato específico, e cadastros oficiais (import-only, sem create/edit individual — inventário
  §1.3) têm forma estruturalmente diferente das telas com create/edit (Séries/Naturezas) —
  generalizar cedo esconde essa diferença atrás de props condicionais.

---

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "projeto",
  "assunto": "cadastros-fiscais",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/04-plataforma-cadastros-fiscais.md",
  "decisoesPropostas": [
    { "id": "P04-PLAT-1", "titulo": "Bloco fiscal da Pessoa fica em features/pessoas", "reversivel": true, "gatilho": "nenhum — não é decisão de risco" },
    { "id": "P04-PLAT-2", "titulo": "Séries/Naturezas/Cadastros/Modelos em features/fiscal-cadastros novo; importar/{tabela} invalida também o namespace tributacao", "reversivel": true, "gatilho": "arquiteto-escopo-entrega mostrar custo de versão extra por abrir feature novo" },
    { "id": "P04-PLAT-3", "titulo": "Reaproveitar padrão listagem+diálogo+inativar; buracos de numeração é diálogo próprio com enabled:false", "reversivel": true, "gatilho": "surgir 2ª tela com o mesmo formato faixa+vigência+relatório" },
    { "id": "P04-PLAT-4", "titulo": "Itens planos no grupo Fiscal existente, sem subgrupo, pelo ponto cego do gate em 3 níveis", "reversivel": true, "gatilho": "gate de menu ganhar fixture de 3 níveis (Gate 2)" },
    { "id": "P04-PLAT-5", "titulo": "Mapear DIV-5 por Error.Code, nunca por texto de mensagem", "reversivel": true, "gatilho": "convenção de Code mudar" },
    { "id": "P04-PLAT-6", "titulo": "Combos reaproveitam SearchSelect servidor-paginado; DataTable de F3.4 nasce com lazy+paginator", "reversivel": true, "gatilho": "nenhum — é o caminho barato desde o início" },
    { "id": "P04-PLAT-7", "titulo": "Sequência: Modelos, Séries, Naturezas, Pessoa-fiscal-estrito, Cadastros; endereço/contato fica risco declarado se ficar fora", "reversivel": true, "gatilho": "endereço/contato entrar em fatia separada sem registro do corte na DIV-5" }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "cliente", "pergunta": "Endereço/contato de Pessoa (0/15, pré-requisito não-fiscal) entra na mesma leva do bloco fiscal estrito ou fica fora, com o corte declarado no changelog?", "decide": "se a DIV-5 fecha as 6 mensagens ou só as 3 estritamente fiscais" },
    { "tipo": "cliente", "pergunta": "Fronteira de feature (P04-PLAT-2): features/fiscal-cadastros novo ou anexar a features/tributacao?", "decide": "onde mora o código; a invalidação cruzada após importar/{tabela} é obrigatória em qualquer resposta" }
  ],
  "riscos": [
    "DIV-6/DIV-7 já mostram drift de campo dentro de PessoaResponse sem que nenhum gate o detecte hoje — Gate 1 (contract-fields) não cobre features/pessoas.",
    "GET /series/{id}/buracos não pagina e varre o intervalo alocado inteiro a cada chamada (ConsultarBuracosSerieFiscalUseCase.cs:39-54); volume real de produção não medido.",
    "Se F3.3 entrar sem endereço/contato, DIV-5 fecha só 3 das 6 mensagens com aparência de resolvida.",
    "Subgrupo de menu de 3 níveis tem ponto cego comprovado no gate atual (guard-permission-map só registra parentGroup imediato) — não decidir por subgrupo sem o Gate 2."
  ]
}
```
