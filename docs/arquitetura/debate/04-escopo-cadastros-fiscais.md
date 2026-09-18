# Escopo e entrega — Cadastros fiscais (F3)

Agente: `arquiteto-escopo-entrega`. Rodada de arquitetura 04, assunto `cadastros-fiscais`. Lê
`docs/arquitetura/debate/04-inventario-cadastros-fiscais.md` (29 endpoints, DIV-1 a DIV-9),
`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5/§6, `docs/arquitetura/DECISOES.md`, `CLAUDE.md` e
`layout/AppMenu.tsx`. Proponho; não decido — quem trava Dn é o orquestrador.

## Base fixada

```text
$ node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
1.11.0-a.8.b57.c1 1.11.0a8b57.c1
```

`v1.11.0a8b57.c1` é corretiva de gate (D44–D46, mesclada). Não há `bNN` bloqueada em aberto. A
próxima entrega funcional é `b58` — a sequência abaixo começa aí, não em "b57+1 hipotético".
`docs/IMPLEMENTACAO_*.md` **não** ganha arquivo novo: `CLAUDE.md` é explícito — "o documento vivo
é o `CHANGELOG.md`", e a §7.6 do plano mandou parar de duplicar nos 90 e poucos arquivos antigos.
Onde `skills/projeto/04_regua_de_fatiamento.md` pede "documento de implementação em
`docs/IMPLEMENTACAO_*.md`" como um dos três requisitos de fatia fechada, leio como **entrada
descritiva no `CHANGELOG.md`** neste repositório — a regra do projeto é mais específica que a
regra genérica da skill, e prevalece.

O marco em jogo, lido do próprio plano: "sem estes [F3], a NF-e falha na validação e manda o
operador a telas que não existem" (`PLANO-FRONTEND-v1.23.md:294`). O critério de ordem que o
briefing pede — "o documento fiscal deixar de falhar por cadastro ausente" — é o fio condutor de
toda a seção de sequência.

---

## Q1 — Fronteira de feature

**P04-ESC-1.** Séries fiscais, naturezas de operação + CFOP e modelos de documento ficam em
`features/fiscal` (já existe, já é o dono do domínio de nota fiscal e dos diálogos que hoje mentem
sobre essas duas peças — `FiscalActionDialogs.tsx:136,187`, DIV-2). O bloco fiscal e os endereços
da Pessoa ficam em `features/pessoas`, porque `PATCH /pessoas/{id}/dados-fiscais` e as rotas de
endereço são recursos de Pessoa, não de Fiscal — mover isso para fora quebraria "cada feature é
dona do seu recurso" sem nenhum ganho.

Não abro um `features/cadastros-fiscais` novo. Os 16 endpoints de `CadastrosFiscaisController`
não têm CRUD (`POST`/`PUT` de item individual não existem — só leitura + importação em lote,
inventário §1.3) e, pelo corte que proponho em Q7, a maior parte deles (12 de 16) fica fora desta
rodada por completo. Um feature novo para hospedar meia dúzia de `GET`s que viram `<Dropdown>`
embutido em outras telas é infraestrutura sem inquilino — exatamente o "motor sem chamador" que
`skills/projeto/04_regua_de_fatiamento.md` nomeia. Onde o `GET` de UF/País/Município/CFOP for
usado, ele entra como `api`/`hook` do feature que o consome (`fiscal` para CFOP em Naturezas,
`pessoas` para UF/País/Município no bloco fiscal), não num módulo à parte.

**O ponto que não é meu para decidir sozinho:** `features/tributacao` já tem `listarNcm`/
`listarCfop` (`tributacaoApi.ts:232-243`) sem `.strict()`/Zod (DIV-8), e `features/fiscal` vai
precisar do mesmo CFOP para o mapeamento de Naturezas (Q7, b61). Ter três buscas independentes do
mesmo endpoint (duas em tributação, uma nova em fiscal) é o tipo de duplicação que
`arquiteto-plataforma-frontend` vai — com razão — chamar de dívida de `queryKey`. Eu **exijo**,
como condição da minha sequência, que b61 não crie uma terceira busca de CFOP do zero; deixo a
topologia exata (mover para `fiscal`, extrair para um módulo comum, ou outra) para quem decide
plataforma e template.

**O que eu abro mão:** não tenho argumento de escopo para recusar um módulo compartilhado se os
outros três concordarem que 3+ consumidores já justificam extração agora (CFOP: tributação ×2 +
fiscal). Isso é decisão de arquitetura de dados, não de corte — cedo esse ponto sem custo, porque
não é meu critério (reversível ou não) que resolve.

---

## Q2 — Padrão de tela

**P04-ESC-2.** Não construo componente compartilhado "listagem + diálogo + inativar/vigência"
agora. Copio o padrão mais próximo já em produção: `features/tabelas-preco/components/
TabelasPrecoPage.tsx` + `TabelaPrecoFormDialog.tsx`, que já tem `dataInicio`/`dataFim` (vigência) e
ativar/inativar funcionando (confirmado por `grep` — arquivo aparece na busca por
`vigencia|dataFim` junto com 20 outros). Para o motivo do cadastro (`InativarXRequest(Motivo)`),
reaproveito o `ReasonDialog` já usado em `features/alimentar/components/LotesPage.tsx:118`,
citado em `D20` como padrão de ação-sem-formulário-próprio.

**Série fiscal não é o mesmo padrão, e digo isso na cara.** Além de vigência e inativação, ela tem
faixa (`NumeroInicial`/`NumeroFinal`/`ProximoNumero`) e um relatório de buracos
(`GET /series/{id}/buracos`, sem paginação — inventário §6, risco de varredura em memória). Isso é
uma seção extra ("Buracos") dentro da própria tela de Série, não um componente novo genérico. Com
**um único consumidor** desse padrão estendido nesta rodada, construir uma abstração para ele
agora é abstração com `n=1` — exatamente o caso em que `arquiteto-plataforma-frontend` normalmente
me cobraria de não fazer, e aqui sou eu quem recusa por antecipação.

**O que eu abro mão:** se a `.c1`/fatia seguinte de Naturezas (b61) mostrar uma segunda tela com
faixa+vigência+relatório de buraco (não vejo candidata hoje), a recusa de generalizar vira dívida
retroativa, e nesse dia componentizar é barato porque as duas implementações já existem para
comparar. Aceito pagar essa extração depois, não agora.

---

## Q3 — Navegação e menu

**P04-ESC-3.** Três itens novos, **planos**, dentro do grupo "Fiscal" que já existe
(`layout/AppMenu.tsx:131-143`) — não crio subgrupo "Cadastros fiscais". O grupo hoje é uma lista
plana de 7 itens (Notas, Simulador, Regras, Exceções, Exceções por NCM, Observabilidade,
Inutilizações); os três novos (Séries fiscais, Naturezas de operação, Modelos de documento fiscal)
seguem a mesma forma. Um subgrupo se justificaria se F3.4 trouxesse telas de verdade — e, pelo
corte de Q7, não traz.

Confirmado por leitura (`layout/AppMenu.tsx:132-133`): o item **pai** "Fiscal" declara
`anyPermissions` com 10 códigos, e **nenhum** dos cinco novos (`FISCAL_SERIES_CONSULTAR/
GERENCIAR`, `FISCAL_CADASTROS_CONSULTAR/GERENCIAR`, `FISCAL_MODELOS_CONSULTAR`) está nessa lista.
Desde `v1.11.0a8b57.c1` (D45/D46) o gate `validate:guard-permission-map` reprova grupo que não
cobre a permissão do filho — isso deixou de ser estilo e virou **pré-requisito de build**, não
conforto: esquecer essa linha quebra o CI, não só a UX. Cada item novo entra com uma única forma
de permissão (`anyPermissions`, nunca `permission` + `anyPermissions` juntos — D46 reprova
combinação). `/pessoas` já tem entrada catch-all em `routePermissions.ts:14`
(`anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR']`), então as abas novas de Pessoa (Q abaixo)
**não** precisam de linha nova nesse arquivo — só os três itens de Fiscal precisam de rota nova.

