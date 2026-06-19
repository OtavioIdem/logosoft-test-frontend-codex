'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { bloqueioEstoqueAcaoSchema, criarBloqueioEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { useBloqueioEstoqueMutations, useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { BloqueioEstoqueAcaoFormValues, BloqueioEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';

type FieldErrors = Record<string, string | undefined>;
type BloqueioAction = 'liberar' | 'cancelar';

const initialBloqueio: BloqueioEstoqueFormValues = { empresaId: '', filialId: null, localEstoqueId: '', produtoId: '', quantidade: 0, motivo: '' };
const initialAction: BloqueioEstoqueAcaoFormValues = { bloqueioId: '', motivo: '' };

export const BloqueiosEstoquePage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [values, setValues] = useState<BloqueioEstoqueFormValues>(initialBloqueio);
    const [actionValues, setActionValues] = useState<BloqueioEstoqueAcaoFormValues>(initialAction);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [actionErrors, setActionErrors] = useState<FieldErrors>({});
    const produtosQuery = useProdutos({ empresaId: values.empresaId ?? null, filialId: values.filialId ?? null });
    const locaisQuery = useLocaisEstoque({ empresaId: values.empresaId ?? null, filialId: values.filialId ?? null });
    const { criarBloqueioMutation, liberarBloqueioMutation, cancelarBloqueioMutation } = useBloqueioEstoqueMutations();

    if (!hasPermission('ESTOQUE_MOVIMENTAR')) return <UnauthorizedState description="Bloqueios exigem ESTOQUE_MOVIMENTAR." />;

    const update = (name: keyof BloqueioEstoqueFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };
    const updateAction = (name: keyof BloqueioEstoqueAcaoFormValues, value: unknown) => {
        setActionValues((current) => ({ ...current, [name]: value }));
        setActionErrors((current) => ({ ...current, [name]: undefined }));
    };

    const criar = async () => {
        const parsed = criarBloqueioEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        try {
            await criarBloqueioMutation.mutateAsync(parsed.data);
            toast.success('Bloqueio registrado', 'O bloqueio foi enviado ao backend para reduzir o saldo disponível.');
            setValues(initialBloqueio);
            setErrors({});
        } catch (error) {
            toast.error('Erro no bloqueio', error instanceof Error ? error.message : 'Não foi possível bloquear estoque.');
        }
    };

    const executarAcao = async (action: BloqueioAction) => {
        const parsed = bloqueioEstoqueAcaoSchema.safeParse(actionValues);
        if (!parsed.success) {
            setActionErrors(fieldErrorMap(parsed.error));
            return;
        }
        try {
            if (action === 'liberar') await liberarBloqueioMutation.mutateAsync({ id: parsed.data.bloqueioId, motivo: parsed.data.motivo });
            if (action === 'cancelar') await cancelarBloqueioMutation.mutateAsync({ id: parsed.data.bloqueioId, motivo: parsed.data.motivo });
            toast.success(action === 'liberar' ? 'Bloqueio liberado' : 'Bloqueio cancelado', 'Ação enviada ao backend com motivo auditável.');
            setActionValues(initialAction);
            setActionErrors({});
        } catch (error) {
            toast.error('Erro na ação', error instanceof Error ? error.message : 'Não foi possível atualizar o bloqueio.');
        }
    };

    return (
        <>
            <PageHeader title="Bloqueios de estoque" description="Bloqueia, libera ou cancela bloqueios operacionais sem alterar saldo diretamente no frontend." />
            <Message className="w-full mb-3" severity="warn" text="Sem endpoint de listagem confirmado no inventário, a liberação/cancelamento exige o ID do bloqueio gerado pelo backend ou informado por evidência operacional." />
            <div className="grid">
                <div className="col-12 lg:col-7">
                    <Card title="Novo bloqueio">
                        <FormGrid>
                            <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value ?? '')} onFilialChange={(value) => update('filialId', value ?? null)} />
                            <div className="field col-12 md:col-6"><label htmlFor="localEstoqueId" className="font-medium">Local *</label><EntitySelect id="localEstoqueId" entityName="local" value={textValue(values.localEstoqueId) || null} options={localOptions(locaisQuery.data ?? [])} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value ?? '')} /><FieldError message={errors.localEstoqueId} /></div>
                            <div className="field col-12 md:col-6"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtosQuery.data ?? [])} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                            <div className="field col-12 md:col-4"><label htmlFor="quantidadeBloqueio" className="font-medium">Quantidade *</label><QuantityInput id="quantidadeBloqueio" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                            <div className="field col-12 md:col-8"><label htmlFor="motivoBloqueio" className="font-medium">Motivo *</label><InputTextarea id="motivoBloqueio" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
                            <div className="col-12 flex justify-content-end"><Button label="Registrar bloqueio" icon="pi pi-lock" loading={criarBloqueioMutation.isPending} onClick={criar} /></div>
                        </FormGrid>
                    </Card>
                </div>
                <div className="col-12 lg:col-5">
                    <Card title="Liberar ou cancelar bloqueio">
                        <FormGrid>
                            <div className="field col-12"><label htmlFor="bloqueioOperacionalId" className="font-medium">ID do bloqueio *</label><InputText id="bloqueioOperacionalId" value={textValue(actionValues.bloqueioId)} onChange={(event) => updateAction('bloqueioId', event.target.value)} /><FieldError message={actionErrors.bloqueioId} /></div>
                            <div className="field col-12"><label htmlFor="motivoAcaoBloqueio" className="font-medium">Motivo *</label><InputTextarea id="motivoAcaoBloqueio" value={textValue(actionValues.motivo)} rows={3} autoResize onChange={(event) => updateAction('motivo', event.target.value)} /><FieldError message={actionErrors.motivo} /></div>
                            <div className="col-12 flex flex-column md:flex-row gap-2 justify-content-end"><Button label="Liberar" icon="pi pi-unlock" severity="success" loading={liberarBloqueioMutation.isPending} onClick={() => executarAcao('liberar')} /><Button label="Cancelar" icon="pi pi-ban" severity="danger" loading={cancelarBloqueioMutation.isPending} onClick={() => executarAcao('cancelar')} /></div>
                        </FormGrid>
                    </Card>
                </div>
            </div>
        </>
    );
};
