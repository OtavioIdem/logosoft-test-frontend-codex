import { describe, expect, it } from 'vitest';
import {
    confirmarLiberadoPelaProntidao,
    estadoProntidao,
    EstadoProntidao,
    pendenciaDependeDoConfirmar,
    prontidaoEhRetomada
} from '@/features/faturamento/components/prontidaoRecursos';
import { ProntidaoPendencia } from '@/features/faturamento/types/faturamento.types';

// Regra que libera o Confirmar (D113, AC-2/AC-3/AC-5). A armadilha é resposta velha habilitando o botão: cada caso
// abaixo fecha uma das saídas em que a tela poderia liberar sem a resposta dos parâmetros ATUAIS.

const pronta = { temPedido: true, aguardandoDigitacao: false, isFetching: false, isError: false, isSuccess: true, data: { pronto: true } };

describe('estadoProntidao — o que governa o Confirmar', () => {
    it('sem pedido vinculado, o estado é sem-pedido, mesmo com resposta pronta', () => {
        expect(estadoProntidao({ ...pronta, temPedido: false })).toBe<EstadoProntidao>('sem-pedido');
    });

    it('parâmetros ainda esperando o debounce são "aguardando", mesmo com uma resposta pronta anterior', () => {
        expect(estadoProntidao({ ...pronta, aguardandoDigitacao: true })).toBe<EstadoProntidao>('aguardando');
    });

    it('consulta em voo é "consultando", mesmo com resposta pronta de consulta anterior (Reconferir em andamento)', () => {
        expect(estadoProntidao({ ...pronta, isFetching: true })).toBe<EstadoProntidao>('consultando');
    });

    it('erro bloqueia mesmo quando há dado antigo na memória', () => {
        expect(estadoProntidao({ ...pronta, isError: true, isSuccess: false })).toBe<EstadoProntidao>('erro');
        expect(estadoProntidao({ ...pronta, isError: true })).toBe<EstadoProntidao>('erro');
    });

    it('nunca respondeu com sucesso (sem dado) é erro: falha bloqueia', () => {
        expect(estadoProntidao({ temPedido: true, aguardandoDigitacao: false, isFetching: false, isError: false, isSuccess: false, data: undefined })).toBe<EstadoProntidao>('erro');
    });

    it('sucesso sem corpo é erro (fail-closed)', () => {
        expect(estadoProntidao({ ...pronta, data: null })).toBe<EstadoProntidao>('erro');
    });

    it('pronto = false é pendente', () => {
        expect(estadoProntidao({ ...pronta, data: { pronto: false } })).toBe<EstadoProntidao>('pendente');
    });

    it('pronto = true, com resposta fresca e nada em voo, é pronto', () => {
        expect(estadoProntidao(pronta)).toBe<EstadoProntidao>('pronto');
    });

    it('pronto que não é booleano verdadeiro NÃO libera (comparação estrita)', () => {
        expect(estadoProntidao({ ...pronta, data: { pronto: 'true' as unknown as boolean } })).toBe<EstadoProntidao>('pendente');
    });
});

describe('confirmarLiberadoPelaProntidao', () => {
    it.each<[EstadoProntidao, boolean]>([
        ['pronto', true],
        ['pendente', false],
        ['erro', false],
        ['consultando', false],
        ['aguardando', false],
        ['sem-pedido', false]
    ])('estado %s libera o Confirmar? %s', (estado, liberado) => {
        expect(confirmarLiberadoPelaProntidao(estado)).toBe(liberado);
    });
});

describe('prontidaoEhRetomada (AC-6)', () => {
    it('avaliacao Retomada é retomada', () => {
        expect(prontidaoEhRetomada({ avaliacao: 'Retomada' })).toBe(true);
    });

    it('primeira confirmação, ausência de resposta e avaliação desconhecida não são retomada', () => {
        expect(prontidaoEhRetomada({ avaliacao: 'PrimeiraConfirmacao' })).toBe(false);
        expect(prontidaoEhRetomada(null)).toBe(false);
        expect(prontidaoEhRetomada(undefined)).toBe(false);
        expect(prontidaoEhRetomada({ avaliacao: 'Outra' })).toBe(false);
    });
});

describe('pendenciaDependeDoConfirmar (painel do detalhe)', () => {
    const pendencia = (etapa: string): ProntidaoPendencia => ({ etapa, codigo: 'c', mensagem: 'm', recurso: 'r', recursoId: null });

    it('natureza e regra fiscal só existem com os parâmetros do Confirmar', () => {
        expect(pendenciaDependeDoConfirmar(pendencia('Natureza'))).toBe(true);
        expect(pendenciaDependeDoConfirmar(pendencia('RegraFiscal'))).toBe(true);
    });

    it('pendências do pedido e do produto não dependem do Confirmar', () => {
        expect(pendenciaDependeDoConfirmar(pendencia('Pedido'))).toBe(false);
        expect(pendenciaDependeDoConfirmar(pendencia('Produto'))).toBe(false);
    });
});
