'use client';

// Painel D50 (v1.11.0a8b58, F3.1, AC-16): quando `validar` rejeita com
// `Fiscal.SerieFiscalNaoCadastradaParaContexto`, mostra o texto do backend e um atalho para o cadastro em
// vez de deixar o operador sem saída. Indexado só pelo código -- outro erro de validação (CFOP,
// destinatário, série mal formada) não abre este painel.

import Link from 'next/link';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { resolveFiscalErroCadastroLink } from '@/features/fiscal/components/fiscalErrosCadastro';
import { SERIE_FISCAL_NAO_CADASTRADA_PANEL } from '@/features/fiscal/components/seriesFiscaisLabels';
import { ApiError } from '@/types/erp';

export const NotaFiscalErroCadastroPanel = ({ erro }: { erro?: ApiError | null }) => {
    const { hasAnyPermission } = usePermissions();
    const link = resolveFiscalErroCadastroLink(erro?.code);

    if (!erro || !link) return null;

    const podeCadastrar = hasAnyPermission(link.anyOf);

    return (
        <div className="w-full mb-3">
            <Message className="w-full" severity="error" text={`${SERIE_FISCAL_NAO_CADASTRADA_PANEL.titulo}: ${erro.message}`} />
            <div className="surface-50 border-1 border-red-100 border-round px-3 py-2 mt-2">
                {podeCadastrar ? (
                    <Link href={link.href}>
                        <Button type="button" text icon="pi pi-arrow-right" label={SERIE_FISCAL_NAO_CADASTRADA_PANEL.linkCadastrarSerie} />
                    </Link>
                ) : (
                    <span className="text-color-secondary">{SERIE_FISCAL_NAO_CADASTRADA_PANEL.semPermissaoTexto}</span>
                )}
            </div>
        </div>
    );
};
