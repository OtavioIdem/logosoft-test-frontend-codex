# Skill — Contrato de saída da rodada

## Por que existe

O orquestrador decide o próximo passo lendo o bloco final, sem reler o documento inteiro e sem
interpretar frase. "Acho que está tudo certo" não é estado.

## Bloco obrigatório

Todo agente de projeto fecha a resposta com:

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "conta-a-pagar-origem-manual",
  "status": "completed",
  "arquivo": "docs/arquitetura/debate/03-escopo-conta-a-pagar.md",
  "decisoesPropostas": [
    { "id": "D12", "titulo": "Origem manual fora da v1.11", "reversivel": true, "gatilho": "cliente pedir lançamento avulso" }
  ],
  "discordancias": [
    { "de": "arquiteto-operacao-erp", "ponto": "campo observacao obrigatorio", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "GET /contas-pagar retorna valorPago?", "decide": "se a coluna Pago entra na listagem" }
  ],
  "riscos": [
    "Contrato monetario nao coberto por teste de contrato hoje"
  ]
}
```

## Estados válidos

```text
completed                 Posição fechada, com evidência.
completed_with_warnings   Posição fechada, mas com premissa não confirmada declarada.
blocked                   Falta insumo para opinar. Exige tipo de bloqueio.
needs_decision            Duas alternativas defensáveis; o orquestrador tem de arbitrar.
skipped                   O eixo não se aplica a este assunto. Exige justificativa.
```

`skipped` é legítimo e barato — um debate de layout de listagem não precisa de posição de
plataforma se não muda volume, cache nem contrato. O que não é legítimo é `completed` sem
evidência.

## Tipos de bloqueio

```text
MISSING_CONTRACT        O contrato do backend não existe ou não foi encontrado.
CONTRACT_MISMATCH       Frontend e backend divergem no mesmo campo.
MISSING_DECISION        Depende de uma decisão anterior que não foi travada.
MISSING_REQUIREMENT     Falta regra de operação que só o cliente define.
PERMISSION_UNDEFINED    A ação não tem permissão registrada no catálogo.
SCOPE_TOO_LARGE         O assunto não cabe numa rodada; precisa ser quebrado.
```

## O que o orquestrador faz com o bloco

```text
Todos completed, sem discordância aberta  → trava decisões e chama o arquiteto-frontend.
Alguma discordância de impacto alto        → arbitra, registra o porquê em DECISOES.md.
Algum blocked                              → resolve a pendência antes de seguir.
Algum needs_decision                       → decide; não devolve a pergunta para o agente.
```

Decisão travada sem registro em `docs/arquitetura/DECISOES.md` não existe: a próxima sessão não
vai encontrá-la.
