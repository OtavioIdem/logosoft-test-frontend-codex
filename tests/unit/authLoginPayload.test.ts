import { describe, expect, it } from 'vitest';
import { buildLoginPayload } from '@/features/auth/api/authApi';

describe('buildLoginPayload', () => {
    it('envia somente email e password para o manager de teste', () => {
        expect(
            buildLoginPayload({
                email: 'manager@erp.local',
                password: 'Manager@2026!',
                empresaId: '0',
                filialId: '99'
            })
        ).toEqual({
            email: 'manager@erp.local',
            password: 'Manager@2026!'
        });
    });

    it('remove empresaId e filialId inválidos antes do login', () => {
        expect(
            buildLoginPayload({
                email: 'usuario@erp.local',
                password: 'Senha@2026!',
                empresaId: '0',
                filialId: '99'
            })
        ).toEqual({
            email: 'usuario@erp.local',
            password: 'Senha@2026!'
        });
    });



    it('remove valores que não são registro válido para usuário comum', () => {
        expect(
            buildLoginPayload({
                email: 'usuario@erp.local',
                password: 'Senha@2026!',
                empresaId: 'abc',
                filialId: ''
            })
        ).toEqual({
            email: 'usuario@erp.local',
            password: 'Senha@2026!'
        });
    });

    it('mantém empresaId e filialId válidos', () => {
        expect(
            buildLoginPayload({
                email: 'usuario@erp.local',
                password: 'Senha@2026!',
                empresaId: '3f7d2a41-93e3-4f0e-9e34-d98f6b70a6ef',
                filialId: '93cfa7b1-37f1-4530-91ad-ad3c61657d42'
            })
        ).toEqual({
            email: 'usuario@erp.local',
            password: 'Senha@2026!',
            empresaId: '3f7d2a41-93e3-4f0e-9e34-d98f6b70a6ef',
            filialId: '93cfa7b1-37f1-4530-91ad-ad3c61657d42'
        });
    });
});
