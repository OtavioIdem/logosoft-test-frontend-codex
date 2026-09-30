'use client';

// Ação que resolve um erro fiscal de cadastro ausente (v1.11.0a8b72, D101): o link para o cadastro (ou, sem
// permissão, o texto que manda pedir a quem tem) indexado só pelo `Error.Code` no mapa da D50. É o helper único
// usado pelo painel da nota (`NotaFiscalErroCadastroPanel`), pelo Adicionar item, pelo Gerar NF e pelo Confirmar
// Faturamento -- o erro de CFOP sem mapeamento NÃO sai do `validar`, sai desses três fluxos.

import Link from 'next/link';
import { Button } from 'primereact/button';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { resolveFiscalErroCadastroLink } from '@/features/fiscal/components/fiscalErrosCadastro';
import { ApiError } from '@/types/erp';

export const FiscalErroCadastroAcao = ({ erro, mostrarTitulo = false }: { erro?: ApiError | null; mostrarTitulo?: boolean }) => {
    const { hasAnyPermission } = usePermissions();
    const link = resolveFiscalErroCadastroLink(erro?.code);

    if (!erro || !link) return null;

    const podeCadastrar = hasAnyPermission(link.anyOf);

    return (
        <div className={`surface-50 border-1 border-red-100 border-round px-3 py-2 mt-2${mostrarTitulo ? ' mb-3' : ''}`}>
            {mostrarTitulo ? <strong className="block mb-2">{link.titulo}</strong> : null}
            {podeCadastrar ? (
                <Link href={link.href}>
                    <Button type="button" text icon="pi pi-arrow-right" label={link.rotuloLink} />
                </Link>
            ) : (
                <span className="text-color-secondary">{link.semPermissaoTexto}</span>
            )}
        </div>
    );
};
