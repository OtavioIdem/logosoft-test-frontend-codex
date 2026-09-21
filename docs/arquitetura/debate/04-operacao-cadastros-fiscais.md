# 04 — Operação: cadastros fiscais

Agente: `arquiteto-operacao-erp`. Rodada de arquitetura 04, assunto `cadastros-fiscais`, nó
`arquitetura` do `graph_arquitetura`. Insumo: `docs/arquitetura/debate/04-inventario-cadastros-fiscais.md`
(citado como "inventário" abaixo), `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5/§6,
`docs/arquitetura/DECISOES.md`. Proponho; não decido — quem trava é o orquestrador.

Meu viés declarado: a tela existe para o operador fechar um documento fiscal válido, não para
expor 29 endpoints. Julgo as sete perguntas do briefing por essa régua: o operador que faz isso
vinte vezes por dia consegue fechar o trabalho sem sair da tela nem pedir ajuda?

---

## 1. O fluxo do operador — três fluxos que esta rodada decide

### Fluxo A — Emitir uma nota fiscal manual pela primeira vez numa empresa/filial nova

```text
1. Abre /fiscal/notas, clica "Nova nota fiscal manual".
   Tela: CriarNotaFiscalDialog (features/fiscal/components/FiscalActionDialogs.tsx:101-142).
2. Escolhe Empresa, Filial, Tipo de documento, digita Série (campo texto livre hoje, linha 133) e
   Número, escolhe Pessoa (via EntitySelect, linha 135, correto), tenta escolher Natureza de
   Operação — campo desabilitado com o texto "Ainda sem endpoint operacional no backend" (linha 136).
3. Confirma e adiciona itens: ItemNotaFiscalDialog (linhas 199-237). Escolhe Produto (EntitySelect,
   correto), digita NCM e CFOP como texto livre (linhas 226-227), sem consultar o cadastro nem ver
   o CFOP que a Natureza resolveria para aquele item.
4. Tenta validar a nota (Rascunho → Validada). O backend roda
   ValidarNotaFiscalUseCase.PrepararNumeracaoAsync (ValidarNotaFiscalUseCase.cs:254-284): se a
   Série "1" não existir para (empresa, filial, modelo), falha com
   Fiscal.SerieFiscalNaoCadastradaParaContexto, mensagem "cadastre a série antes de validar"
   (FiscalErrors.cs:166-170).
5. Mesmo se a série existir, o item sem Natureza vinculada não deriva CFOP (comportamento aceito,
   "ainda não parametrizado" — NotaFiscalBasicaUseCases.cs:106-138); com Natureza vinculada e sem
   CFOP mapeado para o âmbito/tipo, falha com Fiscal.CfopSemMapeamentoParaAmbito, mensagem
   "cadastre o CFOP antes de gerar o documento fiscal" (FiscalErrors.cs:283-286).
6. Mesmo com série e CFOP certos, se a Pessoa/destinatário não tiver endereço, ou o endereço não
   tiver Município IBGE vinculado, ou faltar IndicadorContribuinteIcms, a validação falha de novo:
   DestinatarioSemEnderecoFiscal / DestinatarioSemMunicipioIbge /
   DestinatarioSemIndicadorContribuinteIcms (FiscalErrors.cs:218-244,304-307).
7. Em cada uma dessas três falhas, o operador lê uma mensagem que manda "cadastre X" e HOJE não
   tem nenhum lugar para ir: nem /fiscal/series, nem diálogo de Naturezas, nem aba fiscal ou de
   endereço em Pessoas existem no frontend (confirmado: grep zero ocorrências, inventário §1.4 e
   PessoasPage.tsx, ver §2 abaixo).
```

Este é o fluxo que a rodada precisa fechar. Ele tem **quatro** pré-requisitos simultâneos —
Série, Natureza+CFOP, Endereço+Município, Indicador de contribuinte — e falha no primeiro que
faltar. Isso importa para a Q7.

### Fluxo B — Cadastrar um cliente/fornecedor pronto para faturar

```text
1. Abre /pessoas, "Nova pessoa". Tela: PessoaFormDialog (features/pessoas/components/
   PessoaFormDialog.tsx), três abas hoje: "Dados gerais" (:85), "Documentos e observações" (:115),
   "LGPD e auditoria visual" (:134). Nenhuma aba fiscal, nenhuma aba de endereço.
