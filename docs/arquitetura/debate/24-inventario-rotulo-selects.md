# Rodada 24 — Inventário AC-0: as 72 "(sem rótulo)" do QA, nominalmente

> Nó `inventario` da fatia `v1.11.0a8b76.c3` (plano: `docs/fatias/v1.11.0a8b76.c3-rotulo-acessivel-selects.md`).
> Produzido por `inventariante-contrato-tela`. **Somente leitura** do código. Nada foi executado no
> navegador, nenhum `vitest`/`playwright` rodou. O recorte e o formato são os do briefing do nó (AC-0),
> não as quatro tabelas padrão de contrato (não há endpoint, schema nem permissão em jogo nesta fatia).

## 0. Resumo que cabe numa tela

| Item | Valor | Como foi medido |
| --- | --- | --- |
| Campos "(sem rótulo)" no relatório QA-20261024-212047-a2fc3a | **72** de 248, em **41** das 49 páginas | `grep -h "(sem rótulo)" paginas/*.md \| wc -l` = 72; soma dos cabeçalhos `**Campos e filtros** (N)` das 49 páginas = 248 |
| Composição por tipo do QA | 64 lista, 6 data, 1 liga/desliga, 1 texto | `awk -F'\|' '{print $3}'` sobre as 72 linhas |
| **Empresa** (`EmpresaSelect` > `EntitySelect` > `SearchSelect`) | **41** | cada uma das 41 páginas tem exatamente 1; leitura da linha de chamada |
| **`<Dropdown>` cru** com `aria-label` kebab | **23** | leitura da linha de chamada em cada página |
| **`DateInput`** | **2** (`/estoque/movimentos`) | `EstoqueFilterBar.tsx:22-23` |
| **`DateTimeInput`** | **4** (`/auditoria/operacional` e `/auditoria/eventos`, 2 em cada) | `AuditoriaEventosPage.tsx:144-145`; as duas rotas montam o mesmo componente |
| **`InputSwitch`** | 1 (`/alimentar/lotes`) | `LotesPage.tsx:104` |
| **`InputNumber`** | 1 (`/alimentar/lotes`; o QA o chama de "texto") | `LotesPage.tsx:106` |
| Não identificados | **0** | — |
| **Soma** | 41 + 23 + 2 + 4 + 1 + 1 + 0 = **72** | fecha |

Os mesmos 72, por página, aparecem nas 5 execuções do QA em `docs/verificacao/` (mesma lista de arquivos e
contagens: `grep -c "(sem rótulo)" paginas/*.md` + `md5sum` iguais nas 5). Quatro delas rodaram sobre a mesma
imagem `1.11.0a8b76.c2-284ad88`; a primeira (`161925`) sobre `1.11.0a8b76-f690681`, antes da c2.

## 1. Como o QA decide "(sem rótulo)" e o que a nossa árvore entrega

`rotuloDe` (`logosoft-frontend-QA/src/sweep/inventario.ts:52-64`) olha **o elemento raiz**
(`.p-dropdown`, `.p-calendar`, `.p-inputswitch`, ou o próprio `<input>`), nesta ordem: `label[for=<id da raiz>]`,
`aria-label` da raiz, `<label>` dentro do `.field`/`.p-field`/`.form-group` ancestral, `placeholder`,
`.p-placeholder` da raiz. Nada do que está dentro da raiz (o `<input readOnly>` focável, o gatilho) é lido.

Evidência do DOM, não só de leitura. Renderizei **os nossos componentes** (`EntitySelect`, `DateInput`,
`DateTimeInput`) e o PrimeReact 10.2.1 (`Dropdown`, `InputSwitch`, `InputNumber`) com
`react-dom/server.renderToStaticMarkup` (servidor, não navegador), script em área temporária fora do repositório:

| O que foi renderizado | Resultado no HTML | Consequência para `rotuloDe` |
| --- | --- | --- |
| `EntitySelect id="empresaId" value="e1" entityName="empresa"` | raiz `<div id="empresaId" class="p-dropdown ... p-inputwrapper-filled">` **sem** `aria-label`; texto do valor em `<span class="p-dropdown-label">` **sem** `p-placeholder`; `<input readonly>` interno **sem** `aria-*`; só o gatilho `role="button"` tem `aria-label="Buscar empresa"` | cai em "(sem rótulo)": é o que o QA vê |
| `EntitySelect id="filialId" value={null} entityName="filial"` | `<span class="p-dropdown-label p-placeholder"><span>Buscar filial</span></span>` | lê "Buscar filial": casa com a coluna "Campo" dos relatórios |
| `<Dropdown value={null} aria-label="Filtrar por status">` (cru) | `aria-label` **só no `<input readonly>` interno**; raiz sem `aria-label`; sem placeholder o rótulo vira `<span class="... p-dropdown-label-empty">empty</span>` sem `p-placeholder` | cai em "(sem rótulo)", embora o campo focável **tenha nome** |
| `DateInput id="estoqueFiltroInicio"` / `DateTimeInput` sem `id` | `<span id=... class="p-calendar">` + `<input>` sem `id`, sem `aria-*` | "(sem rótulo)" |
| `InputSwitch inputId="aVencer"` | `id="aVencer"` no `<input type=checkbox>` interno; **raiz sem `id`** | `label[for]` não é consultado (id da raiz é nulo): "(sem rótulo)" |
| `InputNumber` sem `inputId` | `<input role="spinbutton">` sem `id`/`aria-*` | "(sem rótulo)" |

