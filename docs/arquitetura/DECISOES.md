# Decisões de arquitetura do frontend

Catálogo de decisões travadas pela sessão principal ao fim de cada rodada de projeto.
Formato e regras em `skills/projeto/05_decisoes_e_prospeccao.md`.

Regras:

- Id sequencial (`D1`, `D2`, …), nunca reaproveitado.
- Decisão revogada não é apagada: ganha a linha `Revogada por Dn` e permanece.
- Decisão reversível sem gatilho de revisita é decisão esquecida.
- Sem o campo `Por quê`, a próxima sessão reabre o mesmo debate.

## Modelo

```text
### Dn — <título>

Data: AAAA-MM-DD
Rodada: docs/arquitetura/debate/NN-*-<assunto>.md
Decisão: <o que foi travado, em uma frase>
Alternativas descartadas: <lista>
Por quê: <o argumento que venceu, e de quem era>
Reversível: sim/não. Gatilho de revisita: <evento concreto>
Quem arbitrou: orquestrador
Impacto: <módulos, telas, contratos>
```

## Decisões

### D1 — `formatMoney` denuncia ausência em vez de mascarar com zero

Data: 2026-09-09
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o plano do
`arquiteto-frontend` para a onda F1 (item F1.4 de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`),
por decisão explícita do usuário de não abrir rodada para esta.
Decisão: `lib/formatters/money.ts` passa a expor **duas** funções — `formatMoney(value)`, para campo
que o contrato do backend declara obrigatório, que denuncia a ausência na própria célula em
desenvolvimento e degrada para `—` em produção; e `formatMoneyOptional(value, fallback?)`, para
campo declaradamente opcional, que rende `—` em silêncio. O sinal de ambiente é
`process.env.NODE_ENV`, lido dentro da função.
Alternativas descartadas:
1. Uma assinatura só, com opção `{ optional: true }` — a declaração de ausência legítima ficaria
   opcional e portanto pulável, e não apareceria no diff.
2. `appConfig.env` como sinal de ambiente — `NEXT_PUBLIC_APP_ENV` nunca vale `production` neste
   repositório (Dockerfile, compose e workflow não o definem; o default de `config/app.ts` é
   `development`), então o modo ruidoso vazaria para produção.
3. `console.warn` como canal do aviso — proibido por `scripts/validate-source.mjs`.
4. `throw` — derrubaria a `DataTable` inteira, não a célula.
Por quê: com dois nomes, a ausência da declaração de "campo opcional" aparece no diff e o
repositório inteiro fica auditável por um `grep formatMoneyOptional`. O argumento é do
`arquiteto-frontend`, e as quatro alternativas foram descartadas por medição no repositório, não
por preferência.
Reversível: sim. Gatilho de revisita: o backend anotar `[ProducesResponseType<T>(200)]` nas ações
e o frontend passar a gerar tipos de response — nesse dia a defesa em tempo de render deixa de ser
a única, e a assinatura dupla pode virar ruído.
Quem arbitrou: orquestrador
Impacto: `lib/formatters/money.ts` e as 10 cópias locais de `formatMoney` que hoje fazem `?? 0` ou
já renderizam `—` (`financeiro`, `compras`, `vendas`, `tabelas-preco`, `patrimonio`, `contratos`,
`producao`, `rh`). Entregue na versão `b51`. As 24 cópias com assinatura `(value: number)` ficam
congeladas por teto de teste e drenadas em `b52` — elas lançam `TypeError`, que é barulhento, não
silencioso: classe diferente.
