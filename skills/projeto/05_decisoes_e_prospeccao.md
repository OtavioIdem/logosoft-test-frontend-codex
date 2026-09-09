# Skill — Decisões travadas e prospecção

## O registro

Decisão travada vive em `docs/arquitetura/DECISOES.md`, uma entrada por decisão:

```text
### D12 — Origem manual de conta a pagar fora da v1.11

Data: 2026-09-09
Rodada: docs/arquitetura/debate/03-*-conta-a-pagar.md
Decisão: origem manual não entra nesta versão; a listagem exibe apenas origem de documento.
Alternativas descartadas: campo livre de origem; enum aberto no frontend.
Por quê: o backend não expõe o enum; enum fixo no frontend vira divergência de contrato.
Reversível: sim. Gatilho de revisita: backend publicar o enum de origem.
Quem arbitrou: orquestrador.
Impacto: features/financeiro, tela de contas a pagar.
```

Regras:

```text
Id sequencial, nunca reaproveitado.
Decisão revogada não some: ganha "Revogada por Dn" e fica.
Sem gatilho de revisita, decisão reversível vira decisão esquecida.
Sem "por quê", a próxima sessão vai reabrir o mesmo debate.
```

## Prospecção

Prospecção é a parte da rodada que olha adiante do que está sendo entregue. Não é lista de
desejos: é a resposta a três perguntas concretas.

**1. O que esta decisão torna caro depois.**
Toda escolha fecha portas. Escrever quais, e quando elas doeriam. "Não fecha nenhuma" é uma
resposta válida, mas tem de ser dita.

**2. O que já dá para ver chegando.**
O que existe no backend, na regulação ou no plano de ondas que vai bater nesta camada nos
próximos meses. Fonte, não palpite: endpoint que já existe e ninguém consome, permissão
cadastrada sem tela, campo no contrato sem uso na UI.

**3. Qual gate conteria a classe de erro.**
Erro que já aconteceu duas vezes não merece terceira revisão manual — merece gate. Este
repositório já congela classes inteiras assim:

```text
validate:guid-references       campo de vínculo virando input de GUID
validate:mocks-isolation       mock vazando para caminho produtivo
validate:backend-contract-map  tela consumindo endpoint fora do contrato
validate:backend-permissions   ação sem permissão registrada
validate:fiscal:production     regra fiscal inventada no frontend
validate:skills                skill estrutural removida ou descaracterizada
```

Uma rodada que identifica uma classe de defeito e **não** propõe o gate correspondente deixou o
melhor achado dela em cima da mesa.

## O que prospecção não é

```text
Recomendar biblioteca porque é moderna.
Propor cache distribuído, micro-frontend ou state manager novo sem gatilho medido.
Antecipar módulo que ninguém pediu.
Refatoração que não fecha nenhum defeito observado.
```

Cada item de infraestrutura proposto entra com o **gatilho concreto** que o justifica, escrito
junto. Sem gatilho, é gold-plating, e o eixo de escopo vai cortar — com razão.
