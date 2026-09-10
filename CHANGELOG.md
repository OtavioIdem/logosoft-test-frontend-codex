# v1.11.0a8b53

## Gate de permissões fechado: auditar e bloquear divergências (F1.6.b)

Onda F1 (parte 5) do plano `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §7, item F1.6. Decisão `D2` e `D3` em `docs/arquitetura/DECISOES.md`: constrói o gate que cruza cada chamada HTTP do frontend com a permissão que o contrato declara exigir. A análise abrange 481 chamadas HTTP resolvidas sobre a AST (abstract syntax tree) do repositório, comparadas às 579 operações do contrato v1.23. Zero divergência dentro do escopo — as sete divergências legítimas de `b52` foram corrigidas, e o guard de entrada de Tabelas de Preço segue as novas regras desde então.

**Exceções registradas**: 9 órfãs (módulos sem página de rota ativa) mantidas em lista nominada com teto monotônico. Nenhuma foi corrigida porque o escopo de F1.6 cobre apenas divergências de guard dentro de telas operacionais — a remoção de código morto é responsabilidade de F5.6. As exceções são:

- **Bancos**: 7 chamadas (`POST /api/bancos`, `/api/bancos/contas-bancarias`, `/api/bancos/convenios`, `/api/bancos/carteiras`, `/api/bancos/boletos/gerar`, `/api/bancos/cnab/remessas`, `/api/bancos/cnab/retornos/importar`), nenhuma tem guard.
- **Auditoria**: 1 chamada (`GET /api/auditoria/eventos`), permissão exigida é `AUDITORIA_CONSULTAR`, não tem guard (a tela que a usa agora exige `AUDITORIA_OPERACIONAL_CONSULTAR`, após `b52`).
- **Relatórios**: 1 chamada (`GET /api/relatorios/gerenciais/dashboard`), permissão exigida é `RELATORIOS_DASHBOARD_CONSULTAR`, não tem guard.

**Limite do gate**: o validador é condição **necessária** e **não suficiente**. Ele não detecta permissão em **excesso** — isto é, não pega quando um guard aceita mais permissões do que o contrato exige. Esse risco foi coberto por varredura manual (não automatizada) durante `b52` e é responsabilidade de F5.4 e F5.5. Ver comentário no cabeçalho de `scripts/validate-guard-permission-map.mjs` e seção "Limitações" no `README.md`.

**Duas correções de menu e rota constatadas na verificação** (não no plano original, portanto entram nesta versão como achados):

1. `layout/AppMenu.tsx` — item pai "Auditoria": corrige a permissão de `anyPermissions: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` para que o menu apareça para quem só tem a permissão nova (adicionado em `b52`).
2. `lib/security/routePermissions.ts` — rota `/tabelas-preco`: muda para `anyOf: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR']` (não mais aceita `VENDAS_*`), refletindo a decisão `D3` de `b52`.

**Mocks e fixtures**: nenhuma alteração nova; `b52` já preparou os conjuntos (`mockPermissions` em `tests/mocks/auth/mockAuthClient.ts` e `ADMIN_PERMISSIONS` em `tests/e2e/fixtures/logosoft.ts`).

**Testes**: novo teste unitário `tests/unit/guardPermissionMapProofHistoric.test.ts` garante que o gate continua honesto — executa a análise sobre `b52` (1312bc2) e confere que as sete divergências foram de fato corrigidas, e a árvore de hoje tem zero divergência legítima (apenas as 9 órfãs registradas).

**Ritual de versão** (`package.json`, `.env.example`, `.env.test`, `.env.backend-controlled.example`, `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`, `scripts/backend-permissions.allowlist.json`, `tests/evidence/integrated-e2e.assisted-evidence.example.json`, `README.md`, `CHANGELOG.md`) atualizado para `1.11.0a8b53`.

# v1.11.0a8b52

## Guards de permissão corrigidos: permissão existente, porém errada (F1.6.a)

Onda F1 (parte 4) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5, item F1.6. Sequência
travada em `D2` de `docs/arquitetura/DECISOES.md`: corrige agora as quatro divergências que a
varredura do `arquiteto-frontend` nomeou (481 chamadas HTTP resolvidas sobre AST × 579 operações
do contrato v1.23, 15 flags brutas, 4 verdadeiras depois da triagem), antes de `b53` construir o
gate de classe que cruza cada chamada HTTP com a permissão que o contrato declara. Os seis
códigos de permissão corretos usados nesta versão já estavam no union e no catálogo desde `b50` —
zero endpoint novo, zero contrato novo, zero permissão nova no frontend; `validate:backend-permissions`
segue em teto `0/0`. Depois que esta versão já estava em desenvolvimento, o usuário decidiu, por
`D3` em `docs/arquitetura/DECISOES.md`, trazer para dentro do escopo o guard de **entrada** de
Tabelas de Preço — que a varredura original (risco `R2`) havia deixado de fora por ter perfil de
risco diferente das outras quatro correções. Essa mudança entra como Passo 9, ao final desta
seção.

- `features/tabelas-preco/components/TabelasPrecoPage.tsx`: o guard único
  `hasAnyPermission(['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR'])`, que protegia editar,
  ativar e inativar tabela, e as ações de item, é substituído por permissões granulares. Botão
  "Nova tabela": `PermissionGuard permission="TABELAS_PRECO_GERENCIAR"` (sai `VENDAS_GERENCIAR`
  do guard). Ações de linha da tabela (editar/ativar/inativar) e do item (editar/inativar): usam
  o campo `permission` que `RowAction` (`components/data/DataTableActions.tsx`) já expunha e não
  era usado aqui — `TABELAS_PRECO_GERENCIAR`, `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`,
  `TABELAS_PRECO_ITENS_GERENCIAR`. Comportamento visual idêntico ao de hoje —
  `DataTableActions` já filtrava por permissão e escondia a ação, o diff só troca qual
  permissão é checada. O guard de **entrada** da tela e a regra de rota correspondente também
  mudam nesta versão — ver o Passo 9, ao final desta seção.
- `features/seguranca/components/SegurancaActionDialogs.tsx` (`GerenciarUsuarioDialog`): o guard
  único `SEGURANCA_USUARIOS_GERENCIAR`, que cobria os cinco botões de ação do diálogo, vira um
  `PermissionGuard` por botão: "Resetar senha" → `SEGURANCA_USUARIOS_RESETAR_SENHA`; "Vincular
  grupo" e "Remover grupo" → `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`; "Inativar" →
  `SEGURANCA_USUARIOS_INATIVAR`. "Reativar" continua `SEGURANCA_USUARIOS_GERENCIAR` — já estava
  certo e não muda. Cada botão desabilitado por falta de permissão passa a expor `title` no
  formato `"Permissão necessária: <CÓDIGO>."` (idioma já usado em
  `FiscalOperationalPanels.tsx`). "Remover grupo" mantém a composição
  `disabled || Boolean(motivoSemRemocao)`, com o `title` do `motivoSemRemocao`
  (indisponibilidade de negócio, resolvida pelo backend) tendo precedência sobre o de permissão.
  `UsuariosPage.tsx` (wiring de `acoes`) e `routePermissions.ts` (regra de
  `/seguranca/usuarios`) não mudam.
- `features/auditoria/components/AuditoriaEventosPage.tsx`: o guard de conteúdo da tela passa de
  `AUDITORIA_CONSULTAR` para `AUDITORIA_OPERACIONAL_CONSULTAR` — a permissão que
  `GET /api/auditoria/eventos` e `GET /api/auditoria/operacional` exigem de fato. O texto do
  `UnauthorizedState` passa a nomear a permissão certa. `lib/security/routePermissions.ts`
  (regra `/auditoria`) fica **permissiva de propósito**:
  `anyOf: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` — o prefixo `/auditoria`
  pode voltar a hospedar uma tela que use `AUDITORIA_CONSULTAR` de verdade quando
  `useAuditoriaEventos` deixar de ser órfão (ver `R6`); quem decide se a tela entrega conteúdo ou
  `UnauthorizedState` é o componente, não o portão de rota. `layout/AppMenu.tsx`: os dois itens
  do submenu "Auditoria" (`/auditoria/operacional` e `/auditoria/eventos` — ambos renderizam o
  mesmo `AuditoriaEventosPage`) passam a `permission: 'AUDITORIA_OPERACIONAL_CONSULTAR'`. **Ajuste
  não nomeado no plano, encontrado na verificação**: o item pai "Auditoria" também precisou virar
  `anyPermissions: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` (era
  `permission: 'AUDITORIA_CONSULTAR'`) — sem isso, o `filterMenu` de `AppMenu.tsx` esconde o
  grupo inteiro para quem tem só a permissão nova, porque pai e filhos são filtrados de forma
  independente; a sessão que a correção deveria beneficiar (só `AUDITORIA_OPERACIONAL_CONSULTAR`)
  ficaria sem ver o item de menu.
- `features/fiscal/components/FiscalOperationalPanels.tsx` (`FiscalIntegracoesTable`): o botão
  "Reprocessar" troca de `FISCAL_EMITIR` para `FISCAL_REPROCESSAR` — a permissão distinta que a
  v1.23 introduziu para essa ação (ver risco `R1`). O gate de negócio `row.podeReprocessar`
  (workflow devolvido pelo backend) permanece ortogonal à permissão e não muda.
  `routePermissions.ts` e o menu de Fiscal continuam sem separar emitir de reprocessar no portão
  de rota — essa separação é `F2.5`, fora desta versão.
- Mocks de permissão, obrigatórios para que as quatro correções acima não derrubassem o E2E
  (nenhum dos nove códigos abaixo existia nos conjuntos mockados antes desta versão):
  `tests/mocks/auth/mockAuthClient.ts` (`mockPermissions`) e `tests/e2e/fixtures/logosoft.ts`
  (`ADMIN_PERMISSIONS`) ganham `TABELAS_PRECO_CONSULTAR`, `TABELAS_PRECO_GERENCIAR`,
  `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`, `TABELAS_PRECO_ITENS_GERENCIAR`,
  `AUDITORIA_OPERACIONAL_CONSULTAR`, `SEGURANCA_USUARIOS_RESETAR_SENHA`,
  `SEGURANCA_USUARIOS_INATIVAR`, `FISCAL_REPROCESSAR`. `CONSULTA_PERMISSIONS`
  (`tests/e2e/fixtures/logosoft.ts`) foi avaliado e mantido como está: nenhum caso hoje o exercita
  contra as telas tocadas nesta versão.
- **Passo 9 — guard de entrada de Tabelas de Preço, acrescentado ao escopo por `D3` depois que
  esta versão já estava em desenvolvimento** (ver "Item à parte", na seção operacional abaixo, e
  `docs/arquitetura/DECISOES.md`): `features/tabelas-preco/components/TabelasPrecoPage.tsx` — o
  guard de entrada da tela deixa de aceitar `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e passa a exigir
  só `TABELAS_PRECO_CONSULTAR`, a permissão que `GET /api/tabelas-preco` de fato exige; o
  `UnauthorizedState` passa a nomeá-la. `lib/security/routePermissions.ts` — a regra de
  `/tabelas-preco` perde `VENDAS_*` e vira `anyOf: ['TABELAS_PRECO_CONSULTAR',
  'TABELAS_PRECO_GERENCIAR']`. `layout/AppMenu.tsx` — o item de menu "Tabelas de preço" (dentro do
  grupo "Vendas") perde `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e fica com
  `anyPermissions: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR']`; o item **pai** "Vendas"
  não muda — já incluía `TABELAS_PRECO_*` desde antes, ao lado de `VENDAS_*`, porque também
  precisa aparecer para quem só usa "Pedidos de venda". Isso fecha o risco `R2` do plano `b52` e
  **revoga o `AC-1` do Passo 1** desse mesmo plano: o `grep -c "VENDAS_GERENCIAR"` em
  `TabelasPrecoPage.tsx` agora retorna `0`, não `1` — confirmado também para `VENDAS_` em geral
  (`grep -c "VENDAS_"` retorna `0`).
