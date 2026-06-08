# Contratos operacionais read-only frontend/backend

## Objetivo

A versão `v1.11.0a8b31` adiciona contratos operacionais read-only para validar o frontend contra backend real/controlado nos módulos prioritários de integração:

- Vendas
- Estoque
- Financeiro
- Auditoria

O objetivo não é executar o fluxo mutável completo. O objetivo é confirmar que os endpoints reais/controlados que sustentam o fluxo integrado `venda → estoque → financeiro → auditoria` existem, retornam `2xx`, mantêm formatos compatíveis com os DTOs esperados pelo frontend e não expõem tokens, certificados, segredos ou payloads sensíveis.

## Regra de segurança

Este contrato operacional não deve apontar para produção. Use homologação, sandbox, base descartável ou ambiente local controlado.

O contrato operacional é read-only. Ele não deve:

- criar pedido;
- aprovar pedido;
- faturar pedido;
- baixar estoque;
- criar reserva;
- receber conta;
- pagar conta;
- cancelar entidade;
- estornar movimento;
- alterar status operacional.

## Comando

```bash
npm run test:contract:operational
```

O comando usa:

```bash
playwright test --config=playwright.operational-contract.config.ts
```


## Separação obrigatória entre contrato fiscal e operacional

A suíte operacional não pode ser descoberta por `npm run test:contract:fiscal`. A separação correta é:

```text
npm run test:contract:fiscal       → tests/contract/fiscal-backend.contract.spec.ts
npm run test:contract:operational  → tests/contract/operational-backend.contract.spec.ts
```

O contrato operacional deve exigir somente variáveis `LOGOSOFT_OPERATIONAL_CONTRACT_*`. Ele não pode usar fallback para `LOGOSOFT_CONTRACT_*`, pois essas variáveis pertencem ao contrato fiscal.

Essa separação evita que uma execução fiscal controlada dispare validações operacionais sem opt-in operacional explícito.

## Variáveis obrigatórias

```bash
LOGOSOFT_OPERATIONAL_CONTRACT_API_URL=http://localhost:8080
LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN=
LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID=
```

Sem essas variáveis, a suíte fica skipped por opt-in controlado.

## Variáveis opcionais

```bash
LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID=
LOGOSOFT_OPERATIONAL_CONTRACT_PEDIDO_VENDA_ID=
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_RECEBER_ID=
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_PAGAR_ID=
LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID=
```

Quando IDs opcionais forem informados, a suíte valida também detalhes read-only de pedido de venda, conta a receber e conta a pagar.

`LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID` pode ser usado para filtrar movimentos de estoque e contas financeiras relacionadas a um pedido ou origem operacional conhecida.

## Endpoints validados

### Vendas

```text
GET /api/vendas/pedidos
GET /api/vendas/pedidos/{id}
```

O contrato valida campos essenciais de `PedidoVendaResponse`, incluindo identificadores, número, cliente, datas, tipo, status, totais e itens.

### Estoque

```text
GET /api/estoque/saldos
GET /api/estoque/movimentos
GET /api/estoque/reservas
```

O contrato valida saldos, movimentos e reservas sem alterar estoque. Saldo continua sendo consequência do backend e não é recalculado no frontend.

### Financeiro

```text
GET /api/financeiro/contas-receber
GET /api/financeiro/contas-receber/{id}
GET /api/financeiro/contas-pagar
GET /api/financeiro/contas-pagar/{id}
```

O contrato valida contas a receber e contas a pagar, incluindo origem, documento, emissão, valores, saldo, parcelas e recebimentos/pagamentos quando retornados.

### Auditoria

```text
GET /api/auditoria/eventos
```

O contrato valida que eventos de auditoria retornam dados mínimos de módulo, entidade, ação, usuário, empresa e data.

## Gates estruturais

A B31 adiciona:

```bash
npm run validate:operational-contracts
```

Esse gate verifica:

1. existência da suíte operacional;
2. existência da configuração Playwright dedicada;
3. existência da documentação;
4. integração ao `ci:gates`;
5. integração ao GitHub Actions;
6. integração ao `validate:source`;
7. ausência de mutações no contrato operacional;
8. ausência de token operacional no workflow padrão.

## Sequência recomendada

```bash
npm install
npm run validate:source
npm run validate:backend-controlled
npm run validate:operational-contracts
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## Critério de aprovação

A validação operacional pode ser considerada preparada quando:

1. `validate:operational-contracts` passa;
2. `validate:source` passa executando o novo gate;
3. `ci:gates` contém o contrato operacional;
4. `test:contract:operational` fica skipped sem variáveis e executa somente em ambiente controlado;
5. nenhuma mutação operacional aparece na suíte;
6. nenhum token real é versionado.

A execução skipped sem variáveis não significa validação real. Ela significa apenas que o opt-in de segurança funcionou.
