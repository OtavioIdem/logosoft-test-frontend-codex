import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { httpClient } from '@/lib/http/httpClient';
import {
    CategoriaBemPatrimonial,
    MotivoBaixaPatrimonial,
    StatusBemPatrimonial,
    BemPatrimonialResponse
} from '@/features/patrimonio/types/patrimonio.types';
import {
    situacaoBem,
    statusBemFilterOptions,
    bemPodeTransferir,
    bemPodeBloquear,
    bemPodeBaixar,
    bemPodeDesbloquear,
    categoriaBemOptions,
    motivoBaixaOptions
} from '@/features/patrimonio/components/patrimonioLabels';
import { baixarBemSchema } from '@/features/patrimonio/schemas/patrimonioSchemas';
import { patrimonioApi } from '@/features/patrimonio/api/patrimonioApi';

// AC-2: StatusBemPatrimonial tem exatamente Ativo=1 e Baixado=2
describe('AC-2: StatusBemPatrimonial enum', () => {
    it('tem exatamente Ativo=1 e Baixado=2', () => {
        expect(StatusBemPatrimonial.Ativo).toBe(1);
        expect(StatusBemPatrimonial.Baixado).toBe(2);
        expect(Object.keys(StatusBemPatrimonial).length).toBe(4); // Ativo, 1, Baixado, 2 (reverse mapping)
    });
});

// AC-3: situacaoBem renderiza as três combinações corretamente
describe('AC-3: situacaoBem (situação derivada)', () => {
    it('renderiza "Baixado"/danger quando statusBem=Baixado e bloqueado=false', () => {
        const bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
            statusBem: StatusBemPatrimonial.Baixado,
            bloqueado: false
        };
        const situacao = situacaoBem(bem);
        expect(situacao.label).toBe('Baixado');
        expect(situacao.severity).toBe('danger');
    });

    it('renderiza "Bloqueado"/warning quando statusBem=Ativo e bloqueado=true', () => {
        const bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
            statusBem: StatusBemPatrimonial.Ativo,
            bloqueado: true
        };
        const situacao = situacaoBem(bem);
        expect(situacao.label).toBe('Bloqueado');
        expect(situacao.severity).toBe('warning');
    });

    it('renderiza "Ativo"/success quando statusBem=Ativo e bloqueado=false', () => {
        const bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
            statusBem: StatusBemPatrimonial.Ativo,
            bloqueado: false
        };
        const situacao = situacaoBem(bem);
        expect(situacao.label).toBe('Ativo');
        expect(situacao.severity).toBe('success');
    });
});

// AC-4: Guardas de ação por combinação de estado
describe('AC-4: bemPode* guardas (D18 item 4)', () => {
    const ativoLivre: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
        statusBem: StatusBemPatrimonial.Ativo,
        bloqueado: false
    };
    const ativoBloqueado: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
        statusBem: StatusBemPatrimonial.Ativo,
        bloqueado: true
    };
    const baixado: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'> = {
        statusBem: StatusBemPatrimonial.Baixado,
        bloqueado: false
    };

    // Mapa de funções de ação
    const acoes = {
        Transferir: bemPodeTransferir,
        Bloquear: bemPodeBloquear,
        Desbloquear: bemPodeDesbloquear,
        Baixar: bemPodeBaixar
    };

    // Matriz de 12 testes: 3 estados × 4 ações
    it.each<[string, string, Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'>, boolean]>([
        ['Ativo livre', 'Transferir', ativoLivre, true],
        ['Ativo livre', 'Bloquear', ativoLivre, true],
        ['Ativo livre', 'Desbloquear', ativoLivre, false],
        ['Ativo livre', 'Baixar', ativoLivre, true],
        ['Ativo bloqueado', 'Transferir', ativoBloqueado, false],
        ['Ativo bloqueado', 'Bloquear', ativoBloqueado, false],
        ['Ativo bloqueado', 'Desbloquear', ativoBloqueado, true],
        ['Ativo bloqueado', 'Baixar', ativoBloqueado, false],
        ['Baixado', 'Transferir', baixado, false],
        ['Baixado', 'Bloquear', baixado, false],
        ['Baixado', 'Desbloquear', baixado, false],
        ['Baixado', 'Baixar', baixado, false]
    ])('%s: %s = %s', (estado, nomeAcao, bem, esperado) => {
        const acao = acoes[nomeAcao as keyof typeof acoes];
        expect(acao(bem)).toBe(esperado);
    });
});

// AC-5: statusBemFilterOptions com os três valores corretos
describe('AC-5: statusBemFilterOptions', () => {
    it('tem exatamente três opções: Todos, Ativo=1, Baixado=2', () => {
        expect(statusBemFilterOptions).toEqual([
            { label: 'Todos os status', value: null },
            { label: 'Ativo', value: 1 },
            { label: 'Baixado', value: 2 }
        ]);
    });
});