2. Preenche nome, documento, salva. PessoasPage.tsx só oferece ações "Editar" e "Inativar"
   (PessoasPage.tsx:119) — sem "Bloquear", sem "Endereços", sem "Dados fiscais".
3. Volta ao Fluxo A para faturar essa pessoa. A validação falha por
   DestinatarioSemEnderecoFiscal: a pessoa nunca teve onde cadastrar endereço.
4. Mesmo que o endereço existisse, faltaria vincular o Município IBGE dele (campo do endereço, não
   da pessoa — PATCH /pessoas/{id}/enderecos/{enderecoId}/municipio, inventário §1.4.1 item 2) e
   preencher IndicadorContribuinteIcms (PATCH /pessoas/{id}/dados-fiscais).
```

Fluxo B nunca fecha hoje. Não fecha nem com os "+8" campos fiscais da F3.3 sozinhos — precisa
também de endereço, que o plano lista como "pré-requisito funcional, não-fiscal" (inventário §1.4.2).

### Fluxo C — Série chegando ao fim, ou um buraco de numeração aparece

```text
1. Uma série se aproxima do NumeroFinal. O operador (ou quem audita) precisa ampliar a faixa
   (POST /series/{id}/ampliar, nunca reduz — SerieFiscal.cs:123-133) ou encerrar a vigência e abrir
   série nova.
2. Uma nota foi cancelada/rejeitada e deixou um "buraco" no meio da faixa — legítimo por definição
   (ConsultarBuracosSerieFiscalUseCase.cs:7-13), resolvido por inutilização formal, não por edição.
3. O operador precisa: consultar GET /series/{id}/buracos (lista de números sem documento
   autorizado) e depois abrir /fiscal/inutilizacoes (tela já existente, AppMenu.tsx:141) para
   inutilizar aquele intervalo.
4. Hoje, mesmo com F3.1 pronta, esse passo 3→passo 4 exige o operador LER os números na tela de
   buracos e DIGITAR os mesmos números de novo em InutilizacoesFiscaisPage.tsx — os campos `serie`,
   `numeroInicial`, `numeroFinal` (linhas 31-33, 46-48) são estado local independente, sem nenhuma
   forma de receber valor de fora.
```

---

## 2. Onde o fluxo quebra hoje (citações)

```text
Fluxo A, passo 2 — Natureza de operação: campo <InputText disabled> com hint falso
  FiscalActionDialogs.tsx:136 e :187 (DIV-2 do inventário — a rota existe e funciona).
Fluxo A, passo 2 — Série: <InputText> texto livre, sem combo, sem validação contra SerieFiscal
  FiscalActionDialogs.tsx:109,133,150,183.
Fluxo A, passo 3 — NCM e CFOP do item: <InputText> texto livre, sem busca, sem conferência prévia
  FiscalActionDialogs.tsx:226-227.
Fluxo A, passos 4-6 — três mensagens de erro sem tela de destino (DIV-5 do inventário)
  FiscalErrors.cs:166-170, :283-286, :218-244, :304-307.
Fluxo B, passo 1 — PessoaFormDialog sem aba fiscal nem aba de endereço
  features/pessoas/components/PessoaFormDialog.tsx:84-137 (três abas, nenhuma fiscal/endereço).
Fluxo B, passo 2 — PessoasPage sem ação de endereço, bloqueio ou dados fiscais
  features/pessoas/components/PessoasPage.tsx:119 (só "Editar" e "Inativar").
Fluxo C, passo 4 — InutilizacoesFiscaisPage sem forma de receber valores pré-preenchidos
  features/fiscal/components/InutilizacoesFiscaisPage.tsx:27-54.
