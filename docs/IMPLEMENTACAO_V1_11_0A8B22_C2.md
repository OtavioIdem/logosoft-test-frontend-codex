# Implementação v1.11.0a8b22.c2 — Correção de seletores E2E fiscais restantes

## Contexto

A versão `v1.11.0a8b22.c1` corrigiu a ambiguidade do seletor global `Autorizada` no E2E fiscal mockado, porém a execução continuou bloqueada por novo seletor global ambíguo em `Gerado`.

O texto `Gerado` aparece em mais de um ponto da tela fiscal, incluindo mensagens, XML, DANFE e financeiro. O Playwright opera em strict mode, portanto o teste não deve usar seletores globais quando o texto é reutilizado pela interface.

## Correção aplicada

Arquivo alterado:

- `tests/e2e/fiscal.spec.ts`

Correções:

- Criado helper local `fiscalSummaryCard(page, label)` para localizar cards de resumo fiscal por rótulo exato.
- A validação de estoque passou a ser escopada no card de resumo `Estoque`.
- A validação de financeiro passou a ser escopada no card de resumo `Financeiro`.
- Mantida a validação de `Autorizada` escopada no card `Governança fiscal`.

## Antes

```ts
await expect(page.getByText('Baixado')).toBeVisible();
await expect(page.getByText('Gerado')).toBeVisible();
```

## Depois

```ts
await expect(fiscalSummaryCard(page, 'Estoque').getByText('Baixado', { exact: true })).toBeVisible();
await expect(fiscalSummaryCard(page, 'Financeiro').getByText('Gerado', { exact: true })).toBeVisible();
```

## Critério de aceite

A correção deve permitir que o E2E fiscal mockado avance sem violação de strict mode causada por textos reaproveitados na tela.

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
git diff --check
git diff --cached --check
```

## Pontos críticos

- Não foram alteradas regras fiscais.
- Não foram alterados payloads fiscais.
- Não foram alterados endpoints.
- Não foram alteradas permissões.
- A alteração é exclusivamente de robustez do teste E2E mockado.

## Versionamento

Versão corrigida: `1.11.0a8b22.c2`.
