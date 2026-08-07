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
import { RegraFiscalFormDialog } from '@/features/tributacao/components/RegraFiscalFormDialog';
import { comCuringa, curingaLabel, formatDataVigencia, tipoOperacaoLabel, tipoOperacaoOptions } from '@/features/tributacao/components/tributacaoUiUtils';
import { useRegrasFiscais, useRegrasFiscaisMutations } from '@/features/tributacao/hooks/useTributacao';
import { RegraFiscalOperacaoResumoResponse } from '@/features/tributacao/types/tributacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

const situacaoOptions = [
    { label: 'Todas', value: null },
    { label: 'Somente ativas', value: true },
    { label: 'Somente inativas', value: false }
];

export const RegrasFiscaisPage = () => {
    const toast = useAppToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const regraIdDaUrl = searchParams.get('regraId');
    const { hasPermission } = usePermissions();
    const mutations = useRegrasFiscaisMutations();
    const [empresaId, setEmpresaId] = useState('');
    const [filialId, setFilialId] = useState('');
    const [tipoOperacao, setTipoOperacao] = useState<number | null>(null);
    const [ufDestino, setUfDestino] = useState('');
    const [somenteAtivas, setSomenteAtivas] = useState<boolean | null>(true);
    const [termo, setTermo] = useState('');
    const [pagina, setPagina] = useState(1);
    const [tamanhoPagina, setTamanhoPagina] = useState(20);
    const [dialogVisivel, setDialogVisivel] = useState(false);
    const [regraSelecionada, setRegraSelecionada] = useState<string | null>(null);
    const [inativando, setInativando] = useState<RegraFiscalOperacaoResumoResponse | null>(null);
    const [erro, setErro] = useState<ApiError | null>(null);

    const query = {
        empresaId: empresaId || null,
        filialId: filialId || null,
        tipoOperacao,
        ufDestino: ufDestino || null,
        somenteAtivas,
        termo: termo || null,
        pagina,
        tamanhoPagina
    };
    const regrasQuery = useRegrasFiscais(query);

    // Deep link vindo da trilha do cálculo do simulador (`?regraId=`): abre direto a regra que produziu o
    // número, que é o ponto da trilha existir — explicar o resultado sem obrigar o usuário a caçar a regra.
    useEffect(() => {
        if (!regraIdDaUrl) return;
        setRegraSelecionada(regraIdDaUrl);
        setDialogVisivel(true);
    }, [regraIdDaUrl]);

    if (!hasPermission('FISCAL_REGRAS_CONSULTAR')) {
        return <UnauthorizedState description="O cadastro de regras fiscais exige a permissão FISCAL_REGRAS_CONSULTAR." />;
    }

    const abrirNova = () => {
        setRegraSelecionada(null);
        setDialogVisivel(true);
    };

    const abrirEdicao = (id: string) => {
        setRegraSelecionada(id);
        setDialogVisivel(true);
    };

    // Limpa o `?regraId=` ao fechar; sem isso o efeito de deep link reabriria o modal no próximo render.
    const fecharDialog = () => {
        setDialogVisivel(false);
        if (regraIdDaUrl) router.replace('/fiscal/regras');
    };

    const confirmarInativacao = async (motivo: string) => {
        if (!inativando) return;
        setErro(null);
        try {
            await mutations.inativarMutation.mutateAsync({ id: inativando.id, values: { motivo } });
            toast.success('Regra fiscal', 'Regra inativada.');
            setInativando(null);
        } catch (error) {
            const mapped = mapApiError(error);
            setErro(mapped);
            toast.error('Regra fiscal', mapped.message);
        }
    };

    const itens = regrasQuery.data?.items ?? [];

    return (
        <>
            <PageHeader
                title="Regras fiscais"
                description="Cadastro que parametriza o motor de tributação. A regra tem uma chave de resolução e até cinco blocos por tributo — bloco ausente significa tributo não parametrizado, nunca tributo zero."
                actions={
                    <>
                        <Link href="/fiscal/simulador">
                            <Button type="button" label="Simulador" icon="pi pi-calculator" outlined />
                        </Link>
                        {hasPermission('FISCAL_REGRAS_GERENCIAR') ? <Button type="button" label="Nova regra" icon="pi pi-plus" disabled={!empresaId} tooltip={empresaId ? undefined : 'Selecione a empresa antes de cadastrar uma regra.'} onClick={abrirNova} /> : null}
                    </>
                }
            />

            <Message
                severity="info"
                className="w-full mb-3"
                text="Campos vazios da chave de resolução são curinga: valem para qualquer valor. A resolução escolhe a regra mais específica e, em empate, a de maior prioridade — duas regras igualmente específicas produzem FISCAL_TRIBUTACAO_REGRA_AMBIGUA na simulação."
            />
            <ApiErrorPanel error={erro} title="Não foi possível concluir a operação na regra fiscal." />
            <ApiErrorPanel error={regrasQuery.isError ? mapApiError(regrasQuery.error) : null} title="Não foi possível listar as regras fiscais." />

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
                    <div className="field col-12 md:col-4">
                        <label htmlFor="filtroTipoOperacao" className="font-medium block mb-2">
                            Tipo de operação
                        </label>
                        <Dropdown
                            inputId="filtroTipoOperacao"
                            value={tipoOperacao}
                            options={comCuringa(tipoOperacaoOptions)}
                            placeholder="(qualquer)"
                            onChange={(event) => {
                                setTipoOperacao(event.value === null || event.value === undefined ? null : Number(event.value));
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label htmlFor="filtroUfDestino" className="font-medium block mb-2">
                            UF de destino
                        </label>
                        <InputText
                            id="filtroUfDestino"
                            value={ufDestino}
                            maxLength={2}
                            onChange={(event) => {
                                setUfDestino(event.target.value.toUpperCase());
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label htmlFor="filtroSituacao" className="font-medium block mb-2">
                            Situação
                        </label>
                        <Dropdown
                            inputId="filtroSituacao"
                            value={somenteAtivas}
                            options={situacaoOptions}
                            onChange={(event) => {
                                setSomenteAtivas(event.value === null || event.value === undefined ? null : Boolean(event.value));
                                setPagina(1);
                            }}
                        />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="filtroTermo" className="font-medium block mb-2">
                            Busca
                        </label>
                        <SearchInput
                            id="filtroTermo"
                            placeholder="Descrição da regra"
                            ariaLabel="Buscar regra fiscal pela descrição"
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
                    <Message severity="warn" className="w-full" text="Selecione a empresa para listar as regras fiscais." />
                ) : (
                    <DataTableServer<RegraFiscalOperacaoResumoResponse>
                        value={itens}
                        totalRecords={regrasQuery.data?.totalItems ?? 0}
                        loading={regrasQuery.isFetching}
                        first={(pagina - 1) * tamanhoPagina}
                        rows={tamanhoPagina}
                        emptyMessage="Nenhuma regra fiscal encontrada para os filtros informados."
                        onPage={(event) => {
                            setTamanhoPagina(event.rows);
                            setPagina(Math.floor(event.first / event.rows) + 1);
                        }}
                    >
                        <Column field="descricao" header="Descrição" />
                        <Column header="Operação" body={(row: RegraFiscalOperacaoResumoResponse) => tipoOperacaoLabel(Number(row.tipoOperacao))} />
                        <Column header="UF origem" body={(row: RegraFiscalOperacaoResumoResponse) => curingaLabel(row.ufOrigem)} />
                        <Column header="UF destino" body={(row: RegraFiscalOperacaoResumoResponse) => curingaLabel(row.ufDestino)} />
                        <Column field="prioridade" header="Prioridade" />
                        <Column header="Vigência" body={(row: RegraFiscalOperacaoResumoResponse) => `${formatDataVigencia(row.vigenciaInicio)} — ${row.vigenciaFim ? formatDataVigencia(row.vigenciaFim) : 'aberta'}`} />
                        <Column header="Situação" body={(row: RegraFiscalOperacaoResumoResponse) => <Tag value={row.ativa ? 'Ativa' : 'Inativa'} severity={row.ativa ? 'success' : 'danger'} />} />
                        <Column
                            header="Ações"
                            body={(row: RegraFiscalOperacaoResumoResponse) => (
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

            {/* Sem gate por empresa: a edição carrega a regra pelo id e o deep link da trilha chega sem filtro aplicado. A empresa só é exigida na criação, e o botão "Nova regra" fica desabilitado até ela ser escolhida. */}
            <RegraFiscalFormDialog visible={dialogVisivel} regraId={regraSelecionada} empresaId={empresaId} filialId={filialId || null} onHide={fecharDialog} />

            <ReasonDialog
                visible={inativando !== null}
                title={`Inativar regra "${inativando?.descricao ?? ''}"`}
                confirmLabel="Inativar regra"
                loading={mutations.inativarMutation.isPending}
                onHide={() => setInativando(null)}
                onConfirm={confirmarInativacao}
            />
        </>
    );
};
