import { expect, Locator, Page, request as playwrightRequest, test } from '@playwright/test';
import { ADMIN_PERMISSIONS } from './fixtures/logosoft';

const apiUrl = process.env.LOGOSOFT_E2E_API_URL?.replace(/\/+$/, '');
const accessToken = process.env.LOGOSOFT_E2E_ACCESS_TOKEN;
const refreshToken = process.env.LOGOSOFT_E2E_REFRESH_TOKEN ?? 'refresh-token-controlado-nao-utilizado';
const empresaId = process.env.LOGOSOFT_E2E_EMPRESA_ID;
const filialId = process.env.LOGOSOFT_E2E_FILIAL_ID ?? null;
const pedidoVendaId = process.env.LOGOSOFT_E2E_PEDIDO_VENDA_ID;
const runBackendFiscalFlow = process.env.LOGOSOFT_E2E_RUN_BACKEND_FISCAL === 'true';
const ufAutorizadora = (process.env.LOGOSOFT_E2E_UF_AUTORIZADORA ?? 'SP').toUpperCase();
const serieNota = process.env.LOGOSOFT_E2E_SERIE_NOTA ?? '1';
const cfopPadrao = process.env.LOGOSOFT_E2E_CFOP_PADRAO ?? '5102';
const unidadeComercialPadrao = process.env.LOGOSOFT_E2E_UNIDADE_COMERCIAL_PADRAO ?? 'UN';
const schemaSetName = process.env.LOGOSOFT_E2E_SCHEMA_SET_NAME ?? 'NFe-4.00';
const numeroNota = process.env.LOGOSOFT_E2E_NUMERO_NOTA ?? String(Date.now()).slice(-9);
const primeiraDataVencimento = process.env.LOGOSOFT_E2E_PRIMEIRA_DATA_VENCIMENTO ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const shouldRun = Boolean(runBackendFiscalFlow && apiUrl && accessToken && empresaId && pedidoVendaId);

const clickAction = async (page: Page, name: string | RegExp) => {
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeEnabled();
    await button.click();
};

const submitDialog = async (page: Page, name: string | RegExp) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
};

const fiscalSummaryCard = (page: Page, label: string) =>
    page.locator('.p-card').filter({ has: page.getByText(label, { exact: true }) }).first();

const dialogFieldInput = (scope: Locator, label: string) =>
    scope.locator('.field').filter({ hasText: label }).locator('input:not([type="hidden"])').first();

const writeBackendSession = async (page: Page) => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const permissions = process.env.LOGOSOFT_E2E_PERMISSIONS?.split(',')
        .map((permission) => permission.trim())
        .filter(Boolean) ?? ADMIN_PERMISSIONS;

    await page.addInitScript((session) => {
        window.localStorage.setItem('logosoft.session', JSON.stringify(session));
    }, {
        accessToken,
        accessTokenExpiraEm: expires,
        refreshToken,
        refreshTokenExpiraEm: expires,
        expiresAt: expires,
        user: {
            id: process.env.LOGOSOFT_E2E_USER_ID ?? 'e2e-backend-user',
            nome: process.env.LOGOSOFT_E2E_USER_NAME ?? 'Usuário E2E backend controlado',
            email: process.env.LOGOSOFT_E2E_USER_EMAIL ?? 'e2e-backend@logosoft.local',
            empresaId,
            filialId,
            permissoes: permissions
        }
    });
};

const readResponseText = async (response: { text: () => Promise<string> }) => {
    try {
        return (await response.text()).slice(0, 1200);
    } catch {
        return '<sem corpo de resposta>';
    }
};

const expectOk = async (response: { ok: () => boolean; status: () => number; statusText: () => string; text: () => Promise<string> }, context: string) => {
    if (!response.ok()) {
        const body = await readResponseText(response);
        throw new Error(`${context} falhou com HTTP ${response.status()} ${response.statusText()}: ${body}`);
    }
};

const requireNotaFiscalId = (body: unknown) => {
    if (!body || typeof body !== 'object') throw new Error('Resposta de geração da nota não retornou objeto JSON.');
    const record = body as Record<string, unknown>;
    const notaFiscal = record.notaFiscal;
    if (notaFiscal && typeof notaFiscal === 'object' && typeof (notaFiscal as Record<string, unknown>).id === 'string') {
        return (notaFiscal as Record<string, string>).id;
    }
    if (typeof record.id === 'string') return record.id;
    throw new Error('Resposta de geração da nota não retornou notaFiscal.id nem id.');
};

