# Runbook — Backend descartável para E2E integrado

## Objetivo

Este runbook define o procedimento seguro para executar o E2E integrado mutável do frontend contra um backend controlado e descartável.

Fluxo coberto:

```text
venda → fiscal → estoque → financeiro → auditoria
```

A execução real é opt-in e não faz parte do CI comum. O objetivo é validar integração entre frontend e backend sem risco para produção, dados reais, ambientes compartilhados ou bases de homologação usadas por outras pessoas.

## Princípio obrigatório

O comando abaixo só pode ser executado quando o ambiente puder ser destruído, resetado ou descartado após o teste:

```bash
npm run test:e2e:integrated:backend
```

A execução real exige três confirmações cumulativas:

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
```

Sem essas variáveis, a suíte deve permanecer skipped.

## O que é backend descartável

Backend descartável é uma instância de API com banco, cache, storage e dados criados para teste, onde mutações podem ser apagadas sem impacto operacional.

Exemplos permitidos:

```text
Docker Compose local com PostgreSQL/Redis e volume removível.
Ambiente de homologação exclusivo para este teste.
Sandbox isolado com base resetável.
Base clonada e anonimizada, desde que possa ser descartada.
```

Exemplos proibidos:

```text
Produção.
Homologação compartilhada sem janela combinada.
Base com dados reais de cliente sem anonimização.
Banco que não possa ser resetado.
Ambiente onde cancelamento, faturamento, estoque ou financeiro impactem operação real.
```

## Pré-requisitos

Antes de executar, confirmar:

```text
1. Backend compilando e acessível.
2. PostgreSQL de teste isolado.
3. Redis de teste isolado, quando usado.
4. Migrations aplicadas.
5. Usuário/token local com permissões necessárias.
6. Empresa e filial controladas.
7. Pedido de venda controlado, aprovado e faturável.
8. Produto ativo com estoque suficiente ou regra controlada de baixa.
9. Cliente ativo controlado.
10. Configuração fiscal em homologação/simulação.
11. Financeiro apto a gerar conta a receber.
12. Auditoria habilitada.
13. Seed identificada por `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID`.
14. Nenhum token, senha, certificado ou segredo será versionado.
```

## Preparação sugerida com Docker

A estrutura exata depende do backend, mas o fluxo operacional esperado é:

```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d postgres redis api
```

Aplicar migrations do backend:

```bash
dotnet ef database update
```

Carregar seeds controladas no backend usando script, endpoint administrativo de homologação ou comando próprio do backend:

```bash
# Exemplo ilustrativo. Ajustar ao comando real do backend.
dotnet run --project src/Erp.Api -- seed integrated-e2e --run-id LOGOSOFT-E2E-YYYYMMDD-HHMM
```

O frontend versiona apenas o template de seed:

```text
tests/seeds/integrated-e2e.controlled-seed.example.json
```

A seed real do backend deve ser criada no backend ou em ambiente local não versionado.

## Variáveis locais

Copiar o template seguro:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
```

