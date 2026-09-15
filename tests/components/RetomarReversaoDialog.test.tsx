import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetomarReversaoDialog } from '@/features/faturamento/components/FaturamentoDialogs';

// Abre o Dropdown do PrimeReact pelo inputId e clica na opção com texto exato.
// O overlay pode ir para um portal em document.body; se a opção não aparecer, lança erro.
const escolherOpcao = async (container: HTMLElement, inputId: string, texto: string) => {
    const input = container.querySelector(`[id="${inputId}"]`) ?? document.body.querySelector(`[id="${inputId}"]`);
    const dropdown = input?.closest('.p-dropdown');
    if (!dropdown) throw new Error(`Dropdown com inputId "${inputId}" não encontrado.`);
    await userEvent.click(dropdown as HTMLElement);

    const procurar = () => {
        const noContainer = Array.from(container.querySelectorAll('.p-dropdown-item'));
        const noBody = Array.from(document.body.querySelectorAll('.p-dropdown-item'));
        return noContainer.concat(noBody).find((item) => (item.textContent ?? '').trim() === texto) ?? null;
    };
    const opcao = await waitFor(() => {
        const encontrada = procurar();
        if (!encontrada) throw new Error(`Opção "${texto}" não encontrada no dropdown "${inputId}".`);
        return encontrada;
    });
    await userEvent.click(opcao as HTMLElement);
};

const renderDialog = (leg: number = 5) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const utils = render(<RetomarReversaoDialog visible leg={leg} onHide={vi.fn()} onSubmit={onSubmit} />);
    return { ...utils, onSubmit };
};

const dialogo = () => screen.getByRole('dialog', { name: 'Retomar reversão' });
const botaoRetomar = () => {
    const botoes = screen.getAllByRole('button', { name: 'Retomar' });
    if (botoes.length !== 1) throw new Error(`Esperado 1 botão Retomar, encontrados ${botoes.length}.`);
    return botoes[0];
};

describe('RetomarReversaoDialog', () => {
    it('AC-8: sem ação escolhida não envia e mostra erro de ação', async () => {
        const { onSubmit } = renderDialog();
        expect(dialogo()).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText('Motivo *'), 'Motivo válido');
        await userEvent.click(botaoRetomar());

        expect(await screen.findByText('Selecione uma ação válida.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AC-8: com ação e motivo só de espaços não envia', async () => {
        const { baseElement, onSubmit } = renderDialog();

        await escolherOpcao(baseElement, 'retomarAcao', 'Reaplicar a inversa');
        await userEvent.type(screen.getByLabelText('Motivo *'), '     ');
        await userEvent.click(botaoRetomar());

        expect(await screen.findByText('Informe o motivo.')).toBeInTheDocument();
        expect(screen.queryByText('Selecione uma ação válida.')).not.toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AC-8: Declarar exibe o aviso de afirmação humana; Reaplicar não', async () => {
        const { baseElement } = renderDialog();

        await escolherOpcao(baseElement, 'retomarAcao', 'Reaplicar a inversa');
        expect(screen.queryByText(/afirmação humana/)).not.toBeInTheDocument();

        await escolherOpcao(baseElement, 'retomarAcao', 'Declarar efeito desfeito');
        expect(await screen.findByText(/afirmação humana/)).toBeInTheDocument();
    });

    it('AC-9: envia leg, ação e motivo numéricos e com trim', async () => {
        const { baseElement, onSubmit } = renderDialog(5);

        await escolherOpcao(baseElement, 'retomarAcao', 'Reaplicar a inversa');
        await userEvent.type(screen.getByLabelText('Motivo *'), '  x  ');
        await userEvent.click(botaoRetomar());

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith({ leg: 5, acao: 1, motivo: 'x' });
        const enviado = onSubmit.mock.calls[0][0];
        expect(typeof enviado.leg).toBe('number');
        expect(typeof enviado.acao).toBe('number');
    });
});
