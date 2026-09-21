import { describe, expect, it } from 'vitest';
import { buildCriarUsuarioPayload, buildGrupoAcessoPayload, buildResetSenhaUsuarioPayload, buildUsuarioMotivoPayload, buildVincularGrupoUsuarioPayload } from '@/features/seguranca/api/segurancaApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const grupoAcessoId = '33333333-3333-3333-3333-333333333333';

describe('segurança operacional payloads', () => {
    it('monta CriarUsuarioRequest sem login e grupos conforme contrato', () => {
        const payload = buildCriarUsuarioPayload({
            nome: ' Administrador ',
            email: ' admin@empresa.com ',
            senha: 'Admin@123456',
            empresaId,
            filialId
        });

        expect(payload).toEqual({
            nome: 'Administrador',
            email: 'admin@empresa.com',
            senha: 'Admin@123456',
            empresaId,
            filialId
        });

        // ACH-5: não envia login e gruposAcessoIds (contrato não os aceita)
        expect(payload).not.toHaveProperty('login');
        expect(payload).not.toHaveProperty('gruposAcessoIds');
    });

    it('envia filialId como null quando não houver filial válida', () => {
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

    it('monta payloads auditáveis de usuário', () => {
        expect(buildUsuarioMotivoPayload('Usuário desligado da empresa.')).toEqual({ motivo: 'Usuário desligado da empresa.' });
        expect(buildResetSenhaUsuarioPayload({ novaSenha: 'NovaSenha@123', confirmarSenha: 'NovaSenha@123', motivo: 'Solicitação formal.' })).toEqual({ novaSenha: 'NovaSenha@123', motivo: 'Solicitação formal.' });
        expect(buildVincularGrupoUsuarioPayload({ grupoAcessoId, motivo: 'Conceder acesso operacional.' })).toEqual({ grupoAcessoId, motivo: 'Conceder acesso operacional.' });
    });

    it('monta payload de grupo de acesso com empresa, filial e permissões selecionadas', () => {
        expect(buildGrupoAcessoPayload({ empresaId, filialId, nome: ' Financeiro ', descricao: ' Grupo financeiro ', permissoes: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR'] })).toEqual({
            empresaId,
            filialId,
            nome: 'Financeiro',
            descricao: 'Grupo financeiro',
            permissoes: ['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR']
        });
    });
});