- `tests/unit/moneyFormatter.test.ts`: comentário do teto monotônico atualizado de "drenadas em
  b52" para "drenadas em b54" — `D2` remanejou a drenagem das cópias locais de `formatMoney`
  (`D1`/`b51` previa `b52`). É comentário; a asserção do teto (`<= 25`) não muda.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
  `scripts/backend-permissions.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para `1.11.0a8b52`.

### Antes do deploy: o que acrescentar aos grupos de acesso

Nenhuma operação que hoje conclui deixa de concluir. Os botões que somem ou ficam desabilitados
já eram recusados pelo backend com `403` — a tela apenas parou de prometer o que não podia
entregar.

| Ação na tela | Permissão agora exigida |
| --- | --- |
| Editar / Ativar / Inativar tabela de preço, "Nova tabela" | `TABELAS_PRECO_GERENCIAR`, `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR` |
| Editar / Inativar item de tabela de preço, "Adicionar item" | `TABELAS_PRECO_ITENS_GERENCIAR` |
| Resetar senha de usuário | `SEGURANCA_USUARIOS_RESETAR_SENHA` |
| Vincular / Remover grupo de acesso do usuário | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Inativar usuário | `SEGURANCA_USUARIOS_INATIVAR` |
| Ver "Auditoria operacional" / "Eventos de auditoria" | `AUDITORIA_OPERACIONAL_CONSULTAR` |
| Reprocessar integração fiscal | `FISCAL_REPROCESSAR` |

Preparação, em `/seguranca/grupos-acesso` → editar grupo → campo **Permissões** (o `MultiSelect`
de `GrupoAcessoFormDialog.tsx`, alimentado pelo catálogo completo desde `b50` — a tela já existe
hoje):

- Aos grupos que já têm `SEGURANCA_USUARIOS_GERENCIAR`: acrescentar
  `SEGURANCA_USUARIOS_RESETAR_SENHA`, `SEGURANCA_USUARIOS_INATIVAR` e
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`.
- Aos grupos que têm `TABELAS_PRECO_GERENCIAR` ou `VENDAS_GERENCIAR` e mexem em preço:
  acrescentar `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`, `TABELAS_PRECO_ITENS_GERENCIAR`.
- Aos grupos que têm `AUDITORIA_CONSULTAR`: acrescentar `AUDITORIA_OPERACIONAL_CONSULTAR`.
- Aos grupos que têm `FISCAL_EMITIR` e devem reprocessar integrações: acrescentar
  `FISCAL_REPROCESSAR`.

**O único caminho de auto-bloqueio**: se a preparação acima não for feita antes do deploy, o
administrador que tem apenas `SEGURANCA_USUARIOS_GERENCIAR` abre "Gerenciar usuário" e encontra
quatro dos cinco botões desabilitados (Resetar senha, Vincular grupo, Remover grupo, Inativar —
só "Reativar" continua liberado, pois usa a mesma permissão de sempre). **Se esse administrador
for o único com permissão para editar grupos de acesso, ele precisa ganhar
`SEGURANCA_GRUPOS_ACESSO_GERENCIAR` antes do deploy, sob pena de precisar de intervenção direta
no backend para se desbloquear.** Quem administra como `isMaster` ou com a permissão `'*'`
(`lib/permissions/permissions.ts`) passa por qualquer guard e não perde nada com esta versão.

### Item à parte: Tabelas de Preço deixa de aceitar permissão de Vendas na entrada

Diferente dos sete itens da tabela acima, este é o **único ponto desta versão em que alguém perde
acesso de verdade, e não apenas a ilusão de um botão que já era recusado pelo backend**. Decisão do
usuário, `D3` em `docs/arquitetura/DECISOES.md`, acrescentada ao escopo depois que a versão já
estava em desenvolvimento (Passo 9).

Hoje, quem tem só `VENDAS_CONSULTAR` ou `VENDAS_GERENCIAR` **entra** na tela de Tabelas de Preço —
ainda que veja a lista sempre vazia, porque `GET /api/tabelas-preco` já exige
`TABELAS_PRECO_CONSULTAR` e o backend recusa a consulta. Depois desta versão, esse mesmo usuário
deixa de ver o item de menu "Tabelas de preço" e, se acessar `/tabelas-preco` direto pela URL,
recebe `UnauthorizedState` nomeando `TABELAS_PRECO_CONSULTAR`.

**Antes do deploy**: aos grupos que têm `VENDAS_CONSULTAR` ou `VENDAS_GERENCIAR` e precisam de
Tabelas de Preço, acrescentar `TABELAS_PRECO_CONSULTAR` em `/seguranca/grupos-acesso` → editar
grupo → **Permissões** — sob pena de o módulo sumir do menu e da rota para o cargo inteiro.

A frase "nenhuma operação que hoje conclui deixa de concluir" continua verdadeira aqui também — a
lista já vinha vazia para esse público — mas o **acesso à tela** some, e isso o operador percebe
imediatamente, diferente dos botões desabilitados dos outros sete itens.

- **Teste novo, fora desta entrega** (é do `engenheiro-testes`): reescrita de
  `tests/unit/tabelasPrecoB40Structure.test.ts` (a asserção que hoje fixa
  `PermissionGuard anyOf={['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']}` e
  `canManageTabelaPreco` fica vermelha por esta versão, de propósito),
  `tests/unit/routePermissions.test.ts` (o `toEqual(['AUDITORIA_CONSULTAR'])` da regra de
  `/auditoria` também fica vermelho, de propósito), `tests/unit/auditoriaB45Structure.test.ts`
  (caso novo cobrindo `AUDITORIA_OPERACIONAL_CONSULTAR` em rota e menu),
  `tests/unit/segurancaB39Structure.test.ts` (caso novo cobrindo os cinco guards/quatro códigos
  distintos) e quatro casos novos de E2E em `tests/e2e/permissions.spec.ts` (AC-13 a AC-16 do
  plano `b52`). O Passo 9 acrescenta: no mesmo `tabelasPrecoB40Structure.test.ts`, o caso do guard
  de entrada passa a exigir `TABELAS_PRECO_CONSULTAR` e a proibir `VENDAS_*`; em
  `routePermissions.test.ts`, a regra de `/tabelas-preco` muda; em `permissions.spec.ts`, dois
  casos novos (AC-18, AC-19 do plano `b52`).
- **Fora do escopo desta versão** (nominalmente, ver plano `b52`): `types/erp.ts` e
  `features/seguranca/permissoesCatalogo.ts` (fecharam em `b50`, teto `0/0`); os três JSON de
  `scripts/` (só o carimbo de versão); `lib/formatters/money.ts` (entregue em `b51`, `D1`);
  `features/*/api|hooks|schemas|types` (nenhuma rota, payload, Zod, `queryKey`, `enabled` ou
  mutação muda); `components/data/DataTableActions.tsx` (`RowAction` não ganha campo `title`
  nesta versão — proposta para `F5`); `components/security/PermissionGuard.tsx` e
  `lib/permissions/permissions.ts` (contrato do guard e semântica de `isMaster`/`'*'`
  inalterados); a regra de `/seguranca/usuarios` e o wiring `acoes` de `UsuariosPage.tsx`; a separação
  emitir × reprocessar no portão de rota e no menu de Fiscal (`F2.5`); regra de negócio
  (`isTabelaAtiva`, `isContaEncerrada`, `motivoRemocaoIndisponivel`, `podeReprocessar` — todas do
  backend); bancos, relatórios, dashboard, shared (órfãos de `F5.6`); o gate de classe que cruza
  chamada HTTP × permissão do contrato (`F1.6.b`/`b53`).
- **Riscos e pendências**: `R1` — `FISCAL_REPROCESSAR` é permissão nova da v1.23
  (`novasEmV123` no snapshot); é plausível que nenhum grupo em produção a possua hoje e o botão
  "Reprocessar" desapareça para todo usuário não-master até a preparação acima ser feita — não é
  regressão (o backend já recusava a ação), mas fica pergunta em aberto para o backend: a
  migração da v1.23 concedeu `FISCAL_REPROCESSAR` a algum grupo existente? `R2` — **resolvido
  nesta versão pelo Passo 9, por decisão do usuário (`D3`)**: o guard de entrada de Tabelas de
  Preço e a regra de rota deixaram de aceitar `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e passaram a
  exigir `TABELAS_PRECO_CONSULTAR`. Ver "Item à parte", na seção operacional acima, para o efeito
  em quem hoje só tem permissão de Vendas. `R6` — achados órfãos da
  varredura, só registrados aqui, tratamento em `F5.6`: `useAuditoriaEventos` e
  `useRelatorioDashboardConsolidado` sem consumidor; `BancosDialogs.tsx` não é importado por
  ninguém; `CnabPage` e `CadastrosBancariosPage` são placeholders de 15 linhas — consequência
  colateral: `AUDITORIA_CONSULTAR` hoje não protege nenhuma chamada real no produto. `A1` —
  ambiguidade de contrato sem efeito nesta versão: `POST /api/tabelas-preco` e
  `GET /api/tabelas-preco/{id}` declaram `Response DTO UsuarioResponse`, e `PUT` declara
  `CargoAcessoResponse` — pergunta ao backend, reforça a proposta de `ProducesResponseType`.

# v1.11.0a8b51

## `formatMoney` deixa de mascarar ausência com R$ 0,00 (F1.4)

Onda F1 (parte 3) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5. Decisão de desenho travada
em `D1` de `docs/arquitetura/DECISOES.md`: duas funções em vez de uma assinatura com opções.

- `lib/formatters/money.ts`: contrato novo. `formatMoney(value: number | null | undefined): string`
  — para campo que o contrato do backend declara obrigatório. Remove o `?? 0` que mascarava
  ausência com `R$ 0,00` plausível (o defeito P1 da onda F1.1). Ausência (`null`/`undefined`/`NaN`)
  denuncia na própria célula em desenvolvimento com o texto `"valor ausente (contrato)"` e degrada
  para exatamente `"—"` em produção. O sinal de ambiente é `process.env.NODE_ENV`, lido dentro da
  função (não `appConfig.env`/`NEXT_PUBLIC_APP_ENV`, que nunca vale `production` neste
  repositório — embarcaria o modo ruidoso em produção). Sem `console` (proibido por
  `validate:source`) e sem `throw` (derrubaria a `DataTable` inteira em vez da célula).
  `formatMoneyOptional(value, fallback = '—'): string` — para campo que o contrato declara
  opcional; ausência rende o `fallback` em silêncio, sem denúncia em nenhum ambiente. Invariante
  que a mudança não quebra: `formatMoney(0)` continua `"R$ 0,00"` — zero legítimo é diferente de
  campo ausente.
- `features/financeiro/components/financeiroUiUtils.ts`, `features/compras/components/comprasUiUtils.ts`,
  `features/vendas/components/vendasUiUtils.ts`: a cópia local de `formatMoney` (que fazia
  `?? 0`/`Number(value ?? 0)`) é removida; os três arquivos passam a reexportar `formatMoney` e
  `formatMoneyOptional` de `@/lib/formatters/money`. Os importadores existentes (financeiro: 3;
  compras: 4; vendas: 3) continuam intactos — diff pequeno, mesmo nome, contrato novo.
- `features/financeiro/hooks/useFinanceiroOriginOptions.ts`: apaga a cópia local de `formatMoney`
  (fazia `value ?? 0` sobre `pedido.valorTotal`, um campo que o autor supôs obrigatório); importa
  `formatMoney` de `@/lib/formatters/money`.
- `features/tabelas-preco/components/TabelasPrecoPage.tsx`: apaga a cópia local; `precoVenda` e
  `precoMinimo` passam a usar `formatMoney` (importado da lib) nos dois pontos de exibição (itens
  da tabela e preço vigente). Ambiguidade registrada: não há confirmação do backend de que
  `precoMinimo` seja opcional — decisão de falhar para o lado ruidoso (`formatMoney`, não
  `formatMoneyOptional`), porque se o campo for de fato opcional a denúncia em dev provoca
  pergunta; se for obrigatório e eu tivesse suposto opcional, o defeito voltaria a ser silencioso.
- `features/patrimonio/components/BensPage.tsx`, `features/contratos/components/ContratosPage.tsx`,
  `features/producao/components/OrdensProducaoPage.tsx`, `features/rh/components/BeneficiosPage.tsx`:
  as quatro cópias locais que já renderizavam `value == null ? '—' : ...` (evidência empírica de
  ausência legítima) são removidas; os call sites (`valorContabil`/`valorAquisicao`,
  `valorTotal`/`franquia`/`valorExcedente`/`valorFixo`, `custoConsolidado`, `valor` de benefício e
  concessão) passam a chamar `formatMoneyOptional` importado de `@/lib/formatters/money`
  explicitamente — a intenção declarada fica visível no diff e auditável por
  `grep formatMoneyOptional`, em vez de reimplementada célula a célula.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
  `scripts/backend-permissions.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para `1.11.0a8b51`.
