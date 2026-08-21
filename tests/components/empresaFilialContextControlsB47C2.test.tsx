import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({ useFiliaisOptions: vi.fn() }));
vi.mock('@/components/forms/EmpresaSelect', () => ({ EmpresaSelect: ({ value, disabled }: { value?: string | null; disabled?: boolean }) => <button type="button" data-testid="empresa" disabled={disabled}>{value ?? 'empresa-vazia'}</button> }));
vi.mock('@/components/forms/FilialSelect', () => ({ FilialSelect: ({ empresaId, disabled }: { empresaId?: string | null; disabled?: boolean }) => <button type="button" data-testid="filial" disabled={disabled}>{empresaId ?? 'filial-sem-empresa'}</button> }));
vi.mock('primereact/message', () => ({ Message: ({ text }: { text: string }) => <div role="status">{text}</div> }));

const mockedContext = vi.mocked(useOrganizationalContext);
const mockedFiliais = vi.mocked(useFiliaisOptions);
const empresaAtiva = '11111111-1111-1111-1111-111111111111';
const filialA = '22222222-2222-2222-2222-222222222222';
const filialB = '33333333-3333-3333-3333-333333333333';
const filiaisQuery = { data: [], options: [], isLoading: false, isFetching: false, isFetched: true, isError: false, blocked: false } as unknown as ReturnType<typeof useFiliaisOptions>;
const filiaisQueryWithChoices = {
    ...filiaisQuery,
    data: [{ id: filialA, empresaId: empresaAtiva, nome: 'Filial A', documento: '' }, { id: filialB, empresaId: empresaAtiva, nome: 'Filial B', documento: '' }]
} as unknown as ReturnType<typeof useFiliaisOptions>;

const contextValue = (empresaId: string | null, isGlobal: boolean, filialId: string | null = null, revision = 1) => ({
    snapshot: { empresaId, filialId, isMaster: isGlobal, revision },
    isGlobal,
    canChangeOrganization: isGlobal,
    requiresOrganizationSelection: isGlobal,
    empresaId,
    filialId,
    organizationalScopeKey: 'scope',
    setEmpresaId: vi.fn(),
    setFilialId: vi.fn()
} as ReturnType<typeof useOrganizationalContext>);

