# Contrato Fiscal Oficial — Logosoft Frontend

**Versão frontend:** 1.11.0a8b20
**Base técnica backend:** documentação fiscal v1.10.0a18
**Escopo:** contrato de integração frontend/backend para telas fiscais operacionais de Nota Fiscal.

---

# Documentação para frontend — Módulo Fiscal / Nota Fiscal — Logosoft ERP v1.10.0a18

## 1. Objetivo deste documento

Este documento descreve o contrato atual do backend fiscal do Logosoft ERP na versão `v1.10.0a18`, com foco em implementação da tela fiscal no frontend.

Ele consolida:

- workflow operacional de nota fiscal;
- endpoints existentes;
- permissões exigidas;
- payloads de entrada;
- modelos de saída;
- filtros da listagem;
- exportação CSV auditada;
- observabilidade fiscal;
- regras de exibição para o frontend;
- limitações do que ainda não deve ser tratado como funcionalidade oficial pronta.

Este documento **não cria serviços novos**, **não inventa regra fiscal** e **não assume comportamento oficial de SEFAZ, prefeitura ou Ambiente Nacional**. Ele documenta o que existe no backend aprovado até a `v1.10.0a18`.

---

## 2. Premissas gerais do contrato HTTP

### 2.1 Base de autenticação

Todos os endpoints fiscais estão protegidos por autenticação JWT e autorização por permissão granular.

O frontend deve enviar:

```http
Authorization: Bearer {accessToken}
```

### 2.2 Formato JSON

O backend usa contrato JSON em `camelCase`.

