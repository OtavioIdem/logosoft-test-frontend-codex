'use client';

import { Dropdown } from 'primereact/dropdown';
import type { DropdownFilterEvent } from 'primereact/dropdown';
import { SelectOption } from '@/types/erp';
import { truncateLabel } from '@/lib/formatters/display';

export const SearchSelect = <TValue extends string | number | boolean | null = string>({
    id,
    value,
    options,
    onChange,
    onSearch,
    placeholder,
    filterPlaceholder,
    emptyMessage,
    loading,
    disabled,
    maxLabelLength = 40
}: {
    id?: string;
    value?: TValue | null;
    options: SelectOption<TValue>[];
    onChange: (value: TValue | null) => void;
    onSearch?: (term: string) => void;
    placeholder?: string;
    filterPlaceholder?: string;
    emptyMessage?: string;
    loading?: boolean;
    disabled?: boolean;
    maxLabelLength?: number;
}) => (
    <Dropdown
        id={id}
        value={value ?? null}
        options={options}
        optionLabel="label"
        optionValue="value"
        filter
        showClear
        filterBy="label"
        dropdownIcon={loading ? 'pi pi-spin pi-spinner' : undefined}
        emptyMessage={loading ? 'Buscando registros...' : emptyMessage ?? 'Nenhum registro encontrado.'}
        panelFooterTemplate={loading ? <div className="px-3 py-2 text-sm text-color-secondary"><i className="pi pi-spin pi-spinner mr-2" />Buscando na API...</div> : undefined}
        filterPlaceholder={filterPlaceholder ?? 'Digite para buscar'}
        resetFilterOnHide
        placeholder={placeholder ?? 'Selecione'}
        disabled={disabled}
        valueTemplate={(option: SelectOption<TValue> | null) => {
            if (!option) return <span>{placeholder ?? 'Selecione'}</span>;
            const label = String(option.label ?? '');
            return <span title={label}>{truncateLabel(label, maxLabelLength)}</span>;
        }}
        onChange={(event) => onChange((event.value ?? null) as TValue | null)}
        onFilter={onSearch ? (event: DropdownFilterEvent) => onSearch(event.filter ?? '') : undefined}
    />
);
