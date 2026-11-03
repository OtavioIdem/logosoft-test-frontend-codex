import { afterEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
    buildCadastrarCertificadoPayload,
    buildMotivoConfiguracaoPayload,
    buildSalvarConfiguracaoEmpresaPayload,
    buildSalvarConfiguracaoFilialPayload,
    configuracaoFiscalApi
} from '@/features/fiscal/api/configuracaoFiscalApi';
import {
    certificadoDigitalResponseSchema,
    configuracaoFiscalEmpresaResponseSchema,
    configuracaoFiscalFilialResponseSchema,
    verificarCertificadoDigitalResponseSchema
} from '@/features/fiscal/schemas/configuracaoFiscalSchemas';
import { instalarServidorFiscal, erroServidor, EMPRESA_USUARIO_ID, FILIAL_ID, CERT_MATRIZ_ID, THUMBPRINT_DIGITADO, certificadoMatriz, empresaConfigurada } from '@/tests/mocks/fiscal/configuracaoFiscalServidor';
import { mapApiError } from '@/lib/http/apiError';

// v1.11.0a8b81 (AJ-34/AJ-35, D112). Protege o que sai para o backend: campos do contrato, campo proibido fora,
// validoAte sempre em UTC, enum numérico, e resposta aditiva que não pode quebrar a tela.

const empresaValida = {
    ambiente: 2,
    emitirNFe: true,
    emitirNFCe: false,
    emitirNFSe: true,
    certificadoDigitalId: CERT_MATRIZ_ID,
    observacao: '  Produção  '
};

const filialValida = {
    ambiente: 1,
    herdaConfiguracaoEmpresa: false,
    certificadoDigitalId: null,
    serieNFePadrao: '55',
    serieNFCePadrao: '65',
    observacao: null
};

const certificadoValido = {
    apelido: '  Certificado Matriz ',
    tipo: 1,
    thumbprint: `  ${THUMBPRINT_DIGITADO}  `,
    validoAte: new Date('2026-12-31T23:59:00-03:00'),
    filialId: null,
    observacao: ''
};

describe('request de empresa: campos do contrato, nada além', () => {
    it('envia exatamente ambiente, as três flags, certificado e observação, com o texto aparado', () => {
        expect(buildSalvarConfiguracaoEmpresaPayload(empresaValida)).toEqual({
            ambiente: 2,
            emitirNFe: true,
            emitirNFCe: false,
            emitirNFSe: true,
            certificadoDigitalId: CERT_MATRIZ_ID,
            observacao: 'Produção'
        });
    });

    it('rejeita empresaId no corpo: a empresa vem do token, e enviá-la seria aceitar outra empresa', () => {
        expect(() => buildSalvarConfiguracaoEmpresaPayload({ ...empresaValida, empresaId: EMPRESA_USUARIO_ID })).toThrow(ZodError);
    });

    it('rejeita enum fora de 1/2 e enum como texto', () => {
        expect(() => buildSalvarConfiguracaoEmpresaPayload({ ...empresaValida, ambiente: 3 })).toThrow(ZodError);
        expect(() => buildSalvarConfiguracaoEmpresaPayload({ ...empresaValida, ambiente: 'Producao' })).toThrow(ZodError);
    });

    it('observação com mais de 500 caracteres não sai', () => {
        expect(() => buildSalvarConfiguracaoEmpresaPayload({ ...empresaValida, observacao: 'x'.repeat(501) })).toThrow(ZodError);
    });
});

describe('request de filial', () => {
    it('envia ambiente, herança, certificado e séries; nunca filialId, que vai na rota', () => {
        expect(buildSalvarConfiguracaoFilialPayload(filialValida)).toEqual(filialValida);
    });

    it('rejeita filialId no corpo', () => {
        expect(() => buildSalvarConfiguracaoFilialPayload({ ...filialValida, filialId: FILIAL_ID })).toThrow(ZodError);
    });

    it('herdaConfiguracaoEmpresa é obrigatório: sem ele o backend não sabe se os campos valem', () => {
        const { herdaConfiguracaoEmpresa: _omitido, ...semHerda } = filialValida;
        expect(() => buildSalvarConfiguracaoFilialPayload(semHerda)).toThrow(ZodError);
    });

    it('série padrão acima de 20 caracteres não sai', () => {
        expect(() => buildSalvarConfiguracaoFilialPayload({ ...filialValida, serieNFePadrao: 'S'.repeat(21) })).toThrow(ZodError);
    });
});

