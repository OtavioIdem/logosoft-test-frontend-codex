'use client';

import { TabPanel, TabView } from 'primereact/tabview';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { InventariosOperacionaisTab } from '@/features/estoque-avancado/components/InventariosOperacionaisTab';
import { AjusteEstoqueTab } from '@/features/estoque-avancado/components/AjusteEstoqueTab';
import { BloqueiosEstoqueTab } from '@/features/estoque-avancado/components/BloqueiosEstoqueTab';

export const EstoqueAvancadoPage = () => {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(['ESTOQUE_CONSULTAR', 'ESTOQUE_INVENTARIO_GERENCIAR', 'ESTOQUE_AJUSTAR', 'ESTOQUE_BLOQUEIO_GERENCIAR'])) {
        return <UnauthorizedState description="Estoque avançado exige uma permissão de estoque (consulta, inventário, ajuste ou bloqueio)." />;
    }

    return (
        <>
            <PageHeader title="Estoque avançado" description="Inventários operacionais, ajustes de saldo e bloqueios (com liberação de bloqueios de Qualidade/Alimentar)." />
            <TabView>
                <TabPanel header="Inventários operacionais">
                    <InventariosOperacionaisTab />
                </TabPanel>
                <TabPanel header="Ajustes">
                    <AjusteEstoqueTab />
                </TabPanel>
                <TabPanel header="Bloqueios">
                    <BloqueiosEstoqueTab />
                </TabPanel>
            </TabView>
        </>
    );
};
