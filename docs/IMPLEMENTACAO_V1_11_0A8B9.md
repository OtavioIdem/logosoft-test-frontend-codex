# Implementação v1.11.0a8b9 — Correção de whitespace e gate preventivo

## Objetivo

Corrigir o bloqueio final da revisão da `v1.11.0a8b8`, causado por trailing whitespace em `docs/CONTRATO_FISCAL_OFICIAL.md`, e tornar essa classe de erro uma validação recorrente do projeto.

## Correções aplicadas

- Removidos espaços finais das linhas iniciais de `docs/CONTRATO_FISCAL_OFICIAL.md`.
- Atualizado o contrato fiscal oficial para indicar `1.11.0a8b9`.
- Atualizado `package.json` para `1.11.0-a.8.b9`.
- Atualizado `logosoftVersion` para `1.11.0a8b9`.
- Atualizado `config/app.ts` para `1.11.0a8b9`.
- Alterado `.editorconfig` para também remover trailing whitespace em Markdown.
- Incluído gate preventivo em `scripts/validate-source.mjs` para bloquear trailing whitespace em arquivos de código, configuração, testes e documentação.

## Regra de revisão incorporada

A partir desta versão, toda entrega deve considerar trailing whitespace como bloqueio de revisão, mesmo quando `typecheck`, `lint`, `test:unit` e `build` estiverem passando.

## Validação esperada no ambiente oficial

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
```

## Escopo preservado

Esta versão não altera a regra funcional do módulo fiscal, não altera contrato de API e não mexe no mascaramento XML aprovado na etapa anterior.
