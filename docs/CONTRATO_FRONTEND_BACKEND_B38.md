# Contrato frontend x backend — B38

## Objetivo

A B38 cria um mapa controlado de contratos para impedir que o frontend avance sobre endpoints ou payloads divergentes sem classificação explícita.

Esta versão não cria tela produtiva e não altera fluxos operacionais. Ela adiciona gate, allowlist documentada e procedimento para comparar o frontend com Swagger real quando disponível.

## Modo de validação

```bash
npm run validate:backend-contract-map
```

Sem Swagger real, o gate valida:

- presença da documentação B38;
- presença da allowlist versionada;
- classificação das divergências conhecidas;
- endpoints frontend mapeáveis em `features/*/api/*.ts`;
- regressão da B37 em Produto x Fornecedor.

Com Swagger real:

```bash
LOGOSOFT_BACKEND_SWAGGER_FILE=docs/contracts/swagger-v1.json npm run validate:backend-contract-map
```

## Divergências classificadas

| ID | Status | Alvo | Decisão |
|---|---|---|---|
| `AUTH_LOGIN_PAYLOAD_DIVERGENTE` | DIVERGENTE_PAYLOAD | Correção dedicada pós-Swagger real | Mantido sem alteração para não quebrar login aprovado; confirmar Swagger real antes de alterar LoginForm/AuthApi. |
| `AUTH_ME_AUSENTE_FRONTEND` | CLIENT_IMPLEMENTADO_B39 | B39 concluído / wiring opcional posterior | Client `authApi.me` implementado; decidir depois se AuthProvider deve recarregar permissões automaticamente. |
| `PRODUTO_FORNECEDOR_ALINHADO_B37` | OK_APOS_B37 | Concluído na B37 | Manter teste de regressão em produtosPayload.test.ts. |
| `PRODUTO_DADOS_FISCAIS_PATCH_VS_POST` | DIVERGENTE_METODO | B38 follow-up | Confirmar controller real antes de alterar método HTTP. |
| `ESTOQUE_INVENTARIO_FECHAR_VS_CONCLUIR` | IMPLEMENTADO_B41 | B41 concluído | Client corrigido para `/concluir` com payload `{ motivoAjuste }`; `/fechar` removido. |
| `ESTOQUE_TRANSFERENCIAS_AUSENTE_FRONTEND` | IMPLEMENTADO_B41 | B41 concluído | Criada rota `/estoque/transferencias` e client `POST /api/estoque/transferencias`. |
| `ESTOQUE_BLOQUEIOS_AUSENTE_FRONTEND` | IMPLEMENTADO_B41 | B41 concluído | Criada rota `/estoque/bloqueios` e client para criar/liberar/cancelar. |
| `FINANCEIRO_BAIXAR_VS_RECEBER_PAGAR` | IMPLEMENTADO_B42 | B42 concluído | Baixa alinhada para `/baixar` com `{ valor, dataBaixa, observacao }`. |
| `FINANCEIRO_ESTORNO_DIVERGENTE` | IMPLEMENTADO_B42 | B42 concluído | Estorno alinhado para `/estornar` com `{ baixaId, dataEstorno, motivo }`. |
| `TABELAS_PRECO_AUSENTE_FRONTEND` | IMPLEMENTADO_B40 | B40 concluído | Módulo `/tabelas-preco` implementado com CRUD de tabelas, itens, ativação, inativação e preço vigente. |
| `ATIVIDADES_AUSENTE_FRONTEND` | IMPLEMENTADO_B43 | B43 concluído | Módulo `/atividades` implementado com listagem, detalhe, criação, edição, atribuição, status, comentários e cancelamento. |
| `RELATORIOS_AUSENTE_FRONTEND` | IMPLEMENTADO_B44 | B44 concluído | Módulo `/relatorios` implementado com operacional e gerenciais por vendas, compras, financeiro, estoque e fiscal. |
| `AUDITORIA_OPERACIONAL_AUSENTE_FRONTEND` | AUSENTE_NO_FRONTEND | B45 | Implementar na B45. |
| `FISCAL_ROTAS_AVANCADAS_VS_INVENTARIO` | DIVERGENTE_CONTRATO | B38/B45 fiscal follow-up | Reconciliar somente contra Swagger real; não inventar regra fiscal. |

## Decisões importantes

### Produto x Fornecedor

`PRODUTO_FORNECEDOR_ALINHADO_B37` foi classificado como resolvido após a B37. O frontend deve continuar enviando:

```json
{
  "fornecedorId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
  "codigoProdutoFornecedor": "ABC-123",
  "principal": true
}
```

### Financeiro

`FINANCEIRO_BAIXAR_VS_RECEBER_PAGAR` e `FINANCEIRO_ESTORNO_DIVERGENTE` foram classificados como `IMPLEMENTADO_B42`, adotando as rotas `/baixar` e `/estornar` documentadas no inventário backend. Sem Swagger real informado, a validação permanece estrutural/documental.

### Estoque

`ESTOQUE_INVENTARIO_FECHAR_VS_CONCLUIR` foi resolvido na B41 com a troca do client para `/concluir` e payload `{ motivoAjuste }`.

### Fiscal

`FISCAL_ROTAS_AVANCADAS_VS_INVENTARIO` deve ser conferido somente contra Swagger real e documentação fiscal oficial. Não criar regra fiscal por inferência.

## Critério para B39

A B39 pode iniciar desde que:

```text
[ ] npm run validate:backend-contract-map passa.
[ ] divergências de Segurança/Usuários estejam classificadas.
[ ] endpoints de grupos de acesso sejam confirmados no Swagger ou documentados como pendência backend.
```


## Atualização B43

`ATIVIDADES_AUSENTE_FRONTEND` foi classificado como `IMPLEMENTADO_B43`, adotando as rotas `/api/atividades`, `/api/atividades/{id}`, `/atribuir`, `/status`, `/comentarios` e `/cancelar` documentadas no inventário backend. Sem Swagger real informado, a validação permanece estrutural/documental.


## Atualização B44

`RELATORIOS_AUSENTE_FRONTEND` foi classificado como `IMPLEMENTADO_B44`, adotando `/api/relatorios/operacionais` e `/api/relatorios/gerenciais/{modulo}`. Sem Swagger real informado, a validação permanece estrutural/documental.
