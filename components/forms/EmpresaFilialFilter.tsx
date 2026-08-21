'use client';

import { useEffect, useRef } from 'react';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { SelecionarContextoButton } from '@/components/organizational/SelecionarContextoButton';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';
import { Message } from 'primereact/message';

export const EmpresaFilialFilter = ({ empresaId, filialId, onEmpresaChange, onFilialChange, showFilial = true }: { empresaId?: string | null; filialId?: string | null; onEmpresaChange: (value: string | null) => void; onFilialChange: (value: string | null) => void; showFilial?: boolean }) => {
    const context = useOrganizationalContext();
    const alignedEmpresaId = context.snapshot.empresaId;
    const normalizedFilialId = normalizeGuidOrNull(filialId);
    const empresaLocked = true;
    const empresaHydrationKeyRef = useRef<string | null>(null);
    const contextoFilialKeyRef = useRef<string | null>(null);
    const filialClearKeyRef = useRef<string | null>(null);
    const filiaisQuery = useFiliaisOptions(alignedEmpresaId);

    useEffect(() => {
        const propEmpresaId = normalizeGuidOrNull(empresaId);
        if (propEmpresaId === alignedEmpresaId) {
            empresaHydrationKeyRef.current = null;
            return;
        }

        const hydrationKey = `${alignedEmpresaId ?? 'global'}|${propEmpresaId ?? 'vazio'}`;
        if (empresaHydrationKeyRef.current === hydrationKey) return;
        empresaHydrationKeyRef.current = hydrationKey;
        onEmpresaChange(alignedEmpresaId);
    }, [alignedEmpresaId, empresaId, onEmpresaChange]);

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
        if (filiaisQuery.isFetching || filiaisQuery.isError) return;
        const filiaisResolved = filiaisQuery.isFetched || (filiaisQuery.data?.length ?? 0) > 0;
        if (!filiaisResolved) return;
        if (filiaisQuery.data?.some((filial) => filial.id === normalizedFilialId)) {
            filialClearKeyRef.current = null;
            return;
        }

        const clearKey = `${alignedEmpresaId ?? 'global'}:${normalizedFilialId}`;
        if (filialClearKeyRef.current === clearKey) return;
        filialClearKeyRef.current = clearKey;
        onFilialChange(null);
    }, [alignedEmpresaId, filiaisQuery.data, filiaisQuery.isError, filiaisQuery.isFetched, filiaisQuery.isFetching, normalizedFilialId, onFilialChange]);

    return (
        <>
            <div className="min-w-18rem">
                <EmpresaSelect value={alignedEmpresaId} disabled={empresaLocked} onChange={(value) => { onEmpresaChange(value); onFilialChange(null); }} />
            </div>
            {context.isGlobal ? (
                <div className="flex flex-column gap-2 w-full">
                    <Message className="w-full" severity="warn" text={'Selecione a empresa pelo botão "Selecionar contexto" no topo da tela.'} />
                    <SelecionarContextoButton variant="inline" />
                </div>
            ) : null}
            {showFilial ? (
                <div className="min-w-18rem">
                    <FilialSelect empresaId={alignedEmpresaId} value={normalizedFilialId} disabled={!alignedEmpresaId} onChange={onFilialChange} />
                </div>
            ) : null}
        </>
    );
};
