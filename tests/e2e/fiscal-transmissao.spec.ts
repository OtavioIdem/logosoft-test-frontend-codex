import { expect, Page, test } from '@playwright/test';
import { ADMIN_PERMISSIONS, mockApiRoutes, writeSession } from './fixtures/logosoft';

// AC-11 (v1.11.0a8b57): T1 (fluxo feliz com alerta), R1/R2 (sessões CONSULTAR+REPROCESSAR e CONSULTAR+EMITIR, D43)
// e R3 (só REPROCESSAR, rota acessível mas tela de notas exige FISCAL_CONSULTAR).
const notaFiscalId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

const ALERTA_TEXTO = 'Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado.';
const ALERTAS_INTRO = 'A operação foi concluída e o backend registrou alerta(s) que exigem ação:';

const clickAction = async (page: Page, name: string | RegExp) => {
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeEnabled();
    await button.click();
};

const submitDialog = async (page: Page, name: string | RegExp) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name }).click();
    await expect(dialog).toBeHidden();
};

// Contador de POST fiscal, ligado ANTES do goto (R3): page.on('request') recebe todo tráfego de rede mesmo
// quando a resposta é servida por page.route/route.fulfill.
const countFiscalPosts = (page: Page) => {
    let count = 0;
    page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/fiscal/')) count += 1;
    });
    return () => count;
};

// Um log reprocessável simulado (R1/R2), registrado depois de mockApiRoutes -- substitui o GET /integracoes.
const mockLogReprocessavel = async (page: Page) => {
    await page.route(`**/api/fiscal/notas-fiscais/${notaFiscalId}/integracoes`, async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                    empresaId,
                    filialId,
                    notaFiscalId,
                    operacao: 'NFeAutorizacao',
                    statusIntegracao: 3,
                    correlationId: 'e2e-original-transmissao-001',
                    payloadResumo: 'xml=[XML_MASKED]',
                    mensagem: 'Falha de comunicação com a SEFAZ',
                    registradoEm: new Date().toISOString(),
                    podeReprocessar: true,
                    contemDadoSensivelOcultado: true
                }
            ])
        });
    });
};