Exemplo:

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "serie": "1",
  "numero": "900001"
}
```

### 2.3 Enums

Os enums trafegam como **números inteiros**, não como texto.

Exemplo:

```json
{
  "tipoDocumento": 1,
  "statusFiscal": 5
}
```

### 2.4 Datas

Datas devem ser enviadas em formato ISO-8601 compatível com `DateTimeOffset`.

Exemplo:

```json
{
  "dataEmissao": "2026-05-25T10:00:00-03:00"
}
```

### 2.5 Erro padrão dos controllers fiscais

Quando uma regra falha, o backend retorna objeto simples com `code` e `message`.

```json
{
  "code": "Fiscal.Validacao",
  "message": "Mensagem de validação fiscal."
}
```

O frontend deve tratar `400 Bad Request` e `404 Not Found` exibindo `message` para o usuário quando for seguro.

---

## 3. Permissões fiscais e operacionais usadas pela tela

| Permissão | Uso no frontend |
|---|---|
| `FISCAL_CONSULTAR` | Listar notas, abrir detalhe, resumo, workflow, integrações, histórico SEFAZ, observabilidade e download de documento auxiliar. |
| `FISCAL_EXPORTAR` | Exportar CSV fiscal auditado. |
| `FISCAL_GERENCIAR` | Criar nota, adicionar itens/impostos/XML, validar e registrar rejeição técnica. |
| `FISCAL_EMITIR` | Gerar nota a partir de pedido, gerar XML, assinar, transmitir, reprocessar, consultar protocolo, contingência e gerar DANFE. |
| `FISCAL_CANCELAR` | Cancelar nota fiscal localmente ou via SEFAZ/mock. |
| `FISCAL_INUTILIZAR` | Inutilizar faixa de numeração fiscal. |
| `FISCAL_CARTA_CORRECAO` | Emitir carta de correção. |
| `ESTOQUE_MOVIMENTAR` | Baixar estoque de nota autorizada vinculada a pedido de venda. |
| `FINANCEIRO_GERENCIAR` | Gerar conta a receber de nota autorizada. |

O frontend deve esconder ou desabilitar ações conforme permissão do usuário e conforme os flags retornados pelo workflow/resumo.

---

## 4. Enums fiscais principais

### 4.1 `TipoDocumentoFiscal`

| Valor | Nome |
|---:|---|
| 1 | `NFe` |
| 2 | `NFCe` |
| 3 | `NFSe` |
| 4 | `CTe` |
| 5 | `MDFe` |
| 99 | `Outro` |

Observação: o enum possui vários tipos, mas os fluxos de pedido de venda, status de serviço e contingência desta etapa suportam principalmente **NF-e** e **NFC-e**. Não assumir emissão real de NFS-e, CT-e ou MDF-e sem implementação e validação fiscal específica.

### 4.2 `TipoOperacaoFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Venda` |
| 2 | `Compra` |
| 3 | `Devolucao` |
| 4 | `Remessa` |
| 5 | `Transferencia` |
| 6 | `Bonificacao` |
| 7 | `Servico` |
| 8 | `Transporte` |
| 99 | `Outro` |

### 4.3 `OrigemNotaFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Manual` |
| 2 | `PedidoVenda` |
| 3 | `PedidoCompra` |
| 4 | `Servico` |
| 5 | `Importacao` |

### 4.4 `StatusNotaFiscal`

| Valor | Nome | Interpretação para UI |
|---:|---|---|
| 1 | `Rascunho` | Nota criada, ainda editável dentro das regras. |
| 2 | `Validada` | Nota validada tecnicamente. |
| 3 | `Assinada` | XML de envio assinado. |
| 4 | `Transmitida` | Enviada ao ambiente autorizador, aguardando retorno conclusivo. |
| 5 | `Autorizada` | Nota autorizada. Permite DANFE, baixa de estoque, financeiro e eventos pós-autorização conforme regra. |
| 6 | `Rejeitada` | Rejeitada pelo autorizador/mock. Pode exigir correção/reprocessamento. |
| 7 | `Cancelada` | Cancelada. Não deve ser reutilizada. |
| 8 | `Inutilizada` | Numeração inutilizada. |
| 9 | `Denegada` | Status previsto no domínio, sem fluxo frontend detalhado nesta documentação. |
| 10 | `Contingencia` | Fluxo operacional de contingência habilitado. |

### 4.5 `TipoXmlFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Envio` |
| 2 | `Autorizado` |
| 3 | `Cancelamento` |
| 4 | `CartaCorrecao` |
| 5 | `Inutilizacao` |
| 6 | `RetornoAutorizador` |

### 4.6 `TipoEventoFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Criacao` |
| 2 | `Validacao` |
| 3 | `Assinatura` |
| 4 | `Transmissao` |
| 5 | `Autorizacao` |
| 6 | `Rejeicao` |
| 7 | `Cancelamento` |
| 8 | `CartaCorrecao` |
| 9 | `Inutilizacao` |
| 10 | `ErroIntegracao` |
| 11 | `CorrecaoRascunho` |
| 12 | `Contingencia` |

### 4.7 `TipoServicoTransmissaoFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Autorizacao` |
| 2 | `ConsultaRetornoAutorizacao` |
| 3 | `ConsultaProtocolo` |
| 4 | `StatusServico` |

### 4.8 `TipoContingenciaFiscal`

| Valor | Nome |
|---:|---|
| 1 | `Svc` |
| 2 | `Epec` |
| 3 | `OfflineNfce` |
| 99 | `OperacionalInterna` |

---

## 5. Visão geral do workflow fiscal atual

O backend trabalha com dois caminhos principais para a nota fiscal:

1. **Nota fiscal manual**, criada diretamente pelo fiscal.
2. **Nota fiscal gerada a partir de pedido de venda**, usada no fluxo E2E principal.

O fluxo mais completo validado atualmente é:

```txt
Login
→ criar/usar empresa, filial, cliente, produto, estoque e pedido de venda
→ aprovar pedido com reserva de estoque
→ gerar nota fiscal a partir do pedido de venda
→ gerar XML de envio
→ transmitir SEFAZ/mock
→ receber autorização mockada
→ armazenar XML autorizado
→ baixar estoque
→ gerar conta a receber
→ consultar resumo/workflow/listagem/observabilidade
→ exportar CSV quando necessário
```

### 5.1 Etapas de workflow retornadas pelo backend

O endpoint `GET /api/fiscal/notas-fiscais/{id}/workflow-operacional` retorna as etapas formais:

| Ordem | Código | Nome | Endpoint relacionado |
|---:|---|---|---|
| 1 | `CRIACAO` | Nota fiscal criada ou gerada | `GET /api/fiscal/notas-fiscais/{id}` |
| 2 | `VALIDACAO` | Validar dados da nota | `POST /api/fiscal/notas-fiscais/{id}/validar` |
| 3 | `XML_ENVIO` | Gerar XML de envio | `POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio` |
| 4 | `ASSINATURA` | Assinar XML de envio | `POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio` |
| 5 | `TRANSMISSAO_SEFAZ` | Transmitir/autorizar na SEFAZ | `POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz` |
| 6 | `DANFE` | Gerar DANFE/documento auxiliar | `POST /api/fiscal/notas-fiscais/{id}/danfe` |
| 7 | `BAIXA_ESTOQUE` | Baixar estoque vinculado ao pedido | `POST /api/fiscal/notas-fiscais/{id}/baixar-estoque` |
| 8 | `FINANCEIRO` | Gerar conta a receber | `POST /api/fiscal/notas-fiscais/{id}/gerar-conta-receber` |
| 9 | `POS_AUTORIZACAO` | Eventos pós-autorização | Cancelamento / carta de correção |

### 5.2 Status de etapa possíveis

O frontend deve tratar os status como texto retornado pelo backend:

- `Concluida`;
- `Disponivel`;
- `Bloqueada`;
- `NaoAplicavel`.

### 5.3 Melhor forma de dirigir a tela

Para evitar duplicar regra no frontend:

1. Use a listagem para montar cards/tabela e ação principal.
2. Ao abrir uma nota, busque detalhe, resumo e workflow.
3. Renderize botões usando `proximasAcoes` e `resumo.acoes`.
4. Use `motivoBloqueio` para tooltip/mensagem de botão desabilitado.
5. Não calcule no frontend se uma nota pode transmitir, cancelar, baixar estoque ou gerar financeiro; use os flags do backend.

---

## 6. Endpoints fiscais existentes

### 6.1 Notas fiscais

Base route:

```http
/api/fiscal/notas-fiscais
```

| Verbo | Rota | Permissão | Finalidade |
|---|---|---|---|
| GET | `/api/fiscal/notas-fiscais` | `FISCAL_CONSULTAR` | Listagem fiscal leve para frontend. |
| GET | `/api/fiscal/notas-fiscais/exportacoes/csv` | `FISCAL_EXPORTAR` | Exportação CSV auditada. |
| GET | `/api/fiscal/notas-fiscais/{id}` | `FISCAL_CONSULTAR` | Detalhe completo da nota. |
| GET | `/api/fiscal/notas-fiscais/{id}/resumo-operacional` | `FISCAL_CONSULTAR` | Resumo operacional da nota. |
| GET | `/api/fiscal/notas-fiscais/{id}/workflow-operacional` | `FISCAL_CONSULTAR` | Workflow para orientar tela. |
| POST | `/api/fiscal/notas-fiscais` | `FISCAL_GERENCIAR` | Criar nota manual em rascunho. |
| POST | `/api/fiscal/notas-fiscais/gerar-de-pedido-venda` | `FISCAL_EMITIR` | Gerar nota a partir de pedido de venda. |
| POST | `/api/fiscal/notas-fiscais/{id}/itens` | `FISCAL_GERENCIAR` | Adicionar item na nota. |
| POST | `/api/fiscal/notas-fiscais/{id}/impostos` | `FISCAL_GERENCIAR` | Adicionar imposto parametrizado. |
| POST | `/api/fiscal/notas-fiscais/{id}/xmls` | `FISCAL_GERENCIAR` | Armazenar XML fiscal. |
| POST | `/api/fiscal/notas-fiscais/{id}/validar` | `FISCAL_GERENCIAR` | Validar tecnicamente a nota. |
| POST | `/api/fiscal/notas-fiscais/{id}/gerar-xml-envio` | `FISCAL_GERENCIAR` | Gerar XML de envio. |
| POST | `/api/fiscal/notas-fiscais/{id}/assinar-xml-envio` | `FISCAL_EMITIR` | Assinar XML de envio. |
| POST | `/api/fiscal/notas-fiscais/{id}/transmitir-sefaz` | `FISCAL_EMITIR` | Transmitir para SEFAZ/mock. |
| POST | `/api/fiscal/notas-fiscais/{id}/reprocessar-sefaz` | `FISCAL_EMITIR` | Reprocessar transmissão. |
| GET | `/api/fiscal/notas-fiscais/{id}/integracoes` | `FISCAL_CONSULTAR` | Logs de integração da nota. |
| POST | `/api/fiscal/notas-fiscais/{id}/habilitar-contingencia` | `FISCAL_EMITIR` | Habilitar contingência operacional. |
| POST | `/api/fiscal/notas-fiscais/{id}/consultar-protocolo-sefaz` | `FISCAL_EMITIR` | Consultar protocolo/status da nota. |
| POST | `/api/fiscal/notas-fiscais/{id}/rejeicao` | `FISCAL_GERENCIAR` | Registrar rejeição técnica. |
| POST | `/api/fiscal/notas-fiscais/{id}/cancelar` | `FISCAL_CANCELAR` | Cancelamento local/técnico. |
| POST | `/api/fiscal/notas-fiscais/{id}/cancelar-sefaz` | `FISCAL_CANCELAR` | Cancelamento via SEFAZ/mock. |
| POST | `/api/fiscal/notas-fiscais/{id}/cartas-correcao` | `FISCAL_CARTA_CORRECAO` | Emitir carta de correção via SEFAZ/mock. |
| POST | `/api/fiscal/notas-fiscais/{id}/baixar-estoque` | `ESTOQUE_MOVIMENTAR` | Baixar estoque após autorização. |
| POST | `/api/fiscal/notas-fiscais/{id}/gerar-conta-receber` | `FINANCEIRO_GERENCIAR` | Gerar conta a receber após baixa de estoque. |
| POST | `/api/fiscal/notas-fiscais/{id}/danfe` | `FISCAL_EMITIR` | Gerar DANFE/documento auxiliar. |
| GET | `/api/fiscal/notas-fiscais/documentos-auxiliares/{documentoAuxiliarId}/download` | `FISCAL_CONSULTAR` | Download do documento auxiliar. |

### 6.2 SEFAZ / status / contingência

Base route:

```http
/api/fiscal/sefaz
```

| Verbo | Rota | Permissão | Finalidade |
|---|---|---|---|
| POST | `/api/fiscal/sefaz/status-servico` | `FISCAL_CONSULTAR` | Consultar status de serviço. |
| GET | `/api/fiscal/sefaz/status-servico/historico` | `FISCAL_CONSULTAR` | Histórico de status de serviço. |
| POST | `/api/fiscal/sefaz/contingencia/avaliar` | `FISCAL_EMITIR` | Avaliar contingência operacional. |
| GET | `/api/fiscal/sefaz/contingencia/historico` | `FISCAL_CONSULTAR` | Histórico de contingência. |

### 6.3 Inutilização fiscal

Base route:

```http
/api/fiscal/inutilizacoes
```

| Verbo | Rota | Permissão | Finalidade |
|---|---|---|---|
| POST | `/api/fiscal/inutilizacoes` | `FISCAL_INUTILIZAR` | Inutilizar faixa de numeração fiscal. |

### 6.4 Observabilidade fiscal

Base route:

```http
/api/fiscal/observabilidade
```

| Verbo | Rota | Permissão | Finalidade |
|---|---|---|---|
| GET | `/api/fiscal/observabilidade/integracoes` | `FISCAL_CONSULTAR` | Consultar logs operacionais sanitizados de integrações fiscais. |

---

## 7. Listagem fiscal

### 7.1 Endpoint

```http
GET /api/fiscal/notas-fiscais
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 7.2 Query string

