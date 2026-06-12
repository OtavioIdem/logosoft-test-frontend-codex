# Implementação v1.11.0a8 — Expansão operacional do módulo Fiscal conforme contrato v1.10.0a18

## Objetivo

Atualizar a introdução fiscal existente no frontend para refletir o contrato fiscal documentado em `documentacao-frontend-modulo-fiscal-logosoft-v1.10.0a18.md`, mantendo a tela guiada pelos retornos do backend e sem criar regra fiscal própria no frontend.

## Diagnóstico da versão anterior

A versão `v1.11.0a7` já possuía uma base fiscal conectada à API real, com:

- criação de nota manual;
- geração de nota a partir de pedido de venda;
- consulta de nota por ID;
- detalhe técnico de itens, impostos, XMLs e eventos;
- validação, geração/assinatura de XML, transmissão, rejeição, cancelamento, carta de correção, inutilização e DANFE;
- selects reais para empresa, filial, pessoa, produto e pedido.

Limitações encontradas antes desta entrega:

- a tela `/fiscal/notas` ainda não usava a listagem paginada oficial;
- o frontend ainda não consumia `resumo-operacional` e `workflow-operacional`;
- não havia tela de observabilidade fiscal;
- não havia exportação CSV auditada;
- não havia UI para reprocessamento, consulta de protocolo, contingência, baixa de estoque e geração de conta a receber;
- `features/fiscal/types/fiscal.types.ts` possuía duplicação de declaração em `CartaCorrecaoResponse`, risco direto de quebra de TypeScript.

## Escopo implementado

### Contratos, enums e permissões

- Atualizado `package.json` para `1.11.0-a.8` e `logosoftVersion` para `1.11.0a8`.
- Atualizado `config/app.ts` para exibir `1.11.0a8`.
- Atualizado `docs/CONTRATO_FISCAL_OFICIAL.md` com a base fiscal `v1.10.0a18`.
- Adicionado `StatusNotaFiscal.Contingencia = 10`.
- Adicionado `TipoEventoFiscal.Contingencia = 12`.
- Adicionado `TipoContingenciaFiscal`.
- Adicionada permissão `FISCAL_EXPORTAR` ao catálogo de permissões frontend.
- Incluída rota `/fiscal/observabilidade` no menu e nas regras de rota.

### Tipos fiscais

Arquivo principal alterado:

- `features/fiscal/types/fiscal.types.ts`

Contratos adicionados/atualizados:

- `NotaFiscalListQuery`;
- `NotaFiscalExportacaoCsvQuery`;
- `NotaFiscalListagemItemResponse`;
- `NotaFiscalListagemResponse`;
- `ResumoOperacionalNotaFiscalResponse`;
- `WorkflowOperacionalNotaFiscalResponse`;
- `EtapaWorkflowFiscalResponse`;
- `AcaoWorkflowFiscalResponse`;
- `LogIntegracaoFiscalResponse`;
- `ObservabilidadeFiscalResponse`;
- contratos de reprocessamento, protocolo, status de serviço, contingência, baixa de estoque e geração financeira.

Também foi corrigida a duplicidade de `CartaCorrecaoResponse`.

### Schemas e validações de payload

Arquivo alterado:

- `features/fiscal/schemas/fiscalSchemas.ts`

Foram adicionados schemas para:

- exportação CSV auditada;
- reprocessamento SEFAZ;
- consulta de protocolo;
- status de serviço SEFAZ;
- contingência fiscal;
- baixa de estoque;
- geração de conta a receber.

As validações seguem o contrato documentado: tamanhos máximos, UF com 2 caracteres, campos obrigatórios e `correlationId` nas operações críticas.

### API fiscal frontend

Arquivo alterado:

- `features/fiscal/api/fiscalApi.ts`

Novos métodos adicionados:

- `listarNotas` → `GET /api/fiscal/notas-fiscais`;
- `exportarNotasCsv` → `GET /api/fiscal/notas-fiscais/exportacoes/csv`;
- `buscarResumo` → `GET /api/fiscal/notas-fiscais/{id}/resumo-operacional`;
- `buscarWorkflow` → `GET /api/fiscal/notas-fiscais/{id}/workflow-operacional`;
- `buscarIntegracoes` → `GET /api/fiscal/notas-fiscais/{id}/integracoes`;
- `buscarObservabilidade` → `GET /api/fiscal/observabilidade/integracoes`;
- `reprocessarSefaz`;
- `consultarProtocoloSefaz`;
- `consultarStatusServico`;
- `listarHistoricoStatusServico`;
- `avaliarContingencia`;
- `habilitarContingencia`;
- `listarHistoricoContingencia`;
- `baixarEstoque`;
- `gerarContaReceber`.

