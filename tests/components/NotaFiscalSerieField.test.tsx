import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotaFiscalSerieField } from '@/features/fiscal/components/NotaFiscalSerieField';
import { TipoDocumentoFiscal } from '@/types/erp';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';
import { useSeriesFiscaisOpcoes } from '@/features/fiscal/hooks/useSeriesFiscais';

vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));
vi.mock('@/features/fiscal/hooks/useModelosDocumentoFiscal', () => ({ useModelosDocumentoFiscal: vi.fn() }));
vi.mock('@/features/fiscal/hooks/useSeriesFiscais', () => ({ useSeriesFiscaisOpcoes: vi.fn() }));

const mockedUsePermissions = vi.mocked(usePermissions) as any;
const mockedUseModelos = vi.mocked(useModelosDocumentoFiscal) as any;
const mockedUseOpcoes = vi.mocked(useSeriesFiscaisOpcoes) as any;
const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const modeloId = '33333333-3333-3333-3333-333333333333';
const permissoes = (combo: boolean) => ({ hasPermission: vi.fn(), hasAnyPermission: vi.fn(), hasAllPermissions: vi.fn(() => combo) });
const modelos = { data: { items: [{ id: modeloId, codigo: '55', descricao: 'NF-e', sigla: 'NFE', ativo: true }], totalItems: 1 }, isFetching: false };
const opcoes = { data: { items: [{ id: '44444444-4444-4444-4444-444444444444', empresaId, filialId: null, modeloDocumentoFiscalId: modeloId, numero: 7, numeroInicial: 1, numeroFinal: 99, proximoNumero: 3, vigenciaInicio: '2026-01-01', vigenciaFim: null, ativa: true }] }, isFetching: false };

describe('NotaFiscalSerieField — AC-15', () => {
    beforeEach(() => {
        mockedUsePermissions.mockReturnValue(permissoes(true));
        mockedUseModelos.mockReturnValue(modelos as ReturnType<typeof useModelosDocumentoFiscal>);
        mockedUseOpcoes.mockReturnValue(opcoes as ReturnType<typeof useSeriesFiscaisOpcoes>);
    });

    it('usa Dropdown e consulta opções ativas no escopo da nota, sem pré-seleção', () => {
        render(<NotaFiscalSerieField value="" onChange={vi.fn()} empresaId={empresaId} filialId={filialId} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        expect(screen.getByRole('button', { name: /buscar série/i })).toBeInTheDocument();
        expect(mockedUseModelos).toHaveBeenCalledWith({ codigo: '55', ativo: true, tamanhoPagina: 1 }, true);
        expect(mockedUseOpcoes).toHaveBeenCalledWith({ empresaId, filialId, modeloDocumentoFiscalId: modeloId, habilitado: true });
        expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('sem filial remove opções vinculadas a filial antes de apresentar o combo', async () => {
        mockedUseOpcoes.mockReturnValue({ ...opcoes, data: { items: [...opcoes.data.items, { ...opcoes.data.items[0], id: '55555555-5555-5555-5555-555555555555', filialId }] } } as ReturnType<typeof useSeriesFiscaisOpcoes>);
        const user = userEvent.setup();
        render(<NotaFiscalSerieField value="" onChange={vi.fn()} empresaId={empresaId} filialId={null} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        await user.click(screen.getByRole('button', { name: /buscar série/i }));
        expect(screen.getAllByText(/Série 7/)).toHaveLength(1);
    });

    it('sem opções mostra aviso e link nominal para o cadastro, mantendo texto livre como contingência', () => {
        mockedUseOpcoes.mockReturnValue({ data: { items: [] }, isFetching: false });
        render(<NotaFiscalSerieField value="" onChange={vi.fn()} empresaId={empresaId} filialId={null} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        expect(screen.getByRole('link', { name: /cadastrar série fiscal/i })).toHaveAttribute('href', '/fiscal/series');
        expect(screen.getByPlaceholderText('Informe manualmente')).toBeInTheDocument();
    });

    it('limpa a seleção quando empresa, filial ou tipo de documento muda', () => {
        const onChange = vi.fn();
        const view = render(<NotaFiscalSerieField value="7" onChange={onChange} empresaId={empresaId} filialId={filialId} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        view.rerender(<NotaFiscalSerieField value="7" onChange={onChange} empresaId="99999999-9999-9999-9999-999999999999" filialId={filialId} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        expect(onChange).toHaveBeenCalledWith('');
    });

    it('sem as duas permissões mantém InputText com padrão recebido, dica e zero consulta habilitada', async () => {
        mockedUsePermissions.mockReturnValue(permissoes(false));
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<NotaFiscalSerieField value="1" onChange={onChange} empresaId={empresaId} filialId={filialId} tipoDocumento={TipoDocumentoFiscal.NFe} />);
        const campo = screen.getByRole('textbox');
        expect(campo).toHaveValue('1');
        expect(screen.getByText(/FISCAL_SERIES_CONSULTAR.*FISCAL_MODELOS_CONSULTAR/i)).toBeInTheDocument();
        expect(mockedUseOpcoes).toHaveBeenCalledWith(expect.objectContaining({ habilitado: false }));
        await user.clear(campo);
        await user.type(campo, '12');
        expect(onChange).toHaveBeenLastCalledWith('12');
    });

    it('aguardando pedido bloqueia o combo e explica o motivo', () => {
        render(<NotaFiscalSerieField value="" onChange={vi.fn()} empresaId={empresaId} filialId={filialId} tipoDocumento={TipoDocumentoFiscal.NFe} aguardandoPedido />);
        expect(screen.getByRole('textbox')).toBeDisabled();
        expect(screen.getAllByText(/Selecione o pedido/i).length).toBeGreaterThan(0);
        expect(mockedUseOpcoes).toHaveBeenCalledWith(expect.objectContaining({ habilitado: false }));
    });
});
