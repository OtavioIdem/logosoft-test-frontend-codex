'use client';

import { useContext } from 'react';
import { OrganizationalContext } from '@/providers/OrganizationalContextProvider';

export const useOrganizationalContext = () => {
    const context = useContext(OrganizationalContext);
    if (!context) throw new Error('useOrganizationalContext deve ser usado dentro de OrganizationalContextProvider.');
    return context;
};
