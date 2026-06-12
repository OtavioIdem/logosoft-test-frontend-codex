import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('assisted integrated E2E validation', () => {
    it('exige ACK assistido antes do E2E integrado mutável', () => {
        const spec = read('tests/e2e/integrated-backend.spec.ts');
        const envExample = read('.env.backend-controlled.example');

        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK === 'true'");
        expect(spec).toContain('assistedValidationAck');
        expect(spec).toContain('seedResetAppliedAck && assistedValidationAck');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true');
        expect(spec).toContain('integrated-e2e-assisted-context');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false');
        expect(envExample).not.toContain('LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true');
    });

    it('mantém relatório assistido fora do CI comum e sem chamada de rede', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const validateCi = read('scripts/validate-ci-gates.mjs');
        const reportScript = read('scripts/create-integrated-e2e-assisted-report.mjs');

        expect(packageJson.scripts['validate:assisted-e2e']).toBe('node scripts/validate-assisted-e2e.mjs');
        expect(packageJson.scripts['report:e2e:integrated:assisted']).toBe('node scripts/create-integrated-e2e-assisted-report.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:assisted-e2e');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run report:e2e:integrated:assisted');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run test:e2e:integrated:backend');
        expect(workflow).toContain('npm run validate:assisted-e2e');
        expect(workflow).not.toContain('npm run report:e2e:integrated:assisted');
        expect(workflow).not.toContain('npm run test:e2e:integrated:backend');
        expect(validateSource).toContain('scripts/validate-assisted-e2e.mjs');
        expect(validateCi).toContain('validate:assisted-e2e');
        expect(reportScript).not.toMatch(/fetch\(|axios|playwrightRequest|newContext\(/);
    });

    it('mantém template de evidências sem segredos e com estrutura mínima', () => {
        const rawEvidence = read('tests/evidence/integrated-e2e.assisted-evidence.example.json');
        const evidence = JSON.parse(rawEvidence) as {
            version: string;
            environment: { assistedValidationAckRequired: boolean };
            preRunChecklist: { productionDataProtected: boolean };
            postRunChecklist: { noSecretsInArtifacts: boolean };
        };

        expect(evidence.version).toBe('1.11.0a8b36');
        expect(evidence.environment.assistedValidationAckRequired).toBe(true);
        expect(evidence.preRunChecklist.productionDataProtected).toBe(true);
        expect(evidence.postRunChecklist.noSecretsInArtifacts).toBe(true);
        expect(rawEvidence).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
        expect(rawEvidence).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        expect(rawEvidence).not.toContain('sk-');
    });
});
