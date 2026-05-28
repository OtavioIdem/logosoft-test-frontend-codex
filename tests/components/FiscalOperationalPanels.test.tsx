import { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    ContingenciaResultPanel,
    FiscalDocumentosAuxiliaresPanel,
    FiscalPayloadResumo,
    StatusServicoResultPanel
} from '@/features/fiscal/components/FiscalOperationalPanels';
import { FormatoDocumentoAuxiliarFiscal, TipoContingenciaFiscal, TipoDocumentoAuxiliarFiscal, TipoDocumentoFiscal } from '@/types/erp';

vi.mock('@/components/security/PermissionGuard', () => ({
    PermissionGuard: ({ children }: { children: (value: { disabled: boolean }) => ReactNode }) => <>{children({ disabled: false })}</>
}));

describe('FiscalOperationalPanels', () => {
    it('exibe documentos auxiliares por metadados sem depender de GUID manual', () => {
        render(
            <FiscalDocumentosAuxiliaresPanel
                possuiDanfe
                documentos={[
                    {
                        id: '11111111-1111-1111-1111-111111111111',
                        notaFiscalId: '22222222-2222-2222-2222-222222222222',
                        tipo: TipoDocumentoAuxiliarFiscal.Danfe,
                        formato: FormatoDocumentoAuxiliarFiscal.Html,
                        nomeArquivo: 'danfe-1-900001.html',
                        contentType: 'text/html',
                        hashSha256: 'ABCDEF',
                        tamanhoBytes: 12345,
                        geradoEm: '2026-05-25T14:00:00+00:00',
                        geradoPor: '33333333-3333-3333-3333-333333333333',
                        alertas: []
                    }
                ]}
                onDownload={vi.fn()}
            />
        );

        expect(screen.getByText('DANFE')).toBeInTheDocument();
        expect(screen.getByText('HTML')).toBeInTheDocument();
        expect(screen.getByText('danfe-1-900001.html')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /baixar/i })).toBeInTheDocument();
    });

    it('mascara XML/payload sensível em painel operacional', () => {
        render(<FiscalPayloadResumo payload="payload=<NFe><emit><CNPJ>12345678000199</CNPJ></emit></NFe>; token=abc" />);

        expect(screen.getByText(/\[XML_MASKED\]/)).toBeInTheDocument();
        expect(screen.getByText(/Payload protegido/)).toBeInTheDocument();
        expect(screen.queryByText(/12345678000199/)).not.toBeInTheDocument();
        expect(screen.queryByText(/<emit>/)).not.toBeInTheDocument();
    });

    it('exibe resultado de status de serviço e contingência sem XML bruto', () => {
        render(
            <>
                <StatusServicoResultPanel
                    result={{
                        empresaId: '11111111-1111-1111-1111-111111111111',
                        filialId: null,
                        tipoDocumento: TipoDocumentoFiscal.NFe,
                        ambiente: 1,
                        ufAutorizadora: 'SP',
                        comunicacaoOk: true,
                        disponivel: false,
                        codigoStatus: '108',
                        motivo: 'Serviço paralisado momentaneamente',
                        deveReprocessar: true,
                        consultadoEm: '2026-05-25T14:00:00+00:00',
                        alertas: []
                    }}
                />
                <ContingenciaResultPanel
                    result={{
                        empresaId: '11111111-1111-1111-1111-111111111111',
                        filialId: null,
                        tipoDocumento: TipoDocumentoFiscal.NFe,
                        ambiente: 1,
                        ufAutorizadora: 'SP',
                        tipoContingencia: TipoContingenciaFiscal.OperacionalInterna,
                        permitida: true,
                        statusServicoIndisponivelDetectado: true,
                        codigoStatusServico: '108',
                        motivoStatusServico: 'Serviço paralisado momentaneamente',
                        motivoOperacional: 'Contingência operacional interna.',
                        avaliadaEm: '2026-05-25T14:00:00+00:00',
                        alertas: []
                    }}
                />
            </>
        );

        expect(screen.getByText('Serviço indisponível')).toBeInTheDocument();
        expect(screen.getByText('Reprocessar')).toBeInTheDocument();
        expect(screen.getByText('Contingência permitida')).toBeInTheDocument();
        expect(screen.getByText('Operacional interna')).toBeInTheDocument();
    });
});
