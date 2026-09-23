# Rodada 07 — `arquiteto-plataforma-frontend` · produtos-fiscais (v1.11.0a8b65)

Viés declarado: ano cinco. A pergunta não é "isso funciona", é "quanto custa mudar isso quando
houver quarenta módulos". Três decisões (D-A, D-B, D-C), cada uma com o que abro mão.

## 0. O que já é fato na árvore, antes de debater

Antes de julgar as três decisões, um ponto factual que muda o peso da D-A: **`tipoItemSped` já foi
resolvido**. A `v1.11.0a8b64.c2` (HEAD atual) já:

- adicionou `tipoItemSped: optionalNumber` a `atualizarDadosFiscaisProdutoSchema`
  (`features/produtos/schemas/produtosSchemas.ts:106`);
- adicionou `tipoItemSped?: number | null` a `ProdutoResponse`
  (`features/produtos/types/produtos.types.ts:75`);
- removeu `AtualizarDadosFiscaisProdutoRequest.tipoItemSped` de `LACUNA_ESPERADOS_HOJE`, que hoje
  tem **7** itens, não 8 (`tests/unit/gateContractRequestFields.test.ts:105-113`, comando
  `sed -n '90,120p'` conferido nesta rodada).

O inventário da `b65` (`docs/fatias/v1.11.0a8b65-inventario.md:44,280-294`) descreve `tipoItemSped`
como item 4 de uma lista de "8 LACUNA", e a seção 6 projeta a prova final em "3". A aritmética final
bate (7 − 4 preenchidos nesta fatia = 3), mas o número de partida no texto do inventário está um
passo atrás da árvore que a `b65` de fato herda. Não é uma divergência que bloqueia — é a mesma
classe de risco que o achado nº7 do próprio inventário aponta (mapa auxiliar que fica desatualizado
sem quebrar teste), só que já **materializada**: `LACUNA_DESTINO`
(`scripts/gate-contract-request-fields.mjs:363`) ainda mapeia
`'AtualizarDadosFiscaisProdutoRequest.tipoItemSped': 'b65'`, um campo que já foi resolvido em
`b64.c2` e deveria ter saído do mapa naquela fatia. Isso é evidência, não intuição: `git grep` nesta
sessão confirma a entrada viva, e o teste que a acompanha (`toContain('7')`,
`gateContractRequestFields.test.ts:391`) passa mesmo com a entrada morta — porque nada no repositório
asserta o conteúdo de `LACUNA_DESTINO`, só o de `LACUNA_ESPERADOS_HOJE`. Volto a isto na seção de
gates.

O recorte real que sobra para esta fatia editar em `LACUNA_ESPERADOS_HOJE` são os 4 itens restantes
de Produto (`unidadeTributavelSigla`, `exTipi`, `codigoBeneficioFiscalPadrao`,
`descricaoFornecedor`) — 7 → 3. O número que a prova durável precisa carimbar é **3**, confirmado
por leitura direta do arquivo, não por recálculo do inventário.

---

## 1. D-A — escopo da fatia

**Posição: só Produto entra em `v1.11.0a8b65`. Cliente e fornecedor viram uma fatia própria, com
inventário próprio, antes de qualquer linha de código.**

### Por que

O plano da onda (`docs/PLANO-FRONTEND-ONDA-OPERACAO.md:107-113`) rotula `b65` como "Produto,
cliente, fornecedor" — um rótulo de calendário, escrito antes de qualquer inventário existir para
os três. Só Produto tem inventário (`docs/fatias/v1.11.0a8b65-inventario.md`, recorte declarado na
linha 4-8: "os cinco campos... mais o que estiver diretamente acoplado a eles"). Cliente
(`PUT /api/clientes/{id}/configuracao-comercial`) e fornecedor (configuração de compra,
homologação) não foram lidos no C#, não têm anulabilidade conferida, não têm tabela de
`LACUNA_ESPERADOS_HOJE` prevista, e não têm volume medido.

Isso não é burocracia — é o precedente que o próprio repositório já pagou duas vezes:

