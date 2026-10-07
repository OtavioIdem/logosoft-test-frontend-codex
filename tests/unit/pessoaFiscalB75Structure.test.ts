import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// b75 (D104, PF-10, AC-8) — regressão textual: o conteúdo de Pessoa fiscal foi renumerado de "b74" para "b75" (D97 ->
// D103). Nenhuma citação de "b74" pode sobrar em `features/`, `scripts/` e `tests/`, exceto a b74 legítima:
//   - o carimbo de versão `a8b74` / `a.8.b74` (CHANGELOG, gates de versão);
//   - os testes de tributação da b74 (D103), que citam a fatia pelo próprio número.
// O token é montado em tempo de execução para que este arquivo não acuse a si mesmo.

const raiz = process.cwd();
const TOKEN = `b${'74'}`;
const PASTAS = ['features', 'scripts', 'tests'];
const EXTENSOES = /\.(ts|tsx|js|mjs|cjs|json)$/;
// b74 legítima da D103 (tributação): o arquivo E a linha precisam citar a D103.
const TRIBUTACAO_B74 = new Set(['tests/components/SimuladorTributacaoPage.test.tsx', 'tests/unit/tributacaoErrors.test.ts']);
// Arquivos inteiros fora da varredura, cada um com o motivo. Não é Pessoa fiscal citada como b74: é a b74 como ÁRVORE.
const FORA_DA_VARREDURA: Record<string, string> = {
    'tests/unit/pessoaFiscalB75Structure.test.ts': 'este arquivo descreve a própria regra',
    'tests/unit/gateContractRequestFields.test.ts': 'a Sonda Z do gate (AC-7) roda contra a árvore da b74 (da74da2) e a cita pelo nome'
};

const listar = (pasta: string): string[] =>
    readdirSync(pasta).flatMap((nome) => {
        const caminho = join(pasta, nome);
        // Este fixture é criado/removido por `guidReferenceAudit.test.ts`; a suíte roda arquivos em paralelo.
        // Ele não faz parte da árvore de produção que este gate deve auditar.
        if (nome === 'node_modules' || nome.startsWith('.') || nome === '__guid_reference_audit_fixture__') return [];
        return statSync(caminho).isDirectory() ? listar(caminho) : EXTENSOES.test(nome) ? [caminho] : [];
    });

const citacoesIndevidas = () =>
    PASTAS.flatMap((pasta) => listar(join(raiz, pasta))).flatMap((arquivo) => {
        const rel = relative(raiz, arquivo).split(sep).join('/');
        if (FORA_DA_VARREDURA[rel]) return [];
        return readFileSync(arquivo, 'utf8')
            .split(/\r?\n/)
            .map((linha, indice) => ({ rel, numero: indice + 1, linha }))
            .filter(({ linha }) => {
                const semCarimbo = linha.replace(/a8b74|a\.8\.b74/g, '');
                return new RegExp(`(^|[^0-9A-Za-z])${TOKEN}(?![0-9])`).test(semCarimbo);
            })
            .filter(({ rel: caminho, linha }) => !(TRIBUTACAO_B74.has(caminho) && linha.includes('D103')))
            .map(({ rel: caminho, numero, linha }) => `${caminho}:${numero}: ${linha.trim()}`);
    });

describe('AC-8: nenhuma citação de b74 para Pessoa fiscal', () => {
    it('features/, scripts/ e tests/ não citam a b74 fora do carimbo de versão e da tributação (D103)', () => {
        expect(citacoesIndevidas()).toEqual([]);
    });

    it('a varredura enxerga os arquivos da fatia (não é vácuo)', () => {
        const arquivos = PASTAS.flatMap((pasta) => listar(join(raiz, pasta))).map((arquivo) => relative(raiz, arquivo).split(sep).join('/'));
        expect(arquivos).toEqual(expect.arrayContaining(['features/pessoas/components/pessoaFiscalLabels.ts', 'features/fiscal/components/fiscalErrosCadastro.ts', 'tests/components/NotaFiscalErroCadastroPanel.test.tsx', ...Array.from(TRIBUTACAO_B74)]));
    });
});
