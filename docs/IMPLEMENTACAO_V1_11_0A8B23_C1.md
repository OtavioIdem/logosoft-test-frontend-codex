# Implementação v1.11.0a8b23.c1 — Correção do contrato fiscal backend/controlado

## 1. Contexto

A versão `v1.11.0a8b23` foi bloqueada na revisão por dois problemas técnicos na nova suíte de contrato fiscal contra backend real/controlado:

1. `npm run typecheck` falhava porque `tests/contract/fiscal-backend.contract.spec.ts` usava `for...of` sobre `array.entries()` em um projeto compilado com `target: "es5"`.
2. `npm run test:contract:fiscal` não encontrava testes porque o `playwright.config.ts` oficial aponta `testDir: './tests/e2e'`.

Esta versão é uma correção direta da B23, portanto segue o padrão `v1.11.0a8b23.c1`.

## 2. Correções aplicadas

### 2.1 Typecheck da suíte de contrato

Substituídos os loops com:

```ts
for (const [index, item] of items.entries())
```

por:

```ts
items.forEach((item, index) => {})
```

Arquivos ajustados:

- `tests/contract/fiscal-backend.contract.spec.ts`

Pontos corrigidos:

- validação dos itens da listagem fiscal;
- validação dos XMLs do detalhe fiscal;
- validação das próximas ações do workflow;
- validação dos logs de integração da nota.

### 2.2 Configuração própria do Playwright para contrato

Criado:

- `playwright.contract.config.ts`

Configuração:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/contract',
    testMatch: /.*\.contract\.spec\.ts/,
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    use: {
        trace: 'retain-on-failure'
    }
});
```

### 2.3 Script corrigido

Atualizado em `package.json`:

```json
"test:contract:fiscal": "playwright test --config=playwright.contract.config.ts"
```

Com isso, os testes de contrato ficam separados dos E2E de UI e não dependem do `testDir: './tests/e2e'`.

## 3. O que não foi alterado

Não houve alteração em:

- endpoints fiscais;
- payloads fiscais;
- regras de negócio;
- permissões;
- workflow fiscal;
- observabilidade;
- E2E mockado da B22.c2.

## 4. Validação executada no pacote

Executado:

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi verificado:

- trailing whitespace;
- linha em branco extra no EOF.

## 5. Validação obrigatória no repositório principal

Antes de commit, executar:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
git diff --check
git diff --cached --check
```

Para contrato real/controlado com backend disponível:

```bash
LOGOSOFT_CONTRACT_API_URL=http://localhost:8080 \
LOGOSOFT_CONTRACT_ACCESS_TOKEN=token-jwt-valido \
LOGOSOFT_CONTRACT_EMPRESA_ID=11111111-1111-1111-1111-111111111111 \
npm run test:contract:fiscal
```

## 6. Pontos críticos para revisão

- Confirmar que `npm run typecheck` não acusa mais `downlevelIteration`.
- Confirmar que `npm run test:contract:fiscal` descobre `tests/contract/fiscal-backend.contract.spec.ts`.
- Confirmar que, sem variáveis `LOGOSOFT_CONTRACT_*`, a suíte fica skipada sem falhar.
- Confirmar que, com variáveis reais/controladas, a suíte consulta apenas endpoints seguros por padrão.
- Confirmar que exportação CSV e status de serviço continuam opt-in por flags explícitas.

## 7. Próxima etapa após aprovação

Quando esta correção for aprovada, voltar para a linha normal:

```txt
v1.11.0a8b24 — E2E fiscal com backend real/controlado
```
