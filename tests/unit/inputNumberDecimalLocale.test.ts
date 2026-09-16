import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * AC-10: Todos os InputNumber decimais declaram locale="pt-BR"
 *
 * Critério: todo InputNumber com FractionDigits ou mode="currency"
 * em features/, components/, app/ e layout/ deve ter locale=
 *
 * Asserções:
 * 1. Lista de arquivos:linha sem locale é vazia
 * 2. Total de InputNumber decimais é 53
 */

describe('AC-10: InputNumber decimal locale', () => {
    it('todos os 53 InputNumber decimais declaram locale', () => {
        const files: string[] = [];
        const walk = (d: string) => {
            for (const e of fs.readdirSync(d, { withFileTypes: true })) {
                const p = path.join(d, e.name);
                if (e.isDirectory()) {
                    if (e.name !== 'node_modules') walk(p);
                } else if (p.endsWith('.tsx')) {
                    files.push(p);
                }
            }
        };

        const dirs = ['features', 'components', 'app', 'layout'];
        for (const d of dirs) {
            if (fs.existsSync(d)) {
                walk(d);
            }
        }

        const semLocale: string[] = [];
        let comLocale = 0;
        let semFracao = 0;

        for (const f of files) {
            const s = fs.readFileSync(f, 'utf8');
            const re = /<InputNumber\b[\s\S]*?\/>/g;
            let m;
            while ((m = re.exec(s))) {
                const b = m[0];
                const decimal = /FractionDigits/.test(b) || /mode="currency"/.test(b);
                if (!decimal) {
                    semFracao++;
                    continue;
                }
                const line = s.slice(0, m.index).split('\n').length;
                // Normalize path separators to forward slashes
                const normalizedPath = f.split(path.sep).join('/');
                if (/locale=/.test(b)) {
                    comLocale++;
                } else {
                    semLocale.push(`${normalizedPath}:${line}`);
                }
            }
        }

        // AC-10 assertion 1: nenhum InputNumber decimal sem locale
        if (semLocale.length > 0) {
            expect.fail(`Encontrados InputNumber decimais sem locale:\n${semLocale.join('\n')}`);
        }
        expect(semLocale).toEqual([]);

        // AC-10 assertion 2: total de InputNumber decimais é 53
        expect(comLocale).toBe(53);
    });
});
