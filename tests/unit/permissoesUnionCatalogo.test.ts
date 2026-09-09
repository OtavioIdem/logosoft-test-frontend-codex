import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

// Recursively find all TypeScript/TSX files in a directory
function findTsFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(join(root, dir), { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...findTsFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
        }
    }
    return files;
}

describe('permissões: union vs catálogo (regressão textual)', () => {
    it('nenhum arquivo em features/ contém os 3 fantasmas removidos em b50', () => {
        const fantasmas = [
            'ATIVIDADES_GERENCIAR',
            'RELATORIOS_CONSULTAR',
            'PORTARIA_PRE_AUTORIZAR'
        ];

        const files = findTsFiles('features');

        for (const file of files) {
            const content = read(file);
            for (const fantasma of fantasmas) {
                // Tolerância: o fantasma pode aparecer em comentários que documentem remoção
                // Mas não em código vivo (string, identificador, etc)
                // Usar regex simples: se a string aparece fora de comentários de linha removida
                const lines = content.split('\n');
                for (const line of lines) {
                    // Skip comment-only lines
                    if (line.trim().startsWith('//')) continue;
                    // Skip lines that are removals/deprecations (typo corrections)
                    if (line.includes('removido') || line.includes('removemos')) continue;
                    // Check for the fantasma string
                    if (line.includes(fantasma)) {
                        expect(true, `${file}: encontrado ${fantasma} em features/`).toBe(false);
                    }
                }
            }
        }
    });

    it('nenhum arquivo em lib/ contém os 3 fantasmas removidos em b50', () => {
        const fantasmas = [
            'ATIVIDADES_GERENCIAR',
            'RELATORIOS_CONSULTAR',
            'PORTARIA_PRE_AUTORIZAR'
        ];

        const files = findTsFiles('lib');

        for (const file of files) {
            const content = read(file);
            for (const fantasma of fantasmas) {
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('//')) continue;
                    if (line.includes('removido') || line.includes('removemos')) continue;
                    if (line.includes(fantasma)) {
                        expect(true, `${file}: encontrado ${fantasma} em lib/`).toBe(false);
                    }
                }
            }
        }
    });

    it('nenhum arquivo em layout/ contém os 3 fantasmas removidos em b50', () => {
        const fantasmas = [
            'ATIVIDADES_GERENCIAR',
            'RELATORIOS_CONSULTAR',
            'PORTARIA_PRE_AUTORIZAR'
        ];

        const files = findTsFiles('layout');

        for (const file of files) {
            const content = read(file);
            for (const fantasma of fantasmas) {
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('//')) continue;
                    if (line.includes('removido') || line.includes('removemos')) continue;
                    if (line.includes(fantasma)) {
                        expect(true, `${file}: encontrado ${fantasma} em layout/`).toBe(false);
                    }
                }
            }
        }
    });

    it('union e catálogo têm contagem igual', () => {
        const erp = read('types/erp.ts');
        const catalogo = read('features/seguranca/permissoesCatalogo.ts');

        // Extract union codes: all lines between | 'CODE'
        const unionMatches = erp.match(/\| '([A-Z_0-9]+)'/g) || [];
        const unionCodes = unionMatches.map(m => m.replace(/\| '|'/g, ''));

        // Extract catalog codes: all keys from the Record
        const catalogMatches = catalogo.match(/^\s+([A-Z_0-9]+):\s*\{/gm) || [];
        const catalogCodes = catalogMatches.map(m => m.trim().split(':')[0]);

        expect(unionCodes.length).toBe(catalogCodes.length);

        // Each union code should have a catalog entry
        const catalogSet = new Set(catalogCodes);
        for (const code of unionCodes) {
            expect(catalogSet.has(code), `${code} em union mas não em catálogo`).toBe(true);
        }

        // Each catalog code should have a union entry
        const unionSet = new Set(unionCodes);
        for (const code of catalogCodes) {
            expect(unionSet.has(code), `${code} em catálogo mas não em union`).toBe(true);
        }
    });
});
