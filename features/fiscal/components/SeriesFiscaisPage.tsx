'use client';

// Tela de séries fiscais (v1.11.0a8b58, F3.1). Padrão de referência: `TabelasPrecoPage.tsx` (D48).

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';
import { useSeriesFiscais, useSeriesFiscaisMutations } from '@/features/fiscal/hooks/useSeriesFiscais';
import { fromDateOnly } from '@/features/fiscal/schemas/seriesFiscaisSchemas';
import { situacaoSerieFiscal } from '@/features/fiscal/components/seriesFiscaisUtils';
import { SerieFiscalAmpliarDialog, SerieFiscalCriarDialog, SerieFiscalEncerrarDialog, SerieFiscalInativarDialog } from '@/features/fiscal/components/SerieFiscalDialogs';
import { SerieFiscalBuracosDialog } from '@/features/fiscal/components/SerieFiscalBuracosDialog';
import {
    SERIES_FISCAIS_COLUNAS,
    SERIES_FISCAIS_FILTRO_SITUACAO_OPTIONS,
    SERIES_FISCAIS_FILTRO_SITUACAO_PADRAO,
    SERIES_FISCAIS_FILTRO_SITUACAO_VALOR,
    SERIES_FISCAIS_PAGINA,
    SERIES_FISCAIS_PERMISSAO,
    SERIES_FISCAIS_VAZIO,
    SERIE_FISCAL_SEM_FILIAL,
    SITUACAO_SERIE_FISCAL_LABEL,
    modeloDocumentoFiscalColunaLabel,
    serieFiscalVigenciaColunaLabel,
    situacaoSerieFiscalSeverity,
    type SeriesFiscaisFiltroSituacaoValor
} from '@/features/fiscal/components/seriesFiscaisLabels';
import { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { fiscalReferenceContextLabel } from '@/features/fiscal/components/fiscalUiUtils';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

const formatData = (value?: string | null) => {
    const parsed = fromDateOnly(value);
    return parsed ? parsed.toLocaleDateString('pt-BR') : undefined;
};

type DialogAction = 'criar' | 'ampliar' | 'encerrar' | 'inativar' | 'buracos' | null;

export const SeriesFiscaisPage = () => {
    const { hasPermission } = usePermissions();
    const context = useOrganizationalContext();
    const [empresaId, setEmpresaId] = useState<string | null>(context.snapshot.empresaId);
    const [filialId, setFilialId] = useState<string | null>(context.snapshot.filialId);
    const [situacao, setSituacao] = useState<SeriesFiscaisFiltroSituacaoValor>(SERIES_FISCAIS_FILTRO_SITUACAO_PADRAO);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(20);
    const [dialog, setDialog] = useState<DialogAction>(null);
    const [selecionada, setSelecionada] = useState<SerieFiscalResponse | null>(null);
    const [erro, setErro] = useState<ApiError | null>(null);

    const podeConsultarSeries = hasPermission('FISCAL_SERIES_CONSULTAR');
    const podeConsultarModelos = hasPermission('FISCAL_MODELOS_CONSULTAR');
    const podeGerenciar = hasPermission('FISCAL_SERIES_GERENCIAR');

    const somenteAtivas = situacao === SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.ativas ? true : situacao === SERIES_FISCAIS_FILTRO_SITUACAO_VALOR.inativas ? false : undefined;
    const pagina = Math.floor(first / rows) + 1;
    // AC-6 (S3/S4): sem FISCAL_SERIES_CONSULTAR, `empresaId` fica vazio de propósito -- 0 GET, mesmo com
    // empresa selecionada no contexto organizacional.
    const query = useMemo(() => ({ empresaId: podeConsultarSeries ? empresaId ?? '' : '', filialId: filialId ?? undefined, somenteAtivas, pagina, tamanhoPagina: rows }), [podeConsultarSeries, empresaId, filialId, somenteAtivas, pagina, rows]);

    const seriesQuery = useSeriesFiscais(context.organizationalScopeKey, query);
    const modelosQuery = useModelosDocumentoFiscal({ tamanhoPagina: 100 }, podeConsultarModelos);
    const filiaisQuery = useFiliaisOptions(empresaId);
    const mutations = useSeriesFiscaisMutations();

    const modeloLabelPorId = useMemo(() => new Map((modelosQuery.data?.items ?? []).map((modelo) => [modelo.id, modeloDocumentoFiscalColunaLabel(modelo.codigo, modelo.descricao)])), [modelosQuery.data]);
    const filialLabelPorId = useMemo(() => new Map(filiaisQuery.options.map((option) => [option.value, option.label])), [filiaisQuery.options]);

    if (!podeConsultarSeries) {
        return <UnauthorizedState description={SERIES_FISCAIS_PERMISSAO.unauthorizedDescription} />;
    }

    const paged = seriesQuery.data;
    const series = paged?.items ?? [];
    const totalRecords = paged?.totalItems ?? 0;

    const fecharDialogo = () => {
        setDialog(null);
        setSelecionada(null);
        setErro(null);
    };

    const criar = async (values: unknown) => {
        setErro(null);
        try {
            await mutations.criarMutation.mutateAsync(values);
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const ampliar = async (novoNumeroFinal: number) => {
        if (!selecionada) return;
        setErro(null);
        try {
            await mutations.ampliarMutation.mutateAsync({ id: selecionada.id, numeroFinalAtual: selecionada.numeroFinal, values: { novoNumeroFinal } });
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const encerrar = async (vigenciaFim: string) => {
        if (!selecionada) return;
        setErro(null);
        try {
            await mutations.encerrarVigenciaMutation.mutateAsync({ id: selecionada.id, vigenciaInicioSerie: selecionada.vigenciaInicio, values: { vigenciaFim } });
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
            fecharDialogo();
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const abrirDialogo = (acao: DialogAction, serie: SerieFiscalResponse | null) => {
        setSelecionada(serie);
        setErro(null);
        setDialog(acao);
    };

    const novaSerieDisabledTitle = !podeGerenciar ? SERIES_FISCAIS_PERMISSAO.novaSerieSemGerenciar : !podeConsultarModelos ? SERIES_FISCAIS_PERMISSAO.novaSerieSemModelos : undefined;

    const headerActions = (
        <PermissionGuard permission="FISCAL_SERIES_GERENCIAR" mode="disable">
            {({ disabled }) => <Button label={SERIES_FISCAIS_PAGINA.novaSerie} icon="pi pi-plus" disabled={disabled || !podeConsultarModelos} title={novaSerieDisabledTitle} onClick={() => abrirDialogo('criar', null)} />}
        </PermissionGuard>
    );

    return (
        <>
            <PageHeader title={SERIES_FISCAIS_PAGINA.titulo} description={SERIES_FISCAIS_PAGINA.descricao} actions={headerActions} />

            <div className="flex flex-column md:flex-row flex-wrap gap-3 md:align-items-center mb-3">
                <EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={setEmpresaId} onFilialChange={setFilialId} />
                <div className="min-w-14rem">
                    <Dropdown value={situacao} options={SERIES_FISCAIS_FILTRO_SITUACAO_OPTIONS} onChange={(event) => { setSituacao(event.value); setFirst(0); }} />
                </div>
            </div>

            <Card title={SERIES_FISCAIS_PAGINA.cardListagem}>
                {seriesQuery.error ? <ApiErrorPanel error={mapApiError(seriesQuery.error)} /> : null}
                <DataTableServer<SerieFiscalResponse> value={series} totalRecords={totalRecords} loading={seriesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage={SERIES_FISCAIS_VAZIO.titulo}>
                    <Column header={SERIES_FISCAIS_COLUNAS.modelo} body={(serie: SerieFiscalResponse) => (podeConsultarModelos ? modeloLabelPorId.get(serie.modeloDocumentoFiscalId) ?? '-' : SERIES_FISCAIS_PERMISSAO.colunaModeloIndisponivel)} />
                    <Column field="numero" header={SERIES_FISCAIS_COLUNAS.serie} />
                    <Column header={SERIES_FISCAIS_COLUNAS.estabelecimento} body={(serie: SerieFiscalResponse) => (serie.filialId ? filialLabelPorId.get(serie.filialId) ?? fiscalReferenceContextLabel('Filial', serie.filialId) : SERIE_FISCAL_SEM_FILIAL)} />
                    <Column header={SERIES_FISCAIS_COLUNAS.faixa} body={(serie: SerieFiscalResponse) => `${serie.numeroInicial}-${serie.numeroFinal}`} />
                    <Column field="proximoNumero" header={SERIES_FISCAIS_COLUNAS.proximo} />
                    <Column header={SERIES_FISCAIS_COLUNAS.restantes} body={(serie: SerieFiscalResponse) => Math.max(0, serie.numeroFinal - serie.proximoNumero + 1)} />
                    <Column header={SERIES_FISCAIS_COLUNAS.vigencia} body={(serie: SerieFiscalResponse) => serieFiscalVigenciaColunaLabel(formatData(serie.vigenciaInicio) ?? '-', formatData(serie.vigenciaFim))} />
                    <Column
                        header={SERIES_FISCAIS_COLUNAS.situacao}
                        body={(serie: SerieFiscalResponse) => {
                            const situacaoAtual = situacaoSerieFiscal(serie);
                            return <Tag value={SITUACAO_SERIE_FISCAL_LABEL[situacaoAtual]} severity={situacaoSerieFiscalSeverity(situacaoAtual)} />;
                        }}
                    />
                    <Column
                        header={SERIES_FISCAIS_COLUNAS.acoes}
                        alignHeader="right"
                        body={(serie: SerieFiscalResponse) => (
                            <DataTableActions
                                actions={[
                                    { key: 'buracos', label: 'Buracos', icon: 'pi pi-search', permission: 'FISCAL_SERIES_CONSULTAR', onClick: () => abrirDialogo('buracos', serie) },
                                    ...(serie.ativa
                                        ? [
                                              { key: 'ampliar', label: 'Ampliar', icon: 'pi pi-arrow-up-right', permission: 'FISCAL_SERIES_GERENCIAR' as const, onClick: () => abrirDialogo('ampliar', serie) },
                                              { key: 'encerrar', label: 'Encerrar vigência', icon: 'pi pi-calendar-times', permission: 'FISCAL_SERIES_GERENCIAR' as const, onClick: () => abrirDialogo('encerrar', serie) },
                                              { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger' as const, permission: 'FISCAL_SERIES_GERENCIAR' as const, onClick: () => abrirDialogo('inativar', serie) }
                                          ]
                                        : [])
                                ]}
                            />
                        )}
                    />
                </DataTableServer>
                {!seriesQuery.isLoading && totalRecords === 0 ? <EmptyState title={SERIES_FISCAIS_VAZIO.titulo} description={SERIES_FISCAIS_VAZIO.descricao} /> : null}
            </Card>

            <SerieFiscalCriarDialog visible={dialog === 'criar'} loading={mutations.criarMutation.isPending} empresaId={empresaId} error={erro} onHide={fecharDialogo} onSubmit={criar} />
            <SerieFiscalAmpliarDialog visible={dialog === 'ampliar'} loading={mutations.ampliarMutation.isPending} serie={selecionada} error={erro} onHide={fecharDialogo} onSubmit={ampliar} />
            <SerieFiscalEncerrarDialog visible={dialog === 'encerrar'} loading={mutations.encerrarVigenciaMutation.isPending} serie={selecionada} error={erro} onHide={fecharDialogo} onSubmit={encerrar} />
            <SerieFiscalInativarDialog visible={dialog === 'inativar'} loading={mutations.inativarMutation.isPending} serie={selecionada} error={erro} onHide={fecharDialogo} onSubmit={inativar} />
            <SerieFiscalBuracosDialog visible={dialog === 'buracos'} serie={selecionada} onHide={fecharDialogo} />
        </>
    );
};
