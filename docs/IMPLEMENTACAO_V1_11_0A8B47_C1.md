# Implementação v1.11.0a8b47.c1 — política de contexto por request

## Objetivo

Conectar o snapshot do `OrganizationalContextProvider` ao `httpClient` por uma política explícita de metadata, mantendo o rollout produtivo limitado aos endpoints administrativos cujo contrato foi confirmado.

## Arquivos alterados

- `lib/http/organizationalContextPolicy.ts`: snapshot somente leitura, `organizationalScopeKey`, metadata discriminada e regras de injeção segura.
- `lib/http/httpClient.ts`: aplicação da política antes da sanitização e preservação automática da metadata no retry de refresh.
- `providers/OrganizationalContextProvider.tsx`: publicação do snapshot no bridge HTTP e exposição da chave estável ao shell.
- `features/administracao/api/administracaoApi.ts`: metadata global para empresas e query obrigatória somente com `empresaId` para filiais.
- `features/administracao/hooks/useEmpresaFilialOptions.ts` e `features/administracao/components/AdministracaoPage.tsx`: bloqueio de consulta de filiais sem empresa.
- `components/organizational/OrganizationalContextSelector.tsx`: botão compacto no topbar.
- `components/organizational/OrganizationalContextDialog.tsx`: seleção de empresa/filial no Dialog PrimeReact, sem campos no topbar.
- `tests/unit/organizationalContextPolicy.test.ts`: omissão, injeção, divergência, FormData, chave e retry idempotente.
- `tests/unit/organizationalContextTopbarStructure.test.ts`: proteção estrutural contra pesquisa/select no topbar.
- `tests/unit/tabelasPrecoB40Structure.test.ts`, `tests/unit/atividadesB43Structure.test.ts`, `tests/unit/auditoriaB45Structure.test.ts`: validação do mapa sem supressões históricas.
- Artefatos de runtime/governança: `package.json`, `config/app.ts`, ambientes versionados, workflow CI, snapshots, README e CHANGELOG.

## Regras aplicadas

- Requests sem metadata não recebem contexto.
- `global` não injeta empresa/filial.
- `query` e `body` obrigatórios falham explicitamente quando não há empresa selecionada; um master global não executa request escopada obrigatória.
- Valores explícitos iguais ao snapshot permanecem idempotentes; valores divergentes geram erro de política e nunca são preservados ou sobrescritos silenciosamente.
- `FormData` nunca é alterado.
- O retry após refresh reutiliza a metadata e permanece idempotente.
- Usuário comum não altera o contexto; master escolhe empresa antes de filial e trocar a empresa limpa a filial pelo provider existente.

## Validação

Executar no checkout principal:

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/organizationalContextPolicy.test.ts tests/unit/organizationalContextTopbarStructure.test.ts tests/components/OrganizationalContextProvider.test.tsx tests/unit/tabelasPrecoB40Structure.test.ts tests/unit/atividadesB43Structure.test.ts tests/unit/auditoriaB45Structure.test.ts
git diff --check
```

Build, suíte completa, E2E real, commit e publicação ficaram fora desta fatia.

## Risco e limitação

O rollout HTTP permanece deliberadamente restrito a Administração. Os demais módulos continuam exigindo fatias posteriores com metadata própria; esta implementação não declara a Onda 1 concluída.
