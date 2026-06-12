# Implementação v1.11.0a8b12 — Revisão de manutenção fiscal frontend

## Objetivo

Dar continuidade à revisão do módulo fiscal frontend após a aprovação da `v1.11.0a8b11`, com foco em manutenção de produção, experiência operacional e prevenção de regressões em referências, erros e whitespace.

## Escopo aplicado

- Reforço da regra global de referências: entidades relacionadas devem ser selecionadas via API/dropdown, sem digitação manual de GUID.
- Melhoria visual de loading e empty state nos selects pesquisáveis.
- Selects de empresa e filial agora propagam loading e mensagens vazias contextuais.
- Fluxos fiscais com referência vinda de contexto deixam de exibir campo editável/desabilitado com GUID e passam a mostrar mensagem operacional.
- `ApiErrorPanel` passa a exibir mensagem, código, HTTP status, traceId e até cinco erros de validação por campo.
- `mapApiError` passa a preservar metadados de erros fiscais encapsulados pelo client fiscal.
- Observabilidade fiscal passa a usar `ApiErrorPanel` para falhas de consulta e status de serviço.
- Atualização das diretrizes UX de referência.
- Atualização de versão para `1.11.0a8b12`.

## Arquivos alterados

- `package.json`
- `config/app.ts`
- `components/feedback/ApiErrorPanel.tsx`
- `components/forms/SearchSelect.tsx`
- `components/forms/EmpresaSelect.tsx`
- `components/forms/FilialSelect.tsx`
- `features/fiscal/components/FiscalActionDialogs.tsx`
- `features/fiscal/components/ObservabilidadeFiscalPage.tsx`
- `lib/http/apiError.ts`
- `tests/unit/apiError.test.ts`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `docs/DIRETRIZES_UX_REFERENCIAS.md`

## Validações esperadas no ambiente oficial

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

Nenhuma regra fiscal foi criada ou alterada. As mudanças são de UX, manutenção, tratamento de erro e prevenção de regressões.
