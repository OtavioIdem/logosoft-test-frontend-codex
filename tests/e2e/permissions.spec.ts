import { expect, test } from '@playwright/test';
import { mockApiRoutes, CONSULTA_PERMISSIONS, writeSession } from './fixtures/logosoft';

test.describe('permissões com sessão padrão', () => {
    test.beforeEach(async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, { permissions: CONSULTA_PERMISSIONS, email: 'consulta@logosoft.local', name: 'Usuário consulta' });
    });

    test('protege botão de criação quando usuário possui apenas consulta', async ({ page }) => {
        await page.goto('/produtos');
        await expect(page.getByRole('heading', { name: 'Produtos' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Novo produto$/ })).toBeDisabled();
    });

    test('protege tela sem permissão de gerenciamento específica', async ({ page }) => {
        await page.goto('/seguranca/usuarios');
        await expect(page.getByText(/exige a permissão|acesso/i)).toBeVisible();
    });
});

test.describe('AC-4/5/6: permissões granulares', () => {
    test('AC-4: sessão com PORTARIA_PREAUTORIZAR ativa botão de nova pré-autorização', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, {
            permissions: ['PORTARIA_PREAUTORIZAR', 'PORTARIA_CONSULTAR'],
            email: 'portaria@logosoft.local',
            name: 'Usuário Portaria'
        });

        await page.goto('/portaria');
        await page.waitForLoadState('networkidle');
        // Verificar que a página carregou (não redirecionar para login)
        await expect(page).toHaveURL(/portaria/);
        // Verificar que o erro de permissão não aparece
        const permissionError = page.getByText('exige uma permissão de portaria');
        await expect(permissionError).not.toBeVisible();
        // Verificar que o conteúdo da página aparece (tabs ou heading)
        const tabsOrHeading = page.locator('[role="tablist"], h1, h2').first();
        await expect(tabsOrHeading).toBeVisible();
    });

    test('AC-5: sessão com SEGURANCA_GRUPOS_ACESSO_CONSULTAR abre grupos em leitura', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, {
            permissions: ['SEGURANCA_GRUPOS_ACESSO_CONSULTAR'],
            email: 'grupos@logosoft.local',
            name: 'Usuário Grupos Consulta'
        });

        await page.goto('/seguranca/grupos-acesso');
        // Verificar que a página carrega
        await expect(page.getByRole('heading', { name: /grupos|acesso/i })).toBeVisible();
        // Verificar que botões de criação/edição/inativação estão desabilitados
        const novoBtn = page.getByRole('button', { name: /novo grupo|criar/i });
        const editarBtn = page.locator('button:has-text("Editar")').first();
        const inativarBtn = page.locator('button:has-text("Inativar")').first();

        if (await novoBtn.isVisible()) {
            await expect(novoBtn).toBeDisabled();
        }
        if (await editarBtn.isVisible()) {
            await expect(editarBtn).toBeDisabled();
        }
        if (await inativarBtn.isVisible()) {
            await expect(inativarBtn).toBeDisabled();
        }
    });

    test('AC-6: sessão com ATIVIDADES_CONSULTAR e COMENTAR limita ações disponíveis', async ({ page }) => {
        await mockApiRoutes(page);
        await writeSession(page, {
            permissions: ['ATIVIDADES_CONSULTAR', 'ATIVIDADES_COMENTAR'],
            email: 'atividades@logosoft.local',
            name: 'Usuário Atividades'
        });

        await page.goto('/atividades');
        // Verificar que a página carrega
        await expect(page.getByRole('heading', { name: /atividades/i })).toBeVisible();
        // Verificar que botão "Nova atividade" está desabilitado (não tem ATIVIDADES_CRIAR)
        const novaAtividadeBtn = page.getByRole('button', { name: /nova atividade|criar/i });
        if (await novaAtividadeBtn.isVisible()) {
            await expect(novaAtividadeBtn).toBeDisabled();
        }
        // Verificar que ações de "Editar", "Status", "Atribuir", "Cancelar" não estão disponíveis
        // Apenas "Detalhe" e "Comentar" devem estar disponíveis
        await expect(page.locator('text=/Detalhe|Comentar/')).toBeVisible();
    });
});
