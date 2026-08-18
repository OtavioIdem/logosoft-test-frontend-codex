'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { OrganizationalContextDialog } from '@/components/organizational/OrganizationalContextDialog';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

export const OrganizationalContextSelector = () => {
    const context = useOrganizationalContext();
    const [visible, setVisible] = useState(false);
    const label = context.isGlobal ? 'Selecionar contexto' : 'Alterar contexto';
    const ariaLabel = context.isGlobal
        ? 'Selecionar contexto organizacional. Nenhuma empresa está ativa.'
        : 'Alterar contexto organizacional. Há uma empresa ativa.';

    if (!context.canChangeOrganization) return null;

    return (
        <>
            <Button
                type="button"
                className={`p-link layout-topbar-button organizational-context-button${context.isGlobal ? ' organizational-context-button--attention' : ''}`}
                icon="pi pi-building"
                label={label}
                onClick={() => setVisible(true)}
                aria-label={ariaLabel}
                text
            />
            <OrganizationalContextDialog visible={visible} onHide={() => setVisible(false)} />
        </>
    );
};
