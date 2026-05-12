'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ResourceAction, ResourceDefinition, ResourceQuery, ResourceSavePayload } from '@/features/shared/types/resource.types';
import { createResourceClient } from '@/features/shared/api/resourceClient';
export const useResourceController = (definition: ResourceDefinition) => {
    const queryClient = useQueryClient(); const client = useMemo(() => createResourceClient(definition), [definition]);
    const [query, setQuery] = useState<ResourceQuery>({ page: 1, pageSize: 10, sortOrder: null }); const queryKey = [definition.key, query] as const;
    const listQuery = useQuery({ queryKey, queryFn: () => client.list(query) });
    const saveMutation = useMutation({ mutationFn: (payload: ResourceSavePayload) => client.save(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: [definition.key] }) });
    const actionMutation = useMutation({ mutationFn: ({ id, action, reason }: { id: string; action: ResourceAction; reason?: string }) => client.applyAction(id, action, reason), onSuccess: () => queryClient.invalidateQueries({ queryKey: [definition.key] }) });
    return { query, setQuery, listQuery, saveMutation, actionMutation };
};
