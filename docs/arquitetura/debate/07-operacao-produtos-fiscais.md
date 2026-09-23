# Debate 07 — operação — `produtos-fiscais` (v1.11.0a8b65)

Agente: `arquiteto-operacao-erp`. Insumos lidos na íntegra: `docs/fatias/v1.11.0a8b65-inventario.md`,
`docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md`, `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`
(§`b65`), `docs/arquitetura/DECISOES.md` (D53–D57). Código conferido: `ProdutoFormDialog.tsx`
(aba "Dados fiscais", linhas 248-280), `ProdutosPage.tsx` (`save`, linhas 81-140+, já com a
correção da `c2`), `ProdutoComplementoDialogs.tsx` (`ProdutoFornecedorDialog`, linhas 68-120),
`produtosSchemas.ts:100-109` (schema atual, pós-`c2`: 7 de 10 campos — `tipoItemSped` já trafega
mas sem controle de UI, comentário explícito na linha 105).

---

## 1. O fluxo do operador

Papel: analista de cadastro/fiscal, com `PRODUTOS_DADOS_FISCAIS_GERENCIAR`. Rotina: dar entrada
num produto novo (ou revisar um existente) até ele estar apto a sair numa nota fiscal.

| Passo | Módulo | Tela | O que o operador faz |
| --- | --- | --- | --- |
| 1 | Produtos | `/produtos` → "Novo produto" | Abre `ProdutoFormDialog`, preenche aba "Dados gerais" (nome, tipo, unidade comercial, categoria) |
| 2 | Produtos | aba "Dados fiscais" do mesmo diálogo | Preenche NCM, CEST, origem, "Tipo fiscal" — **hoje é aqui que o fluxo passa a exigir mais do que a tela oferece** (ver §2) |
| 3 | Produtos → Fiscal (Mód.04) | mesma aba, campo novo desta fatia | Precisa dizer o **tipo do item no SPED** (Registro 0200) — condicionalmente obrigatório: assim que qualquer campo do bloco fiscal é informado, o backend recusa sem ele (`ProdutoDadosFiscaisResolver.cs:166-168`, citado no inventário §3) |
| 4 | Produtos → Fiscal (Mód.04) | mesma aba, campo novo | Precisa resolver a **unidade tributável oficial** (`uTrib` da NF-e) contra o catálogo global — não é a mesma unidade interna que já existe no formulário (inventário §2) |
| 5 | Produtos → Fiscal (Mód.04) | mesma aba, campos novos | Opcionalmente revisa EX-TIPI (herdado do NCM se vazio) e código de benefício fiscal da UF |
| 6 | Produtos → Compras (fornecedor) | `ProdutoFornecedorDialog` | Vincula um fornecedor ao produto, com código e (esta fatia) descrição do item no catálogo do fornecedor |
| 7 | Produtos | rodapé do diálogo | Clica "Salvar" — dispara `saveMutation`, depois (se edição) `precoCustoMutation`, depois `dadosFiscaisMutation` se o bloco não estiver em branco |
| 8 | Produtos | toast | Confirma sucesso, ou lê o erro e volta ao campo indicado |

Esse é o caminho feliz. O caminho de correção que a rotina real também exige: reabrir um produto
já cadastrado, mudar um único campo fiscal (ex.: trocar a origem da mercadoria) sem mexer no
resto, e o bloco inteiro sobreviver — porque o PATCH é substituição atômica, não merge
(inventário §3, confirmado em `ProdutoDadosFiscaisResolver.cs`).

---

## 2. Onde o fluxo quebra hoje

**Passo 3 (tipo do item no SPED) e passo 4 (unidade tributável oficial) não têm tela.**
`ProdutoFormDialog.tsx:248-280` só tem NCM, CEST, origem, "Tipo fiscal" (`tipoItemFiscal`),
"Unidade tributável" (que na verdade é `unidadeMedidaTributavelId`, catálogo interno) e "Código
fiscal externo". Nenhum input para `tipoItemSped`, `unidadeTributavelSigla`, `exTipi` ou
`codigoBeneficioFiscalPadrao` — os quatro campos que a `AtualizarDadosFiscaisProdutoRequest`
aceita e que `ProdutoResponse` já devolve (inventário §1, §4). O comentário na linha 105 do
schema é explícito: `tipoItemSped` "só trafega (round-trip do response) — sem controle de UI.
Editável é escopo da b65." Isto é a própria fatia dizendo que o passo 3 não fecha ainda.

