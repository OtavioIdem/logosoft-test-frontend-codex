import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('mocks isolation audit', () => {
    it('mantem mocks fora dos diretorios produtivos', () => {
        expect(existsSync(join(root, 'tests/mocks/auth/mockAuthClient.ts'))).toBe(true);
        expect(existsSync(join(root, 'tests/mocks/resources/mockErpStore.ts'))).toBe(true);
        expect(existsSync(join(root, 'tests/mocks/resources/resourceMockClient.ts'))).toBe(true);
        expect(existsSync(join(root, 'features/auth/api/mockAuthClient.ts'))).toBe(false);
        expect(existsSync(join(root, 'features/shared/api/mockErpStore.ts'))).toBe(false);
        expect(existsSync(join(root, 'features/shared/api/resourceMockClient.ts'))).toBe(false);
    });

    it('mantem o gate de isolamento de mocks integrado aos gates obrigatorios', () => {
        const packageJson = JSON.parse(read('package.json'));

        expect(packageJson.scripts['validate:mocks-isolation']).toBe('node scripts/validate-mocks-isolation.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:mocks-isolation');
        expect(read('scripts/validate-source.mjs')).toContain('scripts/validate-mocks-isolation.mjs');
        expect(read('.github/workflows/frontend-ci.yml')).toContain('npm run validate:mocks-isolation');
    });

    it('falha quando um arquivo de mock volta para features', () => {
        const fixtureDir = join(root, 'features/__mock_isolation_fixture__');
        const fixtureFile = join(fixtureDir, 'mockBadClient.ts');

        mkdirSync(fixtureDir, { recursive: true });
        writeFileSync(fixtureFile, "export const mockBadClient = { list: async () => [] };\n");

        try {
            try {
                execFileSync(process.execPath, [join(root, 'scripts/validate-mocks-isolation.mjs')], { cwd: root, stdio: 'pipe' });
                throw new Error('A validação deveria falhar para mock em features.');
            } catch (error) {
                const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr?: Buffer }).stderr ?? '') : String(error);
                expect(stderr).toContain('não podem ficar em diretórios produtivos');
            }
        } finally {
            rmSync(fixtureDir, { recursive: true, force: true });
        }
    });
});
