# logosoft Frontend v1.11.0a8b36

Frontend do ERP **logosoft** em **Next.js**, **React**, **TypeScript** e **PrimeReact/Sakai**, consumindo a API real em `http://localhost:8080` por padrão.

Esta aplicação foi construída para operação real de ERP: autenticação, permissões, cadastros, estoque, vendas, financeiro, compras, auditoria, dashboard, validações, dialogs de motivo, feedbacks visuais e integração centralizada via Axios.

## v1.11.0a8b36 — Validação real assistida do E2E integrado

A v1.11.0a8b36 adiciona checklist, evidências e relatório pós-execução para rodar o E2E integrado real contra backend descartável/controlado. O fluxo mutável continua fora do CI comum e agora exige `LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true` além dos ACKs anteriores.

### Validação principal

```bash
npm run validate:assisted-e2e
npm run validate:backend-seed-reset
npm run validate:integrated-e2e
npm run validate:source
```

Com backend descartável preparado e evidências locais preenchidas:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher token, IDs e ACKs somente localmente
npm run prepare:e2e:integrated:seed
npm run test:e2e:integrated:backend
npm run report:e2e:integrated:assisted
```

## v1.11.0a8b35 — Integração com seed/reset real do backend

A v1.11.0a8b35 prepara o frontend para chamar um procedimento real de seed/reset fornecido pelo backend antes do E2E integrado. O comando é opt-in, exige ambiente descartável, exige leitura do runbook e não roda automaticamente no CI comum.

### Validação principal

```bash
npm run validate:backend-seed-reset
npm run validate:integrated-runbook
npm run validate:controlled-seeds
npm run validate:integrated-e2e
npm run validate:source
```

Com backend descartável preparado e endpoint de seed/reset disponível:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher token e IDs somente localmente
# habilitar LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true, LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true,
# LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true e LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true somente em backend descartável
npm run prepare:e2e:integrated:seed
# após sucesso do backend, habilitar LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true no env local
npm run test:e2e:integrated:backend
```

## v1.11.0a8b34 — Runbook de backend descartável para E2E integrado

A v1.11.0a8b34 documenta o procedimento seguro para executar o E2E integrado real contra backend descartável/controlado. A versão adiciona o runbook operacional, o gate `validate:integrated-runbook` e uma proteção extra `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true`, sem colocar o fluxo mutável no CI comum.

### Validação principal

```bash
npm run validate:integrated-runbook
npm run validate:controlled-seeds
npm run validate:integrated-e2e
npm run validate:source
```

Quando houver backend descartável preparado e o runbook tiver sido seguido:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher token e IDs somente localmente
# habilitar LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true e LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true somente em ambiente descartável
npx playwright install chromium
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:integrated:backend
```

## v1.11.0a8b33 — Seeds controladas para E2E integrado

A v1.11.0a8b33 prepara o E2E integrado para rodar somente com dados previsíveis, rastreáveis e descartáveis. A versão adiciona template de seed, documentação e gate `validate:controlled-seeds`, sem criar seed real no backend e sem executar fluxo mutável no CI comum.

### Validação principal

```bash
npm run validate:controlled-seeds
npm run validate:integrated-e2e
npm run validate:source
```

Quando houver backend descartável/homologação preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID e LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true somente localmente
npx playwright install chromium
npm run test:e2e:integrated:backend
```


## v1.11.0a8b32 — E2E integrado controlado

A v1.11.0a8b32 adiciona uma suíte E2E integrada e opt-in para validar, em ambiente controlado, o fluxo venda → fiscal → estoque → financeiro → auditoria. O fluxo é mutável, usa variáveis próprias `LOGOSOFT_INTEGRATED_E2E_*` e não roda automaticamente no CI comum.

### Validação principal

```bash
npm run validate:integrated-e2e
npm run validate:source
```

Quando houver backend descartável/homologação preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:e2e:integrated:backend
```

## v1.11.0a8b31.c1 — Correção de isolamento entre contrato fiscal e operacional

A v1.11.0a8b31.c1 corrige a B31 bloqueada: `npm run test:contract:fiscal` passa a descobrir somente `fiscal-backend.contract.spec.ts`, enquanto `npm run test:contract:operational` permanece dedicado ao contrato operacional. O contrato operacional também deixa de aceitar fallback para variáveis fiscais `LOGOSOFT_CONTRACT_*`, exigindo opt-in explícito por `LOGOSOFT_OPERATIONAL_CONTRACT_*`.

### Validação principal

```bash
npm run validate:operational-contracts
npm run test:contract:fiscal
npm run test:contract:operational
```

## v1.11.0a8b31 — Contratos reais/controlados por módulo prioritário

A v1.11.0a8b31 adiciona contratos operacionais read-only para Vendas, Estoque, Financeiro e Auditoria. A validação é opt-in, usa backend controlado e não executa mutações como faturar pedido, baixar estoque, receber/pagar conta, cancelar ou estornar.

### Validação principal

```bash
npm run validate:operational-contracts
npm run validate:source
```

Quando houver backend controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npm run test:contract:operational
```

## v1.11.0a8b30 — Validação real/controlada frontend/backend

A v1.11.0a8b30 prepara o frontend para validação contra backend real/controlado sem reintroduzir mocks produtivos. A versão adiciona template seguro de ambiente, documentação de execução controlada, gate `validate:backend-controlled` e levantamento formal do que ainda falta implementar por módulo.

### Validação principal

```bash
npm run validate:backend-controlled
npm run validate:source
```

Quando houver backend controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

## v1.11.0a8b29 — Isolamento definitivo de mocks produtivos

