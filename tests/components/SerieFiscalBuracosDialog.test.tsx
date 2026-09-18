import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SerieFiscalBuracosDialog } from '@/features/fiscal/components/SerieFiscalBuracosDialog';
import type { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useSerieFiscalBuracos } from '@/features/fiscal/hooks/useSeriesFiscais';

vi.mock('next/link', () => ({ default: ({ href, children }: any) => <a href={href}>{children}</a> }));
vi.mock('primereact/dialog', () => ({ Dialog: ({ visible, header, children, footer }: any) => visible ? <section aria-label={header}><h2>{header}</h2>{children}{footer}</section> : null }));
vi.mock('primereact/button', () => ({ Button: ({ label, children, icon: _icon, text: _text, loading: _loading, ...props }: any) => <button {...props}>{label ?? children}</button> }));
vi.mock('primereact/message', () => ({ Message: ({ text }: any) => <p role="alert">{text}</p> }));
vi.mock('primereact/column', () => ({ Column: () => null }));
vi.mock('@/components/data/DataTableServer', () => ({ DataTableServer: ({ value, rows, totalRecords }: any) => <><p>{`Linhas: ${value.map((item: any) => item.faixa).join(', ')}`}</p><p>{`Paginação: ${rows}/${totalRecords}`}</p></> }));
vi.mock('@/components/feedback/ApiErrorPanel', () => ({ ApiErrorPanel: () => <p role="alert">Erro ao consultar</p> }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));
vi.mock('@/features/fiscal/hooks/useSeriesFiscais', () => ({ useSerieFiscalBuracos: vi.fn() }));

const usePermissoes = vi.mocked(usePermissions) as any;
const useBuracos = vi.mocked(useSerieFiscalBuracos) as any;
const serie: SerieFiscalResponse = { id: '44444444-4444-4444-4444-444444444444', empresaId: '11111111-1111-1111-1111-111111111111', filialId: null, modeloDocumentoFiscalId: '33333333-3333-3333-3333-333333333333', numero: 7, numeroInicial: 1, numeroFinal: 2000, proximoNumero: 10, vigenciaInicio: '2026-01-01', vigenciaFim: null, ativa: true };

afterEach(() => vi.clearAllMocks());

describe('SerieFiscalBuracosDialog — AC-13', () => {
    it('mantém consulta sob demanda: não chama refetch no render e chama uma vez no clique', async () => {
        const refetch = vi.fn();
        usePermissoes.mockReturnValue({ hasPermission: () => false });
        useBuracos.mockReturnValue({ data: undefined, error: null, isFetching: false, refetch });
        render(<SerieFiscalBuracosDialog visible serie={serie} onHide={vi.fn()} />);
        expect(refetch).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: 'Consultar buracos' }));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('compacta faixas, informa último alocado/total e conserva o aviso operacional', () => {
        usePermissoes.mockReturnValue({ hasPermission: () => false });
        useBuracos.mockReturnValue({ data: { serieFiscalId: serie.id, numero: 7, numeroInicial: 1, ultimoNumeroAlocado: 9, numerosSemDocumentoAutorizado: [3, 4, 5, 9] }, error: null, isFetching: false, refetch: vi.fn() });
        render(<SerieFiscalBuracosDialog visible serie={serie} onHide={vi.fn()} />);
        expect(screen.getByText('Notas em andamento (ainda não autorizadas ou canceladas) aparecem como buraco até serem concluídas.')).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('Linhas: 3–5, 9')).toBeInTheDocument();
        expect(screen.getByText('Paginação: 20/2')).toBeInTheDocument();
    });

    it('mostra estado de nenhum alocado e Sem buracos sem expor tabela vazia', () => {
        usePermissoes.mockReturnValue({ hasPermission: () => false });
        useBuracos.mockReturnValue({ data: { serieFiscalId: serie.id, numero: 7, numeroInicial: 1, ultimoNumeroAlocado: 0, numerosSemDocumentoAutorizado: [] }, error: null, isFetching: false, refetch: vi.fn() });
        render(<SerieFiscalBuracosDialog visible serie={serie} onHide={vi.fn()} />);
        expect(screen.getByText('Nenhum número alocado ainda')).toBeInTheDocument();
        expect(screen.queryByText('Sem buracos')).not.toBeInTheDocument();
    });

    it('corta em 1000 faixas e avisa a quantidade real, com link sem parâmetros só para FISCAL_INUTILIZAR', () => {
        const numeros = Array.from({ length: 1001 }, (_, index) => index * 2 + 1);
        usePermissoes.mockReturnValue({ hasPermission: (permission: string) => permission === 'FISCAL_INUTILIZAR' });
        useBuracos.mockReturnValue({ data: { serieFiscalId: serie.id, numero: 7, numeroInicial: 1, ultimoNumeroAlocado: 2001, numerosSemDocumentoAutorizado: numeros }, error: null, isFetching: false, refetch: vi.fn() });
        render(<SerieFiscalBuracosDialog visible serie={serie} onHide={vi.fn()} />);
        expect(screen.getByText('Exibindo as primeiras 1000 faixas. O intervalo tem 1001 faixas e 1001 números no total.')).toBeInTheDocument();
        expect(screen.getByText('Paginação: 20/1000')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ir para Inutilizações' })).toHaveAttribute('href', '/fiscal/inutilizacoes');
    });
});
