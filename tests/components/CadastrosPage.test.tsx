import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CadastrosPage } from '@/features/cadastros/components/CadastrosPage';

const { estado, voltar } = vi.hoisted(() => ({ estado: { permissoes: [] as string[] }, voltar: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ back: voltar })
}));

vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({ hasAnyPermission: (codes: string[]) => codes.some((code) => estado.permissoes.includes(code)) })
}));

vi.mock('@/components/common/PageHeader', () => ({
    PageHeader: ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => <header><h1>{title}</h1><p>{description}</p>{actions}</header>
}));

describe('CadastrosPage', () => {
    it('mostra somente a cadeia autorizada e mantém os links canônicos', () => {
        estado.permissoes = ['ADMINISTRACAO_CONSULTAR', 'FISCAL_SERIES_CONSULTAR'];
        render(<CadastrosPage />);

        expect(screen.getByText('1. Estrutura organizacional')).toBeInTheDocument();
        expect(screen.getByText('5. Fiscal')).toBeInTheDocument();
        expect(screen.queryByText('2. Pessoas e parceiros')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Filiais/i })).toHaveAttribute('href', '/administracao/filiais');
        expect(screen.getByRole('link', { name: /Séries fiscais/i })).toHaveAttribute('href', '/fiscal/series');
    });

    it('filtra localmente e apresenta vazio sem disparar carregamento de domínio', () => {
        estado.permissoes = ['ADMINISTRACAO_CONSULTAR'];
        render(<CadastrosPage />);

        fireEvent.change(screen.getByRole('textbox', { name: 'Buscar cadastro' }), { target: { value: 'inexistente' } });
        expect(screen.getByText('Nenhum cadastro encontrado')).toBeInTheDocument();
    });

    it('retorna à página anterior e mantém os cards alinhados', () => {
        estado.permissoes = ['ADMINISTRACAO_CONSULTAR'];
        render(<CadastrosPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

        expect(voltar).toHaveBeenCalledTimes(1);
        const cardFiliais = screen.getByRole('link', { name: /Filiais/i });
        expect(cardFiliais).toHaveClass('flex', 'w-full');
        expect(cardFiliais.firstElementChild).toHaveStyle({ height: '9rem' });
    });
});
