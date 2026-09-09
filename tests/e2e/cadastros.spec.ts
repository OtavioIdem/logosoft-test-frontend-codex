import { expect, test } from '@playwright/test';
import { mockApiRoutes, openNewDialog, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

/**
 * O toast do PrimeReact repete a mensagem no summary e no detail, então o texto casa duas
 * vezes. A asserção fica no summary porque é ele que carrega o resultado da operação.
 */
const expectToastSummary = (page: import('@playwright/test').Page, text: RegExp) =>
    expect(page.locator('.p-toast-summary').getByText(text)).toBeVisible();

test('cadastra empresa preservando CNPJ alfanumérico', async ({ page }) => {
    await openNewDialog(page, '/administracao/empresas', 'Empresas');
    await page.getByLabel(/Razão social/).fill('Empresa E2E logosoft');
    await page.getByLabel(/Nome fantasia/).fill('logosoft E2E');
    await page.getByLabel(/CNPJ\/Documento/).fill('12ABC34501DE35');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expectToastSummary(page, /Registro salvo|dados gravados com sucesso/i);
});

test('cadastra pessoa jurídica com documento alfanumérico', async ({ page }) => {
    await openNewDialog(page, '/pessoas', 'Pessoas');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Os campos são endereçados pelo id do htmlFor do próprio formulário: o rótulo
    // "CPF/CNPJ" também aparece no botão de ajuda, e getByLabel casaria com os dois.
    await dialog.locator('#nomeRazaoSocial').fill('Pessoa Jurídica E2E');
    await dialog.locator('#nomeFantasia').fill('PJ E2E');
    await dialog.locator('#documento').fill('12ABC34501DE35');

    await dialog.locator('#tipoPessoa').click();
    await page.getByRole('option', { name: 'Pessoa jurídica' }).click();

    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expectToastSummary(page, /Pessoa salva|Cadastro de pessoa gravado/i);
});

test('abre formulário de produto com campos amigáveis e sem GUID cru', async ({ page }) => {
    await openNewDialog(page, '/produtos', 'Produtos');
    const dialog = page.getByRole('dialog', { name: 'Novo produto' });
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole('tab', { name: 'Dados gerais' })).toBeVisible();
    await expect(dialog.getByRole('tab', { name: 'Comercial e estoque' })).toBeVisible();

    await expect(dialog.getByLabel('Código *')).toBeVisible();
    await expect(dialog.getByLabel('Descrição *')).toBeVisible();

    // "Unidade" e "Preço de venda" são Dropdown/InputNumber do PrimeReact: o htmlFor aponta
    // para um wrapper que não é controle de formulário, então getByLabel não resolve. O que
    // este teste precisa provar é que o campo se apresenta pelo rótulo de negócio, e não por
    // um GUID cru — e isso a asserção sobre o próprio rótulo demonstra.
    await expect(dialog.getByText('Unidade *', { exact: true })).toBeVisible();

    // "Preço de venda" vive na segunda guia; abri-la é o que prova que a apresentação por
    // rótulo de negócio vale para o formulário inteiro, e não só para a guia inicial.
    await dialog.getByRole('tab', { name: 'Comercial e estoque' }).click();
    await expect(dialog.getByText('Preço de venda *', { exact: true })).toBeVisible();
});
