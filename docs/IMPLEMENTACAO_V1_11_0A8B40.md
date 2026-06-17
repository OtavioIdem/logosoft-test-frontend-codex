# Implementação v1.11.0a8b40 — Tabelas de preço

## Objetivo

A v1.11.0a8b40 implementa o módulo frontend de Tabelas de Preço, conectado aos endpoints documentados do backend em `/api/tabelas-preco`.

A entrega cobre cadastro e manutenção de tabelas, itens por produto, ativação/inativação auditável e consulta de preço vigente. O escopo não altera regras fiscais, não cria mock produtivo e não altera os módulos de Segurança, Produto x Fornecedor ou o gate de contratos aprovados nas versões anteriores.

## Escopo implementado

- Nova rota produtiva `/tabelas-preco`.
- Novo módulo `features/tabelas-preco`.
- Client real `tabelasPrecoApi` para os endpoints de tabelas, itens e preço vigente.
- Tela de listagem e busca de tabelas.
- Criação e edição de tabela de preço.
- Ativação de tabela.
- Inativação de tabela com motivo.
- Visualização de itens da tabela selecionada.
- Adição e edição de item da tabela.
- Inativação de item com motivo.
- Consulta de preço vigente por produto, empresa, filial e data de referência.
- Permissões `TABELAS_PRECO_CONSULTAR` e `TABELAS_PRECO_GERENCIAR` adicionadas ao tipo `PermissionCode`.
- Menu lateral e guard de rota para `/tabelas-preco`.
- Atualização da allowlist B38 classificando `TABELAS_PRECO_AUSENTE_FRONTEND` como `IMPLEMENTADO_B40`.
- Testes unitários de payload e testes estruturais da tela/rotas/contratos.

## Endpoints consumidos

```http
GET  /api/tabelas-preco
GET  /api/tabelas-preco/{id}
POST /api/tabelas-preco
PUT  /api/tabelas-preco/{id}
POST /api/tabelas-preco/{id}/ativar
POST /api/tabelas-preco/{id}/inativar
POST /api/tabelas-preco/{id}/itens
PUT  /api/tabelas-preco/{id}/itens/{itemId}
POST /api/tabelas-preco/{id}/itens/{itemId}/inativar
GET  /api/tabelas-preco/produtos/{produtoId}/preco-vigente
```

## Payloads preservados

### Criar tabela

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "nome": "Tabela Padrão 2026",
  "dataInicioVigencia": "2026-06-01",
  "dataFimVigencia": null,
  "padrao": true
}
```

### Atualizar tabela

```json
{
  "nome": "Tabela Atualizada",
  "dataInicioVigencia": "2026-06-01",
  "dataFimVigencia": "2026-12-31",
  "padrao": false
}
```

Atualização não envia `empresaId` nem `filialId`, evitando troca acidental de contexto operacional.

### Inativar tabela ou item

```json
{
  "motivo": "Tabela substituída"
}
```

### Criar item

```json
{
  "produtoId": "33333333-3333-3333-3333-333333333333",
  "precoVenda": 100,
  "precoMinimo": 80,
  "margemPercentual": 30
}
```

### Atualizar item

```json
{
  "precoVenda": 120,
  "precoMinimo": 90,
  "margemPercentual": 35
}
```

Atualização de item não envia `produtoId`, preservando o vínculo criado.

## Arquivos criados

```text
app/(main)/tabelas-preco/page.tsx
features/tabelas-preco/api/tabelasPrecoApi.ts
features/tabelas-preco/components/TabelasPrecoPage.tsx
features/tabelas-preco/components/TabelaPrecoFormDialog.tsx
features/tabelas-preco/components/TabelaPrecoItemDialog.tsx
features/tabelas-preco/hooks/useTabelasPreco.ts
features/tabelas-preco/schemas/tabelasPrecoSchemas.ts
features/tabelas-preco/types/tabelasPreco.types.ts
tests/unit/tabelasPrecoPayload.test.ts
tests/unit/tabelasPrecoB40Structure.test.ts
docs/IMPLEMENTACAO_V1_11_0A8B40.md
```

## Arquivos atualizados

```text
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
.github/workflows/frontend-ci.yml
layout/AppMenu.tsx
lib/security/routePermissions.ts
types/erp.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
README.md
CHANGELOG.md
tests/evidence/integrated-e2e.assisted-evidence.example.json
scripts/validate-assisted-e2e.mjs
tests/unit/assistedIntegratedE2e.test.ts
```

## Regras protegidas no frontend

- Empresa obrigatória para criação.
- Filial opcional enviada como `null` quando não selecionada.
- Nome da tabela obrigatório.
- Data final não pode ser anterior à data inicial.
- Produto obrigatório no item.
- Preço de venda deve ser maior que zero.
- Preço mínimo não pode ser negativo.
- Preço mínimo não pode ser maior que preço de venda.
- Margem não pode ser negativa.
- Inativação exige motivo.
- Edição de tabela não altera empresa/filial.
- Edição de item não altera produto vinculado.

## Permissões

```text
TABELAS_PRECO_CONSULTAR
TABELAS_PRECO_GERENCIAR
```

A tela também aceita permissões comerciais já existentes como compatibilidade operacional:

```text
VENDAS_CONSULTAR
VENDAS_GERENCIAR
```

## Trade-offs

- A B40 usa tabela/lista simples e detalhe lateral, evitando criar subrotas antes de confirmar o Swagger real.
- A consulta de preço vigente é explícita e manual, para evitar chamadas automáticas excessivas durante preenchimento de filtros.
- O frontend valida payload mínimo, mas a regra final de vigência, tabela padrão única e conflito entre tabelas permanece responsabilidade do backend/domínio.
- Não foi criada paginação backend real na tela porque o contrato consolidado ainda não confirmou o shape paginado de resposta. A tela está preparada para lista simples e o gate mantém a divergência controlada.

## Validações recomendadas

```bash
npm run validate:backend-contract-map
npm run validate:source
npm run validate:ci
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:operational-contracts
npm run validate:assisted-e2e
npm run validate:skills
npm run test:unit -- tests/unit/tabelasPrecoPayload.test.ts tests/unit/tabelasPrecoB40Structure.test.ts
npm run ci:gates
```

## Pontos para validar em staging

```text
[ ] Menu exibe Tabelas de preço para usuário com permissão adequada.
[ ] GET /api/tabelas-preco retorna lista compatível com TabelaPrecoResponse[].
[ ] POST /api/tabelas-preco aceita filialId null.
[ ] PUT /api/tabelas-preco/{id} não exige empresaId/filialId.
[ ] POST /api/tabelas-preco/{id}/inativar aceita payload { motivo }.
[ ] POST /api/tabelas-preco/{id}/itens aceita produtoId/precoVenda/precoMinimo/margemPercentual.
[ ] PUT /api/tabelas-preco/{id}/itens/{itemId} aceita apenas valores/margem.
[ ] POST /api/tabelas-preco/{id}/itens/{itemId}/inativar aceita payload { motivo }.
[ ] GET /api/tabelas-preco/produtos/{produtoId}/preco-vigente retorna preço esperado.
[ ] Backend bloqueia conflitos de vigência/padrão conforme regra de domínio.
```

## Próxima etapa recomendada

```text
v1.11.0a8b41 — Estoque avançado
```
