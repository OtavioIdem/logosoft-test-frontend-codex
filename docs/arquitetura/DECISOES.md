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

### D4 — as 16 correções que o próprio gate gera entram na `b53`, em vez de virarem exceção

Data: 2026-09-10
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o plano do
`arquiteto-frontend` para F1.6.b, que escalou a questão em vez de decidir sozinho.
Decisão: o gate de `b53` mede também a hierarquia do menu e a coerência entre menu e regra de
rota. As 16 divergências que ele encontra hoje — 15 de item pai que não cobre a permissão do
filho, e uma rota de locais de estoque que o menu oferece e a regra recusa — são **corrigidas na
mesma versão**, e não registradas como exceção.
Alternativas descartadas:
1. Registrar as 16 como exceção com alvo numa versão futura — o gate nasceria com teto 18 em vez
   de 2, e um registro desse tamanho não se drena: apodrece.
2. Adiar o gate até que as 16 fossem corrigidas em versão própria — inverteria de novo a ordem que
   D2 acabou de estabelecer, por um ganho de revisão que não existe: as correções são de duas
   linhas por item.
Por quê: o argumento de T7, que manda não misturar correção ampla com construção, vale pelo perfil
do diff, não pela contagem. Estas 16 são **geradas pelo próprio gate**, todas aditivas, confinadas
a dois arquivos, e nenhuma tira capacidade de ninguém — quem passa a ver o grupo do menu é
exatamente quem já veria o filho. É o perfil oposto ao das cinco telas da `b52`, que mudavam acesso
real e mereciam versão própria. O argumento é do `arquiteto-frontend`, com as 15 quebras medidas
por protótipo executado sobre a árvore.
Reversível: sim, e sem custo operacional — desfazer devolve o menu ao estado de hoje.
Gatilho de revisita: o gate medir uma quebra de menu que **retire** permissão de alguém em vez de
acrescentar; aí deixa de ser correção mecânica e vira decisão de acesso, como foi D3.
Quem arbitrou: orquestrador
Impacto: `layout/AppMenu.tsx` (cinco grupos pais ganham códigos em `anyPermissions`, nenhum perde)
e `lib/security/routePermissions.ts` (uma regra específica de locais de estoque, inserida antes da
genérica para não ampliar acesso a saldos e movimentos de quebra). Entra junto a mitigação que o
arquiteto recomendou para o risco A5: o gate reprova quando um diretório de feature com chamada de
rede não é segmento de rota nem tem dono declarado, para que um módulo novo não desapareça da
medição em silêncio.

**Limite que fica registrado junto, porque contradiz a intuição:** este gate **não** teria pegado o
guard de entrada de Tabelas de Preço corrigido por D3. A regra é condição necessária — prova que o
módulo conhece a permissão, não que a exige no lugar certo — e permissão a mais é invisível a ela.
Das cinco correções da `b52`, o gate reprova quatro.

### D5 — a b54 drena as três telas de campo monetário sem par, e a correção de campo vai para a b54.c1

Data: 2026-09-11
Rodada: sem rodada de debate. Decisão do usuário, tomada sobre o achado que o
`inventariante-contrato-tela` produziu no nó `inventario` da fatia `b54`.
Decisão: a `b54` troca as 25 cópias locais de `formatMoney` pelas funções de
`lib/formatters/money.ts` nos 69 pontos de chamada, **inclusive** nos quatro pontos em que o
campo lido não tem par no record do backend. Esses quatro usam `formatMoney`, que denuncia a
ausência. A correção do campo em si — decidir o que cada um deveria ler — vira a fatia
corretiva `b54.c1`, com inventário e testes próprios.
Alternativas descartadas:
1. Corrigir o campo dentro da própria `b54` — exigiria decidir mapeamento de campo em três
   módulos (Boletos entre valor do título, valor pago ou derivado; Depreciação com o tipo de
   response reescrito inteiro), o que vira `contractChange` e junta um diff de correção a um
   diff mecânico de 25 arquivos. É o argumento do T7.
2. Corrigir primeiro e adiar a drenagem para `b55` — fecharia o defeito mais grave antes, ao
   custo de adiar por uma versão o fechamento da dívida de `D1` e o merge da onda F1.
Por quê: os quatro pontos são achado desta fatia, não defeito que ela cria, e a troca **melhora**
o que o operador vê hoje. A cópia local chama `toLocaleString` sobre campo ausente, o que lança
`TypeError` e derruba a tela inteira; depois da troca, a mesma ausência vira uma célula que
denuncia em desenvolvimento e rende `—` em produção. O argumento do inventariante contra — de que
drenar sem corrigir esconde o defeito atrás da função nova — foi considerado e é procedente em um
ponto: **em produção o sintoma fica mais quieto** até a corretiva entrar. O usuário decidiu aceitar
esse custo, e ele fica registrado aqui e no `CHANGELOG.md`.
Reversível: sim, e a reversão é a própria `b54.c1`. Gatilho de revisita: a `b54.c1` não entrar na
sequência imediatamente depois da `b54`, o que transformaria "mais quieto por uma fatia" em
"silencioso por tempo indeterminado".
Quem arbitrou: usuário
Impacto: `features/bancos/components/BoletosPage.tsx` e `BancosOperacoesDialogs.tsx` (campo
`valor`, que o backend não declara — `BancosContracts.cs` tem `ValorTitulo` obrigatório e
`ValorPago` opcional), `features/contabil/components/LancamentosPage.tsx` (campo `valorTotal`, que
o backend não declara — só `TotalDebito` e `TotalCredito`), e
`features/patrimonio/components/DepreciacaoPage.tsx` (o tipo `DepreciacaoResultadoResponse` não
bate em nome com nenhum campo de `ProcessarDepreciacaoPeriodoResponse`). Os três são a classe do
defeito `P1` da onda, encontrados por esta fatia e **não** corrigidos por ela.

### D6 — valor calculado na tela e valor de formulário usam `formatMoney`, não a versão opcional

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre a classificação do
`inventariante-contrato-tela` na fatia `b54`.
Decisão: os 11 pontos de chamada que formatam valor calculado na própria tela (soma, subtotal,
total, troco, diferença de caixa) e os 7 que formatam valor de formulário antes do submit usam
`formatMoney`. `formatMoneyOptional` fica reservada a campo que o contrato do backend declara
opcional, e não há nenhum entre os 69 pontos desta fatia.
Alternativas descartadas:
1. `formatMoneyOptional` para os dois grupos, por não serem campo de contrato — renderia `—` em
   silêncio quando o cálculo desse `NaN`, que é exatamente a classe de defeito monetário
   silencioso que `D1` existe para fechar.
2. Uma terceira função para valor local — mais uma assinatura para um caso cujo comportamento
   desejado é idêntico ao de `formatMoney`.
Por quê: `isAbsent`, em `lib/formatters/money.ts`, trata `NaN` como ausência. Total que vira `NaN`
porque um operando chegou indefinido é a mesma classe do `P1`, e `formatMoney` é a única das duas
que o denuncia. A tipagem garante `number` nos dois grupos, então em operação normal as duas
funções renderiam igual; a diferença só aparece no caso defeituoso, e é lá que ela importa.
Reversível: sim, ponto a ponto. Gatilho de revisita: aparecer valor calculado cuja ausência seja
estado legítimo de tela, e não defeito — nesse dia o ponto passa a exigir declaração explícita.
Quem arbitrou: orquestrador
Impacto: 18 dos 69 pontos de chamada da `b54`, em `compras-avancado`, `contabil`, `crm`, `pdv`.

### D7 — o allowlist do mapa de contrato ganha um carimbador de versão, e o hook continua negando escrita à mão

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o `blocked` que o
`dev-senior-react` devolveu no nó `builder` da fatia `b54`, e confirmada por leitura direta.
Decisão: nasce `scripts/stamp-contract-map-version.mjs`, acionado por
`npm run stamp:backend-contract-map-version`, que reescreve **apenas** o campo `version` de
`scripts/backend-contract-map.allowlist.json` a partir do `package.json`. O hook `PreToolUse` de
`.claude/settings.json` **não muda**: escrita à mão nesse arquivo continua negada.
`.claude/graph/policies.yaml` passa a nomear o comando novo no lugar de
`npm run report:backend-contract-map`.
Alternativas descartadas:
1. Afrouxar o hook e deixar o arquivo ser carimbado à mão, como foi de `b49` a `b53` — é o que o
   arquivo pede hoje, mas o hook protege a lista de rotas, que é medição de verdade. Trocar
   proteção de arquivo inteiro por conveniência de um campo é o caminho de volta para a fraude que
   `policies.yaml` existe para impedir.
2. Escrever um gerador de verdade, que reconstrua o arquivo inteiro — o arquivo não é gerado: tem
   `generatedAt` e `sourceDate` congelados em 2026-08-12 e política de auditoria com dono e
   validade escritos à mão. Um "gerador" apagaria isso.
Por quê: `policies.yaml` classificou o arquivo como `generated_only` e apontou
`npm run report:backend-contract-map` como a origem. Li `scripts/validate-backend-contract-map.mjs`
inteiro: não há nenhum `writeFileSync`, e `--report` só imprime. A classificação estava errada, e o
hook que a impõe entrou em `867b7fd`, depois da `b53` — de `b49` a `b53` o arquivo foi carimbado à
mão, e desde `867b7fd` o ritual de versão desse arquivo ficou impossível para qualquer agente. O
carimbador estreito devolve o ritual sem devolver o buraco: só o campo `version` é escrito, e a
lista de rotas continua inalcançável por `Edit`/`Write`.
Reversível: sim. Gatilho de revisita: o backend passar a gerar esse allowlist de verdade, como já
gera o contrato — nesse dia o carimbador vira redundante e sai.
Quem arbitrou: orquestrador
Impacto: `scripts/stamp-contract-map-version.mjs` (novo), `package.json` (script novo),
`.claude/graph/policies.yaml` (seção `generated_only`). O achado é defeito da esteira introduzido
por `867b7fd`, não da fatia `b54`.

### D8 — o `package-lock.json` não entra na `b54`, e a decisão sobre lockfile é fatia de plataforma

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre um efeito colateral do nó de
medição de E2E da fatia `b54`.
Decisão: o `package-lock.json` gerado durante o reparo do `node_modules` **não** é commitado na
`b54`. Foi movido para fora da árvore, preservado como evidência no scratchpad da sessão. Se o
repositório deve passar a versionar lockfile, isso é fatia de plataforma própria, com o `CI` no
escopo.
Alternativas descartadas:
1. Commitar junto — muda o comportamento de instalação do `CI` dentro de uma fatia cujo assunto é
   formatação de dinheiro. É o argumento do T7, e o diff de um lockfile é do tamanho de todo o
   resto da fatia somado.
2. Apagar sem registrar — o repositório **nunca** teve lockfile (sem histórico no git), e isso tem
   consequência medida: `npm ci` não roda (`EUSAGE`), e por isso `.github/workflows/frontend-ci.yml`
   instala com `npm install`. Sem registro, a próxima pessoa redescobre isso do mesmo jeito caro.
Por quê: a ausência de lockfile é estado antigo e deliberado o bastante para o `CI` já o
acomodar. Trazê-lo agora, sem medir o efeito nos 21 gates, troca reprodutibilidade futura por
risco imediato numa fatia de risco `HIGH` que já está fechada.
Reversível: sim. Gatilho de revisita: um gate reprovar por versão de dependência que mudou sozinha
entre duas execuções, que é exatamente o que lockfile previne, ou a decisão de migrar o `CI` para
`npm ci`.
Quem arbitrou: orquestrador
Impacto: nenhum arquivo da `b54`. O lockfile gerado está em
`scratchpad/package-lock.gerado-no-reparo-b54.json`.

