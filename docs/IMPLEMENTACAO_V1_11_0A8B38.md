# Implementação v1.11.0a8b38.c1 — Reconciliação controlada de contratos

## Objetivo

Adicionar uma camada estrutural de reconciliação frontend x backend antes da implementação dos próximos módulos grandes.

## Entregas

- Novo script `scripts/validate-backend-contract-map.mjs`.
- Nova allowlist `scripts/backend-contract-map.allowlist.json`.
- Nova documentação `docs/CONTRATO_FRONTEND_BACKEND_B38.md`.
- Novo diretório `docs/contracts/` com instruções para Swagger versionado.
- Novo teste unitário estrutural `tests/unit/backendContractMap.test.ts`.
- Novo script npm `validate:backend-contract-map`.
- Integração do novo gate ao `validate:source`, `validate:ci` e `ci:gates`.
- Versionamento para `v1.11.0a8b38.c1`.

## Comportamento do gate

Sem Swagger real, o gate executa validação estrutural/documental:

```bash
npm run validate:backend-contract-map
```

Com Swagger real, o gate compara os paths informados:

```bash
LOGOSOFT_BACKEND_SWAGGER_FILE=docs/contracts/swagger-v1.json npm run validate:backend-contract-map
```

## Divergências classificadas

Foram classificadas divergências e ausências conhecidas em Auth, Produtos, Estoque, Financeiro, Tabelas de Preço, Atividades, Relatórios, Auditoria e Fiscal.

## Decisão sobre Produto x Fornecedor

A B37 permanece como resolvida: o payload produtivo deve continuar usando `fornecedorId`, `codigoProdutoFornecedor` e `principal`.

## Fora de escopo

- Não foi criada tela nova.
- Não foi alterado backend.
- Não foi implementada Segurança B39.
- Não foi alterado fluxo fiscal.
- Não foi alterado fluxo financeiro.

## Validações recomendadas

```bash
npm install
npm run validate:source
npm run validate:backend-contract-map
npm run validate:ci
npm run validate:mocks-isolation
npm run validate:guid-references
npm run test:unit -- tests/unit/backendContractMap.test.ts
npm run ci:gates
```