A v1.11.0a8b29 move mocks de autenticação e recursos para `tests/mocks/**`, preserva E2E mockado somente em fixtures Playwright e adiciona o gate `validate:mocks-isolation` para impedir retorno de mocks aos diretórios produtivos.

### Validação principal

```bash
npm run validate:mocks-isolation
npm run validate:source
```

## v1.11.0a5 - Busca de telas na sidebar

Versao anterior aplicada: `v1.11.0a4`.

Esta manutencao adiciona uma busca exclusiva para os modulos e telas da sidebar. O objetivo e facilitar a navegacao conforme o ERP crescer, sem alterar a estrutura geral do layout.

### Implementado nesta versao

- Campo "Buscar tela ou modulo" adicionado acima da lista da sidebar.
- A busca filtra apenas os itens de menu que ja passaram pela validacao de permissao do usuario.
- O filtro considera nome da tela/modulo e rota, permitindo encontrar itens como `clientes`, `estoque`, `saidas` ou `contas-receber`.
- A busca ignora acentos para melhorar a experiencia de digitacao.
- Estado vazio discreto para pesquisas sem resultado.
- Documentada esta manutencao em `docs/IMPLEMENTACAO_V1_11_0A5.md`.

### Modulos impactados

- Layout/sidebar: `layout/AppMenu.tsx`.
- Estilo da sidebar: `styles/layout/_menu.scss`.

### Validacao

Executar:

```bash
npm run validate:source
npm run build
```

## v1.11.0a4 - Skeleton loading nas telas operacionais

Versao anterior aplicada: `v1.11.0a3`.

Esta manutencao reduz a sensacao de tela parada durante consultas reais da API. As telas que usam tabelas server-side passam a renderizar skeleton de tabela no primeiro carregamento, mantendo o overlay de loading apenas para atualizacoes com dados ja carregados.

### Implementado nesta versao

- `LoadingState` foi refatorado para suportar variantes `table`, `detail`, `metrics` e `panel`.
- `DataTableServer` passa a exibir skeleton de tabela automaticamente quando esta carregando e ainda nao ha registros renderizados.
- Removidos skeletons duplicados das paginas de listagem para centralizar o comportamento no componente de tabela.
- Detalhes de pedido de venda e pedido de compra passam a usar skeleton de ficha com itens.
- Dashboard usa skeleton de metricas e painel durante o carregamento inicial.
- Saldos de estoque mostra skeleton nos cards de resumo antes de exibir valores reais.
- Documentada esta manutencao em `docs/IMPLEMENTACAO_V1_11_0A4.md`.

### Modulos impactados

- Componentes comuns: `LoadingState` e `DataTableServer`.
- Dashboard.
- Administracao, Pessoas, Clientes, Fornecedores, Produtos e Seguranca.
- Estoque, Vendas, Compras, Financeiro e Auditoria via tabela centralizada.

### Validacao

Executar:

```bash
npm run validate:source
npm run build
```

## v1.11.0a3 — Auditoria modular de testes e procedimentos

Versão anterior aplicada: `v1.11.0a2`.

Esta manutenção documenta uma varredura por módulo usando a cobertura existente de testes unitários, componentes e E2E crítico. Não altera fluxo funcional; consolida o estado atual e a fila de melhorias recomendadas.

### Resultado consolidado

- Unitários/componentes por módulo: `93/100` testes passaram.
- Falhas concentradas em Segurança/usuários, Estoque e Financeiro.
- E2E crítico: `5/5` testes bloqueados por ambiente, pois o Chromium gerenciado do Playwright não está instalado.
- Documento técnico criado: `docs/AUDITORIA_MODULOS_V1_11_0A3.md`.

### Principais melhorias identificadas

- Criar helper de teste `renderWithProviders` para componentes que dependem de TanStack Query.
- Centralizar a regra de GUID opcional para evitar divergência entre Estoque e Financeiro.
- Ajustar Financeiro para limpar `filialId`, `origemId`, `0` e `99` antes da validação.
- Revisar Estoque para alinhar `null` versus omissão em campos opcionais.
- Instalar browsers do Playwright ou configurar a suíte E2E para usar Chrome local.
- Adicionar testes de componente para Dashboard, ReasonDialog e ações críticas por permissão.

### Validação executada

```bash
npm run validate:source
vitest run por grupos modulares
npm run test:e2e:critical -- --reporter=line
```

## v1.11.0a2 — Login full-screen e payload sem filial

Versão anterior aplicada: `v1.11.0a1`.

Esta manutenção ajusta a rota `/login` para ocupar toda a viewport e remove o campo `Filial` do formulário e do payload, acompanhando a alteração do método real de autenticação.

### Implementado nesta versão

- A tela `/login` passa a usar layout full-screen, sem card central limitado no desktop.
- O formulário permanece na coluna esquerda e o painel institucional ocupa toda a coluna direita.
- Removido o campo visual `Filial` do `LoginForm`.
- Removido `filialId` de `loginSchema`, `LoginRequest`, `LoginPayload`, `useLogin` e `buildLoginPayload`.
- `buildLoginPayload` agora ignora qualquer `filialId` legado recebido por engano e nunca envia esse campo para `/api/auth/login`.
- Mensagens de erro de autenticação foram ajustadas para mencionar apenas empresa/credenciais.
- Testes de componente e payload de login atualizados.
- Documentada esta manutenção em `docs/IMPLEMENTACAO_V1_11_0A2.md`.

### Validação

Executar:

```bash
npm run validate:source
npm run test:component -- LoginForm
npm run test:unit -- authLoginPayload
npm run build
```

## v1.11.0a1 — Build e Dashboard

Versão anterior aplicada: `v1.11.0`.

