import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { formatMoney, formatMoneyOptional } from '@/features/financeiro/components/financeiroUiUtils';

/**
 * Teste de componente que prova a denúncia de campo monetário obrigatório ausente numa tela real.
 *
 * Simula uma célula de tabela (DataTable) que renderiza um valor monetário obrigatório.
 * Quando o backend não entrega o campo, a função `formatMoney` denuncia em development
 * (mostra "valor ausente (contrato)") e degrada em production (mostra "—").
 *
 * Este teste garante que:
 * 1. A denúncia aparece na tela (não é silenciosa)
 * 2. O zero legítimo não é confundido com ausência (AC-1 do plano)
 * 3. Contratos opcionais renderizam silenciosamente com "—"
 */

const TestDataTableCell = ({ value, optional = false }: { value: number | null | undefined; optional?: boolean }) => {
    const formatted = optional ? formatMoneyOptional(value) : formatMoney(value);
    return (
        <table>
            <tbody>
                <tr>
                    <td>{formatted}</td>
                </tr>
            </tbody>
        </table>
    );
};

describe('formatMoney denúncia em tela real (F1.4)', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('Desenvolvedor: denúncia visível (desenvolvimento)', () => {
        beforeEach(() => {
            vi.stubEnv('NODE_ENV', 'development');
        });

        it('renderiza denúncia quando field monetário obrigatório não vem do backend (undefined)', () => {
            render(<TestDataTableCell value={undefined} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell).toBeInTheDocument();
            expect(cell.textContent).toContain('ausente');
        });

        it('renderiza denúncia quando field monetário obrigatório vem como null', () => {
            render(<TestDataTableCell value={null} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell).toBeInTheDocument();
            expect(cell.textContent).toContain('ausente');
        });

        it('renderiza denúncia quando field é NaN (parseFloat retorna NaN)', () => {
            render(<TestDataTableCell value={NaN} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell).toBeInTheDocument();
            expect(cell.textContent).toContain('ausente');
        });

        it('zero legítimo não é confundido com ausência: mostra "R$ 0,00", não denúncia', () => {
            render(<TestDataTableCell value={0} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell).toBeInTheDocument();
            // Contem "0,00" e não a denúncia
            expect(cell.textContent).not.toContain('ausente');
            expect(cell.textContent).toMatch(/0[.,]00/);
        });

        it('valor válido renderiza corretamente, sem denúncia', () => {
            render(<TestDataTableCell value={251.50} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell).toBeInTheDocument();
            expect(cell.textContent).toMatch(/251[.,]50/);
            expect(cell.textContent).not.toContain('ausente');
        });
    });

    describe('Produção: degradação graciosa (production)', () => {
        beforeEach(() => {
            vi.stubEnv('NODE_ENV', 'production');
        });

        it('renderiza "—" quando field monetário obrigatório não vem (undefined)', () => {
            render(<TestDataTableCell value={undefined} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toBe('—');
        });

        it('renderiza "—" quando field vem como null', () => {
            render(<TestDataTableCell value={null} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toBe('—');
        });

        it('renderiza "—" quando field é NaN', () => {
            render(<TestDataTableCell value={NaN} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toBe('—');
        });

        it('zero legítimo continua "R$ 0,00" em produção', () => {
            render(<TestDataTableCell value={0} optional={false} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toMatch(/0[.,]00/);
        });
    });

    describe('Campos opcionais: silêncio em ambos os ambientes', () => {
        it('undefined em field opcional renderiza "—" em development', () => {
            vi.stubEnv('NODE_ENV', 'development');

            render(<TestDataTableCell value={undefined} optional={true} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toBe('—');
            expect(cell.textContent).not.toContain('ausente');
        });

        it('undefined em field opcional renderiza "—" em production', () => {
            vi.stubEnv('NODE_ENV', 'production');

            render(<TestDataTableCell value={undefined} optional={true} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toBe('—');
        });

        it('valor válido em field opcional ignora a marcação opcional', () => {
            render(<TestDataTableCell value={100} optional={true} />);

            const cell = screen.getByRole('cell');
            expect(cell.textContent).toMatch(/100[.,]00/);
        });
    });

    describe('Fidelidade ao contrato de backend (F1.1)', () => {
        it('Invariante AC-1: zero nunca vira ausência em nenhum ambiente', () => {
            vi.stubEnv('NODE_ENV', 'development');
            const devRender = render(<TestDataTableCell value={0} optional={false} />);
            let cell = screen.getByRole('cell');
            expect(cell.textContent).toMatch(/0[.,]00/);
            expect(cell.textContent).not.toContain('ausente');

            devRender.unmount();

            vi.unstubAllEnvs();
            vi.stubEnv('NODE_ENV', 'production');
            const prodRender = render(<TestDataTableCell value={0} optional={false} />);
            cell = screen.getByRole('cell');
            expect(cell.textContent).toMatch(/0[.,]00/);
        });

        it('AC-2: Ausência nunca contém "0,00"', () => {
            vi.stubEnv('NODE_ENV', 'development');

            render(<TestDataTableCell value={undefined} optional={false} />);
            const cell = screen.getByRole('cell');

            // A denúncia não contém "0,00"
            expect(cell.textContent).not.toContain('0,00');
            expect(cell.textContent).toContain('ausente');
        });
    });
});
