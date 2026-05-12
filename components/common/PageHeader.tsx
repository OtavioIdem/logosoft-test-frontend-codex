import { ReactNode } from 'react';

export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => {
    return (
        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-4">
            <div>
                <h1 className="m-0 text-3xl font-semibold">{title}</h1>
                {description ? <p className="mt-2 mb-0 text-color-secondary line-height-3">{description}</p> : null}
            </div>
            {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
        </div>
    );
};