1. **D55** (`docs/arquitetura/DECISOES.md:1520-1562`) trava a doutrina "o gate da classe vem antes
   da correção", exatamente porque "corrigir primeiro e construir a prova depois... foi o que
   custou sete rodadas na `b53`". O princípio geral por trás — não implementar contrato sem prova
   escrita primeiro — se aplica igual aqui: implementar cliente/fornecedor sem inventário é pedir
   ao `dev-senior-react` para inventar anulabilidade e forma de payload no fio da implementação,
   que é exatamente o anti-padrão listado em `00_padrao_de_execucao.md:96`
   ("Inventar endpoint, campo, enum ou regra fiscal").
2. **D56** (`docs/arquitetura/DECISOES.md:1567-1612`) já registrou o custo de roteiro só na
   conversa: "esse intervalo a `c3` citou `b62`–`b69` como destino de oito itens que nenhum arquivo
   definia" — e cita `docs/fatias/README.md` como quem mede esse custo. O rótulo "b65 — Produto,
   cliente, fornecedor" no plano da onda é a mesma classe de risco: nome dado antes do inventário
   provar o que cabe.

### Custo de cada lado

- **Ship só Produto agora**: o `graphNodes` desta fatia fica igual ao da `b64.c2`
  (`builder, tests, qa_review` — `docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md:33`),
  porque o inventário já existe e já fecha as perguntas de contrato, volume e permissão. Custo:
  o título "b65" do plano de onda deixa de bater 1:1 com o que a versão entrega — correção de
  documento, barata, reversível, é só reescrever uma linha em
  `PLANO-FRONTEND-ONDA-OPERACAO.md`.
- **Ship os três juntos**: o grafo desta fatia precisa **crescer** — no mínimo um novo nó
  `inventariante-contrato-tela` antes do `builder` (para cliente e, separadamente, fornecedor, que
  são use cases distintos no backend), o que quebra a cadência de "uma versão por entrega" com dois
  perfis de risco desiguais na mesma versão: Produto já medido, cliente/fornecedor não. Se o
  inventário de cliente/fornecedor achar algo do porte do achado nº1 desta rodada (round-trip que
  falha 400 em produção), a fatia inteira atrasa por um módulo que nem precisava estar nela.

**O que abro mão:** abro mão de fechar "b65" como está nomeada no plano de onda — quem lê só o
título vai achar que a versão está incompleta. Sinal para trocar de posição: se o inventário de
cliente/fornecedor sair **hoje**, antes do `builder` desta fatia começar, e não achar nenhum
round-trip quebrado (nenhum "achado nº1" equivalente), o custo de rodar os dois em paralelo cai
bastante e a divisão vira só organização de commit, não risco. Isso é decisão do orquestrador, não
minha — eu só digo o preço de cada lado.

---

## 2. D-B — rótulo do segundo seletor de "unidade tributável"

**Posição: não é problema de plataforma resolver o rótulo — é problema de design/operação — mas
*é* problema de plataforma garantir que a colisão de nome nunca vira colisão de dado.**

### O que já protege isso, sem precisar de decisão nova

O schema já separa os dois campos por chave, não por rótulo: `unidadeMedidaTributavelId` (Guid,
catálogo interno, já em `produtosSchemas.ts:107`) e `unidadeTributavelSigla` (string, catálogo
oficial, campo novo desta fatia) são chaves Zod distintas, tipos distintos (Guid vs. string curta),
alimentadas por hooks e endpoints diferentes. Não existe caminho estrutural para o valor de um
vazar para o outro — a colisão que o inventário aponta (achado nº5 de Divergências) é puramente de
rótulo visível, não de payload. Isso é fato de código, não opinião: os dois campos do C#
(`ProdutoRequests.cs:46-56`) já são parâmetros posicionais distintos, e o mapper do backend
(`ProdutoMapper.cs:44-48`) já os devolve como propriedades distintas.

### O único ponto onde plataforma tem voz aqui

