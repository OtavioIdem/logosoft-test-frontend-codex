# Arquitetura do frontend — rodadas de projeto

Esta pasta guarda o que foi **decidido** antes de implementar, e o debate que produziu a decisão.

```text
docs/arquitetura/
├── DECISOES.md   catálogo de decisões travadas (Dn)
└── debate/       posição de cada agente, uma rodada por prefixo numérico
```

O mecanismo está em `skills/projeto/`. Em resumo:

1. `inventariante-contrato-tela` produz o inventário da camada.
2. `arquiteto-operacao-erp`, `arquiteto-plataforma-frontend`, `arquiteto-escopo-entrega` e
   `arquiteto-design-system` escrevem, cada um, a própria posição em `debate/`.
3. A sessão principal arbitra, trava a decisão e registra em `DECISOES.md`.
4. Só então o `arquiteto-frontend` monta o plano da versão.

Nenhum agente de debate decide, e nenhum edita código.

## Nomenclatura dos arquivos de debate

```text
debate/NN-inventario-<assunto>.md
debate/NN-operacao-<assunto>.md
debate/NN-plataforma-<assunto>.md
debate/NN-escopo-<assunto>.md
debate/NN-design-<assunto>.md
```

`NN` é o número da rodada, o mesmo para os cinco arquivos. `<assunto>` é o recorte em debate,
em kebab-case.