Esta manutenção corrige um erro de build introduzido na tela de Login e padroniza a altura dos cards da Dashboard em zoom normal, mantendo o bloco Fiscal/Nota Fiscal protegido pelo gate de contrato.

### Implementado nesta versão

- Corrigido `features/auth/components/LoginForm.tsx`, removendo a prop `inputProps` não suportada pelo `Password` do PrimeReact 10.2.1.
- Mantidos `aria-invalid` e `aria-describedby` diretamente no componente `Password`, que herda atributos nativos de input.
- Criado `styles/layout/_dashboard.scss` para padronizar o grid e a altura dos cards do Dashboard.
- Atualizado `features/dashboard/components/DashboardPage.tsx` para usar classes específicas de layout em métricas, fluxos, auditoria e atalhos.
- Documentada esta manutenção em `docs/IMPLEMENTACAO_V1_11_0A1.md`.

### Validação

Executado:

```bash
npm run validate:source
npm run build
```

## v1.11.0 — Fiscal Contract Gate

A v1.11.0 inicia a etapa Fiscal/Nota Fiscal de forma controlada, sem criar módulo operacional, endpoints, regras fiscais, CFOP, CST, CSOSN, XML, SEFAZ, prefeitura ou cálculos tributários sem contrato oficial.

Versão anterior aplicada: `v1.10.15a1`, equivalente à manutenção criada sobre a base antiga `v10.0.15`.

### Implementado nesta versão

- Criado documento técnico `docs/IMPLEMENTACAO_V1_11_0.md`.
- Atualizada a versão visual/documental para `v1.11.0`.
- `validate:source` agora bloqueia a criação de rotas/features fiscais sem o arquivo `docs/CONTRATO_FISCAL_OFICIAL.md`.
- Formalizado que o bloco Fiscal só pode avançar com:
  - contrato real da API;
  - tipo de documento alvo, como NF-e, NFC-e, NFS-e ou outro;
  - UF/município quando aplicável;
  - regime tributário;
  - estratégia de certificado digital;
  - validação fiscal/contador ou documentação oficial aplicável.

### Validação

Executado:

```bash
npm run validate:source
npm run test:unit
```

Resultado:

- `validate:source` passou.
- `test:unit` executou com Node `24.15.0` e npm `11.12.1`; 93 testes passaram e 7 falhas preexistentes foram aceitas temporariamente nesta etapa.

## v1.10.15a1 — Login UX final

A v1.10.15a1 moderniza a rota `/login` antes do bloco Fiscal/Nota Fiscal, preservando a autenticação real, o contrato atual do backend e a regra de não expor token, senha ou referência técnica desnecessária na interface.

Versão anterior aplicada: `v10.0.15`. A partir desta manutenção, o frontend passa a usar a nomenclatura `v1.10.15` para a base equivalente à antiga linha `v10.0.15`; manutenções dentro da mesma tag seguem o padrão `v1.10.15a1`, `v1.10.15a2` e assim por diante.

### Implementado nesta versão

- Criado layout centralizado com duas áreas: formulário à esquerda e painel institucional abstrato à direita.
- Criados `LoginPage`, `LoginBrandPanel`, `LoginEnvironmentBadge`, `loginSchema` e `useLogin`.
- O formulário passou a exibir título, subtítulo, ambiente, loading claro, bloqueio de duplo submit, erro inline e `ApiErrorPanel`.
- Empresa e filial continuam como campos textuais temporários com rótulos amigáveis, sem exibir GUID cru.
- O painel visual usa gradiente azul/roxo/magenta e estrutura parametrizável por campanhas futuras.
- Em mobile, o painel visual é ocultado e o formulário ocupa a tela com foco em acessibilidade.
- A sessão agora registra início e última atividade, com limite máximo de 5 horas e inatividade máxima de 30 minutos.
- O login limpa sessão inválida antes de nova autenticação.
- Mensagens de credencial inválida, usuário bloqueado/sem permissão e empresa/filial inválida foram refinadas sem alterar endpoints.
- Adicionados testes de componente para Login e testes unitários da política de sessão.
- `validate:source` passou a validar os arquivos críticos do Login UX e a política de sessão.

Validação local recomendada:

```bash
npm run validate:source
npm run test:unit
```

## v10.0.15 — Revisão final antes do Fiscal/Nota Fiscal

A v10.0.15 fecha a última etapa antes de iniciar o bloco **Fiscal/Nota Fiscal**. O foco desta versão é reforçar permissões por rota, LGPD visual, segurança de navegação, documentação final e validações anti-regressão.

### Implementado nesta versão

- Criado `components/security/RoutePermissionGate.tsx` para proteger rotas internas além do menu, botões e ações.
- Criado `lib/security/routePermissions.ts` com matriz centralizada de permissões por rota/módulo.
- Integrado o `RoutePermissionGate` ao layout interno `app/(main)/layout.tsx`.
- Criado `lib/formatters/privacy.ts` com utilitários de minimização visual:
  - `maskDocument`;
  - `maskEmail`;
  - `maskPhone`;
  - `buildPrivacySafeEntityLabel`.
- A listagem de Pessoas passou a reutilizar `maskDocument` centralizado.
- Os selects de Pessoa em Clientes e Fornecedores passaram a exibir documento minimizado, sem expor CPF/CNPJ cru no label.
- Criados testes unitários:
  - `tests/unit/routePermissions.test.ts`;
  - `tests/unit/privacyFormatter.test.ts`.
- `validate:source` passou a bloquear regressões de:
  - ausência de guarda de rotas;
  - ausência dos utilitários de LGPD;
  - retorno de documento cru nos selects de Cliente/Fornecedor;
  - ausência da documentação final da v10.0.15.
