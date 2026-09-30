# Debate 13 — escopo e entrega — `faturamento` (candidato a `v1.11.0a8b71`)

Agente: `arquiteto-escopo-entrega`. Rodada paralela com `arquiteto-operacao-erp`,
`arquiteto-plataforma-frontend` e `arquiteto-design-system`, sobre o mesmo briefing. Fonte principal:
`docs/arquitetura/debate/13-inventario-faturamento.md` (FT-1 a FT-20, medidos no HEAD `9713de4`). A
proposta externa D91 (branch `codex/b71-planejamento-codex`, commit `38e2213`) é julgada na §2.

**Resumo em uma frase:** a `b71` não consegue entregar "faturamento completo" por nenhuma escolha
da Q2. Mesmo com a natureza de operação na tela, o leg 1 para no endereço fiscal do destinatário, e
esse cadastro é da `b60`/`b61`, que nunca foram entregues. O que a `b71` consegue entregar é o
faturamento **honesto e corrigível**: um contrato do Confirmar que o backend aceita, o resultado
real de cada leg na tela e nenhum beco novo. O "completo" fecha na cauda da D53, que vem logo depois.

---

## 0. Base fixada

```text
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
  → 1.11.0-a.8.b70   1.11.0a8b70

git log --oneline -3
  → 1a35cb9 docs(b71): inventário 13 do faturamento medido no HEAD; ...
    9713de4 docs(b70): registro final — PR #33 e container logosoft-frontend na v1.11.0a8b70
    f25e365 feat(release): v1.11.0a8b70 — ...

ls docs/fatias/ | tail -2   → v1.11.0a8b69-venda.md, v1.11.0a8b70-compra-financeiro.md
git status --short          → só .claude/ e .codex/ (a árvore de features está limpa; o rascunho
                              do Codex saiu para a branch codex/b71-planejamento-codex)
```

