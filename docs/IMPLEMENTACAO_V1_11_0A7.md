# Implementação v1.11.0a7 — Revisão fiscal, remoção de mocks de runtime e integrações reais

## Objetivo

Revisar a entrega fiscal v1.11.0a6 para reduzir entrada manual de identificadores, remover fluxo mockado do runtime da aplicação e preparar a tela fiscal para operar exclusivamente com endpoints reais do backend.

## Entregas

- Atualizada a versão visual/documental para `1.11.0a7`.
- Removidas as flags de runtime `NEXT_PUBLIC_USE_MOCK_AUTH` e `NEXT_PUBLIC_USE_MOCK_API`.
- `authApi` passou a chamar sempre endpoints reais:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- `createResourceClient` passou a usar sempre `httpClient` real, sem proxy para store mockado.
- Removidos arquivos de mock de runtime:
  - `features/auth/api/mockAuthClient.ts`
  - `features/shared/api/mockErpStore.ts`
  - `features/shared/api/resourceMockClient.ts`
- Mantidas interceptações apenas dentro dos testes E2E via Playwright, sem flags públicas de runtime.
- Atualizado `playwright.config.ts` para não ativar mocks por variável pública.
- `tests/e2e/fixtures/logosoft.ts` passou a interceptar explicitamente `/api/auth/login`, `/api/auth/refresh` e `/api/auth/logout`.

## Melhorias fiscais

- Diálogo de nota fiscal manual agora usa selects reais de:
  - Empresa: `/api/administracao/empresas`
  - Filial: `/api/administracao/filiais`
  - Pessoa/cliente: `/api/pessoas`
- Diálogo de geração de nota por pedido agora usa select real de pedido aprovado quando aberto pela tela fiscal:
  - `/api/vendas/pedidos?status=3`
- Diálogo de item fiscal agora usa select real de produto:
  - `/api/produtos`
- Ao selecionar produto, o frontend sugere código, descrição, NCM e valor unitário com base no cadastro carregado da API.
- Tela de inutilização fiscal agora usa selects reais de empresa e filial.
- Removidas menções visuais a `mock` no módulo fiscal; as telas agora usam o termo `ambiente configurado no backend`.
- Natureza de operação foi mantida desabilitada enquanto não houver endpoint operacional específico documentado.
- Download fiscal passou a respeitar `Content-Disposition` quando o backend enviar nome de arquivo.
- Erros fiscais passaram a preservar mensagem, código, HTTP status e traceId quando retornados pela API.

## O que continua pendente de backend

- `GET /api/fiscal/notas-fiscais` com paginação/filtros.
- Consulta de nota por origem/pedido.
- Correção controlada de nota rejeitada.
- Consulta de protocolo/recibo/status SEFAZ.
- Reprocessamento fiscal idempotente.
- Natureza de operação operacional completa.
- Motor tributário real.
- DANFE oficial em PDF.

## Decisão sobre testes

- Mocks e interceptações permanecem permitidos somente em `tests/`, pois são necessários para teste unitário, componente e E2E sem backend manual.
- Runtime da aplicação não possui mais caminho alternativo por mock.

## Validações executadas

- `npm run validate:source`: aprovado.

## Validações não concluídas neste ambiente

- `npm install`, `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run build` não foram executados neste container porque o ambiente disponível está em Node `v22.16.0` e npm `10.9.2`, enquanto o projeto exige Node `>=24 <25` e npm `>=11 <12` com `engine-strict=true`.

Em ambiente correto, execute:

```bash
npm install
npm run typecheck
npm run lint
npm run test:unit
npm run build
```
