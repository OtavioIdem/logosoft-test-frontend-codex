'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { AppToastContext, AppToastContextValue } from '@/hooks/useAppToast';
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const toastRef = useRef<Toast>(null);
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail) toastRef.current?.show({ life: 6000, ...detail });
        };
        window.addEventListener('logosoft:toast', handler);
        return () => window.removeEventListener('logosoft:toast', handler);
    }, []);
    const value = useMemo<AppToastContextValue>(() => ({
        show: (message) => toastRef.current?.show({ life: 5000, ...message }),
        success: (summary, detail) => toastRef.current?.show({ severity: 'success', summary, detail, life: 4000 }),
        info: (summary, detail) => toastRef.current?.show({ severity: 'info', summary, detail, life: 5000 }),
        warn: (summary, detail) => toastRef.current?.show({ severity: 'warn', summary, detail, life: 6000 }),
        error: (summary, detail) => toastRef.current?.show({ severity: 'error', summary, detail, life: 7000 })
    }), []);
    return <AppToastContext.Provider value={value}><Toast ref={toastRef} position="top-right" />{children}</AppToastContext.Provider>;
};