describe('motivo de inativar e reativar', () => {
    it('apara o motivo e envia só { motivo }', () => {
        expect(buildMotivoConfiguracaoPayload({ motivo: '  Troca de certificado  ' })).toEqual({ motivo: 'Troca de certificado' });
    });

    it('motivo só com espaços não sai: o backend exige motivo', () => {
        expect(() => buildMotivoConfiguracaoPayload({ motivo: '   ' })).toThrow(ZodError);
    });

    it('campo extra no motivo não sai', () => {
        expect(() => buildMotivoConfiguracaoPayload({ motivo: 'ok', usuarioId: 'x' })).toThrow(ZodError);
    });
});

describe('cadastro de certificado: validoAte sempre ISO UTC, thumbprint aparado', () => {
    it('um Date com offset local sai como o mesmo instante em UTC', () => {
        const payload = buildCadastrarCertificadoPayload(certificadoValido);
        // 31/12/2026 23:59 em -03:00 é 01/01/2027 02:59 em UTC. Valor fixo, independente do fuso da máquina.
        expect(payload.validoAte).toBe('2027-01-01T02:59:00.000Z');
    });

    it('uma string com offset também sai em UTC', () => {
        const payload = buildCadastrarCertificadoPayload({ ...certificadoValido, validoAte: '2026-12-31T23:59:00-03:00' });
        expect(payload.validoAte).toBe('2027-01-01T02:59:00.000Z');
    });

    it('data inválida ou vazia não sai como request', () => {
        expect(() => buildCadastrarCertificadoPayload({ ...certificadoValido, validoAte: new Date('nao-e-data') })).toThrow(ZodError);
        expect(() => buildCadastrarCertificadoPayload({ ...certificadoValido, validoAte: null })).toThrow(ZodError);
    });

    it('o thumbprint vai no cadastro, aparado; observação vazia vira null', () => {
        const payload = buildCadastrarCertificadoPayload(certificadoValido);
        expect(payload.thumbprint).toBe(THUMBPRINT_DIGITADO);
        expect(payload.observacao).toBeNull();
        expect(payload.filialId).toBeNull();
    });

    it('não envia campo que só existe na resposta (id, situação, mascarado)', () => {
        const payload = buildCadastrarCertificadoPayload(certificadoValido) as Record<string, unknown>;
        expect(Object.keys(payload).sort()).toEqual(['apelido', 'filialId', 'observacao', 'thumbprint', 'tipo', 'validoAte'].sort());
    });

    it('apelido em branco ou acima de 120 caracteres não sai', () => {
        expect(() => buildCadastrarCertificadoPayload({ ...certificadoValido, apelido: '   ' })).toThrow(ZodError);
        expect(() => buildCadastrarCertificadoPayload({ ...certificadoValido, apelido: 'A'.repeat(121) })).toThrow(ZodError);
    });

    it('tipo fora de 1 (A1) e 2 (A3) não sai', () => {
        expect(() => buildCadastrarCertificadoPayload({ ...certificadoValido, tipo: 3 })).toThrow(ZodError);
    });
});

describe('respostas são tolerantes a campo aditivo, mas não aceitam enum inventado', () => {
    it('empresa, filial e certificado aceitam campo novo do backend sem quebrar', () => {
        expect(() => configuracaoFiscalEmpresaResponseSchema.parse({ ...empresaConfigurada(), campoNovo: 'x' })).not.toThrow();
        expect(() => configuracaoFiscalFilialResponseSchema.parse({ id: 'a', filialId: FILIAL_ID, ambiente: 2, herdaConfiguracaoEmpresa: true, ativo: true, campoNovo: 1 })).not.toThrow();
        expect(() => certificadoDigitalResponseSchema.parse({ ...certificadoMatriz(), campoNovo: [] })).not.toThrow();
    });

    it('situação fora de 1/2/3 é rejeitada', () => {
        expect(() => certificadoDigitalResponseSchema.parse({ ...certificadoMatriz(), situacao: 4 })).toThrow(ZodError);
    });

    it('resposta sem thumbprintMascarado é rejeitada: o contrato da lista depende dele', () => {
        const { thumbprintMascarado: _omitido, ...semMascara } = certificadoMatriz();
        expect(() => certificadoDigitalResponseSchema.parse(semMascara)).toThrow(ZodError);
    });

    it('verificar aceita motivo nulo no schema (a conversão para texto vazio fica no cliente)', () => {
        expect(verificarCertificadoDigitalResponseSchema.parse({ disponivel: true, motivo: null })).toEqual({ disponivel: true, motivo: null });
    });
});

