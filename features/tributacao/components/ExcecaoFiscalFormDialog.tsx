'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { NcmSelect } from '@/features/tributacao/components/CadastroFiscalSelects';
import { csosnOptions, cstIcmsOptions, cstPisCofinsOptions, tipoCalculoPisCofinsOptions } from '@/features/tributacao/components/tributacaoUiUtils';
import { useExcecaoFiscal, useExcecaoFiscalNcm, useExcecoesFiscaisMutations, useExcecoesFiscaisNcmMutations } from '@/features/tributacao/hooks/useTributacao';
import { atualizarExcecaoFiscalNcmSchema, atualizarExcecaoFiscalSchema, criarExcecaoFiscalNcmSchema, criarExcecaoFiscalSchema, fromDateOnly, toDateOnly } from '@/features/tributacao/schemas/tributacaoSchemas';
import { ExcecaoFiscalNcmResponse, ExcecaoFiscalResponse, ExcecaoIcmsRequest, ExcecaoPisCofinsRequest, TipoCalculoPisCofins } from '@/features/tributacao/types/tributacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

export type VarianteExcecao = 'geral' | 'ncm';

type ExcecaoFormValues = {
    descricao: string;
    uf: string;
    ncmId: string;
    codigoBeneficio: string;
    vigenciaInicio: Date;
    vigenciaFim: Date | null;
    icms: ExcecaoIcmsRequest | null;
    pisCofins: ExcecaoPisCofinsRequest | null;
};

const blocoIcmsPadrao = (): ExcecaoIcmsRequest => ({ cstIcmsCodigo: '20', csosnCodigo: null, aliquota: 0, percentualReducaoBase: 0, percentualDiferimento: 0, percentualFcp: null, percentualCreditoSimplesNacional: 0 });

const blocoPisCofinsPadrao = (): ExcecaoPisCofinsRequest => ({
    cstPisCodigo: '06',
    cstCofinsCodigo: '06',
    aliquotaPis: 0,
    aliquotaCofins: 0,
    tipoCalculo: TipoCalculoPisCofins.Percentual,
    valorPorUnidadePis: 0,
    valorPorUnidadeCofins: 0,
    indicadorCreditaEntrada: false,
    excluirIcmsDaBase: false
});

const createInitialValues = (): ExcecaoFormValues => ({
    descricao: '',
    uf: '',
    ncmId: '',
    codigoBeneficio: '',
    vigenciaInicio: new Date(),
    vigenciaFim: null,
    icms: blocoIcmsPadrao(),
    pisCofins: null
});

const fromResponse = (excecao: ExcecaoFiscalResponse | ExcecaoFiscalNcmResponse): ExcecaoFormValues => ({
    descricao: excecao.descricao,
    uf: excecao.uf,
    ncmId: 'ncmId' in excecao ? excecao.ncmId : '',
    codigoBeneficio: excecao.codigoBeneficio ?? '',
    vigenciaInicio: fromDateOnly(excecao.vigenciaInicio) ?? new Date(),
    vigenciaFim: fromDateOnly(excecao.vigenciaFim),
    icms: excecao.icms ?? null,
    pisCofins: excecao.pisCofins ?? null
});

const Campo = ({ label, htmlFor, children, ajuda, className = 'field col-12 md:col-6 xl:col-4' }: { label: string; htmlFor?: string; children: React.ReactNode; ajuda?: string; className?: string }) => (
    <div className={className}>
        <label htmlFor={htmlFor} className="font-medium block mb-2">
            {label}
        </label>
        {children}
        {ajuda ? <small className="text-color-secondary block mt-1">{ajuda}</small> : null}
    </div>
);

