import { vi } from 'vitest';
import { ApiError } from '@/types/erp';

export class MockAuthApiClientError extends Error {
    apiError: ApiError;

    constructor(apiError: ApiError) {
        super(apiError.message);
        this.name = 'AuthApiClientError';
        this.apiError = apiError;
    }
}

export const authApiMock = {
    login: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    logout: vi.fn()
};

export const authApi = authApiMock;
export { MockAuthApiClientError as AuthApiClientError };

export const routerMock = {
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
};
