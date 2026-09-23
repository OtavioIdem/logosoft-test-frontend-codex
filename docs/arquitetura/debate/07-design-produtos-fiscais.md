# Debate 07 — `arquiteto-design-system` — produtos-fiscais (v1.11.0a8b65)

Fontes lidas na íntegra antes desta posição: `docs/fatias/v1.11.0a8b65-inventario.md`,
`docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md`,
`docs/PLANO-FRONTEND-ONDA-OPERACAO.md:63-114`,
`features/produtos/components/ProdutoFormDialog.tsx` (241-303),
`features/produtos/components/ProdutoComplementoDialogs.tsx` (68-120),
`features/administracao/components/EnderecoFiscalFormSection.tsx`,
`features/administracao/hooks/useEnderecoFiscalCatalogos.ts`,
`features/tributacao/components/CadastroFiscalSelects.tsx`,
`components/forms/{EntitySelect,SearchSelect}.tsx`, `docs/DIRETRIZES_UX_REFERENCIAS.md`.

Tentei subir o preview (`logosoft-dev`, porta reatribuída 52575) e naveguei até `/produtos`; a
rota caiu na tela de login (`E-mail`/`Senha`/`Entrar`) e não tenho credencial para autenticar
nesta sessão. Não vale como "olhei a tela real" — é **não verificado em runtime**, mesma
limitação que o próprio inventário já registrou (banco de dev sem migração aplicada). A posição
abaixo é lida do JSX literal de `ProdutoFormDialog.tsx:248-284` (com linha), não de memória.

---

## D-A — escopo da fatia

**Posição: só o recorte de Produto entra nesta versão.** Cliente e fornecedor ficam fora até
terem o próprio inventário.

Meu eixo aqui não é prioridade de entrega (isso é `arquiteto-escopo-entrega`) — é que **não
existe insumo para eu opinar em template** sobre as telas de cliente/fornecedor. O inventário
(`v1.11.0a8b65-inventario.md`) tem, no cabeçalho, o recorte explícito: "os cinco campos... mais o
que estiver diretamente acoplado a eles". Não há linha de código citada de
`ClienteFormDialog`/`FornecedorFormDialog`, não há tabela de estados para essas telas, não há
"onde os campos moram na tela hoje" para configuração comercial de cliente nem para
homologação de fornecedor. Decidir grid, rótulo e permissão de uma tela que eu não abri —
nem no código, nem no preview — é exatamente o anti-padrão que a minha própria skill proíbe:
"redesenhar de memória". Incluir os três no mesmo carimbo de versão empurra decisão de UI sem
evidência para dentro do mesmo commit que tem evidência boa.

**O que abro mão:** se `arquiteto-escopo-entrega` julgar que separar em duas fatias custa mais
(ex.: reabrir o mesmo PATCH de round-trip, reabrir o mesmo gate estrutural) do que valho ao pedir
inventário telas por telas, aceito produto+cliente+fornecedor na mesma versão **desde que** a
homologação de fornecedor e a configuração comercial de cliente entrem sem posição minha de
template — ou seja, o `designer-ux-erp` segue o padrão mais próximo já existente no módulo
(`PermissionGuard` + `FormGrid` + toast padrão) sem eu ter validado se cabe. Gatilho para eu ser
chamado de volta: se cliente/fornecedor introduzirem catálogo assíncrono novo (mais um `EntitySelect`/
`SearchSelect` com permissão condicional) — aí é o mesmo eixo de D-B e eu preciso olhar antes.

---

## D-B — os dois campos "unidade tributável" + `tipoItemSped` (posição principal)

### O padrão já existe três vezes no repositório — isto não é abstração prematura, é dívida que já venceu

Busquei por "catálogo fiscal com permissão condicional, busca server-side com debounce, e
opção sintética para o valor já gravado que a página corrente da busca não traz":