Bloco fiscal e endereços da Pessoa entram como **aba**, dentro do `PessoaFormDialog.tsx` existente
— não diálogo próprio, não seção solta. Confirmado por leitura
(`features/pessoas/components/PessoaFormDialog.tsx:84-137`): o diálogo já é um `<TabView>` com três
abas ("Dados gerais", "Documentos e observações", "LGPD e auditoria visual"). Proponho duas abas
novas na mesma estrutura: "Endereços" (b59) e "Dados fiscais" (b60) — mesmo componente, mesmo
padrão, zero componente novo de layout.

**O que eu abro mão:** não tenho como garantir, só de leitura estática, que o gate de hierarquia
(D45) aceita a forma exata que vou propor sem rodar — a prova histórica dele roda contra árvore
fixa (`66a69b5^`, D45), não contra um diff hipotético. Quem implementar tem de rodar
`npm run validate:guard-permission-map` antes de declarar a versão fechada; não declaro isso
verificado aqui.

---

## Q4 — DIV-5

**P04-ESC-4.** Não construo uma camada genérica de "erro → link para a tela que falta" agora. As
seis mensagens (`Fiscal.SerieFiscalNaoCadastradaParaContexto`, `Fiscal.CfopSemMapeamentoParaAmbito`,
as quatro de `DestinatarioSem*`) apontam para telas que, hoje, **não existem em código nenhum**
(`grep -rn "SerieFiscalNaoCadastrada|CfopSemMapeamento|DestinatarioSem" features/fiscal` não
retorna nada — nem a mensagem nem um mapeamento de erro para ela). Construir a camada de
"link para a tela X" antes de a tela X existir é o motor sem chamador do próprio DIV-5: o link não
teria destino até a fatia correspondente fechar.