// AC-6: CategoriaBemPatrimonial com os 8 valores de D20
describe('AC-6: CategoriaBemPatrimonial enum', () => {
    it('tem os 8 valores de D20 item 1', () => {
        expect(CategoriaBemPatrimonial.Movel).toBe(1);
        expect(CategoriaBemPatrimonial.Imovel).toBe(2);
        expect(CategoriaBemPatrimonial.Veiculo).toBe(3);
        expect(CategoriaBemPatrimonial.Maquina).toBe(4);
        expect(CategoriaBemPatrimonial.Equipamento).toBe(5);
        expect(CategoriaBemPatrimonial.Ferramenta).toBe(6);
        expect(CategoriaBemPatrimonial.Software).toBe(7);
        expect(CategoriaBemPatrimonial.Outro).toBe(8);
    });

    it('categoriaBemOptions tem os 8 rótulos na ordem', () => {
        expect(categoriaBemOptions).toHaveLength(8);
        expect(categoriaBemOptions).toEqual([
            { label: 'Móvel', value: 1 },
            { label: 'Imóvel', value: 2 },
            { label: 'Veículo', value: 3 },
            { label: 'Máquina', value: 4 },
            { label: 'Equipamento', value: 5 },
            { label: 'Ferramenta', value: 6 },
            { label: 'Software', value: 7 },
            { label: 'Outro', value: 8 }
        ]);
    });

    it('valor inicial do cadastro é Equipamento=5', () => {
        const filePath = resolve(process.cwd(), 'features/patrimonio/components/PatrimonioDialogs.tsx');
        const conteudo = readFileSync(filePath, 'utf-8');
        // Isola o trecho de initialBem até o primeiro });
        const match = conteudo.match(/const initialBem\s*=\s*\(\):\s*BemFormValues\s*=>\s*\({[^}]*categoria:\s*CategoriaBemPatrimonial\.(\w+)[^}]*}\);/);
        expect(match).toBeTruthy();
        if (match) {
            expect(match[1]).toBe('Equipamento');
        }
        expect(CategoriaBemPatrimonial.Equipamento).toBe(5);
    });
});

// AC-7: baixarBemSchema valida motivo como enum 1-7
describe('AC-7: baixarBemSchema', () => {
    it('recusa motivo null com mensagem "Informe o motivo."', () => {
        const result = baixarBemSchema.safeParse({
            data: null,
            motivo: null,
            justificativa: 'Equipamento quebrado',
            valorBaixa: null
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const motivoError = result.error.issues.find(issue => issue.path[0] === 'motivo');
            expect(motivoError?.message).toBe('Informe o motivo.');
        }
    });

    it('recusa motivo texto com mensagem "Informe o motivo."', () => {
        const result = baixarBemSchema.safeParse({
            data: null,
            motivo: 'Equipamento quebrado',
            justificativa: 'Detalhes',
            valorBaixa: null
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const motivoError = result.error.issues.find(issue => issue.path[0] === 'motivo');
            expect(motivoError?.message).toBe('Informe o motivo.');
        }
    });

    it.each<number>([1, 2, 3, 4, 5, 6, 7])('aceita motivo numérico %i', (motivo) => {
        const result = baixarBemSchema.safeParse({
            data: null,
            motivo,
            justificativa: 'Justificativa válida',
            valorBaixa: null
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.motivo).toBe(motivo);
        }
    });

    it('motivoBaixaOptions tem os 7 rótulos de D20', () => {
        expect(motivoBaixaOptions).toHaveLength(7);
        expect(motivoBaixaOptions).toEqual([
            { label: 'Venda', value: 1 },
            { label: 'Obsolescência', value: 2 },
            { label: 'Perda', value: 3 },
            { label: 'Doação', value: 4 },
            { label: 'Sinistro', value: 5 },
            { label: 'Transferência', value: 6 },
            { label: 'Outro', value: 7 }
        ]);
    });
});

// AC-8: desbloquearBem faz POST sem corpo
describe('AC-8: patrimonioApi.desbloquearBem', () => {
    it('chama POST /api/patrimonio/bens/<guid>/desbloquear sem segundo argumento (sem corpo)', async () => {
        const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: {} } as never);

        await patrimonioApi.desbloquearBem('550e8400-e29b-41d4-a716-446655440000');

        expect(post).toHaveBeenCalledTimes(1);
        const [url] = post.mock.calls[0];
        expect(url).toBe('/api/patrimonio/bens/550e8400-e29b-41d4-a716-446655440000/desbloquear');
        expect(post.mock.calls[0].length).toBe(1); // Só URL, sem segundo arg

        post.mockRestore();
    });
});
