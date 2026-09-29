# Posição — `arquiteto-design-system` · Rodada 12 · `compra-financeiro`

Lidos por completo antes desta posição: `docs/arquitetura/debate/12-inventario-compra-financeiro.md`
(fonte principal), `docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (seção `b70`, tabela "Fora de escopo com
gatilho", B-4/B-12/B-15/B-16), `docs/arquitetura/DECISOES.md` (D77–D83, precedente de método da
rodada 11), `docs/arquitetura/debate/11-design-venda.md` (formato e precedentes reaproveitados nesta
posição: `enabled` condicional, indicador compacto em vez de coluna, remoção de permissão órfã).
Código lido por completo: `features/financeiro/components/{ContasFinanceirasPage,
ContaFinanceiraFormDialog,FinanceiroActionDialogs,financeiroUiUtils}.tsx/.ts`,
`features/financeiro/hooks/useFinanceiroOriginOptions.ts`,
`features/financeiro-avancado/components/ContasAvancadoTab.tsx`,
`features/compras/components/{PedidoCompraDetalhePage,comprasUiUtils}.tsx/.ts`,
`components/common/{AuditInfoPanel,StatusHistoryPanel,OperationalGovernancePanel}.tsx`,
`layout/AppMenu.tsx`, `lib/security/routePermissions.ts`, `features/seguranca/permissoesCatalogo.ts`,
`types/erp.ts` (trechos de permissão e `OrigemFinanceira`). Não abri `preview_start`: as telas em
disputa (Contas a Pagar/Receber, Financeiro avançado, Pedido de Compra) já estão em produção e o
próprio inventário já mediu o estado real por leitura pareada de contrato (C# × TypeScript × uso na
tela) nas duas pontas — a pergunta desta rodada não é "a tela quebra", é "o que ela deveria mostrar
e ainda não mostra", que se responde por grep de padrão existente, não por navegação. Se alguém
precisar confirmar visualmente o estado dos formulários citados, as rotas sobem normalmente em
`logosoft-dev`.

---

## Q1 — CF-4: não existe reversão de recebimento; a tela fecha o ciclo honestamente dentro do card que já existe, sem inventar botão

**Não há onde pendurar um "reverter recebimento" no template, porque o backend não tem o endpoint
(CF-4, zero resultado de grep em `Erp.Application/Compras` e `Erp.Api/Controllers/Compras`).**
Desenhar um botão "Reverter recebimento" desabilitado com tooltip seria pior que não desenhar nada:
prometeria uma capacidade que nenhuma versão futura vai destravar sem mudança de domínio, e o
padrão de "ação indisponível com motivo" desta skill existe para ações que o backend recusa por
regra de negócio (status, permissão, saldo) — não para ações que **não existem em nenhuma forma**.

**O que entra, e onde**: `PedidoCompraDetalhePage.tsx:242-249` já tem o card "Impacto em estoque e
financeiro" com três blocos de texto fixo explicando Estoque/Financeiro/Tolerância — a mesma classe
de informação que "reversão" precisa. Proponho um **quarto bloco, mesmo padrão visual**
(`border-1 surface-border border-round p-3`, sem componente novo): "Reversão — Um recebimento
registrado não pode ser desfeito. Para corrigir quantidade ou item errado, registre um novo
recebimento complementar; a única reversão possível no fluxo é o estorno do pagamento da conta a
pagar gerada, que não desfaz a entrada de estoque nem a quantidade recebida." Isto é a leitura
direta do que CF-4 já provou (três fontes: domínio de `PedidoCompra.Cancelar`, `ContaPagar.Cancelar`,
ausência de endpoint), não uma frase de marketing esperando confirmação.

**O financeiro básico já tem o único ponto de reversão real, e já tem forma**:
`EstornoFinanceiroDialog` (`FinanceiroActionDialogs.tsx`, usado em `ContasFinanceirasPage.tsx:118`)
já existe, já lista baixas e exige motivo. Nenhuma mudança de forma aqui — o gap não é de UI, é de
escopo do que o estorno cobre (não desfaz estoque), e isso é exatamente o texto que o quarto bloco
acima precisa deixar claro para quem confunde "estornei o pagamento" com "desfiz o recebimento".

**Régua de três**: fica local a `PedidoCompraDetalhePage.tsx` (extensão de um card que já existe,
não componente novo). Um caso.

**Pergunta que sobe ao backend, sem alternativa de template**: se "reversão explícitas" no título da
`b70` é para valer no lado de Compras, alguém precisa decidir se um recebimento errado se corrige por
complementar (modelo atual, sem mudança) ou por endpoint de estorno (mudança de domínio, fora do
alcance de qualquer arquiteto de frontend). Subscrevo a pendência 1 do inventário sem alteração —
isto não é uma decisão de template, é uma decisão de produto/backend que o template só pode
**declarar com honestidade**, nunca simular.

---

## Q2 — Origem visível: rótulo (já existe, com lacuna de enum), link ao documento (convenção que já existe duas vezes, aplicada pela terceira), filtro (linha nova no dropdown que já existe

**Rótulo — módulo básico**: já existe. `ContasFinanceirasPage.tsx` tem `<Column header="Origem"
body={(row) => origemFinanceiraLabel(Number(row.origem))} />` na listagem. O defeito não é de
template, é de contrato (CF-2: enum com 6 de 8 valores) — a correção é acrescentar
`OrdemServico`/`Frota` a `origemFinanceiraOptions` (`financeiroUiUtils.ts:5-12`) e ao union
`types/erp.ts:94-101`, **condicionada à resposta de backend** (pendência 2 do inventário: os dois
valores têm gerador conhecido hoje?). Não é decisão de template — é dado que falta.

**Rótulo — módulo avançado (CF-3)**: aqui sim falta forma. `ContasAvancadoTab.tsx` não exibe
`origemModulo`/`origemId` em nenhum lugar — nem na tabela (`Column` de `descricao`, `Valor`,
`Saldo`, `Vencimento`, `Status`, `Ações`, seis colunas, nenhuma de origem), nem no card de detalhe da
conta (bloco `Tag` de status + texto de saldo, sem seção de origem). Proponho **uma linha no card de
detalhe**, no mesmo padrão dos outros dados (`<span className="text-color-secondary">` + valor),
mostrando o `origemModulo` cru como texto (não invento tradução de enum: `OrigemModulo` é
`string?` livre no backend, sem catálogo documentado — B-3, ainda pendente segundo o próprio plano).
Isto é honestidade de tela: mostrar o que o backend manda, sem fingir que existe um catálogo fechado
que ainda não foi definido.

**Link ao documento de origem — a régua de três já bateu, é a terceira aplicação de uma convenção
existente, não um componente novo**. Busquei o padrão (`grep -n "router.push(\`/.*\${.*Id}\`)" ` em
diálogos/detalhes de outros módulos) e achei dois casos já em produção: `FaturamentoDetalhePage.tsx:133`
(`<Button label="Abrir nota fiscal" ... onClick={() => router.push(\`/fiscal/notas/${faturamento.notaFiscalId}\`)} />`,
condicionado a `faturamento.notaFiscalId` existir) e `ObservabilidadeFiscalPage.tsx:359` (mesmo
padrão, `Column` de log linkando para a nota fiscal por `notaFiscalId`). **Dois casos = observação,
mas a convenção em si (Button texto + ícone + `router.push` condicionado à presença do id) já é
consistente o bastante para reaplicar sem inventar nada novo** — não é um componente a extrair
(`Button` puro do Prime já resolve; não há lógica reutilizável além de "se o id existe, aponte para a
rota"), é o mesmo padrão de código que qualquer tela já escreve. Aplico como **terceira instância**:
em Contas a Pagar/Receber (básico), quando `origem = PedidoVenda` e `origemId` existe (o único caso
com busca de referência resolvida hoje, `useFinanceiroOriginOptions`), a linha da tabela ou o
detalhe ganha um botão "Abrir pedido de venda" apontando para `/vendas/pedidos/${origemId}`. Para as
demais origens (`Compra`, `NotaFiscal`, `Contrato`, `AjusteAutorizado`, `OrdemServico`, `Frota`), o
link **não entra nesta rodada** — não há rota de destino confirmada para todas (`Compra` teria
`/compras/pedidos/${origemId}` se o `OrigemId` gravado for de fato o pedido, o que não foi
verificado nesta sessão), e eu não vou inventar destino sem confirmar contra o backend que
`ContaPagar.OrigemId` de origem `Compra` é sempre um `PedidoCompraId`. **Fica como
`needs_decision`/pendência**: confirmar o destino de cada origem antes de generalizar o link — abrir
só o caso já confirmado (`PedidoVenda`) e documentar os demais como "sem link até confirmar
destino", em vez de arriscar um `router.push` para uma rota errada.

**Filtro por origem**: `ContasFinanceirasPage.tsx` já tem `Dropdown` de Status ao lado de
`EmpresaFilialFilter` na `actions` do `PageHeader`. Acrescento um segundo `Dropdown`, mesmo padrão
visual (`className="w-full lg:w-10rem"`, `showClear`), usando `origemFinanceiraOptions` já existente
— zero componente novo, é a mesma receita repetida (Status já faz isto). No avançado, mesma extensão
ao bloco de filtros de `ContasAvancadoTab.tsx:66-70` — mas como `origemModulo` é string livre sem
catálogo fechado (B-3), o filtro vira um campo de busca textual simples (`InputText` com debounce, se
o backend aceitar filtro por `origemModulo`) em vez de `Dropdown` de opções fixas — **não verificado
se o endpoint de listagem avançado aceita esse filtro**; fica pendência técnica, não de forma.

**Régua de três consolidada**: rótulo por coluna/linha — reaproveita padrão existente (0 caso novo);
link ao documento de origem — terceira instância da mesma convenção, aplicada só ao caso confirmado;
filtro — reaproveita o padrão de `Dropdown` que Status já usa. Nenhuma peça desta pergunta justifica
componente novo em `components/`.

---

## Q3 — CF-1: o custo de restringir é quase zero (mesma linha que Pagar já usa); o custo de não restringir é described honestamente pela UI, mas não fecha o buraco de contrato

**A tela já é parcialmente honesta hoje**: `ContaFinanceiraFormDialog.tsx:113,142`
(`unsupportedOriginReference`) já mostra um `Message` avisando que a origem escolhida "ainda não
possui busca de referência" e que a conta "será enviada sem vínculo técnico de origem" — isto não é
uma tela mentindo silenciosamente, é uma tela avisando e deixando o operador prosseguir mesmo assim.
O problema que CF-1 registra é mais fundo que UI: o **backend não recusa** essa combinação (falta a
validação D7-equivalente em `CriarContaReceberUseCase`), então mesmo com o aviso, o dado nasce
"Origem = Contrato" sem vínculo real e fica assim para sempre.

**Duas opções de template, custo de cada uma**:
- **Restringir a `Manual` (e `PedidoVenda`, que já tem busca funcional), como Pagar já faz** — custo
  de forma: **uma linha**. `financialOriginOptions` (`ContaFinanceiraFormDialog.tsx:57-63`) já tem o
  filtro condicional por `type`; trocar a condição de "tudo exceto `Compra`" para "`Manual` ou
  `PedidoVenda`" no `type === 'receber'` é o mesmo padrão de código que já existe para `type ===
  'pagar'`. Fecha a divergência entre os dois lados do dropdown sem esperar o backend — o operador
  simplesmente deixa de conseguir escolher as três origens sem vínculo real pela tela, embora o
  backend continue aceitando por API direta.
- **Manter as 3 origens sem vínculo, esperando confirmação de produto (é capacidade desejada, ex.
  migração de saldo antigo)** — custo de forma: zero, é o estado atual. Custo de honestidade: o
  `Message` já existe, mas ele **avisa e permite prosseguir**; não é "ação indisponível com motivo"
  (que bloquearia o envio), é "aviso e segue" — categoria diferente, e mais fraca, do piso de UX
  desta skill. Se o produto confirmar que é capacidade desejada, o `Message` atual já é suficiente
  como forma. Se não confirmar, restringir é a correção de piso.

**Minha recomendação de template, sem decidir por produto**: como o custo de restringir é uma linha
e reaproveita 100% o padrão que Pagar já usa (nenhum risco de regressão visual, nenhum componente
novo), **eu proponho restringir por padrão e reverter se o produto confirmar a necessidade de
migração** — é mais barato manter o padrão simétrico entre Pagar e Receber por uma versão e depois
abrir de volta (uma linha) do que manter os dois módulos com o mesmo formulário se comportando
diferente sem explicação visível na tela sobre o motivo da assimetria. Isto é `needs_decision` de
produto (pendência 3 do inventário), mas registro que a resposta de template não espera o backend: a
UI pode ficar honesta com o que hoje é seguro (`Manual`/`PedidoVenda`) independente de quando o
backend fechar a validação D7-equivalente.

---

## Q4 — Caminhos de compra: `CotacaoCompraId` é dado ausente, não forma ausente; `ItensLocalEstoque` tem forma pronta para reaproveitar se o backend confirmar

**CF-5 (`CotacaoCompraId` nunca chega ao DTO do Pedido)**: não há nada que o template resolva aqui.
`PedidoCompraResponse` do backend não inclui o campo — não é "a tela não mostra", é "o dado nunca
sai do servidor neste endpoint" (o inventário já separa essa diferença corretamente). Fica 100%
como pendência de backend (pergunta 4 do inventário, subscrita sem alteração). Quando o campo
existir, o padrão de exibição já tem precedente pronto para reaproveitar: mesmo botão "Abrir
documento de origem" da Q2 (`router.push('/compras/cotacoes/${pedido.cotacaoCompraId}')`,
condicionado à presença do campo) — terceira/quarta instância da mesma convenção, sem desenho novo.

**CF-6 (`ItensLocalEstoque` aceito pelo backend, nunca enviado pela UI no diálogo de aprovar
cotação)**: aqui **existe forma pronta para copiar, não é decisão nova de template**. O diálogo de
item de Pedido de Compra (`PedidoCompraItemDialog.tsx`, usado em `PedidoCompraDetalhePage.tsx`) já
resolve "local de estoque por item" com `EntitySelect` (mesmo padrão usado em toda seleção de
entidade do repositório). `AprovarCotacaoDialog` (`CotacaoDialogs.tsx:93-100`) precisaria de um
`EntitySelect` de local de estoque **por item da cotação**, no mesmo padrão — não invento select
novo, é a segunda instância do mesmo campo já usado no módulo irmão. **Isto só entra se o backend
confirmar que quer o campo preenchido nesta rodada** (pergunta 4 do inventário) — não é decisão de
template decidir se o campo é obrigatório ou opcional na aprovação; é decisão de template dizer que,
se entrar, a forma já existe e custa reaproveitar um componente, não inventar um.

**Régua de três**: `EntitySelect` de local de estoque já é usado em pelo menos dois pontos
(`PedidoCompraItemDialog`, e presumo em outros módulos de estoque/movimento — não recontei aqui
porque já é claramente >2, é o padrão canônico de vínculo de entidade do repositório). Nenhuma
proposta nova de componente; reaproveitamento direto.

---

## Q5 — CF-7: entra como indicador compacto condicional, não como cinco colunas novas — mesma régua de densidade que Q7 da rodada 11 já aplicou a Vendas

**A tabela de itens do Pedido de Compra já tem 7 colunas** (`PedidoCompraDetalhePage.tsx:236-241`:
Produto, Local, Qtd., Unitário, Desconto, Total, Ações) — a mesma densidade que a rodada 11 já
julgou no limite para uma tabela escaneada rapidamente durante montagem de pedido. Acrescentar
`sequencia`, `quantidadeRecebida`, `quantidadePendente`, `valorBruto` e `status` como cinco colunas
extras dobraria a largura da tabela para um dado que só importa **depois** que o pedido sai de
Rascunho/Aguardando aprovação.

**Proposta de template**: `quantidadeRecebida`/`quantidadePendente`/`status` do item entram como um
**indicador compacto condicional**, visível só quando `pedido.statusPedido` é
`ParcialmenteRecebido` ou `Recebido` (os dois únicos estados em que a informação tem sentido) —
substitui ou acompanha a coluna "Qtd." existente com um texto pequeno abaixo do número
(`<span className="text-sm text-600">5 de 10 recebido</span>`, mesmo padrão de `<small>` de apoio já
usado nos formulários deste módulo) ou um `Tag` compacto de status do item
(`Pendente`/`Parcial`/`Recebido`/`Cancelado`, cores de `StatusTag` já existente). Não abre coluna
nova; enriquece a célula que já existe. `sequencia` e `valorBruto` **não entram** — mesmo padrão já
registrado pela rodada 11 e pela rodada 10 para os campos de auditoria fina que o backend entrega e
ninguém precisa ler em tela de operação (`sequencia` ordena no backend; `valorBruto` é o valor antes
de desconto, já calculável a partir de `valorUnitario * quantidade`, que a tela já mostra).

**Onde este padrão de "indicador condicional em vez de coluna" já existe**: é a mesma decisão que
`arquiteto-design-system` tomou na Q7 da rodada 11 para `reservaEstoqueId` de item de Pedido de
Venda — ali ficou com gatilho, aqui entra porque a `b70` tem "recebimento parcial" como parte central
do próprio título da rodada ("reversão explícitas" pressupõe visibilidade de progresso, mesmo que a
reversão em si não exista). **Régua de três**: primeira aplicação real do indicador condicional (a
de Vendas ficou com gatilho, não foi implementada) — fica como padrão local ao módulo de Compras por
ora; se Vendas precisar do mesmo indicador depois (quando `reservaEstoqueId` for cobrado), aí são
dois casos, ainda observação, não abstração.

**Custo de forma**: baixo. `ItemPedidoCompraResponse` (frontend) ganha os campos que o backend já
entrega (é edição de tipo, não decisão de template), e a célula "Qtd." ganha uma linha de apoio
condicional. Nenhum componente novo.

---

## Q6 — Título de venda: a tela já existe, e já está no módulo certo (Financeiro básico, não Faturamento)

**Não é pergunta em aberto de forma — já tem resposta no código.** `GerarContaReceberPedidoDialog`
(`FinanceiroActionDialogs.tsx:124-150`, acionado pelo botão "Gerar por pedido" em
`ContasFinanceirasPage.tsx:117`, exclusivo de `type === 'receber'`) já resolve exatamente
`GerarContaReceberDePedidoVendaUseCase`: seleciona empresa/filial, depois o pedido de venda por
`EntitySelect` com rótulo operacional (`numero • valorTotal`, nunca GUID digitado), condição de
pagamento, documento e data do primeiro vencimento. **Isto já é o padrão de vínculo de entidade que
esta skill exige** — nenhuma correção de forma pendente.

**Pertence a `b70` (Financeiro básico) ou `b71` (Faturamento)? Nem uma nem outra — já está em
produção, fora do escopo de decisão desta rodada.** A tela roda hoje dentro do módulo
`features/financeiro/`, não dentro de `features/faturamento/`. O gerador de conta a receber é um
recurso do Financeiro que consome pedidos de venda faturados, e o Faturamento (`b71`, D67) trata da
emissão fiscal em si (`naturezaOperacaoId`, CFOP, certificado) — são capacidades adjacentes, não a
mesma tela. **Não hạ decisão de template a tomar aqui**; devolvo isso como constatação, não como
`needs_decision`.

---

## Q7 — CF-9: mesmo `accessRisk` da D81, e a diferença que o briefing pede está medida — zero uso hoje, igual à D81

**Medição, não intuição**: `grep -n "CAIXA\|BANCO" layout/AppMenu.tsx lib/security/routePermissions.ts`
não retorna nenhuma ocorrência de `FINANCEIRO_CAIXA_GERENCIAR`/`FINANCEIRO_BANCO_GERENCIAR` (as
strings encontradas são de permissões homônimas de outros módulos — `PDV_CAIXA_GERENCIAR`,
`BANCOS_GERENCIAR`/`BANCOS_CONSULTAR` — famílias de permissão diferentes, não as mesmas
constantes). `grep -rn "FINANCEIRO_CAIXA_GERENCIAR\|FINANCEIRO_BANCO_GERENCIAR"` em todo o repositório
(exceto `node_modules`) só retorna dois arquivos: `features/seguranca/permissoesCatalogo.ts:93-94`
(entrada de catálogo) e `types/erp.ts:294-295` (union). **Nenhum `PermissionGuard`, nenhuma regra de
`routePermissions.ts`, nenhum item de `AppMenu.tsx` usa as duas constantes.** É exatamente o mesmo
resultado que a D81 mediu para `VENDAS_PRECO_MINIMO_SOBRESCREVER`/`POLITICA_COMERCIAL_GERENCIAR` —
o briefing pede para eu confirmar se este caso "difere" da D81 porque talvez alguma tela use as
permissões, e a medição confirma que **não difere**: mesmo padrão, mesmo tratamento.

**`accessRisk = ilusão de clicar`.** Remover as duas do union e do catálogo não tira capacidade real
de ninguém (nenhum endpoint as amarra), e o backend já documenta a remoção deliberada
(`PermissoesCatalogoDefinition.cs:158-161`, D3/v1.21.3/G1). Mesma posição de template que a D81:
nenhuma mudança visual na tela de grupos de acesso (lista dinamicamente a partir do catálogo).

**Dívida se não for feito**: mesma classificação da D81 — não é padrão de tela divergindo entre
módulos, é tempo: cada versão que passar sem a remoção mantém duas entradas mortas que um
administrador pode marcar acreditando que fazem algo. Não consigo medir quantos grupos já marcaram
as duas (sem acesso ao banco de grupos) — não verificado, registrado como tal.

---

## Q8 — Gate de campos: estender aos records de Compra/Financeiro é a mesma decisão que a D83 já tomou para Vendas; CF-10 é dívida documental, não visual

**Recomendo estender `scripts/gate-contract-fields.mjs`/o snapshot da D83 a `PedidoCompraResponse`,
`ItemPedidoCompraResponse`, `ContaPagarResponse`/`ContaReceberResponse` e
`ContaFinanceiraResponse`/`ContaFinanceiraResumoResponse` (avançado)** — pela mesma lógica que
justificou a D83 para `TabelaPrecoItemResponse`/`ItemPedidoVendaResponse`: o inventário já encontrou
divergência de anulabilidade real (`localEstoqueId`, CF-6) e campos entregues e não declarados
(CF-7, cinco campos) nesta mesma rodada — é a mesma classe de defeito, no mesmo tipo de arquivo, que
motivou o gate a existir. **Isto não é decisão minha de forma final** (o formato do gate e do
snapshot é do `arquiteto-plataforma-frontend`/`dev-senior-react`), é constatação de que recusar
estender, depois de a D83 já ter criado o mecanismo, seria aceitar que a mesma classe de bug volte a
acontecer sem rede de segurança no terceiro módulo seguido (Estoque → Vendas → Compra/Financeiro).

**CF-10 (allowlist desatualizado) não é dívida de template.** É documento de auditoria descrevendo
como abertas seis rotas que o código atual já corrigiu — não bloqueia gate (`audit-only-no-
suppressions`), não afeta nenhuma tela, não é decisão de UI. Registro como "sim, vale corrigir", mas
não é meu produto: é limpeza de artefato gerado/versionado, fora da minha fronteira (não edito
`scripts/`).

---

## Q9 — Fatiamento: uma `b70` só, do ângulo de template — nenhuma peça decidida aqui abre rota, item de menu ou componente compartilhado novo

Do ângulo de template, todas as peças que decidi (Q1 quarto bloco de card existente, Q2 rótulo +
link de terceira instância + filtro reaproveitado, Q3 uma linha de filtro condicional, Q4
reaproveitamento de `EntitySelect` já usado no módulo, Q5 indicador condicional em vez de coluna, Q6
já pronto, Q7 remoção de duas entradas de catálogo, Q8 extensão de gate já existente) são de baixo
custo de forma — nenhuma abre rota nova, nenhuma cria item de menu, nenhuma justifica componente
compartilhado. A única peça que depende de decisão de backend antes de qualquer forma (Q1/CF-4, se
"reversão" ganha um endpoint) é a única que poderia mudar o tamanho do recorte — mas mesmo nesse
cenário, a resposta de template ("não existe hoje, a tela diz isso") já fecha a `b70` independente
de quando a resposta de backend chegar; se o endpoint vier depois, é um bloco adicional, não uma
razão para atrasar o resto. **Não vejo motivo de template para dividir `b70` em duas versões.** A
ordem de calendário (o que entra primeiro dentro do mesmo lote) é do `arquiteto-escopo-entrega`.

---

## Estados e regras de UX que são piso nesta rodada

| Elemento | `loading` | `vazio` | `erro recuperável` | `erro bloqueante` | `sucesso` | `permissão negada` | `ação indisponível com motivo` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pedido de compra, card "Impacto em estoque e financeiro" (Q1) | n/a | n/a | n/a | n/a | n/a | n/a | **entra**: quarto bloco fixo explicando os limites reais de reversão (nunca existe botão de reverter recebimento — a ausência do botão em si já é o piso "não simular capacidade que não existe") |
| Contas a Pagar/Receber, lista (Q2) | já existe | já existe (`EmptyState`, não verificado nesta sessão, herdado do padrão do módulo) | já existe (`ApiErrorPanel`) | não verificado | já existe (toast) | já existe (`UnauthorizedState`, herdado) | n/a |
| `ContaFinanceiraFormDialog`, origem (Q2/Q3) | já existe (`loading` no botão) | n/a | `Message` de aviso já existe para origem sem busca de referência (`unsupportedOriginReference`) | n/a | já existe (toast na página) | n/a | **entra, se Q3 restringir**: dropdown de Receber passa a listar só as origens com vínculo real, mesmo padrão do `Message` explicativo que Pagar já usa |
| Financeiro avançado, card de conta (Q2/CF-3) | já existe | n/a | já existe | não verificado | já existe (toast) | herdado da página | n/a — `origemModulo` passa de "sem uso" para exibido, sem mudar estado de ação |
| Pedido de compra, itens — indicador de progresso (Q5) | herdado da tabela (`loading` já existe) | `EmptyState` já existe ("Pedido sem itens") | n/a (não é uma mutação própria) | n/a | n/a | n/a | n/a — indicador é só leitura condicional, não ação |
| `AprovarCotacaoDialog`, local de estoque por item (Q4/CF-6, condicionado a confirmação de backend) | herda `loading` do diálogo | n/a | precisa de `ApiErrorPanel` se o backend recusar algum item — **não verificado se o diálogo atual já tem**, checar antes de implementar | não verificado | herda toast | herda guard `COMPRAS_COTACOES_APROVAR`/equivalente | n/a |

Nenhuma linha é opcional para quem implementar: o quarto bloco de Q1 em particular é a diferença
entre a tela "parecer completa" e a tela dizer a verdade sobre o que "reversão explícita" significa
hoje no fluxo de compra — que é quase nada, e a tela precisa admitir isso em vez de deixar o
operador descobrir por tentativa e erro.

---

## Dívida visual — resumo

**Fecha:** `origemModulo`/`origemId` deixam de ser dado capturado e nunca mostrado no Financeiro
avançado (CF-3). Duas permissões deixam de ser atribuíveis sem efeito real (CF-9, mesmo padrão da
D81). A ambiguidade entre "origem visível" e "origem verdadeira" em Contas a Receber fica pelo menos
mais honesta (Q3, independente de qual das duas opções o produto escolher — hoje o aviso já existe,
mas fica mais forte se a restrição entrar). O ciclo de "motivo digitado e nunca mais visto" não se
repete aqui como se repetiu em Vendas (rodada 11) — `EstornoFinanceiroDialog`/`ReasonDialog` já
capturam e a tela de detalhe avançado já lista `motivoEstorno` como coluna (`ContasAvancadoTab.tsx`,
linha `Column field="motivoEstorno"`), então não há regressão a corrigir aqui.

**Cria, se aceito como proposto:** zero componente novo em `components/`. Todas as correções ficam
dentro de arquivos de módulo já existentes (`ContasFinanceirasPage.tsx`, `ContaFinanceiraFormDialog.tsx`,
`ContasAvancadoTab.tsx`, `PedidoCompraDetalhePage.tsx`, `CotacaoDialogs.tsx` se Q4/CF-6 entrar). O
"link ao documento de origem" (Q2) é a **terceira** instância de uma convenção já usada duas vezes
(Faturamento→Nota Fiscal, Observabilidade→Nota Fiscal) — não vira componente compartilhado ainda
(regra de forma simples demais para justificar abstração: `Button` + `router.push` condicionado),
mas registro que se um **quarto** módulo replicar o mesmo padrão (por exemplo Estoque linkando para
o documento que gerou um movimento), a régua de três estará didaticamente ultrapassada e caberá
extrair um `DocumentLinkButton` simples (`label`, `href`/`onClick`, condicional a um id opcional) —
não antes.

**Cria, se a dívida não for fechada:** cada versão futura que tocar o Financeiro avançado sem saber
que `origemModulo` está mudo continua sem conseguir explicar de onde veio um título — o mesmo
sintoma que motivou a rodada a se chamar "origem explícita". Se Q3 não for resolvida (nem restringir,
nem confirmar como desejada), a assimetria entre Pagar e Receber persiste sem explicação visível na
tela sobre *por que* elas se comportam diferente — hoje só quem lê o código sabe que é por causa de
D7 existir só de um lado.

---

## O que eu abro mão

- **Não desenho link de origem para `Compra`, `NotaFiscal`, `Contrato`, `AjusteAutorizado`,
  `OrdemServico`, `Frota` nesta rodada (Q2).** Abro mão de completar a convenção para todas as
  origens em troca de não arriscar um `router.push` para uma rota que pode não corresponder ao tipo
  real de `OrigemId` gravado (não verificado se `Compra` sempre aponta para `PedidoCompraId`).
  Gatilho de reversão: confirmação de que o `OrigemId` de cada origem é sempre da entidade que o
  nome sugere — aí é copiar o mesmo bloco condicional já usado para `PedidoVenda`.
- **Não decido se Contas a Receber restringe a origem (Q3).** Abro mão de fechar a decisão de
  produto sozinho — recomendo restringir por ser a opção mais barata e simétrica, mas registro como
  `needs_decision`. Gatilho de reversão de qualquer lado: uma linha em `financialOriginOptions`.
- **Não desenho `EntitySelect` de local de estoque em `AprovarCotacaoDialog` sem confirmação de
  backend (Q4/CF-6).** Abro mão de antecipar forma para um campo que a UI hoje nunca envia — o
  componente já existe pronto para copiar (`PedidoCompraItemDialog`), mas não vou gastar essa forma
  em algo que o backend pode não querer nesta rodada.
- **Não crio componente `DocumentLinkButton` compartilhado.** Abro mão de generalizar a convenção de
  link ao documento de origem agora — fica como padrão de código repetido (terceira instância), não
  como componente. Gatilho: um quarto módulo replicando o mesmo bloco.
- **Não desenho status por item como coluna nem como badge grande na tabela de itens de compra
  (Q5).** Abro mão de visibilidade permanente em troca de manter a tabela escaneável; o indicador
  fica condicional ao status do pedido, não sempre visível.

---

## Onde discordo

Não vi ainda as posições dos outros três arquitetos (escrevo em paralelo). Registro uma discordância
antecipada, no mesmo espírito da rodada 11:

> **Discordo, antecipadamente, de qualquer proposta que trate Q1/CF-4 como "fora de escopo da `b70`
> até o backend responder".** A resposta de template para CF-4 **não depende** da resposta do
> backend: hoje não existe endpoint de reversão de recebimento, então a tela já pode (e já deveria)
> dizer isso explicitamente, hoje, independente de quando ou se o backend abrir um endpoint novo.
> Adiar o quarto bloco do card "Impacto em estoque e financeiro" para depois da resposta de backend
> significa que a `b70` inteira sai ao ar com o título "reversão explícitas" sem nenhuma tela
> explicando o que de fato existe — o oposto do que o título promete. Custo de alinhar depois: baixo
> (é texto estático, não lógica), mas o custo de *não* ter isso no dia 1 da `b70` é a tela continuar
> mentindo por omissão até alguém notar. Reversível: sim, é um bloco de texto; se o backend abrir
> reversão depois, o bloco vira um botão, sem reescrever nada ao redor.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "arquitetura",
  "assunto": "compra-financeiro",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/12-design-compra-financeiro.md",
  "decisoesPropostas": [
    {
      "id": "Q1",
      "decisao": "CF-4 não tem onde pousar um botão de reversão porque o backend não tem o endpoint (medido: grep zero em Erp.Application/Compras e Erp.Api/Controllers/Compras). O padrão de template é um quarto bloco de texto fixo no card 'Impacto em estoque e financeiro' (PedidoCompraDetalhePage.tsx:242-249, mesmo formato dos três blocos existentes), explicando que recebimento não se desfaz e que o único estorno possível é o do pagamento (que não desfaz estoque). Não inventar botão desabilitado para capacidade inexistente. Régua de três: 1 caso, extensão de card existente."
    },
    {
      "id": "Q2",
      "decisao": "Rótulo de origem no módulo básico já existe (correção pendente é só de enum, backend). No avançado (CF-3), origemModulo/origemId entram como linha de texto no card de detalhe da conta, mostrando o valor cru (sem tradução, B-3 ainda pendente). Link ao documento de origem entra como terceira instância da convenção já usada duas vezes no repositório (FaturamentoDetalhePage, ObservabilidadeFiscalPage) — Button + router.push condicionado ao id — aplicado só ao caso já confirmado hoje (origem=PedidoVenda em Contas a Receber básico); demais origens ficam sem link até confirmar o destino real do OrigemId. Filtro por origem entra como segundo Dropdown ao lado do de Status, mesmo padrão visual já usado. Nenhum componente novo."
    },
    {
      "id": "Q3",
      "decisao": "Recomendo restringir o dropdown de Contas a Receber a Manual/PedidoVenda (mesma linha de código que Pagar já usa para restringir a Manual), com reversão barata se o produto confirmar que as 3 origens sem vínculo (Contrato/NotaFiscal/AjusteAutorizado) são capacidade desejada (ex. migração). Custo de restringir: uma linha em financialOriginOptions. Custo de manter: o Message de aviso já existente (unsupportedOriginReference) segue sendo aviso, não bloqueio — categoria mais fraca que o piso desta skill. Decisão final é de produto (needs_decision)."
    },
    {
      "id": "Q4",
      "decisao": "CF-5 (CotacaoCompraId) é dado ausente do backend, não forma ausente — 100% pendência de backend; quando existir, reaproveita o mesmo botão de link da Q2. CF-6 (ItensLocalEstoque) tem forma pronta para copiar do módulo irmão (EntitySelect de local de estoque, já usado em PedidoCompraItemDialog) — só entra se o backend confirmar que quer o campo preenchido nesta rodada (pergunta 4 do inventário, subscrita sem alteração)."
    },
    {
      "id": "Q5",
      "decisao": "CF-7 entra como indicador compacto condicional (texto de apoio ou Tag pequeno na célula 'Qtd.', visível só quando pedido.statusPedido é ParcialmenteRecebido/Recebido), não como cinco colunas novas na tabela de itens (que já tem 7 colunas). sequencia e valorBruto não entram (mesmo padrão de campos de auditoria fina sem uso já registrado nas rodadas 10 e 11). Régua de três: primeira aplicação real deste padrão de indicador condicional (a de Vendas, rodada 11, ficou só com gatilho)."
    },
    {
      "id": "Q6",
      "decisao": "Não é decisão em aberto: GerarContaReceberPedidoDialog (FinanceiroActionDialogs.tsx) já implementa a geração de conta a receber a partir de pedido de venda faturado, com EntitySelect por rótulo operacional, dentro do Financeiro básico, em produção hoje. Não pertence à b71 (Faturamento trata de emissão fiscal, capacidade adjacente e diferente). Nenhuma correção de forma pendente."
    },
    {
      "id": "Q7",
      "decisao": "Medido (grep em layout/AppMenu.tsx e lib/security/routePermissions.ts, mais grep global no repositório fora de node_modules): FINANCEIRO_CAIXA_GERENCIAR e FINANCEIRO_BANCO_GERENCIAR não aparecem em nenhum guard, regra de rota ou item de menu — só em permissoesCatalogo.ts e types/erp.ts. accessRisk = ilusão de clicar, mesmo tratamento da D81: remover das duas listas, nenhuma mudança visual na tela de grupos de acesso (lista dinamicamente a partir do catálogo)."
    },
    {
      "id": "Q8",
      "decisao": "Recomendo estender o gate de campos (D83) a PedidoCompraResponse, ItemPedidoCompraResponse, ContaPagarResponse/ContaReceberResponse e ContaFinanceiraResponse/ContaFinanceiraResumoResponse (avançado) — mesma classe de defeito (anulabilidade divergente CF-6, campos ausentes CF-7) que justificou o gate para Vendas/Tabelas de preço. Decisão de formato final é de plataforma/execução. CF-10 (allowlist desatualizado) é dívida documental, não de template — fora da minha fronteira (scripts/)."
    },
    {
      "id": "Q9",
      "decisao": "Uma b70 só, do ângulo de template — nenhuma peça decidida aqui abre rota, item de menu ou componente novo, e a resposta de template para Q1/CF-4 não depende de quando o backend responder. Ordem de calendário é do arquiteto-escopo-entrega."
    }
  ],
  "discordancias": [
    "Discordo, antecipadamente (sem posição publicada ainda para confrontar), de qualquer proposta que trate Q1/CF-4 como 'fora de escopo até o backend responder'. A resposta de template (dizer, hoje, que reversão de recebimento não existe) não depende da resposta de backend — é texto estático que se converte em botão depois, sem reescrever nada ao redor. Adiar deixa a b70 sair ao ar prometendo 'reversão explícita' sem nenhuma tela explicando o que de fato existe."
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "CF-4: a ausência de qualquer reversão de recebimento de compra é intencional (corrige por complementar) ou vira endpoint de estorno nesta rodada? Não muda a forma do quarto bloco textual proposto na Q1, mas decide se ele um dia vira botão.", "decide": "se compras ganha alguma peça de UI de reversão além do texto explicativo" },
    { "tipo": "backend", "pergunta": "CF-2: OrigemFinanceira.OrdemServico/.Frota já têm gerador em produção? Decide se o enum do frontend precisa dos dois valores antes de qualquer trabalho na coluna Origem.", "decide": "conteúdo de origemFinanceiraOptions" },
    { "tipo": "produto", "pergunta": "CF-1: restringir Contas a Receber a Manual/PedidoVenda (como Pagar já faz) ou manter as 3 origens sem vínculo como capacidade desejada (migração)?", "decide": "financialOriginOptions em ContaFinanceiraFormDialog.tsx" },
    { "tipo": "backend", "pergunta": "CF-6: a intenção é a UI passar a enviar ItensLocalEstoque na aprovação de cotação nesta rodada, reaproveitando o EntitySelect que PedidoCompraItemDialog já usa?", "decide": "se AprovarCotacaoDialog ganha campo por item" },
    { "tipo": "produto/backend", "pergunta": "Para cada valor de OrigemFinanceira (Compra, NotaFiscal, Contrato, AjusteAutorizado, OrdemServico, Frota), o OrigemId gravado é sempre o id da entidade que o nome sugere? Sem essa confirmação não generalizo o botão de link de origem além do caso já confirmado (PedidoVenda).", "decide": "quais origens ganham o botão 'Abrir documento de origem' além da já confirmada" }
  ],
  "riscos": [
    "Não abri preview_start nesta rodada — a leitura de forma foi feita por grep pareado de código (mesma técnica do inventário), não por navegação; se alguém precisar confirmar visualmente o card 'Impacto em estoque e financeiro' ou o dropdown de origem, as rotas sobem normalmente em logosoft-dev.",
    "Não verifiquei se o endpoint de listagem do Financeiro avançado aceita filtro por origemModulo (Q2, filtro textual) — ficou registrado como pendência técnica, não medido nesta sessão.",
    "Não contei quantas outras telas usam EntitySelect de local de estoque para confirmar a régua de três com precisão numérica na Q4 — afirmei 'claramente mais de dois casos' por ser o padrão canônico de vínculo de entidade do repositório, sem grep exaustivo desta sessão específica.",
    "A recomendação de estender o gate de campos (Q8) não foi validada rodando o script contra os records de Compras/Financeiro — é inferência pela mesma classe de defeito que motivou a D83, não confirmação de que o gate aceitaria esses records sem ajuste de configuração."
  ]
}
```