Proponho tratar cada mensagem **dentro da fatia que cria a tela de destino**, não numa fatia à
parte de "tratamento de erro fiscal":

```text
SerieFiscalNaoCadastradaParaContexto        → b58 (Séries),   link para /fiscal/series
CfopSemMapeamentoParaAmbito                  → b61 (Naturezas), link para /fiscal/naturezas-operacao
DestinatarioSemEnderecoFiscal/Principal      → b59 (Endereços), link para a aba Endereços da Pessoa
DestinatarioSemMunicipioIbge                 → b60 (Dados fiscais), link para a aba Dados fiscais
DestinatarioSemIndicadorContribuinteIcms     → b60 (Dados fiscais), idem
```

Até a fatia correspondente fechar, a mensagem aparece **como texto**, sem link — é o que já
acontece hoje (nenhuma piora) e evita prometer um link morto entre b58 e b61.

**O que eu abro mão:** não sei, sem ler o mecanismo de erro que `features/fiscal` já usa para os
demais códigos de `FiscalErrors` (não localizei arquivo de mapeamento por `grep`), se "link com
`router.push`" é o padrão correto de UI para essa classe de erro ou se o padrão do repositório é
outro (toast com botão, mensagem inline). Isso é pergunta para
`arquiteto-design-system`/`arquiteto-operacao-erp`, não decisão de escopo — não verificado aqui.

---

## Q5 — DIV-2, DIV-3, DIV-4, DIV-8

**P04-ESC-5.**

- **DIV-2 (legenda falsa "sem endpoint operacional")** — corrige **agora**, mas **dentro de b61**,
  não isolado. Trocar só o texto sem trocar o `<InputText disabled>` por um combo real deixaria o
  campo mentindo de um jeito diferente (capacidade existe mas nada valida o que o operador digita).
  As duas coisas — texto e capacidade — fecham juntas, no mesmo diff de Naturezas.
