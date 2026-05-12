'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { DateInput } from '@/components/forms/DateInput';
import { FormGrid } from '@/components/forms/FormGrid';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { atualizarPedidoVendaSchema, criarPedidoVendaSchema } from '@/features/vendas/schemas/vendasSchemas';
import { PedidoVendaResponse, SalvarPedidoVendaValues } from '@/features/vendas/types/vendas.types';
import { clienteOptions, dateFromIso, FieldErrors, fieldErrorMap, textValue, tipoPedidoVendaOptions } from '@/features/vendas/components/vendasUiUtils';
import { TipoPedidoVenda } from '@/types/erp';

const buildInitialValues = (record?: PedidoVendaResponse | null): SalvarPedidoVendaValues =>
    record
        ? {
              id: record.id,
              empresaId: record.empresaId,
              filialId: record.filialId ?? null,
              numero: record.numero,
              clienteId: record.clienteId,
              dataEmissao: record.dataEmissao,
              dataPrevisaoEntrega: record.dataPrevisaoEntrega ?? null,
              tipo: Number(record.tipo),
              observacao: record.observacao ?? null
          }
        : {
              empresaId: '',
              filialId: null,
              numero: '',
              clienteId: '',
              dataEmissao: new Date(),
              dataPrevisaoEntrega: null,
              tipo: TipoPedidoVenda.Pedido,
              observacao: null
          };

export const PedidoVendaFormDialog = ({ visible, record, loading, onHide, onSubmit }: { visible: boolean; record?: PedidoVendaResponse | null; loading?: boolean; onHide: () => void; onSubmit: (values: SalvarPedidoVendaValues) => Promise<void> }) => {
    const [values, setValues] = useState<SalvarPedidoVendaValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const queryBase = { empresaId: textValue(values.empresaId) || null, filialId: textValue(values.filialId) || null };
    const clientesQuery = useClientes(queryBase);
    const pessoasQuery = usePessoas(queryBase);
    const pessoaLabelMap = new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial]));

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const update = (name: keyof SalvarPedidoVendaValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarPedidoVendaSchema : criarPedidoVendaSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit({ ...values, ...(parsed.data as SalvarPedidoVendaValues), id: record?.id });
    };

    const footer = <div className="flex justify-content-end gap-2"><Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} /></div>;

    return (
        <Dialog header={record ? 'Editar pedido de venda' : 'Novo pedido de venda'} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                {!record ? (
                    <>
                        <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => { update('empresaId', value); update('clienteId', ''); }} onFilialChange={(value) => { update('filialId', value); update('clienteId', ''); }} />
                        <div className="field col-12 md:col-6"><label htmlFor="numero" className="font-medium">Número *</label><InputText id="numero" value={textValue(values.numero)} onChange={(event) => update('numero', event.target.value)} /><FieldError message={errors.numero} /></div>
                        <div className="field col-12 md:col-6"><label htmlFor="clienteId" className="font-medium">Cliente *</label><EntitySelect id="clienteId" entityName="cliente" value={textValue(values.clienteId) || null} options={clienteOptions(clientesQuery.data ?? [], pessoaLabelMap)} disabled={!values.empresaId || clientesQuery.isLoading} onChange={(value) => update('clienteId', value)} /><FieldError message={errors.clienteId} /></div>
                        <div className="field col-12 md:col-4"><label htmlFor="dataEmissao" className="font-medium">Emissão *</label><DateInput id="dataEmissao" value={dateFromIso(values.dataEmissao)} onChange={(value) => update('dataEmissao', value)} /><FieldError message={errors.dataEmissao} /></div>
                    </>
                ) : null}
                <div className="field col-12 md:col-4"><label htmlFor="dataPrevisaoEntrega" className="font-medium">Previsão de entrega</label><DateInput id="dataPrevisaoEntrega" value={dateFromIso(values.dataPrevisaoEntrega)} onChange={(value) => update('dataPrevisaoEntrega', value)} /><FieldError message={errors.dataPrevisaoEntrega} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="tipo" className="font-medium">Tipo *</label><Dropdown id="tipo" value={Number(values.tipo ?? TipoPedidoVenda.Pedido)} options={tipoPedidoVendaOptions} optionLabel="label" optionValue="value" onChange={(event) => update('tipo', event.value)} /><FieldError message={errors.tipo} /></div>
                <div className="field col-12"><label htmlFor="observacao" className="font-medium">Observação</label><InputTextarea id="observacao" value={textValue(values.observacao)} rows={3} autoResize onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