| # | Onde | Arquivo | O que resolve |
| --- | --- | --- | --- |
| 1 | NCM/CFOP | `features/tributacao/components/CadastroFiscalSelects.tsx:23-95` | `NcmSelect`, `CfopSelect` — `SearchSelect` + `mensagemSemPermissao` (linha 21) + `comSelecionado` (linhas 15-19) |
| 2 | UF/Município do endereço fiscal | `features/administracao/hooks/useEnderecoFiscalCatalogos.ts` + `EnderecoFiscalFormSection.tsx` | `useUfCatalogo`/`useMunicipioCatalogo` — mesmo debounce (350ms), mesma permissão `FISCAL_CADASTROS_CONSULTAR`, mesma técnica de opção sintética (`comSelecionado`, linhas 66-76) e o **mesmo texto literal** de aviso ("Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR.", `EnderecoFiscalFormSection.tsx:295` — igual a `CadastroFiscalSelects.tsx:21`) |
| 3 | `unidadeTributavelSigla` (esta fatia) | ainda não existe | precisa exatamente da mesma coisa: `GET /api/fiscal/cadastros/unidades-tributaveis`, mesma permissão, mesmo formato de resposta (`Sigla`, `Descricao`, `Id`, `Ativo` — forma idêntica a `UfFiscalResponse`/`MunicipioIbgeResponse`) |

Regra de três casos aplicada: **1 é caso, 2 é coincidência, 3 é padrão.** O padrão já bateu 2 —
com o texto de aviso duplicado literalmente entre os dois arquivos — e esta fatia é o terceiro
consumidor. Isso não é uma proposta de componente novo "porque parece elegante": é o ponto exato
em que copiar-e-colar pela terceira vez vira dívida visual registrada.

**Onde a semelhança é mais forte:** o formato de `useUfCatalogo` (`value: uf.sigla`, sem Id
intermediário) é o gêmeo estrutural de `unidadeTributavelSigla` — o backend consome a sigla
direto (`AtualizarDadosFiscaisProdutoRequest.UnidadeTributavelSigla: string?`), não um Id, então
não precisa do desdobramento código/Id que `NcmSelect`/`CfopSelect` fazem. É a UF fiscal, só que
para unidade de medida.

**Risco concreto que a Dropdown do Prime tem e que os dois casos existentes já tiveram de
resolver:** `SearchSelect` (`components/forms/SearchSelect.tsx:33-56`) é um `Dropdown` do Prime
com `optionValue="value"`. Se o `value` corrente (a sigla já gravada no produto) não estiver
dentro do array de `options` retornado pela busca — porque a paginação trouxe outra página, ou
porque a permissão de catálogo falhou — o `valueTemplate` (linha 49-53) recebe `option = null` e
renderiza o placeholder "Selecione". **O campo mostra vazio um produto que tem unidade tributável
gravada.** Isso não é hipotético: é exatamente o defeito que `comSelecionado` foi escrito para
prevenir nos dois casos existentes (`CadastroFiscalSelects.tsx:15-19`,
`EnderecoFiscalFormSection.tsx:66-76`, comentário explícito na linha 61-64: "sem este merge o
campo apareceria vazio e o operador salvaria por cima de um vínculo que continuava lá"). Um
terceiro `SearchSelect` fiscal sem essa mesma opção sintética recria o bug que os outros dois já
fecharam — divergência silenciosa, não escolha.

### Proposta — o que vira compartilhado, e onde

Não proponho um componente genérico novo tipo `AsyncCatalogSelect<T>`. O lugar certo para o
terceiro consumidor é **estender o arquivo que já existe para isso**:
`features/tributacao/components/CadastroFiscalSelects.tsx` ganha um `UnidadeTributavelSelect`
irmão de `NcmSelect`/`CfopSelect`, reaproveitando `mensagemSemPermissao` e o mesmo formato de
`comSelecionado` (adaptado para chave `sigla` em vez de `id`, como `useUfCatalogo` já faz). Isso é
uma decisão de organização de código dentro de `features/`, que caberia à `dev-senior-react`/
`arquiteto-plataforma-frontend` confirmar — o que eu travo aqui, como arquiteto de template, é
**que o comportamento visual e a mensagem de erro sejam idênticos aos dois casos existentes**, não
o arquivo exato. Se a implementação preferir um hook próprio em `features/produtos/hooks/`, aceito,
desde que o texto de aviso e o comportamento de opção sintética não divirjam — senão o quarto
consumidor (quando aparecer) vai copiar a terceira variante em vez da segunda.

### Rótulo e posição dos dois campos "unidade tributável"

Hoje a aba tem um único campo ambíguo: `ProdutoFormDialog.tsx:272-276`, rotulado "Unidade
tributável", `EntitySelect` sobre `unidadeOptions` (o mesmo catálogo de unidade comercial,
Mód.03). Esta fatia introduz o segundo. Proposta de rótulo — nenhum dos dois fica com "Unidade
tributável" sozinho:

| Campo | Rótulo proposto | Componente | Tipo |
| --- | --- | --- | --- |
| `unidadeMedidaTributavelId` (existente, `:273-274`) | **"Unidade tributável (medida interna)"** | mantém `EntitySelect` (já correto — não mexe no componente, só no texto) | catálogo interno, Mód.03 |
| `unidadeTributavelSigla` (novo) | **"Unidade tributável (sigla oficial)"** | `SearchSelect`/`UnidadeTributavelSelect` — autocomplete assíncrono, **não** select fechado | catálogo global, Mód.04, `GET /api/fiscal/cadastros/unidades-tributaveis` |

Justificativa do tipo de campo: a diretriz de UX (`docs/DIRETRIZES_UX_REFERENCIAS.md:1-5,27-30`) é
clara — vínculo de entidade nunca é ID digitado, sempre busca por API com rótulo legível. Um
select fechado (lista estática no frontend) violaria a regra 8 da mesma diretriz ("Não criar lista
fixa para dados mestres que vêm do backend") — a tabela de unidades tributáveis é cadastro
oficial, paginado, que muda por manutenção do Mód.04, não é enum de domínio.

Cada rótulo ganha uma legenda de uma linha abaixo do campo, no mesmo padrão já usado nesta
mesma aba/tela para desambiguar (`ProdutoFormDialog.tsx:239`, `<small className="text-color-secondary
ml-2">`, hoje usado em "Controla qualidade"): "medida usada nas conversões de estoque desta
empresa (Mód.03)" e "sigla oficial de NF-e/SPED (Mód.04, campo uTrib)", respectivamente. Isso é
reaproveitar um padrão de 1 caso já presente na própria tela — não crio componente para isto, é
`<small>` solto, igual ao vizinho.

### `tipoItemSped`

**Dropdown fechado, sim** — mas por motivo oposto ao da unidade tributável: são 12 valores
fixos do domínio do backend (Registro 0200 da EFD), sem endpoint, sem paginação, sem busca. A
diretriz cobre exatamente este caso (`DIRETRIZES_UX_REFERENCIAS.md:40`, "Enums de domínio podem
usar dropdown fixo quando o contrato do backend define valores fechados"). O padrão já existe
**dentro do mesmo arquivo**, 1:1: `tipoFiscalOptions` (`ProdutoFormDialog.tsx:35-40`) alimentando
o `Dropdown` de `tipoItemFiscal` (`:268-270`, `showClear`). Proposta: `tipoItemSpedOptions` local
ao componente, mesmo formato `{ label, value }`, mesmo `showClear` (o bloco pode ir em branco —
inventário §3), checagem de `0` explícita (`value ?? null`, nunca `value || null`, porque
`MercadoriaParaRevenda = 0`). Isto fica **no módulo**, não é compartilhado: só esta tela usa
`TipoItemSped` hoje (inventário, achado central — zero ocorrências fora do backend). Régua de um
caso.

### Onde os quatro campos entram na grade — sem redesenhar a aba

A aba hoje é um `FormGrid` de 2 linhas: `col-3 × 4` (NCM, CEST, Origem, Tipo fiscal) e
`col-6 × 2` (Unidade tributável, Código fiscal externo). Proposta — mesma convenção de coluna já
usada nesta aba, sem alterar o grid nem a moldura:

```text
Linha 1 (col-12 md:col-3 × 4): NCM | CEST | Origem | Tipo do item no SPED (novo — tipoItemSped)
Linha 2 (col-12 md:col-3 × 4): Tipo fiscal | Unidade tributável (medida interna) | Unidade tributável (sigla oficial, novo) | Ex-TIPI (novo — texto, máx. 3)
Linha 3 (col-12 md:col-6 × 2): Código de benefício fiscal (novo — texto, máx. 10) | Código fiscal externo
```

`tipoItemSped` entra ao lado de NCM/CEST/Origem porque os três já condicionam a classificação
fiscal; `Tipo fiscal` (derivável de `tipoItemSped`, inventário §1) fica adjacente na linha
seguinte — não é redesenho, é resequenciar os mesmos `col-3`/`col-6` que já existem, sem mudar
altura de aba nem introduzir scroll novo em 1280 ou 768 (a aba já é `col-12 md:col-*`, que empilha
em telas estreitas pelo próprio PrimeFlex, sem trabalho extra).

### O que eu abro mão em D-B

- Não decido a posição exata de `exTipi`/`codigoBeneficioFiscalPadrao` como definitivo — são dois
  campos de texto curto sem ambiguidade nenhuma, cabem em qualquer combinação de `col-3`/`col-6`
  livre; se `designer-ux-erp` trocar a ordem para caber melhor visualmente, não é desvio de
  padrão.
- Não decido se `UnidadeTributavelSelect` mora em `CadastroFiscalSelects.tsx` ou em hook próprio
  de Produtos — travo o comportamento (mensagem, opção sintética, debounce), não o arquivo.
- Abro mão de propor mudança de nome para `tipoItemFiscal`/`unidadeMedidaTributavelId` além do
  rótulo — trocar o `name`/chave de estado é escopo de contrato de tipos, não de template.

---

## D-C — permissão dupla (`FISCAL_CADASTROS_CONSULTAR` ausente)

**Posição: replicar o padrão da `b64`, nos dois pontos em que ele já existe — não inventar um
terceiro formato de aviso.**

1. **No campo**: `emptyMessage` do `SearchSelect` de `unidadeTributavelSigla` mostra o texto
   padrão quando a busca não é permitida — literalmente o mesmo texto de
   `CadastroFiscalSelects.tsx:21`/`EnderecoFiscalFormSection.tsx:295` ("Consulta de cadastros
   fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR."), e o campo fica
   `disabled` quando `!permitido` — mesma condição de `NcmSelect`/`CfopSelect`
   (`disabled={disabled || !consulta.permitido}`).
2. **Na aba**: uma `Message severity="warn"` visível quando a permissão falta, no mesmo texto,
   posicionada logo abaixo da grade — réplica de `EnderecoFiscalFormSection.tsx:295`. A aba já tem
   um `Message severity="info"` fixo no topo (`ProdutoFormDialog.tsx:250`); o aviso de permissão
   entra depois da `FormGrid`, não substitui o informativo existente.
3. **No caso "produto já tem sigla gravada, mas falta a permissão para resolver o catálogo"** —
   isto é o estado "ação indisponível com motivo", não "erro". Diferente do município (que precisa
   resolver um Id para uma sigla), aqui o valor que a tela edita **já é a sigla** — não há segunda
   resolução assíncrona pendente. Então o campo consegue mostrar o valor gravado mesmo sem
   permissão de busca, **desde que** a opção sintética (`comSelecionado`) seja aplicada sempre a
   partir do próprio `values.unidadeTributavelSigla` corrente, independente de `permitido` — isto é
   mais simples que o caso de município, não mais complexo, mas só funciona se essa opção sintética
   for implementada (ver risco em D-B).

Isto não é uma terceira variante de mensagem — dois textos e dois padrões (campo + banner) já
resolveram este problema na `b64`; produtos usa o mesmo texto, os mesmos dois pontos.

**O que abro mão:** não decido se o banner da aba deve aparecer mesmo quando o operador nunca
tocou no campo `unidadeTributavelSigla` (produto sem essa sigla) — pode ser ruído para quem nunca
vai usar o campo. Se `arquiteto-operacao-erp` julgar que o aviso deve só aparecer quando o campo é
focado/tocado, cedo — não é uma posição de template, é de fluxo.

---

## Os sete estados — piso desta tela (não é opcional no plano da versão)

| Estado | `unidadeTributavelSigla` (novo) | `tipoItemSped` (novo) | `exTipi`/`codigoBeneficioFiscalPadrao` (novos, texto) |
| --- | --- | --- | --- |
| loading | `dropdownIcon` de spinner do `SearchSelect` (`:42`) + `panelFooterTemplate` "Buscando na API..." (`:44`) — já existe no componente, sem trabalho novo | não se aplica (dropdown estático) | não se aplica |
| vazio | `emptyMessage` contextual — nunca "digite o ID"; se permitido e sem resultado, "Nenhuma unidade tributável encontrada." | `showClear` — em branco é estado válido (bloco fiscal inteiro pode ir vazio, inventário §3) | placeholder vazio é válido — `exTipi` vazio herda do NCM (inventário §1), a legenda já citada em D-B avisa disso |
| erro recuperável | falha do `GET /unidades-tributaveis` cai em `isError` do `useQuery` — hoje `NcmSelect`/`CfopSelect` não têm tratamento de erro de rede distinto do vazio; **piso**: não regredir abaixo do que os dois casos existentes já fazem, mas também não é o lugar de inventar tratamento que os pares não têm | não se aplica | não se aplica |
| erro bloqueante | 400 do PATCH (`FISCAL_CADASTROS_TIPO_ITEM_SPED_OBRIGATORIO`, inventário §3) — **piso obrigatório**: essa mensagem tem de chegar ao operador nomeando o campo (`tipoItemSped`), não cair no toast genérico "Erro ao salvar produto" que a `b64.c2` já apontou como enganoso quando o produto gravou e só o bloco fiscal falhou | mesmo ponto acima — é o mesmo 400 | mesmo ponto acima |
| sucesso | toast padrão de `save()` — sem mudança | idem | idem |
| permissão negada | campo `disabled` + `emptyMessage`/banner (D-C) quando falta `FISCAL_CADASTROS_CONSULTAR`; a aba inteira já cai em `PermissionGuard permission="PRODUTOS_DADOS_FISCAIS_GERENCIAR"` (`:249`) quando falta a permissão maior — os dois níveis coexistem, não se substituem | dropdown fica dentro do mesmo `PermissionGuard` da aba — não tem permissão própria | idem |
| ação indisponível com motivo | valor já gravado, sem permissão de busca — mostrado (não escondido), com o banner explicando por que não dá para trocar (D-C item 3) | não se aplica | não se aplica |

O erro bloqueante do PATCH (linha "erro bloqueante" acima) é o item que mais importa desta
tabela: a `b64.c2` já corrigiu o defeito de payload, mas a **mensagem** continua genérica
(`ProdutosPage.tsx`, inventário §3/tabela de estados — "não verificado", tratamento de erro do
`dadosFiscaisMutation` cai no toast comum). Isto não é UI nova desta fatia, mas é piso: se a fatia
adiciona quatro campos ao bloco fiscal sem melhorar a mensagem de erro do próprio bloco, o
operador vai ver "Erro ao salvar produto" quatro vezes mais frequentemente sem saber qual dos dez
campos causou. Meu eixo aqui é `ApiErrorPanel`/erro por campo — devolver isso para o plano decidir
que camada implementa, mas não aceitar como opcional.

---

## Dívida visual — o que esta decisão fecha e o que abre

**Fecha:** os dois casos existentes (NCM/CFOP, UF/Município) já tinham o texto de aviso duplicado
literalmente entre dois arquivos (`CadastroFiscalSelects.tsx:21` e
`EnderecoFiscalFormSection.tsx:295`) — sem nenhum consumo a mais, essa duplicação já era dívida
paga em dobro. Consolidar o terceiro consumidor num só lugar (`UnidadeTributavelSelect` ao lado de
`NcmSelect`/`CfopSelect`, ou hook equivalente) é o gatilho natural para também apontar a
duplicação existente — não decido migrar os dois casos antigos nesta fatia (fora de escopo,
`arquiteto-escopo-entrega` decide), mas registro que a régua de três já foi atingida e o custo de
não migrar depois é **2 arquivos com o mesmo texto de erro fiscal a manter sincronizado à mão**.

**Abre, se D-B não for seguido:** se a fatia implementar `unidadeTributavelSigla` como um quarto
`SearchSelect` independente sem a opção sintética (`comSelecionado`), reintroduz — pela terceira
vez, sabendo do problema — o bug "campo mostra vazio um valor gravado" que os outros dois casos já
corrigiram. Custo de alinhar depois: 1 tela agora, mas com o precedente de dois lugares já
corrigidos, é regressão documentada, não lacuna nova.

---

## Discordâncias

> **Discordo, preventivamente, de uma leitura de `arquiteto-escopo-entrega` que trate D-B como
> "componente novo antes da tela existir".** A tela já existe (`ProdutoFormDialog.tsx:248-284`,
> aba "Dados fiscais" em produção) e o padrão que proponho reaproveitar já tem **dois**
> consumidores rodando (`CadastroFiscalSelects.tsx`, `EnderecoFiscalFormSection.tsx`). Não é
> abstração prematura — é o terceiro caso da régua, o ponto exato em que a skill manda parar de
> copiar. Adiar significa que o próximo módulo fiscal (o quarto a precisar de catálogo com
> permissão condicional) copia a pior das três variantes existentes em vez de uma consolidada.
> Custo de alinhar depois: pelo menos 3 arquivos (os dois existentes + este). Reversível: sim,
> porque é extração de comportamento já estável, não redesenho de contrato.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "produtos-fiscais-v1.11.0a8b65",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/07-design-produtos-fiscais.md",
  "decisoesPropostas": [
    {
      "id": "D-A",
      "titulo": "b65 entrega só o recorte fiscal de Produto; cliente e fornecedor esperam inventário próprio",
      "reversivel": true,
      "gatilho": "cliente/fornecedor introduzirem catálogo assíncrono novo ou tela sem padrão próximo já existente no módulo"
    },
    {
      "id": "D-B",
      "titulo": "unidadeMedidaTributavelId mantém EntitySelect com rótulo 'Unidade tributável (medida interna)'; unidadeTributavelSigla ganha SearchSelect assíncrono ('Unidade tributável (sigla oficial)'), terceiro consumidor do padrão de catálogo fiscal com permissão condicional (NcmSelect/CfopSelect e UF/Município são os outros dois); tipoItemSped é Dropdown fechado local com 12 valores, showClear, checagem explícita de 0; grade permanece col-3/col-6 sem redesenho",
      "reversivel": true,
      "gatilho": "quarto consumidor do mesmo padrão de catálogo aparecer sem o comportamento consolidado"
    },
    {
      "id": "D-C",
      "titulo": "Falta de FISCAL_CADASTROS_CONSULTAR replica o padrão da b64: campo disabled + emptyMessage padrão, mais Message warn na aba com o mesmo texto de EnderecoFiscalFormSection.tsx:295; valor já gravado continua visível via opção sintética mesmo sem permissão de busca",
      "reversivel": true,
      "gatilho": "operacao decidir que o banner deve só aparecer quando o campo é tocado"
    }
  ],
  "discordancias": [
    {
      "de": "arquiteto-escopo-entrega",
      "ponto": "possível leitura de que UnidadeTributavelSelect é componente compartilhado antes da tela existir",
      "impacto": "medio"
    }
  ],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "UnidadeTributavelSelect entra em features/tributacao/components/CadastroFiscalSelects.tsx ou em hook próprio de features/produtos/?", "decide": "arquiteto-plataforma-frontend ou dev-senior-react, na execução" },
    { "tipo": "funcional", "pergunta": "O banner de permissão ausente na aba fiscal deve aparecer sempre ou só quando o operador toca no campo unidadeTributavelSigla?", "decide": "arquiteto-operacao-erp" },
    { "tipo": "backend/UX", "pergunta": "A mensagem de erro do PATCH dados-fiscais (400 TipoItemSpedObrigatorio e demais) vai deixar de cair no toast genérico 'Erro ao salvar produto' nesta fatia?", "decide": "arquiteto-operacao-erp / dev-senior-react — é piso de estado, não decoração" }
  ],
  "riscos": [
    "Preview não verificado em runtime nesta rodada (login sem credencial disponível) — posição apoiada em leitura de código com arquivo:linha, não em tela renderizada.",
    "unidadeTributavelSigla sem a opção sintética (comSelecionado) reintroduz, pela terceira vez, o bug de campo mostrando vazio um valor já gravado — já corrigido duas vezes no repositório (CadastroFiscalSelects.tsx, EnderecoFiscalFormSection.tsx).",
    "Se D-A não for seguido e cliente/fornecedor entrarem na mesma versão sem inventário próprio, qualquer decisão de template para essas telas nesta rodada seria redesenho de memória."
  ]
}
```