- **DIV-3 (natureza inativa aceita na derivação de CFOP)** — vira **pergunta ao backend**
  (já registrada pela inventariante), e a UI aceita mitigação defensiva sem esperar resposta:
  o combo de natureza usado ao adicionar item de nota passa `somenteAtivas=true`
  (parâmetro que `GET /naturezas-operacao` já aceita, inventário §1.2) — o operador nunca
  **seleciona** uma natureza inativa por esse caminho, independente de o backend um dia decidir
  bloquear ou não o caso de origem (edição direta/API). Não decido a semântica de domínio; decido
  que a tela não oferece o atalho para o caso ambíguo.
- **DIV-4 (`Error.Conflict` sai como 400)** — **aceito** para esta rodada. Não construo um fluxo
  de "recarregue e confirme" (padrão 409 de `NotaFiscal`/`PedidoVenda`,
  `FLUXOS-E-REGRAS-PARA-A-UI.md` §4.3) para Séries/Naturezas, porque o código nunca dispara: são
  sempre 400. Construir a UX de 409 agora seria código sem caminho de execução — motor sem
  chamador de novo. Erro de duplicidade/concorrência vira mensagem + permanece no formulário, como
  qualquer 400. Pergunta ao backend registrada, sem bloquear a fatia.
- **DIV-8 (sem Zod na resposta de NCM/CFOP)** — **corrijo só o código novo**, não o antigo.
  Os selects novos que b60/b61 criam (UF, País, Município, e o reaproveitamento de CFOP) ganham
  schema Zod não-estrito na resposta (coerente com `T5` do plano — `.strict()` só em request).
  **Não** entro em `features/tributacao` para retroagir Zod ao `listarNcm`/`listarCfop` existente
  — isso é dívida de um módulo que esta rodada não abriu, e mexer nele sem necessidade de F3 é
  escopo emprestado. Fica registrado como candidato de fatia própria.

**O que eu abro mão:** ao aceitar DIV-4 como está, abro mão de proteger o operador contra o caso
real (ainda que raro) de duas abas criando a mesma série ao mesmo tempo — ele vai ver "erro 400
genérico" em vez de um fluxo de reconciliação. É reversível (é só UX, nenhum dado se perde: o
backend recusa a segunda escrita), então aceito o custo até o backend decidir se remapeia o status.

---

## Q6 — Volume e dado amostra

**P04-ESC-6.** Todo select novo que este recorte cria sobre NCM, Município ou CFOP (os três
cadastros com dado amostra — 17/32/80 linhas, inventário §6, medido por contagem de `csv`/seed) é
**busca no servidor** (`termo` + paginação, que a API já aceita em todos os três), nunca "carrega
tudo" no cliente. Não é otimização prematura: é proteção contra retrabalho garantido. O dia em que
alguém rodar `POST /importar/{tabela}` com a tabela oficial completa (~10 mil NCM, ~5.570
municípios, centenas de CFOP), um componente que hoje carrega os 17/32/80 registros inteiros em
memória vira ~10.000 linhas num `<Dropdown>` sem filtro — e reescrever um padrão de busca depois
que cinco telas já copiaram o padrão "carrega tudo" é exatamente a classe "irreversível" da régua
de fatiamento (`padrão de tela que cinco módulos copiaram`).

UF (27 linhas, completo, sem paginação na API) é a exceção deliberada: dropdown estático via
`GET /uf` sem busca — o próprio backend não pagina essa rota (inventário §1.3, item 1), e 27
itens nunca vai crescer (são os estados da federação).

**O que eu abro mão:** nada aqui — é reversível e não custa nada extra hoje (o parâmetro `termo`
já existe na API; usá-lo desde o início não é trabalho a mais). Não encontrei corte defensável
neste eixo; não proponho nenhum.

---

## Q7 — Sequência e fatiamento

### As três listas

**DENTRO (entra em F3, com fatia própria)**

