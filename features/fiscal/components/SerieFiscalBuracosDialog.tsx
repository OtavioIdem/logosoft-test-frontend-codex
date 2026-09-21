'use client';

// Diálogo de buracos da série fiscal (v1.11.0a8b58, F3.1, AC-13, D4). Consulta só sob demanda -- a rotina
// varre o intervalo inteiro a cada chamada (`ConsultarBuracosSerieFiscalUseCase.cs:39-54`), então nunca sai
// ao abrir a tela/diálogo, só no clique de "Consultar buracos" (armadilha 5).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useSerieFiscalBuracos } from '@/features/fiscal/hooks/useSeriesFiscais';
import { compactarFaixas, TETO_FAIXAS_BURACOS } from '@/features/fiscal/components/seriesFiscaisUtils';
import { SERIE_FISCAL_BURACOS_DIALOG, buracosSerieFiscalTitulo } from '@/features/fiscal/components/seriesFiscaisLabels';
import { SerieFiscalResponse } from '@/features/fiscal/types/seriesFiscais.types';
import { mapApiError } from '@/lib/http/apiError';

const ROWS_POR_PAGINA = 20;

export const SerieFiscalBuracosDialog = ({ visible, serie, onHide }: { visible: boolean; serie: SerieFiscalResponse | null; onHide: () => void }) => {
    const { hasPermission } = usePermissions();
    const [first, setFirst] = useState(0);
    const buracosQuery = useSerieFiscalBuracos(serie?.id);

    useEffect(() => {
        if (visible) setFirst(0);
    }, [visible, serie?.id]);

    if (!serie) return null;

    const resultado = buracosQuery.data;
    const nenhumAlocado = resultado ? resultado.ultimoNumeroAlocado < resultado.numeroInicial : false;
    const faixasCompactadas = resultado ? compactarFaixas(resultado.numerosSemDocumentoAutorizado) : [];
    const totalFaixas = faixasCompactadas.length;
    const totalNumeros = resultado?.numerosSemDocumentoAutorizado.length ?? 0;
    const faixasExibidas = faixasCompactadas.slice(0, TETO_FAIXAS_BURACOS);
    const pagina = faixasExibidas.slice(first, first + ROWS_POR_PAGINA).map((faixa) => ({ faixa }));

    return (
        <Dialog header={buracosSerieFiscalTitulo(serie.numero)} visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} onHide={onHide} footer={<Button type="button" label="Fechar" icon="pi pi-times" text onClick={onHide} />}>
            <Message severity="warn" className="w-full mb-3" text={SERIE_FISCAL_BURACOS_DIALOG.notasEmAndamentoAviso} />

            {!resultado ? (
                <Button label={SERIE_FISCAL_BURACOS_DIALOG.consultarLabel} icon="pi pi-search" loading={buracosQuery.isFetching} onClick={() => buracosQuery.refetch()} />
            ) : null}

            {buracosQuery.error ? <ApiErrorPanel error={mapApiError(buracosQuery.error)} /> : null}

            {resultado ? (
                <>
                    {nenhumAlocado ? (
                        <Message severity="info" className="w-full mb-3" text={SERIE_FISCAL_BURACOS_DIALOG.nenhumNumeroAlocado} />
                    ) : (
                        <div className="grid mb-3">
                            <div className="col-6">
                                <span className="block text-color-secondary mb-1">{SERIE_FISCAL_BURACOS_DIALOG.ultimoNumeroAlocadoLabel}</span>
                                <strong>{resultado.ultimoNumeroAlocado}</strong>
                            </div>
                            <div className="col-6">
                                <span className="block text-color-secondary mb-1">{SERIE_FISCAL_BURACOS_DIALOG.totalNumerosLabel}</span>
                                <strong>{totalNumeros}</strong>
                            </div>
                        </div>
                    )}

                    {!nenhumAlocado && totalFaixas === 0 ? <Message severity="success" className="w-full mb-3" text={SERIE_FISCAL_BURACOS_DIALOG.semBuracos} /> : null}

                    {totalFaixas > 0 ? (
                        <DataTableServer value={pagina} totalRecords={faixasExibidas.length} first={first} rows={ROWS_POR_PAGINA} onPage={(event) => setFirst(event.first)} emptyMessage={SERIE_FISCAL_BURACOS_DIALOG.semBuracos}>
                            <Column field="faixa" header={SERIE_FISCAL_BURACOS_DIALOG.faixasLabel} />
                        </DataTableServer>
                    ) : null}

                    {totalFaixas > TETO_FAIXAS_BURACOS ? <Message severity="warn" className="w-full mt-3" text={SERIE_FISCAL_BURACOS_DIALOG.tetoAviso(totalFaixas, totalNumeros)} /> : null}

                    {hasPermission('FISCAL_INUTILIZAR') ? (
                        <div className="mt-3">
                            <Link href="/fiscal/inutilizacoes">{SERIE_FISCAL_BURACOS_DIALOG.linkInutilizacoes}</Link>
                        </div>
                    ) : null}
                </>
            ) : null}
        </Dialog>
    );
};
