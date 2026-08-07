'use client';

import { useEffect, useState } from 'react';
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
import { CfopSelect, NcmSelect } from '@/features/tributacao/components/CadastroFiscalSelects';
import {
    comCuringa,
    consumidorFinalCuringaOptions,
    cstIcmsOptions,
    cstIpiOptions,
    cstPisCofinsOptions,
    csosnOptions,
    indicadorContribuinteOptions,
    modalidadeBaseIcmsOptions,
    modalidadeBaseIcmsStOptions,
    municipioIncidenciaIssOptions,
    regimePisCofinsOptions,
    regimeTributarioOptions,
    tipoCalculoIpiOptions,
    tipoCalculoPisCofinsOptions,
    tipoOperacaoOptions
} from '@/features/tributacao/components/tributacaoUiUtils';
import { useRegraFiscal, useRegrasFiscaisMutations } from '@/features/tributacao/hooks/useTributacao';
import { atualizarRegraFiscalSchema, criarRegraFiscalSchema, fromDateOnly, toDateOnly } from '@/features/tributacao/schemas/tributacaoSchemas';
import {
    ModalidadeBaseCalculoIcms,
    ModalidadeBaseCalculoIcmsSt,
    MunicipioIncidenciaIss,
    RegimePisCofins,
    RegraFiscalOperacaoResponse,
    RegraIcmsRequest,
    RegraIpiRequest,
    RegraIssRequest,
    RegraPisCofinsRequest,
    RegraRetencaoRequest,
    TipoCalculoIpi,
    TipoCalculoPisCofins,
    TipoCfop
} from '@/features/tributacao/types/tributacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

type RegraFormValues = {
    descricao: string;
    tipoOperacao: number;
    ufOrigem: string;
    ufDestino: string;
    regimeEmpresa: number | null;
    indicadorContribuinte: number | null;
    consumidorFinal: boolean | null;
    ncmId: string;
    grupoProdutoId: string;
    cfopId: string;
    prioridade: number;
    vigenciaInicio: Date;
    vigenciaFim: Date | null;
    icms: RegraIcmsRequest | null;
    ipi: RegraIpiRequest | null;
    pisCofins: RegraPisCofinsRequest | null;
    iss: RegraIssRequest | null;
    retencao: RegraRetencaoRequest | null;
};

const blocoIcmsPadrao = (): RegraIcmsRequest => ({
    cstIcmsCodigo: '00',
    csosnCodigo: null,
    modalidadeBaseCalculo: ModalidadeBaseCalculoIcms.ValorOperacao,
    aliquota: 0,
    percentualReducaoBase: 0,
    aliquotaInternaDestino: 0,
    modalidadeBaseCalculoSt: ModalidadeBaseCalculoIcmsSt.MargemValorAgregado,
    mva: 0,
    mvaAjustada: 0,
    percentualReducaoBaseSt: 0,
    percentualFcp: null,
    percentualFcpSt: null,
    percentualDiferimento: 0,
    percentualCreditoSimplesNacional: 0,
    codigoBeneficioFiscal: null,
    baseDuplaDifal: false
});

const blocoIpiPadrao = (): RegraIpiRequest => ({ cstIpiCodigo: '50', tipoCalculo: TipoCalculoIpi.Aliquota, aliquota: 0, valorPorUnidade: 0, codigoEnquadramento: '999', indicadorCreditaEntrada: false });

const blocoPisCofinsPadrao = (): RegraPisCofinsRequest => ({
    cstPisCodigo: '01',
    cstCofinsCodigo: '01',
    regime: RegimePisCofins.NaoCumulativo,
    aliquotaPis: 1.65,
    aliquotaCofins: 7.6,
    tipoCalculo: TipoCalculoPisCofins.Percentual,
    valorPorUnidadePis: 0,
    valorPorUnidadeCofins: 0,
    indicadorCreditaEntrada: false,
    excluirIcmsDaBase: false
});

const blocoIssPadrao = (): RegraIssRequest => ({ codigoServicoLc116: '', aliquota: 0, municipioIncidencia: MunicipioIncidenciaIss.Prestador, indicadorRetido: false, percentualReducaoBase: 0 });

