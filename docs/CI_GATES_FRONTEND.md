# Gates obrigatórios de CI — LogoSoft Frontend v1.11.0a8b27

## 1. Objetivo

A versão `v1.11.0a8b27` formaliza o pipeline de CI do frontend para impedir que regressões conhecidas sejam aprovadas apenas por validação local incompleta.

O workflow oficial fica em:

```text
.github/workflows/frontend-ci.yml
```

## 2. Quando o pipeline roda

O pipeline roda em:

- `pull_request` para `main`, `master` e `develop`;
- `push` para `main`, `master` e `develop`;
- execução manual por `workflow_dispatch`.

## 3. Ambiente

O CI usa:

```text
node-version-file: .node-version
cache: npm
npm install
```

A versão de Node continua controlada pelo repositório. A instalação usa `npm install` para manter coerência com o procedimento operacional do projeto.

## 4. Gates executados

O workflow executa, nesta ordem:

```bash
npm install
npm run validate:source
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
```

Os testes de contrato fiscal e E2E fiscal backend continuam em modo opt-in. Sem variáveis reais de ambiente, eles devem pular de forma controlada, não simular integração real nem executar mutações acidentais.

## 5. Gate de proteção do próprio CI

Foi criado o comando:

```bash
npm run validate:ci
```

Esse comando valida que o workflow existe e contém os gates obrigatórios. O `validate:source` também executa essa validação, tornando regressão do pipeline bloqueante.

A partir da correção `v1.11.0a8b28.c1`, essa validação também garante que o script local `ci:gates` contenha `npx playwright install chromium` antes de `npm run test:e2e:fiscal`, para que uma máquina limpa consiga reproduzir localmente a sequência do CI sem depender de instalação manual prévia do navegador.

## 6. Regras de segurança

O CI não deve ativar mocks produtivos por variável `NEXT_PUBLIC_USE_MOCK_AUTH=true` ou `NEXT_PUBLIC_USE_MOCK_API=true`.

Os testes que precisam de dados simulados devem continuar usando interceptação controlada no Playwright ou fixtures de teste, sem fallback produtivo por mock.

## 7. Escopo desta versão

Esta versão não altera contratos de API, telas, mocks/store, payload fiscal, permissões, regra fiscal, sessão ou fluxo operacional.

A entrega é estrutural: adiciona pipeline, validação do pipeline e documentação operacional da CI.

## Gate de isolamento de mocks

A partir da `v1.11.0a8b29`, o CI também valida que mocks permanecem isolados em `tests/mocks` ou fixtures Playwright, sem retorno para diretórios produtivos.
