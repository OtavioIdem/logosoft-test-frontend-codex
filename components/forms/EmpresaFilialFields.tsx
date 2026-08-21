'use client';

import { useEffect, useRef } from 'react';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FieldError } from '@/components/forms/FieldError';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { SelecionarContextoButton } from '@/components/organizational/SelecionarContextoButton';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';
import { Message } from 'primereact/message';

export const EmpresaFilialFields = ({
    empresaId,
    filialId,
    onEmpresaChange,
    onFilialChange,
    empresaError,
    filialError,
    disabled,
    empresaRequired = true,
    showFilial = true,
    empresaCol = 'col-12 md:col-6',
    filialCol = 'col-12 md:col-6'
}: {
    empresaId?: string | null;
    filialId?: string | null;
    onEmpresaChange: (value: string | null) => void;
    onFilialChange: (value: string | null) => void;
    empresaError?: string;
    filialError?: string;
    disabled?: boolean;
    empresaRequired?: boolean;
    showFilial?: boolean;
    empresaCol?: string;
    filialCol?: string;
}) => {
    const context = useOrganizationalContext();
    const alignedEmpresaId = context.snapshot.empresaId;
    const empresaLocked = true;
    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const normalizedFilialId = normalizeGuidOrNull(filialId);
    const empresaHydrationKeyRef = useRef<string | null>(null);
    const contextoFilialKeyRef = useRef<string | null>(null);
    const filialClearKeyRef = useRef<string | null>(null);
    const filiaisQuery = useFiliaisOptions(alignedEmpresaId);

    useEffect(() => {
        if (normalizedEmpresaId === alignedEmpresaId) {
            empresaHydrationKeyRef.current = null;
            return;
        }

        const hydrationKey = `${alignedEmpresaId ?? 'global'}|${normalizedEmpresaId ?? 'vazio'}`;
        if (empresaHydrationKeyRef.current === hydrationKey) return;
        empresaHydrationKeyRef.current = hydrationKey;
        onEmpresaChange(alignedEmpresaId);
    }, [alignedEmpresaId, empresaId, normalizedEmpresaId, onEmpresaChange]);

    useEffect(() => {
        const contextoFilialKey = `${alignedEmpresaId ?? 'global'}:${context.snapshot.filialId ?? 'todas'}:${context.snapshot.revision}`;
        if (contextoFilialKeyRef.current === contextoFilialKey) return;
        contextoFilialKeyRef.current = contextoFilialKey;

        if (normalizedFilialId !== context.snapshot.filialId) onFilialChange(context.snapshot.filialId);
    }, [alignedEmpresaId, context.snapshot.filialId, context.snapshot.revision, normalizedFilialId, onFilialChange]);

    useEffect(() => {
        if (!normalizedFilialId) {
            filialClearKeyRef.current = null;
            return;
        }

        const filiaisResolved = filiaisQuery.isFetched || (filiaisQuery.data?.length ?? 0) > 0;
        if (filiaisQuery.isFetching || filiaisQuery.isError || !filiaisResolved) return;

        const filialNaoPertenceAoContexto = !alignedEmpresaId || !filiaisQuery.data?.some((filial) => filial.id === normalizedFilialId);
        if (!filialNaoPertenceAoContexto) {
            filialClearKeyRef.current = null;
            return;
        }

        const clearKey = `${alignedEmpresaId ?? 'global'}:${normalizedFilialId}`;
        if (filialClearKeyRef.current === clearKey) return;
        filialClearKeyRef.current = clearKey;
        onFilialChange(null);
    }, [alignedEmpresaId, filialId, filiaisQuery.data, filiaisQuery.isError, filiaisQuery.isFetched, filiaisQuery.isFetching, normalizedFilialId, onFilialChange]);

    return (
        <>
            <div className={`field ${empresaCol}`}>
                <label htmlFor="empresaId" className="font-medium">
                    Empresa{empresaRequired ? <span className="text-red-500 ml-1">*</span> : null}
                </label>
                <EmpresaSelect id="empresaId" value={alignedEmpresaId} required={empresaRequired} disabled={disabled || empresaLocked} onChange={(value) => { onEmpresaChange(value); onFilialChange(null); }} />
                <small className="text-color-secondary">A empresa é definida pelo contexto organizacional ativo.</small>
                {!context.snapshot.empresaId ? (
                    <div className="flex flex-column gap-2 mt-2">
                        <Message className="w-full" severity="warn" text={'Selecione uma empresa pelo botão "Selecionar contexto" no topo antes de preencher este formulário.'} />
                        <SelecionarContextoButton variant="inline" />
                    </div>
                ) : null}
                <FieldError message={empresaError} />
            </div>
            {showFilial ? (
                <div className={`field ${filialCol}`}>
                    <label htmlFor="filialId" className="font-medium">Filial</label>
                    <FilialSelect id="filialId" empresaId={alignedEmpresaId} value={normalizedFilialId} disabled={disabled || !alignedEmpresaId} onChange={onFilialChange} />
                    <small className="text-color-secondary">Opcional; se não selecionada será enviada como null ou omitida.</small>
                    <FieldError message={filialError} />
                </div>
            ) : null}
        </>
    );
};
