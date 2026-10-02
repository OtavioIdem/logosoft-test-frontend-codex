import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    atualizarNaturezaOperacaoSchema,
    criarNaturezaOperacaoSchema,
    inativarNaturezaOperacaoSchema,
    mapeamentoCfopSchema,
    naturezaOperacaoResponseSchema
} from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { buildAtualizarNaturezaOperacaoPayload, buildCriarNaturezaOperacaoPayload, naturezasOperacaoApi, NaturezasOperacaoEmpresaObrigatoriaError } from '@/features/fiscal/api/naturezasOperacaoApi';
import { cfopsDasLinhas, linhasDaNatureza, tipoCfopDaOperacao } from '@/features/fiscal/components/naturezasOperacaoUtils';
import { NATUREZA_CFOP_GRADE, NATUREZA_OPERACAO_INATIVAR_DIALOG } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { httpClient } from '@/lib/http/httpClient';

// b72 (D98, AC-1): contrato dos requests e da resposta de natureza de operação. `.strict()` só no request;
// a resposta aceita campo aditivo e preserva `cfops`. A chave (âmbito, tipoItem) repetida é recusada no cliente
// porque o backend aceita e a última vence em silêncio.

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const naturezaId = '44444444-4444-4444-4444-444444444444';

const mapeamentos = [
    { ambito: 1, cfopCodigo: '5102', tipoItem: null },
    { ambito: 2, cfopCodigo: '6102', tipoItem: null },
    { ambito: 1, cfopCodigo: '5101', tipoItem: 2 }
];

const comum = {
    descricao: 'Venda de mercadoria',
    tipoDocumento: 1,
    tipoOperacao: 1,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: '',
    cfops: mapeamentos
};

const criarValido = { ...comum, empresaId, filialId: '', codigo: 'VENDA' };

const CAMPOS_CRIAR = ['empresaId', 'filialId', 'codigo', 'descricao', 'tipoDocumento', 'tipoOperacao', 'finalidade', 'indicadorPresencaComprador', 'indicadorConsumidorFinal', 'movimentaEstoque', 'geraFinanceiro', 'observacao', 'cfops'];
const CAMPOS_ATUALIZAR = ['descricao', 'tipoDocumento', 'tipoOperacao', 'finalidade', 'indicadorPresencaComprador', 'indicadorConsumidorFinal', 'movimentaEstoque', 'geraFinanceiro', 'observacao', 'cfops'];

