'use client';

import { useCallback } from 'react';
import { useAppToast } from '@/hooks/useAppToast';

export type ToastText = { summary: string; detail?: string };

export type RunWithToastOptions = {
    /** Toast exibido quando a ação resolve. Omitir para não notificar sucesso. */
    success?: ToastText;
    /** Toast base de erro; o `detail` real vem da mensagem do backend (`mapApiError` já normaliza). */
    error?: ToastText;
    /** Relança o erro após notificar — útil para manter diálogos abertos no submit que falhou. */
    rethrow?: boolean;
};

const DEFAULT_ERROR: ToastText = { summary: 'Não foi possível concluir a operação.' };

/**
 * Executa uma ação assíncrona (tipicamente `mutation.mutateAsync`) centralizando o feedback via toast.
 * Substitui o boilerplate `try { await ...; toast.success } catch { toast.error }` repetido na base (achado B#4).
 *
 * @example
 * const runWithToast = useMutationWithToast();
 * await runWithToast(() => salvarMutation.mutateAsync(payload), {
 *   success: { summary: 'Registro salvo' },
 *   error: { summary: 'Erro ao salvar' },
 *   rethrow: true
 * });
 */
export const useMutationWithToast = () => {
    const toast = useAppToast();

    return useCallback(
        async <T>(action: () => Promise<T>, options: RunWithToastOptions = {}): Promise<T | undefined> => {
            try {
                const result = await action();
                if (options.success) {
                    toast.success(options.success.summary, options.success.detail);
                }
                return result;
            } catch (error) {
                const base = options.error ?? DEFAULT_ERROR;
                const detail = error instanceof Error && error.message ? error.message : base.detail;
                toast.error(base.summary, detail);
                if (options.rethrow) {
                    throw error;
                }
                return undefined;
            }
        },
        [toast]
    );
};