**Incidente que originou isto, registrado porque vai se repetir:** `git worktree remove --force`
sobre uma worktree cujo `node_modules` era uma **junção** (`mklink /J`) para o `node_modules` da
árvore principal recursou pela junção e apagou parte do `node_modules` real antes de falhar. O
reparo foi `npm install`, que trouxe 45 pacotes de volta. Quem usar worktree para medir outra
revisão deve remover a junção **antes** do `git worktree remove`, ou não usar junção.

### D9 — o `checkout` do CI passa a trazer o histórico inteiro, porque a prova histórica da `b53` depende dele

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre a reprovação do CI na
execução `34616705056`, medida no log do próprio workflow.
Decisão: `.github/workflows/frontend-ci.yml` passa a chamar `actions/checkout@v4` com
`fetch-depth: 0`. Entra como commit de acompanhamento da própria `b54`, que ainda não foi
mesclada, seguindo o precedente de `980111a` na `b53`.
Alternativas descartadas:
1. Fazer o teste pular quando `CI` está definido — é a armadilha `gate que só sabe ficar verde`,
   e pior: faria a prova histórica desligar exatamente no único lugar onde ela protege o trabalho
   de todo mundo. `risk.yaml` nomeia isso em `gateRisk.regra_de_aceite`.
2. Trocar a prova por leitura do registro de exceções, sem worktree — é a armadilha
   `teste_que_le_o_registro`, também já nomeada em `risk.yaml`.
Por quê: `tests/unit/guardPermissionMapProofHistoric.test.ts`, que a `b53` criou para provar que o
gate de guard sabe ficar vermelho, roda `git worktree add --detach <dir> 1312bc2` sobre a árvore da
`b51`. `actions/checkout@v4` clona raso por padrão (`fetch-depth: 1`), então esse commit não existe
no runner e o comando falha. Medido no log: `Error: Command failed: git worktree add --detach
"/tmp/gate-prova-wzjRas/b51" 1312bc2`, com `1 failed | 104 passed`. **A prova histórica da `b53`
nunca rodou no CI** — ela só funcionava na máquina de quem tem o histórico completo. O próprio
arquivo já dizia, no comentário da linha 89, que sem a árvore certa "todo o resto do arquivo é
teatro"; faltava alguém reparar que no CI a árvore certa nunca chegava.
Reversível: sim. Gatilho de revisita: o clone completo passar a custar tempo relevante no CI, o que
hoje não é o caso — a execução inteira leva pouco mais de um minuto.
Quem arbitrou: orquestrador
Impacto: `.github/workflows/frontend-ci.yml`. Junto com os quatro erros `TS2802` que a `b54` já
corrigiu, fecha as duas razões pelas quais o CI desta branch estava vermelho desde a `b53`.

### D10 — Boletos passa a exibir valor do título e valor pago, e adota o enum de status do backend

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o inventário do nó `inventario`
da fatia `b54.c1`, conferido por leitura direta do record e do enum do backend.
Decisão: (a) a coluna única "Valor", que lia o campo inexistente `valor`, vira **duas**: "Valor do
título" lendo `valorTitulo` com `formatMoney`, e "Valor pago" lendo `valorPago` com
`formatMoneyOptional`. (b) `vencimento` vira `dataVencimento`. (c) `status` vira `statusBoleto`, e o
enum `StatusBoleto` do frontend é **substituído** pelo do backend (`Gerado=1`, `EmRemessa=2`,
`Liquidado=3`, `Cancelado=4`). (d) a leitura de `alertas` no diálogo de detalhe é **removida**:
`GET /api/bancos/boletos/{id}` não entrega esse campo, e a mensagem de aviso nunca teve dado.
Alternativas descartadas:
1. Exibir só o valor do título — resolve a divergência e perde a informação de pago contra aberto,
   que é o que o operador de cobrança olha.
2. Derivar um saldo (`valorTitulo - valorPago`) — regra de negócio que o contrato não declara, e
   inventar regra dentro de fatia corretiva é o caminho para o próximo achado.
3. Manter o enum do frontend e mapeá-lo para o do backend — institucionaliza um vocabulário de UI
   que nomeia estados que o backend não tem (`EmAberto`, `Registrado`, `Baixado`), e nada no
   repositório indica que alguém dependa desses rótulos.
Por quê: o enum do frontend tem cinco valores e o do backend quatro, com semântica diferente em 1, 2
e 4. Corrigir só o nome do campo trocaria um sintoma barulhento por um silencioso: o valor `2`
apareceria como "Registrado" quando o backend quer dizer "Em remessa", e o `4` como "Baixado" quando
quer dizer "Cancelado". A regra de `boletoPodeCancelar` sobrevive à troca sem mudança de
comportamento, porque ela cobre os valores 1 e 2, que continuam sendo os dois estados anteriores à
liquidação. `valorPago` é `decimal?` no backend e vira o **primeiro ponto de chamada de
`formatMoneyOptional` em produção** — a função existe desde a `b51` e nunca teve nenhum.
Reversível: sim. Gatilho de revisita: o backend passar a expor `Alertas` em `GET /{id}`, ou
introduzir um quinto estado de boleto.
Quem arbitrou: orquestrador
Impacto: `features/bancos/types/bancos.types.ts` (enum e tipo), `features/bancos/components/
BoletosPage.tsx`, `BancosOperacoesDialogs.tsx`, `bancosLabels.ts`, e os testes que fixam os rótulos
antigos.

**Capacidade que volta, e precisa ser dita no CHANGELOG:** hoje `boletoPodeCancelar` recebe
`Number(row.status)` sobre um campo inexistente, o que dá `NaN`, e por isso a ação "Cancelar"
**nunca aparece, para nenhum boleto**. Corrigir o nome do campo devolve o botão a quem tem
`BOLETOS_CANCELAR`. É ganho de capacidade, não perda, e o backend continua sendo quem decide.

### D11 — Lançamentos contábeis exibe débito e crédito em colunas separadas, não um total

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o inventário da `b54.c1`.
Decisão: a coluna "Valor", que lia o campo inexistente `valorTotal`, vira **duas**, "Débito" e
"Crédito", lendo `totalDebito` e `totalCredito`, ambos `decimal` obrigatórios. E `status` vira
`statusLancamento`, troca mecânica: o enum já é idêntico dos dois lados.
Alternativas descartadas:
1. Exibir só o total de débito, assumindo o balanceamento — o `refine` de
   `contabilSchemas.ts:54-58` garante `Σdébito = Σcrédito` apenas no que **o frontend cria**.
   Lançamento de origem automática nunca passa por ele, e nada no contrato promete a igualdade.
   Mostrar um lado só é afirmar uma garantia que não existe.
2. Exibir um lado e criar um teste que reprove quando os dois divergirem — mistura correção de campo
   com regra de auditoria nova, e uma divergência real viraria teste vermelho em vez de informação
   na tela de quem precisa dela.
Por quê: duas colunas é a única opção que não pode mentir. Se algum lançamento estiver
desbalanceado, isso vira visível para o contador em vez de ficar escondido atrás de um número
escolhido por conveniência. O custo é uma coluna a mais numa tabela que já existe.
Reversível: sim. Gatilho de revisita: o backend passar a expor um total próprio no record.
Quem arbitrou: orquestrador
Impacto: `features/contabil/types/contabil.types.ts`, `features/contabil/components/
LancamentosPage.tsx`, e os testes do módulo.

**Capacidade que volta:** mesmo caso de `D10`. `lancamentoPodeEstornar` recebe `NaN` hoje, e a ação
"Estornar" nunca aparece para nenhum lançamento.

### D12 — Depreciação reconstrói a mensagem com os campos reais, e não acrescenta informação nova

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o inventário da `b54.c1`.
Decisão: `DepreciacaoResultadoResponse` é reescrito contra `ProcessarDepreciacaoPeriodoResponse`
(`Competencia`, `TotalBensDepreciados`, `ValorTotalDepreciado`, `TotalContabilizados`, `Bens`). A
tela decodifica `Competencia`, que é `ano * 100 + mes` codificado, e exibe a **mesma** frase de
hoje, com os nomes certos.
Alternativas descartadas:
1. Acrescentar `TotalContabilizados` à frase — o backend já entrega e a informação é útil, mas muda
   o que o operador lê. Fatia corretiva conserta; quem acrescenta é fatia funcional.
2. Expandir a tela para listar `Bens` item a item — muda uma frase de resumo em tabela, e é escopo
   de tela nova disfarçado de correção de campo.
3. Exibir `Competencia` cru, sem decodificar — mais simples para o código e pior para quem lê.
Por quê: é o mínimo que fecha a divergência sem mudar o que o operador vê, que é exatamente o
contrato de uma fatia corretiva. `TotalContabilizados` e a lista de `Bens` ficam registrados aqui
como candidatos de uma fatia funcional, e não como dívida esquecida.
Reversível: sim. Gatilho de revisita: alguém da operação pedir para distinguir bem depreciado de bem
contabilizado, que é a informação que a opção 1 traria.
Quem arbitrou: orquestrador
Impacto: `features/patrimonio/types/patrimonio.types.ts`,
`features/patrimonio/components/DepreciacaoPage.tsx`.

### D13 — a quinta tela entra nesta fatia, em vez de virar uma `.c2`

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre achado lateral do inventário da
`b54.c1`.
Decisão: `features/patrimonio/components/BensPage.tsx` entra no escopo da `b54.c1`. A coluna "Valor
contábil" lê `valorContabil`, que o backend não declara; passa a ler `valorContabilAtual`
(`BemPatrimonialContracts.cs:77`, `decimal` obrigatório), com `formatMoney` e **sem** o fallback
`?? valorAquisicao`, que campo obrigatório não precisa.
Alternativas descartadas:
1. Abrir uma `b54.c2` só para ela — `D5` fechou o escopo em três telas, e respeitar essa fronteira
   ao pé da letra deixaria para depois um defeito idêntico, no mesmo módulo, achado pelo inventário
   desta mesma fatia. É o tipo de resto que não se drena.
2. Deixar como está por ser "só um fallback" — o fallback é justamente o que torna o defeito
   silencioso.
Por quê: é a mesma classe exata, no mesmo módulo, e o efeito atual é um número errado na tela sem
nenhum sinal. Como `valorContabil` é sempre indefinido, o `??` sempre cai para o valor de aquisição,
e a coluna "Valor contábil" mostra o valor de aquisição **mesmo para bem já depreciado**. O diff é
do tamanho de um campo, e o perfil de risco é o mesmo das outras quatro telas.
Reversível: sim.
Quem arbitrou: orquestrador
Impacto: `features/patrimonio/types/patrimonio.types.ts`,
`features/patrimonio/components/BensPage.tsx`.

### D14 — o histórico do boleto mostra a transição de estado, que é o evento que o contrato entrega

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre um `needs_decision` que o
`dev-senior-react` devolveu no nó `builder` da `b54.c1`, em vez de improvisar. Foi o comportamento
certo: `D10` decidiu sobre `BoletoResponse` e não cobria `BoletoHistoricoResponse`.
Decisão: `BoletoHistoricoResponse` é reescrito contra o record real
(`Erp.Application/Bancos/BancosContracts.cs`): `id`, `statusAnterior`, `statusNovo`, `observacao`,
`usuarioId` opcional e `data`. Na tela, a coluna "Evento" passa a exibir a **transição**, montada
com o rótulo de status já existente nos dois lados (`Gerado → Em remessa`), e a coluna "Descrição"
passa a ler `observacao`, que é `string` obrigatória e portanto dispensa o fallback de travessão.
Alternativas descartadas:
1. Remover a coluna "Evento" — o histórico existe justamente para dizer o que mudou, e sobraria uma
   tabela de datas com observação solta.
