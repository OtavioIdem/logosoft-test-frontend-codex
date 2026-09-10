'use client';

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import {
    DocumentoAuxiliarFiscalResponse,
    ContingenciaFiscalResponse,
    LogIntegracaoFiscalResponse,
    StatusServicoSefazResponse
} from '@/features/fiscal/types/fiscal.types';
import {
    formatoDocumentoAuxiliarFiscalLabel,
    formatFiscalDate,
    hasFiscalSensitiveContent,
    maskFiscalSensitiveText,
    tipoContingenciaFiscalLabel,
    tipoDocumentoAuxiliarFiscalLabel
} from '@/features/fiscal/components/fiscalUiUtils';

export const statusIntegracaoLabel = (status?: number | null) => {
    const labels: Record<number, string> = {
        1: 'Pendente',
        2: 'Sucesso',
        3: 'Falha',
        4: 'Reprocessamento'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const statusIntegracaoSeverity = (status?: number | null): 'success' | 'info' | 'warning' | 'danger' | undefined => {
    if (Number(status) === 2) return 'success';
    if (Number(status) === 3) return 'danger';
    if (Number(status) === 4) return 'warning';
    return 'info';
};

export const statusIntegracaoOptions = [
    { label: 'Todos', value: null },
    { label: 'Pendente', value: 1 },
    { label: 'Sucesso', value: 2 },
    { label: 'Falha', value: 3 },
    { label: 'Reprocessamento', value: 4 }
];

export const FiscalPayloadResumo = ({ payload }: { payload?: string | null }) => {
    const masked = maskFiscalSensitiveText(payload);
    const sensitive = hasFiscalSensitiveContent(payload);
    return (
        <div className="flex flex-column gap-1">
            <span className="text-sm line-height-3 break-word">{masked}</span>
            {sensitive ? <Tag severity="info" value="Payload protegido" /> : null}
        </div>
    );
};

export const StatusServicoResultPanel = ({ result }: { result: StatusServicoSefazResponse }) => (
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

export const ContingenciaResultPanel = ({ result }: { result: ContingenciaFiscalResponse }) => (
    <div className="flex flex-column gap-3">
        <div className="flex flex-wrap gap-2 align-items-center">
            <Tag severity={result.permitida ? 'success' : 'warning'} value={result.permitida ? 'Contingência permitida' : 'Contingência não permitida'} />
            <Tag severity={result.statusServicoIndisponivelDetectado ? 'warning' : 'info'} value={result.statusServicoIndisponivelDetectado ? 'Indisponibilidade detectada' : 'Sem indisponibilidade recente'} />
        </div>
        <div className="grid">
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">UF</span><div className="font-medium">{result.ufAutorizadora}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Tipo</span><div className="font-medium">{tipoContingenciaFiscalLabel(result.tipoContingencia)}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Código status</span><div className="font-medium">{result.codigoStatusServico ?? '-'}</div></div>
            <div className="col-12 md:col-3"><span className="text-color-secondary text-sm">Avaliada em</span><div className="font-medium">{formatFiscalDate(result.avaliadaEm)}</div></div>
            <div className="col-12"><span className="text-color-secondary text-sm">Motivo operacional</span><div className="font-medium">{result.motivoOperacional ?? '-'}</div></div>
            <div className="col-12"><span className="text-color-secondary text-sm">Motivo status serviço</span><div className="font-medium">{result.motivoStatusServico ?? '-'}</div></div>
        </div>
        {result.alertas?.length ? <div className="flex flex-column gap-2">{result.alertas.map((alerta) => <Message key={alerta} severity="warn" text={alerta} />)}</div> : null}
    </div>
);

export const HistoricoLogsTable = ({ title, logs, loading, onOpenNota }: { title: string; logs: LogIntegracaoFiscalResponse[]; loading?: boolean; onOpenNota?: (notaFiscalId: string) => void }) => (
    <Card title={title} className="h-full">
        <DataTable value={logs} dataKey="id" loading={loading} emptyMessage="Nenhum histórico encontrado." responsiveLayout="scroll" stripedRows rows={5} paginator={logs.length > 5}>
            <Column header="Operação" field="operacao" />
            <Column header="Status" body={(log: LogIntegracaoFiscalResponse) => <Tag severity={statusIntegracaoSeverity(log.statusIntegracao)} value={statusIntegracaoLabel(log.statusIntegracao)} />} />
            <Column header="Mensagem" field="mensagem" />
            <Column header="Registrado em" body={(log: LogIntegracaoFiscalResponse) => formatFiscalDate(log.registradoEm)} />
            <Column header="Sensível" body={(log: LogIntegracaoFiscalResponse) => (log.contemDadoSensivelOcultado ? <Tag severity="info" value="Mascarado" /> : <Tag value="-" />)} />
            {onOpenNota ? <Column header="Nota" body={(log: LogIntegracaoFiscalResponse) => (log.notaFiscalId ? <Button type="button" label="Abrir" icon="pi pi-external-link" size="small" text onClick={() => onOpenNota(log.notaFiscalId!)} /> : '-')} /> : null}
        </DataTable>
    </Card>
);

export const FiscalDocumentosAuxiliaresPanel = ({ documentos, possuiDanfe, onDownload }: { documentos: DocumentoAuxiliarFiscalResponse[]; possuiDanfe?: boolean; onDownload?: (documento: DocumentoAuxiliarFiscalResponse) => void }) => (
    <div className="flex flex-column gap-3">
        <Message
            severity={possuiDanfe || documentos.length ? 'info' : 'warn'}
            className="w-full"
            text={possuiDanfe || documentos.length ? 'Documentos auxiliares devem ser exibidos somente por metadados e baixados pelo endpoint protegido.' : 'DANFE/documento auxiliar pendente conforme resumo/workflow operacional.'}
        />
        <DataTable value={documentos} dataKey="id" emptyMessage="Nenhum documento auxiliar carregado nesta sessão. Gere o DANFE ou utilize um documento retornado pelo backend." responsiveLayout="scroll" stripedRows size="small">
            <Column header="Tipo" body={(doc: DocumentoAuxiliarFiscalResponse) => tipoDocumentoAuxiliarFiscalLabel(doc.tipo)} />
            <Column header="Formato" body={(doc: DocumentoAuxiliarFiscalResponse) => formatoDocumentoAuxiliarFiscalLabel(doc.formato)} />
            <Column field="nomeArquivo" header="Arquivo" />
            <Column field="contentType" header="Content-Type" />
            <Column header="Tamanho" body={(doc: DocumentoAuxiliarFiscalResponse) => `${Number(doc.tamanhoBytes ?? 0).toLocaleString('pt-BR')} bytes`} />
            <Column field="hashSha256" header="Hash SHA-256" />
            <Column header="Gerado em" body={(doc: DocumentoAuxiliarFiscalResponse) => formatFiscalDate(doc.geradoEm)} />
            <Column header="Download" body={(doc: DocumentoAuxiliarFiscalResponse) => (onDownload ? <Button type="button" label="Baixar" icon="pi pi-download" size="small" outlined onClick={() => onDownload(doc)} /> : '-')} />
        </DataTable>
    </div>
);

export const FiscalIntegracoesTable = ({ logs, loading, onReprocessar, onOpenNota }: { logs: LogIntegracaoFiscalResponse[]; loading?: boolean; onReprocessar?: (log: LogIntegracaoFiscalResponse) => void; onOpenNota?: (notaFiscalId: string) => void }) => (
    <DataTable value={logs} dataKey="id" loading={loading} emptyMessage="Nenhum log de integração fiscal." size="small" paginator rows={10} responsiveLayout="scroll" stripedRows>
        <Column field="operacao" header="Operação" />
        <Column header="Status" body={(row: LogIntegracaoFiscalResponse) => <Tag severity={statusIntegracaoSeverity(row.statusIntegracao)} value={statusIntegracaoLabel(row.statusIntegracao)} />} />
        <Column field="correlationId" header="Correlation ID" />
        <Column field="mensagem" header="Mensagem" />
        <Column header="Payload sanitizado" body={(row: LogIntegracaoFiscalResponse) => <FiscalPayloadResumo payload={row.payloadResumo} />} />
        <Column header="Registrado em" body={(row: LogIntegracaoFiscalResponse) => formatFiscalDate(row.registradoEm)} />
        <Column header="Sensível" body={(row: LogIntegracaoFiscalResponse) => (row.contemDadoSensivelOcultado ? <Tag severity="info" value="Mascarado" /> : <Tag value="-" />)} />
        {onOpenNota ? <Column header="Nota" body={(row: LogIntegracaoFiscalResponse) => (row.notaFiscalId ? <Button type="button" label="Abrir" icon="pi pi-external-link" size="small" text onClick={() => onOpenNota(row.notaFiscalId!)} /> : '-')} /> : null}
        {onReprocessar ? (
            <Column
                header="Ação"
                body={(row: LogIntegracaoFiscalResponse) => row.podeReprocessar ? (
                    <PermissionGuard permission="FISCAL_REPROCESSAR" mode="disable">
                        {({ disabled }) => <Button label="Reprocessar" icon="pi pi-refresh" size="small" outlined disabled={disabled} title={disabled ? 'Permissão necessária: FISCAL_REPROCESSAR.' : undefined} onClick={() => onReprocessar(row)} />}
                    </PermissionGuard>
                ) : <Tag value="Não reprocessável" />}
            />
        ) : null}
    </DataTable>
);