**Passo 6 (descrição do item no fornecedor) não tem input.** `ProdutoFornecedorDialog`
(`ProdutoComplementoDialogs.tsx:69`) inicializa `{ fornecedorId: '', codigoFornecedor: '',
principal: true }` — sem `descricaoFornecedor`, nem no estado nem no JSX. Mas
`ProdutoFornecedorResponse.descricaoFornecedor` já é exibido em algum ponto de leitura
(`produtos.types.ts:48-54`) — a tela mostra um dado que nunca deu ao operador como digitar
(inventário, Divergência 4). Isso é o defeito clássico de assimetria: quem vê o card de um
fornecedor vinculado por outra pessoa lê uma descrição; quem cria o vínculo hoje não tem onde
escrevê-la.

**Sem correção para o vínculo de fornecedor.** Lido no inventário §3 e confirmado por leitura de
código: não existe use case de atualização de `ProdutoFornecedor` no backend — só criação, com
recusa se já existe vínculo (`ProdutoErrors.FornecedorJaVinculado`). Se o operador digitar
`descricaoFornecedor` errado ao vincular, **não há como corrigir pela tela**, hoje nem depois
desta fatia — o caminho de correção é desvincular e vincular de novo (se existir ação de
desvincular; não verifiquei) ou pedir ajuste direto no banco. Registro como lacuna que esta fatia
não fecha, porque a fatia não pode inventar um endpoint que não existe.

**Sem catálogo consumido.** `grep -rn "unidades-tributaveis" features/` devolveu zero
ocorrências (inventário §2) — mesmo que o campo `unidadeTributavelSigla` vire input de texto
livre nesta fatia, sem o autocomplete contra `GET /api/fiscal/cadastros/unidades-tributaveis` o
operador teria que digitar uma sigla de memória, arriscando o 400 de
`CadastrosFiscaisErrors.UnidadeMedidaTributavelObrigatoria` (R6, inventário §2) só na hora de
salvar — o erro mais tarde possível, depois de já ter preenchido o resto do bloco.

---

## 3. O que a tela precisa permitir (cada item com o passo que destrava)

1. **Dropdown "Tipo do item no SPED (Registro 0200)"** com os 12 rótulos oficiais do enum
   `TipoItemSped` (0–10, 99) — destrava o passo 3. Sem ele, todo preenchimento de qualquer outro
   campo do bloco fiscal (incluindo os que já existem, como NCM) é recusado pelo backend assim
   que o operador salva.
2. **Autocomplete "Unidade tributável oficial (NF-e)"**, resolvido por `sigla`/`termo` contra
   `GET /api/fiscal/cadastros/unidades-tributaveis`, com rótulo que não repete o texto do campo
   existente — destrava o passo 4 sem obrigar o operador a saber a sigla de cor. Ver D-B.
3. **Campo texto "EX-TIPI"**, opcional, com nota "em branco = herda do NCM" — destrava o passo 5;
   sem a nota, o operador não sabe se deixar vazio é omissão ou escolha.
4. **Campo texto "Código de benefício fiscal (cBenef)"**, opcional — destrava o mesmo passo para
   quem opera em UF com benefício.
5. **Campo texto "Descrição do fornecedor"** no `ProdutoFornecedorDialog` — destrava o passo 6 e
   fecha a assimetria exibido-mas-não-editável.
6. **Aviso inline, não bloqueio silencioso, quando `tipoItemSped` falta e outro campo fiscal foi
   preenchido** — reflete a regra que o backend já teria recusado (§2 acima), evitando que o
   operador só descubra no toast pós-submit. Isto **não é inventar regra no frontend**: a regra
   já existe e é pública no contrato (`EstaEmBranco`/`TipoItemSpedObrigatorio`); é UX que antecipa
   um 400 certo, não uma regra nova.
7. **Guarda de permissão dupla no seletor de unidade tributável oficial** — campo desabilitado
   com mensagem quando falta `FISCAL_CADASTROS_CONSULTAR`, no padrão de
   `useEnderecoFiscalCatalogos.ts`/`EnderecoFiscalFormSection.tsx:212,295` da `b64` — destrava o
   passo "saber por que não consigo escolher" em vez de a tela ficar muda ou quebrar.
