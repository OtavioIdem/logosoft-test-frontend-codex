'use client';

import Link from 'next/link';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { formatPercentual } from '@/features/tributacao/components/tributacaoUiUtils';
import { ResultadoTributacao } from '@/features/tributacao/types/tributacao.types';

/**
 * A trilha existe para o cálculo ser **explicável sem refazê-lo** — é o que a auditoria fiscal exige e o que
 * faz o time confiar no motor. `regraAplicadaId`/`excecaoAplicadaId` dizem o que produziu o número; cada
 * bloco traz base, alíquota e os fatores usados (no ST, qual MVA e se foi a ajustada).
 */
export const TrilhaCalculoPanel = ({ resultado }: { resultado: ResultadoTributacao }) => {
    const fatores: string[] = [];

    if (resultado.icms) {
        fatores.push(`ICMS: base ${formatPercentual(100 - resultado.icms.percentualReducaoBase)} da integral, alíquota ${formatPercentual(resultado.icms.aliquota)}`);
    }
    if (resultado.icmsSt) {
        fatores.push(`ICMS-ST: MVA ${formatPercentual(resultado.icmsSt.mva)}${resultado.icmsSt.mvaAjustadaAplicada ? ' (ajustada)' : ' (original)'}, alíquota interna ${formatPercentual(resultado.icmsSt.aliquotaInternaDestino)}`);
    }
    if (resultado.difal) {
        fatores.push(`DIFAL: interestadual ${formatPercentual(resultado.difal.aliquotaInterestadual)} → interna ${formatPercentual(resultado.difal.aliquotaInternaDestino)}${resultado.difal.baseDuplaAplicada ? ', base dupla' : ''}`);
    }
    if (resultado.ipi) {
        fatores.push(`IPI: CST ${resultado.ipi.cstCodigo}, enquadramento ${resultado.ipi.codigoEnquadramento}`);
    }
    if (resultado.pis && resultado.cofins) {
        fatores.push(`PIS/COFINS: CST ${resultado.pis.cstCodigo}/${resultado.cofins.cstCodigo}, alíquotas ${formatPercentual(resultado.pis.aliquota)} e ${formatPercentual(resultado.cofins.aliquota)}`);
    }
    if (resultado.iss) {
        fatores.push(`ISS: serviço ${resultado.iss.codigoServicoLc116}, município ${resultado.iss.codigoMunicipioIncidencia}`);
    }

    return (
        <Panel header="Como este imposto foi calculado" toggleable collapsed className="mt-3">
            <div className="flex flex-column gap-2 text-sm line-height-3">
                <div className="flex flex-column md:flex-row md:align-items-center gap-2">
                    <span className="text-color-secondary">Regra fiscal aplicada:</span>
                    {resultado.regraAplicadaId ? (
                        <Link href={`/fiscal/regras?regraId=${resultado.regraAplicadaId}`}>
                            <Button type="button" label="Abrir regra aplicada" icon="pi pi-external-link" text size="small" />
                        </Link>
                    ) : (
                        <span>Nenhuma regra registrada na trilha.</span>
                    )}
                </div>
                {/* `excecaoAplicadaId` é um GUID cru: o contrato não distingue exceção geral de exceção por NCM.
                    O link aponta para a variante geral, e o modal de lá oferece o salto para a outra quando o id
                    não existir naquele cadastro. */}
                <div className="flex flex-column md:flex-row md:align-items-center gap-2">
                    <span className="text-color-secondary">Exceção/benefício aplicado:</span>
                    {resultado.excecaoAplicadaId ? (
                        <Link href={`/fiscal/excecoes?excecaoId=${resultado.excecaoAplicadaId}`}>
                            <Button type="button" label="Abrir exceção aplicada" icon="pi pi-external-link" text size="small" />
                        </Link>
                    ) : (
                        <span>Nenhuma exceção sobrepôs a regra geral.</span>
                    )}
                </div>
                {fatores.length ? (
                    <ul className="m-0 pl-3">
                        {fatores.map((fator) => (
                            <li key={fator}>{fator}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        </Panel>
    );
};