```text
Séries fiscais — CRUD completo (listar/criar/ampliar/encerrar-vigência/inativar) +
  relatório de buracos + combo real no campo "Série" do diálogo de nota (fecha a instância
  de DIV-5 desta mensagem).                                                          → b58

Endereços de Pessoa — CRUD completo (listar/criar/editar/marcar principal/excluir),
  pré-requisito não-fiscal, mas sem ele "vincular município" não tem o que vincular.   → b59

Bloco fiscal da Pessoa (PATCH dados-fiscais) + vincular município no endereço +
  backfill de municípios + exibição somente-leitura de Bloqueada/MotivoBloqueio.       → b60

Naturezas de operação + mapeamento de CFOP por âmbito/tipo — CRUD completo +
  correção de DIV-2 + mitigação de DIV-3 (somenteAtivas=true no combo de item).        → b61

UF, País, Município — só como <Dropdown>/busca embutidos nas telas acima
  (nunca como tela própria de consulta).                                        → b60/b61

Modelo de documento fiscal — só como <Dropdown> embutido no diálogo de Série
  (GET /modelos-documento, 4 linhas fixas), sem tela própria.                          → b58
```

**FORA (não entra nesta onda, com o gatilho que traria de volta)**

```text
Tela própria "Modelos de documento fiscal" (listagem)
  Motivo: backend não expõe create/edit/inativar (ModeloDocumentoFiscal.cs:44-52 tem os métodos,
  nenhum controller os chama — inventário §1.5). Uma listagem sem ação é consulta pura de 4 linhas
  fixas; o Dropdown embutido em b58 já cobre o único uso real hoje.
  Gatilho de volta: o backend expor POST/PUT/inativar de modelo (aí vira cadastro de verdade).

12 dos 16 endpoints de CadastrosFiscaisController — CST-ICMS, CSOSN, CST-IPI, CST-PIS/COFINS,
  origem-mercadoria, unidade-tributável, CEST, NCM↔CEST, validação NCM/CEST, código de serviço,
  NCM (como tela própria — como Dropdown ele não é usado por nenhum fluxo de F3), importador
  em lote.
  Motivo: nenhum consumidor dentro do que F3.1/F3.2/F3.3 precisam (medido: nenhuma dessas 12
  aparece nos "consumidores e dependências cruzadas" do inventário §5, que é a lista fechada de
  quem chama o quê na validação de nota). São referência fiscal para classificação de produto/item,
  domínio de outro feature (produtos/tributação), não de F3.
  Gatilho de volta: alguém (operação ou cliente) pedir consulta cruzada NCM×CEST pela UI, ou o
  cliente decidir que a carga da tabela oficial completa precisa de tela em vez de script/admin
  direto no banco — isto é pergunta ao cliente, registrada nas pendências abaixo, não decisão
  minha.

Bloquear/Desbloquear Pessoa (2 endpoints) e Contatos de Pessoa (5 endpoints)
  Motivo: nenhum dos seis erros de DIV-5 depende deles. Bloqueio é controle operacional/crédito,
  não pré-requisito de nota fiscal correta; contato é dado de relacionamento, não de destinatário
  fiscal (o resolver de destinatário fiscal lê endereço + indicador de contribuinte, nunca
  contato — `DestinatarioFiscalResolver`, inventário §5).
  Gatilho de volta: chamado de operação pedindo bloqueio de cliente pela tela de Pessoas, ou o
  módulo de CRM pedindo contato.

Botões de ação Bloquear/Desbloquear/Ativar visíveis na aba nova de Pessoa mesmo como leitura
  de Bloqueada — a leitura entra (custa um campo já trafegado, DIV-7); os botões, não.
  Gatilho de volta: mesmo do item acima.

Componente compartilhado "listagem + diálogo + vigência" (Q2)
  Motivo: um único consumidor real do padrão estendido (Série) nesta rodada.
  Gatilho de volta: uma segunda tela precisar de faixa + vigência + relatório de exceção.

Fluxo de UX para HTTP 409 em Séries/Naturezas (DIV-4)
  Motivo: o código nunca emite 409 hoje (sempre 400, mesmo para erro de Conflict).
  Gatilho de volta: o backend remapear os quatro erros de Conflict para 409 de verdade.
```

