'use client';
import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';
import { OrganizationalContextProvider } from './OrganizationalContextProvider';
import { createAppQueryClient } from '@/lib/query/queryClient';
export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    const [queryClient] = useState(() => createAppQueryClient());
    return <QueryClientProvider client={queryClient}><ToastProvider><AuthProvider><OrganizationalContextProvider>{children}</OrganizationalContextProvider></AuthProvider></ToastProvider></QueryClientProvider>;
};
