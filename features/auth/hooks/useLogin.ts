'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '@/types/erp';
import { mapApiError } from '@/lib/http/apiError';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LoginFormValues } from '@/features/auth/schemas/loginSchema';

const normalizeLoginError = (error: unknown): ApiError => {
    const apiError = mapApiError(error);

    return {
        ...apiError,
        message: apiError.message || 'Não foi possível autenticar. Revise os dados informados e tente novamente.'
    };
};

export const useLogin = () => {
    const { login } = useAuth();
    const [apiError, setApiError] = useState<ApiError | null>(null);

    const clearApiError = useCallback(() => setApiError(null), []);

    const submitLogin = useCallback(
        async (values: LoginFormValues) => {
            setApiError(null);

            try {
                await login({
                    email: values.email,
                    password: values.senha
                });
                return true;
            } catch (error) {
                setApiError(normalizeLoginError(error));
                return false;
            }
        },
        [login]
    );

    return {
        apiError,
        clearApiError,
        submitLogin
    };
};
