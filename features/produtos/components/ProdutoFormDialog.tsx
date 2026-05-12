'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { FormGrid } from '@/components/forms/FormGrid';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { atualizarProdutoSchema, criarProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import { CategoriaProdutoResponse, MarcaResponse, ProdutoFormValues, ProdutoResponse, UnidadeMedidaResponse } from '@/features/produtos/types/produtos.types';
import { FieldErrors, fieldErrorMap, textValue, toOptions } from '@/features/produtos/components/produtoFormUtils';
import { TipoItemFiscal, TipoProduto } from '@/types/erp';

const tipoProdutoOptions = [
    { label: 'Mercadoria', value: TipoProduto.Mercadoria },
    { label: 'Serviço', value: TipoProduto.Servico },
    { label: 'Matéria-prima', value: TipoProduto.MateriaPrima },
    { label: 'Produto acabado', value: TipoProduto.ProdutoAcabado },
    { label: 'Uso e consumo', value: TipoProduto.UsoConsumo },
    { label: 'Ativo imobilizado', value: TipoProduto.AtivoImobilizado },
    { label: 'Outro', value: TipoProduto.Outro }
];

const tipoFiscalOptions = [
    { label: 'Mercadoria', value: TipoItemFiscal.Mercadoria },
    { label: 'Serviço', value: TipoItemFiscal.Servico },
    { label: 'Composição', value: TipoItemFiscal.Composicao },
    { label: 'Outro', value: TipoItemFiscal.Outro }
];

const buildInitialValues = (record?: ProdutoResponse | null): ProdutoFormValues =>
    record
        ? {
              id: record.id,
              descricao: record.descricao,
              descricaoComercial: record.descricaoComercial,
              tipoProduto: Number(record.tipoProduto),
              unidadeMedidaId: record.unidadeMedidaId,
              categoriaProdutoId: record.categoriaProdutoId,
              marcaId: record.marcaId,
              precoVendaBase: record.precoVendaBase,
              custoReferencial: record.custoReferencial,
              controlaEstoque: record.controlaEstoque,
              permiteVenda: record.permiteVenda,
              permiteCompra: record.permiteCompra,
              ncm: record.ncm,
              cest: record.cest,
              origemMercadoriaCodigo: record.origemMercadoriaCodigo,
              tipoItemFiscal: record.tipoItemFiscal === null || record.tipoItemFiscal === undefined ? null : Number(record.tipoItemFiscal),
              unidadeTributavelId: record.unidadeTributavelId,
              codigoFiscalExterno: record.codigoFiscalExterno,
              observacao: record.observacao
          }
        : {
              empresaId: '',
              filialId: null,
              codigo: '',
              descricao: '',
              descricaoComercial: null,
              tipoProduto: TipoProduto.Mercadoria,
              unidadeMedidaId: '',
              categoriaProdutoId: null,
              marcaId: null,
              precoVendaBase: 0,
              custoReferencial: 0,
              controlaEstoque: true,
              permiteVenda: true,
              permiteCompra: true,
              ncm: null,
              cest: null,
              origemMercadoriaCodigo: null,
              tipoItemFiscal: TipoItemFiscal.Mercadoria,
              unidadeTributavelId: null,
              codigoFiscalExterno: null,
              observacao: null
          };

