'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { OrganizationalContextDialog } from '@/components/organizational/OrganizationalContextDialog';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

export type SelecionarContextoButtonProps = {
    variant?: 'topbar' | 'inline';
    label?: string;
    className?: string;
};

export const SelecionarContextoButton = ({ variant = 'inline', label, className }: SelecionarContextoButtonProps) => {
    const context = useOrganizationalContext();
    const [visible, setVisible] = useState(false);

    if (!context.canChangeOrganization) return null;

    const resolvedLabel = label ?? (context.isGlobal ? 'Selecionar contexto' : 'Alterar contexto');
    const ariaLabel = context.isGlobal
        ? 'Selecionar contexto organizacional. Nenhuma empresa está ativa.'
        : 'Alterar contexto organizacional. Há uma empresa ativa.';
    const attention = context.isGlobal ? ' organizational-context-button--attention' : '';

    return (
        <>
            {variant === 'topbar' ? (
                <button
                    type="button"
                    className={className ?? `p-link layout-topbar-button organizational-context-button${attention}`}
                    onClick={() => setVisible(true)}
                    aria-label={ariaLabel}
                    aria-haspopup="dialog"
                >
                    <i className="pi pi-building" aria-hidden="true" />
                    <span className="layout-topbar-button-label">{resolvedLabel}</span>
                </button>
            ) : (
                <Button
                    type="button"
                    className={className ?? `organizational-context-button-inline${attention}`}
                    icon="pi pi-building"
                    label={resolvedLabel}
                    severity={context.isGlobal ? 'warning' : undefined}
                    onClick={() => setVisible(true)}
                    aria-label={ariaLabel}
                    aria-haspopup="dialog"
                    outlined
                />
            )}
            <OrganizationalContextDialog visible={visible} onHide={() => setVisible(false)} />
        </>
    );
};
