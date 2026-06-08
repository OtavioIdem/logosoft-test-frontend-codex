# Implementação v1.11.0a8b28.c1 — Correção do ci:gates com Playwright Chromium

## Classificação da revisão anterior

```text
v1.11.0a8b28 — bloqueada para commit
```

A versão `v1.11.0a8b28` passou nos testes principais, mas ficou bloqueada porque havia divergência semântica entre a documentação e o script local `ci:gates`.

## Motivo do bloqueio

O workflow `.github/workflows/frontend-ci.yml` executava:

```bash
npx playwright install chromium
```

antes do E2E fiscal. Porém o script local `ci:gates` não continha esse passo, embora a documentação da versão B27 definisse esse script como a sequência local equivalente ao CI.

Em uma máquina limpa, `npm run ci:gates` poderia falhar nos testes Playwright caso o Chromium ainda não estivesse instalado.

## Escopo da correção

- Adicionado `npx playwright install chromium` ao script `ci:gates` antes de `npm run test:e2e:fiscal`.
- Reforçado `scripts/validate-ci-gates.mjs` para validar que `ci:gates` contém esse passo.
- Reforçado `scripts/validate-ci-gates.mjs` para validar a ordem: instalação do Chromium antes do E2E fiscal.
- Atualizado versionamento para `1.11.0a8b28.c1`.
- Atualizada a documentação `docs/CI_GATES_FRONTEND.md` com a regra local equivalente ao CI.
- Criada esta documentação corretiva.

## Arquivos alterados

```text
package.json
config/app.ts
.github/workflows/frontend-ci.yml
scripts/validate-ci-gates.mjs
docs/CI_GATES_FRONTEND.md
docs/IMPLEMENTACAO_V1_11_0A8B28_C1.md
```

## O que não foi alterado

- Nenhuma tela produtiva.
- Nenhum client de API.
- Nenhum mock/store.
- Nenhum fluxo fiscal.
- Nenhum contrato de backend.
- Nenhum teste existente foi reescrito.
- Nenhuma regra de negócio foi alterada.

## Validações executadas neste pacote

```bash
node scripts/validate-ci-gates.mjs
node scripts/validate-skills.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
npm run validate:ci
npm run validate:skills
npm run validate:guid-references
npm run validate:fiscal:production
npm run validate:source
```

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
npm run validate:skills
npm run validate:ci
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run ci:gates
git diff --check
git diff --cached --check
```

Observação: após esta correção, `npm run ci:gates` já executa `npx playwright install chromium` antes do E2E fiscal. Não é mais necessário rodar esse comando manualmente antes do `ci:gates` em uma máquina limpa.

## Critério de aceite

A correção deve ser aprovada somente se:

```text
package.json.scripts["ci:gates"] contém npx playwright install chromium.
O comando aparece antes de npm run test:e2e:fiscal.
scripts/validate-ci-gates.mjs bloqueia regressão caso esse passo seja removido.
validate:source permanece executando validate-ci-gates.
Nenhum arquivo fora do escopo foi alterado.
```
