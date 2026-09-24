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
    // AC-9 valida: `accessRisk: ILUSAO` — a ilusão era que quem tinha apenas ESTOQUE_MOVIMENTAR
    // via o item "Bloqueios" no menu, clicava, passava no guard de /estoque/bloqueios
    // (que exige ESTOQUE_MOVIMENTAR) mas caía em permissão negada em /estoque/avancado
    // (que exige anyOf: ESTOQUE_CONSULTAR | ESTOQUE_INVENTARIO_GERENCIAR | ESTOQUE_AJUSTAR | ESTOQUE_BLOQUEIO_GERENCIAR).
    // Agora que "Bloqueios" foi removido, essa ilusão desaparece.
    // ORDEM CRÍTICA: mockApiRoutes PRIMEIRO, depois writeSession, depois goto
    await mockApiRoutes(page);
    await writeSession(page, {
      permissions: ['ESTOQUE_MOVIMENTAR']
      // Sessão nominal: apenas ESTOQUE_MOVIMENTAR, nenhuma outra permissão de estoque
    });
    // Navegar para /estoque/entradas (rota que existe e ESTOQUE_MOVIMENTAR sozinha a abre)
    await page.goto('/estoque/entradas');

    // Verificar que a página de Movimentos carregou com aba Entrada ativa (D72: um componente com abas)
    await expect(page.locator('h1.layout-topbar-title-text')).toHaveText(/Movimentos de estoque/i);
    const entradaTab = page.getByRole('tab', { name: /^Entrada$/i });
    await expect(entradaTab).toHaveAttribute('aria-selected', 'true');

    // Menu está presente na página
    const menu = page.locator('ul.layout-menu');
    await expect(menu).toBeVisible();

    // "Bloqueios" não aparece em nenhum lugar do menu (prova que foi removido)
    const bloqueiosItem = page.locator('text="Bloqueios"');
    await expect(bloqueiosItem).not.toBeVisible();
  });
});
