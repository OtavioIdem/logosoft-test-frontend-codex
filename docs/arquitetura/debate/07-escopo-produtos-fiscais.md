# Debate 07 — escopo e entrega — `produtos-fiscais` (v1.11.0a8b65)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend`, `arquiteto-design-system`, mesmo briefing.

## 0. Base fixada

```text
package.json: version 1.11.0-a.8.b64.c2, logosoftVersion 1.11.0a8b64.c2
docs/fatias/ (últimos 5): ...b64-f4-empresa-filial-fiscal.md, b64.c1-gates-orfaos.md,
  b64.c2-produto-fiscal-em-branco.md, b65-inventario.md
```

`b64` fechou, `.c2` corrigiu o defeito de gravação e já está commitado (`00e8316`). Nenhuma versão
está bloqueada. `b65` é o próximo slot funcional legítimo — não corretivo.

## 1. O achado que muda a régua: o marco em jogo já não é "destravar a gravação"

O briefing desta rodada descreve `b65` como a fatia que "destrava a gravação do bloco fiscal,
hoje quebrada para qualquer criação de produto". **Isso já não é verdade nesta árvore.** Conferido
em código, não em documento:

```text
features/produtos/schemas/produtosSchemas.ts:106      tipoItemSped: optionalNumber
features/produtos/types/produtos.types.ts:77,174        tipoItemSped?: number | null
features/produtos/components/ProdutoFormDialog.tsx:64,92 lê tipoItemSped do record / null na criação
features/produtos/components/ProdutosPage.tsx:60-79      isFilled(tipoItemSped) na checagem de bloco
                                                           em branco + tipoItemSped no payload do PATCH
tests/unit/gateContractRequestFields.test.ts:105-113      LACUNA_ESPERADOS_HOJE tem 7 itens, não 8 —
                                                           tipoItemSped já não está na lista
tests/unit/gateContractRequestFields.test.ts:405-408      it explícito: "não imprime LACUNA:
                                                           ...tipoItemSped (adicionado no schema)"
```

A `.c2` já fez o round-trip de `tipoItemSped` (lê do registro, reenvia, participa do cálculo de
"bloco em branco"), exatamente como o próprio plano da `.c2` prometia
(`docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md:96-100,146-150`). O `AC-5` daquele plano
("LACUNA cai de 8 para 7") **já está cumprido** — medido no teste, não estimado.

A seção §6 do inventário de `b65` (`docs/fatias/v1.11.0a8b65-inventario.md:277-294`) descreve
`LACUNA_ESPERADOS_HOJE` com 8 itens incluindo `tipoItemSped` como item a "preencher nesta fatia".
Isso está desatualizado em relação ao arquivo que cita — o teste real, na árvore que o próprio
inventário deveria ter lido, já tem 7. Não é um erro que me cabe corrigir (não edito o inventário),
mas muda a base de quem planeja em cima dele: **quem contar "5 campos" para dimensionar `b65` está
contando um a mais.** Restam 4 campos sem nenhum destino na UI: `unidadeTributavelSigla`, `exTipi`,
`codigoBeneficioFiscalPadrao`, `descricaoFornecedor`. `tipoItemSped` já trafega — falta só um
controle de edição, tratado no item 5 abaixo.

Isso também muda a natureza da fatia. Não é mais "corrigir gravação quebrada" (severidade que
justificaria `.cN`, D56) — é "campo novo na tela", que a própria D56 já definiu como `bNN`. A
classificação `bNN` para `b65` está correta; só o dimensionamento do que falta é menor do que o
inventário registrou.

## 2. D-A — o corte entre Produto e Cliente/Fornecedor

**Posição: `b65` entrega só Produto. Cliente e Fornecedor saem, sem número reservado, até
existir inventário próprio.**

Evidência de que são unidades de entrega independentes, não uma só:

```text
Endpoints distintos:   PATCH /produtos/{id}/dados-fiscais, POST /produtos/{id}/fornecedores
                        (existem e têm inventário) x PUT /clientes/{id}/configuracao-comercial,
                        configuração de compra/homologação de fornecedor (sem inventário nenhum —
                        nem contrato C# lido, nem tela mapeada, nem permissão conferida).
Permissões distintas:  PRODUTOS_DADOS_FISCAIS_GERENCIAR, PRODUTOS_GERENCIAR (Produto) x o que quer
                        que module Cliente/Fornecedor exija — não verificado nesta rodada.
Nenhuma dependência de dado: nenhum campo de configuração comercial de cliente ou de homologação de
                        fornecedor aparece no payload, no schema ou na regra de negócio dos 4 campos
                        de Produto que restam. `grep` no inventário de `b65` não cita nenhum dos
                        dois fora do título da seção.
```

Motor sem chamador ao contrário: aqui não é "construir a peça antes de quem a usa" — é "construir
duas peças que não se tocam sob o mesmo número de versão, pagando o preço da maior para entregar a
menor". A régua (`skills/projeto/04_regua_de_fatiamento.md`) exige que toda fatia produza algo
observável com teste e documento; empacotar as três no mesmo `bNN` faria a fatia inteira esperar o
inventário de Cliente e o de Fornecedor — nenhum dos dois existe — para entregar os 4 campos de
Produto que **já têm inventário fechado e prova durável esperando** (`gateContractRequestFields`
já sabe contar de 7 para 3).

**Onde entra Cliente/Fornecedor:** não numero aqui. `docs/PLANO-FRONTEND-ONDA-OPERACAO.md` já
reservou `b66`–`b69` para Estoque, Venda/preço, Compra/financeiro e Faturamento, com conteúdo
descrito por outras rodadas — renumerar essa cauda para encaixar Cliente/Fornecedor no meio é
decisão de quem mantém o plano da onda, não algo que eu resolvo de lado num documento de debate.
Recomendo que a próxima rodada que tocar o plano da onda registre isso explicitamente — D56 já
puniu deixar sequência "só na conversa" (`docs/arquitetura/DECISOES.md:1589-1591`, custo medido em
`docs/fatias/README.md`). Até lá, Cliente/Fornecedor fica **fora, com gatilho de volta**: inventário
do `inventariante-contrato-tela` sobre os dois recortes.

**Custo de decidir assim (declarado, não escondido):** produto, cliente e fornecedor formam um
conjunto que o plano chamou de "cadastros mestres" — há uma leitura de operação em que as três
peças "fecham" juntas o mesmo tipo de cadastro. Se o `arquiteto-operacao-erp` tiver evidência
concreta de um fluxo do operador que trava sem a configuração comercial de cliente (por exemplo,
alguma venda ou aprovação que dependa dela), esse é um pré-requisito real e minha posição muda —
mas essa evidência não está em nenhum dos documentos desta rodada, e eu não a inventei. Ver
"Como discordar" abaixo.

## 3. D-B — rótulo do segundo seletor, sem redesenho

**Posição: dentro, mas só como texto. Sem novo agrupamento visual, sem novo componente.**

Hoje `ProdutoFormDialog.tsx:273-275` rotula `unidadeMedidaTributavelId` como "Unidade tributável"
puro. Introduzir `unidadeTributavelSigla` sob o mesmo nome cria dois campos com o mesmo rótulo
visível na mesma aba — isso não é conforto, é um campo que o operador vai preencher errado por
ambiguidade de nome, o que é pré-requisito de qualidade de dado fiscal, não estética.

Corte proposto: resolver só com texto, sem tocar em `FormGrid`/layout:

```text
unidadeMedidaTributavelId (já existe)  → rótulo passa a "Unidade tributável (unidade interna)"
                                          ou equivalente que amarre ao Mód.03
unidadeTributavelSigla (novo)          → rótulo "Unidade tributável (sigla oficial)" ou
                                          "uTrib (tabela oficial)", com hint "usada na NF-e"
```

Isso cabe no orçamento: é troca de string em dois `label`, mais um `small`/hint, no mesmo
`FormGrid` que já existe. Não decido a palavra exata — isso é território do
`arquiteto-design-system` (rótulo e microcópia são dele por padrão do template); decido que o
corte fica em nível de texto e não de estrutura, e que ele não pode ficar como "ninguém decidiu" —
esse é o tipo de ambiguidade que já custou confusão real (§2 do inventário registra a armadilha).

**Custo do corte:** se o par de rótulos ficar ruim mesmo com hint (por exemplo, dois campos que
ainda parecem sinônimos num formulário denso), o próximo passo é agrupamento visual — reversível,
fica para uma rodada de design se o texto sozinho não resolver.

