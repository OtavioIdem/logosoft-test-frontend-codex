import { isValidGuid } from '@/lib/http/requestUtils';

const descriptiveKeys = ['nome', 'nomeFantasia', 'razaoSocial', 'nomeRazaoSocial', 'descricao', 'codigo', 'numero', 'documento'];

export const isTechnicalIdentifier = (value: unknown) => typeof value === 'string' && isValidGuid(value);

export const formatEntityReference = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (isTechnicalIdentifier(value)) return 'Referência selecionada';
    if (typeof value !== 'object' || Array.isArray(value)) return String(value);

    const record = value as Record<string, unknown>;
    const parts = descriptiveKeys
        .map((key) => record[key])
        .filter((item): item is string | number => (typeof item === 'string' && item.trim().length > 0 && !isTechnicalIdentifier(item)) || typeof item === 'number')
        .map(String);

    return parts.length ? parts.slice(0, 2).join(' - ') : 'Referência selecionada';
};

export const formatDisplayValue = (value: unknown, type?: string) => {
    if (type === 'money') return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'number') return Number(value ?? 0).toLocaleString('pt-BR');
    if (type === 'date' && value) return new Date(String(value)).toLocaleDateString('pt-BR');
    if (type === 'datetime' && value) return new Date(String(value)).toLocaleString('pt-BR');
    if (type === 'boolean') return value ? 'Sim' : 'Não';
    return formatEntityReference(value);
};