const respostaCompleta = {
    id: naturezaId,
    empresaId,
    filialId: null,
    codigo: 'VENDA',
    descricao: 'Venda de mercadoria',
    tipoDocumento: 1,
    tipoOperacao: 1,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: null,
    ativa: true,
    cfops: [
        { ambito: 1, cfopId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cfopCodigo: '5102', tipoItem: null },
        { ambito: 1, cfopId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', cfopCodigo: '5101', tipoItem: 2 }
    ]
};

describe('AC-1: requests de natureza são .strict() e têm o número exato de campos', () => {
    it('Criar: o payload tem os 13 campos, filial vazia vira null, observação vazia vira null, cfops vai como lista', () => {
        const payload = buildCriarNaturezaOperacaoPayload(criarValido) as Record<string, unknown>;
        expect(Object.keys(payload).sort()).toEqual([...CAMPOS_CRIAR].sort());
        expect(payload.filialId).toBeNull();
        expect(payload.observacao).toBeNull();
        expect(payload.cfops).toEqual(mapeamentos);
    });

    it('Atualizar: o payload tem os 10 campos e nunca empresa, filial ou código', () => {
        const payload = buildAtualizarNaturezaOperacaoPayload(comum) as Record<string, unknown>;
        expect(Object.keys(payload).sort()).toEqual([...CAMPOS_ATUALIZAR].sort());
        expect(payload).not.toHaveProperty('codigo');
        expect(payload).not.toHaveProperty('empresaId');
        expect(payload).not.toHaveProperty('filialId');
    });

    it.each([
        ['Criar com campo desconhecido', () => criarNaturezaOperacaoSchema.safeParse({ ...criarValido, ativa: true })],
        ['Atualizar com código', () => atualizarNaturezaOperacaoSchema.safeParse({ ...comum, codigo: 'VENDA' })],
        ['Atualizar com empresaId', () => atualizarNaturezaOperacaoSchema.safeParse({ ...comum, empresaId })],
        ['Inativar com campo desconhecido', () => inativarNaturezaOperacaoSchema.safeParse({ motivo: 'Encerrada', id: naturezaId })],
        ['Mapeamento com cfopId (o request vai pelo CÓDIGO)', () => mapeamentoCfopSchema.safeParse({ ambito: 1, cfopCodigo: '5102', tipoItem: null, cfopId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })]
    ])('%s é recusado', (_nome, parse) => {
        const resultado = parse();
        expect(resultado.success).toBe(false);
        if (!resultado.success) expect(resultado.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
    });

    it.each([
        ['null', null],
        ['undefined', undefined]
    ])('Atualizar recusa cfops %s (null preservaria em silêncio no PUT)', (_nome, cfops) => {
        expect(atualizarNaturezaOperacaoSchema.safeParse({ ...comum, cfops }).success).toBe(false);
    });

    it('Atualizar aceita cfops [] (apagar é explícito, nunca por omissão)', () => {
        const payload = buildAtualizarNaturezaOperacaoPayload({ ...comum, cfops: [] }) as Record<string, unknown>;
        expect(payload.cfops).toEqual([]);
    });

    it('o mapeamento leva tipoItem null explícito, não omitido', () => {
        const payload = buildAtualizarNaturezaOperacaoPayload(comum) as { cfops: Record<string, unknown>[] };
        expect(payload.cfops[0]).toHaveProperty('tipoItem', null);
        expect(Object.keys(payload.cfops[0]).sort()).toEqual(['ambito', 'cfopCodigo', 'tipoItem']);
    });

    it('código com espaço e acima de 40 é recusado; descrição acima de 200 e observação acima de 500 também', () => {
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, codigo: 'VEN DA' }).success).toBe(false);
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, codigo: 'X'.repeat(41) }).success).toBe(false);
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, codigo: 'X'.repeat(40) }).success).toBe(true);
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, descricao: 'D'.repeat(201) }).success).toBe(false);
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, observacao: 'O'.repeat(501) }).success).toBe(false);
    });

    it('aceita os 6 tipos de documento e recusa valor fora do enum', () => {
        for (const tipoDocumento of [1, 2, 3, 4, 5, 99]) {
            expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, tipoDocumento }).success).toBe(true);
        }
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, tipoDocumento: 6 }).success).toBe(false);
    });

    it('Inativar: motivo de 1 a 400, com trim', () => {
        expect(inativarNaturezaOperacaoSchema.safeParse({ motivo: '   ' }).success).toBe(false);
        const vazio = inativarNaturezaOperacaoSchema.safeParse({ motivo: '' });
        expect(vazio.success ? null : vazio.error.issues[0].message).toBe(NATUREZA_OPERACAO_INATIVAR_DIALOG.motivoObrigatorio);
        const longo = inativarNaturezaOperacaoSchema.safeParse({ motivo: 'M'.repeat(401) });
        expect(longo.success ? null : longo.error.issues[0].message).toBe(NATUREZA_OPERACAO_INATIVAR_DIALOG.motivoTamanho);
        expect(inativarNaturezaOperacaoSchema.parse({ motivo: 'M'.repeat(400) }).motivo).toHaveLength(400);
        expect(inativarNaturezaOperacaoSchema.parse({ motivo: '  natureza substituída  ' })).toEqual({ motivo: 'natureza substituída' });
    });
});

describe('AC-1: chave (âmbito, tipoItem) repetida é recusada', () => {
    it('duas linhas "Interno × Qualquer item" são recusadas, apontando a segunda linha', () => {
        const resultado = atualizarNaturezaOperacaoSchema.safeParse({ ...comum, cfops: [{ ambito: 1, cfopCodigo: '5102', tipoItem: null }, { ambito: 1, cfopCodigo: '5405', tipoItem: null }] });
        expect(resultado.success).toBe(false);
        if (resultado.success) return;
        const issue = resultado.error.issues.find((item) => item.message === NATUREZA_CFOP_GRADE.chaveRepetida);
        expect(issue?.path).toEqual(['cfops', 1, 'ambito']);
    });

    it('duas linhas "Interno × Produção própria" são recusadas', () => {
        expect(criarNaturezaOperacaoSchema.safeParse({ ...criarValido, cfops: [{ ambito: 1, cfopCodigo: '5101', tipoItem: 2 }, { ambito: 1, cfopCodigo: '5102', tipoItem: 2 }] }).success).toBe(false);
    });

    it('mesmo âmbito com tipo diferente, ou mesmo tipo com âmbito diferente, é aceito', () => {
        expect(atualizarNaturezaOperacaoSchema.safeParse({ ...comum, cfops: [{ ambito: 1, cfopCodigo: '5102', tipoItem: null }, { ambito: 1, cfopCodigo: '5101', tipoItem: 2 }, { ambito: 2, cfopCodigo: '6102', tipoItem: null }] }).success).toBe(true);
    });
});

