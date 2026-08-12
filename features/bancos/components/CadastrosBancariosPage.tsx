'use client';

import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';

export const CadastrosBancariosPage = () => (
    <>
        <PageHeader title="Cadastros bancários" description="Cadastro de bancos, contas, convênios e carteiras de cobrança." />
        <Message
            className="w-full"
            severity="warn"
            text="Este cadastro está indisponível nesta versão porque o backend atual não oferece endpoints de consulta para bancos, contas, convênios e carteiras. Nenhum dado foi carregado ou criado."
        />
    </>
);
