import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cadastrosFiscaisApi } from '@/features/fiscal/api/cadastrosFiscaisApi';
import { cestResumoPagedSchema, ncmCestVinculoPagedSchema, origemMercadoriaPagedSchema } from '@/features/fiscal/schemas/cadastrosFiscaisSchemas';
import { comCodigoSelecionado } from '@/features/fiscal/components/CodigoFiscalSelects';
import { atualizarDadosFiscaisProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import { httpClient } from '@/lib/http/httpClient';

// v1.11.0a8b77 — NCM, CEST e origem do produto deixam de ser texto livre. O backend resolve pelo CÓDIGO.

const pagina = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

let capturados: { url?: string; params: Record<string, unknown> }[];
let resposta: unknown;
const adapterOriginal = httpClient.defaults.adapter;

beforeEach(() => {
    capturados = [];
    resposta = pagina([]);
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ url: config.url, params: (config.params ?? {}) as Record<string, unknown> });
        return { data: resposta, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('schemas de resposta das referências fiscais do produto', () => {
    it('aceitam campo aditivo do backend (sem .strict em response)', () => {
        expect(() => cestResumoPagedSchema.parse(pagina([{ id: 'c1', codigo: '0300100', descricao: 'Cerveja', segmento: '03', ativo: true, campoNovo: 1 }]))).not.toThrow();
        expect(() => ncmCestVinculoPagedSchema.parse(pagina([{ id: 'v1', ncmId: 'n1', ncmCodigo: '22030000', cestId: 'c1', cestCodigo: '0300100', ativo: true, vigenciaNova: '2026-01-01' }]))).not.toThrow();
        expect(() => origemMercadoriaPagedSchema.parse(pagina([{ id: 'o1', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true, motivoInativacao: null, outro: 'x' }]))).not.toThrow();
    });

    it('recusam resposta sem o código (contrato quebrado aparece, não vira lista vazia)', () => {
        expect(() => origemMercadoriaPagedSchema.parse(pagina([{ id: 'o1', descricao: 'Nacional', ativo: true }]))).toThrow();
    });
});

describe('cadastrosFiscaisApi: rotas e parâmetros das referências do produto', () => {
    it('origens: GET /origens-mercadoria só ativas, 50 por página, devolve o código', async () => {
        resposta = pagina([{ id: 'o1', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true }]);
        const resultado = await cadastrosFiscaisApi.listarOrigensMercadoria();
        expect(capturados[0].url).toBe('/api/fiscal/cadastros/origens-mercadoria');
        expect(capturados[0].params).toMatchObject({ ativo: true, pagina: 1, tamanhoPagina: 50 });
        expect(resultado.items[0].codigo).toBe('0');
    });

    it('vínculos: GET /ncm-cest filtra pelo CÓDIGO do NCM, nunca por Id', async () => {
        resposta = pagina([{ id: 'v1', ncmId: 'n1', ncmCodigo: '22030000', cestId: 'c1', cestCodigo: '0300100', ativo: true }]);
        const resultado = await cadastrosFiscaisApi.listarVinculosNcmCest('22030000');
        expect(capturados[0].url).toBe('/api/fiscal/cadastros/ncm-cest');
        expect(capturados[0].params).toMatchObject({ ncmCodigo: '22030000', ativo: true, pagina: 1 });
        expect(capturados[0].params).not.toHaveProperty('ncmId');
        expect(resultado.items[0].cestCodigo).toBe('0300100');
    });

    it('CEST por código: GET /cest?codigo= devolve a descrição, ou null se não existir', async () => {
        resposta = pagina([{ id: 'c1', codigo: '0300100', descricao: 'Cerveja', segmento: '03', ativo: true }]);
        expect((await cadastrosFiscaisApi.obterCestPorCodigo('0300100'))?.descricao).toBe('Cerveja');
        expect(capturados[0].url).toBe('/api/fiscal/cadastros/cest');
        expect(capturados[0].params).toMatchObject({ codigo: '0300100', ativo: true });
        resposta = pagina([]);
        expect(await cadastrosFiscaisApi.obterCestPorCodigo('9999999')).toBeNull();
    });

    it('NCM: a busca existente segue com termo, ativo e 20 por página (debounce fica no hook)', async () => {
        await cadastrosFiscaisApi.listarNcm('cerv');
        expect(capturados[0].url).toBe('/api/fiscal/cadastros/ncm');
        expect(capturados[0].params).toMatchObject({ termo: 'cerv', ativo: true, pagina: 1, tamanhoPagina: 20 });
    });
});

describe('payload do produto leva o código', () => {
    it('ncmCodigo, cestCodigo e origemMercadoriaCodigo saem como código exato, sem Id', () => {
        const parsed = atualizarDadosFiscaisProdutoSchema.parse({ ncmCodigo: '22030000', cestCodigo: '0300100', origemMercadoriaCodigo: '0' });
        expect(parsed).toMatchObject({ ncmCodigo: '22030000', cestCodigo: '0300100', origemMercadoriaCodigo: '0' });
        expect(Object.keys(parsed)).not.toEqual(expect.arrayContaining(['ncmId', 'cestId', 'origemMercadoriaId']));
    });

    it('origem "0" (Nacional) é valor válido e não vira vazio', () => {
        expect(atualizarDadosFiscaisProdutoSchema.parse({ origemMercadoriaCodigo: '0' }).origemMercadoriaCodigo).toBe('0');
    });
});

describe('merge do código já gravado', () => {
    it('código fora da página corrente continua selecionável, com o próprio código como rótulo', () => {
        const options = [{ label: '22030000 — Cervejas', value: '22030000' }];
        expect(comCodigoSelecionado(options, '10059010')).toEqual([{ label: '10059010', value: '10059010' }, ...options]);
        expect(comCodigoSelecionado(options, '22030000')).toBe(options);
        expect(comCodigoSelecionado(options, null)).toBe(options);
    });
});

describe('ProdutoFormDialog: NCM, CEST e origem não são texto livre', () => {
    const form = read('features/produtos/components/ProdutoFormDialog.tsx');

    it('nenhum InputText para ncmCodigo, cestCodigo ou origemMercadoriaCodigo', () => {
        expect(form).not.toMatch(/<InputText[^>]*id="(ncmCodigo|cestCodigo|origemMercadoriaCodigo)"/);
    });

    it('usa os três selects por código e o CEST recebe o NCM escolhido', () => {
        expect(form).toContain('<NcmCodigoSelect id="ncmCodigo"');
        expect(form).toContain('<OrigemMercadoriaSelect id="origemMercadoriaCodigo"');
        expect(form).toMatch(/<CestCodigoSelect id="cestCodigo" ncmCodigo=\{textValue\(values\.ncmCodigo\) \|\| null\}/);
    });

    it('EX-TIPI, benefício fiscal e código fiscal externo seguem texto (sem endpoint de referência)', () => {
        for (const campo of ['exTipi', 'codigoBeneficioFiscalPadrao', 'codigoFiscalExterno']) {
            expect(form).toContain(`<InputText id="${campo}"`);
        }
    });
});
