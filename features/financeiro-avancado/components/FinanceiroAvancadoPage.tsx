'use client';

import { TabPanel, TabView } from 'primereact/tabview';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { ContasAvancadoTab } from '@/features/financeiro-avancado/components/ContasAvancadoTab';
import { FluxoCaixaTab } from '@/features/financeiro-avancado/components/FluxoCaixaTab';

export const FinanceiroAvancadoPage = () => {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(['FINANCEIRO_CONSULTAR', 'FINANCEIRO_GERENCIAR', 'FINANCEIRO_FLUXO_CAIXA_CONSULTAR'])) {
        return <UnauthorizedState description="Financeiro avançado exige uma permissão financeira (consulta, gestão ou fluxo de caixa)." />;
    }

    return (
        <>
            <PageHeader title="Financeiro avançado" description="Contas a receber/pagar com baixa, estorno e cancelamento; painel de fluxo de caixa." />
            <TabView>
                <TabPanel header="Contas a receber">
                    <ContasAvancadoTab tipo="receber" baixarPermission="FINANCEIRO_RECEBER" gerenciarPermission="FINANCEIRO_GERENCIAR" />
                </TabPanel>
                <TabPanel header="Contas a pagar">
                    <ContasAvancadoTab tipo="pagar" baixarPermission="FINANCEIRO_PAGAR" gerenciarPermission="FINANCEIRO_GERENCIAR" />
                </TabPanel>
                <TabPanel header="Fluxo de caixa">
                    <FluxoCaixaTab />
                </TabPanel>
            </TabView>
        </>
    );
};
