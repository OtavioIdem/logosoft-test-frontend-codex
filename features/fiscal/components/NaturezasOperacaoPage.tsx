'use client';

// Tela de naturezas de operação (v1.11.0a8b72, D98). Padrão de referência: `SeriesFiscaisPage.tsx` (D48), com os
// refinos aceitos pela emenda da D98: vazio e erro são estados separados (o erro tem "Tentar novamente"), o
// sucesso mostra `Toast`, e a lista filtra só por empresa -- a listagem não aceita `filialId`, e a coluna Filial
// mostra a informação. Natureza inativa fica sem ação na linha (não há reativação, NO-15).

import { useCallback, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { fiscalReferenceContextLabel } from '@/features/fiscal/components/fiscalUiUtils';
import { NaturezaOperacaoDialog, NaturezaOperacaoInativarDialog } from '@/features/fiscal/components/NaturezaOperacaoDialogs';
import {
    NATUREZAS_OPERACAO_COLUNAS,
    NATUREZAS_OPERACAO_ERRO,
    NATUREZAS_OPERACAO_FILTRO_SITUACAO_OPTIONS,
    NATUREZAS_OPERACAO_FILTRO_SITUACAO_PADRAO,
    NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR,
    NATUREZAS_OPERACAO_PAGINA,
    NATUREZAS_OPERACAO_PERMISSAO,
    NATUREZAS_OPERACAO_TOAST,
    NATUREZAS_OPERACAO_VAZIO,
    NATUREZA_SEM_FILIAL,
    SITUACAO_NATUREZA_LABEL,
    finalidadeNaturezaLabel,
    situacaoNaturezaSeverity,
    tipoDocumentoNaturezaLabel,
    tipoOperacaoNaturezaLabel,
    type NaturezasOperacaoFiltroSituacaoValor
} from '@/features/fiscal/components/naturezasOperacaoLabels';
import { useNaturezasOperacao, useNaturezasOperacaoMutations } from '@/features/fiscal/hooks/useNaturezasOperacao';
import { NaturezaOperacaoResponse } from '@/features/fiscal/types/naturezasOperacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

type DialogAction = 'criar' | 'editar' | 'inativar' | null;

const ROWS_PADRAO = 20;

export const NaturezasOperacaoPage = () => {
    const { hasPermission } = usePermissions();
    const context = useOrganizationalContext();
    const toast = useAppToast();
    const [empresaId, setEmpresaId] = useState<string | null>(context.snapshot.empresaId);
    // O filtro não tem filial (a listagem não aceita `filialId`); o estado existe só para o `EmpresaFilialFilter`.
    const [, setFilialId] = useState<string | null>(null);
    const [situacao, setSituacao] = useState<NaturezasOperacaoFiltroSituacaoValor>(NATUREZAS_OPERACAO_FILTRO_SITUACAO_PADRAO);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(ROWS_PADRAO);
    const [dialog, setDialog] = useState<DialogAction>(null);
    const [selecionada, setSelecionada] = useState<NaturezaOperacaoResponse | null>(null);
    const [erro, setErro] = useState<ApiError | null>(null);

    const podeConsultar = hasPermission('FISCAL_CADASTROS_CONSULTAR');
    const podeGerenciar = hasPermission('FISCAL_CADASTROS_GERENCIAR');

    // "Ativas" envia `somenteAtivas=true`; "Todas" omite o parâmetro: o servidor só filtra com `true` (NO-3).
    const somenteAtivas = situacao === NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.ativas ? true : undefined;
    const pagina = Math.floor(first / rows) + 1;
    // Sem FISCAL_CADASTROS_CONSULTAR, `empresaId` fica vazio de propósito -- 0 GET, mesmo com empresa no contexto.
    const query = useMemo(() => ({ empresaId: podeConsultar ? (empresaId ?? '') : '', somenteAtivas, pagina, tamanhoPagina: rows }), [podeConsultar, empresaId, somenteAtivas, pagina, rows]);

    const naturezasQuery = useNaturezasOperacao(context.organizationalScopeKey, query);
    const filiaisQuery = useFiliaisOptions(empresaId);
    const mutations = useNaturezasOperacaoMutations();

    const filialLabelPorId = useMemo(() => new Map(filiaisQuery.options.map((option) => [option.value, option.label])), [filiaisQuery.options]);

    const trocarEmpresa = useCallback((valor: string | null) => {
        setEmpresaId(valor);
        setFirst(0);
    }, []);

    if (!podeConsultar) {
        return <UnauthorizedState description={NATUREZAS_OPERACAO_PERMISSAO.unauthorizedDescription} />;
    }

    const paged = naturezasQuery.data;
    const naturezas = paged?.items ?? [];
    const totalRecords = paged?.totalItems ?? 0;
    const listaComErro = Boolean(naturezasQuery.error);
    const vazio = Boolean(empresaId) && !naturezasQuery.isLoading && !naturezasQuery.isFetching && !listaComErro && totalRecords === 0;

    // 404 ao editar/inativar: o backend devolve 404 genérico para natureza de outra empresa ou filial (NO-7, não medido em execução).
    const erroDoDialogo: ApiError | null = erro && erro.status === 404 && dialog !== 'criar' ? { ...erro, message: `${erro.message} ${NATUREZAS_OPERACAO_ERRO.naoEncontradaDica}` } : erro;

    // Erro, vazio e tabela são estados separados: o vazio e o erro nunca dividem a tela com uma tabela sem linhas.
    const mostrarTabela = Boolean(empresaId) && !vazio && !(listaComErro && naturezas.length === 0);

    const fecharDialogo = () => {
        setDialog(null);
        setSelecionada(null);
        setErro(null);
    };

    const abrirDialogo = (acao: DialogAction, natureza: NaturezaOperacaoResponse | null) => {
        setSelecionada(natureza);
        setErro(null);
        setDialog(acao);
    };

    const criar = async (values: unknown) => {
        setErro(null);
        try {
            const criada = await mutations.criarMutation.mutateAsync(values);
            toast.success(NATUREZAS_OPERACAO_PAGINA.titulo, NATUREZAS_OPERACAO_TOAST.criada(criada.codigo));
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const editar = async (values: unknown) => {
        if (!selecionada) return;
        setErro(null);
        try {
            const atualizada = await mutations.atualizarMutation.mutateAsync({ id: selecionada.id, values });
            toast.success(NATUREZAS_OPERACAO_PAGINA.titulo, NATUREZAS_OPERACAO_TOAST.atualizada(atualizada.codigo));
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const inativar = async (motivo: string) => {
        if (!selecionada) return;
        setErro(null);
        try {
            await mutations.inativarMutation.mutateAsync({ id: selecionada.id, values: { motivo } });
            toast.success(NATUREZAS_OPERACAO_PAGINA.titulo, NATUREZAS_OPERACAO_TOAST.inativada(selecionada.codigo));
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const headerActions = (
        <PermissionGuard permission="FISCAL_CADASTROS_GERENCIAR" mode="disable">
            {({ disabled }) => <Button label={NATUREZAS_OPERACAO_PAGINA.novaNatureza} icon="pi pi-plus" disabled={disabled || !empresaId} title={disabled ? NATUREZAS_OPERACAO_PERMISSAO.novaNaturezaSemGerenciar : undefined} onClick={() => abrirDialogo('criar', null)} />}
        </PermissionGuard>
    );

    const tituloVazio = situacao === NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.ativas ? NATUREZAS_OPERACAO_VAZIO.tituloFiltrado : NATUREZAS_OPERACAO_VAZIO.titulo;
    const descricaoVazio =
        situacao === NATUREZAS_OPERACAO_FILTRO_SITUACAO_VALOR.ativas ? (podeGerenciar ? NATUREZAS_OPERACAO_VAZIO.descricaoFiltrado : NATUREZAS_OPERACAO_VAZIO.descricaoFiltradoSemGerenciar) : podeGerenciar ? NATUREZAS_OPERACAO_VAZIO.descricao : NATUREZAS_OPERACAO_VAZIO.descricaoSemGerenciar;

    return (
        <>
            <PageHeader title={NATUREZAS_OPERACAO_PAGINA.titulo} description={NATUREZAS_OPERACAO_PAGINA.descricao} actions={headerActions} />

            <div className="flex flex-column md:flex-row flex-wrap gap-3 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={empresaId} filialId={null} showFilial={false} onEmpresaChange={trocarEmpresa} onFilialChange={setFilialId} />
                <div className="min-w-14rem">
                    <Dropdown
                        inputId="naturezasSituacao"
                        aria-label={NATUREZAS_OPERACAO_PAGINA.campoSituacao}
                        value={situacao}
                        options={NATUREZAS_OPERACAO_FILTRO_SITUACAO_OPTIONS}
                        onChange={(event) => {
                            setSituacao(event.value);
                            setFirst(0);
                        }}
                    />
                </div>
            </div>

            <Card title={NATUREZAS_OPERACAO_PAGINA.cardListagem}>
                {!empresaId ? <Message severity="info" className="w-full mb-3" text={NATUREZAS_OPERACAO_VAZIO.semEmpresa} /> : null}
                {listaComErro ? (
                    <div className="mb-3">
                        <ApiErrorPanel error={mapApiError(naturezasQuery.error)} title={NATUREZAS_OPERACAO_ERRO.tituloListagem} />
                        <Button type="button" label={NATUREZAS_OPERACAO_ERRO.tentarNovamente} icon="pi pi-refresh" size="small" outlined loading={naturezasQuery.isFetching} onClick={() => void naturezasQuery.refetch()} />
                    </div>
                ) : null}
                {mostrarTabela ? (
                    <DataTableServer<NaturezaOperacaoResponse>
                        value={naturezas}
                        totalRecords={totalRecords}
                        loading={naturezasQuery.isFetching}
                        first={first}
                        rows={rows}
                        onPage={(event) => {
                            setFirst(event.first);
                            setRows(event.rows);
                        }}
                        emptyMessage={tituloVazio}
                    >
                        <Column field="codigo" header={NATUREZAS_OPERACAO_COLUNAS.codigo} />
                        <Column field="descricao" header={NATUREZAS_OPERACAO_COLUNAS.descricao} />
                        <Column header={NATUREZAS_OPERACAO_COLUNAS.tipoDocumento} body={(natureza: NaturezaOperacaoResponse) => tipoDocumentoNaturezaLabel(natureza.tipoDocumento)} />
                        <Column header={NATUREZAS_OPERACAO_COLUNAS.operacao} body={(natureza: NaturezaOperacaoResponse) => tipoOperacaoNaturezaLabel(natureza.tipoOperacao)} />
                        <Column header={NATUREZAS_OPERACAO_COLUNAS.finalidade} body={(natureza: NaturezaOperacaoResponse) => finalidadeNaturezaLabel(natureza.finalidade)} />
                        <Column
                            header={NATUREZAS_OPERACAO_COLUNAS.filial}
                            // Nome pela lista de filiais; nulo = "Todas as filiais"; nunca o GUID.
                            body={(natureza: NaturezaOperacaoResponse) => (natureza.filialId ? (filialLabelPorId.get(natureza.filialId) ?? fiscalReferenceContextLabel('Filial', natureza.filialId)) : NATUREZA_SEM_FILIAL)}
                        />
                        <Column
                            header={NATUREZAS_OPERACAO_COLUNAS.situacao}
                            body={(natureza: NaturezaOperacaoResponse) => <Tag value={natureza.ativa ? SITUACAO_NATUREZA_LABEL.ativa : SITUACAO_NATUREZA_LABEL.inativa} severity={situacaoNaturezaSeverity(natureza.ativa)} />}
                        />
                        <Column
                            header={NATUREZAS_OPERACAO_COLUNAS.acoes}
                            alignHeader="right"
                            body={(natureza: NaturezaOperacaoResponse) =>
                                natureza.ativa ? (
                                    <DataTableActions
                                        actions={[
                                            { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'FISCAL_CADASTROS_GERENCIAR', onClick: () => abrirDialogo('editar', natureza) },
                                            { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'FISCAL_CADASTROS_GERENCIAR', onClick: () => abrirDialogo('inativar', natureza) }
                                        ]}
                                    />
                                ) : null
                            }
                        />
                    </DataTableServer>
                ) : null}
                {vazio ? (
                    <EmptyState
                        title={tituloVazio}
                        description={descricaoVazio}
                        action={
                            podeGerenciar ? (
                                <Button type="button" label={NATUREZAS_OPERACAO_PAGINA.novaNatureza} icon="pi pi-plus" onClick={() => abrirDialogo('criar', null)} />
                            ) : (
                                <span />
                            )
                        }
                    />
                ) : null}
            </Card>

            <NaturezaOperacaoDialog
                visible={dialog === 'criar' || dialog === 'editar'}
                natureza={dialog === 'editar' ? selecionada : null}
                empresaId={empresaId}
                loading={mutations.criarMutation.isPending || mutations.atualizarMutation.isPending}
                error={dialog === 'criar' || dialog === 'editar' ? erroDoDialogo : null}
                onHide={fecharDialogo}
                onSubmit={dialog === 'editar' ? editar : criar}
            />
            <NaturezaOperacaoInativarDialog natureza={dialog === 'inativar' ? selecionada : null} loading={mutations.inativarMutation.isPending} error={dialog === 'inativar' ? erroDoDialogo : null} onHide={fecharDialogo} onSubmit={inativar} />
        </>
    );
};
