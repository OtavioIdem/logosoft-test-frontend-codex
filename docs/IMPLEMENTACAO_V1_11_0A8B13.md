# Implementação v1.11.0a8b13 — Filtros fiscais por referência e revisão de UX operacional

## Objetivo

Dar continuidade à revisão de manutenção do módulo fiscal frontend, reforçando a regra global de que referências a entidades do ERP devem ser obtidas por API e selecionadas em componentes de busca, não digitadas manualmente.

## Alterações implementadas

- A listagem fiscal passou a ter filtro de pessoa/cliente com `EntitySelect`, usando busca server-side por `termo` na API de Pessoas.
- A busca de pessoa na listagem é escopada por `empresaId` e `filialId` e fica desabilitada enquanto a empresa não estiver selecionada.
- O hook `usePessoas` agora aceita `enabled`, evitando chamadas amplas quando o contexto obrigatório ainda não existe.
- Adicionado filtro de origem fiscal por enum do contrato (`Manual`, `Pedido de venda`, `Pedido de compra`, `Serviço`, `Importação`).
- Adicionado filtro de protocolo de autorização.
- Adicionada ação para limpar filtros operacionais preservando empresa/filial e paginação base.
- A tabela de notas fiscais passou a exibir a origem com label funcional, sem expor enum cru.
- Documentada a extensão da diretriz global de referências para filtros fiscais.
- Atualizada versão para `1.11.0a8b13`.

## Testes adicionados

- `fiscalUxRules.test.ts`: valida formatação da origem fiscal para listagem sem expor identificador técnico bruto.

## Validação local possível neste ambiente

```bash
node scripts/validate-source.mjs
```

## Validação obrigatória no repositório principal

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

## Observações

- Nenhuma regra fiscal legal foi criada no frontend.
- Filtros técnicos/documentais, como série, número, chave de acesso e protocolo, continuam como texto porque não são entidades relacionais do ERP.
- A regra de select por API foi aplicada ao filtro de pessoa/cliente da listagem fiscal.
