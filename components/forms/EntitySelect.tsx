'use client';
import { SearchSelect } from './SearchSelect';
import { SelectOption } from '@/types/erp';

export const EntitySelect = ({
    id,
    value,
    options,
    onChange,
    entityName,
    disabled
}: {
    id?: string;
    value?: string | null;
    options: SelectOption<string>[];
    onChange: (value: string | null) => void;
    entityName: string;
    disabled?: boolean;
}) => <SearchSelect id={id} value={value} options={options} onChange={onChange} placeholder={`Buscar ${entityName}`} disabled={disabled} />;
