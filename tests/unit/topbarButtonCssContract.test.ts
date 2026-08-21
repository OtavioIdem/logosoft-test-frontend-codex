import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/**
 * Regressão de v1.11.0a8b47.c3.
 *
 * `.layout-topbar-button` tinha `span { display: none }` — seletor de ELEMENTO. Como o PrimeReact
 * renderiza ícone (`IconUtils.getJSXIcon`) e `Badge` como `<span>`, a regra apagava o botão
 * "Selecionar contexto" inteiro (virava um círculo vazio e invisível) e o contador de notificações
 * não lidas. O usuário master ficava sem nenhuma forma de escolher empresa/filial.
 *
 * Testes estruturais de `toContain` no fonte passavam com o bug presente, e jsdom não aplica SCSS.
 * Este gate lê o SCSS e o markup e falha na condição que originou o defeito.
 */
describe('contrato de CSS dos botões do topbar', () => {
    const scss = read('styles/layout/_topbar.scss');

    const blocosLayoutTopbarButton = () => {
        const blocos: string[] = [];
        const marcador = '.layout-topbar-button {';
        let indice = scss.indexOf(marcador);
        while (indice !== -1) {
            let profundidade = 0;
            let fim = indice + marcador.length - 1;
            for (let i = indice + marcador.length - 1; i < scss.length; i += 1) {
                if (scss[i] === '{') profundidade += 1;
                if (scss[i] === '}') {
                    profundidade -= 1;
                    if (profundidade === 0) {
                        fim = i;
                        break;
                    }
                }
            }
            blocos.push(scss.slice(indice, fim + 1));
            indice = scss.indexOf(marcador, fim);
        }
        return blocos;
    };

    it('nunca oculta um seletor de elemento span dentro de .layout-topbar-button', () => {
        const blocos = blocosLayoutTopbarButton();
        expect(blocos.length).toBeGreaterThan(0);

        for (const bloco of blocos) {
            // Uma regra aninhada que começa por `span` puro (sem classe) engoliria o ícone e o
            // badge de qualquer componente PrimeReact colocado no topbar.
            expect(bloco).not.toMatch(/(^|[\s{;])span\s*\{/);
        }
    });

    it('oculta o rótulo por classe dedicada, e não por elemento', () => {
        expect(scss).toContain('.layout-topbar-button-label');
    });

    it('todo span dentro de um botão do topbar carrega a classe de rótulo', () => {
        for (const arquivo of ['layout/AppTopbar.tsx', 'features/notificacoes/components/NotificacoesBell.tsx']) {
            const fonte = read(arquivo);
            // Recorta apenas o conteúdo de cada <button ... layout-topbar-button ...> ... </button>.
            // Fora deles a regra do SCSS não se aplica (o <span> do logo, por exemplo, é legítimo).
            const botoes = fonte.match(/<button[^>]*layout-topbar-button[^>]*>[\s\S]*?<\/button>/g) ?? [];
            expect(botoes.length, `${arquivo} não expôs nenhum botão de topbar`).toBeGreaterThan(0);

            for (const botao of botoes) {
                const spans = botao.match(/<span[^>]*>/g) ?? [];
                const suspeitos = spans.filter((span) => !span.includes('layout-topbar-button-label'));
                expect(suspeitos, `${arquivo}: <span> sem layout-topbar-button-label dentro de .layout-topbar-button`).toEqual([]);
            }
        }
    });

    it('o botão de contexto usa <i> nativo, que é o elemento do qual o SCSS depende', () => {
        const componente = read('components/organizational/SelecionarContextoButton.tsx');
        expect(componente).toContain('pi pi-building');
        expect(componente).toMatch(/<i\s+className=/);
    });
});
