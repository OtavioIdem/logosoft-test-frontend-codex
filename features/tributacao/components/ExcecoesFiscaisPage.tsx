'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { ExcecaoFiscalFormDialog, VarianteExcecao } from '@/features/tributacao/components/ExcecaoFiscalFormDialog';
import { formatDataVigencia } from '@/features/tributacao/components/tributacaoUiUtils';
import { useExcecoesFiscais, useExcecoesFiscaisMutations, useExcecoesFiscaisNcm, useExcecoesFiscaisNcmMutations } from '@/features/tributacao/hooks/useTributacao';
import { ExcecaoFiscalNcmResumoResponse, ExcecaoFiscalResumoResponse } from '@/features/tributacao/types/tributacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

const situacaoOptions = [
    { label: 'Todas', value: null },
    { label: 'Somente ativas', value: true },
    { label: 'Somente inativas', value: false }
];

const textos: Record<VarianteExcecao, { titulo: string; descricao: string; outraRota: string; outroRotulo: string }> = {
    geral: {
        titulo: 'Exceções e benefícios fiscais',
        descricao: 'Sobrepõem a regra geral para uma UF. Cobrem apenas ICMS próprio e PIS/COFINS.',
        outraRota: '/fiscal/excecoes-ncm',
        outroRotulo: 'Exceções por NCM'
    },
    ncm: {
        titulo: 'Exceções fiscais por NCM',
        descricao: 'Sobrepõem a regra geral para a combinação NCM + UF. Têm precedência sobre a exceção geral.',
        outraRota: '/fiscal/excecoes',
        outroRotulo: 'Exceções gerais'
    }
};

/**
 * Lista de exceções fiscais nas duas variantes do contrato. A precedência (`exceção NCM > exceção > regra`)
 * fica visível na tela: sem ela, o usuário não tem como entender por que uma exceção cadastrada "não pegou".
 */