Validação cruzada do modelo contra o relatório (campos que o modelo prevê **rotulados** estão rotulados):
"Nova proposta para oportunidade" (`PropostasPage.tsx:86-87`, `EntitySelect id` + `<label htmlFor>`, lido via
`label[for]` da raiz), "Status" e "Prioridade" de `AtividadesPage.tsx:184-185` (`Dropdown id` + `<label htmlFor>`),
"Status" de `PedidosVendaPage.tsx:74` (`Dropdown placeholder="Status"`), "Filtrar por competência"
(`EventosPage.tsx:66`, `InputText aria-label`). Nenhum contradiz o modelo.

## 2. Tabela nominal das 72 (ordem das páginas do menu; "Pos." = posição na tabela "Campos e filtros" do QA)

Legenda das colunas:
- **Chamada**: `arquivo:linha` do ponto de chamada, sempre em `features/<modulo>/components/`. O módulo é o do menu, exceto: `EstoqueFilterBar.tsx` e `HistoricoMovimentosTab.tsx` (`estoque`), `InventariosOperacionaisTab.tsx` (`estoque-avancado`), `FluxoCaixaTab.tsx` (`financeiro-avancado`), `Solicitacoes/Cotacoes/RecebimentosCompraPage.tsx` (`compras-avancado`), `PreAutorizacoesTab.tsx` (`portaria`), `AusenciasPage.tsx` (`rh`), `AuditoriaEventosPage.tsx` (`auditoria`), `NotaFiscalConsultaPage.tsx`/`ObservabilidadeFiscalPage.tsx` (`fiscal`), `patrimonio/InventariosPage.tsx`.
- **Classe**: o componente que renderiza. Para empresa a cadeia é sempre `components/forms/EmpresaFilialFilter.tsx:65` > `EmpresaSelect.tsx:10` > `EntitySelect.tsx:29` > `SearchSelect.tsx:35` (`<Dropdown>`), com `id="empresaId"` na raiz por padrão e **sem** `inputId`.
- **Escopo**: "dentro" = `SearchSelect`/`EntitySelect` e derivados, `DateInput`, `DateTimeInput` (escopo do plano, seção 0/6); "fora" = o resto (seção 8 do plano).
- **Label for?**: existe `<label htmlFor>` visível apontando para este campo.
- **aria-label kebab?**: o ponto de chamada passa `aria-label` (kebab-case) ao PrimeReact.
- **Conf.**: `lido` = a linha foi lida e é a única candidata àquela posição dado o tipo e a contagem do relatório; `inferido` = resta uma suposição (explicada na seção 6).

