import { describe, expect, it } from 'vitest';
import { TipoPessoa } from '@/types/erp';
import { buildCriarPessoaPayload } from '@/features/pessoas/api/pessoasApi';
import { buildCriarClientePayload, buildClienteMotivoPayload } from '@/features/clientes/api/clientesApi';
import { buildCriarFornecedorPayload } from '@/features/fornecedores/api/fornecedoresApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const pessoaId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('payloads de Pessoas, Clientes e Fornecedores', () => {
    it('preserva letras no CNPJ alfanumérico da pessoa jurídica', () => {
        const payload = buildCriarPessoaPayload({
            empresaId,
            filialId: null,
            tipoPessoa: TipoPessoa.Juridica,
            nomeRazaoSocial: 'Cliente Exemplo LTDA',
            nomeFantasia: 'Cliente Exemplo',
            documento: '12.ABC.678/0001-9Z',
            inscricaoEstadual: '',
            inscricaoMunicipal: '',
            observacao: ''
        });

        expect(payload.documento).toBe('12ABC67800019Z');
        expect(payload.filialId).toBeNull();
        expect(payload.inscricaoEstadual).toBeNull();
    });

    it('monta cliente com filial null e limite de crédito decimal', () => {
        const payload = buildCriarClientePayload({
            empresaId,
            filialId: null,
            pessoaId,
            codigo: 'CLI0001',
            limiteCredito: 5000,
            observacao: ''
        });

        expect(payload).toEqual({ empresaId, filialId: null, pessoaId, codigo: 'CLI0001', limiteCredito: 5000, observacao: null });
    });

    it('exige motivo nas operações críticas de cliente', () => {
        expect(() => buildClienteMotivoPayload('')).toThrow();
        expect(buildClienteMotivoPayload('Atraso financeiro.')).toEqual({ motivo: 'Atraso financeiro.' });
    });

    it('monta fornecedor vinculado a pessoa com observação opcional', () => {
        const payload = buildCriarFornecedorPayload({
            empresaId,
            filialId: null,
            pessoaId,
            codigo: 'FOR0001',
            observacao: ''
        });

        expect(payload).toEqual({ empresaId, filialId: null, pessoaId, codigo: 'FOR0001', observacao: null });
    });
});
