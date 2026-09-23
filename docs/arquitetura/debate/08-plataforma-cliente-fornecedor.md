# Rodada 08 — `arquiteto-plataforma-frontend` · cliente-fornecedor-comercial

Viés declarado: ano cinco. A pergunta não é "isso funciona", é "quanto custa mudar isso quando
houver quarenta módulos". Seis decisões (D-A a D-F), cada uma com o que abro mão.

## 0. O ponto de não-retorno desta rodada não está nas seis perguntas — está no fato 2

Antes de entrar em D-A–D-F: o inventário já nomeia o risco central (fato 2, "os dois `PUT`
substituem o bloco inteiro... `null` apaga o vínculo atual"), mas não descreve **o mecanismo
concreto** pelo qual um campo esquecido no formulário vira apagamento em produção. Vale nomear,
porque é o eixo mais caro deste frontend (contrato sem erro de compilação) e porque a mitigação é
de plataforma, não de tela.

**O mecanismo:** `sanitizePayload` (`lib/http/requestUtils.ts:66,87-89`) só remove do JSON as
chaves cujo valor é `undefined` ou `''` — `shouldOmitValue = (value) => value === undefined ||
value === ''`. Um `null` explícito **sobrevive** (`:92-94`, tratamento específico para campo Guid)
e um `false` booleano também sobrevive (não está na lista de valores omitidos). Ou seja: a
ferramenta já está correta para o caso "usuário limpou o campo de propósito" (`null` grava
"limpar"). O buraco é o caso "o campo nunca foi escrito no estado do formulário" — aí o valor é
`undefined`, a chave desaparece do payload, e do lado do C#, um construtor de record posicional
sem `[JsonRequired]`/`required` aceita a ausência da propriedade e usa o `default` do tipo: `null`
para `Guid?`/`int?` (efeito idêntico a "apagar", coerente com o fato 2), mas **`false`** para
`bool PermiteVendaAPrazo`, que é não-anulável. Isto é fato de linguagem (System.Text.Json com
record posicional), não medição contra o backend rodando — registro como tal.

**Consequência prática:** se o formulário de configuração comercial do Cliente nascer de um
`buildInitialValues` incompleto (o mesmo padrão que `ClienteFormDialog.tsx:20-23` já usa hoje,
mas para só 2 campos), e o operador nunca tocar o campo `permiteVendaAPrazo` porque o valor
inicial não foi hidratado a partir do registro, o PUT sai sem a chave, e o backend grava `false` —
**revertendo silenciosamente um cliente que tinha "permite venda a prazo = true" para false**, sem
erro de validação, sem 400, sem log de negócio. É exatamente a classe de defeito que a missão
desta função existe para prevenir, e é pior que "apaga um Id de catálogo": aqui não há Id nenhum
sendo apagado, há um booleano de negócio sendo invertido.

**Mitigação, barata e de plataforma (não depende da decisão de layout de D-A):**

1. No schema Zod, os cinco campos de `configurarComercialClienteSchema` (e os três de
   `configurarCompraFornecedorSchema`) usam `.nullable()`, nunca `.optional()`, para os três
   Ids de catálogo e para `diaVencimentoPreferencial`; `permiteVendaAPrazo` é `z.boolean()` **sem**
   `.optional()`/`.default()`. Isso faz `schema.parse()` **lançar** se qualquer chave estiver
   ausente do objeto de entrada — transforma "campo esquecido" de silêncio em produção para erro
   de parse em desenvolvimento/teste, antes de qualquer chamada de rede.
2. `buildInitialValues(record)` do novo diálogo/aba lê os cinco campos direto do `ClienteResponse`
   (que já os têm — divergência 1 do inventário confirma que o backend já devolve todos, só o tipo
   frontend não declara) com fallback explícito (`?? null`, `?? false`), nunca deixa a chave de
   fora do objeto inicial — mesmo padrão que `ClienteFormDialog.tsx:20-23` já usa para os campos
   que hoje edita.
3. Prova durável, barata: um teste unitário (poucas linhas, no molde dos que já existem em
   `tests/unit/`) que faz `configurarComercialClienteSchema.parse({})` e espera `throw`, e
   `configurarComercialClienteSchema.parse({ tabelaPrecoPadraoId: null, condicaoPagamentoPadraoId:
   null, classificacaoId: null, diaVencimentoPreferencial: null, permiteVendaAPrazo: false })` e
   espera sucesso — a segunda prova que "tudo em branco" é uma chamada válida (fato confirmado no
   inventário §2), a primeira prova que "chave ausente" nunca é.

Volto a isto na seção de gates (§7), porque **isto não é coberto pelo
`scripts/gate-contract-request-fields.mjs` existente** — conferido por leitura do script
(`extractZodSchemaFields`, `:137-193`): ele extrai só os **nomes** de chave presentes no texto do
schema, nunca se a chave é `.optional()` ou `.nullable()`, nem o comportamento em runtime quando o
valor é `undefined`. O gate hoje prova "a chave existe no arquivo do schema"; não prova "a chave
sempre chega com valor no payload". São defeitos de classes diferentes e o gate atual só fecha um
dos dois.

---

## 1. D-A — estrutura de tela

**Posição: não arbitro aba-vs-diálogo (é operação/design). O não-negociável de plataforma é o §0:
qualquer estrutura escolhida precisa fazer o formulário nascer sempre do valor gravado e reenviar
o bloco inteiro — a forma visual não muda essa obrigação.**

Um ponto concreto que pesa na escolha, mas não decide por mim: nenhum dos dois diálogos tem abas
hoje (inventário §4), e o precedente mais próximo — a aba fiscal do `ProdutoFormDialog` na `b65`
— já existia antes do campo entrar. Criar a primeira aba de um diálogo é uma decisão de forma de
tela cara de reverter *se* o padrão pegar (dez telas que copiam "aba" versus dez que copiam
"diálogo próprio" custam o mesmo para desfazer depois — nenhuma das duas é mais barata
estruturalmente, porque nenhuma cria `queryKey` nova nem payload novo). Isso é **intuição, não
medição** — não tenho como medir "quantos módulos vão copiar este diálogo" antes de a decisão ser
tomada.

**O que abro mão:** o layout inteiro. Não tenho posição sobre aba vs. diálogo — ambos custam o
mesmo em cache/contrato porque nenhum muda `queryKey` nem payload. Sinal para eu voltar a opinar:
se a escolha implicar payload parcial (salvar campo a campo em vez do bloco inteiro), aí deixa de
ser layout e vira violação de contrato — nesse caso escalo.

---

## 2. D-B — homologação como ação de linha

**Posição: sim, replica bloquear/desbloquear crédito — e a invalidação já está pronta, sem
desenho novo de cache.**

`FornecedorResponse.Homologado` já é campo da resposta de listagem (`FornecedorResponse.cs:97`,
confirmado no inventário §1) — a UI não precisa de uma segunda chamada para saber o estado atual
por linha, só precisa parar de descartar o campo (divergência 2 do inventário: o tipo frontend tem
7 campos contra 11 do C#).

A parte de cache está resolvida pelo padrão já em produção: `useFornecedorMutations`
(`features/fornecedores/hooks/useFornecedoresResources.ts:18-19`) já tem `invalidate = () =>
queryClient.invalidateQueries({ queryKey: ['fornecedores'] })`, chamado em `onSuccess` de
`saveMutation`/`inativarMutation`. Adicionar `homologarMutation`/`revogarMutation` ao mesmo hook,
com o mesmo `onSuccess: invalidate`, é suficiente — **não é preciso desenhar `queryKey` nova**: o
prefixo `['fornecedores']` já invalida qualquer `query` (`fornecedoresQueryKey(query)` é
`['fornecedores', query]`), então a listagem refaz o fetch e `homologado` chega atualizado na
mesma volta. Isto é barato porque reusa exatamente o mecanismo que `bloquear`/`desbloquear`
crédito já provam em `ClientesPage`, e não cria superfície de cache nova.

**O que abro mão:** nada digno de nota aqui — é o caso mais barato da rodada, sem trade-off real.

---

## 3. D-C — `situacao-compra`

**Posição: fica fora desta entrega. Não por causa do parâmetro sem tela (fato 5, que é achado de
produto, não de plataforma) — por causa de volume e N+1, que é meu eixo.**

`GET .../{id}/situacao-compra` é por fornecedor, sem variante de lista (inventário §1: não existe
`GET /api/fornecedores/situacao-compra` em lote). Se a listagem de Fornecedores ganhar uma coluna
"pode receber pedido de compra", a única forma de preenchê-la é uma chamada por linha — N
requisições HTTP para uma tela de N fornecedores, o exato padrão que este manual pede para
verificar ("volume esperado, se alguém souber"). Não medido — o banco de dev não tem migração
aplicada (mesma limitação que o próprio inventário registra na abertura). **Isto é intuição, não
medição**: não sei se a base real de fornecedores tem dez ou dez mil linhas. Mas a forma do dado
não depende do número exato aqui — depende de existir ou não um endpoint de lote, e não existe.
Diferente do padrão que `D52` já resolveu para catálogos (buscar no servidor em vez de carregar
tudo), aqui o problema não é "carregar demais", é "multiplicar chamadas por linha visível", que
nenhuma paginação resolve sozinha — mesmo dez linhas por página viram dez requisições extras a
cada troca de página.

Se a operação (ou o design) quiser mostrar "por que este fornecedor está bloqueado para compra",
a forma que não paga o custo de N+1 é sob demanda: um botão/ícone por linha que abre a leitura
**só quando clicado**, nunca no `body` da coluna que renderiza para todas as linhas visíveis de
uma vez. Nesse desenho, o `queryKey` é `['fornecedores', 'situacao-compra', fornecedorId]`
(escopado por linha, não por `query` de lista), com `enabled: false` até o clique, e precisa ser
invalidado no mesmo `invalidate()` de D-B — senão um fornecedor recém-homologado continua
mostrando "não pode receber pedido" em cache até expirar. Registro a forma correta para quando o
gatilho aparecer; não recomendo implementá-la nesta entrega.

**O que abro mão:** não exijo que a leitura fique banida para sempre — só que **não entre agora**,
e que **nunca entre como coluna de lista carregada em bloco**. Sinal para trocar de posição: (1)
existir demanda de produto por essa informação na tela de listagem — decisão de operação, não
minha; e nesse caso o desenho correto é sob demanda por linha, nunca coluna; (2) o backend
publicar uma variante em lote do endpoint — aí a forma muda de "N chamadas" para "uma chamada",
e o cálculo de custo muda inteiro.

---

## 4. D-D — `classificacaoId`

**Posição: entra com seletor por busca (`SearchSelect`), reusando exatamente o padrão que D52/D60
já pagaram — a ausência de tela de CRUD não é motivo para adiar o campo, porque o endpoint de
leitura já suporta busca por `termo`.**

Conferido em `../New project 3/src/Erp.Api/Controllers/Pessoas/ClassificacoesPessoaController.cs:22-24`:
`GET` recebe `empresaId` (obrigatório) e `termo` (opcional) — é o mesmo contrato de busca
server-side que `NCM`/`CFOP`/`CEST`/município já usam (D52) e que `unidadeTributavelSigla` acabou
de reusar na rodada anterior (D60). Não é um catálogo sem forma conhecida; é o quarto caso do
mesmo padrão. Diferença importante em relação a `unidadeTributavelSigla`: aquele catálogo é
nacional (`queryKey` sem escopo de empresa, D60 explícita nisso); este é **por empresa**
(`empresaId` obrigatório na assinatura do controller) — a `queryKey` do novo hook precisa levar
`empresaId`, ao contrário do precedente de unidade tributável. Errar isso (copiar a chave nacional
por hábito) faria o seletor de Classificação de uma empresa mostrar opções de outra em cache
compartilhado — silencioso, sem erro, a mesma classe de defeito que o inventário chama de "eixo
mais caro".

**Onde mora o hook:** `features/pessoas/hooks/`, não `features/clientes/`. A diferença para o
precedente D60 (que colocou o hook de unidade tributável em `features/produtos/`, "pertence a quem
consome primeiro") é que aqui **já existe** um módulo dono natural em produção —
`features/pessoas/` já é importado por `ClientesPage.tsx` (`usePessoas`, linha de import
confirmada) para resolver `pessoaId`. `/api/pessoas/classificacoes` é, pelo nome da rota e pelo
controller, dado do domínio Pessoa, não um acessório do Cliente. Diferente do caso de unidade
tributável (onde não havia nenhum "features/fiscal" natural para um catálogo cross-cutting), aqui
colocar em `features/clientes/` seria o mesmo erro que o D60 evitou na direção oposta: dado que
pertence a um domínio já estabelecido, morando fora dele.

**O cadastro (CRUD) de Classificação de Pessoa não entra.** É outra fatia — o endpoint de leitura
resolve o seletor; criar/editar/inativar classificação é feature própria, sem gatilho nesta
rodada além de "alguém pedir".

**O que abro mão:** não exijo medição de volume real do catálogo de classificações antes de
aprovar — mesmo raciocínio da rodada anterior (D52 decide a forma, não o número). Sinal para
trocar: se `termo` na prática nunca filtrar nada porque a base real tem menos de dez
classificações por empresa, um `Dropdown` fechado seria mais simples — troca reversível e barata.

---

## 5. D-E — permissão dos catálogos referenciados

**Posição: replica D61 ao pé da letra — guarda por campo (o select do catálogo), nunca pelo bloco
inteiro do formulário.**

O argumento é idêntico ao da rodada anterior, só trocando os nomes: a "aba"/"bloco" de
configuração comercial do Cliente edita cinco campos, dos quais só três dependem de permissão de
catálogo (`tabelaPrecoPadraoId` → `TABELAS_PRECO_CONSULTAR`; `condicaoPagamentoPadraoId` →
`FINANCEIRO_CONSULTAR`; `classificacaoId` → `PESSOAS_CONSULTAR`). `diaVencimentoPreferencial`
(número) e `permiteVendaAPrazo` (booleano) não dependem de catálogo nenhum. No Fornecedor, dos
três campos só `condicaoPagamentoPadraoId` depende de `FINANCEIRO_CONSULTAR`;
`prazoEntregaMedio` e `categoriaFornecimento` não. Se o guard for aplicado ao bloco/aba inteira em
vez de aos três (Cliente) / um (Fornecedor) selects, um operador com `CLIENTES_GERENCIAR` mas sem
as três permissões de catálogo perde a edição de `diaVencimentoPreferencial` e
`permiteVendaAPrazo` — campos que não dependem de catálogo nenhum. Isso reclassifica `accessRisk`
de `NENHUM` para `CAPACIDADE` sem ninguém ter decidido isso, exatamente o argumento que já travou
D61 (`DECISOES.md:1775-1784`). Não é achado novo — é o mesmo achado, reaplicado ao próximo módulo
que toca o mesmo formato de catálogo condicionalmente permissionado. A skill desta função pede
"traga precedente do próprio repositório" — D61 é esse precedente, textual.

Diferença de forma em relação a D61: lá era um campo só (`unidadeTributavelSigla`); aqui são até
três campos no mesmo formulário (Cliente) com a mesma permissão condicional cada um — não muda o
princípio, muda só a contagem de `disabled`/`emptyMessage` a replicar.

**O que abro mão:** não crio um componente novo de "campo bloqueado por permissão parcial" — reuso
o padrão de `disabled` + `Message severity="warn"` já em produção (`useEnderecoFiscalCatalogos.ts`,
`EnderecoFiscalFormSection.tsx:295`). Sinal para extrair um componente único: quando um quarto
consumidor do mesmo padrão aparecer nesta mesma fatia ou na próxima (regra de três casos, D60) — a
ausência de um `PermissionGatedSelect` genérico hoje não é lacuna, é disciplina de "componente
compartilhado antes de existirem três casos" que a própria skill do design-system usa como limite.

---

## 6. D-F — fatiamento e número

**Posição: duas versões, não uma — mesma doutrina da D58, aplicada ao próprio recorte que a D58
gerou.**

A D58 já decidiu esta classe de pergunta uma vez, para o par Produto/Cliente-Fornecedor: "não
empacotar unidades de entrega independentes sob o mesmo rótulo de calendário" — e o argumento era
que nenhum dos dois lados tinha dependência de dado, payload, permissão ou cache com o outro. O
mesmo teste, aplicado agora dentro do próprio Cliente/Fornecedor: **Cliente** (`PUT
.../configuracao-comercial`, substituição atômica sem ação de estado, sem leitura derivada) e
**Fornecedor** (`PUT .../configuracao-compra` + duas ações de estado mutuamente exclusivas +
`situacao-compra` opcional com risco de N+1 se mal desenhada) têm **perfis de risco desiguais**:
o pior caso do lado Fornecedor (D-C, N+1 se alguém decidir expor a coluna) não existe do lado
Cliente. Empacotar os dois numa única versão faz o risco maior do Fornecedor segurar a entrega do
Cliente, que não tem esse problema — o mesmo argumento de custo que já pagou a D58 (`"Ship os três
juntos: ... Se o inventário de cliente/fornecedor achar algo do porte do achado nº1, a fatia
inteira atrasa por um módulo que nem precisava estar nela"`, rodada 07 §1). Aqui o inventário já
saiu (ao contrário da `b65`, onde a D58 adiava por falta dele) — mas o "achado nº1" equivalente
já apareceu: é o §0 deste documento (risco de payload silenciosamente incompleto), que se aplica
igual aos dois módulos e não é motivo para atrasar nenhum dos dois; o desbalanceamento de risco
real é D-C, específico de Fornecedor.

Onde entram na sequência: o plano já reserva `b66` para Estoque
(`docs/PLANO-FRONTEND-ONDA-OPERACAO.md:124`). Não é meu papel travar o número exato — isso é
`arquiteto-escopo-entrega` — mas registro que a mesma doutrina da D58 ("decidir o número antes do
conteúdo é o mesmo erro que a D56 já puniu") vale aqui: melhor inserir depois de `b66` com
inventário e recorte já escritos (este documento e os dos outros três arquitetos) do que reservar
`b67`/`b68` para os dois hoje e descobrir depois que um dos dois cresceu.

**O que abro mão:** o número exato e a ordem entre Cliente e Fornecedor — ambos são decisão de
escopo/calendário, não de plataforma. Sinal para eu revisitar: se qualquer arquiteto encontrar
dependência de dado real entre os dois (não vi nenhuma no inventário — os dois `PUT` não se
referenciam, não compartilham `queryKey`, cada um só invalida o próprio prefixo), a separação em
duas versões deixa de fazer sentido e a bundle volta à mesa.

---

## 7. Gates — o que falta, o que fecha, o custo

### 7.1 Extensão do gate existente: os dois `PUT` de substituição atômica entram no universo do
    `gate-contract-request-fields.mjs`

**Classe de defeito que fecha:** campo do backend não-anulável que o schema Zod não declara
(`DEFAULT_SILENCIOSO` — "backend grava o default", a categoria que já existe no script,
`gate-contract-request-fields.mjs:255-262`) e campo enviado pelo frontend que o record C# não tem
(`DESCARTE`). É a mesma classe que motivou o gate para Produto/Estoque/Administração/Segurança/RH
— hoje **zero** records de Cliente/Fornecedor estão cobertos (inventário §7, confirmado por
`grep -n "cliente\|fornecedor" scripts/gate-contract-request-fields.mjs` só encontrar as duas
entradas de vínculo Produto→Fornecedor).

**O que deixa vermelho:** um campo novo em `ConfigurarComercialClienteRequest`/
`ConfigurarCompraFornecedorRequest` que o backend adiciona e o schema Zod não acompanha (LACUNA);
ou um campo que o schema envia e o backend removeu (DESCARTE) — o mesmo par de riscos que o gate
já prova para Produto.

**Custo aproximado:** baixo — o documento-fonte do gate (`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`)
já tem as três assinaturas prontas no formato que `loadRequestContractFromDocument` já sabe
parsear (inventário §7, linhas `:3030`, `:3038`, `:3041`). Falta: os dois schemas Zod novos
(`features/clientes/schemas/clientesSchemas.ts`, `features/fornecedores/schemas/fornecedoresSchemas.ts`)
e duas entradas em `SCHEMA_TO_REQUEST_MAP`/`recordNames`. Ordem de grandeza igual à extensão que
`produtos` já recebeu nesta mesma árvore — não é gate novo, é o mesmo padrão aplicado a dois
records a mais.

**Por que entra nesta entrega e não é gold-plating:** os dois schemas são criados **por** esta
entrega — não estou pedindo cobertura para código legado, estou pedindo que o código novo nasça
dentro do gate que já existe, no mesmo instante em que a lacuna que ele fecha (campo sem par)
passa a ser possível de existir. Se este ERP tivesse metade dos módulos eu pediria o mesmo: o
custo de adicionar a entrada no mapa no dia em que o schema nasce é uma linha; adicionar depois,
quando ninguém mais lembra da assinatura exata do record, é arqueologia.

`RevogarHomologacaoFornecedorRequest` (só `motivo`) **não** entra no mesmo gate — é a mesma forma
de `clienteMotivoSchema`/`fornecedorMotivoSchema`, que já existem hoje e o gate já optou por não
cobrir (divergência 9 do inventário: "o gate cobre hoje só os oito records... nenhum destes três
tinha schema Zod correspondente"). Não vejo motivo para tratar este terceiro record diferente dos
dois que já ficaram de fora por serem a mesma forma.

### 7.2 Gate que o `gate-contract-request-fields.mjs` **não** fecha, e que esta entrega precisa de
    prova própria: payload com chave ausente em runtime

Descrito em detalhe no §0. Resumo: o gate estático prova "a chave existe no texto do schema"; não
prova "o valor chega no payload". A prova que fecha essa classe é um teste unitário pequeno, por
schema novo — `parse({})` lança, `parse({ ...todos nulos/false })` não lança — não um script novo,
não infraestrutura nova. Custo: poucas linhas por schema, no mesmo arquivo de teste onde os
schemas de Cliente/Fornecedor já seriam testados de qualquer forma.

**Por que entra nesta entrega:** porque é o próprio §0 desta rodada — o risco não é hipotético,
é a consequência direta e já demonstrada (leitura de `sanitizePayload`) de como este código
concreto se comporta com um campo esquecido, para os dois records exatos que esta entrega cria.

### 7.3 Não recomendo gate novo para `situacao-compra`/N+1

D-C decide não incluir o endpoint nesta entrega — não há código para um gate proteger ainda.
Registrado como pendência para quando (e se) a leitura entrar: a forma correta (§3) já evita o
problema por desenho, então o gate, se algum dia for necessário, seria um teste de que a coluna de
listagem nunca dispara uma query por linha — não prioritário agora.

---

## 8. Achado adjacente, fora do recorte desta rodada mas do mesmo eixo (volume)

`ClientesPage.tsx`/`FornecedoresPage.tsx` **já** carregam a lista inteira do backend e paginam +
filtram no cliente hoje — confirmado por leitura direta: `clientesApi.listar`
(`features/clientes/api/clientesApi.ts:16,24-29`) não envia `page`/`pageSize` nos `params`
(`cleanQueryParams({ empresaId, filialId, termo })`, sem paginação); `ClientesPage.tsx:52-53`
faz `records.slice(first, first + rows)` sobre o array completo e `filterLocal` roda `.filter()`
em memória (linhas 30-34). Isso é **pré-existente**, não criado por esta rodada, e não bloqueia
D-A a D-F — mas registro porque é exatamente o eixo 2 da minha função ("módulo que no legado tem
centenas de milhares de linhas não pode virar `DataTable` carregado inteiro") e porque D-B
adiciona uma coluna/indicador (`homologado`) e duas ações por linha ao mesmo componente: nenhuma
das duas piora o problema (o campo já vem no mesmo payload da listagem, não é chamada nova), mas
se a base real de clientes/fornecedores crescer, o problema de volume vai estourar aqui primeiro,
não em D-C. **Isto é intuição, não medição** — não sei o volume real (banco de dev sem migração
aplicada). Não recomendo gate para isso agora — não é regressão desta entrega, é dívida anterior
que nenhuma das seis decisões piora.

---

## 9. O que eu abro mão, resumido

| Posição | O que abro mão | Sinal para trocar |
| --- | --- | --- |
| D-A: não arbitro aba vs. diálogo | Layout inteiro — nenhum dos dois muda `queryKey` nem payload | Se a escolha implicar salvar campo a campo em vez do bloco inteiro (aí vira violação de contrato, não layout) |
| D-B: reuso do padrão bloquear/desbloquear | Não desenho `queryKey` nova — a invalidação de prefixo já existente basta | — (não há aposta aqui, é o caso mais barato da rodada) |
| D-C: fora desta entrega | Não exijo banimento permanente — só que não entre como coluna de lista carregada em bloco | Demanda de produto pela leitura (decisão de operação) ou endpoint em lote publicado pelo backend |
| D-D: seletor por busca sem exigir CRUD como pré-requisito | Não exijo contagem real do catálogo antes de aprovar a forma (busca vs. combo fechado) | Volume real menor que uma dezena por empresa — aí um `Dropdown` fechado é mais simples e a troca é barata |
| D-E: guarda por campo, não por bloco | Não crio componente genérico de "campo bloqueado por permissão parcial" nesta entrega | Quarto consumidor do mesmo padrão nesta mesma fatia ou na seguinte (regra de três casos) |
| D-F: duas versões | Número exato e ordem entre Cliente/Fornecedor — decisão de escopo/calendário | Dependência de dado real encontrada entre os dois módulos (não vista nesta leitura) |
| Gate 7.1 (extensão do `gate-contract-request-fields.mjs`) | Não escrevo eu mesmo — descrevo o custo e o formato pronto no documento-fonte | — (entrega de `dev-senior-react`/`engenheiro-testes`) |
| Gate 7.2 (teste de payload completo) | Não exijo script novo — só teste unitário pequeno, por schema | — (mesmo dono) |

---

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "arquitetura",
  "assunto": "cliente-fornecedor-comercial",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/08-plataforma-cliente-fornecedor.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Layout (aba vs. diálogo próprio) é decisão de design/operação; o não-negociável de plataforma é o formulário sempre nascer do valor gravado (buildInitialValues completo) e reenviar o bloco inteiro dos 5/3 campos, nunca payload parcial", "reversivel": true, "gatilho": "se a escolha de layout implicar salvar campo a campo em vez do bloco inteiro, deixa de ser layout e vira violação de contrato" },
    { "id": "D-B", "titulo": "Homologar/Revogar entram como ações de linha em FornecedoresPage, replicando bloquear/desbloquear crédito; a invalidação usa o invalidate() de prefixo ['fornecedores'] já existente em useFornecedorMutations, sem queryKey nova", "reversivel": true, "gatilho": "nenhum — é o caso mais barato da rodada" },
    { "id": "D-C", "titulo": "GET .../situacao-compra fica fora desta entrega; se entrar depois, é leitura sob demanda por linha (nunca coluna de lista carregada em bloco), com queryKey escopada por fornecedorId e invalidada junto com homologar/revogar", "reversivel": true, "gatilho": "demanda de produto pela leitura na listagem, ou publicação de endpoint em lote pelo backend" },
    { "id": "D-D", "titulo": "classificacaoId entra com SearchSelect (busca por termo, já suportado pelo backend), hook novo em features/pessoas/hooks/ (não em features/clientes/), queryKey escopada por empresaId (catálogo por empresa, diferente do precedente nacional de unidadeTributavelSigla); cadastro CRUD de Classificação de Pessoa fica fora, sem bloquear o seletor", "reversivel": true, "gatilho": "volume real do catálogo por empresa menor que uma dezena, tornando um Dropdown fechado mais simples" },
    { "id": "D-E", "titulo": "Guarda de TABELAS_PRECO_CONSULTAR/FINANCEIRO_CONSULTAR/PESSOAS_CONSULTAR escopada aos selects específicos (3 no Cliente, 1 no Fornecedor), nunca ao bloco/aba inteira — replica D61 para não reclassificar accessRisk de NENHUM para CAPACIDADE nos campos sem dependência de catálogo (diaVencimentoPreferencial, permiteVendaAPrazo, prazoEntregaMedio, categoriaFornecimento)", "reversivel": true, "gatilho": "quarto consumidor do mesmo padrão de campo bloqueado por permissão parcial, aí vale componente único" },
    { "id": "D-F", "titulo": "Cliente e Fornecedor entram como duas versões separadas, não uma — mesma doutrina da D58 aplicada ao par que ela gerou, por perfil de risco desigual (Fornecedor carrega o risco de N+1 de D-C, Cliente não)", "reversivel": true, "gatilho": "dependência de dado real encontrada entre os dois módulos (nenhuma vista nesta leitura: PUTs não se referenciam, queryKeys não se cruzam)" }
  ],
  "discordancias": [
    { "com": "arquiteto-escopo-entrega", "sobre": "número/ordem exato de b66+ para Cliente e Fornecedor", "posicao": "não arbitro o número, mas registro que empacotar os dois numa única versão deixa o risco de N+1 de Fornecedor (D-C) segurar a entrega de Cliente, que não tem esse risco — mesmo argumento de custo que já sustentou a D58" }
  ],
  "pendencias": [
    { "tipo": "estrutural", "pergunta": "Vale a extensão de scripts/gate-contract-request-fields.mjs (SCHEMA_TO_REQUEST_MAP + recordNames) para ConfigurarComercialClienteRequest e ConfigurarCompraFornecedorRequest nesta mesma entrega, dado que o documento-fonte já tem as assinaturas prontas para parsear?", "decide": "se entra no mesmo bNN dos schemas novos ou fica para logo depois" },
    { "tipo": "estrutural", "pergunta": "Vale o teste unitário de payload completo (parse({}) lança, parse(tudo-nulo-ou-false) não lança) para os dois schemas novos, fechando a classe de defeito que o gate estático não cobre (chave ausente em runtime, não em texto de schema)?", "decide": "se entra nesta entrega — o risco (permiteVendaAPrazo virar false silenciosamente) só existe a partir do momento em que o schema é criado" }
  ],
  "riscos": [
    "sanitizePayload (lib/http/requestUtils.ts:66,87-89) só remove chaves com valor undefined/''; um campo não-anulável (permiteVendaAPrazo) esquecido no buildInitialValues do formulário novo produz payload sem a chave, e o backend (record posicional sem JsonRequired) grava o default do tipo — false para bool — revertendo silenciosamente um valor gravado, sem 400, sem erro de compilação. Mitigação: .nullable() em vez de .optional() nos Ids, boolean sem .optional()/.default(), e buildInitialValues completo.",
    "scripts/gate-contract-request-fields.mjs só compara presença de nome de chave no texto do schema (extractZodSchemaFields), nunca se a chave é .optional() nem o comportamento em runtime com valor undefined — o gate estático não fecha o risco acima; precisa de teste unitário complementar por schema novo.",
    "GET .../situacao-compra não tem variante em lote (confirmado no inventário) — se alguém expuser a leitura como coluna de listagem de Fornecedores, é N chamadas HTTP por página renderizada, sem paginação que resolva sozinha.",
    "ClientesPage/FornecedoresPage já carregam a lista inteira do backend (clientesApi.listar sem page/pageSize) e paginam/filtram em memória (ClientesPage.tsx:52-53, filterLocal) — pré-existente, não criado por esta rodada, não piorado por D-A a D-F, mas é o mesmo eixo de volume que a função desta função cobre; volume real não medido (banco de dev sem migração aplicada).",
    "Volume real de GET /api/pessoas/classificacoes por empresa não medido — decisão de busca-server-side segue precedente de classe (D52), não contagem."
  ]
}
```
