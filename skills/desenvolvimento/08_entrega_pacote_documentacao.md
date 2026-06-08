# Skill — Entrega, pacote e documentação

## Objetivo

Garantir que a versão entregue seja aplicável como snapshot completo, sem ambiguidade.

## Antes de empacotar

Verificar:

```text
A versão base está correta?
O versionamento foi atualizado?
O markdown da versão existe?
O ZIP contém os arquivos rastreados esperados?
Nenhum arquivo fora de escopo foi reescrito?
Nenhum arquivo necessário ficou ausente?
A documentação descreve exatamente o que está no ZIP?
Os gates foram executados ou justificados?
```

## Conteúdo obrigatório do markdown da versão

```text
1. Versão.
2. Base utilizada.
3. Objetivo.
4. Arquivos adicionados.
5. Arquivos alterados.
6. Arquivos preservados.
7. O que não foi alterado.
8. Validações executadas.
9. Validações pendentes por ambiente.
10. Riscos e observações.
11. Comandos para aplicar no repositório principal.
```

## ZIP completo

O ZIP deve ser um snapshot limpo do projeto, pronto para review.

Não incluir:

```text
node_modules/
.next/
.vs/
coverage/
playwright-report/
test-results/
dist/
build/
cache local
```

## Aplicação segura

Como o pacote pode ser aplicado como substituição completa, não omitir arquivos rastreados que existem no repositório atual.

Se um arquivo rastreado deve ser removido, isso precisa estar explícito no escopo e no markdown.
