'use client';

import { classNames } from 'primereact/utils';
import { appConfig } from '@/config/app';

const environmentLabels: Record<string, string> = {
    production: 'Produção',
    homologation: 'Homologação',
    staging: 'Homologação',
    development: 'Desenvolvimento',
    test: 'Teste'
};

const getEnvironmentTone = (env: string) => {
    if (env === 'production') {
        return 'login-environment-badge--production';
    }

    if (env === 'homologation' || env === 'staging') {
        return 'login-environment-badge--homologation';
    }

    return 'login-environment-badge--development';
};

export const LoginEnvironmentBadge = () => {
    const normalizedEnv = appConfig.env.toLowerCase();
    const label = environmentLabels[normalizedEnv] ?? appConfig.env;

    return (
        <span className={classNames('login-environment-badge', getEnvironmentTone(normalizedEnv))} aria-label={`Ambiente ${label}`}>
            {label}
        </span>
    );
};
