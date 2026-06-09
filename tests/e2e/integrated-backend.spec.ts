import { expect, Locator, Page, request as playwrightRequest, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { ADMIN_PERMISSIONS } from './fixtures/logosoft';

const apiUrl = process.env.LOGOSOFT_INTEGRATED_E2E_API_URL?.replace(/\/+$/, '');
const accessToken = process.env.LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN;
const refreshToken = process.env.LOGOSOFT_INTEGRATED_E2E_REFRESH_TOKEN ?? 'refresh-token-integrado-controlado-nao-utilizado';
const empresaId = process.env.LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID;
const filialId = process.env.LOGOSOFT_INTEGRATED_E2E_FILIAL_ID ?? null;
const pedidoVendaId = process.env.LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID;
const seedRunId = process.env.LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID;
const disposableEnvironmentAck = process.env.LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK === 'true';
const runbookAck = process.env.LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK === 'true';
const runIntegratedFlow = process.env.LOGOSOFT_INTEGRATED_E2E_RUN === 'true';
const ufAutorizadora = (process.env.LOGOSOFT_INTEGRATED_E2E_UF_AUTORIZADORA ?? 'SP').toUpperCase();
const serieNota = process.env.LOGOSOFT_INTEGRATED_E2E_SERIE_NOTA ?? '1';
const cfopPadrao = process.env.LOGOSOFT_INTEGRATED_E2E_CFOP_PADRAO ?? '5102';
const unidadeComercialPadrao = process.env.LOGOSOFT_INTEGRATED_E2E_UNIDADE_COMERCIAL_PADRAO ?? 'UN';
const schemaSetName = process.env.LOGOSOFT_INTEGRATED_E2E_SCHEMA_SET_NAME ?? 'NFe-4.00';
const numeroNota = process.env.LOGOSOFT_INTEGRATED_E2E_NUMERO_NOTA ?? String(Date.now()).slice(-9);
const primeiraDataVencimento = process.env.LOGOSOFT_INTEGRATED_E2E_PRIMEIRA_DATA_VENCIMENTO ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const shouldRun = Boolean(runIntegratedFlow && apiUrl && accessToken && empresaId && pedidoVendaId && seedRunId && disposableEnvironmentAck && runbookAck);

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const buildQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue;
        query.set(key, String(value));
    }

    return query.toString();
};

const clickAction = async (page: Page, name: string | RegExp) => {
    const button = page.getByRole('button', { name }).first();
    await expect(button).toBeEnabled();
    await button.click();
};

const submitDialog = async (page: Page, name: string | RegExp) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name }).click();
    await expect(dialog).toBeHidden({ timeout: 45_000 });
};

const fiscalSummaryCard = (page: Page, label: string) =>
    page.locator('.p-card').filter({ has: page.getByText(label, { exact: true }) }).first();

const dialogFieldInput = (scope: Locator, label: string) =>
    scope.locator('.field').filter({ hasText: label }).locator('input:not([type="hidden"])').first();

const writeBackendSession = async (page: Page) => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const permissions = process.env.LOGOSOFT_INTEGRATED_E2E_PERMISSIONS?.split(',')
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
            id: process.env.LOGOSOFT_INTEGRATED_E2E_USER_ID ?? 'e2e-integrado-user',
            nome: process.env.LOGOSOFT_INTEGRATED_E2E_USER_NAME ?? 'Usuário E2E integrado controlado',
            email: process.env.LOGOSOFT_INTEGRATED_E2E_USER_EMAIL ?? 'e2e-integrado@logosoft.local',
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

const requireRecord = (value: unknown, label: string): JsonRecord => {
    expect(isRecord(value), `${label} deve ser objeto`).toBe(true);
    return value as JsonRecord;
};

const requireString = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser string`).toBe('string');
};

const requireNumber = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser number`).toBe('number');
};

const requireArrayResponse = async (responsePromise: Promise<APIResponse>, label: string) => {
    const response = await responsePromise;
    await expectOk(response, label);
    const body = await response.json();
    expect(Array.isArray(body), `${label} deve retornar array`).toBe(true);
    return body as unknown[];
};

const requireNotaFiscalId = (body: unknown) => {
    const record = requireRecord(body, 'Resposta de geração da nota');
    const notaFiscal = record.notaFiscal;
    if (isRecord(notaFiscal) && typeof notaFiscal.id === 'string') return notaFiscal.id;
    if (typeof record.id === 'string') return record.id;
    throw new Error('Resposta de geração da nota não retornou notaFiscal.id nem id.');
};

const assertPedidoVendaDetail = (value: unknown) => {
    const pedido = requireRecord(value, 'PedidoVendaResponse detalhe');
    requireString(pedido, 'id', 'PedidoVendaResponse detalhe');
    requireString(pedido, 'empresaId', 'PedidoVendaResponse detalhe');
    requireString(pedido, 'clienteId', 'PedidoVendaResponse detalhe');
    requireNumber(pedido, 'valorTotal', 'PedidoVendaResponse detalhe');
};