O **valor** que o segundo seletor guarda no estado do formulário deve ser a **sigla** (`string`),
nunca um Id resolvido no cliente — porque o backend nunca aceita a sigla como Id: `ResolverAsync`
resolve `UnidadeTributavelOficialId` **no servidor**, a partir da sigla enviada
(`ProdutoDadosFiscaisResolver.cs:129`, achado §2 do inventário — "o frontend nunca envia este Id;
só o recebe de volta"). Isso é a mesma forma de `useUfCatalogo`
(`features/administracao/hooks/useEnderecoFiscalCatalogos.ts:43`: `value: uf.sigla`, não
`value: uf.id`). Se quem implementar montar o autocomplete com `value = id` (copiando o padrão do
`EntitySelect` que a maioria dos catálogos internos do módulo usa, ex. `unidadeOptions` em
`ProdutoFormDialog.tsx:266-268`, que é Guid), o payload sai errado, o Zod aceita (é só uma string),
e o erro só aparece no `400` do backend — sem erro de compilação, o exato eixo mais caro deste
frontend. Isso não é intuição: é o mesmo desenho que `useUfCatalogo`/`useMunicipioCatalogo` já
resolveram corretamente há uma fatia, e o custo de copiar o padrão errado (Guid-based) em vez do
certo (sigla-based) só aparece em runtime.

**O que abro mão:** o rótulo em si — "Unidade tributável (fiscal)" vs. "Unidade tributável
(interna)" vs. qualquer outra redação — é do `arquiteto-design-system` e do `arquiteto-operacao-erp`.
Não vou arbitrar texto. Meu único não-negociável é a forma do dado por trás do rótulo: sigla, não
Id. Reversível: sim, e barato — é um `value` de select, não uma `queryKey` que outra tela reusa.

---

## 3. D-C — permissão dupla para o catálogo de unidades tributáveis

**Posição: replica o padrão de `useEnderecoFiscalCatalogos.ts`, mas com um ajuste de escopo que o
precedente não precisou fazer.**

### O precedente

`FISCAL_CADASTROS_CONSULTAR` já está no union (`types/erp.ts`) e no catálogo
(`permissoesCatalogo.ts:121`) — não é permissão nova, é uma segunda checagem sobre uma ação que já
existe. `useEnderecoFiscalCatalogos.ts:10,40` fixa `enabled: permitido` nas queries de catálogo
fiscal, e `EnderecoFiscalFormSection.tsx:295` avisa quando falta. Isso já resolveu exatamente este
problema numa fatia anterior (`b64`) — reusar é o caminho barato, e reinventar aqui seria o
`arquiteto-plataforma-frontend` cometendo o próprio erro que a skill lista: "propor refatoração que
não fecha defeito observado".

### O ajuste que o precedente não precisou fazer

No endereço fiscal, o catálogo (UF/município) é parte constitutiva do próprio objeto sendo editado
— faltar `FISCAL_CADASTROS_CONSULTAR` compromete a seção inteira. Aqui não: a aba "Dados fiscais"
do produto é guardada por `PRODUTOS_DADOS_FISCAIS_GERENCIAR`
(`ProdutoFormDialog.tsx:242`), e essa permissão já cobre nove outros campos que não dependem do
catálogo oficial (`ncmCodigo`, `cestCodigo`, `tipoItemFiscal`, `tipoItemSped`, `exTipi`,
`codigoBeneficioFiscalPadrao`, `unidadeMedidaTributavelId`, `codigoFiscalExterno`, e o vínculo de
fornecedor). Um operador com `PRODUTOS_DADOS_FISCAIS_GERENCIAR` e sem `FISCAL_CADASTROS_CONSULTAR`
continua precisando editar os outros nove. Se o `enabled: permitido` for aplicado à aba inteira (o
que o padrão de `useEnderecoFiscalCatalogos` faz, porque no caso dele faz sentido — o objeto inteiro
depende do catálogo), essa fatia tira uma capacidade real de quem já a tinha hoje: editar NCM,
CEST, `tipoItemFiscal` etc. sem depender de `unidadeTributavelSigla`.

Isso muda a classificação de `accessRisk` (`risk.yaml`, citado em `CLAUDE.md`): se o guard for
aplicado à aba, é `CAPACIDADE` — perda real, exige confirmação. Se for aplicado só ao campo/select
novo (desabilitado + aviso pontual, os outros nove campos intactos), é `NENHUM` — a mesma
classificação que a D54 deu ao padrão equivalente em série fiscal ("P-1b e P-2a:... Ninguém perde a
criação de nota; é o que mantém `accessRisk: NENHUM`", `DECISOES.md:1500-1501,1517`). A diferença
entre os dois é code review de dez minutos, não arquitetura nova — mas é o tipo de detalhe que, se
esquecido, tira acesso de gente sem que ninguém tenha decidido tirar.

### Estrutura do hook — primeiro consumo de `GET /api/fiscal/cadastros/unidades-tributaveis`

Fato relevante para o desenho: `grep -rn "unidades-tributaveis" features/` dá zero hoje
(confirmado pelo inventário, e reconferido nesta rodada). Três decisões de estrutura, cada uma com
precedente do próprio repositório:

1. **Onde mora**: `features/produtos/`, não `features/fiscal/` nem `features/administracao/`. O
   precedente não é "endpoint pertence ao dono do controller" — é "endpoint pertence a quem
   consome primeiro". `administracaoApi.ts:248-256` já chama dois endpoints do mesmo
   `CadastrosFiscaisController` (`/api/fiscal/cadastros/uf`, `/api/fiscal/cadastros/municipios`) a
   partir de `features/administracao`, não de `features/fiscal` — mesmo `features/fiscal/api/`
   existindo no repositório com três clientes próprios (`fiscalApi.ts`, `seriesFiscaisApi.ts`,
   `modelosDocumentoFiscalApi.ts`). Centralizar agora em `features/fiscal` seria criar
   infraestrutura compartilhada para **um** consumidor — o gatilho da skill
   ("componente compartilhado antes de existirem três casos", que aqui vale por analogia para
   cliente de API) não está presente. Gatilho de revisita: no dia em que um segundo módulo
   (ex. venda, ao montar item de NF-e) também precisar resolver `uTrib` por sigla, aí sim vale
   extrair um client `fiscalCadastrosApi` compartilhado — hoje seria gold-plating.
2. **`queryKey`**: `['produtos', 'unidade-tributavel', termo]` — sem `empresaId`/`filialId`. Isso é
   deliberado, não esquecimento: o catálogo é a **tabela oficial global** (Mód.04, o mesmo nível de
   UF), não o catálogo interno por empresa que os outros hooks de `useProdutosResources.ts`
   carregam (`produtosQueryKey`, `unidadesMedidaQueryKey` etc. levam `query: CatalogoListQuery`
   com `empresaId`/`filialId` embutidos, `produtos.types.ts:3-9`). Colocar escopo de empresa numa
   `queryKey` de dado nacional só multiplicaria entradas de cache idênticas por empresa/filial sem
   nenhum ganho — o precedente exato é `useUfCatalogo`, cuja chave também não carrega escopo
   (`['administracao', 'endereco-fiscal', 'uf', debouncedTermo]`).
3. **`enabled` e `staleTime`**: `enabled: permitido && <condição do campo, não da aba>`,
   `staleTime: 5 * 60 * 1000` — os mesmos 5 minutos de `useUfCatalogo`/`useMunicipioCatalogo`. Não
   proponho `staleTime` diferente sem medição de quão frequentemente esse catálogo muda; herdar o
   valor já em produção é a opção reversível.

### Volume

Não medido — o banco de dev não tem migração aplicada (`__EFMigrationsHistory` com 0 linhas,
confirmado pelo próprio inventário, seção "Fontes usadas"). **Isto é intuição, não medição**: por
ser tabela oficial (padrão NF-e, `uTrib`), a ordem de grandeza costuma ser dezenas, não milhares —
mas o precedente que decide aqui não é o volume medido, é a **D52**
(`DECISOES.md:1463-1467`): "NCM, CFOP, CEST e município só por busca no servidor (`termo` +
paginação), com debounce... UF é combo estático (27, sem paginação na API)". `unidades-tributaveis`
já vem paginada do backend (`CadastrosFiscaisController.cs:151-163`, `tamanhoPagina = 20` default) —
não é um combo estático de 27 itens como UF. D52 já resolveu a classe: servidor decide o volume,
frontend nunca carrega a tabela inteira num dropdown. `useDebouncedValue(termo, 350)` é o mesmo
debounce dos outros dois.

**O que abro mão:** não vou pedir contagem real da tabela antes de aprovar o hook — D52 já decidiu
a forma (busca no servidor) independente do número, e é a forma que fecha o risco de volume, não a
contagem exata. Se a tabela acabar tendo, por exemplo, 8 itens só, um combo estático seria mais
simples — mas trocar de "busca com debounce" para "combo estático" depois é reversível e barato
(troca de `enabled`/anulação do campo `termo`), então não vale atrasar a decisão agora por um número
que ninguém mediu.

---

## 4. Onde a proposta de operação pode quebrar sob contrato (antecipando o eixo mais provável de
   discordância)

