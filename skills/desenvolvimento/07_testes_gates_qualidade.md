# Skill — Testes, gates e qualidade

## Gates mínimos por entrega

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```

## Gates especializados

### Referências entre entidades

```bash
npm run validate:guid-references
```

### Fiscal

```bash
npm run validate:fiscal:production
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
```

### CI

```bash
npm run validate:ci
```

### Backend controlado

```bash
npm run validate:backend-controlled
npm run validate:controlled-seeds
npm run validate:integrated-runbook
npm run validate:operational-contracts
npm run validate:integrated-e2e
```

### Skills

```bash
npm run validate:skills
```

## Critérios de bloqueio

Bloquear se ocorrer qualquer item:

```text
Typecheck falha.
Build falha.
Teste unitário falha.
E2E obrigatório falha.
Lint falha.
git diff --check falha.
Arquivo rastreado some sem justificativa.
Arquivo fora do escopo é reescrito.
Mock produtivo é criado ou usado indevidamente.
Documentação contradiz pacote.
Campo de entidade relacionada vira input manual de GUID.
XML/payload sensível aparece em UI/log/teste.
Endpoint/tela crítica fica sem permissão.
Ação fiscal ignora workflow/resumo.
```

## Bugs viram regressão

Toda correção de bug deve gerar pelo menos um destes:

```text
teste unitário
teste de componente
teste E2E
gate estrutural
caso documentado de revisão
```

## Ambiente

O projeto exige Node 24 e npm 11. Se o ambiente local não atender, documentar validações não executadas e não declarar aprovação completa. Validações contra backend real/controlado devem usar ambiente de homologação, sandbox ou base descartável; nunca apontar fluxo mutável para produção. O E2E integrado (`npm run test:e2e:integrated:backend`) só pode rodar com `LOGOSOFT_INTEGRATED_E2E_RUN=true`, `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID`, `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true` e `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` em ambiente descartável preparado e após seguir `docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md`.
