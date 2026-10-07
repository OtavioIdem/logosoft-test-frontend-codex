'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { FluxoCaixaTab } from '@/features/financeiro-avancado/components/FluxoCaixaTab';

export const FluxoCaixaPage = () => (
    <>
        <PageHeader title="Fluxo de caixa" description="Consulte entradas, saídas e saldos previstos, realizados e projetados." />
        <FluxoCaixaTab />
    </>
);
