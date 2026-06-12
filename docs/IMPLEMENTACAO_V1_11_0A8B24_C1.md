# Implementação v1.11.0a8b24.c1 — Correção do E2E fiscal backend controlado

## 1. Motivo da correção

A versão `v1.11.0a8b24` foi bloqueada na revisão semântica do novo E2E fiscal com backend real/controlado.

O teste estava correto em intenção, mas usava seletores frágeis no diálogo de transmissão fiscal:

- `locator('input').nth(0)` para UF autorizadora;
- `locator('input').nth(1)` para schema set.

Como o `Dropdown` do PrimeReact também injeta elementos `input` no DOM, o seletor por índice poderia mirar um input oculto ou não editável quando `LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true`.

Também havia risco de envio de `filialId=` vazio na consulta de observabilidade quando a filial não fosse informada, embora `filialId` seja opcional no contrato fiscal.

## 2. Correções aplicadas

### 2.1 Seletores por campo no diálogo fiscal

Foi criado o helper:

```ts
const dialogFieldInput = (scope: Locator, label: string) =>
    scope.locator('.field').filter({ hasText: label }).locator('input:not([type="hidden"])').first();
```

A transmissão passou a preencher campos por escopo sem índice global:

```ts
await dialogFieldInput(transmitirDialog, 'UF autorizadora').fill(ufAutorizadora);
await dialogFieldInput(transmitirDialog, 'Schema set').fill(schemaSetName);
```

O preenchimento do `Schema set` do modal de geração de XML também passou a usar o mesmo helper, reduzindo fragilidade.

### 2.2 Omissão de filial vazia

A consulta de observabilidade passou a usar `URLSearchParams` e só adiciona `filialId` quando a variável existir:

```ts
const observabilidadeParams = new URLSearchParams({
    empresaId: empresaId ?? '',
    take: '10'
});
if (filialId) observabilidadeParams.set('filialId', filialId);
```

Isso preserva a regra de que filial é opcional e evita enviar `filialId=`.

## 3. Arquivos alterados

- `tests/e2e/fiscal-backend.spec.ts`
- `package.json`
- `config/app.ts`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `docs/IMPLEMENTACAO_V1_11_0A8B24.md`
- `docs/IMPLEMENTACAO_V1_11_0A8B24_C1.md`

## 4. Validação recomendada

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
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## 5. Observações

Esta correção não altera endpoint, payload fiscal, regra de negócio, permissão, workflow ou comportamento funcional esperado. Ela apenas torna o E2E backend controlado robusto contra estrutura interna do PrimeReact e contra parâmetro opcional vazio.

Quando esta versão for aprovada, o fluxo volta para a próxima versão normal: `v1.11.0a8b25`.
