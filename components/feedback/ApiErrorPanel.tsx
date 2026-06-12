import { Message } from 'primereact/message';
import { ApiError } from '@/types/erp';

const metaItems = (error: ApiError) =>
    [error.code ? `Código: ${error.code}` : null, error.status ? `HTTP ${error.status}` : null, error.traceId ? `Trace: ${error.traceId}` : null].filter(Boolean);

export const ApiErrorPanel = ({ error, title = 'Não foi possível concluir a operação.' }: { error?: ApiError | null; title?: string }) => {
    if (!error) return null;

    const meta = metaItems(error);
    const validationErrors = error.validationErrors ?? [];

    return (
        <div className="w-full mb-3">
            <Message className="w-full" severity="error" text={error.message || title} />
            {meta.length || validationErrors.length ? (
                <div className="surface-50 border-1 border-red-100 border-round px-3 py-2 mt-2 text-sm line-height-3">
                    {meta.length ? <div className="text-color-secondary mb-1">{meta.join(' • ')}</div> : null}
                    {validationErrors.length ? (
                        <ul className="m-0 pl-3">
                            {validationErrors.slice(0, 5).map((item) => (
                                <li key={`${item.field}-${item.message}`}>
                                    <strong>{item.field}:</strong> {item.message}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
