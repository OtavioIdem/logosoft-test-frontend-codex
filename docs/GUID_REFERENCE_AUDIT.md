# Auditoria global de referências por select/API — Logosoft Frontend v1.11.0a8b26.c3

## 1. Objetivo

Este documento consolida a regra global de UX aplicada a partir da versão `v1.11.0a8b26.c3`:

> Quando um campo representar vínculo com outra entidade do ERP, o usuário não deve digitar manualmente o identificador técnico. A tela deve carregar opções por API e permitir seleção por dropdown, busca ou autocomplete.

A regra vale para o ERP inteiro, não apenas para o módulo fiscal.

## 2. Problema evitado

Campos como `empresaId`, `filialId`, `clienteId`, `produtoId`, `pedidoVendaId` ou `condicaoPagamentoId` não devem aparecer como campo de texto editável. Isso evita:

- envio de GUID incorreto;
- quebra de escopo multiempresa/multifilial;
- seleção de entidade sem permissão do usuário;
- inconsistência entre filtros dependentes;
- baixa qualidade operacional da interface;
- vazamento desnecessário de identificadores técnicos.

## 3. Regra de implementação

Campos de referência devem usar componentes como:

- `EmpresaSelect`;
- `FilialSelect`;
- `EntitySelect`;
- `SearchSelect`;
- `Dropdown` com opções carregadas por API;
- autocomplete/busca server-side quando a lista puder crescer.

O payload continua enviando o ID interno, mas a origem visual deve ser uma seleção contextual.

## 4. Campos monitorados pelo gate

O gate inicial monitora referências conhecidas, incluindo:

- `empresaId`;
- `filialId`;
- `pessoaId`;
- `clienteId`;
- `fornecedorId`;
- `usuarioId`;
- `grupoAcessoId`;
- `setorId`;
- `cargoId`;
- `produtoId`;
- `localEstoqueId`;
- `pedidoVendaId`;
- `pedidoCompraId`;
- `condicaoPagamentoId`;
- `formaPagamentoId`;
- `centroCustoId`;
- `naturezaOperacaoId`;
- `regraTributariaId`;
- `certificadoDigitalId`;
- `origemId`;
- `notaFiscalId`;
- `documentoAuxiliarId`.

## 5. Exceções aceitas

A validação automatizada permite exceções técnicas em:

- testes;
- fixtures;
- schemas;
- clients de API;
- documentação;
- campos ocultos;
- campos `readOnly` ou `disabled` estritamente técnicos;
- correlation IDs e rastreadores operacionais.

Existe uma exceção controlada e documentada para `features/auth/components/LoginForm.tsx::empresaId`. Esse campo é legado do contrato de login e representa o código autorizado informado antes da sessão, não uma escolha operacional de empresa já carregada por API. A exceção não deve ser replicada em outros formulários.

Mesmo quando a exceção for aceita pelo gate, a revisão humana deve avaliar se a UI está expondo referência técnica desnecessária.

## 6. Gate obrigatório

Novo comando:

```bash
npm run validate:guid-references
```

Esse comando também é executado por:

```bash
npm run validate:source
```

## 7. O que o gate bloqueia

O gate bloqueia atributos literais `id`/`name` em `InputText`/`InputTextarea` e também casos com `Controller name="..."` repassado por `{...field}` para input textual.

Exemplo bloqueado:

```tsx
<InputText id="empresaId" value={empresaId} onChange={...} />
```

Exemplo esperado:

```tsx
<EmpresaSelect id="empresaId" value={empresaId} onChange={...} />
```

## 8. Pontos críticos para revisão humana

A verificação automatizada é preventiva, mas não substitui revisão manual. Ainda é necessário verificar:

- se selects respeitam empresa/filial;
- se filtros dependentes são resetados ao trocar escopo;
- se opções carregadas respeitam permissões;
- se listas grandes usam busca server-side;
- se labels não exibem documentos sensíveis sem mascaramento;
- se o ID técnico não aparece como informação principal da UI.

## 9. Próximos passos

Após a versão `v1.11.0a8b26.c3`, qualquer novo formulário ou filtro deve passar por esta regra antes de commit. Quando surgirem novos campos de referência no ERP, o script `scripts/validate-guid-references.mjs` deve ser atualizado para incluir o novo nome.
