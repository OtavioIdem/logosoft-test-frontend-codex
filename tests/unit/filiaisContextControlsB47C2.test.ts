import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('bloqueios de contexto para filiais B47.c2', () => {
    it('usa estado exclusivo quando a listagem de filiais está bloqueada', () => {
        const component = read('features/administracao/components/AdministracaoPage.tsx');
        expect(component).toContain("if (resourceKey === 'filiais' && blocked)");
        expect(component).toContain('SelecionarContextoButton');
        expect(component).toContain('<PageHeader title={config.title} description={config.description} />');
    });

    it('não permite empresa local em filtros e formulários', () => {
        const filter = read('components/forms/EmpresaFilialFilter.tsx');
        const fields = read('components/forms/EmpresaFilialFields.tsx');

        expect(filter).toContain('const alignedEmpresaId = context.snapshot.empresaId;');
        expect(filter).toContain('const empresaLocked = true;');
        expect(filter).toContain('Selecionar contexto');
        expect(filter).toContain('SelecionarContextoButton');
        expect(fields).toContain('const alignedEmpresaId = context.snapshot.empresaId;');
        expect(fields).toContain('const empresaLocked = true;');
        expect(fields).toContain('Selecionar contexto');
        expect(fields).toContain('SelecionarContextoButton');
        expect(fields).toContain('disabled={disabled || !alignedEmpresaId}');
    });
});