| Parâmetro | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `empresaId` | `guid` | Sim | Empresa da consulta. |
| `filialId` | `guid?` | Não | Filial. |
| `tipoDocumento` | `int?` | Não | Enum `TipoDocumentoFiscal`. |
| `tipoOperacao` | `int?` | Não | Enum `TipoOperacaoFiscal`. |
| `statusFiscal` | `int?` | Não | Enum `StatusNotaFiscal`. |
| `origem` | `int?` | Não | Enum `OrigemNotaFiscal`. |
| `origemId` | `guid?` | Não | ID da origem, como pedido de venda. |
| `pessoaId` | `guid?` | Não | Pessoa vinculada. |
| `serie` | `string?` | Não | Máximo 20. |
| `numero` | `string?` | Não | Máximo 40. |
| `chaveAcesso` | `string?` | Não | Máximo 80. |
| `protocoloAutorizacao` | `string?` | Não | Máximo 80. |
| `dataEmissaoInicial` | `datetime?` | Não | Início do período de emissão. |
| `dataEmissaoFinal` | `datetime?` | Não | Fim do período de emissão. |
| `dataAutorizacaoInicial` | `datetime?` | Não | Início do período de autorização. |
| `dataAutorizacaoFinal` | `datetime?` | Não | Fim do período de autorização. |
| `dataCancelamentoInicial` | `datetime?` | Não | Início do período de cancelamento. |
| `dataCancelamentoFinal` | `datetime?` | Não | Fim do período de cancelamento. |
| `valorTotalMinimo` | `decimal?` | Não | Valor mínimo. |
| `valorTotalMaximo` | `decimal?` | Não | Valor máximo. |
| `possuiXmlAutorizado` | `bool?` | Não | Filtra por XML autorizado existente. |
| `possuiDanfe` | `bool?` | Não | Filtra por DANFE/documento auxiliar. |
| `contaReceberGerada` | `bool?` | Não | Filtra por conta a receber gerada. |
| `statusPedidoVenda` | `int?` | Não | Enum de vendas. |
| `somenteComPendenciaXmlAutorizado` | `bool` | Não | Não combinar com `possuiXmlAutorizado=true`. |
| `somenteComPendenciaDanfe` | `bool` | Não | Não combinar com `possuiDanfe=true`. |
| `somenteComPendenciaEstoque` | `bool` | Não | Traz notas autorizadas com estoque pendente. |
| `somenteComPendenciaFinanceira` | `bool` | Não | Não combinar com `contaReceberGerada=true`. |
| `page` | `int` | Não | Padrão 1. Mínimo 1. |
| `pageSize` | `int` | Não | Padrão 20. Entre 1 e 100. |

### 7.3 Exemplo de chamada

```http
GET /api/fiscal/notas-fiscais?empresaId=11111111-1111-1111-1111-111111111111&statusFiscal=5&page=1&pageSize=20
```

### 7.4 Resposta

A resposta é paginada:

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "empresaId": "22222222-2222-2222-2222-222222222222",
      "filialId": "33333333-3333-3333-3333-333333333333",
      "tipoDocumento": 1,
      "tipoOperacao": 1,
      "statusFiscal": 5,
      "origem": 2,
      "origemId": "44444444-4444-4444-4444-444444444444",
      "pessoaId": "55555555-5555-5555-5555-555555555555",
      "serie": "1",
      "numero": "100",
      "chaveAcesso": "35260500000000000100550010000001001000001000",
      "protocoloAutorizacao": "135260000000001",
      "dataEmissao": "2026-05-25T10:00:00+00:00",
      "autorizadaEm": "2026-05-25T10:05:00+00:00",
      "canceladaEm": null,
      "valorTotal": 150.75,
      "possuiXmlEnvio": true,
      "possuiXmlAutorizado": true,
      "possuiDanfe": true,
      "estoqueAplicavel": true,
      "estoqueBaixado": true,
      "estoquePendente": false,
      "financeiroAplicavel": true,
      "contaReceberGerada": true,
      "financeiroPendente": false,
      "acaoPrincipalCodigo": "CONSULTAR",
      "acaoPrincipalNome": "Consultar nota fiscal",
      "acaoPrincipalMetodoHttp": "GET",
      "acaoPrincipalEndpoint": "/api/fiscal/notas-fiscais/11111111-1111-1111-1111-111111111111",
      "acaoPrincipalPermissao": "FISCAL_CONSULTAR",
      "alertas": []
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

### 7.5 Campos que a listagem não retorna

A listagem foi otimizada para ser leve. Ela **não deve** carregar:

- itens completos;
- impostos completos;
- XML completo;
- eventos completos;
- payload enviado;
- payload recebido.

Para esses dados, usar o detalhe ou os endpoints específicos.

### 7.6 Ação principal na listagem

O backend retorna uma sugestão de ação principal por nota.

Códigos possíveis observados no service:

| Código | Uso |
|---|---|
| `VALIDAR` | Nota em rascunho com itens. |
| `GERAR_XML_ENVIO` | Nota em rascunho/validada sem XML de envio. |
| `ASSINAR_XML_ENVIO` | Nota validada com XML de envio. |
| `TRANSMITIR_SEFAZ` | Nota assinada ou em contingência. |
| `CONSULTAR_PROTOCOLO` | Nota transmitida ou rejeitada. |
| `GERAR_DANFE` | Nota autorizada com XML autorizado e sem DANFE. |
| `BAIXAR_ESTOQUE` | Nota autorizada com estoque pendente. |
| `GERAR_CONTA_RECEBER` | Nota autorizada com financeiro pendente. |
| `POS_AUTORIZACAO` | Nota autorizada sem ação operacional principal obrigatória. |
| `CONSULTAR_CANCELAMENTO` | Nota cancelada. |
| `CONSULTAR` | Ação padrão de consulta. |

---

## 8. Detalhe da nota fiscal

### 8.1 Endpoint

```http
GET /api/fiscal/notas-fiscais/{id}
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 8.2 Resposta

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "empresaId": "66666666-6666-6666-6666-666666666666",
  "filialId": null,
  "tipoDocumento": 1,
  "tipoOperacao": 1,
  "origem": 2,
  "origemId": "77777777-7777-7777-7777-777777777777",
  "serie": "1",
  "numero": "101",
  "chaveAcesso": "35260500000000000100550010000001011000001010",
  "protocoloAutorizacao": "135260000000101",
  "dataEmissao": "2026-05-25T11:00:00+00:00",
  "autorizadaEm": "2026-05-25T11:01:00+00:00",
  "canceladaEm": null,
  "statusFiscal": 5,
  "valorProdutos": 200.00,
  "valorDesconto": 10.00,
  "valorTotal": 190.00,
  "codigoRejeicao": null,
  "mensagemRejeicao": null,
  "motivoCancelamento": null,
  "observacao": "Observação fiscal",
  "itens": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "sequencia": 1,
      "produtoId": "88888888-8888-8888-8888-888888888888",
      "codigoItem": "PROD-001",
      "descricao": "Produto teste",
      "ncm": "01012100",
      "cfop": "5102",
      "unidadeComercial": "UN",
      "quantidade": 2,
      "valorUnitario": 100,
      "valorBruto": 200,
      "valorDesconto": 10,
      "valorTotal": 190,
      "observacao": null
    }
  ],
  "impostos": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "itemNotaFiscalId": "22222222-2222-2222-2222-222222222222",
      "nome": "ICMS",
      "cstCsosn": "102",
      "baseCalculo": 190,
      "aliquota": 0,
      "valor": 0,
      "observacao": "Parametrizado para teste"
    }
  ],
  "xmls": [
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "tipo": 2,
      "hashSha256": "hash-sha256",
      "protocolo": "135260000000101",
      "chaveAcesso": "35260500000000000100550010000001011000001010",
      "armazenadoEm": "2026-05-25T11:02:00+00:00"
    }
  ],
  "eventos": [
    {
      "id": "55555555-5555-5555-5555-555555555555",
      "tipo": 5,
      "codigo": "100",
      "descricao": "Autorizado",
      "protocolo": "135260000000101",
      "dataEvento": "2026-05-25T11:03:00+00:00",
      "usuarioId": "99999999-9999-9999-9999-999999999999"
    }
  ]
}
```

Observação importante: o detalhe retorna metadados de XML, como hash, protocolo e chave de acesso, mas não retorna `conteudoXml` completo.

---

## 9. Resumo operacional

### 9.1 Endpoint

