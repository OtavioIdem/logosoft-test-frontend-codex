# Implementação v1.11.0a8b16 — detalhe fiscal sem identificadores técnicos expostos

## Objetivo

Continuar a revisão de manutenção do frontend fiscal, mantendo a base aprovada da `v1.11.0a8b15`, sem alterar contrato HTTP, payloads, permissões ou regras fiscais de backend.

Esta etapa corrige pontos visuais no detalhe da nota fiscal para manter a diretriz global de referências por API e reduzir exposição de identificadores técnicos ao operador.

## Alterações realizadas

### 1. Detalhe fiscal sem GUID bruto no cabeçalho

A tela `NotaFiscalDetalhePage` deixou de exibir diretamente os identificadores técnicos de:

- empresa;
- filial;
- origem vinculada.

Quando o backend retorna apenas o vínculo técnico e não retorna nome amigável, a UI mostra mensagens operacionais:

- `Empresa vinculada`;
- `Filial vinculada`;
- `Pedido de venda com vínculo operacional`.

O ID continua sendo usado internamente para rotas, payloads e chamadas de API, mas não aparece como informação principal ao operador.

### 2. Helpers fiscais de exibição

Foram adicionados helpers em `fiscalUiUtils.ts`:

- `fiscalReferenceContextLabel`;
- `fiscalOrigemContextLabel`.

Esses helpers centralizam a regra visual para vínculos fiscais recebidos do backend sem nome amigável.

### 3. Correção de coluna duplicada

A tabela de itens no detalhe da nota fiscal tinha a coluna `Un.` duplicada.

Foi mantida apenas uma coluna de unidade comercial, preservando:

- sequência;
- código;
- descrição;
- NCM;
- CFOP;
- unidade;
- quantidade;
- valor unitário;
- valor total.

### 4. Teste unitário

Adicionado teste em `fiscalUxRules.test.ts` garantindo que vínculos fiscais sejam representados sem expor identificadores técnicos na UI.

## Arquivos alterados

- `features/fiscal/components/NotaFiscalDetalhePage.tsx`
- `features/fiscal/components/fiscalUiUtils.ts`
- `tests/unit/fiscalUxRules.test.ts`
- `docs/DIRETRIZES_UX_REFERENCIAS.md`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `config/app.ts`
- `package.json`

## Validação executada

```bash
npm run validate:source
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi verificado que os arquivos não possuem trailing whitespace nem linha em branco extra no final.

## Validação recomendada no repositório principal

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
git diff --check
git diff --cached --check
```

## Observação

Esta versão não altera regra fiscal, endpoint, permissão, payload, schema fiscal ou comportamento de integração. A mudança é de UX, manutenção e segurança visual.
