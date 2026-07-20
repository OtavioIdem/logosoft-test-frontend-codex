'use client';

import { TabPanel, TabView } from 'primereact/tabview';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PreAutorizacoesTab } from '@/features/portaria/components/PreAutorizacoesTab';
import { RegistrosAcessoTab } from '@/features/portaria/components/RegistrosAcessoTab';
import { OcorrenciasTab } from '@/features/portaria/components/OcorrenciasTab';

export const PortariaPage = () => {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(['PORTARIA_CONSULTAR', 'PORTARIA_PRE_AUTORIZAR', 'PORTARIA_OPERAR'])) {
        return <UnauthorizedState description="A Portaria exige uma permissão de portaria (consulta, pré-autorização ou operação)." />;
    }

    return (
        <>
            <PageHeader title="Portaria" description="Controle de acesso: pré-autorizações, registros de entrada/validação/saída e ocorrências." />
            <TabView>
                <TabPanel header="Pré-autorizações">
                    <PreAutorizacoesTab />
                </TabPanel>
                <TabPanel header="Registros de acesso">
                    <RegistrosAcessoTab />
                </TabPanel>
                <TabPanel header="Ocorrências">
                    <OcorrenciasTab />
                </TabPanel>
            </TabView>
        </>
    );
};