## 4. D-C — permissão dupla para o catálogo de `unidadeTributavelSigla`

**Posição: dentro, sem negociação. Não é feature nova, é o mesmo padrão já pago em `b64`.**

`GET /api/fiscal/cadastros/unidades-tributaveis` exige `FISCAL_CADASTROS_CONSULTAR`
(`CadastrosFiscaisController.cs:152`, confirmado no inventário §5). O precedente já existe pronto
para copiar: `features/administracao/hooks/useEnderecoFiscalCatalogos.ts:10` fixa a mesma
permissão com `enabled: permitido`, e `EnderecoFiscalFormSection.tsx:212,295` já tem o texto de
aviso quando falta. Custo de replicar: uma função de hook (ou extensão da existente) mais uma
string de aviso — não é arquitetura nova, é aplicar um padrão que a `b64` já pagou.

Cortar isso não economizaria nada real: sem o guard, um operador com
`PRODUTOS_DADOS_FISCAIS_GERENCIAR` mas sem `FISCAL_CADASTROS_CONSULTAR` vê um autocomplete que
nunca resolve nada, sem explicação — isso é `accessRisk: ilusão de clicar`
(`.claude/graph/risk.yaml`), a classe mais barata de evitar e mais cara de deixar acontecer (vira
chamado de suporte, não bug de código). Não é corte disponível.

## 5. O item que ninguém pediu nesta rodada, mas que fecha o recorte: `tipoItemSped` como campo editável

Não estava nas três perguntas do briefing, mas nasce da correção do achado do item 1: a `.c2`
deixou `tipoItemSped` **trafegando** (não perde valor, não quebra o PATCH) mas **não editável** —
o comentário em `ProdutosPage.tsx:74` é explícito: *"Só trafega — o operador não edita
`tipoItemSped` nesta tela (b65)"*. Ou seja: hoje, e sem uma decisão explícita nesta rodada, **nenhum
produto no sistema jamais ganha uma classificação SPED por meio da tela** — só chegaria lá por
carga direta de banco, que não é caminho de produção.

Isso não é conforto: é o único dos cinco campos originais do recorte (`docs/fatias/v1.11.0a8b58.c3
-contratos-de-request.md:316-320`) que, sem controle de UI, fica permanentemente inacessível ao
operador — os outros quatro têm inputs de texto/autocomplete simples; este é o que fecha uma
capacidade que hoje não existe de nenhuma forma.

**Posição: dentro.** Custo é baixo porque o padrão já existe lado a lado: `tipoItemFiscal`
(`ProdutoFormDialog.tsx:268-270`) é um dropdown de enum quase idêntico em forma — 8ish valores
fixos, sem catálogo, sem chamada de rede. `TipoItemSped` são 12 valores (`0`–`10`, `99`), mesma
forma. Falta: registrar o enum em `types/erp.ts` (hoje ausente, achado nº3 do inventário), um mapa
de rótulo (`produtosLabels.ts`, seguindo o padrão de `tipoProdutoLabel`), e o `Dropdown` na aba. Não
precisa de endpoint novo, não precisa de permissão nova (já é `PRODUTOS_DADOS_FISCAIS_GERENCIAR`).

Isso reabre uma escolha que o código da `.c2` já fez silenciosamente (deixar de fora). Não é uma
decisão travada em `DECISOES.md` — é comentário de implementação. Registro aqui para que o
orquestrador confirme ou vete antes da execução; não trato como consenso só porque está no código.

## 6. A linha de corte

### Dentro de `b65`

