# Implementação v1.11.0a8b14 — Reset de dependências em filtros fiscais por referência

## Objetivo

Corrigir a revisão bloqueada da `v1.11.0a8b13`, onde o filtro `pessoaId` permanecia preenchido após troca de `empresaId` ou `filialId` na tela de consulta de notas fiscais.

## Problema corrigido

Na listagem fiscal, o filtro de pessoa/cliente é escopado por empresa e filial. Antes desta correção, era possível selecionar uma pessoa da empresa A, trocar para empresa B e manter o `pessoaId` anterior na query da listagem.

Isso poderia gerar uma consulta fiscal semanticamente inválida, misturando escopos de empresa/filial com uma referência antiga de pessoa.

## Alterações aplicadas

- Criados helpers em `fiscalUiUtils.ts`:
  - `resetFiltrosFiscaisPorEmpresa`;
  - `resetFiltrosFiscaisPorFilial`.
- `NotaFiscalConsultaPage.tsx` passou a usar handlers específicos:
  - ao trocar empresa: limpa `filialId`, `pessoaId` e `pessoaSearch`;
  - ao trocar filial: limpa `pessoaId` e `pessoaSearch`.
- Mantidos os demais filtros operacionais, como status, tipo, operação, origem e pendências.
- Adicionado teste unitário para proteger o reset de dependência.
- Atualizada `docs/DIRETRIZES_UX_REFERENCIAS.md` com a regra de reset de dependências.
- Atualizada versão para `1.11.0a8b14`.

## Regra operacional consolidada

Campos de referência dependentes de empresa/filial não podem manter valor selecionado quando o escopo superior muda.

Exemplos:

- troca de empresa limpa filial e pessoa;
- troca de filial limpa pessoa;
- nova busca por pessoa deve ser executada dentro do escopo atual.

## Validação local no pacote

Executado:

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

Também foi executada verificação de trailing whitespace antes do empacotamento.

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