describe('client HTTP: o que sai pela rede e o que volta como erro', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('PUT da empresa vai para /empresa, sem empresaId no corpo nem na query', async () => {
        const servidor = instalarServidorFiscal({ 'PUT /api/fiscal/configuracao/empresa': { status: 200, body: empresaConfigurada() } });
        restaurar = servidor.restaurar;

        await configuracaoFiscalApi.salvarEmpresa(empresaValida);

        const [chamada] = servidor.chamadasDe('PUT /api/fiscal/configuracao/empresa');
        expect(chamada).toBeDefined();
        expect(chamada.body).toEqual(expect.not.objectContaining({ empresaId: expect.anything() }));
        expect(chamada.params).not.toHaveProperty('empresaId');
        expect(chamada.body).toMatchObject({ ambiente: 2, emitirNFe: true });
    });

    it('POST do certificado manda validoAte em UTC e o thumbprint digitado, e não guarda nada além do que volta', async () => {
        const respostaDoServidor = certificadoMatriz();
        const servidor = instalarServidorFiscal({ 'POST /api/fiscal/configuracao/certificados': { status: 201, body: respostaDoServidor } });
        restaurar = servidor.restaurar;

        const criado = await configuracaoFiscalApi.cadastrarCertificado(certificadoValido);

        const [chamada] = servidor.chamadasDe('POST /api/fiscal/configuracao/certificados');
        expect(chamada.body).toMatchObject({ validoAte: '2027-01-01T02:59:00.000Z', thumbprint: THUMBPRINT_DIGITADO });
        expect(criado).toEqual(respostaDoServidor);
        expect(criado).not.toHaveProperty('thumbprint');
    });

    it('GET da empresa com 404 de "não configurada" devolve null, que é estado e não erro', async () => {
        const servidor = instalarServidorFiscal({ 'GET /api/fiscal/configuracao/empresa': erroServidor(404, 'Fiscal.Configuracao.EmpresaNaoEncontrada') });
        restaurar = servidor.restaurar;

        await expect(configuracaoFiscalApi.obterEmpresa()).resolves.toBeNull();
    });

    it('GET da empresa com 404 genérico (Recurso.NaoEncontrado, emenda D112) também devolve null', async () => {
        const servidor = instalarServidorFiscal({ 'GET /api/fiscal/configuracao/empresa': erroServidor(404, 'Recurso.NaoEncontrado') });
        restaurar = servidor.restaurar;

        await expect(configuracaoFiscalApi.obterEmpresa()).resolves.toBeNull();
    });

    it('GET da empresa com 404 SEM corpo reconhecido continua erro: não pode virar "não configurada"', async () => {
        const servidor = instalarServidorFiscal({ 'GET /api/fiscal/configuracao/empresa': erroServidor(404) });
        restaurar = servidor.restaurar;

        await expect(configuracaoFiscalApi.obterEmpresa()).rejects.toMatchObject({ response: { status: 404 } });
    });

    it('GET da empresa com 500 continua erro', async () => {
        const servidor = instalarServidorFiscal({ 'GET /api/fiscal/configuracao/empresa': erroServidor(500, undefined, 'Erro interno') });
        restaurar = servidor.restaurar;

        await expect(configuracaoFiscalApi.obterEmpresa()).rejects.toMatchObject({ response: { status: 500 } });
    });

    it('GET da filial com 404 FilialNaoEncontrada devolve null (herda da empresa); 404 sem corpo continua erro', async () => {
        const servidor = instalarServidorFiscal({
            [`GET /api/fiscal/configuracao/filiais/${FILIAL_ID}`]: erroServidor(404, 'Fiscal.Configuracao.FilialNaoEncontrada')
        });
        restaurar = servidor.restaurar;
        await expect(configuracaoFiscalApi.obterFilial(FILIAL_ID)).resolves.toBeNull();

        restaurar();
        const semCorpo = instalarServidorFiscal({ [`GET /api/fiscal/configuracao/filiais/${FILIAL_ID}`]: erroServidor(404) });
        restaurar = semCorpo.restaurar;
        await expect(configuracaoFiscalApi.obterFilial(FILIAL_ID)).rejects.toMatchObject({ response: { status: 404 } });
    });

    it('erro de negócio preserva code, status e traceId ao chegar na tela (mapApiError)', async () => {
        const servidor = instalarServidorFiscal({
            'POST /api/fiscal/configuracao/certificados': { status: 400, body: { code: 'Fiscal.Configuracao.CertificadoVencido', message: 'Validade no passado', traceId: 'trace-abc-123' } }
        });
        restaurar = servidor.restaurar;

        const erro = await configuracaoFiscalApi.cadastrarCertificado(certificadoValido).catch((caught: unknown) => caught);

        expect(mapApiError(erro)).toMatchObject({ code: 'Fiscal.Configuracao.CertificadoVencido', status: 400, traceId: 'trace-abc-123' });
    });
});
