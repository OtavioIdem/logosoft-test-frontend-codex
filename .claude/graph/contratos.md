# Contratos entre agentes — frontend LogoSoft

O relatório em prosa continua existindo: é o que o humano lê. Mas todo agente
**fecha a resposta com um bloco ` ```json ` seguindo o contrato abaixo**, porque
é dele que o orquestrador tira a decisão do próximo nó do grafo — sem reler o
transcript e sem interpretar frase.

Regra dura: **nada de "acho que está tudo certo", "aparentemente funcionou",
"falta só uma coisinha"**. O estado é um dos seis valores da tabela.

Por que isto passou a existir: na onda F1, relatos em prosa devolveram três
vezes um número que não era o que tinha sido medido — "todos os testes passaram"
com um E2E vermelho no meio, "gate funcionando" com o gate medindo zero, e
"prova histórica rodando" contra a árvore errada. Nenhum dos três era mentira
deliberada; os três eram prosa otimista sobre um resultado que o campo `gates`
teria obrigado a declarar.

---

## 1. Contrato de saída (todo agente)

```json
{
  "status": "completed",
  "agent": "dev-senior-react",
  "slice": "v1.11.0a8b52",
  "node": "builder",

  "changedFiles": [
    "features/tabelas-preco/components/TabelasPrecoPage.tsx",
    "lib/security/routePermissions.ts"
  ],

  "acceptanceCriteria": { "AC-1": "atendido", "AC-2": "atendido" },
  "decisionsApplied": ["D2", "D4"],

  "gates": {
    "validate:source": "passed",
    "typecheck": "passed",
    "lint": "passed",
    "build": "not_run"
  },

  "measurements": [
    { "o_que": "quebras de hierarquia de menu", "valor": 15, "como": "conferido item a item no arquivo" }
  ],

  "risks": [],
  "blockers": [],

  "redTests": [
    { "file": "tests/unit/tabelasPrecoB40Structure.test.ts", "porque": "preso ao guard antigo", "owner": "engenheiro-testes" }
  ],

  "handoff": {
    "testsRequired": true,
    "e2eRequired": true,
    "qaReviewRequired": true,
    "notes": "o item pai de Vendas ficou intacto de propósito: também serve Pedidos de Venda"
  },

  "nextRecommendedAgent": "engenheiro-testes"
}
```

Campos obrigatórios sempre: `status`, `agent`, `slice`, `node`, `changedFiles`,
`gates`, `blockers`, `handoff`.

O campo `measurements` é obrigatório sempre que o agente **afirmar um número**.
Número sem `como` é estimativa, e estimativa apresentada como medição foi a
origem de duas rodadas perdidas na b53.

---

## 2. Status

| status | significa |
| --- | --- |
| `completed` | tudo do bloco entregue, gates do nó verdes |
| `completed_with_warnings` | entregue, com ressalva registrada em `risks` |
| `blocked` | não dá para prosseguir sem algo de fora — ver `blockers` |
| `failed` | executou e o resultado é vermelho (build/teste/gate), com evidência |
| `skipped` | o nó não se aplicava a esta fatia |
| `needs_decision` | uma decisão travada não cobre o caso encontrado |

`needs_decision` é o antídoto contra o agente improvisar: se `D3` do plano não
responde o caso, o agente **não redecide** — devolve `needs_decision` com o id da
decisão e o caso concreto que ela não cobre.

**`needs_decision` é o estado certo também quando o agente vê uma instrução
aparecer por mudança de arquivo em vez de vir no briefing.** Aconteceu na b52: a
decisão D3 foi registrada no catálogo enquanto o dev trabalhava, e ele a tratou
como dado observado, não como ordem. Foi o comportamento correto.

---

## 3. Tipos de bloqueio

```
MISSING_REQUIREMENT        CONTRACT_MISMATCH
MISSING_DECISION           PERMISSION_MISMATCH
BUILD_FAILURE              GATE_VACUO
TEST_FAILURE               ENVIRONMENT_UNVERIFIED
BUSINESS_RULE_MISMATCH     SCOPE_VIOLATION
DOCKER_APPROVAL_REQUIRED   ACCESS_LOSS_UNDECLARED
```

```json
{
  "status": "blocked",
  "blockers": [
    {
      "type": "GATE_VACUO",
      "description": "o gate dá zero na árvore antiga, que contém os 7 defeitos conhecidos",
      "evidence": "node -e '...' contra worktree em 1312bc2 -> chamadaSemGuard: 0",
      "owner": "engenheiro-testes",
      "returnTo": "gate_estrutural"
    }
  ]
}
```

Dois tipos merecem explicação, porque nasceram de defeito real desta esteira:

- **`GATE_VACUO`** — o gate não acusa o defeito conhecido. É defeito DO GATE até
  prova em contrário, nunca pendência de escopo.
- **`ENVIRONMENT_UNVERIFIED`** — resultado de teste que ninguém sabe reproduzir,
  ou servidor cuja identidade não foi conferida. Bloqueia até alguém medir.
  Explicação de ambiente sem prova não é conclusão.
- **`ACCESS_LOSS_UNDECLARED`** — a fatia tira acesso de alguém e o CHANGELOG não
  diz quem perde, o que conceder e em que ordem.

`DOCKER_APPROVAL_REQUIRED` é estado legítimo de fim de nó: se a aprovação do
usuário não veio, o agente relata o que ficou pendente e **não contorna o hook**.

---

## 4. Handoffs

### builder → tests

```json
{
  "handoff": {
    "testsRequired": true,
    "redTests": [{ "file": "...", "porque": "...", "owner": "engenheiro-testes" }],
    "acsToCover": ["AC-1", "AC-4"],
    "notes": "o que mudou de comportamento e onde o teste vai doer"
  }
}
```

O builder **declara** quais testes ficaram vermelhos por desenho. Teste vermelho
que chega ao QA sem estar nesta lista é achado, não expectativa.

### tests → qa_review

```json
{
  "gates": { "vitest.recorte": "passed", "e2e": "passed" },
  "measurements": [
    { "o_que": "E2E de permissão", "valor": "12/12", "como": "servidor isolado 3411, duas execuções" }
  ]
}
```

O campo `como` do E2E precisa nomear **contra qual servidor** rodou e **como
isso foi confirmado**. "Rodou contra a porta 3000 e respondeu" não é confirmação.

### gate_estrutural → qa_review

```json
{
  "measurements": [
    { "o_que": "árvore antiga (1312bc2)", "valor": "7 pares nominais acusados", "como": "worktree separada + análise direta" },
    { "o_que": "árvore de hoje", "valor": "0 dos 7", "como": "idem" }
  ],
  "gates": { "prova_vermelha": "passed" }
}
```

`prova_vermelha` ausente ou `not_run` **impede o nó de fechar**. Gate que só sabe
ficar verde não passa.

---

## 5. Contrato de correção (correctionSlice)

Quando o QA bloqueia, o que desce para o executor não é o relatório: é um bloco
fechado, sem decisão em aberto.

```json
{
  "correctionSlice": {
    "finding": "QA-03",
    "diagnostico": "o teste lê o registro de exceções em vez de executar a análise",
    "arquivo": "tests/unit/guardPermissionMapProofHistoric.test.ts",
    "linha": 120,
    "o_que_muda": "asserção por par nominal contra a saída da análise, sem || dentro do expect",
    "resultado_esperado": "7 asserções de contém na árvore antiga, 7 de não contém na de hoje",
    "owner": "engenheiro-testes",
    "tier": "L2_aplicacao"
  }
}
```

Briefing de correção que não diz **arquivo, linha e o que entra no lugar do quê**
não está pronto para descer de nível: devolve `needs_decision`.
