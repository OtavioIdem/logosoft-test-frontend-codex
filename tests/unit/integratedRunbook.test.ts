import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('integrated E2E disposable backend runbook', () => {
    it('documenta preparação, execução, evidências, cleanup e rollback', () => {
        const runbook = read('docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md');

        expect(runbook).toContain('Backend descartável');
        expect(runbook).toContain('LOGOSOFT_INTEGRATED_E2E_RUN=true');
        expect(runbook).toContain('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true');
        expect(runbook).toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true');
        expect(runbook).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true');
        expect(runbook).toContain('docker compose -f docker-compose.test.yml down -v');
        expect(runbook).toContain('docker compose -f docker-compose.test.yml up -d postgres redis api');
        expect(runbook).toContain('dotnet ef database update');
        expect(runbook).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID');
        expect(runbook).toContain('npm run test:contract:fiscal');
        expect(runbook).toContain('npm run test:contract:operational');
        expect(runbook).toContain('npm run test:e2e:integrated:backend');
        expect(runbook).toContain('Evidências obrigatórias');
        expect(runbook).toContain('Limpeza do ambiente');
        expect(runbook).toContain('Critérios de bloqueio');
        expect(runbook).toContain('Rollback operacional');
        expect(runbook).toContain('Não registrar token, senha, certificado, refresh token, XML completo autorizado ou payload sensível');
    });

    it('exige acknowledgement de runbook para execução mutável integrada', () => {
        const spec = read('tests/e2e/integrated-backend.spec.ts');
        const envExample = read('.env.backend-controlled.example');

        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK === 'true'");
        expect(spec).toContain('runbookAck');
        expect(spec).toContain('seedResetAppliedAck');
        expect(spec).toContain('disposableEnvironmentAck && runbookAck');
        expect(spec).toContain('runbookAck && seedResetAppliedAck');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=false');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true');
    });

    it('integra o gate de runbook sem executar E2E integrado no CI comum', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const validateCi = read('scripts/validate-ci-gates.mjs');

        expect(packageJson.scripts['validate:integrated-runbook']).toBe('node scripts/validate-integrated-runbook.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:integrated-runbook');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run test:e2e:integrated:backend');
        expect(workflow).toContain('npm run validate:integrated-runbook');
        expect(workflow).not.toContain('npm run test:e2e:integrated:backend');
        expect(validateSource).toContain('scripts/validate-integrated-runbook.mjs');
        expect(validateCi).toContain('validate:integrated-runbook');
    });
});