const blocoRetencaoPadrao = (): RegraRetencaoRequest => ({ irrfAliquota: 0, irrfBaseMinima: 0, irrfValorMinimoRecolhimento: 0, inssAliquota: 0, csllAliquota: 0, pisRetidoAliquota: 0, cofinsRetidoAliquota: 0, pccMinimoDispensa: 0 });

const createInitialValues = (): RegraFormValues => ({
    descricao: '',
    tipoOperacao: TipoCfop.Saida,
    ufOrigem: '',
    ufDestino: '',
    regimeEmpresa: null,
    indicadorContribuinte: null,
    consumidorFinal: null,
    ncmId: '',
    grupoProdutoId: '',
    cfopId: '',
    prioridade: 0,
    vigenciaInicio: new Date(),
    vigenciaFim: null,
    icms: blocoIcmsPadrao(),
    ipi: null,
    pisCofins: null,
    iss: null,
    retencao: null
});

const fromResponse = (regra: RegraFiscalOperacaoResponse): RegraFormValues => ({
    descricao: regra.descricao,
    tipoOperacao: Number(regra.tipoOperacao),
    ufOrigem: regra.ufOrigem ?? '',
    ufDestino: regra.ufDestino ?? '',
    regimeEmpresa: regra.regimeEmpresa === null || regra.regimeEmpresa === undefined ? null : Number(regra.regimeEmpresa),
    indicadorContribuinte: regra.indicadorContribuinte === null || regra.indicadorContribuinte === undefined ? null : Number(regra.indicadorContribuinte),
    consumidorFinal: regra.consumidorFinal ?? null,
    ncmId: regra.ncmId ?? '',
    grupoProdutoId: regra.grupoProdutoId ?? '',
    cfopId: regra.cfopId ?? '',
    prioridade: regra.prioridade,
    vigenciaInicio: fromDateOnly(regra.vigenciaInicio) ?? new Date(),
    vigenciaFim: fromDateOnly(regra.vigenciaFim),
    icms: regra.icms ?? null,
    ipi: regra.ipi ?? null,
    pisCofins: regra.pisCofins ?? null,
    iss: regra.iss ?? null,
    retencao: regra.retencao ?? null
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

const BlocoOpcional = ({ titulo, descricao, ativo, onToggle, children }: { titulo: string; descricao: string; ativo: boolean; onToggle: (ativo: boolean) => void; children: React.ReactNode }) => (
    <Panel
        className="mb-3"
        headerTemplate={
            <div className="flex align-items-center justify-content-between p-3 gap-3">
                <div className="flex align-items-center gap-2">
                    <Checkbox inputId={`bloco-${titulo}`} checked={ativo} onChange={(event) => onToggle(Boolean(event.checked))} />
                    <label htmlFor={`bloco-${titulo}`} className="font-semibold cursor-pointer">
                        {titulo}
                    </label>
                </div>
                <span className="text-sm text-color-secondary text-right">{ativo ? descricao : 'Bloco ausente: este tributo fica não parametrizado (não é "tributo zero").'}</span>
            </div>
        }
    >
        {ativo ? (
            <div className="grid formgrid p-fluid">{children}</div>
        ) : (
            <Message severity="info" className="w-full" text={`Sem o bloco de ${titulo.toLowerCase()}, o motor responde FISCAL_TRIBUTACAO_REGRA_INCOMPLETA quando a operação exigir este tributo — em vez de calcular zero.`} />
        )}
    </Panel>
);

const validationErrorFromIssues = (issues: Array<{ path: Array<string | number>; message: string }>): ApiError => ({
    code: 'Tributacao.Regra.ValidacaoFrontend',
    message: 'Revise os campos da regra fiscal antes de salvar.',
    validationErrors: issues.map((issue) => ({ field: issue.path.join('.') || 'formulario', message: issue.message }))
});

/**
 * Formulário da regra fiscal: chave de resolução + até cinco blocos opcionais.
 *
 * Duas armadilhas do contrato ficam explícitas na UI: campo vazio da chave é **curinga** ("(qualquer)"), não
 * "não preenchido"; e o `PUT` é **substituição total** — por isso o payload é sempre remontado inteiro a
 * partir do estado do formulário, nunca só com o que mudou.
 */
export const RegraFiscalFormDialog = ({ visible, regraId, empresaId, filialId, onHide }: { visible: boolean; regraId?: string | null; empresaId: string; filialId?: string | null; onHide: () => void }) => {
    const toast = useAppToast();
    const mutations = useRegrasFiscaisMutations();
    const regraQuery = useRegraFiscal(visible ? regraId : null);
    const [values, setValues] = useState<RegraFormValues>(() => createInitialValues());
    const [erro, setErro] = useState<ApiError | null>(null);

    useEffect(() => {
        if (!visible) return;
        setErro(null);
        if (!regraId) {
            setValues(createInitialValues());
            return;
        }
        if (regraQuery.data) setValues(fromResponse(regraQuery.data));
    }, [visible, regraId, regraQuery.data]);

    const alterar = <K extends keyof RegraFormValues>(campo: K, valor: RegraFormValues[K]) => setValues((current) => ({ ...current, [campo]: valor }));
    const alterarIcms = (patch: Partial<RegraIcmsRequest>) => setValues((current) => ({ ...current, icms: current.icms ? { ...current.icms, ...patch } : current.icms }));
    const alterarIpi = (patch: Partial<RegraIpiRequest>) => setValues((current) => ({ ...current, ipi: current.ipi ? { ...current.ipi, ...patch } : current.ipi }));
    const alterarPisCofins = (patch: Partial<RegraPisCofinsRequest>) => setValues((current) => ({ ...current, pisCofins: current.pisCofins ? { ...current.pisCofins, ...patch } : current.pisCofins }));
    const alterarIss = (patch: Partial<RegraIssRequest>) => setValues((current) => ({ ...current, iss: current.iss ? { ...current.iss, ...patch } : current.iss }));
    const alterarRetencao = (patch: Partial<RegraRetencaoRequest>) => setValues((current) => ({ ...current, retencao: current.retencao ? { ...current.retencao, ...patch } : current.retencao }));

    const submit = async () => {
        setErro(null);

        // Payload sempre completo: o PUT do backend remove os blocos que não vierem no corpo.
        const corpo = {
            descricao: values.descricao,
            tipoOperacao: values.tipoOperacao,
            ufOrigem: values.ufOrigem || null,
            ufDestino: values.ufDestino || null,
            regimeEmpresa: values.regimeEmpresa,
            indicadorContribuinte: values.indicadorContribuinte,
            consumidorFinal: values.consumidorFinal,
            ncmId: values.ncmId || null,
            grupoProdutoId: values.grupoProdutoId || null,
            cfopId: values.cfopId || null,
            prioridade: values.prioridade,
            vigenciaInicio: toDateOnly(values.vigenciaInicio),
            vigenciaFim: values.vigenciaFim ? toDateOnly(values.vigenciaFim) : null,
            icms: values.icms,
            ipi: values.ipi,
            pisCofins: values.pisCofins,
            iss: values.iss,
            retencao: values.retencao
        };

        const parsed = regraId ? atualizarRegraFiscalSchema.safeParse(corpo) : criarRegraFiscalSchema.safeParse({ ...corpo, empresaId, filialId: filialId || null });

        if (!parsed.success) {
            const mapped = validationErrorFromIssues(parsed.error.issues);
            setErro(mapped);
            toast.warn('Regra fiscal', mapped.message);
            return;
        }

        try {
            if (regraId) {
                await mutations.atualizarMutation.mutateAsync({ id: regraId, values: parsed.data });
                toast.success('Regra fiscal', 'Regra atualizada.');
            } else {
                await mutations.criarMutation.mutateAsync(parsed.data);
                toast.success('Regra fiscal', 'Regra cadastrada.');
            }
            onHide();
        } catch (error) {
            const mapped = mapApiError(error);
            setErro(mapped);
            toast.error('Regra fiscal', mapped.message);
        }
    };

    const salvando = mutations.criarMutation.isPending || mutations.atualizarMutation.isPending;

    // Deep link da trilha pode citar uma regra removida ou de outra empresa. Sem registro carregado não há o que
    // salvar: manter o "Salvar" aqui criaria uma regra nova em vez de editar a que o usuário pediu.
    const regraNaoCarregada = Boolean(regraId) && regraQuery.isError;

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label={regraNaoCarregada ? 'Fechar' : 'Cancelar'} icon="pi pi-times" text onClick={onHide} disabled={salvando} />
            {regraNaoCarregada ? null : <Button type="button" label="Salvar regra" icon="pi pi-check" loading={salvando} onClick={submit} />}
        </div>
    );

    return (
        <Dialog header={regraId ? 'Editar regra fiscal' : 'Nova regra fiscal'} visible={visible} modal maximizable style={{ width: 'min(72rem, 96vw)' }} onHide={onHide} footer={footer}>
            {regraNaoCarregada ? (
                <ApiErrorPanel error={mapApiError(regraQuery.error)} title="Não foi possível abrir a regra fiscal informada." />
            ) : regraId && regraQuery.isLoading ? (
                <LoadingState variant="panel" />
            ) : (
                <>
                    <ApiErrorPanel error={erro} title="Não foi possível salvar a regra fiscal." />
                    <Message
                        severity="info"
                        className="w-full mb-3"
                        text="Campos da chave deixados em branco valem como (qualquer): a regra se aplica a todos os valores daquele campo. Quanto mais campos preenchidos, mais específica a regra e maior a precedência na resolução."
                    />

                    <div className="grid formgrid p-fluid">
                        <Campo label="Descrição" htmlFor="descricao" className="field col-12 md:col-8">
                            <InputText id="descricao" value={values.descricao} maxLength={200} onChange={(event) => alterar('descricao', event.target.value)} />
                        </Campo>
                        <Campo label="Prioridade" htmlFor="prioridade" ajuda="Desempata regras igualmente específicas. Maior prioridade vence." className="field col-12 md:col-4">
                            <InputNumber inputId="prioridade" value={values.prioridade} min={0} onValueChange={(event) => alterar('prioridade', Number(event.value ?? 0))} />
                        </Campo>
                        <Campo label="Tipo de operação" htmlFor="tipoOperacao">
                            <Dropdown inputId="tipoOperacao" value={values.tipoOperacao} options={tipoOperacaoOptions} onChange={(event) => alterar('tipoOperacao', Number(event.value))} />
                        </Campo>
                        <Campo label="UF de origem" htmlFor="ufOrigem" ajuda="Em branco = (qualquer).">
                            <InputText id="ufOrigem" value={values.ufOrigem} maxLength={2} placeholder="(qualquer)" onChange={(event) => alterar('ufOrigem', event.target.value.toUpperCase())} />
                        </Campo>
                        <Campo label="UF de destino" htmlFor="ufDestino" ajuda="Em branco = (qualquer).">
                            <InputText id="ufDestino" value={values.ufDestino} maxLength={2} placeholder="(qualquer)" onChange={(event) => alterar('ufDestino', event.target.value.toUpperCase())} />
                        </Campo>
                        <Campo label="Regime da empresa" htmlFor="regimeEmpresa">
                            <Dropdown
                                inputId="regimeEmpresa"
                                value={values.regimeEmpresa}
                                options={comCuringa(regimeTributarioOptions)}
                                placeholder="(qualquer)"
                                onChange={(event) => alterar('regimeEmpresa', event.value === null || event.value === undefined ? null : Number(event.value))}
                            />
                        </Campo>
                        <Campo label="Indicador do destinatário" htmlFor="indicadorContribuinte">
                            <Dropdown
                                inputId="indicadorContribuinte"
                                value={values.indicadorContribuinte}
                                options={comCuringa(indicadorContribuinteOptions)}
                                placeholder="(qualquer)"
                                onChange={(event) => alterar('indicadorContribuinte', event.value === null || event.value === undefined ? null : Number(event.value))}
                            />
                        </Campo>
                        <Campo label="Consumidor final" htmlFor="consumidorFinal">
                            <Dropdown
                                inputId="consumidorFinal"
                                value={values.consumidorFinal}
                                options={consumidorFinalCuringaOptions}
                                placeholder="(qualquer)"
                                onChange={(event) => alterar('consumidorFinal', event.value === null || event.value === undefined ? null : Boolean(event.value))}
                            />
                        </Campo>
                        <Campo label="NCM" htmlFor="regraNcmId" ajuda="Em branco = (qualquer).">
                            <NcmSelect id="regraNcmId" value={values.ncmId || null} onChange={(value) => alterar('ncmId', value ?? '')} />
                        </Campo>
                        <Campo label="CFOP" htmlFor="regraCfopId" ajuda="Em branco = (qualquer).">
                            <CfopSelect id="regraCfopId" value={values.cfopId || null} onChange={(value) => alterar('cfopId', value ?? '')} />
                        </Campo>
                        <Campo label="Início da vigência" htmlFor="vigenciaInicio">
                            <Calendar inputId="vigenciaInicio" value={values.vigenciaInicio} dateFormat="dd/mm/yy" showIcon onChange={(event) => alterar('vigenciaInicio', (event.value as Date) ?? new Date())} />
                        </Campo>
                        <Campo label="Fim da vigência" htmlFor="vigenciaFim" ajuda="Em branco = vigência aberta.">
                            <Calendar inputId="vigenciaFim" value={values.vigenciaFim} dateFormat="dd/mm/yy" showIcon showButtonBar onChange={(event) => alterar('vigenciaFim', (event.value as Date) ?? null)} />
                        </Campo>
                    </div>

                    <BlocoOpcional titulo="ICMS" descricao="Parametriza ICMS próprio, ST, DIFAL e FCP." ativo={values.icms !== null} onToggle={(ativo) => alterar('icms', ativo ? blocoIcmsPadrao() : null)}>
                        {values.icms ? (
                            <>
                                <Campo label="CST do ICMS" htmlFor="cstIcmsCodigo" ajuda="Informe CST ou CSOSN, conforme o regime.">
                                    <Dropdown
                                        inputId="cstIcmsCodigo"
                                        value={values.icms.cstIcmsCodigo}
                                        options={cstIcmsOptions}
                                        showClear
                                        placeholder="Selecione"
                                        onChange={(event) => alterarIcms({ cstIcmsCodigo: (event.value as string) ?? null })}
                                    />
                                </Campo>
                                <Campo label="CSOSN" htmlFor="csosnCodigo">
                                    <Dropdown inputId="csosnCodigo" value={values.icms.csosnCodigo} options={csosnOptions} showClear placeholder="Selecione" onChange={(event) => alterarIcms({ csosnCodigo: (event.value as string) ?? null })} />
                                </Campo>
                                <Campo label="Modalidade da base" htmlFor="modalidadeBaseCalculo">
                                    <Dropdown inputId="modalidadeBaseCalculo" value={values.icms.modalidadeBaseCalculo} options={modalidadeBaseIcmsOptions} onChange={(event) => alterarIcms({ modalidadeBaseCalculo: Number(event.value) })} />
                                </Campo>
                                <Campo label="Alíquota do ICMS" htmlFor="aliquotaIcms">
                                    <InputNumber
                                        inputId="aliquotaIcms"
                                        value={values.icms.aliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ aliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Redução da base" htmlFor="percentualReducaoBase">
                                    <InputNumber
                                        inputId="percentualReducaoBase"
                                        value={values.icms.percentualReducaoBase}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualReducaoBase: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota interna de destino" htmlFor="aliquotaInternaDestino">
                                    <InputNumber
                                        inputId="aliquotaInternaDestino"
                                        value={values.icms.aliquotaInternaDestino}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ aliquotaInternaDestino: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Modalidade da base de ST" htmlFor="modalidadeBaseCalculoSt">
                                    <Dropdown inputId="modalidadeBaseCalculoSt" value={values.icms.modalidadeBaseCalculoSt} options={modalidadeBaseIcmsStOptions} onChange={(event) => alterarIcms({ modalidadeBaseCalculoSt: Number(event.value) })} />
                                </Campo>
                                <Campo label="MVA" htmlFor="mva">
                                    <InputNumber inputId="mva" value={values.icms.mva} suffix=" %" min={0} max={100} minFractionDigits={2} maxFractionDigits={4} onValueChange={(event) => alterarIcms({ mva: Number(event.value ?? 0) })} />
                                </Campo>
                                <Campo label="MVA ajustada" htmlFor="mvaAjustada">
                                    <InputNumber
                                        inputId="mvaAjustada"
                                        value={values.icms.mvaAjustada}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ mvaAjustada: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Redução da base de ST" htmlFor="percentualReducaoBaseSt">
                                    <InputNumber
                                        inputId="percentualReducaoBaseSt"
                                        value={values.icms.percentualReducaoBaseSt}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualReducaoBaseSt: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Percentual de FCP" htmlFor="percentualFcp" ajuda="Vazio = usa o percentual geral da UF. Zero = FCP não devido para este produto. Não são a mesma coisa.">
                                    <InputNumber
                                        inputId="percentualFcp"
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
                                <Campo label="Percentual de FCP-ST" htmlFor="percentualFcpSt" ajuda="Mesma semântica do FCP: vazio ≠ zero.">
                                    <InputNumber
                                        inputId="percentualFcpSt"
                                        value={values.icms.percentualFcpSt}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        placeholder="(usa a UF)"
                                        onValueChange={(event) => alterarIcms({ percentualFcpSt: event.value === null || event.value === undefined ? null : Number(event.value) })}
                                    />
                                </Campo>
                                <Campo label="Percentual de diferimento" htmlFor="percentualDiferimento">
                                    <InputNumber
                                        inputId="percentualDiferimento"
                                        value={values.icms.percentualDiferimento}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualDiferimento: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Crédito do Simples Nacional" htmlFor="percentualCreditoSimplesNacional">
                                    <InputNumber
                                        inputId="percentualCreditoSimplesNacional"
                                        value={values.icms.percentualCreditoSimplesNacional}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIcms({ percentualCreditoSimplesNacional: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Código do benefício fiscal" htmlFor="codigoBeneficioFiscal">
                                    <InputText id="codigoBeneficioFiscal" value={values.icms.codigoBeneficioFiscal ?? ''} maxLength={20} onChange={(event) => alterarIcms({ codigoBeneficioFiscal: event.target.value || null })} />
                                </Campo>
                                <div className="field col-12 flex align-items-center gap-2">
                                    <Checkbox inputId="baseDuplaDifal" checked={values.icms.baseDuplaDifal} onChange={(event) => alterarIcms({ baseDuplaDifal: Boolean(event.checked) })} />
                                    <label htmlFor="baseDuplaDifal">Aplicar base dupla no DIFAL</label>
                                </div>
                            </>
                        ) : null}
                    </BlocoOpcional>

                    <BlocoOpcional titulo="IPI" descricao="Parametriza CST, alíquota ou valor por unidade e enquadramento." ativo={values.ipi !== null} onToggle={(ativo) => alterar('ipi', ativo ? blocoIpiPadrao() : null)}>
                        {values.ipi ? (
                            <>
                                <Campo label="CST do IPI" htmlFor="cstIpiCodigo">
                                    <Dropdown inputId="cstIpiCodigo" value={values.ipi.cstIpiCodigo} options={cstIpiOptions} onChange={(event) => alterarIpi({ cstIpiCodigo: String(event.value) })} />
                                </Campo>
                                <Campo label="Tipo de cálculo" htmlFor="tipoCalculoIpi">
                                    <Dropdown inputId="tipoCalculoIpi" value={values.ipi.tipoCalculo} options={tipoCalculoIpiOptions} onChange={(event) => alterarIpi({ tipoCalculo: Number(event.value) })} />
                                </Campo>
                                <Campo label="Alíquota" htmlFor="aliquotaIpi">
                                    <InputNumber
                                        inputId="aliquotaIpi"
                                        value={values.ipi.aliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIpi({ aliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor por unidade" htmlFor="valorPorUnidadeIpi">
                                    <InputNumber
                                        inputId="valorPorUnidadeIpi"
                                        value={values.ipi.valorPorUnidade}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarIpi({ valorPorUnidade: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Código de enquadramento (cEnq)" htmlFor="codigoEnquadramento" ajuda="Exatamente 3 dígitos numéricos.">
                                    <InputText id="codigoEnquadramento" value={values.ipi.codigoEnquadramento} maxLength={3} onChange={(event) => alterarIpi({ codigoEnquadramento: event.target.value })} />
                                </Campo>
                                <div className="field col-12 flex align-items-center gap-2">
                                    <Checkbox inputId="ipiCreditaEntrada" checked={values.ipi.indicadorCreditaEntrada} onChange={(event) => alterarIpi({ indicadorCreditaEntrada: Boolean(event.checked) })} />
                                    <label htmlFor="ipiCreditaEntrada">Credita na entrada</label>
                                </div>
                            </>
                        ) : null}
                    </BlocoOpcional>

                    <BlocoOpcional titulo="PIS/COFINS" descricao="Parametriza CSTs, regime e alíquotas das duas contribuições." ativo={values.pisCofins !== null} onToggle={(ativo) => alterar('pisCofins', ativo ? blocoPisCofinsPadrao() : null)}>
                        {values.pisCofins ? (
                            <>
                                <Campo label="CST do PIS" htmlFor="cstPisCodigo">
                                    <Dropdown inputId="cstPisCodigo" value={values.pisCofins.cstPisCodigo} options={cstPisCofinsOptions} onChange={(event) => alterarPisCofins({ cstPisCodigo: String(event.value) })} />
                                </Campo>
                                <Campo label="CST da COFINS" htmlFor="cstCofinsCodigo">
                                    <Dropdown inputId="cstCofinsCodigo" value={values.pisCofins.cstCofinsCodigo} options={cstPisCofinsOptions} onChange={(event) => alterarPisCofins({ cstCofinsCodigo: String(event.value) })} />
                                </Campo>
                                <Campo label="Regime" htmlFor="regimePisCofins">
                                    <Dropdown inputId="regimePisCofins" value={values.pisCofins.regime} options={regimePisCofinsOptions} onChange={(event) => alterarPisCofins({ regime: Number(event.value) })} />
                                </Campo>
                                <Campo label="Tipo de cálculo" htmlFor="tipoCalculoPisCofins">
                                    <Dropdown inputId="tipoCalculoPisCofins" value={values.pisCofins.tipoCalculo} options={tipoCalculoPisCofinsOptions} onChange={(event) => alterarPisCofins({ tipoCalculo: Number(event.value) })} />
                                </Campo>
                                <Campo label="Alíquota do PIS" htmlFor="aliquotaPis">
                                    <InputNumber
                                        inputId="aliquotaPis"
                                        value={values.pisCofins.aliquotaPis}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarPisCofins({ aliquotaPis: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota da COFINS" htmlFor="aliquotaCofins">
                                    <InputNumber
                                        inputId="aliquotaCofins"
                                        value={values.pisCofins.aliquotaCofins}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarPisCofins({ aliquotaCofins: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor por unidade do PIS" htmlFor="valorPorUnidadePis">
                                    <InputNumber
                                        inputId="valorPorUnidadePis"
                                        value={values.pisCofins.valorPorUnidadePis}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarPisCofins({ valorPorUnidadePis: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor por unidade da COFINS" htmlFor="valorPorUnidadeCofins">
                                    <InputNumber
                                        inputId="valorPorUnidadeCofins"
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
                                        <Checkbox inputId="pisCofinsCreditaEntrada" checked={values.pisCofins.indicadorCreditaEntrada} onChange={(event) => alterarPisCofins({ indicadorCreditaEntrada: Boolean(event.checked) })} />
                                        <label htmlFor="pisCofinsCreditaEntrada">Credita na entrada</label>
                                    </div>
                                    <div className="flex align-items-center gap-2">
                                        <Checkbox inputId="excluirIcmsDaBase" checked={values.pisCofins.excluirIcmsDaBase} onChange={(event) => alterarPisCofins({ excluirIcmsDaBase: Boolean(event.checked) })} />
                                        <label htmlFor="excluirIcmsDaBase">Excluir o ICMS da base (tese do STF)</label>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </BlocoOpcional>

                    <BlocoOpcional titulo="ISS" descricao="Parametriza o serviço, a alíquota e o município de incidência." ativo={values.iss !== null} onToggle={(ativo) => alterar('iss', ativo ? blocoIssPadrao() : null)}>
                        {values.iss ? (
                            <>
                                <Campo label="Código de serviço (LC 116)" htmlFor="codigoServicoLc116">
                                    <InputText id="codigoServicoLc116" value={values.iss.codigoServicoLc116} maxLength={20} onChange={(event) => alterarIss({ codigoServicoLc116: event.target.value })} />
                                </Campo>
                                <Campo label="Alíquota do ISS" htmlFor="aliquotaIss">
                                    <InputNumber
                                        inputId="aliquotaIss"
                                        value={values.iss.aliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIss({ aliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Município de incidência" htmlFor="municipioIncidencia">
                                    <Dropdown inputId="municipioIncidencia" value={values.iss.municipioIncidencia} options={municipioIncidenciaIssOptions} onChange={(event) => alterarIss({ municipioIncidencia: Number(event.value) })} />
                                </Campo>
                                <Campo label="Redução da base do ISS" htmlFor="percentualReducaoBaseIss">
                                    <InputNumber
                                        inputId="percentualReducaoBaseIss"
                                        value={values.iss.percentualReducaoBase}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarIss({ percentualReducaoBase: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <div className="field col-12 flex align-items-center gap-2">
                                    <Checkbox inputId="issIndicadorRetido" checked={values.iss.indicadorRetido} onChange={(event) => alterarIss({ indicadorRetido: Boolean(event.checked) })} />
                                    <label htmlFor="issIndicadorRetido">ISS retido pelo tomador</label>
                                </div>
                            </>
                        ) : null}
                    </BlocoOpcional>

                    <BlocoOpcional titulo="Retenções na fonte" descricao="Parametriza IRRF, INSS e PCC (CSLL/PIS/COFINS)." ativo={values.retencao !== null} onToggle={(ativo) => alterar('retencao', ativo ? blocoRetencaoPadrao() : null)}>
                        {values.retencao ? (
                            <>
                                <Campo label="Alíquota do IRRF" htmlFor="irrfAliquota">
                                    <InputNumber
                                        inputId="irrfAliquota"
                                        value={values.retencao.irrfAliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarRetencao({ irrfAliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Base mínima do IRRF" htmlFor="irrfBaseMinima">
                                    <InputNumber
                                        inputId="irrfBaseMinima"
                                        value={values.retencao.irrfBaseMinima}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarRetencao({ irrfBaseMinima: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Valor mínimo de recolhimento do IRRF" htmlFor="irrfValorMinimoRecolhimento">
                                    <InputNumber
                                        inputId="irrfValorMinimoRecolhimento"
                                        value={values.retencao.irrfValorMinimoRecolhimento}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarRetencao({ irrfValorMinimoRecolhimento: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota do INSS" htmlFor="inssAliquota">
                                    <InputNumber
                                        inputId="inssAliquota"
                                        value={values.retencao.inssAliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarRetencao({ inssAliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota da CSLL" htmlFor="csllAliquota">
                                    <InputNumber
                                        inputId="csllAliquota"
                                        value={values.retencao.csllAliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarRetencao({ csllAliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota do PIS retido" htmlFor="pisRetidoAliquota">
                                    <InputNumber
                                        inputId="pisRetidoAliquota"
                                        value={values.retencao.pisRetidoAliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarRetencao({ pisRetidoAliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Alíquota da COFINS retida" htmlFor="cofinsRetidoAliquota">
                                    <InputNumber
                                        inputId="cofinsRetidoAliquota"
                                        value={values.retencao.cofinsRetidoAliquota}
                                        suffix=" %"
                                        min={0}
                                        max={100}
                                        minFractionDigits={2}
                                        maxFractionDigits={4}
                                        onValueChange={(event) => alterarRetencao({ cofinsRetidoAliquota: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                                <Campo label="Mínimo de dispensa do PCC" htmlFor="pccMinimoDispensa">
                                    <InputNumber
                                        inputId="pccMinimoDispensa"
                                        value={values.retencao.pccMinimoDispensa}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        onValueChange={(event) => alterarRetencao({ pccMinimoDispensa: Number(event.value ?? 0) })}
                                    />
                                </Campo>
                            </>
                        ) : null}
                    </BlocoOpcional>
                </>
            )}
        </Dialog>
    );
};
