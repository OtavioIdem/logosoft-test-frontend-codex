import { describe, expect, it } from 'vitest';
import { mapApiError } from '@/lib/http/apiError';

const axiosLikeError = (data: unknown, status = 400) => ({
    isAxiosError: true,
    response: {
        status,
        data
    }
});

describe('mapApiError', () => {
    it('mapeia erro de validação do ASP.NET por campo', () => {
        const error = mapApiError(
            axiosLikeError({
                type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
                title: 'One or more validation errors occurred.',
                status: 400,
                errors: {
                    documento: ['Documento obrigatório.']
                },
                traceId: 'trace-1'
            })
        );

        expect(error.status).toBe(400);
        expect(error.message).toBe('Documento obrigatório.');
        expect(error.fieldErrors?.documento).toEqual(['Documento obrigatório.']);
        expect(error.validationErrors).toEqual([{ field: 'documento', message: 'Documento obrigatório.' }]);
    });

    it('mapeia erro de regra de negócio', () => {
        const error = mapApiError(
            axiosLikeError({
                code: 'PRODUTO.INATIVO',
                message: 'Produto inativo não pode ser movimentado.'
            })
        );

        expect(error.code).toBe('PRODUTO.INATIVO');
        expect(error.message).toBe('Produto inativo não pode ser movimentado.');
    });

    it('mapeia 403 para mensagem amigável', () => {
        const error = mapApiError(axiosLikeError(null, 403));
        expect(error.message).toBe('Você não possui permissão para executar esta operação.');
    });
});
