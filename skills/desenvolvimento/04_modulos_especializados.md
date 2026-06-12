# Skill — Desenvolvimento de módulos especializados

## Objetivo

Evitar que módulos críticos sejam tratados como CRUD visual.

## Classificação obrigatória

Antes de implementar, classificar se há impacto em:

```text
Fiscal
Tributário
Financeiro
Contábil
Estoque
Compras
Vendas
RH
LGPD
Jurídico
Segurança
Integrações externas
Bancos
SEFAZ
Prefeitura
SPED
Nota Fiscal
```

## Quando houver especialidade

1. Identificar regras reais envolvidas.
2. Separar o que é UX do que é regra de domínio/backend.
3. Não inventar regra regulatória.
4. Parametrizar o que varia por empresa, UF, município, regime ou segmento.
5. Registrar pontos que dependem de validação humana/especialista.
6. Exigir testes unitários, integração ou E2E conforme criticidade.

## Exemplos de riscos por módulo

### Financeiro

- Conta quitada não pode ser alterada diretamente.
- Recebimento/pagamento não deve ser excluído.
- Estorno deve gerar movimento reverso.
- Alteração de valor ou vencimento exige auditoria.

### Estoque

- Saldo não deve ser alterado diretamente.
- Toda alteração deve gerar movimento.
- Venda pode reservar ou baixar estoque.
- Transferência exige saída e entrada rastreáveis.

### Vendas

- Pedido cancelado não pode ser faturado.
- Pedido faturado não deve ser alterado diretamente.
- Desconto acima do limite exige aprovação.
- Venda pode afetar estoque, financeiro e fiscal.

### Segurança/LGPD

- Permissão deve ser validada no backend.
- Frontend apenas reflete permissão para UX.
- Dados pessoais devem ser minimizados e mascarados.
- Exportações e ações sensíveis exigem auditoria.
