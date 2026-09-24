'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
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
import { MoneyInput } from '@/components/forms/MoneyInput';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { atualizarClienteSchema, criarClienteSchema } from '@/features/clientes/schemas/clientesSchemas';
import { ClienteFormValues, ClienteResponse } from '@/features/clientes/types/clientes.types';
import { fieldErrorMap, FieldErrors, numberValue, textValue } from '@/features/pessoas/components/formUtils';
import { useClassificacoesPessoa } from '@/features/pessoas/hooks/useClassificacoesPessoa';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { useTabelasPreco } from '@/features/tabelas-preco/hooks/useTabelasPreco';
import { buildPrivacySafeEntityLabel } from '@/lib/formatters/privacy';
import { EntityStatus, SelectOption } from '@/types/erp';

const CATALOGO_SEM_PERMISSAO_LABEL = 'Configurado — sem permissão para ver o nome';

/**
 * Guarda por campo (D66): quando falta a permissão do catálogo, o valor já gravado (um Guid) não
 * pode ser resolvido para um nome. A opção sintética usa um rótulo neutro — nunca o Guid cru — e
 * preserva o valor no `value`, então ele continua indo no PUT mesmo sem o usuário poder trocá-lo
 * (campo fica `disabled`). Com permissão, os dados vêm da busca normalmente.
 */
const comValorGravadoNeutro = (options: SelectOption<string>[], valorAtual: string | null, permitido: boolean): SelectOption<string>[] => {
    if (!valorAtual || permitido || options.some((option) => option.value === valorAtual)) return options;
    return [{ label: CATALOGO_SEM_PERMISSAO_LABEL, value: valorAtual }, ...options];
};

const buildInitialValues = (record?: ClienteResponse | null): ClienteFormValues =>
    record
        ? {
              id: record.id,
              limiteCredito: record.limiteCredito,
              observacao: record.observacao,
              // Bloco de configuração comercial: sempre hidratado a partir do registro gravado,
              // inclusive `classificacaoId` (sem controle de UI, D65) — omitir qualquer um destes
              // cinco campos no Salvar apaga o vínculo ou zera o booleano no backend (D62).
              tabelaPrecoPadraoId: record.tabelaPrecoPadraoId,
              condicaoPagamentoPadraoId: record.condicaoPagamentoPadraoId,
              classificacaoId: record.classificacaoId,
              diaVencimentoPreferencial: record.diaVencimentoPreferencial,
              permiteVendaAPrazo: record.permiteVendaAPrazo
          }
        : {
              empresaId: '',
              filialId: null,
              pessoaId: '',
              codigo: '',
              limiteCredito: 0,
              observacao: null,
              tabelaPrecoPadraoId: null,
              condicaoPagamentoPadraoId: null,
              classificacaoId: null,
              diaVencimentoPreferencial: null,
              permiteVendaAPrazo: false
          };

