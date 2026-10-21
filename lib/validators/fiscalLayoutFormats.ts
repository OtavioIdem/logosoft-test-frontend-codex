/**
 * Formatos declarados pelo leiaute fiscal do backend.
 *
 * Estes predicados só normalizam para comparação. O valor recebido permanece
 * intacto no payload para que o backend continue sendo a autoridade de
 * normalização e das regras fiscais de domínio.
 */
const PONTUACAO_CODIGO_FISCAL = /[.\-/]/g;

export const normalizarCodigoFiscalParaComparacao = (value: string): string => value.replace(PONTUACAO_CODIGO_FISCAL, '');

export const isNcmLeiauteValido = (value: string): boolean => {
    const normalizado = normalizarCodigoFiscalParaComparacao(value);
    return normalizado === '00' || /^\d{8}$/.test(normalizado);
};

export const isCestLeiauteValido = (value: string): boolean => /^\d{7}$/.test(normalizarCodigoFiscalParaComparacao(value));

export const isCfopLeiauteValido = (value: string): boolean => /^[123567]\d{3}$/.test(normalizarCodigoFiscalParaComparacao(value));

export const isUnidadeLeiauteValida = (value: string): boolean => value.trim().length >= 1 && value.trim().length <= 6;

export const isInscricaoEstadualLeiauteValida = (value: string): boolean => {
    const normalizado = normalizarCodigoFiscalParaComparacao(value);
    return normalizado.toUpperCase() === 'ISENTO' || /^\d{2,14}$/.test(normalizado);
};

export const isInscricaoMunicipalLeiauteValida = (value: string): boolean => value.trim().length >= 1 && value.trim().length <= 15;
