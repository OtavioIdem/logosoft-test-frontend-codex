import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// b72 (D100, AC-9) — regressão textual: os textos de "cadastro sem tela" saem de `features/`. A natureza passou a
// ser escolhida no `NaturezaOperacaoField` da Nova nota e do Gerar NF, e a tela de cadastro existe.
// Varre a árvore inteira de `features/` (não um arquivo): o texto não pode voltar em nenhum módulo.

const raiz = process.cwd();

const arquivosDe = (pasta: string): string[] =>
    readdirSync(pasta).flatMap((nome) => {
        const caminho = join(pasta, nome);
        if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
        return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
    });

const arquivos = arquivosDe(join(raiz, 'features'));

const ocorrencias = (texto: string) =>
    arquivos.flatMap((arquivo) =>
        readFileSync(arquivo, 'utf8')
            .split(/\r?\n/)
            .map((linha, indice) => (linha.includes(texto) ? `${relative(raiz, arquivo)}:${indice + 1}` : null))
            .filter((item): item is string => item !== null)
    );

describe('AC-9: textos de natureza "sem tela" saem de features/', () => {
    it('a varredura enxerga os arquivos do recorte (não é vácua)', () => {
        const nomes = arquivos.map((arquivo) => relative(raiz, arquivo).replace(/\\/g, '/'));
        expect(nomes).toContain('features/fiscal/components/FiscalActionDialogs.tsx');
        expect(nomes).toContain('features/fiscal/components/fiscalLabels.ts');
        expect(nomes).toContain('features/fiscal/components/NaturezaOperacaoField.tsx');
    });

    it.each(['ainda não oferece a seleção', 'ainda não tem tela', 'Parametrização fiscal futura'])('"%s" não aparece em nenhum arquivo de features/', (texto) => {
        expect(ocorrencias(texto)).toEqual([]);
    });
});
