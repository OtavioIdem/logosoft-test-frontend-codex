import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';

vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({ useFiliaisOptions: vi.fn() }));
vi.mock('@/components/forms/EntitySelect', () => ({ EntitySelect: ({ disabled }: { disabled?: boolean }) => <button type="button" disabled={disabled}>Filial</button> }));

const mockedUseFiliaisOptions = vi.mocked(useFiliaisOptions);
const empresaId = '11111111-1111-1111-1111-111111111111';

describe('FilialSelect B47.c2', () => {
    it.each([
        [401, 'Sessão não autenticada ou expirada.'],
        [403, 'Você não possui permissão para executar esta operação.'],
        [500, 'Erro interno no servidor. Tente novamente mais tarde.']
    ])('expõe erro HTTP %s em vez de tratá-lo como lista vazia', (status, message) => {
        mockedUseFiliaisOptions.mockReturnValue({
            options: [],
            error: { apiError: { status, message } },
            blocked: false,
            isLoading: false,
            isFetching: false,
            refetch: vi.fn()
        } as unknown as ReturnType<typeof useFiliaisOptions>);

        render(<FilialSelect empresaId={empresaId} value={null} onChange={vi.fn()} />);

        expect(screen.getByText(message)).toBeVisible();
        expect(screen.getByRole('button', { name: 'Filial' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    });
});