| # | Rota (página QA) | Pos. | Tipo QA | Chamada | Classe | Escopo | Label for? | aria-label kebab? | id na raiz | Conf. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/dashboard` (01-dashboard) | 1/4 | lista | DashboardPage.tsx:166 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 2 | `/estoque/saldos` (03-estoque-saldos) | 1/5 | lista | SaldosEstoquePage.tsx:41 > EstoqueFilterBar.tsx:17 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 3 | `/estoque/movimentos` (04-estoque-movimentos) | 1/7 | lista | HistoricoMovimentosTab.tsx:58 > EstoqueFilterBar.tsx:17 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 4 | `/estoque/movimentos` (04-estoque-movimentos) | 5/7 | data | EstoqueFilterBar.tsx:22 (id estoqueFiltroInicio) | DateInput | dentro | não | não | estoqueFiltroInicio | lido |
| 5 | `/estoque/movimentos` (04-estoque-movimentos) | 6/7 | data | EstoqueFilterBar.tsx:23 (id estoqueFiltroFim) | DateInput | dentro | não | não | estoqueFiltroFim | lido |
| 6 | `/estoque/reservas` (07-estoque-reservas) | 1/5 | lista | ReservasEstoquePage.tsx:89 > EstoqueFilterBar.tsx:17 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 7 | `/estoque/inventarios` (08-estoque-inventarios) | 1/4 | lista | InventariosEstoquePage.tsx:92 > EstoqueFilterBar.tsx:17 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 8 | `/estoque/avancado` (09-estoque-avancado) | 1/3 | lista | InventariosOperacionaisTab.tsx:74 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 9 | `/estoque/avancado` (09-estoque-avancado) | 3/3 | lista | InventariosOperacionaisTab.tsx:75 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 10 | `/vendas/pedidos` (10-vendas-pedidos) | 1/4 | lista | PedidosVendaPage.tsx:73 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 11 | `/financeiro/contas-receber` (11-financeiro-contas-receber) | 1/3 | lista | ContasFinanceirasPage.tsx:123 (type=receber) | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 12 | `/financeiro/contas-pagar` (12-financeiro-contas-pagar) | 1/3 | lista | ContasFinanceirasPage.tsx:123 (type=pagar) | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 13 | `/financeiro/fluxo-caixa` (13-financeiro-fluxo-caixa) | 1/4 | lista | FluxoCaixaTab.tsx:48 (via FluxoCaixaPage.tsx:9) | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 14 | `/compras/pedidos` (14-compras-pedidos) | 1/5 | lista | PedidosCompraPage.tsx:72 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 15 | `/compras/solicitacoes` (15-compras-solicitacoes) | 1/4 | lista | SolicitacoesCompraPage.tsx:75 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 16 | `/compras/solicitacoes` (15-compras-solicitacoes) | 3/4 | lista | SolicitacoesCompraPage.tsx:76 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 17 | `/compras/cotacoes` (16-compras-cotacoes) | 1/4 | lista | CotacoesCompraPage.tsx:75 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 18 | `/compras/cotacoes` (16-compras-cotacoes) | 3/4 | lista | CotacoesCompraPage.tsx:76 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 19 | `/compras/recebimentos` (17-compras-recebimentos) | 1/2 | lista | RecebimentosCompraPage.tsx:63 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 20 | `/fiscal/notas` (18-fiscal-notas) | 1/11 | lista | NotaFiscalConsultaPage.tsx:225 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 21 | `/fiscal/observabilidade` (20-fiscal-observabilidade) | 1/19 | lista | ObservabilidadeFiscalPage.tsx:228 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 22 | `/pdv/caixas` (22-pdv-caixas) | 1/2 | lista | CaixasPdvPage.tsx:77 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 23 | `/pdv/vendas` (23-pdv-vendas) | 1/12 | lista | VendaPdvPage.tsx:119 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 24 | `/faturamento` (24-faturamento) | 1/3 | lista | FaturamentoPage.tsx:78 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 25 | `/faturamento` (24-faturamento) | 3/3 | lista | FaturamentoPage.tsx:79 (Filtrar por etapa) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 26 | `/servicos/ordens` (25-servicos-ordens) | 1/4 | lista | OrdensServicoPage.tsx:84 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 27 | `/servicos/ordens` (25-servicos-ordens) | 3/4 | lista | OrdensServicoPage.tsx:85 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 28 | `/frota/viagens` (26-frota-viagens) | 1/3 | lista | ViagensPage.tsx:226 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 29 | `/frota/viagens` (26-frota-viagens) | 3/3 | lista | ViagensPage.tsx:227 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 30 | `/portaria` (27-portaria) | 1/4 | lista | PreAutorizacoesTab.tsx:61 (via PortariaPage.tsx:23) | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 31 | `/portaria` (27-portaria) | 3/4 | lista | PreAutorizacoesTab.tsx:62 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 32 | `/alimentar/lotes` (28-alimentar-lotes) | 1/6 | lista | LotesPage.tsx:92 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 33 | `/alimentar/lotes` (28-alimentar-lotes) | 3/6 | lista | LotesPage.tsx:93 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 34 | `/alimentar/lotes` (28-alimentar-lotes) | 5/6 | liga/desliga | LotesPage.tsx:104 (InputSwitch inputId=aVencer) | InputSwitch (outro) | fora | sim, mas no input interno (label for=aVencer, LotesPage.tsx:105) | não | nenhum na raiz (inputId=aVencer) | lido |
| 35 | `/alimentar/lotes` (28-alimentar-lotes) | 6/6 | texto | LotesPage.tsx:106 (InputNumber, suffix " dias") | InputNumber (outro) | fora | não | não | nenhum | lido |
| 36 | `/alimentar/recalls` (29-alimentar-recalls) | 1/4 | lista | RecallsPage.tsx:77 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 37 | `/alimentar/recalls` (29-alimentar-recalls) | 3/4 | lista | RecallsPage.tsx:78 (Filtrar por gravidade) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 38 | `/alimentar/recalls` (29-alimentar-recalls) | 4/4 | lista | RecallsPage.tsx:79 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 39 | `/rh/ponto` (30-rh-ponto) | 1/2 | lista | PontoPage.tsx:60 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 40 | `/rh/ausencias` (31-rh-ausencias) | 1/2 | lista | AusenciasPage.tsx:93 (FeriasTab; showFilial=false) | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | inferido |
| 41 | `/rh/ausencias` (31-rh-ausencias) | 2/2 | lista | AusenciasPage.tsx:94 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | inferido |
| 42 | `/rh/eventos` (32-rh-eventos) | 1/3 | lista | EventosPage.tsx:63 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 43 | `/qualidade/inspecoes` (33-qualidade-inspecoes) | 1/4 | lista | InspecoesPage.tsx:102 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 44 | `/qualidade/inspecoes` (33-qualidade-inspecoes) | 3/4 | lista | InspecoesPage.tsx:103 (Filtrar por origem) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 45 | `/qualidade/inspecoes` (33-qualidade-inspecoes) | 4/4 | lista | InspecoesPage.tsx:104 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 46 | `/qualidade/nao-conformidades` (34-qualidade-nao-conformidades) | 1/3 | lista | NaoConformidadesPage.tsx:88 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 47 | `/qualidade/nao-conformidades` (34-qualidade-nao-conformidades) | 3/3 | lista | NaoConformidadesPage.tsx:89 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 48 | `/producao/ordens` (35-producao-ordens) | 1/4 | lista | OrdensProducaoPage.tsx:113 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 49 | `/producao/ordens` (35-producao-ordens) | 3/4 | lista | OrdensProducaoPage.tsx:114 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 50 | `/crm/leads` (36-crm-leads) | 1/4 | lista | LeadsPage.tsx:73 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 51 | `/crm/leads` (36-crm-leads) | 3/4 | lista | LeadsPage.tsx:74 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 52 | `/crm/oportunidades` (37-crm-oportunidades) | 1/5 | lista | OportunidadesPage.tsx:120 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 53 | `/crm/oportunidades` (37-crm-oportunidades) | 3/5 | lista | OportunidadesPage.tsx:121 (Filtrar por estágio) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 54 | `/crm/oportunidades` (37-crm-oportunidades) | 4/5 | lista | OportunidadesPage.tsx:122 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 55 | `/crm/propostas` (38-crm-propostas) | 1/4 | lista | PropostasPage.tsx:75 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 56 | `/crm/propostas` (38-crm-propostas) | 3/4 | lista | PropostasPage.tsx:76 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 57 | `/contratos` (39-contratos) | 1/4 | lista | ContratosPage.tsx:111 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 58 | `/contratos` (39-contratos) | 3/4 | lista | ContratosPage.tsx:112 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 59 | `/atividades` (40-atividades) | 2/5 | lista | AtividadesPage.tsx:183 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 60 | `/contabil/lancamentos` (41-contabil-lancamentos) | 1/4 | lista | LancamentosPage.tsx:77 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 61 | `/contabil/lancamentos` (41-contabil-lancamentos) | 3/4 | lista | LancamentosPage.tsx:78 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 62 | `/bancos/boletos` (42-bancos-boletos) | 1/4 | lista | BoletosPage.tsx:81 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 63 | `/bancos/boletos` (42-bancos-boletos) | 3/4 | lista | BoletosPage.tsx:82 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 64 | `/patrimonio/inventarios` (45-patrimonio-inventarios) | 1/3 | lista | patrimonio/InventariosPage.tsx:75 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 65 | `/patrimonio/inventarios` (45-patrimonio-inventarios) | 3/3 | lista | patrimonio/InventariosPage.tsx:76 (Filtrar por status) | Dropdown cru | fora | não | sim, só no input interno | nenhum | lido |
| 66 | `/relatorios` (46-relatorios) | 1/6 | lista | RelatoriosPage.tsx:120 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 67 | `/auditoria/operacional` (47-auditoria-operacional) | 1/9 | lista | AuditoriaEventosPage.tsx:138 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 68 | `/auditoria/operacional` (47-auditoria-operacional) | 8/9 | data | AuditoriaEventosPage.tsx:144 (DateTimeInput, sem id) | DateTimeInput | dentro | não | não | nenhum | lido |
| 69 | `/auditoria/operacional` (47-auditoria-operacional) | 9/9 | data | AuditoriaEventosPage.tsx:145 (DateTimeInput, sem id) | DateTimeInput | dentro | não | não | nenhum | lido |
| 70 | `/auditoria/eventos` (48-auditoria-eventos) | 1/9 | lista | AuditoriaEventosPage.tsx:138 | EmpresaSelect > EntitySelect > SearchSelect | dentro | não | não | empresaId (default) | lido |
| 71 | `/auditoria/eventos` (48-auditoria-eventos) | 8/9 | data | AuditoriaEventosPage.tsx:144 (DateTimeInput, sem id) | DateTimeInput | dentro | não | não | nenhum | lido |
| 72 | `/auditoria/eventos` (48-auditoria-eventos) | 9/9 | data | AuditoriaEventosPage.tsx:145 (DateTimeInput, sem id) | DateTimeInput | dentro | não | não | nenhum | lido |

