# Levantamento de pendências frontend — após v1.11.0a8b32

## Situação atual

A B32 adiciona estrutura para E2E integrado controlado entre Vendas, Fiscal, Estoque, Financeiro e Auditoria. A suíte é opt-in e fica fora da execução mutável automática do CI comum.

## Pendências para validação real

1. Preparar backend controlado com base descartável.
2. Criar pedido de venda de teste com cliente, produto, estoque e dados fiscais válidos.
3. Garantir permissão do usuário controlado para venda, fiscal, estoque, financeiro e auditoria.
4. Garantir ambiente fiscal de homologação ou simulação oficial/controlada.
5. Confirmar que o backend retorna movimentos de estoque vinculados à origem da nota fiscal.
6. Confirmar que o backend retorna conta a receber vinculada à origem da nota fiscal.
7. Confirmar que auditoria permite consulta filtrada por entidade/origem.
8. Executar `npm run test:e2e:integrated:backend` com `LOGOSOFT_INTEGRATED_E2E_RUN=true`.

## Pendências funcionais por módulo

### Vendas

- Criar fluxo controlado de criação/aprovação de pedido de venda ou seed dedicada.
- Validar bloqueios de pedido cancelado/faturado.
- Validar permissões reais por empresa/filial.

### Estoque

- Confirmar vínculo de baixa por nota fiscal/pedido de venda.
- Validar reserva, baixa e movimento reverso em cenários futuros.
- Garantir que saldo não seja exibido como mutável diretamente no frontend.

### Fiscal

- Validar regras fiscais oficiais fora do frontend.
- Confirmar homologação, certificado, schema e UF autorizadora no backend.
- Expandir validação de rejeição/correção/cancelamento quando houver ambiente controlado.

### Financeiro

- Confirmar geração de conta a receber por nota autorizada.
- Validar parcelas, vencimentos e origem do documento.
- Preparar futuro E2E de recebimento parcial/total e estorno em base descartável.

### Auditoria

- Confirmar endpoint de eventos filtrável por entidade/origem.
- Validar rastreabilidade de cada ação crítica do fluxo.
- Garantir que logs não exponham payload sensível.

## Pendências técnicas

- Executar B32 com backend real/controlado preparado.
- Ajustar filtros de origem se o backend usar `pedidoVendaId` em vez de `notaFiscalId` para estoque/financeiro/auditoria.
- Criar seeds automatizadas para reduzir dependência manual de IDs.
- Avaliar workflow separado/manual no GitHub Actions para E2E mutável integrado, nunca no CI comum.

## Próxima etapa recomendada

```text
v1.11.0a8b33 — Preparação de seeds/dados controlados para E2E integrado
```
