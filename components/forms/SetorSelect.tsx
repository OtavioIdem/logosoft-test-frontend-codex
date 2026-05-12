'use client';

import { EntitySelect } from '@/components/forms/EntitySelect';
import { useSetoresOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';

export const SetorSelect = ({
    id = 'setorId',
    empresaId,
    filialId,
    value,
    onChange,
    disabled
}: {
    id?: string;
    empresaId?: string | null;
    filialId?: string | null;
    value?: string | null;
    onChange: (value: string | null) => void;
    disabled?: boolean;
}) => {
    const setoresQuery = useSetoresOptions(empresaId, filialId);

    return (
        <EntitySelect
            key={`${empresaId ?? 'sem-empresa'}-${filialId ?? 'sem-filial'}`}
            id={id}
            value={value ?? null}
            options={setoresQuery.options}
            onChange={onChange}
            entityName="setor"
            disabled={disabled || !empresaId || setoresQuery.isLoading}
        />
    );
};
