import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImpostoNotaFiscalDialog } from '@/features/fiscal/components/FiscalActionDialogs';

// AC-12 / D35: o motivo do lançamento manual é obrigatório, começa vazio (sem texto padrão) e o hint
// não repete a desinformação "O frontend não calcula imposto automaticamente" (AC-2).
const campoPorRotulo = (rotulo: string) => {
    const label = screen.getByText(rotulo);
    const campo = label.closest('.field');
    if (!campo) throw new Error(`Campo "${rotulo}" não encontrado.`);
    return campo as HTMLElement;
};

const campoMotivo = () => within(campoPorRotulo('Motivo do lançamento manual')).getByRole('textbox') as HTMLTextAreaElement;
const botaoAdicionar = () => screen.getByRole('button', { name: 'Adicionar imposto' });

describe('ImpostoNotaFiscalDialog', () => {
    it('AC-12: abre com o motivo vazio, sem o texto padrão antigo', () => {
        render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={vi.fn()} itens={[]} />);

        expect(campoMotivo().value).toBe('');
        expect(screen.queryByText('Imposto parametrizado manualmente.')).not.toBeInTheDocument();
    });

    it('AC-12: hint nomeia os três impostos que o lançamento manual substitui no total', () => {
        render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={vi.fn()} itens={[]} />);

        expect(screen.getByText(/IPI, ICMS ST ou FCP ST substitui, no total da nota/)).toBeInTheDocument();
        expect(screen.queryByText(/O frontend não calcula imposto automaticamente/)).not.toBeInTheDocument();
    });

    it('AC-12: sem motivo não envia e mostra o erro do campo', async () => {
        const onSubmit = vi.fn();
        render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={onSubmit} itens={[]} />);

        await userEvent.click(botaoAdicionar());

        expect(await screen.findByText('Informe o motivo do lançamento manual.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AC-12: motivo só de espaços não envia', async () => {
        const onSubmit = vi.fn();
        render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={onSubmit} itens={[]} />);

        await userEvent.type(campoMotivo(), '     ');
        await userEvent.click(botaoAdicionar());

        expect(await screen.findByText('Informe o motivo do lançamento manual.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('AC-12: motivo preenchido envia o lançamento com a observação', async () => {
        const onSubmit = vi.fn();
        render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={onSubmit} itens={[]} />);

        await userEvent.type(campoMotivo(), 'IPI recalculado por decisão do fiscal.');
        await userEvent.click(botaoAdicionar());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ observacao: 'IPI recalculado por decisão do fiscal.' });
    });

    it('AC-12: reabrir o diálogo limpa o motivo digitado anteriormente', async () => {
        const { rerender } = render(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={vi.fn()} itens={[]} />);
        await userEvent.type(campoMotivo(), 'Motivo anterior.');
        expect(campoMotivo().value).toBe('Motivo anterior.');

        rerender(<ImpostoNotaFiscalDialog visible={false} onHide={vi.fn()} onSubmit={vi.fn()} itens={[]} />);
        rerender(<ImpostoNotaFiscalDialog visible onHide={vi.fn()} onSubmit={vi.fn()} itens={[]} />);

        expect(campoMotivo().value).toBe('');
    });
});
