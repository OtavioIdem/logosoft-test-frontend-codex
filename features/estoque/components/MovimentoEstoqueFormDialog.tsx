'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { FormGrid } from '@/components/forms/FormGrid';
import { ajusteEstoqueSchema, movimentoManualEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { FieldErrors, fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { LocalEstoqueResponse, MovimentoEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';

type MovimentoKind = 'entrada' | 'saida' | 'ajuste';

const buildInitialValues = (kind: MovimentoKind): MovimentoEstoqueFormValues => ({ empresaId: '', filialId: null, produtoId: '', localEstoqueId: '', quantidade: kind === 'ajuste' ? undefined : 0, quantidadeContada: kind === 'ajuste' ? 0 : undefined, origemModulo: 'ESTOQUE', origemId: null, documento: null, motivo: '' });

export const MovimentoEstoqueFormDialog = ({ visible, kind, produtos, locais, loading, onHide, onSubmit }: { visible: boolean; kind: MovimentoKind; produtos: ProdutoResponse[]; locais: LocalEstoqueResponse[]; loading?: boolean; onHide: () => void; onSubmit: (values: MovimentoEstoqueFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<MovimentoEstoqueFormValues>(() => buildInitialValues(kind));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(kind));
            setErrors({});
        }
    }, [kind, visible]);

    const update = (name: keyof MovimentoEstoqueFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = kind === 'ajuste' ? ajusteEstoqueSchema : movimentoManualEstoqueSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data as MovimentoEstoqueFormValues);
    };

    const title = kind === 'entrada' ? 'Registrar entrada' : kind === 'saida' ? 'Registrar saída' : 'Registrar ajuste';

    return (
        <Dialog header={title} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Confirmar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <FormGrid>
                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtos)} onChange={(value) => update('produtoId', value)} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="localEstoqueId" className="font-medium">Local de estoque *</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locais)} onChange={(value) => update('localEstoqueId', value)} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="quantidade" className="font-medium">{kind === 'ajuste' ? 'Quantidade contada *' : 'Quantidade *'}</label><QuantityInput id="quantidade" value={kind === 'ajuste' ? Number(values.quantidadeContada ?? 0) : Number(values.quantidade ?? 0)} onChange={(value) => update(kind === 'ajuste' ? 'quantidadeContada' : 'quantidade', value ?? 0)} /><FieldError message={kind === 'ajuste' ? errors.quantidadeContada : errors.quantidade} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="origemModulo" className="font-medium">Origem *</label><InputText id="origemModulo" value={textValue(values.origemModulo)} onChange={(event) => update('origemModulo', event.target.value)} /><FieldError message={errors.origemModulo} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="documento" className="font-medium">Documento</label><InputText id="documento" value={textValue(values.documento)} onChange={(event) => update('documento', event.target.value)} /><FieldError message={errors.documento} /></div>
                <div className="field col-12"><label htmlFor="motivo" className="font-medium">Motivo *</label><InputTextarea id="motivo" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </FormGrid>
        </Dialog>
    );
};
