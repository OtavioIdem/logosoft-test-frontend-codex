import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { PercentInput } from '@/components/forms/PercentInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { useState } from 'react';

/**
 * AC-1, AC-2, AC-3, AC-4: digitação de valor decimal em pt-BR
 *
 * Padrão: digitar com userEvent.type, sair com userEvent.tab(), afirmar:
 * - Texto exibido (normalizando espaços em branco)
 * - Número entregue por onValueChange (após blur)
 */

const normaliza = (texto: string) => texto.replace(/\s/g, ' ');

// AC-1: InputNumber moeda pt-BR
const InputNumberMoedaPtBr = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return (
        <InputNumber
            value={value}
            onValueChange={(e: InputNumberValueChangeEvent) => {
                setValue(e.value ?? null);
                onValueChange(e.value ?? null);
            }}
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            minFractionDigits={2}
            maxFractionDigits={2}
        />
    );
};

// AC-2: MoneyInput real
const MoneyInputWrapper = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return <MoneyInput value={value} onChange={(v) => { setValue(v); onValueChange(v); }} />;
};

// AC-3: InputNumber decimal pt-BR com sufixo
const InputNumberDecimalPtBrComSufixo = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return (
        <InputNumber
            value={value}
            onValueChange={(e: InputNumberValueChangeEvent) => {
                setValue(e.value ?? null);
                onValueChange(e.value ?? null);
            }}
            locale="pt-BR"
            suffix=" %"
            minFractionDigits={2}
            maxFractionDigits={4}
        />
    );
};

// AC-4: InputNumber moeda en-US
const InputNumberMoedaEnUS = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return (
        <InputNumber
            value={value}
            onValueChange={(e: InputNumberValueChangeEvent) => {
                setValue(e.value ?? null);
                onValueChange(e.value ?? null);
            }}
            mode="currency"
            currency="USD"
            locale="en-US"
            minFractionDigits={2}
            maxFractionDigits={2}
        />
    );
};

// AC-11: PercentInput real
const PercentInputWrapper = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return <PercentInput value={value} onChange={(v) => { setValue(v); onValueChange(v); }} />;
};

// AC-11: QuantityInput real
const QuantityInputWrapper = ({ onValueChange }: { onValueChange: (v: number | null) => void }) => {
    const [value, setValue] = useState<number | null>(null);
    return <QuantityInput value={value} onChange={(v) => { setValue(v); onValueChange(v); }} />;
};

describe('InputNumber — digitação de valor decimal em pt-BR', () => {
    describe('AC-1: InputNumber moeda BRL pt-BR', () => {
        it('digitar "12,50": exibe R$ 12,50 e entrega 12.5', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,50');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 12,50');
            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });

        it('digitar "12,05": exibe R$ 12,05 e entrega 12.05', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,05');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 12,05');
            expect(onValueChange).toHaveBeenCalledWith(12.05);
        });

        it('digitar "1234,56": exibe R$ 1.234,56 e entrega 1234.56', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '1234,56');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 1.234,56');
            expect(onValueChange).toHaveBeenCalledWith(1234.56);
        });

        it('digitar "0,99": exibe R$ 0,99 e entrega 0.99', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '0,99');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 0,99');
            expect(onValueChange).toHaveBeenCalledWith(0.99);
        });
    });

    describe('AC-2: MoneyInput real', () => {
        it('digitar "12,50": onChange com 12.5', async () => {
            const onValueChange = vi.fn();
            render(<MoneyInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,50');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 12,50');
            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });

        it('digitar "12,05": onChange com 12.05', async () => {
            const onValueChange = vi.fn();
            render(<MoneyInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,05');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 12,05');
            expect(onValueChange).toHaveBeenCalledWith(12.05);
        });

        it('digitar "1234,56": onChange com 1234.56', async () => {
            const onValueChange = vi.fn();
            render(<MoneyInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '1234,56');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 1.234,56');
            expect(onValueChange).toHaveBeenCalledWith(1234.56);
        });

        it('digitar "0,99": onChange com 0.99', async () => {
            const onValueChange = vi.fn();
            render(<MoneyInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '0,99');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('R$ 0,99');
            expect(onValueChange).toHaveBeenCalledWith(0.99);
        });
    });

    describe('AC-3: InputNumber decimal pt-BR com sufixo %', () => {
        it('digitar "12,50": entrega 12.5', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberDecimalPtBrComSufixo onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,50');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('12,50 %');
            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });

        it('digitar "3,1234": entrega 3.1234', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberDecimalPtBrComSufixo onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '3,1234');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('3,1234 %');
            expect(onValueChange).toHaveBeenCalledWith(3.1234);
        });
    });

    describe('AC-4: sem regressão', () => {
        it('digitar "12,5" em moeda: entrega 12.5', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,5');
            await userEvent.tab();

            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });

        it('digitar "1250" em moeda: entrega 1250', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '1250');
            await userEvent.tab();

            expect(onValueChange).toHaveBeenCalledWith(1250);
        });

        it('digitar "12,50", dois Backspace e "34": entrega 12.34', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaPtBr onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,50');
            await userEvent.type(input, '{backspace}{backspace}34');
            await userEvent.tab();

            expect(onValueChange).toHaveBeenCalledWith(12.34);
        });

        it('digitar "12.50" em en-US USD: entrega 12.5', async () => {
            const onValueChange = vi.fn();
            render(<InputNumberMoedaEnUS onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12.50');
            await userEvent.tab();

            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });
    });

    describe('AC-11: PercentInput e QuantityInput reais', () => {
        it('PercentInput "12,5": exibe 12,50 % e entrega 12.5', async () => {
            const onValueChange = vi.fn();
            render(<PercentInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '12,5');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('12,50 %');
            expect(onValueChange).toHaveBeenCalledWith(12.5);
        });

        it('QuantityInput "1,25": exibe 1,25 e entrega 1.25', async () => {
            const onValueChange = vi.fn();
            render(<QuantityInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '1,25');
            await userEvent.tab();

            expect(normaliza(input.value)).toBe('1,25');
            expect(onValueChange).toHaveBeenCalledWith(1.25);
        });

        it('QuantityInput "1250": entrega 1250', async () => {
            const onValueChange = vi.fn();
            render(<QuantityInputWrapper onValueChange={onValueChange} />);

            const input = screen.getByRole('spinbutton') as HTMLInputElement;
            await userEvent.type(input, '1250');
            await userEvent.tab();

            expect(onValueChange).toHaveBeenCalledWith(1250);
            // Afirmar o texto exibido pelo componente
            expect(normaliza(input.value)).toBe('1.250');
        });
    });
});
