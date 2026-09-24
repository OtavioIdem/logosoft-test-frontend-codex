import { expect, Page, Route, test } from '@playwright/test';
import { mockApiRoutes, writeSession } from './fixtures/logosoft';

/**
 * v1.11.0a8b68 — Estoque: abas, regras de rota e permissões.
 *
 * Cobre AC-5 (abas funcionam e bloqueios por permissão dentro da aba),
 * AC-8 (regras de rota para /estoque/saldos e /estoque/movimentos), e
 * AC-9 (Reservas com permissões).
 *
 * Tudo mockado: `mockApiRoutes` cobre o shell (auth, /me, empresas);
 * as rotas desta spec são registradas DEPOIS e têm precedência.
 *
 * Execução (Bloco C, receita do CLAUDE.md — um servidor só, porta própria):
 *   npx next dev -p 3411
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3411 npx playwright test --config=playwright.isolated.config.ts tests/e2e/b68-estoque.spec.ts
 *
 * **Nota:** Esta spec não é executada no Bloco C (será no Bloco E após QA). Use `--list` para validar estrutura.
 */

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const produtoId = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const localEstoqueId = 'llllllll-llll-llll-llll-llllllllllll';

const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const movimentoResponse = {
    id: 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm',
    empresaId,
    filialId,
    produtoId,
    localEstoqueId,
    tipo: 1, // Entrada
    quantidade: 10,
    origemModulo: 'MANUAL',
    origemId: null,
    documento: 'DOC-001',
    motivo: 'Recebimento manual',
    dataMovimento: '2024-09-24T10:00:00Z',
    criadoEm: '2024-09-24T10:00:00Z',
    criadoPor: 'usuario@logosoft.local',
    atualizadoEm: '2024-09-24T10:00:00Z',
    atualizadoPor: 'usuario@logosoft.local'
};

const saldoResponse = {
    id: 'ssssssss-ssss-ssss-ssss-ssssssssssss',
    empresaId,
    filialId,
    produtoId,
    localEstoqueId,
    quantidadeAtual: 100,
    quantidadeReservada: 10,
    quantidadeDisponivel: 90
};

const produtoResponse = {
    id: produtoId,
    empresaId,
    filialId,
    codigo: 'PROD-B68',
    descricao: 'Produto de teste',
    status: 1
};

const localResponse = {
    id: localEstoqueId,
    empresaId,
    filialId,
    codigo: 'LOCAL-B68',
    nome: 'Local de teste',
    descricao: 'Local de teste para B68',
    status: 1
};

const reservaResponse = {
    id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
    empresaId,
    filialId,
    produtoId,
    localEstoqueId,
    quantidade: 5,
    origemModulo: 'VENDAS',
    origemId: null,
    observacao: 'Reserva de teste',
    statusReserva: 1, // Ativa
    criadoEm: '2024-09-24T10:00:00Z',
    criadoPor: 'usuario@logosoft.local',
    atualizadoEm: '2024-09-24T10:00:00Z',
    atualizadoPor: 'usuario@logosoft.local'
};

const installEstoqueRoutes = async (page: Page) => {
    await page.route('**/api/estoque/movimentos**', async (route) => {
        if (route.request().method() === 'GET') {
            return json(route, [movimentoResponse]);
        }
        return route.fallback();
    });

    await page.route('**/api/estoque/saldos**', async (route) => {
        if (route.request().method() === 'GET') {
            return json(route, [saldoResponse]);
        }
        return route.fallback();
    });

    await page.route('**/api/produtos**', async (route) => {
        if (route.request().method() === 'GET') {
            return json(route, [produtoResponse]);
        }
        return route.fallback();
    });

    await page.route('**/api/estoque/locais**', async (route) => {
        if (route.request().method() === 'GET') {
            return json(route, [localResponse]);
        }
        return route.fallback();
    });

    await page.route('**/api/estoque/reservas**', async (route) => {
        if (route.request().method() === 'GET') {
            return json(route, [reservaResponse]);
        }
        return route.fallback();
    });
};

