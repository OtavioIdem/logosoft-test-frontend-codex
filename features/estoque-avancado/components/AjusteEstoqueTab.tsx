'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { ajusteEstoqueSchema } from '@/features/estoque-avancado/schemas/estoqueAvancadoSchemas';
import { AjusteEstoqueFormValues, TipoAjusteEstoque } from '@/features/estoque-avancado/types/estoqueAvancado.types';
import { useAjusteEstoqueMutation } from '@/features/estoque-avancado/hooks/useEstoqueAvancadoResources';
import { tipoAjusteOptions } from '@/features/estoque-avancado/components/estoqueAvancadoLabels';

const initialValues = (): AjusteEstoqueFormValues => ({ empresaId: '', filialId: '', localEstoqueId: '', produtoId: '', tipo: TipoAjusteEstoque.Entrada, quantidade: 1, motivo: '' });

export const AjusteEstoqueTab = () => {
    const runWithToast = useMutationWithToast();
    const [values, setValues] = useState<AjusteEstoqueFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const ajusteMutation = useAjusteEstoqueMutation();

    const locaisQuery = useLocaisEstoque({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const produtosQuery = useProdutos({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);

    const update = (name: keyof AjusteEstoqueFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };

    const submit = async () => {
        const parsed = ajusteEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            const map: Record<string, string> = {};
            for (const issue of parsed.error.issues) { const key = issue.path[0]; if (typeof key === 'string' && !map[key]) map[key] = issue.message; }
            setErrors(map);
            return;
        }
        await runWithToast(
            async () => { await ajusteMutation.mutateAsync(values); setValues((c) => ({ ...initialValues(), empresaId: c.empresaId, filialId: c.filialId, localEstoqueId: c.localEstoqueId })); },
            { success: { summary: 'Ajuste registrado', detail: 'Movimento de ajuste enviado ao backend.' }, error: { summary: 'Erro no ajuste', detail: 'Não foi possível registrar o ajuste.' }, rethrow: true }
        );
    };

    return (
        <Card>
            <Message className="w-full mb-3" severity="info" text="Ajuste pontual de saldo (entrada/saída) com motivo auditável." />
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-4" filialCol="col-12 md:col-4" onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value ?? '')} />
                <div className="field col-12 md:col-4"><label htmlFor="ajLocal" className="font-medium">Local *</label><EntitySelect id="ajLocal" entityName="local" value={values.localEstoqueId || null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value ?? '')} /><FieldError message={errors.localEstoqueId} /></div>
                <div className="field col-12 md:col-5"><label htmlFor="ajProduto" className="font-medium">Produto *</label><EntitySelect id="ajProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-6 md:col-3"><label htmlFor="ajTipo" className="font-medium">Tipo *</label><Dropdown inputId="ajTipo" value={values.tipo} options={tipoAjusteOptions} onChange={(event) => update('tipo', event.value)} /></div>
                <div className="field col-6 md:col-4"><label htmlFor="ajQtd" className="font-medium">Quantidade *</label><QuantityInput id="ajQtd" value={values.quantidade} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-12"><label htmlFor="ajMotivo" className="font-medium">Motivo *</label><InputText id="ajMotivo" value={values.motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
                <div className="col-12 flex justify-content-end"><PermissionGuard permission="ESTOQUE_AJUSTAR" mode="disable">{({ disabled }) => <Button label="Registrar ajuste" icon="pi pi-check" loading={ajusteMutation.isPending} disabled={disabled} onClick={submit} />}</PermissionGuard></div>
            </FormGrid>
        </Card>
    );
};