## 3. Contas (regra: a soma tem de fechar em 72)

| Grupo | Qtd | Escopo | Método |
| --- | --- | --- | --- |
| Empresa (`EmpresaSelect` > `EntitySelect` > `SearchSelect`) | 41 | dentro | uma por página das 41 com "(sem rótulo)"; a linha `(sem rótulo)` + `Buscar filial` vizinha casa com `EmpresaFilialFilter` (empresa imediatamente antes de filial); script `gera.cjs` confrontou o **tipo** do QA com a classe de cada linha e a **contagem** por página: 0 discrepâncias |
| `DateInput` | 2 | dentro | `EstoqueFilterBar.tsx:22-23`, ativado por `showPeriodo` em `HistoricoMovimentosTab.tsx:58` |
| `DateTimeInput` | 4 | dentro | `AuditoriaEventosPage.tsx:144-145`, renderizado por 2 rotas |
| **Subtotal dentro do escopo (por componente)** | **47** | | 41 + 2 + 4 |
| `<Dropdown>` cru (todos com `aria-label="Filtrar por ..."`, sem `id`, sem `inputId`, sem `placeholder`) | 23 | fora | lista nominal na tabela da seção 2, classe "Dropdown cru" |
| `InputSwitch` | 1 | fora | `LotesPage.tsx:104` |
| `InputNumber` | 1 | fora | `LotesPage.tsx:106` |
| **Subtotal fora do escopo** | **25** | | 23 + 1 + 1 |
| Não identificados | 0 | | — |
| **Total** | **72** | | 47 + 25 + 0 |