A `b70` está aprovada e publicada (PR #33), e não há versão bloqueada. **O próximo slot é
funcional: `b71`.** Uma `.cN` não se aplica pela régua (`04_regua_de_fatiamento.md`: corretiva
existe quando "a versão NN foi bloqueada no review"). A Q9 trata disso.

O documento da fatia é a entrada do `CHANGELOG.md` mais o plano em `docs/fatias/`, e não um
`docs/IMPLEMENTACAO_*` novo (CLAUDE.md, §7.6 do plano da onda).

### 0.1 O que medi além do inventário (e muda a linha de corte)

| Fato | Como medi |
| --- | --- |
| Com `naturezaOperacaoId` informado, o leg 1 resolve o par de UFs de emitente e destinatário **antes** de qualquer item, e isso é "resultado duro, nunca amenizado por flag" | `GerarNotaFiscalPedidoVendaUseCase.cs:140-162` → `CfopDoItemResolver.cs:80-86` |
| O destinatário sem endereço ativo falha com `DestinatarioSemEnderecoFiscal`, e sem município IBGE com `DestinatarioSemMunicipioIbge` | `DestinatarioFiscalResolver.cs:157-186` |
| O frontend não tem **nenhuma** tela de endereço de Pessoa (é a `b60`, não entregue), e `CriarPessoaRequest` não traz endereços | `grep -rni endere features/pessoas features/clientes features/fornecedores` → 0; `PessoaRequests.cs:6` |
| Banco dev: `naturezas_operacao` = **0**, `pessoas_enderecos` = **0**, empresas com `EnderecoFiscal_Uf` preenchida = **0 de 2**, filiais com endereço fiscal = **0** | `docker exec logosoft-postgres psql -U erp_user -d erp` com `count(*)`, 2026-09-29, só leitura |
| Pedidos de venda no dev: 2 `Aprovado`, 1 `Faturado`, 2 `Cancelado`, 1 `AguardandoAprovacao` | `psql`, `group by "StatusPedido"` |
| A resposta do Confirmar traz o faturamento **com legs** (etapa, estado, motivo), inclusive quando termina em `Erro` | `ConfirmarFaturamentoUseCase.cs:166-167,208-209,369-373` (`ConstruirRespostaAsync` → `FaturamentoMapper.ParaResponse(faturamento, legs)`) |
| O Confirmar pode ser **reexecutado** sobre o mesmo faturamento em `Erro`: só recusa `Faturado` e `Cancelado`, e pula o leg 1 quando `NotaFiscalId` já existe | `Faturamento.cs:117-123`; `ConfirmarFaturamentoUseCase.cs:116-118` |
| A trava `NotaJaExisteParaOrigem` não filtra status: **qualquer** nota da origem, até cancelada, prende o pedido para sempre | `FiscalRepository.cs:33-39` (sem `Where` de status) |
| O produto sempre tem `UnidadeMedidaId` (o domínio recusa vazio), então `UnidadeComercialPadrao` só entra se a unidade sumir do cadastro. Dev: 3 de 3 produtos com unidade | `Produto.cs:37,147`; `psql count("UnidadeMedidaId")` |
| O assinador usa o thumbprint recebido sem conferir com a empresa emitente. O transporte SOAP usa sempre o certificado da configuração. O domínio tem um `CertificadoDigital` por empresa/filial, e **nenhum controller o expõe** | `XmlFiscalSigner.cs:26-28`; `SefazSoapClient.cs:40`; `CertificadoDigital.cs:5-27`; `grep -i certificad Erp.Api/**/*Controller.cs` → 0 |
| Nenhum dos dois gates de contrato cobre faturamento | `grep -ci faturament scripts/gate-contract-fields.mjs scripts/gate-contract-request-fields.mjs scripts/backend-response-records.snapshot.json` → 0, 0, 0; lista de módulos em `gate-contract-fields.mjs:551` |
| Uma prerelease `b59` publicada agora ordena **antes** da `b70` (`"b59" < "b70"` na comparação alfanumérica de identificador semver), então "retropublicar a b59" regride a versão | regra de precedência semver 2.0 §11; não executei comparação, é leitura da especificação |

**Consequência:** o `D53` já dizia que "a nota só valida de ponta a ponta depois de `b61`". O
inventário mediu o bloqueio da natureza (FT-2), e o código mostra o bloqueio seguinte, o
destinatário. Nenhuma escolha da Q2 leva o faturamento ao leg 4 sem a `b60`/`b61`, ou sem dados
semeados por fora da tela. **Isto é leitura de código, e não execução:** nenhum faturamento do dev
passou do leg 1.

---

## 1. O marco em jogo

O plano chama a `b71` de "Faturamento completo e corrigível". Pela §0.1, "completo" (pedido
aprovado → NF autorizada → estoque baixado → título) **não está ao alcance desta versão**. Proponho
dividir o marco em dois, com dono e ordem:

| Marco | O que precisa estar em produção | Onde fecha |
| --- | --- | --- |
| **Corrigível e honesto** | o Confirmar envia o que o backend exige; a tela diz o resultado real de cada leg; o operador não cria faturamento preso nem vê verde onde houve erro; o motivo do bloqueio de cadastro aparece com o texto do backend | `b71` |
| **Completo** | natureza com mapeamento de CFOP cadastrável; endereço e município do destinatário cadastráveis; bloco fiscal da Pessoa | cauda da D53 (`b59`→`b60`→`b61`, renumeradas), logo após a `b71` |

Se o orquestrador mantiver "completo" como critério de aceite da `b71`, a versão só fecha
absorvendo três versões da F3, e isso é `SCOPE_TOO_LARGE`. Registro isso como pendência, e não como
posição.

---

## 2. A proposta D91 (Codex): o que adoto e o que recuso

**Adoto:**

1. A natureza vem de **consulta** ao `GET /api/fiscal/naturezas-operacao` que já existe, filtrada
   por empresa, só as ativas. O payload leva `naturezaOperacaoId` e nunca aceita GUID digitado.
2. Não existe fallback de texto livre para a natureza, e a tela não orienta a desligar a validação
   fiscal para contornar o bloqueio.
3. `certificateThumbprint` continua fora do Faturamento.
4. `correlationId` gerado e somente leitura.
5. A manutenção de naturezas **não entra na `b71`**.

**Recuso:**

| Ponto da D91 | Por que recuso | Evidência |
| --- | --- | --- |
| **"A `b59` vira dívida técnica"**, sem versão | A régua não aceita "fora" para o que o operador precisa. Se a manutenção ficar fora para sempre, ninguém fatura pela tela, porque não há de onde a natureza venha. Isso é **"depois"**, com número. A D53 e a D56 dizem que a sequência fiscal "não se replaneja". Adiar a ordem é aceitável, mas declará-la dívida sem gatilho é replanejar | D53; D56; `04_regua_de_fatiamento.md` ("Marcar como fora o que é depois") |
| **Premissa:** consumir a natureza torna "a confirmação fiscal funcional" | Falso pelo código. O próximo bloqueio é o destinatário sem endereço, e a tela dele é a `b60` | §0.1, `DestinatarioFiscalResolver.cs:157-186` |
| **CFOP por dropdown do catálogo, enviando o código** | O CFOP é só conferência: sem natureza é ignorado, e com natureza o derivado manda, de modo que um valor divergente vira 400. Um dropdown gasta a correção do FT-7 (`value=id`) e a dependência de `FISCAL_CADASTROS_CONSULTAR` para oferecer ao operador uma única capacidade nova: errar. **Proponho tirar o campo** (Q4) | inventário §4, §6, FT-7; `GerarNotaFiscalPedidoVendaUseCase.cs:208-216` |
| **Confirmar indisponível sem os catálogos de UF, CFOP e unidade** (e sem as permissões deles) | Isso acopla a confirmação a três permissões auxiliares para campos que são conferência (CFOP), fallback morto (unidade, §0.1) ou lista que não reflete a regra (UF, FT-6). Só a natureza é pré-requisito real | rascunho `FaturamentoDialogs.tsx:110-122` da branch; §0.1 |
| **`accessRisk: AUTO_BLOQUEIO`** | Categoria errada. AUTO_BLOQUEIO é perder a permissão de devolver permissão (`risk.yaml:84-91`). Aqui ninguém conclui um faturamento hoje (FT-1 derruba o leg 4 em todo caminho), então exigir `FISCAL_CADASTROS_CONSULTAR` tira um botão que já falha. É **`ILUSAO`**, com a ressalva do trade-off T3 (§9) | `risk.yaml:66-73`; FT-1 |
| **Filtro de ativas no cliente**, sobre a página 1 de 20 | Pode esconder natureza ativa atrás de 20 inativas. A D51 item 2 já mandou passar `somenteAtivas=true` ao servidor | D51; rascunho `useNaturezasOperacaoConsulta.ts` |
| **Arquivos `naturezasOperacaoConsulta*`** | Criam um segundo client para o recurso que a D47 nomeou `naturezasOperacaoApi.ts`, e a futura `b59` duplicaria ou renomearia. Isso é barato de acertar agora e caro depois (é a classe "queryKey compartilhada" da régua). A consulta entra **já com o nome da D47**, e a `b59` a estende | D47 item 1 |
| **"Com orientação explícita do usuário"** | Não posso verificar. Não veio neste briefing. Se o usuário decidiu que a manutenção de naturezas não se constrói, o "depois" da §7 vira uma pergunta a ele: quem cadastra natureza em produção? Pendência F-1 | briefing, item 4 ("NÃO travada") |

O rascunho do Codex também não trata o FT-3 (verde falso), a Q5 (becos), o FT-9 (lista sem
empresa) nem as heranças da D80. Como plano da `b71`, ele é estreito demais em honestidade e largo
demais em catálogo.

---

## 3. Posição por decisão

### Q1 — FT-1, `correlationId`: **dentro**

- **Quem gera:** o frontend, **um por abertura do diálogo de Confirmar**, pelo mesmo gerador do
  Fiscal (`createFiscalCorrelationId`, `fiscalUiUtils.ts:512-524`, precedente da b57/D43 P-2). O
  fluxo é `faturamento-confirmar`, e cabe nos 100 caracteres, porque a soma dos segmentos dá no
  máximo 85 (inventário §5).
- **Idempotência no reenvio:** o frontend não precisa inventar nada. Contra o duplo clique, basta o
  botão em `loading`. Contra a retransmissão, o backend não chama a SEFAZ de novo com o leg 4
  `Integrado` (`ConfirmarFaturamentoUseCase.cs:188-190`). Uma nova tentativa depois de falha abre o
  diálogo de novo e gera um ID novo, que é o comportamento seguro enquanto a B-25 não responde se o
  mesmo ID seria recusado (`IntegracaoFiscalJaProcessada`).
- **Como aparece:** um campo somente leitura no diálogo, copiável. Não aparece na listagem nem no
  detalhe, porque o `FaturamentoResponse` não o devolve.
- **Reversível:** sim. É uma convenção de string num campo que o backend já aceita.

### Q2 — FT-2, natureza de operação: **consulta dentro; manutenção "depois", com número**

**Posição:** a `b71` põe o seletor de natureza ativa da D91, com os ajustes da §2. A manutenção vem
na primeira versão depois da `b71` (§7), e não como dívida.

Custo operacional de cada caminho, medido onde deu:

| Caminho | O operador consegue faturar? | Custo | Reversível |
| --- | --- | --- | --- |
| **(a) Só consulta (adotado)** | Não, até existir natureza **e** endereço do destinatário. Hoje o dev tem 0 e 0 | Com 0 naturezas, o seletor vem vazio e o Confirmar fica indisponível com motivo; a natureza só entra por API ou implantação. A versão entrega FT-1/FT-3/Q5, que valem sozinhos | sim |
| (b) Absorver a `b59` na `b71` | **Continua não**: o leg 1 para no destinatário (§0.1) | Pelo plano do próprio Codex, a `b59` tem 10 ACs, `newScreen`, `navigationChange`, a migração da D47 item 3, que mexe nos consumidores de Tributação, e risco `HIGH`. A `b71` carregaria dois perfis de risco sem desbloquear nada | sim, mas cara |
| (c) Nada | Não | Continua o 400 no leg 1 (`CfopNaturezaOperacaoNaoInformada`), e o operador descobre só no clique | sim |

O argumento decisivo contra (b) é o do **motor sem chamador ao contrário**. A tela de manutenção
teria chamador (o seletor da `b71`), mas o fluxo que ela alimenta continuaria morto por outro
cadastro. Pagar a `b59` dentro da `b71` compra zero faturamento concluído.

**Estado vazio obrigatório do seletor:** "Nenhuma natureza de operação ativa para esta empresa. O
faturamento só é confirmado com natureza cadastrada." Sem link, porque a tela de destino não existe
(D50 item 3: link só na fatia que cria o destino).

### Q3 — FT-3, resultado real por leg: **dentro, sem pergunta ao backend**

A resposta já traz etapa e legs com motivo (§0.1). A P-7 do inventário deixa de ser pré-requisito.

- O toast passa a sair de `ConfirmarFaturamentoResponse.faturamento.etapa`, e não do fato de a
  chamada ter retornado 200.
  - Etapa `Erro`: toast de erro com o leg que falhou e o `motivo` dele, lidos da resposta.
  - Etapa final de sucesso: o toast verde de hoje.
  - Etapa intermediária: aviso neutro com o nome da etapa.
- O detalhe já reconsulta e já mostra a tabela de legs com motivo (D25, D27). Não entra componente
  novo.
- Custo: um ramo no `onSuccess` e um teste de componente que alimenta a resposta com etapa `Erro`.
  Fechar isso depois custaria mais que a própria correção.

### Q4 — UF, CFOP e unidade como dropdown: **nenhum dos três vira dropdown na `b71`**

| Campo | Posição | Por quê | Gatilho de volta |
| --- | --- | --- | --- |
| UF autorizadora | continua texto, com `length(2)` e regex `^[A-Za-z]{2}$` no schema (FT-5) | As 27 UFs do catálogo não são as UFs válidas: válida é a UF com endpoint SEFAZ configurado, que nenhuma rota lista (FT-6). O dropdown trocaria erro de digitação por erro de escolha e ainda exigiria `FISCAL_CADASTROS_CONSULTAR` | B-26: o backend expor as UFs configuradas, ou ler `DefaultUfAutorizadora` |
| CFOP padrão | **o campo sai do diálogo**; o request vai sem `cfopPadrao` | É conferência. O derivado manda; sem natureza, o valor é ignorado; divergente, vira 400. Para o operador, o campo só serve para errar | o backend tornar `CfopPadrao` fonte validada (o gatilho da própria D91), ou a operação pedir para **ver** o CFOP derivado, o que seria leitura via `GET .../{id}/cfop` e não input |
| Unidade comercial padrão | continua texto, `max(20)`, com uma dica de que é fallback | O produto sempre tem unidade (§0.1). O campo só vale se a unidade sumir do cadastro, e o backend o exige `NotEmpty` | B-29 (P-4): qual catálogo, e se deixa de ser obrigatório |

O item do plano "UF, CFOP e unidade como dropdown" **sai da `b71`** por evidência que o plano não
tinha. "Layout da modal ampliado" sai junto, porque o diálogo perde um campo (CFOP) e ganha um
(natureza).

### Q5 — Três caminhos a partir de Aprovado: **texto e pré-checagem dentro; nenhum botão removido**

O pedido `00014` está preso para sempre no módulo Faturamento. A nota do Fiscal prende a origem sem
olhar status (`FiscalRepository.cs:33-39`), e **nenhuma ação de frontend o destrava**. É a B-28 do
backend. A `b71` impede que o próximo pedido entre nesse beco:

1. **Preparar:** antes de criar, lista os faturamentos do pedido pelo filtro `pedidoVendaId`, que
   já existe no backend (`FaturamentoRepository.cs:38`) e no tipo do frontend, onde está declarado
   e hoje nunca é preenchido (FT-20). Havendo algum em `Erro`, o diálogo mostra esse faturamento com
   link e diz a verdade: "Confirmar de novo o faturamento existente reprocessa a partir do leg que
   falhou; preparar outro não reaproveita a nota". Não bloqueia: o backend permite, e bloquear
   seria inventar regra. O texto falso "ele é reaproveitado" (`FaturamentoDialogs.tsx:56`, FT-10)
   sai.
2. **Combo do Preparar:** só pedidos `Aprovado` (FT-11), com o aviso de teto da D78 quando a
   resposta vier com 200.
3. **"Gerar NF" (pedido):** o diálogo ganha uma frase de efeito. Gerar a nota por aqui vincula o
   pedido a ela, e o módulo Faturamento deixa de conseguir faturar esse pedido.
4. **"Faturar" (pedido):** herança da D80 (Q7). O diálogo diz que o faturamento é só lógico, sem NF
   nem título, e que o pedido sai do alcance do módulo Faturamento.

**Fora:** esconder ou remover "Faturar" ou "Gerar NF". Seria `accessRisk: CAPACIDADE`: as duas ações
funcionam hoje para quem tem `VENDAS_FATURAR`/`FISCAL_EMITIR`. Qual caminho é o canônico é pergunta
ao produto (F-2), e não decisão de escopo. Gatilho de volta: resposta à F-2.

### Q6 — B-6, `certificateThumbprint` no Fiscal: **fora da `b71`; o risco real está na API**

- **Faturamento:** continua sem o campo (dentro, sem custo). Enviar `null` usa o certificado do
  servidor (`XmlFiscalSigner.cs:26-28`).
- **Fiscal (`FiscalActionDialogs.tsx:399`):** não removo na `b71`, por dois motivos medidos.
  1. **A remoção não fecha o buraco.** O assinador aceita qualquer thumbprint do store sem conferir a
     empresa (§0.1). Tirar o campo da tela não impede ninguém de chamar a API com ele. A correção é
     do backend: resolver o certificado pela empresa, com o `CertificadoDigital` que já existe no
     domínio, e recusar thumbprint alheio. Isso vai como refinamento da **B-6**, com a hipótese de
     assinatura cruzada entre empresas escrita. É leitura de código: **não verifiquei** se há mais
     de um certificado no store de alguma instalação.
  2. **`accessRisk`: `CAPACIDADE`, por falta de medição.** Numa instalação com vários certificados, o
     campo é hoje o único jeito de assinar com outro certificado, e não há persistência do valor
     digitado que eu possa contar. Pelo `risk.yaml:75-83`, isso exige decisão explícita do usuário,
     e não cabe como carona numa versão de Faturamento.
- Gatilho de volta: resposta à B-6, ou a decisão do usuário de remover já, classificando como
  CAPACIDADE, com item próprio no CHANGELOG. Reversível: sim, é um campo.

### Q7 — Heranças da D80: **dentro, as duas**

- **Resumo no Faturar:** o padrão `AprovacaoResumo` da D79, com número, cliente por rótulo, itens e
  total a partir de `pedidoVendaQueryKey` já em cache, mais o `ApiErrorPanel` e o texto de efeito
  (FT-14). O toast deixa de falar só de estoque.
- **V11:** `documento` fica opcional com `.max(80)`, `observacao` ganha `.max(300)`, e o rótulo perde
  o `*` (FT-13). O backend aceita nulo (`PedidoVendaValidators.cs:73-79`). Reversível: sim. O
  payload fica mais permissivo dentro do que o backend já aceita, e isso não cria formato novo.

### Q8 — Menores

| Item | Posição | Razão |
| --- | --- | --- |
| FT-9, lista sem `empresaId` | **dentro**: `enabled: Boolean(empresaId)` | É a quarta ocorrência da classe D82/D88. Hoje dá 400 em contexto global |
| FT-4, tipo de documento com 6 opções | **dentro**: só NFe e NFCe no dropdown e no schema | O backend aceita 2 (`FaturamentoValidators.cs:20-21`). Oferecer 6 é oferecer 4 recusas |
| FT-5, limites | **dentro**: série 20, número 40, unidade 20, UF 2, observação do Preparar 500; Faturar 80/300 | Uma linha de schema cada, e o backend recusa com 400 hoje |
| **"Validar dados fiscais" (checkbox)** | **dentro: o checkbox sai, e o Confirmar envia sempre `true`** | Desmarcar hoje não conclui nada (FT-1). Depois da correção do FT-1, desmarcar viraria o atalho para passar o leg 1 sem natureza, **criando uma nota sem CFOP presa à origem para sempre** (`FiscalRepository.cs:33-39`), que é dado irreversível. `accessRisk: ILUSAO` por leitura de código. Gatilho de volta: B-28 (nota de origem reaproveitável ou removível) ou pedido do fiscal |
| Erro de cadastro no leg 1 (400) | **dentro**: `ApiErrorPanel` no diálogo, com o texto do backend, sem mapa por código | O operador precisa saber **qual** cadastro falta. A mensagem do backend já diz, e o link fica para a fatia que cria o destino (D50) |
| FT-15, GUID cru | **dentro só no detalhe**: `pedidoVendaId` vira o link "Abrir pedido". **Fora na lista** | No detalhe basta a navegação. Na lista, precisaria de uma chamada por linha (o anti-padrão que a D79 recusou). Gatilho: B-30 (número do pedido no `FaturamentoResponse`) |
| `contaReceberId` cru no detalhe | **fora** | Só existe depois do leg 6, que nenhum faturamento alcança antes da `b61`. Gatilho: o primeiro faturamento chegar ao leg 6 |
| FT-18, a rota admite CONFIRMAR/CANCELAR sem CONSULTAR | **fora** | Quem entra vê `UnauthorizedState`. Não há capacidade nem mentira operacional, e a correção toca `routePermissions.ts`, que pesa em 30+ testes estruturais. Gatilho: a varredura F5 de permissões, ou uma queixa real |
| `FATURAMENTO_REVERTER_INTEGRACAO` | **fora** (D24 vale) | Não se reinterpreta a D24 |
| FT-19, documentação do backend atrasada | **fora** (não é nosso artefato) | Vai como nota ao backend |
| FT-20, `normalizePaged` morto | **dentro, de passagem** | A `b71` toca `faturamentoApi.ts` para usar `pedidoVendaId`. Remover o ramo morto custa uma linha e um teste que já existe |

### Q9 — Fatiamento: **uma `b71` só, em blocos ordenados; o gate de request entra, o de response fica para depois com gatilho**

- **Não a `.cN`.** Nenhuma versão está bloqueada, então pela régua uma corretiva não tem de quem
  ser. O critério da D56 ("campo que corrompe dado vira `.cN`") até alcançaria o FT-1/FT-3, mas a
  divisão não compra nada: separar o FT-1 não faz ninguém faturar mais cedo, porque o leg 1 continua
  parando na natureza e no destinatário. Custaria um ritual inteiro (plano, branch, carimbo,
  CHANGELOG, QA) para um desbloqueio que não se observa. A mesma lógica da D82 e da D90 vale aqui:
  uma versão, em blocos.
- **O gate de campos cobre os responses de faturamento? Não.** Medi: 0 ocorrências nos dois gates e
  no snapshot (§0.1).
  - **Gate de request: dentro.** O `ConfirmarFaturamentoRequest` e o `FaturarPedidoVendaRequest` entram
    no `gate-contract-request-fields.mjs`. É a classe do defeito desta rodada (campo que o backend
    exige e o schema não tem), e a **prova vermelha já existe**: na `b70`, o gate tem de acusar
    `correlationId` e `naturezaOperacaoId` pelo nome. `certificateThumbprint` (B-6) e `cfopPadrao`
    (Q4) entram na allowlist, cada um com o motivo e a decisão que o justifica.
  - **Gate de response: depois.** O inventário mediu 0 divergências em 46 posições. Não existe árvore
    com o defeito conhecido para o gate provar que fica vermelho, e um gate só verde não é aceito
    (CLAUDE.md). Gatilho: a primeira mudança em `faturamento.types.ts` de response, ou em
    `FaturamentoContracts.cs`. Veja "o que eu abro mão".

---

## 4. Perguntas: o que se resolve lendo e o que só o backend decide

**Já resolvido por leitura (não vira pergunta):**

- Quem gera o `correlationId`: o chamador (inventário §5).
- O resultado por leg: está na resposta do Confirmar (§0.1). A P-7 deixa de ser pré-requisito.
- Reprocessar um faturamento em `Erro` é o caminho: sim (§0.1).
- O CFOP é derivado, e `cfopPadrao` é só conferência (inventário §4).
- A unidade é fallback, e o produto sempre tem unidade (§0.1).
- Thumbprint nulo usa o certificado do servidor (inventário §7).

**Só o backend decide (continuo a numeração a partir da B-24):**

| Id | Pergunta | Decide |
| --- | --- | --- |
| **B-25** | Depois de uma falha no leg 4, uma nova tentativa com o **mesmo** `correlationId` é recusada (`IntegracaoFiscalJaProcessada`)? O validator do Confirmar deveria exigir o campo, em vez de aceitar nulo e falhar com 200 no leg 4? (P-1) | se o ID continua novo a cada abertura ou passa a ser estável por faturamento |
| **B-26** | Vai existir uma fonte das UFs com endpoint SEFAZ configurado, ou o uso de `DefaultUfAutorizadora`? (P-2) | se a UF vira dropdown |
| **B-6 (refinada)** | Com o thumbprint nulo usando o certificado do servidor, o modelo é um certificado por instalação? O assinador deveria resolver pelo `CertificadoDigital` da empresa e **recusar** thumbprint de outra empresa (`XmlFiscalSigner.cs:26-28` não confere)? | a remoção do campo no Fiscal e a sua classificação de `accessRisk` |
| **B-28** | A trava `NotaJaExisteParaOrigem` deveria ignorar nota cancelada, ou o leg 1 deveria vincular a nota em rascunho da mesma origem? E o Preparar deveria reaproveitar o faturamento em `Erro`? (P-5) | o destravamento do `00014` e a volta do checkbox de validação |
| **B-29** | A unidade comercial padrão vem de `UnidadeMedida` ou de `UnidadeTributavel`, e continua `NotEmpty` sendo fallback? (P-4) | se a unidade vira dropdown ou sai |
| **B-30** | O `FaturamentoResponse` vai trazer o número do pedido? | o GUID cru na lista (FT-15) |

**Só o produto ou o cliente decide (não é backend):**

- **F-1:** quem cadastra natureza de operação e endereço de destinatário **em produção**: a
  implantação, pela API, ou o usuário fiscal do cliente, pela tela? E existe hoje, em produção,
  alguma natureza ou algum `pessoas_enderecos` com município? Não medi: só tenho o banco dev.
  **Esta pergunta decide se a cauda da D53 é urgente ou só necessária.** Ela é o meu produto desta
  rodada.
- **F-2:** qual é o caminho canônico a partir de Aprovado: o Faturar lógico, Gerar NF ou o módulo
  Faturamento? (P-6)
- **F-3:** a "orientação explícita do usuário" citada na D91 existe? Se existe, ela reclassifica a
  `b59` de "depois" para uma decisão do usuário, que precisa ser escrita como Dn.

---

## 5. As três listas

### Dentro (`b71`)

1. `correlationId` gerado a cada abertura, somente leitura e enviado (Q1).
2. Seletor de natureza ativa: consulta com `somenteAtivas=true` no servidor, por empresa, com os sete
   estados, e com os nomes de arquivo da D47 (Q2).
3. O Confirmar fica indisponível com motivo quando não há natureza, e sem
   `FISCAL_CADASTROS_CONSULTAR` informa a permissão que falta (Q2).
4. O checkbox "Validar dados fiscais" sai, e o envio é sempre `true` (Q8).
5. O campo CFOP padrão sai, e o request vai sem ele (Q4).
6. UF com regex; unidade e série/número com limites; tipo de documento com 2 opções (Q4, Q8).
7. O toast do Confirmar sai da etapa da resposta, com leg e motivo no caso de `Erro` (Q3).
8. `ApiErrorPanel` no diálogo do Confirmar, para o 400 de cadastro do leg 1 (Q8).
9. Preparar: pré-checagem por `pedidoVendaId`, texto honesto, combo só `Aprovado` e aviso de teto
   (Q5).
10. Frases de efeito nos diálogos "Gerar NF" e "Faturar" do pedido (Q5).
11. Faturar: resumo da D79, `ApiErrorPanel` e V11 (Q7).
12. Listagem com `enabled` por empresa (FT-9).
13. Link "Abrir pedido" no detalhe, no lugar do GUID (FT-15 parcial).
14. O gate de request cobre o `ConfirmarFaturamentoRequest` e o `FaturarPedidoVendaRequest`, com
    prova vermelha na `b70` (Q9).
15. O ramo morto `normalizePaged` sai (FT-20).

### Depois (tem de voltar, com versão ou gatilho concreto)

| Item | Quando |
| --- | --- |
| Manutenção de naturezas com mapeamento de CFOP (conteúdo da `b59`) | **primeira versão após a `b71`** (§7) |
| Endereços da Pessoa (conteúdo da `b60`) | segunda versão após a `b71` |
| Bloco fiscal da Pessoa e município (conteúdo da `b61`) | terceira versão após a `b71` |
| Gate de campos de response para o faturamento | primeira mudança de tipo de response de faturamento, dos dois lados |
| Link do erro de cadastro (`CfopSemMapeamentoParaAmbito`, `DestinatarioSem*`) | na fatia que criar cada tela de destino (D50) |

### Fora (cada um com razão e gatilho)

| Item | Razão | Gatilho de volta |
| --- | --- | --- |
| Dropdown de UF | as 27 não são as válidas (FT-6) | B-26 |
| Dropdown de CFOP, ou o campo CFOP em qualquer forma | é só conferência | CFOP virar fonte validada, ou pedido de ver o derivado |
| Dropdown de unidade | fallback morto | B-29 |
| Modal ampliada | não há campo novo líquido | design mostrar que o resultado de leg não cabe |
| Remover o thumbprint do Fiscal | a remoção não fecha o buraco da API; é `CAPACIDADE` não medida | B-6 refinada, ou decisão do usuário |
| Remover ou esconder "Faturar" e "Gerar NF" do pedido | `CAPACIDADE` | F-2 |
| GUID de pedido na lista e `contaReceberId` no detalhe | pediria chamada por linha; o leg 6 é inalcançável hoje | B-30; primeiro faturamento no leg 6 |
| Coerência rota × tela de CONFIRMAR/CANCELAR, e `RETOMAR_REVERSAO` na rota | sem efeito operacional | varredura F5, ou queixa |
| `FATURAMENTO_REVERTER_INTEGRACAO` no union | D24 | a D24 ser revista |
| Destravar o `00014` e casos iguais | não há ação de frontend possível | B-28 |

**Teste do "fora para sempre":** se tudo o que está em "fora" ficar fora para sempre, o operador
fatura? **Sim, desde que o "depois" chegue.** Nenhum item de "fora" está no caminho da confirmação.
Os três primeiros itens de "depois" estão, e por isso **não** estão em "fora".

---

## 6. Sequência dentro da `b71`, com a dependência de cada passo

| Bloco | O quê | Depende de | Por quê nessa ordem |
| --- | --- | --- | --- |
| **A. Contrato do Confirmar** | tipos, schema (correlação, natureza, validação `true`, sem CFOP, limites, 2 tipos de documento) e o gate de request com a prova vermelha na `b70` | nada | O gate prova o defeito antes da correção (D55: "o gate da classe vem antes da correção"). O diálogo só envia depois do schema |
| **B. Consulta de natureza** | client, hook e schema de response em `features/fiscal` com os nomes da D47 | A (o tipo do campo) | o seletor precisa do hook |
| **C. Diálogo do Confirmar** | seletor com 7 estados, correlação visível, indisponível com motivo, `ApiErrorPanel` | A, B | "estado de tela antes de ação crítica com bloqueio" (régua) |
| **D. Resultado real** | toast pela etapa da resposta (FT-3) | A (a resposta tipada é lida) | independe de C, mas se testa no mesmo diálogo |
| **E. Becos** | pré-checagem do Preparar, combo `Aprovado`, textos de Gerar NF e Faturar | A (`pedidoVendaId` no client) | independente de C e D |
| **F. Herança da D80** | resumo, `ApiErrorPanel` e V11 no Faturar | nada | toca `features/vendas`; o gate de request do bloco A cobre o V11 |
| **G. Listagem e detalhe** | `enabled` por empresa, link do pedido | nada | é o bloco mais barato; fica por último porque não bloqueia os outros |

## 7. Sequência de versões depois da `b71`

| Versão | Conteúdo | Dependência que a justifica |
| --- | --- | --- |
| `b71` | faturamento honesto e corrigível (§5) | o FT-1 e o FT-3 atingem **todo** caminho, com ou sem natureza, e o FT-1 derrubaria a `b59` de qualquer jeito, então vem primeiro |
| `b72` | naturezas com mapeamento de CFOP: o conteúdo da `b59` pelo plano existente, estendendo o client da `b71` | a D53 põe naturezas antes de Pessoa. O seletor da `b71` passa a ter dado |
| `b73` | endereços da Pessoa: o conteúdo da `b60` | `DestinatarioSemEnderecoFiscal` é o bloqueio seguinte no leg 1 |
| `b74` | bloco fiscal da Pessoa e município: o conteúdo da `b61` | `DestinatarioSemMunicipioIbge` e os `DestinatarioSem*`. **Aqui o "completo" fecha**, como a D53 previu |

A renumeração segue o precedente da D67. Retropublicar como `b59` regride a versão (§0.1). A
numeração exata é do orquestrador, e a **ordem** é o que eu defendo. Isso muda a onda:
`b71` fecha o anexo de melhorias, e a próxima frente é **a F3 que ficou aberta**. A régua diz "não
abre frente paralela sem fechar a anterior", e a F3 nunca fechou.

Se a F-1 disser que a implantação semeia naturezas e endereços pela API em produção, a `b72`–`b74`
deixam de ser urgentes, mas continuam necessárias: sem elas, ninguém corrige um cadastro fiscal pela
tela.

## 8. Fatiamento: o que a `b71` entrega quando fecha

| Entrega observável | Prova que falha se quebrar |
| --- | --- |
| O Confirmar envia `correlationId` e `naturezaOperacaoId`, com `validarDadosFiscaisProduto: true` e sem `cfopPadrao` | `tests/unit/faturamentoPayload.test.ts` (asserção nominal por campo) e o gate de request (vermelho na `b70`, verde na `b71`) |
| Seletor de natureza com vazio, erro com tentar de novo, sem permissão e ação indisponível com motivo | `tests/components/ConfirmarFaturamentoDialog.test.tsx`, uma sessão por estado |
| O ID de correlação é novo a cada abertura e somente leitura | o mesmo teste de componente: abre duas vezes e compara |
| Confirmação com etapa `Erro` mostra erro com leg e motivo, e não verde | teste de componente de `FaturamentoDetalhePage` com resposta mockada, mais a extensão de `tests/e2e/faturamento-legs.spec.ts` (mockado, receita isolada da porta 3411, duas rodadas) |
| O Preparar mostra o faturamento em `Erro` existente e lista só `Aprovado` | teste de componente do Preparar |
| O Faturar mostra o resumo, aceita documento vazio e recusa 81 caracteres | `tests/unit/vendasPayload.test.ts` e o teste do diálogo (a varredura inclui `AprovarPedidoVendaDialog.test.tsx`, que importa o mesmo arquivo) |
| A lista não chama sem empresa | teste de hook (0 GET sem `empresaId`) |

**Varredura antes do push:** todo teste que referencia um arquivo tocado, pela lista do inventário
§13. Como a `b71` toca `FiscalActionDialogs.tsx` (a frase do Gerar NF), **a varredura inclui os testes
`fiscal*`**, e é cara. A memória do projeto registra que o recorte por módulo deixou o CI vermelho
na b68 e na b69.

## 9. Trade-offs aceitos

| # | O que se perde | Quando dói | Reversível |
| --- | --- | --- | --- |
| T1 | A `b71` sai sem nenhum faturamento concluído pela tela | **No dia do release**, se alguém esperar "faturamento completo". Por isso o CHANGELOG tem de dizer, na seção operacional, que a confirmação só conclui depois da `b74`, ou com natureza e endereço semeados pela API. Sem essa frase, o trade-off vira mentira | sim |
| T2 | O campo CFOP some, e o operador não vê que CFOP sairá | quando um fiscal quiser conferir o CFOP antes de transmitir. Hoje ele digitaria e erraria; depois da `b72`, o derivado pode ser mostrado por leitura | sim |
| T3 | Confirmar passa a exigir `FISCAL_CADASTROS_CONSULTAR` (natureza) | **na `b74`**, quando confirmar passar a concluir: quem tem só `FATURAMENTO_CONFIRMAR` vai ver indisponível. Hoje é `ILUSAO`; na `b74` deixa de ser. **Obrigação:** a `b71` escreve a ordem de concessão no CHANGELOG já agora, e a `b74` repete | sim |
| T4 | O checkbox de validação some | se alguém usava "validação desligada" para gerar rascunho sem NCM para conferência. Hoje isso não conclui (FT-1), então quem usava ficava com uma nota presa | sim |
| T5 | UF continua texto | a cada digitação de UF sem endpoint configurado; o efeito exato (erro ou reprocesso) **não foi verificado** (FT-6) | sim |
| T6 | Gate de response fica para depois | quando o backend renomear ou tornar anulável um campo de `FaturamentoResponse` e a tela, que na `b71` passa a ler a resposta do Confirmar, quebrar sem gate | sim, mas com juros (ver §10) |
| T7 | O `00014` continua preso | agora, para esse pedido; a tela passa a mostrar o faturamento em `Erro` com a verdade, mas não o destrava | depende da B-28 |

## 10. O que eu abro mão

1. **Abro mão da prova estrutural do lado da resposta (T6), e isso é corte de prova, dito na
   cara.** A `b71` passa a **ler** `ConfirmarFaturamentoResponse.faturamento.etapa` e os legs, uma
   leitura nova, que é justamente onde a classe D71 nasce. Não ponho o gate de response porque não
   existe árvore com o defeito para provar o vermelho, e gate só verde não é aceito. O preço é real:
   quando o gatilho disparar, a extensão vem com plano, snapshot, prova e revisão próprios. Se
   `plataforma` mostrar um jeito de provar o vermelho sem árvore histórica que o `risk.yaml` aceite
   (um mutante nominal na prova durável, como `gateContractRequestFields.test.ts` faz), **retiro o
   corte** e o gate entra no bloco A.
2. **Abro mão do "completo" no nome da versão.** É a posição mais arriscada da rodada. Se o
   orquestrador ler o plano como compromisso de "faturamento completo na `b71`", a minha linha de
   corte o descumpre de propósito. Prefiro isso a absorver três versões da F3 numa só.
3. **Abro mão de destravar o `00014`.** Não há corte seguro de frontend que o faça. Qualquer
   "cancelar a nota e tentar de novo" pela tela esbarra no repositório sem filtro de status.
4. **O corte do checkbox de validação é o mais discutível.** Ele se apoia em leitura de código, e
   não em execução: afirmo que desmarcar criaria nota sem CFOP presa à origem. Se `operação` mostrar
   um uso legítimo que conclui, o que o FT-1 torna improvável hoje, a Q8 volta a checkbox com texto
   de consequência. Não retiro o corte sem essa evidência, porque o dano que ele evita é
   irreversível.
5. **Abro mão de medir a produção.** Todo número deste documento vem do banco dev. A F-1 pode
   mostrar que produção já tem naturezas e endereços, e aí a `b71` concluiria faturamentos no dia do
   release. Nesse caso, o T3 dói **já na `b71`**, e a classificação sobe de `ILUSAO` para `CAPACIDADE`.
   O CHANGELOG da `b71` deve tratar a ordem de concessão como pré-requisito de deploy, por
   precaução.

## 11. Como discordo (registro preventivo)

> **Discordo de `arquiteto-operacao-erp` se ele quiser a manutenção de naturezas (b59) dentro da
> `b71`.** Ela não é pré-requisito do marco "corrigível e honesto", porque, mesmo com ela, o leg 1
> para em `DestinatarioSemEnderecoFiscal` (`DestinatarioFiscalResolver.cs:157-165`; dev com 0
> `pessoas_enderecos`). Proponho a `b72`, logo em seguida. Gatilho: o release da `b71`. Reversível:
> sim, é tela nova sem mudança de payload. Se ele mostrar que em produção há endereço de
> destinatário e falta só a natureza (F-1), **retiro a objeção**: aí a `b59` passa a ser o único
> bloqueio e deve entrar na `b71`.

> **Discordo de `arquiteto-design-system` se ele quiser os três dropdowns (UF, CFOP e unidade) e a
> modal ampliada nesta versão.** O CFOP é conferência, a unidade é fallback morto e as 27 UFs não
> são as válidas (§3, Q4). Um dropdown sobre a fonte errada é um padrão visual correto que conduz ao
> erro. Proponho fora, com os gatilhos B-26, B-29 e CFOP-fonte. Reversível: sim, é campo.

> **Discordo de `arquiteto-plataforma-frontend` se ele quiser dividir em `.cN` (FT-1/2/3) e `b71`
> (UX).** Separar o FT-1 não faz nenhum faturamento concluir mais cedo, porque a natureza e o
> destinatário continuam bloqueando o leg 1, e o ritual custa uma versão inteira. Se ele mostrar um
> caminho em que a `.cN` sozinha conclui um faturamento no dev, retiro a objeção.

> **Discordo da D91 do Codex em cinco pontos (§2):** a "dívida" sem versão, a premissa de
> funcionalidade, o CFOP por catálogo, o bloqueio pelos três catálogos e o `AUTO_BLOQUEIO`.
> Reversível: todos os meus cortes o são. O que não aceito é declarar "dívida" o cadastro sem o qual
> ninguém fatura.

---

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "faturamento",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/13-escopo-faturamento.md",
  "decisoesPropostas": [
    { "id": "E13-1", "titulo": "Marco da b71 é 'honesto e corrigível', não 'completo': o leg 1 com natureza para em DestinatarioSemEnderecoFiscal (b60/b61 não entregues; dev 0 pessoas_enderecos, 0 naturezas, 0 empresas com endereço fiscal)", "reversivel": true, "gatilho": "F-1 mostrar que produção já tem naturezas e endereços de destinatário" },
    { "id": "E13-2", "titulo": "correlationId gerado pelo frontend a cada abertura do diálogo, somente leitura, pelo gerador do Fiscal (b57)", "reversivel": true, "gatilho": "B-25 exigir ID estável por faturamento" },
    { "id": "E13-3", "titulo": "Natureza: seletor de consulta (somenteAtivas=true no servidor, por empresa, nomes de arquivo da D47); manutenção (conteúdo da b59) é DEPOIS, na primeira versão após a b71, não dívida", "reversivel": true, "gatilho": "release da b71" },
    { "id": "E13-4", "titulo": "FT-3: toast pela etapa da resposta do Confirmar, com leg e motivo lidos da própria resposta; sem pergunta ao backend", "reversivel": true, "gatilho": "não se aplica — é correção" },
    { "id": "E13-5", "titulo": "Q4: nenhum dropdown; CFOP sai do diálogo (é só conferência); UF com regex; unidade texto max 20", "reversivel": true, "gatilho": "B-26 (UFs configuradas), B-29 (catálogo de unidade), CFOP virar fonte validada" },
    { "id": "E13-6", "titulo": "Checkbox 'Validar dados fiscais' sai; Confirmar envia sempre true, para não gerar nota sem CFOP presa à origem (FiscalRepository.cs:33-39); accessRisk ILUSAO por leitura", "reversivel": true, "gatilho": "B-28, ou pedido do fiscal com uso que conclui" },
    { "id": "E13-7", "titulo": "Q5: pré-checagem do Preparar por pedidoVendaId, combo só Aprovado, textos de efeito em Gerar NF e Faturar; nenhum botão removido (seria CAPACIDADE)", "reversivel": true, "gatilho": "F-2 (caminho canônico)" },
    { "id": "E13-8", "titulo": "Q6: thumbprint fica fora do Faturamento; remoção no Fiscal fora da b71 — a remoção não fecha o buraco da API (assinador não confere empresa), accessRisk CAPACIDADE não medido", "reversivel": true, "gatilho": "B-6 refinada ou decisão do usuário" },
    { "id": "E13-9", "titulo": "Q7: resumo D79, ApiErrorPanel e V11 (documento opcional max 80, observação max 300) no Faturar", "reversivel": true, "gatilho": "não se aplica" },
    { "id": "E13-10", "titulo": "Q8: enabled por empresa (FT-9), tipo de documento só NFe/NFCe (FT-4), limites (FT-5), link do pedido no detalhe (FT-15 parcial); rota x tela (FT-18) fora", "reversivel": true, "gatilho": "FT-18: varredura F5 ou queixa; FT-15 lista: B-30" },
    { "id": "E13-11", "titulo": "Q9: b71 uma versão só, blocos A-G; gate de request estendido ao ConfirmarFaturamentoRequest e FaturarPedidoVendaRequest com prova vermelha na b70; gate de response DEPOIS (sem árvore com defeito para provar vermelho)", "reversivel": true, "gatilho": "primeira mudança de tipo de response de faturamento, ou plataforma mostrar prova vermelha aceita sem árvore histórica" },
    { "id": "E13-12", "titulo": "Sequência após b71: conteúdo de b59 -> b60 -> b61, renumerado (b72-b74, precedente D67), pois retropublicar b59 regride a versão semver; a F3 aberta é a próxima frente", "reversivel": true, "gatilho": "não se aplica — é ordem" }
  ],
  "discordancias": [
    { "de": "proposta D91 (Codex)", "ponto": "b59 como dívida sem versão; premissa de que natureza torna a confirmação funcional; CFOP por catálogo enviando código; bloqueio por 3 catálogos e 3 permissões; accessRisk AUTO_BLOQUEIO (é ILUSAO); filtro de ativas no cliente; nomes naturezasOperacaoConsulta* contra D47", "impacto": "alto" },
    { "de": "arquiteto-operacao-erp", "ponto": "possível defesa de absorver a manutenção de naturezas (b59) na b71", "impacto": "alto" },
    { "de": "arquiteto-design-system", "ponto": "possível defesa dos três dropdowns e da modal ampliada nesta versão", "impacto": "medio" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "possível defesa de .cN para FT-1/2/3 antes da b71; possível defesa do gate de response dentro da b71", "impacto": "medio" }
  ],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "F-1: quem cadastra natureza e endereço de destinatário em produção (implantação via API ou usuário pela tela)? Produção já tem naturezas_operacao e pessoas_enderecos com município?", "decide": "se a b71 conclui faturamento no release (T3 vira CAPACIDADE) e a urgência de b72-b74" },
    { "tipo": "funcional", "pergunta": "F-2: caminho canônico a partir de Aprovado — Faturar lógico, Gerar NF ou módulo Faturamento?", "decide": "se algum dos três botões sai do pedido" },
    { "tipo": "funcional", "pergunta": "F-3: a 'orientação explícita do usuário' citada na D91 (não construir a b59) existe?", "decide": "se o conteúdo da b59 é 'depois' (b72) ou decisão do usuário registrada como Dn" },
    { "tipo": "escopo", "pergunta": "O marco da b71 é 'completo' (exige absorver b59-b61, SCOPE_TOO_LARGE) ou 'honesto e corrigível'?", "decide": "a linha de corte inteira" },
    { "tipo": "backend", "pergunta": "B-25: mesmo correlationId após falha no leg 4 é recusado? O validator do Confirmar deveria exigi-lo?", "decide": "ID novo por abertura ou estável por faturamento" },
    { "tipo": "backend", "pergunta": "B-26: haverá fonte das UFs com endpoint SEFAZ configurado (ou uso de DefaultUfAutorizadora)?", "decide": "UF como dropdown" },
    { "tipo": "backend", "pergunta": "B-6 refinada: o assinador deve resolver o certificado pelo CertificadoDigital da empresa e recusar thumbprint de outra empresa (XmlFiscalSigner.cs:26-28 não confere)?", "decide": "remoção do campo no Fiscal e seu accessRisk" },
    { "tipo": "backend", "pergunta": "B-28: NotaJaExisteParaOrigem deveria ignorar nota cancelada, ou o leg 1 vincular rascunho existente? O Preparar deveria reaproveitar faturamento em Erro?", "decide": "destravar 00014 e a volta do checkbox de validação" },
    { "tipo": "backend", "pergunta": "B-29: unidade comercial padrão vem de UnidadeMedida ou UnidadeTributavel, e continua NotEmpty?", "decide": "unidade como dropdown ou fora do diálogo" },
    { "tipo": "backend", "pergunta": "B-30: FaturamentoResponse vai trazer o número do pedido?", "decide": "GUID cru na listagem" }
  ],
  "riscos": [
    "Todas as contagens vêm do banco dev (psql, 2026-09-29); produção não foi medida. Se produção tiver naturezas e endereços, a b71 conclui faturamento no release e a exigência de FISCAL_CADASTROS_CONSULTAR vira CAPACIDADE, não ILUSAO.",
    "O bloqueio do destinatário no leg 1 é leitura de código (CfopDoItemResolver, DestinatarioFiscalResolver), não execução: nenhum faturamento do dev passou do leg 1.",
    "O que o leg 2 (XML) faz com destinatário sem endereço e validação desligada não foi verificado; o corte do checkbox se apoia na trava de origem sem filtro de status (FiscalRepository.cs:33-39), medida por leitura.",
    "O gate de response fica fora enquanto a b71 passa a ler ConfirmarFaturamentoResponse.faturamento: uma leitura nova sem prova estrutural (corte de prova declarado na §10).",
    "A hipótese de assinatura cruzada entre empresas pelo thumbprint é leitura de código; não verifiquei se alguma instalação tem mais de um certificado no store.",
    "Nenhum gate nem teste foi executado nesta rodada; a precedência semver b59 < b70 é leitura da especificação, não comando executado.",
    "A b71 toca FiscalActionDialogs.tsx (frase do Gerar NF), o que obriga a varredura dos testes fiscal* antes do push."
  ]
}
```
