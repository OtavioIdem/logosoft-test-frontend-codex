# Skills de projeto — rodada de arquitetura do frontend

Estas skills definem como o frontend **decide** antes de implementar. Elas não descrevem
código: descrevem o mecanismo de debate que produz decisão travada, escopo cortado e
sequência defendida.

Diferença em relação às outras pastas:

| Pasta | Pergunta que responde |
| --- | --- |
| `skills/projeto` | **O que deve ser construído, em que ordem, com qual desenho e qual template** |
| `skills/desenvolvimento` | Como construir o que já foi decidido |
| `skills/review` | Se o que foi construído pode ser commitado |

Leia nesta ordem:

1. `00_regime_projeto.md` — quando abrir rodada, quem participa, em que ordem.
2. `01_fontes_de_verdade.md` — o que vale como evidência e o que não vale.
3. `02_formato_da_posicao.md` — estrutura obrigatória do documento de posição.
4. `03_contrato_de_saida.md` — bloco JSON que o orquestrador lê para decidir o próximo passo.
5. `04_regua_de_fatiamento.md` — versão `bNN`/`.cN`, tamanho de fatia, custo de provar.
6. `05_decisoes_e_prospeccao.md` — registro `Dn`, reversibilidade, gatilho de revisita.

Os agentes que operam este regime vivem em `.claude/agents/`: `inventariante-contrato-tela`,
`arquiteto-operacao-erp`, `arquiteto-plataforma-frontend`, `arquiteto-escopo-entrega` e
`arquiteto-design-system`. Nenhum deles escreve código de produção.

Regra que não se negocia: **quem debate não decide.** A decisão é travada pela sessão
principal (orquestrador) e registrada em `docs/arquitetura/DECISOES.md`.
