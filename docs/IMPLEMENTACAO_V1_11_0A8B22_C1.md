# Implementação v1.11.0a8b22.c1 — Correção do E2E fiscal mockado

## 1. Objetivo

Esta versão é uma correção incremental da `v1.11.0a8b22`, seguindo o padrão de versões de correção `c1`, `c2`, `c3` quando uma subversão `b` é bloqueada em revisão.

A `v1.11.0a8b22` adicionou o E2E fiscal principal mockado. A revisão bloqueou o commit porque o teste Playwright usava um seletor ambíguo para o texto `Autorizada`.

## 2. Bloqueio corrigido

Arquivo:

```txt
tests/e2e/fiscal.spec.ts
```

Problema:

```ts
await expect(page.getByText('Autorizada')).toBeVisible();
```

Esse seletor não era seguro em strict mode, pois a tela contém múltiplos textos relacionados a `Autorizada`, incluindo status, etapa do workflow, título de ações e data de autorização.

## 3. Correção aplicada

A asserção foi escopada para o card de governança fiscal, onde o objetivo do teste é validar o status atual da nota após a transmissão mockada.

```ts
const governancaFiscalCard = page.locator('.p-card').filter({ hasText: 'Governança fiscal' });
await expect(governancaFiscalCard.getByText('Autorizada', { exact: true })).toBeVisible();
```

Com isso, o teste deixa de depender de busca global por texto parcial e passa a validar a área correta da tela.

## 4. Escopo mantido

Esta versão não altera:

- contrato fiscal;
- payloads;
- hooks;
- API client;
- regras de workflow;
- permissões;
- fixtures E2E;
- comportamento funcional do módulo fiscal.

A alteração é limitada ao teste E2E e ao versionamento/documentação da correção.

## 5. Versionamento

Atualizado para:

```txt
1.11.0a8b22.c1
```

Arquivos atualizados:

- `package.json`;
- `config/app.ts`;
- `docs/CONTRATO_FISCAL_OFICIAL.md`;
- `docs/IMPLEMENTACAO_V1_11_0A8B22_C1.md`.

## 6. Validação esperada no repositório principal

Rodar:

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

## 7. Pontos críticos para revisão

- O seletor corrigido deve permanecer escopado, evitando `getByText` global para textos comuns.
- O teste continua mockado; ainda não valida backend real, banco, auditoria ou SEFAZ real.
- O Playwright precisa ter o Chromium instalado no ambiente de validação.
- Esta correção não substitui a etapa futura de E2E fiscal com backend real/controlado.

## 8. Próximo passo após aprovação

Se esta correção for aprovada e commitada, o desenvolvimento volta para a linha normal em:

```txt
v1.11.0a8b23
```

Caso ainda haja bloqueio sobre a B22, a próxima correção deve ser:

```txt
v1.11.0a8b22.c2
```