```http
GET /api/fiscal/notas-fiscais/{id}/resumo-operacional
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 9.2 Uso recomendado

Usar esse endpoint para alimentar:

- cabeçalho da tela de detalhe;
- cards de situação fiscal;
- cards de XML/DANFE;
- cards de estoque;
- cards de financeiro;
- botões habilitados/desabilitados.

### 9.3 Resposta resumida

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "empresaId": "22222222-2222-2222-2222-222222222222",
  "filialId": null,
  "tipoDocumento": 1,
  "serie": "1",
  "numero": "102",
  "statusFiscal": 5,
  "origem": 2,
  "origemId": "33333333-3333-3333-3333-333333333333",
  "possuiXmlEnvio": true,
  "possuiXmlAutorizado": true,
  "possuiDanfe": false,
  "pedidoVenda": {
    "id": "33333333-3333-3333-3333-333333333333",
    "numero": "PV-102",
    "status": 4,
    "clienteId": "55555555-5555-5555-5555-555555555555",
    "valorTotal": 300,
    "faturadoEm": "2026-05-25T12:00:00+00:00"
  },
  "estoque": {
    "aplicavel": true,
    "baixado": false,
    "itensPendentes": 1,
    "quantidadePendente": 2,
    "sequenciasPendentes": [1]
  },
  "financeiro": {
    "aplicavel": true,
    "contaReceberGerada": true,
    "contaReceberId": "44444444-4444-4444-4444-444444444444",
    "status": 1,
    "valorOriginal": 300,
    "valorSaldo": 300
  },
  "acoes": {
    "podeValidar": false,
    "podeGerarXmlEnvio": false,
    "podeAssinarXmlEnvio": false,
    "podeTransmitirSefaz": false,
    "podeGerarDanfe": true,
    "podeBaixarEstoque": true,
    "podeGerarContaReceber": false,
    "podeCancelar": true,
    "podeEmitirCartaCorrecao": true
  },
  "alertas": ["DANFE pendente."]
}
```

---

## 10. Workflow operacional

### 10.1 Endpoint

```http
GET /api/fiscal/notas-fiscais/{id}/workflow-operacional
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 10.2 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "empresaId": "22222222-2222-2222-2222-222222222222",
  "filialId": null,
  "tipoDocumento": 1,
  "statusFiscal": 5,
  "etapaAtual": "Autorizada",
  "ordemEtapaAtual": 6,
  "percentualConcluido": 75,
  "resumo": {},
  "etapas": [
    {
      "ordem": 1,
      "codigo": "CRIACAO",
      "nome": "Nota fiscal criada ou gerada",
      "status": "Concluida",
      "obrigatoria": true,
      "metodoHttp": "GET",
      "endpoint": "/api/fiscal/notas-fiscais/11111111-1111-1111-1111-111111111111",
      "permissao": "FISCAL_CONSULTAR",
      "motivoBloqueio": null
    }
  ],
  "proximasAcoes": [
    {
      "codigo": "GERAR_DANFE",
      "nome": "Gerar DANFE",
      "metodoHttp": "POST",
      "endpoint": "/api/fiscal/notas-fiscais/11111111-1111-1111-1111-111111111111/danfe",
      "permissao": "FISCAL_EMITIR",
      "habilitada": true,
      "motivoBloqueio": null,
      "payloadReferencia": "GerarDanfeNotaFiscalRequest"
    }
  ],
  "bloqueios": [],
  "alertas": ["DANFE pendente."]
}
```

### 10.3 Como usar no frontend

- Mostrar linha do tempo com `etapas`.
- Renderizar ações com `proximasAcoes`.
- Desabilitar ação quando `habilitada=false`.
- Mostrar `motivoBloqueio` como tooltip ou alerta.
- Usar `payloadReferencia` para abrir modal correto.

---

## 11. Criação de nota fiscal manual

### 11.1 Endpoint

```http
POST /api/fiscal/notas-fiscais
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 11.2 Payload

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": "22222222-2222-2222-2222-222222222222",
  "tipoDocumento": 1,
  "tipoOperacao": 1,
  "origem": 1,
  "origemId": null,
  "serie": "1",
  "numero": "900001",
  "dataEmissao": "2026-05-25T10:00:00-03:00",
  "naturezaOperacaoId": null,
  "pessoaId": "33333333-3333-3333-3333-333333333333",
  "observacao": "Nota fiscal manual em rascunho."
}
```

### 11.3 Validações principais

- `empresaId` obrigatório;
- `serie` obrigatória, até 20 caracteres;
- `numero` obrigatório, até 40 caracteres;
- `dataEmissao` obrigatória;
- `observacao` até 500 caracteres.

### 11.4 Resposta

Retorna `201 Created` com `NotaFiscalResponse`.

---

## 12. Gerar nota fiscal a partir de pedido de venda

### 12.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/gerar-de-pedido-venda
```

Permissão:

```txt
FISCAL_EMITIR
```

### 12.2 Payload

```json
{
  "pedidoVendaId": "11111111-1111-1111-1111-111111111111",
  "tipoDocumento": 1,
  "serie": "1",
  "numero": "900001",
  "naturezaOperacaoId": null,
  "cfopPadrao": "5102",
  "unidadeComercialPadrao": "UN",
  "validarDadosFiscaisProduto": true,
  "observacao": "Nota fiscal gerada a partir do pedido de venda."
}
```

### 12.3 Validações principais

- `pedidoVendaId` obrigatório;
- `tipoDocumento` deve ser `NFe` ou `NFCe` nesta etapa;
- `serie` obrigatória;
- `numero` obrigatório;
- `cfopPadrao` obrigatório quando `validarDadosFiscaisProduto=true`;
- `unidadeComercialPadrao` obrigatória.

### 12.4 Resposta

```json
{
  "notaFiscal": {},
  "pedidoVendaId": "11111111-1111-1111-1111-111111111111",
  "numeroPedidoVenda": "PV-001",
  "alertas": []
}
```

`notaFiscal` segue o formato `NotaFiscalResponse`.

---

## 13. Adicionar item à nota fiscal

### 13.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/itens
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 13.2 Payload

```json
{
  "produtoId": "88888888-8888-8888-8888-888888888888",
  "codigoItem": "PROD-001",
  "descricao": "Produto teste",
  "ncm": "01012100",
  "cfop": "5102",
  "unidadeComercial": "UN",
  "quantidade": 2,
  "valorUnitario": 100,
  "valorDesconto": 0,
  "observacao": null
}
```

### 13.3 Validações principais

- `codigoItem` obrigatório, até 80;
- `descricao` obrigatória, até 300;
- `ncm` até 20;
- `cfop` até 20;
- `unidadeComercial` obrigatória, até 20;
- `quantidade > 0`;
- `valorUnitario >= 0`;
- `valorDesconto >= 0`;
- `observacao` até 500.

### 13.4 Observação de regra

Itens só podem ser adicionados quando a nota ainda permite alteração. Nota autorizada, cancelada, inutilizada, denegada ou transmitida não pode ser alterada diretamente.

---

## 14. Adicionar imposto parametrizado

### 14.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/impostos
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 14.2 Payload

```json
{
  "itemNotaFiscalId": "22222222-2222-2222-2222-222222222222",
  "nome": "ICMS",
  "cstCsosn": "102",
  "baseCalculo": 190,
  "aliquota": 0,
  "valor": 0,
  "observacao": "Imposto parametrizado para operação."
}
```

### 14.3 Validações principais

- `nome` obrigatório, até 40;
- `cstCsosn` até 20;
- `baseCalculo >= 0`;
- `aliquota >= 0`;
- `valor >= 0`;
- `observacao` até 500.

### 14.4 Observação fiscal

O backend não inventa alíquota, CST, CSOSN, CFOP ou regra fiscal legal. Esses valores devem vir de parametrização/configuração validada pela operação fiscal/contador.

---

## 15. Armazenar XML fiscal manualmente

### 15.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/xmls
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 15.2 Payload

```json
{
  "tipo": 2,
  "conteudoXml": "<NFe>...</NFe>",
  "protocolo": "135260000000101",
  "chaveAcesso": "35260500000000000100550010000001011000001010"
}
```

### 15.3 Validações principais

- `conteudoXml` obrigatório, máximo 2.000.000 caracteres;
- `protocolo` até 80;
- `chaveAcesso` até 80.

---

## 16. Validar nota fiscal

### 16.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/validar
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 16.2 Payload

Não possui body.

### 16.3 Regra atual

- Apenas nota em `Rascunho` pode ser validada.
- Nota precisa possuir ao menos um item ativo.

### 16.4 Resposta

Retorna `NotaFiscalResponse` com `statusFiscal=2`.

---

## 17. Gerar XML de envio

### 17.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 17.2 Payload

```json
{
  "armazenarXml": true,
  "validarSchema": false,
  "schemaSetName": null
}
```

### 17.3 Validações principais

- `schemaSetName` até 120 caracteres.

### 17.4 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "tipoDocumento": 1,
  "statusFiscal": 1,
  "tipoXml": 1,
  "conteudoXml": "<NFe>...</NFe>",
  "schemaSetName": null,
  "schemaValidado": false,
  "armazenado": true,
  "alertas": []
}
```

