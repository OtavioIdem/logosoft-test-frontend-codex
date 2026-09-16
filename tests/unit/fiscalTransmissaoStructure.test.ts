import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

// AC-6 (v1.11.0a8b57): o painel "Último retorno operacional" não persiste em Storage -- fica só em estado de
// componente (some ao sair da página, substituído só pelo próximo retorno). O comportamento de "continua visível
// depois de Atualizar" é coberto pelo E2E T1 (fiscal-transmissao.spec.ts).
describe('AC-6: painel de retorno operacional sem persistência', () => {
    it('NotaFiscalDetalhePage.tsx não usa localStorage/sessionStorage', () => {
        expect(read('features/fiscal/components/NotaFiscalDetalhePage.tsx')).not.toMatch(/Storage/);
    });

    it('NotaFiscalRetornoOperacionalPanel.tsx não usa localStorage/sessionStorage', () => {
        expect(read('features/fiscal/components/NotaFiscalRetornoOperacionalPanel.tsx')).not.toMatch(/Storage/);
    });
});

// AC-8 (v1.11.0a8b57): FISCAL_REPROCESSAR entra no item pai "Fiscal" e no filho "Notas fiscais" no mesmo diff;
// nenhum outro item do menu muda (CLAUDE.md: pai e filho avaliados de forma independente).
describe('AC-8: menu Fiscal e Notas fiscais ganham FISCAL_REPROCESSAR', () => {
    const source = read('layout/AppMenu.tsx');

    it('FISCAL_REPROCESSAR aparece exatamente 2 vezes: uma no pai, uma no filho', () => {
        expect((source.match(/FISCAL_REPROCESSAR/g) ?? []).length).toBe(2);
    });

    it('o item pai "Fiscal" ganha FISCAL_REPROCESSAR no fim da lista atual', () => {
        const anyPermissionsLine = "anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_CANCELAR', 'FISCAL_INUTILIZAR', 'FISCAL_CARTA_CORRECAO', 'FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR', 'FISCAL_REPROCESSAR'],";
        expect(source).toContain(anyPermissionsLine);
        expect(source.indexOf("label: 'Fiscal',")).toBeLessThan(source.indexOf(anyPermissionsLine));
        expect(source.indexOf(anyPermissionsLine) - source.indexOf("label: 'Fiscal',")).toBeLessThan(60);
    });

    it('o item filho "Notas fiscais" ganha FISCAL_REPROCESSAR no fim da lista atual', () => {
        expect(source).toContain(
            "{ label: 'Notas fiscais', icon: 'pi pi-fw pi-file', to: '/fiscal/notas', anyPermissions: ['FISCAL_CONSULTAR', 'FISCAL_EXPORTAR', 'FISCAL_GERENCIAR', 'FISCAL_EMITIR', 'FISCAL_REPROCESSAR'] },"
        );
    });

    it('os demais itens do grupo Fiscal ficam intactos', () => {
        expect(source).toContain("{ label: 'Simulador de tributação', icon: 'pi pi-fw pi-calculator', to: '/fiscal/simulador', permission: 'FISCAL_REGRAS_CONSULTAR' },");
        expect(source).toContain("{ label: 'Regras fiscais', icon: 'pi pi-fw pi-sliders-h', to: '/fiscal/regras', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },");
        expect(source).toContain("{ label: 'Exceções e benefícios', icon: 'pi pi-fw pi-percentage', to: '/fiscal/excecoes', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },");
        expect(source).toContain("{ label: 'Exceções por NCM', icon: 'pi pi-fw pi-tags', to: '/fiscal/excecoes-ncm', anyPermissions: ['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR'] },");
        expect(source).toContain("{ label: 'Observabilidade', icon: 'pi pi-fw pi-chart-line', to: '/fiscal/observabilidade', permission: 'FISCAL_CONSULTAR' },");
        expect(source).toContain("{ label: 'Inutilizações', icon: 'pi pi-fw pi-ban', to: '/fiscal/inutilizacoes', permission: 'FISCAL_INUTILIZAR' }");
    });
});

