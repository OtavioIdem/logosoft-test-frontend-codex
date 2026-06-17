import { describe, expect, it } from 'vitest';
import { buildAlterarStatusAtividadePayload, buildAtribuirAtividadePayload, buildCancelarAtividadePayload, buildComentarioAtividadePayload, buildCriarAtividadePayload } from '@/features/atividades/api/atividadesApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const usuarioId = '33333333-3333-3333-3333-333333333333';

describe('atividades payloads B43', () => {
    it('monta criação de atividade com empresa, prioridade e responsável sem exigir origem manual', () => {
        const payload = buildCriarAtividadePayload({ empresaId, filialId, titulo: 'Conferir divergência de estoque', descricao: 'Verificar diferença', prioridade: 'Alta', responsavelUsuarioId: usuarioId, prazoEm: new Date('2026-06-20T18:00:00.000Z') });
        expect(payload).toMatchObject({ empresaId, filialId, titulo: 'Conferir divergência de estoque', prioridade: 'Alta', responsavelUsuarioId: usuarioId });
        expect(payload).not.toHaveProperty('entidadeOrigemId');
        expect(String(payload.prazoEm)).toContain('2026-06-20T18:00:00.000Z');
    });

    it('omite filial, responsável e origem inválidos do payload de criação', () => {
        const payload = buildCriarAtividadePayload({ empresaId, filialId: '99', titulo: 'Atividade manual', descricao: '', prioridade: 'Media', responsavelUsuarioId: '', prazoEm: null, entidadeOrigem: '', entidadeOrigemId: '99' });
        expect(payload).toEqual({ empresaId, titulo: 'Atividade manual', prioridade: 'Media' });
    });

    it('monta atribuição de responsável', () => {
        expect(buildAtribuirAtividadePayload({ responsavelUsuarioId: usuarioId })).toEqual({ responsavelUsuarioId: usuarioId });
    });

    it('monta alteração de status com comentário opcional', () => {
        expect(buildAlterarStatusAtividadePayload({ status: 'EmAndamento', comentario: 'Atividade iniciada' })).toEqual({ status: 'EmAndamento', comentario: 'Atividade iniciada' });
    });

    it('monta comentário e cancelamento com motivo auditável', () => {
        expect(buildComentarioAtividadePayload({ mensagem: 'Foi encontrada diferença entre físico e sistema.' })).toEqual({ mensagem: 'Foi encontrada diferença entre físico e sistema.' });
        expect(buildCancelarAtividadePayload('Atividade aberta indevidamente.')).toEqual({ motivo: 'Atividade aberta indevidamente.' });
    });
});
