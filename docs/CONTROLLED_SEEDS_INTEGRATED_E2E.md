# Seeds controladas para E2E integrado frontend/backend

## Objetivo

A B33 prepara o frontend para executar o E2E integrado de venda, estoque, fiscal, financeiro e auditoria usando dados previsíveis, rastreáveis e descartáveis.

A versão não cria seed no backend e não executa fluxo mutável por padrão. Ela define o contrato mínimo que o ambiente controlado precisa cumprir antes de habilitar:

```bash
npm run test:e2e:integrated:backend
```

## Regra principal

O E2E integrado só pode rodar quando houver confirmação explícita de que o ambiente é controlado, descartável ou de homologação/sandbox.

Variáveis obrigatórias para execução real:

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
LOGOSOFT_INTEGRATED_E2E_API_URL=http://localhost:8080
LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=<token-local-nao-versionado>
LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=<empresa-controlada>
LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=<pedido-controlado-faturavel>
LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=<identificador-da-seed>
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
```

Sem `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true`, a suíte deve ficar skipped mesmo que as outras variáveis estejam preenchidas.

## Template de seed

O arquivo versionado abaixo é apenas um exemplo seguro, sem token real e sem segredo:

```text
tests/seeds/integrated-e2e.controlled-seed.example.json
```

Ele documenta:

- ambiente descartável;
- proibição de produção;
- IDs mínimos esperados;
- estado operacional necessário;
- efeitos esperados;
- usos proibidos.

## Estado mínimo esperado no backend

Antes de executar o E2E integrado real, o backend deve possuir dados controlados para:

- empresa ativa e liberada para homologação/controlado;
- filial ativa com configuração fiscal controlada;
- usuário com permissões de vendas, fiscal, estoque, financeiro e auditoria;
- cliente ativo;
- produto ativo com cadastro operacional e fiscal previamente validado para ambiente controlado;
- pedido de venda aprovado/faturável, com item e valor positivo;
- estoque suficiente ou regra controlada para baixa/reserva;
- condição de pagamento e forma de pagamento controladas;
- fiscal em homologação/simulação, sem transmissão real em produção;
- auditoria habilitada.

## O que não pode acontecer

O E2E integrado não deve:

- rodar no CI padrão;
- rodar em produção;
- usar base real de cliente;
- versionar token, JWT, certificado ou segredo;
- reaproveitar variáveis fiscais ou operacionais antigas como fallback;
- depender de dado manual invisível sem rastreio por `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID`.

## Gates adicionados

A B33 adiciona:

```bash
npm run validate:controlled-seeds
```

Esse gate valida:

- existência do template de seed;
- ausência de token/JWT/segredo no template;
- variáveis obrigatórias no `.env.backend-controlled.example`;
- exigência de `SEED_RUN_ID` e `DISPOSABLE_ENVIRONMENT_ACK` no E2E integrado;
- integração ao `validate:source`, `ci:gates` e GitHub Actions;
- ausência de execução mutável automática no CI padrão.

## Procedimento recomendado

1. Preparar base descartável no backend.
2. Criar ou carregar dados seguindo `tests/seeds/integrated-e2e.controlled-seed.example.json`.
3. Copiar `.env.backend-controlled.example` para `.env.backend-controlled.local`.
4. Preencher token e IDs somente localmente.
5. Definir `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` somente após confirmar que a base pode sofrer mutação.
6. Executar:

```bash
npx playwright install chromium
npm run test:e2e:integrated:backend
```

## Pontos que ainda dependem do backend

- Endpoint ou rotina de seed real no backend.
- Base descartável com reset antes/depois do teste.
- Geração de pedido de venda controlado.
- Estratégia de limpeza das notas/financeiro/estoque gerados no teste.
- Validação fiscal oficial por documentação vigente e especialista humano.


## Runbook obrigatório

Antes de habilitar a execução real, seguir `docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md`. O arquivo versionado mantém `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false`; o valor `true` só pode existir no `.env.backend-controlled.local`.
