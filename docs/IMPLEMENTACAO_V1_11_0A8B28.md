# Implementação v1.11.0a8b28 — Skills operacionais para desenvolvimento e review

## Base utilizada

```text
v1.11.0a8b27 — Pipeline/CI com gates obrigatórios
```

## Objetivo

Criar uma pasta raiz `skills/` para centralizar procedimentos operacionais reutilizáveis pelo ChatGPT durante o desenvolvimento e pelo Codex durante code review, validação, decisão de commit ou bloqueio técnico.

## Escopo implementado

- Criada a pasta `skills/desenvolvimento` com normas de desenvolvimento, versionamento, workflow, ERP real, módulos especializados, fiscal frontend, integração sem mocks, testes/gates e entrega de pacote.
- Criada a pasta `skills/review` com procedimentos de revisão, validações obrigatórias, review por git, review funcional, mocks/GUID/fiscal, critérios de commit/bloqueio e modelo de relatório técnico.
- Criado o gate `scripts/validate-skills.mjs`.
- Adicionado o script `validate:skills` ao `package.json`.
- Integrado `validate:skills` ao `validate:source`.
- Atualizado `ci:gates` para executar `validate:skills` de forma explícita.
- Criada documentação consolidada em `docs/SKILLS_OPERACIONAIS_LOGOSOFT.md`.
- Atualizado versionamento para `1.11.0a8b28`.

## Arquivos adicionados

```text
skills/README.md
skills/desenvolvimento/README.md
skills/desenvolvimento/00_normas_gerais.md
skills/desenvolvimento/01_fluxo_versionamento.md
skills/desenvolvimento/02_workflow_implementacao.md
skills/desenvolvimento/03_frontend_erp_real.md
skills/desenvolvimento/04_modulos_especializados.md
skills/desenvolvimento/05_fiscal_frontend.md
skills/desenvolvimento/06_integracao_api_sem_mocks.md
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/desenvolvimento/08_entrega_pacote_documentacao.md
skills/review/README.md
skills/review/00_papel_do_reviewer.md
skills/review/01_procedimento_review.md
skills/review/02_validacoes_obrigatorias.md
skills/review/03_review_git_escopo.md
skills/review/04_review_funcional_tela_fluxo.md
skills/review/05_review_mocks_guid_fiscal.md
skills/review/06_criterios_commit_bloqueio.md
skills/review/07_modelo_relatorio_bloqueio.md
scripts/validate-skills.mjs
docs/SKILLS_OPERACIONAIS_LOGOSOFT.md
docs/IMPLEMENTACAO_V1_11_0A8B28.md
```

## Arquivos alterados

```text
package.json
config/app.ts
scripts/validate-source.mjs
```

## O que não foi alterado

- Não houve alteração em telas produtivas.
- Não houve alteração em clients de API.
- Não houve alteração em mocks/store.
- Não houve alteração em contratos fiscais.
- Não houve alteração em permissões ou fluxo de autenticação.
- Não houve alteração em testes existentes, exceto inclusão de novo gate documental.

## Validações executadas

```bash
node scripts/validate-skills.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-source.mjs
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
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## Riscos e observações

- Esta versão é documental/operacional e não altera runtime do produto.
- O gate `validate:skills` evita perda acidental da estrutura `skills/` em versões futuras.
- A próxima versão de review pode reutilizar diretamente `skills/review` como checklist operacional do Codex.
