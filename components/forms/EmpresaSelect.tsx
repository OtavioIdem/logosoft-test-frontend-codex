'use client';

import { EntitySelect } from '@/components/forms/EntitySelect';
import { useEmpresasOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';

export const EmpresaSelect = ({ id = 'empresaId', value, onChange, disabled, required }: { id?: string; value?: string | null; onChange: (value: string | null) => void; disabled?: boolean; required?: boolean }) => {
    const empresasQuery = useEmpresasOptions();

    return (
        <EntitySelect
            id={id}
            value={value ?? null}
            options={empresasQuery.options}
            onChange={onChange}
            entityName={required ? 'empresa obrigatória' : 'empresa'}
            disabled={disabled || empresasQuery.isLoading}
        />
    );
};
