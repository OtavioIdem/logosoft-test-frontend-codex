import { Message } from 'primereact/message';
import { ApiError } from '@/types/erp';

export const ApiErrorPanel = ({ error }: { error?: ApiError | null }) => {
    if (!error) return null;
    return <Message className="w-full mb-3" severity="error" text={error.message} />;
};
