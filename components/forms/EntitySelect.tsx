'use client';

import { SearchSelect } from './SearchSelect';
import { SelectOption } from '@/types/erp';

export const EntitySelect = ({
    id,
    value,
    options,
    onChange,
    onSearch,
    entityName,
    disabled,
    loading,
    emptyMessage
}: {
    id?: string;
    value?: string | null;
    options: SelectOption<string>[];
    onChange: (value: string | null) => void;
    onSearch?: (term: string) => void;
    entityName: string;
    disabled?: boolean;
    loading?: boolean;
    emptyMessage?: string;
}) => (
    <SearchSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        onSearch={onSearch}
        placeholder={`Buscar ${entityName}`}
        filterPlaceholder={`Buscar ${entityName}`}
        emptyMessage={emptyMessage ?? `Nenhum(a) ${entityName} encontrado(a).`}
        loading={loading}
        disabled={disabled}
    />
);
