import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('operational backend contracts', () => {
    it('mantém contrato operacional read-only protegido por opt-in', () => {
        const contractSpec = read('tests/contract/operational-backend.contract.spec.ts');

        expect(contractSpec).toContain('test.skip(!shouldRun');
        expect(contractSpec).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_API_URL');
        expect(contractSpec).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN');
        expect(contractSpec).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID');
        expect(contractSpec).toContain('/api/vendas/pedidos');
        expect(contractSpec).toContain('/api/estoque/saldos');
        expect(contractSpec).toContain('/api/financeiro/contas-receber');
        expect(contractSpec).toContain('/api/auditoria/eventos');
        expect(contractSpec).not.toContain('api.post(');
        expect(contractSpec).not.toContain('api.put(');
        expect(contractSpec).not.toContain('api.delete(');
        expect(contractSpec).not.toContain('LOGOSOFT_CONTRACT_');
    });

    it('mantém scripts e CI alinhados ao contrato operacional', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const fiscalContractConfig = read('playwright.contract.config.ts');
        const operationalContractConfig = read('playwright.operational-contract.config.ts');

        expect(fiscalContractConfig).toContain('fiscal-backend\\.contract\\.spec\\.ts');
        expect(fiscalContractConfig).not.toContain('.*\\.contract\\.spec\\.ts');
        expect(fiscalContractConfig).not.toContain('operational-backend\\.contract\\.spec\\.ts');
        expect(operationalContractConfig).toContain('operational-backend\\.contract\\.spec\\.ts');
        expect(operationalContractConfig).not.toContain('.*\\.contract\\.spec\\.ts');

        expect(packageJson.scripts['validate:operational-contracts']).toBe('node scripts/validate-operational-contracts.mjs');
        expect(packageJson.scripts['test:contract:operational']).toBe('playwright test --config=playwright.operational-contract.config.ts');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:operational-contracts');
        expect(packageJson.scripts['ci:gates']).toContain('npm run test:contract:operational');
        expect(workflow).toContain('npm run validate:operational-contracts');
        expect(workflow).toContain('npm run test:contract:operational');
        expect(validateSource).toContain('scripts/validate-operational-contracts.mjs');
    });

    it('mantém template de ambiente operacional sem segredos reais', () => {
        const envExample = read('.env.backend-controlled.example');

        expect(envExample).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_API_URL=');
        expect(envExample).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN=');
        expect(envExample).toContain('LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID=');
        expect(envExample).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
        expect(envExample).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        expect(envExample).not.toContain('sk-');
    });
});
