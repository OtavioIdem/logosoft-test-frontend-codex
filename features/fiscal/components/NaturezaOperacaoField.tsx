'use client';

// Campo Natureza de operação (v1.11.0a8b71, D91). Compartilhado pelos diálogos que pedem natureza: combo
// alimentado por `GET /api/fiscal/naturezas-operacao` só com as ativas da empresa (filtro no servidor),
// rótulo `código — descrição`, envia só o id. Nunca texto livre nem GUID digitado.
//
// Estados: sem empresa, sem permissão, carregando, erro (com código/traceId e Recarregar), vazio (com o
// motivo, Recarregar e, para quem tem permissão de cadastro, o link para a tela de naturezas -- D100) e lista.
// Trocar a empresa limpa a escolha.

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { NATUREZA_OPERACAO_FIELD } from '@/features/fiscal/components/fiscalLabels';
import { NATUREZA_OPERACAO_FIELD_VAZIO, NATUREZA_OPERACAO_LINK } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { useNaturezasOperacaoOpcoes } from '@/features/fiscal/hooks/useNaturezasOperacao';
import { mapApiError } from '@/lib/http/apiError';

export type NaturezaOperacaoFieldProps = {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    empresaId?: string | null;
    disabled?: boolean;
};

export const NaturezaOperacaoField = ({ id, value, onChange, empresaId, disabled }: NaturezaOperacaoFieldProps) => {
    const naturezas = useNaturezasOperacaoOpcoes(empresaId);
    const { hasAnyPermission } = usePermissions();
    // D100: o link só aparece para quem tem uma das permissões de cadastro; sem nenhuma, o texto diz a quem pedir.
    const podeAbrirCadastro = hasAnyPermission(['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR']);

    // Trocar a empresa limpa a natureza escolhida: natureza é cadastro por empresa.
    const empresaRef = useRef(empresaId ?? null);
    useEffect(() => {
        if (empresaRef.current === (empresaId ?? null)) return;
        empresaRef.current = empresaId ?? null;
        onChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaId]);

    if (!empresaId) {
        return <Dropdown inputId={id} value={null} options={[]} disabled placeholder={NATUREZA_OPERACAO_FIELD.semEmpresa} className="w-full" />;
    }

    if (!naturezas.permitido) {
        return (
            <>
                <Dropdown inputId={id} value={null} options={[]} disabled placeholder={NATUREZA_OPERACAO_FIELD.placeholder} className="w-full" />
                <Message severity="warn" className="w-full mt-2" text={NATUREZA_OPERACAO_FIELD.semPermissao} />
            </>
        );
    }

    const recarregar = (
        <Button type="button" label={NATUREZA_OPERACAO_FIELD.recarregar} icon="pi pi-refresh" size="small" outlined loading={naturezas.isFetching} onClick={() => void naturezas.refetch()} />
    );

    if (naturezas.isError) {
        return (
            <div className="flex flex-column gap-2">
                <ApiErrorPanel error={mapApiError(naturezas.error)} title={NATUREZA_OPERACAO_FIELD.erroConsulta} />
                <div>{recarregar}</div>
            </div>
        );
    }

    const listaVazia = !naturezas.isLoading && naturezas.options.length === 0;
    if (listaVazia) {
        return (
            <div className="flex flex-column gap-2">
                <Message severity="warn" className="w-full" text={podeAbrirCadastro ? NATUREZA_OPERACAO_FIELD_VAZIO.comPermissao : NATUREZA_OPERACAO_FIELD_VAZIO.semPermissao} />
                <div className="flex flex-wrap gap-2">
                    {recarregar}
                    {podeAbrirCadastro ? (
                        <Link href="/fiscal/naturezas-operacao">
                            <Button type="button" text icon="pi pi-arrow-right" label={NATUREZA_OPERACAO_LINK.cadastrar} />
                        </Link>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <>
            <EntitySelect
                id={id}
                entityName="natureza de operação"
                value={value}
                options={naturezas.options}
                loading={naturezas.isFetching}
                disabled={disabled || naturezas.isLoading}
                emptyMessage={NATUREZA_OPERACAO_FIELD.nenhumaEncontrada}
                onChange={onChange}
            />
            {naturezas.listaCortada ? <small className="text-color-secondary block mt-1 line-height-3">{NATUREZA_OPERACAO_FIELD.listaCortada}</small> : null}
        </>
    );
};