### 3.1 O número "resolvidos" depende de qual régua se usa (fato, não proposta)

| Régua | Resultado | Como foi medido |
| --- | --- | --- |
| Componente está no escopo da fatia | 47 de 72 | seção 3 |
| O campo **focável** passa a ter nome pelo desenho P1–P5, **sem editar ponto de chamada** | **41** (as empresas, pelo fallback de P2(3)) | nenhuma das 72 tem `<label htmlFor>` para o campo focável (coluna "Label for?" da seção 2: só o `InputSwitch` tem, no input interno), então P2(2)/P3 não alcança nenhuma; sobra o fallback por `entityName` (`EmpresaSelect` não passa `ariaLabel`) |
| Dentro do escopo mas **sem nenhuma fonte de nome** com o desenho atual | 6 (as datas) | `DateInput`/`DateTimeInput` não têm `entityName`; as 2 de `/estoque/movimentos` têm `id` mas nenhum `<label>`; as 4 de `/auditoria/*` nem `id` têm (`AuditoriaEventosPage.tsx:144-145`). Só ganham nome se o ponto de chamada passar `ariaLabel` (P4), e o plano proíbe editar pontos de chamada no Bloco A |
| Campo focável **já tem nome** e o QA conta como "sem rótulo" mesmo assim | 24 (23 `Dropdown` cru com `aria-label` no `<input>` interno + o `InputSwitch`, cujo `<label for=aVencer>` aponta o input interno) | renderização SSR da seção 1 + `LotesPage.tsx:105` |
| Campo focável **realmente sem nome** | 48 = 41 empresas + 6 datas + 1 `InputNumber` | 72 − 24 |
| Quantas das 72 o QA deixaria de contar após P1–P5 **sem** o ajuste de `rotuloDe` (P6) | **0** | `rotuloDe` só lê a raiz (seção 1) e P1–P5 mexem no `<input>` interno e em `aria-labelledby` do input; P6 proíbe `aria-label` na raiz. É dedução de leitura de `rotuloDe`, **não** medição no navegador |

## 4. (1) `id` repetido na mesma tela (risco do hook que liga `label[for=id]`)

Método: script de varredura de JSX (`ids.cjs`, lê a tag de abertura inteira, inclusive multilinha) sobre `features/`, `components/` e `app/`
achou 640 usos de `SearchSelect|EntitySelect|EmpresaSelect|FilialSelect|SetorSelect|DateInput|DateTimeInput|Dropdown|Calendar|InputSwitch|MultiSelect|InputNumber|EmpresaFilialFields|EmpresaFilialFilter`;
os totais coincidem com os do plano (`grep`: 165 selects de busca = 7 `SearchSelect` + 126 `EntitySelect` + 15 `EmpresaSelect` + 16 `FilialSelect` + 1 `SetorSelect`; 75 `DateInput`).
`<Dropdown` aparece **179** vezes (script e `grep -rn "<Dropdown" ... | wc -l` coincidem).
A resolução do componente dono de cada uso e dos diálogos que a página renderiza é por nome (`cross2.cjs`).

**Mecanismo.** `EmpresaFilialFilter` (filtro de página) renderiza `EmpresaSelect` e `FilialSelect` **sem `id`**, então ficam com o padrão
`empresaId`/`filialId` (`EmpresaSelect.tsx:6`, `FilialSelect.tsx:9`). `EmpresaFilialFields` (formulário de diálogo) usa `id="empresaId"` e
`id="filialId"` **fixos** (`EmpresaFilialFields.tsx:95,108`) e tem `<label htmlFor="empresaId">`/`"filialId"` (linhas 92, 107).
O `Dialog` do PrimeReact só monta o conteúdo enquanto está visível (`return maskVisibleState && createDialog()`,
`dialog.cjs.js:1001`); o `TabView` só monta a aba ativa (`renderActiveOnly: true` por padrão, `tabview.cjs.js:225`; nenhum
`renderActiveOnly` no repositório: `grep -rn renderActiveOnly features components`). Logo, os ids colidem **enquanto o diálogo está aberto**,
e `document.querySelector('label[for="empresaId"]')` devolve o `<label>` do **diálogo**, também para o select do filtro da página.