export const ClienteFormDialog = ({ visible, loading, record, pessoas, onHide, onSubmit }: { visible: boolean; loading?: boolean; record?: ClienteResponse | null; pessoas: PessoaResponse[]; onHide: () => void; onSubmit: (values: ClienteFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ClienteFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const { hasPermission } = usePermissions();

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const pessoaOptions = useMemo<SelectOption<string>[]>(() => pessoas.map((pessoa) => ({ label: buildPrivacySafeEntityLabel(pessoa.nomeRazaoSocial, pessoa.documento), value: pessoa.id })), [pessoas]);

    // Catálogos da aba Comercial são resolvidos pela empresa do próprio cliente (edição) ou pela
    // empresa escolhida no formulário (criação) — mesmo padrão de `ProdutoFormDialog`.
    const catalogoEmpresaId = record?.empresaId ?? (textValue(values.empresaId) || null);
    const tabelaPrecoPermitido = hasPermission('TABELAS_PRECO_CONSULTAR');
    const condicaoPagamentoPermitido = hasPermission('FINANCEIRO_CONSULTAR');
    const pessoasPermitido = hasPermission('PESSOAS_CONSULTAR');
    const tabelasPrecoQuery = useTabelasPreco({ empresaId: catalogoEmpresaId }, visible && tabelaPrecoPermitido && Boolean(catalogoEmpresaId));
    const condicoesPagamentoQuery = useCondicoesPagamentoOptions(catalogoEmpresaId, visible && condicaoPagamentoPermitido && Boolean(catalogoEmpresaId));
    const classificacoesQuery = useClassificacoesPessoa(catalogoEmpresaId, visible && pessoasPermitido && Boolean(catalogoEmpresaId));

    const tabelaPrecoOptions = useMemo<SelectOption<string>[]>(() => (tabelasPrecoQuery.data?.items ?? []).map((tabela) => ({ label: tabela.nome, value: tabela.id })), [tabelasPrecoQuery.data]);
    const tabelaPrecoOptionsComGravado = useMemo(() => comValorGravadoNeutro(tabelaPrecoOptions, textValue(values.tabelaPrecoPadraoId) || null, tabelaPrecoPermitido), [tabelaPrecoOptions, values.tabelaPrecoPadraoId, tabelaPrecoPermitido]);
    const condicaoPagamentoOptionsComGravado = useMemo(() => comValorGravadoNeutro(condicoesPagamentoQuery.options, textValue(values.condicaoPagamentoPadraoId) || null, condicaoPagamentoPermitido), [condicoesPagamentoQuery.options, values.condicaoPagamentoPadraoId, condicaoPagamentoPermitido]);

    // D70: só as classificações ativas entram na lista; se o valor gravado for de uma inativa, uma
    // opção extra marcada "(inativa)" preserva o rótulo em vez de sumir do campo (o defeito de opção
    // sintética da D60). Distinto do rótulo neutro genérico da D66/`comValorGravadoNeutro`, que cobre
    // a falta de permissão do catálogo, não o status do registro.
    const classificacaoAtivasOptions = useMemo<SelectOption<string>[]>(
        () => (classificacoesQuery.data ?? []).filter((item) => item.status === EntityStatus.Ativo).map((item) => ({ label: `${item.codigo} • ${item.nome}`, value: item.id })),
        [classificacoesQuery.data]
    );
    const classificacaoOptions = useMemo<SelectOption<string>[]>(() => {
        const valorAtual = textValue(values.classificacaoId) || null;
        if (!valorAtual || classificacaoAtivasOptions.some((option) => option.value === valorAtual)) return classificacaoAtivasOptions;
        const gravada = (classificacoesQuery.data ?? []).find((item) => item.id === valorAtual);
        if (!gravada) return classificacaoAtivasOptions;
        return [{ label: `${gravada.codigo} • ${gravada.nome} (inativa)`, value: gravada.id }, ...classificacaoAtivasOptions];
    }, [classificacaoAtivasOptions, classificacoesQuery.data, values.classificacaoId]);
    const classificacaoOptionsComGravado = useMemo(() => comValorGravadoNeutro(classificacaoOptions, textValue(values.classificacaoId) || null, pessoasPermitido), [classificacaoOptions, values.classificacaoId, pessoasPermitido]);

    const permissoesFaltantes = [!tabelaPrecoPermitido ? 'TABELAS_PRECO_CONSULTAR' : null, !condicaoPagamentoPermitido ? 'FINANCEIRO_CONSULTAR' : null, !pessoasPermitido ? 'PESSOAS_CONSULTAR' : null].filter((permissao): permissao is string => Boolean(permissao));

    const update = (name: keyof ClienteFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarClienteSchema : criarClienteSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        // O schema de cadastro não cobre os campos da aba Comercial (eles vão num PUT à parte,
        // orquestrado pela página) — por isso o merge preserva `values` bruto antes de sobrepor com
        // o resultado limpo do cadastro, no mesmo padrão de `ProdutoFormDialog.submit`.
        await onSubmit({ ...values, ...(parsed.data as ClienteFormValues), id: record?.id });
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar cliente' : 'Novo cliente'} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} footer={footer} onHide={onHide}>
            <TabView>
                <TabPanel header="Dados gerais">
                    <FormGrid>
                        {!record ? (
                            <>
                                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                                <div className="field col-12 md:col-8">
                                    <label htmlFor="pessoaId" className="font-medium">Pessoa *</label>
                                    <EntitySelect id="pessoaId" value={textValue(values.pessoaId) || null} options={pessoaOptions} entityName="pessoa" onChange={(value) => update('pessoaId', value ?? '')} />
                                    <small className="text-color-secondary">A pessoa deve estar ativa para ser vinculada como cliente.</small>
                                    <FieldError message={errors.pessoaId} />
                                </div>
                                <div className="field col-12 md:col-4">
                                    <label htmlFor="codigo" className="font-medium">Código *</label>
                                    <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                                    <FieldError message={errors.codigo} />
                                </div>
                            </>
                        ) : null}
                        <div className="field col-12 md:col-4">
                            <label htmlFor="limiteCredito" className="font-medium">Limite de crédito *</label>
                            <MoneyInput id="limiteCredito" value={numberValue(values.limiteCredito)} onChange={(value) => update('limiteCredito', value ?? 0)} />
                            <FieldError message={errors.limiteCredito} />
                        </div>
                        <div className="field col-12">
                            <label htmlFor="observacao" className="font-medium">Observação</label>
                            <InputTextarea id="observacao" value={textValue(values.observacao)} rows={4} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                            <FieldError message={errors.observacao} />
                        </div>
                    </FormGrid>
                </TabPanel>
                <TabPanel header="Comercial">
                    {permissoesFaltantes.length > 0 ? (
                        <Message severity="warn" className="w-full mb-3" text={`Consulta de catálogo indisponível: seu usuário não possui ${permissoesFaltantes.join(', ')}. Os valores já gravados continuam sendo enviados ao salvar.`} />
                    ) : null}
                    <FormGrid>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="tabelaPrecoPadraoId" className="font-medium">Tabela de preço padrão</label>
                            <EntitySelect id="tabelaPrecoPadraoId" entityName="tabela de preço" value={textValue(values.tabelaPrecoPadraoId) || null} options={tabelaPrecoOptionsComGravado} disabled={!tabelaPrecoPermitido} loading={tabelasPrecoQuery.isFetching} onChange={(value) => update('tabelaPrecoPadraoId', value)} />
                        </div>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="condicaoPagamentoPadraoId" className="font-medium">Condição de pagamento padrão</label>
                            <EntitySelect id="condicaoPagamentoPadraoId" entityName="condição de pagamento" value={textValue(values.condicaoPagamentoPadraoId) || null} options={condicaoPagamentoOptionsComGravado} disabled={!condicaoPagamentoPermitido} loading={condicoesPagamentoQuery.isFetching} onChange={(value) => update('condicaoPagamentoPadraoId', value)} />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="classificacaoId" className="font-medium">Classificação</label>
                            <EntitySelect id="classificacaoId" entityName="classificação" value={textValue(values.classificacaoId) || null} options={classificacaoOptionsComGravado} disabled={!pessoasPermitido} loading={classificacoesQuery.isFetching} onChange={(value) => update('classificacaoId', value)} />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="diaVencimentoPreferencial" className="font-medium">Dia de vencimento preferencial</label>
                            <InputNumber id="diaVencimentoPreferencial" value={typeof values.diaVencimentoPreferencial === 'number' ? values.diaVencimentoPreferencial : null} min={1} max={31} showButtons={false} onValueChange={(event) => update('diaVencimentoPreferencial', event.value ?? null)} />
                            <small className="text-color-secondary">Entre 1 e 31. Deixe vazio para não definir.</small>
                        </div>
                        <div className="field col-12 md:col-4 flex align-items-center gap-2 mt-4">
                            <Checkbox inputId="permiteVendaAPrazo" checked={Boolean(values.permiteVendaAPrazo)} onChange={(event) => update('permiteVendaAPrazo', Boolean(event.checked))} />
                            <label htmlFor="permiteVendaAPrazo" className="font-medium">Permite venda a prazo</label>
                        </div>
                    </FormGrid>
                </TabPanel>
            </TabView>
        </Dialog>
    );
};
