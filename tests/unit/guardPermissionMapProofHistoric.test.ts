import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Prova histórica do gate de permissões (F1.6.b).
 *
 * POR QUE ESTE ARQUIVO EXISTE: durante a construção do gate, ele foi entregue "verde"
 * duas vezes enquanto não media nada — uma vez por um truncamento de nome de módulo no
 * enriquecimento por regra de rota, outra por um filtro de alcançabilidade largo demais,
 * que engolia as divergências legítimas junto com as órfãs. Nos dois casos o que denunciou
 * foi rodar a regra contra uma árvore antiga que contém defeitos conhecidos.
 *
 * Este teste automatiza essa denúncia. Ele não lê o registro de exceções para saber o que
 * o gate acha: ele executa a análise contra duas árvores e compara os pares acusados.
 *
 *   1312bc2 (b51)  contém os 7 defeitos que a b52 corrigiu  -> a análise TEM de acusá-los
 *   árvore de hoje  já corrigida                            -> a análise NÃO pode acusá-los
 *
 * Uma asserção por par, nos dois sentidos, sem alternativa lógica: se um par sumir, a
 * mensagem precisa dizer qual, porque é ela que salva quem mexer no gate depois.
 */

const REF_COM_DEFEITOS = '1312bc2';

/** Os sete pares que a b52 corrigiu, nominalmente. Ver docs/arquitetura/DECISOES.md, D2 e D4. */
const PARES_LEGITIMOS = [
    { modulo: 'auditoria', permissao: 'AUDITORIA_OPERACIONAL_CONSULTAR' },
    { modulo: 'fiscal', permissao: 'FISCAL_REPROCESSAR' },
    { modulo: 'seguranca', permissao: 'SEGURANCA_USUARIOS_INATIVAR' },
    { modulo: 'seguranca', permissao: 'SEGURANCA_USUARIOS_RESETAR_SENHA' },
    { modulo: 'tabelas-preco', permissao: 'TABELAS_PRECO_ATIVAR' },
    { modulo: 'tabelas-preco', permissao: 'TABELAS_PRECO_INATIVAR' },
    { modulo: 'tabelas-preco', permissao: 'TABELAS_PRECO_ITENS_GERENCIAR' }
] as const;

const raizDoProjeto = process.cwd();

/** Pares "modulo PERMISSAO" que a análise acusa na raiz dada. */
const paresAcusadosEm = async (raiz: string): Promise<Set<string>> => {
    const lib = await import(
        path.join(raizDoProjeto, 'scripts/lib/guard-permission-map.mjs').replace(/\\/g, '/')
    );
    const divergencias = lib.analyzeGuardDivergences(lib.readGuardPermissionMapInputs(raiz));
    return new Set(
        (divergencias.chamadaSemGuard ?? []).map(
            (item: { module: string; requiredPermission: string }) =>
                `${item.module} ${item.requiredPermission}`
        )
    );
};

describe('Gate de permissão × guard — prova histórica (F1.6.b)', () => {
    let arvoreAntiga = '';
    let paresNaArvoreAntiga = new Set<string>();
    let paresHoje = new Set<string>();

    beforeAll(async () => {
        const destino = path.join(mkdtempSync(path.join(tmpdir(), 'gate-prova-')), 'b51');
        execSync(`git worktree add --detach "${destino}" ${REF_COM_DEFEITOS}`, {
            cwd: raizDoProjeto,
            stdio: 'pipe'
        });
        arvoreAntiga = destino;

        paresNaArvoreAntiga = await paresAcusadosEm(arvoreAntiga);
        paresHoje = await paresAcusadosEm(raizDoProjeto);
    }, 120_000);

    afterAll(() => {
        if (!arvoreAntiga) return;
        try {
            execSync(`git worktree remove --force "${arvoreAntiga}"`, {
                cwd: raizDoProjeto,
                stdio: 'pipe'
            });
        } catch {
            if (existsSync(arvoreAntiga)) rmSync(arvoreAntiga, { recursive: true, force: true });
        }
    });

    it('a árvore de referência é mesmo a anterior à correção', () => {
        const tela = readFileSync(
            path.join(arvoreAntiga, 'features/tabelas-preco/components/TabelasPrecoPage.tsx'),
            'utf8'
        );
        // Se esta asserção cair, a worktree não é a b51 e todo o resto do arquivo é teatro.
        expect(tela).not.toContain('TABELAS_PRECO_ATIVAR');
    });

    it.each(PARES_LEGITIMOS)(
        'acusa $modulo $permissao na árvore com defeito',
        ({ modulo, permissao }) => {
            expect([...paresNaArvoreAntiga].sort()).toContain(`${modulo} ${permissao}`);
        }
    );

    it.each(PARES_LEGITIMOS)(
        'não acusa $modulo $permissao na árvore de hoje',
        ({ modulo, permissao }) => {
            expect([...paresHoje].sort()).not.toContain(`${modulo} ${permissao}`);
        }
    );

    it('o que sobra hoje é só a classe órfã, e está registrada nominalmente', () => {
        const registro = JSON.parse(
            readFileSync(path.join(raizDoProjeto, 'scripts/guard-permission-map.allowlist.json'), 'utf8')
        );
        const registrados = new Set(
            registro.chamadaSemGuard.map(
                (item: { module: string; requiredPermission: string }) =>
                    `${item.module} ${item.requiredPermission}`
            )
        );

        // Toda divergência que o gate acusa hoje precisa estar no registro, uma a uma.
        for (const par of paresHoje) expect([...registrados]).toContain(par);

        // E o teto acompanha o tamanho da lista: catraca de sentido único.
        expect(registro.teto.chamadaSemGuard).toBe(registro.chamadaSemGuard.length);
        expect(registro.status).toBe('registro-fechado-monotonico');
        expect(registro.suppressions).toHaveLength(0);
    });

    it('os órfãos registrados são os módulos sem página ativa', () => {
        const registro = JSON.parse(
            readFileSync(path.join(raizDoProjeto, 'scripts/guard-permission-map.allowlist.json'), 'utf8')
        );
        const porModulo: Record<string, number> = {};
        for (const item of registro.chamadaSemGuard) {
            porModulo[item.module] = (porModulo[item.module] ?? 0) + 1;
        }
        expect(porModulo).toEqual({ bancos: 7, auditoria: 1, relatorios: 1 });
    });

    it('o catálogo genérico continua com a divergência registrada e com alvo', () => {
        const registro = JSON.parse(
            readFileSync(path.join(raizDoProjeto, 'scripts/guard-permission-map.allowlist.json'), 'utf8')
        );
        const [entrada, ...resto] = registro.catalogoGenerico;
        expect(resto).toHaveLength(0);
        expect(entrada.resource).toBe('seguranca-grupos');
        expect(entrada.declaredPermission).toBe('SEGURANCA_PERMISSOES_GERENCIAR');
        // Alvo próprio: a decisão entre corrigir e remover o scaffold morto é da b54 (D2).
        // As chamadas órfãs, que são outra classe, apontam para F5.6.
        expect(entrada.target).toMatch(/b54/);
    });
});