Telas (entre as 41 do recorte) em que um diálogo renderizado pela própria página carrega `empresaId`/`filialId` enquanto o filtro da página
já os carrega: **20 rotas**.

| Rota | Diálogo que repete `empresaId`/`filialId` | Onde | Forma do id no diálogo |
| --- | --- | --- | --- |
| `/estoque/reservas` | `ReservaEstoqueFormDialog` | `ReservaEstoqueDialogs.tsx:65` | `EmpresaFilialFields` (fixo) |
| `/estoque/inventarios` | `InventarioFormDialog` | `InventarioEstoqueDialogs.tsx:46` | idem |
| `/estoque/avancado` (aba Inventários operacionais) | `CriarInventarioDialog` | `estoque-avancado/.../InventarioDialogs.tsx:56` | idem |
| `/financeiro/contas-receber`, `/financeiro/contas-pagar` | `ContaFinanceiraFormDialog`; `GerarContaReceberPedidoDialog` | `ContaFinanceiraFormDialog.tsx:115`; `FinanceiroActionDialogs.tsx:146` | idem |
| `/compras/solicitacoes` | `CriarSolicitacaoDialog` | `compras-avancado/.../SolicitacaoDialogs.tsx:51` | idem |
| `/compras/cotacoes` | `CriarCotacaoDialog` | `compras-avancado/.../CotacaoDialogs.tsx:58` | idem |
| `/fiscal/notas` | `CriarNotaFiscalDialog`; `GerarNotaFiscalPedidoVendaDialog` | `FiscalActionDialogs.tsx:164-165, 242-243` | `EmpresaSelect`/`FilialSelect` **sem `id`** (padrão); o `<label>` do `Field` (`FiscalActionDialogs.tsx:64`) **não tem `htmlFor`** |
| `/pdv/caixas` | `AbrirCaixaDialog` | `pdv/.../CaixaDialogs.tsx:48` | `EmpresaFilialFields` (fixo) |
| `/servicos/ordens` | `OrdemServicoFormDialog` | `OrdemServicoFormDialog.tsx:91` | idem |
| `/frota/viagens` | `IniciarViagemDialog` (no mesmo arquivo da página) | `ViagensPage.tsx:86` | idem |
| `/portaria` (aba Pré-autorizações) | `PreAutorizacaoDialog` | `PortariaDialogs.tsx:80` | idem |
| `/alimentar/lotes` | `LoteFormDialog` | `AlimentarDialogs.tsx:94` | idem |
| `/alimentar/recalls` | `RecallFormDialog` | `AlimentarDialogs.tsx:237` | idem |
| `/qualidade/inspecoes` | `InspecaoFormDialog` | `QualidadeDialogs.tsx:80` | idem |
| `/producao/ordens` | `OrdemProducaoFormDialog` | `ProducaoDialogs.tsx:202` | idem |
| `/crm/leads` | `LeadFormDialog` | `CrmDialogs.tsx:94` | idem |
| `/contratos` | `ContratoFormDialog` | `ContratosDialogs.tsx:80` | idem |
| `/atividades` | `AtividadeFormDialog` | `AtividadeFormDialog.tsx:66` | idem |
| `/patrimonio/inventarios` | `AbrirInventarioDialog` | `PatrimonioDialogs.tsx:303` | idem |

Sem colisão com o filtro da página (21 das 41; 20 + 21 = 41): `/dashboard`, `/estoque/saldos`, `/estoque/movimentos` (aba Histórico),
`/vendas/pedidos`, `/financeiro/fluxo-caixa`, `/compras/pedidos`, `/compras/recebimentos`, `/fiscal/observabilidade`, `/pdv/vendas`, `/faturamento`,
`/rh/ponto`, `/rh/ausencias`, `/rh/eventos`, `/qualidade/nao-conformidades`, `/crm/oportunidades`, `/crm/propostas`, `/contabil/lancamentos`,
`/bancos/boletos`, `/relatorios`, `/auditoria/operacional`, `/auditoria/eventos`. Os formulários de pedido de venda e de compra
(`PedidoVendaFormDialog.tsx:82`, `PedidoCompraFormDialog.tsx:84`, com `EmpresaFilialFields`) são montados só nas páginas de **detalhe**
(`PedidoVendaDetalhePage.tsx:292`, `PedidoCompraDetalhePage.tsx:273`), não nas listas do recorte.
`/rh/ausencias` tem **dois** `EmpresaFilialFilter` no arquivo (`AusenciasPage.tsx:93` e `:148`), mas em abas diferentes: não coexistem.

