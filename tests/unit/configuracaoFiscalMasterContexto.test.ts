import { describe, expect, it, afterEach } from 'vitest';
import { configuracaoFiscalApi, ContextoMaster } from '@/features/fiscal/api/configuracaoFiscalApi';
import type { OrganizationalContextSnapshot } from '@/lib/http/organizationalContextPolicy';
import {
    CERT_MATRIZ_ID,
    certificadoMatriz,
    EMPRESA_USUARIO_ID,
    empresaConfigurada,
    FILIAL_ID,
    filialConfigurada,
    instalarServidorFiscal,
    RespostaServidor
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// D114 (v1.11.0a8b82.c3). AC-1: para o master, as 10 chamadas levam `empresaId` do seletor na query, sem `filialId`.
// AC-2: para o usuário comum, nenhuma leva `empresaId` nem `filialId`.
//
// Caminho REAL: `httpClient` + política de contexto organizacional, sem mock do módulo de política e sem nada injetado
// por fora. Cada função recebe o snapshot do contexto como último argumento, exatamente como a tela passa.

const EMPRESA_E1 = EMPRESA_USUARIO_ID;
const FILIAL_F1 = FILIAL_ID;

// Snapshot real de master: empresa do seletor E1, filial F1 na sessão.
const MASTER_E1_F1: OrganizationalContextSnapshot = Object.freeze({ empresaId: EMPRESA_E1, filialId: FILIAL_F1, isMaster: true, revision: 1 });
// Master SEM empresa no seletor: a política tem de recusar antes da rede.
const MASTER_SEM_EMPRESA: OrganizationalContextSnapshot = Object.freeze({ empresaId: null, filialId: null, isMaster: true, revision: 1 });

const empresaValida = { ambiente: 2, emitirNFe: true, emitirNFCe: false, emitirNFSe: true, certificadoDigitalId: CERT_MATRIZ_ID, observacao: 'Produção' };
const filialValida = { ambiente: 1, herdaConfiguracaoEmpresa: false, certificadoDigitalId: null, serieNFePadrao: '55', serieNFCePadrao: '65', observacao: null };
const certificadoValido = { apelido: 'Certificado Matriz', tipo: 1, thumbprint: 'SEGREDO-TESTE-THUMB-7F3A9C12E8', validoAte: new Date('2026-12-31T23:59:00-03:00'), filialId: null, observacao: '' };
const motivo = { motivo: 'Troca de ambiente' };

type Chamada = (contexto: ContextoMaster) => Promise<unknown>;

// As 10 funções de `configuracaoFiscalApi`, uma linha cada, com a rota HTTP e a resposta que o servidor falso devolve.
const DEZ_FUNCOES: { nome: string; metodo: string; rota: string; resposta: RespostaServidor; chamar: Chamada }[] = [
    { nome: 'obterEmpresa', metodo: 'GET', rota: '/api/fiscal/configuracao/empresa', resposta: { status: 200, body: empresaConfigurada() }, chamar: (c) => configuracaoFiscalApi.obterEmpresa(c) },
    { nome: 'salvarEmpresa', metodo: 'PUT', rota: '/api/fiscal/configuracao/empresa', resposta: { status: 200, body: empresaConfigurada() }, chamar: (c) => configuracaoFiscalApi.salvarEmpresa(empresaValida, c) },
    { nome: 'inativarEmpresa', metodo: 'POST', rota: '/api/fiscal/configuracao/empresa/inativar', resposta: { status: 200, body: undefined }, chamar: (c) => configuracaoFiscalApi.inativarEmpresa(motivo, c) },
    { nome: 'reativarEmpresa', metodo: 'POST', rota: '/api/fiscal/configuracao/empresa/reativar', resposta: { status: 200, body: undefined }, chamar: (c) => configuracaoFiscalApi.reativarEmpresa(motivo, c) },
    { nome: 'obterFilial', metodo: 'GET', rota: `/api/fiscal/configuracao/filiais/${FILIAL_F1}`, resposta: { status: 200, body: filialConfigurada() }, chamar: (c) => configuracaoFiscalApi.obterFilial(FILIAL_F1, c) },
    { nome: 'salvarFilial', metodo: 'PUT', rota: `/api/fiscal/configuracao/filiais/${FILIAL_F1}`, resposta: { status: 200, body: filialConfigurada() }, chamar: (c) => configuracaoFiscalApi.salvarFilial(FILIAL_F1, filialValida, c) },
    { nome: 'listarCertificados', metodo: 'GET', rota: '/api/fiscal/configuracao/certificados', resposta: { status: 200, body: [] }, chamar: (c) => configuracaoFiscalApi.listarCertificados({}, c) },
    { nome: 'cadastrarCertificado', metodo: 'POST', rota: '/api/fiscal/configuracao/certificados', resposta: { status: 201, body: certificadoMatriz() }, chamar: (c) => configuracaoFiscalApi.cadastrarCertificado(certificadoValido, c) },
    { nome: 'inativarCertificado', metodo: 'POST', rota: `/api/fiscal/configuracao/certificados/${CERT_MATRIZ_ID}/inativar`, resposta: { status: 200, body: certificadoMatriz({ situacao: 2 }) }, chamar: (c) => configuracaoFiscalApi.inativarCertificado(CERT_MATRIZ_ID, motivo, c) },
    { nome: 'verificarCertificado', metodo: 'POST', rota: `/api/fiscal/configuracao/certificados/${CERT_MATRIZ_ID}/verificar`, resposta: { status: 200, body: { disponivel: true, motivo: null } }, chamar: (c) => configuracaoFiscalApi.verificarCertificado(CERT_MATRIZ_ID, c) }
];

describe('D114 — escopo de empresa nas 10 chamadas de configuracaoFiscalApi', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    describe('AC-1: master — empresa do seletor na query, sem filialId injetado', () => {
        it.each(DEZ_FUNCOES.map((f) => [f.nome, f] as const))('%s', async (_, funcao) => {
            const servidor = instalarServidorFiscal({ [`${funcao.metodo} ${funcao.rota}`]: funcao.resposta });
            restaurar = servidor.restaurar;

            await funcao.chamar(MASTER_E1_F1);

            const [chamada] = servidor.chamadasDe(`${funcao.metodo} ${funcao.rota}`);
            expect(chamada, 'a chamada não chegou à rede').toBeDefined();
            expect(chamada.params).toEqual(expect.objectContaining({ empresaId: EMPRESA_E1 }));
            expect(chamada.params).not.toHaveProperty('filialId');
            // A filial F1 da sessão nunca vai no corpo: quando existe, ela vai na rota.
            expect(JSON.stringify(chamada.body ?? null)).not.toContain(FILIAL_F1);
        });
    });

    describe('AC-2: usuário comum (sem snapshot de master) — nenhuma das 10 leva empresaId nem filialId', () => {
        it.each(DEZ_FUNCOES.map((f) => [f.nome, f] as const))('%s', async (_, funcao) => {
            const servidor = instalarServidorFiscal({ [`${funcao.metodo} ${funcao.rota}`]: funcao.resposta });
            restaurar = servidor.restaurar;

            await funcao.chamar(null);

            const [chamada] = servidor.chamadasDe(`${funcao.metodo} ${funcao.rota}`);
            expect(chamada, 'a chamada não chegou à rede').toBeDefined();
            expect(chamada.params).not.toHaveProperty('empresaId');
            expect(chamada.params).not.toHaveProperty('filialId');
            expect(chamada.body).toEqual(expect.not.objectContaining({ empresaId: expect.anything() }));
        });
    });

    describe('master sem empresa no seletor: a política recusa e nenhuma requisição sai', () => {
        it.each(DEZ_FUNCOES.map((f) => [f.nome, f] as const))('%s', async (_, funcao) => {
            const servidor = instalarServidorFiscal({ [`${funcao.metodo} ${funcao.rota}`]: funcao.resposta });
            restaurar = servidor.restaurar;

            await expect(funcao.chamar(MASTER_SEM_EMPRESA)).rejects.toMatchObject({ code: 'OrganizationalContextRequired' });
            expect(servidor.chamadas.filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao'))).toHaveLength(0);
        });
    });
});
