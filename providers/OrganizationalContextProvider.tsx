'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const normalizeOrganizationalId = (value?: string | null) => {
    const normalized = normalizeGuidOrNull(value);
    return normalized === EMPTY_GUID ? null : normalized;
};

export type OrganizationalContextValue = {
    empresaId: string | null;
    filialId: string | null;
    isGlobal: boolean;
    canChangeOrganization: boolean;
    requiresOrganizationSelection: boolean;
    setEmpresaId: (empresaId: string | null) => void;
    setFilialId: (filialId: string | null) => void;
};

export const OrganizationalContext = createContext<OrganizationalContextValue | undefined>(undefined);

type MasterSelection = {
    identityKey: string;
    empresaId: string | null;
    filialId: string | null;
    revision: number;
};

export const OrganizationalContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const userId = isAuthenticated ? user?.id ?? null : null;
    const isMaster = Boolean(userId && user?.isMaster === true);
    const claimedEmpresaId = normalizeOrganizationalId(isAuthenticated ? user?.empresaId : null);
    const claimedFilialId = normalizeOrganizationalId(isAuthenticated ? user?.filialId : null);
    const identityKey = `${userId ?? 'anonymous'}|${isMaster}|${isMaster ? '' : claimedEmpresaId ?? ''}|${isMaster ? '' : claimedFilialId ?? ''}`;
    const [selection, setSelection] = useState<MasterSelection>({ identityKey, empresaId: null, filialId: null, revision: 0 });
    const [publishedIdentityKey, setPublishedIdentityKey] = useState(identityKey);
    const previousIdentityKey = useRef(identityKey);
    const publishedRevision = useRef(0);

    const masterSelection = selection.identityKey === identityKey ? selection : { identityKey, empresaId: null, filialId: null, revision: 0 };
    const empresaId = isMaster ? masterSelection.empresaId : claimedEmpresaId;
    const filialId = isMaster ? masterSelection.filialId : claimedFilialId;

    useEffect(() => {
        if (previousIdentityKey.current === identityKey) return;
        previousIdentityKey.current = identityKey;
        publishedRevision.current = 0;
        setSelection({ identityKey, empresaId: null, filialId: null, revision: 0 });
        queryClient.clear();
        setPublishedIdentityKey(identityKey);
    }, [identityKey, queryClient]);

    useEffect(() => {
        if (masterSelection.revision === 0 || publishedRevision.current === masterSelection.revision) return;
        publishedRevision.current = masterSelection.revision;
        void queryClient.invalidateQueries({
            predicate: (query) => {
                const [area, resource, purpose] = query.queryKey;
                return !(area === 'administracao' && (resource === 'empresas' || resource === 'filiais') && purpose === 'select');
            }
        });
    }, [masterSelection.revision, queryClient]);

    const setEmpresaId = useCallback((nextEmpresaId: string | null) => {
        if (!isMaster) return;
        const normalizedEmpresaId = normalizeOrganizationalId(nextEmpresaId);
        setSelection((current) => {
            const effective = current.identityKey === identityKey ? current : { identityKey, empresaId: null, filialId: null, revision: 0 };
            if (effective.empresaId === normalizedEmpresaId && effective.filialId === null) return effective;
            return { identityKey, empresaId: normalizedEmpresaId, filialId: null, revision: effective.revision + 1 };
        });
    }, [identityKey, isMaster]);

    const setFilialId = useCallback((nextFilialId: string | null) => {
        if (!isMaster || !empresaId) return;
        const normalizedFilialId = normalizeOrganizationalId(nextFilialId);
        setSelection((current) => {
            const effective = current.identityKey === identityKey ? current : { identityKey, empresaId: null, filialId: null, revision: 0 };
            if (!effective.empresaId || effective.filialId === normalizedFilialId) return effective;
            return { ...effective, filialId: normalizedFilialId, revision: effective.revision + 1 };
        });
    }, [empresaId, identityKey, isMaster]);

    const value = useMemo<OrganizationalContextValue>(() => ({
        empresaId,
        filialId,
        isGlobal: isMaster && !empresaId,
        canChangeOrganization: isMaster,
        requiresOrganizationSelection: isMaster && !empresaId,
        setEmpresaId,
        setFilialId
    }), [empresaId, filialId, isMaster, setEmpresaId, setFilialId]);

    if (publishedIdentityKey !== identityKey) {
        return <div role="status" aria-live="polite">Atualizando contexto organizacional...</div>;
    }

    return <OrganizationalContext.Provider value={value}>{children}</OrganizationalContext.Provider>;
};
