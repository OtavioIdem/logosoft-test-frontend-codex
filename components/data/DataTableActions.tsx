'use client';

import { useRef } from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PermissionCode } from '@/types/erp';

export type RowAction = {
    key: string;
    label: string;
    icon: string;
    permission?: PermissionCode;
    severity?: 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'help';
    disabled?: boolean;
    onClick: () => void;
};

/**
 * Ações de linha responsivas: no desktop (>= md) mostra botões inline; no mobile colapsa num
 * overflow menu (kebab), evitando que 3+ botões empilhem e estourem a altura da linha. As ações
 * são filtradas pela permissão do usuário (mesma regra do `PermissionGuard mode="hide"`).
 */
export const DataTableActions = ({ actions }: { actions: RowAction[] }) => {
    const { hasPermission } = usePermissions();
    const menuRef = useRef<Menu>(null);
    const visible = actions.filter((action) => hasPermission(action.permission));

    if (visible.length === 0) return null;

    const menuModel: MenuItem[] = visible.map((action) => ({
        label: action.label,
        icon: action.icon,
        disabled: action.disabled,
        command: () => action.onClick()
    }));

    return (
        <>
            <div className="hidden md:flex gap-2 justify-content-end flex-wrap">
                {visible.map((action) => (
                    <Button key={action.key} type="button" icon={action.icon} label={action.label} size="small" text severity={action.severity} disabled={action.disabled} onClick={action.onClick} />
                ))}
            </div>
            <div className="flex md:hidden justify-content-end">
                <Menu model={menuModel} popup ref={menuRef} />
                <Button type="button" icon="pi pi-ellipsis-v" text rounded size="small" aria-label="Ações" aria-haspopup onClick={(event) => menuRef.current?.toggle(event)} />
            </div>
        </>
    );
};