// AC-9 (v1.11.0a8b57): botão Reprocessar do painel de logs usa o guard FISCAL_REPROCESSAR (desde a b52) --
// aqui a checagem textual+contagem; o comportamento de render fica em FiscalIntegracoesTableReprocessar.test.tsx.
describe('AC-9: guard e texto do botão Reprocessar (textual/contagem)', () => {
    const source = read('features/fiscal/components/FiscalOperationalPanels.tsx');

    it('o guard do botão Reprocessar exige FISCAL_REPROCESSAR e o title reflete a mesma permissão', () => {
        expect(source).toContain('<PermissionGuard permission="FISCAL_REPROCESSAR" mode="disable">');
        expect(source).toContain("title={disabled ? 'Permissão necessária: FISCAL_REPROCESSAR.' : undefined}");
    });

    it('nenhum "Permissão necessária: FISCAL_EMITIR." está ligado ao botão Reprocessar', () => {
        expect(source).not.toContain('Permissão necessária: FISCAL_EMITIR.');
    });

    it('o endpoint reprocessar-sefaz aparece exatamente 1 vez em features/, app/, lib/, layout/, components/', () => {
        const roots = ['features', 'app', 'lib', 'layout', 'components'];
        const { execSync } = require('node:child_process') as typeof import('node:child_process');
        let total = 0;
        for (const root of roots) {
            try {
                const output = execSync(`grep -rn "/reprocessar-sefaz\\b" ${root}`, { encoding: 'utf8' });
                total += output.split('\n').filter((line) => line.trim() !== '').length;
            } catch {
                // grep sai com código 1 quando não encontra nada no diretório -- conta 0 e segue
            }
        }
        expect(total).toBe(1);
    });
});

// AC-10 (v1.11.0a8b57): transmitir, reprocessar e consultar protocolo trocam onSuccess por
// onSettled: (_r, _e, v) => invalidateNota(v.id); as demais mutações fiscais ficam como estavam (D37).
describe('AC-10: onSettled nominal nas três mutações de transmissão', () => {
    const source = read('features/fiscal/hooks/useFiscalResources.ts');

    it('transmitirMutation usa onSettled com invalidateNota(variables.id), sem onSuccess', () => {
        expect(source).toContain(
            "const transmitirMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.transmitirSefaz(id, values), onSettled: (_result, _error, variables) => invalidateNota(variables.id) });"
        );
    });

    it('reprocessarMutation usa onSettled com invalidateNota(variables.id), sem onSuccess', () => {
        expect(source).toContain(
            "const reprocessarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.reprocessarSefaz(id, values), onSettled: (_result, _error, variables) => invalidateNota(variables.id) });"
        );
    });

    it('consultarProtocoloMutation usa onSettled com invalidateNota(variables.id), sem onSuccess', () => {
        expect(source).toContain(
            "const consultarProtocoloMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.consultarProtocoloSefaz(id, values), onSettled: (_result, _error, variables) => invalidateNota(variables.id) });"
        );
    });

    it('exatamente 5 mutações usam onSettled (as 2 de D37 + as 3 desta fatia); demais seguem onSuccess', () => {
        expect((source.match(/onSettled:/g) ?? []).length).toBe(5);
        // demais mutações que tocam nota (criarNota, gerarNotaPedido, adicionarItem, armazenarXml, validar,
        // gerarXml, assinarXml, habilitarContingencia, registrarRejeicao, cancelar, cancelarSefaz,
        // cartaCorrecao, gerarDanfe, baixarEstoque, gerarContaReceber) continuam com onSuccess
        expect(source).toContain('const criarNotaMutation = useMutation({ mutationFn: (values: unknown) => fiscalApi.criarNota(values), onSuccess: (nota) => invalidateNota(nota.id) });');
        expect(source).toContain("const gerarXmlMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.gerarXmlEnvio(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });");
        expect(source).toContain("const assinarXmlMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.assinarXmlEnvio(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });");
        expect(source).toContain('const habilitarContingenciaMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.habilitarContingencia(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });');
    });
});
