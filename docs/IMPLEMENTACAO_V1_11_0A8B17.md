# Implementação v1.11.0a8b17 — hardening das ações fiscais por workflow

## Objetivo

Reforçar a segurança operacional das ações fiscais no detalhe da nota fiscal, reduzindo o risco de ação indevida por permissão visual isolada.

## Escopo implementado

- Criado `FiscalWorkflowActionState` para representar estado de ação fiscal com origem, habilitação e motivo de bloqueio.
- Criado `resolveFiscalWorkflowActionState` para combinar workflow operacional com fallback do resumo/status.
- Criado `fiscalActionDisabledReason` para expor motivo operacional quando uma ação fica bloqueada.
- Criado `createFiscalCorrelationId` como helper fiscal central para operações críticas.
- Mantido `gerarCorrelationId` como alias de compatibilidade.
- `NotaFiscalDetalhePage` passou a usar estados centralizados para:
  - validar;
  - gerar XML;
  - assinar XML;
  - transmitir;
  - registrar rejeição;
  - cancelar local/SEFAZ;
  - carta de correção;
  - consultar protocolo;
  - contingência;
  - baixar estoque;
  - gerar financeiro;
  - gerar DANFE.
- Registro de rejeição técnica deixou de ficar disponível apenas por permissão e passou a respeitar workflow/status.
- Botões bloqueados passam a preservar motivo operacional via `title`.
- Adicionados testes unitários para workflow bloqueado, rejeição técnica e correlationId fiscal.
- Atualizada a diretriz global de UX/referências com regras de ações fiscais por workflow.
- Atualizada versão para `1.11.0a8b17`.

## O que não foi alterado

- Não houve alteração de endpoint.
- Não houve alteração de DTO fiscal oficial.
- Não houve criação de regra fiscal legal no frontend.
- Não houve alteração em cálculo tributário, XML, SEFAZ ou regras de cancelamento/carta de correção.

## Validação local executada

```bash
node scripts/validate-source.mjs
```

Resultado: aprovado.

## Validação recomendada no repositório principal

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```
