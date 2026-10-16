import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoletosPage } from '@/features/bancos/components/BoletosPage';
import { BoletoDetalheDialog } from '@/features/bancos/components/BancosOperacoesDialogs';

const hooks = vi.hoisted(() => ({
    useBoletos: vi.fn(),
    useBoletoDetalhe: vi.fn(),
    useBoletoHistorico: vi.fn(),
    useBoletoMutations: vi.fn()
}));

vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({ hasPermission: () => true })
}));

vi.mock('@/hooks/useAppToast', () => ({
    useAppToast: () => ({ success: vi.fn() })
}));

vi.mock('@/features/bancos/hooks/useBancosResources', () => hooks);

vi.mock('@/components/common/PageHeader', () => ({
    PageHeader: ({ title, description, actions }: { title: string; description: string; actions: React.ReactNode }) => <header><h1>{title}</h1><p>{description}</p>{actions}</header>
}));

vi.mock('@/components/forms/EmpresaFilialFilter', () => ({
    EmpresaFilialFilter: () => <div aria-label="Filtro de empresa" />
}));

vi.mock('@/components/forms/SearchInput', () => ({
    SearchInput: ({ ariaLabel }: { ariaLabel: string }) => <input aria-label={ariaLabel} />
}));

vi.mock('@/components/data/DataTableServer', () => ({
    DataTableServer: () => <div aria-label="Tabela de boletos" />
}));

vi.mock('@/components/data/DataTableActions', () => ({
    DataTableActions: () => null
}));

const queryIdle = { data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() };

describe('BoletosPage — b78 estados operacionais', () => {
    it('AC-3: sem empresa não consulta e orienta a seleção antes da listagem', () => {
        hooks.useBoletos.mockReturnValue(queryIdle);
        hooks.useBoletoDetalhe.mockReturnValue(queryIdle);
        hooks.useBoletoHistorico.mockReturnValue(queryIdle);
        hooks.useBoletoMutations.mockReturnValue({ cancelarMutation: { mutateAsync: vi.fn(), isPending: false } });

        render(<BoletosPage />);

        expect(hooks.useBoletos).toHaveBeenCalledWith(null, true);
        expect(screen.getByText('Selecione uma empresa')).toBeInTheDocument();
        expect(screen.getByText('Selecione uma empresa para consultar boletos.')).toBeInTheDocument();
    });

    it('AC-4: mantém Gerar boleto visível, desabilitado e com o motivo operacional explícito', () => {
        hooks.useBoletos.mockReturnValue(queryIdle);
        hooks.useBoletoDetalhe.mockReturnValue(queryIdle);
        hooks.useBoletoHistorico.mockReturnValue(queryIdle);
        hooks.useBoletoMutations.mockReturnValue({ cancelarMutation: { mutateAsync: vi.fn(), isPending: false } });

        render(<BoletosPage />);

        expect(screen.getByRole('button', { name: 'Gerar boleto' })).toBeDisabled();
        expect(screen.getByText('Geração indisponível: ainda não é possível selecionar uma carteira de cobrança pelo sistema.')).toBeInTheDocument();
    });

    it('AC-5: mostra falha de histórico no diálogo e permite tentar novamente sem esconder o detalhe', () => {
        const retryHistorico = vi.fn();
        render(<BoletoDetalheDialog
            visible
            boleto={{
                id: '33333333-3333-3333-3333-333333333333',
                contaReceberId: '44444444-4444-4444-4444-444444444444',
                parcelaReceberId: '55555555-5555-5555-5555-555555555555',
                carteiraCobrancaId: '66666666-6666-6666-6666-666666666666',
                nossoNumero: 123456,
                numeroDocumento: 'REC-000123',
                dataEmissao: '2026-10-15T12:00:00Z',
                dataVencimento: '2026-10-30T12:00:00Z',
                valorTitulo: 245.75,
                statusBoleto: 1
            }}
            historico={[]}
            historicoError={{ code: 'BANCOS_HISTORICO_INDISPONIVEL', message: 'Histórico indisponível', status: 503, traceId: 'trace-boleto' }}
            onRetryDetalhe={vi.fn()}
            onRetryHistorico={retryHistorico}
            onHide={vi.fn()}
        />);

        expect(screen.getByText('Nosso número')).toBeInTheDocument();
        expect(screen.getByText('Histórico indisponível')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(retryHistorico).toHaveBeenCalledTimes(1);
    });
});
