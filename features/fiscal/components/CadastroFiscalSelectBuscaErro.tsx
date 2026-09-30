'use client';

// Erro da busca de NCM/CFOP (v1.11.0a8b72, D99): antes o select só mostrava lista vazia e escondia a falha. Mostra a
// mensagem do backend (`mapApiError`, com código, status e trace quando existem) e oferece nova tentativa.

import { Button } from 'primereact/button';
import { mapApiError } from '@/lib/http/apiError';

export const CadastroFiscalSelectBuscaErro = ({ error, mensagem, fetching, onRetry }: { error?: unknown; mensagem: string; fetching?: boolean; onRetry: () => void }) => {
    if (!error) return null;

    const apiError = mapApiError(error);
    const meta = [apiError.code, apiError.status ? `HTTP ${apiError.status}` : null, apiError.traceId ? `Trace ${apiError.traceId}` : null].filter(Boolean).join(' • ');

    return (
        <div className="mt-1 flex flex-column gap-1" role="alert">
            <small className="p-error block line-height-3">
                {mensagem} {apiError.message}
                {meta ? ` (${meta})` : ''}
            </small>
            <div>
                <Button type="button" label="Tentar novamente" icon="pi pi-refresh" size="small" text loading={fetching} onClick={onRetry} />
            </div>
        </div>
    );
};