```

---

## 3. As sete perguntas do briefing

### Q1 — Fronteira de feature

**P04-OP-1.** Séries fiscais e Naturezas de operação (+ CFOP resolvido) ficam em `features/fiscal`
— o operador que cadastra a série é o mesmo que emite a nota, na mesma sessão de trabalho
(Fluxo A, passos 1-2). Cadastros fiscais (NCM/CEST/CST/geografia/CFOP-catálogo) e Modelos de
documento também ficam em `features/fiscal`, mas **os hooks de leitura precisam ser a única
fonte**: `features/tributacao` (hoje único consumidor, `tributacaoApi.ts:232-243`,
`useTributacao.ts:72-96`) deve importar os hooks de `features/fiscal`, não duplicar client próprio.
A duplicação já existe hoje como risco latente (DIV-8: `NcmResumoResponse`/`CfopResumoResponse`
são `type` TS puro, sem Zod) — se cadastros fiscais nascer com schema próprio em `features/fiscal`
e tributação mantiver o paralelo, viram duas fontes de verdade para "quais NCM existem", e um
campo renomeado no backend quebra silenciosamente só um dos dois lados, na hora errada (o
operador de exceção tributária só percebe quando um cálculo real sai errado, dias depois).

O bloco fiscal da Pessoa fica em `features/pessoas` — quem preenche é quem cadastra o cliente, no
mesmo ato (Fluxo B, passo 1). Uma tela fiscal separada para "completar dados fiscais de um cliente
que já existe" reintroduz exatamente o defeito que esta rodada existe para fechar: sair da tela
para terminar o trabalho.

**O que eu abro mão:** não exijo um feature novo `features/cadastros-fiscais` dedicado só porque o
cadastro é global (guard diferente) — isso é critério técnico de backend, invisível ao operador de
rotina, que só busca (nunca edita: a única escrita das 16 rotas é importação em lote, evento raro).
Cedo esse ponto ao `arquiteto-plataforma-frontend`/`arquiteto-design-system` se a fronteira técnica
divergir da minha, contanto que a regra de hook único (não duplicar consulta de NCM/CFOP) se
mantenha — esse ponto eu não cedo, porque é achado factual (DIV-8), não preferência de pasta.

### Q2 — Padrão de tela

**P04-OP-2.** Naturezas de operação segue o padrão listagem + diálogo já usado no repositório
(ex.: `PessoasPage.tsx`/`BensPage.tsx`), com um desvio real: o diálogo precisa de uma sub-tabela de
mapeamentos CFOP (âmbito × tipo de item → CFOP) editável em lote, porque o contrato diz
explicitamente "a lista de CFOPs, quando informada, **substitui** a atual"
(`NaturezaOperacaoContracts.cs:34`). Se a tela reenviar só o item que o operador editou, ela apaga
os demais mapeamentos sem avisar. A tela precisa carregar o array inteiro, deixar o operador
adicionar/editar/remover linhas, e reenviar o array completo — isso é requisito operacional, não
estético.

Série fiscal **não** é o mesmo padrão: além do diálogo de criação (8 campos), tem duas ações de
ciclo de vida que não são "editar" nem "inativar" — Ampliar faixa (nunca reduz,
`SerieFiscal.cs:123-133`) e Encerrar vigência — mais um relatório (buracos), não um formulário. A
ação "Ver buracos" precisa abrir algo que **entrega** os números faltantes prontos para a tela de
Inutilizações (Fluxo C), em vez de um relatório solto que o operador copia de cabeça.

**O que eu abro mão:** não decido se "Ver buracos" vira diálogo, painel lateral ou navegação de
página — isso é design-system. Abro mão de exigir que a passagem de dados para Inutilizações
aconteça já na primeira versão via querystring/state automático — aceito que a v1 só mostre os
números lado a lado (cópia manual) **se** o custo de implementar a passagem automática empurrar a
entrega. O que não abro mão: o operador nunca deve ter que redigitar os mesmos números que acabou
de ler numa tela ao lado — se não for automático, tem que ser copiável (botão "copiar intervalo"),
não recitado de memória.

### Q3 — Navegação e menu

**P04-OP-3.** Itens **planos** dentro do grupo "Fiscal" já existente (`AppMenu.tsx:132-142)
— Séries fiscais, Naturezas de operação, Cadastros fiscais, Modelos de documento — em vez de
subgrupo aninhado "Cadastros fiscais". Um nível a mais de menu é um clique extra toda vez que o
operador vem, a partir de um erro de validação (Fluxo A, passos 4-6), procurar a tela certa — e
essa procura acontece com frequência alta nas primeiras semanas de uso de cada empresa/filial nova
(estimativa; não medida — ver §6 perguntas).