- **Teste novo, fora desta entrega** (é do `engenheiro-testes`):
  `tests/unit/moneyFormatter.test.ts`, que fixa o contrato acima (AC-1 a AC-5 do plano) e o teto
  monotônico de cópias locais `(value: number) =>` restantes (24, medidas por
  `grep -rn "const formatMoney" features lib` — ver "Fora do escopo").
- **Fora do escopo desta versão** (nominalmente, ver plano `b51`): as 24 cópias locais com
  assinatura `(value: number)` em `bancos`, `clientes`, `compras-avancado`, `contabil`, `crm`,
  `faturamento`, `financeiro-avancado`, `frota`, `patrimonio/DepreciacaoPage`, `pdv`, `produtos`,
  `rh/ColaboradoresPage`, `rh/EventosPage`, `servicos` — elas não mascaram: com `undefined` lançam
  `TypeError` e derrubam o render da linha, classe de defeito diferente (barulhenta, não
  silenciosa), congelada por teto de teste e drenada em `b52`. `lib/formatters/display.ts`
  (`formatDisplayValue`, `Number(value ?? 0)` para `type === 'money'`) — mesmo defeito, mas só a
  camada órfã de F5.6 o consome; some junto com ela. Guards de permissão errados (F1.6) — versão
  seguinte.

# v1.11.0a8b50

## União e catálogo de permissões fechados (F1.2, F1.3)

Onda F1 (parte 2) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5. Fecha o registro auditável
aberto em b48/b49 (`scripts/backend-permissions.allowlist.json`): 3 permissões fantasma e 36
coberturas pendentes.

- `types/erp.ts` (union `PermissionCode`): removidas `ATIVIDADES_GERENCIAR`,
  `RELATORIOS_CONSULTAR` (nunca existiram no backend) e `PORTARIA_PRE_AUTORIZAR` (grafia
  incorreta). Acrescentadas as 36 permissões que `npm run report:backend-permissions` listava em
  `coberturaPendente`, agrupadas junto do módulo vizinho já existente no union: 5 granulares de
  Atividades (`CRIAR`/`ATUALIZAR`/`CANCELAR`/`COMENTAR`/`ATRIBUIR`), `AUDITORIA_OPERACIONAL_CONSULTAR`,
  `INFRAESTRUTURA_CONSULTAR`/`BACKUP_CONSULTAR`, `SEGURANCA_USUARIOS_INATIVAR`/`RESETAR_SENHA`,
  `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR`, `SEGURANCA_PARAMETROS_CONSULTAR`/`GERENCIAR`,
  `PESSOAS_BLOQUEAR`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`, `CLASSIFICACOES_PESSOA_GERENCIAR`,
  `TRANSPORTADORAS_CONSULTAR`/`GERENCIAR`, `TABELAS_PRECO_ATIVAR`/`INATIVAR`/`ITENS_GERENCIAR`,
  `POLITICA_COMERCIAL_GERENCIAR`, `VENDAS_PRECO_MINIMO_SOBRESCREVER`,
  `FINANCEIRO_CAIXA_GERENCIAR`/`BANCO_GERENCIAR`, `FISCAL_REPROCESSAR`,
  `FISCAL_CADASTROS_GERENCIAR`, `FISCAL_SERIES_CONSULTAR`/`GERENCIAR`, `FISCAL_MODELOS_CONSULTAR`,
  `INTEGRACOES_CONSULTAR`/`GERENCIAR`/`REPROCESSAR`, `FATURAMENTO_RETOMAR_REVERSAO` e
  `PORTARIA_PREAUTORIZAR` (substitui a grafia incorreta na mesma posição). Union: 144 → 177.
- `features/seguranca/permissoesCatalogo.ts`: catálogo `Record<PermissionCode, …>` acompanha o
  union — mesmas 3 remoções, mesmas 36 adições, com `{ grupo, label }`. Corrigido também o rótulo
  mentiroso de `SEGURANCA_PERMISSOES_GERENCIAR` (`"Grupos de acesso · Gerenciar"` →
  `"Cargos de acesso · Gerenciar"`): essa permissão guarda Cargos de acesso, não Grupos de acesso
  — origem documental do P2 do plano. Catálogo: 144 → 177.
- `lib/security/routePermissions.ts`: `/seguranca/grupos-acesso` passa a exigir
  `anyOf: ['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR']` em vez de
  `SEGURANCA_PERMISSOES_GERENCIAR`; `/portaria` corrige a grafia para `PORTARIA_PREAUTORIZAR`;
  `/atividades` troca `ATIVIDADES_GERENCIAR` pelas cinco permissões granulares.
- `layout/AppMenu.tsx`: item de menu "Grupos de acesso" passa a exigir
  `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR` (mantido `SEGURANCA_PERMISSOES_GERENCIAR` no
  `anyPermissions` do grupo pai "Segurança", que também cobre outros itens do menu); "Portaria" e
  "Atividades" acompanham a grafia/granularidade corrigidas em `routePermissions.ts`.
- `features/seguranca/components/GruposAcessoPage.tsx`: guard de página passa a
  `hasAnyPermission(['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR'])`
  com texto de `UnauthorizedState` atualizado; "Novo grupo", "Editar" e "Inativar" passam a exigir
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`. **Mudança de acesso visível**: quem tem
  `SEGURANCA_GRUPOS_ACESSO_*` mas não `SEGURANCA_PERMISSOES_GERENCIAR` passa a ver a tela; quem só
  tinha `SEGURANCA_PERMISSOES_GERENCIAR` perde a tela — é a correção do P2, não uma regressão.
- `features/portaria/components/PortariaPage.tsx` e `PreAutorizacoesTab.tsx`: guard de página,
  item "Nova pré-autorização" e ação "Cancelar" trocam `PORTARIA_PRE_AUTORIZAR` por
  `PORTARIA_PREAUTORIZAR` (grafia real da constante C# `PortariaPreAutorizar`, catálogo §12 e
  `POST /api/portaria/pre-autorizacoes`).
- `features/atividades/components/AtividadesPage.tsx`: guard de página exige
  `['ATIVIDADES_CONSULTAR', 'ATIVIDADES_CRIAR', 'ATIVIDADES_ATUALIZAR', 'ATIVIDADES_CANCELAR',
  'ATIVIDADES_COMENTAR', 'ATIVIDADES_ATRIBUIR']`; "Nova atividade" exige `ATIVIDADES_CRIAR`;
  ações da tabela mapeadas por operação real do backend: "Editar"/"Status" →
  `ATIVIDADES_ATUALIZAR` (`PUT /api/atividades/{id}` e `POST /api/atividades/{id}/status`
  atualizam o mesmo agregado), "Atribuir" → `ATIVIDADES_ATRIBUIR`, "Comentar" →
  `ATIVIDADES_COMENTAR`, "Cancelar" → `ATIVIDADES_CANCELAR`. "Detalhe" continua exigindo só
  `ATIVIDADES_CONSULTAR` (é leitura).
- `scripts/backend-permissions.allowlist.json`: `fantasmasConhecidos` e `coberturaPendente`
  esvaziados; `teto` passa de `{ fantasmas: 3, coberturaPendente: 36 }` para `{ fantasmas: 0,
  coberturaPendente: 0 }` — tolerância zero a partir de agora; `version` → `1.11.0a8b50`.
- `scripts/backend-permissions.snapshot.json`: regenerado via
  `npm run generate:backend-permissions-snapshot` com `version: 1.11.0a8b50` (conteúdo nomeado
  inalterado — só a versão do artefato muda).
- `tests/mocks/auth/mockAuthClient.ts` e `tests/e2e/fixtures/logosoft.ts`: `mockPermissions` /
  `ADMIN_PERMISSIONS` trocam `ATIVIDADES_GERENCIAR` pelas cinco granulares, removem
  `RELATORIOS_CONSULTAR` e acrescentam `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR`;
  `CONSULTA_PERMISSIONS` apenas perde `RELATORIOS_CONSULTAR`. Sem esse ajuste o typecheck não
  fecha (os mocks são tipados por `PermissionCode`) e os fixtures E2E concederiam uma string morta.
- `docs/CI_GATES_FRONTEND.md` §8: os números "3 e 36" e a frase "o gate de permissões nasce
  vermelho por desenho" (verdadeiros em b48/b49) passam a descrever o estado fechado: nasceu
  vermelho em b48 com 3 fantasmas + 36 coberturas pendentes; zerado nesta versão (F1.2/F1.3); o
  teto `0/0` é agora tolerância zero.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para
  `1.11.0a8b50`.
