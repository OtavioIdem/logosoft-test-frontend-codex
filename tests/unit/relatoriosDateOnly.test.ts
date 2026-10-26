import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toDateOnlyParam } from '@/features/relatorios/schemas/relatoriosSchemas';
import { relatoriosApi } from '@/features/relatorios/api/relatoriosApi';
import { httpClient } from '@/lib/http/httpClient';

vi.mock('@/lib/http/httpClient', () => ({ httpClient: { get: vi.fn() } }));

// Contrato do backend: RelatorioGerencialFiltro declara DateOnly em DataInicial/DataFinal e a query
// só aceita yyyy-MM-dd. ISO com horário devolve HTTP 400 e derruba /dashboard e /relatorios.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

// Fuso negativo: o fim do dia local em UTC já é o dia seguinte. Fuso positivo: o início do dia local
// em UTC ainda é o dia anterior. Os dois lados são exercitados para a suíte não depender do fuso da máquina.
const FUSO_NEGATIVO = 'America/Sao_Paulo'; // UTC-3 o ano todo desde 2019
const FUSO_POSITIVO = 'Pacific/Auckland'; // UTC+12/+13

const usarFuso = (tz: string, offsetEsperado: (offset: number) => boolean) => {
    vi.stubEnv('TZ', tz);
    // Pré-condição: se o runtime ignorar o TZ, o teste falha alto em vez de provar nada em silêncio.
    const offset = new Date(2026, 0, 15).getTimezoneOffset();
    expect(offsetEsperado(offset), `TZ=${tz} não foi aplicado (getTimezoneOffset=${offset})`).toBe(true);
};
const fusoNegativo = () => usarFuso(FUSO_NEGATIVO, (offset) => offset > 0);
const fusoPositivo = () => usarFuso(FUSO_POSITIVO, (offset) => offset < 0);

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('toDateOnlyParam', () => {
    it('fim de mês às 23:59:59.999 LOCAL continua no dia do mês, não vira o dia seguinte (fuso negativo)', () => {
        fusoNegativo();
        const fimDoMes = new Date(2026, 0, 31, 23, 59, 59, 999);

        // Discriminador: é exatamente o que `toISOString().slice(0, 10)` devolveria, e está errado.
        // Se esta linha deixar de valer, o caso não distingue mais as duas implementações.
        expect(fimDoMes.toISOString().slice(0, 10)).toBe('2026-02-01');

        expect(toDateOnlyParam(fimDoMes)).toBe('2026-01-31');
    });

    it('fim de ano às 23:59:59.999 LOCAL não atravessa para o ano seguinte (fuso negativo)', () => {
        fusoNegativo();
        const fimDoAno = new Date(2026, 11, 31, 23, 59, 59, 999);

        expect(fimDoAno.toISOString().slice(0, 10)).toBe('2027-01-01');
        expect(toDateOnlyParam(fimDoAno)).toBe('2026-12-31');
    });

    it('início do dia 00:00:00.000 LOCAL não recua para o dia anterior (fuso positivo)', () => {
        fusoPositivo();
        const inicioDoMes = new Date(2026, 5, 1, 0, 0, 0, 0);

        expect(inicioDoMes.toISOString().slice(0, 10)).toBe('2026-05-31');
        expect(toDateOnlyParam(inicioDoMes)).toBe('2026-06-01');
    });

    it('Date comum vira yyyy-MM-dd com mês e dia de dois dígitos', () => {
        fusoNegativo();
        expect(toDateOnlyParam(new Date(2026, 2, 5, 12, 0, 0))).toBe('2026-03-05');
        expect(toDateOnlyParam(new Date(2026, 8, 9, 8, 30, 0))).toBe('2026-09-09');
    });

    it('string yyyy-MM-dd passa inalterada, em qualquer fuso', () => {
        fusoNegativo();
        expect(toDateOnlyParam('2026-06-30')).toBe('2026-06-30');
        fusoPositivo();
        expect(toDateOnlyParam('2026-06-30')).toBe('2026-06-30');
    });

    it('string ISO completa vira o dia LOCAL daquele instante', () => {
        fusoNegativo();
        // 15:00Z = 12:00 em UTC-3: mesmo dia.
        expect(toDateOnlyParam('2026-06-30T15:00:00.000Z')).toBe('2026-06-30');
        // 02:30Z do dia 01 = 23:30 do dia 30 em UTC-3: o dia local é o 30, não o 01 que o ISO mostra.
        expect(toDateOnlyParam('2026-07-01T02:30:00.000Z')).toBe('2026-06-30');
        expect(toDateOnlyParam('2026-06-30T15:00:00.000Z')).toMatch(DATE_ONLY);
    });
});

