'use client';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ImpostoNotaFiscalResponse, NotaFiscalResponse, SituacaoLinhaImpostoNoTotal } from '@/features/fiscal/types/fiscal.types';
import { composicaoTotalNotaFiscal, formatFiscalMoney, origemImpostoNotaFiscalLabel, situacaoLinhasImpostoNoTotal } from '@/features/fiscal/components/fiscalUiUtils';

const SITUACAO_IMPOSTO_TAG: Record<SituacaoLinhaImpostoNoTotal, { label: string; severity: 'success' | 'warning' | 'info' | 'danger' }> = {
    compoe: { label: 'Compõe o total', severity: 'success' },
    suprimida: { label: 'Suprimida pelo lançamento manual', severity: 'warning' },
    fora_do_total: { label: 'Não compõe o total', severity: 'info' },
    nao_conferida: { label: 'Não conferida', severity: 'danger' }
};

// AC-3, AC-4, AC-5, AC-19: origem, situação no total e observação lidas por linha, sem GUID cru (AC-17)
export const ImpostosNotaFiscalTabela = ({ nota }: { nota: NotaFiscalResponse }) => {
    const impostos = nota.impostos ?? [];
    const { porId, nomesNaoConferidos } = situacaoLinhasImpostoNoTotal(impostos, nota);
    const possuiSuprimida = impostos.some((linha) => porId[linha.id] === 'suprimida');

    return (
        <>
            <Message
                severity="info"
                className="w-full mb-3"
                text="O motor de tributação calcula os impostos na validação da nota. Um lançamento manual de IPI, ICMS ST ou FCP ST substitui, no total da nota, o valor calculado pelo motor para o mesmo item."
            />
            {possuiSuprimida ? (
                <Message severity="warn" className="w-full mb-3" text="Existe lançamento manual substituindo, no total desta nota, o valor calculado pelo motor de tributação." />
            ) : null}
            {nomesNaoConferidos.length > 0 ? (
                <Message
                    severity="warn"
                    className="w-full mb-3"
                    text={`Não foi possível conferir a composição de ${nomesNaoConferidos.join(', ')} nesta nota. Vale o total retornado pelo servidor.`}
                />
            ) : null}
            <DataTable value={impostos} emptyMessage="Nenhum imposto informado." size="small" paginator rows={10}>
                <Column field="nome" header="Imposto" />
                <Column field="cstCsosn" header="CST/CSOSN" />
                <Column header="Base" body={(row: ImpostoNotaFiscalResponse) => formatFiscalMoney(row.baseCalculo)} />
                <Column field="aliquota" header="Alíquota" />
                <Column header="Valor" body={(row: ImpostoNotaFiscalResponse) => formatFiscalMoney(row.valor)} />
                <Column header="Origem" body={(row: ImpostoNotaFiscalResponse) => origemImpostoNotaFiscalLabel(row.origem)} />
                <Column
                    header="No total"
                    body={(row: ImpostoNotaFiscalResponse) => {
                        const situacao = porId[row.id] ?? 'fora_do_total';
                        const info = SITUACAO_IMPOSTO_TAG[situacao];
                        return <Tag value={info.label} severity={info.severity} />;
                    }}
                />
                <Column header="Observação" body={(row: ImpostoNotaFiscalResponse) => (row.observacao ?? '').trim() || '-'} />
            </DataTable>
        </>
    );
};

// AC-6: composição vem inteira da resposta do backend; o total nunca é somado no cliente
export const ComposicaoTotalNotaFiscalCard = ({ nota }: { nota: NotaFiscalResponse }) => {
    const linhas = composicaoTotalNotaFiscal(nota);
    return (
        <Card title="Composição do total" className="mb-3">
            <div className="flex flex-column gap-2">
                {linhas.map((linha) => (
                    <div key={linha.codigo} className={`flex justify-content-between${linha.codigo === 'total' ? ' border-top-1 surface-border pt-2 mt-1' : ''}`}>
                        <span className={linha.codigo === 'total' ? 'font-bold' : undefined}>{linha.label}</span>
                        <strong className={linha.codigo === 'total' ? 'font-bold' : undefined}>
                            {linha.negativo && linha.valor > 0 ? `- ${formatFiscalMoney(linha.valor)}` : formatFiscalMoney(linha.valor)}
                        </strong>
                    </div>
                ))}
            </div>
        </Card>
    );
};
