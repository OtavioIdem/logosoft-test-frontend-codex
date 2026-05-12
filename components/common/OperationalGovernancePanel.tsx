'use client';

import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { EntityStatus } from '@/types/erp';

type Metric = {
    label: string;
    value: string;
    helper: string;
    severity?: 'success' | 'info' | 'warning' | 'danger';
};

type OperationalGovernancePanelProps = {
    title: string;
    description: string;
    records: readonly object[];
    activeLabel?: string;
    inactiveLabel?: string;
    complianceNote: string;
    sensitiveDataNote?: string;
};

const asRecord = (record: object) => record as Record<string, unknown>;
const getStatus = (record: object) => Number(asRecord(record).status ?? EntityStatus.Ativo);
const isActive = (record: object) => getStatus(record) === EntityStatus.Ativo;
const getDateValue = (record: object) => {
    const value = asRecord(record).createdAt ?? asRecord(record).criadoEm ?? asRecord(record).dataEmissao;
    return typeof value === 'string' && value ? new Date(value) : null;
};
const formatDate = (date: Date | null) => {
    if (!date || Number.isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleDateString('pt-BR');
};

const buildMetrics = (records: readonly object[], activeLabel: string, inactiveLabel: string): Metric[] => {
    const total = records.length;
    const active = records.filter(isActive).length;
    const inactive = total - active;
    const latestDate = records
        .map(getDateValue)
        .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return [
        { label: 'Registros', value: total.toLocaleString('pt-BR'), helper: 'Itens carregados na listagem atual.', severity: 'info' },
        { label: activeLabel, value: active.toLocaleString('pt-BR'), helper: 'Disponíveis para operação conforme status retornado.', severity: 'success' },
        { label: inactiveLabel, value: inactive.toLocaleString('pt-BR'), helper: 'Bloqueados, inativos ou exigem análise operacional.', severity: inactive > 0 ? 'warning' : 'info' },
        { label: 'Último cadastro', value: formatDate(latestDate), helper: 'Data mais recente retornada pela API.', severity: 'info' }
    ];
};

export const OperationalGovernancePanel = ({ title, description, records, activeLabel = 'Ativos', inactiveLabel = 'Não ativos', complianceNote, sensitiveDataNote }: OperationalGovernancePanelProps) => {
    const metrics = buildMetrics(records, activeLabel, inactiveLabel);

    return (
        <Card className="mb-3">
            <div className="flex flex-column gap-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-2">
                    <div>
                        <h3 className="m-0 text-lg">{title}</h3>
                        <p className="m-0 mt-1 text-600 line-height-3">{description}</p>
                    </div>
                    <Tag value="Rastreabilidade" severity="info" />
                </div>
                <div className="grid">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="col-12 md:col-3">
                            <div className="surface-50 border-1 surface-border border-round p-3 h-full">
                                <div className="flex align-items-center justify-content-between gap-2">
                                    <span className="text-600 text-sm">{metric.label}</span>
                                    <Tag value={metric.severity === 'success' ? 'OK' : metric.severity === 'warning' ? 'Atenção' : 'Info'} severity={metric.severity} />
                                </div>
                                <div className="text-2xl font-semibold mt-2">{metric.value}</div>
                                <div className="text-600 text-sm mt-1 line-height-3">{metric.helper}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid">
                    <div className={sensitiveDataNote ? 'col-12 md:col-6' : 'col-12'}>
                        <div className="border-1 surface-border border-round p-3 line-height-3">
                            <div className="font-medium mb-1">Controle operacional</div>
                            <div className="text-600 text-sm">{complianceNote}</div>
                        </div>
                    </div>
                    {sensitiveDataNote ? (
                        <div className="col-12 md:col-6">
                            <div className="border-1 surface-border border-round p-3 line-height-3">
                                <div className="font-medium mb-1">Privacidade e dados</div>
                                <div className="text-600 text-sm">{sensitiveDataNote}</div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </Card>
    );
};
