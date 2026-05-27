# Implementação v1.11.0a8b11 — Correção de typecheck no SearchSelect

## Objetivo

Corrigir o bloqueio encontrado na revisão da `v1.11.0a8b10`, onde o componente `SearchSelect` utilizava a prop `loading` diretamente no `Dropdown` do PrimeReact.

A versão instalada do PrimeReact não expõe `loading` em `DropdownProps`, causando falha em `npm run typecheck` e impedindo a liberação da versão.

## Correção aplicada

### SearchSelect

Arquivo alterado:

- `components/forms/SearchSelect.tsx`

Alteração:

- removido `loading={loading}` do `Dropdown`;
- mantido o estado visual de carregamento por meio de `dropdownIcon` com spinner PrimeIcons;
- preservados `onSearch`, `filterPlaceholder`, `emptyMessage`, `showClear`, `resetFilterOnHide` e a tipagem genérica do componente.

Comportamento esperado:

- quando `loading=true`, o dropdown exibe `pi pi-spin pi-spinner` como ícone;
- quando `loading=false`, o dropdown usa o ícone padrão do PrimeReact;
- nenhum contrato de formulário ou API foi alterado.

## Regra de revisão reforçada

Esta correção mantém a regra global introduzida nas versões anteriores:

- referências a entidades do ERP devem usar select/dropdown carregado por API;
- IDs técnicos não devem ser digitados manualmente pelo usuário;
- estados de carregamento devem respeitar as props suportadas pela versão instalada da biblioteca UI.

## Arquivos versionados

- `package.json`
- `config/app.ts`
- `docs/CONTRATO_FISCAL_OFICIAL.md`
- `docs/IMPLEMENTACAO_V1_11_0A8B11.md`
- `components/forms/SearchSelect.tsx`

## Validação executada neste ambiente

```bash
node scripts/validate-source.mjs
```

Resultado:

```txt
Validação de fonte concluída sem regressões conhecidas.
```

## Validação recomendada no ambiente do projeto

Executar com Node 24 e npm 11:

```bash
npm install
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

## Observação

A correção é técnica e pontual. Não altera o contrato fiscal, regras de negócio, permissões, payloads, observabilidade ou comportamento de integração com backend.
