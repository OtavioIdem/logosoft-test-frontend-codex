import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotaFiscalErroCadastroPanel } from '@/features/fiscal/components/NotaFiscalErroCadastroPanel';
import { fiscalErrosCadastroMap, resolveFiscalErroCadastroLink } from '@/features/fiscal/components/fiscalErrosCadastro';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

vi.mock('next/link', () => ({ default: ({ href, children }: any) => <a href={href}>{children}</a> }));
vi.mock('primereact/button', () => ({ Button: ({ label }: any) => <span>{label}</span> }));
vi.mock('primereact/message', () => ({ Message: ({ text }: any) => <p role="alert">{text}</p> }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));

const usePermissoes = vi.mocked(usePermissions) as any;
const codigoSerie = 'Fiscal.SerieFiscalNaoCadastradaParaContexto';

afterEach(() => vi.clearAllMocks());

describe('NotaFiscalErroCadastroPanel — AC-16', () => {
    it('abre somente para o código D50, preserva a mensagem do backend e fornece link a quem pode cadastrar', () => {
        usePermissoes.mockReturnValue({ hasAnyPermission: (permissions: string[]) => permissions.includes('FISCAL_SERIES_CONSULTAR') });
        render(<NotaFiscalErroCadastroPanel erro={{ code: codigoSerie, message: 'Não há série 7 ativa para a filial.' } as any} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Série fiscal não cadastrada para este contexto: Não há série 7 ativa para a filial.');
        expect(screen.getByRole('link', { name: 'Cadastrar série fiscal' })).toHaveAttribute('href', '/fiscal/series');
    });

    it('sem qualquer permissão de séries mantém a orientação, mas não torna o cadastro alcançável', () => {
        usePermissoes.mockReturnValue({ hasAnyPermission: () => false });
        render(<NotaFiscalErroCadastroPanel erro={{ code: codigoSerie, message: 'Mensagem do backend' } as any} />);
        expect(screen.getByText('Peça a alguém com permissão de séries fiscais para cadastrar a série usada neste contexto.')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Cadastrar série fiscal' })).not.toBeInTheDocument();
    });

    it('não abre para outros códigos e some quando o erro é limpo após validar com sucesso', () => {
        usePermissoes.mockReturnValue({ hasAnyPermission: () => true });
        const view = render(<NotaFiscalErroCadastroPanel erro={{ code: 'Fiscal.SerieNotaFiscalInvalidaParaNumeracao', message: 'Outro erro' } as any} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        view.rerender(<NotaFiscalErroCadastroPanel erro={{ code: codigoSerie, message: 'Erro D50' } as any} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Erro D50');
        view.rerender(<NotaFiscalErroCadastroPanel erro={null} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('o mapa é indexado exclusivamente pelo código, não pelo texto da mensagem', () => {
        expect(Object.keys(fiscalErrosCadastroMap)).toEqual([codigoSerie]);
        expect(resolveFiscalErroCadastroLink(codigoSerie)).toMatchObject({ href: '/fiscal/series' });
        expect(resolveFiscalErroCadastroLink('Fiscal.CfopSemMapeamentoParaAmbito')).toBeNull();
        expect(resolveFiscalErroCadastroLink('Não há série 7 ativa para a filial.')).toBeNull();
    });
});
