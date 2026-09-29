import type { InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContaFinanceiraFormDialog } from '@/features/financeiro/components/ContaFinanceiraFormDialog';
import { financeiroApi } from '@/features/financeiro/api/financeiroApi';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { httpClient } from '@/lib/http/httpClient';
import { OrigemFinanceira } from '@/types/erp';

// AC-3 (D86): o lançamento manual de conta a receber sai com origem Manual e sem vínculo. O teste
// renderiza o diálogo real, submete, e captura o body que o client real (`financeiroApi`) põe no
// POST — a mesma chamada que `contaReceberCreateMutation` faz em produção.

vi.mock('@/features/clientes/hooks/useClientesResources', () => ({ useClientes: vi.fn() }));
vi.mock('@/features/fornecedores/hooks/useFornecedoresResources', () => ({ useFornecedores: vi.fn() }));
vi.mock('@/features/pessoas/hooks/usePessoasResources', () => ({ usePessoas: vi.fn() }));

const empresaId = '11111111-1111-1111-1111-111111111111';
const clienteId = '22222222-2222-2222-2222-222222222222';
const pessoaId = '33333333-3333-3333-3333-333333333333';

// Empresa e cliente são selects por API; aqui viram controles simples para o teste escolher o
// vínculo. O que está sob prova é o payload do diálogo, não o componente de seleção.
vi.mock('@/components/forms/EmpresaFilialFields', () => ({
    EmpresaFilialFields: ({ onEmpresaChange }: { onEmpresaChange: (value: string | null) => void }) => (
        <button type="button" onClick={() => onEmpresaChange('11111111-1111-1111-1111-111111111111')}>
            Escolher empresa
        </button>
    )
}));
vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ id, value, options, onChange, disabled }: { id?: string; value?: string | null; options: { label: string; value: string }[]; onChange: (value: string | null) => void; disabled?: boolean }) => (
        <select id={id} aria-label="Cliente" value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Selecione</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));

type Capturado = { method?: string; url?: string; body: Record<string, unknown> };

describe('Financeiro — AC-3 — Lançamento manual de Contas a Receber envia origem Manual', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let capturados: Capturado[];

    beforeEach(() => {
        capturados = [];
        vi.mocked(useClientes).mockReturnValue({ data: [{ id: clienteId, codigo: 'CLI-001', pessoaId }], isLoading: false, isFetching: false } as never);
        vi.mocked(useFornecedores).mockReturnValue({ data: [], isLoading: false, isFetching: false } as never);
        vi.mocked(usePessoas).mockReturnValue({ data: [{ id: pessoaId, nomeRazaoSocial: 'Cliente Manual Ltda', nomeFantasia: null }], isLoading: false, isFetching: false } as never);
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            capturados.push({ method: config.method, url: config.url, body: JSON.parse(String(config.data ?? '{}')) });
            return { data: { id: '44444444-4444-4444-4444-444444444444' }, status: 201, statusText: 'Created', headers: {}, config };
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.clearAllMocks();
    });

    it('preenche cliente, documento e parcela; o POST /api/financeiro/contas-receber leva origem 1 (Manual) e nenhum origemId', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn((values: unknown) => financeiroApi.criarContaReceber(values));

        render(<ContaFinanceiraFormDialog type="receber" visible onHide={vi.fn()} onSubmit={onSubmit} />);

        const salvar = await screen.findByRole('button', { name: 'Salvar' });
        expect(salvar).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Escolher empresa' }));
        await user.selectOptions(screen.getByLabelText('Cliente'), clienteId);
        await user.type(screen.getByLabelText('Documento'), 'CR-MANUAL-001');
        const valorParcela = screen.getAllByRole('spinbutton').at(-1) as HTMLElement;
        // A parcela nasce com R$ 0,00; limpa antes de digitar, como a pessoa faria.
        await user.clear(valorParcela);
        await user.type(valorParcela, '150,00');
        await user.tab();

        await waitFor(() => expect(salvar).toBeEnabled());
        await user.click(salvar);

        await waitFor(() => expect(capturados).toHaveLength(1));
        const [request] = capturados;
        expect(request.method).toBe('post');
        expect(request.url).toBe('/api/financeiro/contas-receber');
        expect(request.body.origem).toBe(OrigemFinanceira.Manual);
        expect(request.body.origem).toBe(1);
        // O diálogo entrega origemId null; o schema de request (optionalGuidSchema) converte null em
        // ausente, então no fio o lançamento manual vai sem vínculo nenhum.
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ origem: OrigemFinanceira.Manual, origemId: null }));
        expect(request.body).not.toHaveProperty('origemId');
        // O vínculo preenchido chega; o que é manual é só a origem.
        expect(request.body.empresaId).toBe(empresaId);
        expect(request.body.clienteId).toBe(clienteId);
        expect(request.body.documento).toBe('CR-MANUAL-001');
        expect(request.body.parcelas).toEqual([expect.objectContaining({ numero: 1, valor: 150 })]);
    });
});
