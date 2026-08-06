import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { ApiError } from '@/types/erp';

const loginState = vi.hoisted(() => ({
    apiError: null as ApiError | null,
    clearApiError: vi.fn(),
    submitLogin: vi.fn()
}));

vi.mock('@/features/auth/hooks/useLogin', () => ({
    useLogin: () => loginState
}));

vi.mock('next/image', () => ({
    default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" />
}));

vi.mock('@/config/app', () => ({
    appConfig: {
        name: 'logosoft',
        version: '1.11.0a7',
        env: 'production',
        apiUrl: 'http://localhost:8080'
    }
}));

describe('LoginForm', () => {
    beforeEach(() => {
        loginState.apiError = null;
        loginState.clearApiError.mockClear();
        loginState.submitLogin.mockReset();
        loginState.submitLogin.mockResolvedValue(true);
    });

    it('renderiza login corporativo sem expor identificador tecnico', () => {
        render(<LoginForm />);

        expect(screen.getByRole('heading', { name: 'Bem-vindo ao logosoft' })).toBeInTheDocument();
        expect(screen.getByText('Acesse sua operação empresarial com segurança')).toBeInTheDocument();
        expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
        expect(screen.getByLabelText('Senha')).toBeInTheDocument();
        // A empresa é resolvida pelo backend junto da validação de licença: a tela não pergunta mais.
        expect(screen.queryByLabelText(/empresa/i)).not.toBeInTheDocument();
        // `\b` de propósito: o subtítulo institucional fala em "operação empresarial" e não é o campo.
        expect(screen.queryByText(/empresa\b/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Filial')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Ambiente Produção')).toBeInTheDocument();
        expect(screen.queryByText(/guid/i)).not.toBeInTheDocument();
    });

    it('valida campos obrigatorios antes de enviar', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.click(screen.getByRole('button', { name: /entrar/i }));

        expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
        expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
        expect(loginState.submitLogin).not.toHaveBeenCalled();
    });

    it('envia os campos do formulario para o hook de login', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByLabelText('E-mail'), 'usuario@erp.local');
        await user.type(screen.getByLabelText('Senha'), 'Senha@2026!');
        await user.click(screen.getByRole('button', { name: /entrar/i }));

        expect(loginState.submitLogin).toHaveBeenCalledWith({
            email: 'usuario@erp.local',
            senha: 'Senha@2026!'
        });
    });

    it('exibe erro inline via ApiErrorPanel', () => {
        loginState.apiError = { message: 'Credenciais inválidas.' };

        render(<LoginForm />);

        expect(screen.getByText('Credenciais inválidas.')).toBeInTheDocument();
    });
});

describe('LoginPage', () => {
    it('renderiza layout dividido com painel institucional configuravel', () => {
        render(<LoginPage />);

        expect(screen.getByLabelText('Login logosoft')).toBeInTheDocument();
        expect(screen.getByTestId('login-brand-panel')).toBeInTheDocument();
    });
});
