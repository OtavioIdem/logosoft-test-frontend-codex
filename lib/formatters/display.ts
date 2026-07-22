import { isValidGuid } from '@/lib/http/requestUtils';

const descriptiveKeys = ['nome', 'nomeFantasia', 'razaoSocial', 'nomeRazaoSocial', 'descricao', 'codigo', 'numero', 'documento'];

export const isTechnicalIdentifier = (value: unknown) => typeof value === 'string' && isValidGuid(value);

/**
 * Limita um rótulo a `maxLength` caracteres, acrescentando reticências (…) quando cortado.
 * Usado para evitar que rótulos longos (ex.: "Fantasia • Razão Social • CNPJ") quebrem o layout
 * no botão fechado dos seletores. O texto completo continua disponível na lista e no `title`.
 */
export const truncateLabel = (value: string, maxLength = 40) => {
    const text = value?.trim() ?? '';
    if (maxLength <= 0 || text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

/**
 * Formata um documento (CPF/CNPJ) para exibição em listagens, sem mascarar dados sensíveis.
 * - CPF (11 caracteres): `000.000.000-00`
 * - CNPJ (14 caracteres, numérico ou alfanumérico): `00.000.000/0000-00`
 * Documentos com tamanho fora do padrão são retornados sem alteração.
 * Não usar para dados pessoais protegidos por LGPD — nesse caso use `maskDocument`.
 */
export const formatDocumento = (value?: string | null) => {
    if (value === null || value === undefined) return '-';
    const raw = String(value).trim();
    if (!raw) return '-';
    const normalized = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (normalized.length === 11) return normalized.replace(/^(.{3})(.{3})(.{3})(.{2})$/, '$1.$2.$3-$4');
    if (normalized.length === 14) return normalized.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
    return raw;
};

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