```text
1. unidadeTributavelSigla — autocomplete contra GET /fiscal/cadastros/unidades-tributaveis,
   com guarda de FISCAL_CADASTROS_CONSULTAR (D-C) e rótulo desambiguado (D-B).
2. exTipi — campo de texto, com nota "vazio = herda do NCM" (comportamento do backend, §1 do
   inventário).
3. codigoBeneficioFiscalPadrao — campo de texto.
4. descricaoFornecedor — campo de texto no ProdutoFornecedorDialog (hoje sem estado nem input).
5. tipoItemSped — dropdown de 12 valores, enum novo em types/erp.ts, rótulo em produtosLabels.ts
   (item 5 acima). Fecha o recorte original dos 5 campos do b58.c3.
6. Zod: limites de tamanho dos 4 campos de texto (6/3/10/200, conferidos no inventário §1) —
   é validação de contrato de request, não é feature extra.
7. Manutenção do LACUNA_DESTINO em scripts/gate-contract-request-fields.mjs (mapa auxiliar do
   relatório humano do gate) — atualizar junto com o schema, senão o relatório imprime "?" como
   destino (risco nº7 do inventário). Não bloqueia o teste; bloqueia a legibilidade de quem lê o
   gate depois.
8. Mensagem de erro do PATCH: mapear o 400 de FISCAL_CADASTROS_TIPO_ITEM_SPED_OBRIGATORIO (e
   equivalentes dos 4 campos novos) para texto legível — os sete estados de tela são piso, e "erro
   recuperável"/"ação indisponível com motivo" já têm padrão parcial no módulo (toast distinto de
   `ProdutosPage.tsx:138-139`); estender esse padrão aos 4 campos novos não é extra, é manter o
   piso que já existe.
```

### Fora (não entra nesta fatia; gatilho de volta declarado)

```text
1. PUT /api/clientes/{id}/configuracao-comercial — fora. Gatilho: inventário do
   inventariante-contrato-tela sobre Cliente. Reversível: sim — nenhum contrato, cache ou
   permissão desta fatia depende disso.
2. Configuração de compra e homologação/revogação de fornecedor — fora. Mesmo gatilho e mesma
   reversibilidade, para o recorte de Fornecedor.
3. unidadeTributavelOficialId e generoItem (campos só de resposta, derivados) — fora. Gatilho:
   pedido de exibição (auditoria/consulta) — não têm request equivalente, não fazem parte do
   recorte de contrato desta fatia. Reversível: sim, são leitura adicional pura.
4. Validação client-side proativa da R6 (unidadeMedidaTributavelId vira obrigatório quando a
   sigla diverge da unidade comercial) — fora. Fica só o mapeamento do erro do backend (item 8 do
   "dentro"). Gatilho: relato de confusão real de operador após a fatia em produção. Reversível:
   sim, é lógica de UI pura, sem payload novo.
5. Reagrupamento visual da aba "Dados fiscais" (fieldsets por assunto, em vez do FormGrid plano
   atual) — fora. Gatilho: rodada própria do arquiteto-design-system. Reversível: sim, é só
   estrutura de layout, sem dado em jogo.
6. Geração automática/incremento de código de cliente ou fornecedor — fora permanente, não
   "depois". O próprio plano da onda já descartou isso (concorrência sem geração atômica no
   backend); não é corte meu, é decisão já tomada em `PLANO-FRONTEND-ONDA-OPERACAO.md`.
```

### Depois (na sequência, sem número travado)

```text
1. Cliente — configuração comercial: entra assim que existir inventário próprio. Não é a mesma
   coisa que "fora" do item 1 acima: aqui o gatilho é interno ao processo (rodar o
   inventariante), não externo (pedido de terceiro) — por isso fica em "depois", não em "fora".
2. Fornecedor — configuração de compra/homologação: mesma observação do item 1.
```

## 7. Sequência de versões e a dependência que a justifica

```text
b64.c2 (feito)  → corrige o defeito de gravação (DEFAULT_SILENCIOSO + round-trip de tipoItemSped).
                  Sem isso, qualquer campo novo no bloco fiscal herdaria o mesmo 400 em criação.
b65 (esta)      → fecha os 4 campos de texto/autocomplete que restam + o controle de tipoItemSped.
                  Depende de b64.c2 já estar em produção (está) porque reusa exatamente o cálculo
                  de "bloco em branco" e o payload de 10 campos que a .c2 fixou — construir por
                  cima de payload de 6 campos (pré-.c2) teria sido o motor sem chamador ao
                  contrário: campo novo sobre gravação que ainda falha.
depois          → inventário de Cliente e de Fornecedor (pré-requisito de contrato antes de tela,
                  regra da régua de fatiamento). Só então a fatia de configuração comercial /
                  homologação pode ser numerada.
b66–b69         → como já documentado no plano da onda (Estoque, Venda/preço, Compra/financeiro,
                  Faturamento) — não tocados por esta rodada.
```

