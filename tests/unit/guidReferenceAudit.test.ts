import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('guid reference audit', () => {
    it('mantem script e comando de validacao global contra GUID manual', () => {
        const packageJson = JSON.parse(read('package.json'));

        expect(packageJson.scripts['validate:guid-references']).toBe('node scripts/validate-guid-references.mjs');
        expect(packageJson.scripts['validate:source']).toContain('validate-source.mjs');
        expect(existsSync(join(root, 'scripts/validate-guid-references.mjs'))).toBe(true);
    });

    it('mantem documentacao operacional da auditoria de referencias', () => {
        expect(existsSync(join(root, 'docs/GUID_REFERENCE_AUDIT.md'))).toBe(true);
        expect(read('docs/GUID_REFERENCE_AUDIT.md')).toContain('não deve digitar manualmente o identificador técnico');
        expect(read('docs/GUID_REFERENCE_AUDIT.md')).toContain('npm run validate:guid-references');
        expect(read('docs/GUID_REFERENCE_AUDIT.md')).toContain('features/auth/components/LoginForm.tsx::empresaId');
    });

    it('monitora campos de referencia conhecidos sem bloquear correlationId', () => {
        const script = read('scripts/validate-guid-references.mjs');

        expect(script).toContain('empresaId');
        expect(script).toContain('filialId');
        expect(script).toContain('clienteId');
        expect(script).toContain('produtoId');
        expect(script).toContain('pedidoVendaId');
        expect(script).toContain('condicaoPagamentoId');
        expect(script).toContain('correlationId');
        expect(script).toContain('findControllerSpreadReferences');
    });

    it('falha quando Controller name de referencia é repassado por spread para InputText', () => {
        const fixtureDir = join(root, 'features/__guid_reference_audit_fixture__');
        const fixtureFile = join(fixtureDir, 'BadGuidManual.tsx');

        mkdirSync(fixtureDir, { recursive: true });
        writeFileSync(
            fixtureFile,
            [
                "import { Controller } from 'react-hook-form';",
                "import { InputText } from 'primereact/inputtext';",
                '',
                'export const BadGuidManual = ({ control }: { control: never }) => (',
                '    <Controller',
                '        name="clienteId"',
                '        control={control}',
                '        render={({ field }) => <InputText {...field} />}',
                '    />',
                ');'
            ].join('\n')
        );

        try {
            try {
                execFileSync(process.execPath, [join(root, 'scripts/validate-guid-references.mjs')], { cwd: root, stdio: 'pipe' });
                throw new Error('A validação deveria falhar para Controller name com InputText.');
            } catch (error) {
                const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr?: Buffer }).stderr ?? '') : String(error);
                expect(stderr).toContain("Controller name 'clienteId'");
            }
        } finally {
            rmSync(fixtureDir, { recursive: true, force: true });
        }
    });
});
