# Levantamento de pendências frontend — B36

## Status atual

A B36 prepara a execução assistida do E2E integrado real, mas ainda não executa o fluxo mutável contra backend real porque o ambiente descartável, token temporário e IDs controlados precisam ser fornecidos externamente.

## Pendências para execução real

```text
1. Backend descartável disponível.
2. Banco descartável com migrations aplicadas.
3. Endpoint real de seed/reset homologado.
4. Token temporário de usuário controlado.
5. Empresa e filial controladas.
6. Pedido de venda controlado.
7. Seed run id único por execução.
8. Evidências locais preenchidas após execução.
9. Relatório assistido revisado.
10. Ambiente descartado ou resetado ao final.
```

## Pendências por módulo

### Vendas

- Confirmar endpoint real para consultar pedido controlado.
- Confirmar status esperado antes e depois do faturamento/fiscal.
- Validar bloqueios para pedido cancelado/faturado em ambiente real.

### Fiscal

- Validar emissão/transmissão somente em homologação/simulado.
- Confirmar que XML e DANFE não vazam em relatório/log.
- Validar auditoria de geração, assinatura, transmissão e autorização.

### Estoque

- Confirmar origem rastreável do movimento de baixa.
- Confirmar que saldo não é alterado sem movimento.
- Confirmar rollback/reset após execução.

### Financeiro

- Confirmar geração de conta a receber vinculada à nota/pedido.
- Confirmar que não há baixa financeira real no fluxo assistido.
- Validar auditoria financeira mínima.

### Auditoria

- Confirmar eventos por entidade/origem.
- Confirmar usuário controlado e correlation/seed run id.
- Confirmar retenção de evidências sem segredo.

## Pendências de operação

- Definir quem fornece token temporário.
- Definir validade do token.
- Definir política de descarte da base.
- Definir local seguro para armazenar relatórios de evidência.
- Definir procedimento de limpeza de artefatos locais.

## Critério para próxima etapa

A próxima etapa só deve rodar execução real quando o backend descartável estiver pronto e quando os ACKs locais estiverem conscientemente habilitados em arquivo não versionado.
