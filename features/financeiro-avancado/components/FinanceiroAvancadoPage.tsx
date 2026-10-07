'use client';

import { TabPanel, TabView } from 'primereact/tabview';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { ContasAvancadoTab } from '@/features/financeiro-avancado/components/ContasAvancadoTab';

export const FinanceiroAvancadoPage = () => {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_RECEBER', 'FINANCEIRO_PAGAR', 'FINANCEIRO_ESTORNAR', 'FINANCEIRO_CANCELAR'])) {
        return <UnauthorizedState description="Financeiro avançado exige uma permissão de consulta ou gestão de contas financeiras." />;
    }

    return (
        <>
            <PageHeader title="Financeiro avançado" description="Contas a receber/pagar com baixa, estorno e cancelamento." />
            <TabView>
                <TabPanel header="Contas a receber">
                    <ContasAvancadoTab tipo="receber" baixarPermission="FINANCEIRO_RECEBER" gerenciarPermission="FINANCEIRO_GERENCIAR" />
                </TabPanel>
                <TabPanel header="Contas a pagar">
                    <ContasAvancadoTab tipo="pagar" baixarPermission="FINANCEIRO_PAGAR" gerenciarPermission="FINANCEIRO_GERENCIAR" />
                </TabPanel>
            </TabView>
        </>
    );
};