Observação: este endpoint retorna `conteudoXml`, diferente do detalhe/listagem.

---

## 18. Assinar XML de envio

### 18.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio
```

Permissão:

```txt
FISCAL_EMITIR
```

### 18.2 Payload

```json
{
  "certificateThumbprint": null,
  "xmlEnvio": "<NFe>...</NFe>",
  "armazenarXmlAssinado": true,
  "validarSchemaAntesAssinatura": false,
  "schemaSetName": null
}
```

### 18.3 Validações principais

- `certificateThumbprint` até 120;
- `xmlEnvio` até 2.000.000;
- `schemaSetName` até 120.

### 18.4 Regra atual

- A nota precisa estar validada e possuir XML de envio conforme o fluxo do domínio.

---

## 19. Transmitir SEFAZ/mock

### 19.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz
```

Permissão:

```txt
FISCAL_EMITIR
```

### 19.2 Payload

```json
{
  "ufAutorizadora": "SP",
  "servico": 1,
  "xmlEnvioAssinado": "<NFe />",
  "validarSchemaAntesTransmissao": true,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-corr-001"
}
```

### 19.3 Validações principais

- `ufAutorizadora` obrigatória com exatamente 2 letras;
- `servico` enum válido;
- `xmlEnvioAssinado` até 2.000.000;
- `schemaSetName` até 120;
- `correlationId` até 120.

### 19.4 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "statusFiscal": 5,
  "comunicacaoOk": true,
  "autorizada": true,
  "codigoStatus": "100",
  "motivo": "Autorizado",
  "protocolo": "135260000000102",
  "chaveAcesso": "35260500000000000100550010000001021000001020",
  "deveReprocessar": false
}
```

### 19.5 Idempotência

Enviar `correlationId` em operações críticas. Ele é usado para proteger contra duplicidade de chamada/transmissão/reprocessamento.

Para o frontend, recomenda-se gerar um `correlationId` por tentativa de ação crítica, por exemplo:

```txt
fiscal-transmitir-{notaId}-{timestampOuUuid}
```

---

## 20. Reprocessar transmissão SEFAZ

### 20.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/reprocessar-sefaz
```

Permissão:

```txt
FISCAL_EMITIR
```

### 20.2 Payload

```json
{
  "ufAutorizadora": "SP",
  "servico": 1,
  "xmlEnvioAssinado": "<NFe />",
  "validarSchemaAntesTransmissao": false,
  "schemaSetName": null,
  "logIntegracaoFiscalId": "11111111-1111-1111-1111-111111111111",
  "correlationIdOriginal": "front-corr-original",
  "correlationId": "front-corr-reprocessamento-001",
  "motivo": "Reprocessamento operacional após falha técnica."
}
```

### 20.3 Validações principais

- `ufAutorizadora` obrigatória com 2 letras;
- `correlationId` obrigatório;
- `motivo` obrigatório, até 500;
- deve informar `logIntegracaoFiscalId` ou `correlationIdOriginal`;
- `correlationId` do reprocessamento deve ser diferente do original.

---

## 21. Consultar integrações da nota

### 21.1 Endpoint

```http
GET /api/fiscal/notas-fiscais/{id}/integracoes
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 21.2 Resposta

Array de `LogIntegracaoFiscalResponse`:

```json
[
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "empresaId": "11111111-1111-1111-1111-111111111111",
    "filialId": null,
    "notaFiscalId": "33333333-3333-3333-3333-333333333333",
    "operacao": "NFeAutorizacao",
    "statusIntegracao": 3,
    "correlationId": "corr-frontend-contract",
    "payloadResumo": "token=[MASKED]; senha=[MASKED]",
    "mensagem": "Falha técnica simulada",
    "registradoEm": "2026-05-25T14:00:00+00:00",
    "podeReprocessar": true,
    "contemDadoSensivelOcultado": true
  }
]
```

---

## 22. Consultar protocolo/status da nota

### 22.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/consultar-protocolo-sefaz
```

Permissão:

```txt
FISCAL_EMITIR
```

### 22.2 Payload

```json
{
  "ufAutorizadora": "SP",
  "servico": 3,
  "xmlConsultaAssinado": "<consSitNFe />",
  "validarSchemaAntesConsulta": true,
  "schemaSetName": "nfe-vigente",
  "aplicarReconciliacaoLocal": true,
  "correlationId": "front-consulta-protocolo-001"
}
```

### 22.3 Validações principais

- `ufAutorizadora` obrigatória com 2 letras;
- `servico` deve ser `ConsultaProtocolo` ou `ConsultaRetornoAutorizacao`;
- `xmlConsultaAssinado` obrigatório, até 2.000.000;
- `schemaSetName` até 120;
- `correlationId` até 120.

### 22.4 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "statusFiscalAntes": 4,
  "statusFiscalDepois": 5,
  "servico": 3,
  "comunicacaoOk": true,
  "autorizadaNoAmbiente": true,
  "reconciliacaoAplicada": true,
  "codigoStatus": "100",
  "motivo": "Autorizado",
  "protocolo": "135260000000105",
  "chaveAcesso": "35260500000000000100550010000001031000001030",
  "deveReprocessar": false,
  "alertas": []
}
```

---

## 23. Status de serviço SEFAZ

### 23.1 Consultar status

```http
POST /api/fiscal/sefaz/status-servico
```

Permissão:

```txt
FISCAL_CONSULTAR
```

Payload:

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "ufAutorizadora": "SP",
  "xmlStatusServico": "<consStatServ />",
  "validarSchemaAntesConsulta": true,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-status-servico-001"
}
```

Resposta:

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "ambiente": 1,
  "ufAutorizadora": "SP",
  "comunicacaoOk": true,
  "disponivel": true,
  "codigoStatus": "107",
  "motivo": "Serviço em operação",
  "deveReprocessar": false,
  "consultadoEm": "2026-05-25T14:00:00+00:00",
  "alertas": []
}
```

### 23.2 Histórico de status

```http
GET /api/fiscal/sefaz/status-servico/historico?empresaId={empresaId}&filialId={filialId}&take=20
```

Permissão:

```txt
FISCAL_CONSULTAR
```

Retorna lista de `LogIntegracaoFiscalResponse`.

---

## 24. Contingência fiscal operacional

### 24.1 Avaliar contingência geral

```http
POST /api/fiscal/sefaz/contingencia/avaliar
```

Permissão:

```txt
FISCAL_EMITIR
```

Payload:

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "ufAutorizadora": "SP",
  "tipoContingencia": 99,
  "motivo": "Indisponibilidade operacional detectada.",
  "exigirStatusServicoIndisponivelRecente": true,
  "janelaStatusServicoMinutos": 30,
  "correlationId": "front-contingencia-avaliar-001"
}
```

### 24.2 Habilitar contingência em nota

```http
POST /api/fiscal/notas-fiscais/{id}/habilitar-contingencia
```

Permissão:

```txt
FISCAL_EMITIR
```

Payload:

```json
{
  "ufAutorizadora": "SP",
  "tipoContingencia": 99,
  "motivo": "Contingência operacional interna.",
  "exigirStatusServicoIndisponivelRecente": true,
  "janelaStatusServicoMinutos": 30,
  "correlationId": "front-contingencia-nota-001"
}
```

