# Gates obrigatórios de CI — LogoSoft Frontend v1.11.0a8b49

## 1. Objetivo

A versão `v1.11.0a8b27` formaliza o pipeline de CI do frontend para impedir que regressões conhecidas sejam aprovadas apenas por validação local incompleta.

O workflow oficial fica em:

```text
.github/workflows/frontend-ci.yml
```

## 2. Quando o pipeline roda

O pipeline roda em:

- `pull_request` para `main`, `master` e `develop`;
- `push` para `main`, `master` e `develop`;
- execução manual por `workflow_dispatch`.

## 3. Ambiente

O CI usa:

```text
node-version-file: .node-version
cache: npm
npm install
```

A versão de Node continua controlada pelo repositório. A instalação usa `npm install` para manter coerência com o procedimento operacional do projeto.

## 4. Gates executados

O workflow executa, nesta ordem (lista viva — atualizar sempre que `ci:gates` mudar; conferir contra `package.json` em caso de dúvida):

```bash
npm install
npm run validate:source
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:backend-controlled
npm run validate:controlled-seeds
npm run validate:integrated-runbook
npm run validate:backend-seed-reset
npm run validate:assisted-e2e
npm run validate:integrated-e2e
npm run validate:operational-contracts
npm run validate:backend-contract-map
npm run validate:backend-permissions
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
```

> **A partir da `v1.11.0a8b48`, o passo de E2E do CI é `npm run test:e2e` — a suíte mockada
> inteira, e não só a spec fiscal.** A configuração padrão do Playwright é a da suíte mockada: ela
> ignora por nome as duas specs que exigem backend real (`fiscal-backend` e `integrated-backend`,
> que têm config própria), de modo que **uma spec mockada nova entra no gate sozinha** em vez de
> nunca rodar. A execução é serial no CI porque o `webServer` sobe o servidor de desenvolvimento,
> que compila rota sob demanda: com workers concorrentes, o primeiro acesso estoura o timeout da
> asserção e a falha é intermitente, sem ser defeito do teste.

`npm run validate:source` já executa a maior parte desses gates internamente (ver `scripts/validate-source.mjs`), então rodá-lo localmente antes de abrir um PR pega a maioria das regressões antes do CI.

Os testes de contrato fiscal, contrato operacional e E2E fiscal backend continuam em modo opt-in. Sem variáveis reais de ambiente, eles devem pular de forma controlada, não simular integração real nem executar mutações acidentais.

## 5. Gate de proteção do próprio CI

Foi criado o comando:

```bash
npm run validate:ci
```

Esse comando valida que o workflow existe e contém os gates obrigatórios. O `validate:source` também executa essa validação, tornando regressão do pipeline bloqueante.

A partir da correção `v1.11.0a8b28.c1`, essa validação também garante que o script local `ci:gates` contenha `npx playwright install chromium` antes de `npm run test:e2e`, para que uma máquina limpa consiga reproduzir localmente a sequência do CI sem depender de instalação manual prévia do navegador.

## 6. Regras de segurança

O CI não deve ativar mocks produtivos por variável `NEXT_PUBLIC_USE_MOCK_AUTH=true` ou `NEXT_PUBLIC_USE_MOCK_API=true`.

Os testes que precisam de dados simulados devem continuar usando interceptação controlada no Playwright ou fixtures de teste, sem fallback produtivo por mock.

## 7. Escopo desta versão

Esta versão não altera contratos de API, telas, mocks/store, payload fiscal, permissões, regra fiscal, sessão ou fluxo operacional.

A entrega é estrutural: adiciona pipeline, validação do pipeline e documentação operacional da CI.

## Gate de isolamento de mocks

A partir da `v1.11.0a8b29`, o CI também valida que mocks permanecem isolados em `tests/mocks` ou fixtures Playwright, sem retorno para diretórios produtivos.

## 8. Gate de permissões frontend/backend (`validate:backend-permissions`, `v1.11.0a8b48`)

Compara o union `PermissionCode` (`types/erp.ts`) contra `scripts/backend-permissions.snapshot.json` — a união nomeada de duas fontes documentais: as permissões anexadas a cada operação de `docs/backend-v1.23/CONTRATO-API-v1.23.md` e o catálogo `Constante C# → Código` da seção "12. Catálogo de permissões" de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`. O snapshot é regenerado por `npm run generate:backend-permissions-snapshot` (nunca roda em CI — escreve arquivo) e re-derivado a cada execução do gate; se o arquivo commitado divergir do que as fontes produzem, o gate reprova.

Duas direções de divergência, ambas reprovam:

- **Fantasma** — código no union sem correspondência no snapshot: um `PermissionGuard`/`routePermissions` que exige essa string nunca habilita para nenhum usuário real, porque o backend nunca concede essa permissão.
- **Cobertura pendente** — código no snapshot sem correspondência no union: o backend tem a permissão, mas o frontend não consegue referenciá-la em nenhum guard.

Toda divergência precisa estar registrada em `scripts/backend-permissions.allowlist.json`, com `usos`/`backendOperacoes` reais e um alvo de onda (`F1.2` para cobertura pendente, `F1.3` para fantasma). Uma entrada que deixar de corresponder a uma divergência observada reprova o gate (anti-apodrecimento) — corrigir o union sem remover a entrada da allowlist quebra o build.

### Divergência deliberada da tolerância-zero

O gate de mapa de rotas (`validate:backend-contract-map`) segue tolerância zero: `documentedDivergences` só existe para auditoria histórica e hoje está vazio — toda rota do frontend bate com o catálogo do backend. **O gate de permissões nasceu vermelho por desenho em `v1.11.0a8b48`.** Na primeira execução já existiam 3 fantasmas e 36 pendências medidas contra o contrato v1.23; suprimir esse número para abrir o PR teria escondido uma dívida real e já quantificada, em vez de corrigi-la. `v1.11.0a8b50` (F1.2/F1.3) fechou integralmente esse registro: união e catálogo passam a nomear as 177 permissões do contrato, e o teto é agora `0/0` — tolerância zero, como os demais gates.

Por isso `scripts/backend-permissions.allowlist.json` é um **registro fechado e monotônico**, não uma supressão:

- `suppressions` é sempre `[]` — nenhum item pode desativar uma verificação.
- `teto.fantasmas`/`teto.coberturaPendente` trava o número de itens registrados; o registro só encolhe, e o gate reprova se o teto não bater exatamente com o número de entradas. Desde `v1.11.0a8b50` o teto é `0/0` — qualquer fantasma ou cobertura pendente nova volta a reprovar o gate, exatamente como em b48/b49.
- `auditPolicy.expiresAt` expira o registro; passar da data sem revisão reprova o gate.
- Cada item aponta o alvo (`F1.2` corrige cobertura pendente, `F1.3` corrige fantasma), então a dívida é rastreável, não permanente.

Essa é a única allowlist do repositório com esse formato — os demais gates seguem tolerância zero.