describe('controles empresa/filial B47.c2', () => {
    beforeEach(() => {
        mockedFiliais.mockReturnValue(filiaisQuery);
    });

    it('bloqueia empresa local no filtro global e orienta o diálogo do topbar', () => {
        mockedContext.mockReturnValue(contextValue(null, true));
        render(<EmpresaFilialFilter empresaId={empresaAtiva} filialId={null} onEmpresaChange={vi.fn()} onFilialChange={vi.fn()} />);

        expect(screen.getByTestId('empresa')).toBeDisabled();
        expect(screen.getByTestId('empresa')).toHaveTextContent('empresa-vazia');
        expect(screen.getByRole('status')).toHaveTextContent('Selecionar contexto');
        expect(screen.getByRole('button', { name: /selecionar contexto/i })).toBeEnabled();
    });

    it('usa a empresa ativa do contexto e bloqueia os campos do formulário sem contexto', () => {
        mockedContext.mockReturnValue(contextValue(null, true));
        mockedFiliais.mockReturnValue({ data: [], options: [], isLoading: false, isFetching: false, blocked: true } as unknown as ReturnType<typeof useFiliaisOptions>);
        render(<EmpresaFilialFields empresaId={empresaAtiva} filialId={null} onEmpresaChange={vi.fn()} onFilialChange={vi.fn()} />);

        expect(screen.getByTestId('empresa')).toBeDisabled();
        expect(screen.getByTestId('filial')).toBeDisabled();
        expect(screen.getByRole('status')).toHaveTextContent('Selecionar contexto');
        expect(screen.getByRole('button', { name: /selecionar contexto/i })).toBeEnabled();
    });

    it('ignora empresa local quando existe contexto ativo', () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, false));
        render(<EmpresaFilialFilter empresaId="22222222-2222-2222-2222-222222222222" filialId={null} onEmpresaChange={vi.fn()} onFilialChange={vi.fn()} />);

        expect(screen.getByTestId('empresa')).toHaveTextContent(empresaAtiva);
        expect(screen.getByTestId('empresa')).toBeDisabled();
    });

    it('hidrata o filtro controlado, preserva a empresa ativa e não repete callback em rerender', async () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, false));
        const StateHarness = () => {
            const [values, setValues] = useState({ empresaId: '', filialId: null as string | null });
            const empresaCalls = useRef(0);
            return (
                <>
                    <EmpresaFilialFilter
                        empresaId={values.empresaId}
                        filialId={values.filialId}
                        onEmpresaChange={(value) => { empresaCalls.current += 1; setValues((current) => ({ ...current, empresaId: value ?? '' })); }}
                        onFilialChange={(value) => setValues((current) => ({ ...current, filialId: value }))}
                    />
                    <output aria-label="filtro empresa">{values.empresaId}</output>
                    <output aria-label="quantidade callbacks">{empresaCalls.current}</output>
                </>
            );
        };

        const view = render(<StateHarness />);
        expect(await screen.findByLabelText('filtro empresa')).toHaveTextContent(empresaAtiva);
        expect(screen.getByLabelText('quantidade callbacks')).toHaveTextContent('1');
        view.rerender(<StateHarness />);
        await waitFor(() => expect(screen.getByLabelText('quantidade callbacks')).toHaveTextContent('1'));
    });

    it('hidrata empresa controlada do formulário e mantém payload alinhado ao contexto', async () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, false));
        mockedFiliais.mockReturnValue(filiaisQuery);
        const StateHarness = () => {
            const [values, setValues] = useState({ empresaId: '', filialId: null as string | null });
            const empresaCalls = useRef(0);
            return (
                <>
                    <EmpresaFilialFields
                        empresaId={values.empresaId}
                        filialId={values.filialId}
                        onEmpresaChange={(value) => { empresaCalls.current += 1; setValues((current) => ({ ...current, empresaId: value ?? '' })); }}
                        onFilialChange={(value) => setValues((current) => ({ ...current, filialId: value }))}
                    />
                    <output aria-label="payload">{JSON.stringify(values)}</output>
                    <output aria-label="quantidade callbacks">{empresaCalls.current}</output>
                </>
            );
        };

        const view = render(<StateHarness />);
        expect(await screen.findByLabelText('payload')).toHaveTextContent(JSON.stringify({ empresaId: empresaAtiva, filialId: null }));
        expect(screen.getByLabelText('quantidade callbacks')).toHaveTextContent('1');
        view.rerender(<StateHarness />);
        await waitFor(() => expect(screen.getByLabelText('quantidade callbacks')).toHaveTextContent('1'));
    });

    it('preserva a filial B escolhida pelo consumidor quando o snapshot da empresa não fixa filial', async () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, false, null, 7));
        mockedFiliais.mockReturnValue(filiaisQueryWithChoices);
        const StateHarness = () => {
            const [values, setValues] = useState({ empresaId: '', filialId: null as string | null });
            const filialCalls = useRef(0);
            const onFilialChange = (value: string | null) => { filialCalls.current += 1; setValues((current) => ({ ...current, filialId: value })); };
            return (
                <>
                    <EmpresaFilialFilter
                        empresaId={values.empresaId}
                        filialId={values.filialId}
                        onEmpresaChange={(value) => setValues((current) => ({ ...current, empresaId: value ?? '' }))}
                        onFilialChange={onFilialChange}
                    />
                    <button type="button" onClick={() => onFilialChange(filialB)}>Escolher filial B</button>
                    <output aria-label="filial filtro">{values.filialId ?? ''}</output>
                    <output aria-label="callbacks filial">{filialCalls.current}</output>
                </>
            );
        };

        const view = render(<StateHarness />);
        await screen.findByLabelText('filial filtro');
        await userEvent.setup().click(screen.getByRole('button', { name: 'Escolher filial B' }));
        expect(screen.getByLabelText('filial filtro')).toHaveTextContent(filialB);
        view.rerender(<StateHarness />);
        await waitFor(() => expect(screen.getByLabelText('filial filtro')).toHaveTextContent(filialB));
        expect(screen.getByLabelText('callbacks filial')).toHaveTextContent('1');
    });

    it('preserva a filial B escolhida no formulário após hidratação inicial da filial A', async () => {
        mockedContext.mockReturnValue(contextValue(empresaAtiva, false, filialA, 8));
        mockedFiliais.mockReturnValue(filiaisQueryWithChoices);
        const StateHarness = () => {
            const [values, setValues] = useState({ empresaId: empresaAtiva, filialId: null as string | null });
            const filialCalls = useRef(0);
            const onFilialChange = (value: string | null) => { filialCalls.current += 1; setValues((current) => ({ ...current, filialId: value })); };
            return (
                <>
                    <EmpresaFilialFields
                        empresaId={values.empresaId}
                        filialId={values.filialId}
                        onEmpresaChange={(value) => setValues((current) => ({ ...current, empresaId: value ?? '' }))}
                        onFilialChange={onFilialChange}
                    />
                    <button type="button" onClick={() => onFilialChange(filialB)}>Escolher filial B</button>
                    <output aria-label="filial formulário">{values.filialId ?? ''}</output>
                    <output aria-label="callbacks filial formulário">{filialCalls.current}</output>
                </>
            );
        };

        const view = render(<StateHarness />);
        await waitFor(() => expect(screen.getByLabelText('filial formulário')).toHaveTextContent(filialA));
        await userEvent.setup().click(screen.getByRole('button', { name: 'Escolher filial B' }));
        expect(screen.getByLabelText('filial formulário')).toHaveTextContent(filialB);
        view.rerender(<StateHarness />);
        await waitFor(() => expect(screen.getByLabelText('filial formulário')).toHaveTextContent(filialB));
        expect(screen.getByLabelText('callbacks filial formulário')).toHaveTextContent('2');
    });
});
