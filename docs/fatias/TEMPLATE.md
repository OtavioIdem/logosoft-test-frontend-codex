# Plano de fatia — v1.11.0aNbNN — <nome>

> Copie este arquivo para `docs/fatias/v<versao>-<nome>.md` antes de começar.
> A seção 0 é lida pelo grafo; a seção 9 guarda o estado e é atualizada durante
> a execução. Plano que vive só na conversa não sobrevive à troca de contexto —
> foi o que custou duas rodadas na onda F1.

## 0. Contrato da fatia (legível por máquina)

> Sai do `arquiteto-frontend` ou é escrito direto pelo orquestrador. É daqui que
> o grafo resolve **quais nós existem** nesta fatia. Flag para baixo é gate a
> menos rodando sem ninguém perceber.

```yaml
slice:
  id: v1.11.0aNbNN
  module: <Modulo>
  feature: <Feature>
  item_do_plano: <F2.1, F3.4, ...>

# Regime decide o MECANISMO e o NIVEL de modelo de cada no.
# Criterios e tabela de decisao em .claude/graph/regimes.yaml.
#   implementacao  -> grafo completo, plano obrigatorio (comportamento novo)
#   correcao       -> modo assistido: diagnostico L4 pesado, aplicacao L2 barata
#   teste          -> desenho L3 x execucao L1 x gate L3, papeis separados
#   qualidade      -> revisao, equiparada ao nivel do dev
#   infraestrutura -> bootstrap L3 x rebuild L1
#   arquitetura    -> decide a FORMA do que nao existe; roda o grafo PROPRIO
#                     (inventario -> quarteto -> sintese) e NAO usa este template
# Na duvida sobe o nivel: errar para cima custa tokens, errar para baixo custa
# uma versao refeita.
regime: implementacao

risk: LOW | MEDIUM | HIGH | CRITICAL     # criterios em .claude/graph/risk.yaml
accessRisk: NENHUM | ILUSAO | CAPACIDADE | AUTO_BLOQUEIO   # so se mexe em guard

requirements:
  contractChange:        false   # tipo, campo ou schema muda contra o contrato do backend
  permissionChange:      false   # union, catalogo, routePermissions, menu ou guard
  moneyOnScreen:         false   # valor monetario ou calculo que o operador le para decidir
  uiPattern:             false   # padrao visual novo que outras telas vao herdar
  organizationalContext: false   # empresaId/filialId, query key, enabled, cache
  navigationChange:      false   # rota, item de menu, guard de rota
  structuralGate:        false   # a fatia CRIA ou altera gate em scripts/
  platformChange:        false   # CI, Docker, next.config, playwright, variavel de ambiente
  newScreen:             false

graphNodes: [builder, tests, qa_review]

testPlan:
  UNIT: required
  COMPONENT: required            # todo dialogo que grava
  E2E_MOCKADO: optional
  CONTRATO: false
  PERMISSAO: false
  CONTEXTO_ORGANIZACIONAL: false
  GATE_ESTRUTURAL: false
  REGRESSAO_TEXTUAL: false

# A pergunta obrigatoria: fatia que abre classe de defeito sem gate deixa a
# proxima pessoa redescobrir o mesmo defeito por metodo caro.
classeDeDefeito:
  o_que_esta_fatia_abre: <descreva a CLASSE, nao o bug>
  gate_existente: <nome do gate> | nenhum
```

## 1. Objetivo

Uma frase sobre o que muda para quem usa a tela. Não o que muda no código.

## 2. Leitura base (todo agente desta fatia)

- o contrato do backend para os endpoints envolvidos, com linha
- as decisões `Dn` que governam esta fatia
- as telas vizinhas que já resolvem problema parecido

## 3. Decisões já tomadas (o agente NÃO redecide)

| Id | Decisão | Onde está |
| --- | --- | --- |
| D<n> | <o que ficou travado> | `docs/arquitetura/DECISOES.md` |

Quem discorda devolve `needs_decision` com o id e o caso concreto que a decisão
não cobre. Nunca uma segunda arquitetura.

## 4. Armadilhas conhecidas desta fatia

O que já deu errado antes, aqui ou em fatia parecida. Se não houver nenhuma,
escreva "nenhuma conhecida" — a seção vazia é sinal de que ninguém procurou.

## 5. Critérios de aceite

| Id | Critério | Como se verifica |
| --- | --- | --- |
| AC-1 | <verificavel, nao "funciona bem"> | <comando ou cenario> |

Critério de aceite de permissão é sempre por **sessão nominal**: "sessão com
apenas X vê Y habilitado e Z desabilitado".

## 6. Blocos de trabalho

### Bloco A — `<agente>` — <título>

- **Arquivos que pode tocar**: <lista> (precisa caber na lista `write` do agente
  em `policies.yaml`)
- **O que fazer**: passos numerados, com arquivo e linha quando já se sabe
- **O que NÃO tocar**: nominalmente
- **Como saber que terminou**: gates deste nó

### Bloco B — ...

## 7. Sequenciamento

A ordem, e por que ela é essa. Nó que depende de outro diz de qual.

## 8. Fora do escopo, nominalmente

Lista de caminhos e assuntos que esta fatia **não** toca, com o destino de cada
um (outra onda, outra versão, registrado como dívida). Escopo negativo vago é o
que faz o diff crescer sem ninguém notar.

## 9. Estado da execução

> Atualizado pelo orquestrador a cada nó. É isto que permite retomar a fatia num
> contexto novo sem replicar transcript.

```yaml
noCorrente: <nome do no>
nosConcluidos: []
nosPulados: []          # com o motivo
tentativasPorNo: {}     # limite: 3, depois devolve ao usuario
achadosAbertos: []      # id, dono, o que falta
medicoes: []            # o_que, valor, como foi medido
decisoesNovas: []       # Dn criadas durante a fatia
```

## 10. Registro final

O que entrou no `CHANGELOG.md`, e — se a fatia mexeu em permissão — o que a
seção operacional diz a quem administra os grupos, com a ordem de concessão.