O bloco fiscal da Pessoa entra como **aba** na mesma `PessoaFormDialog` (Q1 já fecha isso, não
diálogo separado). Friso um ponto que atravessa Q3/Q5/Q7: **endereço e contato de Pessoa também
precisam de aba/seção na mesma tela**, mesmo sem ser nominalmente F3.3 — porque o Município IBGE
que a validação exige mora no **endereço**, não na pessoa (`PATCH .../enderecos/{id}/municipio`,
inventário §1.4.1 item 2). Cadastro fiscal "completo" sem endereço é cadastro fiscal inútil: a nota
falha do mesmo jeito, só que por `DestinatarioSemMunicipioIbge` em vez de
`DestinatarioSemIndicadorContribuinteIcms`.

**O que eu abro mão:** aceito hierarquia de menu de 1 nível a mais se quem decide design-system
preferir, **desde que** o link de erro do Fluxo A (Q4) não dependa dessa navegação — se o link pula
direto para a rota certa, a profundidade do menu vira estética, e nesse caso cedo.

### Q4 — DIV-5

**P04-OP-4.** As mensagens de erro (`Fiscal.SerieFiscalNaoCadastradaParaContexto`,
`Fiscal.CfopSemMapeamentoParaAmbito`, os quatro `DestinatarioSem*`) precisam virar **link
navegável**, não só texto — a UI captura o `code` do erro (já existe no payload,
`ApiErrorResponseFilter.cs`) e mapeia para a rota do cadastro faltante, com empresa/filial (e
`pessoaId`, quando aplicável) pré-preenchidos, porque o operador já sabe qual empresa e qual
cliente estava tentando faturar — a mensagem de erro não deveria obrigá-lo a redigitar esse
contexto na tela de destino.

Esse mapeamento mora no tratamento de erro da tela de Nota Fiscal (`NotaFiscalDetalhePage.tsx` /
fluxo de validação), não num componente genérico de erro (`ApiErrorPanel`) — o acoplamento
"erro fiscal conhece rota fiscal" é aceitável; "componente de erro genérico conhece rota fiscal"
não é.

**O que eu abro mão:** não exijo retorno automático à nota depois de cadastrar o item faltante —
aceito que o operador reabra a nota manualmente e tente validar de novo. O dado que falta é raro
por natureza (uma série ou uma natureza cadastrada serve para centenas de notas depois), então
pagar esse retorno manual **uma vez** por cadastro novo é aceitável. O que não abro mão: a mensagem
não pode continuar sendo só texto sem destino, porque aí o custo se repete a cada nota, não uma vez
por cadastro.

### Q5 — DIV-2, DIV-3, DIV-4, DIV-8

**P04-OP-5.**

- **DIV-2** corrige-se agora, sem pergunta: é um texto falso sobre capacidade do backend que já
  existe e está testada (`NaturezasOperacaoEndpointContractTests.cs`, citado no inventário). O
  campo vira `EntitySelect` (padrão já usado para Pessoa/Produto na mesma tela), nunca
  `InputText`/identificador digitado. Junto, o campo "Série" (mesma tela, linhas 109,133,150,183)
  também sai de texto livre para seleção por API restrita à empresa/filial/modelo já escolhidos —
  hoje o operador digita "1" sem saber se existe, e só descobre na validação (passo 4 do Fluxo A).

- **DIV-3** não decido: é regra de negócio com fonte omissa sobre intenção (proposital ou
  esquecimento). A UI reflete o estado que já existe sem inventar bloqueio novo: a listagem de
  Naturezas para seleção em item de nota usa o filtro `somenteAtivas` que o próprio contrato já
  oferece, escondendo inativas do combo padrão por default. Em edição, se o Id já vier preenchido
  com uma natureza inativa, a tela avisa sem impedir — reflete, não decide.

