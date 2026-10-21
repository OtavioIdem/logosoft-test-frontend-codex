# Solicitação de correção — `PATCH` de dados fiscais do produto retorna 404

## Ocorrência observada

Ao salvar os dados fiscais do produto `52c7fd0c-9d6a-428c-b431-8c5f163de527`, o frontend envia:

```http
PATCH /api/produtos/52c7fd0c-9d6a-428c-b431-8c5f163de527/dados-fiscais
```

O backend local responde `404 Not Found`.

## Evidência de execução

Nos logs do backend, na mesma sessão e para o mesmo identificador:

1. `PUT /api/produtos/{id}` respondeu `200`;
2. `PATCH /api/produtos/{id}/preco-custo` respondeu `200`;
3. `PATCH /api/produtos/{id}/dados-fiscais` respondeu `404`.

O Swagger da instância em execução (`logosoft-backend:v1.26.7`) publica a rota fiscal e a operação `PATCH`; portanto, o erro não é ausência da rota nem produto inexistente de forma geral.

O request do frontend foi comparado com o Swagger ativo. Os campos publicados pelo backend coincidem com o payload enviado:

- `ncmCodigo`
- `cestCodigo`
- `origemMercadoriaCodigo`
- `tipoItemSped`
- `unidadeTributavelSigla`
- `unidadeMedidaTributavelId`
- `exTipi`
- `codigoBeneficioFiscalPadrao`
- `tipoItemFiscal`
- `codigoFiscalExterno`

## Impacto

O cadastro base e o preço são persistidos, mas os dados fiscais do produto não. O frontend informa corretamente que ocorreu uma gravação parcial, porém não consegue indicar qual referência fiscal foi rejeitada porque a resposta é apenas `404`.

## Correção solicitada ao backend

1. Identificar qual validação/referência interna do fluxo `AtualizarDadosFiscais` está produzindo o `404`.
2. Quando o produto existe, retornar `400 Bad Request` para referência fiscal inválida ou ausente, com código e mensagem por campo quando aplicável (NCM, CEST, origem ou unidades tributáveis).
3. Reservar `404` para rota/recurso efetivamente inexistente e documentar se houver uma regra deliberada diferente.
4. Incluir teste de integração para o produto existente com payload fiscal inválido, garantindo status e corpo de erro estáveis.

## Escopo frontend

Nenhuma alteração de backend foi feita neste workspace. O frontend já envia os campos previstos pelo Swagger e exibe o resultado parcial da gravação.
