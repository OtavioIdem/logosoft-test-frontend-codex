'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
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
import { isValidGuid } from '@/lib/http/requestUtils';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { bloqueioEstoqueSchema } from '@/features/estoque-avancado/schemas/estoqueAvancadoSchemas';
import { BloqueioEstoqueFormValues } from '@/features/estoque-avancado/types/estoqueAvancado.types';
import { useBloqueioEstoqueMutations } from '@/features/estoque-avancado/hooks/useEstoqueAvancadoResources';

const initialValues = (): BloqueioEstoqueFormValues => ({ empresaId: '', filialId: '', localEstoqueId: '', produtoId: '', quantidade: 1, motivo: '' });

export const BloqueiosEstoqueTab = () => {
    const runWithToast = useMutationWithToast();
    const [values, setValues] = useState<BloqueioEstoqueFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [bloqueioId, setBloqueioId] = useState('');
    const [motivoAcao, setMotivoAcao] = useState('');
    const { criarMutation, liberarMutation, cancelarMutation } = useBloqueioEstoqueMutations();

    const locaisQuery = useLocaisEstoque({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const produtosQuery = useProdutos({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);

    const update = (name: keyof BloqueioEstoqueFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };

    const criar = async () => {
        const parsed = bloqueioEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            const map: Record<string, string> = {};
            for (const issue of parsed.error.issues) { const key = issue.path[0]; if (typeof key === 'string' && !map[key]) map[key] = issue.message; }
            setErrors(map);
            return;
        }
        await runWithToast(
            async () => { await criarMutation.mutateAsync(values); setValues((c) => ({ ...initialValues(), empresaId: c.empresaId, filialId: c.filialId, localEstoqueId: c.localEstoqueId })); },
            { success: { summary: 'Bloqueio registrado', detail: 'Saldo bloqueado com motivo auditável.' }, error: { summary: 'Erro no bloqueio', detail: 'Não foi possível bloquear.' }, rethrow: true }
        );
    };

    const acao = async (tipo: 'liberar' | 'cancelar') => {
        if (!isValidGuid(bloqueioId.trim())) { setErrors((c) => ({ ...c, bloqueioId: 'Informe um ID de bloqueio válido.' })); return; }
        if (!motivoAcao.trim()) { setErrors((c) => ({ ...c, motivoAcao: 'Informe o motivo.' })); return; }
        const mutation = tipo === 'liberar' ? liberarMutation : cancelarMutation;
        await runWithToast(
            async () => { await mutation.mutateAsync({ id: bloqueioId.trim(), motivo: motivoAcao }); setBloqueioId(''); setMotivoAcao(''); },
            { success: { summary: tipo === 'liberar' ? 'Bloqueio liberado' : 'Bloqueio cancelado' }, error: { summary: 'Erro na ação do bloqueio' }, rethrow: true }
        );
    };

    return (
        <div className="grid">
            <div className="col-12 lg:col-6">
                <Card title="Registrar bloqueio">
                    <FormGrid>
                        <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value ?? '')} />
                        <div className="field col-12"><label htmlFor="blLocal" className="font-medium">Local *</label><EntitySelect id="blLocal" entityName="local" value={values.localEstoqueId || null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value ?? '')} /><FieldError message={errors.localEstoqueId} /></div>
                        <div className="field col-12"><label htmlFor="blProduto" className="font-medium">Produto *</label><EntitySelect id="blProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                        <div className="field col-6"><label htmlFor="blQtd" className="font-medium">Quantidade *</label><QuantityInput id="blQtd" value={values.quantidade} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                        <div className="field col-12"><label htmlFor="blMotivo" className="font-medium">Motivo *</label><InputText id="blMotivo" value={values.motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
                        <div className="col-12 flex justify-content-end"><PermissionGuard permission="ESTOQUE_BLOQUEIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Bloquear" icon="pi pi-lock" loading={criarMutation.isPending} disabled={disabled} onClick={criar} />}</PermissionGuard></div>
                    </FormGrid>
                </Card>
            </div>
            <div className="col-12 lg:col-6">
                <Card title="Liberar / cancelar bloqueio">
                    <Message className="w-full mb-3" severity="info" text="Ponto de liberação dos bloqueios criados por Qualidade (reprovação) e Alimentar (recall). Informe o ID do bloqueio e o motivo." />
                    <FormGrid>
                        <div className="field col-12"><label htmlFor="blId" className="font-medium">ID do bloqueio *</label><InputText id="blId" value={bloqueioId} className={classNames({ 'p-invalid': errors.bloqueioId })} onChange={(event) => { setBloqueioId(event.target.value); setErrors((c) => ({ ...c, bloqueioId: '' })); }} /><FieldError message={errors.bloqueioId} /></div>
                        <div className="field col-12"><label htmlFor="blMotivoAcao" className="font-medium">Motivo *</label><InputText id="blMotivoAcao" value={motivoAcao} className={classNames({ 'p-invalid': errors.motivoAcao })} onChange={(event) => { setMotivoAcao(event.target.value); setErrors((c) => ({ ...c, motivoAcao: '' })); }} /><FieldError message={errors.motivoAcao} /></div>
                        <div className="col-12 flex justify-content-end gap-2">
                            <PermissionGuard permission="ESTOQUE_BLOQUEIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar bloqueio" icon="pi pi-ban" severity="danger" outlined loading={cancelarMutation.isPending} disabled={disabled} onClick={() => acao('cancelar')} />}</PermissionGuard>
                            <PermissionGuard permission="ESTOQUE_BLOQUEIO_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Liberar bloqueio" icon="pi pi-unlock" severity="success" loading={liberarMutation.isPending} disabled={disabled} onClick={() => acao('liberar')} />}</PermissionGuard>
                        </div>
                    </FormGrid>
                </Card>
            </div>
        </div>
    );
};