- **DIV-4** — os quatro erros que saem como 400 mas são `Error.Conflict` na fábrica precisam de
  tratamento por **`code`**, não por status HTTP: um listener genérico esperando 409 nunca vai
  disparar para eles. Para duplicidade (série/natureza), a ação certa é "corrija o número/código e
  tente de novo" — é erro de digitação do operador. Para conflito de concorrência na alocação, o
  domínio já tentou resolver sozinho até 5 vezes antes de devolver o erro
  (`AlocarNumeroSerieUseCase.cs:97-190`) — quando esse erro específico chega à UI, a resiliência do
  backend já se esgotou, então a ação certa é "tentar novamente agora", não "recarregue a página"
  (que é o padrão genérico de 409 do repositório para `NotaFiscal`/`PedidoVenda`).

- **DIV-8** corrige-se junto com Q1: os resumos que Tributação consome passam a vir do mesmo
  client/schema de Cadastros Fiscais (não decido se ganha `.strict()` — isso é do
  `arquiteto-plataforma-frontend`), fechando o risco de campo renomeado virar `undefined` silencioso
  numa tela de regra tributária.

**O que eu abro mão:** DIV-3 vira pergunta ao backend (item 1 da §7); abro mão de pedir bloqueio
duro (impedir seleção de natureza inativa) até a resposta — aceito o meio-termo (esconder do combo
padrão, avisar em edição) como suficiente para esta versão.

### Q6 — Volume e dado amostra

**P04-OP-6.** Busca incremental (server-side, com `termo`/`codigo`, debounce) para NCM, CFOP,
município e CEST — reaproveitando o padrão de busca que já existe no repositório
(`EntitySelect`/`onSearch` com debounce, usado hoje para Pessoa e Produto,
`FiscalActionDialogs.tsx:117-119,135`). O operador de rotina nunca navega uma lista de milhares de
NCM manualmente — ele digita 2-3 caracteres e escolhe. Construir contra o volume de amostra de hoje
(17 NCM, 32 municípios, 80 CFOP) sem busca server-side quebraria no dia em que
`POST /importar/{tabela}` trouxer o cadastro oficial completo (~10 mil NCM, ~5.570 municípios) —
risco que o próprio inventário nomeia na §6. Como a busca já é server-side desde o início, o dia da
importação oficial não exige mudança de tela, só de volume de dado atrás da mesma consulta.

Exceção: UF (27 linhas, completo, a API não pagina — `GET /uf` devolve `IReadOnlyList` direto) —
combo fixo, carrega tudo, sem busca incremental; não há ganho em tratar 27 itens como se fossem 10
mil.

**O que eu abro mão:** não decido tamanho de página nem quantidade mínima de caracteres para
disparar a busca (design-system/UX). Abro mão de pedir pré-carregamento de "mais usados" (ex.: os 5
CFOP mais frequentes no topo do combo) — seria conveniência real, mas depende de telemetria de uso
que o inventário não registra existir; fica como sugestão de versão futura, não requisito desta.

### Q7 — Sequência e fatiamento

**P04-OP-7.** O critério do briefing — "o documento fiscal deixar de falhar por cadastro ausente"
— só se cumpre quando os **quatro** pré-requisitos do Fluxo A (Série, Natureza+CFOP,
Endereço+Município, Indicador de contribuinte) chegam **juntos** o suficiente para fechar o fluxo
pelo menos uma vez. Nenhuma nota valida sem os quatro simultaneamente (passos 4-6 do Fluxo A) — não
existe "nota simples" que passe com só três. Entregar F3.1 sozinha numa versão não fecha nada: o
operador cadastra a série, tenta validar de novo, e a nota falha no próximo pré-requisito (CFOP ou
destinatário) — ele não sai do ciclo "erro → tela nova → erro seguinte", só troca de mensagem.

Ordem sugerida, do ponto de vista do operador (não do backend):

```text
1. F3.4 + F3.5 (leitura pura, sem risco) — pré-requisito dos combos dos outros três:
   Natureza de Operação precisa de combo de CFOP; Série precisa de combo de Modelo de Documento.
2. F3.1 (Séries) — primeiro checkpoint da validação (PrepararNumeracaoAsync roda antes de
   qualquer item).
3. F3.2 (Naturezas + CFOP) — segundo checkpoint, por item da nota.
4. F3.3 (Pessoa: fiscal + endereço, mesmo o endereço não sendo nominalmente F3.3) — sem isso o
   Fluxo B nunca fecha e o Fluxo A falha no destinatário mesmo com série e natureza certas.
```