export const ProdutoFormDialog = ({
    visible,
    loading,
    record,
    categorias,
    unidades,
    marcas,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    record?: ProdutoResponse | null;
    categorias: CategoriaProdutoResponse[];
    unidades: UnidadeMedidaResponse[];
    marcas: MarcaResponse[];
    onHide: () => void;
    onSubmit: (values: ProdutoFormValues) => Promise<void>;
}) => {
    const [values, setValues] = useState<ProdutoFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const unidadeOptions = useMemo(() => toOptions(unidades, (item) => `${item.sigla} - ${item.descricao}`), [unidades]);
    const categoriaOptions = useMemo(() => toOptions(categorias, (item) => `${item.codigo} - ${item.nome}`), [categorias]);
    const marcaOptions = useMemo(() => toOptions(marcas, (item) => item.nome), [marcas]);

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const update = (name: keyof ProdutoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarProdutoSchema : criarProdutoSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit({ ...values, ...(parsed.data as ProdutoFormValues), id: record?.id });
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );
    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar produto' : 'Novo produto'} visible={visible} modal style={{ width: 'min(72rem, 98vw)' }} footer={footer} onHide={onHide}>
            <TabView>
                <TabPanel header="Dados gerais">
                    <FormGrid>
                        {!record ? (
                            <>
                                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-4" filialCol="col-12 md:col-4" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                                <div className="field col-12 md:col-4">
                                    <label htmlFor="codigo" className="font-medium">Código *</label>
                                    <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                                    <FieldError message={errors.codigo} />
                                </div>
                            </>
                        ) : null}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="descricao" className="font-medium">Descrição *</label>
                            <InputText id="descricao" value={textValue(values.descricao)} className={className('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                            <FieldError message={errors.descricao} />
                        </div>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="descricaoComercial" className="font-medium">Descrição comercial</label>
                            <InputText id="descricaoComercial" value={textValue(values.descricaoComercial)} className={className('descricaoComercial')} onChange={(event) => update('descricaoComercial', event.target.value)} />
                            <FieldError message={errors.descricaoComercial} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="tipoProduto" className="font-medium">Tipo *</label>
                            <Dropdown id="tipoProduto" value={values.tipoProduto ?? TipoProduto.Mercadoria} options={tipoProdutoOptions} onChange={(event) => update('tipoProduto', event.value)} />
                            <FieldError message={errors.tipoProduto} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="unidadeMedidaId" className="font-medium">Unidade *</label>
                            <EntitySelect id="unidadeMedidaId" entityName="unidade" value={textValue(values.unidadeMedidaId) || null} options={unidadeOptions} onChange={(value) => update('unidadeMedidaId', value)} />
                            <FieldError message={errors.unidadeMedidaId} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="categoriaProdutoId" className="font-medium">Categoria</label>
                            <EntitySelect id="categoriaProdutoId" entityName="categoria" value={textValue(values.categoriaProdutoId) || null} options={categoriaOptions} onChange={(value) => update('categoriaProdutoId', value)} />
                            <FieldError message={errors.categoriaProdutoId} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="marcaId" className="font-medium">Marca</label>
                            <EntitySelect id="marcaId" entityName="marca" value={textValue(values.marcaId) || null} options={marcaOptions} onChange={(value) => update('marcaId', value)} />
                            <FieldError message={errors.marcaId} />
                        </div>
                    </FormGrid>
                </TabPanel>
                <TabPanel header="Comercial e estoque">
                    <FormGrid>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="precoVendaBase" className="font-medium">Preço de venda *</label>
                            <MoneyInput id="precoVendaBase" value={typeof values.precoVendaBase === 'number' ? values.precoVendaBase : null} onChange={(value) => update('precoVendaBase', value ?? 0)} />
                            <FieldError message={errors.precoVendaBase} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="custoReferencial" className="font-medium">Custo referencial *</label>
                            <MoneyInput id="custoReferencial" value={typeof values.custoReferencial === 'number' ? values.custoReferencial : null} onChange={(value) => update('custoReferencial', value ?? 0)} />
                            <FieldError message={errors.custoReferencial} />
                        </div>
                        <div className="field col-12 md:col-2 flex align-items-center gap-2 mt-4">
                            <Checkbox inputId="controlaEstoque" checked={Boolean(values.controlaEstoque)} onChange={(event) => update('controlaEstoque', Boolean(event.checked))} />
                            <label htmlFor="controlaEstoque" className="font-medium">Controla estoque</label>
                        </div>
                        <div className="field col-12 md:col-2 flex align-items-center gap-2 mt-4">
                            <Checkbox inputId="permiteVenda" checked={Boolean(values.permiteVenda)} onChange={(event) => update('permiteVenda', Boolean(event.checked))} />
                            <label htmlFor="permiteVenda" className="font-medium">Permite venda</label>
                        </div>
                        <div className="field col-12 md:col-2 flex align-items-center gap-2 mt-4">
                            <Checkbox inputId="permiteCompra" checked={Boolean(values.permiteCompra)} onChange={(event) => update('permiteCompra', Boolean(event.checked))} />
                            <label htmlFor="permiteCompra" className="font-medium">Permite compra</label>
                        </div>
                        <div className="field col-12">
                            <label htmlFor="observacao" className="font-medium">Observação</label>
                            <InputTextarea id="observacao" value={textValue(values.observacao)} rows={3} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                            <FieldError message={errors.observacao} />
                        </div>
                    </FormGrid>
                </TabPanel>
                <TabPanel header="Dados fiscais">
                    <PermissionGuard permission="PRODUTOS_DADOS_FISCAIS_GERENCIAR" fallback={<Message severity="warn" text="Você não possui permissão para alterar dados fiscais do produto." />}>
                        <Message severity="info" className="w-full mb-3" text="Campos fiscais são parametrizáveis. O backend e a validação fiscal oficial continuam sendo a fonte final." />
                        <FormGrid>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="ncm" className="font-medium">NCM</label>
                                <InputText id="ncm" value={textValue(values.ncm)} className={className('ncm')} onChange={(event) => update('ncm', event.target.value)} />
                                <FieldError message={errors.ncm} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="cest" className="font-medium">CEST</label>
                                <InputText id="cest" value={textValue(values.cest)} className={className('cest')} onChange={(event) => update('cest', event.target.value)} />
                                <FieldError message={errors.cest} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="origemMercadoriaCodigo" className="font-medium">Origem</label>
                                <InputText id="origemMercadoriaCodigo" value={textValue(values.origemMercadoriaCodigo)} className={className('origemMercadoriaCodigo')} onChange={(event) => update('origemMercadoriaCodigo', event.target.value)} />
                                <FieldError message={errors.origemMercadoriaCodigo} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="tipoItemFiscal" className="font-medium">Tipo fiscal</label>
                                <Dropdown id="tipoItemFiscal" value={values.tipoItemFiscal ?? null} options={tipoFiscalOptions} showClear onChange={(event) => update('tipoItemFiscal', event.value ?? null)} />
                                <FieldError message={errors.tipoItemFiscal} />
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="unidadeTributavelId" className="font-medium">Unidade tributável</label>
                                <EntitySelect id="unidadeTributavelId" entityName="unidade tributável" value={textValue(values.unidadeTributavelId) || null} options={unidadeOptions} onChange={(value) => update('unidadeTributavelId', value)} />
                                <FieldError message={errors.unidadeTributavelId} />
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="codigoFiscalExterno" className="font-medium">Código fiscal externo</label>
                                <InputText id="codigoFiscalExterno" value={textValue(values.codigoFiscalExterno)} className={className('codigoFiscalExterno')} onChange={(event) => update('codigoFiscalExterno', event.target.value)} />
                                <FieldError message={errors.codigoFiscalExterno} />
                            </div>
                        </FormGrid>
                    </PermissionGuard>
                </TabPanel>
                <TabPanel header="Códigos e fornecedores">
                    <Message severity="info" text="Após salvar o produto, use as ações da linha para adicionar código de barras ou vincular fornecedor." />
                    {record ? (
                        <div className="grid mt-3">
                            <div className="col-12 md:col-6">
                                <h4 className="mt-0">Códigos de barras</h4>
                                {(record.codigosBarras ?? []).length ? record.codigosBarras.map((codigo) => <div key={codigo.codigo} className="surface-100 border-round p-2 mb-2">{codigo.codigo} {codigo.principal ? '(principal)' : ''}</div>) : <p className="text-600">Nenhum código vinculado.</p>}
                            </div>
                            <div className="col-12 md:col-6">
                                <h4 className="mt-0">Fornecedores</h4>
                                {(record.fornecedores ?? []).length ? record.fornecedores.map((fornecedor) => <div key={fornecedor.fornecedorId} className="surface-100 border-round p-2 mb-2">{fornecedor.fornecedorId} {fornecedor.principal ? '(principal)' : ''}</div>) : <p className="text-600">Nenhum fornecedor vinculado.</p>}
                            </div>
                        </div>
                    ) : null}
                </TabPanel>
            </TabView>
        </Dialog>
    );
};
