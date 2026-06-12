# Implementação v1.11.0a8b15 — correção de whitespace gate

## Objetivo

Corrigir o bloqueio de revisão causado por linha em branco extra no final de `docs/DIRETRIZES_UX_REFERENCIAS.md` e endurecer a validação preventiva para evitar recorrência.

## Correções aplicadas

- Removida linha em branco extra no EOF de `docs/DIRETRIZES_UX_REFERENCIAS.md`.
- Normalizados arquivos de texto versionáveis para não conter trailing whitespace.
- `scripts/validate-source.mjs` agora bloqueia arquivos que terminem com linha em branco extra no EOF.
- Atualizada diretriz global de UX/revisão para exigir:
  - ausência de espaços finais;
  - ausência de linha em branco extra no final do arquivo;
  - execução de `git diff --check` e `git diff --cached --check` antes de commit.
- Atualizada versão para `1.11.0a8b15`.

## Escopo funcional

Não houve alteração em regra fiscal, contrato HTTP, payload, permissão, workflow ou comportamento operacional da tela fiscal.

## Validação recomendada

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

O arquivo `package-lock.json` gerado localmente por `npm install` não deve ser incluído no commit se ele não fizer parte do controle de versão atual do projeto.
