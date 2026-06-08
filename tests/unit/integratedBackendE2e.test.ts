import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('integrated backend E2E', () => {
    it('mantém o fluxo integrado mutável protegido por opt-in próprio', () => {
        const spec = read('tests/e2e/integrated-backend.spec.ts');

        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_RUN === 'true'");
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_API_URL');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID');
        expect(spec).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID');
        expect(spec).toContain("LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK === 'true'");
        expect(spec).toContain('test.skip(!shouldRun');
        expect(spec).toContain('/api/vendas/pedidos');
        expect(spec).toContain('/api/fiscal/notas-fiscais/gerar-de-pedido-venda');
        expect(spec).toContain('/api/estoque/movimentos');
        expect(spec).toContain('/api/financeiro/contas-receber');
        expect(spec).toContain('/api/auditoria/eventos');
        expect(spec).not.toContain('process.env.LOGOSOFT_E2E_');
        expect(spec).not.toContain('process.env.LOGOSOFT_CONTRACT_');
        expect(spec).not.toContain('process.env.LOGOSOFT_OPERATIONAL_CONTRACT_');
    });

    it('mantém configuração isolada e fora da execução automática do CI comum', () => {
        const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
        const workflow = read('.github/workflows/frontend-ci.yml');
        const validateSource = read('scripts/validate-source.mjs');
        const config = read('playwright.integrated-e2e.config.ts');

        expect(config).toContain('integrated-backend\\.spec\\.ts');
        expect(config).not.toContain('fiscal-backend');
        expect(config).not.toContain('operational-backend');
        expect(config).not.toContain('.*\\.contract\\.spec\\.ts');
        expect(packageJson.scripts['validate:integrated-e2e']).toBe('node scripts/validate-integrated-e2e.mjs');
        expect(packageJson.scripts['test:e2e:integrated:backend']).toBe('playwright test --config=playwright.integrated-e2e.config.ts');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:integrated-e2e');
        expect(packageJson.scripts['ci:gates']).not.toContain('npm run test:e2e:integrated:backend');
        expect(workflow).toContain('npm run validate:integrated-e2e');
        expect(workflow).not.toContain('npm run test:e2e:integrated:backend');
        expect(validateSource).toContain('scripts/validate-integrated-e2e.mjs');
    });

    it('mantém template de ambiente integrado sem segredos reais e com execução desligada', () => {
        const envExample = read('.env.backend-controlled.example');

        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_RUN=false');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_API_URL=');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=LOGOSOFT-E2E-CONTROLADO-EXEMPLO');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json');
        expect(envExample).toContain('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=false');
        expect(envExample).not.toMatch(/Bearer\s+[A-Za-z0-9._-]+/i);
        expect(envExample).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        expect(envExample).not.toContain('sk-');
    });
});
