'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { SelectOption } from '@/types/erp';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { criarInventarioSchema, concluirInventarioSchema, itemInventarioSchema } from '@/features/estoque-avancado/schemas/estoqueAvancadoSchemas';
import { CriarInventarioFormValues, ItemInventarioFormValues } from '@/features/estoque-avancado/types/estoqueAvancado.types';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

const initialInventario = (): CriarInventarioFormValues => ({ empresaId: '', filialId: '', localEstoqueId: '', descricao: '', dataReferencia: new Date() });

export const CriarInventarioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CriarInventarioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CriarInventarioFormValues>(initialInventario);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialInventario()); setErrors({}); } }, [visible]);

    const locaisQuery = useLocaisEstoque({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);

    const update = (name: keyof CriarInventarioFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = criarInventarioSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header="Novo inventário operacional" visible={visible} modal style={{ width: 'min(48rem, 98vw)' }} footer={footer('Criar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value ?? '')} />
                <div className="field col-12 md:col-6"><label htmlFor="invLocal" className="font-medium">Local de estoque *</label><EntitySelect id="invLocal" entityName="local" value={values.localEstoqueId || null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value ?? '')} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="invData" className="font-medium">Data de referência *</label><DateInput id="invData" value={values.dataReferencia ?? null} onChange={(value) => update('dataReferencia', value)} /><FieldError message={errors.dataReferencia} /></div>
                <div className="field col-12"><label htmlFor="invDesc" className="font-medium">Descrição *</label><InputText id="invDesc" value={values.descricao} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const ItemInventarioDialog = ({ visible, loading, produtoOptions, onHide, onSubmit }: { visible: boolean; loading?: boolean; produtoOptions: SelectOption<string>[]; onHide: () => void; onSubmit: (values: ItemInventarioFormValues) => Promise<void> }) => {
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidadeSistema, setQuantidadeSistema] = useState<number | null>(0);
    const [quantidadeContada, setQuantidadeContada] = useState<number | null>(0);
    const [observacao, setObservacao] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setProdutoId(null); setQuantidadeSistema(0); setQuantidadeContada(0); setObservacao(''); setErrors({}); } }, [visible]);
    const confirmar = async () => {
        const parsed = itemInventarioSchema.safeParse({ produtoId, quantidadeSistema, quantidadeContada, observacao });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit({ produtoId: produtoId as string, quantidadeSistema: quantidadeSistema ?? 0, quantidadeContada: quantidadeContada ?? 0, observacao });
    };
    const divergencia = (quantidadeContada ?? 0) - (quantidadeSistema ?? 0);
    return (
        <Dialog header="Adicionar item ao inventário" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6"><label htmlFor="invItemProduto" className="font-medium">Produto *</label><EntitySelect id="invItemProduto" entityName="produto" value={produtoId} options={produtoOptions} onChange={(value) => { setProdutoId(value); setErrors((c) => ({ ...c, produtoId: '' })); }} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-6 md:col-3"><label htmlFor="invItemSistema" className="font-medium">Qtd sistema *</label><QuantityInput id="invItemSistema" value={quantidadeSistema} onChange={setQuantidadeSistema} /></div>
                <div className="field col-6 md:col-3"><label htmlFor="invItemContada" className="font-medium">Qtd contada *</label><QuantityInput id="invItemContada" value={quantidadeContada} onChange={setQuantidadeContada} /></div>
                <div className="field col-12"><small className={divergencia === 0 ? 'text-green-600' : 'text-orange-600'}>Divergência: {divergencia}</small></div>
                <div className="field col-12"><label htmlFor="invItemObs" className="font-medium">Observação</label><InputText id="invItemObs" value={observacao} onChange={(event) => setObservacao(event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const ConcluirInventarioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (motivoAjuste: string) => Promise<void> }) => {
    const [motivoAjuste, setMotivoAjuste] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setMotivoAjuste(''); setErro(''); } }, [visible]);
    const confirmar = async () => {
        const parsed = concluirInventarioSchema.safeParse({ motivoAjuste });
        if (!parsed.success) { setErro('Informe o motivo do ajuste.'); return; }
        await onSubmit(motivoAjuste);
    };
    return (
        <Dialog header="Concluir inventário" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Concluir', loading, onHide, confirmar)} onHide={onHide}>
            <div className="field">
                <label htmlFor="invConcluir" className="font-medium">Motivo do ajuste *</label>
                <InputTextarea id="invConcluir" className="w-full" value={motivoAjuste} rows={3} autoResize onChange={(event) => { setMotivoAjuste(event.target.value); setErro(''); }} />
                <FieldError message={erro} />
                <small className="block text-color-secondary mt-1">Ao concluir, as divergências geram ajustes de saldo com este motivo.</small>
            </div>
        </Dialog>
    );
};
