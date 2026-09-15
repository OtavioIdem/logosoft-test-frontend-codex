import { expect, Locator, Page, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

// Fixture: createFiscalNote() abre em Rascunho (statusFiscal: 1), com os 3 valores acessórios em 0.
const notaFiscalId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const rotaDetalhe = `/fiscal/notas/${notaFiscalId}`;

const isPostValoresAcessorios = (method: string, url: string) => method === 'POST' && url.includes('/valores-acessorios');

const botaoValoresAcessorios = (page: Page) => page.getByRole('button', { name: 'Valores acessórios', exact: true });

// Os campos do diálogo não têm htmlFor/id (mesmo padrão do resto de FiscalActionDialogs.tsx); a
// localização é pelo texto visível do rótulo, escopada ao container ".field" e ao input dentro dele.
const campoDoDialogo = (dialog: Locator, rotulo: string) => dialog.locator('.field').filter({ hasText: rotulo }).locator('input');

test.describe('AC-11: valores acessórios da nota fiscal (b56)', () => {
    test('S1: só FISCAL_CONSULTAR — botão visível e desabilitado, com title da permissão', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR'], email: 'fiscal-impostos-s1@logosoft.local', name: 'Fiscal Impostos S1' });

        await page.goto(rotaDetalhe);

        const botao = botaoValoresAcessorios(page);
        await expect(botao).toBeVisible();
        await expect(botao).toBeDisabled();
        await expect(botao).toHaveAttribute('title', 'Permissão necessária: FISCAL_GERENCIAR.');
    });

    test('S2: FISCAL_CONSULTAR + FISCAL_GERENCIAR, nota em Rascunho — habilitado, envia o corpo exato e mostra o frete devolvido', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'], email: 'fiscal-impostos-s2@logosoft.local', name: 'Fiscal Impostos S2' });

        await page.goto(rotaDetalhe);

        const botao = botaoValoresAcessorios(page);
        await expect(botao).toBeEnabled();
        await botao.click();

        const dialog = page.getByRole('dialog', { name: 'Valores acessórios da nota' });
        await expect(dialog).toBeVisible();

        const campoFrete = campoDoDialogo(dialog, 'Frete');
        await campoFrete.click();
        await page.keyboard.press('Control+A');
        await campoFrete.pressSequentially('12,5');
        // DEF-1/D39: InputNumber currency pt-BR sobrescreve o dígito decimal ao digitar '12,50'
        // (grava 12); '12,5' é a sequência que o campo aceita corretamente. Correção do campo
        // fica fora do escopo da b56 — ver docs/arquitetura/DECISOES.md D39.
        await expect(campoFrete).toHaveValue(/12,50/);

        const campoOutras = campoDoDialogo(dialog, 'Outras despesas');
        await campoOutras.click();
        await page.keyboard.press('Control+A');
        await campoOutras.pressSequentially('3');

        const requestPromise = page.waitForRequest((request) => isPostValoresAcessorios(request.method(), request.url()));
        await dialog.getByRole('button', { name: 'Salvar valores', exact: true }).click();
        const request = await requestPromise;

        const body = request.postDataJSON() as Record<string, unknown>;
        expect(body).toEqual({ valorFrete: 12.5, valorSeguro: 0, valorOutrasDespesas: 3 });
        expect(request.url()).toContain(`/api/fiscal/notas-fiscais/${notaFiscalId}/valores-acessorios`);

        await expect(dialog).toBeHidden();

        const composicao = page.locator('.p-card').filter({ hasText: 'Composição do total' });
        await expect(composicao.getByText('Frete', { exact: true })).toBeVisible();
        await expect(composicao).toContainText(/R\$\s*12,50/);
    });

    test('S3: só FISCAL_GERENCIAR — detalhe mostra acesso negado e nenhum POST fiscal sai', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_GERENCIAR'], email: 'fiscal-impostos-s3@logosoft.local', name: 'Fiscal Impostos S3' });

        // Registrado antes do goto: conta qualquer POST ao fiscal durante toda a navegação.
        let postsFiscal = 0;
        page.on('request', (request) => {
            if (request.method() === 'POST' && request.url().includes('/api/fiscal')) postsFiscal += 1;
        });

        await page.goto(rotaDetalhe);

        await expect(page.getByRole('heading', { name: 'Acesso negado' })).toBeVisible();
        await expect(botaoValoresAcessorios(page)).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        expect(postsFiscal).toBe(0);
    });

    test('S4: como S2, depois de Validar — botão desabilitado com o motivo do status', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_GERENCIAR'], email: 'fiscal-impostos-s4@logosoft.local', name: 'Fiscal Impostos S4' });

        await page.goto(rotaDetalhe);

        const botaoValidar = page.getByRole('button', { name: 'Validar', exact: true });
        await expect(botaoValidar).toBeEnabled();
        await botaoValidar.click();

        const botao = botaoValoresAcessorios(page);
        await expect(botao).toBeDisabled();
        await expect(botao).toHaveAttribute('title', 'Disponível somente com a nota em Rascunho. Status atual: Validada.');
    });
});
