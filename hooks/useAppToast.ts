'use client';
import { createContext, useContext } from 'react';
import { ToastMessage } from 'primereact/toast';
export type AppToastMessage = Pick<ToastMessage, 'summary' | 'detail' | 'severity' | 'life' | 'sticky'>;
export type AppToastContextValue = { show: (message: AppToastMessage) => void; success: (summary: string, detail?: string) => void; info: (summary: string, detail?: string) => void; warn: (summary: string, detail?: string) => void; error: (summary: string, detail?: string) => void };
const noop = () => undefined;
export const AppToastContext = createContext<AppToastContextValue>({ show: noop, success: noop, info: noop, warn: noop, error: noop });
export const useAppToast = () => useContext(AppToastContext);
