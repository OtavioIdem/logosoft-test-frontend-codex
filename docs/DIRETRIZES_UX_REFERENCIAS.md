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

## v1.11.0a8b14 — filtros fiscais por referência

- Listagens fiscais também seguem a regra de referência por API: pessoa/cliente deve usar select com busca server-side, escopado por empresa e filial.
- Origem fiscal deve ser selecionada por enum conhecido do contrato, nunca digitada como número solto.
- Filtros técnicos como série, número, chave de acesso e protocolo continuam como texto porque são identificadores fiscais/documentais, não entidades relacionais do ERP.
- Ao limpar filtros operacionais, manter empresa/filial e paginação base para evitar consulta fiscal sem escopo multiempresa.

## v1.11.0a8b14 — reset de dependências em filtros por referência

Ao alterar a empresa selecionada em filtros fiscais, a tela deve limpar `filialId`, `pessoaId` e termo de busca da pessoa, pois esses valores são dependentes do escopo de empresa. Ao alterar a filial, a tela deve limpar `pessoaId` e o termo de busca da pessoa.

Essa regra evita consultar a listagem fiscal com uma pessoa pertencente a outro escopo organizacional.

## v1.11.0a8b15 — gate obrigatório de whitespace

- Arquivos versionados não devem conter espaços finais, tabs finais ou linha em branco extra no final do arquivo.
- Antes de empacotar ou commitar, executar `npm run validate:source`, `git diff --check` e `git diff --cached --check`.
- Documentações Markdown devem terminar com exatamente uma quebra de linha final, sem linha vazia adicional.

## v1.11.0a8b16 — visualização de vínculos no detalhe fiscal

- Telas de detalhe fiscal não devem exibir identificadores técnicos de empresa, filial ou origem quando não houver nome amigável disponível no contrato.
- Quando o backend retornar apenas o vínculo técnico, a UI deve mostrar uma mensagem operacional, como `Empresa vinculada` ou `Pedido de venda com vínculo operacional`.
- O ID continua sendo usado internamente para payloads, rotas e chamadas de API, mas não deve ser apresentado como informação principal para o operador.
- Tabelas fiscais devem evitar colunas duplicadas e priorizar campos operacionais úteis para conferência.

## v1.11.0a8b17 — ações fiscais por workflow e permissões

- Botões fiscais críticos devem combinar permissão visual, flags do resumo operacional e próxima ação do workflow quando disponível.
- Quando o backend retornar `motivoBloqueio`, a tela deve preservar esse motivo como orientação operacional para o usuário.
- Registro de rejeição técnica não deve ficar disponível por permissão isolada; deve depender do workflow ou do status fiscal compatível.
- Operações críticas devem usar `correlationId` criado por helper fiscal central, com prefixo do fluxo e tentativa única.
- O frontend continua sem decidir regra fiscal legal; ele apenas reflete o contrato operacional retornado pelo backend.
