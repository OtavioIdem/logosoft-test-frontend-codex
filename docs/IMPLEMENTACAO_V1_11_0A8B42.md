# Implementação v1.11.0a8b42 — Financeiro gerencial

## Objetivo

A v1.11.0a8b42 reconcilia o frontend financeiro com o inventário backend até a35, priorizando baixa, estorno e fluxo de caixa.

A implementação não cria regra financeira nova no frontend. A UI monta payloads e consulta dados; validação de saldo, baixa parcial/total, estorno, transação, auditoria e impacto em caixa/banco continuam no backend/domínio.

## Escopo implementado

- Baixas de contas a receber e pagar alinhadas ao endpoint `/baixar`.
- Estornos de contas a receber e pagar alinhados ao endpoint `/estornar`.
- Payload de baixa simplificado para `{ valor, dataBaixa, observacao }`.
- Payload de estorno atualizado para `{ baixaId, dataEstorno, motivo }`.
- Criada tela `/financeiro/fluxo-caixa`.
- Criado client `GET /api/financeiro/fluxo-caixa`.
- Atualizados hooks, tipos, schemas e testes financeiros.
- Atualizados menu e guards de rota.
- Atualizado mapa de contratos frontend/backend para `IMPLEMENTADO_B42`.

## Payloads principais

### Baixa financeira

```json
{
  "valor": 500,
  "dataBaixa": "2026-06-16T13:00:00.000Z",
  "observacao": "Recebimento parcial via PIX"
}
```

### Estorno financeiro

```json
{
  "baixaId": "dededede-dede-dede-dede-dededededede",
  "dataEstorno": "2026-06-17T13:00:00.000Z",
  "motivo": "Baixa registrada em duplicidade"
}
```

### Fluxo de caixa

```http
GET /api/financeiro/fluxo-caixa?empresaId=...&filialId=...&dataInicial=2026-06-01T00:00:00.000Z&dataFinal=2026-06-30T23:59:59.000Z
```

## Endpoints cobertos

```text
POST /api/financeiro/contas-receber/{id}/baixar
POST /api/financeiro/contas-pagar/{id}/baixar
POST /api/financeiro/contas-receber/{id}/estornar
POST /api/financeiro/contas-pagar/{id}/estornar
GET /api/financeiro/contas/{id}
GET /api/financeiro/fluxo-caixa
```

## Trade-offs adotados

### Forma de pagamento, caixa e banco na baixa

O frontend anterior enviava `formaPagamentoId`, flags de caixa/banco, juros, multa e desconto diretamente no payload de receber/pagar. O inventário backend da a35 documenta a baixa operacional como `{ valor, dataBaixa, observacao }`.

Para evitar contrato inventado, a B42 remove esses campos do payload de baixa. Quando o backend expuser conta bancária, forma de pagamento, juros, multa e desconto no contrato oficial, eles devem ser reintroduzidos com validação e teste próprios.

### Estorno por baixaId

O inventário backend documenta estorno com `baixaId`, `dataEstorno` e `motivo`. Como o frontend ainda recebe listas antigas de recebimentos/pagamentos, a UI reutiliza o ID do movimento selecionado como `baixaId` até o backend expor nomenclatura final na response.

### Fluxo de caixa somente consulta

A tela de fluxo de caixa apenas consulta o consolidado. Nenhuma métrica é calculada como fonte da verdade no frontend.

## Arquivos criados

```text
app/(main)/financeiro/fluxo-caixa/page.tsx
features/financeiro/components/FluxoCaixaPage.tsx
tests/unit/financeiroB42Structure.test.ts
docs/IMPLEMENTACAO_V1_11_0A8B42.md
```

## Arquivos atualizados

```text
features/financeiro/api/financeiroApi.ts
features/financeiro/types/financeiro.types.ts
features/financeiro/schemas/financeiroSchemas.ts
features/financeiro/hooks/useFinanceiroResources.ts
features/financeiro/components/FinanceiroActionDialogs.tsx
layout/AppMenu.tsx
lib/security/routePermissions.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
tests/unit/financeiroPayload.test.ts
tests/unit/routePermissions.test.ts
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
FINANCEIRO_CONSULTAR
- /financeiro/fluxo-caixa
- consulta de contas

FINANCEIRO_RECEBER
- baixa de contas a receber

FINANCEIRO_PAGAR
- baixa de contas a pagar

FINANCEIRO_ESTORNAR
- estorno financeiro

FINANCEIRO_CANCELAR
- cancelamento financeiro
```

## Mapa de contratos

Foram classificados como resolvidos:

```text
FINANCEIRO_BAIXAR_VS_RECEBER_PAGAR => IMPLEMENTADO_B42
FINANCEIRO_ESTORNO_DIVERGENTE => IMPLEMENTADO_B42
```

Resultado do gate:

```text
validate:backend-contract-map passou.
186 endpoints frontend mapeados.
Swagger real não informado; validação em modo estrutural/documental.
```

## Testes adicionados/reforçados

### `tests/unit/financeiroPayload.test.ts`

- Baixa de conta a receber com `{ valor, dataBaixa, observacao }`.
- Baixa de conta a pagar com `{ valor, dataBaixa, observacao }`.
- Estorno com `{ baixaId, dataEstorno, motivo }`.
- Consulta de fluxo de caixa omitindo filial inválida.

### `tests/unit/financeiroB42Structure.test.ts`

- Rotas `/baixar` para receber/pagar.
- Rotas `/estornar` para receber/pagar.
- Remoção de `/receber`, `/pagar`, `/estornar-recebimento` e `/estornar-pagamento` no client produtivo.
- Página real `/financeiro/fluxo-caixa`.
- Guard `FINANCEIRO_CONSULTAR`.
- Allowlist/documentação com `IMPLEMENTADO_B42`.

### `tests/unit/routePermissions.test.ts`

- Proteção de `/financeiro/fluxo-caixa` por `FINANCEIRO_CONSULTAR`.

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

O ambiente atual não possui `node_modules` e usa Node 22/npm 10. O projeto exige Node 24/npm 11.

Executar no staging/repositório principal:

```bash
npm install
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts tests/unit/routePermissions.test.ts
npm run build
npm run ci:gates
```

## Critérios de aprovação

```text
[ ] typecheck passa.
[ ] lint passa.
[ ] unitários passam.
[ ] build passa incluindo /financeiro/fluxo-caixa.
[ ] ci:gates completo passa.
[ ] mapa frontend/backend mantém 186+ endpoints mapeados.
[ ] contratos/backend real seguem skipped sem opt-in.
[ ] Nenhuma rota legada /receber, /pagar, /estornar-recebimento ou /estornar-pagamento permanece no client financeiro.
```

## Próxima etapa recomendada

```text
v1.11.0a8b43 — Atividades/workflow operacional.
```