- Atualizada a versão visual/documental para `10.0.15`.

### Escopo fechado antes do fiscal

Esta versão **não implementa módulo fiscal** e **não cria endpoint novo**. O próximo bloco, `v11.0.0`, deve tratar Fiscal/Nota Fiscal somente com contrato, documentação oficial e validação fiscal especializada.

Validação local executada nesta versão:

```bash
npm run validate:source
```

Não foram executados `npm install`, `npm run build`, `npm run test`, `npm run test:e2e` ou `docker build` neste ambiente.

## v10.0.14 — E2E completo com Playwright

A v10.0.14 fecha a etapa planejada de **testes E2E com Playwright**, usando ambiente controlado para não depender de dados manuais nem do backend local durante a execução dos testes de interface.

### Implementado nesta versão

- Criado helper E2E `tests/e2e/fixtures/logosoft.ts` com:
  - sessão autenticada em `localStorage`;
  - permissões administrativas completas;
  - perfil somente consulta para validação de autorização;
  - mocks controlados de API via `page.route('**/api/**')`;
  - helper de login real pela tela;
  - helper para abertura de dialogs de criação.
- Ampliada a suíte Playwright para cobrir:
  - bloqueio de rota sem autenticação;
  - login e logout;
  - acesso direto com sessão válida;
  - proteção de botões por permissão;
  - telas sem permissão de gerenciamento;
  - cadastro de empresa com CNPJ alfanumérico preservado;
  - cadastro de pessoa jurídica com CNPJ alfanumérico;
  - formulário de produto com campos amigáveis e sem GUID cru;
  - navegação pelos módulos críticos;
  - rotas operacionais de Vendas e Compras;
  - local de estoque e consulta de saldos;
  - exigência de motivo em cancelamento financeiro;
  - filtros e resumo de Auditoria.
- Criados/atualizados os specs:
  - `tests/e2e/auth.spec.ts`;
  - `tests/e2e/permissions.spec.ts`;
  - `tests/e2e/cadastros.spec.ts`;
  - `tests/e2e/logosoft-critical-flows.spec.ts`;
  - `tests/e2e/financeiro-estoque.spec.ts`;
  - `tests/e2e/auditoria.spec.ts`.
- Atualizado `playwright.config.ts` para subir o web server com:
  - `NEXT_PUBLIC_USE_MOCK_AUTH=true`;
  - `NEXT_PUBLIC_USE_MOCK_API=true`;
  - `NEXT_PUBLIC_APP_ENV=test`.
- Adicionados scripts:

```bash
npm run test:e2e
npm run test:e2e:critical
npm run test:e2e:ui
```

- `validate:source` agora também valida a presença da cobertura E2E obrigatória e a configuração explícita de mocks no Playwright.
- Atualizada a versão visual/documental para `10.0.14`.

Validação local executada nesta versão:

```bash
npm run validate:source
```

Não foram executados `npm install`, `npm run build`, `npm run test:e2e` ou `docker build` neste ambiente.

## Correção v10.0.13.3

A v10.0.13.3 manteve a linha de correção da v10.0.13 e refinou **Dashboard**, **Auditoria** e validações anti-regressão.

### Corrigido nesta revisão

- Dashboard passou a exibir atalhos operacionais protegidos por permissão.
- Auditoria recente do Dashboard passou a usar rótulos e severidades centralizados.
- Corrigida colisão visual de status numéricos nos fluxos críticos do Dashboard.
- Tela de Auditoria ganhou cartões-resumo e filtro por ação.
- Criado utilitário `features/auditoria/utils/auditoriaDisplay.ts`.
- Adicionado teste unitário `tests/unit/auditoriaDisplay.test.ts`.
- `validate:source` passou a validar `.npmrc`, Dockerfile e rotas operacionais de Vendas/Compras.

## Correção v10.0.13.2

A v10.0.13.2 manteve a linha da v10.0.13 e corrigiu a pendência de navegação operacional identificada nas listagens de Vendas e Compras.

### Corrigido nesta revisão

- Criada a rota `/vendas/pedidos/novo`, usada pelo botão **Novo pedido** da listagem de pedidos de venda.
- Criada a rota `/vendas/pedidos/[id]`, usada pela ação **Abrir** e pelo redirecionamento após salvar um novo pedido de venda.
- Criada a rota `/compras/pedidos/novo`, usada pelo botão **Novo pedido** da listagem de pedidos de compra.
- Criada a rota `/compras/pedidos/[id]`, usada pela ação **Abrir** e pelo redirecionamento após salvar um novo pedido de compra.
- Mantidos os componentes de detalhe já existentes: `PedidoVendaDetalhePage` e `PedidoCompraDetalhePage`.
- Atualizada a versão visual/documental para `10.0.13.2`, preservando a estratégia de correções dentro da mesma linha v10.0.13.

## Correção v10.0.13.1

A v10.0.13.1 manteve a linha da v10.0.13 e corrigiu falhas encontradas durante o build Docker em produção:

- Corrigido erro de TypeScript em `components/common/OperationalGovernancePanel.tsx`, onde o type guard de data ainda permitia inferência como `Date | null` durante o `next build`.
- Removida a chave `timeout=300000` do `.npmrc`, pois o npm 11 passou a avisar `Unknown project config "timeout"`.
- Mantidos `fetch-timeout`, `fetch-retries`, `fetch-retry-mintimeout` e `fetch-retry-maxtimeout`, que são chaves suportadas para reduzir falhas de rede no `npm install`.

## Resumo da v10.0.13

A v10.0.13 é uma versão de **documentação, rastreabilidade e hardening de build Docker**.

### Alterações desta versão

