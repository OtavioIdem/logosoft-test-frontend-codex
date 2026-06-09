# Skill — Validações obrigatórias de review

## Gates globais

```bash
npm install
npm run validate:source
npm run validate:skills
npm run validate:ci
npm run validate:backend-controlled
npm run validate:controlled-seeds
npm run validate:integrated-runbook
npm run validate:backend-seed-reset
npm run validate:integrated-e2e
npm run validate:operational-contracts
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```

## Playwright

```bash
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
npm run test:e2e:integrated:backend
```

## Testes direcionados

Quando a alteração afetar uma tela, hook, schema, client ou workflow específico, rodar também o teste mais próximo.

Exemplos:

```bash
npm run test:unit -- tests/unit/guidReferenceAudit.test.ts
npm run test:unit -- tests/unit/fiscalProductionReadiness.test.ts
npm run test:component -- tests/components/LoginForm.test.tsx
```

## Ambiente opt-in

Testes contract/backend podem ser skipados quando variáveis reais não estiverem configuradas. Esse skip deve aparecer no relatório e não significa validação real de produção. Quando `LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true` estiver ativo, confirmar que o ambiente é controlado, descartável ou homologação, nunca produção. Quando `LOGOSOFT_INTEGRATED_E2E_RUN=true` estiver ativo, confirmar também `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID`, `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`, `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true`, `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true` quando houver seed/reset real, execução do runbook e que pedido de venda, estoque, fiscal, financeiro e auditoria usam base descartável/controlada. Confirmar que `npm run prepare:e2e:integrated:seed` não roda no CI padrão.

## Falhas automáticas

Bloquear se qualquer gate obrigatório falhar, salvo se o próprio gate for opt-in e o skip estiver documentado.
