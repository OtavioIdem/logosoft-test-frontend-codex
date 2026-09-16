import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

// DEF-3 / D42: a fixture responde igual com ou sem `empresaId` (armadilha 1 do plano da
// v1.11.0a8b56.c2) — por isso a prova precisa ler o parâmetro na requisição de verdade
// (`waitForRequest` + `URL.searchParams`), nunca só o valor mostrado na tela.
const EMPRESA_DO_CLAIM = '11111111-1111-1111-1111-111111111111';
const AVISO_SEM_EMPRESA = 'Selecione a empresa em "Selecionar contexto" para carregar os indicadores.';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('AC-5: dashboard envia o empresaId do contexto nas consultas por empresa e mostra os valores em R$', async ({ page }) => {
    const requisicaoContasReceber = page.waitForRequest((request) => request.method() === 'GET' && request.url().includes('/api/financeiro/contas-receber'));
    const requisicaoContasPagar = page.waitForRequest((request) => request.method() === 'GET' && request.url().includes('/api/financeiro/contas-pagar'));

    await page.goto('/dashboard');

    const [contasReceber, contasPagar] = await Promise.all([requisicaoContasReceber, requisicaoContasPagar]);

    expect(new URL(contasReceber.url()).searchParams.get('empresaId')).toBe(EMPRESA_DO_CLAIM);
    expect(new URL(contasPagar.url()).searchParams.get('empresaId')).toBe(EMPRESA_DO_CLAIM);

    // valorSaldo da fixture: contasReceber = 251, contasPagar = 800 (ambas status Aberta).
    await expect(page.getByText(/R\$\s*251,00/)).toBeVisible();
    await expect(page.getByText(/R\$\s*800,00/)).toBeVisible();

    await expect(page.getByText(AVISO_SEM_EMPRESA)).toHaveCount(0);
});
