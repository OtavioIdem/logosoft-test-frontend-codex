import { expect, test, type Page } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

// v1.11.0a8b81 (AC-1). Rota e menu por sessão nominal, com as rotas da API interceptadas na própria spec. A fixture
// compartilhada não muda: a rota de configuração é registrada DEPOIS do catch-all de mockApiRoutes, e o Playwright casa
// a última rota registrada primeiro. Nenhum dado sensível aqui: a empresa é 404 ("ainda não configurada").

const ROTA_NEGADA = 'A rota Configuração de emissão fiscal exige uma das permissões: FISCAL_CONFIGURACAO_CONSULTAR, FISCAL_CONFIGURACAO_GERENCIAR.';

const registrarConfiguracaoMock = async (page: Page) => {
    const chamadas: string[] = [];
    await page.route('**/api/fiscal/configuracao/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        chamadas.push(`${route.request().method()} ${path}`);
        if (path === '/api/fiscal/configuracao/empresa') {
            return route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ code: 'Fiscal.Configuracao.EmpresaNaoEncontrada', message: 'A empresa ainda não tem configuração fiscal de emissão.' })
            });
        }
        if (path === '/api/fiscal/configuracao/certificados') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'Teste.RotaNaoMockada', message: `Sem mock para ${path}` }) });
    });
    return chamadas;
};

test('AC-1: sessão só com FISCAL_CONFIGURACAO_CONSULTAR vê o item no grupo Fiscal, abre a rota e não vê botão de gravar', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ['FISCAL_CONFIGURACAO_CONSULTAR'] });
    const chamadas = await registrarConfiguracaoMock(page);

    await page.goto('/fiscal/configuracao', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: 'Configuração de emissão' })).toHaveAttribute('href', '/fiscal/configuracao');
    await expect(page.getByRole('heading', { name: 'Configuração de emissão' })).toBeVisible();
    await expect(page.getByText('Empresa ainda não configurada')).toBeVisible();
    await expect(page.getByText(/Somente leitura/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar configuração' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/fiscal\/configuracao$/);
    expect(chamadas).toContain('GET /api/fiscal/configuracao/empresa');
});

test('AC-1: sessão sem nenhuma permissão de configuração não vê o item e a URL é negada, sem consultar a API', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ['FISCAL_CONSULTAR'] });
    const chamadas = await registrarConfiguracaoMock(page);

    await page.goto('/fiscal/configuracao', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(ROTA_NEGADA)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Configuração de emissão' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/fiscal\/configuracao$/);
    expect(chamadas).toHaveLength(0);
});
