'use client';

// Painel "Resultado da última confirmação" (v1.11.0a8b71, D93). Mostra o que o backend devolveu no 200 do
// Confirmar (`ConfirmarFaturamentoUseCase.cs:367-374`): a etapa real, o leg que parou com o motivo gravado
// (lido por `legQueParou`, a mesma fonte da tabela de legs, D30), os alertas e o id de correlação enviado
// (D92), somente leitura. Forma copiada do "Último retorno operacional" do Fiscal, sem extrair componente.

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { FATURAMENTO_RESULTADO, resumoResultadoConfirmacao, statusFaturamentoLabel, statusFaturamentoSeverity } from '@/features/faturamento/components/faturamentoLabels';
import { ResultadoConfirmacaoFaturamento } from '@/features/faturamento/types/faturamento.types';

export const ResultadoConfirmacaoPanel = ({
    resultado,
    podeConfirmarDeNovo,
    onConfirmarDeNovo
}: {
    resultado: ResultadoConfirmacaoFaturamento;
    podeConfirmarDeNovo: boolean;
    onConfirmarDeNovo: () => void;
}) => {
    const faturamento = resultado.resposta.faturamento;
    const etapa = Number(faturamento.etapa);
    const resumo = resumoResultadoConfirmacao(faturamento);
    const alertas = (resultado.resposta.alertas ?? []).filter((alerta) => typeof alerta === 'string' && alerta.trim() !== '');

    return (
        <Card title={FATURAMENTO_RESULTADO.cardTitulo} className="mb-3">
            <Message className="w-full mb-3" severity={resumo.severity} text={`${resumo.titulo}. ${resumo.detalhe}`} />
            <div className="grid">
                <div className="col-12 md:col-3">
                    <span className="block text-color-secondary text-sm">{FATURAMENTO_RESULTADO.etapaRotulo}</span>
                    <Tag value={statusFaturamentoLabel(etapa)} severity={statusFaturamentoSeverity(etapa) ?? undefined} />
                </div>
                <div className="col-12 md:col-9">
                    <label htmlFor="fatResultadoCorrelation" className="block text-color-secondary text-sm">{FATURAMENTO_RESULTADO.correlationIdRotulo}</label>
                    <InputText id="fatResultadoCorrelation" value={resultado.correlationId} readOnly className="w-full" />
                    <small className="text-color-secondary block mt-1">{FATURAMENTO_RESULTADO.correlationIdAjuda}</small>
                </div>
            </div>
            {!resumo.concluido ? <Message className="w-full mt-3" severity="info" text={FATURAMENTO_RESULTADO.proximoPasso} /> : null}
            {alertas.length > 0 ? (
                <div className="mt-3 flex flex-column gap-2">
                    <span className="text-color-secondary text-sm">{FATURAMENTO_RESULTADO.alertasTitulo}</span>
                    {alertas.map((alerta, indice) => (
                        <Message key={`${indice}-${alerta}`} className="w-full" severity="warn" text={alerta} />
                    ))}
                </div>
            ) : null}
            {!resumo.concluido && podeConfirmarDeNovo ? (
                <div className="mt-3">
                    <Button type="button" label={FATURAMENTO_RESULTADO.confirmarDeNovo} icon="pi pi-replay" outlined onClick={onConfirmarDeNovo} />
                </div>
            ) : null}
        </Card>
    );
};
