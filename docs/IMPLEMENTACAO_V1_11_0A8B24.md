# Implementação v1.11.0a8b24.c1 — E2E fiscal com backend real/controlado

## Objetivo

Criar uma suíte E2E fiscal real/controlada, separada do E2E mockado, para validar o fluxo operacional principal contra uma API backend configurada explicitamente.

Esta versão não substitui o E2E mockado da `v1.11.0a8b22.c2`. Ela adiciona um segundo nível de validação, opt-in e mutável, para ambientes controlados de homologação/desenvolvimento.

## Escopo implementado

- Novo arquivo `tests/e2e/fiscal-backend.spec.ts`.
- Novo arquivo `playwright.backend-e2e.config.ts`.
- Novo script `npm run test:e2e:fiscal:backend`.
- Execução protegida por variável explícita `LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true`.
- Sessão frontend injetada com token real/controlado fornecido por variável.
- API real configurada via `LOGOSOFT_E2E_API_URL` e repassada ao Next por `NEXT_PUBLIC_API_URL` no webServer do Playwright.
- Geração da nota fiscal a partir de pedido de venda controlado via backend.
- Execução na UI das etapas principais:
  - abrir detalhe da nota gerada;
  - validar nota;
  - gerar XML de envio;
  - assinar XML;
  - transmitir SEFAZ/mock do backend;
  - validar status autorizada;
  - gerar DANFE/documento auxiliar;
  - baixar estoque;
  - gerar financeiro;
  - consultar observabilidade fiscal após o fluxo.

## Variáveis obrigatórias

```bash
LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true
LOGOSOFT_E2E_API_URL=http://localhost:8080
LOGOSOFT_E2E_ACCESS_TOKEN=token-jwt-valido
LOGOSOFT_E2E_EMPRESA_ID=11111111-1111-1111-1111-111111111111
LOGOSOFT_E2E_PEDIDO_VENDA_ID=22222222-2222-2222-2222-222222222222
```

## Variáveis opcionais

```bash
LOGOSOFT_E2E_REFRESH_TOKEN=refresh-token-valido-ou-placeholder
LOGOSOFT_E2E_FILIAL_ID=33333333-3333-3333-3333-333333333333
LOGOSOFT_E2E_UF_AUTORIZADORA=SP
LOGOSOFT_E2E_SERIE_NOTA=1
LOGOSOFT_E2E_NUMERO_NOTA=900001
LOGOSOFT_E2E_CFOP_PADRAO=5102
LOGOSOFT_E2E_UNIDADE_COMERCIAL_PADRAO=UN
LOGOSOFT_E2E_SCHEMA_SET_NAME=NFe-4.00
LOGOSOFT_E2E_PRIMEIRA_DATA_VENCIMENTO=2026-06-30
LOGOSOFT_E2E_USE_EXISTING_FRONTEND=true
PLAYWRIGHT_BACKEND_BASE_URL=http://127.0.0.1:3000
```

## Comando

```bash
npm run test:e2e:fiscal:backend
```

## Gate recomendado antes de commit

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright install chromium
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
git diff --check
git diff --cached --check
```

## Pontos críticos

1. Este teste é mutável: ele gera nota fiscal a partir de pedido de venda e executa ações operacionais.
2. Deve ser executado apenas em backend controlado, com dados descartáveis ou próprios de homologação.
3. O pedido de venda informado precisa estar em estado operacional compatível com geração fiscal.
4. O backend precisa estar preparado para transmissão mockada/controlada; esta versão não comprova emissão fiscal real em produção.
5. O token informado precisa conter permissões fiscais, estoque e financeiro suficientes.
6. O teste não cria nem corrige dados mestres, como cliente, produto, estoque, pedido ou condição de pagamento.
7. O teste não implementa regra fiscal nova e não assume validade legal de CFOP, schema, certificado ou autorização.

## Regras preservadas

- Sem GUID digitado na UI por operador.
- `correlationId` continua gerado nos modais pelas rotinas fiscais existentes.
- Ações críticas continuam guiadas por resumo/workflow retornados pelo backend.
- XML/payload sensível não deve ser exibido pela UI.
- Teste real/controlado fica separado do E2E mockado e não roda sem opt-in explícito.

## O que ainda precisa ser analisado

- Se o backend real retorna todos os DTOs exatamente como o frontend espera após cada mutação.
- Se a baixa de estoque depende de reserva/faturamento prévio específico do pedido.
- Se a geração de conta a receber exige condição de pagamento real em determinados cenários.
- Se o ambiente exige certificado, schema ou XML assinado real para transmissão mesmo em mock/homologação.
- Se o pedido de venda pode ser reutilizado ou se precisa de seed descartável por execução.
- Se a observabilidade registra logs suficientes para auditoria após cada etapa.

## Próxima etapa planejada

`v1.11.0a8b25 — Revisão final de produção do fiscal frontend`.
