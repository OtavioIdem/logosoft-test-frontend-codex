// Utilitários de tela da fatia Séries fiscais (v1.11.0a8b58, F3.1). Situação e faixas de buracos são
// derivadas no frontend só para exibição -- a regra de negócio (vigência, faixa, alocação) mora no backend
// (`SerieFiscal.cs`); aqui é leitura, nunca decisão.

import { SituacaoSerieFiscalChave } from '@/features/fiscal/components/seriesFiscaisLabels';
import { toDateOnly } from '@/features/fiscal/schemas/seriesFiscaisSchemas';

/** P-4a: teto de faixas compactadas exibidas antes do aviso de corte. */
export const TETO_FAIXAS_BURACOS = 1000;

type SituacaoSerieFiscalInput = {
    ativa: boolean;
    numeroFinal: number;
    proximoNumero: number;
    vigenciaInicio: string;
    vigenciaFim?: string | null;
};

// AC-8: precedência fixada nos rótulos (`seriesFiscaisLabels.ts`) -- inativa vence sobre as demais, depois
// faixa esgotada, depois vigência. `hoje` é injetável para teste; por padrão é a data local de hoje.
export const situacaoSerieFiscal = (serie: SituacaoSerieFiscalInput, hoje: string = toDateOnly(new Date())): SituacaoSerieFiscalChave => {
    if (!serie.ativa) return 'inativa';
    if (serie.proximoNumero > serie.numeroFinal) return 'faixaEsgotada';
    if (hoje < serie.vigenciaInicio) return 'vigenciaAIniciar';
    if (serie.vigenciaFim && hoje > serie.vigenciaFim) return 'vigenciaEncerrada';
    return 'vigente';
};

/**
 * Compacta uma lista de números em faixas contíguas legíveis: `[3,4,5,9]` -> `['3–5', '9']`. Entrada
 * ordenada crescente (o backend já devolve assim -- `ConsultarBuracosSerieFiscalUseCase.cs:50-52`); ordena
 * de novo por segurança, sem assumir o contrato.
 */
export const compactarFaixas = (numeros: number[]): string[] => {
    if (numeros.length === 0) return [];

    const ordenados = [...numeros].sort((a, b) => a - b);
    const faixas: string[] = [];
    let inicio = ordenados[0];
    let anterior = ordenados[0];

    const fecharFaixa = (fim: number) => {
        faixas.push(inicio === fim ? `${inicio}` : `${inicio}–${fim}`);
    };

    for (let index = 1; index < ordenados.length; index += 1) {
        const atual = ordenados[index];
        if (atual === anterior + 1) {
            anterior = atual;
            continue;
        }
        fecharFaixa(anterior);
        inicio = atual;
        anterior = atual;
    }
    fecharFaixa(anterior);

    return faixas;
};
