'use client';

import { ZodError } from 'zod';
import { SelectOption } from '@/types/erp';
import { LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';

export type FieldErrors = Record<string, string | undefined>;

export const fieldErrorMap = (error: ZodError<unknown>): FieldErrors => {
    const flattened = error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;

    return Object.entries(fieldErrors).reduce<FieldErrors>((acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : undefined;
        return acc;
    }, {});
};

export const textValue = (value: unknown) => (typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value));
export const numberValue = (value: unknown) => (typeof value === 'number' ? value : value === null || value === undefined || value === '' ? null : Number(value));

export const produtoOptions = (produtos: ProdutoResponse[]): SelectOption<string>[] => produtos.map((produto) => ({ label: `${produto.codigo} • ${produto.descricao}`, value: produto.id }));
export const localOptions = (locais: LocalEstoqueResponse[]): SelectOption<string>[] => locais.map((local) => ({ label: `${local.codigo} • ${local.nome}`, value: local.id }));

export const filterLocalRecords = <T extends object>(records: T[], term: string): T[] => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const formatQuantity = (value: number | null | undefined) => Number(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
export const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');
