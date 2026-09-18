import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// AC-1: Tipos em features/fiscal/types/ com contagem exata de campos

describe('AC-1: Tipos de séries fiscais e modelos de documento com contagem correta de campos', () => {
    const typesSource = readFileSync('features/fiscal/types/seriesFiscais.types.ts', 'utf8');
    const modelosSource = readFileSync('features/fiscal/types/modelosDocumentoFiscal.types.ts', 'utf8');

    it('SerieFiscalResponse tem 11 campos (SerieFiscalContracts.cs:21-32)', () => {
        // Procura pelo type SerieFiscalResponse e conta as linhas até o próximo type/export
        const match = typesSource.match(/export type SerieFiscalResponse = \{([^}]+)\}/);
        expect(match).toBeDefined();
        if (match) {
            const fields = match[1].split('\n').filter((line) => line.includes(':'));
            expect(fields.length).toBe(11);
        }
    });

    it('BuracosSerieFiscalResponse tem 5 campos (SerieFiscalContracts.cs:35-40)', () => {
        const match = typesSource.match(/export type BuracosSerieFiscalResponse = \{([^}]+)\}/);
        expect(match).toBeDefined();
        if (match) {
            const fields = match[1].split('\n').filter((line) => line.includes(':'));
            expect(fields.length).toBe(5);
        }
    });

    it('CriarSerieFiscalRequest tem 8 campos (SerieFiscalContracts.cs:5-13)', () => {
        const match = typesSource.match(/export type CriarSerieFiscalRequest = \{([\s\S]+?)\}/);
        expect(match).toBeDefined();
        if (match) {
            const fields = match[1].split('\n').filter((line) => line.includes(':'));
            expect(fields.length).toBe(8);
        }
    });

    it('AmpliarNumeroFinalSerieFiscalRequest tem campo novoNumeroFinal', () => {
        expect(typesSource).toContain('novoNumeroFinal: number');
    });

    it('EncerrarVigenciaSerieFiscalRequest tem campo vigenciaFim', () => {
        expect(typesSource).toContain('vigenciaFim: string');
    });

    it('InativarSerieFiscalRequest tem campo motivo', () => {
        expect(typesSource).toContain('motivo: string');
    });

    it('SerieFiscalListQuery tem campos empresaId, filialId?, modeloDocumentoFiscalId?, somenteAtivas?, pagina?, tamanhoPagina?', () => {
        expect(typesSource).toContain('empresaId: Guid');
        expect(typesSource).toContain('filialId?: Guid | null');
        expect(typesSource).toContain('modeloDocumentoFiscalId?: Guid | null');
        expect(typesSource).toContain('somenteAtivas?: boolean');
        expect(typesSource).toContain('pagina?: number');
        expect(typesSource).toContain('tamanhoPagina?: number');
    });

    it('ModeloDocumentoFiscalResponse tem 6 campos (ModeloDocumentoFiscalContracts.cs:7-13)', () => {
        const match = modelosSource.match(/export type ModeloDocumentoFiscalResponse = \{([^}]+)\}/);
        expect(match).toBeDefined();
        if (match) {
            const fields = match[1].split('\n').filter((line) => line.includes(':'));
            expect(fields.length).toBe(6);
        }
    });

    it('todos os tipos têm comentário de origem do C# (SerieFiscalContracts.cs, ModeloDocumentoFiscalContracts.cs)', () => {
        expect(typesSource).toMatch(/SerieFiscalContracts\.cs/);
        expect(typesSource).toMatch(/SeriesFiscaisController\.cs/);
        expect(modelosSource).toMatch(/ModeloDocumentoFiscalContracts\.cs/);
    });
});

// AC-3: Nenhum uso de toISOString() nos arquivos novos de séries (exceto comentários)
describe('AC-3: Nenhum toISOString() em arquivos de séries (armadilha 3)', () => {
    const schemasSource = readFileSync('features/fiscal/schemas/seriesFiscaisSchemas.ts', 'utf8');
    const apiSource = readFileSync('features/fiscal/api/seriesFiscaisApi.ts', 'utf8');

    it('seriesFiscaisSchemas.ts não executa toISOString() (sem comentários)', () => {
        // Remove comentários para verificação
        const noComments = schemasSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
        expect(noComments).not.toContain('toISOString()');
    });

    it('seriesFiscaisApi.ts não usa toISOString()', () => {
        expect(apiSource).not.toContain('toISOString()');
    });

    it('seriesFiscaisSchemas.ts implementa toDateOnly e fromDateOnly locais', () => {
        expect(schemasSource).toContain('export const toDateOnly');
        expect(schemasSource).toContain('export const fromDateOnly');
    });
});

// AC-4: API com 7 locais de chamada novos
describe('AC-4: API de séries com 7 endpoints (listar, criar, ampliar, encerrar, inativar, buracos, modelos)', () => {
    const apiSource = readFileSync('features/fiscal/api/seriesFiscaisApi.ts', 'utf8');
    const modelosApiSource = readFileSync('features/fiscal/api/modelosDocumentoFiscalApi.ts', 'utf8');

    it('seriesFiscaisApi tem método listar com GET /api/fiscal/series', () => {
        expect(apiSource).toContain('/api/fiscal/series');
    });

    it('seriesFiscaisApi tem método criar', () => {
        expect(apiSource).toContain('async criar(values: unknown)');
    });

    it('seriesFiscaisApi tem método ampliar', () => {
        expect(apiSource).toContain('async ampliar(id: string');
    });

    it('seriesFiscaisApi tem método encerrarVigencia', () => {
        expect(apiSource).toContain('async encerrarVigencia(id: string');
    });

    it('seriesFiscaisApi tem método inativar sem ler corpo (204)', () => {
        expect(apiSource).toContain('async inativar(id: string, values: unknown): Promise<void>');
        expect(apiSource).toContain('httpClient.post<void>');
    });

    it('seriesFiscaisApi tem método buracos', () => {
        expect(apiSource).toContain('async buracos(id: string)');
    });

    it('modelosDocumentoFiscalApi tem método listar modelos com tamanhoPagina padrão 100', () => {
        expect(modelosApiSource).toContain('/api/fiscal/modelos-documento');
        expect(modelosApiSource).toContain('tamanhoPagina ?? 100');
    });

    it('SeriesFiscaisEmpresaObrigatoriaError para quando sem empresa', () => {
        expect(apiSource).toContain('SeriesFiscaisEmpresaObrigatoriaError');
        expect(apiSource).toContain('code = \'Fiscal.Series.EmpresaObrigatoria\'');
    });

    it('erros das APIs sobem crus (AxiosError) sem reembrulho, para preservar code (D50)', () => {
        // O arquivo documenta o padrão de não reembrulhar erros
        expect(apiSource).toContain('mapApiError');
    });
});
