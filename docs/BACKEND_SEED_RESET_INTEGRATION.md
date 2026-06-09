# Seed/reset real do backend para E2E integrado

## Objetivo

A versão `v1.11.0a8b35` prepara o frontend para chamar um procedimento real de seed/reset fornecido pelo backend antes da execução do E2E integrado controlado.

O objetivo é evitar que o fluxo venda → fiscal → estoque → financeiro → auditoria dependa de dados manuais, compartilhados ou invisíveis. A preparação deve criar ou resetar dados descartáveis e previsíveis em um ambiente descartável.

## Regra principal

O seed/reset é mutável e não deve rodar no CI padrão.

A execução só pode ocorrer quando todos os ACKs locais estiverem habilitados em arquivo não versionado:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true
```

Depois que o backend confirmar o reset, o operador deve habilitar manualmente:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true
```

Esse último ACK informa ao E2E integrado que o procedimento real de seed/reset já foi aplicado no backend descartável.

## Variáveis próprias

A integração usa apenas variáveis `LOGOSOFT_INTEGRATED_E2E_*` e `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_*`.

Não é permitido reaproveitar:

```text
LOGOSOFT_CONTRACT_*
LOGOSOFT_OPERATIONAL_CONTRACT_*
LOGOSOFT_E2E_*
```

## Comando operacional

```bash
npm run prepare:e2e:integrated:seed
```

Esse comando chama o endpoint do backend definido por:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_API_URL=http://localhost:8080
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_PATH=/api/test/integrated-e2e/reset
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_METHOD=POST
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN=
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_EXPECTED_STATUS=200
```

O payload base vem de:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json
```

O script injeta também `seedRunId`, `empresaId`, `filialId` e `pedidoVendaId` quando essas variáveis estiverem preenchidas.

## Contrato esperado do backend

O backend deve expor um endpoint exclusivo de teste/homologação, nunca produtivo, com comportamento semelhante a:

```http
POST /api/test/integrated-e2e/reset
Authorization: Bearer <token local não versionado>
X-Logosoft-E2E-Seed-Run-Id: <run-id>
X-Logosoft-Disposable-Environment: true
Content-Type: application/json
```

A resposta esperada deve retornar HTTP `200` por padrão e, preferencialmente, um identificador rastreável:

```json
{
  "seedRunId": "LOGOSOFT-E2E-20260609-001",
  "status": "prepared"
}
```

## Fluxo recomendado

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher variáveis reais somente no arquivo local
# conferir que o backend aponta para banco descartável
# habilitar os ACKs locais
npm run validate:backend-seed-reset
npm run prepare:e2e:integrated:seed
# depois de confirmar sucesso do backend:
# LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true
npm run test:e2e:integrated:backend
```

## Relação com o runbook

Este procedimento complementa `docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md`.

A leitura e execução do runbook continuam obrigatórias. O seed/reset real não substitui os critérios de ambiente descartável, evidências, limpeza e rollback.

## Critérios de bloqueio

Bloquear a versão ou a execução se ocorrer qualquer item abaixo:

```text
O comando de seed/reset aparece no ci:gates.
O workflow padrão executa seed/reset.
Algum arquivo versionado habilita ACK true.
O E2E integrado roda sem LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true.
O script aceita método diferente de POST.
O script usa variáveis LOGOSOFT_CONTRACT_*, LOGOSOFT_OPERATIONAL_CONTRACT_* ou LOGOSOFT_E2E_*.
O endpoint aponta para produção.
O arquivo versionado contém token, JWT, senha, certificado ou segredo.
O backend não confirma o seedRunId esperado quando retornar identificador.
```

## O que esta versão não faz

```text
Não cria endpoint no backend.
Não cria seed real no banco.
Não executa seed/reset automaticamente.
Não executa E2E integrado mutável no CI padrão.
Não altera telas produtivas.
Não altera clients reais de API.
```