test.describe('Fiscal E2E com backend real/controlado', () => {
    test.skip(!shouldRun, 'Defina LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true, LOGOSOFT_E2E_API_URL, LOGOSOFT_E2E_ACCESS_TOKEN, LOGOSOFT_E2E_EMPRESA_ID e LOGOSOFT_E2E_PEDIDO_VENDA_ID para executar este fluxo mutável.');

    test('gera nota de pedido e executa fluxo operacional até financeiro', async ({ page }) => {
        await writeBackendSession(page);

        const api = await playwrightRequest.newContext({
            baseURL: apiUrl,
            extraHTTPHeaders: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const gerarNotaResponse = await api.post('/api/fiscal/notas-fiscais/gerar-de-pedido-venda', {
            data: {
                pedidoVendaId,
                tipoDocumento: 1,
                serie: serieNota,
                numero: numeroNota,
                naturezaOperacaoId: null,
                cfopPadrao,
                unidadeComercialPadrao,
                validarDadosFiscaisProduto: true,
                observacao: `E2E fiscal backend controlado ${numeroNota}`
            }
        });
        await expectOk(gerarNotaResponse, 'Geração de nota fiscal por pedido de venda');
        const notaFiscalId = requireNotaFiscalId(await gerarNotaResponse.json());

        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await expect(page.getByRole('heading', { name: /Nota fiscal/i })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Pedido de venda com vínculo operacional')).toBeVisible();

        await clickAction(page, /^Validar$/);
        await expect(page.getByRole('button', { name: /^Gerar XML$/ }).first()).toBeEnabled({ timeout: 30_000 });

        await clickAction(page, /^Gerar XML$/);
        const gerarXmlDialog = page.getByRole('dialog');
        await dialogFieldInput(gerarXmlDialog, 'Schema set').fill(schemaSetName);
        await submitDialog(page, /^Gerar XML$/);
        await expect(page.getByRole('button', { name: /^Assinar$/ }).first()).toBeEnabled({ timeout: 30_000 });

        await clickAction(page, /^Assinar$/);
        await submitDialog(page, /^Assinar XML$/);
        await expect(page.getByRole('button', { name: /^Transmitir$/ }).first()).toBeEnabled({ timeout: 30_000 });

        await clickAction(page, /^Transmitir$/);
        const transmitirDialog = page.getByRole('dialog');
        await expect(transmitirDialog).toBeVisible();
        await dialogFieldInput(transmitirDialog, 'UF autorizadora').fill(ufAutorizadora);
        await dialogFieldInput(transmitirDialog, 'Schema set').fill(schemaSetName);
        await transmitirDialog.getByRole('button', { name: /^Transmitir$/ }).click();
        await expect(transmitirDialog).toBeHidden({ timeout: 45_000 });

        const governancaFiscalCard = page.locator('.p-card').filter({ hasText: 'Governança fiscal' });
        await expect(governancaFiscalCard.getByText('Autorizada', { exact: true })).toBeVisible({ timeout: 45_000 });

        await clickAction(page, /^Gerar DANFE$/);
        await submitDialog(page, /^Gerar DANFE$/);
        await expect(page.getByText(/danfe|documento auxiliar/i).first()).toBeVisible({ timeout: 30_000 });

        await clickAction(page, /^Baixar estoque$/);
        await submitDialog(page, /^Baixar estoque$/);
        await expect(fiscalSummaryCard(page, 'Estoque').getByText('Baixado', { exact: true })).toBeVisible({ timeout: 30_000 });

        await clickAction(page, /^Gerar financeiro$/);
        const financeiroDialog = page.getByRole('dialog');
        await expect(financeiroDialog).toBeVisible();
        const vencimentoInput = financeiroDialog.locator('input').first();
        await vencimentoInput.fill(primeiraDataVencimento.slice(0, 10));
        await financeiroDialog.getByRole('button', { name: /^Gerar financeiro$/ }).click();
        await expect(financeiroDialog).toBeHidden({ timeout: 45_000 });
        await expect(fiscalSummaryCard(page, 'Financeiro').getByText('Gerado', { exact: true })).toBeVisible({ timeout: 45_000 });

        const observabilidadeParams = new URLSearchParams({
            empresaId: empresaId ?? '',
            take: '10'
        });
        if (filialId) observabilidadeParams.set('filialId', filialId);
        const observabilidadeResponse = await api.get(`/api/fiscal/observabilidade/integracoes?${observabilidadeParams.toString()}`);
        await expectOk(observabilidadeResponse, 'Consulta de observabilidade fiscal após E2E');

        await api.dispose();
    });
});
