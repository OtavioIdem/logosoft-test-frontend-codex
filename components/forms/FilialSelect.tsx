'use client';

import { EntitySelect } from '@/components/forms/EntitySelect';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { mapApiError } from '@/lib/http/apiError';

export const FilialSelect = ({ id = 'filialId', empresaId, value, onChange, disabled }: { id?: string; empresaId?: string | null; value?: string | null; onChange: (value: string | null) => void; disabled?: boolean }) => {
    const filiaisQuery = useFiliaisOptions(empresaId);

    const apiError = filiaisQuery.error ? mapApiError(filiaisQuery.error) : null;
    const errorMessage = filiaisQuery.blocked ? filiaisQuery.blockedMessage : apiError?.message;

    return (
        <>
            <EntitySelect
                key={empresaId ?? 'sem-empresa'}
                id={id}
                value={value ?? null}
                options={filiaisQuery.options}
                onChange={onChange}
                entityName="filial"
                disabled={disabled || !empresaId || filiaisQuery.isLoading || Boolean(errorMessage)}
                loading={filiaisQuery.isFetching}
                emptyMessage={empresaId ? 'Nenhuma filial disponível para a empresa selecionada.' : 'Selecione a empresa antes da filial.'}
            />
            {errorMessage ? (
                <Message className="w-full mt-2" severity="error" text={errorMessage} />
            ) : null}
            {apiError && !filiaisQuery.blocked ? (
                <Button type="button" className="p-button-text p-0 mt-1" label="Tentar novamente" icon="pi pi-refresh" onClick={() => void filiaisQuery.refetch()} disabled={filiaisQuery.isFetching} />
            ) : null}
        </>
    );
};
