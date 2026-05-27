import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UsuarioFormDialog } from '@/features/seguranca/components/UsuarioFormDialog';

vi.mock('@/components/forms/EmpresaSelect', () => ({
    EmpresaSelect: ({ id = 'empresaId', value, onChange, disabled }: { id?: string; value?: string | null; onChange: (value: string | null) => void; disabled?: boolean }) => (
        <select id={id} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Selecione</option>
            <option value="11111111-1111-1111-1111-111111111111">Empresa teste</option>
        </select>
    )
}));

vi.mock('@/components/forms/FilialSelect', () => ({
    FilialSelect: ({ id = 'filialId', value, onChange, disabled }: { id?: string; value?: string | null; onChange: (value: string | null) => void; disabled?: boolean }) => (
        <select id={id} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Sem filial</option>
            <option value="22222222-2222-2222-2222-222222222222">Filial teste</option>
        </select>
    )
}));

describe('UsuarioFormDialog', () => {
    it('renderiza campos obrigatórios para criação de usuário com seleção de empresa e filial', () => {
        render(<UsuarioFormDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        expect(screen.getByLabelText('Nome')).toBeInTheDocument();
        expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
        expect(screen.getByLabelText('Senha inicial')).toBeInTheDocument();
        expect(screen.getByLabelText('Empresa')).toBeInTheDocument();
        expect(screen.getByLabelText('Filial')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /criar usuário/i })).toBeInTheDocument();
    });
});