A exportação CSV usa `responseType: 'blob'` e tenta preservar o nome do arquivo enviado por `Content-Disposition`.

### Hooks fiscais

Arquivo alterado:

- `features/fiscal/hooks/useFiscalResources.ts`

Adicionados:

- `useNotasFiscais`;
- `useNotaFiscalResumo`;
- `useNotaFiscalWorkflow`;
- `useNotaFiscalIntegracoes`;
- `useObservabilidadeFiscal`;
- mutations para os novos endpoints operacionais.

As mutations invalidam listagem, detalhe, resumo, workflow e integrações da nota quando a ação altera estado operacional.

### Tela de listagem fiscal

Arquivo alterado:

- `features/fiscal/components/NotaFiscalConsultaPage.tsx`

A tela `/fiscal/notas` deixou de ser apenas uma consulta manual por ID e passou a consumir a listagem oficial:

- filtros por empresa, filial, status, tipo, operação, série, número, chave e pendências;
- paginação server-side;
- cards de resumo da página;
- tabela com status, valor, pendências, alertas e ação principal sugerida pelo backend;
- navegação para detalhe;
- criação manual e geração por pedido preservadas;
- exportação CSV auditada com motivo obrigatório e limite.

### Tela de detalhe fiscal

Arquivo alterado:

- `features/fiscal/components/NotaFiscalDetalhePage.tsx`

Melhorias adicionadas:

- carregamento paralelo de detalhe, resumo operacional, workflow operacional e integrações;
- cards de resumo fiscal, XML/DANFE, estoque e financeiro;
- botões orientados por `resumo.acoes` quando disponível;
- aba `Workflow` com etapas, bloqueios e próximas ações;
- aba `Integrações` com logs sanitizados e indicação de reprocessamento;
- ações novas: reprocessar SEFAZ, consultar protocolo, habilitar contingência, baixar estoque e gerar conta a receber.

### Diálogos operacionais

Arquivo alterado:

- `features/fiscal/components/FiscalActionDialogs.tsx`

Novos modais:

- `ReprocessarSefazDialog`;
- `ConsultarProtocoloDialog`;
- `HabilitarContingenciaDialog`;
- `BaixarEstoqueDialog`;
- `GerarContaReceberDialog`.

Todos usam `correlationId` gerado no frontend, mantendo idempotência operacional conforme contrato.

### Observabilidade fiscal

Arquivos adicionados:

- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`;
- `app/(main)/fiscal/observabilidade/page.tsx`.

A nova tela permite:

- filtrar por empresa, filial, data inicial e quantidade;
- consultar totais de sucesso, falha, reprocessamento e pendência;
- visualizar logs recentes sanitizados;
- identificar falhas recentes, pendências e payloads sensíveis mascarados.

## Versões padronizadas por etapa

Esta entrega foi consolidada como `v1.11.0a8`, mas o desenvolvimento fiscal deve seguir a seguinte sequência de validação incremental para code review e regressão:

### v1.11.0a8b1 — Contratos fiscais frontend

Escopo:

- enums fiscais;
- permissões;
- tipos TypeScript;
- schemas Zod;
- correção de duplicidades ou inconsistências de tipo.

Validação obrigatória:

- confirmar que todos os enums trafegam como número;
- confirmar que `FISCAL_EXPORTAR` está disponível no menu e nas rotas;
- confirmar que nenhum tipo expõe XML completo na listagem;
- confirmar que `CartaCorrecaoResponse` não está duplicado.

### v1.11.0a8b2 — API client fiscal

Escopo:

- métodos HTTP;
- query params;
- payload builders;
- tratamento de `blob` para CSV e documento auxiliar;
- preservação de `Content-Disposition`.

Validação obrigatória:

- confirmar rotas documentadas no contrato;
- confirmar `Authorization` via `httpClient` existente;
- confirmar `correlationId` em operações críticas;
- confirmar limpeza de GUID vazio/inválido por `cleanQueryParams`/`sanitizePayload`.

### v1.11.0a8b3 — Listagem fiscal operacional

Escopo:

- filtros;
- paginação;
- tabela;
- ação principal;
- pendências;
- exportação CSV auditada.

Validação obrigatória:

- consultar somente quando houver `empresaId`;
- não carregar detalhe, XML completo ou eventos na listagem;
- exigir motivo para CSV;
- ocultar exportação sem `FISCAL_EXPORTAR`;
- preservar filtros usados na exportação.

### v1.11.0a8b4 — Detalhe com resumo e workflow

Escopo:

- `GET /resumo-operacional`;
- `GET /workflow-operacional`;
- tabs de workflow e integrações;
- botões conforme flags do backend.

Validação obrigatória:

- usar `resumo.acoes` e `workflow.proximasAcoes`;
- exibir `alertas`, `bloqueios` e `motivoBloqueio`;
- não decidir regra fiscal crítica somente no frontend;
- atualizar detalhe/listagem após cada mutation.

### v1.11.0a8b5 — Ações fiscais pós-autorização e reprocessamento

Escopo:

- reprocessamento;
- consulta de protocolo;
- contingência;
- baixa de estoque;
- geração financeira.

Validação obrigatória:

- permissões por ação;
- payloads mínimos por modal;
- `correlationId` único por tentativa;
- mensagens de erro com `code/message`;
- backend continua como fonte da regra de autorização.

### v1.11.0a8b6 — Observabilidade fiscal

Escopo:

- tela `/fiscal/observabilidade`;
- filtros;
- cards de totais;
- logs recentes sanitizados.

Validação obrigatória:

- não exibir senha, token, certificado, segredo ou XML completo;
- destacar `contemDadoSensivelOcultado`;
- destacar `podeReprocessar`;
- proteger rota com `FISCAL_CONSULTAR`.

### v1.11.0a8b7 — Regressão técnica

Escopo:

- validação de fonte;
- typecheck;
- lint;
- testes unitários/componentes;
- build.

Validação obrigatória no ambiente correto:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

## O que não foi implementado como regra fiscal própria

Por decisão técnica e por segurança fiscal, esta entrega não implementa no frontend:

- cálculo tributário;
- regra de CFOP, CST, CSOSN, NCM ou CEST;
- prazo legal de cancelamento;
- restrições legais de carta de correção;
- regra por UF;
- regra de NFS-e por município;
- layout XML oficial;
- assinatura digital real no browser;
- validação oficial de schema fiscal no browser.

Essas decisões permanecem no backend, em parametrização futura ou em validação humana especializada.

## Validações executadas neste ambiente

Executado com sucesso:

```bash
node scripts/validate-source.mjs
```

Também foi executada uma validação sintática local dos arquivos alterados com o compilador TypeScript disponível globalmente, usando `transpileModule`, para confirmar ausência de erro de parse nos arquivos fiscais modificados.

## Validações não concluídas neste ambiente

Não foi possível concluir `npm install`, `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run build` neste container porque o projeto exige:

- Node `>=24 <25`;
- npm `>=11 <12`.

O ambiente disponível nesta execução estava com:

- Node `v22.16.0`;
- npm `10.9.2`.

## Arquivos alterados/adicionados

Alterados:

- `package.json`;
- `config/app.ts`;
- `CHANGELOG.md`;
- `docs/CONTRATO_FISCAL_OFICIAL.md`;
- `types/erp.ts`;
- `layout/AppMenu.tsx`;
- `lib/security/routePermissions.ts`;
- `features/fiscal/api/fiscalApi.ts`;
- `features/fiscal/hooks/useFiscalResources.ts`;
- `features/fiscal/types/fiscal.types.ts`;
- `features/fiscal/schemas/fiscalSchemas.ts`;
- `features/fiscal/components/fiscalUiUtils.ts`;
- `features/fiscal/components/NotaFiscalConsultaPage.tsx`;
- `features/fiscal/components/NotaFiscalDetalhePage.tsx`;
- `features/fiscal/components/FiscalActionDialogs.tsx`.

Adicionados:

- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`;
- `app/(main)/fiscal/observabilidade/page.tsx`;
- `docs/IMPLEMENTACAO_V1_11_0A8.md`.

## Checklist de code review

- [ ] Listagem fiscal busca dados reais de `GET /api/fiscal/notas-fiscais`.
- [ ] Filtros enviados batem com o contrato `v1.10.0a18`.
- [ ] Exportação CSV exige motivo e usa `FISCAL_EXPORTAR`.
- [ ] Detalhe busca `resumo-operacional` e `workflow-operacional`.
- [ ] Botões usam flags do backend sempre que disponíveis.
- [ ] Modais enviam payload mínimo documentado.
- [ ] Ações críticas geram `correlationId`.
- [ ] Logs fiscais não exibem dado sensível bruto.
- [ ] Nenhuma regra fiscal legal foi hardcoded no frontend.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run build` passam em Node 24/npm 11.
