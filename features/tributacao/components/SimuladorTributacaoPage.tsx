'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { criarItemSimulado, ItemSimuladoValues, ItensTributaveisGrid } from '@/features/tributacao/components/ItensTributaveisGrid';
import { ResultadoTributacaoPanel } from '@/features/tributacao/components/ResultadoTributacaoPanel';
import { describeTributacaoError, tributacaoErrorSeverity } from '@/features/tributacao/components/tributacaoErrors';
import { crtOptions, finalidadeOptions, formatMoeda, indicadorContribuinteOptions, naturezaTomadorOptions, regimeTributarioOptions, tipoOperacaoOptions } from '@/features/tributacao/components/tributacaoUiUtils';
import { useSimularTributacao } from '@/features/tributacao/hooks/useTributacao';
import { simularTributacaoSchema, toDateOnly } from '@/features/tributacao/schemas/tributacaoSchemas';
import { FinalidadeNaturezaOperacao, IndicadorContribuinteIcms, NaturezaTomadorServico, RegimeTributario, ResultadoTributacaoDocumento, TipoCfop, TipoItemSped } from '@/features/tributacao/types/tributacao.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

type SimuladorValues = {
    empresaId: string;
    filialId: string;
    tipoOperacao: number;
    regimeEmpresa: number;
    crtEmitente: number | null;
    ufOrigem: string;
    ufDestino: string;
    codigoMunicipioOrigem: string;
    codigoMunicipioDestino: string;
    indicadorContribuinteDestinatario: number;
    consumidorFinal: boolean;
    dataOperacao: Date;
    destinatarioContribuinteIpi: boolean;
    emitenteContribuinteIpi: boolean;
    finalidade: number;
    naturezaTomadorServico: number;
    valorFreteTotal: number;
    valorSeguroTotal: number;
    valorOutrasDespesasTotal: number;
    valorDescontoTotal: number;
};

const createInitialValues = (): SimuladorValues => ({
    empresaId: '',
    filialId: '',
    tipoOperacao: TipoCfop.Saida,
    regimeEmpresa: RegimeTributario.LucroReal,
    crtEmitente: null,
    ufOrigem: '',
    ufDestino: '',
    codigoMunicipioOrigem: '',
    codigoMunicipioDestino: '',
    indicadorContribuinteDestinatario: IndicadorContribuinteIcms.Contribuinte,
    consumidorFinal: false,
    dataOperacao: new Date(),
    destinatarioContribuinteIpi: false,
    emitenteContribuinteIpi: false,
    finalidade: FinalidadeNaturezaOperacao.Normal,
    naturezaTomadorServico: NaturezaTomadorServico.NaoAplicavel,
    valorFreteTotal: 0,
    valorSeguroTotal: 0,
    valorOutrasDespesasTotal: 0,
    valorDescontoTotal: 0
});