Fica **fora** da F3, na minha leitura: exibição de `Bloqueada`/`MotivoBloqueio` na listagem/form de
Pessoa (a parte não-fiscal de DIV-7). É bloqueio operacional com endpoint próprio
(`PessoasBloquear`/`Desbloquear`), mas **nenhuma** mensagem de erro do domínio fiscal cita bloqueio
de pessoa como causa de falha de nota — não é pré-requisito de nenhum fluxo desta rodada, e já tem
destino óbvio de tela (aba "Dados gerais" ou ação de linha), então não é uma DIV-5 nova adiada.

**O que eu abro mão:** aceito que endereço/contato de Pessoa (12 dos 15 endpoints "não-fiscais" do
inventário) saia do nome F3.3 se o cliente preferir cortar por contagem de tela — mas registro que,
se cortar, **o Fluxo B não fecha nesta rodada**: o operador continua sem vincular município ao
endereço, e a nota continua falhando por `DestinatarioSemMunicipioIbge` mesmo com o "bloco fiscal
da pessoa" pronto. Não é economia, é adiar o mesmo defeito com nome de fatia diferente — aceitável
**somente** se ficar registrado como decisão nomeada (uma próxima fatia fecha o resto), não como
esquecimento.

---

## 4. O que a tela precisa permitir (lista, com o passo que destrava)

```text
1. Buscar Série por empresa/filial/modelo em combo (não texto livre)
   — destrava Fluxo A passo 2, sem erro reativo de série.
2. Natureza de Operação com EntitySelect real (não desabilitado) e sub-tabela de mapeamento CFOP
   editável em lote, reenviando o array completo
   — destrava Fluxo A passo 2 e a correção de mapeamento errado (Q2).
3. Ação "ver CFOP derivado" antes de confirmar item de nota (GET /naturezas-operacao/{id}/cfop,
   0/5 consumido hoje)
   — destrava Fluxo A passo 3, evita a falha reativa de CFOP divergente (D4 do inventário).
4. Aba/seção "Dados fiscais" na PessoaFormDialog com os 8 campos de escrita e os indicadores
   derivados mostrados como somente leitura (ex.: IndicadorIeDestinatario, sempre calculado)
   — destrava Fluxo B passo 2.
5. Aba/seção "Endereços" na mesma tela de Pessoa, com vínculo de Município por combo de busca
   (nunca GUID digitado, nunca texto livre)
   — destrava Fluxo B passo 3 e resolve DestinatarioSemMunicipioIbge.
6. Relatório de buracos de série com ação que entrega os números para a tela de Inutilizações já
   existente, sem o operador redigitar
   — destrava Fluxo C.
7. Mensagem de erro da nota com link/ação para a tela do cadastro faltante, contexto
   (empresa/filial/pessoa) preenchido
   — destrava DIV-5 / Q4, evita a repetição do ciclo erro→busca→erro.
8. Busca incremental (server-side, debounce) em NCM, CFOP, CEST, município
   — destrava uso em produção com o volume real, quando a tabela oficial for importada (Q6).
9. Motivo obrigatório e visível no histórico em toda ação de inativar (série, natureza) — já é
   campo obrigatório no backend (Motivo: string), a tela precisa exigir e exibir
   — destrava o caminho de correção/auditoria (item 5 da missão: cobrir o caminho errado).
```

---

## 5. Impacto em módulo vizinho

