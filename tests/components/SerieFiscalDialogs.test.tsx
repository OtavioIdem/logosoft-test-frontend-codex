import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SerieFiscalAmpliarDialog, SerieFiscalCriarDialog, SerieFiscalEncerrarDialog, SerieFiscalInativarDialog } from '@/features/fiscal/components/SerieFiscalDialogs';
import type { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';

vi.mock('primereact/dialog', () => ({ Dialog: ({ visible, header, children, footer }: any) => visible ? <section aria-label={header}><h2>{header}</h2>{children}{footer}</section> : null }));
vi.mock('primereact/button', () => ({ Button: ({ label, children, form, onClick, icon: _icon, text: _text, loading: _loading, ...props }: any) => <button {...props} onClick={(event) => { onClick?.(event); if (form) document.getElementById(form)?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }}>{label ?? children}</button> }));
vi.mock('primereact/message', () => ({ Message: ({ text }: any) => <p role="alert">{text}</p> }));
vi.mock('primereact/inputnumber', () => ({ InputNumber: ({ value, onValueChange, disabled, min, max }: any) => <input aria-label="Número" type="number" value={value ?? ''} disabled={disabled} min={min} max={max} onChange={(event) => onValueChange?.({ value: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })} /> }));
vi.mock('primereact/inputtextarea', () => ({ InputTextarea: ({ value, onChange, ...props }: any) => <textarea value={value} onChange={onChange} {...props} /> }));
vi.mock('@/components/forms/EmpresaFilialFields', () => ({ EmpresaFilialFields: ({ empresaId }: any) => <input aria-label="Empresa" value={empresaId} disabled readOnly /> }));
vi.mock('@/components/forms/EntitySelect', () => ({ EntitySelect: ({ entityName, options, value, onChange }: any) => <select aria-label={entityName} value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="" />{options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));
vi.mock('@/components/forms/FieldError', () => ({ FieldError: ({ message }: any) => message ? <p role="alert">{message}</p> : null }));
vi.mock('@/components/forms/DateInput', () => ({ DateInput: ({ value, onChange }: any) => <input aria-label="Data" type="date" value={value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : ''} onChange={(event) => onChange(event.currentTarget.value ? new Date(`${event.currentTarget.value}T12:00:00`) : null)} /> }));
vi.mock('@/features/fiscal/hooks/useModelosDocumentoFiscal', () => ({ useModelosDocumentoFiscal: vi.fn() }));

const modelos = vi.mocked(useModelosDocumentoFiscal) as any;
const serie: SerieFiscalResponse = { id: '44444444-4444-4444-4444-444444444444', empresaId: '11111111-1111-1111-1111-111111111111', filialId: null, modeloDocumentoFiscalId: '33333333-3333-3333-3333-333333333333', numero: 7, numeroInicial: 1, numeroFinal: 100, proximoNumero: 42, vigenciaInicio: '2026-01-01', vigenciaFim: null, ativa: true };

afterEach(() => vi.clearAllMocks());

describe('SerieFiscalDialogs — AC-9 a AC-12', () => {
    it('AC-9 mantém empresa no contexto, avisa filial vazia, restringe o modelo ativo e deixa o diálogo aberto no erro por código', () => {
        modelos.mockReturnValue({ data: { items: [{ id: serie.modeloDocumentoFiscalId, codigo: '55', descricao: 'NF-e', ativo: true }] }, isFetching: false });
        render(<SerieFiscalCriarDialog visible empresaId={serie.empresaId} error={{ code: 'FISCAL_SERIES_JA_EXISTE', message: 'Número já cadastrado' } as any} onHide={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByLabelText('Empresa')).toBeDisabled();
        expect(screen.getByText('Série sem filial só numera nota sem filial')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '55 — NF-e' })).toBeInTheDocument();
        expect(screen.getByText('Número já cadastrado')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cadastrar série fiscal' })).toBeInTheDocument();
    });

    it('AC-9 mostra erro geral do backend sem fechar o formulário quando o código não é de campo', () => {
        modelos.mockReturnValue({ data: { items: [] }, isFetching: false });
        render(<SerieFiscalCriarDialog visible empresaId={serie.empresaId} error={{ code: 'FISCAL_SERIES_VALIDACAO', message: 'Regra do agregado' } as any} onHide={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByText('Regra do agregado')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cadastrar série fiscal' })).toBeInTheDocument();
    });

    it('AC-10 mostra final/próximo e não submete redução da faixa', async () => {
        const submit = vi.fn();
        render(<SerieFiscalAmpliarDialog visible serie={serie} onHide={vi.fn()} onSubmit={submit} />);
        expect(screen.getAllByRole('spinbutton').slice(0, 2)).toSatisfy((inputs: HTMLInputElement[]) => inputs.every((input) => input.disabled));
        await userEvent.clear(screen.getAllByRole('spinbutton')[2]);
        await userEvent.type(screen.getAllByRole('spinbutton')[2], '99');
        await userEvent.click(screen.getByRole('button', { name: 'Ampliar' }));
        expect(screen.getByRole('alert')).toHaveTextContent('maior ou igual');
        expect(submit).not.toHaveBeenCalled();
    });

    it('AC-11 envia DateOnly e informa que a vigência pode ser redefinida', async () => {
        const submit = vi.fn();
        render(<SerieFiscalEncerrarDialog visible serie={serie} onHide={vi.fn()} onSubmit={submit} />);
        expect(screen.getByText('Enquanto a série estiver ativa, esta data de encerramento pode ser redefinida depois.')).toBeInTheDocument();
        const data = screen.getByLabelText('Data');
        await userEvent.clear(data);
        await userEvent.type(data, '2026-01-02');
        await userEvent.click(screen.getByRole('button', { name: 'Encerrar vigência' }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith('2026-01-02'));
    });

    it('AC-12 exige motivo válido, preserva o limite de 464 e só confirma com corpo sanitizado', async () => {
        const submit = vi.fn();
        render(<SerieFiscalInativarDialog visible serie={serie} onHide={vi.fn()} onSubmit={submit} />);
        expect(screen.getByRole('heading', { name: 'Inativar série fiscal 7 (definitivo)' })).toBeInTheDocument();
        expect(screen.getByText('A inativação é definitiva: este número de série não poderá ser reaberto.')).toBeInTheDocument();
        const motivo = screen.getByLabelText('Motivo obrigatório');
        expect(motivo).toHaveAttribute('maxlength', '464');
        await userEvent.type(motivo, '  série substituída  ');
        await userEvent.click(screen.getByRole('button', { name: 'Inativar' }));
        await waitFor(() => expect(submit).toHaveBeenCalledWith('série substituída'));
    });
});
