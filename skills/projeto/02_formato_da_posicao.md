# Skill — Formato do documento de posição

## Onde escrever

Um arquivo por agente, por rodada, no caminho que o briefing informar:

```text
docs/arquitetura/debate/NN-<papel>-<assunto>.md
```

Exemplos: `03-operacao-conta-a-pagar.md`, `03-plataforma-conta-a-pagar.md`,
`03-escopo-conta-a-pagar.md`, `03-design-conta-a-pagar.md`,
`03-inventario-conta-a-pagar.md`.

Nunca escrever no arquivo de outro agente. Nunca escrever em `features/`, `app/`, `components/`,
`lib/`, `tests/` ou `scripts/`.

## Estrutura obrigatória

```text
1. Assunto e recorte
   O que está em debate, em uma frase, e o que explicitamente não está.

2. Evidência
   Fatos com arquivo e trecho. Divergências entre fontes aparecem aqui.

3. Posição
   O que este agente defende, no seu eixo. Numerada, cada item autônomo.

4. Propostas de decisão
   Dn: <título>. Alternativas consideradas. Recomendada. Reversível: sim/não.
   Se irreversível, o custo de reverter escrito em unidade real.

5. Discordância
   Nomeada, com o agente e o ponto. Formato na seção abaixo.

6. O que eu abro mão
   Obrigatório. Onde este agente aceita a solução pior, e qual é o preço.

7. Perguntas que só o backend ou o cliente respondem
   Três a cinco, cada uma com o que ela decide.

8. Contrato de saída
   Bloco JSON de 03_contrato_de_saida.md.
```

Seção 6 vazia invalida o documento. Um eixo que não abre mão de nada não está debatendo —
está declarando.

## Como discordar

```text
Discordo de <agente> em <ponto>.
Ele propõe <X>.
Isso implica <consequência concreta>, porque <evidência>.
Alternativa: <Y>, que perde <o quê> e ganha <o quê>.
Reversível: sim, porque <razão> / não, e por isso levanto agora.
```

Ressalva escondida no meio de um parágrafo não conta como discordância. Se o ponto importa,
ele tem título próprio.

## Como concordar

Dizer que concorda, em uma linha, e seguir. Concordância explícita é informação: mostra ao
orquestrador que o ponto está fechado nos quatro eixos.

## Antes de fechar

Reler perguntando:

```text
Um desenvolvedor que nunca viu este módulo consegue implementar isto sem adivinhar?
Onde ele teria de adivinhar, o ponto está incompleto.
```

Ponto incompleto vira decisão travada ou pergunta externa. Nunca fica como está.