**DEPOIS (é escopo válido, mas não nesta onda F3 — fora da régua de "documento deixa de falhar")**

```text
Zod retroativo em features/tributacao (listarNcm/listarCfop, DIV-8)
  Depois de: uma fatia que já esteja tocando features/tributacao por outro motivo.

Extração de um módulo compartilhado de "cadastros fiscais de referência" (UF/País/Município/CFOP)
  Depois de: aparecer um terceiro consumidor real além de tributação e fiscal — ou de
  arquiteto-plataforma-frontend decidir que dois já bastam (não é minha régua, ver Q1).
```

### A sequência de versões, com a dependência que a justifica

```text
b58 — Séries fiscais
  Dependência: nenhuma nova. Todas as 8 permissões de F3 já existem no union/catálogo/snapshot
  (inventário §4). Chamador imediato: ValidarNotaFiscalUseCase.PrepararNumeracaoAsync já falha
  HOJE, em produção, por série ausente (FiscalErrors.cs:166-170) — este é o único bloqueio das
  seis mensagens de DIV-5 que já dispara na prática, porque o campo "Natureza" está desabilitado
  (DIV-2) e o de "Série" é texto livre sem validação (inventário §5, FiscalActionDialogs.tsx:109,
  133,150,183). Fecha o gap mais visível primeiro.

b59 — Endereços de Pessoa
  Dependência: nenhuma nova (rota /pessoas já coberta pelo catch-all). Chamador: b60, na mesma
  sequência imediata — "vincular município" (b60) atua sobre um endereço que precisa existir
  primeiro. Sem b59, b60 teria combo de município sem nada para vincular.

b60 — Bloco fiscal da Pessoa + vincular município + backfill
  Dependência: b59 (endereço já existe) + GET /uf, /paises, /municipios (já prontos no backend,
  sem depender de nenhuma fatia de F3.4 — são consumidos como Dropdown embutido, não como tela).
  Chamador: DestinatarioFiscalResolver, que falha hoje sempre que alguém tentar montar um item de
  nota com destinatário sem endereço/município/indicador — mas isso só passa a ser alcançável na
  prática depois que Naturezas (b61) parar de estar travada em "campo desabilitado".

b61 — Naturezas de operação + CFOP derivado
  Dependência técnica: nenhuma nova em código (CFOP já é consumido por tributação). Dependência de
  sequência: coloco depois de b59/b60 por escolha de risco de UX, não por dependência de dado —
  CfopDoItemResolver.ResolverUfsAsync chama DestinatarioFiscalResolver na mesma operação de
  adicionar item (inventário §5). Se eu destravar Naturezas antes de Pessoa ter endereço, o
  operador troca um erro (natureza ausente) por outro (destinatário sem endereço) no mesmo clique,
  sem nunca completar o fluxo. Não é bloqueio de dado — é ordem que evita apresentar uma segunda
  parede assim que a primeira cai. Não verificado: se ValidarNotaFiscalUseCase.
  PrepararNumeracaoAsync também falha por item sem CFOP (a inventariante não documentou essa
  checagem); se falhar, a ordem b58→b61 ainda fecha a validação, só que com item "não
  parametrizado" até b61 — aceitável, porque é o comportamento de hoje, não uma regressão.
```

Cada uma das quatro fatias é observável (tela nova ou aba nova), tem gate próprio (guard de
permissão da feature tocada + o gate de hierarquia de menu que `v1.11.0a8b57.c1` deixou vivo) e
fecha com entrada descritiva no `CHANGELOG.md` — as três condições de
`skills/projeto/04_regua_de_fatiamento.md` para fatia fechada, adaptadas à regra local de não
criar `IMPLEMENTACAO_*.md` novo.

---

## Trade-offs aceitos