const assertOperationalSideEffects = async (
    api: APIRequestContext,
    notaFiscalId: string
) => {
    const baseQuery = buildQuery({ empresaId, filialId });
    const origemQuery = buildQuery({ empresaId, filialId, origemId: notaFiscalId });

    const pedidoResponse = await api.get(`/api/vendas/pedidos/${pedidoVendaId}`);
    await expectOk(pedidoResponse, 'Consulta do pedido de venda após fluxo integrado');
    assertPedidoVendaDetail(await pedidoResponse.json());

    const movimentos = await requireArrayResponse(api.get(`/api/estoque/movimentos?${origemQuery}`), 'Movimentos de estoque vinculados à nota fiscal');
    expect(movimentos.length, 'Fluxo integrado deve gerar ou expor movimento de estoque da origem controlada').toBeGreaterThan(0);

    const contasReceber = await requireArrayResponse(api.get(`/api/financeiro/contas-receber?${origemQuery}`), 'Contas a receber vinculadas à nota fiscal');
    expect(contasReceber.length, 'Fluxo integrado deve gerar ou expor conta a receber da origem controlada').toBeGreaterThan(0);

    const auditoriaQuery = buildQuery({ empresaId, filialId, entidadeId: notaFiscalId, take: 20 });
    const auditoria = await requireArrayResponse(api.get(`/api/auditoria/eventos?${auditoriaQuery || baseQuery}`), 'Auditoria vinculada ao fluxo integrado');
    expect(auditoria.length, 'Fluxo integrado deve gerar ou expor auditoria da origem controlada').toBeGreaterThan(0);
};

test.describe('E2E integrado backend controlado', () => {
    test.skip(!shouldRun, 'Defina LOGOSOFT_INTEGRATED_E2E_RUN=true, LOGOSOFT_INTEGRATED_E2E_API_URL, LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN, LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID, LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID, LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID, LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true e LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true para executar este fluxo mutável em ambiente descartável/controlado.');

    test('valida venda, fiscal, estoque, financeiro e auditoria em ambiente descartável', async ({ page }) => {
        await writeBackendSession(page);

        const api = await playwrightRequest.newContext({
            baseURL: apiUrl,
            extraHTTPHeaders: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const pedidoInicialResponse = await api.get(`/api/vendas/pedidos/${pedidoVendaId}`);
        await expectOk(pedidoInicialResponse, 'Consulta inicial do pedido de venda controlado');
        assertPedidoVendaDetail(await pedidoInicialResponse.json());

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
                observacao: `E2E integrado controlado ${numeroNota} seed ${seedRunId}`
            }
        });
        await expectOk(gerarNotaResponse, 'Geração de nota fiscal por pedido de venda no E2E integrado');
        const notaFiscalId = requireNotaFiscalId(await gerarNotaResponse.json());

        await page.goto(`/fiscal/notas/${notaFiscalId}`);
        await expect(page.getByRole('heading', { name: /Nota fiscal/i })).toBeVisible({ timeout: 45_000 });
        await expect(page.getByText('Pedido de venda com vínculo operacional')).toBeVisible();

        await clickAction(page, /^Validar$/);
        await expect(page.getByRole('button', { name: /^Gerar XML$/ }).first()).toBeEnabled({ timeout: 45_000 });

        await clickAction(page, /^Gerar XML$/);
        const gerarXmlDialog = page.getByRole('dialog');
        await dialogFieldInput(gerarXmlDialog, 'Schema set').fill(schemaSetName);
        await submitDialog(page, /^Gerar XML$/);
        await expect(page.getByRole('button', { name: /^Assinar$/ }).first()).toBeEnabled({ timeout: 45_000 });

        await clickAction(page, /^Assinar$/);
        await submitDialog(page, /^Assinar XML$/);
        await expect(page.getByRole('button', { name: /^Transmitir$/ }).first()).toBeEnabled({ timeout: 45_000 });

        await clickAction(page, /^Transmitir$/);
        const transmitirDialog = page.getByRole('dialog');
        await expect(transmitirDialog).toBeVisible();
        await dialogFieldInput(transmitirDialog, 'UF autorizadora').fill(ufAutorizadora);
        await dialogFieldInput(transmitirDialog, 'Schema set').fill(schemaSetName);
        await transmitirDialog.getByRole('button', { name: /^Transmitir$/ }).click();
        await expect(transmitirDialog).toBeHidden({ timeout: 60_000 });

        const governancaFiscalCard = page.locator('.p-card').filter({ hasText: 'Governança fiscal' });
        await expect(governancaFiscalCard.getByText('Autorizada', { exact: true })).toBeVisible({ timeout: 60_000 });

        await clickAction(page, /^Gerar DANFE$/);
        await submitDialog(page, /^Gerar DANFE$/);
        await expect(page.getByText(/danfe|documento auxiliar/i).first()).toBeVisible({ timeout: 45_000 });

        await clickAction(page, /^Baixar estoque$/);
        await submitDialog(page, /^Baixar estoque$/);
        await expect(fiscalSummaryCard(page, 'Estoque').getByText('Baixado', { exact: true })).toBeVisible({ timeout: 45_000 });

        await clickAction(page, /^Gerar financeiro$/);
        const financeiroDialog = page.getByRole('dialog');
        await expect(financeiroDialog).toBeVisible();
        const vencimentoInput = financeiroDialog.locator('input').first();
        await vencimentoInput.fill(primeiraDataVencimento.slice(0, 10));
        await financeiroDialog.getByRole('button', { name: /^Gerar financeiro$/ }).click();
        await expect(financeiroDialog).toBeHidden({ timeout: 60_000 });
        await expect(fiscalSummaryCard(page, 'Financeiro').getByText('Gerado', { exact: true })).toBeVisible({ timeout: 60_000 });

        await assertOperationalSideEffects(api, notaFiscalId);
        await api.dispose();
    });
});
