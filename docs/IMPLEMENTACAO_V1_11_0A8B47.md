# Implementação v1.11.0a8b47 — contexto organizacional global

## Objetivo

Criar a fonte única de contexto organizacional do frontend a partir da identidade confirmada por `GET /api/auth/me`, sem injetar campos automaticamente nos contratos HTTP existentes.

## Alterações

- `providers/OrganizationalContextProvider.tsx`: contexto efetivo por identidade, seleção de master, reset seguro e coordenação de cache.
- `hooks/useOrganizationalContext.ts`: acesso estrito ao provider, com erro explícito fora da árvore correta.
- `components/organizational/OrganizationalContextSelector.tsx`: seleção responsiva de empresa e filial no topbar.
- `providers/AppProviders.tsx` e `layout/AppTopbar.tsx`: integração do contexto na árvore autenticada e na interface global.
- `tests/components/OrganizationalContextProvider.test.tsx`: cobertura de usuário comum, master, troca de identidade e wiring obrigatório.
- `scripts/validate-ci-gates.mjs`: consistência da versão corrente entre runtime, CI, ambientes e artefatos de governança.

## Regras

- Usuário comum sempre usa `empresaId` e `filialId` retornados por `/me`; setters não alteram o contexto.
- Master com `Guid.Empty` inicia global e deve selecionar empresa antes da filial.
- Trocar empresa zera a filial no mesmo update.
- Refresh do mesmo master preserva a seleção; troca de identidade a descarta e limpa o cache.
- Requests ainda não recebem contexto automaticamente nesta versão.

## Validação

- Validadores estruturais executáveis sem dependências locais passaram.
- `git diff --check` passou.
- Typecheck, lint, Vitest e build dependem das dependências locais do projeto e permanecem como gates obrigatórios antes da publicação.
