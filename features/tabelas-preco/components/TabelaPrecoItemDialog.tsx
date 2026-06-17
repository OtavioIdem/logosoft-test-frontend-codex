'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { PercentInput } from '@/components/forms/PercentInput';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { tabelaPrecoItemSchema } from '@/features/tabelas-preco/schemas/tabelasPrecoSchemas';
import { TabelaPrecoItemFormValues, TabelaPrecoItemResponse } from '@/features/tabelas-preco/types/tabelasPreco.types';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;
const initialValues = (item?: TabelaPrecoItemResponse | null): TabelaPrecoItemFormValues => ({ produtoId: item?.produtoId ?? '', precoVenda: item?.precoVenda ?? null, precoMinimo: item?.precoMinimo ?? null, margemPercentual: item?.margemPercentual ?? null });

export const TabelaPrecoItemDialog = ({ visible, loading, item, onHide, onSubmit }: { visible: boolean; loading?: boolean; item?: TabelaPrecoItemResponse | null; onHide: () => void; onSubmit: (values: TabelaPrecoItemFormValues) => Promise<void> }) => {
    const produtosQuery = useProdutos({});
    const [values, setValues] = useState<TabelaPrecoItemFormValues>(initialValues(item));
    const [errors, setErrors] = useState<FieldErrors>({});
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);

    useEffect(() => { if (visible) { setValues(initialValues(item)); setErrors({}); } }, [item, visible]);

    const update = (name: keyof TabelaPrecoItemFormValues, value: unknown) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = tabelaPrecoItemSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header={item ? 'Editar item da tabela' : 'Adicionar item à tabela'} visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label={item ? 'Salvar item' : 'Adicionar item'} icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12"><label htmlFor="produtoTabelaPreco" className="font-medium">Produto *</label><EntitySelect id="produtoTabelaPreco" entityName="produto" value={values.produtoId || null} options={produtoOptions} disabled={Boolean(item)} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="precoVenda" className="font-medium">Preço venda *</label><MoneyInput id="precoVenda" value={values.precoVenda} onChange={(value) => update('precoVenda', value)} /><FieldError message={errors.precoVenda} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="precoMinimo" className="font-medium">Preço mínimo *</label><MoneyInput id="precoMinimo" value={values.precoMinimo} onChange={(value) => update('precoMinimo', value)} /><FieldError message={errors.precoMinimo} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="margemPercentual" className="font-medium">Margem *</label><PercentInput id="margemPercentual" value={values.margemPercentual} onChange={(value) => update('margemPercentual', value)} /><FieldError message={errors.margemPercentual} /></div>
            </div>
        </Dialog>
    );
};
