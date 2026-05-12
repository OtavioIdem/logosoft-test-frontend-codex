import { expect, test } from '@playwright/test';
import { mockApiRoutes, openNewDialog, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('cadastra empresa preservando CNPJ alfanumérico', async ({ page }) => {
    await openNewDialog(page, '/administracao/empresas', 'Empresas');
    await page.getByLabel(/Razão social/).fill('Empresa E2E logosoft');
    await page.getByLabel(/Nome fantasia/).fill('logosoft E2E');
    await page.getByLabel(/CNPJ\/Documento/).fill('12ABC34501DE35');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Registro salvo|dados gravados com sucesso/i)).toBeVisible();
});

test('cadastra pessoa jurídica com documento alfanumérico', async ({ page }) => {
    await openNewDialog(page, '/pessoas', 'Pessoas');
    await page.getByLabel(/Nome\/Razão social/).fill('Pessoa Jurídica E2E');
    await page.getByLabel(/Nome fantasia\/Apelido/).fill('PJ E2E');
    await page.getByLabel(/CPF\/CNPJ/).fill('12ABC34501DE35');
    await page.getByLabel(/Tipo/).click();
    await page.getByRole('option', { name: 'Pessoa jurídica' }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Pessoa salva|Cadastro de pessoa gravado/i)).toBeVisible();
});

test('abre formulário de produto com campos amigáveis e sem GUID cru', async ({ page }) => {
    await openNewDialog(page, '/produtos', 'Produtos');
    await expect(page.getByRole('dialog', { name: 'Novo produto' })).toBeVisible();
    await expect(page.getByLabel('Código *')).toBeVisible();
    await expect(page.getByLabel('Descrição *')).toBeVisible();
    await expect(page.getByLabel('Unidade *')).toBeVisible();
    await expect(page.getByLabel('Preço de venda *')).toBeVisible();
    await expect(page.getByText(/Pesquise pelo nome\/razão social/i)).toBeVisible();
});
