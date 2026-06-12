# Levantamento de pendências frontend — v1.11.0a8b35

## Base atual

```text
Base aprovada anterior: v1.11.0a8b34
Versão atual: v1.11.0a8b35
Foco: integração com procedimento real de seed/reset fornecido pelo backend
```

## Pendências para execução real integrada

1. Backend deve expor endpoint exclusivo de seed/reset em ambiente descartável.
2. Endpoint deve rejeitar produção e exigir permissão/token próprio de teste.
3. Backend deve aplicar migrations e seed/reset de empresa, filial, usuário, cliente, produto, pedido, estoque, fiscal, financeiro e auditoria.
4. Backend deve retornar `seedRunId` ou identificador equivalente rastreável.
5. Operador deve registrar evidências sem token, senha, certificado, XML completo ou payload sensível.
6. Operador deve habilitar `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true` somente após sucesso do reset.
7. E2E integrado real ainda precisa ser executado uma primeira vez em backend descartável preparado.

## Pendências por módulo

### Vendas

- Garantir pedido controlado faturável, com item e valor positivo.
- Garantir que o pedido não tenha faturamento definitivo anterior.

### Estoque

- Garantir saldo suficiente ou regra controlada de baixa/reserva.
- Garantir movimento rastreável após o fluxo.

### Fiscal

- Garantir ambiente fiscal homologação/simulação.
- Validar regras oficiais com backend, contador/consultor fiscal e documentação vigente antes de produção.

### Financeiro

- Garantir condição/forma de pagamento controlada.
- Garantir geração rastreável de conta a receber.

### Auditoria

- Garantir evento para geração fiscal, baixa de estoque, financeiro e ações críticas.

## Bloqueios automáticos mantidos

```text
Seed/reset não roda no CI padrão.
E2E integrado real não roda no CI padrão.
Arquivos versionados não podem habilitar ACK true.
Arquivos versionados não podem conter token/JWT/chave.
Spec integrada não pode usar fallback LOGOSOFT_CONTRACT_*, LOGOSOFT_OPERATIONAL_CONTRACT_* ou LOGOSOFT_E2E_*.
```

## Próxima etapa recomendada

```text
v1.11.0a8b36 — Primeira execução real controlada do seed/reset + E2E integrado em backend descartável
```
