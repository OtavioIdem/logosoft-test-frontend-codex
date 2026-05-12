# logosoft frontend v10.0.8 — Node 24 LTS e UX Financeiro

## Objetivo

Esta versão fixa explicitamente o runtime do projeto em Node 24 e adiciona refinamentos de UX no módulo Financeiro, mantendo o contrato de API real e sem expor identificadores técnicos ao usuário.

## Node/NPM

- Dockerfile fixado em `node:24-alpine` nos três estágios: `deps`, `builder` e `runner`.
- `package.json` recebeu `engines.node` como `>=24 <25` e `engines.npm` como `>=11 <12`.
- Adicionados `.nvmrc` e `.node-version` com `24`.
- `.npmrc` usa `engine-strict=true`, retries de rede e registry explícito.

## Financeiro

- Contas a receber/pagar receberam cards de resumo: valor total listado, saldo em aberto e contas com saldo.
- O modal de nova conta agora mostra total das parcelas e quantidade de parcelas no cabeçalho da seção.
- O botão Salvar fica desabilitado até possuir empresa, cliente/fornecedor, documento, parcelas com valor e referência de origem quando obrigatória.
- Textos foram ajustados para falar em vínculo correto/origem, sem expor detalhes técnicos.

## Validação

- `validate:source` agora também verifica se o Dockerfile está fixado em `node:24-alpine` e se `package.json` define Node 24.

## Observação

O ambiente de geração não concluiu `npm install` por timeout de rede, então `typecheck`, `test` e `build` devem ser executados localmente ou no Docker com rede disponível.
