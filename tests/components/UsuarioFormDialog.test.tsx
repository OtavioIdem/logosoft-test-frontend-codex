import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UsuarioFormDialog } from '@/features/seguranca/components/UsuarioFormDialog';

describe('UsuarioFormDialog', () => {
    it('renderiza campos obrigatórios para criação de usuário', () => {
        render(<UsuarioFormDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        expect(screen.getByLabelText('Nome')).toBeInTheDocument();
        expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
        expect(screen.getByLabelText('Senha inicial')).toBeInTheDocument();
        expect(screen.getByLabelText('Empresa ID')).toBeInTheDocument();
        expect(screen.getByLabelText('Filial ID')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /criar usuário/i })).toBeInTheDocument();
    });
});
