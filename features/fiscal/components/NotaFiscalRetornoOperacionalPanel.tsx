'use client';

import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ConsultaProtocoloSefazResponse, DocumentoAuxiliarFiscalResponse, NotaFiscalXmlPipelineResponse, TransmissaoSefazResponse } from '@/features/fiscal/types/fiscal.types';
import { alertasDoRetorno, tipoXmlFiscalLabel } from '@/features/fiscal/components/fiscalUiUtils';

// D43 P-1: texto de abertura fixo, exigido pelo AC-4, antes de um Message warn por alerta (chave por índice)
const ALERTAS_INTRO = 'A operação foi concluída e o backend registrou alerta(s) que exigem ação:';

const AlertasOperacionais = ({ alertas }: { alertas: string[] }) => {
    if (alertas.length === 0) return null;
    return (
        <>
            <Message severity="warn" className="w-full mb-2" text={ALERTAS_INTRO} />
            {alertas.map((alerta, index) => (
                <Message key={index} severity="warn" className="w-full mb-2" text={alerta} />
            ))}
        </>
    );
};

export type NotaFiscalRetornoOperacionalPanelProps = {
    xml?: NotaFiscalXmlPipelineResponse | null;
    transmissao?: TransmissaoSefazResponse | null;
    consulta?: ConsultaProtocoloSefazResponse | null;
    documento?: DocumentoAuxiliarFiscalResponse | null;
};

// Substitui o ResponsePanel antigo (NotaFiscalDetalhePage.tsx): mesmo conteúdo para xml/transmissão/documento,
// acrescido dos alertas de transmissão/reprocessamento e de consulta de protocolo (D43 P-1, P-3).
export const NotaFiscalRetornoOperacionalPanel = ({ xml, transmissao, consulta, documento }: NotaFiscalRetornoOperacionalPanelProps) => {
    if (!xml && !transmissao && !consulta && !documento) return null;
    return (
        <Card title="Último retorno operacional" className="mb-3">
            {xml ? <Message severity="info" className="w-full mb-2" text={`XML ${tipoXmlFiscalLabel(xml.tipoXml)} gerado. Schema validado: ${xml.schemaValidado ? 'sim' : 'não'}. Armazenado: ${xml.armazenado ? 'sim' : 'não'}.`} /> : null}
            {transmissao ? <Message severity={transmissao.autorizada ? 'success' : 'warn'} className="w-full mb-2" text={`${transmissao.codigoStatus ?? '-'} • ${transmissao.motivo ?? 'Sem motivo retornado'}${transmissao.deveReprocessar ? ' • Reprocessamento recomendado.' : ''}`} /> : null}
            <AlertasOperacionais alertas={alertasDoRetorno(transmissao)} />
            <AlertasOperacionais alertas={alertasDoRetorno(consulta)} />
            {documento ? <Message severity="success" className="w-full" text={`Documento ${documento.nomeArquivo} gerado com hash ${documento.hashSha256}.`} /> : null}
        </Card>
    );
};
