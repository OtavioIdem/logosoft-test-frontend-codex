# logosoft frontend v9.6.5 — Produtos / Catálogo

Esta versão substitui os placeholders de Produtos por telas específicas e clientes HTTP reais baseados no contrato de API v9.8.

## Escopo implementado

- Produtos
- Categorias de produto
- Unidades de medida
- Marcas
- Dados comerciais de produto
- Dados fiscais de produto com permissão específica
- Código de barras do produto
- Vínculo produto/fornecedor
- Inativação com motivo obrigatório

## Endpoints usados

- `GET /api/produtos`
- `GET /api/produtos/{id}`
- `POST /api/produtos`
- `PUT /api/produtos/{id}`
- `PATCH /api/produtos/{id}/preco-custo`
- `PATCH /api/produtos/{id}/dados-fiscais`
- `POST /api/produtos/{id}/codigos-barras`
- `POST /api/produtos/{id}/fornecedores`
- `POST /api/produtos/{id}/inativar`
- `GET/POST/PUT/POST inativar` para categorias, unidades de medida e marcas.

## Permissões aplicadas

- `PRODUTOS_CONSULTAR`
- `PRODUTOS_GERENCIAR`
- `PRODUTOS_INATIVAR`
- `PRODUTOS_DADOS_FISCAIS_GERENCIAR`
- `CATEGORIAS_PRODUTO_GERENCIAR`
- `UNIDADES_MEDIDA_GERENCIAR`
- `MARCAS_GERENCIAR`

## Regras de frontend

- Enums são enviados como números.
- referência técnica vazio, `0` e `99` não são enviados para campos de referência técnica.
- `filialId`, `categoriaProdutoId`, `marcaId` e `unidadeTributavelId` vazios viram `null`.
- Preço de venda e custo referencial não aceitam valores negativos.
- Registros inativos não mostram ação de edição operacional.
- Dados fiscais ficam protegidos por `PRODUTOS_DADOS_FISCAIS_GERENCIAR`.
- Inativação exige motivo pelo `ReasonDialog`.
- Erros são exibidos por Toast ou painéis de erro, sem `console.*`.

## Testes adicionados

- `tests/unit/produtosPayload.test.ts`

Cobre montagem de payloads de produto, unidade de medida, dados fiscais, código de barras, vínculo com fornecedor, preço/custo e motivo obrigatório.