- README reescrito com histórico detalhado das versões, módulos, telas, scripts, rotas e regras permanentes do frontend.
- CHANGELOG reorganizado com entrada da v10.0.13 e correção da versão de Estoque para v10.0.11.
- Criado documento técnico `docs/IMPLEMENTACAO_V10_0_13.md`.
- `package.json` atualizado para `10.0.13`.
- `config/app.ts` atualizado para `10.0.13`.
- Rodapé corrigido para renderizar `© logosoft v10.0.13`.
- Dockerfile corrigido para copiar `.npmrc` antes do `npm install` na etapa `deps`.
- Dockerfile endurecido contra falha transitória de rede no registry npm:
  - retries explícitos;
  - timeout maior;
  - cache de `/root/.npm` via BuildKit;
  - loop de até 3 tentativas;
  - preservada a regra de **não usar `npm ci`**.
- `.npmrc` atualizado com `fetch-timeout=300000`; a chave inválida `timeout=300000` foi removida na v10.0.13.1.
- Mantido Node fixado em `node:24-alpine` nos três stages do Docker.
- Mantido `NEXT_PUBLIC_API_URL=http://localhost:8080`.
- Mantido mock desligado por padrão.
- Mantida proibição de `console.*` em código de aplicação.

## Diagnóstico do erro Docker informado

Erro recebido:

```txt
npm error code ETIMEDOUT
npm error network request to https://registry.npmjs.org/@hookform%2fresolvers failed
```

Esse erro indica falha de rede durante o download de dependência no `npm install`. Não é erro de TypeScript, Next.js, PrimeReact ou código da aplicação.

Na v10.0.12 já existia `.npmrc` com retries/timeouts, porém o Dockerfile fazia apenas:

```dockerfile
COPY package*.json ./
RUN npm install --no-audit --no-fund
```

Assim, o `.npmrc` não era copiado para dentro do stage `deps` antes do `npm install`. A v10.0.13 corrige isso com:

```dockerfile
COPY package*.json .npmrc ./
```

Além disso, o install agora usa retry explícito. Isso não elimina problemas reais de internet, DNS, proxy ou bloqueio do registry, mas torna o build mais tolerante a instabilidade temporária.

## Stack oficial

- Next.js 13.4.8.
- React 18.2.0.
- TypeScript.
- PrimeReact 10.2.1.
- PrimeIcons.
- PrimeFlex.
- Template Sakai/PrimeReact adaptado ao ERP.
- Axios.
- TanStack React Query.
- React Hook Form.
- Zod.
- Vitest.
- React Testing Library.
- Playwright.
- Docker com Node 24.

## Regras permanentes do projeto

- Não usar mock como padrão.
- Usar Axios para requisições HTTP.
- `NEXT_PUBLIC_API_URL=http://localhost:8080`.
- Não usar `console.log`, `console.error`, `console.warn` ou `console.*`.
- Feedback de erro/sucesso via Toast, erro inline e `ApiErrorPanel`.
- Dockerfile sem `npm ci`.
- Node fixado em `node:24-alpine`.
- `package.json` com `engines.node >=24 <25` e `engines.npm >=11 <12`.
- Sem engrenagem do template Sakai/AppConfig/pi-cog/layout-config-button.
- Rodapé no padrão `© logosoft vX.X.X`.
- Campos que enviam GUID no payload devem aparecer como nome, código, número ou descrição quando houver entidade selecionável.
- O usuário não deve digitar/ver GUID cru quando houver entidade selecionável.
- O payload continua enviando apenas o GUID quando o backend exige.
- Enums devem ser enviados como número.
- GUID vazio, `0`, `99`, zero GUID ou inválido não deve ser enviado.
- CNPJ alfanumérico deve ser preservado; não remover letras.
- Não inventar endpoint fora do contrato API definido para o frontend.
- Toda inativação, cancelamento, estorno e remoção crítica exige motivo.
- Permissões devem proteger menu, rota, botão e ação.
- Regras críticas são validadas no backend; o frontend melhora UX, mas não é fonte final da regra.

## Configuração local

Crie `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=logosoft
NEXT_PUBLIC_APP_ENV=development
```

## Rodando localmente

```bash
nvm use
npm install
npm run dev
```

Acesse:

```txt
http://localhost:3000/login
```

## Login manager de teste

```txt
E-mail: manager@erp.local
Senha: Manager@2026!
```

## Scripts disponíveis

```bash
npm run dev
```

Sobe o Next.js em modo desenvolvimento.

```bash
npm run build
```

Executa `npm run validate:source` e depois `next build`.

```bash
npm run start
```

Sobe a aplicação compilada.

```bash
npm run lint
```

Executa o lint do Next.js.

```bash
npm run typecheck
```

Executa `tsc --noEmit`.

```bash
npm run format
```

Formata arquivos do frontend com Prettier.

```bash
npm run test
```

Executa todos os testes Vitest.

```bash
npm run test:unit
```

Executa testes unitários e de componentes em `tests/unit` e `tests/components`.

```bash
npm run test:component
```

Executa testes de componentes.

```bash
npm run test:e2e
```

Executa testes E2E com Playwright.

```bash
npm run validate:source
```

Validação estática própria do projeto. Bloqueia regressões conhecidas como:

- `console.*` em código de aplicação;
- resíduos da engrenagem do template Sakai;
- identificadores TypeScript corrompidos por substituição textual;
- labels visíveis expondo identificadores técnicos;
- `messages?.[0]` inseguro em mapeamento Zod;
- divergência entre versão do `package.json` e `config/app.ts`;
- Dockerfile sem Node 24 fixo;
- `.npmrc` com chave `timeout=` inválida para npm 11;
- Dockerfile sem copiar `.npmrc` antes do `npm install`;
- ausência das rotas operacionais de Vendas e Compras.

