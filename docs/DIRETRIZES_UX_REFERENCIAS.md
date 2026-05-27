# Diretriz UX — seleção de referências por API

## Regra global

Sempre que um campo representar vínculo com outra entidade do ERP, o frontend não deve permitir digitação manual de identificadores técnicos.

Exemplos de vínculos:

- empresa;
- filial;
- setor;
- cliente;
- fornecedor;
- pessoa;
- produto;
- local de estoque;
- pedido de venda;
- pedido de compra;
- condição de pagamento;
- forma de pagamento;
- conta bancária;
- centro de custo;
- natureza de operação, quando existir endpoint oficial.

## Padrão obrigatório

1. Buscar opções por endpoint real da API.
2. Exibir em select/dropdown pesquisável.
3. Mostrar rótulo operacional compreensível, não apenas GUID.
4. Enviar ao backend somente o ID selecionado.
5. Resetar dependentes quando o pai mudar. Exemplo: ao trocar empresa, limpar filial, cliente, produto e documentos vinculados.
6. Filtrar por empresa/filial quando o endpoint suportar.
7. Não criar mocks operacionais fora de testes.
8. Não criar lista fixa para dados mestres que vêm do backend.

## Exceções permitidas

- Campos fiscais ainda sem endpoint oficial podem ficar desabilitados com texto de parametrização futura.
- Campos técnicos livres que não representam entidade do ERP, como `correlationId`, `schemaSetName`, UF, XML assinado e motivo, podem continuar como input/textarea.
- Enums de domínio podem usar dropdown fixo quando o contrato do backend define valores fechados.

## Aplicação nesta correção

- A geração de conta a receber no detalhe fiscal deixou de aceitar `condicaoPagamentoId` digitado manualmente.
- O campo agora usa select pesquisável carregado por `GET /api/financeiro/condicoes-pagamento` via hook financeiro existente.

## Busca server-side e paginação

Quando o endpoint aceitar filtro textual, como `termo`, o select deve enviar a busca para a API usando debounce. O filtro local do componente pode continuar existindo apenas como apoio visual sobre os itens retornados.

Para listas grandes, a evolução esperada é paginação server-side ou endpoint específico de lookup. Enquanto o backend retornar lista simples, o frontend deve pelo menos:

- limitar a busca ao escopo de empresa/filial selecionado;
- limpar o valor dependente ao trocar a entidade pai;
- mostrar estado de carregamento no dropdown;
- nunca orientar o usuário a copiar ou digitar GUID manualmente.

## Revisão v1.11.0a8b12

A revisão de manutenção reforça que:

- selects de empresa e filial exibem carregamento quando a API está consultando opções;
- selects remotos devem usar mensagem de vazio contextual, evitando orientar digitação de ID;
- fluxos fiscais com referência recebida do contexto devem mostrar mensagem operacional, não campo editável de GUID;
- erros retornados pela API devem preservar `code`, `status` e `traceId` quando disponíveis, especialmente em operações fiscais auditadas;
- novas telas devem continuar passando por `validate:source` e por verificação de trailing whitespace antes de commit.
