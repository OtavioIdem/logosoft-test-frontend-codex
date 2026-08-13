'use client';

import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

export const OrganizationalContextSelector = () => {
    const context = useOrganizationalContext();

    if (!context.canChangeOrganization) {
        return (
            <span className="layout-topbar-button" aria-label="Contexto organizacional definido pela sessão">
                <i className="pi pi-lock" aria-hidden="true" />
                <span>Contexto da sessão</span>
            </span>
        );
    }

    return (
        <div className="flex flex-column lg:flex-row align-items-stretch lg:align-items-center gap-2 px-2 w-full lg:w-auto" aria-label="Selecionar contexto organizacional">
            <div className="w-full lg:w-12rem">
                <label htmlFor="organizational-empresa" className="p-sr-only">Empresa ativa</label>
                <EmpresaSelect id="organizational-empresa" value={context.empresaId} required onChange={context.setEmpresaId} />
            </div>
            <div className="w-full lg:w-12rem">
                <label htmlFor="organizational-filial" className="p-sr-only">Filial ativa</label>
                <FilialSelect id="organizational-filial" empresaId={context.empresaId} value={context.filialId} disabled={!context.empresaId} onChange={context.setFilialId} />
            </div>
            {context.isGlobal ? <small className="text-orange-500 white-space-nowrap" role="status" aria-live="polite">Selecione uma empresa</small> : null}
        </div>
    );
};