Não vi ainda a posição do `arquiteto-operacao-erp` nesta rodada (debate em paralelo), mas o
recorte do inventário já aponta o ponto onde qualquer proposta de fluxo precisa respeitar um
comportamento de backend que não é intuitivo: `AtualizarDadosFiscaisProdutoRequest` **não faz
merge** — é substituição atômica do bloco inteiro (`ProdutoDadosFiscaisResolver.ResolverAsync`,
sem receber os dados fiscais atuais do produto, achado central do inventário, seção 3). Qualquer
desenho de tela que assuma "salvar só o campo que o operador tocou" está errado por contrato: o
`ProdutosPage.tsx` já precisa reenviar os dez campos do bloco, sempre, ou nenhum. Isso não é uma
preferência de arquitetura — é o que o backend aceita. Registro aqui porque é o tipo de coisa que
"parece" escopo de operação (como a tela se comporta) mas na verdade é acoplamento de contrato
(o que a API aceita), e cabe à plataforma travar a fronteira antes que vire uma decisão de UX que
o backend rejeita.

---

## 5. Gates — o que falta, o que fecha, o custo

### 5.1 Gate que falta: paridade nominal do enum espelhado (`TipoItemSped`, e retroativo a
    `TipoItemFiscal`/`TipoProduto`)

