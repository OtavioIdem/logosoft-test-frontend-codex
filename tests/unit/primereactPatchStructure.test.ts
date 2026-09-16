import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * AC-6: Estrutura do patch para DEF-1 (campo decimal pt-BR)
 *
 * Validações nominais:
 * 1. devDependencies['patch-package'] em versão exata
 * 2. scripts.postinstall = 'patch-package --error-on-fail'
 * 3. Arquivo patches/primereact+<v>.patch existe com versão correta
 * 4. Patch cita só inputnumber.esm.js e inputnumber.cjs.js
 * 5. Patch contém 'insertedInFraction' (a correção)
 * 6. Dockerfile copia patches antes do npm install
 */

const projectRoot = process.cwd();

describe('AC-6: estrutura do patch primereact para DEF-1', () => {
    it('devDependencies[patch-package] está em versão exata (sem ^ ni ~)', () => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));

        expect(packageJson.devDependencies).toHaveProperty('patch-package');
        const version = packageJson.devDependencies['patch-package'];

        // Versão exata: não começa com ^ nem ~
        expect(version).not.toMatch(/^\^/);
        expect(version).not.toMatch(/^~/);
        // Deve ser um número de versão válido (e.g., "8.0.1")
        expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('scripts.postinstall = "patch-package --error-on-fail"', () => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));

        expect(packageJson.scripts).toHaveProperty('postinstall');
        expect(packageJson.scripts.postinstall).toBe('patch-package --error-on-fail');
    });

    it('existe patches/primereact+<v>.patch com <v> igual à versão de primereact', () => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
        const primereactVersion = packageJson.dependencies.primereact;

        expect(primereactVersion).toBeDefined();

        const patchFileName = `primereact+${primereactVersion}.patch`;
        const patchPath = join(projectRoot, 'patches', patchFileName);

        const patchContent = readFileSync(patchPath, 'utf-8');
        expect(patchContent).toBeDefined();
        expect(patchContent.length).toBeGreaterThan(0);
    });

    it('patch cita só inputnumber.esm.js e inputnumber.cjs.js', () => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
        const primereactVersion = packageJson.dependencies.primereact;
        const patchFileName = `primereact+${primereactVersion}.patch`;
        const patchPath = join(projectRoot, 'patches', patchFileName);
        const patchContent = readFileSync(patchPath, 'utf-8');

        // Procura pelos diff headers que nomeiam os arquivos
        // Formato: "--- a/node_modules/primereact/inputnumber/inputnumber.esm.js"
        const hasEsmFile = /^---\s+a\/.*inputnumber\.esm\.js$/m.test(patchContent);
        const hasCjsFile = /^---\s+a\/.*inputnumber\.cjs\.js$/m.test(patchContent);

        expect(hasEsmFile).toBe(true);
        expect(hasCjsFile).toBe(true);

        // Não deve mencionar outros arquivos .min.js
        expect(patchContent).not.toMatch(/inputnumber\.min\.js/);
        // Deve mencionar só os dois arquivos de interesse
        const allDiffLines = patchContent.match(/^---\s+a\/.+\.js$/gm) || [];
        expect(allDiffLines.length).toBe(2);
    });

    it('patch contém "insertedInFraction" (a correção)', () => {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
        const primereactVersion = packageJson.dependencies.primereact;
        const patchFileName = `primereact+${primereactVersion}.patch`;
        const patchPath = join(projectRoot, 'patches', patchFileName);
        const patchContent = readFileSync(patchPath, 'utf-8');

        // Busca por "insertedInFraction" nas linhas adicionadas (começando com +)
        const addedLines = patchContent.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));
        expect(addedLines.some(line => line.includes('insertedInFraction'))).toBe(true);
    });

    it('Dockerfile copia patches antes do npm install no estágio deps', () => {
        const dockerfileContent = readFileSync(join(projectRoot, 'Dockerfile'), 'utf-8');

        // Procura pelo estágio deps
        const depsMatch = dockerfileContent.match(/FROM[^/]*as deps[\s\S]*?(?=FROM|$)/i);
        expect(depsMatch).toBeDefined();

        const depsSection = depsMatch![0];

        // Procura pela sequência: COPY package*.json, depois COPY patches, depois npm install
        const copyPackageMatch = depsSection.search(/COPY\s+package\*\.json/i);
        const copyPatchesMatch = depsSection.search(/COPY\s+patches/i);
        const npmInstallMatch = depsSection.search(/npm\s+install/i);

        expect(copyPackageMatch).toBeGreaterThanOrEqual(0);
        expect(copyPatchesMatch).toBeGreaterThanOrEqual(0);
        expect(npmInstallMatch).toBeGreaterThanOrEqual(0);

        // Ordem: COPY package -> COPY patches -> npm install
        expect(copyPackageMatch).toBeLessThan(copyPatchesMatch);
        expect(copyPatchesMatch).toBeLessThan(npmInstallMatch);
    });
});
