# Implementação v1.11.0a1 — Build e Dashboard

## Versão anterior

A versão aplicada antes desta manutenção era `v1.11.0`.

## Causa

O build de produção falhava em `features/auth/components/LoginForm.tsx` porque o componente `Password` do PrimeReact 10.2.1 não possui a prop `inputProps` em sua tipagem.

Além disso, em zoom normal de navegador, os cards de métricas da Dashboard variavam de tamanho conforme a quebra de texto, gerando desalinhamento visual.

## Telas alteradas

- `/login`
- `/dashboard`

## Alterações implementadas

- Removida a prop `inputProps` do `Password`.
- Mantidos os atributos de acessibilidade `aria-invalid` e `aria-describedby` diretamente no `Password`, conforme a tipagem do PrimeReact.
- Criadas classes específicas de Dashboard em `styles/layout/_dashboard.scss`.
- O grid de métricas passou a usar CSS grid com colunas responsivas e cards de altura padronizada.
- Os cards de métrica passaram a limitar título e descrição em duas linhas, preservando altura e alinhamento.
- Fluxos críticos, Auditoria recente e Atalhos operacionais receberam classes próprias para manter tamanho e espaçamento estáveis.

## Regras preservadas

- Nenhum endpoint novo foi criado.
- Nenhuma regra fiscal foi inventada.
- O gate Fiscal/Nota Fiscal da `v1.11.0` permanece ativo.
- Sem `console.*`.
- Feedback visual segue usando componentes existentes.

## Validação

Comandos executados:

```bash
npm run validate:source
npm run build
```
