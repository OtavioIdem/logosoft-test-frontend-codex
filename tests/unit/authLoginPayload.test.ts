import { describe, expect, it } from 'vitest';
import { buildLoginPayload } from '@/features/auth/api/authApi';

describe('buildLoginPayload', () => {
    it('envia somente credenciais: a empresa é resolvida pelo backend na validação de licença', () => {
        expect(
            buildLoginPayload({
                email: 'usuario@erp.local',
                password: 'Senha@2026!'
            })
        ).toEqual({
            email: 'usuario@erp.local',
            password: 'Senha@2026!'
        });
    });

    it('normaliza espaços do e-mail sem tocar na senha', () => {
        expect(
            buildLoginPayload({
                email: '  usuario@erp.local  ',
                password: ' Senha@2026! '
            })
        ).toEqual({
            email: 'usuario@erp.local',
            password: ' Senha@2026! '
        });
    });

    /*
     * Regressão do corte do campo Empresa: mesmo que um chamador desatualizado passe empresaId/filialId em
     * runtime, o corpo do login não pode carregá-los — o backend decide o vínculo e a licença, e um id vindo
     * da tela reabriria a porta que essa mudança fechou.
     */
    it('não repassa empresaId nem filialId recebidos por engano em runtime', () => {
        expect(
            buildLoginPayload({
                email: 'usuario@erp.local',
                password: 'Senha@2026!',
                empresaId: '3f7d2a41-93e3-4f0e-9e34-d98f6b70a6ef',
                filialId: '93cfa7b1-37f1-4530-91ad-ad3c61657d42'
            } as never)
        ).toEqual({
            email: 'usuario@erp.local',
            password: 'Senha@2026!'
        });
    });
});