describe('relatoriosApi — parâmetros de data enviados ao backend', () => {
    const get = vi.mocked(httpClient.get);

    beforeEach(() => {
        get.mockReset();
        get.mockResolvedValue({ data: {} } as never);
        // Date locais de fim de mês: no fuso negativo o ISO do dataFinal é 2026-07-01T02:59:59.999Z.
        fusoNegativo();
    });

    const query = () => ({
        empresaId,
        filialId,
        dataInicial: new Date(2026, 5, 1, 0, 0, 0, 0),
        dataFinal: new Date(2026, 5, 30, 23, 59, 59, 999)
    });

    const chamadas: Array<{ rota: string; chamar: () => Promise<unknown> }> = [
        { rota: '/api/relatorios/gerenciais/vendas', chamar: () => relatoriosApi.gerencialVendas(query()) },
        { rota: '/api/relatorios/gerenciais/compras', chamar: () => relatoriosApi.gerencialCompras(query()) },
        { rota: '/api/relatorios/gerenciais/financeiro', chamar: () => relatoriosApi.gerencialFinanceiro(query()) },
        { rota: '/api/relatorios/gerenciais/estoque', chamar: () => relatoriosApi.gerencialEstoque(query()) },
        { rota: '/api/relatorios/gerenciais/fiscal', chamar: () => relatoriosApi.gerencialFiscal(query()) },
        { rota: '/api/relatorios/gerenciais/producao', chamar: () => relatoriosApi.gerencialProducao(query()) },
        { rota: '/api/relatorios/gerenciais/dashboard', chamar: () => relatoriosApi.dashboardConsolidado(query()) },
        { rota: '/api/relatorios/gerenciais/exportar', chamar: () => relatoriosApi.exportar('vendas', 'csv', query()) }
    ];

    it.each(chamadas)('$rota envia dataInicial e dataFinal em yyyy-MM-dd do dia local', async ({ rota, chamar }) => {
        await chamar();

        expect(get).toHaveBeenCalledTimes(1);
        const [url, config] = get.mock.calls[0] as unknown as [string, { params: Record<string, unknown> }];
        expect(url).toBe(rota);
        expect(config.params.dataInicial).toMatch(DATE_ONLY);
        expect(config.params.dataFinal).toMatch(DATE_ONLY);
        // Valor exato: fim de junho às 23:59:59.999 local não pode virar 1º de julho.
        expect(config.params.dataInicial).toBe('2026-06-01');
        expect(config.params.dataFinal).toBe('2026-06-30');
        expect(config.params.empresaId).toBe(empresaId);
        expect(config.params.filialId).toBe(filialId);
    });

    it('aceita as datas já como string yyyy-MM-dd sem alterá-las', async () => {
        await relatoriosApi.gerencialVendas({ empresaId, dataInicial: '2026-06-01', dataFinal: '2026-06-30' } as never);

        const [, config] = get.mock.calls[0] as unknown as [string, { params: Record<string, unknown> }];
        expect(config.params.dataInicial).toBe('2026-06-01');
        expect(config.params.dataFinal).toBe('2026-06-30');
    });

    it('/api/relatorios/operacional/geral CONTINUA recebendo inicio/fim em ISO completo (não uniformizar)', async () => {
        const dataInicial = new Date('2026-06-01T00:00:00.000Z');
        const dataFinal = new Date('2026-06-30T23:59:59.000Z');

        await relatoriosApi.operacional({ empresaId, filialId, dataInicial, dataFinal } as never);

        const [url, config] = get.mock.calls[0] as unknown as [string, { params: Record<string, unknown> }];
        expect(url).toBe('/api/relatorios/operacional/geral');
        expect(config.params.inicio).toBe('2026-06-01T00:00:00.000Z');
        expect(config.params.fim).toBe('2026-06-30T23:59:59.000Z');
        expect(config.params.inicio).not.toMatch(DATE_ONLY);
        expect(config.params.fim).not.toMatch(DATE_ONLY);
        expect(config.params).not.toHaveProperty('dataInicial');
        expect(config.params).not.toHaveProperty('dataFinal');
    });
});
