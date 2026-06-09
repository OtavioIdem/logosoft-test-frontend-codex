# Levantamento de pendências frontend — v1.11.0a8b34

## Estado atual

Versão em revisão: v1.11.0a8b34

A B34 consolida o runbook de execução real do E2E integrado com backend descartável. O frontend possui gates, documentação, opt-in próprio, ACK de ambiente descartável e ACK de leitura do runbook, mas a execução real ainda depende do backend fornecer ambiente e seed/reset reais.

## Pendências críticas para execução real

```text
1. Criar comando ou endpoint backend para carregar seed integrada real.
2. Criar comando ou endpoint backend para cleanup/reset por seedRunId.
3. Definir docker-compose.test.yml ou ambiente equivalente com PostgreSQL/Redis isolados.
4. Garantir migrations automáticas ou procedimento documentado de atualização do banco descartável.
5. Gerar pedido de venda controlado, aprovado e faturável.
6. Garantir produto com estoque suficiente ou regra controlada de baixa.
7. Garantir configuração fiscal em homologação/simulação.
8. Garantir geração financeira controlada e rastreável.
9. Garantir auditoria vinculada ao fluxo integrado.
10. Garantir que logs/observabilidade do backend não exponham token, certificado, XML sensível ou segredo.
```

## Pendências funcionais por módulo

### Vendas

```text
Seed de pedido controlado aprovado/faturável.
Contrato claro para origem do faturamento fiscal.
Validação de status antes e depois do fluxo.
```

### Estoque

```text
Seed de saldo/local controlado.
Critério de reserva/baixa aplicado no fluxo.
Consulta por origemId após geração fiscal.
Cleanup de movimentos criados no teste.
```

### Fiscal

```text
Ambiente fiscal de homologação/simulação.
Certificado/assinatura controlada sem segredo versionado.
Validação oficial de regras fiscais fora do frontend.
Cleanup de XML/DANFE/logs de integração controlados.
```

### Financeiro

```text
Geração de conta a receber vinculada à nota/pedido.
Consulta por origemId.
Cleanup de contas geradas no teste.
```

### Auditoria

```text
Eventos rastreáveis por entidade/origem/seedRunId.
Evidências sem payload sensível.
Consulta confiável pós-fluxo.
```

## Pendências técnicas

```text
Padronizar origemId/correlationId/seedRunId entre módulos.
Definir estratégia de cleanup transacional no backend.
Criar massa de dados repetível sem depender de cadastro manual.
Adicionar relatório de execução com evidências sanitizadas.
Avaliar pipeline manual separado para E2E integrado real, nunca no CI comum.
```

## Próxima versão sugerida

```text
v1.11.0a8b35 — Integração com procedimento real de seed/reset fornecido pelo backend
```