Preencher somente no arquivo local não versionado:

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
LOGOSOFT_INTEGRATED_E2E_API_URL=http://localhost:8080
LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=<token-local-nao-versionado>
LOGOSOFT_INTEGRATED_E2E_REFRESH_TOKEN=<refresh-local-nao-versionado-opcional>
LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=<empresa-controlada>
LOGOSOFT_INTEGRATED_E2E_FILIAL_ID=<filial-controlada-opcional>
LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=<pedido-controlado-faturavel>
LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=LOGOSOFT-E2E-YYYYMMDD-HHMM
LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
```

Atenção: `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` significa que este runbook foi lido e que o responsável confirmou ambiente descartável/controlado.

## Validações antes da execução mutável

Rodar os gates estruturais:

```bash
npm install
npm run validate:source
npm run validate:controlled-seeds
npm run validate:integrated-runbook
npm run validate:integrated-e2e
npm run validate:ci
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
git diff --check
git diff --cached --check
```

Validar contratos read-only antes do fluxo mutável:

```bash
npm run test:contract:fiscal
npm run test:contract:operational
```

Se os contratos read-only falharem, não executar o E2E integrado mutável.

## Execução

Executar somente após confirmar ambiente descartável e variáveis locais:

```bash
npm run test:e2e:integrated:backend
```

Resultado esperado:

```text
1. Consulta pedido de venda controlado.
2. Gera nota fiscal a partir do pedido.
3. Valida a nota pela tela fiscal.
4. Gera XML em ambiente controlado.
5. Assina XML em ambiente controlado.
6. Transmite em homologação/simulação.
7. Gera DANFE.
8. Baixa estoque.
9. Gera financeiro.
10. Consulta efeitos operacionais em estoque, financeiro e auditoria.
```

## Evidências obrigatórias

Guardar no relatório da execução:

```text
Data/hora.
Branch e commit do frontend.
Branch e commit do backend.
Seed run id.
URL do backend controlado.
Empresa/filial controladas.
Pedido de venda controlado.
Resultado do E2E.
IDs gerados: nota fiscal, movimentos de estoque, contas a receber e auditoria quando disponíveis.
Prints/traces Playwright quando houver falha.
Comandos executados.
```

Não registrar token, senha, certificado, refresh token, XML completo autorizado ou payload sensível.

## Limpeza do ambiente

Após a execução, preferir destruir a base:

```bash
docker compose -f docker-compose.test.yml down -v
```

Quando não for possível destruir, executar rotina formal do backend para limpar por `seedRunId`:

```bash
# Exemplo ilustrativo. Ajustar ao comando real do backend.
dotnet run --project src/Erp.Api -- seed integrated-e2e cleanup --run-id LOGOSOFT-E2E-YYYYMMDD-HHMM
```

A limpeza deve considerar:

```text
nota fiscal gerada
XML/documento auxiliar controlado
movimentos de estoque
geracao financeira
auditoria vinculada
logs de integração controlados
```

## Critérios de bloqueio

Bloquear a execução ou o commit se ocorrer qualquer item:

```text
Ambiente não é descartável.
`LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` aparece em arquivo versionado.
Token, JWT, certificado ou segredo aparece em arquivo versionado.
E2E integrado mutável entra no `ci:gates` ou workflow padrão.
Contrato fiscal ou operacional read-only falha antes do fluxo mutável.
Seed não possui `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID` rastreável.
Pedido de venda usado não é controlado/faturável.
Backend aponta para produção ou base compartilhada sem autorização.
Falha gera alteração parcial sem cleanup possível.
Documentação contradiz o comportamento dos scripts.
```

## Rollback operacional

Se a execução falhar no meio:

```text
1. Não repetir imediatamente em cima da mesma base sem análise.
2. Coletar trace, screenshot e logs do backend.
3. Identificar a última etapa concluída.
4. Rodar cleanup por seedRunId ou destruir o volume.
5. Registrar se houve nota, estoque, financeiro ou auditoria parcial.
6. Recriar base descartável antes de nova tentativa.
```

## Responsabilidades

Frontend:

```text
Fornecer gates, spec Playwright, documentação e proteção contra execução acidental.
Não versionar segredo.
Não executar fluxo mutável por padrão.
```

Backend:

```text
Fornecer ambiente descartável ou sandbox.
Fornecer seed real controlada.
Garantir cleanup/reset.
Garantir regras reais no domínio.
Garantir auditoria e transações.
```

Review/Codex:

```text
Verificar se o runbook condiz com scripts, envs e specs.
Validar que ACK true não está versionado.
Confirmar que `ci:gates` não executa o E2E integrado mutável.
Bloquear divergência entre markdown e pacote.
```

## Integração com seed/reset real do backend

A partir da v1.11.0a8b35, quando o backend disponibilizar endpoint real/controlado de preparação de dados, execute também:

```bash
npm run validate:backend-seed-reset
npm run prepare:e2e:integrated:seed
```

O comando de seed/reset exige:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true
```

O valor `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true` só deve ser definido depois que o backend confirmar que o reset foi aplicado no ambiente descartável.
