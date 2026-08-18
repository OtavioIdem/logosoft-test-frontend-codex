import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('contexto organizacional no topbar', () => {
    it('mantém no topbar somente título da página e botão compacto de contexto', () => {
        const topbar = read('layout/AppTopbar.tsx');
        const selector = read('components/organizational/OrganizationalContextSelector.tsx');
        expect(topbar).toContain('layout-topbar-title');
        expect(topbar).toContain('OrganizationalContextSelector');
        expect(topbar).not.toContain('EmpresaSelect');
        expect(topbar).not.toContain('FilialSelect');
        expect(selector).toContain('OrganizationalContextDialog');
        expect(selector).toContain('organizational-context-button');
        expect(selector).toContain('if (!context.canChangeOrganization) return null');
        expect(selector).toContain('organizational-context-button--attention');
        expect(selector).not.toContain('InputText');
        expect(selector).not.toContain('<input');
        expect(selector).not.toContain('<select');
    });

    it('mantém a seleção pesquisável somente no diálogo, com empresa antes da filial', () => {
        const dialog = read('components/organizational/OrganizationalContextDialog.tsx');
        expect(dialog).toContain("from 'primereact/message'");
        expect(dialog).toContain('<EmpresaSelect');
        expect(dialog).toContain('<FilialSelect');
        expect(dialog.indexOf('<EmpresaSelect')).toBeLessThan(dialog.indexOf('<FilialSelect'));
        expect(dialog).toContain('htmlFor="organizational-empresa"');
        expect(dialog).toContain('htmlFor="organizational-filial"');
        expect(dialog).toContain('Selecione uma empresa para consultar ou operar rotinas escopadas.');
        expect(dialog).not.toContain('InputText');
        expect(dialog).not.toContain('<input');
        expect(dialog).not.toContain('<select');
    });
});
