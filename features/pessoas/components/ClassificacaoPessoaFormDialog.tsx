'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FormGrid } from '@/components/forms/FormGrid';
import { ClassificacaoPessoaFormValues, ClassificacaoPessoaResponse } from '@/features/pessoas/types/pessoas.types';

type ClassificacaoPessoaFormDialogProps = {
    visible: boolean;
    record?: ClassificacaoPessoaResponse | null;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: ClassificacaoPessoaFormValues) => void;
};

const initialValues: ClassificacaoPessoaFormValues = {
    empresaId: '',
    codigo: '',
    nome: '',
    descricao: ''
};

export const ClassificacaoPessoaFormDialog = ({ visible, record, loading, onHide, onSubmit }: ClassificacaoPessoaFormDialogProps) => {
    const [values, setValues] = useState<ClassificacaoPessoaFormValues>(initialValues);
    const editing = Boolean(record?.id);

    useEffect(() => {
        if (!visible) return;
        // Na edição o formulário parte do registro gravado: o PUT substitui nome e descrição
        // inteiros (inventário §2) — descrição só vai `null` quando o operador apagou o campo.
        setValues(record ? { id: record.id, empresaId: record.empresaId, codigo: record.codigo, nome: record.nome, descricao: record.descricao ?? '' } : initialValues);
    }, [record, visible]);

    const update = <K extends keyof ClassificacaoPessoaFormValues>(key: K, value: ClassificacaoPessoaFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Salvar" icon="pi pi-check" onClick={() => onSubmit(values)} loading={loading} />
        </div>
    );

    return (
        <Dialog header={editing ? 'Editar classificação' : 'Nova classificação'} visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} onHide={onHide} footer={footer}>
            <FormGrid>
                {!editing ? <EmpresaFilialFields empresaId={values.empresaId} filialId={null} showFilial={false} empresaCol="col-12" onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={() => undefined} disabled={loading} /> : null}
                <div className="field col-12 md:col-4">
                    <label htmlFor="codigoClassificacao" className="font-medium">Código</label>
                    <InputText id="codigoClassificacao" value={values.codigo} maxLength={40} onChange={(event) => update('codigo', event.target.value)} disabled={loading || editing} />
                    <small className="text-color-secondary">Até 40 caracteres, sem espaço interno. O sistema salva em maiúsculas.</small>
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="nomeClassificacao" className="font-medium">Nome</label>
                    <InputText id="nomeClassificacao" value={values.nome} maxLength={120} onChange={(event) => update('nome', event.target.value)} disabled={loading} />
                </div>
                <div className="field col-12">
                    <label htmlFor="descricaoClassificacao" className="font-medium">Descrição</label>
                    <InputTextarea id="descricaoClassificacao" value={values.descricao ?? ''} maxLength={300} rows={4} autoResize onChange={(event) => update('descricao', event.target.value)} disabled={loading} />
                    <small className="text-color-secondary">Opcional.</small>
                </div>
            </FormGrid>
        </Dialog>
    );
};