```text
Vendas — GerarNotaFiscalPedidoVendaDialog (FiscalActionDialogs.tsx:144-197) gera nota a partir de
  pedido aprovado; herda o mesmo bloqueio de série/natureza do Fluxo A. Nenhuma mudança de tela em
  Vendas é necessária, mas o pedido aprovado fica "preso" no mesmo ciclo de erro se os cadastros
  fiscais não existirem — o operador de Vendas é quem sente o efeito, sem ser dono da correção.

Estoque — NaturezaOperacao.MovimentaEstoque (campo do request de criação/atualização) decide se a
  nota baixa/entra estoque. A tela de Natureza precisa deixar essa flag visível e clara, porque é
  o operador fiscal quem decide, sem ver o módulo de Estoque, algo que afeta saldo do módulo vizinho.

Financeiro — NaturezaOperacao.GeraFinanceiro, mesma lógica: nota com essa flag gera título a
  receber/pagar. Mesma exigência de visibilidade na tela de Natureza.

Produtos/Tributação — CfopDoItemResolver deriva TipoItemCfop a partir da classificação SPED do
  produto (ProdutoEmProcesso/ProdutoAcabado → ProducaoPropria; resto → Revenda, comportamento
  conservador, TipoItemCfop.cs:38-42). Um produto classificado errado no módulo de Produtos muda o
  CFOP aplicado na nota sem que o operador fiscal veja o motivo — é o argumento a favor do item 3
  da §4 (mostrar o CFOP derivado antes de confirmar o item), que torna esse acoplamento visível em
  vez de silencioso.

Nenhum outro módulo vizinho identificado nesta rodada — Compras, Qualidade e Contratos não aparecem
no inventário como consumidores nem como afetados pelos sete endpoints em debate.
```

---

## 6. O que eu abro mão — resumo

```text
Q1  Não exijo feature novo para cadastros globais; cedo nome de pasta, não cedo hook único.
Q2  Aceito v1 sem passagem automática de dados buracos→inutilização, se copiável manualmente.
Q3  Aceito subgrupo de menu se o link de erro não depender da navegação por menu.
Q4  Não exijo retorno automático à nota após cadastro do item faltante.
Q5  DIV-3 vira pergunta; aceito meio-termo (esconder inativa do combo padrão) até resposta.
Q6  Não decido paginação/gatilho de busca; não exijo "mais usados" sem telemetria existente.
Q7  Aceito cortar endereço/contato do nome F3.3 SE ficar registrado que o Fluxo B não fecha ainda.
```

---

## 7. Perguntas que só o cliente ou o backend respondem

```text
1. [backend] DIV-3: CfopDoItemResolver.ResolverNaturezaAsync deveria recusar natureza inativa ao
   derivar CFOP de item novo, como AtualizarCabecalho/MapearCfop já fazem via GarantirAtiva? Decide
   se a UI bloqueia seleção de natureza inativa ou só esconde do combo padrão (Q5).

2. [backend] Os quatro Error.Conflict de Séries/Naturezas vão passar a sair como 409, alinhado ao
   padrão já usado em NotaFiscal/PedidoVenda? Decide se o tratamento por `code` string desta rodada
   (Q5/DIV-4) é definitivo ou temporário até o remapeamento chegar.

3. [cliente] A exibição de Bloqueada/MotivoBloqueio de Pessoa entra nesta fatia de F3, ou fica para
   depois? Decide se o Fluxo "bloquear cliente inadimplente" fecha nesta rodada — e se Vendas
   (pedido de venda de cliente bloqueado) precisa do mesmo sinal antes desta rodada fechar.

4. [cliente] Quando o cadastro oficial de NCM/CFOP/Município for importado (10 mil+ linhas), existe
   expectativa de "mais usados"/favoritos por empresa, ou busca pura por código/termo é aceitável
   permanentemente? Decide se falta um requisito de UX nesta rodada (Q6).

5. [backend] Existe teto de tamanho para a lista de mapeamentos CFOP de uma Natureza de Operação
   (hoje reenviada por completo no PUT)? Decide se o editor da sub-tabela do diálogo (Q2) precisa
   paginar internamente ou sempre cabe numa tela.
```

---

## Divergências que espero dos outros três

```text
arquiteto-escopo-entrega deve propor cortar Q7 em telas menores por versão — vou insistir que os
  quatro pré-requisitos do Fluxo A andam juntos, porque nenhum deles sozinho fecha uma nota.

arquiteto-plataforma-frontend deve achar "hook único entre fiscal e tributação" (Q1) esforço
  desproporcional para um consumo hoje pequeno — aceito discutir o tamanho do esforço, mas o risco
  de duas fontes de verdade (DIV-8) é achado factual, não preferência.

arquiteto-design-system deve propor um componente único de "seletor de cadastro fiscal" para
  Série/Natureza/NCM/CFOP — sem problema, desde que preserve busca server-side (Q6) e não vire
  campo de texto livre disfarçado de select.
```

