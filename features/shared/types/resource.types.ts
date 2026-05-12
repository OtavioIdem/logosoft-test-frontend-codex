import { PermissionCode, SelectOption } from '@/types/erp';
export type ResourceFieldKind = 'text' | 'textarea' | 'money' | 'number' | 'percent' | 'date' | 'datetime' | 'cpfCnpj' | 'cnpj' | 'select' | 'checkbox';
export type ResourceField = { name: string; label: string; kind: ResourceFieldKind; required?: boolean; placeholder?: string; options?: SelectOption[]; permission?: PermissionCode; helperText?: string; col?: string };
export type ResourceColumn = { field: string; header: string; type?: 'text' | 'money' | 'number' | 'status' | 'date' | 'datetime' | 'boolean'; sortable?: boolean };
export type ResourceAction = { key: string; label: string; icon: string; permission?: PermissionCode; severity?: 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'help'; requiresReason?: boolean; reasonLabel?: string; allowedStatuses?: string[]; disabledWhen?: string[]; statusTo?: string; apiAction?: string; successMessage?: string; confirmMessage?: string };
export type ResourceDefinition = { key: string; title: string; module: string; description: string; endpoint: string; viewPermission: PermissionCode; managePermission?: PermissionCode; columns: ResourceColumn[]; fields: ResourceField[]; filters?: ResourceField[]; rowActions: ResourceAction[]; initialData: Record<string, unknown>[]; notes?: string[]; criticalFlow?: boolean };
export type ResourceQuery = { page?: number; pageSize?: number; search?: string; sortField?: string; sortOrder?: 1 | -1 | 0 | null };
export type ResourceSavePayload = Record<string, unknown> & { id?: string };
