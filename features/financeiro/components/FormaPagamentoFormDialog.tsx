'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FormGrid } from '@/components/forms/FormGrid';
import { FormaPagamentoFormValues, FormaPagamentoResponse } from '@/features/financeiro/types/financeiro.types';

type FormaPagamentoFormDialogProps = {
    visible: boolean;
    record?: FormaPagamentoResponse | null;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: FormaPagamentoFormValues) => void;
};

const initialValues: FormaPagamentoFormValues = {
    empresaId: '',
    filialId: null,
    codigo: '',
    nome: '',
    permiteRecebimento: true,
    permitePagamento: true
};

export const FormaPagamentoFormDialog = ({ visible, record, loading, onHide, onSubmit }: FormaPagamentoFormDialogProps) => {
    const [values, setValues] = useState<FormaPagamentoFormValues>(initialValues);
    const editing = Boolean(record?.id);

    useEffect(() => {
        if (!visible) return;
        setValues(
            record
                ? {
                      id: record.id,
                      empresaId: record.empresaId,
                      filialId: record.filialId ?? null,
                      codigo: record.codigo,
                      nome: record.nome,
                      permiteRecebimento: record.permiteRecebimento,
                      permitePagamento: record.permitePagamento
                  }
                : initialValues
        );
    }, [record, visible]);

    const update = <K extends keyof FormaPagamentoFormValues>(key: K, value: FormaPagamentoFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Salvar" icon="pi pi-check" onClick={() => onSubmit(values)} loading={loading} />
        </div>
    );

    return (
        <Dialog header={editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'} visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} onHide={onHide} footer={footer}>
            <FormGrid>
                {!editing ? <EmpresaFilialFields empresaId={values.empresaId} filialId={values.filialId ?? null} onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value)} disabled={loading} /> : null}
                <div className="field col-12 md:col-4">
                    <label htmlFor="codigoForma" className="font-medium">Código</label>
                    <InputText id="codigoForma" value={values.codigo} onChange={(event) => update('codigo', event.target.value)} disabled={loading || editing} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="nomeForma" className="font-medium">Nome</label>
                    <InputText id="nomeForma" value={values.nome} onChange={(event) => update('nome', event.target.value)} disabled={loading} />
                </div>
                <div className="field-checkbox col-12 md:col-6">
                    <Checkbox inputId="permiteRecebimento" checked={values.permiteRecebimento} onChange={(event) => update('permiteRecebimento', Boolean(event.checked))} disabled={loading} />
                    <label htmlFor="permiteRecebimento">Permite recebimento</label>
                </div>
                <div className="field-checkbox col-12 md:col-6">
                    <Checkbox inputId="permitePagamento" checked={values.permitePagamento} onChange={(event) => update('permitePagamento', Boolean(event.checked))} disabled={loading} />
                    <label htmlFor="permitePagamento">Permite pagamento</label>
                </div>
            </FormGrid>
        </Dialog>
    );
};
