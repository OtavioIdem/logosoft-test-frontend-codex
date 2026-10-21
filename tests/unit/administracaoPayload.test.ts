import { describe, expect, it } from 'vitest';
import { buildAtualizarCargoPayload, buildAtualizarEmpresaPayload, buildCriarCargoPayload, buildCriarEmpresaPayload, buildCriarFilialPayload, buildCriarSetorPayload, buildDefinirEnderecoFiscalPayload } from '@/features/administracao/api/administracaoApi';
import { crtLabel, crtOptions } from '@/features/administracao/components/administracaoLabels';
import { criarEmpresaSchema, atualizarEmpresaSchema } from '@/features/administracao/schemas/administracaoSchemas';
import { Crt, RegimeTributario } from '@/features/administracao/types/administracao.types';

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
            crt: null,
            contribuinteIpi: true
        });
    });

    it('AJ-09: normaliza CNPJ alfanumérico de empresa e filial e recusa formato fora de 14 caracteres', () => {
        const empresa = buildCriarEmpresaPayload({
            razaoSocial: 'Logosoft Tecnologia LTDA',
            nomeFantasia: '',
            documento: '12.abc.678/0001-9z',
            inscricaoEstadual: '',
            inscricaoMunicipal: '',
            regimeTributario: RegimeTributario.SimplesNacional,
            crt: null,
            contribuinteIpi: false
        });
        const filial = buildCriarFilialPayload({ empresaId, nome: 'Filial Centro', documento: '12ABC67800019Z', inscricaoEstadual: '', inscricaoMunicipal: '' });

        expect(empresa.documento).toBe('12ABC67800019Z');
        expect(filial.documento).toBe('12ABC67800019Z');
        expect(() => buildCriarEmpresaPayload({ ...empresa, documento: '1234567890123' })).toThrow('Informe um CNPJ numérico ou alfanumérico com 14 caracteres.');
        expect(() => buildCriarFilialPayload({ ...filial, documento: '123456789012345' })).toThrow('Informe um CNPJ numérico ou alfanumérico com 14 caracteres.');
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

    it('envia regimeTributario e crt ao atualizar empresa (não reescreve com default)', () => {
        // ACH-1: regimeTributario é obrigatório tanto em CREATE quanto em UPDATE
        // para evitar que edição de razão social reescreva o regime com default
        // CRT é anulável e enviado explicitamente como null quando não selecionado
        const payload = buildAtualizarEmpresaPayload({
            razaoSocial: 'Nova Razão Social',
            regimeTributario: RegimeTributario.LucroPresumido,
            inscricaoEstadual: null,
            inscricaoMunicipal: null
        });
        expect(payload).toHaveProperty('regimeTributario');
        expect(payload.regimeTributario).toBe(RegimeTributario.LucroPresumido);
        expect(payload).toHaveProperty('crt');
        expect(payload.crt).toBe(null);
    });

    it('AJ-06: expõe e aceita CRT 4, sem mascarar valor não mapeado', () => {
        expect(crtOptions).toContainEqual({ label: 'Microempreendedor Individual (MEI)', value: Crt.MicroempreendedorIndividual });
        expect(crtLabel(Crt.MicroempreendedorIndividual)).toBe('Microempreendedor Individual (MEI)');
        expect(crtLabel(99)).toBe('Não mapeado (99)');

        const criar = criarEmpresaSchema.safeParse({
            razaoSocial: 'Empresa MEI',
            nomeFantasia: '',
            documento: '12345678000195',
            inscricaoEstadual: '',
            inscricaoMunicipal: '',
            regimeTributario: RegimeTributario.SimplesNacional,
            crt: Crt.MicroempreendedorIndividual,
            contribuinteIpi: false
        });
        const atualizar = atualizarEmpresaSchema.safeParse({
            razaoSocial: 'Empresa MEI',
            nomeFantasia: '',
            inscricaoEstadual: '',
            inscricaoMunicipal: '',
            regimeTributario: RegimeTributario.SimplesNacional,
            crt: Crt.MicroempreendedorIndividual
        });

        expect(criar.success).toBe(true);
        expect(atualizar.success).toBe(true);
    });

    // AC-1: Gravar endereço fiscal de empresa envia os seis obrigatórios preenchidos
    it('AC-1: monta endereço fiscal com seis obrigatórios preenchidos', () => {
        expect(
            buildDefinirEnderecoFiscalPayload({
                logradouro: 'Rua das Flores',
                numero: '123',
                complemento: 'Apto 42',
                bairro: 'Centro',
                cidade: 'São Paulo',
                uf: 'sp',
                cep: '01310-100',
                codigoMunicipioIbge: '3550308'
            })
        ).toEqual({
            logradouro: 'Rua das Flores',
            numero: '123',
            complemento: 'Apto 42',
            bairro: 'Centro',
            cidade: 'São Paulo',
            uf: 'SP',
            cep: '01310-100',
            codigoMunicipioIbge: '3550308'
        });
    });

    // AC-1 variação: seis obrigatórios sem os anuláveis (complemento e município)
    it('AC-1: endereço fiscal com apenas os seis obrigatórios', () => {
        expect(
            buildDefinirEnderecoFiscalPayload({
                logradouro: 'Avenida Paulista',
                numero: '1000',
                complemento: '',
                bairro: 'Bela Vista',
                cidade: 'São Paulo',
                uf: 'SP',
                cep: '01311-100',
                codigoMunicipioIbge: null
            })
        ).toEqual({
            logradouro: 'Avenida Paulista',
            numero: '1000',
            complemento: null,
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            uf: 'SP',
            cep: '01311-100',
            codigoMunicipioIbge: null
        });
    });

    // AC-5: Limpar o município usa o DELETE próprio, não um PUT com `null`
    // Este teste verifica que o schema **aceita** codigoMunicipioIbge como null
    // A prova real é de rede/integração (verificar que DELETE é chamado em vez de PUT)
    it('AC-5: endereço fiscal sem município (anulável) para DELETE subsequente', () => {
        const payload = buildDefinirEnderecoFiscalPayload({
            logradouro: 'Av. Atlântica',
            numero: '500',
            complemento: null,
            bairro: 'Copacabana',
            cidade: 'Rio de Janeiro',
            uf: 'RJ',
            cep: '20040020',
            codigoMunicipioIbge: null
        });
        // AC-5: codigoMunicipioIbge pode ser null (o DELETE é chamado em lugar de PUT)
        expect(payload.codigoMunicipioIbge).toBeNull();
        // Verifica que os seis obrigatórios estão presentes
        expect(payload).toHaveProperty('logradouro');
        expect(payload).toHaveProperty('numero');
        expect(payload).toHaveProperty('bairro');
        expect(payload).toHaveProperty('cidade');
        expect(payload).toHaveProperty('uf');
        expect(payload).toHaveProperty('cep');
    });
});
