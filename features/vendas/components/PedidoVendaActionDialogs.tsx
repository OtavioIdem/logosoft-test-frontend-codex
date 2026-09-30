'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { aprovarPedidoVendaSchema, faturarPedidoVendaSchema } from '@/features/vendas/schemas/vendasSchemas';
import { usePedidoVenda } from '@/features/vendas/hooks/useVendasResources';
import { FieldErrors, fieldErrorMap, formatMoney, pedidoVendaItensCount, textValue } from '@/features/vendas/components/vendasUiUtils';
import { vendasLabels } from '@/features/vendas/components/vendasLabels';
import { AprovarPedidoVendaRequest, FaturarPedidoVendaRequest } from '@/features/vendas/types/vendas.types';
import { mapApiError } from '@/lib/http/apiError';

/**
 * Resumo do pedido antes de confirmar a aprovação (D79) e o faturamento (D96). Lê pelo
 * `pedidoVendaQueryKey` — a mesma chave que o detalhe já usa — então, quando o diálogo abre a
 * partir da tela de detalhe (hoje o único caminho), o dado já está em cache e não há chamada nova;
 * se um dia o diálogo for aberto direto da lista, é uma chamada só para o pedido aberto, nunca uma
 * por linha da lista.
 */
const PedidoVendaResumo = ({ pedidoId, visible, textoIndisponivel }: { pedidoId?: string | null; visible: boolean; textoIndisponivel: string }) => {
    const pedidoQuery = usePedidoVenda(visible ? pedidoId : null);
    const pedido = pedidoQuery.data ?? null;
    const clientesQuery = useClientes({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const pessoasQuery = usePessoas({ empresaId: pedido?.empresaId ?? null, filialId: pedido?.filialId ?? null });
    const clienteLabel = useMemo(() => {
        if (!pedido) return null;
        const cliente = (clientesQuery.data ?? []).find((item) => item.id === pedido.clienteId);
        if (!cliente) return null;
        const pessoa = (pessoasQuery.data ?? []).find((item) => item.id === cliente.pessoaId);
        return pessoa ? `${cliente.codigo} • ${pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial}` : cliente.codigo;
    }, [pedido, clientesQuery.data, pessoasQuery.data]);

    if (!visible) return null;
    if (pedidoQuery.isLoading) return <Message className="w-full mb-3" severity="info" text={vendasLabels.aprovacao.resumoCarregando} />;
    if (!pedido) return <Message className="w-full mb-3" severity="warn" text={textoIndisponivel} />;

    return (
        <div className="surface-100 border-round p-3 mb-3">
            <div className="grid">
                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Número</span><strong>{pedido.numero}</strong></div>
                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Cliente</span><strong>{clienteLabel ?? 'Cliente não carregado'}</strong></div>
                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Itens</span><strong>{pedidoVendaItensCount(pedido)}</strong></div>
                <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Valor total</span><strong>{formatMoney(pedido.valorTotal)}</strong></div>
            </div>
        </div>
    );
};

export const AprovarPedidoVendaDialog = ({ visible, pedidoId, loading, error, onHide, onSubmit }: { visible: boolean; pedidoId?: string | null; loading?: boolean; error?: unknown; onHide: () => void; onSubmit: (values: AprovarPedidoVendaRequest) => Promise<void> }) => {
    const [values, setValues] = useState<AprovarPedidoVendaRequest>({ reservarEstoque: true, observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ reservarEstoque: true, observacao: null }); setErrors({}); } }, [visible]);

    const submit = async () => {
        const parsed = aprovarPedidoVendaSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Aprovar pedido" visible={visible} modal style={{ width: 'min(36rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Aprovar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <PedidoVendaResumo pedidoId={pedidoId} visible={visible} textoIndisponivel={vendasLabels.aprovacao.resumoIndisponivel} />
            {error ? <ApiErrorPanel error={mapApiError(error)} /> : null}
            <FormGrid>
                <div className="field col-12">
                    <div className="flex align-items-center gap-2"><Checkbox inputId="reservarEstoque" checked={values.reservarEstoque} onChange={(event) => setValues((current) => ({ ...current, reservarEstoque: Boolean(event.checked) }))} /><label htmlFor="reservarEstoque">Reservar estoque na aprovação</label></div>
                    <small className="block text-color-secondary mt-1">{vendasLabels.aprovacao.reservarEstoqueAjuda}</small>
                </div>
                <div className="field col-12"><label htmlFor="observacaoAprovacao" className="font-medium">Observação</label><InputTextarea id="observacaoAprovacao" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};

// D96: resumo no padrão da D79, painel de erro com código/status/traceId e o efeito escrito (D95).
export const FaturarPedidoVendaDialog = ({ visible, pedidoId, loading, error, onHide, onSubmit }: { visible: boolean; pedidoId?: string | null; loading?: boolean; error?: unknown; onHide: () => void; onSubmit: (values: FaturarPedidoVendaRequest) => Promise<void> }) => {
    const [values, setValues] = useState<FaturarPedidoVendaRequest>({ baixarEstoque: true, documento: '', observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ baixarEstoque: true, documento: '', observacao: null }); setErrors({}); } }, [visible]);

    const submit = async () => {
        const parsed = faturarPedidoVendaSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Faturar pedido" visible={visible} modal style={{ width: 'min(38rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Faturar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <PedidoVendaResumo pedidoId={pedidoId} visible={visible} textoIndisponivel={vendasLabels.faturamento.resumoIndisponivel} />
            <Message className="w-full mb-3" severity="info" text={vendasLabels.faturamento.efeito} />
            {error ? <ApiErrorPanel error={mapApiError(error)} /> : null}
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="baixarEstoque" checked={values.baixarEstoque} onChange={(event) => setValues((current) => ({ ...current, baixarEstoque: Boolean(event.checked) }))} /><label htmlFor="baixarEstoque">Baixar estoque no faturamento</label></div>
                <div className="field col-12"><label htmlFor="documentoFaturamento" className="font-medium">{vendasLabels.faturamento.documentoRotulo}</label><InputText id="documentoFaturamento" value={values.documento} maxLength={80} onChange={(event) => setValues((current) => ({ ...current, documento: event.target.value }))} /><small className="block text-color-secondary mt-1">{vendasLabels.faturamento.documentoAjuda}</small><FieldError message={errors.documento} /></div>
                <div className="field col-12"><label htmlFor="observacaoFaturamento" className="font-medium">{vendasLabels.faturamento.observacaoRotulo}</label><InputTextarea id="observacaoFaturamento" rows={3} maxLength={300} autoResize value={textValue(values.observacao)} onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
