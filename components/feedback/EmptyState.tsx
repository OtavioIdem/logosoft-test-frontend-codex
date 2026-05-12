import { Button } from 'primereact/button';
import { ReactNode } from 'react';

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
    <div className="text-center p-5 surface-card border-round">
        <i className="pi pi-inbox text-5xl text-color-secondary mb-3" />
        <h3 className="mt-0">{title}</h3>
        {description ? <p className="text-color-secondary line-height-3">{description}</p> : null}
        {action ?? <Button label="Atualizar" icon="pi pi-refresh" text />}
    </div>
);
