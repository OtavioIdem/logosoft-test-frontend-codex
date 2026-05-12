'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { abrirInventarioSchema, adicionarItemInventarioSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { FieldErrors, fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { InventarioFormValues, InventarioItemFormValues, LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';

export const InventarioFormDialog = ({ visible, locais, loading, onHide, onSubmit }: { visible: boolean; locais: LocalEstoqueResponse[]; loading?: boolean; onHide: () => void; onSubmit: (values: InventarioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<InventarioFormValues>({ empresaId: '', filialId: null, codigo: '', localEstoqueId: '', descricao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues({ empresaId: '', filialId: null, codigo: '', localEstoqueId: '', descricao: null });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof InventarioFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = abrirInventarioSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as InventarioFormValues);
    };

    return (
        <Dialog header="Abrir inventário" visible={visible} modal style={{ width: 'min(58rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Abrir" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4"><label htmlFor="codigo" className="font-medium">Código *</label><InputText id="codigo" value={textValue(values.codigo)} onChange={(event) => update('codigo', event.target.value)} /><FieldError message={errors.codigo} /></div>
                <div className="field col-12 md:col-8"><label htmlFor="localEstoqueId" className="font-medium">Local de estoque *</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locais)} onChange={(value) => update('localEstoqueId', value)} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12"><label htmlFor="descricao" className="font-medium">Descrição</label><InputTextarea id="descricao" value={textValue(values.descricao)} rows={3} autoResize onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const InventarioItemDialog = ({ visible, produtos, loading, onHide, onSubmit }: { visible: boolean; produtos: ProdutoResponse[]; loading?: boolean; onHide: () => void; onSubmit: (values: InventarioItemFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<InventarioItemFormValues>({ produtoId: '', quantidadeContada: 0, observacao: null });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues({ produtoId: '', quantidadeContada: 0, observacao: null });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof InventarioItemFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = adicionarItemInventarioSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as InventarioItemFormValues);
    };

    return (
        <Dialog header="Adicionar item ao inventário" visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Adicionar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <div className="field col-12 md:col-8"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtos)} onChange={(value) => update('produtoId', value)} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="quantidadeContada" className="font-medium">Quantidade contada *</label><QuantityInput id="quantidadeContada" value={Number(values.quantidadeContada ?? 0)} onChange={(value) => update('quantidadeContada', value ?? 0)} /><FieldError message={errors.quantidadeContada} /></div>
                <div className="field col-12"><label htmlFor="observacao" className="font-medium">Observação</label><InputTextarea id="observacao" value={textValue(values.observacao)} rows={3} autoResize onChange={(event) => update('observacao', event.target.value)} /><FieldError message={errors.observacao} /></div>
            </FormGrid>
        </Dialog>
    );
};
