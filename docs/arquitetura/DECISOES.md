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
silencioso: classe diferente. **A drenagem foi remanejada para `b54` por D2**; o teto continua
onde está.

### D2 — corrigir as quatro instâncias de guard antes de construir o gate que fecha a classe

Data: 2026-09-10
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre a varredura completa que o
`arquiteto-frontend` fez para o item F1.6 de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`.
Decisão: `b52` corrige as quatro divergências de guard nomeadas na varredura (Tabelas de Preço,
Segurança, Auditoria e Fiscal); `b53` constrói o gate que cruza a chamada HTTP de cada módulo
contra a permissão que o contrato declara; `b54` recebe a drenagem das cópias locais de
`formatMoney`, que D1 havia posto em `b52`.
Alternativas descartadas:
1. Gate primeiro, correção depois — é o que T2 do plano manda, e vale quando a lista é longa e
   aberta, como em F1.2 com 39 instâncias, porque sem gate a próxima tela reintroduz o defeito.
2. Correção e gate no mesmo diff — mistura "corrigir quatro telas" com "auditar todo guard do
   repositório", e torna a revisão impossível. É o argumento do T7.
Por quê: a lista de F1.6 está fechada, medida e nominada em quatro itens, e três deles **negam
hoje** acesso a quem tem o direito, em Segurança e Auditoria, que são telas de administração.
Esperar uma versão custa acesso negado a quem administra o sistema. Corrigir antes custa zero e
faz o gate de `b53` nascer verde, em vez de nascer com um teto de seis exceções para drenar
depois. O argumento é do `arquiteto-frontend`, com a varredura como prova: 481 chamadas HTTP
resolvidas sobre a árvore sintática, cruzadas com as 579 operações do contrato, 15 divergências
brutas e 4 verdadeiras depois da triagem.
Reversível: sim, e barato — se a varredura tiver deixado passar uma quinta divergência, ela entra
como exceção do gate de `b53` em vez de virar correção avulsa. Gatilho de revisita: aparecer uma
quinta instância durante a implementação de `b52`, o que muda o teto de entrada do gate.
Quem arbitrou: orquestrador
Impacto: `features/tabelas-preco`, `features/seguranca`, `features/auditoria`, `features/fiscal`,
`lib/security/routePermissions.ts`, `layout/AppMenu.tsx`, mocks e fixtures de teste. Fica **fora**
desta decisão o guard de entrada de Tabelas de Preço, que aceita permissão de Vendas para uma rota
que exige permissão de Tabelas de Preço: retirá-lo tira o item de menu de um cargo inteiro, tem
perfil de risco diferente do das quatro, e depende de decisão do usuário.
**Revogada por D3 na parte que exclui o guard de entrada** — o resto de D2 continua valendo.

### D3 — o guard de entrada de Tabelas de Preço entra na `b52`, junto das outras quatro

Data: 2026-09-10
Rodada: sem rodada de debate. Decisão do usuário, tomada sobre o risco apresentado pela sessão
principal a partir da varredura do `arquiteto-frontend` (risco R2 do plano de F1.6).
Decisão: a tela de Tabelas de Preço e a regra de rota deixam de aceitar `VENDAS_CONSULTAR` e
`VENDAS_GERENCIAR` na entrada, e passam a exigir `TABELAS_PRECO_CONSULTAR`, que é a permissão que
`GET /api/tabelas-preco` de fato exige. Entra na mesma versão `b52`, como passo próprio.
Alternativas descartadas:
1. Deixar como estava — quem tem só permissão de Vendas continuaria entrando numa tela cuja lista
   o backend recusa, vendo vazio sem explicação.
2. Adiar para uma versão própria, pelo perfil de risco diferente — o usuário preferiu resolver a
   divergência inteira de uma vez, com o custo de acesso declarado no changelog.
Por quê: é a mesma classe das outras quatro, e mantê-la fora deixaria o gate de `b53` nascer com
uma exceção que ninguém teria vontade de drenar depois. O custo é real e está nomeado: este é o
único item da versão em que alguém perde capacidade e não apenas a ilusão de clicar.
Reversível: sim, mas com custo operacional — reverter depois do deploy exige mexer em grupo de
acesso de novo. Gatilho de revisita: chamado de operação relatando perda do módulo por cargo de
Vendas que deveria mantê-lo.
Quem arbitrou: usuário
Impacto: `features/tabelas-preco/components/TabelasPrecoPage.tsx` (guard de entrada),
`lib/security/routePermissions.ts` (regra de `/tabelas-preco`), `layout/AppMenu.tsx` (item de
menu), mais os testes de estrutura e de acesso. **Preparação obrigatória antes do deploy**: os
grupos que têm permissão de Vendas e precisam de Tabelas de Preço passam a precisar de
`TABELAS_PRECO_CONSULTAR`, ou o módulo some do menu para o cargo inteiro.
