import { AuthSession, CurrentUser } from '@/types/erp';
import { ApiError } from '@/types/erp';
import type { RefreshSessionResponse } from '@/features/auth/api/authResponseMapper';

/**
 * O login carrega apenas credenciais. A empresa deixou de ser informada na tela: o backend resolve o vínculo
 * do usuário e valida a licença do cliente a partir das credenciais autenticadas.
 */
export type LoginRequest = {
    email: string;
    password: string;
};

export type LoginPayload = {
    email: string;
    password: string;
};

export type LoginResponse = AuthSession;

export type AuthContextValue = {
    user: CurrentUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    authStatus: 'loading' | 'authenticated' | 'anonymous' | 'error';
    authError: ApiError | null;
    login: (payload: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<RefreshSessionResponse | null>;
    refreshUserFromStorage: () => void;
    retrySession: () => Promise<void>;
};
