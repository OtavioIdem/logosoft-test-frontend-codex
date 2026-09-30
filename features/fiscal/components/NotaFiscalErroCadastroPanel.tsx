'use client';

// Painel D50 (v1.11.0a8b58, F3.1, AC-16; textos por código na v1.11.0a8b72, D101): quando `validar` rejeita com um
// código do mapa `fiscalErrosCadastroMap`, mostra o texto do backend e um atalho para o cadastro em vez de deixar o
// operador sem saída. Indexado só pelo código -- outro erro de validação (destinatário, série mal formada) não abre
// este painel. O título e o rótulo do link vêm da entrada do mapa, não de texto fixo de série.

import { Message } from 'primereact/message';
import { FiscalErroCadastroAcao } from '@/features/fiscal/components/FiscalErroCadastroAcao';
import { resolveFiscalErroCadastroLink } from '@/features/fiscal/components/fiscalErrosCadastro';
import { ApiError } from '@/types/erp';

export const NotaFiscalErroCadastroPanel = ({ erro }: { erro?: ApiError | null }) => {
    const link = resolveFiscalErroCadastroLink(erro?.code);

    if (!erro || !link) return null;

    return (
        <div className="w-full mb-3">
            <Message className="w-full" severity="error" text={`${link.titulo}: ${erro.message}`} />
            <FiscalErroCadastroAcao erro={erro} />
        </div>
    );
};
