'use client';

// Diálogos da fatia Naturezas de operação (v1.11.0a8b72, D98, D48): criar e editar no MESMO diálogo, em seções, e
// inativar pelo `ReasonDialog`. Sem componente compartilhado novo. Regras que o backend NÃO impõe e a tela guia:
// chave `(âmbito, tipo de item)` repetida (o backend aceita e a última vence em silêncio) e o tipo do CFOP (B-32).
//
// `cfops` é SUBSTITUIÇÃO COMPLETA no PUT (`null` preserva, `[]` apaga, lista substitui): o formulário de edição
// carrega TODOS os mapeamentos da resposta e sempre envia a lista inteira, nunca `null` por omissão.

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FieldError } from '@/components/forms/FieldError';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { FormSection } from '@/components/forms/FormSection';
import { useFiliaisOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { CfopSelect } from '@/features/fiscal/components/CadastroFiscalSelects';
import { fiscalReferenceContextLabel } from '@/features/fiscal/components/fiscalUiUtils';
import {
    AMBITO_CFOP_OPTIONS,
    FINALIDADE_NATUREZA_OPTIONS,
    INDICADOR_PRESENCA_COMPRADOR_OPTIONS,
    NATUREZAS_OPERACAO_PERMISSAO,
    NATUREZA_CFOP_GRADE,
    NATUREZA_CODIGO_DUPLICADO,
    NATUREZA_MOTIVO_INATIVAR_MAX,
    NATUREZA_OPERACAO_CAMPOS,
    NATUREZA_OPERACAO_CRIAR_DIALOG,
    NATUREZA_OPERACAO_EDITAR_DIALOG,
    NATUREZA_OPERACAO_INATIVA_AVISO,
    NATUREZA_OPERACAO_INATIVAR_DIALOG,
    NATUREZA_OPERACAO_SECOES,
    NATUREZA_SEM_FILIAL,
    TIPO_DOCUMENTO_NATUREZA_OPTIONS,
    TIPO_ITEM_CFOP_OPTIONS,
    TIPO_ITEM_CFOP_QUALQUER_ITEM,
    TIPO_OPERACAO_NATUREZA_OPTIONS,
    ambitoCfopLabel,
    inativarNaturezaTitulo,
    tipoItemCfopLabel
} from '@/features/fiscal/components/naturezasOperacaoLabels';
import {
    LinhaMapeamentoCfop,
    cfopsDasLinhas,
    chavesRepetidas,
    linhaRepetida,
    linhasDaNatureza,
    novaChaveLinha,
    proximaCombinacaoLivre,
    tipoCfopDaOperacao
} from '@/features/fiscal/components/naturezasOperacaoUtils';
import {
    NATUREZA_CODIGO_MAX,
    NATUREZA_DESCRICAO_MAX,
    NATUREZA_OBSERVACAO_MAX,
    atualizarNaturezaOperacaoSchema,
    criarNaturezaOperacaoSchema,
    inativarNaturezaOperacaoSchema
} from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { NaturezaOperacaoResponse } from '@/features/fiscal/types/naturezasOperacao.types';
import { ApiError } from '@/types/erp';

const FORM_ID = 'natureza-operacao-form';

type NaturezaFormValues = {
    filialId: string;
    codigo: string;
    descricao: string;
    tipoDocumento: number | null;
    tipoOperacao: number | null;
    finalidade: number | null;
    indicadorPresencaComprador: number | null;
    indicadorConsumidorFinal: boolean;
    movimentaEstoque: boolean;
    geraFinanceiro: boolean;
    observacao: string;
};

const valoresIniciais = (natureza?: NaturezaOperacaoResponse | null): NaturezaFormValues => ({
    filialId: natureza?.filialId ?? '',
    codigo: natureza?.codigo ?? '',
    descricao: natureza?.descricao ?? '',
    tipoDocumento: natureza?.tipoDocumento ?? null,
    tipoOperacao: natureza?.tipoOperacao ?? null,
    finalidade: natureza?.finalidade ?? null,
    indicadorPresencaComprador: natureza?.indicadorPresencaComprador ?? null,
    indicadorConsumidorFinal: natureza?.indicadorConsumidorFinal ?? false,
    movimentaEstoque: natureza?.movimentaEstoque ?? false,
    geraFinanceiro: natureza?.geraFinanceiro ?? false,
    observacao: natureza?.observacao ?? ''
});

type ErrosFormulario = { campos: Record<string, string>; linhas: Record<number, string> };

const SEM_ERROS: ErrosFormulario = { campos: {}, linhas: {} };

const coletarErros = (error: z.ZodError): ErrosFormulario => {
    const erros: ErrosFormulario = { campos: {}, linhas: {} };
    error.issues.forEach((issue) => {
        const [primeiro, indice] = issue.path;
        if (primeiro === 'cfops' && typeof indice === 'number') {
            if (!erros.linhas[indice]) erros.linhas[indice] = issue.message;
            return;
        }
        if (typeof primeiro === 'string' && !erros.campos[primeiro]) erros.campos[primeiro] = issue.message;
    });
    return erros;
};

const Campo = ({ htmlFor, label, hint, erro, col = 'col-12 md:col-6', children }: { htmlFor?: string; label: string; hint?: string; erro?: string; col?: string; children: React.ReactNode }) => (
    <div className={`field ${col}`}>
        <label htmlFor={htmlFor} className="font-medium block mb-2">
            {label}
        </label>
        {children}
        {hint ? <small className="text-color-secondary block mt-1 line-height-3">{hint}</small> : null}
        <FieldError message={erro} />
    </div>
);

const Interruptor = ({ id, label, hint, checked, disabled, onChange }: { id: string; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) => (
    <div className="field col-12 md:col-4">
        <div className="flex align-items-center gap-2">
            <InputSwitch inputId={id} checked={checked} disabled={disabled} onChange={(event) => onChange(Boolean(event.value))} />
            <label htmlFor={id} className="font-medium">
                {label}
            </label>
        </div>
        <small className="text-color-secondary block mt-1 line-height-3">{hint}</small>
    </div>
);

export const NaturezaOperacaoDialog = ({
    visible,
    natureza,
    empresaId,
    loading,
    error,
    onHide,
    onSubmit
}: {
    visible: boolean;
    /** `null` = criar; natureza = editar. */
    natureza: NaturezaOperacaoResponse | null;
    /** Empresa do contexto: só leitura no diálogo (a natureza pertence à empresa selecionada). */
    empresaId?: string | null;
    loading?: boolean;
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (values: unknown) => Promise<void> | void;
}) => {
    const { hasPermission } = usePermissions();
    const editando = natureza !== null;
    const inativa = natureza !== null && !natureza.ativa;
    const empresaDaNatureza = natureza?.empresaId ?? empresaId ?? null;
    const podeGerenciar = hasPermission('FISCAL_CADASTROS_GERENCIAR');
    const filiais = useFiliaisOptions(empresaDaNatureza);

    const [values, setValues] = useState<NaturezaFormValues>(() => valoresIniciais(natureza));
    const [linhas, setLinhas] = useState<LinhaMapeamentoCfop[]>(() => linhasDaNatureza(natureza));
    const [erros, setErros] = useState<ErrosFormulario>(SEM_ERROS);

    // Reinicia só ao abrir ou ao trocar de natureza: um refetch da lista com o diálogo aberto não pode apagar o que foi digitado.
    useEffect(() => {
        if (!visible) return;
        setValues(valoresIniciais(natureza));
        setLinhas(linhasDaNatureza(natureza));
        setErros(SEM_ERROS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, natureza?.id]);

    const repetidas = useMemo(() => chavesRepetidas(linhas), [linhas]);
    const temRepetida = repetidas.size > 0;
    const desabilitado = Boolean(loading) || inativa;
    const tipoCfop = tipoCfopDaOperacao(values.tipoOperacao);

    const codigoDuplicado = error?.code === NATUREZA_CODIGO_DUPLICADO.codigoDoErro;
    const erroGeral = error && !codigoDuplicado ? error : null;
    const erroCodigo = codigoDuplicado ? NATUREZA_CODIGO_DUPLICADO.campo : erros.campos.codigo;

    const atualizar = <K extends keyof NaturezaFormValues>(campo: K, valor: NaturezaFormValues[K]) => {
        setValues((atual) => ({ ...atual, [campo]: valor }));
        setErros((atual) => ({ ...atual, campos: { ...atual.campos, [campo]: '' } }));
    };

    const atualizarLinha = (chave: string, mudanca: Partial<LinhaMapeamentoCfop>) => {
        setLinhas((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)));
        setErros((atual) => ({ ...atual, linhas: {} }));
    };

    const adicionarLinha = () => {
        setLinhas((atual) => [...atual, { chave: novaChaveLinha(), ...proximaCombinacaoLivre(atual), cfopId: null, cfopCodigo: null }]);
    };

    const removerLinha = (chave: string) => setLinhas((atual) => atual.filter((linha) => linha.chave !== chave));

    const submeter = async (event: React.FormEvent) => {
        event.preventDefault();
        if (desabilitado || temRepetida) return;

        const comum = {
            descricao: values.descricao,
            tipoDocumento: values.tipoDocumento,
            tipoOperacao: values.tipoOperacao,
            finalidade: values.finalidade,
            indicadorPresencaComprador: values.indicadorPresencaComprador,
            indicadorConsumidorFinal: values.indicadorConsumidorFinal,
            movimentaEstoque: values.movimentaEstoque,
            geraFinanceiro: values.geraFinanceiro,
            observacao: values.observacao,
            cfops: cfopsDasLinhas(linhas)
        };

        const parsed = editando
            ? atualizarNaturezaOperacaoSchema.safeParse(comum)
            : criarNaturezaOperacaoSchema.safeParse({ ...comum, empresaId: empresaDaNatureza ?? '', filialId: values.filialId || null, codigo: values.codigo });

        if (!parsed.success) {
            setErros(coletarErros(parsed.error));
            return;
        }

        setErros(SEM_ERROS);
        await onSubmit(parsed.data);
    };

    const tituloSalvar = !podeGerenciar ? NATUREZAS_OPERACAO_PERMISSAO.acaoSemGerenciar : temRepetida ? NATUREZA_CFOP_GRADE.chaveRepetidaAviso : undefined;
    const rotuloFilial = natureza?.filialId ? (filiais.options.find((option) => option.value === natureza.filialId)?.label ?? fiscalReferenceContextLabel('Filial', natureza.filialId)) : NATUREZA_SEM_FILIAL;

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button
                type="submit"
                form={FORM_ID}
                label={editando ? NATUREZA_OPERACAO_EDITAR_DIALOG.confirmLabel : NATUREZA_OPERACAO_CRIAR_DIALOG.confirmLabel}
                icon="pi pi-check"
                loading={loading}
                disabled={desabilitado || temRepetida || !podeGerenciar}
                title={tituloSalvar}
            />
        </div>
    );

    return (
        <Dialog header={natureza ? NATUREZA_OPERACAO_EDITAR_DIALOG.titulo(natureza.codigo) : NATUREZA_OPERACAO_CRIAR_DIALOG.titulo} visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} onHide={onHide} footer={footer}>
            <form id={FORM_ID} className="p-fluid" onSubmit={submeter}>
                <ApiErrorPanel error={erroGeral} />
                {inativa ? <Message severity="warn" className="w-full mb-3" text={NATUREZA_OPERACAO_INATIVA_AVISO} /> : null}

                <FormSection title={NATUREZA_OPERACAO_SECOES.identificacao}>
                    <Campo htmlFor="naturezaEmpresa" label={NATUREZA_OPERACAO_CAMPOS.empresa} hint={NATUREZA_OPERACAO_CAMPOS.empresaHint} erro={erros.campos.empresaId}>
                        <EmpresaSelect id="naturezaEmpresa" value={empresaDaNatureza} disabled onChange={() => undefined} />
                    </Campo>
                    <Campo htmlFor="naturezaFilial" label={NATUREZA_OPERACAO_CAMPOS.filial} hint={NATUREZA_OPERACAO_CAMPOS.filialHint} erro={erros.campos.filialId}>
                        {editando ? (
                            <InputText id="naturezaFilial" value={rotuloFilial} disabled readOnly />
                        ) : (
                            <FilialSelect id="naturezaFilial" empresaId={empresaDaNatureza} value={values.filialId || null} disabled={desabilitado} onChange={(valor) => atualizar('filialId', valor ?? '')} />
                        )}
                    </Campo>
                    <Campo htmlFor="naturezaCodigo" label={NATUREZA_OPERACAO_CAMPOS.codigo} hint={editando ? NATUREZA_OPERACAO_CAMPOS.codigoSomenteLeitura : NATUREZA_OPERACAO_CAMPOS.codigoHint} erro={erroCodigo}>
                        <InputText
                            id="naturezaCodigo"
                            value={values.codigo}
                            maxLength={NATUREZA_CODIGO_MAX}
                            disabled={desabilitado || editando}
                            className={classNames({ 'p-invalid': erroCodigo })}
                            onChange={(event) => atualizar('codigo', event.target.value.replace(/\s/g, ''))}
                        />
                    </Campo>
                    <Campo htmlFor="naturezaDescricao" label={NATUREZA_OPERACAO_CAMPOS.descricao} hint={NATUREZA_OPERACAO_CAMPOS.descricaoHint} erro={erros.campos.descricao}>
                        <InputText id="naturezaDescricao" value={values.descricao} maxLength={NATUREZA_DESCRICAO_MAX} disabled={desabilitado} className={classNames({ 'p-invalid': erros.campos.descricao })} onChange={(event) => atualizar('descricao', event.target.value)} />
                    </Campo>
                    <Campo htmlFor="naturezaObservacao" label={NATUREZA_OPERACAO_CAMPOS.observacao} hint={`${NATUREZA_OPERACAO_CAMPOS.observacaoHint} ${values.observacao.length}/${NATUREZA_OBSERVACAO_MAX}`} erro={erros.campos.observacao} col="col-12">
                        <InputTextarea id="naturezaObservacao" value={values.observacao} rows={3} maxLength={NATUREZA_OBSERVACAO_MAX} disabled={desabilitado} className="w-full" onChange={(event) => atualizar('observacao', event.target.value)} />
                    </Campo>
                </FormSection>

                <FormSection title={NATUREZA_OPERACAO_SECOES.classificacao}>
                    <Campo htmlFor="naturezaTipoDocumento" label={NATUREZA_OPERACAO_CAMPOS.tipoDocumento} erro={erros.campos.tipoDocumento}>
                        <Dropdown inputId="naturezaTipoDocumento" value={values.tipoDocumento} options={TIPO_DOCUMENTO_NATUREZA_OPTIONS} placeholder="Selecione" disabled={desabilitado} className={classNames({ 'p-invalid': erros.campos.tipoDocumento })} onChange={(event) => atualizar('tipoDocumento', event.value ?? null)} />
                    </Campo>
                    <Campo htmlFor="naturezaTipoOperacao" label={NATUREZA_OPERACAO_CAMPOS.tipoOperacao} erro={erros.campos.tipoOperacao}>
                        <Dropdown inputId="naturezaTipoOperacao" value={values.tipoOperacao} options={TIPO_OPERACAO_NATUREZA_OPTIONS} placeholder="Selecione" disabled={desabilitado} className={classNames({ 'p-invalid': erros.campos.tipoOperacao })} onChange={(event) => atualizar('tipoOperacao', event.value ?? null)} />
                    </Campo>
                    <Campo htmlFor="naturezaFinalidade" label={NATUREZA_OPERACAO_CAMPOS.finalidade} erro={erros.campos.finalidade}>
                        <Dropdown inputId="naturezaFinalidade" value={values.finalidade} options={FINALIDADE_NATUREZA_OPTIONS} placeholder="Selecione" disabled={desabilitado} className={classNames({ 'p-invalid': erros.campos.finalidade })} onChange={(event) => atualizar('finalidade', event.value ?? null)} />
                    </Campo>
                    <Campo htmlFor="naturezaPresenca" label={NATUREZA_OPERACAO_CAMPOS.indicadorPresencaComprador} hint={NATUREZA_OPERACAO_CAMPOS.indicadorPresencaCompradorHint} erro={erros.campos.indicadorPresencaComprador}>
                        <Dropdown inputId="naturezaPresenca" value={values.indicadorPresencaComprador} options={INDICADOR_PRESENCA_COMPRADOR_OPTIONS} placeholder="Selecione" disabled={desabilitado} className={classNames({ 'p-invalid': erros.campos.indicadorPresencaComprador })} onChange={(event) => atualizar('indicadorPresencaComprador', event.value ?? null)} />
                    </Campo>
                </FormSection>

                <FormSection title={NATUREZA_OPERACAO_SECOES.efeitos}>
                    <Interruptor id="naturezaConsumidorFinal" label={NATUREZA_OPERACAO_CAMPOS.indicadorConsumidorFinal} hint={NATUREZA_OPERACAO_CAMPOS.indicadorConsumidorFinalHint} checked={values.indicadorConsumidorFinal} disabled={desabilitado} onChange={(valor) => atualizar('indicadorConsumidorFinal', valor)} />
                    <Interruptor id="naturezaMovimentaEstoque" label={NATUREZA_OPERACAO_CAMPOS.movimentaEstoque} hint={NATUREZA_OPERACAO_CAMPOS.movimentaEstoqueHint} checked={values.movimentaEstoque} disabled={desabilitado} onChange={(valor) => atualizar('movimentaEstoque', valor)} />
                    <Interruptor id="naturezaGeraFinanceiro" label={NATUREZA_OPERACAO_CAMPOS.geraFinanceiro} hint={NATUREZA_OPERACAO_CAMPOS.geraFinanceiroHint} checked={values.geraFinanceiro} disabled={desabilitado} onChange={(valor) => atualizar('geraFinanceiro', valor)} />
                </FormSection>

                <section>
                    <div className="mb-3">
                        <h3 className="text-lg font-semibold m-0">{NATUREZA_OPERACAO_SECOES.mapeamentoCfop}</h3>
                        <p className="text-600 mt-1 mb-0 line-height-3">{NATUREZA_CFOP_GRADE.descricao}</p>
                        <small className="text-color-secondary block mt-1 line-height-3">{NATUREZA_CFOP_GRADE.cfopBuscaHint}</small>
                    </div>
                    {editando ? <Message severity="info" className="w-full mb-3" text={NATUREZA_CFOP_GRADE.substituicaoAviso} /> : null}
                    {linhas.length === 0 ? <Message severity="warn" className="w-full mb-3" text={NATUREZA_CFOP_GRADE.vazio} /> : null}
                    {temRepetida ? <Message severity="error" className="w-full mb-3" text={NATUREZA_CFOP_GRADE.chaveRepetidaAviso} /> : null}
                    {linhas.length > 0 ? (
                        <div className="hidden md:grid mb-1">
                            <div className="col-3 font-medium text-color-secondary">{NATUREZA_CFOP_GRADE.colunaAmbito}</div>
                            <div className="col-3 font-medium text-color-secondary">{NATUREZA_CFOP_GRADE.colunaTipoItem}</div>
                            <div className="col-5 font-medium text-color-secondary">{NATUREZA_CFOP_GRADE.colunaCfop}</div>
                            <div className="col-1 font-medium text-color-secondary text-right">{NATUREZA_CFOP_GRADE.colunaAcoes}</div>
                        </div>
                    ) : null}
                    {linhas.map((linha, indice) => {
                        const repetida = linhaRepetida(linha, repetidas);
                        const erroLinha = repetida ? NATUREZA_CFOP_GRADE.chaveRepetida : erros.linhas[indice];
                        return (
                            <div key={linha.chave} className="mb-2" data-testid="natureza-cfop-linha">
                                <div className="grid align-items-start">
                                    <div className="col-12 md:col-3">
                                        <Dropdown
                                            inputId={`naturezaCfopAmbito-${linha.chave}`}
                                            aria-label={NATUREZA_CFOP_GRADE.colunaAmbito}
                                            value={linha.ambito}
                                            options={AMBITO_CFOP_OPTIONS}
                                            disabled={desabilitado}
                                            className={classNames({ 'p-invalid': repetida })}
                                            // Trocar o âmbito limpa o CFOP: ele precisa pertencer ao novo âmbito (NATUREZA_CFOP_GRADE.trocaAmbitoLimpaCfop).
                                            onChange={(event) => atualizarLinha(linha.chave, { ambito: event.value, cfopId: null, cfopCodigo: null })}
                                        />
                                    </div>
                                    <div className="col-12 md:col-3">
                                        <Dropdown
                                            inputId={`naturezaCfopTipoItem-${linha.chave}`}
                                            aria-label={NATUREZA_CFOP_GRADE.colunaTipoItem}
                                            value={linha.tipoItem}
                                            options={TIPO_ITEM_CFOP_OPTIONS}
                                            // `null` = "Qualquer item": o Dropdown mostra o placeholder quando o valor é nulo.
                                            placeholder={TIPO_ITEM_CFOP_QUALQUER_ITEM}
                                            disabled={desabilitado}
                                            className={classNames({ 'p-invalid': repetida })}
                                            onChange={(event) => atualizarLinha(linha.chave, { tipoItem: event.value ?? null })}
                                        />
                                    </div>
                                    <div className="col-12 md:col-5">
                                        <CfopSelect
                                            id={`naturezaCfop-${linha.chave}`}
                                            value={linha.cfopId}
                                            selecionado={linha.cfopId ? { id: linha.cfopId, codigo: linha.cfopCodigo } : null}
                                            ambito={linha.ambito}
                                            tipo={tipoCfop}
                                            disabled={desabilitado}
                                            placeholder={NATUREZA_CFOP_GRADE.cfopPlaceholder}
                                            emptyMessage={NATUREZA_CFOP_GRADE.cfopNenhumEncontrado}
                                            semPermissaoMessage={NATUREZAS_OPERACAO_PERMISSAO.buscaCfopSemConsultar}
                                            erroMessage={NATUREZA_CFOP_GRADE.erroBuscaCfop}
                                            onChange={(cfopId, item) => atualizarLinha(linha.chave, { cfopId, cfopCodigo: item?.codigo ?? (cfopId === linha.cfopId ? linha.cfopCodigo : null) })}
                                        />
                                    </div>
                                    <div className="col-12 md:col-1 flex md:justify-content-end">
                                        <Button
                                            type="button"
                                            icon="pi pi-trash"
                                            severity="danger"
                                            text
                                            disabled={desabilitado}
                                            title={NATUREZA_CFOP_GRADE.removerLinha}
                                            aria-label={NATUREZA_CFOP_GRADE.removerLinhaAria(ambitoCfopLabel(linha.ambito), tipoItemCfopLabel(linha.tipoItem))}
                                            onClick={() => removerLinha(linha.chave)}
                                        />
                                    </div>
                                </div>
                                <FieldError message={erroLinha} />
                            </div>
                        );
                    })}
                    <small className="text-color-secondary block mb-2 line-height-3">{NATUREZA_CFOP_GRADE.trocaAmbitoLimpaCfop}</small>
                    <div>
                        <Button type="button" label={NATUREZA_CFOP_GRADE.adicionarLinha} icon="pi pi-plus" outlined disabled={desabilitado} onClick={adicionarLinha} />
                    </div>
                </section>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

// D98: inativar pelo `ReasonDialog`, motivo de 1 a 400 caracteres (a auditoria grava o texto numa coluna de 500,
// NO-9) e com o aviso de que é DEFINITIVO por esta tela (não há rota de reativação, NO-15). A inativação devolve
// 204 sem corpo.
export const NaturezaOperacaoInativarDialog = ({
    natureza,
    loading,
    error,
    onHide,
    onSubmit
}: {
    natureza: NaturezaOperacaoResponse | null;
    loading?: boolean;
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (motivo: string) => Promise<void> | void;
}) => {
    if (!natureza) return null;

    const confirmar = (motivo: string) => {
        const parsed = inativarNaturezaOperacaoSchema.safeParse({ motivo });
        if (!parsed.success) return;
        void onSubmit(parsed.data.motivo);
    };

    // `key` por natureza: o `ReasonDialog` guarda o motivo digitado, e numa ação definitiva ele não pode sobrar de uma abertura para a outra.
    return (
        <ReasonDialog
            key={natureza.id}
            visible
            title={inativarNaturezaTitulo(natureza.codigo)}
            confirmLabel={NATUREZA_OPERACAO_INATIVAR_DIALOG.confirmLabel}
            loading={loading}
            warning={`${NATUREZA_OPERACAO_INATIVAR_DIALOG.avisoDefinitivo} ${NATUREZA_OPERACAO_INATIVAR_DIALOG.avisoEfeito}`}
            maxLength={NATUREZA_MOTIVO_INATIVAR_MAX}
            error={error?.message ?? null}
            onHide={onHide}
            onConfirm={confirmar}
        />
    );
};