## 8. Fatiamento — o que `b65` entrega quando fechar

```text
Observável na tela:
  - Aba "Dados fiscais" do ProdutoFormDialog ganha: sigla de unidade tributável (autocomplete),
    EX-TIPI, código de benefício fiscal, tipo do item no SPED (dropdown). Rótulos desambiguados
    entre os dois campos de "unidade tributável".
  - Diálogo de vínculo de fornecedor ganha o campo "Descrição no fornecedor".
  - Aviso visível quando falta FISCAL_CADASTROS_CONSULTAR para resolver a sigla oficial.

Teste ou gate que protege:
  - tests/unit/gateContractRequestFields.test.ts — LACUNA_ESPERADOS_HOJE cai de 7 para 3
    (TransferirEstoqueRequest.origemId, .documento, AtualizarEmpresaRequest.contribuinteIpi —
    os três já fora do recorte, confirmados no inventário §6).
  - Teste de payload (padrão tests/unit/produtosPayload.test.ts) cobrindo os 4 campos novos +
    tipoItemSped editável, incluindo o caso nominal tipoItemSped = 0.
  - Teste de permissão para o guard de FISCAL_CADASTROS_CONSULTAR (padrão já usado em
    useEnderecoFiscalCatalogos).

Documento:
  - Entrada no CHANGELOG.md descrevendo os 4 campos + tipoItemSped editável + o guard de
    permissão — não um novo docs/IMPLEMENTACAO_*.md (CLAUDE.md §7.6 já fechou essa prática).
```

## 9. Trade-offs aceitos

```text
1. Cliente/Fornecedor fora de b65.
   Perde: os três "cadastros mestres" não fecham juntos nesta entrega.
   Dói quando: se existir (e eu não encontrei) um fluxo do operador que trava sem configuração
   comercial de cliente ou homologação de fornecedor — nesse caso o corte era pré-requisito
   disfarçado de conforto, e minha posição muda.
   Reversível: sim — sem payload, cache ou permissão compartilhados com Produto.

2. tipoItemSped como dropdown novo, decidido nesta rodada e não em DECISOES.md prévio.
   Perde: a rodada assume uma decisão que o código da .c2 já tinha implicitamente fechado ao
   contrário (não editar).
   Dói quando: se o motivo de deixar de fora na .c2 não foi "não coube no recorte" mas uma
   decisão funcional real (por exemplo, se a classificação SPED for decidida em outro lugar do
   sistema, fora do cadastro de produto) — não encontrei essa evidência, mas não posso provar que
   não existe.
   Reversível: sim — é campo de formulário, sem payload novo (o campo já trafega desde a .c2).

3. Validação client-side da regra R6 fica só no mapeamento do erro do backend, sem checagem
   prévia no formulário.
   Perde: operador só descobre a exigência de unidadeMedidaTributavelId depois de tentar salvar.
   Dói quando: sigla e unidade comercial divergem com frequência real de uso — não medido.
   Reversível: sim.

4. Rótulo do segundo seletor resolvido só em texto, sem novo agrupamento visual.
   Perde: se dois campos "unidade tributável" lado a lado, mesmo com hint, ainda confundirem o
   operador.
   Dói quando: relato de erro de preenchimento por confusão de campo, em produção.
   Reversível: sim.
```

## 10. O que eu abro mão

```text
- Abro mão de garantir que Cliente e Fornecedor entrem nesta onda no mesmo ritmo que Produto —
  aceito que a entrega fique fatiada por domínio mesmo sabendo que o plano os agrupou sob o mesmo
  rótulo de "cadastros mestres". Risco: se o cliente (o real, o contratante) esperava os três
  juntos, isso lê como atraso, não como fatiamento técnico.
- Abro mão de decidir a palavra exata dos dois rótulos de "unidade tributável" — deixo texto como
  responsabilidade do design, arriscando que a rodada de design proponha algo que já force
  reagrupamento visual, o que eu marquei como "fora".
- Não abro mão de nenhum gate ou teste. Não corto `gateContractRequestFields`, não corto teste de
  payload, não corto o guard de permissão de D-C. Se alguém propuser cortar algum desses para
  ganhar prazo, isso é dívida com juros, não economia — a régua de fatiamento já precifica isso.
```

