import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdministracaoFormDialog } from '@/features/administracao/components/AdministracaoFormDialog';
import { administracaoPageConfigs } from '@/features/administracao/components/administracaoPageConfig';

describe('AdministracaoFormDialog', () => {
    it('exibe validação de campos obrigatórios de empresa', async () => {
        const submit = vi.fn();
        render(<AdministracaoFormDialog visible title="Nova empresa" fields={administracaoPageConfigs.empresas.fields} schema={administracaoPageConfigs.empresas.createSchema} onHide={vi.fn()} onSubmit={submit} />);

        await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

        expect(await screen.findByText('Razão social é obrigatório.')).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });
});
