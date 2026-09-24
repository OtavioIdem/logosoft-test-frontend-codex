# Debate 08 — operação — `cliente-fornecedor` comercial

Agente: `arquiteto-operacao-erp`. Insumos lidos na íntegra: `docs/arquitetura/debate/08-inventario-cliente-fornecedor.md`,
`docs/arquitetura/DECISOES.md` (D53–D61), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (§`b65`, "Fora de
escopo, com gatilho"), `docs/arquitetura/debate/07-operacao-produtos-fiscais.md` (forma). Código
conferido: `features/clientes/components/ClientesPage.tsx` (padrão `bloquear`/`desbloquear` com
`ReasonDialog`, linhas 37, 90-120), `features/fornecedores/components/FornecedoresPage.tsx` (só tem
`inativar`, sem ação de estado hoje), `features/compras/components/PedidoCompraFormDialog.tsx`
(seleção de fornecedor via `EntitySelect`, sem qualquer leitura de `homologado`/`situacao-compra`).
Backend conferido além do inventário: `../New project 3/src/Erp.Api/Controllers/Pessoas/ClassificacoesPessoaController.cs`,
`Erp.Domain/Pessoas/ClassificacaoPessoa.cs`, `Erp.Application/Pessoas/Classificacoes/ClassificacaoPessoaRequests.cs`
(CRUD completo, não só leitura — ver D-D), e busca por `grep -rn "Homologado" "New project 3/src"`
confirmando que nenhum use case de Pedido de Compra referencia homologação (ver D-C, achado de
módulo vizinho).

---

## 1. O fluxo do operador

Duas rotinas distintas, dois papéis prováveis (comercial/crédito para Cliente; compras/suprimentos
para Fornecedor), ambas guardadas hoje só por `CLIENTES_GERENCIAR`/`FORNECEDORES_GERENCIAR`.

### 1.A — Configurar comercial do Cliente

| Passo | Módulo | Tela | O que o operador faz |
| --- | --- | --- | --- |
| 1 | Clientes | `/clientes` → "Novo cliente" ou "Editar" | Abre `ClienteFormDialog`, preenche pessoa, limite de crédito, observação |
| 2 | Clientes → Comercial | mesmo diálogo, bloco/aba novo desta fatia | Escolhe tabela de preço padrão, condição de pagamento padrão, classificação, dia de vencimento preferencial, marca/desmarca "permite venda a prazo" — **hoje não existe onde fazer isso** (inventário §1, §4) |
| 3 | Clientes | rodapé do diálogo | Clica "Salvar" — precisa dos cinco campos comerciais no mesmo payload, porque o `PUT .../configuracao-comercial` **substitui o bloco inteiro** (inventário §2); campo não enviado vira `null` gravado, não "mantém" |
| 4 | Clientes | toast | Confirma sucesso ou lê erro e volta ao campo |
| 5 (correção) | Clientes | reabre "Editar" mais tarde | Precisa que os cinco valores gravados voltem preenchidos na tela — se só um deles vier carregado errado (ou não vier), o próximo "Salvar" apaga os outros quatro sem o operador perceber |

### 1.B — Homologar/revogar e configurar compra do Fornecedor

| Passo | Módulo | Tela | O que o operador faz |
| --- | --- | --- | --- |
| 1 | Fornecedores | `/fornecedores` → linha do fornecedor | Vê se está `homologado` — **hoje a tabela não tem essa coluna** (`FornecedoresPage.tsx:99-102` lista só `codigo`, `pessoa`, `observacao`, `status`) |
| 2 | Fornecedores | ação de linha | Homologa (sem motivo) ou revoga (motivo obrigatório) — **hoje não existe nenhuma das duas ações** (inventário §4, `FornecedoresPage.tsx` só tem `inativar`) |
| 3 | Fornecedores → Compra | diálogo/aba de configuração de compra | Define condição de pagamento padrão, prazo médio de entrega, categoria de fornecimento — **hoje não existe** |
| 4 | Compras | `/compras` → "Novo pedido de compra" | Escolhe o fornecedor no `PedidoCompraFormDialog` (`EntitySelect`, já em produção) — **hoje a tela não mostra se o fornecedor está apto a receber pedido**; o backend também não recusa a criação por isso (achado de módulo vizinho, §4) |
| 5 (correção) | Fornecedores | reabre "Editar"/revoga homologação depois de homologar por engano | Motivo obrigatório na revogação, no mesmo padrão de `ReasonDialog` já usado em bloqueio de crédito |

---

## 2. Onde o fluxo quebra hoje

Confirmado pelo inventário (`08-inventario-cliente-fornecedor.md` §1, §4): os cinco endpoints do
recorte existem no backend e **nenhum tem consumidor** — `ClienteFormDialog.tsx` e
`FornecedorFormDialog.tsx` não têm aba nem campo para nenhum dos 14 campos comerciais; `FornecedoresPage.tsx`
não tem ação de estado nenhuma além de `inativar`. Isso é "capacidade ausente", não "contrato
quebrado" — mas os passos 2 e 3 de 1.A e os passos 1–3 de 1.B não têm tela hoje, ponto final.

**Achado de módulo vizinho, não registrado no inventário porque estava fora do recorte dele:**
`features/compras/components/PedidoCompraFormDialog.tsx:86` já deixa o operador escolher fornecedor
por `EntitySelect` (rótulo legível, correto) — mas não lê `homologado` nem chama
`situacao-compra`. E o lado do backend confirma que isso não é um corte de UI: `grep -rn
"Homologado" "New project 3/src"` não encontra nenhuma referência em nenhum use case de Pedido de
Compra — só em `Fornecedor.cs`, `FornecedorConfiguration.cs`, `FornecedoresCompraConsultaService.cs`
e `FornecedorResponse.cs`. **O backend não recusa a criação de um pedido de compra para um
fornecedor não homologado.** `situacao-compra` é puramente consultivo hoje, em ambos os lados —
isso muda a resposta de D-C (§5).

---

## 3. O que a tela precisa permitir

1. **Bloco "Comercial" no `ClienteFormDialog`** com os cinco campos, sempre reenviando todos —
   destrava o passo 2/3 de 1.A. Sem isso, ninguém configura tabela de preço/condição/dia de
   vencimento/venda a prazo do cliente pela UI.
2. **Prefill obrigatório dos cinco valores gravados ao reabrir "Editar"**, buscados do próprio
   `GET /api/clientes` (o backend já devolve — inventário, Divergência 1) — destrava o passo 5 de
   correção. Sem isso, o `PUT` de substituição apaga silenciosamente o que não foi carregado.
3. **Bloco "Compra" no `FornecedorFormDialog`** com os três campos, mesmo raciocínio de substituição
   atômica — destrava o passo 3 de 1.B.
4. **Duas ações de linha em `FornecedoresPage`** — "Homologar" (sem motivo) e "Revogar homologação"
   (motivo obrigatório, `ReasonDialog` reaproveitado), mutuamente exclusivas por `homologado`, no
   padrão já em produção de `bloquear`/`desbloquear` crédito — destrava o passo 2 de 1.B.
5. **Coluna/indicador "Homologado" na tabela de Fornecedores** — destrava o passo 1 de 1.B; sem
   isso a ação de linha existe mas ninguém sabe qual botão vai estar habilitado antes de abrir a
   linha.
6. **Seletor por busca (rótulo, não Id) para `tabelaPrecoPadraoId`, `condicaoPagamentoPadraoId`
   (Cliente e Fornecedor) e `classificacaoId`** — nenhum dos três pode ser campo de texto/Id
   digitado; ver D-D para `classificacaoId` especificamente.
7. **Indicação de por que um fornecedor não pode receber pedido, visível no ponto onde o operador
   de Compras decide** (não necessariamente em Fornecedores) — mas com ressalva: como o backend
   não bloqueia a criação do pedido, isto é informativo, não impeditivo. Ver D-C.

---

## 4. Impacto em módulo vizinho

- **Compras — direto, e maior do que o inventário registrou.** `PedidoCompraFormDialog.tsx` já
  está em produção e já permite escolher qualquer fornecedor, homologado ou não, sem aviso — porque
  nem o frontend nem o backend leem `Homologado`/`situacao-compra` no caminho de criação do pedido
  (achado §2). Este recorte, ao dar ao operador o botão "Homologar", cria pela primeira vez um
  estado (`homologado = true/false`) que a operação vai passar a ver e vai esperar que **signifique
  algo** em Compras — e hoje não significa nada além do próprio campo.
- **Financeiro.** `condicaoPagamentoPadraoId` é o mesmo catálogo (`GET
  /api/financeiro/condicoes-pagamento`) já consumido por `PedidoCompraFormDialog` (linha 89, campo
  "Condição de pagamento" da própria negociação do pedido) — sem sobreposição de payload, mas é o
  mesmo dado mestre visto de dois pontos (config padrão do fornecedor vs. condição escolhida no
  pedido específico). Nenhum acoplamento de escrita.
- **Vendas.** Nenhum, confirmado por leitura de código nos dois lados (inventário §6): nem
  `VendaClienteValidator` nem `PedidoVendaItemDialog.tsx` leem qualquer um dos cinco campos
  comerciais do Cliente. Se o produto decidir que o pedido de venda deve herdar tabela de
  preço/condição do cliente, é trabalho novo em `b67`, não uma dependência que este recorte
  destrava ou bloqueia hoje.
- **Pessoas (Classificação de Pessoa).** Achado que muda a leitura do inventário — ver D-D: o
  backend tem CRUD completo (`Criar`/`Atualizar`/`Inativar`, guardado por
  `ClassificacoesPessoaGerenciar`, já no union e no catálogo), não só a leitura que o inventário
  registrou. É um módulo vizinho pequeno e pronto para virar tela própria.
- **Estoque.** Nenhum.

---

## 5. O que eu abro mão

**Em D-A — estrutura de tela: bloco/aba dentro do diálogo existente, seguindo o padrão de mutação
sequencial já pago pela `b65` de Produto (salva o cadastro, depois dispara o `PUT` do bloco
comercial com o Id retornado), não diálogo separado aberto por ação de linha.** Custo declarado:
para um cliente/fornecedor **novo**, a configuração comercial só pode ser persistida depois que o
primeiro `POST` de criação retornar o Id — ou seja, dois `POST`/`PUT` em sequência no mesmo clique
de "Salvar", com um caminho de erro que hoje não existe em nenhum diálogo do módulo: o cadastro
básico pode ter sido criado com sucesso e o bloco comercial falhar — o toast genérico atual
(`ClientesPage.tsx:73`, `rethrow: true`) não distingue isso. Abro mão de "um único ponto de falha
por Salvar" em troca de fechar o fluxo no mesmo clique; o custo cai sobre quem escreve a mensagem
de erro, que precisa dizer "cliente criado, mas a configuração comercial não foi salva — reabra e
tente novamente" em vez de sugerir que nada foi gravado. Isso é aceitável **se** a mensagem de erro
distinguir os dois `PUT`/`POST`; não é aceitável se cair no mesmo toast genérico que hoje mascara
sucesso parcial — é exatamente a classe de defeito que a correção `b64.c7` já pagou uma vez
("o Salvar do rodapé parava de descartar o endereço fiscal" — commit `20c162b`): formulário que
reenvia um bloco de substituição atômica precisa garantir que os campos não visitados ainda assim
viajam com o valor certo, e aqui o risco é o oposto — o bloco pode nem chegar a ser enviado se o
primeiro passo falhar silenciosamente.

**Em D-B — homologar/revogar como ação de linha, replicando bloquear/desbloquear crédito, sem
desconto.** Sem custo — é o mesmo padrão, já pago, com o mesmo formato de motivo obrigatório na
ação destrutiva/reversora. Concordo sem reserva.

**Em D-C — `situacao-compra` entra como leitura informativa, não como bloqueio de UI, e eu abro
mão de impedir o operador de criar um pedido de compra para fornecedor não apto.** Isto não é
opção de conforto: o backend **não tem a regra** (§2/§4) — implementar o bloqueio no
`PedidoCompraFormDialog` seria exatamente o anti-padrão que a skill proíbe ("regra crítica mora no
backend; o frontend reflete bloqueio que o backend retorna", não o contrário). O que a tela pode
fazer sem inventar regra: mostrar `motivo` (texto que o próprio backend já formata, ex. "Fornecedor
não homologado e bloqueio por parâmetro ativo.") como aviso não bloqueante em algum ponto do fluxo
de Compras — provavelmente no `EntitySelect` de fornecedor do `PedidoCompraFormDialog`, fora deste
recorte de tela, mas o dado (`GET .../situacao-compra`) precisa existir consumível para quando
Compras decidir usá-lo. Custo: o operador de compras pode criar um pedido para fornecedor bloqueado
por parâmetro e só vai saber se alguém construir esse aviso — hoje ninguém saberia nem isso. Viro
pergunta (P1): o backend pretende mover essa regra para dentro da criação do pedido, ou ela é
deliberadamente só consultiva?

**Em D-D — classificação de Pessoa: defendo que a tela de CRUD (Código/Nome/Descrição/Inativar,
guardada por `CLASSIFICACOES_PESSOA_GERENCIAR`) entre como prerequisito mínimo, não que
`classificacaoId` vire seletor apontando para um catálogo vazio e sem onde ser populado.** O
inventário tratou isso como "catálogo sem tela" (correto para a leitura que ele fez, `GET .../classificacoes`
apenas) — mas o backend tem CRUD completo, do mesmo tamanho e forma já pago duas vezes (Tabela de
Preço, Condição de Pagamento): código, nome, descrição opcional, inativar com motivo. Custo
declarado: é uma tela nova fora do `ClienteFormDialog`/`FornecedorFormDialog`, com rota própria,
entrada no menu (3 edições — union, `routePermissions.ts`, `AppMenu.tsx`) e feature própria
(`features/pessoas/` ou `features/classificacoes-pessoa/`, decisão de plataforma/design). Abro mão
de "menor diff possível nesta versão" em troca de não entregar um seletor decorativo: sem CRUD, no
dia 1 de produção o dropdown de `classificacaoId` está vazio, o operador não tem como criar uma
classificação, e a única saída é pedir para alguém inserir direto no banco — o mesmo caminho manual
que já existe hoje, só que atrás de uma tela que finge ter resolvido o problema. Isso é aceitável
**se** `classificacaoId` ficar de fora desta fatia até o CRUD existir (adiar o campo é honesto);
não é aceitável entregar o seletor sem o CRUD e sem avisar que ele nasce vazio.

**Em D-E — guarda de permissão dos catálogos: replico o padrão de campo escopado da D61, com uma
ressalva que D61 não tinha.** Em D61 (`unidadeTributavelSigla`), o valor gravado é uma **sigla**
(string legível por si só) — sem a permissão de catálogo, a tela ainda mostra o valor certo via
opção sintética. Aqui os três campos de Cliente (`tabelaPrecoPadraoId`, `condicaoPagamentoPadraoId`,
`classificacaoId`) e o de Fornecedor (`condicaoPagamentoPadraoId`) são **Guids opacos** — sem a
permissão do catálogo correspondente (`TABELAS_PRECO_CONSULTAR`/`FINANCEIRO_CONSULTAR`/`PESSOAS_CONSULTAR`),
não há como resolver um rótulo legível para um valor já gravado, porque `ClienteResponse`/
`FornecedorResponse` só trazem o Id, nunca o nome do catálogo embutido (inventário §1, records
citados). Abro mão de "sempre mostrar o valor gravado" nesse caso específico: quando a permissão de
catálogo falta, o campo deve mostrar um texto neutro ("Configurado — sem permissão para exibir o
nome") em vez do Guid cru ou de um rótulo inventado. Mostrar o Guid violaria o mesmo princípio que
proíbe digitá-lo; inventar um rótulo sem dado seria pior. Isso é diferente de D61 e precisa ser
registrado como tal, não copiado sem ajuste.

**Em D-F — uma versão só para Cliente + Fornecedor, sem bloquear `b66` (Estoque) por ela.** Nenhum
achado desta rodada (nem o de módulo vizinho em Compras) é um bloqueio duro — Vendas não depende
(confirmado, §4), Compras não impõe a regra no backend (§4), Estoque não tem relação nenhuma. As
duas rotinas (Cliente e Fornecedor) têm a mesma forma de mudança (bloco de substituição atômica +
ação de estado com motivo) e o mesmo tamanho de risco — não vejo razão operacional para pagar dois
ciclos de QA/release por algo que se testa junto. Abro mão de entregar qualquer um dos dois mais
cedo isoladamente; aceitável **se** nem escopo nem plataforma apontarem um motivo técnico (tamanho
de diff, gate) para separar — não é uma posição que a operação precise defender sozinha.

---

## 6. Perguntas externas

1. **(backend, D-C)** `situacao-compra` é deliberadamente consultivo (nunca vai bloquear a criação
   de pedido de compra), ou a regra de recusa por parâmetro (`COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`)
   está prevista para migrar para dentro do use case de criação do pedido? Decide: se a tela de
   Compras precisa só de um aviso informativo ou de um bloqueio real de submissão, e se este
   recorte de Cliente/Fornecedor precisa antecipar a leitura de `situacao-compra` em
   `PedidoCompraFormDialog` (fora do recorte, mas destravado por ele).
2. **(cliente/produto, D-D)** A tela de CRUD de Classificação de Pessoa entra como prerequisito
   desta fatia, como fatia irmã na mesma versão, ou fica para depois com `classificacaoId` adiado
   (fora da tela até então)? Decide: se o seletor de classificação nasce populável ou nasce vazio.
3. **(backend, D-E)** Existe algum endpoint que resolva rótulo em lote a partir de uma lista de
   Ids de Tabela de Preço/Condição de Pagamento/Classificação sem exigir a permissão de listagem
   completa do catálogo (ex.: um "resolver por Id" com permissão própria mais larga), ou a única
   via é a mesma permissão de consulta do catálogo inteiro? Decide: se o caso "tem
   `CLIENTES_GERENCIAR` mas não tem a permissão do catálogo" consegue ver o nome do valor já
   configurado, ou só o texto neutro proposto em D-E.
4. **(cliente, D-A)** Comercial (que configura tabela de preço/condição/crédito do cliente) e
   cadastro (que cria/edita o registro básico) são a mesma pessoa na operação real, ou papéis
   diferentes que abrem a tela em momentos distintos? Decide: se o bloco comercial deve mesmo
   viver dentro do mesmo diálogo de criação/edição (D-A) ou se um diálogo separado, aberto por ação
   de linha e reaberto quando o comercial for cuidar disso depois, serve melhor à rotina real —
   inverte o custo declarado em D-A se a resposta for "papéis diferentes, momentos diferentes".
5. **(backend, D-A)** O `PUT .../configuracao-comercial`/`.../configuracao-compra`, chamado logo
   depois de um `POST` de criação bem-sucedido, tem alguma condição de corrida ou dependência de
   consistência (ex.: precisa que a transação do `POST` já tenha commitado) que a UI precise
   respeitar com um `await` explícito antes do segundo `PUT`, ou os dois endpoints já são seguros
   para chamada sequencial imediata? Decide: se o padrão de mutação sequencial (D-A) precisa de
   tratamento especial de timing.

---

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "arquitetura",
  "assunto": "cliente-fornecedor-comercial",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/08-operacao-cliente-fornecedor.md",
  "decisoesPropostas": [
    { "id": "D-A", "titulo": "Configuração comercial/compra entra como bloco novo dentro dos diálogos existentes (ClienteFormDialog, FornecedorFormDialog), com PUT sequencial após o POST/PUT de criação/edição — não diálogo separado por ação de linha", "reversivel": true, "gatilho": "resposta de P4 (papel diferente/momento diferente na operação real) ou P5 (condição de corrida no backend)" },
    { "id": "D-B", "titulo": "Homologar (sem motivo) e Revogar homologação (motivo obrigatório) como duas ações de linha mutuamente exclusivas em FornecedoresPage, reaproveitando ReasonDialog no padrão de bloquear/desbloquear crédito", "reversivel": true, "gatilho": "nenhum — sem custo, réplica direta de padrão em produção" },
    { "id": "D-C", "titulo": "situacao-compra entra como leitura informativa (motivo do backend exibido como aviso), nunca como bloqueio de submissão no frontend, porque o backend hoje não recusa a criação de pedido de compra para fornecedor não apto", "reversivel": true, "gatilho": "resposta de P1 — se o backend mover a regra para dentro da criação do pedido de compra" },
    { "id": "D-D", "titulo": "classificacaoId só entra com seletor por busca se a tela de CRUD de Classificação de Pessoa (código/nome/descrição/inativar, backend já pronto) entrar junto ou antes; sem o CRUD, o campo fica fora da fatia", "reversivel": true, "gatilho": "resposta de P2 — decisão de bundling do CRUD de Classificação de Pessoa" },
    { "id": "D-E", "titulo": "Guarda de permissão por campo (padrão D61) para os quatro seletores de catálogo, com ajuste: sem a permissão do catálogo, mostrar texto neutro em vez do valor gravado, porque os quatro campos são Guids opacos (não siglas legíveis como no caso da D61)", "reversivel": true, "gatilho": "resposta de P3 — existência de endpoint de resolução de rótulo sem a permissão completa do catálogo" },
    { "id": "D-F", "titulo": "Uma versão só para Cliente + Fornecedor, sem bloquear b66 (Estoque); Classificação de Pessoa pode ser fatia irmã na mesma janela", "reversivel": true, "gatilho": "escopo/plataforma apontarem restrição de tamanho de diff que justifique dividir" }
  ],
  "discordancias": [
    { "com": "arquiteto-escopo-entrega", "ponto": "se D-D (CRUD de Classificação de Pessoa como prerequisito) for cortado por tamanho, discordo de entregar classificacaoId como seletor apontando para catálogo vazio sem via de populamento — nesse caso defendo adiar o campo inteiro, não simular capacidade que não fecha o trabalho do operador" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "situacao-compra é deliberadamente consultivo ou a regra de recusa por parâmetro está prevista para migrar para dentro da criação do pedido de compra?", "decide": "D-C — aviso informativo vs. bloqueio real, e se PedidoCompraFormDialog precisa mudar fora deste recorte" },
    { "tipo": "funcional", "pergunta": "A tela de CRUD de Classificação de Pessoa entra como prerequisito, fatia irmã, ou classificacaoId fica fora até então?", "decide": "D-D — se o seletor nasce populável" },
    { "tipo": "backend", "pergunta": "Existe endpoint de resolução de rótulo em lote por Id que não exija a permissão completa do catálogo (tabela de preço/condição/classificação)?", "decide": "D-E — se o valor gravado aparece com nome ou com texto neutro quando falta a permissão do catálogo" },
    { "tipo": "funcional", "pergunta": "Comercial/crédito e cadastro de cliente são o mesmo papel operacional, no mesmo momento, ou papéis/momentos diferentes?", "decide": "D-A — se o bloco comercial deve viver no mesmo diálogo de criação/edição ou em diálogo separado por ação de linha" },
    { "tipo": "backend", "pergunta": "O PUT de configuração comercial/compra, chamado logo após o POST de criação, tem alguma condição de corrida que a UI precise respeitar?", "decide": "D-A — se a mutação sequencial precisa de tratamento especial de timing" }
  ],
  "riscos": [
    "PedidoCompraFormDialog.tsx (Compras, módulo vizinho já em produção) escolhe fornecedor sem checar homologado nem situacao-compra, e o backend não recusa a criação do pedido para fornecedor não apto — este recorte cria o estado homologado sem que ele produza efeito nenhum em Compras até alguém decidir (P1) se a regra deveria bloquear.",
    "Bloco de substituição atômica (configuracao-comercial, configuracao-compra) reenviado por um formulário que só carrega os cinco/três campos ao abrir 'Editar' tem o mesmo risco de classe já pago em b64.c7 (Salvar do rodapé descartando bloco não visitado) — se o prefill falhar silenciosamente, o próximo Salvar apaga valores gravados sem aviso.",
    "Mutação sequencial (criar cadastro, depois PUT do bloco comercial com o Id retornado) introduz um caminho de erro parcial que nenhum diálogo do módulo trata hoje — cadastro criado, bloco comercial não salvo, toast genérico não distingue os dois.",
    "classificacaoId referencia um catálogo com CRUD pronto no backend mas sem nenhuma tela no frontend — se a fatia entregar o seletor sem o CRUD (por corte de escopo), o campo nasce inutilizável na prática (dropdown vazio, sem via de criação pela UI).",
    "Os quatro seletores de catálogo (tabela de preço, condição de pagamento x2, classificação) gravam Guids opacos — sem a permissão do catálogo correspondente, não há como resolver rótulo legível para um valor já configurado; D-E propõe texto neutro, mas isso não foi confirmado contra nenhum endpoint de resolução alternativa (pendência P3)."
  ]
}
```
