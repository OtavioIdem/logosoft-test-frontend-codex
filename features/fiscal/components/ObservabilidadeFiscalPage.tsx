'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useFiscalMutations, useHistoricoContingenciaFiscal, useHistoricoStatusServicoFiscal, useObservabilidadeFiscal } from '@/features/fiscal/hooks/useFiscalResources';
import { LogIntegracaoFiscalResponse, StatusServicoSefazResponse } from '@/features/fiscal/types/fiscal.types';
import { formatFiscalDate, gerarCorrelationId, maskFiscalSensitiveText, tipoDocumentoFiscalOptions } from '@/features/fiscal/components/fiscalUiUtils';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError, TipoDocumentoFiscal } from '@/types/erp';

const statusIntegracaoLabel = (status?: number | null) => {
    const labels: Record<number, string> = {
        1: 'Pendente',
        2: 'Sucesso',
        3: 'Falha',
        4: 'Reprocessamento'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

const statusIntegracaoSeverity = (status?: number | null): 'success' | 'info' | 'warning' | 'danger' | undefined => {
    if (Number(status) === 2) return 'success';
    if (Number(status) === 3) return 'danger';
    if (Number(status) === 4) return 'warning';
    return 'info';
};

const statusIntegracaoOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendente', value: 1 },
    { label: 'Sucesso', value: 2 },
    { label: 'Falha', value: 3 },
    { label: 'Reprocessamento', value: 4 }
];

const booleanFilterOptions = [
    { label: 'Todos', value: null },
    { label: 'Sim', value: true },
    { label: 'Não', value: false }
];

const toIsoDateTimeOrNull = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const MetricCard = ({ title, value, severity }: { title: string; value: number | string; severity?: 'success' | 'warning' | 'danger' | 'info' }) => (
    <Card className="h-full">
        <div className="flex align-items-center justify-content-between gap-3">
            <div>
                <span className="text-color-secondary text-sm">{title}</span>
                <div className="text-2xl font-semibold mt-2">{value}</div>
            </div>
            {severity ? <Tag severity={severity} value={String(value)} /> : null}
        </div>
    </Card>
);

const PayloadResumo = ({ log }: { log: LogIntegracaoFiscalResponse }) => {
    const value = maskFiscalSensitiveText(log.payloadResumo);
    return <span className="text-sm line-height-3">{value}</span>;
};

const StatusServicoResult = ({ result }: { result: StatusServicoSefazResponse }) => (
    <div className="flex flex-column gap-3">
        <div className="flex flex-wrap gap-2 align-items-center">
            <Tag severity={result.comunicacaoOk ? 'success' : 'danger'} value={result.comunicacaoOk ? 'Comunicação OK' : 'Falha de comunicação'} />
            <Tag severity={result.disponivel ? 'success' : 'warning'} value={result.disponivel ? 'Serviço disponível' : 'Serviço indisponível'} />
            {result.deveReprocessar ? <Tag severity="warning" value="Reprocessar" /> : null}
        </div>
        <div className="grid">
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">UF</span><div className="font-medium">{result.ufAutorizadora}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Código</span><div className="font-medium">{result.codigoStatus ?? '-'}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Ambiente</span><div className="font-medium">{result.ambiente}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Consultado em</span><div className="font-medium">{formatFiscalDate(result.consultadoEm)}</div></div>
            <div className="col-12"><span className="text-color-secondary text-sm">Motivo</span><div className="font-medium">{result.motivo ?? '-'}</div></div>
        </div>
        {result.alertas?.length ? <div className="flex flex-column gap-2">{result.alertas.map((alerta) => <Message key={alerta} severity="warn" text={alerta} />)}</div> : null}
    </div>
);

const HistoricoLogsTable = ({ title, logs, loading }: { title: string; logs: LogIntegracaoFiscalResponse[]; loading?: boolean }) => (
    <Card title={title} className="h-full">
        <DataTable value={logs} dataKey="id" loading={loading} emptyMessage="Nenhum histórico encontrado." responsiveLayout="scroll" stripedRows rows={5} paginator={logs.length > 5}>
            <Column header="Operação" field="operacao" />
            <Column header="Status" body={(log: LogIntegracaoFiscalResponse) => <Tag severity={statusIntegracaoSeverity(log.statusIntegracao)} value={statusIntegracaoLabel(log.statusIntegracao)} />} />
            <Column header="Mensagem" field="mensagem" />
            <Column header="Registrado em" body={(log: LogIntegracaoFiscalResponse) => formatFiscalDate(log.registradoEm)} />
            <Column header="Sensível" body={(log: LogIntegracaoFiscalResponse) => (log.contemDadoSensivelOcultado ? <Tag severity="info" value="Mascarado" /> : <Tag value="-" />)} />
        </DataTable>
    </Card>
);

export const ObservabilidadeFiscalPage = () => {
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [registradoApos, setRegistradoApos] = useState<string>('');
    const [take, setTake] = useState<number>(50);
    const [operacaoFiltro, setOperacaoFiltro] = useState('');
    const [statusFiltro, setStatusFiltro] = useState<number | null>(null);
    const [somenteReprocessaveis, setSomenteReprocessaveis] = useState<boolean | null>(null);
    const [somenteComDadoMascarado, setSomenteComDadoMascarado] = useState<boolean | null>(null);
    const [statusServicoResult, setStatusServicoResult] = useState<StatusServicoSefazResponse | null>(null);
    const [statusServicoError, setStatusServicoError] = useState<ApiError | null>(null);
    const [statusServicoForm, setStatusServicoForm] = useState({
        tipoDocumento: TipoDocumentoFiscal.NFe,
        ufAutorizadora: 'SP',
        xmlStatusServico: '<consStatServ />',
        validarSchemaAntesConsulta: false,
        schemaSetName: 'nfe-vigente',
        correlationId: gerarCorrelationId('status-servico')
    });

    const query = useMemo(
        () => ({
            empresaId,
            filialId,
            registradoApos: toIsoDateTimeOrNull(registradoApos),
            take
        }),
        [empresaId, filialId, registradoApos, take]
    );

    const historicoQuery = useMemo(() => ({ empresaId, filialId, take: Math.min(take, 50) }), [empresaId, filialId, take]);
    const observabilidadeQuery = useObservabilidadeFiscal(query);
    const historicoStatusServicoQuery = useHistoricoStatusServicoFiscal(historicoQuery);
    const historicoContingenciaQuery = useHistoricoContingenciaFiscal(historicoQuery);
    const fiscalMutations = useFiscalMutations();
    const observabilidade = observabilidadeQuery.data;
    const logs = observabilidade?.logsRecentes ?? [];

    const logsFiltrados = useMemo(
        () => logs.filter((log) => {
            const matchOperacao = !operacaoFiltro.trim() || log.operacao.toLowerCase().includes(operacaoFiltro.trim().toLowerCase());
            const matchStatus = statusFiltro === null || Number(log.statusIntegracao) === Number(statusFiltro);
            const matchReprocessavel = somenteReprocessaveis === null || Boolean(log.podeReprocessar) === somenteReprocessaveis;
            const matchMascarado = somenteComDadoMascarado === null || Boolean(log.contemDadoSensivelOcultado) === somenteComDadoMascarado;
            return matchOperacao && matchStatus && matchReprocessavel && matchMascarado;
        }),
        [logs, operacaoFiltro, statusFiltro, somenteReprocessaveis, somenteComDadoMascarado]
    );

    const handleStatusServicoSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!empresaId) return;
        setStatusServicoError(null);
        try {
            const result = await fiscalMutations.statusServicoMutation.mutateAsync({
                empresaId,
                filialId,
                tipoDocumento: statusServicoForm.tipoDocumento,
                ufAutorizadora: statusServicoForm.ufAutorizadora,
                xmlStatusServico: statusServicoForm.xmlStatusServico,
                validarSchemaAntesConsulta: statusServicoForm.validarSchemaAntesConsulta,
                schemaSetName: statusServicoForm.schemaSetName,
                correlationId: statusServicoForm.correlationId
            });
            setStatusServicoResult(result);
            setStatusServicoForm((current) => ({ ...current, correlationId: gerarCorrelationId('status-servico') }));
        } catch (error) {
            setStatusServicoError(mapApiError(error));
        }
    };

    return (
        <div className="surface-ground px-3 py-4 md:px-4 lg:px-6">
            <PageHeader
                title="Observabilidade fiscal"
                description="Acompanhe integrações fiscais sanitizadas, status de serviço, contingência, falhas recentes, pendências e reprocessamentos sem expor XML completo, certificados ou payloads sensíveis."
                actions={<Button label="Atualizar" icon="pi pi-refresh" onClick={() => { observabilidadeQuery.refetch(); historicoStatusServicoQuery.refetch(); historicoContingenciaQuery.refetch(); }} disabled={!empresaId} loading={observabilidadeQuery.isFetching || historicoStatusServicoQuery.isFetching || historicoContingenciaQuery.isFetching} />}
            />

            <Card className="mb-4">
                <div className="flex flex-column lg:flex-row gap-3 lg:align-items-end">
                    <EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={setEmpresaId} onFilialChange={setFilialId} />
                    <div className="flex flex-column gap-2 min-w-16rem">
                        <label htmlFor="registradoApos" className="font-medium">Registrado após</label>
                        <InputText id="registradoApos" type="datetime-local" value={registradoApos} onChange={(event) => setRegistradoApos(event.target.value)} />
                    </div>
                    <div className="flex flex-column gap-2 min-w-10rem">
                        <label htmlFor="take" className="font-medium">Quantidade</label>
                        <InputNumber inputId="take" value={take} onValueChange={(event) => setTake(Number(event.value ?? 50))} min={1} max={500} showButtons />
                    </div>
                    <Button label="Consultar" icon="pi pi-search" disabled={!empresaId} loading={observabilidadeQuery.isFetching} onClick={() => observabilidadeQuery.refetch()} />
                </div>
            </Card>

            {!empresaId ? <Message className="w-full mb-4" severity="info" text="Selecione a empresa para consultar a observabilidade fiscal." /> : null}
            {observabilidadeQuery.error ? <ApiErrorPanel error={mapApiError(observabilidadeQuery.error)} title="Não foi possível consultar a observabilidade fiscal." /> : null}
            {observabilidadeQuery.isLoading && empresaId ? <LoadingState variant="cards" /> : null}

            <Card title="Status de serviço fiscal" className="mb-4">
                <form className="grid formgrid p-fluid" onSubmit={handleStatusServicoSubmit}>
                    <div className="field col-12 md:col-3">
                        <label htmlFor="statusTipoDocumento" className="font-medium">Documento</label>
                        <Dropdown inputId="statusTipoDocumento" value={statusServicoForm.tipoDocumento} options={tipoDocumentoFiscalOptions} onChange={(event) => setStatusServicoForm((current) => ({ ...current, tipoDocumento: event.value }))} />
                    </div>
                    <div className="field col-12 md:col-2">
                        <label htmlFor="statusUf" className="font-medium">UF autorizadora</label>
                        <InputText id="statusUf" value={statusServicoForm.ufAutorizadora} maxLength={2} onChange={(event) => setStatusServicoForm((current) => ({ ...current, ufAutorizadora: event.target.value.toUpperCase() }))} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label htmlFor="statusSchema" className="font-medium">Schema set</label>
                        <InputText id="statusSchema" value={statusServicoForm.schemaSetName} onChange={(event) => setStatusServicoForm((current) => ({ ...current, schemaSetName: event.target.value }))} />
                    </div>
                    <div className="field col-12 md:col-4">
                        <label htmlFor="statusCorrelation" className="font-medium">Correlation ID</label>
                        <InputText id="statusCorrelation" value={statusServicoForm.correlationId} onChange={(event) => setStatusServicoForm((current) => ({ ...current, correlationId: event.target.value }))} />
                    </div>
                    <div className="field col-12">
                        <label htmlFor="statusXml" className="font-medium">XML de consulta de status</label>
                        <InputText id="statusXml" value={statusServicoForm.xmlStatusServico} onChange={(event) => setStatusServicoForm((current) => ({ ...current, xmlStatusServico: event.target.value }))} />
                    </div>
                    <div className="field col-12 flex align-items-center gap-2">
                        <Checkbox inputId="validarSchemaStatus" checked={statusServicoForm.validarSchemaAntesConsulta} onChange={(event) => setStatusServicoForm((current) => ({ ...current, validarSchemaAntesConsulta: Boolean(event.checked) }))} />
                        <label htmlFor="validarSchemaStatus">Validar schema antes da consulta</label>
                    </div>
                    <div className="field col-12 flex gap-2">
                        <Button type="submit" label="Consultar status" icon="pi pi-send" disabled={!empresaId} loading={fiscalMutations.statusServicoMutation.isPending} />
                        <Button type="button" label="Novo correlation ID" icon="pi pi-refresh" severity="secondary" onClick={() => setStatusServicoForm((current) => ({ ...current, correlationId: gerarCorrelationId('status-servico') }))} />
                    </div>
                </form>
                {statusServicoError ? <div className="mt-3"><ApiErrorPanel error={statusServicoError} title="Não foi possível consultar o status de serviço fiscal." /></div> : null}
                {statusServicoResult ? <div className="mt-3"><StatusServicoResult result={statusServicoResult} /></div> : null}
            </Card>

            {observabilidade ? (
                <>
                    <div className="grid mb-4">
                        <div className="col-12 md:col-6 xl:col-3"><MetricCard title="Logs analisados" value={observabilidade.totalLogsAnalisados} severity="info" /></div>
                        <div className="col-12 md:col-6 xl:col-3"><MetricCard title="Sucessos" value={observabilidade.totalSucesso} severity="success" /></div>
                        <div className="col-12 md:col-6 xl:col-3"><MetricCard title="Falhas" value={observabilidade.totalFalha} severity={observabilidade.possuiFalhaRecente ? 'danger' : 'info'} /></div>
                        <div className="col-12 md:col-6 xl:col-3"><MetricCard title="Pendências" value={observabilidade.totalPendente} severity={observabilidade.possuiPendenciaRecente ? 'warning' : 'info'} /></div>
                    </div>

                    {observabilidade.alertas?.length ? (
                        <div className="mb-4 flex flex-column gap-2">
                            {observabilidade.alertas.map((alerta) => <Message key={alerta} severity="warn" text={alerta} />)}
                        </div>
                    ) : null}

                    <Card title="Logs recentes" className="mb-4">
                        <div className="grid formgrid p-fluid mb-3">
                            <div className="field col-12 md:col-3">
                                <label htmlFor="operacaoFiltro" className="font-medium">Operação</label>
                                <InputText id="operacaoFiltro" value={operacaoFiltro} onChange={(event) => setOperacaoFiltro(event.target.value)} placeholder="Filtrar operação" />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="statusFiltro" className="font-medium">Status</label>
                                <Dropdown inputId="statusFiltro" value={statusFiltro} options={statusIntegracaoOptions} onChange={(event) => setStatusFiltro(event.value)} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="reprocessavelFiltro" className="font-medium">Reprocessável</label>
                                <Dropdown inputId="reprocessavelFiltro" value={somenteReprocessaveis} options={booleanFilterOptions} onChange={(event) => setSomenteReprocessaveis(event.value)} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="mascaradoFiltro" className="font-medium">Dado sensível mascarado</label>
                                <Dropdown inputId="mascaradoFiltro" value={somenteComDadoMascarado} options={booleanFilterOptions} onChange={(event) => setSomenteComDadoMascarado(event.value)} />
                            </div>
                        </div>
                        <DataTable value={logsFiltrados} dataKey="id" loading={observabilidadeQuery.isFetching} emptyMessage="Nenhum log fiscal encontrado." responsiveLayout="scroll" stripedRows paginator rows={10}>
                            <Column header="Operação" field="operacao" />
                            <Column header="Status" body={(log: LogIntegracaoFiscalResponse) => <Tag severity={statusIntegracaoSeverity(log.statusIntegracao)} value={statusIntegracaoLabel(log.statusIntegracao)} />} />
                            <Column header="Correlation ID" field="correlationId" />
                            <Column header="Mensagem" field="mensagem" />
                            <Column header="Payload sanitizado" body={(log: LogIntegracaoFiscalResponse) => <PayloadResumo log={log} />} />
                            <Column header="Registrado em" body={(log: LogIntegracaoFiscalResponse) => formatFiscalDate(log.registradoEm)} />
                            <Column header="Reprocessar" body={(log: LogIntegracaoFiscalResponse) => (log.podeReprocessar ? <Tag severity="warning" value="Permitido" /> : <Tag value="Não" />)} />
                            <Column header="Dado sensível" body={(log: LogIntegracaoFiscalResponse) => (log.contemDadoSensivelOcultado ? <Tag severity="info" value="Mascarado" /> : <Tag value="-" />)} />
                        </DataTable>
                    </Card>

                    <div className="grid">
                        <div className="col-12 xl:col-6"><HistoricoLogsTable title="Histórico de status de serviço" logs={historicoStatusServicoQuery.data ?? []} loading={historicoStatusServicoQuery.isFetching} /></div>
                        <div className="col-12 xl:col-6"><HistoricoLogsTable title="Histórico de contingência" logs={historicoContingenciaQuery.data ?? []} loading={historicoContingenciaQuery.isFetching} /></div>
                    </div>
                </>
            ) : null}
        </div>
    );
};
