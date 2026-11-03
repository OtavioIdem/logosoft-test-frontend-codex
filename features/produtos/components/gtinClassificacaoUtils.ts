// Regras puras da sugestão de classificação por GTIN (v1.11.0a8b80, D111). Sem React: testáveis em unit.
// O GTIN é sempre TEXTO -- como número perderia o zero à esquerda -- e nunca passa por `Number(...)`.

import { CodigoBarrasProdutoResponse } from '@/features/produtos/types/produtos.types';

/** Tamanhos aceitos pelo backend (GTIN-8, 12, 13 e 14). O dígito verificador não é conferido na consulta. */
export const GTIN_TAMANHOS_VALIDOS = [8, 12, 13, 14] as const;

/** GTIN a consultar: o código de barras principal ou, se nenhum for principal, o primeiro. Aparado nas pontas. */
export const escolherGtinParaConsulta = (codigos?: CodigoBarrasProdutoResponse[] | null): string | null => {
    const lista = codigos ?? [];
    const escolhido = lista.find((item) => item.principal) ?? lista[0];
    const texto = typeof escolhido?.codigo === 'string' ? escolhido.codigo.trim() : '';
    return texto || null;
};

/** 8, 12, 13 ou 14 dígitos numéricos, sem letras nem separadores (após o trim). */
export const gtinEhConsultavel = (gtin?: string | null): boolean => {
    const texto = (gtin ?? '').trim();
    return /^\d+$/.test(texto) && (GTIN_TAMANHOS_VALIDOS as readonly number[]).includes(texto.length);
};

const apenasDigitos = (valor?: string | null) => (valor ?? '').replace(/\D/g, '');

/** O NCM sugerido só merece o botão "Usar este NCM" quando difere do atual (comparação por dígitos, ignora máscara). */
export const ncmSugeridoDifereDoAtual = (ncmSugerido?: string | null, ncmAtual?: string | null): boolean => {
    const sugerido = apenasDigitos(ncmSugerido);
    return Boolean(sugerido) && sugerido !== apenasDigitos(ncmAtual);
};

/** `yyyy-MM-dd` (com ou sem hora) para `dd/MM/yyyy`, sem passar por `Date` (evita deslocar o dia por fuso). */
export const formatarDataIso = (valor?: string | null): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return match ? `${match[3]}/${match[2]}/${match[1]}` : valor ?? '';
};

export const formatarPercentual = (valor: number): string => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
