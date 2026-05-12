export const normalizeCpf = (value: string) => value.replace(/\D/g, '');

export const normalizeCnpj = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

export const isPotentialCpf = (value: string) => normalizeCpf(value).length === 11;

export const isPotentialCnpj = (value: string) => {
    const normalized = normalizeCnpj(value);
    return normalized.length === 14 && /^[0-9A-Z]+$/.test(normalized);
};

export const isPotentialCpfCnpj = (value: string) => isPotentialCpf(value) || isPotentialCnpj(value);
