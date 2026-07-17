import { Guid, IsoDateTime } from '@/types/erp';

export enum CategoriaAnexo {
    Documento = 1,
    Contrato = 2,
    NotaFiscal = 3,
    Comprovante = 4,
    Foto = 5,
    Planilha = 6,
    Outro = 7
}

export type AnexoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    moduloOrigem: string;
    entidadeVinculada: string;
    entidadeVinculadaId: Guid;
    categoria: CategoriaAnexo | number;
    nomeArquivo: string;
    contentType: string;
    tamanhoBytes: number;
    hashSha256: string;
    descricao?: string | null;
    ativo: boolean;
    motivoInativacao?: string | null;
    criadoEm: IsoDateTime;
};

export type AnexosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    modulo?: string | null;
    entidade?: string | null;
    entidadeId?: Guid | null;
    categoria?: CategoriaAnexo | number | null;
    incluirInativos?: boolean | null;
};

export type UploadAnexoInput = {
    arquivo: File;
    empresaId: Guid;
    filialId?: Guid | null;
    moduloOrigem: string;
    entidadeVinculada: string;
    entidadeVinculadaId: Guid;
    categoria: CategoriaAnexo | number;
    descricao?: string | null;
};

/** Limite de upload alinhado ao backend (25 MB). */
export const ANEXO_MAX_BYTES = 25 * 1024 * 1024;
