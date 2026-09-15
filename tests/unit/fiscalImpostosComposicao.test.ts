import { describe, expect, it } from 'vitest';
import {
    motivoValoresAcessoriosIndisponivel,
    notaPodeDefinirValoresAcessorios,
    origemImpostoNotaFiscalLabel,
    situacaoLinhasImpostoNoTotal
} from '@/features/fiscal/components/fiscalUiUtils';
import { ImpostoNotaFiscalResponse, NotaFiscalResponse, OrigemImpostoNotaFiscal } from '@/features/fiscal/types/fiscal.types';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';

let seq = 0;
const imposto = (overrides: Partial<ImpostoNotaFiscalResponse> = {}): ImpostoNotaFiscalResponse => ({
    id: `imposto-${++seq}`,
    itemNotaFiscalId: null,
    nome: 'IPI',
    cstCsosn: '00',
    baseCalculo: 0,
    aliquota: 0,
    valor: 0,
    observacao: null,
    origem: OrigemImpostoNotaFiscal.Motor,
    regraFiscalAplicadaId: null,
    excecaoFiscalAplicadaId: null,
    ...overrides
});

const notaBase = (overrides: Partial<NotaFiscalResponse> = {}): NotaFiscalResponse => ({
    id: 'nota-1',
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoDocumento: TipoDocumentoFiscal.NFe,
    tipoOperacao: TipoOperacaoFiscal.Venda,
    origem: OrigemNotaFiscal.Manual,
    origemId: null,
    serie: '1',
    numero: '1001',
    chaveAcesso: null,
    protocoloAutorizacao: null,
    dataEmissao: '2026-05-18T10:00:00-03:00',
    autorizadaEm: null,
    canceladaEm: null,
    statusFiscal: StatusNotaFiscal.Rascunho,
    valorProdutos: 0,
    valorDesconto: 0,
    valorFrete: 0,
    valorSeguro: 0,
    valorOutrasDespesas: 0,
    valorTotal: 0,
    codigoRejeicao: null,
    mensagemRejeicao: null,
    motivoCancelamento: null,
    observacao: null,
    itens: [],
    impostos: [],
    xmls: [],
    eventos: [],
    ...overrides
});

