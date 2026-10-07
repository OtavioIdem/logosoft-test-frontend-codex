import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovimentoEstoqueFormDialog } from '@/features/estoque/components/MovimentoEstoqueFormDialog';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/components/forms/EmpresaFilialFields', () => ({
    EmpresaFilialFields: ({ empresaId }: { empresaId?: string | null }) => <div data-testid="empresa-filial-fields">Empresa: {empresaId ?? 'não selecionada'}</div>
}));
vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ entityName, disabled }: { entityName: string; disabled?: boolean }) => <button type="button" disabled={disabled}>{entityName}</button>
}));
vi.mock('@/components/forms/FormGrid', () => ({ FormGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/forms/FieldError', () => ({ FieldError: () => null }));
vi.mock('@/components/forms/QuantityInput', () => ({ QuantityInput: () => <input aria-label="Quantidade" /> }));
vi.mock('@/features/estoque/hooks/useEstoqueResources', () => ({ useLocaisEstoque: vi.fn() }));
vi.mock('@/features/produtos/hooks/useProdutosResources', () => ({ useProdutos: vi.fn() }));
vi.mock('primereact/card', () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));
vi.mock('primereact/button', () => ({ Button: ({ label }: { label: string }) => <button type="button">{label}</button> }));
vi.mock('primereact/message', () => ({ Message: ({ text }: { text: string }) => <div role="status">{text}</div> }));

const empresaAtiva = '11111111-1111-1111-1111-111111111111';
const filialAtiva = '22222222-2222-2222-2222-222222222222';
const mockedContext = vi.mocked(useOrganizationalContext);
const mockedProdutos = vi.mocked(useProdutos);
const mockedLocais = vi.mocked(useLocaisEstoque);

const contextValue = (empresaId: string | null, filialId: string | null) => ({
    snapshot: { empresaId, filialId, isMaster: !empresaId, revision: 1 },
    isGlobal: !empresaId,
    canChangeOrganization: !empresaId,
    requiresOrganizationSelection: !empresaId,
    empresaId,
    filialId,
    organizationalScopeKey: 'scope',
    setEmpresaId: vi.fn(),
    setFilialId: vi.fn()
} as ReturnType<typeof useOrganizationalContext>);

describe('MovimentoEstoqueFormDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedProdutos.mockReturnValue({ data: [], isFetching: false } as never);
        mockedLocais.mockReturnValue({ data: [], isFetching: false } as never);
    });

    it('carrega Produto e Local com a empresa e filial ativas ao abrir Entrada', () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, filialAtiva));

        render(<MovimentoEstoqueFormDialog embedded visible kind="entrada" onHide={vi.fn()} onSubmit={vi.fn()} />);

        expect(screen.getByTestId('empresa-filial-fields')).toHaveTextContent(empresaAtiva);
        expect(screen.getByRole('button', { name: 'produto' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'local' })).toBeEnabled();
        expect(mockedProdutos).toHaveBeenLastCalledWith({ empresaId: empresaAtiva, filialId: filialAtiva }, true);
        expect(mockedLocais).toHaveBeenLastCalledWith({ empresaId: empresaAtiva, filialId: filialAtiva }, true);
    });

    it('mostra o aviso antes da empresa quando não há contexto organizacional', () => {
        mockedContext.mockReturnValue(contextValue(null, null));

        render(<MovimentoEstoqueFormDialog embedded visible kind="saida" onHide={vi.fn()} onSubmit={vi.fn()} />);

        const aviso = screen.getByRole('status');
        const empresa = screen.getByTestId('empresa-filial-fields');
        expect(aviso).toHaveTextContent('Selecione a empresa para carregar os produtos e locais de estoque disponíveis.');
        expect(aviso.compareDocumentPosition(empresa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByRole('button', { name: 'produto' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'local' })).toBeDisabled();
    });
});