8. **Mensagem de erro do PATCH que não nega o cadastro já gravado** — já corrigida na `c2`
   (`ProdutosPage.tsx:110-131`); citada aqui só para registrar que essa parte do passo 7/8 já
   fecha e não deve ser redesenhada nesta fatia.

---

## 4. Impacto em módulo vizinho

- **Fiscal (Mód.04), direto.** `unidadeTributavelSigla` e `tipoItemSped` são resolvidos contra
  catálogos e enums que já existem no Fiscal; esta fatia é o primeiro consumo de
  `unidades-tributaveis` por qualquer tela de `features/`. Isso também é o primeiro lugar do
  módulo Produtos que precisa checar `FISCAL_CADASTROS_CONSULTAR` — permissão que hoje nenhum
  código de Produtos verifica (inventário §5).
- **Faturamento/NF-e (Mód.07 a jusante, fora do recorte desta fatia).** `uTrib` e EX-TIPI são
  campos que alimentam a nota fiscal eletrônica; produto sem esses dados hoje provavelmente já
  falha ou usa fallback na emissão (não verifiquei — é hipótese, não fato). Esta fatia não muda
  Faturamento, mas é a fatia que dá ao operador o lugar de preencher o dado que Faturamento vai
  precisar mais tarde.
- **Compras (fornecedor).** `descricaoFornecedor` é lido pelo `ProdutoFornecedorResponse`
  embutido no `ProdutoResponse`; não verifiquei se alguma tela de Compras (cotação, pedido) já
  exibe esse campo — se exibir, esta fatia passa a alimentar um dado que hoje chega sempre `null`.
- **Estoque.** Nenhum. `unidadeMedidaTributavelId` (interno, Mód.03) já está no schema desde a
  `b58.c3`; esta fatia não mexe nele, só adiciona o campo irmão do catálogo global ao lado.
- **Cliente/Fornecedor (configuração comercial, homologação).** Depende de D-A — ver §5.

---

## 5. O que eu abro mão

**Em D-A — escopo da fatia: defendo que `b65` entregue só o recorte de Produto (os 5 campos com
inventário escrito), e que `PUT /api/clientes/{id}/configuracao-comercial` e a configuração de
compra/homologação de fornecedor fiquem para uma fatia seguinte com inventário próprio.**
Custo declarado: quem precisa configurar comercial de cliente ou homologar fornecedor continua
**sem tela nenhuma** para isso — não é regressão (essa tela não existe hoje), mas também não é
avanço; o operador segue fazendo esse ajuste fora da UI (suporte, banco, ou processo manual que já
existe hoje) até a fatia seguinte fechar. Isso é aceitável **se** o cliente não está bloqueado por
esse fluxo agora — ou seja, se hoje ninguém depende de configurar comercial de cliente pela tela
para fechar uma venda. Não é aceitável se o roteiro da onda prometeu "cliente e fornecedor
utilizáveis pelos fluxos seguintes" já na `b65` (é exatamente o que o plano diz, linha 63) e o
`b67` (venda) depender de configuração comercial do cliente para calcular preço/condição — nesse
caso, cortar cliente/fornecedor da `b65` empurra o bloqueio para dentro da `b67`, que passa a
precisar reabrir este debate. Viro isso pergunta (P1).

**Em D-B — dois rótulos, não um campo fundido.** Defendo dois campos com rótulos distintos, não
um seletor único com "sub-hint". Custo declarado: mais um campo na aba, mais uma decisão de nome
para quem desenha a tela, e o campo já existente ("Unidade tributável") precisa ser renomeado
mesmo não sendo, tecnicamente, campo novo desta fatia — abro mão de "não tocar no que já
funciona" em favor de eliminar uma ambiguidade que, se deixada, gera erro de operador toda vez
que alguém confundir os dois (ex.: preencher só o interno achando que preencheu o oficial, e o
produto sair sem `uTrib` na nota). Um seletor único fundido economiza uma linha de formulário, mas
esconde que são duas fontes de dado (Mód.03 interno vs. Mód.04 global) com regras de obrigação
cruzadas (R6) — não é o mesmo dado com dois nomes, é dois dados. O nome exato de cada rótulo é
decisão do `arquiteto-design-system`; a exigência de serem visivelmente distintos não é.

