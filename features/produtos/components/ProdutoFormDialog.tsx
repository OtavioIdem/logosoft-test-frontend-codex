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
import { SearchSelect } from '@/components/forms/SearchSelect';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { atualizarProdutoSchema, criarProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import { CatalogoListQuery, ProdutoFormValues, ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { useCategoriasProduto, useMarcas, useUnidadesMedida } from '@/features/produtos/hooks/useProdutosResources';
import { useUnidadesTributaveis } from '@/features/produtos/hooks/useUnidadeTributavelCatalogo';
import { FieldErrors, fieldErrorMap, textValue, toOptions } from '@/features/produtos/components/produtoFormUtils';
import { SelectOption, TipoItemFiscal, TipoItemSped, TipoProduto } from '@/types/erp';

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

// 12 rótulos oficiais do Registro 0200 da EFD (SPED Fiscal), tabela fechada do backend — não é catálogo (D59).
const tipoItemSpedOptions = [
    { label: '0 — Mercadoria para revenda', value: TipoItemSped.MercadoriaParaRevenda },
    { label: '1 — Matéria-prima', value: TipoItemSped.MateriaPrima },
    { label: '2 — Embalagem', value: TipoItemSped.Embalagem },
    { label: '3 — Produto em processo', value: TipoItemSped.ProdutoEmProcesso },
    { label: '4 — Produto acabado', value: TipoItemSped.ProdutoAcabado },
    { label: '5 — Subproduto', value: TipoItemSped.Subproduto },
    { label: '6 — Produto intermediário', value: TipoItemSped.ProdutoIntermediario },
    { label: '7 — Material de uso e consumo', value: TipoItemSped.MaterialDeUsoEConsumo },
    { label: '8 — Ativo imobilizado', value: TipoItemSped.AtivoImobilizado },
    { label: '9 — Serviços', value: TipoItemSped.Servicos },
    { label: '10 — Outros insumos', value: TipoItemSped.OutrosInsumos },
    { label: '99 — Outras', value: TipoItemSped.Outras }
];

const mensagemSemCadastrosFiscais = 'Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR.';

/**
 * A busca do catálogo traz só a página corrente. Sem este merge, uma sigla já gravada no produto
 * some do campo quando a busca atual não a contém — defeito já corrigido duas vezes no repositório
 * (`CadastroFiscalSelects.tsx`, `useEnderecoFiscalCatalogos.ts`); aqui não há Id/descrição para
 * resolver o rótulo (o `value` é a própria sigla, D60), então a opção sintética usa a sigla como label.
 */
export const comSiglaSelecionada = (options: SelectOption<string>[], siglaAtual?: string | null): SelectOption<string>[] => {
    if (!siglaAtual || options.some((option) => option.value === siglaAtual)) return options;
    return [{ label: siglaAtual, value: siglaAtual }, ...options];
};

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
              controlaQualidade: record.controlaQualidade,
              permiteVenda: record.permiteVenda,
              permiteCompra: record.permiteCompra,
              ncmCodigo: record.ncm,
              cestCodigo: record.cest,
              origemMercadoriaCodigo: record.origemMercadoriaCodigo,
              tipoItemFiscal: record.tipoItemFiscal === null || record.tipoItemFiscal === undefined ? null : Number(record.tipoItemFiscal),
              // `0` é `MercadoriaParaRevenda`, checagem tem de ser explícita (nunca `value || null`).
              tipoItemSped: record.tipoItemSped === null || record.tipoItemSped === undefined ? null : Number(record.tipoItemSped),
              unidadeTributavelSigla: record.unidadeTributavelSigla,
              unidadeMedidaTributavelId: record.unidadeMedidaTributavelId,
              exTipi: record.exTipi,
              codigoBeneficioFiscalPadrao: record.codigoBeneficioFiscalPadrao,
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
              controlaQualidade: false,
              permiteVenda: true,
              permiteCompra: true,
              ncmCodigo: null,
              cestCodigo: null,
              origemMercadoriaCodigo: null,
              // Sem classificação fiscal por padrão: ninguém escolheu "Mercadoria" — mandar isso como
              // se fosse decisão do operador é o DEFAULT_SILENCIOSO que faz o PATCH virar 400 quando
              // o bloco deveria ficar em branco.
              tipoItemFiscal: null,
              tipoItemSped: null,
              unidadeTributavelSigla: null,
              unidadeMedidaTributavelId: null,
              exTipi: null,
              codigoBeneficioFiscalPadrao: null,
              codigoFiscalExterno: null,
              observacao: null
          };

export const ProdutoFormDialog = ({
    visible,
    loading,
    record,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    record?: ProdutoResponse | null;
    onHide: () => void;
    onSubmit: (values: ProdutoFormValues) => Promise<void>;
}) => {
    const [values, setValues] = useState<ProdutoFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});

    // Catálogos (unidade/categoria/marca) são carregados pela empresa efetiva do próprio modal:
    // na edição usa a empresa do produto; na criação, a empresa escolhida no formulário. Assim o
    // "Novo produto" funciona mesmo sem empresa pré-selecionada no filtro da página.
    const catalogoQuery = useMemo<CatalogoListQuery>(
        () => ({
            empresaId: record?.empresaId ?? (textValue(values.empresaId) || null),
            filialId: record?.filialId ?? (textValue(values.filialId) || null)
        }),
        [record, values.empresaId, values.filialId]
    );
    const catalogosHabilitados = visible && Boolean(catalogoQuery.empresaId);
    const unidadesQuery = useUnidadesMedida(catalogoQuery, catalogosHabilitados);
    const categoriasQuery = useCategoriasProduto(catalogoQuery, catalogosHabilitados);
    const marcasQuery = useMarcas(catalogoQuery, catalogosHabilitados);

    const unidadeOptions = useMemo(() => toOptions(unidadesQuery.data ?? [], (item) => `${item.sigla} - ${item.descricao}`), [unidadesQuery.data]);
    const categoriaOptions = useMemo(() => toOptions(categoriasQuery.data ?? [], (item) => `${item.codigo} - ${item.nome}`), [categoriasQuery.data]);
    const marcaOptions = useMemo(() => toOptions(marcasQuery.data ?? [], (item) => item.nome), [marcasQuery.data]);
    const semEmpresaSelecionada = !record && !catalogoQuery.empresaId;

    // Catálogo oficial global (Mód.04) da sigla de unidade tributável — guarda escopada ao próprio
    // campo, não à aba inteira (D61): quem não tem FISCAL_CADASTROS_CONSULTAR continua editando os
    // outros nove campos fiscais normalmente.
    const unidadeTributavelCatalogo = useUnidadesTributaveis(visible);
    const unidadeTributavelOptions = useMemo(() => comSiglaSelecionada(unidadeTributavelCatalogo.options, textValue(values.unidadeTributavelSigla) || null), [unidadeTributavelCatalogo.options, values.unidadeTributavelSigla]);

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
                    {semEmpresaSelecionada ? <Message severity="info" className="w-full mb-3" text="Selecione a empresa para carregar as unidades, categorias e marcas disponíveis." /> : null}
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
                        <div className="field col-12 flex align-items-center gap-2">
                            <Checkbox inputId="controlaQualidade" checked={Boolean(values.controlaQualidade)} onChange={(event) => update('controlaQualidade', Boolean(event.checked))} />
                            <label htmlFor="controlaQualidade" className="font-medium">Controla qualidade</label>
                            <small className="text-color-secondary ml-2">Quando marcado, o recebimento de compra gera inspeção automática.</small>
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
                                <label htmlFor="ncmCodigo" className="font-medium">NCM</label>
                                <InputText id="ncmCodigo" value={textValue(values.ncmCodigo)} className={className('ncmCodigo')} onChange={(event) => update('ncmCodigo', event.target.value)} />
                                <FieldError message={errors.ncmCodigo} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="cestCodigo" className="font-medium">CEST</label>
                                <InputText id="cestCodigo" value={textValue(values.cestCodigo)} className={className('cestCodigo')} onChange={(event) => update('cestCodigo', event.target.value)} />
                                <FieldError message={errors.cestCodigo} />
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
                            <div className="field col-12 md:col-3">
                                <label htmlFor="tipoItemSped" className="font-medium">Tipo do item no SPED</label>
                                <Dropdown id="tipoItemSped" value={values.tipoItemSped ?? null} options={tipoItemSpedOptions} showClear onChange={(event) => update('tipoItemSped', event.value ?? null)} />
                                <FieldError message={errors.tipoItemSped} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="unidadeTributavelSigla" className="font-medium">Unidade tributável (sigla oficial)</label>
                                <SearchSelect
                                    id="unidadeTributavelSigla"
                                    value={textValue(values.unidadeTributavelSigla) || null}
                                    options={unidadeTributavelOptions}
                                    onChange={(value) => update('unidadeTributavelSigla', value)}
                                    onSearch={unidadeTributavelCatalogo.buscar}
                                    placeholder="Buscar unidade tributável"
                                    filterPlaceholder="Sigla ou descrição"
                                    emptyMessage={unidadeTributavelCatalogo.permitido ? 'Nenhuma unidade tributável encontrada.' : mensagemSemCadastrosFiscais}
                                    loading={unidadeTributavelCatalogo.isFetching}
                                    disabled={!unidadeTributavelCatalogo.permitido}
                                    maxLabelLength={40}
                                />
                                <FieldError message={errors.unidadeTributavelSigla} />
                                {!unidadeTributavelCatalogo.permitido ? <Message className="w-full mt-2" severity="warn" text={mensagemSemCadastrosFiscais} /> : null}
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="unidadeMedidaTributavelId" className="font-medium">Unidade tributável (medida interna)</label>
                                <EntitySelect id="unidadeMedidaTributavelId" entityName="unidade tributável" value={textValue(values.unidadeMedidaTributavelId) || null} options={unidadeOptions} onChange={(value) => update('unidadeMedidaTributavelId', value)} />
                                <FieldError message={errors.unidadeMedidaTributavelId} />
                            </div>
                            <div className="field col-12 md:col-3">
                                <label htmlFor="exTipi" className="font-medium">EX-TIPI</label>
                                <InputText id="exTipi" value={textValue(values.exTipi)} className={className('exTipi')} onChange={(event) => update('exTipi', event.target.value)} />
                                <FieldError message={errors.exTipi} />
                                <small className="text-color-secondary">Em branco: herda o EX-TIPI do NCM.</small>
                            </div>
                            <div className="field col-12 md:col-6">
                                <label htmlFor="codigoBeneficioFiscalPadrao" className="font-medium">Código de benefício fiscal</label>
                                <InputText id="codigoBeneficioFiscalPadrao" value={textValue(values.codigoBeneficioFiscalPadrao)} className={className('codigoBeneficioFiscalPadrao')} onChange={(event) => update('codigoBeneficioFiscalPadrao', event.target.value)} />
                                <FieldError message={errors.codigoBeneficioFiscalPadrao} />
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