### 24.3 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "empresaId": "22222222-2222-2222-2222-222222222222",
  "filialId": null,
  "tipoDocumento": 1,
  "ambiente": 1,
  "ufAutorizadora": "SP",
  "tipoContingencia": 99,
  "permitida": true,
  "statusServicoIndisponivelDetectado": true,
  "codigoStatusServico": "108",
  "motivoStatusServico": "Serviço paralisado momentaneamente",
  "motivoOperacional": "Contingência operacional interna.",
  "avaliadaEm": "2026-05-25T14:00:00+00:00",
  "alertas": []
}
```

### 24.4 Histórico de contingência

```http
GET /api/fiscal/sefaz/contingencia/historico?empresaId={empresaId}&filialId={filialId}&take=20
```

Retorna lista de logs.

---

## 25. Cancelamento

### 25.1 Cancelamento local/técnico

```http
POST /api/fiscal/notas-fiscais/{id}/cancelar
```

Permissão:

```txt
FISCAL_CANCELAR
```

Payload:

```json
{
  "motivo": "Cancelamento solicitado pelo operador.",
  "protocoloCancelamento": "135260000000103",
  "xmlCancelamento": "<eventoCancelamento />"
}
```

Validações:

- `motivo` obrigatório, até 500;
- `protocoloCancelamento` até 80;
- `xmlCancelamento` até 2.000.000.

### 25.2 Cancelamento SEFAZ/mock

```http
POST /api/fiscal/notas-fiscais/{id}/cancelar-sefaz
```

Permissão:

```txt
FISCAL_CANCELAR
```

Payload:

```json
{
  "ufAutorizadora": "SP",
  "motivo": "Cancelamento solicitado pelo cliente.",
  "xmlEventoAssinado": "<eventoCancelamentoAssinado />",
  "validarSchemaAntesTransmissao": true,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-cancelamento-001"
}
```

Resposta:

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "statusFiscal": 7,
  "tipoEvento": 7,
  "comunicacaoOk": true,
  "autorizadoPeloAmbiente": true,
  "codigoStatus": "135",
  "motivo": "Cancelamento homologado",
  "protocolo": "135260000000103",
  "deveReprocessar": false
}
```

Observação: cancelamento só deve ser disponibilizado para nota autorizada e conforme flags do workflow.

---

## 26. Carta de correção

### 26.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/cartas-correcao
```

Permissão:

```txt
FISCAL_CARTA_CORRECAO
```

### 26.2 Payload

```json
{
  "ufAutorizadora": "SP",
  "textoCorrecao": "Correção operacional permitida conforme validação fiscal.",
  "xmlEventoAssinado": "<eventoCartaCorrecaoAssinado />",
  "validarSchemaAntesTransmissao": true,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-cce-001"
}
```

### 26.3 Validações principais

- `ufAutorizadora` obrigatória com 2 letras;
- `textoCorrecao` obrigatório, até 1000;
- `xmlEventoAssinado` obrigatório, até 2.000.000;
- `schemaSetName` até 120;
- `correlationId` até 120.

### 26.4 Resposta

```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "sequencia": 1,
  "textoCorrecao": "Correção operacional permitida conforme validação fiscal.",
  "protocolo": "135260000000200",
  "criadaEm": "2026-05-25T14:00:00+00:00",
  "criadaPor": "44444444-4444-4444-4444-444444444444"
}
```

Observação: o frontend não deve orientar carta de correção para alterar valores, impostos, destinatário ou outros dados sensíveis sem validação fiscal humana/documental.

---

## 27. Inutilização de numeração

### 27.1 Endpoint

```http
POST /api/fiscal/inutilizacoes
```

Permissão:

```txt
FISCAL_INUTILIZAR
```

### 27.2 Payload

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "serie": "1",
  "numeroInicial": 300,
  "numeroFinal": 305,
  "motivo": "Quebra de sequência homologação",
  "ufAutorizadora": "SP",
  "xmlInutilizacaoAssinado": "<inutNFe />",
  "validarSchemaAntesTransmissao": true,
  "schemaSetName": "nfe-vigente",
  "correlationId": "front-corr-002"
}
```

### 27.3 Validações principais

- `empresaId` obrigatório;
- `serie` obrigatória, até 20;
- `numeroInicial > 0`;
- `numeroFinal >= numeroInicial`;
- `motivo` obrigatório, até 500;
- `ufAutorizadora` obrigatória com 2 letras;
- `xmlInutilizacaoAssinado` obrigatório, até 2.000.000;
- `schemaSetName` até 120;
- `correlationId` até 120.

### 27.4 Resposta

```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "tipoDocumento": 1,
  "serie": "1",
  "numeroInicial": 300,
  "numeroFinal": 305,
  "motivo": "Quebra de sequência homologação",
  "protocolo": "135260000000104",
  "inutilizadaEm": "2026-05-25T13:00:00+00:00",
  "inutilizadaPor": "44444444-4444-4444-4444-444444444444",
  "comunicacaoOk": true,
  "autorizadaPeloAmbiente": true,
  "codigoStatus": "102",
  "retornoMotivo": "Inutilização homologada",
  "deveReprocessar": false
}
```

---

## 28. DANFE / Documento auxiliar

### 28.1 Gerar DANFE

```http
POST /api/fiscal/notas-fiscais/{id}/danfe
```

Permissão:

```txt
FISCAL_EMITIR
```

Payload:

```json
{
  "correlationId": "front-danfe-001"
}
```

Resposta:

```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "tipo": 1,
  "formato": 2,
  "nomeArquivo": "danfe-1-900001.html",
  "contentType": "text/html",
  "hashSha256": "ABCDEF...",
  "tamanhoBytes": 12345,
  "geradoEm": "2026-05-25T14:00:00+00:00",
  "geradoPor": "44444444-4444-4444-4444-444444444444",
  "alertas": []
}
```

Regra atual:

- DANFE/documento auxiliar exige nota autorizada;
- também é esperado XML autorizado armazenado conforme workflow operacional.

### 28.2 Download

```http
GET /api/fiscal/notas-fiscais/documentos-auxiliares/{documentoAuxiliarId}/download
```

Permissão:

```txt
FISCAL_CONSULTAR
```

Resposta:

- arquivo binário;
- `Content-Type` conforme documento;
- nome de arquivo definido pelo backend.

---

## 29. Baixa de estoque pela nota fiscal autorizada

### 29.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/baixar-estoque
```

Permissão:

```txt
ESTOQUE_MOVIMENTAR
```

### 29.2 Payload

```json
{
  "motivo": "Baixa de estoque da nota fiscal autorizada.",
  "documento": "NF-900001",
  "correlationId": "front-baixa-estoque-001"
}
```

### 29.3 Validações principais

- `motivo` obrigatório, até 500;
- `documento` até 80;
- `correlationId` até 120.

### 29.4 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "pedidoVendaId": "22222222-2222-2222-2222-222222222222",
  "statusFiscal": 5,
  "quantidadeTotalBaixada": 2,
  "itens": [
    {
      "pedidoVendaItemId": "33333333-3333-3333-3333-333333333333",
      "produtoId": "44444444-4444-4444-4444-444444444444",
      "reservaEstoqueId": "55555555-5555-5555-5555-555555555555",
      "movimentoEstoqueId": "66666666-6666-6666-6666-666666666666",
      "quantidadeBaixada": 2
    }
  ],
  "alertas": []
}
```

Regra atual:

- nota precisa estar autorizada;
- fluxo é aplicável principalmente à nota gerada de pedido de venda;
- pedido precisa estar faturado/compatível;
- não deve baixar estoque duas vezes.

---

## 30. Geração de conta a receber

