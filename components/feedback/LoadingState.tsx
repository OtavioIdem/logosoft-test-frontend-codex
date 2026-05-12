import { Skeleton } from 'primereact/skeleton';

export const LoadingState = () => (
    <div className="surface-card p-4 border-round">
        <Skeleton height="2rem" className="mb-3" />
        <Skeleton height="1rem" className="mb-2" />
        <Skeleton height="1rem" className="mb-2" />
        <Skeleton height="1rem" width="70%" />
    </div>
);
