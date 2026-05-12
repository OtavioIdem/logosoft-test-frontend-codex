import { PagedResult, StatusHistoryItem } from '@/types/erp';
import { ResourceDefinition, ResourceQuery, ResourceSavePayload } from '@/features/shared/types/resource.types';
import { resourceCatalog } from '@/features/shared/config/erpFeatureCatalog';
const now = () => new Date().toISOString();
const newId = () => Math.random().toString(36).slice(2, 10);
const withAudit = (record: Record<string, unknown>) => ({
    ...record,
    status: record.status ?? 'ATIVO',
    auditoria: record.auditoria ?? { criadoPor: 'mock-dev', criadoEm: now() },
    historicoStatus: record.historicoStatus ?? ([{ id: `${record.id ?? newId()}-hist-1`, statusNovo: String(record.status ?? 'ATIVO'), usuario: 'mock-dev', criadoEm: now() }] satisfies StatusHistoryItem[])
});
const state: Record<string, Record<string, unknown>[]> = Object.fromEntries(Object.values(resourceCatalog).map((definition) => [definition.key, definition.initialData.map(withAudit)]));
const getRows = (definition: ResourceDefinition) => {
    state[definition.key] = state[definition.key] ?? definition.initialData.map(withAudit);
    return state[definition.key];
};
const applySearch = (rows: Record<string, unknown>[], search?: string) => !search?.trim() ? rows : rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())));
const applySort = (rows: Record<string, unknown>[], sortField?: string, sortOrder?: 1 | -1 | 0 | null) => (!sortField || !sortOrder) ? rows : [...rows].sort((a, b) => String(a[sortField] ?? '').localeCompare(String(b[sortField] ?? ''), 'pt-BR', { numeric: true }) * sortOrder);
export const mockErpStore = {
    async list(definition: ResourceDefinition, query: ResourceQuery = {}): Promise<PagedResult<Record<string, unknown>>> {
        const page = query.page ?? 1; const pageSize = query.pageSize ?? 10;
        const filtered = applySearch(getRows(definition), query.search);
        const sorted = applySort(filtered, query.sortField, query.sortOrder);
        const start = (page - 1) * pageSize;
        return { items: sorted.slice(start, start + pageSize), page, pageSize, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) };
    },
    async get(definition: ResourceDefinition, id: string) {
        const row = getRows(definition).find((item) => item.id === id);
        if (!row) throw new Error('Registro não encontrado.');
        return row;
    },
    async save(definition: ResourceDefinition, payload: ResourceSavePayload) {
        const rows = getRows(definition); const currentDate = now();
        if (payload.id) {
            const index = rows.findIndex((item) => item.id === payload.id);
            if (index < 0) throw new Error('Registro não encontrado para atualização.');
            const current = rows[index];
            const status = String(current.status ?? 'ATIVO');
            if (['INATIVO', 'CANCELADO', 'FATURADO', 'QUITADO', 'RECEBIDO_TOTAL', 'FECHADO'].includes(status)) throw new Error('Registro em status final não pode ser alterado diretamente.');
            rows[index] = { ...current, ...payload, auditoria: { ...(current.auditoria as Record<string, unknown> | undefined), alteradoPor: 'mock-dev', alteradoEm: currentDate } };
            return rows[index];
        }
        const row = withAudit({ ...payload, id: `${definition.key}-${newId()}`, status: payload.status ?? (definition.criticalFlow ? 'RASCUNHO' : 'ATIVO') });
        rows.unshift(row); return row;
    },
    async applyAction(definition: ResourceDefinition, id: string, actionKey: string, reason?: string) {
        const rows = getRows(definition); const index = rows.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('Registro não encontrado.');
        const action = definition.rowActions.find((item) => item.key === actionKey);
        if (!action) throw new Error('Ação não configurada para este recurso.');
        if (action.requiresReason && !reason?.trim()) throw new Error('Motivo obrigatório não informado.');
        const current = rows[index]; const currentStatus = String(current.status ?? 'ATIVO');
        if (action.allowedStatuses?.length && !action.allowedStatuses.includes(currentStatus)) throw new Error('Ação indisponível para o status atual.');
        if (action.disabledWhen?.includes(currentStatus)) throw new Error('Ação bloqueada para o status atual.');
        const nextStatus = action.statusTo ?? currentStatus;
        const history = [...((current.historicoStatus as StatusHistoryItem[] | undefined) ?? []), { id: `${id}-${action.key}-${Date.now()}`, statusAnterior: currentStatus, statusNovo: nextStatus, motivo: reason, usuario: 'mock-dev', criadoEm: now() }];
        rows[index] = { ...current, status: nextStatus, saldo: nextStatus === 'QUITADO' ? 0 : current.saldo, statusCredito: nextStatus === 'CREDITO_BLOQUEADO' ? 'BLOQUEADO' : nextStatus === 'CREDITO_LIBERADO' ? 'LIBERADO' : current.statusCredito, auditoria: { ...(current.auditoria as Record<string, unknown> | undefined), alteradoPor: 'mock-dev', alteradoEm: now(), motivo: reason }, historicoStatus: history };
        return rows[index];
    },
    reset() { Object.keys(state).forEach((key) => { state[key] = resourceCatalog[key].initialData.map(withAudit); }); }
};
