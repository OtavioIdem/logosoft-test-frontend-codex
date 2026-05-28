# Implementação v1.11.0a8b19 — correção de correlationId fiscal sanitizado

## Objetivo

Corrigir o bloqueio encontrado na revisão da v1.11.0a8b18, em que o payload de inutilização fiscal perdia o campo `correlationId` durante a sanitização antes do envio ao backend.

## Problema corrigido

O helper genérico `sanitizePayload` tratava qualquer chave terminada em `Id` como referência técnica/GUID. Como `correlationId` termina em `Id`, o valor textual `front-inutilizacao-001` era considerado inválido como GUID e removido do payload final.

Esse comportamento quebrava o contrato operacional fiscal, porque operações críticas como inutilização precisam enviar `correlationId` para auditoria e idempotência da tentativa.

## Alterações realizadas

- Criada exceção explícita para campos que são identificadores operacionais, mas não GUID:
  - `correlationId`;
  - `correlationID`;
  - `correlation_id`;
  - `correlationIdOriginal`;
  - `correlationIDOriginal`.
- `isGuidField` continua protegendo campos técnicos como `empresaId`, `filialId`, `pessoaId`, `produtoId` e similares.
- Adicionado teste unitário em `requestUtils.test.ts` garantindo que `correlationId` textual seja preservado e GUID inválido continue sendo removido.
- O teste fiscal existente de inutilização passa a ter suporte correto pelo sanitizador.
- Atualizada versão para `1.11.0a8b19`.

## Arquivos alterados

- `lib/http/requestUtils.ts`
- `tests/unit/requestUtils.test.ts`
- `docs/DIRETRIZES_UX_REFERENCIAS.md`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `config/app.ts`
- `package.json`

## Validações recomendadas

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

## Observação

Não houve alteração de endpoint, payload fiscal documentado, regra de negócio fiscal ou comportamento visual. A correção foi limitada à preservação do identificador operacional no payload sanitizado.
