import type { CSSProperties } from 'react';
import { Skeleton } from 'primereact/skeleton';

type LoadingStateVariant = 'panel' | 'table' | 'detail' | 'metrics' | 'cards';

type LoadingStateProps = {
    variant?: LoadingStateVariant;
    rows?: number;
    columns?: number;
    cards?: number;
    className?: string;
};

const toRange = (count: number) => Array.from({ length: count }, (_, index) => index);
const rowWidths = ['78%', '52%', '64%', '42%', '58%', '36%', '70%', '46%'];

const gridStyle = (columns: number): CSSProperties => ({
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: `repeat(${Math.min(Math.max(columns, 1), 8)}, minmax(7rem, 1fr))`
});

const buildClassName = (className?: string) => ['loading-state', className].filter(Boolean).join(' ');

const PanelSkeleton = ({ className }: Pick<LoadingStateProps, 'className'>) => (
    <div className={`${buildClassName(className)} surface-card p-4 border-round border-1 surface-border`} aria-busy="true" aria-label="Carregando informacoes">
        <Skeleton height="2rem" className="mb-3" />
        <Skeleton height="1rem" className="mb-2" />
        <Skeleton height="1rem" className="mb-2" />
        <Skeleton height="1rem" width="70%" />
    </div>
);

const TableSkeleton = ({ rows = 6, columns = 5, className }: LoadingStateProps) => {
    const safeRows = Math.min(Math.max(rows, 3), 10);
    const safeColumns = Math.min(Math.max(columns, 3), 8);

    return (
        <div className={buildClassName(className)} aria-busy="true" aria-label="Carregando informacoes">
            <div className="flex flex-column gap-3">
                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                    <div>
                        <Skeleton height="1.4rem" width="12rem" className="mb-2" />
                        <Skeleton height="0.85rem" width="18rem" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton height="2.25rem" width="7rem" />
                        <Skeleton height="2.25rem" width="7rem" />
                    </div>
                </div>

                <div className="overflow-x-auto border-1 surface-border border-round">
                    <div className="p-3 surface-100 border-bottom-1 surface-border" style={gridStyle(safeColumns)}>
                        {toRange(safeColumns).map((column) => (
                            <Skeleton key={`header-${column}`} height="1rem" width={rowWidths[column % rowWidths.length]} />
                        ))}
                    </div>
                    {toRange(safeRows).map((row) => (
                        <div key={`row-${row}`} className="p-3 border-bottom-1 surface-border" style={gridStyle(safeColumns)}>
                            {toRange(safeColumns).map((column) => (
                                <Skeleton key={`cell-${row}-${column}`} height="1rem" width={rowWidths[(row + column) % rowWidths.length]} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DetailSkeleton = ({ className }: Pick<LoadingStateProps, 'className'>) => (
    <div className={buildClassName(className)} aria-busy="true" aria-label="Carregando informacoes">
        <div className="grid">
            <div className="col-12 lg:col-8">
                <div className="surface-card p-4 border-round border-1 surface-border mb-3">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-4">
                        <div>
                            <Skeleton height="1.75rem" width="16rem" className="mb-2" />
                            <Skeleton height="1rem" width="22rem" />
                        </div>
                        <Skeleton height="2.5rem" width="10rem" />
                    </div>
                    <div className="grid">
                        {toRange(6).map((item) => (
                            <div key={`detail-field-${item}`} className="col-12 md:col-6">
                                <Skeleton height="0.85rem" width="7rem" className="mb-2" />
                                <Skeleton height="2.5rem" />
                            </div>
                        ))}
                    </div>
                </div>
                <TableSkeleton rows={4} columns={5} />
            </div>
            <div className="col-12 lg:col-4">
                {toRange(3).map((item) => (
                    <div key={`detail-side-${item}`} className="surface-card p-4 border-round border-1 surface-border mb-3">
                        <Skeleton height="1.25rem" width="12rem" className="mb-3" />
                        <Skeleton height="1rem" className="mb-2" />
                        <Skeleton height="1rem" className="mb-2" />
                        <Skeleton height="1rem" width="65%" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const MetricsSkeleton = ({ cards = 4, className }: LoadingStateProps) => (
    <div className={`${buildClassName(className)} grid`} aria-busy="true" aria-label="Carregando informacoes">
        {toRange(Math.min(Math.max(cards, 2), 6)).map((card) => (
            <div key={`metric-${card}`} className="col-12 md:col-6 xl:col-3">
                <div className="surface-card p-4 border-round border-1 surface-border h-full">
                    <div className="flex justify-content-between align-items-start gap-3">
                        <div className="flex-1">
                            <Skeleton height="1rem" width="70%" className="mb-3" />
                            <Skeleton height="1.75rem" width="45%" className="mb-3" />
                            <Skeleton height="0.85rem" width="85%" />
                        </div>
                        <Skeleton size="3rem" borderRadius="0.75rem" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const LoadingState = ({ variant = 'table', rows, columns, cards, className }: LoadingStateProps) => {
    if (variant === 'panel') {
        return <PanelSkeleton className={className} />;
    }

    if (variant === 'detail') {
        return <DetailSkeleton className={className} />;
    }

    if (variant === 'metrics' || variant === 'cards') {
        return <MetricsSkeleton cards={cards} className={className} />;
    }

    return <TableSkeleton rows={rows} columns={columns} className={className} />;
};
