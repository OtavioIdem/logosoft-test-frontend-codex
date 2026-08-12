'use client';

import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';

export const CnabPage = () => (
    <>
        <PageHeader title="CNAB" description="Geração de remessa e importação de retorno." />
        <Message
            className="w-full"
            severity="warn"
            text="As operações de remessa e retorno estão indisponíveis nesta versão porque dependem de carteiras e contas bancárias, cujas consultas ainda não existem no backend. Nenhum arquivo será enviado ou processado."
        />
    </>
);
