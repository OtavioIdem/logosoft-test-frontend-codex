import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('backend controlled validation', () => {
    it('mantém template de ambiente sem segredos e com opt-in mutável desligado', () => {
        const envExample = read('.env.backend-controlled.example');

        expect(envExample).toContain('LOGOSOFT_CONTRACT_API_URL=');
        expect(envExample).toContain('LOGOSOFT_CONTRACT_ACCESS_TOKEN=');
        expect(envExample).toContain('LOGOSOFT_E2E_API_URL=');
        expect(envExample).toContain('LOGOSOFT_E2E_ACCESS_TOKEN=');
        expect(envExample).toContain('LOGOSOFT_E2E_RUN_BACKEND_FISCAL=false');
        expect(envExample).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
        expect(envExample).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        expect(envExample).not.toContain('sk-');
    });

    it('mantém contrato fiscal e E2E backend protegidos por opt-in explícito', () => {
        const contractSpec = read('tests/contract/fiscal-backend.contract.spec.ts');
        const backendE2eSpec = read('tests/e2e/fiscal-backend.spec.ts');

        expect(contractSpec).toContain('test.skip(!shouldRun');
        expect(contractSpec).toContain('LOGOSOFT_CONTRACT_ACCESS_TOKEN');
        expect(contractSpec).toContain('LOGOSOFT_CONTRACT_RUN_EXPORT_CSV');
        expect(backendE2eSpec).toContain("LOGOSOFT_E2E_RUN_BACKEND_FISCAL === 'true'");
        expect(backendE2eSpec).toContain('LOGOSOFT_E2E_PEDIDO_VENDA_ID');
    });

    it('inclui validate:backend-controlled nos gates locais e de CI', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');

        expect(packageJson.scripts['validate:backend-controlled']).toBe('node scripts/validate-backend-controlled.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:backend-controlled');
        expect(workflow).toContain('npm run validate:backend-controlled');
        expect(validateSource).toContain('scripts/validate-backend-controlled.mjs');
    });
});