```bash
npm run validate
```

Executa validação de fonte, typecheck, lint e testes.

## Docker

Build recomendado:

```bash
docker build --no-cache -t logosoft-frontend:latest .
```

Execução:

```bash
docker run --name logosoft-frontend -p 3000:3000 --env-file .env.local logosoft-frontend:latest
```

Caso o erro continue como `ETIMEDOUT`, verificar fora do código:

- conexão com `https://registry.npmjs.org`;
- DNS;
- proxy corporativo;
- firewall;
- VPN;
- instabilidade temporária no registry;
- configuração de proxy do Docker Desktop.

O projeto não usa `npm ci` por regra definida para este frontend.

## Rotas implementadas

### Auth

- `/login` — autenticação real.
- `/acesso-negado` — rota de permissão insuficiente.
- `/sessao-expirada` — sessão expirada ou refresh inválido.

### Dashboard

- `/dashboard` — visão inicial do ERP, métricas, fluxos críticos, atalhos e auditoria recente.

### Segurança

- `/seguranca/usuarios` — listagem e cadastro de usuários.
- `/seguranca/grupos-acesso` — placeholder controlado enquanto não houver endpoint oficial.

### Administração

- `/administracao/empresas`.
- `/administracao/filiais`.
- `/administracao/setores`.
- `/administracao/cargos`.
- `/administracao/centros-custo`.

### Cadastros

- `/pessoas`.
- `/clientes`.
- `/fornecedores`.
- `/produtos`.
- `/produtos/categorias`.
- `/produtos/unidades-medida`.
- `/produtos/marcas`.

### Estoque

- `/estoque/locais`.
- `/estoque/saldos`.
- `/estoque/movimentos`.
- `/estoque/entradas`.
- `/estoque/saidas`.
- `/estoque/ajustes`.
- `/estoque/reservas`.
- `/estoque/inventarios`.

### Vendas

- `/vendas/pedidos`.
- `/vendas/pedidos/novo`.
- `/vendas/pedidos/[id]`.

### Financeiro

- `/financeiro/contas-receber`.
- `/financeiro/contas-pagar`.
- `/financeiro/formas-pagamento`.
- `/financeiro/condicoes-pagamento`.

### Compras

- `/compras/pedidos`.
- `/compras/pedidos/novo`.
- `/compras/pedidos/[id]`.

### Auditoria

- `/auditoria/eventos`.

## Módulos e telas implementados

### Auth e Segurança

Implementado:

- Login real via API.
- Refresh token.
- Logout.
- Interceptor Axios para 401.
- Repetição da requisição original após refresh bem-sucedido.
- Limpeza de sessão quando refresh falha.
- `AuthProvider`.
- `useAuth`.
- `usePermissions`.
- `ProtectedRoute`.
- `PermissionGuard`.
- Menus por permissão.
- Botões por permissão.
- Usuários de segurança.

Pendente controlado:

- Grupos de acesso dependem de endpoint oficial; tela não inventa contrato.

### Administração

Implementado:

- Empresas.
- Filiais.
- Setores.
- Cargos.
- Centros de custo.
- Filtros por empresa/filial quando aplicável.
- Formulários com Zod.
- Payload builders.
- Inativação com motivo via `ReasonDialog`.
- Bloqueio visual de edição/inativação para registros não ativos.
- Painel `OperationalGovernancePanel` com visão de registros, ativos, não ativos e último cadastro.

### Pessoas, Clientes e Fornecedores

Implementado:

- Pessoas físicas e jurídicas.
- CPF/CNPJ com componente próprio.
- Preservação de CNPJ alfanumérico.
- Clientes vinculados a pessoa.
- Limite de crédito.
- Bloqueio e desbloqueio de crédito com motivo.
- Fornecedores vinculados a pessoa.
- Inativação com motivo.
- Painéis de LGPD, rastreabilidade e impacto operacional.

### Produtos e Catálogo

Implementado:

- Produtos.
- Categorias.
- Unidades de medida.
- Marcas.
- Dados comerciais.
- Dados fiscais.
- Códigos de barras.
- Fornecedores do produto.
- Controle visual de produto ativo/inativo.
- Permissão específica para dados fiscais.
- Inativação com motivo.
- Painel de controle fiscal/operacional.

### Estoque

Implementado:

- Locais de estoque.
- Saldos.
- Movimentos.
- Entrada manual.
- Saída manual.
- Ajuste.
- Reservas.
- Baixa de reserva.
- Cancelamento de reserva com motivo.
- Inventários.
- Fechamento/cancelamento de inventário.
- Cards de resumo.
- Rótulos amigáveis para tipos de movimento, status de reserva e inventário.
- Painéis explicativos reforçando que saldo é consequência de movimentos.

### Vendas

Implementado:

- Listagem de pedidos de venda.
- Criação de pedido.
- Detalhe de pedido.
- Cabeçalho do pedido.
- Itens do pedido.
- Seleção de cliente.
- Seleção de produto.
- Local de estoque quando aplicável.
- Cálculo visual de subtotal, desconto e total.
- Envio para aprovação.
- Aprovação.
- Cancelamento com motivo.
- Faturamento lógico.
- Regras visuais por status.
- Permissões específicas por ação.

### Financeiro

Implementado:

- Formas de pagamento.
- Condições de pagamento.
- Contas a receber.
- Contas a pagar.
- Parcelas.
- Recebimento parcial/total.
- Pagamento parcial/total.
- Estorno de recebimento.
- Estorno de pagamento.
- Cancelamento com motivo.
- Geração de conta a receber por pedido de venda quando aplicável.
- Origem do documento com seleção amigável quando disponível.
- Cards de resumo e totalizadores.

