import { describe, expect, it } from 'vitest';
import {
    CODIGO_CONFIGURACAO,
    CONFIGURACAO_FISCAL_ERROS,
    certificadoOptionLabel,
    ehEstadoNaoConfigurada,
    mensagemErroConfiguracaoFiscal,
    validadeCertificado
} from '@/features/fiscal/components/configuracaoFiscalLabels';
import { certificadoVinculadoAConfiguracaoAtiva, opcoesCertificado } from '@/features/fiscal/components/configuracaoFiscalUtils';
import { contextoDivergeDaEmpresaDoUsuario } from '@/features/fiscal/components/ConfiguracaoFiscalPage';
import { isSefazSimulada } from '@/features/fiscal/hooks/useSefazSimulada';
import { CertificadoDigitalResponse } from '@/features/fiscal/types/configuracaoFiscal.types';
import { ApiError } from '@/types/erp';

// v1.11.0a8b81 (D112, AC-6, AC-8, AC-9, AC-10, AC-11). Regras puras de tela: quem decide o que o operador vê.
// A regra de emissão (certificado vencido, empresa do token) é do backend e não é testada aqui.

const AGORA = new Date('2026-11-03T12:00:00Z');
const dias = (n: number) => new Date(AGORA.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
const erro = (status: number, code?: string, message = 'mensagem do servidor'): ApiError => ({ status, code, message });

const certificado = (over: Partial<CertificadoDigitalResponse>): CertificadoDigitalResponse => ({
    id: 'c-1',
    filialId: null,
    apelido: 'Matriz',
    tipo: 1,
    thumbprintMascarado: '******C12E8',
    validoAte: dias(200),
    situacao: 1,
    observacao: null,
    ...over
});

describe('catálogo de erros por code (§5.1 + InativaReativeAntes)', () => {
    // Código do §5.1 do plano do backend, com a mensagem que a tela mostra. Se o catálogo mudar de texto, este teste fala.
    it.each([
        ['Fiscal.Configuracao.EmpresaObrigatoria', 'Selecione uma empresa'],
        ['Fiscal.Configuracao.CertificadoIndisponivel', 'O certificado não existe, está inativo, vencido ou não é desta empresa'],
        ['Fiscal.Configuracao.CertificadoVencido', 'A validade informada já passou'],
        ['Fiscal.Configuracao.ThumbprintJaCadastrado', 'O thumbprint já está cadastrado, ativo ou inativo']
    ])('%s mostra a mensagem do catálogo, não a do servidor', (code, texto) => {
        expect(mensagemErroConfiguracaoFiscal(erro(400, code))).toBe(texto);
    });

    it('ConflitoDeGravacao (409) manda recarregar, com a mensagem própria', () => {
        expect(mensagemErroConfiguracaoFiscal(erro(409, 'Fiscal.Configuracao.ConflitoDeGravacao'))).toMatch(/Outra pessoa gravou ao mesmo tempo/);
    });

    it.each([
        ['Fiscal.Configuracao.EmpresaNaoEncontrada'],
        ['Fiscal.Configuracao.FilialNaoEncontrada'],
        ['Fiscal.Configuracao.FilialInexistente'],
        ['Fiscal.Configuracao.CertificadoNaoEncontrado']
    ])('%s tem texto de catálogo (o 404 normalmente não chega, mas o mapa cobre o código)', (code) => {
        expect(CONFIGURACAO_FISCAL_ERROS[code]).toBeTruthy();
    });

    it('InativaReativeAntes (409, fora do §5.1, vem do C#) tem mensagem própria', () => {
        expect(mensagemErroConfiguracaoFiscal(erro(409, 'Fiscal.Configuracao.InativaReativeAntes'))).toBe('A configuração está inativa. Reative-a antes de alterá-la.');
        expect(CODIGO_CONFIGURACAO.inativaReativeAntes).toBe('Fiscal.Configuracao.InativaReativeAntes');
    });

    it('code desconhecido cai na mensagem que a API devolveu, sem perdê-la', () => {
        expect(mensagemErroConfiguracaoFiscal(erro(400, 'Fiscal.Configuracao.Inventado', 'texto do servidor'))).toBe('texto do servidor');
    });

    it('sem erro não há mensagem', () => {
        expect(mensagemErroConfiguracaoFiscal(null)).toBeUndefined();
        expect(mensagemErroConfiguracaoFiscal(undefined)).toBeUndefined();
    });
});

describe('ehEstadoNaoConfigurada: 404 é estado, não erro, e só para o 404 esperado', () => {
    it('404 com Recurso.NaoEncontrado (o filtro da API troca todo 404 por este código) é "não configurada"', () => {
        expect(ehEstadoNaoConfigurada(erro(404, 'Recurso.NaoEncontrado'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(true);
        expect(ehEstadoNaoConfigurada(erro(404, 'Recurso.NaoEncontrado'), CODIGO_CONFIGURACAO.filialNaoEncontrada)).toBe(true);
    });

    it('404 com o código específico esperado é "não configurada"', () => {
        expect(ehEstadoNaoConfigurada(erro(404, 'Fiscal.Configuracao.EmpresaNaoEncontrada'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(true);
        expect(ehEstadoNaoConfigurada(erro(404, 'Fiscal.Configuracao.FilialNaoEncontrada'), CODIGO_CONFIGURACAO.filialNaoEncontrada)).toBe(true);
    });

    it('404 sem código reconhecido (rota ausente, backend sem a F3) continua erro', () => {
        expect(ehEstadoNaoConfigurada(erro(404, undefined, 'Recurso não encontrado.'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(false);
    });

    it('404 com código de OUTRO recurso não vira "não configurada"', () => {
        expect(ehEstadoNaoConfigurada(erro(404, 'Fiscal.Configuracao.CertificadoNaoEncontrado'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(false);
    });

    it('500, mesmo com o código esperado, continua erro', () => {
        expect(ehEstadoNaoConfigurada(erro(500, 'Fiscal.Configuracao.EmpresaNaoEncontrada'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(false);
        expect(ehEstadoNaoConfigurada(erro(500, 'Recurso.NaoEncontrado'), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(false);
    });

    it('400 com código de empresa obrigatória não é estado', () => {
        expect(ehEstadoNaoConfigurada(erro(400, CODIGO_CONFIGURACAO.empresaObrigatoria), CODIGO_CONFIGURACAO.empresaNaoEncontrada)).toBe(false);
    });
});

describe('validadeCertificado: validade local, destaque abaixo de 30 dias', () => {
    it('falta 10 dias: destaca e conta os dias', () => {
        const validade = validadeCertificado(dias(10), AGORA);
        expect(validade.venceEmBreve).toBe(true);
        expect(validade.vencido).toBe(false);
        expect(validade.diasRestantes).toBe(10);
    });

    it('falta 29,5 dias: ainda destaca', () => {
        expect(validadeCertificado(new Date(AGORA.getTime() + 29.5 * 24 * 60 * 60 * 1000).toISOString(), AGORA).venceEmBreve).toBe(true);
    });

    it('falta exatamente 30 dias: NÃO destaca (limite é estritamente menor que 30)', () => {
        expect(validadeCertificado(dias(30), AGORA).venceEmBreve).toBe(false);
    });

    it('falta 90 dias: não destaca', () => {
        expect(validadeCertificado(dias(90), AGORA).venceEmBreve).toBe(false);
    });

    it('já passou: vencido, e não é "vence em breve"', () => {
        const validade = validadeCertificado(dias(-3), AGORA);
        expect(validade.vencido).toBe(true);
        expect(validade.venceEmBreve).toBe(false);
        expect(validade.diasRestantes).toBeLessThan(0);
    });

    it('data inválida não quebra: texto de traço, sem destaque', () => {
        expect(validadeCertificado('nao-e-data', AGORA)).toEqual({ texto: '-', diasRestantes: null, venceEmBreve: false, vencido: false });
    });

    it('o texto mostrado vem do fuso local (não é o ISO bruto)', () => {
        const texto = validadeCertificado('2027-01-01T02:59:00.000Z', AGORA).texto;
        expect(texto).not.toBe('2027-01-01T02:59:00.000Z');
        expect(texto).not.toBe('-');
    });
});

describe('opcoesCertificado: só utilizáveis, mas o vínculo atual continua visível', () => {
    const ativo = certificado({ id: 'ativo', apelido: 'Ativo' });
    const inativo = certificado({ id: 'inativo', apelido: 'Inativo', situacao: 2 });
    const vencidoPelaData = certificado({ id: 'vencido', apelido: 'Vencido pela data', validoAte: dias(-1) });

    it('inclui só ativo e dentro da validade; exclui inativo e vencido pela data', () => {
        const valores = opcoesCertificado([ativo, inativo, vencidoPelaData], null, AGORA).map((opcao) => opcao.value);
        expect(valores).toEqual(['ativo']);
    });

    it('o rótulo mostra apelido e mascarado, nunca o thumbprint completo', () => {
        const [opcao] = opcoesCertificado([ativo], null, AGORA);
        expect(opcao.label).toBe(certificadoOptionLabel('Ativo', '******C12E8'));
        expect(opcao.label).toContain('******C12E8');
    });

    it('vínculo atual inativo aparece desabilitado com "(indisponível)", para o operador enxergar o que está vinculado', () => {
        const opcoes = opcoesCertificado([ativo, inativo], 'inativo', AGORA);
        const vinculado = opcoes.find((opcao) => opcao.value === 'inativo');
        expect(vinculado).toMatchObject({ disabled: true });
        expect(vinculado?.label).toMatch(/Inativo.*\(indisponível\)/);
    });

    it('vínculo para certificado que a lista nem trouxe ganha rótulo genérico desabilitado', () => {
        const opcoes = opcoesCertificado([ativo], 'desconhecido', AGORA);
        expect(opcoes.find((opcao) => opcao.value === 'desconhecido')).toEqual({ label: 'Certificado vinculado (indisponível)', value: 'desconhecido', disabled: true });
    });

    it('lista ausente não quebra', () => {
        expect(opcoesCertificado(undefined, null, AGORA)).toEqual([]);
    });
});

describe('certificadoVinculadoAConfiguracaoAtiva (AC-8): só configuração ATIVA conta', () => {
    it('vínculo da empresa ativa é vínculo', () => {
        expect(certificadoVinculadoAConfiguracaoAtiva('c-1', { ativo: true, certificadoDigitalId: 'c-1' }, null)).toBe(true);
    });

    it('vínculo de empresa INATIVA não conta: a emissão não usa mais esse certificado', () => {
        expect(certificadoVinculadoAConfiguracaoAtiva('c-1', { ativo: false, certificadoDigitalId: 'c-1' }, null)).toBe(false);
    });

    it('vínculo de filial ativa carregada conta', () => {
        expect(certificadoVinculadoAConfiguracaoAtiva('c-2', null, { ativo: true, certificadoDigitalId: 'c-2' })).toBe(true);
    });

    it('outro certificado, ou nenhum vínculo, não conta', () => {
        expect(certificadoVinculadoAConfiguracaoAtiva('c-3', { ativo: true, certificadoDigitalId: 'c-1' }, { ativo: true, certificadoDigitalId: 'c-2' })).toBe(false);
        expect(certificadoVinculadoAConfiguracaoAtiva('c-1', null, undefined)).toBe(false);
    });
});

describe('isSefazSimulada (AC-10): só com fiscal.mock === true', () => {
    it('mock true é a única prova de simulação', () => {
        expect(isSefazSimulada({ fiscal: { mock: true, ambiente: 'Homologacao' } })).toBe(true);
    });

    it('bloco ausente, nulo, ou mock false não afirma simulação', () => {
        expect(isSefazSimulada({})).toBe(false);
        expect(isSefazSimulada({ fiscal: null })).toBe(false);
        expect(isSefazSimulada({ fiscal: { mock: false, ambiente: 'Producao' } })).toBe(false);
    });

    it('health ausente ou carregando devolve false, nunca "SEFAZ real"', () => {
        expect(isSefazSimulada(undefined)).toBe(false);
        expect(isSefazSimulada(null)).toBe(false);
    });

    it('mock como texto "true" não conta: só o booleano', () => {
        expect(isSefazSimulada({ fiscal: { mock: 'true' as unknown as boolean, ambiente: 'Homologacao' } })).toBe(false);
    });
});

describe('contextoDivergeDaEmpresaDoUsuario (AC-11)', () => {
    const A = '11111111-1111-1111-1111-111111111111';
    const B = '99999999-9999-9999-9999-999999999999';

    it('empresas diferentes divergem', () => {
        expect(contextoDivergeDaEmpresaDoUsuario(B, A)).toBe(true);
    });

    it('mesma empresa, com caixa diferente, não diverge', () => {
        expect(contextoDivergeDaEmpresaDoUsuario(A.toUpperCase(), A)).toBe(false);
    });

    it('sem uma das duas empresas não há divergência a avisar', () => {
        expect(contextoDivergeDaEmpresaDoUsuario(null, A)).toBe(false);
        expect(contextoDivergeDaEmpresaDoUsuario(B, null)).toBe(false);
    });
});
