'use client';

import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { TrilhaCalculoPanel } from '@/features/tributacao/components/TrilhaCalculoPanel';
import {
    formatMoeda,
    formatPercentual,
    formatQuantidade,
    municipioIncidenciaIssLabel,
    situacaoRetencaoLabel,
    situacaoRetencaoSeveridade,
    tratamentoIcmsLabel,
    tratamentoIpiLabel,
    tratamentoPisCofinsLabel
} from '@/features/tributacao/components/tributacaoUiUtils';
import { ResultadoTributacao, ResultadoTributacaoItemDocumento } from '@/features/tributacao/types/tributacao.types';

/**
 * Leitura do resultado do motor. **A regra que não pode ser errada: bloco `null` significa "não calculado",
 * nunca "não devido"** — e `null` jamais é renderizado como `0,00`. Bloco nulo some da lista de tributos e
 * aparece na faixa "não aplicáveis a este item", com o motivo. Valor zero **com** bloco preenchido é outra
 * coisa (isenção, alíquota zero, retenção dispensada) e aí o zero é a informação, então é exibido.
 */

const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
    <div className="flex justify-content-between gap-3 py-1 border-bottom-1 surface-border">
        <span className="text-color-secondary">{rotulo}</span>
        <span className="font-medium text-right">{valor}</span>
    </div>
);

const BlocoTributo = ({ titulo, destaque, children }: { titulo: string; destaque?: string; children: React.ReactNode }) => (
    <div className="col-12 lg:col-6">
        <div className="surface-card border-1 surface-border border-round p-3 h-full">
            <div className="flex align-items-center justify-content-between mb-2">
                <h4 className="m-0 text-base font-semibold">{titulo}</h4>
                {destaque ? <span className="font-semibold">{destaque}</span> : null}
            </div>
            <div className="text-sm">{children}</div>
        </div>
    </div>
);

/**
 * Motivo de cada bloco nulo, sempre derivado do que o contrato afirma ou do que o próprio resultado informa —
 * nunca inferido. `comportaSubstituicaoTributaria` e `retidoAnteriormente` vêm no bloco de ICMS justamente
 * para explicar o `icmsSt` nulo; os demais motivos são as equivalências que o contrato fixa (item de serviço
 * não apura ICMS/IPI, item de mercadoria não apura ISS/retenções, IPI nulo = emitente não contribuinte).
 */
const motivoIcmsStNulo = (resultado: ResultadoTributacao) => {
    if (resultado.iss) return 'item de serviço';
    if (resultado.icms?.retidoAnteriormente) return 'ICMS-ST retido anteriormente';
    if (resultado.icms && !resultado.icms.comportaSubstituicaoTributaria) return 'a situação tributária não comporta ST';
    return undefined;
};

const naoCalculados = (item: ResultadoTributacaoItemDocumento) => {
    const { resultado } = item;
    const ehServico = Boolean(resultado.iss);
    const ehMercadoria = Boolean(resultado.icms);
    const pendentes: { tributo: string; motivo?: string }[] = [];

    if (!resultado.icms) pendentes.push({ tributo: 'ICMS próprio', motivo: ehServico ? 'item de serviço' : undefined });
    if (!resultado.icmsSt) pendentes.push({ tributo: 'ICMS-ST', motivo: motivoIcmsStNulo(resultado) });
    if (!resultado.difal) pendentes.push({ tributo: 'DIFAL', motivo: ehServico ? 'item de serviço' : 'fora da hipótese de consumidor final não contribuinte interestadual' });
    if (!resultado.ipi) pendentes.push({ tributo: 'IPI', motivo: ehServico ? 'item de serviço' : 'emitente não é contribuinte do IPI' });
    if (!resultado.pis) pendentes.push({ tributo: 'PIS' });
    if (!resultado.cofins) pendentes.push({ tributo: 'COFINS' });
    if (!resultado.iss) pendentes.push({ tributo: 'ISS', motivo: ehMercadoria ? 'item de mercadoria' : undefined });
    if (!resultado.retencoes) pendentes.push({ tributo: 'Retenções na fonte', motivo: ehMercadoria ? 'item de mercadoria' : undefined });

    return pendentes.map(({ tributo, motivo }) => (motivo ? `${tributo} (${motivo})` : tributo));
};

