# Implementação v1.11.0a8b41 — Estoque avançado

## Objetivo

A v1.11.0a8b41 implementa a primeira camada de estoque avançado no frontend, alinhando o módulo aos endpoints do backend inventariados até a35.

O foco foi ampliar operações críticas de estoque sem alterar saldo diretamente no frontend. Toda mutação continua sendo enviada ao backend, que deve validar domínio, transação, saldo, auditoria e histórico operacional.

## Escopo implementado

- Tela `/estoque/transferencias` para transferência entre filial/local de origem e destino.
- Tela `/estoque/bloqueios` para criar bloqueio de estoque e liberar/cancelar bloqueio por ID operacional.
- Client `POST /api/estoque/transferencias`.
- Client `POST /api/estoque/bloqueios`.
- Clients `POST /api/estoque/bloqueios/{id}/liberar` e `POST /api/estoque/bloqueios/{id}/cancelar`.
- Client `GET /api/estoque/inventarios/{id}` para detalhe de inventário.
- Client `POST /api/estoque/inventarios/{id}/iniciar-contagem`.
- Correção da conclusão de inventário para `POST /api/estoque/inventarios/{id}/concluir` com `{ motivoAjuste }`.
- Remoção do uso produtivo da rota divergente `/fechar`.
- Atualização de menu e guards de rota.
- Atualização do mapa de contratos frontend/backend para `IMPLEMENTADO_B41` nas divergências de estoque avançado.
- Testes unitários de payload, estrutura e regras de UX.

## Payloads principais

### Transferência

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialOrigemId": "22222222-2222-2222-2222-222222222222",
  "localOrigemId": "99999999-9999-9999-9999-999999999999",
  "filialDestinoId": "33333333-3333-3333-3333-333333333333",
  "localDestinoId": "88888888-8888-8888-8888-888888888888",
  "produtoId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "quantidade": 3,
  "motivo": "Reposição entre filiais"
}
```

### Bloqueio

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "localEstoqueId": "99999999-9999-9999-9999-999999999999",
  "produtoId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "quantidade": 2,
  "motivo": "Produto avariado"
}
```

### Conclusão de inventário

```json
{
  "motivoAjuste": "Ajuste por inventário"
}
```

## Trade-offs adotados

### Bloqueios sem listagem dedicada

O inventário de backend confirma criação, liberação e cancelamento de bloqueio, mas não confirma endpoint de listagem de bloqueios. Por isso a B41 não inventa uma tabela falsa nem cria mock. A tela permite liberar/cancelar usando o ID operacional do bloqueio retornado pelo backend ou informado por evidência operacional.

### Transferência como operação direta

A transferência é enviada como uma única intenção operacional ao backend. O frontend não simula saída e entrada separadamente para não duplicar regra transacional que pertence ao domínio/backend.

### Inventário em contagem textual

A UX reconhece status textual `EmContagem`/`Em contagem` além dos enums numéricos já existentes, pois o inventário documentado pelo backend usa status operacional textual em alguns exemplos.

## Arquivos criados

```text
app/(main)/estoque/transferencias/page.tsx
app/(main)/estoque/bloqueios/page.tsx
features/estoque/components/TransferenciaEstoquePage.tsx
features/estoque/components/BloqueiosEstoquePage.tsx
tests/unit/estoqueB41Structure.test.ts
docs/IMPLEMENTACAO_V1_11_0A8B41.md
```

## Arquivos atualizados

```text
features/estoque/api/estoqueApi.ts
features/estoque/types/estoque.types.ts
features/estoque/schemas/estoqueSchemas.ts
features/estoque/hooks/useEstoqueResources.ts
features/estoque/components/InventariosEstoquePage.tsx
features/estoque/components/estoqueUxUtils.ts
layout/AppMenu.tsx
lib/security/routePermissions.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
tests/unit/estoquePayload.test.ts
tests/unit/estoqueUxRules.test.ts
README.md
CHANGELOG.md
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
.github/workflows/frontend-ci.yml
```

## Permissões

```text
ESTOQUE_MOVIMENTAR
- /estoque/transferencias
- /estoque/bloqueios

ESTOQUE_INVENTARIO_GERENCIAR
- detalhe de inventário
- iniciar contagem
- adicionar item
- concluir inventário
- cancelar inventário
```

## Validações executadas neste pacote

```bash
npm run validate:backend-contract-map
npm run validate:source
npm run validate:ci
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:operational-contracts
npm run validate:assisted-e2e
npm run validate:skills
```

## Validações pendentes para staging/repositório principal

O ambiente atual não possui `node_modules` e está com Node 22/npm 10, enquanto o projeto exige Node 24/npm 11. Portanto, devem ser reexecutados no staging/repositório principal:

```bash
npm install
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/estoquePayload.test.ts tests/unit/estoqueB41Structure.test.ts tests/unit/estoqueUxRules.test.ts
npm run build
npm run ci:gates
```

## Critérios de aprovação

```text
[ ] typecheck passa.
[ ] lint passa.
[ ] testes unitários passam.
[ ] build passa incluindo /estoque/transferencias e /estoque/bloqueios.
[ ] ci:gates completo passa.
[ ] validate:backend-contract-map mantém divergências B41 como IMPLEMENTADO_B41.
[ ] Nenhum mock produtivo é criado.
[ ] Nenhuma rota /fechar permanece no client de inventário.
[ ] Contratos backend real/E2E real seguem skipped sem opt-in.
```

## Próxima etapa recomendada

```text
v1.11.0a8b42 — Financeiro gerencial: reconciliação de baixar/receber/pagar, fluxo de caixa e ações financeiras alinhadas ao backend.
```
