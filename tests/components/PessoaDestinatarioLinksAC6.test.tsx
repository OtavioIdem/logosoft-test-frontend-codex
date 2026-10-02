import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotaFiscalErroCadastroPanel } from '@/features/fiscal/components/NotaFiscalErroCadastroPanel';
import { PESSOA_DESTINATARIO_ERRO_CODES, PESSOA_DESTINATARIO_LINK } from '@/features/pessoas/components/pessoaFiscalLabels';
import { AuthContext } from '@/providers/AuthProvider';
import { PermissionCode } from '@/types/erp';
import { AuthContextValue } from '@/features/auth/types/auth.types';

// b75 (D104, AC-6) — os 4 códigos `Fiscal.DestinatarioSem*` no painel da nota, com o painel, a ação, o mapa D50 e o
// `usePermissions` REAIS; a sessão entra pelo `AuthContext` real. O link leva à LISTA `/pessoas`, sem id (B-38), e só
// aparece para PESSOAS_GERENCIAR. Dublado só o `next/link` (sem roteador no jsdom), como no teste do painel.

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a> }));

const authValue = (permissoes: PermissionCode[]): AuthContextValue => ({
    user: { id: 'u1', nome: 'Operador', email: 'operador@teste.local', permissoes },
    isAuthenticated: true,
    isLoading: false,
    authStatus: 'authenticated',
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    refreshUserFromStorage: vi.fn(),
    retrySession: vi.fn()
});

const renderPainel = (code: string, permissoes: PermissionCode[]) =>
    render(
        <AuthContext.Provider value={authValue(permissoes)}>
            <NotaFiscalErroCadastroPanel erro={{ code, message: `Mensagem do backend para ${code}.` }} />
        </AuthContext.Provider>
    );

const linkPessoas = () => screen.queryByRole('link', { name: PESSOA_DESTINATARIO_LINK.rotuloLink });

describe('AC-6: links DestinatarioSem* para /pessoas', () => {
    it('os 4 códigos da D104 são exatamente os esperados', () => {
        expect([...PESSOA_DESTINATARIO_ERRO_CODES]).toEqual(['Fiscal.DestinatarioSemEnderecoFiscal', 'Fiscal.DestinatarioSemEnderecoPrincipal', 'Fiscal.DestinatarioSemMunicipioIbge', 'Fiscal.DestinatarioSemIndicadorContribuinteIcms']);
    });

    it.each([...PESSOA_DESTINATARIO_ERRO_CODES])('%s com PESSOAS_GERENCIAR: título, mensagem do backend e link para a lista /pessoas', (code) => {
        renderPainel(code, ['PESSOAS_GERENCIAR']);
        const titulo = PESSOA_DESTINATARIO_LINK.porCodigo[code as keyof typeof PESSOA_DESTINATARIO_LINK.porCodigo].titulo;
        expect(screen.getByText(`${titulo}: Mensagem do backend para ${code}.`)).toBeInTheDocument();
        expect(linkPessoas()).toHaveAttribute('href', '/pessoas');
        expect(screen.queryByText(PESSOA_DESTINATARIO_LINK.semPermissaoTexto)).not.toBeInTheDocument();
    });

    it.each([...PESSOA_DESTINATARIO_ERRO_CODES])('%s sem PESSOAS_GERENCIAR (só consultar e cadastros fiscais): sem link, com o motivo', (code) => {
        renderPainel(code, ['PESSOAS_CONSULTAR', 'PESSOAS_DADOS_FISCAIS_GERENCIAR', 'FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR']);
        expect(linkPessoas()).not.toBeInTheDocument();
        expect(screen.getByText(PESSOA_DESTINATARIO_LINK.semPermissaoTexto)).toBeInTheDocument();
    });

    it.each(['Fiscal.DestinatarioSemPessoaVinculada', 'Fiscal.DestinatarioMunicipioUfDivergente', 'Fiscal.DestinatarioEnderecoFiscalIncompleto', 'PESSOAS_VALIDACAO'])('outro código (%s) não mostra painel nem link, mesmo com PESSOAS_GERENCIAR', (code) => {
        const { container } = renderPainel(code, ['PESSOAS_GERENCIAR']);
        expect(linkPessoas()).not.toBeInTheDocument();
        expect(container).toBeEmptyDOMElement();
    });
});
