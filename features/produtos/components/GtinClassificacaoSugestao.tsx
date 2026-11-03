'use client';

// Sugestão de classificação IBS/CBS por GTIN na aba "Dados fiscais" do produto (v1.11.0a8b80, D111). Painel de LEITURA,
// sob demanda: abrir a aba ou o diálogo não consulta nada. A única cópia possível é o NCM ("Usar este NCM"), pelo mesmo
// `trocarNcm` do select; o cClassTrib não é copiável (o formulário não tem o campo). Nunca bloqueia o salvar.

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { useGtinClassificacao } from '@/features/fiscal/hooks/useCadastrosFiscais';
import { GTIN_FORMATO_INVALIDO_CODE, gtinClassificacaoLabels as labels } from '@/features/produtos/components/gtinClassificacaoLabels';
import { escolherGtinParaConsulta, formatarDataIso, formatarPercentual, gtinEhConsultavel, ncmSugeridoDifereDoAtual } from '@/features/produtos/components/gtinClassificacaoUtils';
import { CodigoBarrasProdutoResponse } from '@/features/produtos/types/produtos.types';
import { mapApiError } from '@/lib/http/apiError';

type GtinClassificacaoSugestaoProps = {
    codigosBarras?: CodigoBarrasProdutoResponse[] | null;
    ncmAtual?: string | null;
    onUsarNcm: (ncmCodigo: string) => void;
};

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
    <div className="col-12 md:col-4">
        <dt className="text-color-secondary text-sm">{rotulo}</dt>
        <dd className="m-0 font-medium">{children}</dd>
    </div>
);

export const GtinClassificacaoSugestao = ({ codigosBarras, ncmAtual, onUsarNcm }: GtinClassificacaoSugestaoProps) => {
    const gtin = escolherGtinParaConsulta(codigosBarras);
    const consultavel = gtinEhConsultavel(gtin);
    const consulta = useGtinClassificacao(consultavel ? gtin : null);
    // O cache do React Query sobrevive entre aberturas: só se mostra resultado depois de um clique desta montagem.
    const [consultado, setConsultado] = useState(false);

    // Sem permissão: sem botão, sem painel (o contrato manda esconder, não explicar com erro).
    if (!consulta.permitido) return null;

    const consultar = () => {
        setConsultado(true);
        void consulta.refetch();
    };

    const apiError = consulta.error ? mapApiError(consulta.error) : null;
    // 403 é "sem permissão no backend" (contrato G1): esconde o painel inteiro, sem mensagem de erro.
    if (consultado && apiError?.status === 403) return null;

    const resultado = consultado && !consulta.isFetching && !apiError ? consulta.data : undefined;
    const classificacao = resultado?.encontrado ? resultado.classificacao : null;
    const mostrarUsarNcm = Boolean(classificacao) && ncmSugeridoDifereDoAtual(classificacao?.ncmCodigo, ncmAtual);

    return (
        <section aria-label={labels.regiao} className="surface-50 border-1 surface-border border-round p-3 mb-3">
            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <h4 className="m-0">{labels.titulo}</h4>
                {consultavel ? <Button type="button" label={labels.botao} icon="pi pi-search" size="small" severity="secondary" outlined loading={consulta.isFetching} onClick={consultar} title={labels.botaoAjuda} /> : null}
            </div>

            {!gtin ? <p className="text-600 mt-2 mb-0">{labels.semCodigo}</p> : null}
            {gtin && !consultavel ? <p className="text-600 mt-2 mb-0">{labels.codigoForaDoFormato}</p> : null}

            {consultado && consulta.isFetching ? (
                <div role="status" aria-live="polite" className="flex align-items-center gap-2 mt-3">
                    <i className="pi pi-spin pi-spinner" aria-hidden="true" />
                    <span>{labels.carregando}</span>
                </div>
            ) : null}

            {consultado && apiError ? (
                <div className="mt-3 flex flex-column gap-2 align-items-start">
                    {apiError.code === GTIN_FORMATO_INVALIDO_CODE ? <Message severity="warn" className="w-full" text={labels.formatoInvalido} /> : <ApiErrorPanel error={apiError} title={labels.erroTitulo} />}
                    <Button type="button" label={labels.tentarNovamente} icon="pi pi-refresh" size="small" severity="secondary" outlined onClick={consultar} />
                </div>
            ) : null}

            {resultado && !resultado.encontrado ? <Message severity="info" className="w-full mt-3" text={labels.naoEncontrado} /> : null}

            {classificacao ? (
                <div className="mt-3">
                    <dl className="grid m-0">
                        <Campo rotulo={labels.campos.gtin}>{resultado?.gtin}</Campo>
                        <Campo rotulo={labels.campos.anexo}>{classificacao.anexo}</Campo>
                        <Campo rotulo={labels.campos.item}>{[classificacao.itemAnexo, classificacao.descricaoItemAnexo].filter(Boolean).join(' — ')}</Campo>
                        <Campo rotulo={labels.campos.ncm}>{classificacao.ncmCodigo}</Campo>
                        <Campo rotulo={labels.campos.cClassTrib}>{classificacao.classificacaoTributaria}</Campo>
                        <Campo rotulo={labels.campos.cstIbsCbs}>{classificacao.cstIbsCbs}</Campo>
                        <Campo rotulo={labels.campos.reducaoIbs}>{formatarPercentual(classificacao.percentualReducaoIbs)}</Campo>
                        <Campo rotulo={labels.campos.reducaoCbs}>{formatarPercentual(classificacao.percentualReducaoCbs)}</Campo>
                        <Campo rotulo={labels.campos.vigencia}>{classificacao.vigenciaFim ? `${formatarDataIso(classificacao.vigenciaInicio)} a ${formatarDataIso(classificacao.vigenciaFim)}` : `desde ${formatarDataIso(classificacao.vigenciaInicio)}`}</Campo>
                        {classificacao.descricao ? <Campo rotulo={labels.campos.descricao}>{classificacao.descricao}</Campo> : null}
                    </dl>
                    {classificacao.alternativas ? (
                        <div className="mt-2">
                            <div className="text-color-secondary text-sm">{labels.outrasClassificacoes}</div>
                            <p className="m-0">{classificacao.alternativas}</p>
                        </div>
                    ) : null}
                    {mostrarUsarNcm ? (
                        <div className="mt-3">
                            <Button type="button" label={labels.usarNcm} icon="pi pi-check" size="small" onClick={() => onUsarNcm(classificacao!.ncmCodigo)} title={labels.usarNcmAjuda} aria-label={`${labels.usarNcm} ${classificacao!.ncmCodigo}`} />
                        </div>
                    ) : null}
                </div>
            ) : null}

            <small className="block text-color-secondary mt-3">{labels.aviso}</small>
        </section>
    );
};
