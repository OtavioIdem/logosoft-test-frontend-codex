# Implementação v1.11.0a8b27 — Pipeline/CI com gates obrigatórios

## 1. Versão

```text
v1.11.0a8b27 — Pipeline/CI com gates obrigatórios
```

## 2. Base utilizada

Base aprovada e commitada:

```text
v1.11.0a8b26.c3
```

A B26.c3 foi considerada regularizada após aplicação no repositório principal, com gate GUID aprovado e mocks/store rastreados preservados.

## 3. Objetivo

Formalizar um pipeline de CI para o frontend do LogoSoft ERP, garantindo que os gates já usados na validação local também sejam executados automaticamente em pull requests, pushes protegidos e execuções manuais.

## 4. Arquivos alterados

```text
.github/workflows/frontend-ci.yml
config/app.ts
docs/CI_GATES_FRONTEND.md
docs/IMPLEMENTACAO_V1_11_0A8B27.md
package.json
scripts/validate-ci-gates.mjs
scripts/validate-source.mjs
```

## 5. O que foi implementado

### 5.1 Workflow de CI

Criado o workflow:

```text
.github/workflows/frontend-ci.yml
```

Ele roda em:

```text
pull_request
push
workflow_dispatch
```

Branches monitoradas:

```text
main
master
develop
```

### 5.2 Gates obrigatórios no pipeline

O workflow executa:

```bash
npm install
npm run validate:source
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

### 5.3 Validação estrutural do próprio CI

Criado o script:

```text
scripts/validate-ci-gates.mjs
```

Esse script valida que o workflow existe e que contém os comandos obrigatórios.

### 5.4 Integração ao validate:source

O `validate:source` agora executa também:

```bash
node scripts/validate-ci-gates.mjs
```

Assim, remover ou enfraquecer o pipeline passa a bloquear a validação local.

### 5.5 Scripts de package

Adicionados:

```text
validate:ci
ci:gates
```

O script `ci:gates` concentra a sequência completa dos gates obrigatórios para execução local equivalente ao CI.

### 5.6 Versionamento

Atualizado:

```text
package.json
config/app.ts
```

Nova versão:

```text
1.11.0a8b27
```

## 6. O que não foi alterado

Não foram alterados:

```text
features/auth/api/mockAuthClient.ts
features/shared/api/mockErpStore.ts
features/shared/api/resourceMockClient.ts
tests/unit/mockErpStore.test.ts
```

Também não foram alterados:

```text
contratos de API
telas produtivas
payload fiscal
permissões
fluxo de autenticação
sessão
regras fiscais
mocks/store
clientes HTTP
componentes de formulário
E2E fiscal existente
contrato fiscal existente
```

## 7. Validações executadas neste pacote

Executadas neste ambiente:

```bash
node scripts/validate-ci-gates.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
```

## 8. Validações pendentes no repositório principal

Executar no repositório principal com Node 24/npm 11:

```bash
npm install
npm run validate:source
npm run validate:ci
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## 9. Riscos e observações

Os testes `test:contract:fiscal` e `test:e2e:fiscal:backend` permanecem opt-in. Em ambiente sem variáveis reais, o comportamento esperado é skip controlado.

O pipeline não substitui revisão humana de contrato fiscal, payloads sensíveis, permissões e integração real backend/frontend.

## 10. Próxima etapa recomendada

Após aprovação e commit da `v1.11.0a8b27`, a próxima etapa planejada é:

```text
v1.11.0a8b28 — Runbook final fiscal frontend
```
