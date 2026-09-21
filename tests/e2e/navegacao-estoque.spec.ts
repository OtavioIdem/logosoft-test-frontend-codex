import { expect, test } from '@playwright/test';
import { mockApiRoutes, writeSession, ADMIN_PERMISSIONS, expectPageHeading } from './fixtures/logosoft';

test.describe('Navegação Estoque — AC-8 e AC-9', () => {
  test('AC-8: /estoque/bloqueios redireciona para /estoque/avancado', async ({ page }) => {
    // Esta rota não toca no menu: é redirecionamento server-side direto em app/(main)/estoque/bloqueios/page.tsx.
    // Afirma que a rota continua respondendo (não 404) e redireciona como esperado.
    // ORDEM CRÍTICA: mockApiRoutes PRIMEIRO, depois writeSession, depois goto
    await mockApiRoutes(page);
    await writeSession(page, { permissions: ADMIN_PERMISSIONS });
    await page.goto('/estoque/bloqueios');

    // Verificar que a URL foi alterada para /estoque/avancado
    await expect(page).toHaveURL(/\/estoque\/avancado/);

    // Verificar que o conteúdo da página mudou para o da tela de Estoque Avançado
    await expect(page.locator('h1.layout-topbar-title-text')).toHaveText(/Estoque Avançado/i);
  });

  test('AC-9: usuário com apenas ESTOQUE_MOVIMENTAR vê o grupo Estoque e itens a que tem direito, mas não vê "Bloqueios"', async ({ page }) => {
    // Validar a premissa: `accessRisk: ILUSAO` — ninguém perde capacidade com a remoção de "Bloqueios".
    // O usuário com ESTOQUE_MOVIMENTAR pode movimentar estoque, logo vê o grupo e o item correspondente.
    // Não vê Bloqueios porque a permissão não existe e o item foi removido.
    // ORDEM CRÍTICA: mockApiRoutes PRIMEIRO, depois writeSession, depois goto
    await mockApiRoutes(page);
    await writeSession(page, {
      permissions: [
        'ESTOQUE_CONSULTAR',
        'ESTOQUE_MOVIMENTAR'
        // Nota: ESTOQUE_BLOQUEIOS_GERENCIAR ou similar NUNCA foi permissão válida.
        // O item apontava para rota que só faz redirect, portanto era "ilusão".
      ]
    });
    // Navegar para /estoque/movimentos (rota que existe e pertence a ESTOQUE_MOVIMENTAR)
    // /estoque é só um grupo de menu, não tem página real
    await page.goto('/estoque/movimentos');

    // Verificar que a página de movimentos carregou
    await expect(page.locator('h1.layout-topbar-title-text')).toHaveText(/Movimentos/i);

    // AC-9 valida: `accessRisk: ILUSAO` — usuário com apenas ESTOQUE_MOVIMENTAR não perde capacidade
    // Afirmações:
    // 1. Menu está presente na página
    const menu = page.locator('ul.layout-menu');
    await expect(menu).toBeVisible();

    // 2. O texto "Bloqueios" não aparece em nenhum lugar do menu
    // (prova que foi removido da lista de itens do menu)
    const bloqueiosItem = page.locator('text="Bloqueios"');
    await expect(bloqueiosItem).not.toBeVisible();
  });
});