describe('AC-1: enum de origem do imposto e campos novos do contrato', () => {
    it('OrigemImpostoNotaFiscal replica ImpostoNotaFiscal.cs:11-15 (Manual = 1, Motor = 2)', () => {
        expect(OrigemImpostoNotaFiscal.Manual).toBe(1);
        expect(OrigemImpostoNotaFiscal.Motor).toBe(2);
    });

    it('ImpostoNotaFiscalResponse aceita origem, regraFiscalAplicadaId e excecaoFiscalAplicadaId (NotaFiscalResponse.cs:220-233)', () => {
        const linha = imposto({ origem: OrigemImpostoNotaFiscal.Manual, regraFiscalAplicadaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', excecaoFiscalAplicadaId: null });
        expect(linha.origem).toBe(1);
        expect(linha.regraFiscalAplicadaId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
        expect(linha.excecaoFiscalAplicadaId).toBeNull();
    });

    it('NotaFiscalResponse ganha valorFrete/valorSeguro/valorOutrasDespesas obrigatórios e valorIpi/valorIcmsSt/valorFcpSt opcionais (NotaFiscalResponse.cs:43-86)', () => {
        const comAgregados = notaBase({ valorFrete: 12.5, valorSeguro: 3, valorOutrasDespesas: 7, valorIpi: 10, valorIcmsSt: 2, valorFcpSt: 1 });
        expect(comAgregados.valorFrete).toBe(12.5);
        expect(comAgregados.valorSeguro).toBe(3);
        expect(comAgregados.valorOutrasDespesas).toBe(7);
        expect(comAgregados.valorIpi).toBe(10);
        expect(comAgregados.valorIcmsSt).toBe(2);
        expect(comAgregados.valorFcpSt).toBe(1);

        const semAgregadosTributarios = notaBase({});
        expect(semAgregadosTributarios.valorIpi).toBeUndefined();
        expect(semAgregadosTributarios.valorIcmsSt).toBeUndefined();
        expect(semAgregadosTributarios.valorFcpSt).toBeUndefined();
    });
});

describe('AC-3: rótulo de origem do imposto', () => {
    it('mapeia 1 -> Manual, 2 -> Motor, ausência -> Não informada, e valor desconhecido', () => {
        expect(origemImpostoNotaFiscalLabel(OrigemImpostoNotaFiscal.Manual)).toBe('Manual');
        expect(origemImpostoNotaFiscalLabel(OrigemImpostoNotaFiscal.Motor)).toBe('Motor');
        expect(origemImpostoNotaFiscalLabel(undefined)).toBe('Não informada');
        expect(origemImpostoNotaFiscalLabel(null)).toBe('Não informada');
        expect(origemImpostoNotaFiscalLabel(7)).toBe('Origem desconhecida (7)');
    });
});

// AC-4 / D34: NotaFiscal.cs:672-695 (supressão D7, só IPI/ICMS ST/FCP ST) e FiscalNotaFiscalMapper.cs:40
// (o mapper só devolve linhas ativas). Cada caso (a)-(i) do plano da b56 é um `it` próprio.
describe('AC-4: situacaoLinhasImpostoNoTotal', () => {
    it('(a) item com Motor e Manual de IPI: Manual compõe, Motor é suprimida', () => {
        const motor = imposto({ id: 'motor-ipi', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 10, origem: OrigemImpostoNotaFiscal.Motor });
        const manual = imposto({ id: 'manual-ipi', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 12, origem: OrigemImpostoNotaFiscal.Manual });

        const { porId, nomesNaoConferidos } = situacaoLinhasImpostoNoTotal([motor, manual], { valorIpi: 12 });

        expect(porId['manual-ipi']).toBe('compoe');
        expect(porId['motor-ipi']).toBe('suprimida');
        expect(nomesNaoConferidos).toEqual([]);
    });

    it('(b) ICMS de qualquer origem não compõe o total (não está nos três nomes de D7)', () => {
        const icmsManual = imposto({ id: 'icms-manual', nome: 'ICMS', valor: 5, origem: OrigemImpostoNotaFiscal.Manual });
        const icmsMotor = imposto({ id: 'icms-motor', nome: 'ICMS', valor: 5, origem: OrigemImpostoNotaFiscal.Motor });

        const { porId } = situacaoLinhasImpostoNoTotal([icmsManual, icmsMotor], {});

        expect(porId['icms-manual']).toBe('fora_do_total');
        expect(porId['icms-motor']).toBe('fora_do_total');
    });

    it('(c) só IPI do Motor, agregado bate: compõe', () => {
        const motor = imposto({ id: 'motor-unico', nome: 'IPI', valor: 5, origem: OrigemImpostoNotaFiscal.Motor });

        const { porId } = situacaoLinhasImpostoNoTotal([motor], { valorIpi: 5 });

        expect(porId['motor-unico']).toBe('compoe');
    });

    it('(d) IPI Manual com item nulo (imposto da nota) compõe quando bate com o agregado', () => {
        const manual = imposto({ id: 'manual-nota', itemNotaFiscalId: null, nome: 'IPI', valor: 3, origem: OrigemImpostoNotaFiscal.Manual });

        const { porId } = situacaoLinhasImpostoNoTotal([manual], { valorIpi: 3 });

        expect(porId['manual-nota']).toBe('compoe');
    });

    it('(e) caso (a) com agregado divergente: todas as linhas de IPI ficam não conferidas', () => {
        const motor = imposto({ id: 'motor-diverge', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 10, origem: OrigemImpostoNotaFiscal.Motor });
        const manual = imposto({ id: 'manual-diverge', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 12, origem: OrigemImpostoNotaFiscal.Manual });

        const { porId, nomesNaoConferidos } = situacaoLinhasImpostoNoTotal([motor, manual], { valorIpi: 10 });

        expect(porId['motor-diverge']).toBe('nao_conferida');
        expect(porId['manual-diverge']).toBe('nao_conferida');
        expect(nomesNaoConferidos).toEqual(['IPI']);
    });

    it('(f) dois Manuais ativos na mesma chave: não conferida (manual duplicado legado, B-4)', () => {
        const manual1 = imposto({ id: 'manual-dup-1', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 5, origem: OrigemImpostoNotaFiscal.Manual });
        const manual2 = imposto({ id: 'manual-dup-2', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 6, origem: OrigemImpostoNotaFiscal.Manual });

        const { porId, nomesNaoConferidos } = situacaoLinhasImpostoNoTotal([manual1, manual2], { valorIpi: 5 });

        expect(porId['manual-dup-1']).toBe('nao_conferida');
        expect(porId['manual-dup-2']).toBe('nao_conferida');
        expect(nomesNaoConferidos).toEqual(['IPI']);
    });

    it('(g) nome "ICMS-ST" (hífen) não casa com "ICMS ST" exato: fora do total', () => {
        const linha = imposto({ id: 'icms-st-hifen', nome: 'ICMS-ST', valor: 5, origem: OrigemImpostoNotaFiscal.Manual });

        const { porId } = situacaoLinhasImpostoNoTotal([linha], { valorIcmsSt: 5 });

        expect(porId['icms-st-hifen']).toBe('fora_do_total');
    });

    it('(h) nome "ipi" minúsculo não casa com "IPI" exato: fora do total', () => {
        const linha = imposto({ id: 'ipi-minusculo', nome: 'ipi', valor: 5, origem: OrigemImpostoNotaFiscal.Motor });

        const { porId } = situacaoLinhasImpostoNoTotal([linha], { valorIpi: 5 });

        expect(porId['ipi-minusculo']).toBe('fora_do_total');
    });

    it('(i) linha dos três nomes sem origem: não conferida em cada um', () => {
        const ipi = imposto({ id: 'ipi-sem-origem', nome: 'IPI', valor: 5, origem: undefined });
        const icmsSt = imposto({ id: 'icmsst-sem-origem', nome: 'ICMS ST', valor: 5, origem: undefined });
        const fcpSt = imposto({ id: 'fcpst-sem-origem', nome: 'FCP ST', valor: 5, origem: undefined });

        const { porId, nomesNaoConferidos } = situacaoLinhasImpostoNoTotal([ipi, icmsSt, fcpSt], { valorIpi: 5, valorIcmsSt: 5, valorFcpSt: 5 });

        expect(porId['ipi-sem-origem']).toBe('nao_conferida');
        expect(porId['icmsst-sem-origem']).toBe('nao_conferida');
        expect(porId['fcpst-sem-origem']).toBe('nao_conferida');
        expect([...nomesNaoConferidos].sort()).toEqual(['FCP ST', 'ICMS ST', 'IPI']);
    });
});

// AC-10 / D33: só Rascunho (statusFiscal === 1) libera a definição de valores acessórios pela tela.
describe('AC-10: notaPodeDefinirValoresAcessorios', () => {
    it('é true só para statusFiscal === 1, e false para 2 a 11', () => {
        for (let status = 1; status <= 11; status += 1) {
            const nota = notaBase({ statusFiscal: status });
            expect(notaPodeDefinirValoresAcessorios(nota)).toBe(status === 1);
        }
    });

    it('motivoValoresAcessoriosIndisponivel nomeia o status quando bloqueado, e é nulo em Rascunho', () => {
        expect(motivoValoresAcessoriosIndisponivel(notaBase({ statusFiscal: StatusNotaFiscal.Rascunho }))).toBeNull();
        expect(motivoValoresAcessoriosIndisponivel(notaBase({ statusFiscal: StatusNotaFiscal.Validada }))).toContain('Validada');
    });
});