export const ResultadoTributacaoItemPanel = ({ item }: { item: ResultadoTributacaoItemDocumento }) => {
    const { resultado, valoresUtilizados } = item;
    const pendentes = naoCalculados(item);

    return (
        <div className="surface-card border-1 surface-border border-round p-3 mb-3">
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
                <h3 className="m-0 text-lg font-semibold">
                    Item {item.indice + 1}
                    {item.identificadorItem ? <span className="text-color-secondary font-normal ml-2">· origem {item.identificadorItem}</span> : null}
                </h3>
            </div>

            <div className="grid">
                <div className="col-12 lg:col-6">
                    <div className="surface-50 border-round p-3 h-full">
                        <h4 className="mt-0 mb-2 text-base font-semibold">Valores utilizados</h4>
                        <p className="mt-0 mb-2 text-sm text-color-secondary line-height-3">Frete, seguro, despesas e desconto já vêm rateados pelo backend. A soma dos itens fecha exatamente com o total do documento — não refaça o rateio na tela.</p>
                        <div className="text-sm">
                            <Linha rotulo="Quantidade" valor={formatQuantidade(valoresUtilizados.quantidade)} />
                            <Linha rotulo="Valor unitário" valor={formatMoeda(valoresUtilizados.valorUnitario)} />
                            <Linha rotulo="Valor do produto" valor={formatMoeda(valoresUtilizados.valorProduto)} />
                            <Linha rotulo="Frete rateado" valor={formatMoeda(valoresUtilizados.valorFreteRateado)} />
                            <Linha rotulo="Seguro rateado" valor={formatMoeda(valoresUtilizados.valorSeguroRateado)} />
                            <Linha rotulo="Outras despesas rateadas" valor={formatMoeda(valoresUtilizados.valorOutrasDespesasRateado)} />
                            <Linha rotulo="Desconto rateado" valor={formatMoeda(valoresUtilizados.valorDescontoRateado)} />
                            <Linha rotulo="Base bruta" valor={formatMoeda(valoresUtilizados.baseBruta)} />
                        </div>
                    </div>
                </div>

                {resultado.icms ? (
                    <BlocoTributo titulo="ICMS próprio" destaque={formatMoeda(resultado.icms.valor)}>
                        <Linha rotulo="Situação" valor={`${resultado.icms.situacao.campoXmlCodigoSituacao} ${resultado.icms.situacao.codigoSituacao}`} />
                        <Linha rotulo="Tratamento" valor={tratamentoIcmsLabel(resultado.icms.tratamento)} />
                        <Linha rotulo="Base integral" valor={formatMoeda(resultado.icms.baseIntegral)} />
                        <Linha rotulo="Redução da base" valor={formatPercentual(resultado.icms.percentualReducaoBase)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.icms.baseCalculo)} />
                        <Linha rotulo="Alíquota" valor={formatPercentual(resultado.icms.aliquota)} />
                        <Linha rotulo="Valor diferido" valor={formatMoeda(resultado.icms.valorDiferido)} />
                        <Linha rotulo="FCP" valor={`${formatPercentual(resultado.icms.percentualFcp)} · ${formatMoeda(resultado.icms.valorFcp)}`} />
                        <Linha rotulo="Crédito Simples Nacional" valor={`${formatPercentual(resultado.icms.percentualCreditoSimplesNacional)} · ${formatMoeda(resultado.icms.valorCreditoSimplesNacional)}`} />
                        <Linha rotulo="Total com FCP" valor={formatMoeda(resultado.icms.totalComFcp)} />
                        {/* Explicam o `icmsSt` nulo sem o operador precisar deduzir: é o que a auditoria pergunta. */}
                        <Linha rotulo="Comporta ICMS-ST" valor={resultado.icms.comportaSubstituicaoTributaria ? 'Sim' : 'Não'} />
                        <Linha rotulo="ST retida anteriormente" valor={resultado.icms.retidoAnteriormente ? 'Sim' : 'Não'} />
                        {resultado.icms.codigoBeneficioFiscal ? <Linha rotulo="Código do benefício" valor={resultado.icms.codigoBeneficioFiscal} /> : null}
                    </BlocoTributo>
                ) : null}

                {resultado.icmsSt ? (
                    <BlocoTributo titulo="ICMS-ST" destaque={formatMoeda(resultado.icmsSt.valor)}>
                        <Linha rotulo="MVA aplicada" valor={`${formatPercentual(resultado.icmsSt.mva)}${resultado.icmsSt.mvaAjustadaAplicada ? ' (ajustada)' : ''}`} />
                        <Linha rotulo="Base de componentes" valor={formatMoeda(resultado.icmsSt.baseComponentes)} />
                        <Linha rotulo="Base integral" valor={formatMoeda(resultado.icmsSt.baseIntegral)} />
                        <Linha rotulo="Redução da base de ST" valor={formatPercentual(resultado.icmsSt.percentualReducaoBaseSt)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.icmsSt.baseCalculo)} />
                        <Linha rotulo="Alíquota interna de destino" valor={formatPercentual(resultado.icmsSt.aliquotaInternaDestino)} />
                        <Linha rotulo="ICMS próprio descontado" valor={formatMoeda(resultado.icmsSt.valorIcmsProprioDescontado)} />
                        <Linha rotulo="FCP-ST" valor={`${formatPercentual(resultado.icmsSt.percentualFcpSt)} · ${formatMoeda(resultado.icmsSt.valorFcpSt)}`} />
                        <Linha rotulo="Total com FCP-ST" valor={formatMoeda(resultado.icmsSt.totalComFcpSt)} />
                    </BlocoTributo>
                ) : null}

                {resultado.difal ? (
                    <BlocoTributo titulo="DIFAL" destaque={formatMoeda(resultado.difal.valor)}>
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.difal.baseCalculo)} />
                        <Linha rotulo="Base dupla aplicada" valor={resultado.difal.baseDuplaAplicada ? 'Sim' : 'Não'} />
                        <Linha rotulo="Alíquota interestadual" valor={formatPercentual(resultado.difal.aliquotaInterestadual)} />
                        <Linha rotulo="Alíquota interna de destino" valor={formatPercentual(resultado.difal.aliquotaInternaDestino)} />
                        <Linha rotulo="Partilha destino" valor={formatPercentual(resultado.difal.percentualPartilhaDestino)} />
                        <Linha rotulo="Valor destino" valor={formatMoeda(resultado.difal.valorDestino)} />
                        <Linha rotulo="Valor origem" valor={formatMoeda(resultado.difal.valorOrigem)} />
                        <Linha rotulo="FCP destino" valor={`${formatPercentual(resultado.difal.percentualFcpDestino)} · ${formatMoeda(resultado.difal.valorFcpDestino)}`} />
                        <Linha rotulo="Total destino" valor={formatMoeda(resultado.difal.totalDestino)} />
                    </BlocoTributo>
                ) : null}

                {resultado.ipi ? (
                    <BlocoTributo titulo="IPI" destaque={formatMoeda(resultado.ipi.valor)}>
                        <Linha rotulo="CST" valor={resultado.ipi.cstCodigo} />
                        <Linha rotulo="Tratamento" valor={tratamentoIpiLabel(resultado.ipi.tratamento)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.ipi.baseCalculo)} />
                        <Linha rotulo="Alíquota" valor={formatPercentual(resultado.ipi.aliquota)} />
                        <Linha rotulo="Valor por unidade" valor={formatMoeda(resultado.ipi.valorPorUnidade)} />
                        <Linha rotulo="Enquadramento (cEnq)" valor={resultado.ipi.codigoEnquadramento} />
                        <Linha rotulo="Credita na entrada" valor={resultado.ipi.indicadorCreditaEntrada ? 'Sim' : 'Não'} />
                    </BlocoTributo>
                ) : null}

                {resultado.pis ? (
                    <BlocoTributo titulo="PIS" destaque={formatMoeda(resultado.pis.valor)}>
                        <Linha rotulo="CST" valor={resultado.pis.cstCodigo} />
                        <Linha rotulo="Tratamento" valor={tratamentoPisCofinsLabel(resultado.pis.tratamento)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.pis.baseCalculo)} />
                        <Linha rotulo="Alíquota" valor={formatPercentual(resultado.pis.aliquota)} />
                        <Linha rotulo="Valor por unidade" valor={formatMoeda(resultado.pis.valorPorUnidade)} />
                        <Linha rotulo="Credita na entrada" valor={resultado.pis.indicadorCreditaEntrada ? 'Sim' : 'Não'} />
                    </BlocoTributo>
                ) : null}

                {resultado.cofins ? (
                    <BlocoTributo titulo="COFINS" destaque={formatMoeda(resultado.cofins.valor)}>
                        <Linha rotulo="CST" valor={resultado.cofins.cstCodigo} />
                        <Linha rotulo="Tratamento" valor={tratamentoPisCofinsLabel(resultado.cofins.tratamento)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.cofins.baseCalculo)} />
                        <Linha rotulo="Alíquota" valor={formatPercentual(resultado.cofins.aliquota)} />
                        <Linha rotulo="Valor por unidade" valor={formatMoeda(resultado.cofins.valorPorUnidade)} />
                        <Linha rotulo="Credita na entrada" valor={resultado.cofins.indicadorCreditaEntrada ? 'Sim' : 'Não'} />
                    </BlocoTributo>
                ) : null}

                {resultado.iss ? (
                    <BlocoTributo titulo="ISS" destaque={formatMoeda(resultado.iss.valor)}>
                        <Linha rotulo="Código de serviço (LC 116)" valor={resultado.iss.codigoServicoLc116} />
                        <Linha rotulo="Município de incidência" valor={`${municipioIncidenciaIssLabel(resultado.iss.municipioIncidencia)} · ${resultado.iss.codigoMunicipioIncidencia}`} />
                        <Linha rotulo="Base integral" valor={formatMoeda(resultado.iss.baseIntegral)} />
                        <Linha rotulo="Redução da base" valor={formatPercentual(resultado.iss.percentualReducaoBase)} />
                        <Linha rotulo="Base de cálculo" valor={formatMoeda(resultado.iss.baseCalculo)} />
                        <Linha rotulo="Alíquota" valor={formatPercentual(resultado.iss.aliquota)} />
                        <Linha rotulo="Retido pelo tomador" valor={resultado.iss.retido ? 'Sim' : 'Não'} />
                    </BlocoTributo>
                ) : null}

                {resultado.retencoes ? (
                    <BlocoTributo titulo="Retenções na fonte" destaque={formatMoeda(resultado.retencoes.valorTotalRetido)}>
                        <div className="flex align-items-center justify-content-between py-1 border-bottom-1 surface-border">
                            <span className="text-color-secondary">IRRF</span>
                            <span className="flex align-items-center gap-2">
                                <Tag value={situacaoRetencaoLabel(resultado.retencoes.irrf.situacao)} severity={situacaoRetencaoSeveridade(resultado.retencoes.irrf.situacao)} />
                                <span className="font-medium">{formatMoeda(resultado.retencoes.irrf.valor)}</span>
                            </span>
                        </div>
                        <Linha rotulo="IRRF · base e alíquota" valor={`${formatMoeda(resultado.retencoes.irrf.base)} · ${formatPercentual(resultado.retencoes.irrf.aliquota)}`} />
                        {/* Os limiares explicam o "Dispensado": sem eles o zero fica sem justificativa na tela. */}
                        <Linha rotulo="IRRF · mínimos" valor={`base ${formatMoeda(resultado.retencoes.irrf.baseMinima)} · recolhimento ${formatMoeda(resultado.retencoes.irrf.valorMinimoRecolhimento)}`} />
                        {resultado.retencoes.irrf.valorBruto !== resultado.retencoes.irrf.valor ? <Linha rotulo="IRRF · valor apurado antes do mínimo" valor={formatMoeda(resultado.retencoes.irrf.valorBruto)} /> : null}
                        <div className="flex align-items-center justify-content-between py-1 border-bottom-1 surface-border">
                            <span className="text-color-secondary">INSS</span>
                            <span className="flex align-items-center gap-2">
                                <Tag value={situacaoRetencaoLabel(resultado.retencoes.inss.situacao)} severity={situacaoRetencaoSeveridade(resultado.retencoes.inss.situacao)} />
                                <span className="font-medium">{formatMoeda(resultado.retencoes.inss.valor)}</span>
                            </span>
                        </div>
                        <Linha rotulo="INSS · base após teto" valor={`${formatMoeda(resultado.retencoes.inss.baseAposTeto)} (teto ${formatMoeda(resultado.retencoes.inss.teto)})`} />
                        <div className="flex align-items-center justify-content-between py-1 border-bottom-1 surface-border">
                            <span className="text-color-secondary">PCC (CSLL/PIS/COFINS)</span>
                            <span className="flex align-items-center gap-2">
                                <Tag value={situacaoRetencaoLabel(resultado.retencoes.pcc.situacao)} severity={situacaoRetencaoSeveridade(resultado.retencoes.pcc.situacao)} />
                                <span className="font-medium">{formatMoeda(resultado.retencoes.pcc.valorTotal)}</span>
                            </span>
                        </div>
                        <Linha rotulo="PCC · CSLL / PIS / COFINS" valor={`${formatMoeda(resultado.retencoes.pcc.valorCsll)} · ${formatMoeda(resultado.retencoes.pcc.valorPis)} · ${formatMoeda(resultado.retencoes.pcc.valorCofins)}`} />
                        <Linha rotulo="PCC · mínimo de dispensa" valor={formatMoeda(resultado.retencoes.pcc.minimoDispensa)} />
                        {resultado.retencoes.pcc.valorTotalBruto !== resultado.retencoes.pcc.valorTotal ? <Linha rotulo="PCC · valor apurado antes da dispensa" valor={formatMoeda(resultado.retencoes.pcc.valorTotalBruto)} /> : null}
                        <Linha rotulo="ISS retido" valor={resultado.retencoes.issRetido ? formatMoeda(resultado.retencoes.valorIssRetido) : 'Não retido'} />
                    </BlocoTributo>
                ) : null}
            </div>

            {pendentes.length ? <Message severity="info" className="w-full mt-2" text={`Não aplicável a este item: ${pendentes.join(', ')}. O motor não calculou estes tributos para a situação informada — não é "tributo zero".`} /> : null}

            <TrilhaCalculoPanel resultado={resultado} />
        </div>
    );
};

export const ResultadoTributacaoPanel = ({ itens }: { itens: ResultadoTributacaoItemDocumento[] }) => (
    <>
        {itens.map((item) => (
            <ResultadoTributacaoItemPanel key={`${item.indice}-${item.identificadorItem ?? ''}`} item={item} />
        ))}
    </>
);
