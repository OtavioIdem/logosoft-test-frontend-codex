import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('controlled integrated E2E seeds', () => {
    it('mantém template de seed descartável e sem segredos reais', () => {
        const seedRaw = read('tests/seeds/integrated-e2e.controlled-seed.example.json');
        const seed = JSON.parse(seedRaw) as {
            schemaVersion: string;
            environment: { disposable: boolean; productionForbidden: boolean };
            execution: { requiresExplicitOptIn: boolean; requiresDisposableEnvironmentAck: boolean };
            requiredIds: { empresaId: string; pedidoVendaId: string };
            requiredOperationalState: Record<string, string>;
            forbiddenUse: string[];
        };

        expect(seed.schemaVersion).toBe('1.0');
        expect(seed.environment.disposable).toBe(true);
        expect(seed.environment.productionForbidden).toBe(true);
        expect(seed.execution.requiresExplicitOptIn).toBe(true);
        expect(seed.execution.requiresDisposableEnvironmentAck).toBe(true);
        expect(seed.requiredIds.empresaId).toBeTruthy();
        expect(seed.requiredIds.pedidoVendaId).toBeTruthy();
        expect(seed.requiredOperationalState).toHaveProperty('pedidoVenda');
        expect(seed.requiredOperationalState).toHaveProperty('estoque');
        expect(seed.requiredOperationalState).toHaveProperty('financeiro');
        expect(seed.requiredOperationalState).toHaveProperty('fiscal');
        expect(seed.requiredOperationalState).toHaveProperty('auditoria');
        expect(seed.forbiddenUse).toContain('produção');
        expect(seedRaw).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
        expect(seedRaw).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        expect(seedRaw).not.toContain('sk-');
    });

    it('mantém o E2E integrado dependente de run id e acknowledgement descartável', () => {
        const spec = read('tests/e2e/integrated-backend.spec.ts');
        const envExample = read('.env.backend-controlled.example');

        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID');
        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK === 'true'");
        expect(spec).toContain('seedRunId');
        expect(spec).toContain('disposableEnvironmentAck');
        expect(spec).toContain('runbookAck');
        expect(spec).toContain('seedResetAppliedAck');
        expect(spec).toContain('shouldRun = Boolean(runIntegratedFlow && apiUrl && accessToken && empresaId && pedidoVendaId && seedRunId && disposableEnvironmentAck && runbookAck && seedResetAppliedAck)');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=LOGOSOFT-E2E-CONTROLADO-EXEMPLO');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=false');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true');
    });

    it('integra o gate de seeds controladas aos gates locais e CI sem executar fluxo mutável', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const validateCi = read('scripts/validate-ci-gates.mjs');

        expect(packageJson.scripts['validate:controlled-seeds']).toBe('node scripts/validate-controlled-seeds.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:controlled-seeds');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run test:e2e:integrated:backend');
        expect(workflow).toContain('npm run validate:controlled-seeds');
        expect(workflow).not.toContain('npm run test:e2e:integrated:backend');
        expect(validateSource).toContain('scripts/validate-controlled-seeds.mjs');
        expect(validateCi).toContain('validate:controlled-seeds');
    });
});