```text
T-ESC-1  Perde: consulta unificada de NCM/CEST/CST pela UI (12 de 16 endpoints de F3.4 fora).
         Quando dói: se o cliente pedir para o operador de faturamento conferir CEST×NCM sem abrir
         o backend/planilha oficial.
         Reversível: sim — são só GETs; nenhuma tela existente depende de sua ausência.

T-ESC-2  Perde: botão de bloquear/desbloquear pessoa pela mesma tela onde o bloqueio agora aparece
         (leitura entra, ação não).
         Quando dói: se crédito/cobrança pedir bloquear cliente inadimplente sem sair da tela de
         Pessoas.
         Reversível: sim — o campo já chega por HTTP hoje (DIV-7); ligar o botão é diff pequeno.

T-ESC-3  Perde: fluxo de reconciliação para os quatro erros Error.Conflict que saem como 400
         (DIV-4). Operador vê mensagem genérica em vez de "outra pessoa já criou, recarregue".
         Quando dói: duas pessoas cadastrando a mesma série/natureza ao mesmo tempo — raro, mas
         existe (o próprio backend tem retry de concorrência para o caso vizinho de numeração,
         inventário §2).
         Reversível: sim, e o custo de reverter é baixo (é UX sobre um 400 já tratado, não schema
         novo).

T-ESC-4  Perde: componente compartilhado de "vigência + faixa + buracos" — Série fiscal fica com
         código só seu.
         Quando dói: se uma segunda entidade com o mesmo formato aparecer e alguém copiar a tela de
         Série à mão em vez de aguardar a extração.
         Reversível: sim — extrair depois de dois exemplares é mais barato que generalizar com um.
```

## O que eu abro mão

1. **Abro mão de 12 dos 16 endpoints de `CadastrosFiscaisController`** sem tela nenhuma nesta
   onda. É o maior corte do documento. Defendo que é reversível porque nenhum são dado que o
   usuário digita (são cadastros globais só-leitura, alimentados por importação em lote, não por
   formulário) — não há "dado sem origem para reconstruir" no critério da régua de fatiamento.
   Onde erro: se a operação de faturamento hoje já depende de consultar NCM/CEST fora do sistema
   e ninguém me contou — não tenho evidência de uso real desse fluxo (o inventário não achou
   consumidor), mas também não perguntei ao `arquiteto-operacao-erp` diretamente. Fica como
   pendência.
2. **Abro mão da tela "Modelos de documento fiscal"** por inteiro, mesmo ela estando nomeada no
   plano como item próprio (F3.5, "0/1 → 1"). O argumento é que o "1" do plano é o endpoint, não
   necessariamente uma tela — o Dropdown embutido em b58 já consome o mesmo endpoint. Se o
   orquestrador ou o cliente lerem F3.5 como "precisa haver uma tela chamada Modelos", este corte
   não se sustenta e eu retiro.
3. **Não abro mão do endereço de Pessoa (b59).** É o único ponto onde considerei cortar e decidi
   não cortar: sem ele, `DestinatarioFiscalResolver` falha sempre, e todo o valor de b60/b61 fica
   sem uso real (natureza e bloco fiscal corretos, mas nota continua travando por
   `DestinatarioSemEnderecoFiscal`). Não achei um corte seguro aqui — é pré-requisito, não
   conforto, mesmo custando uma fatia inteira que o plano rotula como "não-fiscal".
4. **Não abro mão dos gates.** Nenhuma das quatro fatias corta teste de contrato, gate estrutural
   ou o gate de hierarquia de menu que `v1.11.0a8b57.c1` acabou de consertar (D45/D46). O custo de
   cada fatia inclui rodar esse gate antes de fechar — não é opcional porque a fatia é "só
   cadastro".

---

## Divergências que espero dos outros três

```text
arquiteto-operacao-erp — provavelmente discorda do corte de Contatos e dos 12 endpoints de
  CadastrosFiscaisController, se algum fluxo de atendimento/faturamento depender de consulta
  cruzada que eu não enxerguei no inventário.

arquiteto-plataforma-frontend — provavelmente discorda de eu deixar em aberto (Q1) onde o CFOP
  compartilhado mora, e vai querer decidir agora para não nascer uma terceira busca duplicada em
  b61.

arquiteto-design-system — provavelmente discorda de eu recusar (Q2) generalizar o padrão de
  vigência com séries fiscais como único caso; pode achar que tabelas-preço + séries já bastam
  como par mínimo para extrair agora.
```

