'use client';
import { Button } from 'primereact/button';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { PermissionCode } from '@/types/erp';
export type RowAction = { key: string; label: string; icon: string; permission?: PermissionCode; severity?: 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'help'; disabled?: boolean; onClick: () => void };
export const DataTableActions = ({ actions }: { actions: RowAction[] }) => <div className="flex gap-2 justify-content-end flex-wrap">{actions.map((action) => <PermissionGuard key={action.key} permission={action.permission} mode="hide"><Button type="button" icon={action.icon} label={action.label} size="small" text severity={action.severity} disabled={action.disabled} onClick={action.onClick} /></PermissionGuard>)}</div>;
