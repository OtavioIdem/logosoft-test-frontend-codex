# Implementação v1.11.0a8b5 — Correção unitária e exportação CSV fiscal auditada

## Objetivo

Dar continuidade à evolução do módulo fiscal após a revisão da `v1.11.0a8b4`, corrigindo o bloqueio unitário restante e avançando a etapa de robustez da exportação CSV auditada.

## Correção bloqueante da revisão anterior

### `UsuarioFormDialog`

O campo `Senha inicial` usava `id="senha"` diretamente no componente `Password` do PrimeReact. Nesse componente, o `id` é aplicado ao wrapper, não ao `input` real, quebrando a associação entre `label` e campo rotulável.

Correção aplicada:

- `Password` passou a usar `inputId="senha"` para vincular o label ao input real.
- O wrapper manteve identificador separado como `id="senha-wrapper"`.

Impacto esperado:

- O teste `UsuarioFormDialog.test.tsx` deve voltar a localizar `Senha inicial` por acessibilidade.
- A correção melhora a navegação por leitores de tela e mantém compatibilidade com PrimeReact.

## Evolução da exportação CSV fiscal

### 1. Exportação sem paginação visual

A exportação CSV agora monta os parâmetros sem `page` e `pageSize`.

Motivo:

- A listagem usa paginação visual.
- A exportação auditada deve usar filtros operacionais e limite explícito, não a página atual da tabela.

### 2. Validação de empresa obrigatória

Foi adicionada proteção no builder de exportação para impedir CSV sem `empresaId`.

Código de erro local:

```txt
Fiscal.Exportacao.EmpresaObrigatoria
```

Mensagem:

```txt
Selecione uma empresa antes de exportar o CSV fiscal.
```

### 3. Validação de filtros conflitantes

Foram bloqueadas combinações incoerentes com o contrato fiscal:

- `somenteComPendenciaXmlAutorizado=true` com `possuiXmlAutorizado=true`;
- `somenteComPendenciaDanfe=true` com `possuiDanfe=true`;
- `somenteComPendenciaFinanceira=true` com `contaReceberGerada=true`.

Código de erro local:

```txt
Fiscal.Exportacao.FiltroInvalido
```

### 4. Limite auditado

O modal de exportação reforça o limite permitido pelo contrato:

- mínimo: `1`;
- máximo: `5000`;
- padrão: `1000`.

O motivo é trimado antes do envio e o botão de exportação fica desabilitado quando o motivo está vazio.

### 5. Erro em resposta blob

A API fiscal agora trata erro retornado como `Blob` em chamadas de download/exportação.

Cenários tratados:

- `application/json`;
- `application/problem+json`;
- texto simples retornado como blob.

Isso evita exibir mensagens genéricas quando o backend retorna erro estruturado em uma requisição configurada com `responseType: 'blob'`.

### 6. Nome de arquivo seguro

O nome do arquivo recebido via `Content-Disposition` passa por sanitização simples para caracteres inválidos em download.

Fallback:

```txt
notas-fiscais-YYYY-MM-DD.csv
```

## Arquivos alterados

- `features/seguranca/components/UsuarioFormDialog.tsx`
- `features/fiscal/api/fiscalApi.ts`
- `features/fiscal/components/NotaFiscalConsultaPage.tsx`
- `tests/unit/fiscalPayload.test.ts`
- `package.json`
- `docs/IMPLEMENTACAO_V1_11_0A8B5.md`

## Validação executada

Executado no ambiente disponível:

```bash
npm run validate:source
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

## Validações recomendadas no ambiente Node 24/npm 11

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

## Observação de ambiente

O container local usado para empacotamento está em Node 22/npm 10, enquanto o projeto exige Node 24/npm 11. Por isso, a validação completa deve ser feita no ambiente correto do projeto.

## Próxima etapa sugerida

`v1.11.0a8b6` — observabilidade fiscal, mascaramento, filtros e status de serviço.
