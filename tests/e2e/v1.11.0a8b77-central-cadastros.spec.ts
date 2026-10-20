import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

test('E1: a central exibe somente os cadastros permitidos, sem consultar APIs de domínio', async ({ page }) => {
    const chamadasDeDominio: string[] = [];
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ['ADMINISTRACAO_CONSULTAR'] });
    page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) chamadasDeDominio.push(path);
    });

    await page.goto('/cadastros', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Cadastros' })).toBeVisible();
    await expect(page.getByText('1. Estrutura organizacional')).toBeVisible();
    await expect(page.getByRole('link', { name: /Filiais/i })).toHaveAttribute('href', '/administracao/filiais');
    await expect(page.getByText('2. Pessoas e parceiros')).toHaveCount(0);
    await expect(page.getByText('5. Fiscal')).toHaveCount(0);
    expect(chamadasDeDominio).toEqual([]);
});

test('E2: permissão fiscal revela Séries e preserva o deep link canônico', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ['FISCAL_SERIES_CONSULTAR'] });

    await page.goto('/cadastros');

    await expect(page.getByText('5. Fiscal')).toBeVisible();
    await expect(page.getByRole('link', { name: /Séries fiscais/i })).toHaveAttribute('href', '/fiscal/series');
    await expect(page.getByText('1. Estrutura organizacional')).toHaveCount(0);

    await page.goto('/fiscal/series');
    await expect(page).toHaveURL(/\/fiscal\/series$/);
});

test('E3: sem nenhuma permissão de cadastro a rota é negada', async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ['FISCAL_CONSULTAR'] });

    await page.goto('/cadastros');

    await expect(page.getByText(/A rota Central de cadastros exige uma das permissões/i)).toBeVisible();
});
