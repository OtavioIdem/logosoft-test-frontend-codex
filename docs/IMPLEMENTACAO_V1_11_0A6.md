# Implementação v1.11.0a6 — Frontend Fiscal Técnico

## Objetivo

Criar a primeira implementação frontend do módulo Fiscal/Nota Fiscal alinhada ao backend fiscal documentado até v1.10.0a8, sem inventar regra fiscal e sem depender de endpoint de listagem ainda pendente.

## Entregas

- Novo menu **Fiscal**.
- Rotas:
  - `/fiscal/notas`
  - `/fiscal/notas/[id]`
  - `/fiscal/inutilizacoes`
- Permissões fiscais adicionadas ao tipo `PermissionCode`.
- Regras de rota protegidas para Fiscal.
- Cliente HTTP fiscal com schemas Zod.
- Hooks React Query para operações fiscais.
- Tela de consulta/criação de nota fiscal.
- Tela de detalhe fiscal com cabeçalho, itens, impostos, XMLs e eventos.
- Diálogos para:
  - criar nota manual;
  - gerar nota por pedido de venda;
  - adicionar item fiscal;
  - adicionar imposto manual/parametrizado;
  - armazenar XML;
  - validar nota;
  - gerar XML;
  - assinar XML;
  - transmitir SEFAZ/ambiente configurado;
  - registrar rejeição;
  - cancelar local;
  - cancelar SEFAZ;
  - carta de correção;
  - gerar DANFE técnico.
- Tela de inutilização fiscal.
- Botão **Gerar NF** no detalhe do pedido de venda aprovado.
- Testes unitários para payloads fiscais e regras visuais fiscais.
- Contrato fiscal em `docs/CONTRATO_FISCAL_OFICIAL.md`.

## Limitações assumidas

- Não há listagem paginada fiscal porque o backend ainda não expõe endpoint documentado para isso.
- O frontend não calcula impostos.
- XML/DANFE seguem fluxo técnico até validação fiscal oficial.
- NFS-e, CT-e, MDF-e e nota fiscal de entrada completa permanecem fora desta etapa.

## Validações executadas

- `npm run validate:source`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.

## Validações não concluídas neste ambiente

- `npm run test:unit` não concluiu porque o `node_modules` do ZIP veio sem a dependência opcional nativa do Rollup (`@rollup/rollup-linux-x64-gnu`).
- `npm run build` iniciou, passou pelo `validate:source`, mas não concluiu porque o `node_modules` do ZIP não contém o binário SWC opcional do Next (`@next/swc-linux-x64-gnu`).
- A reinstalação local também não foi concluída neste container porque o ambiente disponível usa Node `v22.16.0` e npm `10.9.2`, enquanto o projeto exige Node `>=24 <25` e npm `>=11 <12`.

Em ambiente de desenvolvimento/CI com Node 24 e npm 11, execute `npm install` ou `npm ci` antes de `npm run test:unit` e `npm run build`.
