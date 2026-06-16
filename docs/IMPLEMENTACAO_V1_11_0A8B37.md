# Implementação v1.11.0a8b37 — Correção Produto x Fornecedor

## Objetivo

Corrigir o vínculo operacional de fornecedor ao produto, mantendo o frontend alinhado ao contrato esperado do backend para `POST /api/produtos/{id}/fornecedores`.

## Problema tratado

Na B36, o frontend enviava o payload com `codigoFornecedor` e `descricaoFornecedor`. O inventário do backend descreve o contrato com `codigoProdutoFornecedor`, além de `fornecedorId` e `principal`.

Isso poderia causar falha no vínculo mesmo quando o código fosse aceito, porque o backend validaria o fornecedor operacional em um contrato diferente do enviado pelo frontend.

## Escopo implementado

- Ajustado `VincularFornecedorProdutoRequest` para enviar:

```json
{
  "fornecedorId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "codigoProdutoFornecedor": "ABC-123",
  "principal": true
}
```

- Removido `descricaoFornecedor` do payload produtivo.
- Mantido `fornecedorId` como GUID obrigatório.
- Mantido dropdown usando `FornecedorResponse.id`, não `Pessoa.id`.
- Dropdown passou a expor apenas fornecedores ativos (`EntityStatus.Ativo`).
- Atualizado label do campo para “Código do produto no fornecedor”.
- Atualizados testes unitários do payload.
- Adicionado teste para rejeitar fornecedor operacional ausente/inválido.

## Arquivos alterados

```text
features/produtos/types/produtos.types.ts
features/produtos/schemas/produtosSchemas.ts
features/produtos/components/ProdutoComplementoDialogs.tsx
tests/unit/produtosPayload.test.ts
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
README.md
CHANGELOG.md
docs/IMPLEMENTACAO_V1_11_0A8B37.md
```

## Fora de escopo

- Não foram criados novos endpoints.
- Não foram alterados módulos fiscal, financeiro, estoque, vendas ou compras.
- Não foi implementada B38 de reconciliação Swagger.
- Não foi alterado o backend.

## Testes recomendados

```bash
npm install
npm run validate:source
npm run validate:mocks-isolation
npm run validate:guid-references
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/produtosPayload.test.ts
npm run ci:gates
```

## Critério de aprovação manual

1. Abrir Produtos.
2. Criar ou localizar produto ativo.
3. Clicar em Fornecedor.
4. Selecionar fornecedor operacional ativo.
5. Informar código do produto no fornecedor.
6. Confirmar.
7. Validar que a API recebeu `fornecedorId` e `codigoProdutoFornecedor`.
8. Validar que não foi enviado `pessoaId`.
