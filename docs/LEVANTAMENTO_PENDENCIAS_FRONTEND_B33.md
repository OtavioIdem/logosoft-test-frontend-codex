# Levantamento de pendências frontend — B33

## Base atual

```text
Base aprovada anterior: v1.11.0a8b32
Versão em revisão: v1.11.0a8b33
Foco: seeds/dados controlados para E2E integrado
```

## Pendências prioritárias

### 1. Backend de seed controlada

Ainda falta uma rotina real no backend para criar dados descartáveis do E2E integrado.

Necessário:

- criar empresa/filial controladas ou referenciar fixtures existentes;
- criar usuário com permissões necessárias;
- criar cliente, produto, estoque e pedido faturável;
- garantir configuração fiscal de homologação/simulação;
- registrar `seedRunId` para rastreio;
- permitir reset antes/depois da execução.

### 2. Execução real do E2E integrado

A suíte existe, mas ainda não foi executada contra backend real/controlado com mutação habilitada.

Necessário:

- ambiente descartável;
- variáveis `LOGOSOFT_INTEGRATED_E2E_*` preenchidas localmente;
- `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`;
- validação de efeitos em fiscal, estoque, financeiro e auditoria.

### 3. Contratos por módulo além de leitura

Os contratos operacionais ainda são read-only.

Futuramente será necessário validar fluxos mutáveis controlados por módulo:

- vendas;
- estoque;
- financeiro;
- auditoria;
- compras;
- integração contábil/gerencial quando existir.

### 4. Validação fiscal oficial

A execução controlada não substitui validação fiscal oficial.

Ainda depende de:

- documentação vigente;
- ambiente de homologação correto;
- validação de contador/consultor fiscal;
- regras por UF, município, regime tributário e documento fiscal.

### 5. Observabilidade do fluxo integrado

Ainda falta validar de forma completa:

- correlationId ponta a ponta;
- auditoria por etapa;
- mensagens de erro rastreáveis;
- logs sem XML/token/segredo;
- exportação de evidências de execução controlada.

## Próxima etapa recomendada

```text
v1.11.0a8b34 — Runbook de execução real do E2E integrado com backend descartável
```

Essa próxima etapa deve detalhar o procedimento operacional completo para preparar backend, preencher variáveis, executar suíte, coletar evidências e resetar ambiente.
