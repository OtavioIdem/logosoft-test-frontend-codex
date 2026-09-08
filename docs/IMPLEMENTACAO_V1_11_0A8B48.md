# Implementação v1.11.0a8b48

## 1. Versão

`v1.11.0a8b48` — `logosoftVersion: 1.11.0a8b48`, `package.json.version: 1.11.0-a.8.b48`.

## 2. Base utilizada

`v1.11.0a8b47.c3` (branch `codex/v1.11.0a8b48-f0-chao-gates-permissoes`), a partir dos commits `b695297` e
`450873d` (F0.1, feitos pelo devops): indentação de `frontend-ci.yml:31` corrigida e
`scripts/validate-ci-gates.mjs` reescrito para carregar o workflow com `js-yaml` de verdade.

## 3. Objetivo

Onda F0 do plano `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` — Passos 3 a 6: regenerar o snapshot de
permissões contra o contrato v1.23, criar o gate `validate:backend-permissions`, ligá-lo em todos os
pontos de execução do repositório e fazer o bump de versão que acompanha a entrega.

**Nota sobre esta seção 6 do plano (F5.7) vs. a skill 08 do repositório.** `PLANO-FRONTEND-v1.23.md:325`
pede "documento vivo atualizado — não um `IMPLEMENTACAO_*` novo". `skills/desenvolvimento/08_entrega_pacote_documentacao.md:22-36`
exige, para toda entrega, um markdown de versão com os 11 itens abaixo. As duas fontes conflitam
diretamente para esta entrega. Por instrução explícita do solicitante ("a skill do repositório
prevalece"), este documento existe apesar do que o plano pede — é a skill 08 que está sendo seguida,
não o item 6 do plano. `docs/CI_GATES_FRONTEND.md` também foi atualizado como o documento vivo que o
plano pede, então as duas obrigações estão cumpridas em paralelo, não uma no lugar da outra.

## 4. Arquivos adicionados

- `scripts/lib/backend-permissions.mjs` — extração compartilhada (mesmo padrão de
  `scripts/lib/backend-contract-map.mjs`): `SENTINELAS`, `parsePermissionUnion`, `parsePermissionCatalog`,
  `parseContractPermissions`, `parseCatalogSection`, `readPermissionInputs`, `buildSnapshot`,
  `comparePermissions`, `validatePermissionsAllowlist`.
- `scripts/generate-backend-permissions-snapshot.mjs` — script versionado (`generate:backend-permissions-snapshot`)
  que regenera `scripts/backend-permissions.snapshot.json`. Nunca entra em `ci:gates`.
- `scripts/backend-permissions.snapshot.json` — regenerado, `schemaVersion: 2`.
- `scripts/validate-backend-permissions.mjs` — o gate (`validate:backend-permissions`, `--report` via
  `report:backend-permissions`).
- `scripts/backend-permissions.allowlist.json` — registro auditável fechado e monotônico das divergências.
- `docs/IMPLEMENTACAO_V1_11_0A8B48.md` — este arquivo.

## 5. Arquivos alterados

- `package.json` — três scripts novos (`validate:backend-permissions`, `report:backend-permissions`,
  `generate:backend-permissions-snapshot`); `validate:backend-permissions` inserido em `ci:gates`
  imediatamente após `validate:backend-contract-map`; `version` e `logosoftVersion` no bump.
- `scripts/validate-source.mjs` — novo bloco `try/statSync/execFileSync` para
  `validate-backend-permissions.mjs`, logo após o de `validate-backend-contract-map.mjs`.
- `.github/workflows/frontend-ci.yml` — novo step "Validar permissões frontend/backend" após "Validar
  mapa de contratos frontend/backend"; `NEXT_PUBLIC_APP_VERSION` no bump.
- `scripts/validate-ci-gates.mjs` — `'validate:backend-permissions'` e `'report:backend-permissions'` em
  `requiredPackageScripts`; `'npm run validate:backend-permissions'` em `requiredCiGatesFragments` e em
  `requiredWorkflowFragments`; `'scripts/backend-permissions.allowlist.json'` em `currentVersionFiles` e
  no laço de coerência de `version`.
- `config/app.ts`, `.env.example`, `.env.test`, `.env.backend-controlled.example`,
  `scripts/backend-contract-map.allowlist.json`, `tests/evidence/integrated-e2e.assisted-evidence.example.json`
  — bump de versão.
- `README.md`, `CHANGELOG.md` — nova entrada de topo.
- `docs/CI_GATES_FRONTEND.md` — título atualizado; §4 reescrita com os 22 gates reais de `ci:gates` em
  ordem (a versão anterior listava 12); nova seção 8 descrevendo o gate de permissões e a divergência
  deliberada da política de tolerância zero.

## 6. Arquivos preservados (intocados por desenho)

- `types/erp.ts` — as 36 pendências são F1.2, os 3 fantasmas são F1.3; nenhum dos dois se corrige em F0.
- `features/seguranca/permissoesCatalogo.ts`.
- `features/`, `app/`, `components/`, `layout/`, `hooks/`, `providers/` — nenhuma mudança de runtime;
  `git diff --stat` não contém esses diretórios.
- `lib/security/routePermissions.ts`, `layout/AppMenu.tsx`, `tests/e2e/fixtures/logosoft.ts`,
  `tests/mocks/auth/mockAuthClient.ts`.
- `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` — `validate-backend-contract-map` continua ancorado nele
  (576 rotas); migrar o gate de rotas para o contrato v1.23 não é F0.
- `docs/backend-v1.23/*` — medição datada de terceiro; mesmo os números do plano que esta entrega
  corrige (ver seção 10) ficam como estão no próprio plano.
- `tests/unit/topbarButtonCssContract.test.ts:9` (`Regressão de v1.11.0a8b47.c3` — registro histórico
  correto) e `docs/IMPLEMENTACAO_V1_11_0A8B47_C3.md`.

## 7. O que não foi alterado

Nenhum contrato de API, tela, mock/store, payload fiscal, regra fiscal, sessão ou fluxo operacional.
Nenhuma dependência de produção nova (`js-yaml` já havia entrado em `devDependencies` no F0.1, antes
desta fatia). Nenhum teste foi escrito nesta entrega — `tests/unit/backendPermissions.test.ts` e
`tests/unit/ciWorkflowYaml.test.ts` ficam para o engenheiro-testes (ver seção 9).

## 8. Validações executadas

```bash
npm run generate:backend-permissions-snapshot   # duas vezes: segunda rodada, diff vazio (idempotente)
npm run validate:backend-permissions            # verde: 3 fantasmas + 36 pendências registrados, exit 0
npm run report:backend-permissions              # JSON no stdout, exit 0
npm run validate:ci                             # verde
npm run validate:source                         # verde (inclui o gate novo)
npm run typecheck                               # verde
npm run lint                                    # verde
```

**Prova de que o gate reprova (critério de pronto):** inserida a permissão inventada
`PERMISSAO_INVENTADA_TESTE_F0` no union de `types/erp.ts`, rodado `npm run validate:backend-permissions`
— saída com `exit code 1` e três falhas distintas:

```text
types/erp.ts: PERMISSAO_INVENTADA_TESTE_F0 no union PermissionCode sem entrada em features/seguranca/permissoesCatalogo.ts
PERMISSAO_INVENTADA_TESTE_F0: permissão fantasma (está no union PermissionCode, não está no snapshot documental) sem registro em scripts/backend-permissions.allowlist.json.fantasmasConhecidos
scripts/backend-permissions.allowlist.json: teto.fantasmas (3) excedido — observado 4
```

`types/erp.ts` foi revertido em seguida; `git status --short types/erp.ts` confirma zero diferença antes
do commit.

## 9. Validações pendentes por ambiente

- `npm run test:unit` — **fica vermelho** em `tests/unit/backendContractMap.test.ts:25-26`, que afirma
  `permissionsSnapshot.count === 177` (o formato antigo, `schemaVersion: 1`). O snapshot novo
  (`schemaVersion: 2`) tem `count: 179`. Isso é esperado e não foi corrigido aqui — é trabalho do
  engenheiro-testes, junto com a criação de `tests/unit/backendPermissions.test.ts` e
  `tests/unit/ciWorkflowYaml.test.ts`.
- `npm run ci:gates` — carrega a dívida herdada e já medida antes desta fatia: `test:e2e:fiscal` falha em
  `tests/e2e/fiscal.spec.ts:27` (timeout no heading "Nota fiscal 1/900001"). Fora do escopo de F0; não
  investigado nem corrigido nesta entrega.
- `npm run build`, `test:e2e:*`, `test:contract:*`, `test:e2e:integrated:backend`,
  `prepare:e2e:integrated:seed`, `report:e2e:integrated:assisted` não foram executados por instrução
  explícita do solicitante (fora do escopo desta verificação).
- Preview de navegador não foi aberto: esta entrega é infraestrutura de gate/CI (scripts Node e JSON),
  sem tela nova nem alteração de componente renderizado.

## 10. Riscos e observações

- **Números do plano corrigidos por medição direta.** `PLANO-FRONTEND-v1.23.md` fala em "37 ausentes";
  a medição real (`scripts/lib/backend-permissions.mjs` contra o union `PermissionCode` de `types/erp.ts`
  e a união das duas fontes documentais) dá **36 cobertura pendente + 3 fantasmas** — dois grupos
  distintos de divergência, não um único número. Não foi possível reconstituir como o plano chegou a 37;
  o código deste F0 usa os números medidos (36 e 3), e `docs/backend-v1.23/*` não foi corrigido, por
  instrução explícita — é medição datada de terceiro.
- **1 permissão não conciliada.** O contrato v1.23 declara 178 permissões nomeadas
  (`CONTRATO-API-v1.23.md:44`). A união nomeada medida entre as 172 permissões anexadas a operações do
  próprio contrato e as 175 nomeadas do catálogo §12 do documento canônico resulta em 177. Falta 1
  permissão sem fonte documental para nomeá-la — registrada honestamente em `naoConciliado` no snapshot,
  não inventada.
- **`SEGURANCA_SESSOES_GERENCIAR` como possível 4ª fantasma.** Está no union `PermissionCode` e no
  snapshot (via `semOperacaoEmV123`, porque só existe no catálogo §12 legado), então hoje não é
  divergência. Mas não tem nenhuma operação HTTP em v1.23. Se o catálogo §12 for podado numa próxima
  fatia do backend sem uma operação v1.23 equivalente aparecer, esta permissão vira fantasma real. Vale
  acompanhar antes de F1.3, não é ação desta entrega.
- **Allowlist de permissões é uma divergência deliberada da tolerância-zero do gate de rotas.** Documentada
  em `docs/CI_GATES_FRONTEND.md` §8: nasce vermelha porque já existe dívida medida (3 + 36); é um registro
  fechado e monotônico com teto, `expiresAt` e alvo por item — não uma supressão.
- `auditPolicy.expiresAt` de `scripts/backend-permissions.allowlist.json` foi fixado em
  `2026-12-31T23:59:59-03:00`, o mesmo ciclo de auditoria já usado por
  `scripts/backend-contract-map.allowlist.json` (a allowlist irmã) e dentro da janela planejada para as
  ondas F1.2/F1.3 no plano do backend v1.23.

## 11. Comandos para aplicar no repositório principal

```bash
git checkout codex/v1.11.0a8b48-f0-chao-gates-permissoes
npm install
npm run generate:backend-permissions-snapshot
npm run validate:source
npm run typecheck
npm run lint
```
