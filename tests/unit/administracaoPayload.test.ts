import { describe, expect, it } from 'vitest';
import { buildAtualizarCargoPayload, buildAtualizarEmpresaPayload, buildCriarCargoPayload, buildCriarEmpresaPayload, buildCriarSetorPayload } from '@/features/administracao/api/administracaoApi';
import { RegimeTributario } from '@/features/administracao/types/administracao.types';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

describe('administracao payload builders', () => {
    it('monta criar empresa conforme contrato com regime tributário e IPI', () => {
        expect(
            buildCriarEmpresaPayload({
                razaoSocial: 'Logosoft Tecnologia LTDA',
                nomeFantasia: 'Logosoft',
                documento: '12ABC6780001DE',
                inscricaoEstadual: '',
                inscricaoMunicipal: null,
                regimeTributario: RegimeTributario.SimplesNacional,
                contribuinteIpi: true
            })
        ).toEqual({
            razaoSocial: 'Logosoft Tecnologia LTDA',
            nomeFantasia: 'Logosoft',
            documento: '12ABC6780001DE',
            inscricaoEstadual: null,
            inscricaoMunicipal: null,
            regimeTributario: RegimeTributario.SimplesNacional,
            contribuinteIpi: true
        });
    });

    it('normaliza filialId opcional de setor para null', () => {
        expect(buildCriarSetorPayload({ empresaId, filialId: '', nome: 'Comercial', descricao: '' })).toEqual({
            empresaId,
            filialId: null,
            nome: 'Comercial',
            descricao: null
        });
    });

    it('rejeita referência técnica inválido em campos obrigatórios', () => {
        expect(() => buildCriarCargoPayload({ empresaId: '0', filialId, setorId: null, nome: 'Gerente', descricao: '', nivelHierarquico: 10 })).toThrow('Empresa deve ser selecionado corretamente.');
    });

    it('não envia empresaId na atualização de cargo', () => {
        expect(buildAtualizarCargoPayload({ empresaId, setorId: '', nome: 'Gerente', descricao: '', nivelHierarquico: 10 })).toEqual({
            setorId: null,
            nome: 'Gerente',
            descricao: null,
            nivelHierarquico: 10
        });
    });

    it('envia regimeTributario ao atualizar empresa (não reescreve com default)', () => {
        // ACH-1: regimeTributario é obrigatório tanto em CREATE quanto em UPDATE
        // para evitar que edição de razão social reescreva o regime com default
        const payload = buildAtualizarEmpresaPayload({
            razaoSocial: 'Nova Razão Social',
            regimeTributario: RegimeTributario.LucroPresumido,
            inscricaoEstadual: null,
            inscricaoMunicipal: null
        });
        expect(payload).toHaveProperty('regimeTributario');
        expect(payload.regimeTributario).toBe(RegimeTributario.LucroPresumido);
    });
});