const BlocoOpcional = ({ titulo, ativo, onToggle, children }: { titulo: string; ativo: boolean; onToggle: (ativo: boolean) => void; children: React.ReactNode }) => (
    <Panel
        className="mb-3"
        headerTemplate={
            <div className="flex align-items-center gap-2 p-3">
                <Checkbox inputId={`bloco-excecao-${titulo}`} checked={ativo} onChange={(event) => onToggle(Boolean(event.checked))} />
                <label htmlFor={`bloco-excecao-${titulo}`} className="font-semibold cursor-pointer">
                    {titulo}
                </label>
            </div>
        }
    >
        {ativo ? <div className="grid formgrid p-fluid">{children}</div> : <Message severity="info" className="w-full" text={`Sem o bloco de ${titulo.toLowerCase()}, a exceção não sobrepõe este tributo — a regra geral continua valendo.`} />}
    </Panel>
);

const validationErrorFromIssues = (issues: Array<{ path: Array<string | number>; message: string }>): ApiError => ({
    code: 'Tributacao.Excecao.ValidacaoFrontend',
    message: 'Revise os campos da exceção fiscal antes de salvar.',
    validationErrors: issues.map((issue) => ({ field: issue.path.join('.') || 'formulario', message: issue.message }))
});

/**
 * Formulário de exceção/benefício fiscal. Vale para as duas variantes do contrato — a geral (`/excecoes`) e a
 * por NCM (`/excecoes-ncm`), que só acrescenta o NCM obrigatório.
 *
 * Exceções cobrem **só ICMS próprio e PIS/COFINS**: não há como sobrepor ICMS-ST, DIFAL, IPI, ISS ou
 * retenções por aqui — isso se faz com uma regra mais específica usando prioridade.
 */
