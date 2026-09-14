import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Bancos/Boletos/CNAB (Onda 4) — estrutura e scaffold', () => {
    it('mantém apenas as operações bancárias publicadas pelo backend', () => {
        const api = read('features/bancos/api/bancosApi.ts');
        expect(api).toContain("const BASE = '/api/bancos'");
        expect(api).toContain('${BASE}/contas-bancarias');
        expect(api).toContain('${BASE}/convenios');
        expect(api).toContain('${BASE}/carteiras');
        expect(api).toContain('listarBoletos');
        expect(api).toContain('obterBoleto');
        expect(api).toContain('historicoBoleto');
        expect(api).toContain('${BASE}/boletos/gerar');
        expect(api).toContain('${BASE}/boletos/${id}/cancelar');
        expect(api).toContain('${BASE}/cnab/remessas');
        expect(api).toContain('${BASE}/cnab/retornos/importar');
    });

    it('registra as 6 permissões de Bancos no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'BANCOS_CONSULTAR'");
        expect(erp).toContain("'BANCOS_GERENCIAR'");
        expect(erp).toContain("'BOLETOS_GERAR'");
        expect(erp).toContain("'BOLETOS_CANCELAR'");
        expect(erp).toContain("'CNAB_REMESSA_GERAR'");
        expect(erp).toContain("'CNAB_RETORNO_PROCESSAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/bancos');
        expect(rotas).toContain('BANCOS_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/bancos/boletos'");
        expect(menu).toContain("to: '/bancos/cnab'");
        const page = read('app/(main)/bancos/boletos/page.tsx');
        expect(page).toContain('BoletosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('expõe indisponibilidade honesta quando faltam consultas para concluir o fluxo bancário', () => {
        const boletos = read('features/bancos/components/BoletosPage.tsx');
        const cadastros = read('features/bancos/components/CadastrosBancariosPage.tsx');
        const cnab = read('features/bancos/components/CnabPage.tsx');
        expect(cadastros).toContain('não oferece endpoints de consulta');
        expect(boletos).toContain('Geração de boleto indisponível');
        expect(cnab).toContain('operações de remessa e retorno estão indisponíveis');
    });

    it('v1.11.0a8b54.c1: tipos BoletoResponse e BoletoHistoricoResponse refletem contrato C#', () => {
        const types = read('features/bancos/types/bancos.types.ts');

        // Campos corrigidos: DataVencimento → dataVencimento
        expect(types).toContain('dataVencimento: IsoDateTime');

        // Campos corrigidos: StatusBoleto → statusBoleto (nome de propriedade, não tipo)
        expect(types).toContain('statusBoleto: StatusBoleto | number');

        // Campos monetários corrigidos: ValorTitulo → valorTitulo
        expect(types).toContain('valorTitulo: number');

        // Campo opcional do backend: ValorPago → valorPago
        expect(types).toContain('valorPago?: number | null');

        // Histórico: Observacao → observacao (não 'descricao' nem 'evento')
        expect(types).toContain('observacao: string');

        // Histórico: campos de status (StatusAnterior/StatusNovo)
        expect(types).toContain('statusAnterior: StatusBoleto | number');
        expect(types).toContain('statusNovo: StatusBoleto | number');

        // Enum StatusBoleto corrigido: 4 valores do backend, não 5
        expect(types).toContain('Gerado = 1');
        expect(types).toContain('EmRemessa = 2');
        expect(types).toContain('Liquidado = 3');
        expect(types).toContain('Cancelado = 4');
        expect(types).not.toContain('EmAberto =');
        expect(types).not.toContain('Registrado =');
        expect(types).not.toContain('Baixado =');
    });

    it('v1.11.0a8b54.c1: BoletosPage renderiza colunas e campos corrigidos', () => {
        const page = read('features/bancos/components/BoletosPage.tsx');

        // Colunas que lêem os campos corrigidos
        expect(page).toContain('dataVencimento');
        expect(page).toContain('statusBoleto');
        expect(page).toContain('valorTitulo');

        // Dialog de detalhe lê os mesmos campos
        expect(page).toContain('valorPago');
    });

    it('v1.11.0a8b54.c1: BancosOperacoesDialogs renderiza histórico com observacao/status, não evento/descricao', () => {
        const dialog = read('features/bancos/components/BancosOperacoesDialogs.tsx');

        // Histórico: observacao é o campo que existe em C#
        expect(dialog).toContain('observacao');

        // Histórico: status anterior e novo (não evento genérico)
        expect(dialog).toContain('statusAnterior');
        expect(dialog).toContain('statusNovo');
    });
});
