import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransmitirSefazDialog } from '@/features/fiscal/components/FiscalActionDialogs';

// AC-3 (v1.11.0a8b57): Correlation ID somente leitura, com prefixo fixo, gerado a cada abertura do diálogo.
const campoPorRotulo = (rotulo: string) => {
    const label = screen.getByText(rotulo);
    const campo = label.closest('.field');
    if (!campo) throw new Error(`Campo "${rotulo}" não encontrado.`);
    return campo as HTMLElement;
};

const campoCorrelationId = () => within(campoPorRotulo('Correlation ID')).getByRole('textbox') as HTMLInputElement;
const botaoTransmitir = () => screen.getByRole('button', { name: 'Transmitir' });

const CORRELATION_ID_PATTERN = /^front-transmitir-\d{14}-[a-z0-9]+$/;

describe('TransmitirSefazDialog', () => {
    it('AC-3: o campo Correlation ID é somente leitura e segue o formato front-transmitir-<timestamp>-<random>', () => {
        render(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        const campo = campoCorrelationId();
        expect(campo).toHaveAttribute('readonly');
        expect(campo.value).toMatch(CORRELATION_ID_PATTERN);
    });

    it('AC-3: o hint explica que um novo Correlation ID é gerado a cada abertura', () => {
        render(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        expect(screen.getByText(/Gerado automaticamente a cada abertura deste di[aá]logo/)).toBeInTheDocument();
    });

    it('AC-3: digitar no campo não altera o valor (é readOnly, não apenas desabilitado)', async () => {
        render(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        const campo = campoCorrelationId();
        const valorOriginal = campo.value;
        await userEvent.type(campo, '00000000000000000000');

        expect(campo.value).toBe(valorOriginal);
    });

    it('AC-3: fechar e reabrir o diálogo gera um Correlation ID diferente', () => {
        const { rerender } = render(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        const primeiro = campoCorrelationId().value;

        rerender(<TransmitirSefazDialog visible={false} loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        rerender(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        const segundo = campoCorrelationId().value;

        expect(segundo).toMatch(CORRELATION_ID_PATTERN);
        expect(segundo).not.toBe(primeiro);
    });

    it('AC-3: onSubmit recebe exatamente o Correlation ID exibido no campo', async () => {
        const onSubmit = vi.fn();
        render(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={onSubmit} />);

        const valorExibido = campoCorrelationId().value;
        await userEvent.click(botaoTransmitir());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ correlationId: valorExibido });
    });
});
