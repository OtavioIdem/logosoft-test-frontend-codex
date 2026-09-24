'use client';

import { useState } from 'react';
import { TabPanel, TabView } from 'primereact/tabview';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { EntradaSaidaEstoqueTab } from '@/features/estoque/components/EntradaSaidaEstoqueTab';
import { HistoricoMovimentosTab } from '@/features/estoque/components/HistoricoMovimentosTab';

export type EstoqueMovimentosTab = 'entrada' | 'saida' | 'historico';

const tabIndex: Record<EstoqueMovimentosTab, number> = { entrada: 0, saida: 1, historico: 2 };

// Um componente, três rotas (D72): `/estoque/entradas`, `/estoque/saidas` e `/estoque/movimentos`
// montam esta mesma página com a aba inicial correspondente — a técnica que
// `MovimentoOperacionalPage({ kind })` já usa hoje, agora decidindo também qual aba abre. Ajuste e
// Transferência ficam fora do TabView (D72); o estoque avançado não é tocado.
export const EstoqueMovimentosPage = ({ initialTab }: { initialTab: EstoqueMovimentosTab }) => {
    const { hasAnyPermission } = usePermissions();
    const [activeIndex, setActiveIndex] = useState(tabIndex[initialTab]);

    if (!hasAnyPermission(['ESTOQUE_MOVIMENTAR', 'ESTOQUE_CONSULTAR'])) {
        return <UnauthorizedState description="Entrada, saída e histórico de estoque exigem ESTOQUE_MOVIMENTAR ou ESTOQUE_CONSULTAR." />;
    }

    return (
        <>
            <PageHeader title="Movimentos de estoque" description="Registra entradas e saídas manuais e consulta o histórico rastreável de movimentos, incluindo ajustes, reservas e transferências." />
            <TabView activeIndex={activeIndex} onTabChange={(event) => setActiveIndex(event.index)}>
                <TabPanel header="Entrada">
                    <EntradaSaidaEstoqueTab kind="entrada" />
                </TabPanel>
                <TabPanel header="Saída">
                    <EntradaSaidaEstoqueTab kind="saida" />
                </TabPanel>
                <TabPanel header="Histórico">
                    <HistoricoMovimentosTab />
                </TabPanel>
            </TabView>
        </>
    );
};
