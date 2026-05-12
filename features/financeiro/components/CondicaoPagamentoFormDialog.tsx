'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FormGrid } from '@/components/forms/FormGrid';
import { CondicaoPagamentoFormValues, CondicaoPagamentoResponse } from '@/features/financeiro/types/financeiro.types';

type CondicaoPagamentoFormDialogProps = {
    visible: boolean;
    record?: CondicaoPagamentoResponse | null;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: CondicaoPagamentoFormValues) => void;
};

const initialValues: CondicaoPagamentoFormValues = {
    empresaId: '',
    filialId: null,
    codigo: '',
    nome: '',
    quantidadeParcelas: 1,
    intervaloDias: 30,
    permiteEntrada: false
};

export const CondicaoPagamentoFormDialog = ({ visible, record, loading, onHide, onSubmit }: CondicaoPagamentoFormDialogProps) => {
    const [values, setValues] = useState<CondicaoPagamentoFormValues>(initialValues);
    const editing = Boolean(record?.id);

    useEffect(() => {
        if (!visible) return;
        setValues(record ? { id: record.id, empresaId: record.empresaId, filialId: record.filialId ?? null, codigo: record.codigo, nome: record.nome, quantidadeParcelas: record.quantidadeParcelas, intervaloDias: record.intervaloDias, permiteEntrada: record.permiteEntrada } : initialValues);
    }, [record, visible]);

    const update = <K extends keyof CondicaoPagamentoFormValues>(key: K, value: CondicaoPagamentoFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Salvar" icon="pi pi-check" onClick={() => onSubmit(values)} loading={loading} />
        </div>
    );

    return (
        <Dialog header={editing ? 'Editar condição de pagamento' : 'Nova condição de pagamento'} visible={visible} modal style={{ width: '42rem' }} onHide={onHide} footer={footer}>
            <FormGrid>
                {!editing ? <EmpresaFilialFields empresaId={values.empresaId} filialId={values.filialId ?? null} onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value)} disabled={loading} /> : null}
                <div className="field col-12 md:col-4"><label htmlFor="codigoCondicao" className="font-medium">Código</label><InputText id="codigoCondicao" value={values.codigo} onChange={(event) => update('codigo', event.target.value)} disabled={loading || editing} /></div>
                <div className="field col-12 md:col-8"><label htmlFor="nomeCondicao" className="font-medium">Nome</label><InputText id="nomeCondicao" value={values.nome} onChange={(event) => update('nome', event.target.value)} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="quantidadeParcelas" className="font-medium">Parcelas</label><InputNumber id="quantidadeParcelas" value={values.quantidadeParcelas} onValueChange={(event) => update('quantidadeParcelas', event.value ?? 1)} min={1} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="intervaloDias" className="font-medium">Intervalo em dias</label><InputNumber id="intervaloDias" value={values.intervaloDias} onValueChange={(event) => update('intervaloDias', event.value ?? 0)} min={0} disabled={loading} /></div>
                <div className="field-checkbox col-12 md:col-4 align-self-end"><Checkbox inputId="permiteEntrada" checked={values.permiteEntrada} onChange={(event) => update('permiteEntrada', Boolean(event.checked))} disabled={loading} /><label htmlFor="permiteEntrada">Permite entrada</label></div>
            </FormGrid>
        </Dialog>
    );
};
