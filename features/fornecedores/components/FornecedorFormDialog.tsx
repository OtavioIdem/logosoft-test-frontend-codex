'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { atualizarFornecedorSchema, criarFornecedorSchema } from '@/features/fornecedores/schemas/fornecedoresSchemas';
import { FornecedorFormValues, FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { fieldErrorMap, FieldErrors, textValue } from '@/features/pessoas/components/formUtils';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { buildPrivacySafeEntityLabel } from '@/lib/formatters/privacy';
import { SelectOption } from '@/types/erp';

const CATALOGO_SEM_PERMISSAO_LABEL = 'Configurado — sem permissão para ver o nome';

// Guarda por campo (D66) — mesmo mecanismo de `ClienteFormDialog`: sem a permissão do catálogo, o
// Guid gravado não pode virar nome; a opção sintética usa rótulo neutro, nunca o Guid cru, e
// preserva o valor para continuar indo no PUT (campo fica `disabled`).
const comValorGravadoNeutro = (options: SelectOption<string>[], valorAtual: string | null, permitido: boolean): SelectOption<string>[] => {
    if (!valorAtual || permitido || options.some((option) => option.value === valorAtual)) return options;
    return [{ label: CATALOGO_SEM_PERMISSAO_LABEL, value: valorAtual }, ...options];
};

const buildInitialValues = (record?: FornecedorResponse | null): FornecedorFormValues =>
    record
        ? {
              id: record.id,
              observacao: record.observacao,
              // Bloco de configuração de compra sempre hidratado do registro gravado — omitir
              // qualquer um destes três campos no Salvar apaga o vínculo/zera o valor no backend (D62).
              condicaoPagamentoPadraoId: record.condicaoPagamentoPadraoId,
              prazoEntregaMedio: record.prazoEntregaMedio,
              categoriaFornecimento: record.categoriaFornecimento
          }
        : {
              empresaId: '',
              filialId: null,
              pessoaId: '',
              codigo: '',
              observacao: null,
              condicaoPagamentoPadraoId: null,
              prazoEntregaMedio: null,
              categoriaFornecimento: null
          };

export const FornecedorFormDialog = ({ visible, loading, record, pessoas, onHide, onSubmit }: { visible: boolean; loading?: boolean; record?: FornecedorResponse | null; pessoas: PessoaResponse[]; onHide: () => void; onSubmit: (values: FornecedorFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<FornecedorFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const { hasPermission } = usePermissions();

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const pessoaOptions = useMemo<SelectOption<string>[]>(() => pessoas.map((pessoa) => ({ label: buildPrivacySafeEntityLabel(pessoa.nomeRazaoSocial, pessoa.documento), value: pessoa.id })), [pessoas]);

    const catalogoEmpresaId = record?.empresaId ?? (textValue(values.empresaId) || null);
    const condicaoPagamentoPermitido = hasPermission('FINANCEIRO_CONSULTAR');
    const condicoesPagamentoQuery = useCondicoesPagamentoOptions(catalogoEmpresaId, visible && condicaoPagamentoPermitido && Boolean(catalogoEmpresaId));
    const condicaoPagamentoOptionsComGravado = useMemo(() => comValorGravadoNeutro(condicoesPagamentoQuery.options, textValue(values.condicaoPagamentoPadraoId) || null, condicaoPagamentoPermitido), [condicoesPagamentoQuery.options, values.condicaoPagamentoPadraoId, condicaoPagamentoPermitido]);

    const update = (name: keyof FornecedorFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarFornecedorSchema : criarFornecedorSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        // O schema de cadastro não cobre os campos da aba Compra (PUT à parte, orquestrado pela
        // página) — o merge preserva `values` bruto antes de sobrepor com o resultado limpo do
        // cadastro, mesmo padrão de `ProdutoFormDialog.submit`.
        await onSubmit({ ...values, ...(parsed.data as FornecedorFormValues), id: record?.id });
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar fornecedor' : 'Novo fornecedor'} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} footer={footer} onHide={onHide}>
            <TabView>
                <TabPanel header="Dados gerais">
                    <FormGrid>
                        {!record ? (
                            <>
                                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                                <div className="field col-12 md:col-8">
                                    <label htmlFor="pessoaId" className="font-medium">Pessoa *</label>
                                    <EntitySelect id="pessoaId" value={textValue(values.pessoaId) || null} options={pessoaOptions} entityName="pessoa" onChange={(value) => update('pessoaId', value ?? '')} />
                                    <small className="text-color-secondary">A pessoa deve estar ativa para ser vinculada como fornecedor.</small>
                                    <FieldError message={errors.pessoaId} />
                                </div>
                                <div className="field col-12 md:col-4">
                                    <label htmlFor="codigo" className="font-medium">Código *</label>
                                    <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                                    <FieldError message={errors.codigo} />
                                </div>
                            </>
                        ) : null}
                        <div className="field col-12">
                            <label htmlFor="observacao" className="font-medium">Observação</label>
                            <InputTextarea id="observacao" value={textValue(values.observacao)} rows={4} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                            <FieldError message={errors.observacao} />
                        </div>
                    </FormGrid>
                </TabPanel>
                <TabPanel header="Compra">
                    {!condicaoPagamentoPermitido ? (
                        <Message severity="warn" className="w-full mb-3" text="Consulta de catálogo indisponível: seu usuário não possui FINANCEIRO_CONSULTAR. O valor já gravado continua sendo enviado ao salvar." />
                    ) : null}
                    <FormGrid>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="condicaoPagamentoPadraoId" className="font-medium">Condição de pagamento padrão</label>
                            <EntitySelect id="condicaoPagamentoPadraoId" entityName="condição de pagamento" value={textValue(values.condicaoPagamentoPadraoId) || null} options={condicaoPagamentoOptionsComGravado} disabled={!condicaoPagamentoPermitido} loading={condicoesPagamentoQuery.isFetching} onChange={(value) => update('condicaoPagamentoPadraoId', value)} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="prazoEntregaMedio" className="font-medium">Prazo médio de entrega (dias)</label>
                            <InputNumber id="prazoEntregaMedio" value={typeof values.prazoEntregaMedio === 'number' ? values.prazoEntregaMedio : null} min={0} showButtons={false} onValueChange={(event) => update('prazoEntregaMedio', event.value ?? null)} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="categoriaFornecimento" className="font-medium">Categoria de fornecimento</label>
                            <InputText id="categoriaFornecimento" value={textValue(values.categoriaFornecimento)} maxLength={80} className={className('categoriaFornecimento')} onChange={(event) => update('categoriaFornecimento', event.target.value)} />
                            <FieldError message={errors.categoriaFornecimento} />
                        </div>
                    </FormGrid>
                </TabPanel>
            </TabView>
        </Dialog>
    );
};