2. Deixar como está e tratar numa fatia futura — `evento` é sempre `undefined` hoje, então a coluna
   renderiza uma `Tag` vazia em toda linha. É a mesma classe das outras quatro telas desta fatia, e
   está no mesmo arquivo que já está sendo tocado.
Por quê: o campo `evento` não existe no backend, e o que ele tentava nomear é exatamente o par
`StatusAnterior`/`StatusNovo`, que o backend entrega. Exibir a transição não inventa informação:
usa só campo do contrato, e reaproveita o rótulo de status que `D10` acabou de alinhar com o enum
do backend. `descricao` contra `Observacao` é troca mecânica de nome.
Reversível: sim. Gatilho de revisita: o backend passar a expor um rótulo de evento próprio.
Quem arbitrou: orquestrador
Impacto: `features/bancos/types/bancos.types.ts` e
`features/bancos/components/BancosOperacoesDialogs.tsx`.

### D15 — das seis exceções que o gate registrou, cinco não são exceção: quatro somem e uma é corrigida

Data: 2026-09-11
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o registro de exceção que o
`engenheiro-testes` propôs no nó `gate_estrutural` da `b54.c1`, conferido item a item contra o
documento de contrato e o enum do backend.
Decisão:
1. `BoletoResumoResponse.empresaId` e `.filialId`, e as duas heranças em `BoletoResponse`, **saem do
   tipo**. O backend não os entrega e nenhuma linha da UI os lê de uma linha de boleto — o
   `EmpresaFilialFilter` da tela lê `filters.empresaId`, que é estado do filtro, não campo do
   registro. Declaração fantasma que ninguém lê é o próximo `row.<campo>` esperando ser escrito.
2. `BemPatrimonialResponse.valorDepreciado` vira `depreciacaoAcumulada`, que é o campo real
   (`decimal DepreciacaoAcumulada` no record). É campo monetário do tipo que esta fatia já está
   corrigindo.
3. `BemPatrimonialResponse.status` **permanece** como única entrada do registro de exceção, com
   alvo na fatia `b54.c2`, criada por esta decisão.
Alternativas descartadas:
1. Manter as seis como exceção — quatro delas se resolvem apagando uma linha, e exceção que se
   drena com uma linha apodrece no registro em vez de ser drenada. `risk.yaml` exige alvo real por
   item, e "achado lateral" não é alvo.
2. Corrigir `status` de Bens aqui também — é o que a simetria com `D10` e `D11` sugeriria, e não se
   sustenta na medição. Ver abaixo.
Por quê, sobre o item 3: `row.status` em `BensPage.tsx` alimenta a coluna "Status", o filtro, e as
**quatro** guardas de ação — Transferir, Bloquear, Desbloquear e Baixar. Como o backend entrega
`StatusBem` e não `Status`, `Number(row.status)` é `NaN` hoje e as quatro ações nunca aparecem, do
mesmo jeito que em Boletos e em Lançamentos. Mas aqui a correção **não** é trocar o nome do campo: o
enum do frontend (`Ativo=1`, `Bloqueado=2`, `Baixado=3`) modela bloqueio como estado, e o backend
não. `StatusBemPatrimonial` tem dois valores (`Ativo=1`, `Baixado=2`), e bloqueio é
`bool Bloqueado` com `string? MotivoBloqueio`, campos separados do record. Trocar só o nome faria um
bem baixado aparecer como "Bloqueado", porque o valor `2` quer dizer coisas diferentes dos dois
lados. A correção certa remodela o estado de Bens contra o contrato e refaz as quatro guardas e o
filtro — isso é desenho, não renomeação, e `regimes.yaml` manda parar e abrir fatia quando o
diagnóstico chega aí.
Reversível: sim. Gatilho de revisita: a `b54.c2` não entrar em seguida, que transformaria uma
exceção com alvo em exceção sem dono.
Quem arbitrou: orquestrador
Impacto: `features/bancos/types/bancos.types.ts`, `features/patrimonio/types/patrimonio.types.ts`,
`scripts/gate-contract-fields.allowlist.json`. O teto do registro passa de 6 para **1**.

### D16 — o teste do gate de campo fantasma é reenquadrado como regressão, e a prova durável vai para a `b54.c2`

Data: 2026-09-11
Rodada: sem rodada de debate. Decisão do usuário, tomada sobre o esgotamento das três tentativas do
nó `gate_estrutural` da `b54.c1`, conforme `retry.on_exhausted` de
`.claude/graph/execution-graph.yaml`, que atribui a decisão ao usuário.
Decisão: `tests/unit/gateContractFields.test.ts` permanece, reenquadrado pelo que de fato faz —
garantir que os 13 campos fantasma corrigidos nesta fatia não voltem aos tipos. O nome, a descrição
e os `it` deixam de prometer que ele prova o gate. A asserção vazia final (`expect(true).toBe(true)`)
sai. A prova durável de que o gate sabe ficar vermelho fica como dívida nomeada da fatia `b54.c2`,
que `D15` já criou.
Alternativas descartadas:
1. Quarta tentativa no mesmo nó — quebraria o limite de três, que existe porque na `b53` um nó de
   gate consumiu sete rodadas com a causa raiz visível na terceira.
2. Apagar o teste — some com o sinal falso e também com a parte verdadeira, que é a trava contra os
   13 campos voltarem.
Por quê: o teste afirma uma coisa verdadeira com um nome falso. Reenquadrar preserva o valor e
remove a promessa que ele não cumpre. O gate em si foi medido pela sessão principal e é confiável:
campo fantasma injetado em `LancamentoContabilResponse` foi acusado **pelo nome**, e o script
devolveu código de saída `1`; revertido, volta a `0`. Ele está ligado em
`scripts/validate-source.mjs` e em `package.json` (`validate:contract-fields`), então roda no CI a
cada execução.
Reversível: sim. Gatilho de revisita: a `b54.c2` não entrar em seguida, o que deixaria o gate rodando
no pipeline por tempo indeterminado sem teste que o proteja de ser apagado ou cegado.
Quem arbitrou: usuário
Impacto: `tests/unit/gateContractFields.test.ts`. A `b54.c2` passa a carregar **dois** itens: a
remodelagem do estado de Bens (`D15`) e a prova durável deste gate.

**Limite registrado junto, porque é o que a fatia não entrega:** enquanto a `b54.c2` não entra, o
gate protege o repositório mas nada protege o gate. Apagar `scripts/gate-contract-fields.mjs` hoje
faria o `validate:source` reprovar por arquivo ausente — essa parte está coberta pelo `statSync` do
validador — mas cegá-lo por dentro, como já aconteceu duas vezes na `b53`, passaria sem teste algum.

### D17 — o gate de campo passa a ler o documento de contrato e a aplicar o teto, antes do merge da `b54.c1`

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre quatro comentários de revisão do
Sourcery no pull request 16, conferidos um a um contra o código.
Decisão: `scripts/gate-contract-fields.mjs` deixa de comparar contra o objeto `BACKEND_CONTRACTS`
copiado à mão e passa a extrair os campos dos blocos `csharp` rotulados `Response` de
`docs/backend-v1.23/CONTRATO-API-v1.23.md` em tempo de execução. O gate passa a reprovar quando o
registro de exceção tem mais entradas que o `teto`, e quando uma entrada não corresponde a
divergência observada. O teste de regressão do lado de `origin/main` passa a buscar o campo dentro
do bloco do tipo nomeado, incluindo a base de interseção, e não no arquivo inteiro. Entra como
commit de acompanhamento da `b54.c1`, que não foi mesclada.
Alternativas descartadas:
1. Mesclar e corrigir numa fatia seguinte — o changelog e o pull request afirmam que o gate compara
   contra o documento versionado, e mesclar publicaria uma afirmação falsa sobre o mecanismo que
   deveria proteger a classe inteira.
2. Manter a lista manual e só corrigir o texto — o gate continuaria validando contra campos
   desatualizados assim que o contrato fosse regenerado, que o plano da onda manda fazer a cada
   fatia do backend.
Por quê: três dos quatro comentários procedem. O primeiro não: `.github/workflows/frontend-ci.yml`
tem `fetch-depth: 0` desde `D9`, e o log da execução `34843761978` mostra
`tests/unit/gateContractFields.test.ts` rodando e passando. A sonda da sessão principal, que injetou
um campo fantasma e o viu acusado, não tinha como detectar a lista manual, porque a lista manual
também acusa campo desconhecido. O QA da `b54.c1` também não detectou.
Reversível: sim. Gatilho de revisita: o documento de contrato mudar de formato.
Quem arbitrou: orquestrador
Impacto: `scripts/gate-contract-fields.mjs`, `tests/unit/gateContractFields.test.ts`, e a entrada da
`b54.c1` no `CHANGELOG.md`, que passa a registrar a correção.

**Complemento, depois das sondas da sessão principal:** a primeira rodada da correção fechou os
três defeitos apontados, e as sondas revelaram um quarto, que a revisão não tinha visto. O registro
sem campo `teto` passava sem limite, e o teto só barrava excesso (`>`), sem exigir que batesse
exatamente com o tamanho da lista, como `risk.yaml` manda. Entra na mesma correção: `teto` ausente
ou não inteiro reprova, e a comparação passa a ser de igualdade.

### D18 — o estado de Bens é remodelado contra o contrato: status e bloqueio viram dois campos, e a tela deriva a situação

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre o diagnóstico da `b54.c2`, lido no
domínio e no controller do backend, não só no documento de contrato.
Decisão:
1. `BemPatrimonialResponse.status` sai. Entram `statusBem: StatusBemPatrimonial | number` e
   `bloqueado: boolean`, os dois campos que o record entrega (`CONTRATO-API-v1.23.md:1216-1217`).
2. O enum `StatusBem` do frontend (`Ativo=1`, `Bloqueado=2`, `Baixado=3`) é **substituído** por
   `StatusBemPatrimonial` (`Ativo=1`, `Baixado=2`), com o nome e os valores de
   `Erp.Domain/Patrimonio/PatrimonioEnums.cs:21-25`. Mesma regra de `D10`: renomear só o campo
   trocaria um sintoma barulhento por um silencioso.
3. A coluna "Status" exibe a **situação derivada** do registro, por uma função única em
   `patrimonioLabels.ts`: `Baixado` (danger) quando `statusBem = Baixado`; `Bloqueado` (warning)
   quando ativo e `bloqueado`; `Ativo` (success) nos demais.
4. As quatro guardas passam a receber o **registro**, não um número, e espelham o domínio
   (`BemPatrimonial.cs`, `GarantirAlteravel` e os métodos de ação):
   - Transferir: ativo e não bloqueado.
   - Bloquear: ativo e não bloqueado (`:179-180`).
   - Desbloquear: bloqueado (`:187`).
   - Baixar: ativo e não bloqueado (`:197-198`). **Muda de regra**: a guarda antiga oferecia Baixar
     para bem bloqueado, e o backend recusa com "Desbloqueie antes de baixar".
5. O filtro de status oferece só `Ativo` e `Baixado`, que é o que
   `BensPatrimoniaisController.Listar` aceita (`StatusBemPatrimonial? status`). A opção "Bloqueado"
   sai. Hoje ela envia `2`, que o backend lê como **Baixado**.
Alternativas descartadas:
1. Manter `Bloqueado` no filtro, filtrando localmente sobre `bloqueado` — a lista já é paginada no
   cliente, então é viável, mas mistura parâmetro de servidor com filtro derivado na mesma lista, o
   que é padrão novo. Uma fatia corretiva conserta e não acrescenta. Fica como candidata a fatia
   funcional.