describe('AC-1: a resposta não é estrita e preserva cfops', () => {
    it('campo aditivo do backend não quebra o parse, e os 15 campos com cfops sobrevivem', () => {
        const parsed = naturezaOperacaoResponseSchema.parse({ ...respostaCompleta, campoNovoDoBackend: 'x' });
        expect(parsed.cfops).toEqual(respostaCompleta.cfops);
        expect(parsed.cfops[0].tipoItem).toBeNull();
        expect(parsed).toMatchObject({ codigo: 'VENDA', tipoOperacao: 1, indicadorPresencaComprador: 1, geraFinanceiro: true, movimentaEstoque: true, ativa: true });
    });

    it('mapeamento sem tipoItem na resposta vira null (qualquer item), não some', () => {
        const parsed = naturezaOperacaoResponseSchema.parse({ ...respostaCompleta, cfops: [{ ambito: 2, cfopId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cfopCodigo: '6102' }] });
        expect(parsed.cfops[0]).toEqual({ ambito: 2, cfopId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cfopCodigo: '6102', tipoItem: null });
    });

    it('resposta sem cfops falha alto (um [] inventado viraria PUT que apaga o mapeamento)', () => {
        const { cfops: _cfops, ...semCfops } = respostaCompleta;
        expect(naturezaOperacaoResponseSchema.safeParse(semCfops).success).toBe(false);
    });

    it('resposta -> linhas -> request devolve todos os mapeamentos pelo código, com tipoItem null preservado', () => {
        const linhas = linhasDaNatureza(naturezaOperacaoResponseSchema.parse(respostaCompleta) as never);
        expect(cfopsDasLinhas(linhas)).toEqual([
            { ambito: 1, cfopCodigo: '5102', tipoItem: null },
            { ambito: 1, cfopCodigo: '5101', tipoItem: 2 }
        ]);
    });
});

describe('Emenda da D98: tipo do CFOP pela operação da natureza', () => {
    it('Venda (1) filtra Saída (2); Compra (2) filtra Entrada (1)', () => {
        expect(tipoCfopDaOperacao(1)).toBe(2);
        expect(tipoCfopDaOperacao(2)).toBe(1);
    });

    it.each([3, 4, 5, 6, 7, 8, 99, null, undefined])('operação %s não filtra tipo', (tipoOperacao) => {
        expect(tipoCfopDaOperacao(tipoOperacao as number | null | undefined)).toBeUndefined();
    });
});

describe('Client de natureza: parâmetros e corpos que saem na rede', () => {
    const adapterOriginal = httpClient.defaults.adapter;
    let capturados: { method?: string; url?: string; params?: Record<string, unknown>; body?: unknown }[];

    beforeEach(() => {
        capturados = [];
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            capturados.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(String(config.data)) : undefined });
            if (config.method === 'post' && config.url?.endsWith('/inativar')) return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
            if (config.method === 'get') return { data: { items: [respostaCompleta], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }, status: 200, statusText: 'OK', headers: {}, config };
            return { data: respostaCompleta, status: 200, statusText: 'OK', headers: {}, config };
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = adapterOriginal;
    });

    it('sem empresaId a listagem não sai (0 chamada HTTP)', async () => {
        await expect(naturezasOperacaoApi.listar({ empresaId: '' })).rejects.toBeInstanceOf(NaturezasOperacaoEmpresaObrigatoriaError);
        expect(capturados).toHaveLength(0);
    });

    it('"Ativas" envia somenteAtivas=true; "Todas" (undefined) e false omitem o parâmetro', async () => {
        await naturezasOperacaoApi.listar({ empresaId, somenteAtivas: true });
        await naturezasOperacaoApi.listar({ empresaId });
        await naturezasOperacaoApi.listar({ empresaId, somenteAtivas: false });
        expect(capturados[0].params).toMatchObject({ empresaId, somenteAtivas: true });
        expect(capturados[1].params).not.toHaveProperty('somenteAtivas');
        expect(capturados[2].params).not.toHaveProperty('somenteAtivas');
    });

    it('PUT vai para /{id} sem código e com a lista inteira', async () => {
        await naturezasOperacaoApi.atualizar(naturezaId, comum);
        expect(capturados[0]).toMatchObject({ method: 'put', url: `/api/fiscal/naturezas-operacao/${naturezaId}` });
        expect(capturados[0].body).not.toHaveProperty('codigo');
        expect((capturados[0].body as { cfops: unknown[] }).cfops).toEqual(mapeamentos);
    });

    it('inativar aceita 204 sem corpo e resolve sem ler a resposta como natureza', async () => {
        await expect(naturezasOperacaoApi.inativar(naturezaId, { motivo: '  Encerrada  ' })).resolves.toBeUndefined();
        expect(capturados[0]).toMatchObject({ method: 'post', url: `/api/fiscal/naturezas-operacao/${naturezaId}/inativar`, body: { motivo: 'Encerrada' } });
    });
});
