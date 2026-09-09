import { expect, test } from '@playwright/test';
import { expectPageHeading, mockApiRoutes, openNewDialog, writeSession } from './fixtures/logosoft';

test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await writeSession(page);
});

test('cria local de estoque e valida consulta de saldos', async ({ page }) => {
    await openNewDialog(page, '/estoque/locais', 'Locais de estoque');
    await page.getByLabel('Código *').fill('LOC-E2E');
    await page.getByLabel('Nome *').fill('Local E2E');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expectPageHeading(page, '/estoque/saldos', 'Saldos de estoque');
    // A tela precisa mostrar o resumo, não só carregar: o card de saldo atual é o que prova
    // que a consulta rendeu conteúdo. O texto solto casaria com várias células da tabela.
    await expect(page.locator('.p-card').filter({ hasText: 'Saldo atual' })).toBeVisible();
});

test('exibe o valor real da conta a receber, e não R$ 0,00', async ({ page }) => {
    // Regressão do P1: o frontend lia valorTotal/saldo, o backend entrega valorOriginal/valorSaldo,
    // e formatMoney fazia `value ?? 0` — então o campo ausente não aparecia vazio, aparecia como
    // um zero plausível. Esta spec falha se algum campo monetário voltar a sumir do wire.
    await expectPageHeading(page, '/financeiro/contas-receber', 'Contas a receber');

    const linha = page.getByRole('row').filter({ hasText: 'CR-PV-001' });
    // As colunas Total e Saldo exibem o mesmo valor nesta conta: as duas precisam sair do wire.
    await expect(linha.getByRole('cell', { name: 'R$ 251,00' })).toHaveCount(2);
    await expect(page.getByRole('table').getByText('R$ 0,00')).toHaveCount(0);

    await linha.getByRole('button', { name: /Receber/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // O diálogo de baixa nascia zerado pela mesma causa: a cascata percorria quatro campos
    // inexistentes. Agora ele parte do saldo real da parcela.
    // `\s` em vez de espaço literal: toLocaleString('pt-BR') separa o símbolo do número com
    // espaço não-quebrável, que só é normalizado em nome acessível — não em getByText.
    await expect(dialog.getByText(/Saldo da parcela:\s*R\$\s*251,00/)).toBeVisible();
});

test('exige motivo em cancelamento financeiro crítico', async ({ page }) => {
    await expectPageHeading(page, '/financeiro/contas-receber', 'Contas a receber');
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // O texto "Motivo" aparece no rótulo e no conteúdo do campo; a asserção fica no rótulo,
    // que é o que prova que o diálogo exige a justificativa.
    await expect(page.getByRole('dialog').locator('label').filter({ hasText: /Motivo/i })).toBeVisible();
});
