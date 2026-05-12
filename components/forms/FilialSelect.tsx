'use client';

import { EntitySelect } from '@/components/forms/EntitySelect';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';

export const FilialSelect = ({ id = 'filialId', empresaId, value, onChange, disabled }: { id?: string; empresaId?: string | null; value?: string | null; onChange: (value: string | null) => void; disabled?: boolean }) => {
    const filiaisQuery = useFiliaisOptions(empresaId);

    return (
        <EntitySelect
            key={empresaId ?? 'sem-empresa'}
            id={id}
            value={value ?? null}
            options={filiaisQuery.options}
            onChange={onChange}
            entityName="filial"
            disabled={disabled || !empresaId || filiaisQuery.isLoading}
        />
    );
};
