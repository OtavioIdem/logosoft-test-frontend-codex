'use client';

import { useEffect } from 'react';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FieldError } from '@/components/forms/FieldError';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

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
    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const filiaisQuery = useFiliaisOptions(normalizedEmpresaId);

    useEffect(() => {
        if (!filialId) return;
        if (!normalizedEmpresaId) {
            onFilialChange(null);
            return;
        }
        if (filiaisQuery.data && !filiaisQuery.data.some((filial) => filial.id === filialId)) {
            onFilialChange(null);
        }
    }, [filialId, filiaisQuery.data, normalizedEmpresaId, onFilialChange]);

    return (
        <>
            <div className={`field ${empresaCol}`}>
                <label htmlFor="empresaId" className="font-medium">
                    Empresa{empresaRequired ? <span className="text-red-500 ml-1">*</span> : null}
                </label>
                <EmpresaSelect id="empresaId" value={normalizedEmpresaId} required={empresaRequired} disabled={disabled} onChange={(value) => { onEmpresaChange(value); onFilialChange(null); }} />
                <small className="text-color-secondary">Pesquise pelo nome/razão social; o vínculo correto será enviado automaticamente.</small>
                <FieldError message={empresaError} />
            </div>
            {showFilial ? (
                <div className={`field ${filialCol}`}>
                    <label htmlFor="filialId" className="font-medium">Filial</label>
                    <FilialSelect id="filialId" empresaId={normalizedEmpresaId} value={filialId ?? null} disabled={disabled || !normalizedEmpresaId} onChange={onFilialChange} />
                    <small className="text-color-secondary">Opcional; se não selecionada será enviada como null ou omitida.</small>
                    <FieldError message={filialError} />
                </div>
            ) : null}
        </>
    );
};
