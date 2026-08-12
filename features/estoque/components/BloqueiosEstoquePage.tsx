'use client';

import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';

export const BloqueiosEstoquePage = () => (
    <>
        <PageHeader title="Bloqueios de estoque" description="A gestão de bloqueios está disponível no fluxo avançado de estoque." />
        <Message className="w-full" severity="info" text="Use Estoque avançado para registrar, liberar ou cancelar bloqueios com o contrato vigente." />
    </>
);
