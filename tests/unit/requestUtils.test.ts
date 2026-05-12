import { describe, expect, it } from 'vitest';
import { cleanQueryParams, isValidGuid, sanitizePayload, toTermQueryParams } from '@/lib/http/requestUtils';

describe('requestUtils', () => {
    it('valida referência técnicas no formato aceito pelo backend', () => {
        expect(isValidGuid('11111111-1111-1111-1111-111111111111')).toBe(true);
        expect(isValidGuid('0')).toBe(false);
        expect(isValidGuid('99')).toBe(false);
        expect(isValidGuid('')).toBe(false);
    });

    it('remove Guid inválido, string vazia e undefined do payload', () => {
        expect(
            sanitizePayload({
                empresaId: '0',
                filialId: '',
                pessoaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                observacao: '',
                nome: 'Cliente Exemplo'
            })
        ).toEqual({
            pessoaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            nome: 'Cliente Exemplo'
        });
    });

    it('converte Date em ISO dentro do payload', () => {
        expect(
            sanitizePayload({
                dataEmissao: new Date('2026-05-05T13:00:00.000Z')
            })
        ).toEqual({
            dataEmissao: '2026-05-05T13:00:00.000Z'
        });
    });

    it('limpa query params e converte busca global para termo', () => {
        expect(
            toTermQueryParams({
                search: 'produto',
                empresaId: '11111111-1111-1111-1111-111111111111',
                filialId: '',
                status: undefined
            })
        ).toEqual({
            termo: 'produto',
            empresaId: '11111111-1111-1111-1111-111111111111'
        });
    });

    it('remove campos vazios da query', () => {
        expect(cleanQueryParams({ termo: '', produtoId: '0', localEstoqueId: null, status: 1 })).toEqual({ status: 1 });
    });
});