test.describe('fiscal-transmissao (v1.11.0a8b57 / AC-11)', () => {
    test('T1: transmite até Autorizada com correlationId com prefixo e alerta visível antes e depois de Atualizar', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page); // ADMIN_PERMISSIONS

        let capturedCorrelationId: string | undefined;
        // page.route registrada DEPOIS de mockApiRoutes -- intercepta antes do handler base (sem fallback),
        // para devolver `alertas` no retorno de transmitir-sefaz (o handler base não inclui esse campo).
        await page.route(`**/api/fiscal/notas-fiscais/${notaFiscalId}/transmitir-sefaz`, async (route) => {
            if (route.request().method() !== 'POST') return route.fallback();
            const body = route.request().postDataJSON() as Record<string, unknown>;
            capturedCorrelationId = body.correlationId as string;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    notaFiscalId,
                    statusFiscal: 5,
                    comunicacaoOk: true,
                    autorizada: true,
                    codigoStatus: '100',
                    motivo: 'Autorizado',
                    protocolo: '135260000000001',
                    chaveAcesso: '35260500000000000100550010000001001000001000',
                    deveReprocessar: false,
                    alertas: [ALERTA_TEXTO]
                })
            });
        });

        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await expect(page.getByRole('heading', { name: /Nota fiscal 1\/900001/i })).toBeVisible();

        await clickAction(page, /^Validar$/);
        await expect(page.getByRole('button', { name: /^Gerar XML$/ }).first()).toBeEnabled();

        await clickAction(page, /^Gerar XML$/);
        await submitDialog(page, /^Gerar XML$/);
        await expect(page.getByRole('button', { name: /^Assinar$/ }).first()).toBeEnabled();

        await clickAction(page, /^Assinar$/);
        await submitDialog(page, /^Assinar XML$/);
        await expect(page.getByRole('button', { name: /^Transmitir$/ }).first()).toBeEnabled();

        await clickAction(page, /^Transmitir$/);
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        const correlationIdField = dialog.locator('.field', { hasText: 'Correlation ID' }).getByRole('textbox');
        const correlationIdExibido = await correlationIdField.inputValue();
        expect(correlationIdExibido).toMatch(/^front-transmitir-\d{14}-[a-z0-9]+$/);

        const [request] = await Promise.all([
            page.waitForRequest((req) => req.url().includes('/transmitir-sefaz') && req.method() === 'POST'),
            dialog.getByRole('button', { name: 'Transmitir' }).click()
        ]);
        await expect(dialog).toBeHidden();

        const postBody = request.postDataJSON() as Record<string, unknown>;
        expect(postBody.correlationId).toBe(correlationIdExibido);
        expect(capturedCorrelationId).toBe(correlationIdExibido);

        // Painel "Último retorno operacional" mostra o alerta antes de Atualizar.
        await expect(page.getByText(ALERTAS_INTRO)).toBeVisible();
        await expect(page.getByText(ALERTA_TEXTO)).toBeVisible();

        // E continua visível depois de "Atualizar" (AC-6): o estado do retorno não é limpo pelo refetch das queries.
        const atualizarButton = page.getByRole('button', { name: 'Atualizar' });
        await atualizarButton.click();
        await expect(atualizarButton).toBeEnabled();
        await expect(page.getByText(ALERTAS_INTRO)).toBeVisible();
        await expect(page.getByText(ALERTA_TEXTO)).toBeVisible();
    });

    test('R1: CONSULTAR+REPROCESSAR reprocessa com logIntegracaoFiscalId, novo correlationId e motivo', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_REPROCESSAR'] });
        await mockLogReprocessavel(page);

        let capturedBody: Record<string, unknown> | undefined;
        await page.route(`**/api/fiscal/notas-fiscais/${notaFiscalId}/reprocessar-sefaz`, async (route) => {
            if (route.request().method() !== 'POST') return route.fallback();
            capturedBody = route.request().postDataJSON() as Record<string, unknown>;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    notaFiscalId,
                    statusFiscal: 5,
                    comunicacaoOk: true,
                    autorizada: true,
                    codigoStatus: '100',
                    motivo: 'Autorizado após reprocessamento',
                    protocolo: '135260000000001',
                    chaveAcesso: '35260500000000000100550010000001001000001000',
                    deveReprocessar: false,
                    alertas: [ALERTA_TEXTO]
                })
            });
        });

        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await expect(page.getByRole('heading', { name: /Nota fiscal 1\/900001/i })).toBeVisible();

        // Transmitir permanece desabilitado: sessão não tem FISCAL_EMITIR.
        const transmitirButton = page.getByRole('button', { name: /^Transmitir$/ }).first();
        await expect(transmitirButton).toBeDisabled();
        await expect(transmitirButton).toHaveAttribute('title', 'Permissão necessária: FISCAL_EMITIR.');

        await page.getByRole('tab', { name: /^Integrações/ }).click();
        const reprocessarButton = page.getByRole('button', { name: 'Reprocessar' }).first();
        await expect(reprocessarButton).toBeEnabled();
        await reprocessarButton.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Reprocessar transmissão SEFAZ')).toBeVisible();

        const correlationIdOriginalField = dialog.locator('.field', { hasText: 'Correlation ID original' }).getByRole('textbox');
        await expect(correlationIdOriginalField).toHaveValue('e2e-original-transmissao-001');

        const novoCorrelationIdField = dialog.locator('.field').filter({ hasText: 'Novo correlation ID' }).getByRole('textbox');
        const novoCorrelationIdExibido = await novoCorrelationIdField.inputValue();
        expect(novoCorrelationIdExibido).toMatch(/^front-reprocessamento-\d{14}-[a-z0-9]+$/);

        const motivoField = dialog.locator('.field', { hasText: 'Motivo' }).getByRole('textbox');
        await motivoField.fill('Falha de comunicação sanada; reprocessando manualmente.');

        const [request] = await Promise.all([
            page.waitForRequest((req) => req.url().includes('/reprocessar-sefaz') && req.method() === 'POST'),
            dialog.getByRole('button', { name: 'Reprocessar' }).click()
        ]);
        await expect(dialog).toBeHidden();

        const postBody = request.postDataJSON() as Record<string, unknown>;
        expect(postBody.logIntegracaoFiscalId).toBe('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
        expect(postBody.correlationId).toBe(novoCorrelationIdExibido);
        expect(postBody.correlationId).not.toBe(postBody.correlationIdOriginal);
        expect(postBody.correlationIdOriginal).toBe('e2e-original-transmissao-001');
        expect(postBody.motivo).toBe('Falha de comunicação sanada; reprocessando manualmente.');
        expect(capturedBody?.logIntegracaoFiscalId).toBe('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');

        await expect(page.getByText(ALERTAS_INTRO)).toBeVisible();
        await expect(page.getByText(ALERTA_TEXTO)).toBeVisible();
    });

    test('R2: CONSULTAR+EMITIR mantém Reprocessar desabilitado com title de FISCAL_REPROCESSAR e zero POST fiscal', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_CONSULTAR', 'FISCAL_EMITIR'] });
        await mockLogReprocessavel(page);
        const getPostCount = countFiscalPosts(page);

        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await expect(page.getByRole('heading', { name: /Nota fiscal 1\/900001/i })).toBeVisible();

        await page.getByRole('tab', { name: /^Integrações/ }).click();
        const reprocessarButton = page.getByRole('button', { name: 'Reprocessar' }).first();
        await expect(reprocessarButton).toBeDisabled();
        await expect(reprocessarButton).toHaveAttribute('title', 'Permissão necessária: FISCAL_REPROCESSAR.');

        expect(getPostCount()).toBe(0);
    });

    test('R3: só FISCAL_REPROCESSAR alcança /fiscal/notas, mas a tela exige FISCAL_CONSULTAR; zero POST fiscal', async ({ page }) => {
        const getPostCount = countFiscalPosts(page); // contador ligado antes do goto

        await mockApiRoutes(page);
        await writeSession(page, { permissions: ['FISCAL_REPROCESSAR'] });

        await page.goto('/fiscal/notas');

        await expect(page.getByText('Notas fiscais exigem FISCAL_CONSULTAR.')).toBeVisible();
        await expect(page.getByText(/A rota Notas fiscais exige/)).toHaveCount(0);

        expect(getPostCount()).toBe(0);
    });
});
