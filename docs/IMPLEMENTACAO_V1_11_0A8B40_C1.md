# Implementação v1.11.0a8b40.c1 — Correção Tabelas de preço

## Objetivo

A v1.11.0a8b40.c1 corrige os bloqueios encontrados na revisão da B40, preservando o escopo do módulo de Tabelas de Preço.

A correção não adiciona novo módulo, não altera contrato backend e não mexe em telas fora de `/tabelas-preco`.

## Correções aplicadas

### 1. Typecheck PrimeReact Tag

Problema encontrado em staging:

```tsx
severity={tabela.padrao ? 'info' : 'secondary'}
```

O tipo do `Tag` usado no projeto não aceita `secondary`.

Correção aplicada:

```tsx
severity={tabela.padrao ? 'info' : undefined}
```

Com isso, o estado “Não padrão” fica sem severity explícito, evitando valor inválido e mantendo semântica neutra.

### 2. Botão Adicionar item protegido por permissão

Problema semântico encontrado:

```text
Usuário apenas consultivo podia visualizar tabela e abrir o fluxo de adicionar item.
```

Correção aplicada:

```tsx
<PermissionGuard anyOf={['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']} mode="hide">
    <Button label="Adicionar item" />
</PermissionGuard>
```

### 3. Compatibilidade de gestão alinhada

Problema semântico encontrado:

```text
A página aceitava VENDAS_GERENCIAR como permissão compatível, mas as ações de linha usavam apenas TABELAS_PRECO_GERENCIAR.
```

Correção aplicada:

```ts
const canManageTabelaPreco = hasAnyPermission(['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']);
```

As ações mutáveis de tabela e item agora só são exibidas quando `canManageTabelaPreco` é verdadeiro.

### 4. Teste estrutural reforçado

Atualizado:

```text
tests/unit/tabelasPrecoB40Structure.test.ts
```

Cobertura adicionada:

```text
[ ] não usar severity secondary no Tag de tabela padrão
[ ] manter canManageTabelaPreco
[ ] proteger Adicionar item com PermissionGuard
[ ] proteger ações de tabela por canManageTabelaPreco
[ ] proteger ações de item por canManageTabelaPreco
```

## Arquivos alterados

```text
features/tabelas-preco/components/TabelasPrecoPage.tsx
tests/unit/tabelasPrecoB40Structure.test.ts
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
.github/workflows/frontend-ci.yml
scripts/backend-contract-map.allowlist.json
scripts/validate-assisted-e2e.mjs
tests/unit/assistedIntegratedE2e.test.ts
tests/evidence/integrated-e2e.assisted-evidence.example.json
README.md
CHANGELOG.md
docs/IMPLEMENTACAO_V1_11_0A8B40_C1.md
```

## Validações recomendadas

```bash
npm install
npm run typecheck
npm run test:unit -- tests/unit/tabelasPrecoPayload.test.ts tests/unit/tabelasPrecoB40Structure.test.ts
npm run validate:source
npm run validate:backend-contract-map
npm run ci:gates
```

## Critério de aprovação

A B40.c1 deve ser aprovada se:

```text
[ ] typecheck passar.
[ ] Unitários passarem.
[ ] ci:gates completo passar.
[ ] Tela /tabelas-preco preservar comportamento da B40.
[ ] Usuário só consultivo não conseguir abrir fluxo de mutação.
[ ] Usuário com TABELAS_PRECO_GERENCIAR ou VENDAS_GERENCIAR conseguir operar mutações.
```

## Próxima etapa

```text
v1.11.0a8b41 — Estoque avançado
```