2. Exibir `motivoBloqueio` na tela — é informação que a tela nunca mostrou. Mesmo motivo de `D12`.
3. Duas colunas, "Status" e "Bloqueado" — são duas etiquetas para o que o operador lê como uma
   situação só, e a combinação `Baixado` com bloqueado não é alcançável pelo domínio, porque `Baixar`
   exige desbloqueio e `Bloquear` exige bem ativo.
Por quê: é a única forma em que o valor `2` não pode mentir. Enquanto o enum do frontend tiver três
valores, bem baixado aparece como "Bloqueado".
Risco de acesso: `NENHUM`. Hoje `Number(row.status)` é `NaN` e **nenhuma** das quatro ações aparece
para bem algum. Depois da fatia, as quatro voltam para quem tem a permissão. A única regra que fica
mais estreita (Baixar em bem bloqueado) nunca apareceu em produção e o backend recusa.
Reversível: sim. Gatilho de revisita: o backend passar a modelar bloqueio como estado do enum, ou
`Listar` ganhar filtro por `bloqueado`.
Quem arbitrou: orquestrador
Impacto: `features/patrimonio/types/patrimonio.types.ts`, `features/patrimonio/components/patrimonioLabels.ts`,
`features/patrimonio/components/BensPage.tsx`, `scripts/gate-contract-fields.allowlist.json`
(teto `1` → `0`).

### D19 — a prova durável do gate de campo executa o gate contra uma árvore fixa, e o teste de regressão deixa de ler `origin/main`

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada pela sessão principal para cumprir a dívida de `D16`.
Decisão:
1. `tests/unit/gateContractFields.test.ts` passa a **executar** `scripts/gate-contract-fields.mjs`
   como processo, num espelho temporário fora do repositório (script, registro de exceção vazio com
   `teto: 0`, documento de contrato atual, e os três arquivos de tipo), e afirma sobre o código de
   saída e sobre os nomes que ele imprime:
   - com os tipos de `2c50771` (a árvore anterior à `b54.c1`): saída `1`, e **cada um dos 19**
     campos acusado pelo nome — os 13 de `D10` a `D14` e os 6 de `D15`;
   - com os tipos da árvore de hoje: saída `0`;
   - com os tipos de hoje e um campo fantasma injetado: saída `1`, com o campo acusado pelo nome.
2. A referência histórica é o SHA fixo `2c50771`, e não `origin/main`. Hoje as duas coincidem. Depois
   que o pull request 16 for mesclado, `origin/main` deixa de conter os campos, e o teste da `b54.c1`
   ficaria vermelho **no próprio `main`**.
Alternativas descartadas:
1. Refatorar o gate para exportar a análise, como `scripts/lib/guard-permission-map.mjs` — é mais
   limpo, mas mexe no gate que se quer provar, e a prova passaria a testar a biblioteca, não o
   comando que o CI roda.
2. Afirmar o total (`19`) — `risk.yaml` proíbe. Um campo pode sumir e outro aparecer sem mudar o
   total.
Por quê: a terceira sonda é a que `D16` pedia. Ela reprova se alguém cegar o gate por dentro, que foi
o que aconteceu duas vezes na `b53`. As duas primeiras não bastam, porque um gate cego fica verde na
árvore de hoje e poderia continuar vermelho na antiga por outro motivo.
Reversível: sim. Gatilho de revisita: o histórico ser reescrito e `2c50771` deixar de existir.
Quem arbitrou: orquestrador
Impacto: `tests/unit/gateContractFields.test.ts`.

