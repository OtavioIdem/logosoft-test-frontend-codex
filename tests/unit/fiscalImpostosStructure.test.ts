import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Fiscal (b56) — estrutura: legenda, onSettled e guard de valores acessórios', () => {
    // AC-2: a legenda falsa de impostos (P5) não volta — nem no detalhe, nem no diálogo que cria a linha manual.
    it('AC-2: NotaFiscalDetalhePage.tsx não afirma mais que impostos são parametrizados/manuais', () => {
        const detalhe = read('features/fiscal/components/NotaFiscalDetalhePage.tsx');
        expect(detalhe).not.toContain('parametrizados/manuais');
        expect(detalhe).not.toContain('O frontend não calcula');
    });

    it('AC-2: FiscalActionDialogs.tsx não repete o texto padrão nem o hint falso do imposto manual', () => {
        const dialogs = read('features/fiscal/components/FiscalActionDialogs.tsx');
        expect(dialogs).not.toContain('Imposto parametrizado manualmente.');
        expect(dialogs).not.toContain('O frontend não calcula imposto automaticamente');
    });

    // AC-9 / D27 / D37: só as duas mutações que a b56 toca reconsultam também no erro (onSettled).
    it('AC-9: adicionarImpostoMutation e definirValoresAcessoriosMutation usam onSettled nominal', () => {
        const hooks = read('features/fiscal/hooks/useFiscalResources.ts');

        expect(hooks).toContain(
            "const adicionarImpostoMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.adicionarImposto(id, values), onSettled: (_nota, _error, variables) => invalidateNota(variables.id) });"
        );
        expect(hooks).toContain(
            "const definirValoresAcessoriosMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.definirValoresAcessorios(id, values), onSettled: (_nota, _error, variables) => invalidateNota(variables.id) });"
        );
        expect(hooks).toContain('definirValoresAcessoriosMutation,');
    });

    // v1.11.0a8b57/D43 P-4: transmitir, reprocessar e consultar protocolo passam a usar onSettled também --
    // o teto sobe de 2 (b56) para 5. A lista nominal das cinco permitidas evita que onSettled se espalhe em
    // silêncio para o restante das mutações fiscais (cobertura ampliada em fiscalTransmissaoStructure.test.ts AC-10).
    it('AC-9/AC-10: só as cinco mutações nomeadas (D37 + D43 P-4) ganham onSettled', () => {
        const hooks = read('features/fiscal/hooks/useFiscalResources.ts');
        const ocorrencias = hooks.match(/onSettled:/g) ?? [];
        expect(ocorrencias).toHaveLength(5);
        expect(hooks).toContain('const adicionarImpostoMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.adicionarImposto(id, values), onSettled:');
        expect(hooks).toContain('const definirValoresAcessoriosMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.definirValoresAcessorios(id, values), onSettled:');
        expect(hooks).toContain('const transmitirMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.transmitirSefaz(id, values), onSettled:');
        expect(hooks).toContain('const reprocessarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.reprocessarSefaz(id, values), onSettled:');
        expect(hooks).toContain('const consultarProtocoloMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.consultarProtocoloSefaz(id, values), onSettled:');
    });

    // AC-10 / D33: o botão novo tem guard de permissão e motivo de bloqueio por status.
    it('AC-10: botão "Valores acessórios" combina guard FISCAL_GERENCIAR com notaPodeDefinirValoresAcessorios e motivo visível', () => {
        const detalhe = read('features/fiscal/components/NotaFiscalDetalhePage.tsx');
        expect(detalhe).toContain('label="Valores acessórios"');
        expect(detalhe).toContain('permission="FISCAL_GERENCIAR" mode="disable"');
        expect(detalhe).toContain('disabled={disabled || !notaPodeDefinirValoresAcessorios(nota)}');
        expect(detalhe).toContain("title={disabled ? 'Permissão necessária: FISCAL_GERENCIAR.' : motivoValoresAcessoriosIndisponivel(nota) ?? undefined}");
    });
});