---

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "cadastros-fiscais",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/04-escopo-cadastros-fiscais.md",
  "decisoesPropostas": [
    { "id": "D-prox-1", "titulo": "Série fiscal entra em b58, primeira fatia de F3", "reversivel": true, "gatilho": "nenhum — é ordenação, não corte" },
    { "id": "D-prox-2", "titulo": "Endereço de Pessoa (não-fiscal) entra em b59 como pré-requisito de F3, apesar de o plano rotular F3.3 só como '+8' fiscal", "reversivel": false, "gatilho": "não corto — sem endereço, DestinatarioFiscalResolver falha sempre" },
    { "id": "D-prox-3", "titulo": "12 de 16 endpoints de CadastrosFiscaisController ficam fora de F3 por inteiro (sem tela, sem Dropdown)", "reversivel": true, "gatilho": "pedido de consulta cruzada NCM/CEST pela UI, ou decisão do cliente sobre carga da tabela oficial" },
    { "id": "D-prox-4", "titulo": "Tela própria 'Modelos de documento fiscal' fora; só Dropdown embutido em b58", "reversivel": true, "gatilho": "backend expor POST/PUT/inativar de modelo" },
    { "id": "D-prox-5", "titulo": "Bloquear/Desbloquear e Contatos de Pessoa fora de F3", "reversivel": true, "gatilho": "pedido de operação de crédito/CRM" },
    { "id": "D-prox-6", "titulo": "Naturezas de operação (b61) entra depois de Pessoas (b59/b60), não antes, por risco de UX (dois erros em sequência), não por dependência de dado", "reversivel": true, "gatilho": "medição mostrar que ValidarNotaFiscalUseCase não exige CFOP no item, tornando a ordem indiferente" }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "cliente", "pergunta": "A carga da tabela oficial completa de NCM/CEST/CFOP/município (POST /importar/{tabela}) é operação de UI ou script/admin direto? Hoje não há tela nem sinal de quem dispara isso.", "decide": "se o importador em lote entra em alguma fatia futura de F3.4, e quando" },
    { "tipo": "cliente", "pergunta": "Consulta cruzada de NCM×CEST×CST pela UI é fluxo real de algum operador hoje (faturamento, cadastro de produto)?", "decide": "se os 12 endpoints cortados em Q7 voltam como fatia própria, e com que prioridade" },
    { "tipo": "backend", "pergunta": "DIV-3 e DIV-4, já registradas pela inventariante — repito aqui porque a resposta muda o escopo de b60/b61 (se natureza inativa deveria ser recusada na derivação de CFOP; se os quatro Error.Conflict deveriam sair como 409)", "decide": "se a mitigação (somenteAtivas=true) e o tratamento de 400 genérico bastam, ou se b61 precisa de mais uma guarda" }
  ],
  "riscos": [
    "Não verificado se ValidarNotaFiscalUseCase.PrepararNumeracaoAsync exige CFOP resolvido no item, além de série cadastrada — a ordem b61 depois de b59/b60 assume que não, por escolha de UX; se exigir, a ordem ainda funciona, só que o ganho de b58 sozinho fica menor do que descrito.",
    "O corte dos 12 endpoints de CadastrosFiscaisController (D-prox-3) depende de eu não ter enxergado um consumidor real no inventário — a lista de 'consumidores e dependências cruzadas' (inventário §5) é a evidência, mas é a leitura de quem fez o inventário, não uma varredura própria de todo o repositório.",
    "A extração do CFOP compartilhado entre tributação e fiscal (Q1) fica sem dono declarado nesta rodada — se plataforma não decidir, b61 corre risco de duplicar a busca pela terceira vez."
  ]
}
```
