import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CnabPage } from '@/features/bancos/components/CnabPage';

const permissions = vi.hoisted(() => ({ hasPermission: vi.fn(() => true) }));

vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => permissions
}));

vi.mock('@/components/common/PageHeader', () => ({
    PageHeader: ({ title, description }: { title: string; description: string }) => <header><h1>{title}</h1><p>{description}</p></header>
}));

describe('CnabPage', () => {
    it('expõe remessa e retorno, mas mantém ambos indisponíveis enquanto faltam consultas seguras', () => {
        permissions.hasPermission.mockReturnValue(true);
        render(<CnabPage />);

        expect(screen.getByRole('heading', { name: 'CNAB' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Gerar remessa' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Importar retorno' })).toBeDisabled();
        expect(screen.getByText(/não oferece consultas de contas bancárias e carteiras de cobrança/i)).toBeInTheDocument();
        expect(screen.getByText(/não solicitará um identificador técnico manualmente/i)).toBeInTheDocument();
    });
});