### 30.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/gerar-conta-receber
```

Permissão:

```txt
FINANCEIRO_GERENCIAR
```

### 30.2 Payload

```json
{
  "condicaoPagamentoId": null,
  "primeiraDataVencimento": "2026-06-24T00:00:00-03:00",
  "documento": "NF-900001",
  "observacao": "Conta a receber gerada a partir da nota fiscal.",
  "correlationId": "front-financeiro-001"
}
```

### 30.3 Validações principais

- `primeiraDataVencimento` obrigatório;
- `documento` até 60;
- `observacao` até 500;
- `correlationId` até 120.

### 30.4 Resposta

```json
{
  "notaFiscalId": "11111111-1111-1111-1111-111111111111",
  "pedidoVendaId": "22222222-2222-2222-2222-222222222222",
  "contaReceberId": "33333333-3333-3333-3333-333333333333",
  "documento": "NF-900001",
  "origem": 2,
  "origemId": "11111111-1111-1111-1111-111111111111",
  "valorOriginal": 200,
  "valorSaldo": 200,
  "status": 1,
  "jaExistia": false,
  "parcelas": [
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "numero": 1,
      "vencimento": "2026-06-24T00:00:00-03:00",
      "valorOriginal": 200,
      "valorSaldo": 200,
      "status": 1
    }
  ],
  "alertas": []
}
```

Regra atual:

- nota precisa estar autorizada;
- para pedido de venda, estoque precisa estar baixado antes de gerar financeiro;
- backend evita duplicidade e pode retornar `jaExistia=true` quando a conta já existir.

---

## 31. Registrar rejeição técnica

### 31.1 Endpoint

```http
POST /api/fiscal/notas-fiscais/{id}/rejeicao
```

Permissão:

```txt
FISCAL_GERENCIAR
```

### 31.2 Payload

```json
{
  "codigoRejeicao": "999",
  "mensagemRejeicao": "Rejeição técnica simulada."
}
```

### 31.3 Validações principais

- `codigoRejeicao` obrigatório, até 40;
- `mensagemRejeicao` obrigatória, até 500.

Regra atual:

- apenas nota transmitida pode receber rejeição.

---

## 32. Observabilidade fiscal

### 32.1 Endpoint

```http
GET /api/fiscal/observabilidade/integracoes
```

Permissão:

```txt
FISCAL_CONSULTAR
```

### 32.2 Query string

| Parâmetro | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `empresaId` | `guid` | Sim | Empresa. |
| `filialId` | `guid?` | Não | Filial. |
| `registradoApos` | `datetime?` | Não | Filtra logs a partir de uma data. |
| `take` | `int` | Não | Se menor ou igual a zero, backend usa 50. |

### 32.3 Exemplo

```http
GET /api/fiscal/observabilidade/integracoes?empresaId=11111111-1111-1111-1111-111111111111&take=25
```

### 32.4 Resposta

```json
{
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "geradoEm": "2026-05-25T14:05:00+00:00",
  "registradoApos": "2026-05-25T13:00:00+00:00",
  "totalLogsAnalisados": 1,
  "totalSucesso": 0,
  "totalFalha": 1,
  "totalReprocessamento": 0,
  "totalPendente": 0,
  "ultimoRegistroEm": "2026-05-25T14:00:00+00:00",
  "possuiFalhaRecente": true,
  "possuiPendenciaRecente": false,
  "operacoesComFalha": ["NFeAutorizacao"],
  "alertas": ["Foram encontrados logs fiscais com conteúdo sensível mascarado."],
  "logsRecentes": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "empresaId": "11111111-1111-1111-1111-111111111111",
      "filialId": null,
      "notaFiscalId": "33333333-3333-3333-3333-333333333333",
      "operacao": "NFeAutorizacao",
      "statusIntegracao": 3,
      "correlationId": "corr-frontend-contract",
      "payloadResumo": "token=[MASKED]; senha=[MASKED]",
      "mensagem": "Falha técnica simulada",
      "registradoEm": "2026-05-25T14:00:00+00:00",
      "podeReprocessar": true,
      "contemDadoSensivelOcultado": true
    }
  ]
}
```

### 32.5 Regra de segurança

O endpoint deve retornar payload sanitizado. O frontend não deve esperar senha, token, segredo, XML completo, certificado ou payload sensível.

---

## 33. Exportação CSV auditada

### 33.1 Endpoint

```http
GET /api/fiscal/notas-fiscais/exportacoes/csv
```

Permissão:

```txt
FISCAL_EXPORTAR
```

### 33.2 Query string

A exportação usa praticamente os mesmos filtros da listagem, com diferenças:

| Parâmetro | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `empresaId` | `guid` | Sim | Obrigatório. |
| `filialId` | `guid?` | Não | Opcional. |
| `tipoDocumento` | `int?` | Não | Enum. |
| `tipoOperacao` | `int?` | Não | Enum. |
| `statusFiscal` | `int?` | Não | Enum. |
| `origem` | `int?` | Não | Enum. |
| `origemId` | `guid?` | Não | Opcional. |
| `pessoaId` | `guid?` | Não | Opcional. |
| `serie` | `string?` | Não | Máximo 20. |
| `numero` | `string?` | Não | Máximo 40. |
| `chaveAcesso` | `string?` | Não | Máximo 80. |
| `protocoloAutorizacao` | `string?` | Não | Máximo 80. |
| `dataEmissaoInicial` / `dataEmissaoFinal` | `datetime?` | Não | Range coerente. |
| `dataAutorizacaoInicial` / `dataAutorizacaoFinal` | `datetime?` | Não | Range coerente. |
| `dataCancelamentoInicial` / `dataCancelamentoFinal` | `datetime?` | Não | Range coerente. |
| `valorTotalMinimo` / `valorTotalMaximo` | `decimal?` | Não | Range coerente. |
| `possuiXmlAutorizado` | `bool?` | Não | Opcional. |
| `possuiDanfe` | `bool?` | Não | Opcional. |
| `contaReceberGerada` | `bool?` | Não | Opcional. |
| `statusPedidoVenda` | `int?` | Não | Opcional. |
| `somenteComPendenciaXmlAutorizado` | `bool` | Não | Não combinar com `possuiXmlAutorizado=true`. |
| `somenteComPendenciaDanfe` | `bool` | Não | Não combinar com `possuiDanfe=true`. |
| `somenteComPendenciaEstoque` | `bool` | Não | Opcional. |
| `somenteComPendenciaFinanceira` | `bool` | Não | Não combinar com `contaReceberGerada=true`. |
| `formato` | `int` | Não | Atualmente `1 = Csv`. |
| `limite` | `int` | Não | Padrão 1000. Entre 1 e 5000. |
| `motivo` | `string` | Sim | Obrigatório, até 500. |

### 33.3 Exemplo

```http
GET /api/fiscal/notas-fiscais/exportacoes/csv?empresaId=11111111-1111-1111-1111-111111111111&statusFiscal=5&limite=1000&motivo=Conferencia%20operacional
```

### 33.4 Resposta

Retorna arquivo CSV com:

```http
Content-Type: text/csv
Content-Disposition: attachment; filename="notas-fiscais-....csv"
```

### 33.5 Conteúdo exportado

O CSV exporta metadados operacionais:

- identificação da nota;
- empresa/filial;
- tipo de documento;
- operação;
- status fiscal;
- origem;
- série/número;
- chave de acesso;
- protocolo;
- datas operacionais;
- valor total;
- flags de XML, DANFE, pedido e financeiro;
- rejeição resumida, quando houver.

### 33.6 Conteúdo não exportado

A exportação não inclui:

- XML completo;
- payload técnico enviado/recebido;
- certificado digital;
- senha;
- token;
- segredo;
- dados técnicos sensíveis de integração.

### 33.7 Auditoria

Toda exportação registra auditoria com:

- entidade `ExportacaoFiscalNotasFiscais`;
- ação `Consulta`;
- motivo informado;
- filtros aplicados;
- limite solicitado;
- limite efetivo;
- total exportado;
- hash SHA-256 do arquivo.

---

## 34. Payloads mínimos por modal de ação fiscal

Esta seção resume quais campos cada modal do frontend precisa solicitar.

### 34.1 Modal: gerar XML de envio

Campos:

- `armazenarXml`: boolean;
- `validarSchema`: boolean;
- `schemaSetName`: texto opcional.

Payload:

```json
{
  "armazenarXml": true,
  "validarSchema": false,
  "schemaSetName": null
}
```

### 34.2 Modal: assinar XML

Campos:

- `certificateThumbprint`: texto opcional;
- `xmlEnvio`: texto opcional/grande;
- `armazenarXmlAssinado`: boolean;
- `validarSchemaAntesAssinatura`: boolean;
- `schemaSetName`: texto opcional.

Payload:

```json
{
  "certificateThumbprint": null,
  "xmlEnvio": "<NFe />",
  "armazenarXmlAssinado": true,
  "validarSchemaAntesAssinatura": false,
  "schemaSetName": null
}
```

### 34.3 Modal: transmitir

Campos:

- `ufAutorizadora`: UF;
- `servico`: enum;
- `xmlEnvioAssinado`: texto opcional/grande;
- `validarSchemaAntesTransmissao`: boolean;
- `schemaSetName`: texto opcional;
- `correlationId`: gerado pelo frontend.

Payload:

```json
{
  "ufAutorizadora": "SP",
  "servico": 1,
  "xmlEnvioAssinado": "<NFe />",
  "validarSchemaAntesTransmissao": false,
  "schemaSetName": null,
  "correlationId": "front-transmitir-001"
}
```

### 34.4 Modal: reprocessar

Campos:

- `ufAutorizadora`;
- `servico`;
- `xmlEnvioAssinado`;
- `validarSchemaAntesTransmissao`;
- `schemaSetName`;
- `logIntegracaoFiscalId` ou `correlationIdOriginal`;
- `correlationId` novo;
- `motivo`.

### 34.5 Modal: cancelar

Campos:

- `ufAutorizadora`;
- `motivo`;
- `xmlEventoAssinado`;
- `validarSchemaAntesTransmissao`;
- `schemaSetName`;
- `correlationId`.

### 34.6 Modal: carta de correção

Campos:

- `ufAutorizadora`;
- `textoCorrecao`;
- `xmlEventoAssinado`;
- `validarSchemaAntesTransmissao`;
- `schemaSetName`;
- `correlationId`.

### 34.7 Modal: inutilização

Campos:

- `empresaId`;
- `filialId`;
- `tipoDocumento`;
- `serie`;
- `numeroInicial`;
- `numeroFinal`;
- `motivo`;
- `ufAutorizadora`;
- `xmlInutilizacaoAssinado`;
- `validarSchemaAntesTransmissao`;
- `schemaSetName`;
- `correlationId`.

### 34.8 Modal: baixar estoque

Campos:

- `motivo`;
- `documento`;
- `correlationId`.

### 34.9 Modal: gerar conta a receber

Campos:

- `condicaoPagamentoId`;
- `primeiraDataVencimento`;
- `documento`;
- `observacao`;
- `correlationId`.

### 34.10 Modal: exportar CSV

Campos:

- filtros aplicados;
- `limite`;
- `motivo` obrigatório.

---

## 35. Sugestão de estrutura de tela fiscal baseada no contrato atual

Esta sugestão não cria serviço novo. Ela apenas organiza os endpoints existentes.

### 35.1 Tela: Listagem fiscal

Componentes sugeridos:

- filtros por empresa, filial, status, tipo, operação, período, série, número, chave, protocolo;
- filtros de pendência: XML autorizado, DANFE, estoque, financeiro;
- tabela paginada com `NotaFiscalListagemItemResponse`;
- coluna de status fiscal;
- coluna de alertas;
- botão de ação principal usando `acaoPrincipal*`;
- botão de detalhe;
- botão de exportação CSV quando usuário tiver `FISCAL_EXPORTAR`.

### 35.2 Tela: Detalhe da nota

Abas sugeridas:

1. **Resumo**: usar `resumo-operacional`.
2. **Workflow**: usar `workflow-operacional`.
3. **Itens**: usar `GET /api/fiscal/notas-fiscais/{id}`.
4. **Impostos**: usar detalhe.
5. **XMLs**: usar metadados do detalhe.
6. **Eventos**: usar eventos do detalhe.
7. **Integrações**: usar `/integracoes`.
8. **Documentos auxiliares**: usar DANFE/download.

### 35.3 Tela: Observabilidade fiscal

Componentes sugeridos:

- filtros por empresa, filial, data e quantidade;
- cards de total de sucesso/falha/reprocessamento/pendente;
- lista de logs recentes;
- destaque para `podeReprocessar`;
- alerta quando `contemDadoSensivelOcultado=true`.

### 35.4 Tela: Inutilização

Componentes sugeridos:

- formulário de faixa numérica;
- motivo obrigatório;
- UF autorizadora;
- XML assinado;
- histórico consultado por observabilidade/logs.

---

## 36. Regras importantes para o frontend não duplicar

O frontend não deve tentar decidir sozinho regras críticas. Usar retornos do backend.

### 36.1 Não decidir no frontend

Não calcular por conta própria:

- se a nota pode ser validada;
- se a nota pode transmitir;
- se a nota pode cancelar;
- se a nota pode emitir carta de correção;
- se pode gerar DANFE;
- se pode baixar estoque;
- se pode gerar conta a receber;
- se deve reprocessar;
- se pode inutilizar oficialmente;
- se uma regra fiscal legal permite determinado evento.

### 36.2 Usar flags do backend

Usar:

- `resumo.acoes.*`;
- `workflow.proximasAcoes`;
- `workflow.etapas`;
- `workflow.bloqueios`;
- `alertas`;
- `deveReprocessar`;
- `podeReprocessar` nos logs.

---

## 37. Regras fiscais que não devem ser inventadas no frontend

Não hardcodar:

- CFOP;
- CST;
- CSOSN;
- NCM;
- CEST;
- alíquota;
- prazo de cancelamento;
- regra de carta de correção;
- regra de inutilização;
- comportamento de prefeitura;
- layout XML oficial;
- regra de ISS/NFS-e;
- regra específica de UF.

Quando o frontend precisar desses dados, deve receber de backend/configuração/parametrização futura ou do cadastro já existente. Não criar regra visual que pareça validação fiscal oficial.

---

## 38. O que está pronto para frontend operacional

Com base na versão `v1.10.0a18`, o frontend pode desenvolver:

- listagem fiscal operacional;
- filtros avançados da listagem;
- detalhe de nota fiscal;
- visualização de itens/impostos/XMLs/eventos;
- resumo operacional;
- workflow visual;
- ações fiscais conforme permissões;
- transmissão SEFAZ/mock;
- reprocessamento;
- consulta de protocolo;
- status de serviço;
- contingência operacional;
- cancelamento;
- carta de correção;
- inutilização;
- geração/download de DANFE/documento auxiliar;
- baixa de estoque;
- geração de conta a receber;
- observabilidade fiscal;
- exportação CSV auditada.

---

## 39. O que não está documentado como pronto para tela oficial

Não tratar como pronto sem nova validação/implementação:

- emissão oficial completa em produção SEFAZ;
- NFS-e real por prefeitura;
- CT-e/MDF-e real;
- apuração fiscal;
- SPED;
- escrituração fiscal;
- cálculo tributário oficial;
- regras legais de cancelamento por UF/modelo;
- regras legais de carta de correção;
- armazenamento/uso produtivo definitivo de certificado sem validação operacional;
- frontend de parametrização tributária avançada, caso ainda não haja endpoint específico exposto.

---

## 40. Checklist para o frontend antes de integrar

Antes de implementar a tela:

- confirmar URL base da API;
- confirmar fluxo de login/JWT;
- confirmar permissões do usuário logado;
- validar se enums serão mapeados no frontend por número;
- criar mapa visual de status fiscal;
- criar mapa visual de tipo de documento;
- criar mapa visual de operação fiscal;
- tratar erro padrão `code/message`;
- implementar `correlationId` nas ações críticas;
- não exibir XML completo na listagem;
- não logar payloads fiscais sensíveis no browser;
- usar paginação e filtros;
- exibir `alertas`, `bloqueios` e `motivoBloqueio`;
- rodar testes de contrato backend quando houver alteração de DTO/endpoint.

---

## 41. Scripts backend relacionados que protegem o contrato

Scripts existentes no backend para validar o fiscal:

```powershell
.\scripts\test-fiscal-frontend-contracts.ps1
.\scripts\test-fiscal-exportacao-relatorios.ps1
.\scripts\test-fiscal-regression.ps1
```

Equivalentes shell:

```bash
./scripts/test-fiscal-frontend-contracts.sh
./scripts/test-fiscal-exportacao-relatorios.sh
./scripts/test-fiscal-regression.sh
```

---

## 42. Conclusão

A documentação acima descreve o módulo fiscal atual como contrato de integração para frontend.

O ponto mais importante para a tela fiscal é que o backend já fornece:

- listagem leve com ação principal;
- detalhe completo sem expor XML completo;
- resumo operacional;
- workflow com etapas, ações, bloqueios e payload de referência;
- endpoints protegidos por permissão;
- operações críticas com `correlationId`;
- observabilidade sanitizada;
- exportação auditada.

O frontend deve ser construído como uma interface operacional guiada pelo backend, evitando duplicar regra fiscal ou criar validações legais próprias.