export const ExcecaoFiscalFormDialog = ({ visible, variante, excecaoId, empresaId, filialId, onHide }: { visible: boolean; variante: VarianteExcecao; excecaoId?: string | null; empresaId: string; filialId?: string | null; onHide: () => void }) => {
    const toast = useAppToast();
    const ehNcm = variante === 'ncm';
    const mutationsGerais = useExcecoesFiscaisMutations();
    const mutationsNcm = useExcecoesFiscaisNcmMutations();
    const mutations = ehNcm ? mutationsNcm : mutationsGerais;
    const excecaoGeralQuery = useExcecaoFiscal(visible && !ehNcm ? excecaoId : null);
    const excecaoNcmQuery = useExcecaoFiscalNcm(visible && ehNcm ? excecaoId : null);
    const excecaoQuery = ehNcm ? excecaoNcmQuery : excecaoGeralQuery;
    const [values, setValues] = useState<ExcecaoFormValues>(() => createInitialValues());
    const [erro, setErro] = useState<ApiError | null>(null);

    useEffect(() => {
        if (!visible) return;
        setErro(null);
        if (!excecaoId) {
            setValues(createInitialValues());
            return;
        }
        if (excecaoQuery.data) setValues(fromResponse(excecaoQuery.data));
    }, [visible, excecaoId, excecaoQuery.data]);

    const alterar = <K extends keyof ExcecaoFormValues>(campo: K, valor: ExcecaoFormValues[K]) => setValues((current) => ({ ...current, [campo]: valor }));
    const alterarIcms = (patch: Partial<ExcecaoIcmsRequest>) => setValues((current) => ({ ...current, icms: current.icms ? { ...current.icms, ...patch } : current.icms }));
    const alterarPisCofins = (patch: Partial<ExcecaoPisCofinsRequest>) => setValues((current) => ({ ...current, pisCofins: current.pisCofins ? { ...current.pisCofins, ...patch } : current.pisCofins }));

    const submit = async () => {
        setErro(null);

        const corpo = {
            descricao: values.descricao,
            uf: values.uf,
            codigoBeneficio: values.codigoBeneficio || null,
            vigenciaInicio: toDateOnly(values.vigenciaInicio),
            vigenciaFim: values.vigenciaFim ? toDateOnly(values.vigenciaFim) : null,
            icms: values.icms,
            pisCofins: values.pisCofins,
            ...(ehNcm ? { ncmId: values.ncmId } : {})
        };

        const schema = excecaoId ? (ehNcm ? atualizarExcecaoFiscalNcmSchema : atualizarExcecaoFiscalSchema) : ehNcm ? criarExcecaoFiscalNcmSchema : criarExcecaoFiscalSchema;
        const entrada = excecaoId ? corpo : { ...corpo, empresaId, filialId: filialId || null };
        const parsed = schema.safeParse(entrada);

        if (!parsed.success) {
            const mapped = validationErrorFromIssues(parsed.error.issues);
            setErro(mapped);
            toast.warn('Exceção fiscal', mapped.message);
            return;
        }

        try {
            if (excecaoId) {
                await mutations.atualizarMutation.mutateAsync({ id: excecaoId, values: parsed.data });
                toast.success('Exceção fiscal', 'Exceção atualizada.');
            } else {
                await mutations.criarMutation.mutateAsync(parsed.data);
                toast.success('Exceção fiscal', 'Exceção cadastrada.');
            }
            onHide();
        } catch (error) {
            const mapped = mapApiError(error);
            setErro(mapped);
            toast.error('Exceção fiscal', mapped.message);
        }
    };

    const salvando = mutations.criarMutation.isPending || mutations.atualizarMutation.isPending;
    const titulo = `${excecaoId ? 'Editar' : 'Nova'} exceção fiscal${ehNcm ? ' por NCM' : ''}`;

    // O contrato devolve `excecaoAplicadaId` como GUID cru, sem dizer se veio de `ExcecaoFiscal` ou de
    // `ExcecaoFiscalNcm`. Quando o deep link da trilha cai na variante errada, o GET responde 404 — e aí a saída
    // é oferecer o salto para a outra variante com o mesmo id, em vez de o usuário concluir que a exceção sumiu.
    const naoEncontradaNestaVariante = Boolean(excecaoId) && excecaoQuery.isError;
    const rotaOutraVariante = ehNcm ? `/fiscal/excecoes?excecaoId=${excecaoId}` : `/fiscal/excecoes-ncm?excecaoId=${excecaoId}`;

    // Sem registro carregado não há o que salvar: um "Salvar" aqui criaria uma exceção nova em vez de editar.
    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label={naoEncontradaNestaVariante ? 'Fechar' : 'Cancelar'} icon="pi pi-times" text onClick={onHide} disabled={salvando} />
            {naoEncontradaNestaVariante ? null : <Button type="button" label="Salvar exceção" icon="pi pi-check" loading={salvando} onClick={submit} />}
        </div>
    );

    return (
        <Dialog header={titulo} visible={visible} modal maximizable style={{ width: 'min(64rem, 96vw)' }} onHide={onHide} footer={footer}>
            {naoEncontradaNestaVariante ? (
                <div className="flex flex-column gap-3">
                    <Message severity="warn" className="w-full" text={`Esta exceção não está no cadastro de exceções ${ehNcm ? 'por NCM' : 'gerais'}.`} />
                    <p className="m-0 line-height-3">O motor identifica a exceção aplicada apenas pelo identificador, sem dizer de qual dos dois cadastros ela veio. Abra o mesmo registro na outra variante:</p>
                    <div>
                        <Link href={rotaOutraVariante}>
                            <Button type="button" label={ehNcm ? 'Abrir em exceções gerais' : 'Abrir em exceções por NCM'} icon="pi pi-arrow-right-arrow-left" outlined />
                        </Link>
                    </div>
                </div>
            ) : excecaoId && excecaoQuery.isLoading ? (
                <LoadingState variant="panel" />
            ) : (
                <>
                    <ApiErrorPanel error={erro} title="Não foi possível salvar a exceção fiscal." />
                    <Message severity="info" className="w-full mb-3" text="Exceções cobrem apenas ICMS próprio e PIS/COFINS. Para sobrepor ICMS-ST, DIFAL, IPI, ISS ou retenções, cadastre uma regra fiscal mais específica e use a prioridade." />
                    <Message severity="warn" className="w-full mb-3" text="Precedência na resolução: exceção por NCM vence exceção geral, que vence a regra. Se uma exceção não pegou, confira se existe outra mais específica para o mesmo NCM e UF." />

                    <div className="grid formgrid p-fluid">
                        <Campo label="Descrição" htmlFor="excecaoDescricao" className="field col-12 md:col-8">
                            <InputText id="excecaoDescricao" value={values.descricao} maxLength={200} onChange={(event) => alterar('descricao', event.target.value)} />
                        </Campo>
                        <Campo label="UF" htmlFor="excecaoUf" ajuda="Obrigatória: a exceção vale para uma UF específica." className="field col-12 md:col-4">
                            <InputText id="excecaoUf" value={values.uf} maxLength={2} onChange={(event) => alterar('uf', event.target.value.toUpperCase())} />
                        </Campo>
                        {ehNcm ? (
                            <Campo label="NCM" htmlFor="excecaoNcmId" ajuda="Obrigatório nesta variante.">
                                <NcmSelect id="excecaoNcmId" value={values.ncmId || null} onChange={(value) => alterar('ncmId', value ?? '')} />
                            </Campo>
                        ) : null}
                        <Campo label="Código do benefício" htmlFor="codigoBeneficio">
                            <InputText id="codigoBeneficio" value={values.codigoBeneficio} maxLength={20} onChange={(event) => alterar('codigoBeneficio', event.target.value)} />
                        </Campo>
                        <Campo label="Início da vigência" htmlFor="excecaoVigenciaInicio">
                            <Calendar inputId="excecaoVigenciaInicio" value={values.vigenciaInicio} dateFormat="dd/mm/yy" showIcon onChange={(event) => alterar('vigenciaInicio', (event.value as Date) ?? new Date())} />
                        </Campo>
                        <Campo label="Fim da vigência" htmlFor="excecaoVigenciaFim" ajuda="Em branco = vigência aberta.">
                            <Calendar inputId="excecaoVigenciaFim" value={values.vigenciaFim} dateFormat="dd/mm/yy" showIcon showButtonBar onChange={(event) => alterar('vigenciaFim', (event.value as Date) ?? null)} />
                        </Campo>
                    </div>

                    <BlocoOpcional titulo="ICMS" ativo={values.icms !== null} onToggle={(ativo) => alterar('icms', ativo ? blocoIcmsPadrao() : null)}>
                        {values.icms ? (
                            <>
                                <Campo label="CST do ICMS" htmlFor="excecaoCstIcms" ajuda="Informe CST ou CSOSN, conforme o regime.">
                                    <Dropdown
                                        inputId="excecaoCstIcms"
                                        value={values.icms.cstIcmsCodigo}
                                        options={cstIcmsOptions}
                                        showClear
                                        placeholder="Selecione"
                                        onChange={(event) => alterarIcms({ cstIcmsCodigo: (event.value as string) ?? null })}
                                    />
                                </Campo>
                                <Campo label="CSOSN" htmlFor="excecaoCsosn">
                                    <Dropdown inputId="excecaoCsosn" value={values.icms.csosnCodigo} options={csosnOptions} showClear placeholder="Selecione" onChange={(event) => alterarIcms({ csosnCodigo: (event.value as string) ?? null })} />
                                </Campo>
                                <Campo label="Alíquota do ICMS" htmlFor="excecaoAliquotaIcms">
                                    <InputNumber
                                        inputId="excecaoAliquotaIcms"
                                        value={values.icms.aliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ aliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Redução da base" htmlFor="excecaoReducaoBase">
                                    <InputNumber
                                        inputId="excecaoReducaoBase"
                                        value={values.icms.percentualReducaoBase}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualReducaoBase: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Percentual de diferimento" htmlFor="excecaoDiferimento">
                                    <InputNumber
                                        inputId="excecaoDiferimento"
                                        value={values.icms.percentualDiferimento}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualDiferimento: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Percentual de FCP" htmlFor="excecaoFcp" ajuda="Vazio = usa o percentual geral da UF. Zero = FCP não devido. Não são a mesma coisa.">
                                    <InputNumber
                                        inputId="excecaoFcp"
                                        value={values.icms.percentualFcp}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        placeholder="(usa a UF)"
                                        onValueChange={(event) => alterarIcms({ percentualFcp: event.value === null || event.value === undefined ? null : Number(event.value) })}
                                    />
                                </Campo>
                                <Campo label="Crédito do Simples Nacional" htmlFor="excecaoCreditoSimples">
                                    <InputNumber
                                        inputId="excecaoCreditoSimples"
                                        value={values.icms.percentualCreditoSimplesNacional}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualCreditoSimplesNacional: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                            </>
                        ) : null}
                    </BlocoOpcional>

                    <BlocoOpcional titulo="PIS/COFINS" ativo={values.pisCofins !== null} onToggle={(ativo) => alterar('pisCofins', ativo ? blocoPisCofinsPadrao() : null)}>
                        {values.pisCofins ? (
                            <>
                                <Campo label="CST do PIS" htmlFor="excecaoCstPis">
                                    <Dropdown inputId="excecaoCstPis" value={values.pisCofins.cstPisCodigo} options={cstPisCofinsOptions} onChange={(event) => alterarPisCofins({ cstPisCodigo: String(event.value) })} />
                                </Campo>
                                <Campo label="CST da COFINS" htmlFor="excecaoCstCofins">
                                    <Dropdown inputId="excecaoCstCofins" value={values.pisCofins.cstCofinsCodigo} options={cstPisCofinsOptions} onChange={(event) => alterarPisCofins({ cstCofinsCodigo: String(event.value) })} />
                                </Campo>
                                <Campo label="Tipo de cálculo" htmlFor="excecaoTipoCalculo">
                                    <Dropdown inputId="excecaoTipoCalculo" value={values.pisCofins.tipoCalculo} options={tipoCalculoPisCofinsOptions} onChange={(event) => alterarPisCofins({ tipoCalculo: Number(event.value) })} />
                                </Campo>
                                <Campo label="Alíquota do PIS" htmlFor="excecaoAliquotaPis">
                                    <InputNumber
                                        inputId="excecaoAliquotaPis"
                                        value={values.pisCofins.aliquotaPis}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarPisCofins({ aliquotaPis: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota da COFINS" htmlFor="excecaoAliquotaCofins">
                                    <InputNumber
                                        inputId="excecaoAliquotaCofins"
                                        value={values.pisCofins.aliquotaCofins}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarPisCofins({ aliquotaCofins: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor por unidade do PIS" htmlFor="excecaoValorUnidadePis">
                                    <InputNumber
                                        inputId="excecaoValorUnidadePis"
                                        value={values.pisCofins.valorPorUnidadePis}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarPisCofins({ valorPorUnidadePis: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor por unidade da COFINS" htmlFor="excecaoValorUnidadeCofins">
                                    <InputNumber
                                        inputId="excecaoValorUnidadeCofins"
                                        value={values.pisCofins.valorPorUnidadeCofins}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarPisCofins({ valorPorUnidadeCofins: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <div className="field col-12 flex flex-column gap-2">
                                    <div className="flex align-items-center gap-2">
                                        <Checkbox inputId="excecaoCreditaEntrada" checked={values.pisCofins.indicadorCreditaEntrada} onChange={(event) => alterarPisCofins({ indicadorCreditaEntrada: Boolean(event.checked) })} />
                                        <label htmlFor="excecaoCreditaEntrada">Credita na entrada</label>
                                    </div>
                                    <div className="flex align-items-center gap-2">
                                        <Checkbox inputId="excecaoExcluirIcms" checked={values.pisCofins.excluirIcmsDaBase} onChange={(event) => alterarPisCofins({ excluirIcmsDaBase: Boolean(event.checked) })} />
                                        <label htmlFor="excecaoExcluirIcms">Excluir o ICMS da base</label>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </BlocoOpcional>
                </>
            )}
        </Dialog>
    );
};
