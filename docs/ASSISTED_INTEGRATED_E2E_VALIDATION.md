# Validação real assistida do E2E integrado

## Objetivo

Este documento define o procedimento assistido para executar e revisar o E2E integrado real do frontend contra backend descartável/controlado.

O fluxo validado continua sendo:

```text
venda → fiscal → estoque → financeiro → auditoria
```

A versão B36 não torna esse fluxo obrigatório no CI comum. Ela adiciona checklist, template de evidências, relatório pós-execução e gates para impedir execução mutável sem confirmação operacional.

## Regras de segurança

Nunca executar este fluxo contra produção.

Obrigatório antes da execução real:

```text
1. Backend descartável ou homologação isolada preparado.
2. Migrations aplicadas.
3. Seed/reset aplicado pelo backend.
4. Token local de usuário controlado gerado.
5. Pedido de venda controlado identificado.
6. Runbook lido.
7. Artefatos sem token, JWT, senha, certificado ou segredo.
```

## Variáveis obrigatórias para execução real

Além das variáveis já existentes do E2E integrado, a B36 exige:

```bash
LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true
LOGOSOFT_INTEGRATED_E2E_EVIDENCE_FILE=tests/evidence/integrated-e2e.assisted-evidence.example.json
LOGOSOFT_INTEGRATED_E2E_ASSISTED_REPORT_OUTPUT=artifacts/integrated-e2e-assisted-report.md
```

O arquivo versionado mantém:

```bash
LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false
```

## Sequência assistida recomendada

```bash
npm install
npm run validate:source
npm run validate:assisted-e2e
npm run validate:backend-seed-reset
npm run validate:integrated-e2e
npx playwright install chromium
npm run prepare:e2e:integrated:seed
npm run test:e2e:integrated:backend
npm run report:e2e:integrated:assisted
```

## Evidências esperadas

A execução assistida deve registrar no arquivo de evidências:

```text
seedRunId
ambiente usado
status de migrations
status de seed/reset
pedidoVendaId
notaFiscalId
movimentoEstoqueIds
contaReceberIds
auditoriaEventoIds
status final do teste
bloqueadores
avisos não bloqueantes
```

O template oficial fica em:

```text
tests/evidence/integrated-e2e.assisted-evidence.example.json
```

## Relatório pós-execução

Após preencher o arquivo de evidências local, gerar o relatório:

```bash
npm run report:e2e:integrated:assisted
```

O script gera um Markdown local em:

```text
artifacts/integrated-e2e-assisted-report.md
```

Esse relatório não deve conter token, JWT, senha, certificado, chave privada, segredo ou payload fiscal sensível.

## Critérios de aprovação assistida

A execução real só deve ser aprovada quando:

```text
E2E integrado passou.
Seed run id ficou rastreável.
Nota fiscal gerada foi identificada.
Estoque foi baixado ou exposto como baixado.
Financeiro foi gerado ou exposto como gerado.
Auditoria foi registrada.
Artefatos foram revisados sem segredo.
Ambiente foi descartado, resetado ou marcado para descarte.
```

## Critérios de bloqueio

Bloquear se ocorrer qualquer item:

```text
Ambiente não é descartável/controlado.
ACK assistido está ausente.
Seed/reset não foi aplicado.
Pedido de venda não é controlado.
Teste falhou.
Side effect esperado não apareceu.
Relatório contém token, JWT, senha, certificado ou segredo.
Não há evidência de auditoria.
Não há plano de descarte/reset do ambiente.
```
