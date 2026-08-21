import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('contexto organizacional no topbar', () => {
    it('mantém no topbar somente título da página e botão compacto de contexto', () => {
        const topbar = read('layout/AppTopbar.tsx');
        const selector = read('components/organizational/OrganizationalContextSelector.tsx');
        const selecionarContextoButton = read('components/organizational/SelecionarContextoButton.tsx');
        expect(topbar).toContain('layout-topbar-title');
        expect(topbar).toContain('OrganizationalContextSelector');
        expect(topbar).not.toContain('EmpresaSelect');
        expect(topbar).not.toContain('FilialSelect');
        expect(selector).toContain('SelecionarContextoButton');
        expect(selecionarContextoButton).toContain('OrganizationalContextDialog');
        expect(selecionarContextoButton).toContain('organizational-context-button');
        expect(selecionarContextoButton).toContain('if (!context.canChangeOrganization) return null');
        expect(selecionarContextoButton).toContain('organizational-context-button--attention');
        expect(selecionarContextoButton).not.toContain('InputText');
        expect(selecionarContextoButton).not.toContain('<input');
        expect(selecionarContextoButton).not.toContain('<select');
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
