import { describe, expect, it } from 'vitest';
import { buildAtualizarCargoPayload, buildCriarCargoPayload, buildCriarEmpresaPayload, buildCriarSetorPayload } from '@/features/administracao/api/administracaoApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

describe('administracao payload builders', () => {
    it('monta payload de empresa conforme contrato, preservando documento alfanumérico', () => {
        expect(
            buildCriarEmpresaPayload({
                razaoSocial: 'Logosoft Tecnologia LTDA',
                nomeFantasia: 'Logosoft',
                documento: '12ABC6780001DE',
                inscricaoEstadual: '',
                inscricaoMunicipal: null
            })
        ).toEqual({
            razaoSocial: 'Logosoft Tecnologia LTDA',
            nomeFantasia: 'Logosoft',
            documento: '12ABC6780001DE',
            inscricaoEstadual: null,
            inscricaoMunicipal: null
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
});
