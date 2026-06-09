import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('backend seed/reset integration for integrated E2E', () => {
    it('mantém script de seed/reset protegido por opt-in e ACKs explícitos', () => {
        const prepareScript = read('scripts/prepare-integrated-e2e-seed.mjs');

        expect(prepareScript).toContain("LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN === 'true'");
        expect(prepareScript).toContain("assertTrue('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK')");
        expect(prepareScript).toContain("assertTrue('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK')");
        expect(prepareScript).toContain("assertTrue('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK')");
        expect(prepareScript).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN');
        expect(prepareScript).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_PATH');
        expect(prepareScript).toContain('X-Logosoft-E2E-Seed-Run-Id');
        expect(prepareScript).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true');
        expect(prepareScript).toContain("method !== 'POST'");
        expect(prepareScript).not.toContain('process.env.LOGOSOFT_CONTRACT_');
        expect(prepareScript).not.toContain('process.env.LOGOSOFT_OPERATIONAL_CONTRACT_');
        expect(prepareScript).not.toContain('process.env.LOGOSOFT_E2E_');
    });

    it('exige confirmação de seed/reset aplicado antes do E2E integrado mutável', () => {
        const spec = read('tests/e2e/integrated-backend.spec.ts');
        const envExample = read('.env.backend-controlled.example');

        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK === 'true'");
        expect(spec).toContain('seedResetAppliedAck');
        expect(spec).toContain('runbookAck && seedResetAppliedAck');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=false');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true');
    });

    it('integra o gate estrutural sem executar seed/reset ou E2E mutável no CI comum', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const validateCi = read('scripts/validate-ci-gates.mjs');

        expect(packageJson.scripts['validate:backend-seed-reset']).toBe('node scripts/validate-backend-seed-reset.mjs');
        expect(packageJson.scripts['prepare:e2e:integrated:seed']).toBe('node scripts/prepare-integrated-e2e-seed.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:backend-seed-reset');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run prepare:e2e:integrated:seed');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run test:e2e:integrated:backend');
        expect(workflow).toContain('npm run validate:backend-seed-reset');
        expect(workflow).not.toContain('npm run prepare:e2e:integrated:seed');
        expect(workflow).not.toContain('npm run test:e2e:integrated:backend');
        expect(validateSource).toContain('scripts/validate-backend-seed-reset.mjs');
        expect(validateCi).toContain('validate:backend-seed-reset');
    });
});
