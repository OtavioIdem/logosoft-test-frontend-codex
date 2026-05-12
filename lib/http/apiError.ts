import { AxiosError, isAxiosError } from 'axios';
import { ApiError, ApiResult, AspNetValidationError } from '@/types/erp';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const isStringArrayRecord = (value: unknown): value is Record<string, string[]> => {
    if (!isRecord(value)) {
        return false;
    }

    return Object.values(value).every((item) => Array.isArray(item) && item.every((message) => typeof message === 'string'));
};

const isAspNetValidationError = (value: unknown): value is AspNetValidationError => {
    if (!isRecord(value)) {
        return false;
    }

    return typeof value.status === 'number' && isStringArrayRecord(value.errors);
};

const isApiResult = (value: unknown): value is ApiResult<unknown> => isRecord(value) && typeof value.success === 'boolean';

const mapFieldErrors = (errors: Record<string, string[]>) =>
    Object.entries(errors).map(([field, messages]) => ({
        field,
        message: messages.join(' ')
    }));

const getFirstFieldErrorMessage = (errors: Record<string, string[]>) => {
    const first = Object.values(errors).flat().find((message) => message.trim().length > 0);
    return first ?? 'Verifique os campos informados e tente novamente.';
};

const statusMessage = (status?: number) => {
    if (!status) {
        return 'Não foi possível conectar à API. Verifique a URL configurada e tente novamente.';
    }

    if (status === 401) {
        return 'Sessão não autenticada ou expirada.';
    }

    if (status === 403) {
        return 'Você não possui permissão para executar esta operação.';
    }

    if (status === 404) {
        return 'Recurso não encontrado.';
    }

    if (status >= 500) {
        return 'Erro interno no servidor. Tente novamente mais tarde.';
    }

    return 'Não foi possível concluir a operação.';
};

const mapResponseData = (data: unknown, status?: number): ApiError | null => {
    if (isAspNetValidationError(data)) {
        return {
            status: data.status,
            message: getFirstFieldErrorMessage(data.errors),
            fieldErrors: data.errors,
            validationErrors: mapFieldErrors(data.errors),
            traceId: data.traceId
        };
    }

    if (isApiResult(data) && data.error?.message) {
        return {
            ...data.error,
            status
        };
    }

    if (isRecord(data)) {
        const message = getString(data, 'message') ?? getString(data, 'Message') ?? getString(data, 'title') ?? getString(data, 'Title');
        const code = getString(data, 'code') ?? getString(data, 'Code');
        const traceId = getString(data, 'traceId') ?? getString(data, 'TraceId');

        if (message) {
            return {
                code,
                message,
                status,
                traceId
            };
        }
    }

    return null;
};

export const mapApiError = (error: unknown): ApiError => {
    if (isAxiosError(error)) {
        const axiosError = error as AxiosError<unknown>;
        const status = axiosError.response?.status;
        const mapped = mapResponseData(axiosError.response?.data, status);

        if (mapped) {
            return mapped;
        }

        return {
            status,
            message: statusMessage(status)
        };
    }

    if (error instanceof Error) {
        return { message: error.message };
    }

    return {
        message: 'Não foi possível conectar à API. Verifique a URL configurada e tente novamente.'
    };
};
