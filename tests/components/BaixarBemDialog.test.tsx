import { describe, expect, it, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaixarBemDialog } from '@/features/patrimonio/components/PatrimonioDialogs';

describe('BaixarBemDialog', () => {
    it('AC-7: não confirma sem motivo', async () => {
        const submit = vi.fn();
        render(<BaixarBemDialog visible onHide={vi.fn()} onSubmit={submit} />);

        // Preenche só a justificativa
        const justificativaField = screen.getByLabelText(/Justificativa \*/i);
        await userEvent.type(justificativaField, 'Equipamento quebrado');

        // Clica em "Baixar bem"
        const baixarBtn = screen.getByRole('button', { name: /Baixar bem/i });
        await userEvent.click(baixarBtn);

        // Afirma que a mensagem de erro aparece
        expect(await screen.findByText('Informe o motivo.')).toBeInTheDocument();

        // Afirma que submit não foi chamado
        expect(submit).not.toHaveBeenCalled();
    });

    it('AC-7: envia motivo numérico', async () => {
        const submit = vi.fn();
        const { container } = render(<BaixarBemDialog visible onHide={vi.fn()} onSubmit={submit} />);

        // Preenche a justificativa
        const justificativaField = screen.getByLabelText(/Justificativa \*/i);
        await userEvent.type(justificativaField, 'Equipamento obsoleto');

        // Estratégia 1: Tenta clicar no elemento .p-dropdown que contém o input com inputId="baixaMotivo"
        const dropdownContainer = container.querySelector('[id="baixaMotivo"]')?.closest('.p-dropdown') ||
                                 document.body.querySelector('[id="baixaMotivo"]')?.closest('.p-dropdown');

        let opcaoEncontrada = false;

        if (dropdownContainer) {
            // Clica no dropdown para tentar abrir
            await userEvent.click(dropdownContainer);
            await new Promise(r => setTimeout(r, 150));

            // Procura "Obsolescência" nos items renderizados
            const items = dropdownContainer.querySelectorAll('.p-dropdown-item');
            for (const item of Array.from(items)) {
                if (item.textContent?.includes('Obsolescência')) {
                    await userEvent.click(item);
                    opcaoEncontrada = true;
                    break;
                }
            }

            // Se não encontrou no container, procura no body (dropdown pode renderizar em portal)
            if (!opcaoEncontrada) {
                const itemsBody = document.body.querySelectorAll('.p-dropdown-item');
                for (const item of Array.from(itemsBody)) {
                    if (item.textContent?.includes('Obsolescência')) {
                        await userEvent.click(item);
                        opcaoEncontrada = true;
                        break;
                    }
                }
            }
        }

        // Se nenhuma estratégia funcionou, reporta erro e falha
        if (!opcaoEncontrada) {
            throw new Error('Não conseguiu abrir o Dropdown do PrimeReact ou encontrar "Obsolescência" em nenhuma forma (por texto, no container ou no portal do body). Estratégias tentadas: 1) clicar no .p-dropdown, 2) procurar .p-dropdown-item no container, 3) procurar .p-dropdown-item no body.');
        }

        // Clica em "Baixar bem"
        const baixarBtn = screen.getByRole('button', { name: /Baixar bem/i });
        await userEvent.click(baixarBtn);

        // Afirma que submit foi chamado com motivo = 2 (Obsolescência)
        expect(submit).toHaveBeenCalledOnce();
        expect(submit).toHaveBeenCalledWith(expect.objectContaining({ motivo: 2 }));
    });
});