Outros ids repetidos que **não** colidem na mesma tela (verificados):
- `produtoId` em 4 arquivos de `features/estoque` e `localEstoqueId` em 3: cada um vive em diálogo distinto; `InventariosEstoquePage` renderiza `InventarioFormDialog` (`localEstoqueId`) e `InventarioItemDialog` (`produtoId`) como diálogos separados e exclusivos.
- Dentro de um mesmo arquivo, `{id}`/`{field.name}` repetido (`CadastroFiscalSelects.tsx:51,105`; `NaturezaOperacaoField.tsx:48,54`; `DynamicResourceForm.tsx:32`; `AdministracaoFormDialog.tsx:141-165`) são ramos condicionais de um único campo, não elementos simultâneos.
- `inputId` `tipoOperacao`/`regimeEmpresa` existem em `RegraFiscalFormDialog.tsx:312,321` e `SimuladorTributacaoPage.tsx:231,234`: telas diferentes.
- O diálogo de contexto organizacional usa ids próprios (`organizational-empresa`, `organizational-filial`, `OrganizationalContextDialog.tsx:23,27`). O QA depende desse id de raiz: `logosoft-frontend-QA/src/sweep/contexto.ts:15` clica `#organizational-empresa`.

Fora do recorte, o mesmo padrão (filtro com id padrão + diálogo com id fixo) existe em `clientes`, `fornecedores`, `pessoas`, `produtos`, `contabil`, `frota` (Motoristas/Veículos), `patrimonio` (Bens) e `rh` (Colaboradores/Jornadas/Benefícios): `node dup.cjs` listou 66 pares id/feature; não detalhei página a página porque não são das 72.

Nota de tempo de montagem, relevante para a decisão "o hook roda no mount do próprio campo": `FilialSelect` e `SetorSelect` passam `key` que muda com `empresaId`/`filialId`
(`FilialSelect.tsx:18`, `SetorSelect.tsx:25`), então o `EntitySelect` **remonta** quando o contexto muda.

## 5. (2) O texto "Buscar empresa obrigatória"

Origem: `EmpresaSelect.tsx:15` passa `entityName={required ? 'empresa obrigatória' : 'empresa'}`; `EntitySelect.tsx:36-37` monta
`placeholder` e `filterPlaceholder` como `Buscar ${entityName}` e (linha 31) `ariaLabel` como `ariaLabel ?? Buscar ${entityName}`;
`SearchSelect.tsx:35-37` repassa `ariaLabel` (camelCase) ao `Dropdown` e o PrimeReact usa `props.placeholder || props.ariaLabel` no `aria-label` do **gatilho** (`dropdown.cjs.js:1344`).
O texto "obrigatória" só aparece onde `required` é verdadeiro: `EmpresaFilialFields` (padrão `empresaRequired = true`, `EmpresaFilialFields.tsx:21,95`),
`CriarNotaFiscalDialog` (`FiscalActionDialogs.tsx:164`), `GerarNotaFiscalPedidoVendaDialog` (`:242`), `InutilizacoesFiscaisPage.tsx:141`,
`SimuladorTributacaoPage.tsx:225`, `UsuarioFormDialog.tsx:81`, `OrganizationalContextDialog.tsx:23`, `AdministracaoFormDialog.tsx:157` (condicional a `field.required`).
O filtro de página (`EmpresaFilialFilter`) não passa `required`: o texto lá é "Buscar empresa", e **nenhum teste referencia "Buscar empresa" sem "obrigatória"**.

**Testes que dependem do texto** (`grep -rn "empresa obrigat" tests` e `grep -rn "Buscar empresa" tests`, resultado idêntico): **3 referências**.

| Arquivo:linha | Consulta | De onde vem o nome |
| --- | --- | --- |
| `tests/components/FiscalActionDialogsNatureza.test.tsx:105` | `getByRole('combobox', { name: 'Buscar empresa obrigatória' })` | o dublê `tests/mocks/primereact/dropdown.tsx:37` usa `aria-label` **kebab** ou, na falta, o `placeholder`; como o `SearchSelect` passa `ariaLabel` camel (ignorado pelo dublê), o nome é o **placeholder** `Buscar ${entityName}` |
| `tests/components/SimuladorTributacaoPage.test.tsx:75` | idem | idem |
| `tests/e2e/fiscal-series.spec.ts:142` | `dialog.getByRole('button', { name: 'Buscar empresa obrigatória' })` | PrimeReact real: o **gatilho** (`role="button"`) com `aria-label = placeholder` |

Os três dependem da string `Buscar empresa obrigatória` **produzida pelo placeholder**, não pelo `aria-label` do input. O que o plano chama de "anunciado como Empresa"
só quebra esses três se o `entityName` (ou o placeholder) mudar; se mudar apenas o nome do `<input>` focável, continuam intactos.
Não há outro teste com `#empresaId`/`#filialId`/`#setorId` (`grep -rn "#empresaId\|#filialId\|#setorId" tests` = 0). Outras citações do texto estão em prosa:
`docs/IMPLEMENTACAO_V1_11_0A8B47_C3.md:12` (cita "Buscar empresa") e no `CHANGELOG.md:3258` (frase sem relação). No projeto QA só aparece em um `fakeApp`
(`logosoft-frontend-QA/tests/integracao/fakeApp.ts:439`), sem asserção sobre o texto.
Limite desta busca: é por texto literal; teste que localize o campo por posição (`getAllByRole('combobox')[n]`) não seria achado.

## 6. Divergências