- **Testes que ficam vermelhos por desenho ao fim desta versão** (reescrita é do
  `engenheiro-testes`, não desta entrega): `tests/unit/backendPermissions.test.ts` (contadores de
  fantasma/cobertura pendente e os `toContain` das 3 strings fantasma),
  `tests/unit/routePermissions.test.ts` (`ATIVIDADES_GERENCIAR`), `tests/unit/portariaStructure.test.ts`
  e `tests/unit/atividadesB43Structure.test.ts` (grafia/granularidade),
  `tests/unit/segurancaB39Structure.test.ts` (`SEGURANCA_PERMISSOES_GERENCIAR` →
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`). Teste novo pendente:
  `tests/unit/permissoesUnionCatalogo.test.ts`.
- **Fora do escopo desta versão** (nominalmente, ver plano): `features/tabelas-preco/`,
  `features/seguranca/components/SegurancaActionDialogs.tsx`, `features/auditoria/` (guards com
  permissão existente porém errada — F1.6); `features/fiscal/` (`FISCAL_REPROCESSAR` sem guard —
  F2.5); `features/faturamento/` (`FATURAMENTO_RETOMAR_REVERSAO` sem consumidor — F2.1);
  `features/shared/config/erpFeatureCatalog.ts` (F5.6); `scripts/validate-backend-permissions.mjs`
  e `scripts/lib/backend-permissions.mjs` (o script não muda, só os dados da allowlist);
  `lib/formatters/money.ts` e o restante de F1.4 (versão b51).
- **Ambiguidade registrada, não resolvida nesta versão**: o contrato declara 178 permissões
  nomeadas; a união medida entre as duas fontes documentais dá 177 — uma permissão do backend
  segue sem nome em nenhuma fonte (`naoConciliado.quantidade: 1` no snapshot). Não foi inventada.

# v1.11.0a8b49

## Contrato monetário do Financeiro (F1.1)

- `features/financeiro/types/financeiro.types.ts`: renomeados os 5 tipos de response afetados
  pelo P1 (`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`, §2). `ParcelaReceberResponse` e
  `ParcelaPagarResponse` passam a declarar `valorOriginal`, `valorPago`, `valorJuros`,
  `valorMulta`, `valorDesconto`, `valorSaldo` (o contrato não expande esses records; os nomes
  vêm da prosa do plano). `RecebimentoResponse.parcelaId` → `parcelaReceberId`;
  `PagamentoResponse.parcelaId` → `parcelaPagarId` (inferência por simetria, sem confirmação
  literal no contrato). `ContaReceberResponse`/`ContaPagarResponse` trocam
  `valorTotal`/`saldo`/`status`+`statusConta` por `valorOriginal`/`valorJuros`/`valorMulta`/
  `valorDesconto`/`valorSaldo`/`status` (campo único) — com uma correção ao texto do plano:
  o contrato real (`CONTRATO-API-v1.23.md:3268-3450`) declara `ContaPagarResponse.ValorPago`
  mas `ContaReceberResponse.ValorRecebido`, não `ValorPago` nos dois; o tipo segue o contrato,
  não a prosa. **Não tocados**: `ParcelaFinanceiraRequest`, `ReceberContaRequest.parcelaId`,
  `PagarContaRequest.parcelaId` — o rename de `parcelaId` vale só para os records de response.
- `features/financeiro/components/financeiroUiUtils.ts`: `countOpenFinancialRecords` passa a
  ler `{ valorSaldo }` em vez de `{ saldo }`. `origemFinanceiraOptions` **não muda** — alimenta
  tanto o dropdown de criação quanto `origemFinanceiraLabel` da coluna "Origem"; removê-la ali
  quebraria a coluna para toda conta derivada de compra pelo backend.
- `features/financeiro/components/ContasFinanceirasPage.tsx`: cards de resumo e colunas
  "Total"/"Saldo" passam a ler `valorOriginal`/`valorSaldo`; `displayStatus` lê só `record.status`.
- `features/financeiro/hooks/useFinanceiroResources.ts`: novos `contaReceberQueryKey(id)` /
  `contaPagarQueryKey(id)` e `useContaReceberDetalhe(id, enabled)` /
  `useContaPagarDetalhe(id, enabled)` (`enabled: Boolean(id) && enabled`, padrão de
  `pedidoVendaQueryKey`/`usePedidoVenda`). As mutations de baixa, estorno e cancelamento
  passam a invalidar o detalhe (`contaReceberQueryKey`/`contaPagarQueryKey`) além da lista.
- `features/financeiro/components/FinanceiroActionDialogs.tsx`: `BaixaFinanceiraDialog` deixa
  de confiar no registro selecionado da lista e passa a consumir o hook de detalhe
  (`enabled: visible`). Estados cobertos: **loading** (dropdown de parcela e confirmar
  desabilitados, campo Valor sem placeholder monetário — `valor` nasce `null`, não `0`);
  **erro** ("Não foi possível carregar as parcelas desta conta.", confirmar bloqueado, sem
  cair para o registro da lista); **sem parcela** (mensagem existente, confirmar bloqueado);
  **sucesso** (invalida lista e detalhe). Novo campo derivado `valor > 0`: confirmar
  bloqueado e `FieldError` "Informe um valor maior que zero." — validação de UX; o teto contra
  o saldo da parcela é regra de domínio do backend, via 400 mapeado por `mapApiError`.
- `features/dashboard/api/dashboardApi.ts`: `ContaFinanceiraResumo` (consumidor não listado no
  plano, mas com o mesmo defeito) passa a `{ valorSaldo?, valorOriginal?, status? }`; os cards
  de "Contas a receber/pagar em aberto" somam `conta.valorSaldo` filtrando por
  `isOpenFinancialStatus(conta.status)`.
- `features/bancos/components/BancosOperacoesDialogs.tsx`: dropdown de parcela do diálogo de
  boleto (outro consumidor não listado no plano) passa a exibir `parcela.valorSaldo`.

## Origem morta em Contas a Pagar (F1.5)

- `features/financeiro/components/ContaFinanceiraFormDialog.tsx`: para `type === 'pagar'`, o
  dropdown de Origem passa a oferecer só `Manual` (decisão do usuário: Manual-only), fica
  desabilitado e ganha o texto de apoio "A
  origem de uma conta a pagar é derivada pelo backend a partir do documento que a gerou. O
  lançamento manual nasce com origem Manual." `needsOriginReference`/`unsupportedOriginReference`
  deixam de considerar `OrigemFinanceira.Compra` — como nenhum dos dois tipos oferece mais essa
  origem no dropdown, o `EntitySelect` de documento de origem e o `Message` que prometia um
  envio recusado pelo backend nunca mais renderizam. Contas a Receber **não muda**: `Origem =
  Pedido de venda` continua válida, com `EntitySelect` — o guard do backend não existe lá.
- `features/financeiro/hooks/useFinanceiroOriginOptions.ts`: removido o ramo
  `OrigemFinanceira.Compra` (query morta a `/api/compras/pedidos`).

## Fixture E2E consertada (item 10 do plano)

- `tests/e2e/fixtures/logosoft.ts`: `contasReceber`/`contasPagar` liam `valorTotal`/`saldo`/
  `statusConta`/`status: 'ABERTO'` — a mesma mentira de contrato que o frontend tinha antes
  desta versão. Reescritas no formato real de `ContaReceberResponse`/`ContaPagarResponse`, com
  `parcelas[].valorSaldo` preenchido e saldo verificável (`R$ 251,00` em Contas a Receber, a
  partir do pedido de venda de 251 já existente na fixture). Adicionado roteamento por id
  (`GET /api/financeiro/contas-{receber,pagar}/{id}`) antes do `.includes()` genérico da lista,
  necessário para o novo hook de detalhe do diálogo de baixa.

## Validação executada

```bash
npm run validate:source
npm run typecheck
npm run lint
npx vitest run tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts
npx playwright test tests/e2e/financeiro-estoque.spec.ts
```

# v1.11.0a8b48

## Gate de permissões frontend/backend

- Novo `scripts/lib/backend-permissions.mjs`, extração compartilhada (mesmo padrão de `scripts/lib/backend-contract-map.mjs`): parseia o union `PermissionCode` de `types/erp.ts`, o catálogo `PERMISSOES_CATALOGO` de `features/seguranca/permissoesCatalogo.ts`, as permissões anexadas a cada uma das 579 operações de `docs/backend-v1.23/CONTRATO-API-v1.23.md` e a tabela `Constante C# → Código` da seção "12. Catálogo de permissões" de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`.
- Novo `scripts/generate-backend-permissions-snapshot.mjs` (script `generate:backend-permissions-snapshot`) regenera `scripts/backend-permissions.snapshot.json` como a união nomeada das duas fontes documentais — schemaVersion 2, 179 códigos (177 nomeados + `MASTER_GOD` + `*`), `permissions` ordenado alfabeticamente. `generatedAt` é derivado de `sourceDate` (não do relógio), então a geração é idempotente por construção. O script nunca entra em `ci:gates`.
- Registradas no snapshot: as permissões novas do contrato v1.23 sem representação prévia (`FISCAL_REPROCESSAR`, `FATURAMENTO_RETOMAR_REVERSAO` — pré-requisitos de F2.5 e F2.1), as permissões do catálogo §12 sem nenhuma operação em v1.23 (`SEGURANCA_SESSOES_GERENCIAR`, `FINANCEIRO_CAIXA_GERENCIAR`, `FINANCEIRO_BANCO_GERENCIAR`, `POLITICA_COMERCIAL_GERENCIAR`, `VENDAS_PRECO_MINIMO_SOBRESCREVER`, mantidas por não haver como provar remoção) e 1 permissão declarada pelo backend (178 no total) que não aparece em nenhuma das duas fontes — `naoConciliado`, não inventada.
- Novo `scripts/validate-backend-permissions.mjs` (scripts `validate:backend-permissions` e `report:backend-permissions --report`), ligado a `ci:gates`, `validate:source` e ao workflow de CI logo após o gate de mapa de rotas. Compara o union `PermissionCode` contra o snapshot nas duas direções: permissão **fantasma** (no union, fora do snapshot — guard impossível de satisfazer) e **cobertura pendente** (no snapshot, fora do union — permissão do backend sem representação no frontend). Hoje: 3 fantasmas (`ATIVIDADES_GERENCIAR`, `RELATORIOS_CONSULTAR`, `PORTARIA_PRE_AUTORIZAR`) e 36 pendências.
- Nova `scripts/backend-permissions.allowlist.json`: registro **fechado e monotônico** (não uma supressão) — `suppressions` sempre `[]`, `teto` trava o número de itens hoje, cada entrada exige `usos`/`backendOperacoes` reais e um alvo de onda (`F1.2` para cobertura pendente, `F1.3` para fantasma), e entrada que deixar de corresponder a uma divergência observada reprova o gate (anti-apodrecimento). Diferente do gate de rotas (`backend-contract-map.allowlist.json`, tolerância zero), este nasce vermelho porque já existe dívida medida; a allowlist documenta essa dívida sem escondê-la.
- Corrigida a indentação de `frontend-ci.yml:31` (bloco `env` do job `frontend-gates`) e reescrito `scripts/validate-ci-gates.mjs` para carregar o workflow com `js-yaml` (parse real, leitura estrutural de `jobs['frontend-gates'].env`, listas fechadas `allowedWorkflowJobs`/`allowedFrontendGatesEnvKeys`), em vez de checagens por regex/`includes` sobre o texto cru do YAML.

## Pendências registradas nesta versão

- `tests/unit/backendContractMap.test.ts:25-26` ainda afirma `permissionsSnapshot.count === 177` (schemaVersion 1); fica vermelho até o teste ser atualizado para o schemaVersion 2 (179).
- `npm run ci:gates` continua com a dívida herdada de `test:e2e:fiscal` (`tests/e2e/fiscal.spec.ts:27`, timeout no heading "Nota fiscal 1/900001"), fora do escopo desta versão.
- `SEGURANCA_SESSOES_GERENCIAR` está no union e no snapshot (via catálogo §12) mas sem nenhuma operação no contrato v1.23 — não é divergência hoje, mas é candidata a virar um 4º fantasma se o catálogo §12 for podado sem uma operação v1.23 equivalente.

## Validação executada

```bash
npm run generate:backend-permissions-snapshot
npm run validate:backend-permissions
npm run report:backend-permissions
npm run validate:ci
npm run validate:source
npm run typecheck
npm run lint
```

# v1.11.0a8b47.c3

## Contexto organizacional acessível

- Corrigida a regra `.layout-topbar-button span { display: none }`, que era seletor de elemento e apagava o ícone e o rótulo de qualquer componente PrimeReact aninhado no topbar. O rótulo passa a ser ocultado pela classe `.layout-topbar-button-label`.
- O botão "Selecionar contexto" existia no DOM mas renderizava como um círculo vazio e invisível, deixando o usuário master sem nenhuma forma de escolher empresa/filial. Ele virou `<button>` nativo com `<i>`, no mesmo padrão dos irmãos do topbar.
- Pelo mesmo motivo, o contador de notificações não lidas (`Badge` do PrimeReact) estava invisível no desktop e voltou a aparecer.
- Novo `SelecionarContextoButton` compartilhado: além do topbar, o CTA aparece dentro do estado bloqueado de Filiais e ao lado dos filtros Empresa/Filial travados, eliminando o beco sem saída.
- A política de contexto de `b47.c1/.c2` foi preservada: `empresaLocked` continua `true` e os filtros seguem alinhados ao snapshot, sem segunda fonte de verdade.

## Explicação de tela concentrada no tooltip

- Removidos 21 banners `Message severity="info"` estáticos do topo das telas; a explicação já é servida pelo tooltip do título no topbar, com fallback no cabeçalho compacto abaixo de 992px.
- Regras de negócio que viviam apenas nesses banners (bloqueio por status, LGPD de auditoria, não recálculo de indicadores) migraram para a `description` do `PageHeader`, sem perda de conteúdo.
- Removido o campo `listDescription` de `administracaoPageConfig` e o `pageText.info` de `MovimentoOperacionalPage`.
- Preservadas as mensagens condicionais de estado, de workflow do backend, de compliance fiscal em abas de detalhe e as de cards/diálogos sem `PageHeader`.

## Vínculo de grupo de acesso visível

- A tela de Usuários guardava `UsuarioResponse` congelado em `useState`; passou a guardar o id e derivar o usuário da listagem, eliminando o snapshot velho por construção.
- `UsuarioResponse` não devolve grupos em nenhum endpoint do contrato. O acesso efetivo passa a ser consultado em `GET /api/seguranca/usuarios/{id}/permissoes-efetivas`, e os grupos vinculados são derivados de `origens[].grupoAcessoId`.
- Após vincular um grupo, o diálogo de gestão reabre com o acesso efetivo recarregado, em vez de apenas emitir um toast e fechar.
- "Remover grupo" deixou de assumir "o primeiro grupo" e ganhou diálogo próprio com escolha do grupo vinculado e motivo. Quando indisponível, o motivo é escrito na tela em vez de o botão ficar cinza e mudo.
- Removida a coluna "Grupos" da listagem, que era sempre `-` com o contrato atual.
- Registrada a permissão `SEGURANCA_PERMISSOES_CONSULTAR`, que já existia no snapshot do backend e faltava no frontend.

## Pendências de backend registradas

- `UsuarioResponse` não expõe `GruposAcesso`; enquanto isso, os grupos dependem de `origens` de `permissoes-efetivas`.
- `OrigemPermissaoEfetivaResponse.CargoAcessoId` é não anulável, o que sugere que apenas o caminho cargo → grupo aparece em `origens`. A tela trata explicitamente o caso "origem indisponível".
- `AtribuirGrupoUsuarioRequest` não tem `Motivo`, embora `RemoverGrupoUsuarioRequest` tenha. O frontend segue enviando o campo, mas parou de prometer auditoria que o backend descarta.
- `buildCriarUsuarioPayload` envia `login` e `gruposAcessoIds`, ausentes do contrato — provável segunda ocorrência do mesmo defeito, não alterada nesta versão.

## Validação executada

```bash
npm run validate:source
npm run typecheck
npm run lint
```

# v1.11.0a8b47.c2

## Consulta segura de filiais

- Removido o singleton assíncrono do contexto organizacional; cada request escopado carrega snapshot imutável na própria metadata.
- Criado o escopo `lookup` exclusivo para `GET /api/administracao/filiais`, com `empresaId` explícito, sem `filialId` e sem body.
- Corrigido o bypass funcional de master no catálogo de permissões, mantendo `MASTER_GOD` e `*` fora do bypass solicitado.
- Selects de filial distinguem vazio, erro recuperável e ausência de acesso, com retry explícito.

# v1.11.0a8b47.c1

## Política de contexto organizacional

- Publicada política HTTP discriminada por metadata (`global`, `query`, `body` e `resource`) com snapshot somente leitura e chave estável.
- Ativadas apenas `GET /api/administracao/empresas` como global e `GET /api/administracao/filiais?empresaId` como query obrigatória.
- Movidos os selects de empresa e filial do topbar para Dialog PrimeReact; a faixa de título continua exibindo somente a página atual e ajuda.
- Corrigidos os testes estruturais legados para a política `audit-only-no-suppressions`.
- Mantida a Onda 1 em andamento; nenhum endpoint operacional adicional foi ativado.

## Validação esperada

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/organizationalContextPolicy.test.ts tests/unit/organizationalContextTopbarStructure.test.ts
```

## Contexto organizacional global

- Criados `OrganizationalContextProvider` e `useOrganizationalContext` a partir da identidade validada por `/api/auth/me`.
- Mantidos empresa e filial imutáveis para usuário comum.
- Adicionado seletor responsivo de empresa e filial para master no topbar.
- Preservada a seleção do mesmo master durante refresh e zerado o contexto na troca de identidade.
- Adicionada limpeza de cache entre identidades e invalidação posterior a mudanças organizacionais efetivas.
- Criados testes de contexto comum, master, troca de identidade e uso incorreto fora do provider.
- Fortalecido o gate de versão para workflow, ambientes, snapshots, evidências, README e CHANGELOG.

## Validações esperadas

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit -- tests/components/OrganizationalContextProvider.test.tsx
npm run build
```

# v1.11.0a8b46

## Bootstrap efetivo da sessão

- Integrado `GET /api/auth/me` ao ciclo de restauração e login.
- O shell protegido aguarda a validação de identidade, contexto organizacional e permissões pela API.
- Respostas 401 e payloads inválidos limpam a sessão; falhas transitórias bloqueiam o shell com nova tentativa.
- Preservados `status`, `code` e `traceId` nos erros do bootstrap de autenticação.
- Sincronizados os artefatos correntes de versão e os gates de governança em `1.11.0a8b46`.

## Validações esperadas

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

# v1.11.0a8b45.c1

## Reconciliação do contrato backend atual

- Preservado o `HEAD 398298d` como corte técnico auditado, sem declará-lo aprovado.
- Tornado `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` a fonte canônica para integração.
- Substituído o gate B38 por comparação estrita de método e caminho, com resolução de constantes e templates.
- Mantidas visíveis as incompatibilidades reais; a corretiva continua bloqueada até as ondas de correção.
- Nenhum client, tela, hook, schema ou fluxo produtivo foi alterado nesta Onda 0.

## Validações esperadas

```bash
npm run test:unit -- tests/unit/backendContractMap.test.ts
npm run validate:backend-contract-map
```

# v1.11.0a8b45

## Auditoria avançada

- Evoluída a auditoria para consulta operacional paginada em `/api/auditoria/operacional`.
- Adicionado consumo de `/api/auditoria/eventos-recentes`.
- Preservado client legado de `/api/auditoria/eventos`.
- Criada rota `/auditoria/operacional` reutilizando a tela avançada.
- Atualizada tela `/auditoria/eventos` com cards, eventos recentes e auditoria operacional.
- Implementados filtros por empresa, filial, usuário, módulo, entidade, ação, período e termo.
- Bloqueada exposição visual de GUID bruto por mascaramento de identificadores técnicos.
- Atualizado mapa frontend/backend para classificar `AUDITORIA_OPERACIONAL_AUSENTE_FRONTEND` como `IMPLEMENTADO_B45`.
- Criados testes estruturais e de payload para auditoria B45.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/auditoriaPayload.test.ts tests/unit/auditoriaB45Structure.test.ts tests/unit/auditoriaDisplay.test.ts tests/unit/routePermissions.test.ts
npm run ci:gates
```

# v1.11.0a8b42

## Financeiro gerencial

- Alinhadas as baixas financeiras para `POST /api/financeiro/contas-receber/{id}/baixar` e `POST /api/financeiro/contas-pagar/{id}/baixar`.
- Alinhados os estornos financeiros para `POST /api/financeiro/contas-receber/{id}/estornar` e `POST /api/financeiro/contas-pagar/{id}/estornar`.
- Simplificado o payload de baixa para `{ valor, dataBaixa, observacao }`, removendo campos de forma de pagamento/caixa/banco que não constavam no contrato inventariado.
- Atualizado o payload de estorno para `{ baixaId, dataEstorno, motivo }`.
- Criada tela `/financeiro/fluxo-caixa` consumindo `GET /api/financeiro/fluxo-caixa`.
- Atualizados menu, guard de rota e mapa de contratos frontend/backend para `IMPLEMENTADO_B42`.
- Reforçados testes de payload e estrutura financeira B42.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts tests/unit/routePermissions.test.ts
npm run ci:gates
```

# v1.11.0a8b41

## Estoque avançado

- Criada tela `/estoque/transferencias` para registrar transferência entre filial/local de origem e destino usando o endpoint `POST /api/estoque/transferencias`.
- Criada tela `/estoque/bloqueios` para registrar bloqueio de estoque e executar liberação/cancelamento por ID operacional com motivo auditável.
- Corrigido o client de inventário para usar `POST /api/estoque/inventarios/{id}/concluir` com payload `{ motivoAjuste }`, removendo a rota legada `/fechar`.
- Adicionado detalhe de inventário via `GET /api/estoque/inventarios/{id}` e ação `POST /api/estoque/inventarios/{id}/iniciar-contagem`.
- Atualizados menu, guard de rotas e permissões para transferências e bloqueios com `ESTOQUE_MOVIMENTAR`.
- Reforçados payloads, schemas e testes estruturais para estoque avançado B41.
- Atualizado mapa de contratos frontend/backend para classificar as divergências de estoque como `IMPLEMENTADO_B41`.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/estoquePayload.test.ts tests/unit/estoqueB41Structure.test.ts tests/unit/estoqueUxRules.test.ts
npm run ci:gates
```

# v1.11.0a8b39

## Correção de typecheck do gate de contratos

- Corrigido `tests/unit/backendContractMap.test.ts` para remover regex com flag `s`, incompatível com `target: es5` do `tsconfig.json`.
- Substituída a validação por extração do tipo `VincularFornecedorProdutoRequest` com `[\s\S]*?` e `not.toContain('descricaoFornecedor')`.
- Atualizado `scripts/validate-backend-contract-map.mjs` para usar a mesma abordagem sem flag dotAll.
- Mantido o escopo estrutural da B38 sem alteração de tela produtiva.

## Reconciliação controlada de contratos

- Criado `validate:backend-contract-map` para mapear endpoints frontend e divergências conhecidas contra o inventário/backend.
- Criada allowlist versionada de divergências controladas entre frontend e backend.
- Criado `docs/CONTRATO_FRONTEND_BACKEND_B38.md` com decisões, alvos e bloqueios para B39-B45.
- Preservada a correção B37 de Produto x Fornecedor como item resolvido no mapa.
- Integrado o novo gate ao `validate:source`, `validate:ci` e `ci:gates`.

# v1.11.0a8b37

## Correção Produto x Fornecedor

- Ajustado payload do vínculo fornecedor/produto para usar `codigoProdutoFornecedor`, alinhado ao inventário backend de `/api/produtos/{id}/fornecedores`.
- Mantido envio de `fornecedorId` operacional; o formulário não envia `pessoaId`.
- Removido campo de descrição do payload de vínculo para evitar propriedade não prevista no contrato.
- Reforçados testes unitários para payload e validação de GUID do fornecedor.

## Validações esperadas

```bash
npm run validate:source
npm run validate:guid-references
npm run test:unit -- tests/unit/produtosPayload.test.ts
npm run ci:gates
```

# v1.11.0a8b36

- Adicionada validação real assistida do E2E integrado com backend descartável/controlado.
- Criados gate `validate:assisted-e2e`, script `report:e2e:integrated:assisted` e template de evidências.
- Adicionado ACK `LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false` nos envs versionados.
- Reforçado que o E2E integrado mutável, seed/reset e relatório assistido não rodam no CI padrão.
- Atualizadas skills, README e documentação operacional da execução assistida.

# Changelog


## v1.11.0a8b35

- Criado `scripts/prepare-integrated-e2e-seed.mjs` para chamar procedimento real/controlado de seed/reset do backend.
- Adicionado gate `validate:backend-seed-reset` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado o E2E integrado para exigir `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true` antes de rodar fluxo mutável.
- Atualizados `.env.example`, `.env.test` e `.env.backend-controlled.example` com variáveis de seed/reset desligadas por padrão.
- Criada documentação `docs/BACKEND_SEED_RESET_INTEGRATION.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B35.md`.
- Criado teste unitário `tests/unit/backendSeedResetIntegration.test.ts` para proteger scripts, ACKs e CI.
- Atualizada versão visual/documental para `1.11.0a8b35`.

## v1.11.0a8b34

- Criado `docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md` com procedimento de backend descartável para o E2E integrado real.
- Adicionado gate `validate:integrated-runbook` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado `tests/e2e/integrated-backend.spec.ts` para exigir `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` além do opt-in e ACK de ambiente descartável.
- Atualizado `.env.backend-controlled.example` com `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false`, preservando execução desligada em arquivo versionado.
- Criado teste unitário `tests/unit/integratedRunbook.test.ts` para proteger runbook, ACK e gates.
- Atualizada versão visual/documental para `1.11.0a8b34`.

## v1.11.0a8b33

- Criado template `tests/seeds/integrated-e2e.controlled-seed.example.json` para dados descartáveis do E2E integrado.
- Adicionado gate `validate:controlled-seeds` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado o E2E integrado para exigir `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID` e `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`.
- Reforçado `validate-integrated-e2e` e `validate-ci-gates` para bloquear regressão de execução mutável sem seed controlada.
- Criada documentação `docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B33.md`.
- Atualizada versão visual/documental para `1.11.0a8b33`.


## v1.11.0a8b32

- Criado E2E integrado controlado para venda → fiscal → estoque → financeiro → auditoria.
- Adicionado `test:e2e:integrated:backend` com Playwright config dedicada e opt-in próprio `LOGOSOFT_INTEGRATED_E2E_*`.
- Criado gate `validate:integrated-e2e` e integrado ao `validate:source`, `ci:gates` e GitHub Actions sem executar fluxo mutável no CI comum.
- Atualizado `.env.backend-controlled.example` com variáveis integradas sem segredos reais e execução desligada por padrão.
- Criada documentação `docs/BACKEND_INTEGRATED_E2E.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B32.md`.
- Atualizada versão visual/documental para `1.11.0a8b32`.

## v1.11.0a8b31.c1

- Corrigido isolamento entre contrato fiscal e contrato operacional.
- `playwright.contract.config.ts` passa a executar somente `fiscal-backend.contract.spec.ts`.
- Removido fallback `LOGOSOFT_CONTRACT_*` do contrato operacional, exigindo `LOGOSOFT_OPERATIONAL_CONTRACT_*`.
- Reforçado `validate-operational-contracts` para bloquear regressão de descoberta cruzada ou dependência operacional em variáveis fiscais.
- Atualizado teste unitário de regressão para proteger a separação das suítes.
- Atualizada versão visual/documental para `1.11.0a8b31.c1`.

## v1.11.0a8b31

- Criados contratos operacionais read-only para Vendas, Estoque, Financeiro e Auditoria contra backend real/controlado.
- Adicionado script `test:contract:operational` com configuração Playwright dedicada.
- Criado gate `validate:operational-contracts` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Atualizado `.env.backend-controlled.example` com variáveis operacionais sem segredos reais.
- Documentada a validação em `docs/BACKEND_OPERATIONAL_CONTRACTS.md`.
- Adicionado teste unitário para proteger scripts, opt-in e comportamento read-only do contrato operacional.
- Atualizada versão visual/documental para `1.11.0a8b31`.

## v1.11.0a8b30

- Preparada validação real/controlada frontend/backend sem reintroduzir mocks produtivos.
- Criado template `.env.backend-controlled.example` sem segredos reais.
- Criado gate `validate:backend-controlled` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado `validate-ci-gates` para exigir o novo gate.
- Criada documentação `docs/BACKEND_CONTROLLED_VALIDATION.md`.
- Criado levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md` com pendências por módulo, testes e ambiente.
- Adicionado teste unitário para proteger o contrato estrutural de backend controlado.
- Atualizada versão visual/documental para `1.11.0a8b30`.

## v1.11.0a8b29

- Isolados mocks de autenticação e recursos fora de `features/**/api`, movendo-os para `tests/mocks/**`.
- Mantido E2E mockado apenas em `tests/e2e/fixtures/logosoft.ts` com interceptação controlada via Playwright.
- Criado gate `validate:mocks-isolation` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Atualizado o gate de CI para bloquear variáveis públicas `NEXT_PUBLIC_USE_MOCK_*` no workflow.
- Adicionado teste unitário de regressão para impedir retorno de arquivos mockados aos diretórios produtivos.
- Criada documentação `docs/MOCKS_ISOLATION_FRONTEND.md`.
- Atualizada versão visual/documental para `1.11.0a8b29`.

## v1.11.0a8b8

- Corrigido mascaramento defensivo de XML fiscal na observabilidade.
- `maskFiscalSensitiveText` agora substitui blocos XML completos por `[XML_MASKED]`, evitando vazamento de tags internas como `emit`, `CNPJ`, totais ou valores fiscais.
- Adicionado teste unitário com XML fiscal contendo dados internos para impedir regressão de segurança.
- Atualizada versão visual/documental para `1.11.0a8b8`.

## v1.11.0a8b7

- Evoluída a tela de Observabilidade Fiscal com filtros locais por operação, status, reprocessamento e dado sensível mascarado.
- Adicionada consulta operacional de status de serviço fiscal via `POST /api/fiscal/sefaz/status-servico`.
- Adicionados históricos de status de serviço e contingência na observabilidade.
- Adicionado mascaramento visual defensivo para `payloadResumo` fiscal, evitando exposição de token, senha, certificado, segredo ou XML completo.
- Adicionados testes unitários para payload de status de serviço e mascaramento fiscal.
- Corrigida duplicidade residual de `etapaAtual` no tipo de workflow fiscal.

## v1.11.0a8b6

- Corrigido `baixarDocumentoAuxiliar` para sempre retornar `filename` como string, preservando o contrato `DownloadedFiscalFile`.
- Adicionado fallback seguro `documento-auxiliar-fiscal-{documentoAuxiliarId}.bin` quando o backend não enviar `Content-Disposition`.
- Download de documento auxiliar passa a retornar `contentType` quando disponível.
- Atualizada versão visual/documental para `1.11.0a8b6`.
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B6.md`.

## v1.11.0a8b5

- Corrigido `UsuarioFormDialog`: `Password` agora usa `inputId="senha"`, mantendo o wrapper separado como `senha-wrapper`.
- Exportação CSV fiscal agora ignora paginação visual (`page`/`pageSize`) e usa filtros + limite auditado.
- Adicionada validação local para empresa obrigatória na exportação fiscal.
- Adicionada validação local para filtros conflitantes de pendência XML, DANFE e financeiro.
- Tratamento de erro em resposta `blob` para JSON, ProblemDetails e texto simples.
- Sanitização de nome de arquivo e fallback `notas-fiscais-YYYY-MM-DD.csv`.
- Adicionado teste unitário para parâmetros da exportação CSV auditada.
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B5.md`.

## v1.11.0a8b4

Versão anterior aplicada: `v1.11.0a8`.

### Corrigido
- Normalizado payload fiscal de geração de conta a receber para enviar `primeiraDataVencimento` como string ISO.
- `LoadingState` passou a aceitar o variant `cards`.
- Corrigidas regressões unitárias em fiscal, financeiro, estoque, auth refresh e formulário de usuário.
- Ações fiscais de consulta de protocolo e contingência passam a respeitar workflow/regras operacionais, não apenas permissão.
- Reprocessamento de integração fiscal passou a usar `PermissionGuard` com `FISCAL_EMITIR`.

### Alterado
- Campo de condição de pagamento no fluxo fiscal financeiro deixou de aceitar digitação manual de ID e passou a usar select carregado por API.
- Atualizada versão visual/documental para `1.11.0a8b4`.

### Documentação
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B4.md`.
- Criado `docs/DIRETRIZES_UX_REFERENCIAS.md` com regra global de dropdowns/selects para entidades relacionadas.

### Validação
- `node scripts/validate-source.mjs` executado com sucesso.
- `npm install` não concluiu no container por Node 22/npm 10 e timeout/SIGTERM; validar `typecheck`, `lint`, `test:unit` e `build` em Node 24/npm 11.

## v1.11.0a8

Versão anterior aplicada: `v1.11.0a7`.

### Adicionado
- Listagem fiscal operacional em `/fiscal/notas` usando `GET /api/fiscal/notas-fiscais` com filtros, paginação, pendências e ação principal sugerida pelo backend.
- Exportação CSV auditada com motivo obrigatório e permissão `FISCAL_EXPORTAR`.
- Consumo de `resumo-operacional`, `workflow-operacional` e integrações no detalhe da nota fiscal.
- Abas de Workflow e Integrações na tela de detalhe fiscal.
- Modais de reprocessamento SEFAZ, consulta de protocolo, contingência, baixa de estoque e geração de conta a receber.
- Tela `/fiscal/observabilidade` com métricas e logs fiscais sanitizados.
- Tipos, schemas, hooks e API client para o contrato fiscal frontend/backend v1.10.0a18.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a8`.
- Módulo fiscal passa a usar `resumo.acoes` e workflow do backend para orientar ações críticas.
- `docs/CONTRATO_FISCAL_OFICIAL.md` atualizado para a documentação fiscal v1.10.0a18.
- Menu e proteção de rotas fiscais passam a reconhecer `FISCAL_EXPORTAR` e `/fiscal/observabilidade`.

### Corrigido
- Corrigida duplicidade de declaração em `CartaCorrecaoResponse` dentro dos tipos fiscais.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A8.md` com etapas padronizadas `v1.11.0a8b1` a `v1.11.0a8b7` para validação incremental.

### Validação
- `node scripts/validate-source.mjs` executado com sucesso.
- Validação sintática local dos arquivos alterados executada com `typescript.transpileModule`.
- `npm install`, `typecheck`, `lint`, testes e build dependem de Node 24/npm 11; o container atual está em Node 22/npm 10.

## v1.11.0a7

Versão anterior aplicada: `v1.11.0a6`.

### Alterado
- Removido o caminho de mock de runtime de autenticação e recursos compartilhados.
- `authApi` e `createResourceClient` passam a usar somente endpoints reais da API.
- Playwright mantém interceptações apenas em testes, sem flags públicas `NEXT_PUBLIC_USE_MOCK_*`.
- Módulo fiscal troca campos manuais de empresa, filial, pessoa, pedido e produto por selects conectados aos endpoints já existentes.
- Textos fiscais deixam de mencionar mock e passam a indicar ambiente configurado no backend.
- Download fiscal passa a usar `Content-Disposition` quando disponível.
- Erros fiscais preservam metadados técnicos de suporte: code, status HTTP e traceId.

### Removido
- `features/auth/api/mockAuthClient.ts`.
- `features/shared/api/mockErpStore.ts`.
- `features/shared/api/resourceMockClient.ts`.
- Flags `NEXT_PUBLIC_USE_MOCK_AUTH` e `NEXT_PUBLIC_USE_MOCK_API` dos arquivos `.env`.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A7.md`.
- Atualizado `docs/CONTRATO_FISCAL_OFICIAL.md` para v1.11.0a7.

### Validação
- `npm run validate:source` executado com sucesso.
- Demais comandos dependem de Node 24/npm 11 por causa do `engine-strict=true`.

## v1.11.0a5

Versao anterior aplicada: `v1.11.0a4`.

### Adicionado
- Campo de busca acima da lista da sidebar para localizar modulos e telas.
- Filtro por nome do item e rota, com normalizacao de acentos.
- Estado vazio para pesquisas sem resultado.

### Alterado
- A sidebar passa a aplicar a busca somente depois do filtro de permissao, evitando exposicao de telas nao liberadas ao usuario.
- Atualizada a versao visual/documental para `1.11.0a5`.

### Documentacao
- README atualizado com causa, modulos impactados e validacao.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A5.md`.

### Validacao
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0a4

Versao anterior aplicada: `v1.11.0a3`.

### Adicionado
- `LoadingState` com variantes `table`, `detail`, `metrics` e `panel`.
- Skeleton automatico no `DataTableServer` para carregamento inicial sem registros visiveis.
- Skeleton de ficha nos detalhes de pedido de venda e pedido de compra.
- Skeleton de metricas no Dashboard e nos cards de resumo de Saldos de estoque.

### Alterado
- Removidos skeletons locais duplicados das listagens, centralizando o comportamento no wrapper de tabela.
- Auditoria e demais telas que usam `DataTableServer` passam a receber skeleton sem implementacao local.
- Atualizada a versao visual/documental para `1.11.0a4`.

### Documentacao
- README atualizado com causa, modulos impactados e validacao.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A4.md`.

### Validacao
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0a3

Versão anterior aplicada: `v1.11.0a2`.

### Documentado
- Executada auditoria modular de testes unitários, componentes e E2E crítico.
- Criado documento `docs/AUDITORIA_MODULOS_V1_11_0A3.md`.
- README atualizado com matriz resumida de estado por módulo e melhorias recomendadas.

### Resultado
- Unitários/componentes: `93/100` testes passaram.
- Falhas concentradas em Segurança/usuários, Estoque e Financeiro.
- E2E crítico: `5/5` testes bloqueados por ambiente, devido ao Chromium gerenciado do Playwright ausente.

### Melhorias identificadas
- Criar `renderWithProviders` para testes de componentes com TanStack Query.
- Centralizar normalização de GUID opcional.
- Ajustar Financeiro e Estoque para alinhar GUID vazio/inválido com a regra de não envio.
- Tornar E2E crítico executável com instalação de browsers ou uso do Chrome local.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a3`.

## v1.11.0a2

Versão anterior aplicada: `v1.11.0a1`.

### Alterado
- `/login` agora ocupa a tela inteira no desktop, sem card central limitado.
- Painel institucional do login passa a preencher toda a coluna direita da viewport.
- Removido o campo `Filial` do formulário de login.
- Removido `filialId` do schema, tipos, hook e payload de login.
- `buildLoginPayload` ignora `filialId` legado e não envia mais o campo para `/api/auth/login`.
- Mensagens de erro de autenticação passaram a mencionar apenas empresa/credenciais.
- Atualizada a versão visual/documental para `1.11.0a2`.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A2.md`.
- README atualizado com a causa, telas alteradas e validação recomendada.

### Validação
- `npm run validate:source` recomendado.
- `npm run test:component -- LoginForm` recomendado.
- `npm run test:unit -- authLoginPayload` recomendado.
- `npm run build` recomendado.

## v1.11.0a1

Versão anterior aplicada: `v1.11.0`.

### Corrigido
- Corrigido erro de build em `LoginForm`, removendo `inputProps` do `Password` do PrimeReact 10.2.1.
- Padronizado o layout da Dashboard com grid próprio e cards de métrica com altura estável.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a1`.
- Criado `styles/layout/_dashboard.scss`.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A1.md`.

### Validação
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0

Versão anterior aplicada: `v1.10.15a1`.

### Adicionado
- Criado gate técnico/documental para início seguro do bloco Fiscal/Nota Fiscal.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0.md`.
- `validate:source` passou a bloquear implementação fiscal sem `docs/CONTRATO_FISCAL_OFICIAL.md`.

### Alterado
- Atualizada a versão visual/documental para `1.11.0`.

### Observação
- Nenhum endpoint, rota, menu ou regra fiscal foi criado nesta etapa.
- O bloco Fiscal continua dependente de contrato oficial, validação fiscal e documentação tributária aplicável.

### Validação
- `npm run validate:source` passou.
- `npm run test:unit` executou: 93 testes passaram e 7 falhas preexistentes foram aceitas temporariamente.

## v1.10.15a1

Versão anterior aplicada: `v10.0.15`. Esta entrega inaugura a nomenclatura operacional `v1.10.15`, usando o sufixo `a1` para manutenção dentro da mesma tag.

### Adicionado
- Nova tela `/login` com layout dividido, formulário corporativo e painel institucional abstrato configurável.
- Componentes `LoginPage`, `LoginBrandPanel` e `LoginEnvironmentBadge`.
- Schema `loginSchema` e hook `useLogin` para separar validação, submit e erro inline.
- Política de sessão com duração máxima de 5 horas e inatividade máxima de 30 minutos.
- Testes de componente do Login e testes unitários da política de sessão.

### Alterado
- Login mantém API real e contrato atual, mas passa a limpar sessão inválida antes de autenticar novamente.
- Mensagens de erro de autenticação foram refinadas para credenciais inválidas, usuário bloqueado/sem permissão e empresa/filial inválida.
- `validate:source` passou a validar arquivos críticos da nova UX de login e política de sessão.
- Atualizada a versão visual e documental para `1.10.15a1`.

### Validação
- Recomendado executar `npm run validate:source` e `npm run test:unit`.

## v10.0.15

- Fechada a última etapa antes do bloco Fiscal/Nota Fiscal.
- Criado `RoutePermissionGate` para proteger rotas internas por permissão, complementando menu, botão e ação.
- Criada matriz centralizada `lib/security/routePermissions.ts` para rotas de Segurança, Administração, Pessoas, Clientes, Fornecedores, Produtos, Estoque, Vendas, Financeiro, Compras e Auditoria.
- Integrado o gate de rotas no layout interno `app/(main)/layout.tsx`.
- Criado `lib/formatters/privacy.ts` com mascaramento de documento, e-mail, telefone e labels LGPD-safe.
- Listagem de Pessoas passou a usar `maskDocument` centralizado.
- Selects de Pessoa em Clientes e Fornecedores passaram a exibir documento minimizado em vez de CPF/CNPJ cru.
- Adicionados testes unitários para permissões por rota e formatadores de privacidade.
- `validate:source` reforçado para bloquear regressões de permissão por rota e LGPD visual.
- Criado documento `docs/IMPLEMENTACAO_V10_0_15.md`.
- Atualizada a versão visual e documental para `10.0.15`.

## v10.0.14

### Adicionado
- Criado helper E2E `tests/e2e/fixtures/logosoft.ts` com sessão autenticada, perfis de permissão, mocks de API via Playwright e helpers de navegação.
- Adicionada cobertura E2E para autenticação, logout, rota protegida, permissão somente consulta, cadastros, estoque, financeiro, vendas, compras e auditoria.
- Criados specs `permissions.spec.ts`, `cadastros.spec.ts`, `financeiro-estoque.spec.ts` e `auditoria.spec.ts`.
- Ampliado `logosoft-critical-flows.spec.ts` com navegação por módulos críticos e rotas `/novo` de Vendas/Compras.
- Adicionados scripts `test:e2e:critical` e `test:e2e:ui`.
- Criado documento `docs/IMPLEMENTACAO_V10_0_14.md`.

### Alterado
- `playwright.config.ts` agora sobe ambiente E2E com `NEXT_PUBLIC_USE_MOCK_AUTH=true`, `NEXT_PUBLIC_USE_MOCK_API=true` e `NEXT_PUBLIC_APP_ENV=test`.
- `validate:source` passou a validar arquivos E2E obrigatórios, script `test:e2e:critical` e configuração explícita de mocks no Playwright.
- Atualizada a versão visual e documental para `10.0.14`.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build`, `npm run test:e2e` e `docker build` não foram executados neste ambiente.

## v10.0.13.3

### Adicionado
- Criado utilitário `features/auditoria/utils/auditoriaDisplay.ts` para centralizar rótulos, severidades, datas e referências amigáveis de auditoria.
- Adicionado teste unitário `tests/unit/auditoriaDisplay.test.ts`.
- Adicionados cartões-resumo e filtro por ação na tela de Auditoria.
- Adicionados atalhos operacionais no Dashboard, protegidos por permissão.

### Corrigido
- Corrigida colisão visual de status numéricos nos fluxos críticos do Dashboard.
- `validate:source` passou a validar ausência de `timeout=` no `.npmrc`, presença de `.npmrc` no Dockerfile e existência das rotas operacionais de Vendas/Compras.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.

## v10.0.13.2

### Corrigido
- Criada rota `/vendas/pedidos/novo` apontando para `PedidoVendaDetalhePage` em modo novo.
- Criada rota `/vendas/pedidos/[id]` apontando para `PedidoVendaDetalhePage` com `pedidoId`.
- Criada rota `/compras/pedidos/novo` apontando para `PedidoCompraDetalhePage` em modo novo.
- Criada rota `/compras/pedidos/[id]` apontando para `PedidoCompraDetalhePage` com `pedidoId`.
- Corrigido o desalinhamento entre botões/redirecionamentos existentes e rotas reais do App Router.
- Atualizada a versão visual e documental para `10.0.13.2`, sem avançar para a linha v10.0.14.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build` e `docker build` não foram executados neste ambiente.

## v10.0.13.1

### Corrigido
- Corrigido erro de build em `OperationalGovernancePanel`, substituindo o type guard de data por `date instanceof Date` antes de acessar `getTime()`.
- Removida a configuração inválida `timeout=300000` do `.npmrc`, eliminando o warning `Unknown project config "timeout"` do npm 11.
- Mantidas as configurações suportadas de retry e timeout de fetch para reduzir falhas de rede no Docker.
- Atualizada a versão visual e documental para `10.0.13.1`, sem avançar para a linha v10.0.14.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build` e `docker build` não foram executados neste ambiente.

## v10.0.13

- README reescrito com documentação detalhada de módulos, telas, rotas, scripts, regras permanentes e histórico por versão.
- Adicionado `docs/IMPLEMENTACAO_V10_0_13.md`.
- Atualizada versão para `10.0.13` em `package.json` e `config/app.ts`.
- Corrigido rodapé para renderizar `© logosoft v10.0.13`.
- Corrigido Dockerfile para copiar `.npmrc` antes do `npm install` no stage `deps`.
- Endurecido `npm install` do Docker contra `ETIMEDOUT` com retry explícito, timeout maior e cache npm via BuildKit.
- Atualizado `.npmrc` com `fetch-timeout=300000`; a chave inválida `timeout=300000` foi removida na v10.0.13.1.
- Mantida regra de não usar `npm ci`.
- Mantido Node 24 fixado em todos os stages Docker.

## v10.0.12

- Refinamento de Administração, Pessoas, Clientes, Fornecedores e Produtos/Catálogo.
- Adicionado `OperationalGovernancePanel` para métricas, controle operacional, privacidade e rastreabilidade.
- Painéis embutidos nos módulos de cadastro para reforçar regras de inativação, LGPD, dados fiscais e vínculo operacional.
- Mantido Node 24, Docker sem `npm ci`, Axios, mock desligado por padrão e validações preventivas de fonte.

## v10.0.11

- Refinamento UX do módulo de Estoque.
- Cards de resumo para locais, saldos, movimentos, reservas e inventários.
- Rótulos e severidades amigáveis para movimentos, reservas e inventários.
- Painéis explicativos para entrada, saída e ajuste.
- Testes unitários de regras visuais de estoque.

## v10.0.10

- Refinamento UX de Compras.
- Cards de resumo e fluxo visual de status no detalhe do pedido de compra.
- Melhorado painel de totais e impacto operacional de estoque/financeiro.

## v10.0.9

- Refinada UX de Vendas com fluxo visual do pedido, ações disponíveis por status e bloqueios operacionais.
- Adicionados cards de resumo na listagem de pedidos de venda.
- Melhorado painel de totais do pedido com quantidade de itens e percentual de desconto.
- Adicionado teste unitário `vendasUxRules.test.ts`.

## v10.0.8

- Dockerfile fixado em `node:24-alpine`.
- Adicionados `engines`, `.nvmrc`, `.node-version` e `.npmrc` com Node 24.
- `validate:source` agora bloqueia regressão para imagem Node não fixada.
- Refinamento UX do Financeiro: cards de resumo, totalizador de parcelas e botão Salvar protegido por preenchimento mínimo.
- Rodapé atualizado para `© logosoft v10.0.8`.

## v10.0.7

- Revisão global de referências amigáveis para campos enviados como GUID.
- Corrigido fornecedor do produto para exibir código + pessoa, sem `pessoaId` cru.
- Corrigido pedido de venda para exibir cliente por código + pessoa na criação.
- Corrigida reserva de estoque para selecionar documento de origem por número do pedido quando origem for Vendas, sem input manual de origemId.
- Mensagens de ajuda revisadas para explicar vínculo automático sem expor detalhe técnico.
- Validação de fonte reforçada para bloquear rótulos visíveis como OrigemId/GUID/ID técnico.
- Rodapé atualizado para `© logosoft v10.0.7`.

## v10.0.6

- Versão atualizada para `10.0.6`.
- `npm run build` agora executa `validate:source` antes do `next build`.
- Validação preventiva ampliada contra regressões de compilação já observadas.
- Removidos resíduos tipados do configurador do template (`AppConfigProps` e `configSidebarVisible`).
- Adicionado `.dockerignore` para evitar envio de artefatos locais ao Docker.
- Rodapé atualizado para `© logosoft v10.0.6`.

## v10.0.5

- Adicionada validação estática `npm run validate:source` para bloquear regressões que já quebraram build.
- Adicionado `dynamic = 'force-dynamic'` no segmento autenticado `(main)` para evitar prerender estático de telas protegidas e componentes client.
- Mantida correção dos identificadores `GUID_REGEX` e `INVALID_GUID_SENTINELS` em `lib/http/requestUtils.ts`.
- Rodapé atualizado para `© logosoft v10.0.5`.
- Mantida regra: campos que enviam GUID no payload devem ser exibidos ao usuário por nome, código, número ou descrição quando houver fonte de dados disponível.

## v10.0.4

- Corrigida substituição indevida de identificadores TypeScript em `lib/http/requestUtils.ts`, restaurando `GUID_REGEX` e `INVALID_GUID_SENTINELS`.
- Mantida a regra de UX: o usuário vê nome/código/descrição; o payload envia GUID técnico quando exigido pela API.
- Corrigido build do dashboard: soma de métricas agora usa `reduce<number>` com acumulador tipado para evitar inferência `null | undefined`.
- Dashboard real com dados da API e tratamento de falhas parciais.
- Auditoria real em `/api/auditoria/eventos` com filtros locais.
- Revisão de exibição para não mostrar referência técnica crua ao usuário final.
- Rodapé atualizado para `© logosoft v10.0.4`.
- Mantido Dockerfile sem `npm ci`, Axios e mock desligado por padrão.

## v9.6.9.1

- Removida definitivamente a engrenagem/configurador visual do template Sakai do layout renderizado.
- Removido o import de `_config.scss` para impedir CSS residual do botão flutuante de configuração.
- Ajustada a tela de nova conta a receber/pagar para não expor `origemId` como campo técnico de referência.
- Origem manual agora oculta a referência de origem.
- Pedido de venda e compra agora usam dropdown pesquisável por número/valor e enviam somente a referência técnica no payload.
- Ajustados espaçamentos da seção de parcelas e reduzido o botão de adicionar parcela.
- Ajustados botões da barra superior de contas financeiras.
- Revisadas listagens para evitar exibir referência técnica crua quando há nome/código disponível: clientes, fornecedores, contas financeiras, vendas e estoque.
- Rodapé atualizado para `© logosoft v9.6.9.1`.

## v9.6.9

- Implementado módulo Compras com endpoints reais do contrato v9.8.
- Criadas telas específicas de listagem, criação e detalhe de pedidos de compra.
- Adicionado client Axios para listar, buscar, criar, atualizar, adicionar/editar/remover itens, enviar para aprovação, aprovar, cancelar e receber.
- Implementado recebimento com seleção visual de itens por produto/local, sem expor referência técnica ao usuário.
- Implementado recebimento com flags `permiteReceberAcimaDoPedido` e `gerarContaPagar`.
- Aplicadas permissões COMPRAS_CONSULTAR, COMPRAS_GERENCIAR, COMPRAS_APROVAR, COMPRAS_CANCELAR e COMPRAS_RECEBER.
- Mantida regra visual de exibir nomes/códigos para referências e enviar somente referência técnica no payload.
- Rodapé atualizado para `© logosoft v9.6.9`.
- Adicionado teste unitário de payloads de Compras.

## v9.6.8

- Implementado módulo Financeiro com endpoints reais do contrato v9.8.
- Adicionadas telas de formas de pagamento, condições, contas a receber e contas a pagar.
- Implementadas ações de receber, pagar, estornar e cancelar com motivo.
- Implementada geração de conta a receber por pedido de venda.
- Rodapé ajustado para exibir `© logosoft v9.6.8`.
- Adicionado teste unitário de payload financeiro.

## v9.6.7

- Implementado módulo de Pedidos de Venda com endpoints reais do contrato v9.8.
- Criadas telas específicas de listagem, criação e detalhe do pedido.
- Criado client Axios para listar, buscar, criar, atualizar, adicionar/editar/remover itens, enviar para aprovação, aprovar, cancelar e faturar.
- Incluídos formulários de cabeçalho, itens, aprovação, cancelamento com motivo e faturamento.
- Aplicadas permissões VENDAS_CONSULTAR, VENDAS_GERENCIAR, VENDAS_APROVAR, VENDAS_CANCELAR e VENDAS_FATURAR.
- Aplicada melhoria nos selects de filial para limpar a filial quando a empresa muda e evitar reaproveitamento de lista antiga.
- Adicionados testes unitários para payloads de Vendas.

## v9.6.6

- Implementado módulo Estoque com endpoints reais do contrato v9.8.
- Criadas telas de locais, saldos, movimentos, entradas, saídas, ajustes, reservas e inventários.
- Adicionados dropdowns pesquisáveis de Empresa/Filial alimentados do banco via Administração.
- Atualizadas telas existentes de Administração, Segurança, Pessoas, Clientes, Fornecedores e Produtos para usar dropdown de empresa/filial onde o token já existe.
- Mantido payload enviando apenas referência técnica para `empresaId` e `filialId`.
- Adicionados schemas e builders de payload para Estoque.

## v9.6.5-buildfix

- Corrigido erro de typecheck em `fieldErrorMap` causado por `messages?.[0]` quando o retorno de `ZodError.flatten().fieldErrors` era inferido como `{}`.
- Aplicada a correção em Administração, Pessoas/Clientes/Fornecedores e Produtos para evitar regressão no build Docker/Next.js.
- Mantido Dockerfile sem `npm ci`.

## v9.6.5

- Implementado módulo Produtos / Catálogo com endpoints reais do contrato v9.8.
- Adicionados clientes Axios específicos para produtos, categorias, unidades de medida e marcas.
- Criadas telas específicas para produtos e cadastros auxiliares.
- Adicionados dados comerciais, preço/custo, dados fiscais protegidos por permissão, código de barras e vínculo com fornecedor.
- Inativação com motivo obrigatório para produto e cadastros auxiliares.
- Adicionados testes unitários de payloads de Produtos.

## v9.6.4

- Substituídas as telas genéricas de Pessoas, Clientes e Fornecedores por telas específicas usando o contrato real v9.8.
- Pessoas agora consome `GET/POST/PUT /api/pessoas` e `POST /api/pessoas/{id}/inativar`.
- Clientes agora consome `GET/POST/PUT /api/clientes`, bloqueio/desbloqueio de crédito e inativação.
- Fornecedores agora consome `GET/POST/PUT /api/fornecedores` e inativação.
- Implementado `CpfCnpjInput` nas pessoas, preservando CNPJ alfanumérico.
- Implementados schemas Zod, payload builders, hooks React Query e API clients específicos.
- Adicionados testes unitários para payloads de pessoa, cliente, fornecedor e motivos obrigatórios.
- Mantido Axios, sem `console.*`, Dockerfile sem clean install rígido e mock desligado por padrão.

## v9.6.3

- Substituídas as telas genéricas de Administração por telas específicas para empresas, filiais, setores, cargos e centros de custo.
- Implementados API clients reais para empresas, filiais, setores, cargos e centros de custo.
- Implementados payload builders com Zod e sanitização de referência técnica/string vazia.
- Implementados formulários com campos reais do contrato v9.8, incluindo diferença entre criação e atualização.
- Implementada inativação com motivo obrigatório via `ReasonDialog`.
- Bloqueada edição/inativação de registros cujo status retornado não seja Ativo.
- Adicionados filtros por `empresaId`, `filialId` e busca local conforme cada rotina.
- Atualizado `StatusTag` para suportar `EntityStatus` numérico retornado pelo backend.
- Adicionados testes unitários de payloads e teste de componente do formulário de Administração.

## v9.6.2

- Implementado refresh token real via `/api/auth/refresh`.
- Implementado logout real via `/api/auth/logout` com payload `{ refreshToken }`.
- Sessão local agora atualiza permissões retornadas no refresh.
- Criada tela real de usuários em `/seguranca/usuarios` usando `GET` e `POST /api/seguranca/usuarios`.
- Criado formulário de usuário com validação de referência técnica e payload conforme `CriarUsuarioRequest`.
- Grupos de acesso mantidos como placeholder controlado, sem inventar endpoints fora do contrato v9.8.
- Adicionados testes unitários de refresh de sessão e payload de usuário.

## v9.6.1

- Adicionados tipos base oficiais `Guid`, `IsoDateTime`, `ApiBusinessError`, `AspNetValidationError` e `LoginResponse`.
- Adicionados enums numéricos oficiais: `EntityStatus`, `TipoPessoa`, `TipoProduto`, `TipoItemFiscal`, `TipoMovimentoEstoque`, `StatusReservaEstoque`, `StatusInventario`, `TipoPedidoVenda`, `StatusPedidoVenda`, `OrigemFinanceira`, `StatusContaFinanceira`, `StatusParcelaFinanceira` e `StatusPedidoCompra`.
- Criado `lib/http/requestUtils.ts` com validação de referência técnica, sanitização de payload, limpeza de query params e conversão de datas.
- Criado `lib/api/healthApi.ts` usando `GET /api/health`.
- Atualizado `mapApiError` para reconhecer erros ASP.NET com `errors` por campo e erros de regra `{ code, message }`.
- Atualizado `httpClient` para enviar `Accept: application/json` e sanitizar payloads JSON antes da requisição.
- Atualizado `buildLoginPayload` para aceitar somente registro válido em `empresaId` e `filialId`, mantendo o manager sem esses campos.
- Atualizado `resourceClient` para não enviar `id` no body do `PUT`, converter busca global para `termo` e tratar `204 NoContent`.
- Adicionados testes unitários para `requestUtils` e `apiError`.
- Mantido Dockerfile sem clean install rígido.
- Mantido mock desligado por padrão.
- Mantida regra de não usar `console.*`.

## v9.6.0

- Corrigido normalizador da resposta de login para o contrato do backend com `accessToken`, `accessTokenExpiraEm`, `refreshToken`, `refreshTokenExpiraEm` e `permissoes`.
- Corrigida validação do `exp` do JWT usando segundos Unix multiplicados por 1000.
- Corrigido build blocker de narrowing no `authResponseMapper`.

## v9.5.0

- Corrigido payload real do login para o backend ASP.NET Core.
- O frontend envia `password` no login, e não `senha`.
- Para `manager@erp.local`, o payload final contém somente `email` e `password`.
- Campos `empresaId` e `filialId` vazios, `0` ou `99` são removidos antes da chamada `/api/auth/login`.
- `NEXT_PUBLIC_API_URL` padrão atualizado para `http://localhost:8080`.
- Adicionados testes unitários para montagem segura do payload de login.

## v9.4.0

- Axios definido como camada HTTP oficial da aplicação.
- Mock deixou de ser fluxo padrão.
- `NEXT_PUBLIC_USE_MOCK_AUTH=false` e `NEXT_PUBLIC_USE_MOCK_API=false` por padrão.
- Dockerfile alterado para `node:lts-alpine` com `npm install --no-audit --no-fund`.

## v9.3.0

- Correções iniciais de build e tipagem PrimeReact.