**Em D-C — permissão dupla, replicando o padrão da `b64`.** Defendo desabilitar o autocomplete e
avisar, no padrão de `useEnderecoFiscalCatalogos.ts`. Custo declarado: um operador com
`PRODUTOS_DADOS_FISCAIS_GERENCIAR` mas sem `FISCAL_CADASTROS_CONSULTAR` fica **sem conseguir**
escolher a unidade tributável oficial por seleção — não digita a sigla como alternativa, porque
isso reintroduziria vínculo por identificador técnico digitado (a sigla só é confiável se veio do
catálogo; digitada, arrisca o 400 de R6 ou uma sigla que não existe na tabela oficial). Abro mão
de "sempre disponível para quem tem a permissão principal" em nome de não abrir uma porta de
texto livre para um campo que o próprio backend valida contra catálogo. Isso é aceitável se as
duas permissões costumam andar juntas no perfil de quem cadastra produto (hipótese razoável, não
verificada); não é aceitável se, na prática, `FISCAL_CADASTROS_CONSULTAR` é concedida só a um
perfil fiscal separado que nunca cadastra produto — nesse caso todo produto nasceria sem `uTrib`
por bloqueio de permissão, não por escolha do operador, e a resposta certa seria rever o
provisionamento de perfil, não a tela. Viro isso pergunta (P3).

