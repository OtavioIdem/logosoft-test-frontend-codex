'use client';

import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { PageHeader } from './PageHeader';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { PermissionCode } from '@/types/erp';

type ModulePlaceholderPageProps = {
    title: string;
    description: string;
    permissions: PermissionCode[];
    actions?: string[];
    nextSteps?: string[];
};

export const ModulePlaceholderPage = ({ title, description, permissions, actions = [], nextSteps = [] }: ModulePlaceholderPageProps) => {
    const defaultSteps = nextSteps.length
        ? nextSteps
        : ['Conectar listagem server-side ao endpoint real.', 'Implementar formulário com validação local e tratamento de erro da API.', 'Criar testes unitários, componente e E2E do fluxo crítico.'];

    return (
        <>
            <PageHeader
                title={title}
                description={description}
                actions={
                    <PermissionGuard anyOf={permissions} mode="disable">
                        {({ disabled }) => <Button label="Nova operação" icon="pi pi-plus" disabled={disabled} />}
                    </PermissionGuard>
                }
            />

            <div className="grid">
                <div className="col-12 lg:col-8">
                    <Card title="Fundação da tela">
                        <p className="line-height-3 mt-0">
                            Esta rota já está posicionada no layout da logosoft, com proteção de autenticação, menu por permissão e ponto de integração reservado para API REST do backend.
                        </p>
                        <div className="flex gap-2 flex-wrap mb-3">
                            {permissions.map((permission) => (
                                <Tag key={permission} value={permission} severity="info" />
                            ))}
                        </div>
                        {actions.length ? (
                            <ul className="line-height-3 mb-0">
                                {actions.map((action) => (
                                    <li key={action}>{action}</li>
                                ))}
                            </ul>
                        ) : null}
                    </Card>
                </div>
                <div className="col-12 lg:col-4">
                    <Card title="Próxima implementação">
                        <ol className="line-height-3 pl-3 mt-0 mb-0">
                            {defaultSteps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    </Card>
                </div>
            </div>
        </>
    );
};
