'use client';

import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';

export const EmpresaFilialFilter = ({ empresaId, filialId, onEmpresaChange, onFilialChange, showFilial = true }: { empresaId?: string | null; filialId?: string | null; onEmpresaChange: (value: string | null) => void; onFilialChange: (value: string | null) => void; showFilial?: boolean }) => (
    <>
        <div className="min-w-18rem">
            <EmpresaSelect value={empresaId ?? null} onChange={(value) => { onEmpresaChange(value); onFilialChange(null); }} />
        </div>
        {showFilial ? (
            <div className="min-w-18rem">
                <FilialSelect empresaId={empresaId ?? null} value={filialId ?? null} disabled={!empresaId} onChange={onFilialChange} />
            </div>
        ) : null}
    </>
);
