'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { FormGrid } from '@/components/forms/FormGrid';
import { ajusteEstoqueSchema, movimentoManualEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { FieldErrors, fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { MovimentoEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

type MovimentoKind = 'entrada' | 'saida' | 'ajuste';

const buildInitialValues = (kind: MovimentoKind, empresaId: string | null, filialId: string | null): MovimentoEstoqueFormValues => ({ empresaId: empresaId ?? '', filialId, produtoId: '', localEstoqueId: '', quantidade: kind === 'ajuste' ? undefined : 0, quantidadeContada: kind === 'ajuste' ? 0 : undefined, origemModulo: 'ESTOQUE', origemId: null, documento: null, motivo: '' });

export const MovimentoEstoqueFormDialog = ({ visible, kind, loading, onHide, onSubmit, embedded = false }: { visible: boolean; kind: MovimentoKind; loading?: boolean; onHide: () => void; onSubmit: (values: MovimentoEstoqueFormValues) => Promise<void>; embedded?: boolean }) => {
    const context = useOrganizationalContext();
    const [values, setValues] = useState<MovimentoEstoqueFormValues>(() => buildInitialValues(kind, context.snapshot.empresaId, context.snapshot.filialId));
    const [errors, setErrors] = useState<FieldErrors>({});

    // Produto e Local são carregados pela empresa/filial selecionada no próprio modal — o backend só
    // retorna esses catálogos com empresaId na query. Sem isso o registro de entrada ficava impossível.
    const empresaId = textValue(values.empresaId) || null;
    const filialId = textValue(values.filialId) || null;
    const catalogosHabilitados = visible && Boolean(empresaId);
    const catalogoQuery = useMemo(() => ({ empresaId, filialId }), [empresaId, filialId]);
    const produtosQuery = useProdutos(catalogoQuery, catalogosHabilitados);
    const locaisQuery = useLocaisEstoque(catalogoQuery, catalogosHabilitados);
    const produtos = produtosQuery.data ?? [];
    const locais = locaisQuery.data ?? [];

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(kind, context.snapshot.empresaId, context.snapshot.filialId));
            setErrors({});
        }
    }, [context.snapshot.empresaId, context.snapshot.filialId, kind, visible]);

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
        if (embedded) {
            setValues(buildInitialValues(kind, context.snapshot.empresaId, context.snapshot.filialId));
            setErrors({});
        }
    };

    const title = kind === 'entrada' ? 'Registrar entrada' : kind === 'saida' ? 'Registrar saída' : 'Registrar ajuste';

    const fields = (
            <FormGrid>
                {!empresaId ? <div className="col-12"><Message severity="info" className="w-full" text="Selecione a empresa para carregar os produtos e locais de estoque disponíveis." /></div> : null}
                <EmpresaFilialFields empresaId={empresaId} filialId={filialId} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtos)} loading={produtosQuery.isFetching} disabled={!empresaId} onChange={(value) => update('produtoId', value)} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="localEstoqueId" className="font-medium">Local de estoque *</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locais)} loading={locaisQuery.isFetching} disabled={!empresaId} onChange={(value) => update('localEstoqueId', value)} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="quantidade" className="font-medium">{kind === 'ajuste' ? 'Quantidade contada *' : 'Quantidade *'}</label><QuantityInput id="quantidade" value={kind === 'ajuste' ? Number(values.quantidadeContada ?? 0) : Number(values.quantidade ?? 0)} onChange={(value) => update(kind === 'ajuste' ? 'quantidadeContada' : 'quantidade', value ?? 0)} /><FieldError message={kind === 'ajuste' ? errors.quantidadeContada : errors.quantidade} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="origemModulo" className="font-medium">Módulo de origem *</label><InputText id="origemModulo" value={textValue(values.origemModulo)} onChange={(event) => update('origemModulo', event.target.value)} /><small className="text-color-secondary">Identifica o módulo que gerou a movimentação; o local é selecionado no campo “Local de estoque”.</small><FieldError message={errors.origemModulo} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="documento" className="font-medium">Documento</label><InputText id="documento" value={textValue(values.documento)} onChange={(event) => update('documento', event.target.value)} /><FieldError message={errors.documento} /></div>
                <div className="field col-12"><label htmlFor="motivo" className="font-medium">Motivo *</label><InputTextarea id="motivo" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </FormGrid>
    );
    const confirm = <Button label="Confirmar" icon="pi pi-check" loading={loading} onClick={submit} />;

    if (embedded) {
        return <Card>{fields}<div className="flex justify-content-end mt-3">{confirm}</div></Card>;
    }

    return <Dialog header={title} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} />{confirm}</div>}>{fields}</Dialog>;
};
