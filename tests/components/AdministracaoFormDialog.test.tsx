import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdministracaoFormDialog } from '@/features/administracao/components/AdministracaoFormDialog';
import { administracaoPageConfigs } from '@/features/administracao/components/administracaoPageConfig';

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));

describe('AdministracaoFormDialog', () => {
    it('exibe validação de campos obrigatórios de empresa', async () => {
        const submit = vi.fn();
        render(<AdministracaoFormDialog visible title="Nova empresa" fields={administracaoPageConfigs.empresas.fields} schema={administracaoPageConfigs.empresas.createSchema} onHide={vi.fn()} onSubmit={submit} />);

        await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

        expect(await screen.findByText('Razão social é obrigatório.')).toBeInTheDocument();
        expect(submit).not.toHaveBeenCalled();
    });

    it('AJ-06: ao editar enum desconhecido, mantém a opção explícita em vez de deixar o select vazio', () => {
        render(
            <AdministracaoFormDialog
                visible
                title="Editar empresa"
                fields={administracaoPageConfigs.empresas.fields}
                schema={administracaoPageConfigs.empresas.updateSchema}
                record={{
                    id: '11111111-1111-1111-1111-111111111111',
                    razaoSocial: 'Empresa legado',
                    nomeFantasia: null,
                    inscricaoEstadual: null,
                    inscricaoMunicipal: null,
                    regimeTributario: 99,
                    crt: 99
                }}
                onHide={vi.fn()}
                onSubmit={async () => undefined}
            />
        );

        const regime = document.getElementById('regimeTributario') as HTMLSelectElement;
        const crt = document.getElementById('crt') as HTMLSelectElement;
        expect(regime).not.toBeNull();
        expect(crt).not.toBeNull();
        expect((within(regime).getByRole('option', { name: 'Não mapeado (99)' }) as HTMLOptionElement).selected).toBe(true);
        expect((within(crt).getByRole('option', { name: 'Não mapeado (99)' }) as HTMLOptionElement).selected).toBe(true);
    });
});
