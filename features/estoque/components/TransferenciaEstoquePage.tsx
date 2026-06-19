'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { transferenciaEstoqueSchema } from '@/features/estoque/schemas/estoqueSchemas';
import { fieldErrorMap, localOptions, produtoOptions, textValue } from '@/features/estoque/components/estoqueUiUtils';
import { useLocaisEstoque, useMovimentoEstoqueMutations } from '@/features/estoque/hooks/useEstoqueResources';
import { TransferenciaEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';

type FieldErrors = Record<string, string | undefined>;

const initialValues: TransferenciaEstoqueFormValues = {
    empresaId: '',
    filialOrigemId: '',
    localOrigemId: '',
    filialDestinoId: '',
    localDestinoId: '',
    produtoId: '',
    quantidade: 0,
    motivo: ''
};

export const TransferenciaEstoquePage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [values, setValues] = useState<TransferenciaEstoqueFormValues>(initialValues);
    const [errors, setErrors] = useState<FieldErrors>({});
    const produtosQuery = useProdutos({ empresaId: values.empresaId ?? null });
    const locaisQuery = useLocaisEstoque({ empresaId: values.empresaId ?? null });
    const { transferenciaMutation } = useMovimentoEstoqueMutations();

    if (!hasPermission('ESTOQUE_MOVIMENTAR')) return <UnauthorizedState description="Transferências exigem ESTOQUE_MOVIMENTAR." />;

    const update = (name: keyof TransferenciaEstoqueFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = transferenciaEstoqueSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        try {
            await transferenciaMutation.mutateAsync(parsed.data);
            toast.success('Transferência registrada', 'Saída na origem e entrada no destino serão rastreadas pelo backend.');
            setValues(initialValues);
            setErrors({});
        } catch (error) {
            toast.error('Erro na transferência', error instanceof Error ? error.message : 'Não foi possível transferir estoque.');
        }
    };

    return (
        <>
            <PageHeader title="Transferências de estoque" description="Movimenta saldo entre filiais/locais gerando saída na origem e entrada no destino." />
            <Message className="w-full mb-3" severity="info" text="A transferência não altera saldo diretamente no frontend. O backend deve registrar os movimentos transacionais de saída e entrada." />
            <Card title="Nova transferência">
                <FormGrid>
                    <div className="field col-12 md:col-4"><label htmlFor="empresaTransferencia" className="font-medium">Empresa *</label><EmpresaSelect id="empresaTransferencia" value={textValue(values.empresaId) || null} onChange={(value) => update('empresaId', value ?? '')} /><FieldError message={errors.empresaId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="filialOrigemId" className="font-medium">Filial origem *</label><FilialSelect id="filialOrigemId" empresaId={textValue(values.empresaId) || null} value={textValue(values.filialOrigemId) || null} disabled={!values.empresaId} onChange={(value) => update('filialOrigemId', value ?? '')} /><FieldError message={errors.filialOrigemId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="filialDestinoId" className="font-medium">Filial destino *</label><FilialSelect id="filialDestinoId" empresaId={textValue(values.empresaId) || null} value={textValue(values.filialDestinoId) || null} disabled={!values.empresaId} onChange={(value) => update('filialDestinoId', value ?? '')} /><FieldError message={errors.filialDestinoId} /></div>
                    <div className="field col-12 md:col-6"><label htmlFor="localOrigemId" className="font-medium">Local origem *</label><EntitySelect id="localOrigemId" entityName="local de origem" value={textValue(values.localOrigemId) || null} options={localOptions(locaisQuery.data ?? [])} loading={locaisQuery.isFetching} onChange={(value) => update('localOrigemId', value ?? '')} /><FieldError message={errors.localOrigemId} /></div>
                    <div className="field col-12 md:col-6"><label htmlFor="localDestinoId" className="font-medium">Local destino *</label><EntitySelect id="localDestinoId" entityName="local de destino" value={textValue(values.localDestinoId) || null} options={localOptions(locaisQuery.data ?? [])} loading={locaisQuery.isFetching} onChange={(value) => update('localDestinoId', value ?? '')} /><FieldError message={errors.localDestinoId} /></div>
                    <div className="field col-12 md:col-8"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtosQuery.data ?? [])} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="quantidadeTransferencia" className="font-medium">Quantidade *</label><QuantityInput id="quantidadeTransferencia" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                    <div className="field col-12"><label htmlFor="motivoTransferencia" className="font-medium">Motivo *</label><InputTextarea id="motivoTransferencia" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
                    <div className="col-12 flex justify-content-end"><Button label="Registrar transferência" icon="pi pi-send" loading={transferenciaMutation.isPending} onClick={submit} /></div>
                </FormGrid>
            </Card>
        </>
    );
};
