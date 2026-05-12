'use client';
import { Dropdown } from 'primereact/dropdown';
import { SelectOption } from '@/types/erp';

export const SearchSelect = <TValue extends string | number | boolean | null = string>({
    id,
    value,
    options,
    onChange,
    placeholder,
    disabled
}: {
    id?: string;
    value?: TValue | null;
    options: SelectOption<TValue>[];
    onChange: (value: TValue | null) => void;
    placeholder?: string;
    disabled?: boolean;
}) => <Dropdown id={id} value={value ?? null} options={options} optionLabel="label" optionValue="value" filter showClear placeholder={placeholder ?? 'Selecione'} disabled={disabled} onChange={(event) => onChange((event.value ?? null) as TValue | null)} />;