### Compras

Implementado:

- Listagem de pedidos de compra.
- Criação de pedido.
- Detalhe de pedido.
- Seleção de fornecedor.
- Itens do pedido.
- Seleção de produto.
- Local de estoque.
- Envio para aprovação.
- Aprovação.
- Cancelamento com motivo.
- Recebimento parcial/total.
- Opção de gerar conta a pagar.
- Opção controlada de permitir recebimento acima do pedido.
- Regras visuais por status.
- Permissões específicas por ação.

### Auditoria

Implementado:

- Consulta de eventos de auditoria.
- Filtros visuais por módulo, entidade e ação.
- Exibição de usuário, data, ação e contexto.
- Uso de `AuditInfoPanel` e `StatusHistoryPanel` quando a API retorna dados de auditoria/histórico.

## Componentes reutilizáveis principais

- `PageHeader`.
- `DataTableServer`.
- `DataTableActions`.
- `StatusTag`.
- `ApiErrorPanel`.
- `EmptyState`.
- `LoadingState`.
- `ReasonDialog`.
- `UnauthorizedState`.
- `CpfCnpjInput`.
- `CnpjInput`.
- `MoneyInput`.
- `PercentInput`.
- `QuantityInput`.
- `DateInput`.
- `DateTimeInput`.
- `EmpresaSelect`.
- `FilialSelect`.
- `EmpresaFilialFields`.
- `EmpresaFilialFilter`.
- `EntitySelect`.
- `SearchSelect`.
- `FormGrid`.
- `FormSection`.
- `FieldError`.
- `AuditInfoPanel`.
- `StatusHistoryPanel`.
- `OperationalGovernancePanel`.
- `ProtectedRoute`.
- `PermissionGuard`.

## Camada HTTP

Implementado em `lib/http/httpClient.ts` e auxiliares:

- `baseURL` via `NEXT_PUBLIC_API_URL`.
- Authorization Bearer.
- Refresh token automático.
- Controle de requisições em caso de 401.
- Sanitização de payload JSON.
- Remoção de GUID inválido, vazio, `0`, `99` e zero GUID.
- Tratamento de erros padronizados.
- Mapeamento de erros ASP.NET com `errors` por campo.
- Mapeamento de erro de regra `{ code, message }`.
- Sem log de token, senha ou dado sensível.

## Testes existentes

### Unitários

Há testes para:

- `requestUtils`.
- `apiError`.
- permissões.
- expiração JWT.
- payload de login.
- refresh de sessão.
- mapeamento de resposta auth.
- documentos CPF/CNPJ.
- payloads de administração.
- payloads de pessoas/clientes/fornecedores.
- payloads de produtos.
- payloads de estoque.
- payloads de vendas.
- regras UX de vendas.
- payloads de financeiro.
- payloads de compras.
- regras UX de compras.
- regras UX de estoque.
- formatadores.
- status rules.

### Componentes

Há testes para:

- `PermissionGuard`.
- `AdministracaoFormDialog`.
- `UsuarioFormDialog`.

### E2E

Há specs Playwright para:

- autenticação;
- fluxos críticos iniciais do logosoft.

Os E2E ainda precisam evoluir para cobrir fluxo real completo com backend, seeds e dados controlados.

## Histórico detalhado por versão

### v10.0.13 — documentação e hardening Docker

- README detalhado com módulos, telas, rotas, scripts e histórico.
- CHANGELOG reorganizado.
- Dockerfile copia `.npmrc` antes do install.
- Retry explícito no `npm install`.
- Timeouts npm aumentados.
- Cache npm via BuildKit.
- Rodapé com `v` antes da versão.
- Versão sincronizada para `10.0.13`.

### v10.0.12 — cadastros, catálogo e auditoria visual

- Refinamento de Administração, Pessoas, Clientes, Fornecedores e Produtos/Catálogo.
- Criação do `OperationalGovernancePanel`.
- Painéis de governança operacional.
- Painéis de LGPD e rastreabilidade.
- Painéis de controle fiscal/operacional no catálogo.
- Reforço da regra de não expor identificadores técnicos ao usuário.

### v10.0.11 — UX de Estoque

- Cards de resumo em locais, saldos, movimentos, reservas e inventários.
- Rótulos amigáveis para movimentos, reservas e inventários.
- Coluna de impacto operacional em movimentos.
- Painéis explicativos para entrada, saída e ajuste.
- Testes unitários de regras visuais de estoque.

### v10.0.10 — UX de Compras

- Cards de resumo em pedidos de compra.
- Fluxo visual de status no detalhe do pedido.
- Melhorias no painel de totais.
- Indicação de impacto em estoque e financeiro.

### v10.0.9 — UX de Vendas

- Fluxo visual do pedido de venda.
- Ações disponíveis por status.
- Bloqueios operacionais por status.
- Cards de resumo na listagem.
- Painel de totais com quantidade de itens e percentual de desconto.
- Teste unitário `vendasUxRules.test.ts`.

### v10.0.8 — Node 24 e refinamento Financeiro

- Dockerfile fixado em `node:24-alpine`.
- `engines` Node `>=24 <25` e npm `>=11 <12`.
- `.nvmrc` e `.node-version`.
- `.npmrc` com registry, audit/fund desligados e retries.
- `validate:source` bloqueando regressão de imagem Node.
- Cards de resumo no Financeiro.
- Totalizador de parcelas.
- Botão Salvar protegido por preenchimento mínimo.

### v10.0.7 — referências amigáveis

