# Planos de fatia

Um arquivo por versão, criado a partir de [`TEMPLATE.md`](TEMPLATE.md) **antes**
de qualquer código. É o plano que o grafo lê e onde o estado da execução vive.

```text
docs/fatias/
├── TEMPLATE.md                  o modelo
└── v1.11.0aNbNN-<nome>.md       um por versão
```

## Por que em arquivo, e não na conversa

Na onda F1 os planos viveram num diretório temporário de sessão e o estado viveu
na conversa. O que isso custou, medido:

- Um agente recebeu um plano que trazia só o total de divergências esperadas, sem
  a lista nominal, e por isso não tinha como conferir uma a uma. Entregou um gate
  que media zero, duas vezes.
- Dois agentes perderam rodadas porque o número que o plano prometia tinha sido
  medido por um protótipo que ninguém mais tinha em mãos.
- O nó de gate estrutural consumiu sete tentativas, quando o limite do grafo é
  três — e a terceira já trazia a causa raiz visível no relato.

A seção 0 é lida pelo grafo para decidir quais nós existem. A seção 9 guarda nó
corrente, tentativas, achados abertos e as medições com o **como**. Juntas, elas
permitem retomar a fatia num contexto novo sem replicar transcript.

## Relação com os outros documentos

| Documento | Papel |
| --- | --- |
| `docs/fatias/<versao>.md` | o plano e o estado de UMA entrega |
| `docs/arquitetura/DECISOES.md` | as decisões travadas (`Dn`), que atravessam entregas |
| `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` | a onda: o que entra, em que ordem, e o que não se constrói |
| `CHANGELOG.md` | o registro final, por versão — o documento vivo |

Não criar `docs/IMPLEMENTACAO_*` novo. Os que existem são rastro histórico.
