'use client';

// Campo Série da nota fiscal (v1.11.0a8b58, F3.5, AC-15). Com as duas permissões (FISCAL_SERIES_CONSULTAR e
// FISCAL_MODELOS_CONSULTAR), combo alimentado pelo cadastro real de séries; sem elas, o campo de texto livre
// de hoje continua (P-2a) -- a nota só passa a validar a série de ponta a ponta na `b61` (D53), então o modo
// texto não pode sumir nesta fatia.

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useModelosDocumentoFiscal } from '@/features/fiscal/hooks/useModelosDocumentoFiscal';
import { useSeriesFiscaisOpcoes } from '@/features/fiscal/hooks/useSeriesFiscais';
import { NOTA_FISCAL_SERIE_FIELD } from '@/features/fiscal/components/seriesFiscaisLabels';
import { TipoDocumentoFiscal } from '@/types/erp';

// D12: a série da chave de acesso é NF-e (55) ou NFC-e (65); os demais `TipoDocumentoFiscal` desta feature
// não têm modelo/série cadastrável nesta fatia, então o campo cai para o modo texto.
const MODELO_CODIGO_POR_TIPO_DOCUMENTO: Partial<Record<TipoDocumentoFiscal, string>> = {
    [TipoDocumentoFiscal.NFe]: '55',
    [TipoDocumentoFiscal.NFCe]: '65'
};

export type NotaFiscalSerieFieldProps = {
    value: string;
    onChange: (value: string) => void;
    empresaId?: string | null;
    filialId?: string | null;
    tipoDocumento: TipoDocumentoFiscal;
    disabled?: boolean;
    /** fluxo "gerar de pedido" sem pedido escolhido ainda -- o combo fica desabilitado (AC-15). */
    aguardandoPedido?: boolean;
};

export const notaFiscalSerieComboHabilitada = (hasAllPermissions: (permissions: ('FISCAL_SERIES_CONSULTAR' | 'FISCAL_MODELOS_CONSULTAR')[]) => boolean) => hasAllPermissions(['FISCAL_SERIES_CONSULTAR', 'FISCAL_MODELOS_CONSULTAR']);

export const NotaFiscalSerieField = ({ value, onChange, empresaId, filialId, tipoDocumento, disabled, aguardandoPedido }: NotaFiscalSerieFieldProps) => {
    const { hasAllPermissions } = usePermissions();
    const comboHabilitado = hasAllPermissions(['FISCAL_SERIES_CONSULTAR', 'FISCAL_MODELOS_CONSULTAR']);
    const modeloCodigo = MODELO_CODIGO_POR_TIPO_DOCUMENTO[tipoDocumento];

    const modelosQuery = useModelosDocumentoFiscal({ codigo: modeloCodigo, ativo: true, tamanhoPagina: 1 }, comboHabilitado && Boolean(modeloCodigo));
    const modeloDocumentoFiscalId = modelosQuery.data?.items?.[0]?.id ?? null;

    const seriesQuery = useSeriesFiscaisOpcoes({
        empresaId,
        filialId,
        modeloDocumentoFiscalId,
        habilitado: comboHabilitado && !aguardandoPedido && Boolean(empresaId) && Boolean(modeloDocumentoFiscalId)
    });

    // AC-15: sem filial na nota, só entram opções de série sem filial (a listagem sem `filialId` traz todas
    // as filiais da empresa -- o corte é feito aqui, no cliente).
    const opcoes = useMemo(() => {
        const itens = seriesQuery.data?.items ?? [];
        const filtradas = filialId ? itens : itens.filter((item) => !item.filialId);
        return filtradas.map((item) => ({ label: `Série ${item.numero} — próximo ${item.proximoNumero}`, value: String(item.numero) }));
    }, [seriesQuery.data, filialId]);

    // AC-15: trocar empresa, filial ou tipo de documento limpa a escolha -- nada fica pré-selecionado por
    // engano num contexto diferente.
    const escopoKey = `${empresaId ?? ''}|${filialId ?? ''}|${tipoDocumento}`;
    const escopoKeyRef = useRef(escopoKey);
    useEffect(() => {
        if (!comboHabilitado) return;
        if (escopoKeyRef.current === escopoKey) return;
        escopoKeyRef.current = escopoKey;
        onChange('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [escopoKey, comboHabilitado]);

    if (!comboHabilitado) {
        return (
            <>
                <InputText value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
                <small className="text-color-secondary block mt-1 line-height-3">{NOTA_FISCAL_SERIE_FIELD.semPermissaoHint}</small>
            </>
        );
    }

    if (aguardandoPedido) {
        return <Dropdown value={null} options={[]} disabled placeholder={NOTA_FISCAL_SERIE_FIELD.selecionePedido} className="w-full" />;
    }

    const listaVazia = !seriesQuery.isFetching && Boolean(empresaId) && Boolean(modeloDocumentoFiscalId) && opcoes.length === 0;

    return (
        <>
            <Dropdown
                value={value || null}
                options={opcoes}
                onChange={(event) => onChange(event.value ?? '')}
                placeholder={NOTA_FISCAL_SERIE_FIELD.placeholder}
                filter
                showClear
                disabled={disabled || !empresaId || seriesQuery.isFetching}
                emptyMessage={NOTA_FISCAL_SERIE_FIELD.vazioAviso}
                className="w-full"
            />
            {listaVazia ? (
                <div className="mt-2 flex flex-column gap-2">
                    <Message severity="warn" className="w-full" text={NOTA_FISCAL_SERIE_FIELD.vazioAviso} />
                    <Link href="/fiscal/series">{NOTA_FISCAL_SERIE_FIELD.linkCadastrarSerie}</Link>
                    <InputText value={value} placeholder="Informe manualmente" onChange={(event) => onChange(event.target.value)} />
                </div>
            ) : null}
        </>
    );
};