- Revisão global de campos que enviam GUID.
- Fornecedor do produto exibe código + pessoa.
- Pedido de venda exibe cliente por código + pessoa.
- Reserva de estoque usa seleção amigável de documento de origem.
- Validação de fonte reforçada contra labels técnicos.

### v10.0.6 — hardening de build

- `npm run build` passou a executar `validate:source` antes de `next build`.
- Remoção de resíduos do configurador Sakai.
- `.dockerignore` adicionado.
- Reforço contra regressões de build.

### v10.0.5 — validação preventiva

- Criação do script `validate:source`.
- Segmento autenticado marcado como dinâmico para evitar prerender indevido.
- Manutenção de correções em GUID e sentinelas inválidas.

### v10.0.4 — correções de dashboard e GUID

- Correção de identificadores TypeScript corrompidos.
- Correção de inferência no dashboard.
- Dashboard consumindo API real com falhas parciais tratadas.
- Auditoria real com filtros locais.

### v9.6.9.1 — limpeza Sakai e UX financeira

- Remoção definitiva da engrenagem/configurador visual do template.
- Ajustes de origem manual em contas financeiras.
- Dropdowns amigáveis para pedidos de venda/compra como origem financeira.
- Revisão para não expor referência técnica crua.

### v9.6.9 — Compras

- Módulo Compras com endpoints reais.
- Listagem, criação e detalhe de pedidos de compra.
- Itens de pedido.
- Envio para aprovação.
- Aprovação.
- Cancelamento com motivo.
- Recebimento.
- Flags para gerar conta a pagar e permitir recebimento acima do pedido.
- Permissões de compras.
- Testes unitários de payload.

### v9.6.8 — Financeiro

- Formas de pagamento.
- Condições de pagamento.
- Contas a receber.
- Contas a pagar.
- Recebimento.
- Pagamento.
- Estorno.
- Cancelamento com motivo.
- Geração de conta a receber por pedido de venda.
- Teste unitário financeiro.

### v9.6.7 — Vendas

- Pedidos de venda com endpoints reais.
- Listagem, criação e detalhe.
- Cabeçalho e itens.
- Envio para aprovação.
- Aprovação.
- Cancelamento com motivo.
- Faturamento lógico.
- Permissões por ação.
- Testes unitários de payload.

### v9.6.6 — Estoque

- Locais de estoque.
- Saldos.
- Movimentos.
- Entradas.
- Saídas.
- Ajustes.
- Reservas.
- Inventários.
- Dropdowns pesquisáveis de empresa/filial.
- Schemas e builders de payload.

### v9.6.5 — Produtos/Catálogo

- Produtos.
- Categorias.
- Unidades de medida.
- Marcas.
- Dados comerciais.
- Dados fiscais protegidos por permissão.
- Código de barras.
- Vínculo com fornecedor.
- Inativação com motivo.
- Testes unitários de payload.

### v9.6.5-buildfix

- Correção de typecheck em mapeamento de erro Zod.
- Correção aplicada em Administração, Pessoas/Clientes/Fornecedores e Produtos.
- Dockerfile preservado sem `npm ci`.

### v9.6.4 — Pessoas, Clientes e Fornecedores

- Telas específicas para Pessoas, Clientes e Fornecedores.
- APIs reais de pessoas, clientes e fornecedores.
- `CpfCnpjInput` preservando CNPJ alfanumérico.
- Schemas, hooks, payload builders e API clients.
- Motivos obrigatórios para ações críticas.

### v9.6.3 — Administração

- Telas específicas para empresas, filiais, setores, cargos e centros de custo.
- API clients reais.
- Formulários com campos do contrato.
- Inativação com motivo.
- Bloqueio de edição/inativação para status não ativo.
- Testes unitários e componente de formulário.

### v9.6.2 — Auth e Segurança

- Refresh token real.
- Logout real.
- Sessão local atualizada com permissões retornadas no refresh.
- Usuários reais em `/seguranca/usuarios`.
- Formulário de usuário.
- Grupos de acesso como placeholder controlado.
- Testes unitários de sessão e payload.

### v9.6.1 — Core API Contract

- Tipos base oficiais.
- Enums numéricos.
- `requestUtils`.
- `healthApi`.
- `mapApiError`.
- Sanitização de payload JSON.
- Login payload seguro.
- `resourceClient` revisado.
- Testes unitários de helpers e erros.

### v9.6.0 — Login real

- Normalização da resposta de login do backend.
- Correção da validação de expiração JWT.
- Correção de narrowing no mapper de autenticação.

### v9.5.0 — Payload de login

- Login envia `password` em vez de `senha`.
- Manager sem empresa/filial no payload quando campos estão vazios.
- `NEXT_PUBLIC_API_URL` padrão atualizado para `http://localhost:8080`.
- Testes unitários de montagem de payload.

### v9.4.0 — Axios e API real

- Axios definido como camada HTTP oficial.
- Mock deixou de ser padrão.
- `NEXT_PUBLIC_USE_MOCK_AUTH=false`.
- `NEXT_PUBLIC_USE_MOCK_API=false`.
- Dockerfile alterado para `npm install --no-audit --no-fund`.

### v9.3.0 — build e PrimeReact

- Correções iniciais de build.
- Correções de tipagem PrimeReact.

## Pendências conhecidas

- Validar `npm install`, `npm run validate` e `npm run build` em ambiente real com Node 24/npm 11.
- Evoluir grupos de acesso quando houver contrato de backend.
- Migrar gradualmente telas com paginação/filtro local para paginação server-side real quando a API expuser paginação completa.
- Ampliar testes E2E com backend real, seeds e massa controlada.
- Refinar dashboard e auditoria com endpoints agregados quando o backend disponibilizar métricas consolidadas.
