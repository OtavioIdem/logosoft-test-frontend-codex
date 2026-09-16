import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValoresAcessoriosDialog } from '@/features/fiscal/components/FiscalActionDialogs';
import { NotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';

// Os campos novos não têm htmlFor/id (mesmo padrão do restante de FiscalActionDialogs.tsx), então a
// localização é pelo texto visível do rótulo, escopada ao container do campo, e o papel acessível do
// controle dentro dele -- não por classe CSS nem ordem de DOM.
const campoPorRotulo = (rotulo: string) => {
    const label = screen.getByText(rotulo);
    const campo = label.closest('.field');
    if (!campo) throw new Error(`Campo "${rotulo}" não encontrado.`);
    return campo as HTMLElement;
};

const inputMoeda = (rotulo: string) => within(campoPorRotulo(rotulo)).getByRole('spinbutton') as HTMLInputElement;

// Intl.NumberFormat pt-BR usa espaço fino (não-quebrável) entre "R$" e o valor; normaliza para comparar.
const valorMoeda = (input: HTMLInputElement) => input.value.replace(/\s/g, ' ');

const notaComValores = (overrides: Partial<NotaFiscalResponse> = {}) =>
    ({
        valorFrete: 10,
        valorSeguro: 5,
        valorOutrasDespesas: 2,
        ...overrides
    }) as NotaFiscalResponse;

const botaoSalvar = () => screen.getByRole('button', { name: 'Salvar valores' });

describe('ValoresAcessoriosDialog', () => {
    it('AC-7: abre com os três valores atuais da nota', () => {
        render(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={vi.fn()} nota={notaComValores()} />);

        expect(valorMoeda(inputMoeda('Frete'))).toBe('R$ 10,00');
        expect(valorMoeda(inputMoeda('Seguro'))).toBe('R$ 5,00');
        expect(valorMoeda(inputMoeda('Outras despesas'))).toBe('R$ 2,00');
    });

    it('AC-7: campo vazio mostra erro e não chama onSubmit', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={onSubmit} nota={notaComValores()} />);

        await userEvent.clear(inputMoeda('Frete'));
        await userEvent.click(botaoSalvar());

        expect(await screen.findByText('Informe um valor.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AC-7: valores válidos chamam onSubmit uma vez com exatamente os 3 campos numéricos', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={onSubmit} nota={notaComValores({ valorFrete: 0, valorSeguro: 0, valorOutrasDespesas: 0 })} />);

        await userEvent.clear(inputMoeda('Frete'));
        await userEvent.type(inputMoeda('Frete'), '1250');
        await userEvent.clear(inputMoeda('Seguro'));
        await userEvent.type(inputMoeda('Seguro'), '300');
        await userEvent.clear(inputMoeda('Outras despesas'));
        await userEvent.type(inputMoeda('Outras despesas'), '725');
        await userEvent.click(botaoSalvar());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ valorFrete: 1250, valorSeguro: 300, valorOutrasDespesas: 725 });
        const enviado = onSubmit.mock.calls[0][0];
        expect(Object.keys(enviado).sort()).toEqual(['valorFrete', 'valorOutrasDespesas', 'valorSeguro']);
    });

    it('AC-7: informa que os três valores entram no total e na base dos tributos, recalculados na validação', () => {
        render(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={vi.fn()} nota={notaComValores()} />);

        expect(screen.getByText(/entram no total da nota e na base de cálculo dos tributos, recalculados na validação/)).toBeInTheDocument();
    });

    it('AC-7: reabrir com nota diferente reinicia os valores exibidos', () => {
        const { rerender } = render(<ValoresAcessoriosDialog visible={false} onHide={vi.fn()} onSubmit={vi.fn()} nota={notaComValores({ valorFrete: 10 })} />);
        rerender(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={vi.fn()} nota={notaComValores({ valorFrete: 99 })} />);

        expect(valorMoeda(inputMoeda('Frete'))).toBe('R$ 99,00');
    });

    it('AC-5: digitar "12,50" no Frete: onSubmit com valorFrete: 12.5', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<ValoresAcessoriosDialog visible onHide={vi.fn()} onSubmit={onSubmit} nota={notaComValores({ valorFrete: 0 })} />);

        await userEvent.clear(inputMoeda('Frete'));
        await userEvent.type(inputMoeda('Frete'), '12,50');
        await userEvent.click(botaoSalvar());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ valorFrete: 12.5 }));
    });
});
