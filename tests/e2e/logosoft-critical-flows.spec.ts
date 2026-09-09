import { expect, test } from '@playwright/test';
import { mockApiRoutes, expectPageHeading, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('navega pelos módulos críticos do ERP', async ({ page }) => {
    // Onze navegações num teste só, e o `webServer` compila rota sob demanda: o limite padrão de
    // 30s cobre o teste inteiro, não cada navegação, então num servidor frio ele estoura no meio
    // do caminho — em rota diferente a cada execução. O teste não afere tempo; declará-lo lento é
    // o que descreve o que ele é, em vez de deixar o gate mais valioso da suíte intermitente.
    test.slow();

    await expectPageHeading(page, '/dashboard', /Dashboard logosoft/i);
    await expectPageHeading(page, '/administracao/empresas', 'Empresas');
    await expectPageHeading(page, '/pessoas', 'Pessoas');
    await expectPageHeading(page, '/clientes', 'Clientes');
    await expectPageHeading(page, '/fornecedores', 'Fornecedores');
    await expectPageHeading(page, '/produtos', 'Produtos');
    await expectPageHeading(page, '/estoque/saldos', 'Saldos de estoque');
    await expectPageHeading(page, '/vendas/pedidos', 'Pedidos de venda');
    await expectPageHeading(page, '/financeiro/contas-receber', 'Contas a receber');
    await expectPageHeading(page, '/compras/pedidos', 'Pedidos de compra');
    await expectPageHeading(page, '/auditoria/eventos', 'Eventos de auditoria');
});

test('mantém rotas de criação e detalhe de vendas e compras disponíveis', async ({ page }) => {
    await expectPageHeading(page, '/vendas/pedidos/novo', /Pedido de venda|Novo pedido/i);
    await expect(page).toHaveURL(/\/vendas\/pedidos\/novo/);

    await expectPageHeading(page, '/compras/pedidos/novo', /Pedido de compra|Novo pedido/i);
    await expect(page).toHaveURL(/\/compras\/pedidos\/novo/);
});