const Campo = ({ label, htmlFor, children, className = 'field col-12 md:col-6 xl:col-3' }: { label: string; htmlFor?: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label htmlFor={htmlFor} className="font-medium block mb-2">
            {label}
        </label>
        {children}
    </div>
);

const validationErrorFromIssues = (issues: Array<{ path: Array<string | number>; message: string }>): ApiError => ({
    code: 'Tributacao.Simulacao.ValidacaoFrontend',
    message: 'Revise os campos da operação antes de simular a tributação.',
    validationErrors: issues.map((issue) => ({ field: issue.path.join('.') || 'formulario', message: issue.message }))
});

/**
 * Simulador de tributação. Read-only por contrato: `POST /simular` não persiste nada, não gera documento e
 * não consome numeração — é a ferramenta que permite conferir o motor contra o sistema legado antes de
 * qualquer emissão.
 */
export const SimuladorTributacaoPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const simular = useSimularTributacao();
    const [values, setValues] = useState<SimuladorValues>(() => createInitialValues());
    const [itens, setItens] = useState<ItemSimuladoValues[]>(() => [criarItemSimulado(1)]);
    const [resultado, setResultado] = useState<ResultadoTributacaoDocumento | null>(null);
    const [erro, setErro] = useState<ApiError | null>(null);

    /*
     * Item de serviço apura ISS, e o ISS depende do município de incidência: o contrato marca os dois códigos
     * IBGE como exigidos nesse caso. O schema barra o envio; aqui a tela avisa antes de o usuário tentar.
     */
    const exigeMunicipioIss = useMemo(() => itens.some((item) => Number(item.tipoItem) === TipoItemSped.Servicos), [itens]);
    const ajudaMunicipio = exigeMunicipioIss ? 'Obrigatório: há item de serviço no documento e o ISS depende do município.' : 'Exigido quando houver ISS, ou seja, quando algum item for de serviço.';

    const totalDocumento = useMemo(() => {
        const somaProdutos = itens.reduce((total, item) => total + (item.valorProduto || 0), 0);
        return somaProdutos + values.valorFreteTotal + values.valorSeguroTotal + values.valorOutrasDespesasTotal - values.valorDescontoTotal;
    }, [itens, values.valorFreteTotal, values.valorSeguroTotal, values.valorOutrasDespesasTotal, values.valorDescontoTotal]);

    if (!hasPermission('FISCAL_REGRAS_CONSULTAR')) {
        return <UnauthorizedState description="A simulação de tributação exige a permissão FISCAL_REGRAS_CONSULTAR." />;
    }

    const erroConhecido = describeTributacaoError(erro);

    const limparResultado = () => {
        setResultado(null);
        setErro(null);
    };

    const alterar = <K extends keyof SimuladorValues>(campo: K, valor: SimuladorValues[K]) => {
        limparResultado();
        setValues((current) => ({ ...current, [campo]: valor }));
    };

    const alterarItens = (proximos: ItemSimuladoValues[]) => {
        limparResultado();
        setItens(proximos);
    };

    const submit = async () => {
        limparResultado();

        const payload = {
            ...values,
            filialId: values.filialId || null,
            crtEmitente: values.crtEmitente,
            codigoMunicipioOrigem: values.codigoMunicipioOrigem || null,
            codigoMunicipioDestino: values.codigoMunicipioDestino || null,
            dataOperacao: toDateOnly(values.dataOperacao),
            itens: itens.map((item) => ({
                identificadorItem: item.identificadorItem || null,
                origemMercadoria: item.origemMercadoria,
                tipoItem: item.tipoItem,
                ncmId: item.ncmId || null,
                cfopId: item.cfopId || null,
                ncmCodigo: item.ncmCodigo || null,
                cestCodigo: item.cestCodigo || null,
                cfopCodigo: item.cfopCodigo || null,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                valorProduto: item.valorProduto
            }))
        };

        const parsed = simularTributacaoSchema.safeParse(payload);
        if (!parsed.success) {
            const mapped = validationErrorFromIssues(parsed.error.issues);
            setErro(mapped);
            toast.warn('Simulação de tributação', mapped.message);
            return;
        }

        try {
            const response = await simular.mutateAsync(parsed.data);
            setResultado(response);
            toast.success('Simulação de tributação', `Cálculo concluído para ${response.itens.length} item(ns).`);
        } catch (error) {
            const mapped = mapApiError(error);
            setErro(mapped);
            toast.error('Simulação de tributação', mapped.message);
        }
    };

    return (
        <>
            <PageHeader
                title="Simulador de tributação"
                description="Calcule ICMS, ICMS-ST, DIFAL, FCP, IPI, PIS/COFINS, ISS e retenções de uma operação completa. A simulação é somente leitura: não gera documento nem consome numeração."
                actions={
                    <Link href="/fiscal/regras">
                        <Button type="button" label="Regras fiscais" icon="pi pi-sliders-h" outlined />
                    </Link>
                }
            />

            {erroConhecido ? (
                <Message
                    severity={tributacaoErrorSeverity(erro)}
                    className="w-full mb-3"
                    content={
                        <div className="flex flex-column gap-1 line-height-3">
                            <strong>{erroConhecido.titulo}</strong>
                            <span>{erroConhecido.mensagem}</span>
                            {erroConhecido.acao ? <span>{erroConhecido.acao}</span> : null}
                            {erroConhecido.kind === 'carga' ? <span className="text-sm">Carga de tabela pendente no backend — não é erro de preenchimento e não há ação do usuário nesta tela.</span> : null}
                        </div>
                    }
                />
            ) : null}

            <ApiErrorPanel error={erro} title="Não foi possível simular a tributação." />

            {resultado === null && erro !== null ? (
                <Message severity="warn" className="w-full mb-3" text="Nenhum total é exibido quando o cálculo falha: o motor não devolve resultado parcial, e somar apenas os itens que deram certo esconderia tributo faltando." />
            ) : null}

            <Card title="Operação" className="mb-3">
                <form
                    className="grid formgrid p-fluid"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <Campo label="Empresa" htmlFor="empresaId">
                        <EmpresaSelect value={values.empresaId || null} required onChange={(value) => setValues((current) => ({ ...current, empresaId: value ?? '', filialId: '' }))} />
                    </Campo>
                    <Campo label="Filial" htmlFor="filialId">
                        <FilialSelect empresaId={values.empresaId || null} value={values.filialId || null} onChange={(value) => alterar('filialId', value ?? '')} />
                    </Campo>
                    <Campo label="Tipo de operação" htmlFor="tipoOperacao">
                        <Dropdown inputId="tipoOperacao" value={values.tipoOperacao} options={tipoOperacaoOptions} onChange={(event) => alterar('tipoOperacao', Number(event.value))} />
                    </Campo>
                    <Campo label="Regime tributário" htmlFor="regimeEmpresa">
                        <Dropdown inputId="regimeEmpresa" value={values.regimeEmpresa} options={regimeTributarioOptions} onChange={(event) => alterar('regimeEmpresa', Number(event.value))} />
                    </Campo>
                    <Campo label="CRT do emitente" htmlFor="crtEmitente">
                        <Dropdown
                            inputId="crtEmitente"
                            value={values.crtEmitente}
                            options={crtOptions}
                            showClear
                            placeholder="Usar o regime"
                            onChange={(event) => alterar('crtEmitente', event.value === null || event.value === undefined ? null : Number(event.value))}
                        />
                    </Campo>
                    <Campo label="UF de origem" htmlFor="ufOrigem">
                        <InputText id="ufOrigem" value={values.ufOrigem} maxLength={2} onChange={(event) => alterar('ufOrigem', event.target.value.toUpperCase())} />
                    </Campo>
                    <Campo label="UF de destino" htmlFor="ufDestino">
                        <InputText id="ufDestino" value={values.ufDestino} maxLength={2} onChange={(event) => alterar('ufDestino', event.target.value.toUpperCase())} />
                        <small className="text-color-secondary block mt-1">Use EX para operação com o exterior.</small>
                    </Campo>
                    <Campo label="Data da operação" htmlFor="dataOperacao">
                        <Calendar inputId="dataOperacao" value={values.dataOperacao} dateFormat="dd/mm/yy" showIcon onChange={(event) => alterar('dataOperacao', (event.value as Date) ?? new Date())} />
                        <small className="text-color-secondary block mt-1">Resolve toda a vigência: regra, exceção, alíquota interestadual, FCP e teto do INSS.</small>
                    </Campo>
                    <Campo label="Indicador do destinatário" htmlFor="indicadorContribuinteDestinatario">
                        <Dropdown
                            inputId="indicadorContribuinteDestinatario"
                            value={values.indicadorContribuinteDestinatario}
                            options={indicadorContribuinteOptions}
                            onChange={(event) => alterar('indicadorContribuinteDestinatario', Number(event.value))}
                        />
                    </Campo>
                    <Campo label="Finalidade" htmlFor="finalidade">
                        <Dropdown inputId="finalidade" value={values.finalidade} options={finalidadeOptions} onChange={(event) => alterar('finalidade', Number(event.value))} />
                    </Campo>
                    <Campo label="Natureza do tomador do serviço" htmlFor="naturezaTomadorServico">
                        <Dropdown inputId="naturezaTomadorServico" value={values.naturezaTomadorServico} options={naturezaTomadorOptions} onChange={(event) => alterar('naturezaTomadorServico', Number(event.value))} />
                        <small className="text-color-secondary block mt-1">Decide as retenções na fonte dos itens de serviço.</small>
                    </Campo>
                    <Campo label="Código do município de origem" htmlFor="codigoMunicipioOrigem">
                        <InputText id="codigoMunicipioOrigem" value={values.codigoMunicipioOrigem} maxLength={7} required={exigeMunicipioIss} onChange={(event) => alterar('codigoMunicipioOrigem', event.target.value)} />
                        <small className="text-color-secondary block mt-1">{ajudaMunicipio}</small>
                    </Campo>
                    <Campo label="Código do município de destino" htmlFor="codigoMunicipioDestino">
                        <InputText id="codigoMunicipioDestino" value={values.codigoMunicipioDestino} maxLength={7} required={exigeMunicipioIss} onChange={(event) => alterar('codigoMunicipioDestino', event.target.value)} />
                        <small className="text-color-secondary block mt-1">{ajudaMunicipio}</small>
                    </Campo>

                    <div className="field col-12 flex flex-column gap-2">
                        <div className="flex align-items-center gap-2">
                            <Checkbox inputId="consumidorFinal" checked={values.consumidorFinal} onChange={(event) => alterar('consumidorFinal', Boolean(event.checked))} />
                            <label htmlFor="consumidorFinal">Consumidor final (com o indicador do destinatário, decide o DIFAL)</label>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <Checkbox inputId="emitenteContribuinteIpi" checked={values.emitenteContribuinteIpi} onChange={(event) => alterar('emitenteContribuinteIpi', Boolean(event.checked))} />
                            <label htmlFor="emitenteContribuinteIpi">Emitente é contribuinte do IPI (decide se há IPI a calcular)</label>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <Checkbox inputId="destinatarioContribuinteIpi" checked={values.destinatarioContribuinteIpi} onChange={(event) => alterar('destinatarioContribuinteIpi', Boolean(event.checked))} />
                            <label htmlFor="destinatarioContribuinteIpi">Destinatário é contribuinte do IPI (decide se o IPI entra na base do ICMS)</label>
                        </div>
                    </div>

                    <div className="field col-12">
                        <h3 className="text-lg font-semibold mb-1">Totais do documento</h3>
                        <Message
                            severity="info"
                            className="w-full"
                            text="Frete, seguro, outras despesas e desconto são do documento inteiro. O backend rateia proporcionalmente ao valor de cada produto e joga o resíduo de centavos no item de maior valor — ratear de novo aqui produziria diferença de centavo e rejeição da NF-e."
                        />
                    </div>
                    <Campo label="Frete total" htmlFor="valorFreteTotal">
                        <InputNumber inputId="valorFreteTotal" value={values.valorFreteTotal} mode="currency" currency="BRL" locale="pt-BR" min={0} onValueChange={(event) => alterar('valorFreteTotal', Number(event.value ?? 0))} />
                    </Campo>
                    <Campo label="Seguro total" htmlFor="valorSeguroTotal">
                        <InputNumber inputId="valorSeguroTotal" value={values.valorSeguroTotal} mode="currency" currency="BRL" locale="pt-BR" min={0} onValueChange={(event) => alterar('valorSeguroTotal', Number(event.value ?? 0))} />
                    </Campo>
                    <Campo label="Outras despesas" htmlFor="valorOutrasDespesasTotal">
                        <InputNumber
                            inputId="valorOutrasDespesasTotal"
                            value={values.valorOutrasDespesasTotal}
                            mode="currency"
                            currency="BRL"
                            locale="pt-BR"
                            min={0}
                            onValueChange={(event) => alterar('valorOutrasDespesasTotal', Number(event.value ?? 0))}
                        />
                    </Campo>
                    <Campo label="Desconto total" htmlFor="valorDescontoTotal">
                        <InputNumber inputId="valorDescontoTotal" value={values.valorDescontoTotal} mode="currency" currency="BRL" locale="pt-BR" min={0} onValueChange={(event) => alterar('valorDescontoTotal', Number(event.value ?? 0))} />
                    </Campo>

                    <div className="field col-12 flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2">
                        <span className="text-color-secondary">Valor do documento (produtos + acessórias − desconto): {formatMoeda(totalDocumento)}</span>
                        <Button type="submit" label="Simular tributação" icon="pi pi-calculator" loading={simular.isPending} />
                    </div>
                </form>
            </Card>

            <Card title="Itens" className="mb-3">
                <ItensTributaveisGrid itens={itens} disabled={simular.isPending} onChange={alterarItens} />
            </Card>

            {resultado ? (
                <Card title="Resultado por item">
                    <ResultadoTributacaoPanel itens={resultado.itens} />
                </Card>
            ) : (
                <Card title="Resultado por item">
                    <span className="text-color-secondary">Nenhuma simulação executada nesta sessão.</span>
                </Card>
            )}
        </>
    );
};
