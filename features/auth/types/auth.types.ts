import { AuthSession, CurrentUser } from '@/types/erp';
import type { RefreshSessionResponse } from '@/features/auth/api/authResponseMapper';

export type LoginRequest = {
    email: string;
    password: string;
    empresaId?: string;
    filialId?: string;
};

export type LoginPayload = {
    email: string;
    password: string;
    empresaId?: string;
    filialId?: string;
};

export type LoginResponse = AuthSession;

export type AuthContextValue = {
    user: CurrentUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (payload: LoginRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<RefreshSessionResponse | null>;
    refreshUserFromStorage: () => void;
};
