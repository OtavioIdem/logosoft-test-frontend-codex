import { describe, expect, it } from 'vitest';
import { buildCriarUsuarioPayload } from '@/features/seguranca/api/segurancaApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

describe('buildCriarUsuarioPayload', () => {
    it('monta o payload conforme CriarUsuarioRequest do backend', () => {
        expect(
            buildCriarUsuarioPayload({
                nome: ' Administrador ',
                email: ' admin@empresa.com ',
                senha: 'Admin@123456',
                empresaId,
                filialId
            })
        ).toEqual({
            nome: 'Administrador',
            email: 'admin@empresa.com',
            senha: 'Admin@123456',
            empresaId,
            filialId
        });
    });

    it('envia filialId como null quando não houver registro válido', () => {
        expect(
            buildCriarUsuarioPayload({
                nome: 'Administrador',
                email: 'admin@empresa.com',
                senha: 'Admin@123456',
                empresaId,
                filialId: ''
            })
        ).toEqual({
            nome: 'Administrador',
            email: 'admin@empresa.com',
            senha: 'Admin@123456',
            empresaId,
            filialId: null
        });
    });

    it('bloqueia empresaId inválido antes de chamar a API', () => {
        expect(() =>
            buildCriarUsuarioPayload({
                nome: 'Administrador',
                email: 'admin@empresa.com',
                senha: 'Admin@123456',
                empresaId: '0',
                filialId: null
            })
        ).toThrow('Informe uma empresa válida para criar o usuário.');
    });
});
