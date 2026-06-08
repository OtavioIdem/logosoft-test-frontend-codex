# Changelog

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