### D20 — a `b54.c2` absorve três divergências do mesmo fluxo que o inventário achou, e deixa a quarta fora

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre as quatro "divergências sem
destino" de `docs/arquitetura/debate/01-inventario-estado-de-bens.md`, conferidas uma a uma contra
`New project 3/src` antes de decidir.
Decisão:
1. **Categoria** (divergência #1). O enum `CategoriaBem` (6 valores) é **substituído** por
   `CategoriaBemPatrimonial` com os 8 valores de `PatrimonioEnums.cs:3-13`: `Movel=1`, `Imovel=2`,
   `Veiculo=3`, `Maquina=4`, `Equipamento=5`, `Ferramenta=6`, `Software=7`, `Outro=8`. Rótulos:
   Móvel, Imóvel, Veículo, Máquina, Equipamento, Ferramenta, Software, Outro. O valor inicial do
   cadastro continua sendo **Equipamento**, que passa a ser `5`. O schema de cadastro e o filtro de
   listagem usam o enum novo.
2. **Motivo da baixa** (divergência #3). `motivo` deixa de ser texto livre e passa a ser
   `MotivoBaixaPatrimonial` (`PatrimonioEnums.cs:27-36`): `Venda=1`, `Obsolescencia=2`, `Perda=3`,
   `Doacao=4`, `Sinistro=5`, `Transferencia=6`, `Outro=7`. Rótulos: Venda, Obsolescência, Perda, Doação,
   Sinistro, Transferência, Outro. No diálogo o campo vira `Dropdown`, obrigatório, sem valor inicial.
   O schema de request valida com `z.nativeEnum`. `justificativa` continua texto obrigatório, que é o
   que `BaixarBemRequest` pede.
3. **Motivo do desbloqueio** (divergência #4). `desbloquearBem` deixa de enviar corpo, e a ação
   Desbloquear passa a executar direto na linha, sem diálogo, pelo mesmo padrão de
   `features/alimentar/components/LotesPage.tsx:118`. O `ReasonDialog` diz ao operador que "o motivo
   será enviado para auditoria", e nesse endpoint isso é falso: `Desbloquear(Guid id, CancellationToken)`
   não lê corpo, e o domínio apaga `MotivoBloqueio`.
4. **`empresaId` na primeira consulta** (divergência #2) **fica fora**. O padrão
   `useState<...Query>({})` aparece em 50 telas de `features/` (medido por grep), então não é defeito
   de Bens: é assunto de contexto organizacional, e o próprio inventário registra que não foi medido
   em execução. Fica como achado aberto com pergunta ao backend.
Alternativas descartadas:
1. Abrir uma `b54.c3` para #1, #3 e #4 — as três tocam os mesmos quatro arquivos da `c2`. E sem a #3 a
   `c2` faria reaparecer um botão Baixar que falha na desserialização para todo mundo, trocando uma
   ação invisível por uma ação quebrada. É o critério de `D13`: mesma classe, mesma tela, entra junto.
2. Manter o `ReasonDialog` no desbloqueio e só não enviar o texto — continuaria pedindo ao operador
   um dado que o sistema descarta, com uma frase que promete auditoria.
3. Mapear os valores antigos de categoria para os novos na leitura — não existe valor antigo no
   backend. O que está gravado já é `CategoriaBemPatrimonial`, e só o rótulo do frontend estava errado.
Por quê: são o mesmo defeito de `D10` e `D18`, um enum do frontend sem par de valores com o backend.
Nenhum gate desta esteira enxerga essa classe, porque o documento de contrato não publica os valores
de enum (grep por `Maquina` e `Obsolescencia` em `docs/backend-v1.23/` sem ocorrência).
**Consequência visível em produção, e que vai para a seção operacional do CHANGELOG:** bem cadastrado
por esta tela como "Equipamento", "Informática" ou "Outro" foi **gravado** como Máquina, Equipamento ou
Ferramenta. Depois do deploy, a tela passa a exibir o valor gravado. O dado não muda; muda o rótulo,
que finalmente diz o que o backend guarda. Quantos bens estão nessa situação **não foi medido**, porque
esta esteira não tem acesso ao banco.
Risco de acesso: `NENHUM`.
Reversível: sim no código. Os cadastros já gravados com a categoria errada não se corrigem com
reversão: exigem revisão de quem administra o patrimônio.
Gatilho de revisita: o documento de contrato passar a publicar valores de enum, o que viabiliza um
gate para a classe inteira.
Quem arbitrou: orquestrador
Impacto: `features/patrimonio/types/patrimonio.types.ts`, `features/patrimonio/schemas/patrimonioSchemas.ts`,
`features/patrimonio/api/patrimonioApi.ts`, `features/patrimonio/hooks/usePatrimonioResources.ts`,
`features/patrimonio/components/patrimonioLabels.ts`, `features/patrimonio/components/PatrimonioDialogs.tsx`,
`features/patrimonio/components/BensPage.tsx`.

**Complemento de `D19`, depois da medição do nó `gate_estrutural`:** a sonda contra `2c50771` acusa
**24** nomes, não 19. A diferença tem causa conferida e não é folga: em `2c50771`,
`BoletoResponse = BoletoResumoResponse & {...}` (`bancos.types.ts:65`) e
`LancamentoContabilResponse = LancamentoContabilResumoResponse & {...}` (`contabil.types.ts:83`), e o
gate valida os dois tipos de cada par (`scripts/gate-contract-fields.mjs:32-38`) resolvendo a
interseção. Por isso `valor`, `vencimento` e `status` aparecem também sob `BoletoResponse`, e
`valorTotal` e `status` também sob `LancamentoContabilResponse`. A lista de 19 da decisão contava
declarações, e o gate acusa por tipo resolvido. A prova afirma os **24 nomes**, um a um. Os 7 herdados
não são redundância: são eles que reprovam se alguém cegar a resolução de interseção. O erro foi da
lista escrita pela sessão principal, não do gate, e o nó fez o que o plano manda, que é devolver
`needs_decision` em vez de ajustar até bater.

### D21 — a onda F2 se fatia em três versões, e os legs do faturamento vêm primeiro

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada pela sessão principal sobre a §5 (F2) e a §2 (P4, P5) de
`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`, depois de conferir no código que nenhum item da F2 existe
(grep por `legs`, `retomar-reversao`, `valores-acessorios` em `features/`, `app/`, `lib/`, `layout/` e
`types/` sem ocorrência; a legenda falsa de impostos presente em `NotaFiscalDetalhePage.tsx`).
Decisão:
1. **`b55` — F2.1.** Legs do faturamento e `POST /api/faturamento/{id}/retomar-reversao`. Corrige o P4.
2. **`b56` — F2.2 e F2.3.** Aba de Impostos (legenda, coluna `Origem`, linha `Manual` que suprime a do
   `Motor`) e valores acessórios da nota. Corrige o P5.
3. **`b57` — F2.4, F2.5 e F2.6.** O fluxo de transmissão: `alertas`, `FISCAL_REPROCESSAR` na rota e no
   menu, e `correlationId` obrigatório.
Alternativas descartadas:
1. Uma fatia só, como o plano da onda estima (≈1 fatia) — misturaria três fluxos (reversão de
   faturamento, composição de imposto, transmissão à SEFAZ) no mesmo diff, e dois deles são `CRITICAL`
   por `risk.yaml`. É o argumento de `T7`: a revisão fica impossível.
2. Começar pela `b57`, que é a menor — ordenar por tamanho e não por dano. O P4 esconde um efeito
   pendurado (estoque baixado, título a receber) sem caminho de UI para resolver, e o P5 desinforma.
Por quê: `risk.yaml` manda bloco menor quando o risco é alto, e a ordem da §2 do plano da onda é por dano.
A `b55` fica sozinha porque traz o único endpoint que grava na F2 com efeito sobre estoque e financeiro
(`DeclararEfeitoDesfeito` é uma afirmação humana de que o efeito foi desfeito).
Risco de acesso: `NENHUM` para o fatiamento em si. Cada fatia classifica o próprio.
Reversível: sim. Gatilho de revisita: o `planner` da `b55` medir que a retomada depende de algo da
`b57`, ou o backend mudar o contrato de legs antes da `b55` fechar.
Quem arbitrou: orquestrador
Impacto: `features/faturamento/**` na `b55`; `features/fiscal/**` na `b56` e na `b57`; `lib/security/routePermissions.ts`
e `layout/AppMenu.tsx` na `b57`.

### D22 — a rota de retomada entra no catálogo que o gate de contrato lê, como adendo com evidência de controller

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada sobre o `needs_decision` do nó `planner` da `b55`
(`docs/fatias/v1.11.0a8b55-f2-legs-faturamento.md`, seção 9).
Decisão: a sessão principal acrescenta `POST /{id:guid}/retomar-reversao` à seção `api/faturamento` do
§9 de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, com uma nota de adendo que cita
`FaturamentosController.cs:99-106`. `tests/unit/backendContractMap.test.ts` passa de 576 para 577 com
asserção nominal da chave. O §12 (permissões) não é tocado. A mesma regra vale para `calcular-tributos` e
`valores-acessorios` na `b56`.
Alternativas descartadas:
1. Apontar o gate para `CONTRATO-API-v1.23.md`. É mudança de gate estrutural, com prova vermelha própria, e
   não cabe numa fatia `CRITICAL` de tela. É o destino certo como fatia de esteira (gatilho abaixo).
2. Tirar a retomada da `b55`. Sobraria só a leitura, e o P4 ficaria sem remédio.
3. Esperar o backend regenerar o documento. Não existe gerador para ele, então a espera não teria fim.
Por quê: o documento **não é artefato gerado**, e quatro fatos sustentam isso:
- o cabeçalho diz "levantamento feito por leitura direta do código";
- foi escrito num único commit (`9c16a39`, 2026-08-12);
- o repositório do backend não tem script que o produza (o único gerador, `scripts/gerar-contrato-frontend.mjs`,
  produz `CONTRATO-API-v1.23.md`);
- o hook de `.claude/settings.json` não o protege.

Corrigir a origem com evidência de controller é o que o CLAUDE.md manda. Editar um artefato gerado para o
gate fechar seria o oposto. A rota existe no backend: quem está defasado é o documento, que é da v1.18.
Reversível: sim. Gatilho de revisita: a fatia de esteira que migrar o `validate-backend-contract-map`
para ler `CONTRATO-API-v1.23.md`, gerado por comando. Com ela, os adendos saem.
Quem arbitrou: orquestrador
Impacto: `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` (§9), `tests/unit/backendContractMap.test.ts`.

### D23 — Confirmar fica indisponível, com o motivo visível, quando o faturamento tem leg em reversão

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão: com `possuiLegEmReversao: true`, o botão Confirmar do detalhe fica desabilitado, e um tooltip
visível mesmo com o botão desabilitado explica o motivo. A regra lê o booleano calculado pelo backend e não
deriva o estado de novo a partir dos legs.
Alternativas descartadas:
1. Manter como está. O operador preenche nove campos fiscais para receber a recusa, porque o backend valida
   os campos (`ConfirmarFaturamentoUseCase.cs:80`) antes de checar a reversão (`:108-112`).
2. Esconder o botão. O operador perde o motivo.
Por quê: o backend já recusa esse caso, e a tela deixa de prometer uma ação que não conclui.
Risco de acesso: `ILUSAO`. Ninguém perde uma operação que conclui hoje.
Reversível: sim. Gatilho de revisita: o backend deixar de recusar a confirmação com leg `EmReversao`.
Quem arbitrou: orquestrador
Impacto: `FaturamentoDetalhePage.tsx`, `faturamentoLabels.ts`.

### D24 — o fluxo de Cancelar faturamento fica fora da `b55`, exceto a reconsulta no erro

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão: não entram na `b55` o guard de Cancelar por leg 4 `Integrado`, a recusa em lista estruturada e
`FATURAMENTO_REVERTER_INTEGRACAO`. Entra só a reconsulta quando a mutação termina em erro (`D27`).
Alternativas descartadas: incluir só o guard do leg 4. O botão tem duas recusas enganosas com a mesma causa:
- a lista de legs, que aparece num toast de 7 s;
- o 404 "Recurso não encontrado." para quem não tem `FATURAMENTO_REVERTER_INTEGRACAO`.

A segunda depende de uma permissão que não entra no union sem corrigir a origem documental. Corrigir só a
primeira deixa o botão prometendo pela metade.
Por quê: é o argumento de `D21` e `T7` aplicado ao cancelamento. Ele merece fatia própria, depois das
perguntas B-1 e B-2 ao backend.
Reversível: sim. Gatilho de revisita: o backend publicar `FATURAMENTO_REVERTER_INTEGRACAO` numa fonte
documental, ou responder B-2.
Quem arbitrou: orquestrador
Impacto: nesta fatia, só `useFaturamentoResources.ts` (`D27`).

### D25 — a tabela de legs mostra sempre os seis, na ordem do catálogo

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão: a tabela tem seis linhas fixas, na ordem de `LegIntegracaoFaturamento`.
- Leg sem registro aparece como "Sem registro".
- Estado com valor desconhecido aparece cru, como "Estado desconhecido (n)", e nunca com um rótulo conhecido.
- Leg com valor desconhecido vira linha extra.
Alternativas descartadas: mostrar só as linhas devolvidas. O operador perderia a posição em que a cadeia parou.
Por quê: a pergunta do operador é "até onde foi?", e só a cadeia inteira responde. O próprio backend chama
a ausência de "nenhum registro" (`FaturamentoErrors.cs:129`).
Reversível: sim. Gatilho de revisita: o backend acrescentar leg ao catálogo.
Quem arbitrou: orquestrador
Impacto: `faturamentoLabels.ts`, `FaturamentoDetalhePage.tsx`.

### D26 — a listagem de faturamentos não ganha sinal de legs

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão: `FaturamentoPage.tsx` não lê `legs` nem os booleanos derivados, e um teste de regressão textual
garante isso.
Alternativas descartadas:
1. Badge na listagem. Por escolha do backend, `GET /api/faturamento` devolve os legs vazios e os booleanos
   sempre `false` (`FaturamentoConsultaUseCases.cs:56-63`). O badge diria "sem problema" em todas as
   linhas, que é justamente o dano do P4.
2. Uma consulta de detalhe por linha. É o custo que o backend recusou.
Por quê: sinal falso é pior que ausência de sinal.
Reversível: sim. Gatilho de revisita: resposta afirmativa do backend a B-3 (listagem com legs ou com os
booleanos).
Quem arbitrou: orquestrador
Impacto: `tests/unit/faturamentoStructure.test.ts`.

### D27 — as mutações do detalhe reconsultam também no erro, e o diálogo de retomada se fecha pelo estado do leg

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão:
- Confirmar, cancelar e retomar invalidam detalhe, histórico e ocorrências em `onSettled`, e não só em
  `onSuccess`.
- O diálogo de retomada só fica visível enquanto o leg da linha estiver `EmReversao` na consulta atual.
Alternativas descartadas: ramificar por código de erro. `runRequest` descarta o `code`, e mudar isso mexe
num padrão compartilhado (destino: F5).
Por quê: a falha no meio do cancelamento ou da retomada é o que cria ou mantém o leg `EmReversao` e a
ocorrência de erro. Hoje a tela continua mostrando o estado anterior à falha.
Reversível: sim. Gatilho de revisita: F5.5 (consolidação das classes de erro) passar a preservar o `code`.
Quem arbitrou: orquestrador
Impacto: `useFaturamentoResources.ts`, `FaturamentoDetalhePage.tsx`.

### D28 — no diálogo de retomada o leg vem da linha, e a ação não tem valor inicial

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`.
Decisão:
- O leg aparece só para leitura, vindo da linha clicada.
- A ação é obrigatória e começa vazia.
- O motivo é obrigatório, com 1 a 500 caracteres após trim (`FaturamentoValidators.cs:44-52`).
- Com `DeclararEfeitoDesfeito`, um aviso diz que é uma afirmação humana, auditada, de que o efeito foi
  desfeito fora do sistema.
Alternativas descartadas:
1. Dropdown de leg. Permitiria escolher um leg fora de `EmReversao`.
2. Ação com valor inicial. Empurraria o operador para uma escolha que ele não fez.
Por quê: `DeclararEfeitoDesfeito` encerra a reversão sem que o sistema confirme nada, então a escolha
precisa ser deliberada.
Reversível: sim. Gatilho de revisita: o backend acrescentar ação ao enum.
Quem arbitrou: orquestrador
Impacto: `FaturamentoDialogs.tsx`, `faturamentoSchemas.ts`.

### D29 — dono dos arquivos de versão, enquanto `policies.yaml` não os lista

Data: 2026-09-14
Rodada: proposta do `planner` da `b55`, com o precedente da `b54.c2`.
Decisão:
- O builder carimba `package.json`, `config/app.ts`, `README.md`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example` e `.github/workflows/frontend-ci.yml`.
- O `engenheiro-testes` carimba `tests/evidence/integrated-e2e.assisted-evidence.example.json` e as duas
  allowlists de `scripts/` à mão. O snapshot de permissões e a allowlist do mapa de contrato ele carimba só
  por comando.
- O `CHANGELOG.md` fica com a sessão principal.
Alternativas descartadas: carimbar pelo `devops-frontend`, dono de `.env*.example` e `.github/workflows/**`
em `policies.yaml`. Isso acrescentaria um nó a uma fatia sem `platformChange`.
Por quê: é a divisão que funcionou na `b54.c2`. A lacuna é da política, e não da fatia: `package.json`,
`config/app.ts`, `README.md` e `.env.test` não estão na lista `write` de ninguém.
Reversível: sim. Gatilho de revisita: a fatia de esteira E-2 acrescentar os arquivos de versão a
`policies.yaml`.
Quem arbitrou: orquestrador
Impacto: blocos A e B da `b55` e das fatias seguintes.

### D30 — as quatro divergências do inventário da `b55`: o teto do motivo de cancelamento entra, as outras três têm destino

Data: 2026-09-14
Rodada: `docs/arquitetura/debate/02-inventario-legs-faturamento.md`, que o nó `inventario` da `b55` entregou
como `completed_with_warnings`. Cada divergência foi conferida no fonte pela sessão principal antes da decisão.
Decisão:
1. **Teto do motivo de cancelamento (divergência 4) entra na `b55`.**
   - `cancelarFaturamentoSchema` (`features/faturamento/schemas/faturamentoSchemas.ts:34`) ganha
     `.max(300)` no `motivo`, e o critério vira `AC-17`.
   - O backend exige `NotEmpty().MaximumLength(300)` (`FaturamentoValidators.cs:35`).
   - Hoje o `textRequired` do arquivo é só `z.string().trim().min(1, message)` (`:9`), então 301 caracteres
     passam no cliente e voltam 400 com o diálogo aberto.
2. **`confirmadoPor`, `canceladoEm`, `canceladoPor` e `usuarioId` do histórico (divergência 1) ficam como
   estão.** Estão no tipo e nenhuma tela os lê.
   - Destino dos três GUID de usuário: F5, classe de referência por GUID.
   - `canceladoEm` vai para a fatia de cancelamento de faturamento (`D24`).
3. **`possuiLegComFalha` e `possuiLegRevertido` (divergência 2) entram só no tipo, sem critério que os
   consuma.** A tabela de legs já mostra `Falhou` e `Revertido` linha a linha (`AC-2`), e um badge agregado
   repetiria a mesma informação acima dela.
4. **`FaturamentoLegResponse.responsavelId` (divergência 3) entra só no tipo.** Sem coluna "quem" na
   tabela, porque é GUID cru de usuário. Destino: F5, classe de referência por GUID.
Alternativas descartadas:
1. Deixar o teto de 300 para a fatia de cancelamento (`D24`). É uma linha no arquivo que o builder já toca,
   do mesmo tipo de defeito (request do cliente mais frouxo que o validator), e a `D24` tirou do escopo o
   guard e a permissão do Cancelar, não o schema.
2. Mostrar GUID cru na coluna "quem". Repetiria o defeito que a F5 existe para resolver.
3. Tirar `possuiLegComFalha` e `possuiLegRevertido` do tipo. O tipo espelha o contrato, e campo aditivo
   omitido é o que a b54.c1 mostrou que vira campo fantasma mais tarde.
Por quê: só a divergência 4 faz o operador errar hoje, num diálogo que grava. As outras três são ausência
de exibição, sem informação falsa.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: a F5 resolver referência por GUID, com o que a coluna "quem" e os
campos de auditoria do faturamento voltam à mesa.
Quem arbitrou: orquestrador
Impacto: `features/faturamento/schemas/faturamentoSchemas.ts`, `tests/unit/faturamentoPayload.test.ts`.

### D31 — a rejeição não tratada do submit que falha é padrão da base e vai para a F5.5; as coberturas parciais da `b55` têm destino nominal

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada sobre o contrato do nó `tests` da `b55` (tentativa 3,
`completed_with_warnings`), depois de a sessão principal conferir por conta própria:
- recorte de 66 testes passando, sem linha `Errors`;
- sabotagens (b) e (f) reproduzidas, cada uma derrubando só o teste esperado, com restauração conferida por `cmp`.

Decisão:
1. **Rejeição não tratada fica como está na `b55`.** Com `runWithToast` em `rethrow: true`, o diálogo que faz
   `await onSubmit(...)` sem `catch` gera `unhandledRejection` quando a gravação falha. O toast de erro
   aparece e o diálogo continua aberto, que é o comportamento pretendido. O efeito colateral é um erro no
   console. O padrão é da base e não desta fatia:
   - 142 ocorrências de `rethrow: true` em 63 arquivos de `features/`;
   - 108 linhas `await onSubmit(` em `features/` e `components/`;
   - medido por grep;
   - o `ConfirmarFaturamentoDialog` desta mesma tela já fazia isso antes da fatia.

   O teste de AC-10 absorve a rejeição de forma nominal: exige exatamente uma, e que seja o erro simulado.
   Destino: F5.5, consolidação das classes de erro e do contrato de submit dos diálogos.
2. **Coberturas parciais declaradas pelo nó, aceitas com destino.** Nenhuma volta para a última tentativa:
   - **AC-3**, linha que continua "Em reversão" com POST falho e GET em 4: coberto por composição.
     `estadoLegLabel` nunca devolve "Revertido" fora do 3 (teste unitário), e o AC-10 prova que a linha
     deriva da consulta e não da ação: só mostra "Revertido" quando o GET devolve 3, e a sabotagem (f)
     derruba o teste.
   - **AC-8**, leg só para leitura e 2 opções: o leg é renderizado como texto, sem campo editável no
     componente. As 2 opções saem de `acaoRetomadaOptions`. Fica para o QA confirmar no diff.
   - **AC-12**, tooltip visível com o botão desabilitado: comportamento visual do PrimeReact. O desabilitado
     é provado pela sabotagem (h). O tooltip fica para conferência do QA no navegador.
   - **AC-10**, reconsulta no erro de confirmar e cancelar: textual (`onSettled`). É o mesmo mecanismo que a
     sabotagem (f) provou para retomar, na mesma linha de código.

Alternativas descartadas:
1. Pôr `try/catch` só no `RetomarReversaoDialog`. Criaria um terceiro padrão de submit no mesmo arquivo, ao
   lado do `ConfirmarFaturamentoDialog`, e mudaria o teste de AC-10, que depende da rejeição, num nó que já
   esgotou as três tentativas.
2. Mudar `useMutationWithToast` para não relançar. É um padrão compartilhado por 63 arquivos, e é o argumento
   de `T7`.
3. Abrir uma quarta tentativa do nó `tests` para as coberturas parciais. O limite do grafo é três. As
   lacunas têm cobertura por composição ou são visuais, e a decisão final de cobertura é do `qa_review`.

Por quê: o que o operador vê está certo. O erro de console é dívida da base inteira, e tratá-lo aqui misturaria
refatoração de padrão com correção de defeito.

Risco de acesso: `NENHUM`.

Reversível: sim. Gatilho de revisita: F5.5, ou o QA da `b55` julgar alguma cobertura parcial insuficiente para uma
fatia `CRITICAL`. Nesse caso, abre-se `correction -> tests -> qa_review`, conforme o grafo.

Quem arbitrou: orquestrador

Impacto: nenhum arquivo muda. Registro para a F5.5 e para o QA da `b55`.

### D32 — o bloqueio do QA da `b55` segue pelo nó `correction`, que não é quarta tentativa do nó `tests`

Data: 2026-09-14
Rodada: sem rodada de debate. Arbitrada sobre o veredito BLOQUEADO do `qa_review`, tentativa 2, rodada com o modelo
opus por causa de E-3. O próprio QA deixou a pergunta em `risks`: esta passagem conta ou não como quarta tentativa.

Decisão:
1. **A correção corre no nó `correction`.** `execution-graph.yaml` o define como nó próprio, que entra quando o
   veredito é BLOQUEADO e recebe um `correctionSlice` fechado. O limite `retry.max_attempts: 3` vale por nó e
   impede o mesmo nó de girar sem diagnóstico. Ele não impede a correção que o grafo prevê depois do QA. O
   executor é o `engenheiro-testes`, dono dos quatro achados, em nível L2 (modelo sonnet, sobrescrevendo o haiku
   do frontmatter, E-3), com briefing literal.
2. **Entram na correção:**
   - QA-1: valores literais dos enums no teste de AC-1;
   - QA-2: teste direto de AC-3, com POST falho e GET ainda em 4;
   - QA-3: teste versionado do tooltip de AC-12 no spec e2e;
   - QA-4: listas `anyOf` literais no teste de AC-14;
   - QA-9: o AC-10 passa a afirmar que histórico e ocorrências são reconsultados;
   - a janela de mascaramento do `unhandledRejection`, fechada com `expect(rejeicoes).toEqual([falha])` depois
     do `process.off`;
   - QA-7: o alvo da exceção GC-01, vencido desde a `b53`, passa a ser F5.6 (camada de CRUD genérico órfã), que é
     o destino da classe de scaffold morto.
3. **Fora da correção, com dono:**
   - QA-5, imprecisões do CHANGELOG: sessão principal.
   - QA-6, dois comentários com linha imprecisa: `dev-senior-react` em L2. Entra **depois** da correção, porque a
     sabotagem S1 edita o mesmo arquivo.
   - QA-8, motivo do Retomar desabilitado por falta de permissão: padrão de `PermissionGuard`, destino F5.
   - QA-10: sem ação.
4. **Sequência depois da correção:**
   - QA-6;
   - o nó `e2e` roda de novo, na 3411, duas vezes, porque o spec ganhou o teste de AC-12;
   - `qa_review` tentativa 3, que reproduz S1, S2, S4 e também S7 (tooltip), esta no navegador.

Alternativas descartadas:
1. Tratar a correção como quarta tentativa do nó `tests` e devolver ao usuário. Seria ler o limite contra o
   próprio grafo, que desenha `correction -> tests -> qa_review` como o caminho de um BLOQUEADO. O que o limite
   quer impedir, girar sem causa, não acontece aqui: a causa está medida por sabotagem e a correção é literal.
2. Aceitar APROVADO_COM_RESSALVA. A fatia é CRITICAL, e `risk.yaml` diz que ela só fecha com APROVADO limpo.
3. Corrigir o QA-6 junto, em paralelo. Colidiria com a sabotagem S1 no mesmo arquivo, o erro de medição que a
   `b54.c2` já registrou (QA-G5).

Por quê: o QA da tentativa 2 mediu o que o da tentativa 1 não mediu. Quatro testes verdes não sabiam ficar
vermelhos. A correção é pequena, está toda em `tests/`, e o código de produção foi confirmado conforme.

Risco de acesso: `NENHUM`.

Reversível: sim. Gatilho de revisita: a correção devolver `blocked`/`failed`, ou o QA 3 bloquear de novo. Nesse caso a
fatia volta ao usuário, sem quinto caminho.

Quem arbitrou: orquestrador

Impacto: `tests/unit/faturamentoLabels.test.ts`, `tests/unit/faturamentoStructure.test.ts`,
`tests/components/FaturamentoDetalhePage.test.tsx`, `tests/e2e/faturamento-legs.spec.ts`,
`scripts/guard-permission-map.allowlist.json`.

### D33 — valores acessórios da nota só se definem pela tela em Rascunho

Data: 2026-09-15
Rodada: sem rodada de debate. Arbitrada sobre a proposta P-1 do nó `planner` da `b56`
(`docs/fatias/v1.11.0a8b56-f2-impostos-valores-acessorios.md`), com os fatos conferidos pela sessão principal no código.
Decisão: o botão "Valores acessórios" do detalhe da nota fica habilitado só com `statusFiscal === 1` (Rascunho), por
uma função própria (`notaPodeDefinirValoresAcessorios`), além do guard `FISCAL_GERENCIAR`. `notaPodeEditarItens` não muda.
Alternativas descartadas:
1. Reusar `notaPodeEditarItens` (Rascunho e Validada). Em Validada o backend aceita a escrita e recalcula `ValorTotal`
   (`NotaFiscal.cs:176-187`), mas o motor recusa tudo fora de Rascunho (`CalculoTributarioNotaFiscalService.cs:54`).
   IPI, ICMS-ST e FCP-ST ficariam com a base antiga, e o XML já guardado seria assinado e transmitido com `vNF`
   desatualizado. Isso levaria a fatia a `CRITICAL`.
2. O complemento de `GarantirPodeAlterar` (1, 2, 3, 6 e 10). Mesmo defeito, em mais estados.
Por quê: em Rascunho a validação sempre recalcula (`ValidarNotaFiscalUseCase.cs:155-163`), então frete, seguro e
outras despesas entram na base dos tributos. Nota Rejeitada volta a Rascunho pela correção
(`NotaFiscal.cs:457-467`), então não fica sem caminho.
O que se abre mão: corrigir acessórios em nota Validada pela tela, embora o backend aceite.
Risco de acesso: `NENHUM`. O botão é novo; ninguém perde o que já tinha.
Reversível: sim. Gatilho de revisita: resposta do backend à pergunta B-1 da `b56` (exigir Rascunho no domínio).
Quem arbitrou: orquestrador
Impacto: `features/fiscal/components/fiscalUiUtils.ts`, `NotaFiscalDetalhePage.tsx`. Os botões Item e Imposto seguem
em Validada, com a mesma defasagem: restringi-los tira capacidade que conclui hoje (`CAPACIDADE`) e fica para fatia
própria com decisão do usuário.

### D34 — a composição do total e a marcação de linha de imposto leem os agregados do backend

Data: 2026-09-15
Rodada: proposta P-2 do `planner` da `b56`.
Decisão: o cartão de composição mostra os valores da resposta e `nota.valorTotal`, sem somar no cliente. A coluna
"No total" aplica a regra D7 do backend só a `IPI`, `ICMS ST` e `FCP ST`, com comparação exata de nome e chave
`(itemNotaFiscalId ?? null, nome)`. A marcação só aparece quando a soma das linhas marcadas "compõe" bate, em
centavos, com `valorIpi`, `valorIcmsSt` ou `valorFcpSt`. Se não bater, ou se houver dois manuais ativos na mesma
chave, as linhas daquele nome ficam "Não conferida" e um aviso diz que vale o total do servidor.
Alternativas descartadas:
1. Re-somar no cliente: replica a D7 e a fórmula do total, e diverge em silêncio se o backend mudar.
2. Só a coluna Origem: não diz qual linha compõe o total, que é o defeito do P5.
Por quê: o mapper devolve só linhas ativas (`FiscalNotaFiscalMapper.cs:37-40`) e o nome já vem normalizado
(`ImpostoNotaFiscal.cs:46`), então a marcação é implementável sem falso positivo. A conferência contra o agregado
transforma mudança de regra no backend em aviso, e não em afirmação falsa.
O que se abre mão: marcar linhas em nota com manual duplicado legado, e conferir a fórmula do total.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: o backend publicar por linha se ela compõe o total.
Quem arbitrou: orquestrador
Impacto: `features/fiscal/components/fiscalUiUtils.ts`, `NotaFiscalImpostosPanels.tsx` (novo).

### D35 — o diálogo de imposto manual entra na `b56`: motivo obrigatório, sem texto padrão

Data: 2026-09-15
Rodada: proposta P-3 do `planner` da `b56`.
Decisão: `ImpostoNotaFiscalDialog` passa a abrir com a observação vazia, rotulada "Motivo do lançamento manual",
obrigatória de 1 a 500 caracteres após trim, e com hint que nomeia os três impostos que substituem o motor no total.
O hint "O frontend não calcula imposto automaticamente nesta etapa." e o padrão "Imposto parametrizado manualmente."
saem.
Alternativa descartada: deixar para depois. O texto padrão sempre passa na checagem de não vazio do backend
(`NotaFiscalBasicaUseCases.cs:326-329`), então todo override grava o mesmo motivo pronto e a auditoria da D7 fica
sem conteúdo. É a mesma desinformação da legenda, no diálogo que cria a linha que suprime o motor.
O que se abre mão: agilidade; o operador digita o motivo.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: nenhum previsto.
Quem arbitrou: orquestrador
Impacto: `features/fiscal/components/FiscalActionDialogs.tsx`, `features/fiscal/schemas/fiscalSchemas.ts`.

### D36 — `calcular-tributos` fica fora da `b56`, e o adendo D22 leva só `valores-acessorios`

Data: 2026-09-15
Rodada: proposta P-4 do `planner` da `b56`.
Decisão: a `b56` não consome `POST /api/fiscal/notas-fiscais/{id}/calcular-tributos`. O adendo D22 em
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` §9 acrescenta só `valores-acessorios`, e o catálogo do gate vai de 577 para
578 rotas. Destino de `calcular-tributos`: F3, junto dos cadastros que alimentam o motor.
Alternativa descartada: incluir um botão de recalcular. É escrita nova, que inativa linhas do motor, fora de F2.2 e
F2.3; e, com a D33, desnecessária, porque a validação já recalcula.
Por quê: a D22 fala em rota consumida que falta. Grep em `features/`, `app/`, `lib/` e `types/` sem ocorrência.
O que se abre mão: recalcular antes de validar.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: a fatia F3 que abrir o motor na tela.
Quem arbitrou: orquestrador
Impacto: `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` (§9), `tests/unit/backendContractMap.test.ts`. Esta decisão corrige
a frase da D22 que citava `calcular-tributos` "na `b56`".

### D37 — `onSettled` só nas duas mutações cujos diálogos a `b56` toca

Data: 2026-09-15
Rodada: proposta P-5 do `planner` da `b56`.
Decisão: a D27 se aplica a `definirValoresAcessoriosMutation` (nova) e `adicionarImpostoMutation`. As outras 21
mutações fiscais ficam como estão, com destino F5.5.
Alternativa descartada: trocar as 23 de uma vez. Mistura correção de classe com a entrega de tela (argumento T7).
O que se abre mão: consistência de reconsulta no erro no restante do detalhe fiscal, até a F5.5.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: a F5.5.
Quem arbitrou: orquestrador
Impacto: `features/fiscal/hooks/useFiscalResources.ts`.

### D38 — a tabela de impostos mostra a observação da linha, e as outras sobras do inventário da `b56` têm destino

Data: 2026-09-15
Rodada: sem rodada de debate. Arbitrada sobre INV-1 a INV-4 de `docs/arquitetura/debate/03-inventario-impostos-nota-fiscal.md`.
Decisão:
1. **INV-2 entra.** A tabela de impostos ganha a coluna "Observação" com `ImpostoNotaFiscalResponse.observacao` em
   texto (vazio vira "-"). É o motivo do lançamento manual que a D35 torna obrigatório; sem a coluna, o operador grava
   o motivo e não o vê de volta, e a linha Manual que suprime o Motor fica sem explicação na tela. O `id` da linha passa
   a ser lido pela marcação da D34 (situação por id).
2. **INV-1 corrigido e com destino.** `NotaFiscalResponse.id` tem leitor: `useFiscalResources.ts:84-99`
   (`invalidateNota(nota.id)`), fora dos três arquivos varridos. `NotaFiscalResponse.observacao` fica sem exibição,
   com destino F5 (refino do detalhe fiscal).
3. **INV-3** já é o AC-8 da `b56` (`.strict()` no schema novo). Sem ação.
4. **INV-4** amplia a pergunta B-2 ao backend: o gerador cola comentário ao campo seguinte e pode perder campo em
   qualquer record comentado assim, não só em `NotaFiscalResponse`.
Alternativa descartada: deixar a observação da linha para a F5. O P5 é justamente a linha manual vencer em silêncio;
mostrar a origem sem o motivo resolve metade.
O que se abre mão: largura da tabela, que já tem nove colunas.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: nenhum previsto.
Quem arbitrou: orquestrador
Impacto: `features/fiscal/components/NotaFiscalImpostosPanels.tsx`; AC-19 da `b56`.

### D39 — o campo de moeda que grava centavo errado é defeito de classe pré-existente (DEF-1), e não se corrige na `b56`

Data: 2026-09-15
Rodada: sem rodada de debate. Arbitrada sobre o `failed` do nó `e2e` da `b56` (S2 de `tests/e2e/fiscal-impostos.spec.ts`,
15 passed | 1 failed nas duas rodadas, servidor 3411 PID 28724) e sobre o diagnóstico da sessão principal.
Medição (Playwright em Chromium, eventos de teclado reais, servidor isolado 3411 PID 25040 conferido por
`Get-CimInstance`; roteiro em scratchpad `diag-b56/diag-moeda.spec.ts`, fora do repositório):
- `InputNumber` com `mode="currency" currency="BRL" locale="pt-BR"`: depois de um dígito digitado na parte decimal, o
  cursor não avança, e o dígito seguinte sobrescreve o anterior.
- "12,50" exibe R$ 12,00 e grava `12`. "12,05" exibe R$ 12,50 e grava `12.5`. "12,5" grava `12.5`.
- Igual com 150 ms entre teclas: não é velocidade de digitação.
- Igual no campo "Valor unitário" do diálogo de item, que já está em produção (`FiscalActionDialogs.tsx:230`).
- Alcance: 22 usos diretos (`FiscalActionDialogs.tsx` 7, `features/tributacao/**` 14, `MoneyInput.tsx` 1) e o
  `components/forms/MoneyInput.tsx`, mesmo modo e locale, usado em 21 arquivos de 17 módulos. Se o `MoneyInput`
  reproduz não foi medido. Reprodução por pessoa digitando não foi medida; os eventos são os do navegador.
Decisão:
1. **DEF-1 fica fora da `b56`.** Destino: fatia corretiva própria, recomendada antes da `b57`, com diagnóstico da causa
   no componente e E2E que digita "12,50" e "12,05" em cada padrão de campo de moeda.
2. **O S2 do e2e passa a digitar "12,5"** e a afirmar que o campo exibe 12,50 antes de salvar. O corpo exato e o frete
   devolvido, que é o que o AC-11 pede, continuam afirmados. Nenhum teste afirma o valor errado.
3. **Aviso operacional em negrito no `CHANGELOG`**: conferir o valor exibido antes de salvar em qualquer campo de moeda.
Alternativas descartadas:
1. Corrigir só o diálogo novo na `b56`: desenho de componente sem causa diagnosticada, e comportamento divergente
   entre o campo novo e os demais.
2. Segurar a `b56` até a correção: a `b56` não agrava o defeito e corrige desinformação fiscal que já está no ar.
3. `test.fixme` ou remover o S2: é supressão.
4. Manter o S2 vermelho: o release gate exige e2e verde.
O que se abre mão: entregar o diálogo novo com o defeito conhecido, igual aos campos que já existem.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: a fatia de DEF-1; com ela, o S2 volta a digitar "12,50".
Quem arbitrou: orquestrador
Impacto: `tests/e2e/fiscal-impostos.spec.ts`, `CHANGELOG.md`.

### D40 — DEF-1 é defeito do `InputNumber` 10.2.1 com separador decimal vírgula, e se corrige na biblioteca por `patch-package`

Data: 2026-09-15
Rodada: sem rodada de debate. Diagnóstico da sessão principal, gatilho de revisita da `D39`.
Medição:
- **Causa, por leitura** de `node_modules/primereact/inputnumber/inputnumber.esm.js` (10.2.1). Digitar na parte decimal
  sobrescreve o caractere sob o cursor (`insert`, `:764-769`). Depois, `updateInput` (`:942-945`) só avança o cursor quando
  `isDecimalSign(value) || isDecimalSign(insertedValueStr)`. `value` é o número JS, que o regex testa como `"12.5"`, com
  ponto. Em pt-BR o separador é vírgula, então o cursor nunca avança depois de um dígito decimal e o dígito seguinte
  sobrescreve o anterior. Em en-US o teste casa por acaso com o ponto do número, e por isso o defeito não aparece lá.
- **Confirmação A/B**, com Vitest, jsdom e user-event, roteiro fora do repositório (scratchpad `diag-def1/`). O mesmo teste
  roda contra o arquivo original e contra uma cópia com a correção abaixo, em três padrões (moeda direta, `MoneyInput`,
  decimal pt-BR com sufixo `%`) e cinco digitações ("12,50", "12,05", "12,5", "1234,56", "0,99"). Original: 15 de 15
  exibem errado ("12,50" → "R$ 12,00", "0,99" → "R$ 0,90", "1234,56" → "R$ 1.234,60"). Com a correção: 15 de 15 exibem
  o digitado. O valor do modelo não foi medido nesse roteiro: `onValueChange` só dispara no blur, e o roteiro não sai do
  campo. O que o blur grava é a leitura do texto exibido.
- **Upstream.** O `master` do PrimeReact, lido no GitHub em 2026-09-15, mantém a mesma expressão e só acrescenta um caso
  especial para o dígito `0`. Atualizar a biblioteca não corrige "12,50".
- **Alcance maior que o da `D39`.** Além dos 22 campos de moeda e do `MoneyInput`, os campos decimais sem `locale` (58
  linhas com `FractionDigits`: alíquotas e MVA da tributação, quantidade do simulador, percentual de reajuste de contratos)
  seguem o idioma do navegador e, num navegador pt-BR, caem no mesmo ramo. Medido só com `locale="pt-BR"` explícito; o
  caso sem `locale` é inferência de leitura, a confirmar no E2E com o navegador em pt-BR.
Decisão:
1. **Corrigir na biblioteca**, com `patch-package` em versão exata nas dependências de desenvolvimento,
   `"postinstall": "patch-package --error-on-fail"` e `patches/primereact+10.2.1.patch`, cobrindo `inputnumber.esm.js` e
   `inputnumber.cjs.js`. No ramo de comprimento igual de `updateInput`, a operação `insert` com o cursor depois do
   separador decimal avança o cursor pelo tamanho do texto inserido. Fora desse caso, a expressão original fica.
2. **Nenhum arquivo de `features/`, `components/` ou `app/` muda.**
3. **O `Dockerfile` copia `patches/` antes do `npm install`** do estágio `deps`. Sem isso a imagem sai sem a correção, e
   sem erro, porque o `patch-package` não acha patch nenhum para aplicar.
4. **O S2 de `fiscal-impostos.spec.ts` volta a digitar "12,50"** (gatilho da `D39`).
Alternativas descartadas:
1. Atualizar o PrimeReact: o `master` tem o mesmo defeito.
2. Componente próprio em volta do `InputNumber`, com migração dos cerca de 80 campos: diff em 17 módulos, e todo
   `InputNumber` cru escrito depois traz o defeito de volta.
3. Campo de digitação no estilo caixa eletrônico, com os dígitos entrando pela direita: muda a digitação de todo campo de
   moeda. É desenho de UX, não correção.
4. Cópia do arquivo no repositório com alias no `next.config.js` e no Vitest: deriva em silêncio na próxima atualização
   do PrimeReact. Com `--error-on-fail`, o install reprova.
5. Script próprio de substituição no `postinstall`: reinventa o `patch-package` sem o diff revisável.
O que se abre mão: uma dependência de desenvolvimento a mais, um `postinstall`, e um patch em código de terceiro que
precisa ser refeito ou removido a cada atualização do PrimeReact.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: atualização do PrimeReact, quando o install reprova se o patch não aplicar; ou
correção upstream da expressão `isDecimalSign(value)`.
Quem arbitrou: orquestrador
Impacto: `package.json`, `package-lock.json`, `patches/`, `Dockerfile`, `.claude/graph/policies.yaml`,
`tests/e2e/fiscal-impostos.spec.ts`, testes novos.
Medição corrigida por `D41`: a frase "os campos decimais sem `locale` seguem o idioma do navegador" era inferência de
leitura e está errada. O E2E da `.c1` mediu que eles usam o `'en'` do PrimeReact.

### D41 — DEF-2: campo decimal sem `locale` usa o `'en'` do PrimeReact e ignora a vírgula; corrige-se na `.c1` declarando `locale="pt-BR"`

Data: 2026-09-15
Rodada: sem rodada de debate. Arbitrada sobre o `failed` do nó `e2e` da `.c1`: AC-7e com 11 passed | 1 failed nas duas
rodadas, servidor isolado 3411, PID 12784, identidade conferida antes de cada rodada.
Medição:
- **Sintoma, no E2E** (Chromium com `locale: 'pt-BR'`, e o teste afirma `navigator.language === 'pt-BR'`): no campo
  Quantidade do simulador, que não declara `locale`, digitar "1,25" exibe "125".
- **Causa, por leitura.** `inputnumber.esm.js:274` resolve `props.locale || context.locale || PrimeReact.locale`;
  `api.esm.js:306` define `PrimeReact.locale = 'en'`; `app/layout.tsx:25` usa `<PrimeReactProvider>` sem `value`. Em
  `'en'` a vírgula é separador de milhar, e a digitação só insere dígito, sinal de menos e separador decimal. O idioma do
  navegador não entra.
- **Alcance, por script sobre o JSX** (`conta-inputnumber.cjs` no scratchpad, que casa cada `<InputNumber … />` e
  procura `FractionDigits`, `mode="currency"` e `locale=`). São 53 `InputNumber` decimais: 22 declaram `locale`, 31 não.
  Os 31: 20 em `RegraFiscalFormDialog.tsx`, 7 em `ExcecaoFiscalFormDialog.tsx`, 1 em `ItensTributaveisGrid.tsx`
  (Quantidade), 1 em `ContratosDialogs.tsx` (percentual de reajuste), e os compartilhados `PercentInput` (usado em 2
  arquivos) e `QuantityInput` (usado em 22 arquivos: estoque, compras, vendas, PDV, produção, frota, qualidade, serviços,
  CRM, alimentar). Em todos, alíquota "12,5" vira 125 e quantidade "1,5" vira 15.
- **Nenhum teste existente** cita esses componentes ou digita neles.
Decisão:
1. **DEF-2 entra na `.c1`:** `locale="pt-BR"` nos 31 componentes, e nada mais muda neles.
2. **Um teste enumera** todo `InputNumber` decimal de `features/`, `components/`, `app/` e `layout/`, e reprova, pelo
   nome do arquivo e da linha, o que não declara `locale`.
3. **O AC-7e fica como está.** Ele exigia o comportamento certo; o que estava errado era a premissa da `D40`.
4. **O AC-8 da `.c1` passa a admitir exatamente esses 6 arquivos**, e só a inclusão da prop.
Alternativas descartadas:
1. Fatia `.c2` própria, tirando do AC-7e a metade da Quantidade (precedente da `D39`). O objetivo da `.c1` já promete
   "toda alíquota ou quantidade com casas decimais"; a causa está medida e a correção é mecânica. E manter as alíquotas
   das regras fiscais, que alimentam o motor, aceitando "12,5" como 125 até outra fatia é o maior dano da classe.
2. `PrimeReactProvider value={{ locale: 'pt-BR' }}` global. O contexto também alimenta os textos de Calendar, DataTable e
   dos demais componentes: sem `addLocale('pt-BR')`, `localeOption` lança erro; com ele, muda texto em toda tela. É
   desenho de UX, não correção.
3. `PrimeReact.locale = 'pt-BR'` em tempo de execução: o mesmo efeito global, e ainda mutável.
O que se abre mão: o AC-8 original (nenhum arquivo de produção muda); 6 arquivos de produção entram no diff. A
exibição desses campos muda de "12.50 %" para "12,50 %" e de "1,234.5" para "1.234,5"; o valor gravado de um número
já cadastrado não muda.
Risco de acesso: `NENHUM`.
Reversível: sim. Gatilho de revisita: adoção de locale global com `addLocale('pt-BR')`, quando a declaração por campo
fica redundante.
Quem arbitrou: orquestrador
Impacto: `features/tributacao/components/RegraFiscalFormDialog.tsx`, `ExcecaoFiscalFormDialog.tsx`,
`ItensTributaveisGrid.tsx`, `features/contratos/components/ContratosDialogs.tsx`, `components/forms/PercentInput.tsx`,
`components/forms/QuantityInput.tsx`, testes novos, `CHANGELOG.md`.

### D42 — DEF-3: a dashboard não envia a empresa do contexto; corrige-se na `.c2` da `b56`, antes da `b57`

Data: 2026-09-16
Rodada: sem rodada de debate. Arbitrada sobre relato do usuário: "os cards de contas a pagar e contas a receber
solicitam uma empresa selecionada, porém mesmo selecionando a empresa os cards não são atualizados".
Medição, por leitura na árvore `537347e` e no backend (`New project 3/src`):
- `features/dashboard/api/dashboardApi.ts` chama `/api/vendas/pedidos`, `/api/financeiro/contas-receber`,
  `/api/financeiro/contas-pagar`, `/api/estoque/saldos` e `/api/compras/pedidos` **sem parâmetro nenhum**.
- Os cinco controllers recebem `[FromQuery] Guid empresaId` obrigatório: `ContasReceberController.cs:22`,
  `ContasPagarController.cs:22`, `PedidosVendaController.cs:25`, `PedidosCompraController.cs:25`,
  `EstoqueController.cs:24`. Só `AuditoriaController.cs:24` (`eventos`) não recebe empresa.
- `OrganizationalContextGuard.cs:14-18` recusa `Guid.Empty` com "Empresa é obrigatória para operação multiempresa.":
  é a mensagem que o card mostra.
- `features/dashboard/hooks/useDashboard.ts` usa a chave fixa `['dashboard', 'overview']`. A troca de empresa
  (`OrganizationalContextProvider.tsx:65-74`) invalida a query e ela reconsulta, mas **de novo sem empresa**, e o card
  continua com o mesmo aviso. Nenhum botão resolve.
- Hipótese não medida: `EstoqueController.ListarSaldos` não passa pelo guard e pode devolver lista vazia com
  `Guid.Empty`, mostrando "0 produtos sem saldo" como se fosse dado. O builder confere.
Decisão:
1. **Fatia corretiva própria, `v1.11.0a8b56.c2`**, executada antes do builder da `b57`.
2. `useDashboard` lê `useOrganizationalContext`; a chave passa a incluir `organizationalScopeKey(snapshot)`.
3. `dashboardApi.carregar` recebe `{ empresaId, filialId }` do contexto e envia os dois (filial só quando houver) nas
   cinco consultas por empresa. Auditoria e health seguem globais.
4. **Sem empresa no contexto, as cinco consultas não saem.** Os cinco cards ficam indisponíveis com um único aviso
   "Selecione a empresa em "Selecionar contexto" para carregar os indicadores.", e a auditoria continua carregando.
Alternativas descartadas:
1. Entrar na `b57`: mistura dashboard e contexto organizacional num diff `CRITICAL` fiscal (argumento de `D21` e `T7`).
2. Esperar a F5.1/F5.3 (empresaId em toda query key, política declarativa): o defeito é visível hoje e bloqueia a
   primeira tela do sistema; a F5 generaliza depois.
3. Usar `organizationalContext: { scope: 'query' }` do interceptor: só 2 usos na base e a F5.3 é quem faz esse rollout;
   parâmetro explícito é o padrão de `financeiroApi.ts:52`.
Risco de acesso: `NENHUM`. Risco da fatia: `HIGH` (valor monetário que o operador lê e contexto organizacional).
Reversível: sim. Gatilho de revisita: F5.1/F5.3, que podem absorver o parâmetro explícito.
Quem arbitrou: orquestrador
Impacto: `features/dashboard/**`, testes novos, `CHANGELOG.md`.

### D43 — arbitragem das propostas P-1 a P-6 do planner da `b57`

Data: 2026-09-16
Rodada: sem rodada de debate. Arbitrada sobre o `completed_with_warnings` do nó `planner` da `b57`.
Decisão (todas pela recomendada do planner):
1. **P-1 (b):** os alertas ficam no painel "Último retorno operacional", um `Message warn` por alerta, sem fechar, até o
   próximo retorno ou até sair da página; o toast vira `warn`. Sem persistência.
2. **P-2 (b):** o Correlation ID da transmissão fica somente leitura, novo a cada abertura, sem regenerar sozinho
   depois de erro. O schema também exige o campo.
3. **P-3 (a):** os alertas da consulta de protocolo entram na `b57`, no mesmo painel.
4. **P-4 (b):** `onSettled` em transmitir, reprocessar e consultar protocolo; as demais seguem para a F5.5 (`D37`).
5. **P-5 (a):** o nó `inventario` é pulado; a contagem do planner (10 × 9 campos, 6 × 6, 9 × 9, 4 listas) é a evidência.
6. **P-6 (a):** aviso informativo no CHANGELOG sobre `FISCAL_REPROCESSAR` sem `FISCAL_CONSULTAR`; sem `allPermissions`.
Medição que corrige a seção 0 da `b57`: `accessRisk` é `NENHUM` (o botão Reprocessar já exige `FISCAL_REPROCESSAR`
desde a `b52`, `FiscalOperationalPanels.tsx:144-145`; rota e menu só ganham). As sessões de E2E passam a ser
`CONSULTAR+REPROCESSAR`, `CONSULTAR+EMITIR` e só `REPROCESSAR`.
Alternativas descartadas: as não recomendadas de cada proposta, com o motivo na seção 9 do planner, transcrita no
plano da fatia.
Risco de acesso: `NENHUM`. A fatia continua `CRITICAL` e exige aprovação humana antes do release.
Reversível: sim. Gatilho de revisita: o backend passar a exigir `correlationId` em outras operações, ou mudar o
`TransmissaoSefazResponse`.
Quem arbitrou: orquestrador
Impacto: `features/fiscal/**`, `lib/security/routePermissions.ts`, `layout/AppMenu.tsx`, testes, `CHANGELOG.md`.