**Classe de defeito que fecha**: enum do frontend diverge, em nome ou em valor numérico, do enum
real do backend — e nada acusa, porque enum sem `JsonStringEnumConverter` trafega como número
(confirmado pelo inventário: `Erp.Api/Program.cs:28-31` não registra conversor). Um valor
renumerado ou um item novo no backend (ex. o SPED ganhar um 13º tipo de item no futuro) muda o
significado do número sem quebrar tipo nenhum em TypeScript — é o mesmo eixo que a
`v1.11.0a8b` que criou este exercício descreve na missão: "quebra em produção sem erro de
compilação".

**O que deixa vermelho**: divergência nominal entre `types/erp.ts` (`export enum TipoItemSped`,
`TipoItemFiscal`, `TipoProduto`) e a seção `## 11. Catálogo de enums` de
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` — que **já lista os três, valor por valor**
(`:3491` para `TipoItemSped`, confirmado nesta rodada por leitura direta). Essa seção é o mesmo
documento canônico que `validate-backend-contract-map.mjs` já lê (`contractPath` na linha 11 do
script) — não exige acesso ao repositório do backend (`../New project 3`), que não está garantido
em toda máquina/CI.

**Por que ainda não existe**: `grep -rn "Catálogo de enums\|enum_catalog" scripts/ tests/` não
encontrou nada — nenhum gate ou teste no repositório faz essa comparação hoje. `gate-contract-fields.mjs`
faz a checagem irmã (campo do frontend que o record C# não tem) para cinco records específicos, mas
não cobre enum, e não cobre Produtos.

**Custo aproximado**: baixo — o parser precisa só de um `BACKEND_ENUM_MAP` (nome do enum → nome
TS) no mesmo formato de `BACKEND_TYPE_MAP` de `gate-contract-fields.mjs:24-35`, mais uma regex
sobre o formato já regular da seção 11 (`EnumName = Nome1 = N, Nome2 = N, ...`). Ordem de grandeza
comparável ao gate já existente — não é infraestrutura nova, é o mesmo padrão aplicado a um
segundo alvo (enum em vez de campo).

**Por que entra nesta rodada e não é gold-plating**: `TipoItemSped` é exatamente o enum que esta
fatia introduz em `types/erp.ts`. Não estou pedindo um gate para um problema hipotético — estou
pedindo o gate para o próprio campo que esta versão está criando, no mesmo padrão que os dois
enums anteriores (`TipoItemFiscal`, `TipoProduto`) já deveriam ter e não têm. Se este ERP tivesse
metade dos módulos eu ainda pediria — o custo de escrever o parser é o mesmo independente do
número de enums cobertos, e o primeiro incidente de enum renumerado sem aviso custa muito mais que
meio dia de parser.

### 5.2 Ajuste de gate, não gate novo: `LACUNA_DESTINO` precisa de asserção, não só atualização

Achado nº7 do inventário já registrou isto como risco de legibilidade ("não bloqueia o teste, só a
legibilidade"). A seção 0 deste documento mostra que o risco **já se materializou** —
`'AtualizarDadosFiscaisProdutoRequest.tipoItemSped': 'b65'` continua no mapa
(`scripts/gate-contract-request-fields.mjs:363`) mesmo depois de `tipoItemSped` ter saído de
`LACUNA_ESPERADOS_HOJE` em `b64.c2`, e nenhum teste falhou por isso. Proposta, barata (poucas
linhas em `tests/unit/gateContractRequestFields.test.ts`, no mesmo arquivo que já teste o gate):
assertar que toda chave de `LACUNA_DESTINO` corresponde a um nome hoje presente em
`LACUNA_ESPERADOS_HOJE`, ou está documentada como resolvida (lista explícita, no molde do
comentário que já existe nas linhas 96-102 do teste — "Foram removidos (preenchidos nos schemas):
..."). Classe de defeito: relatório de gate que mente sobre o estado da árvore, silenciosamente,
porque o teste automatizado só olha a lista que bloqueia, não a lista informativa. Esta fatia é o
lugar certo para fechar isso: os quatro itens que ela resolve (`unidadeTributavelSigla`, `exTipi`,
`codigoBeneficioFiscalPadrao`, `descricaoFornecedor`) mais o `tipoItemSped` já órfão são cinco
entradas que precisam sair do mapa de uma vez, e a asserção nova pega qualquer um que ficar para
trás.

**O que abro mão:** não estou pedindo um gate novo (script novo, CI novo) — é uma asserção a mais
num teste que já existe, sobre um mapa que já existe. Se o orquestrador julgar que o custo de
revisão desse teste addicional não compensa para este recorte, aceito adiar — mas registro que o
defeito que ele fecha já aconteceu uma vez nesta mesma árvore, não é hipotético.

---

## 6. Pontos de não-retorno desta camada

- **Formato do payload de `AtualizarDadosFiscaisProdutoRequest`** (substituição atômica dos dez
  campos, nunca merge parcial): se a tela for desenhada assumindo merge parcial, corrigir depois
  não é trocar uma função — é reabrir todo o fluxo de `save()`/`dadosFiscaisMutation` em
  `ProdutosPage.tsx` e qualquer teste de payload escrito sobre a suposição errada. Caro.
- **`value` do select de `unidadeTributavelSigla`** (sigla, não Id): errar aqui custa reescrever o
  binding do campo e o schema, mas é contido a um arquivo — não é uma `queryKey` que outras cinco
  telas importam. Barato, apesar de parecer estrutural à primeira vista.
- **Local do client de API** (`features/produtos/`, não um `features/fiscal` compartilhado
  prematuro): reversível — extrair depois, no segundo consumidor, é um `git mv` mais ajuste de
  import, não uma migração de dado.
- **`queryKey` sem escopo de empresa para catálogo global**: se alguém "corrigir" isso depois
  adicionando `empresaId` por engano (copiando o padrão dos outros hooks de produtos por hábito),
  o cache do catálogo nacional se fragmenta por empresa sem necessidade — dado idêntico
  duplicado N vezes no cache, sem trazer benefício, e sem quebrar nada visivelmente (não é um bug
  que aparece em tela, é desperdício de memória/rede silencioso). Vale nota de código no hook para
  quem vier depois, não gate.

---

## 7. O que eu abro mão, resumido

| Posição | O que abro mão | Sinal para trocar |
| --- | --- | --- |
| D-A: só Produto nesta fatia | Fechar o rótulo "b65" do plano de onda como está escrito | Inventário de cliente/fornecedor sair antes do `builder` começar, sem achado equivalente ao round-trip quebrado desta fatia |
| D-B: rótulo é de design, forma do dado é minha | Não arbitro o texto do label | — (não há sinal; é fronteira, não aposta) |
| D-C: guarda por campo, não por aba | Não crio um terceiro estado de tela genérico para "permissão parcial" — uso o padrão de disable pontual já existente | Se um segundo campo da mesma aba também depender de `FISCAL_CADASTROS_CONSULTAR`, vale extrair um padrão único de "campo indisponível por permissão" |
| Volume do catálogo de unidades tributáveis | Não exijo contagem real antes de aprovar — confio na forma que D52 já decidiu | Medição real (banco com migração aplicada) mostrar volume muito maior que dezena — nesse caso a paginação/`tamanhoPagina` default de 20 merece revisão |
| Gate de paridade de enum | Não implemento eu mesmo — só descrevo o parser e o custo | — (é entrega de `dev-senior-react`/`engenheiro-testes`, não minha fronteira) |
| Asserção em `LACUNA_DESTINO` | Aceito adiar se o orquestrador priorizar velocidade | Qualquer nova fatia que toque `gate-contract-request-fields.mjs` sem essa asserção deixa o relatório mentir de novo |

---

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "arquitetura",
  "assunto": "produtos-fiscais-v1.11.0a8b65",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/07-plataforma-produtos-fiscais.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "v1.11.0a8b65 entrega só Produto (5 campos já inventariados); cliente e fornecedor viram fatia própria com inventário próprio antes do builder", "reversivel": true, "gatilho": "inventário de cliente/fornecedor sair sem achado de round-trip quebrado equivalente ao desta fatia, antes do builder desta fatia começar" },
    { "id": "D-B", "titulo": "rótulo do segundo seletor é decisão de design/operação; plataforma só trava que o value do select seja a sigla (string), nunca o Id resolvido no cliente", "reversivel": true, "gatilho": "nenhum — é fronteira de contrato, não aposta de desenho" },
    { "id": "D-C", "titulo": "replica o padrão de useEnderecoFiscalCatalogos.ts (enabled + aviso) mas escopado ao campo unidadeTributavelSigla, não à aba fiscal inteira — para não reclassificar accessRisk de NENHUM para CAPACIDADE", "reversivel": true, "gatilho": "segundo campo da mesma aba passar a depender de FISCAL_CADASTROS_CONSULTAR, aí vale um padrão único de bloqueio por permissão parcial" }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "estrutural", "pergunta": "Vale adicionar ao gateContractRequestFields.test.ts uma asserção de que toda chave de LACUNA_DESTINO (scripts/gate-contract-request-fields.mjs) corresponde a um item hoje presente em LACUNA_ESPERADOS_HOJE ou está documentada como resolvida?", "decide": "se entra nesta fatia (o defeito já se materializou com a entrada órfã de tipoItemSped) ou fica para depois" },
    { "tipo": "estrutural", "pergunta": "Vale um gate de paridade nominal entre enums espelhados (types/erp.ts) e a seção 'Catálogo de enums' de docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md, cobrindo TipoItemSped (novo nesta fatia) e retroativamente TipoItemFiscal/TipoProduto?", "decide": "se entra nesta fatia ou numa fatia estrutural própria, dado que o custo é baixo e comparável ao gate-contract-fields.mjs já existente" }
  ],
  "riscos": [
    "LACUNA_DESTINO em scripts/gate-contract-request-fields.mjs já contém uma entrada órfã ('tipoItemSped': 'b65') desde a b64.c2, sem nenhum teste acusar — evidência de que o mapa informativo já diverge da árvore real, achado nº7 do inventário materializado antes mesmo desta fatia começar.",
    "Nenhum gate hoje compara enum espelhado (types/erp.ts) contra o backend — TipoItemFiscal e TipoProduto já correm esse risco, e TipoItemSped o herda ao entrar nesta fatia; enum sem JsonStringEnumConverter trafega como número, então divergência de valor não quebra tipo nenhum em TypeScript.",
    "Volume real de GET /api/fiscal/cadastros/unidades-tributaveis não medido — banco de dev sem migração aplicada; a decisão de busca no servidor com debounce segue D52 por precedente de classe, não por contagem.",
    "Se o guard de FISCAL_CADASTROS_CONSULTAR for aplicado à aba fiscal inteira em vez de só ao campo unidadeTributavelSigla, a fatia reclassifica accessRisk de NENHUM para CAPACIDADE sem ninguém ter decidido isso — nove campos hoje editáveis com PRODUTOS_DADOS_FISCAIS_GERENCIAR perderiam edição para quem não tem a segunda permissão."
  ]
}
```
