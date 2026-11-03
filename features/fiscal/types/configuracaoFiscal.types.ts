// Tipos da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). Origem: contrato do backend
// v1.26.22 `PLANO-FRONTEND-v1.26.22-faturamento.md` §5.1 e `ConfiguracaoFiscalController.cs`. Os enums trafegam
// como número. A empresa nunca vai no request nem na rota: vem do token (contexto organizacional do usuário).

import { Guid } from '@/types/erp';

/** 1 Homologação, 2 Produção. */
export type TipoAmbienteFiscal = 1 | 2;
/** 1 A1, 2 A3. */
export type TipoCertificadoDigital = 1 | 2;
/** 1 Ativo, 2 Inativo, 3 Vencido. */
export type SituacaoCertificadoDigital = 1 | 2 | 3;

export const TIPO_AMBIENTE_FISCAL = { homologacao: 1, producao: 2 } as const;
export const TIPO_CERTIFICADO_DIGITAL = { a1: 1, a3: 2 } as const;
export const SITUACAO_CERTIFICADO_DIGITAL = { ativo: 1, inativo: 2, vencido: 3 } as const;

export type SalvarConfiguracaoFiscalEmpresaRequest = {
    ambiente: TipoAmbienteFiscal;
    emitirNFe: boolean;
    emitirNFCe: boolean;
    emitirNFSe: boolean;
    certificadoDigitalId?: Guid | null;
    observacao?: string | null;
};

export type ConfiguracaoFiscalEmpresaResponse = {
    id: Guid;
    ambiente: TipoAmbienteFiscal;
    emitirNFe: boolean;
    emitirNFCe: boolean;
    emitirNFSe: boolean;
    certificadoDigitalId?: Guid | null;
    observacao?: string | null;
    ativo: boolean;
};

export type SalvarConfiguracaoFiscalFilialRequest = {
    ambiente: TipoAmbienteFiscal;
    herdaConfiguracaoEmpresa: boolean;
    certificadoDigitalId?: Guid | null;
    serieNFePadrao?: string | null;
    serieNFCePadrao?: string | null;
    observacao?: string | null;
};

export type ConfiguracaoFiscalFilialResponse = {
    id: Guid;
    filialId: Guid;
    ambiente: TipoAmbienteFiscal;
    herdaConfiguracaoEmpresa: boolean;
    certificadoDigitalId?: Guid | null;
    serieNFePadrao?: string | null;
    serieNFCePadrao?: string | null;
    observacao?: string | null;
    ativo: boolean;
};

export type MotivoConfiguracaoFiscalRequest = { motivo: string };

export type CadastrarCertificadoDigitalRequest = {
    apelido: string;
    tipo: TipoCertificadoDigital;
    /** Digitado só no cadastro. O backend normaliza espaços e U+200E; o completo nunca volta. */
    thumbprint: string;
    /** ISO 8601 em UTC (`toISOString()`). */
    validoAte: string;
    filialId?: Guid | null;
    observacao?: string | null;
};

export type CertificadoDigitalResponse = {
    id: Guid;
    filialId?: Guid | null;
    apelido: string;
    tipo: TipoCertificadoDigital;
    thumbprintMascarado: string;
    /** Sempre UTC (offset +00:00). */
    validoAte: string;
    situacao: SituacaoCertificadoDigital;
    observacao?: string | null;
};

export type VerificarCertificadoDigitalResponse = {
    disponivel: boolean;
    motivo: string;
};

export type ListarCertificadosQuery = { somenteAtivos?: boolean };