## 11. Como discordar (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` em manter Cliente/Fornecedor dentro de `b65`**, caso ele
> proponha isso por a "cadastros mestres fechar junto". Y (cliente/fornecedor) não é pré-requisito
> do marco em jogo (destravar os campos fiscais de Produto que já têm inventário e prova
> preparada) porque nenhum documento desta rodada mostra um fluxo do operador que trava sem
> configuração comercial de cliente — nem venda, nem compra, nem aprovação, nas descrições de
> `b67`/`b68` do plano da onda citam essa dependência. Proponho fora por ora, gatilho de volta: o
> `arquiteto-operacao-erp` apontar o fluxo concreto que trava, ou o inventário de Cliente/Fornecedor
> ficar pronto. Reversível: sim, porque nenhum contrato, cache ou permissão desta fatia é
> compartilhado com Cliente/Fornecedor — se a evidência aparecer, a próxima rodada apenas adiciona
> a fatia, sem desfazer nada do que `b65` construiu.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "produtos-fiscais-v1.11.0a8b65",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/07-escopo-produtos-fiscais.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "b65 entrega só Produto (4 campos de texto/autocomplete + tipoItemSped editável); Cliente e Fornecedor ficam fora sem número reservado, até existir inventário próprio", "reversivel": true, "gatilho": "inventário do inventariante-contrato-tela sobre Cliente e sobre Fornecedor, ou evidência de fluxo do operador que trave sem eles" },
    { "id": "D-B", "titulo": "Rótulo do segundo seletor resolvido só por texto (sem redesenho da aba): 'Unidade tributável (unidade interna)' x 'Unidade tributável (sigla oficial)'", "reversivel": true, "gatilho": "texto sozinho não resolver a confusão em uso real; rodada de design propõe agrupamento visual" },
    { "id": "D-C", "titulo": "Guard de FISCAL_CADASTROS_CONSULTAR entra nesta fatia, replicando o padrão de useEnderecoFiscalCatalogos.ts da b64 — sem negociação, é ilusão-de-clicar se ausente", "reversivel": false, "gatilho": "não se aplica — não é corte, é inclusão obrigatória" },
    { "id": "D-A2", "titulo": "tipoItemSped ganha controle de edição (dropdown de 12 valores) em b65, revertendo a decisão implícita do comentário de ProdutosPage.tsx:74 que deixava só round-trip", "reversivel": true, "gatilho": "orquestrador vetar por decisão funcional que eu não encontrei registrada" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de manter Cliente/Fornecedor dentro de b65 por 'cadastros mestres fechar junto'", "impacto": "medio" }
  ],
  "pendencias": [
    { "tipo": "documentacao", "pergunta": "Quem mantém docs/PLANO-FRONTEND-ONDA-OPERACAO.md precisa decidir onde Cliente/Fornecedor entram na numeração (inserir e empurrar b66-b69, ou anexar ao fim da onda) quando o inventário deles existir.", "decide": "número de versão de Cliente/Fornecedor" },
    { "tipo": "funcional", "pergunta": "O comentário de ProdutosPage.tsx:74 ('o operador não edita tipoItemSped nesta tela (b65)') foi uma decisão funcional deliberada ou só um corte de escopo da .c2 para não estourar aquela fatia corretiva?", "decide": "se D-A2 (tipoItemSped editável) entra ou fica fora desta fatia" }
  ],
  "riscos": [
    "docs/fatias/v1.11.0a8b65-inventario.md §6 conta 8 itens em LACUNA_ESPERADOS_HOJE incluindo tipoItemSped; o arquivo real (tests/unit/gateContractRequestFields.test.ts:105-113) já tem 7, sem tipoItemSped, porque a .c2 já o adicionou ao schema. Quem planejar b65 sobre o inventário sem checar o código vivo vai superdimensionar a fatia em um campo.",
      "Não verifiquei runtime nenhum destes fluxos — toda a base é leitura de código, consistente com o que o inventário já declarou como 'não verificado'.",
      "Se existir dependência real de Cliente/Fornecedor em b67/b68 que eu não encontrei nas descrições do plano da onda, D-A precisa ser revisto antes de travar."
  ]
}
```