export const ExcecoesFiscaisPage = ({ variante }: { variante: VarianteExcecao }) => {
    const toast = useAppToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const excecaoIdDaUrl = searchParams.get('excecaoId');
    const { hasPermission } = usePermissions();
    const ehNcm = variante === 'ncm';
    const mutationsGerais = useExcecoesFiscaisMutations();
    const mutationsNcm = useExcecoesFiscaisNcmMutations();
    const mutations = ehNcm ? mutationsNcm : mutationsGerais;
    const [empresaId, setEmpresaId] = useState('');
    const [filialId, setFilialId] = useState('');
    const [uf, setUf] = useState('');
    const [somenteAtivas, setSomenteAtivas] = useState<boolean | null>(true);
    const [termo, setTermo] = useState('');
    const [pagina, setPagina] = useState(1);
    const [tamanhoPagina, setTamanhoPagina] = useState(20);
    const [dialogVisivel, setDialogVisivel] = useState(false);
    const [excecaoSelecionada, setExcecaoSelecionada] = useState<string | null>(null);
    const [inativando, setInativando] = useState<ExcecaoFiscalResumoResponse | null>(null);
    const [erro, setErro] = useState<ApiError | null>(null);

    const query = { empresaId: empresaId || null, filialId: filialId || null, uf: uf || null, somenteAtivas, termo: termo || null, pagina, tamanhoPagina };
    const excecoesGeraisQuery = useExcecoesFiscais(ehNcm ? {} : query);
    const excecoesNcmQuery = useExcecoesFiscaisNcm(ehNcm ? query : {});
    const listaQuery = ehNcm ? excecoesNcmQuery : excecoesGeraisQuery;

    // Deep link vindo da trilha do cálculo (`?excecaoId=`). O contrato **não** diz de qual variante o id veio —
    // `excecaoAplicadaId` é um GUID cru que tanto pode ser de `ExcecaoFiscal` quanto de `ExcecaoFiscalNcm`.
    // Por isso a trilha aponta para a variante geral e o próprio modal oferece o salto para a outra quando o
    // id não existe aqui, em vez de a tela adivinhar com uma requisição extra a cada abertura.
    useEffect(() => {
        if (!excecaoIdDaUrl) return;
        setExcecaoSelecionada(excecaoIdDaUrl);
        setDialogVisivel(true);
    }, [excecaoIdDaUrl]);

    if (!hasPermission('FISCAL_REGRAS_CONSULTAR')) {
        return <UnauthorizedState description="O cadastro de exceções fiscais exige a permissão FISCAL_REGRAS_CONSULTAR." />;
    }

    const texto = textos[variante];

    const abrirNova = () => {
        setExcecaoSelecionada(null);
        setDialogVisivel(true);
    };

    const abrirEdicao = (id: string) => {
        setExcecaoSelecionada(id);
        setDialogVisivel(true);
    };

    const fecharDialog = () => {
        setDialogVisivel(false);
        if (excecaoIdDaUrl) router.replace(ehNcm ? '/fiscal/excecoes-ncm' : '/fiscal/excecoes');
    };

    const confirmarInativacao = async (motivo: string) => {
        if (!inativando) return;
        setErro(null);
        try {
            await mutations.inativarMutation.mutateAsync({ id: inativando.id, values: { motivo } });
            toast.success('Exceção fiscal', 'Exceção inativada.');
            setInativando(null);
        } catch (error) {
            const mapped = mapApiError(error);
            setErro(mapped);
            toast.error('Exceção fiscal', mapped.message);
        }
    };

    const itens = (listaQuery.data?.items ?? []) as ExcecaoFiscalNcmResumoResponse[];

    return (
        <>
            <PageHeader
                title={texto.titulo}
                description={texto.descricao}
                actions={
                    <>
                        <Link href={texto.outraRota}>
                            <Button type="button" label={texto.outroRotulo} icon="pi pi-arrow-right-arrow-left" outlined />
                        </Link>
                        {hasPermission('FISCAL_REGRAS_GERENCIAR') ? (
                            <Button type="button" label="Nova exceção" icon="pi pi-plus" disabled={!empresaId} tooltip={empresaId ? undefined : 'Selecione a empresa antes de cadastrar uma exceção.'} onClick={abrirNova} />
                        ) : null}
                    </>
                }
            />

            <Message
                severity="info"
                className="w-full mb-3"
                text="Precedência na resolução: exceção por NCM vence exceção geral, que vence a regra fiscal. Exceções cobrem apenas ICMS próprio e PIS/COFINS — os demais tributos só mudam por regra mais específica."
            />
            <ApiErrorPanel error={erro} title="Não foi possível concluir a operação na exceção fiscal." />
            <ApiErrorPanel error={listaQuery.isError ? mapApiError(listaQuery.error) : null} title="Não foi possível listar as exceções fiscais." />

            <Card className="mb-3">
                <div className="grid formgrid p-fluid">
                    <div className="field col-12 md:col-4">
                        <label htmlFor="empresaId" className="font-medium block mb-2">
                            Empresa
                        </label>
                        <EmpresaSelect
                            value={empresaId || null}
                            required
                            onChange={(value) => {
                                setEmpresaId(value ?? '');
                                setFilialId('');
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label htmlFor="filialId" className="font-medium block mb-2">
                            Filial
                        </label>
                        <FilialSelect
                            empresaId={empresaId || null}
                            value={filialId || null}
                            onChange={(value) => {
                                setFilialId(value ?? '');
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-2">
                        <label htmlFor="filtroUf" className="font-medium block mb-2">
                            UF
                        </label>
                        <InputText
                            id="filtroUf"
                            value={uf}
                            maxLength={2}
                            onChange={(event) => {
                                setUf(event.target.value.toUpperCase());
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-2">
                        <label htmlFor="filtroSituacaoExcecao" className="font-medium block mb-2">
                            Situação
                        </label>
                        <Dropdown
                            inputId="filtroSituacaoExcecao"
                            value={somenteAtivas}
                            options={situacaoOptions}
                            onChange={(event) => {
                                setSomenteAtivas(event.value === null || event.value === undefined ? null : Boolean(event.value));
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12">
                        <label htmlFor="filtroTermoExcecao" className="font-medium block mb-2">
                            Busca
                        </label>
                        <SearchInput
                            id="filtroTermoExcecao"
                            placeholder="Descrição ou código do benefício"
                            ariaLabel="Buscar exceção fiscal"
                            onChange={(value) => {
                                setTermo(value);
                                setPagina(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {!empresaId ? (
                    <Message severity="warn" className="w-full" text="Selecione a empresa para listar as exceções fiscais." />
                ) : (
                    <DataTableServer<ExcecaoFiscalNcmResumoResponse>
                        value={itens}
                        totalRecords={listaQuery.data?.totalItems ?? 0}
                        loading={listaQuery.isFetching}
                        first={(pagina - 1) * tamanhoPagina}
                        rows={tamanhoPagina}
                        emptyMessage="Nenhuma exceção fiscal encontrada para os filtros informados."
                        onPage={(event) => {
                            setTamanhoPagina(event.rows);
                            setPagina(Math.floor(event.first / event.rows) + 1);
                        }}
                    >
                        <Column field="descricao" header="Descrição" />
                        <Column field="uf" header="UF" />
                        <Column header="Código do benefício" body={(row: ExcecaoFiscalNcmResumoResponse) => row.codigoBeneficio ?? '-'} />
                        <Column header="Vigência" body={(row: ExcecaoFiscalNcmResumoResponse) => `${formatDataVigencia(row.vigenciaInicio)} — ${row.vigenciaFim ? formatDataVigencia(row.vigenciaFim) : 'aberta'}`} />
                        <Column header="Situação" body={(row: ExcecaoFiscalNcmResumoResponse) => <Tag value={row.ativa ? 'Ativa' : 'Inativa'} severity={row.ativa ? 'success' : 'danger'} />} />
                        <Column
                            header="Ações"
                            body={(row: ExcecaoFiscalNcmResumoResponse) => (
                                <DataTableActions
                                    actions={[
                                        { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'FISCAL_REGRAS_GERENCIAR', onClick: () => abrirEdicao(row.id) },
                                        { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'FISCAL_REGRAS_GERENCIAR', disabled: !row.ativa, onClick: () => setInativando(row) }
                                    ]}
                                />
                            )}
                        />
                    </DataTableServer>
                )}
            </Card>

            {/* Sem gate por empresa: a edição carrega a exceção pelo id e o deep link da trilha chega sem filtro aplicado. */}
            <ExcecaoFiscalFormDialog visible={dialogVisivel} variante={variante} excecaoId={excecaoSelecionada} empresaId={empresaId} filialId={filialId || null} onHide={fecharDialog} />

            <ReasonDialog
                visible={inativando !== null}
                title={`Inativar exceção "${inativando?.descricao ?? ''}"`}
                confirmLabel="Inativar exceção"
                loading={mutations.inativarMutation.isPending}
                onHide={() => setInativando(null)}
                onConfirm={confirmarInativacao}
            />
        </>
    );
};