**Em geral — não replico `EstaEmBranco` campo a campo no frontend.** O aviso do item 6 (§3) é
deliberadamente simples ("se algum campo do bloco fiscal está preenchido e `tipoItemSped` não,
avise"), não uma reimplementação exata dos dez campos de `EstaEmBranco` (`ProdutoDadosFiscaisResolver.cs:173-183`).
Abro mão de paridade perfeita com a regra do backend no client — se a regra mudar (um décimo
primeiro campo entrar no bloco fiscal, por exemplo), uma cópia exata no frontend ficaria
desatualizada em silêncio; uma cópia aproximada some com o toast tardio na maioria dos casos e
deixa o backend como árbitro final nos casos de borda. O custo é: em algum caso de borda raro o
operador ainda vai ver o 400 do backend em vez do aviso inline — aceitável porque o backend
continua sendo a fonte de verdade, e a mensagem de erro (já corrigida na `c2`) não nega o que foi
salvo.

---

## 6. Perguntas externas

1. **(D-A, cliente)** A `b67` (venda, preço, aprovação) depende de `configuracao-comercial` do
   cliente para calcular preço/condição, ou o cálculo de preço é independente disso? Decide: se
   cortar cliente/fornecedor da `b65` é um adiamento seguro ou um bloqueio disfarçado que só
   aparece quando a `b67` for planejada.
2. **(backend)** O 400 de `CadastrosFiscaisErrors.UnidadeMedidaTributavelObrigatoria` (R6 — sigla
   diverge da unidade comercial sem `unidadeMedidaTributavelId` informado) tem um corpo de erro
   que o frontend consiga mapear a um campo específico do formulário, ou é um erro genérico de
   validação de domínio sem `field`? Decide: se dá para transformar o acoplamento R6 num aviso
   inline por campo, ou só num toast pós-submit igual ao que já existe hoje.
3. **(cliente/backend, perfil de acesso)** Na operação real, quem tem
   `PRODUTOS_DADOS_FISCAIS_GERENCIAR` normalmente também tem `FISCAL_CADASTROS_CONSULTAR`, ou são
   perfis diferentes (cadastro de produto vs. equipe fiscal)? Decide: se a guarda de permissão
   dupla (D-C) é um caso raro de aviso ou o caminho normal de quem cadastra produto no dia a dia.
4. **(backend)** Existe ou está prevista uma rota de atualização do vínculo
   `ProdutoFornecedor` (editar `descricaoFornecedor`/`codigoFornecedor` depois de criado), ou a
   única correção possível é desvincular e vincular de novo? Decide: se o "caminho errado" deste
   fluxo (§1, correção) precisa de UI de desvincular nesta fatia ou fica pendência aberta sem
   solução no frontend, porque não há endpoint para desenhar sobre.
5. **(cliente, nomenclatura)** A equipe fiscal já usa algum nome interno consolidado para
   distinguir a unidade tributável do catálogo interno (Mód.03) da unidade tributável oficial da
   NF-e (Mód.04) — por exemplo "uTrib" como termo já falado na operação — ou o nome nasce nesta
   fatia? Decide o rótulo final que o `arquiteto-design-system` vai cravar, evitando retrabalho
   pós-QA por reclamação de nomenclatura.

---

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "produtos-fiscais-v1.11.0a8b65",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/07-operacao-produtos-fiscais.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "b65 entrega só o recorte de Produto (5 campos com inventário); cliente/fornecedor fica para fatia seguinte com inventário próprio", "reversivel": true, "gatilho": "b67 (venda) comprovar dependência de configuracao-comercial do cliente para preço/condição" },
    { "id": "D-B", "titulo": "dois seletores com rótulos distintos para unidade tributável interna (Mód.03, já existe) e unidade tributável oficial (Mód.04, nova) — nunca um campo fundido", "reversivel": true, "gatilho": "arquiteto-design-system definir o texto exato dos rótulos" },
    { "id": "D-C", "titulo": "permissão dupla no autocomplete de unidade tributável oficial: desabilita e avisa sem FISCAL_CADASTROS_CONSULTAR, no padrão useEnderecoFiscalCatalogos.ts da b64 — sem alternativa de texto livre", "reversivel": true, "gatilho": "confirmação de que os dois perfis (PRODUTOS_DADOS_FISCAIS_GERENCIAR e FISCAL_CADASTROS_CONSULTAR) normalmente não andam juntos, o que reabriria a discussão de provisionamento" }
  ],
  "discordancias": [],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "A b67 (venda) depende de configuracao-comercial do cliente para calcular preço/condição?", "decide": "se D-A (cortar cliente/fornecedor da b65) é adiamento seguro ou bloqueio disfarçado" },
    { "tipo": "backend", "pergunta": "O 400 de UnidadeMedidaTributavelObrigatoria (R6) tem corpo de erro mapeável a um campo, ou é genérico?", "decide": "se o acoplamento R6 vira aviso inline por campo ou só toast pós-submit" },
    { "tipo": "funcional", "pergunta": "Quem tem PRODUTOS_DADOS_FISCAIS_GERENCIAR normalmente também tem FISCAL_CADASTROS_CONSULTAR, na operação real?", "decide": "se a guarda dupla de D-C é caso raro de aviso ou o caminho normal do dia a dia" },
    { "tipo": "backend", "pergunta": "Existe ou está prevista rota de atualização do vínculo ProdutoFornecedor?", "decide": "se o caminho de correção do vínculo de fornecedor precisa de UI de desvincular nesta fatia ou fica pendência sem solução possível" },
    { "tipo": "funcional", "pergunta": "Há nome interno já consolidado para distinguir os dois campos de unidade tributável?", "decide": "o rótulo final que o design vai cravar, evitando retrabalho pós-QA" }
  ],
  "riscos": [
    "Se D-A cortar cliente/fornecedor e a b67 depender de configuracao-comercial do cliente para preço, o bloqueio só aparece quando a b67 for planejada — não há hoje evidência de que isso não aconteça.",
    "Vínculo produto-fornecedor não tem caminho de correção: não existe use case de atualização no backend (só criação, recusada se já existe vínculo) — o caminho errado da rotina (digitar descricaoFornecedor errado) não fecha nesta fatia nem pode fechar sem endpoint novo.",
    "Round-trip do PATCH de dados fiscais não foi verificado em runtime contra o backend de pé, nem antes nem depois da c2 — toda a leitura é por código nos dois lados (herdado do inventário, carrego o mesmo risco).",
    "Guarda de permissão dupla (D-C) assume, sem confirmação, que os dois perfis normalmente coexistem; se não coexistirem, todo produto nasceria sem uTrib por bloqueio de permissão, não por escolha do operador — pendência P3.",
    "Acoplamento R6 (unidadeTributavelSigla diverge da unidade comercial → unidadeMedidaTributavelId vira obrigatório) não tem, hoje, nenhuma UX prevista para surgir antes do submit — depende da resposta de erro do backend ter campo mapeável (pendência P2); sem isso, o operador só descobre no toast, no fim do passo 7."
  ]
}
```
