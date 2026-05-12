'use client';

import { classNames } from 'primereact/utils';

export type LoginBrandPanelVariant = 'default' | 'natal' | 'ano-novo' | 'black-friday' | 'institucional';

type LoginBrandPanelProps = {
    variant?: LoginBrandPanelVariant;
    headline?: string;
    supportingText?: string;
};

export const LoginBrandPanel = ({ variant = 'default', headline = 'logosoft', supportingText = 'ERP corporativo para operações seguras.' }: LoginBrandPanelProps) => (
    <aside className={classNames('login-brand-panel', `login-brand-panel--${variant}`)} aria-hidden="true" data-testid="login-brand-panel">
        <div className="login-brand-panel__grid" />
        <div className="login-brand-panel__shape login-brand-panel__shape--primary" />
        <div className="login-brand-panel__shape login-brand-panel__shape--accent" />
        <div className="login-brand-panel__shape login-brand-panel__shape--line" />

        <div className="login-brand-panel__content">
            <span className="login-brand-panel__eyebrow">ERP logosoft</span>
            <strong>{headline}</strong>
            <span>{supportingText}</span>
        </div>

        <div className="login-brand-panel__campaign">
            <span>Campanha institucional</span>
        </div>
    </aside>
);
