import { describe, expect, it } from 'vitest';
import { GTIN_TAMANHOS_VALIDOS, escolherGtinParaConsulta, formatarDataIso, formatarPercentual, gtinEhConsultavel, ncmSugeridoDifereDoAtual } from '@/features/produtos/components/gtinClassificacaoUtils';
import type { CodigoBarrasProdutoResponse } from '@/features/produtos/types/produtos.types';

// v1.11.0a8b80 (D111) — regras puras da sugestão por GTIN. O GTIN é TEXTO: a regressão clássica é converter com
// `Number(...)` e perder o zero à esquerda do GTIN-14, o que faria a consulta apontar para outro produto.

const barra = (codigo: string, principal = false): CodigoBarrasProdutoResponse => ({ codigo, principal });

describe('gtinEhConsultavel — elegibilidade do GTIN (8, 12, 13 ou 14 dígitos numéricos)', () => {
    it('os tamanhos aceitos pelo backend são exatamente 8, 12, 13 e 14', () => {
        expect(GTIN_TAMANHOS_VALIDOS).toEqual([8, 12, 13, 14]);
    });

    it.each([8, 12, 13, 14])('%i dígitos numéricos são consultáveis', (tamanho) => {
        expect(gtinEhConsultavel('1'.repeat(tamanho))).toBe(true);
    });

    it('GTIN-14 com zero à esquerda é consultável (o zero não conta como erro de formato)', () => {
        expect(gtinEhConsultavel('07891000100103')).toBe(true);
    });

    it.each([1, 7, 9, 10, 11, 15, 16])('%i dígitos não são consultáveis (fora de 8/12/13/14)', (tamanho) => {
        expect(gtinEhConsultavel('1'.repeat(tamanho))).toBe(false);
    });

    it.each(['7891000A0103', '789100010010A', '7891-0001-0010', '7891.0001.0010', '7891 0001 0010 3'])('"%s" tem letra ou separador e não é consultável', (codigo) => {
        expect(gtinEhConsultavel(codigo)).toBe(false);
    });

    it('apara espaços das pontas antes de medir: 8 dígitos com espaços são consultáveis', () => {
        expect(gtinEhConsultavel('  78910000  ')).toBe(true);
    });

    it('null, undefined e vazio não são consultáveis', () => {
        expect(gtinEhConsultavel(null)).toBe(false);
        expect(gtinEhConsultavel(undefined)).toBe(false);
        expect(gtinEhConsultavel('')).toBe(false);
        expect(gtinEhConsultavel('   ')).toBe(false);
    });
});

describe('escolherGtinParaConsulta — código principal, ou o primeiro, sempre como texto', () => {
    it('o código principal vence mesmo quando não é o primeiro da lista', () => {
        expect(escolherGtinParaConsulta([barra('7891000100103'), barra('07891000100103', true)])).toBe('07891000100103');
    });

    it('sem nenhum principal, usa o primeiro da lista', () => {
        expect(escolherGtinParaConsulta([barra('78910000'), barra('7891000100103')])).toBe('78910000');
    });

    it('preserva o zero à esquerda: o resultado é o texto original, nunca o número', () => {
        const escolhido = escolherGtinParaConsulta([barra('07891000100103', true)]);
        expect(escolhido).toBe('07891000100103');
        expect(escolhido).not.toBe(String(Number('07891000100103')));
    });

    it('apara espaços nas pontas do código escolhido', () => {
        expect(escolherGtinParaConsulta([barra('  07891000100103  ', true)])).toBe('07891000100103');
    });

    it('lista vazia, null ou undefined devolvem null (produto sem código de barras)', () => {
        expect(escolherGtinParaConsulta([])).toBeNull();
        expect(escolherGtinParaConsulta(null)).toBeNull();
        expect(escolherGtinParaConsulta(undefined)).toBeNull();
    });

    it('código só com espaços devolve null', () => {
        expect(escolherGtinParaConsulta([barra('   ', true)])).toBeNull();
    });
});

describe('ncmSugeridoDifereDoAtual — o botão "Usar este NCM" só existe quando há o que trocar', () => {
    it('NCM igual ao atual não oferece troca', () => {
        expect(ncmSugeridoDifereDoAtual('22030000', '22030000')).toBe(false);
    });

    it('a comparação ignora a máscara: 2203.00.00 é o mesmo NCM que 22030000', () => {
        expect(ncmSugeridoDifereDoAtual('22030000', '2203.00.00')).toBe(false);
    });

    it('NCM diferente oferece troca', () => {
        expect(ncmSugeridoDifereDoAtual('33030010', '22030000')).toBe(true);
    });

    it('a máscara não esconde diferença real: 2203.00.00 contra 2203.00.01 difere', () => {
        expect(ncmSugeridoDifereDoAtual('2203.00.01', '2203.00.00')).toBe(true);
    });

    it('produto sem NCM atual aceita o sugerido', () => {
        expect(ncmSugeridoDifereDoAtual('33030010', null)).toBe(true);
    });

    it('sem NCM sugerido não há o que trocar, mesmo com o atual vazio', () => {
        expect(ncmSugeridoDifereDoAtual(null, '22030000')).toBe(false);
        expect(ncmSugeridoDifereDoAtual('', null)).toBe(false);
        expect(ncmSugeridoDifereDoAtual(undefined, undefined)).toBe(false);
    });
});

describe('formatarDataIso e formatarPercentual — leitura do painel', () => {
    it('yyyy-MM-dd vira dd/MM/yyyy sem passar por Date (o dia não desloca por fuso)', () => {
        expect(formatarDataIso('2026-01-01')).toBe('01/01/2026');
        expect(formatarDataIso('2026-12-31T00:00:00')).toBe('31/12/2026');
    });

    it('valor ausente vira vazio e valor que não é ISO volta como veio', () => {
        expect(formatarDataIso(null)).toBe('');
        expect(formatarDataIso('sem data')).toBe('sem data');
    });

    it('percentual com vírgula decimal pt-BR e sufixo %', () => {
        expect(formatarPercentual(60)).toBe('60%');
        expect(formatarPercentual(40.5)).toBe('40,5%');
        expect(formatarPercentual(0)).toBe('0%');
    });
});
