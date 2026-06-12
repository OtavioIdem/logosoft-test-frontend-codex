# Implementação v1.11.0a8b10 — Selects de referência com busca server-side no fluxo fiscal

## Objetivo

Dar continuidade à regra global de UX definida para o ERP: campos que referenciam outra entidade operacional não devem ser digitados como ID manual. A seleção deve ocorrer por componente de busca/dropdown carregado por API.

Esta etapa evolui a base fiscal sem alterar regra fiscal legal, cálculo tributário, CFOP, NCM, CST, CSOSN ou integração oficial.

## Alterações realizadas

### 1. Componente base de busca

- `components/forms/SearchSelect.tsx` agora aceita:
  - `onSearch` para busca remota;
  - `loading` para indicar busca em andamento;
  - `filterPlaceholder`;
  - `emptyMessage` padronizado.
- `components/forms/EntitySelect.tsx` repassa os novos recursos para todos os selects de entidade.
- Criado `hooks/useDebouncedValue.ts` para reduzir chamadas repetidas ao backend durante digitação.

### 2. Fluxo fiscal manual

Em `FiscalActionDialogs.tsx`:

- Pessoa/cliente da nota manual passa a enviar `termo` para `usePessoas`.
- O dropdown continua usando API, mas agora suporta busca incremental.
- O frontend não expõe campo para digitar `pessoaId` manualmente.

### 3. Geração de nota por pedido de venda

Em `FiscalActionDialogs.tsx`:

- Pedido aprovado passa a enviar `termo` para `usePedidosVenda`.
- O operador seleciona pelo número/total do pedido; o ID é apenas valor técnico interno.

### 4. Item fiscal

Em `FiscalActionDialogs.tsx`:

- Produto passa a enviar `termo` para `useProdutos`.
- A seleção continua preenchendo sugestão de código, descrição, NCM e preço.
- O frontend não calcula regra fiscal; apenas usa dados cadastrais existentes.

### 5. Condição de pagamento no financeiro fiscal

- O select mantém carregamento por API e passa a exibir estado de busca/carregamento.
- Não há input manual de `condicaoPagamentoId`.

## Regra global reforçada

Toda referência a entidade operacional deve seguir este padrão:

1. Buscar opções via API.
2. Exibir label funcional, como nome, código, documento mascarado ou número.
3. Manter o GUID apenas como valor interno do select.
4. Evitar label ou helper text com `ID técnico`, `GUID cru` ou orientação de digitação manual.
5. Quando o endpoint suportar `termo`, usar busca server-side com debounce.
6. Quando ainda não houver endpoint oficial, deixar o campo desabilitado e documentado como parametrização futura, sem simular cadastro.

## Validação executada

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

## Observações

- Esta etapa não muda payloads fiscais oficiais do markdown.
- Não cria regra fiscal nova.
- Não altera mascaramento XML já corrigido na versão anterior.
- Não substitui validação do backend; apenas melhora UX e reduz risco operacional de digitação de IDs.
