'use client';

import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';

export const FluxoCaixaPage = () => (
    <>
        <PageHeader title="Fluxo de caixa" description="A consulta de fluxo de caixa está disponível no módulo financeiro avançado." />
        <Message className="w-full" severity="info" text="Use Financeiro avançado para consultar o fluxo de caixa pelo contrato vigente." />
    </>
);
