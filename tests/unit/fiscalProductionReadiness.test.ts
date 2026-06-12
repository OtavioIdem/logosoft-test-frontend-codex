import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('fiscal production readiness', () => {
    it('mantem scripts fiscais obrigatorios no package.json', () => {
        const packageJson = JSON.parse(read('package.json'));
        expect(packageJson.scripts['validate:fiscal:production']).toBe('node scripts/validate-fiscal-production.mjs');
        expect(packageJson.scripts['test:e2e:fiscal']).toBeTruthy();
        expect(packageJson.scripts['test:contract:fiscal']).toBeTruthy();
        expect(packageJson.scripts['test:e2e:fiscal:backend']).toBeTruthy();
    });

    it('mantem documentacao de revisao final de producao fiscal', () => {
        expect(existsSync(join(root, 'docs/FISCAL_FRONTEND_PRODUCTION_REVIEW.md'))).toBe(true);
        expect(read('docs/CONTRATO_FISCAL_OFICIAL.md')).toContain('1.11.0a8b25');
        expect(read('docs/FISCAL_FRONTEND_PRODUCTION_REVIEW.md')).toContain('Gates técnicos obrigatórios');
    });

    it('preserva protecoes fiscais de XML, workflow e correlationId', () => {
        const fiscalUiUtils = read('features/fiscal/components/fiscalUiUtils.ts');
        const detalhePage = read('features/fiscal/components/NotaFiscalDetalhePage.tsx');
        const panels = read('features/fiscal/components/FiscalOperationalPanels.tsx');

        expect(fiscalUiUtils).toContain('[XML_MASKED]');
        expect(fiscalUiUtils).toContain('createFiscalCorrelationId');
        expect(detalhePage).toContain('resolveFiscalWorkflowActionState');
        expect(panels).toContain('maskFiscalSensitiveText');
        expect(panels).toContain('FiscalPayloadResumo');
    });

    it('mantem E2E backend fiscal opt-in e sem seletores frageis por indice', () => {
        const e2eBackend = read('tests/e2e/fiscal-backend.spec.ts');

        expect(e2eBackend).toContain('LOGOSOFT_E2E_RUN_BACKEND_FISCAL');
        expect(e2eBackend).not.toContain("locator('input').nth(");
        expect(e2eBackend).not.toContain('locator("input").nth(');
    });
});
