'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { DateInput } from '@/components/forms/DateInput';
import { FormGrid } from '@/components/forms/FormGrid';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { atualizarPedidoCompraSchema, criarPedidoCompraSchema } from '@/features/compras/schemas/comprasSchemas';
import { PedidoCompraResponse, SalvarPedidoCompraValues } from '@/features/compras/types/compras.types';
import { condicaoPagamentoOptions, dateFromIso, FieldErrors, fieldErrorMap, fornecedorOptions, textValue } from '@/features/compras/components/comprasUiUtils';

const buildInitialValues = (record?: PedidoCompraResponse | null): SalvarPedidoCompraValues =>
    record
        ? {
              id: record.id,
              empresaId: record.empresaId,
              filialId: record.filialId ?? null,
              numero: record.numero,
              fornecedorId: record.fornecedorId,
              dataEmissao: record.dataEmissao,
              dataPrevisaoEntrega: record.dataPrevisaoEntrega ?? null,
              condicaoPagamentoId: record.condicaoPagamentoId ?? null,
              observacao: record.observacao ?? null
          }
        : {
              empresaId: '',
              filialId: null,
              numero: '',
              fornecedorId: '',
              dataEmissao: new Date(),
              dataPrevisaoEntrega: null,
              condicaoPagamentoId: null,
              observacao: null
          };

export const PedidoCompraFormDialog = ({ visible, record, loading, onHide, onSubmit }: { visible: boolean; record?: PedidoCompraResponse | null; loading?: boolean; onHide: () => void; onSubmit: (values: SalvarPedidoCompraValues) => Promise<void> }) => {
    const [values, setValues] = useState<SalvarPedidoCompraValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const fornecedoresQuery = useFornecedores({ empresaId: textValue(values.empresaId) || null, filialId: textValue(values.filialId) || null });
    const pessoasQuery = usePessoas({ empresaId: textValue(values.empresaId) || null, filialId: textValue(values.filialId) || null });
    const condicoesQuery = useCondicoesPagamentoOptions(textValue(values.empresaId) || null);
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const update = (name: keyof SalvarPedidoCompraValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const updateEmpresa = (empresaId: string | null) => {
        setValues((current) => ({ ...current, empresaId: empresaId ?? '', filialId: null, fornecedorId: '', condicaoPagamentoId: null }));
        setErrors((current) => ({ ...current, empresaId: undefined, filialId: undefined, fornecedorId: undefined, condicaoPagamentoId: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarPedidoCompraSchema : criarPedidoCompraSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit({ ...values, ...(parsed.data as SalvarPedidoCompraValues), id: record?.id });
    };

    const footer = <div className="flex justify-content-end gap-2"><Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} /></div>;

    return (
        <Dialog header={record ? 'Editar pedido de compra' : 'Novo pedido de compra'} visible={visible} modal style={{ width: 'min(62rem, 96vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                {!record ? <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} onEmpresaChange={updateEmpresa} onFilialChange={(value) => update('filialId', value)} empresaError={errors.empresaId} filialError={errors.filialId} /> : null}
                {!record ? <div className="field col-12 md:col-6"><label htmlFor="numero" className="font-medium">Número *</label><InputText id="numero" value={values.numero ?? ''} onChange={(event) => update('numero', event.target.value)} /><FieldError message={errors.numero} /></div> : null}
                {!record ? <div className="field col-12 md:col-6"><label htmlFor="fornecedorId" className="font-medium">Fornecedor *</label><EntitySelect id="fornecedorId" entityName="fornecedor" value={textValue(values.fornecedorId) || null} options={fornecedorOptions(fornecedoresQuery.data ?? [], pessoaLabelMap)} disabled={fornecedoresQuery.isLoading || !textValue(values.empresaId)} onChange={(value) => update('fornecedorId', value)} /><FieldError message={errors.fornecedorId} /></div> : null}
                {!record ? <div className="field col-12 md:col-6"><label htmlFor="dataEmissao" className="font-medium">Data de emissão *</label><DateInput id="dataEmissao" value={dateFromIso(values.dataEmissao)} onChange={(value) => update('dataEmissao', value)} /><FieldError message={errors.dataEmissao} /></div> : null}
                <div className="field col-12 md:col-6"><label htmlFor="dataPrevisaoEntrega" className="font-medium">Previsão de entrega</label><DateInput id="dataPrevisaoEntrega" value={dateFromIso(values.dataPrevisaoEntrega)} onChange={(value) => update('dataPrevisaoEntrega', value)} /><FieldError message={errors.dataPrevisaoEntrega} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="condicaoPagamentoId" className="font-medium">Condição de pagamento</label><EntitySelect id="condicaoPagamentoId" entityName="condição" value={textValue(values.condicaoPagamentoId) || null} options={condicaoPagamentoOptions(condicoesQuery.data ?? [])} disabled={condicoesQuery.isLoading || !textValue(values.empresaId)} onChange={(value) => update('condicaoPagamentoId', value)} /><FieldError message={errors.condicaoPagamentoId} /></div>
                <div className="field col-12"><label htmlFor="observacao" className="font-medium">Observação</label><InputTextarea id="observacao" rows={3} autoResize value={textValue(values.observacao)} onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
