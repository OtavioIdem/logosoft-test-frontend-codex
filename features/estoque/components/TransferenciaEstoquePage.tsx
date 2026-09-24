'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
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
import { useMutationWithToast } from '@/hooks/useMutationWithToast';

type FieldErrors = Record<string, string | undefined>;

const initialValues: TransferenciaEstoqueFormValues = {
    empresaId: '',
    filialOrigemId: '',
    localEstoqueOrigemId: '',
    filialDestinoId: '',
    localEstoqueDestinoId: '',
    produtoId: '',
    quantidade: 0,
    documento: null,
    motivo: ''
};

export const TransferenciaEstoquePage = () => {
    const runWithToast = useMutationWithToast();
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
        await runWithToast(
            async () => {
                await transferenciaMutation.mutateAsync(parsed.data);
                setValues(initialValues);
                setErrors({});
            },
            { success: { summary: 'Transferência registrada', detail: 'Saída na origem e entrada no destino serão rastreadas pelo backend.' }, error: { summary: 'Erro na transferência', detail: 'Não foi possível transferir estoque.' } }
        );
    };

    return (
        <>
            <PageHeader title="Transferências de estoque" description="Movimenta saldo entre filiais/locais gerando saída na origem e entrada no destino. O backend registra os movimentos transacionais; o frontend não altera saldo." />
            <Card title="Nova transferência">
                <FormGrid>
                    <div className="field col-12 md:col-4"><label htmlFor="empresaTransferencia" className="font-medium">Empresa *</label><EmpresaSelect id="empresaTransferencia" value={textValue(values.empresaId) || null} onChange={(value) => update('empresaId', value ?? '')} /><FieldError message={errors.empresaId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="filialOrigemId" className="font-medium">Filial origem *</label><FilialSelect id="filialOrigemId" empresaId={textValue(values.empresaId) || null} value={textValue(values.filialOrigemId) || null} disabled={!values.empresaId} onChange={(value) => update('filialOrigemId', value ?? '')} /><FieldError message={errors.filialOrigemId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="filialDestinoId" className="font-medium">Filial destino *</label><FilialSelect id="filialDestinoId" empresaId={textValue(values.empresaId) || null} value={textValue(values.filialDestinoId) || null} disabled={!values.empresaId} onChange={(value) => update('filialDestinoId', value ?? '')} /><FieldError message={errors.filialDestinoId} /></div>
                    <div className="field col-12 md:col-6"><label htmlFor="localEstoqueOrigemId" className="font-medium">Local origem *</label><EntitySelect id="localEstoqueOrigemId" entityName="local de origem" value={textValue(values.localEstoqueOrigemId) || null} options={localOptions(locaisQuery.data ?? [])} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueOrigemId', value ?? '')} /><FieldError message={errors.localEstoqueOrigemId} /></div>
                    <div className="field col-12 md:col-6"><label htmlFor="localEstoqueDestinoId" className="font-medium">Local destino *</label><EntitySelect id="localEstoqueDestinoId" entityName="local de destino" value={textValue(values.localEstoqueDestinoId) || null} options={localOptions(locaisQuery.data ?? [])} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueDestinoId', value ?? '')} /><FieldError message={errors.localEstoqueDestinoId} /></div>
                    <div className="field col-12 md:col-8"><label htmlFor="produtoId" className="font-medium">Produto *</label><EntitySelect id="produtoId" entityName="produto" value={textValue(values.produtoId) || null} options={produtoOptions(produtosQuery.data ?? [])} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} /><FieldError message={errors.produtoId} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="quantidadeTransferencia" className="font-medium">Quantidade *</label><QuantityInput id="quantidadeTransferencia" value={Number(values.quantidade ?? 0)} onChange={(value) => update('quantidade', value ?? 0)} /><FieldError message={errors.quantidade} /></div>
                    <div className="field col-12 md:col-4"><label htmlFor="documentoTransferencia" className="font-medium">Documento</label><InputText id="documentoTransferencia" value={textValue(values.documento)} onChange={(event) => update('documento', event.target.value)} /><FieldError message={errors.documento} /></div>
                    <div className="field col-12"><label htmlFor="motivoTransferencia" className="font-medium">Motivo *</label><InputTextarea id="motivoTransferencia" value={textValue(values.motivo)} rows={3} autoResize onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
                    <div className="col-12 flex justify-content-end"><Button label="Registrar transferência" icon="pi pi-send" loading={transferenciaMutation.isPending} onClick={submit} /></div>
                </FormGrid>
            </Card>
        </>
    );
};