---

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "cadastros-fiscais",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/04-operacao-cadastros-fiscais.md",
  "decisoesPropostas": [
    { "id": "P04-OP-1", "resumo": "Fronteira de feature: Séries/Naturezas/Cadastros fiscais/Modelos em features/fiscal com hook único de leitura reaproveitado por tributação; bloco fiscal (+endereço) da Pessoa em features/pessoas." },
    { "id": "P04-OP-2", "resumo": "Padrão listagem+diálogo para Naturezas com sub-tabela de CFOP reenviada por completo; Série com ações de ciclo de vida distintas (ampliar/encerrar/buracos) além do diálogo simples." },
    { "id": "P04-OP-3", "resumo": "Itens planos no grupo Fiscal existente; bloco fiscal e endereço como abas da mesma PessoaFormDialog." },
    { "id": "P04-OP-4", "resumo": "Mensagens de erro DIV-5 viram link navegável para o cadastro faltante, com contexto pré-preenchido." },
    { "id": "P04-OP-5", "resumo": "DIV-2 corrige-se agora (campo vira seleção real); DIV-3 vira pergunta com meio-termo; DIV-4 tratado por code, não por status HTTP; DIV-8 fecha junto do hook único de Q1." },
    { "id": "P04-OP-6", "resumo": "Busca incremental server-side em NCM/CFOP/CEST/município, reaproveitando o padrão já existente; UF fica combo fixo." },
    { "id": "P04-OP-7", "resumo": "F3 fecha com os quatro pré-requisitos do Fluxo A na mesma sequência funcional; Bloqueada/MotivoBloqueio de Pessoa fica fora por não ser dependência de nenhuma falha fiscal hoje." }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "DIV-3: natureza inativa deveria ser recusada na derivação de CFOP de item novo, como já é na edição da própria natureza?", "decide": "se a UI bloqueia ou só esconde do combo padrão" },
    { "tipo": "backend", "pergunta": "Os quatro Error.Conflict de Séries/Naturezas vão sair como 409 no futuro?", "decide": "se o tratamento por code (Q5) é definitivo ou provisório" },
    { "tipo": "cliente", "pergunta": "Bloqueada/MotivoBloqueio de Pessoa entra nesta fatia de F3?", "decide": "se o fluxo de bloqueio de cliente fecha nesta rodada" },
    { "tipo": "cliente", "pergunta": "Existe expectativa de favoritos/mais usados quando o cadastro oficial de NCM/CFOP/município for importado?", "decide": "se falta requisito de UX em Q6" },
    { "tipo": "backend", "pergunta": "Há teto de tamanho para a lista de mapeamentos CFOP de uma Natureza?", "decide": "se o editor da sub-tabela (Q2) precisa paginar" }
  ],
  "riscos": [
    "Fluxo A (emitir nota) não fecha se a versão entregar só um dos quatro pré-requisitos (série, natureza+CFOP, endereço+município, indicador de contribuinte) — o operador troca de mensagem de erro, não sai do ciclo.",
    "Fluxo B (cadastrar pessoa pronta para faturar) não fecha se endereço/município ficar fora do recorte de F3.3, mesmo com o bloco fiscal da pessoa pronto — DestinatarioSemMunicipioIbge continua ocorrendo.",
    "Fluxo C (buraco de numeração) fica com passagem manual de dados entre a tela de buracos e Inutilizações se a versão não priorizar a integração entre as duas telas — abri mão disso condicionalmente em Q2.",
    "Se DIV-3 não virar pergunta respondida a tempo, a UI aplica o meio-termo (esconder natureza inativa do combo) sem confirmação do backend sobre a intenção da regra.",
    "Bloqueio de Pessoa (Bloqueada/MotivoBloqueio) fica fora desta rodada por proposta própria (P04-OP-7) — se Vendas depender desse sinal para bloquear pedido de cliente inadimplente, esse acoplamento fica sem cobertura até pergunta 3 da §7 ser respondida."
  ]
}
```
