import { ResourceAction, ResourceDefinition, ResourceQuery, ResourceSavePayload } from '@/features/shared/types/resource.types';
import { mockErpStore } from '@/features/shared/api/mockErpStore';

export const createMockResourceClient = (definition: ResourceDefinition) => ({
    list: (query: ResourceQuery = {}) => mockErpStore.list(definition, query),
    get: (id: string) => mockErpStore.get(definition, id),
    save: (payload: ResourceSavePayload) => mockErpStore.save(definition, payload),
    applyAction: (id: string, action: Pick<ResourceAction, 'key' | 'apiAction'>, reason?: string) => mockErpStore.applyAction(definition, id, action.key, reason)
});
