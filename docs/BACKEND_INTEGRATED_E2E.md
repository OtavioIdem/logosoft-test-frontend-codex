# E2E integrado backend controlado

## Objetivo

A versão `v1.11.0a8b32` adiciona uma suíte E2E integrada e opt-in para validar, em ambiente controlado, o fluxo:

```text
venda → fiscal → estoque → financeiro → auditoria
```

Esse fluxo é diferente dos contratos read-only da B31. Ele é mutável e pode gerar nota fiscal, XML, transmissão em ambiente configurado, DANFE, baixa de estoque, conta a receber e auditoria.

## Regra de segurança

A suíte não deve ser executada em produção.

Use somente:

- homologação;
- sandbox;
- ambiente local descartável;
- base de dados preparada para testes mutáveis;
- pedido de venda descartável e documentado.

A execução exige opt-in explícito:

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
```

Sem esse opt-in, a suíte fica skipped.

## Comando

```bash
npm run test:e2e:integrated:backend
```

O comando usa:

```bash
playwright test --config=playwright.integrated-e2e.config.ts
```

## Variáveis obrigatórias

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
LOGOSOFT_INTEGRATED_E2E_API_URL=http://localhost:8080
LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=
LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=
LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=
```

## Variáveis opcionais

```bash
LOGOSOFT_INTEGRATED_E2E_REFRESH_TOKEN=
LOGOSOFT_INTEGRATED_E2E_FILIAL_ID=
LOGOSOFT_INTEGRATED_E2E_UF_AUTORIZADORA=SP
LOGOSOFT_INTEGRATED_E2E_SERIE_NOTA=1
LOGOSOFT_INTEGRATED_E2E_CFOP_PADRAO=5102
LOGOSOFT_INTEGRATED_E2E_UNIDADE_COMERCIAL_PADRAO=UN
LOGOSOFT_INTEGRATED_E2E_SCHEMA_SET_NAME=NFe-4.00
LOGOSOFT_INTEGRATED_E2E_NUMERO_NOTA=
LOGOSOFT_INTEGRATED_E2E_PRIMEIRA_DATA_VENCIMENTO=
LOGOSOFT_INTEGRATED_E2E_PERMISSIONS=
LOGOSOFT_INTEGRATED_E2E_USE_EXISTING_FRONTEND=false
PLAYWRIGHT_INTEGRATED_BASE_URL=http://127.0.0.1:3000
```

## O que a suíte valida

1. Consulta inicial do pedido de venda controlado.
2. Geração de nota fiscal a partir do pedido de venda.
3. Abertura da tela real de detalhe fiscal.
4. Validação operacional da nota.
5. Geração de XML.
6. Assinatura XML.
7. Transmissão em ambiente controlado.
8. Autorização fiscal exibida na UI.
9. Geração de DANFE.
10. Baixa de estoque.
11. Geração de financeiro.
12. Consulta de movimento de estoque vinculado à origem.
13. Consulta de conta a receber vinculada à origem.
14. Consulta de auditoria vinculada à origem.

## O que a suíte não faz

```text
Não cria cliente.
Não cria produto.
Não cria pedido de venda.
Não aprova pedido de venda.
Não altera regra fiscal.
Não inventa CFOP, CST, CSOSN, NCM, CEST ou alíquota.
Não usa mocks.
Não executa no CI comum.
Não usa fallback de variáveis fiscais ou operacionais.
```

O pedido de venda deve ser preparado previamente no backend controlado.

## Separação das suítes

A B32 mantém três famílias separadas:

```text
npm run test:contract:fiscal          → contrato fiscal read-only/controlado
npm run test:contract:operational     → contrato operacional read-only/controlado
npm run test:e2e:integrated:backend   → fluxo integrado mutável/controlado
```

Variáveis fiscais `LOGOSOFT_CONTRACT_*` não ativam o E2E integrado.

Variáveis operacionais `LOGOSOFT_OPERATIONAL_CONTRACT_*` não ativam o E2E integrado.

O E2E integrado exige somente `LOGOSOFT_INTEGRATED_E2E_*`.

## Gates estruturais

A B32 adiciona:

```bash
npm run validate:integrated-e2e
```

Esse gate verifica:

1. existência da config Playwright dedicada;
2. existência da spec E2E integrada;
3. existência da documentação;
4. existência do teste unitário de regressão;
5. opt-in `LOGOSOFT_INTEGRATED_E2E_RUN=true`;
6. ausência de fallback para variáveis fiscais/operacionais;
7. ausência de execução mutável no `ci:gates` comum;
8. ausência de token real no template de ambiente.

## Sequência recomendada

Sem backend controlado:

```bash
npm install
npm run validate:source
npm run validate:integrated-e2e
npm run validate:backend-controlled
npm run validate:operational-contracts
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run ci:gates
```

Com backend controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
npm run test:e2e:integrated:backend
```

## Critério de aprovação

A versão pode ser aprovada estruturalmente quando:

1. `validate:integrated-e2e` passa;
2. `validate:source` passa executando o novo gate;
3. `ci:gates` valida a estrutura sem executar o fluxo mutável integrado;
4. `test:e2e:integrated:backend` fica skipped sem opt-in;
5. a execução real só ocorre quando `LOGOSOFT_INTEGRATED_E2E_RUN=true` está definido;
6. o ambiente controlado confirma venda, fiscal, estoque, financeiro e auditoria.

Execução skipped sem variáveis não significa validação real do fluxo. Significa apenas que o opt-in de segurança funcionou.

## Complemento B33 — seeds controladas

A partir da B33, o E2E integrado mutável exige rastreio explícito de seed e confirmação de ambiente descartável.

Variáveis adicionais obrigatórias:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=<identificador-da-seed>
LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
```

O arquivo versionado `tests/seeds/integrated-e2e.controlled-seed.example.json` é apenas um template seguro. Ele não executa seed no backend e não deve conter token, JWT, certificado, senha ou segredo.

Sem `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`, a suíte integrada deve permanecer skipped mesmo que exista token e pedido de venda preenchido.

A documentação detalhada está em:

```text
docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md
```