1. **Medição do QA x nome acessível real (23 + 1).** 23 `<Dropdown>` crus e o `InputSwitch` de `/alimentar/lotes` **têm nome** no elemento focável
   (`aria-label` kebab no `<input readonly>` interno, `label for=aVencer` no input interno) e mesmo assim entram nas 72, porque `rotuloDe` lê só a raiz.
   Esses 24 não são ausência de nome; são ausência de nome **na raiz**.
2. **Plano seção 2: "quais das 64 são SearchSelect e quais são `<Dropdown>` cru não está medido".** Agora está: **41 SearchSelect** (todas empresa) e **23 crus**.
3. **Plano seção 2: "inferência de leitura de código, não confirmada no navegador"** (seletor de empresa preenchido e sem rótulo visível). Confirmada por **leitura do código e por renderização SSR** do próprio `EntitySelect`
   (seção 1), **não** por navegador. Continua não verificado em navegador.
4. **Plano seção 8: "~142 `<Dropdown>` crus sem `aria-label`".** O script de varredura contou 179 `<Dropdown` no total, 40 com `aria-label` kebab, 41 com `placeholder`,
   e **100 sem `aria-label` nem `placeholder`** (139 sem `aria-label`). O 142 vem de `grep` por linha; a diferença é de método e não afeta o AC-0. Importante: **os 23 crus das 72 todos têm `aria-label`**; os crus "sem `aria-label`" não estão nas 72.
5. **P2(2)/P3 não toca nenhuma das 72 que estão no escopo.** As 47 em escopo não têm `<label htmlFor>` (o QA já lê `label[for=id da raiz]`, então campo com label-por-id da raiz não entra nas 72 por construção). O único `<label for>` existente entre as 72 é o do `InputSwitch`, fora do escopo.
6. **P4 e as datas.** As 4 `DateTimeInput` de auditoria não têm `id` (`AuditoriaEventosPage.tsx:144-145`), portanto o hook por `label[for=id]` não tem de onde partir; as 2 `DateInput` de `/estoque/movimentos` têm `id` mas não têm `<label>`.
7. **Colisão de `id` com o hook (seção 4).** 20 rotas do recorte têm, enquanto o diálogo está aberto, dois elementos com `id="empresaId"` e dois com `id="filialId"`, e só o diálogo tem `<label for>`.
8. **Texto "Buscar empresa obrigatória" (seção 5).** 3 testes dependem dele, via placeholder, não via `aria-label`.
9. **Um `id` frágil do QA.** O QA clica `#organizational-empresa` (raiz). O plano P1 mantém o `id` na raiz: sem divergência; registro só como dependência externa.

Itens da lista padrão de divergências que **não se aplicam** a este recorte: campo lido pela UI que o backend não entrega, tipo Zod x resposta, enum fixo, permissão x catálogo,
endpoint fora da allowlist. O recorte é de acessibilidade de controle; nenhum endpoint, schema ou permissão foi tocado ou inventariado. `não verificado`, por escolha do recorte.

## 7. O que NÃO foi verificado

- **Nada no navegador.** Nem a leitura de nome acessível calculado (`getByRole('textbox', { name })` no DOM real), nem a execução do QA. A renderização foi `renderToStaticMarkup` (servidor).
- O mapeamento de **qual** dos 2-3 campos "(sem rótulo)" de uma página é qual (nas 23 páginas com 2 ou mais linhas "(sem rótulo)"; contagem por `grep -c`) segue a **ordem do JSX** + a ordem do relatório; a classe é a mesma entre eles, só o `arquivo:linha` individual depende dessa ordem.
- `/rh/ausencias` (2 linhas): o relatório não tem o vizinho "Buscar filial" (a página usa `showFilial={false}`), então a identificação da posição 1 como empresa e da 2 como `Dropdown` é por ordem de JSX (`AusenciasPage.tsx:93-94`), marcada `inferido`.
- Que a lista de diálogos de cada página esteja completa: a resolução é por nome do componente referenciado na página; um diálogo montado por um componente intermediário não referenciado no arquivo da página não seria visto.
- Os 640 usos vêm de varredura por expressão regular com balanceamento de chaves, validada só pelos totais (165, 75, 179); JSX gerado por `createElement` ou dinâmico escaparia.
- Backend: não se aplica a este recorte.

## 8. Arquivos e comandos de apoio

Leitura: `components/forms/{EmpresaSelect,EntitySelect,SearchSelect,FilialSelect,SetorSelect,DateInput,DateTimeInput,EmpresaFilialFilter,EmpresaFilialFields}.tsx`,
as 41 páginas/abas citadas na tabela, `tests/mocks/primereact/dropdown.tsx`, `node_modules/primereact/{dropdown,calendar,dialog,tabview}/*.cjs.js`,
`logosoft-frontend-QA/src/sweep/{inventario,contexto}.ts` e `docs/verificacao/QA-*/paginas/*.md`.
Scripts temporários (fora do repositório, em área de rascunho da sessão): `ids.cjs`, `dup.cjs`, `cross2.cjs`, `gera.cjs`, `render.cjs`, `render2.cjs`, `entry.tsx`.