test.describe('b68 — Estoque: abas, rotas e permissões', () => {
    test('AC-5: /estoque/entradas abre com aba Entrada ativa', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'],
            name: 'Gestor de estoque',
            email: 'estoque@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/entradas');

        const entradaTab = page.getByRole('tab', { name: /^Entrada$/i });
        await expect(entradaTab).toHaveAttribute('aria-selected', 'true');
    });

    test('AC-5: /estoque/saidas abre com aba Saída ativa', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'],
            name: 'Gestor de estoque',
            email: 'estoque@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/saidas');

        const saidaTab = page.getByRole('tab', { name: /^Saída$/i });
        await expect(saidaTab).toHaveAttribute('aria-selected', 'true');
    });

    test('AC-5: /estoque/movimentos abre com aba Histórico ativa', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR'],
            name: 'Consultor de estoque',
            email: 'consulta@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/movimentos');

        const historicoTab = page.getByRole('tab', { name: /histórico/i });
        await expect(historicoTab).toHaveAttribute('aria-selected', 'true');
    });

    test('AC-5: com só ESTOQUE_MOVIMENTAR, botão Entrada fica visível', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_MOVIMENTAR'],
            name: 'Operador de entrada',
            email: 'entrada@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/entradas');

        const botaoEntrada = page.getByRole('button', { name: /registrar entrada/i });
        // Botão deve estar presente (PermissionGuard desabilita, não esconde)
        await expect(botaoEntrada).not.toBeDisabled();
    });

    test('AC-8: /estoque/saldos com ESTOQUE_CONSULTAR abre sem bloqueio', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR'],
            name: 'Consultor de estoque',
            email: 'consulta@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/saldos');

        // Página deve carregar sem erro de acesso negado
        const accessDenied = page.getByText(/Acesso negado|exigem.*permissão/i);
        await expect(accessDenied).not.toBeVisible();
    });

    test('AC-8: /estoque/saldos com ESTOQUE_MOVIMENTAR (sem ESTOQUE_CONSULTAR) bloqueia com RoutePermissionGate', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_MOVIMENTAR'],
            name: 'Operador de movimento',
            email: 'operador@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/saldos');

        // RoutePermissionGate mostra mensagem de acesso negado com o nome da permissão necessária
        await expect(page.getByText(/Acesso negado/i)).toBeVisible();
        await expect(page.getByText(/ESTOQUE_CONSULTAR/i)).toBeVisible();
    });

    test('AC-8 controle: mesma sessão (ESTOQUE_MOVIMENTAR) entra normalmente em /estoque/entradas', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_MOVIMENTAR'],
            name: 'Operador de movimento',
            email: 'operador@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/entradas');

        // A mesma sessão deve conseguir acessar /estoque/entradas
        const entradaTab = page.getByRole('tab', { name: /^Entrada$/i });
        await expect(entradaTab).toBeVisible();
        // Sem mensagem de acesso negado
        const accessDenied = page.getByText(/Acesso negado/i);
        await expect(accessDenied).not.toBeVisible();
    });

    test('AC-8: /estoque/movimentos com ESTOQUE_CONSULTAR abre sem bloqueio', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR'],
            name: 'Consultor de estoque',
            email: 'consulta@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/movimentos');

        // Página deve carregar sem erro de acesso negado
        const historicoTab = page.getByRole('tab', { name: /histórico/i });
        await expect(historicoTab).toBeVisible();
    });

    test('AC-9: Reservas sem ESTOQUE_RESERVAR lista sem ações (apenas ESTOQUE_CONSULTAR)', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR'],
            name: 'Consultor de estoque',
            email: 'consulta@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/reservas');

        // Prova positiva: a reserva mockada aparece na tabela (coluna Origem mostra origemModulo)
        await expect(page.getByRole('cell', { name: 'VENDAS' })).toBeVisible();

        // Botão "Nova reserva" aparece mas desabilitado (PermissionGuard mode="disable")
        const botaoCriarReserva = page.getByRole('button', { name: 'Nova reserva' });
        await expect(botaoCriarReserva).toBeDisabled();

        // Botões de ação da linha (Baixar, Cancelar) estão ausentes (DataTableActions com permission)
        const botaoBaixar = page.getByRole('button', { name: 'Baixar' });
        const botaoCancelar = page.getByRole('button', { name: 'Cancelar' });
        await expect(botaoBaixar).toHaveCount(0);
        await expect(botaoCancelar).toHaveCount(0);
    });

    test('AC-9: Reservas com ESTOQUE_RESERVAR mostra ações', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR', 'ESTOQUE_RESERVAR'],
            name: 'Gestor de reservas',
            email: 'reservas@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/reservas');

        // Prova positiva: a reserva mockada aparece (mesma coluna Origem)
        await expect(page.getByRole('cell', { name: 'VENDAS' })).toBeVisible();

        // Botão "Nova reserva" está visível e habilitado
        const botaoCriarReserva = page.getByRole('button', { name: 'Nova reserva' });
        await expect(botaoCriarReserva).toBeVisible();
        await expect(botaoCriarReserva).not.toBeDisabled();

        // Botão "Baixar" aparece na linha (ação visível)
        const botaoBaixar = page.getByRole('button', { name: 'Baixar' });
        await expect(botaoBaixar).toBeVisible();
    });

    test('AC-7: Histórico com período padrão de 30 dias não mostra aviso', async ({ page }) => {
        await writeSession(page, {
            permissions: ['ESTOQUE_CONSULTAR'],
            name: 'Consultor de estoque',
            email: 'consulta@logosoft.local'
        });
        await mockApiRoutes(page);
        await installEstoqueRoutes(page);
        await page.goto('/estoque/movimentos');

        // Procura pelo aviso de "sem período definido"
        const aviso = page.getByText(/sem início e fim definidos/i);
        await expect(aviso).not.toBeVisible();
    });
});
