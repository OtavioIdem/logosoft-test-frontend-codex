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
