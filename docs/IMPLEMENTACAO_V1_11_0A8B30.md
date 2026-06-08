# Implementação v1.11.0a8b30 — Validação real/controlada frontend/backend

## Estado da versão anterior

Base aprovada de retomada:

```text
v1.11.0a8b29 — Isolamento definitivo de mocks produtivos
```

A B29 foi aplicada, commitada e enviada ao GitHub. A B30 avança para a próxima etapa funcional: preparar a validação controlada do frontend contra backend real sem reintroduzir mocks produtivos.

## Objetivo da B30

A B30 prepara o projeto para validação frontend/backend real/controlada e documenta o que ainda falta implementar.

Esta versão não executa integração real contra produção e não transforma suítes opt-in em execução obrigatória. O objetivo é garantir que o projeto tenha:

1. template seguro de variáveis para ambiente controlado;
2. documentação clara de como executar contrato e E2E real/controlado;
3. gate estrutural para impedir regressão de segurança nessa validação;
4. levantamento formal das pendências funcionais, técnicas e de testes.

## Arquivos criados

```text
.env.backend-controlled.example
docs/BACKEND_CONTROLLED_VALIDATION.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md
docs/IMPLEMENTACAO_V1_11_0A8B30.md
scripts/validate-backend-controlled.mjs
tests/unit/backendControlledValidation.test.ts
```

## Arquivos alterados

```text
package.json
config/app.ts
.env.example
.env.test
.github/workflows/frontend-ci.yml
scripts/validate-source.mjs
scripts/validate-ci-gates.mjs
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/review/02_validacoes_obrigatorias.md
README.md
CHANGELOG.md
```

## O que foi implementado

### Gate validate:backend-controlled

Criado o script:

```bash
npm run validate:backend-controlled
```

Esse gate valida:

- existência da documentação de backend controlado;
- existência do levantamento de pendências;
- existência do template `.env.backend-controlled.example`;
- ausência de token/JWT/segredo real no template;
- manutenção de opt-in nas suítes fiscais contra backend;
- exigência de `LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true` para fluxo mutável;
- integração do gate ao `validate:source`, `ci:gates` e workflow;
- ausência de tokens reais no GitHub Actions padrão.

### Template seguro de ambiente

Criado:

```text
.env.backend-controlled.example
```

O arquivo lista variáveis necessárias para:

- contrato fiscal backend controlado;
- E2E fiscal backend mutável/controlado;
- frontend local apontando para API real/controlada.

O arquivo não contém token real, senha, certificado ou segredo.

### Documentação da validação controlada

Criado:

```text
docs/BACKEND_CONTROLLED_VALIDATION.md
```

O documento explica:

- quando usar ambiente controlado;
- quais variáveis preencher;
- como executar contrato fiscal;
- como executar E2E fiscal backend;
- quais dados mínimos o backend precisa ter;
- o que não deve ser feito;
- critérios de aprovação da preparação B30.

### Levantamento do que falta implementar

Criado:

```text
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md
```

O levantamento separa pendências por:

- validação real;
- Fiscal;
- Financeiro;
- Estoque;
- Vendas;
- Compras;
- Segurança;
- Administração/Pessoas/Clientes/Fornecedores;
- Produtos;
- Auditoria;
- Dashboard/Relatórios;
- Integrações/Contábil/RH/Suporte;
- testes ainda necessários;
- pendências técnicas e operacionais.

### Integração aos gates existentes

Atualizações realizadas:

```text
validate:source -> executa validate-backend-controlled
ci:gates -> executa validate-backend-controlled antes das suítes opt-in
GitHub Actions -> executa validate:backend-controlled
validate-ci-gates -> exige o novo gate
```

### Skills atualizadas

As skills foram ajustadas para incluir o novo gate nas validações obrigatórias de desenvolvimento e review.

## O que não foi alterado

- Nenhuma tela produtiva.
- Nenhum client real de API.
- Nenhum mock/store.
- Nenhum contrato fiscal de payload.
- Nenhum fluxo real de autenticação.
- Nenhuma regra fiscal.
- Nenhuma permissão.
- Nenhuma suíte opt-in foi transformada em execução mutável obrigatória.

## Validações executadas neste ambiente

```bash
node scripts/validate-backend-controlled.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-skills.mjs
node scripts/validate-mocks-isolation.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
npm run validate:backend-controlled
npm run validate:source
npm run validate:ci
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
```

## Validações pendentes no repositório principal

Executar com Node 24/npm 11:

```bash
npm install
npm run validate:source
npm run validate:backend-controlled
npm run validate:mocks-isolation
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

Quando houver backend controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

## Riscos e observações

- A B30 prepara a validação controlada; ela não comprova sozinha que o backend real está pronto.
- As suítes opt-in podem continuar skipped quando não houver variáveis reais/controladas.
- O E2E fiscal backend é mutável e deve rodar apenas em homologação, sandbox ou base descartável.
- A validação fiscal oficial continua dependendo de backend, contador/consultor fiscal e documentação vigente.

## Próxima etapa recomendada

Após aprovação da B30:

```text
v1.11.0a8b31 — Execução acompanhada do contrato frontend/backend em ambiente real/controlado
```

Essa próxima versão deve usar um backend preparado, coletar evidências reais, registrar divergências de contrato e transformar falhas em correções específicas.
