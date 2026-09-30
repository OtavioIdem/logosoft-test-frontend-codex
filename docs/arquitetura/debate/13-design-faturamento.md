# Posição do `arquiteto-design-system` na rodada 13 (`faturamento`)

Recorte: `v1.11.0a8b71`, "Faturamento completo e corrigível". Branch `codex/v1.11.0a8b71-faturamento`, HEAD
`1a35cb9`. A árvore de trabalho está limpa fora de `.codex/` e `.agents/` (`git status --short`), então as
citações do frontend valem para o HEAD. O inventário foi medido no `9713de4`, e o único commit entre os dois é o
próprio inventário.

**O que li antes de escrever:**
- `docs/arquitetura/debate/13-inventario-faturamento.md`, inteiro. É a fonte principal.
- `docs/PLANO-FRONTEND-ONDA-OPERACAO.md`, seção `b71` e B-6.
- `docs/arquitetura/DECISOES.md`: D22 a D30, D47 a D53, D61, D66 e D79 a D90.
- `docs/DIRETRIZES_UX_REFERENCIAS.md`.
- `docs/arquitetura/debate/12-design-compra-financeiro.md`, como modelo de formato.
- A proposta do Codex, lida por `git show codex/b71-planejamento-codex:<arquivo>`: a D91,
  `docs/fatias/v1.11.0a8b71-faturamento.md` e `docs/fatias/v1.11.0a8b59-naturezas-operacao-cfop.md`.

**Código lido:**
- `features/faturamento/{api/faturamentoApi.ts, hooks/useFaturamentoResources.ts}`.
- `features/faturamento/components/{FaturamentoDialogs,FaturamentoDetalhePage,FaturamentoPage,faturamentoLabels}`.
- `features/fiscal/components/{FiscalActionDialogs,NotaFiscalSerieField,NotaFiscalRetornoOperacionalPanel,fiscalErrosCadastro,fiscalUiUtils}`.
- `features/vendas/components/{PedidoVendaActionDialogs,PedidoVendaDetalhePage}`.
- Os hooks de catálogo `useEnderecoFiscalCatalogos.ts`, `useUnidadeTributavelCatalogo.ts` e
  `useTributacao.ts` (`useCfopOptions`), e `components/security/PermissionGuard.tsx`.
- No backend: `GerarNotaFiscalPedidoVendaUseCase.cs:85-250`, `CfopDoItemResolver.cs:46-185`,
  `DestinatarioFiscalResolver.cs:125-190`, `XmlFiscalSigner.cs` e `Produto.cs:53`.

**Preview:** subi o `preview_start logosoft-dev` e naveguei até `/faturamento`. A rota redireciona para
`/login`. Não autentiquei, porque nenhuma credencial veio do usuário no chat. **A tela real não foi olhada**, e
tudo o que digo sobre forma vem de leitura de código. O servidor ficou de pé na porta 51452, e não tenho ferramenta
para derrubá-lo.

**Banco dev:** consultei só leitura, com `docker exec logosoft-postgres psql -U erp_user -d erp -Atc "select count(*) ..."`.

**Sobre a D91:** ela chegou pelo briefing, como proposta a julgar. Não a tomo como decisão travada. O texto dela
diz "com orientação explícita do usuário". Isso é conteúdo de arquivo, não confirmação que eu possa verificar, e
não pesa nesta posição.

---

## 0. Um fato novo, medido: com natureza, o leg 1 ainda falha, por falta de endereço do destinatário

O inventário encontrou dois bloqueios, FT-1 e FT-2. Existe um terceiro, logo depois do FT-2, e nenhum documento
da rodada o cita:

- **Com `NaturezaOperacaoId` preenchido,** a geração da nota chama `ResolverUfsAsync`
  (`GerarNotaFiscalPedidoVendaUseCase.cs:149`).
- **Essa chamada precisa do destinatário.** Ela chama `DestinatarioFiscalResolver.ResolverAsync`
  (`CfopDoItemResolver.cs:98`), que exige endereço ativo, principal, com UF e município IBGE
  (`DestinatarioFiscalResolver.cs:163-186`). Sem endereço, falha com `Fiscal.DestinatarioSemEnderecoFiscal`.
- **A falha é dura.** O comentário de `CfopDoItemResolver.cs:81-84` diz que nenhuma flag a ameniza.
- **Banco dev:** `erp.pessoas_enderecos` tem **0 linhas**, e `erp.clientes` tem 2.
- **Frontend:** não existe tela de endereço de Pessoa. A busca por `logradouro|municipio` em
  `features/pessoas` e `features/clientes` volta vazia. É a `b60`, que não foi entregue.
- **CHANGELOG:** nenhuma entrada `b59`, `b60` ou `b61` (medido com `grep -o "v1.11.0a8b[0-9]*" CHANGELOG.md`).

**Consequência (leitura de código, não execução):** a sequência de falhas em dev é esta.
1. Sem natureza e com a validação ligada, o leg 1 recusa com `CfopNaturezaOperacaoNaoInformada`.
2. Com natureza, o leg 1 recusa com `DestinatarioSemEnderecoFiscal`.
3. Sem natureza e com a validação desligada, a nota nasce sem CFOP e o leg 4 falha por falta de `correlationId`
   (FT-1).

A D91 resolve só o primeiro item da cadeia. A D53 já tinha escrito isto como obrigação: "a nota só valida de
ponta a ponta depois de `b61`". Chamo este fato de **FT-21** nesta posição. Ele pesa em Q2, Q9 e no texto que a
tela precisa dizer.

---

## Q1: `correlationId` gerado a cada abertura do diálogo e somente leitura, no padrão do Transmitir

**O padrão já existe, com nove consumidores.**
- `gerarCorrelationId`/`createFiscalCorrelationId` (`fiscalUiUtils.ts:512-524`) aparece em nove diálogos de
  `FiscalActionDialogs.tsx`.
- Só um é somente leitura, o Transmitir (`:417-418,425`), com rótulo "Correlation ID" e a dica "gerado
  automaticamente a cada abertura".
- Os outros oito são **editáveis**: `:456,474,526,553,572,597,613,632`.
- O Faturamento seria o décimo consumidor. Passou da régua de três com folga: não há componente a criar, e se
  reusa a função.

**Forma proposta:**
- **Quem gera:** o frontend, ao abrir o `ConfirmarFaturamentoDialog`, com `gerarCorrelationId('faturamento')`,
  importado de `features/fiscal`. O formato tem no máximo 85 caracteres e cabe nos 100 do validator (medido pelo
  inventário, §5).
- **Por que "a cada abertura" basta para a idempotência:**
  - Num 400 do leg 1, o diálogo continua aberto (`rethrow`), e o reenvio reusa o mesmo ID. Está certo, porque a
    transmissão nunca rodou.
  - Num 200, com ou sem `Erro`, o diálogo fecha. A próxima tentativa abre outro diálogo, com ID novo.
  - O clique duplo já é barrado pelo `loading` do botão (`FaturamentoDialogs.tsx:35`).
- **Onde aparece:**
  - Campo só de leitura, com o mesmo rótulo e a mesma dica do Transmitir, no grupo "Transmissão" do diálogo (Q3).
  - Repetido no painel de resultado da última confirmação (Q3). O backend não devolve o `correlationId` no
    `FaturamentoResponse`, e sem essa repetição o operador perde o valor que o suporte vai pedir quando o leg 4
    falhar.

**O que não entra:** alinhar os oito diálogos fiscais editáveis ao somente leitura. É dívida que já existe, e a
`b71` não a cria. Registro na seção de dívida.

**Depende do backend:** se um reenvio depois de falha **no leg 4** precisa de ID novo (P-1 do inventário). A
forma acima já gera ID novo a cada abertura. A resposta só mudaria algo se o backend pedisse ID estável por
faturamento, e aí mudaria a forma.

---

## Q2: a natureza vira seletor real nos três diálogos que a pedem, e a tela diz o que falta para concluir

**Piso:**
- `DIRETRIZES_UX_REFERENCIAS.md:5-24` lista "natureza de operação, quando existir endpoint oficial" como vínculo
  de entidade.
- O endpoint existe: `NaturezasOperacaoController.cs:41-73`, conforme o inventário, §4.
- A exceção "campos fiscais ainda sem endpoint podem ficar desabilitados com texto de parametrização futura"
  (`:38`) **deixou de se aplicar**.
- Por isso, o texto "Ainda sem endpoint operacional no backend" (`FiscalActionDialogs.tsx:141,199`) já é hoje uma
  tela dizendo o que não é verdade (DIV-2).

**Régua de três:** o campo Natureza aparece em **três** diálogos: `ConfirmarFaturamentoDialog`,
`CriarNotaFiscalDialog` (`:141`) e `GerarNotaFiscalPedidoVendaDialog` (`:199`). São três consumidores, então o
seletor é padrão e deve ser construído uma vez.

**O componente:** `NaturezaOperacaoField` em `features/fiscal/components/`, irmão de `NotaFiscalSerieField`,
que é o precedente da `b58`. Não vai para `components/`, porque o domínio é fiscal (D47 item 1).

| Elemento ou estado | Forma |
| --- | --- |
| Controle | `Dropdown` pesquisável sobre `GET /api/fiscal/naturezas-operacao?empresaId=&somenteAtivas=true&termo=` (D51 item 2), com busca no servidor e debounce, no molde de `useUfCatalogo`/`useUnidadesTributaveis`. `value = id`, rótulo `codigo — descricao`. |
| Dependência | Consulta só com `empresaId` resolvido (`enabled`, padrão D82/D88). Troca de empresa limpa o valor (diretriz, item 5). |
| `loading` | `loading` do próprio dropdown. |
| vazio | `Message warn` dentro do campo: "Nenhuma natureza de operação ativa cadastrada para esta empresa. Sem ela, o faturamento com validação fiscal é recusado. O cadastro de naturezas ainda não tem tela; peça a inclusão ao responsável fiscal." Nunca orienta a digitar ID nem a desligar a validação. |
| erro recuperável | `ApiErrorPanel` no campo, com o `code` e o `traceId`. |
| permissão negada (`FISCAL_CADASTROS_CONSULTAR`) | Campo `disabled`, com um único `Message` que lista as permissões que faltam no diálogo (D66, "um aviso só por aba"). |
| ação indisponível com motivo | No Confirmar do diálogo: com a validação fiscal ligada e sem natureza selecionável (vazio ou sem permissão), o botão **Confirmar** fica desabilitado, e o motivo aparece no `Message` acima dele. É o único campo que bloqueia, porque é o único cuja ausência o backend recusa (§4 do inventário). |

**Os três caminhos que o briefing lista, com o custo de cada um:**

| Caminho | Custo operacional | Custo de template |
| --- | --- | --- |
| (a) D91: consumir o `GET`, e a `b59` vira dívida | O faturamento só conclui onde alguém cadastrar natureza fora da tela (Swagger ou carga). Em dev são 0. Em produção, **não medido**. E, pelo FT-21, também não conclui sem endereço de Pessoa, com 0 em dev. | Baixo, **se** o seletor entrar nos três diálogos. Se entrar só no Faturamento, o mesmo campo tem duas formas no mesmo fluxo de pedido: seletor no Confirmar e texto falso no Gerar NF. |
| (b) A `b71` absorve a `b59` inteira (CRUD, matriz CFOP, migração de selects, link) | Fecha a natureza, mas o FT-21 continua bloqueando. | Alto em volume, baixo em risco: é o padrão de Séries fiscais (D48), já pago. É uma fatia de tela nova com rota e menu, e não pertence ao título "Faturamento". |
| (c) Inutilizável até alguém cadastrar por fora, sem dizer nada | O operador preenche dez campos e recebe 400. | É a tela mentindo. Recuso. |

**Minha posição:** (a), com duas condições de template que a D91 não tem.
1. O seletor entra também nos dois diálogos fiscais. Isso fecha DIV-2 e DIV-3 como a D51 item 1 manda: "o texto
   e a capacidade mudam juntos". Sem o CRUD.
2. O vazio e o `CHANGELOG` dizem o que falta para concluir: natureza **e** endereço fiscal do cliente (FT-21).

Que a `b59` e a `b60` virem dívida ou voltem à frente da `b71` é decisão de sequência, e é do orquestrador. Do
ângulo de template, as duas saídas são aceitáveis. A que não é aceitável é o seletor existir numa tela enquanto a
vizinha continua dizendo que o endpoint não existe.

---

## Q3: o resultado real por leg, num painel persistente, no padrão "Último retorno operacional" do Fiscal

**O defeito:**
- O toast verde é fixo (`FaturamentoDetalhePage.tsx:60`) e ignora `ConfirmarFaturamentoResponse.faturamento`.
- Nos legs 2 a 6, o motivo da falha não vem em `alertas` (FT-3).
- Um toast some em segundos, e o operador que se distraiu não fica sabendo de nada.

**O padrão já existe:** `NotaFiscalRetornoOperacionalPanel.tsx:32-35`.
- É o `Card` "Último retorno operacional".
- A severidade vem do resultado real: `autorizada ? 'success' : 'warn'`.
- Os alertas aparecem cada um num `Message` persistente, e não em toast.

O Faturamento seria o segundo consumidor. **Copio a forma e não extraio** (dois casos são coincidência). O painel
fica local em `features/faturamento/components`.

| Elemento | Forma |
| --- | --- |
| Toast após o 200 | Severidade lida de `result.faturamento.etapa`. Com `Faturado`, `success` "Faturamento concluído". Com `Erro`, `error` "Faturamento terminou em erro" e o detalhe "veja o leg que falhou abaixo". Em etapa intermediária, `info` com o rótulo da etapa. **Nunca** "confirmado" verde com etapa `Erro`. |
| Card "Resultado da última confirmação" | Fica acima de "Legs de integração", enquanto a página estiver aberta. Mostra a etapa, o leg que falhou e o seu `motivo` (lidos de `result.faturamento.legs`), o `correlationId` enviado (Q1) e os `alertas` como `Message warn`, um por item, com o mesmo texto de abertura de `NotaFiscalRetornoOperacionalPanel.tsx:9`. |
| Sinal persistente, para quem volta depois | Com `etapa === Erro` ou `possuiLegComFalha`, o detalhe mostra um `Message severity="error"` acima dos legs: "O faturamento parou no leg N (rótulo): <motivo>". O booleano é do backend, e ler o motivo da linha é exibição, não derivação (respeita a D23). Isto **revê a D30 item 3**, que deixou `possuiLegComFalha` sem consumidor porque "a tabela já mostra Falhou". A tabela mostra, mas o operador que abre um faturamento em `Erro` hoje precisa escanear seis linhas para achar o motivo. |
| 400 do leg 1 (natureza, destinatário, série, `NotaJaExisteParaOrigem`) | `ApiErrorPanel` **dentro do diálogo**, com `code`, `status`, `traceId` e erro por campo, e o diálogo continua aberto. Somado a isso, o mapa D50 (`fiscalErrosCadastro.ts`), que é o segundo consumidor dele, dá o link "Cadastrar série" para `SerieFiscalNaoCadastradaParaContexto`. Os demais códigos ficam só em texto até existir a tela de destino (D50 item 3). |

**Pré-condição que é piso:** hoje `faturamentoApi.ts:18-24` troca o erro por
`new Error(mapApiError(error).message)` e descarta `code`, `status` e `traceId`. Sem desfazer isso, nem o
`ApiErrorPanel` nem o mapa D50 funcionam no Faturamento. A D27 mandou o assunto para a F5.5. Para esta tela, ele
volta. Os outros 19 clients com o mesmo embrulho continuam como estão (medido com
`grep -rln "throw new Error(mapApiError" features` = 20 arquivos).

---

## Q4: CFOP sai do diálogo, a UF continua texto validado, e a unidade continua texto

**CFOP: recomendo tirar o campo, não transformá-lo em dropdown.**
- `ConferirDivergencia` (`CfopDoItemResolver.cs:162-184`) compara **um** `cfopPadrao` com o CFOP derivado de
  **cada** item.
- Numa nota com um item de revenda e outro de produção própria, os derivados diferem por construção. O plano do
  próprio backend diz isso: "dois itens da mesma nota podem resolver CFOPs diferentes"
  (`GerarNotaFiscalPedidoVendaUseCase.cs:133-136`).
- Então **qualquer** valor preenchido faz a nota mista falhar. Vazio sempre passa (`:166-169`).
- Sem natureza, o campo é ignorado (`possuiContextoCfop=false`).
- É um campo cuja única consequência possível é a recusa. Um dropdown de 64 CFOPs custaria uma busca paginada, uma
  permissão e a correção de `value = id` para código (FT-7), só para oferecer uma armadilha maior.
- **Forma:** o campo sai do diálogo e o payload envia `null`. Abaixo do seletor de natureza fica uma linha de
  ajuda: "O CFOP de cada item é derivado da natureza, do par de UFs e do tipo do item."
- Pergunta ao backend: **B-26**.

**UF autorizadora: texto de 2 letras, com `length(2)` e regex no schema, como os outros seis diálogos fiscais.**
- A diretriz admite UF como texto técnico livre (`DIRETRIZES_UX_REFERENCIAS.md:39`).
- A UF útil é a que tem endpoint SEFAZ configurado, e nenhuma rota a lista (FT-6). Um dropdown das 27 UFs promete
  o mesmo que o texto: vinte e sete opções, a maioria inválida no servidor.
- E custaria `FISCAL_CADASTROS_CONSULTAR` a mais no diálogo.
- **Consistência:** hoje há 6 campos de UF autorizadora em texto no Fiscal (`:422,454,472,549,569,594`) e 1 no
  Faturamento. Trocar só o do Faturamento criaria o caso 1 contra 6.
- **Gatilho de revisão:** a resposta a P-2/**B-25**, uma lista de UFs configuradas. Aí nasce um
  `UfAutorizadoraField` em `features/fiscal`, aplicado aos **sete** de uma vez. Fica acima da régua, sem
  divergência.

**Unidade comercial padrão: texto, com `.max(20)` e a ajuda "Usada só se o produto não tiver unidade no
cadastro".**
- `Produto.UnidadeMedidaId` é `Guid` não anulável (`Produto.cs:53`). O fallback só dispara quando a unidade
  gravada não é encontrada (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`).
- É um campo obrigatório de efeito quase nulo. Dar a ele um dropdown com permissão própria (`PRODUTOS_CONSULTAR`)
  é densidade gasta no lugar errado.
- O Gerar NF do Fiscal também usa texto (`:198`).
- Pergunta ao backend: P-4/**B-27** (tornar opcional). Se o backend confirmar que a fonte é `UnidadeMedida`, o
  dropdown pode entrar depois, nos dois diálogos juntos.

**Série: `NotaFiscalSerieField`**, que já existe na `b58` e é usado em `FiscalActionDialogs.tsx:138,195`. O
Faturamento vira o terceiro consumidor do mesmo componente. Ele já decide o modo texto sem permissão (P-2a da
`b58`) e mostra "próximo N" no rótulo. Hoje o Faturamento usa `InputText` livre (`FaturamentoDialogs.tsx:114`),
que diverge do Fiscal.

**Layout do diálogo:** o plano pede para "ampliar depois do contrato". Minha posição é **reagrupar, não
ampliar**. Com o CFOP fora, sobra o mesmo número de campos, em quatro grupos rotulados, de cima para baixo:
1. **Documento:** tipo, série e número.
2. **Natureza** e a ajuda do CFOP.
3. **Transmissão:** UF e `correlationId` só de leitura.
4. **Conta a receber:** condição e 1º vencimento.

"Validar dados fiscais" e "Unidade padrão" ficam por último, sob um rótulo "Parâmetros de exceção". Não uso
`Accordion`: o único colapsável do repositório está em `TrilhaCalculoPanel.tsx`, e não vou criar padrão novo por
isso. A largura continua a do Gerar NF (`min(52rem, 98vw)`, `FaturamentoDialogs.tsx:100`).

---

## Q5: três caminhos a partir de Aprovado. O efeito de cada um fica escrito, e o Preparar não cria o terceiro faturamento em Erro

A pergunta canônica, qual dos três é o caminho oficial, **é do backend e do produto (P-6/B-29)**. O template não a
decide. O que o template resolve sem essa resposta:

**1. O pedido tem seis botões preenchidos lado a lado, e isso quebra o piso de uma ação primária por tela.**
- São eles: Editar, Enviar aprovação, Aprovar (`success`), Faturar (`warning`), Gerar NF (`help`) e Cancelar
  (`PedidoVendaDetalhePage.tsx:229-234`).
- Em `Aprovado`, Faturar e Gerar NF aparecem habilitados com o mesmo peso.
- Proponho que, até a resposta da P-6, os dois diálogos digam o efeito, como a D84 fez com a reversão:
  - **Faturar:** "Faturamento lógico: baixa estoque e marca o pedido como Faturado. **Não gera nota fiscal nem
    conta a receber.** Depois disso, o pedido não pode mais ser faturado pelo módulo Faturamento."
  - **Gerar NF:** "Gera a nota em rascunho. Depois disso, o módulo Faturamento **não consegue** faturar este
    pedido, porque a nota já existe para a origem."
- Quando a P-6 responder, o caminho canônico fica com o único botão preenchido, e os outros viram `outlined`. É
  uma troca de `severity`, reversível.

**2. No Preparar (`FaturamentoDialogs.tsx:39-70`):**
- **O combo filtra `status: Aprovado` e busca no servidor por `termo`,** copiando o combo irmão do Gerar NF
  (`FiscalActionDialogs.tsx:168`). Fecha o FT-11.
- **O rótulo do pedido segue a régua de três.** Hoje existem duas formas: `numero • valor`
  (`useFinanceiroOriginOptions.ts:24`) e `numero • Total valor` (`FiscalActionDialogs.tsx:97`). O Preparar seria
  a terceira. Então proponho um formatador único, `pedidoVendaOptionLabel`, em `features/vendas/components`, dono
  da entidade, adotado pelos três. É um helper de rótulo, e não componente.
- **Os faturamentos existentes aparecem antes de criar.** Ao escolher o pedido, o diálogo consulta
  `GET /api/faturamento?empresaId=&pedidoVendaId=`. O parâmetro já existe no client (`faturamentoApi.ts:27`), e
  nenhuma tela o usa (FT-20). Se houver faturamento em `Erro`, entra um `Message warn`: "Este pedido já tem N
  faturamento(s) em Erro. Preparar de novo cria outro, e não reaproveita os anteriores. [Abrir o mais recente]".
  O botão Preparar continua habilitado, porque o backend aceita e recusar seria regra inventada.
- **O texto "ele é reaproveitado" (`:56`) muda** para dizer o que o backend faz: reaproveita só o que não está
  em `Erro` nem `Cancelado` (`FaturamentoRepository.cs:21-25`).

**3. No detalhe de um faturamento cujo leg 1 falhou por `NotaJaExisteParaOrigem`:** o `motivo` do leg aparece no
sinal persistente da Q3. Não há link para a nota. O leg só traz texto, e a D50 proíbe mapear por texto.

Isto não fecha o beco do pedido 00014 (2 faturamentos em `Erro`, medido pelo inventário). Destravá-lo depende
da P-5/**B-28**: reaproveitar a nota existente ou o faturamento em `Erro`. O que isto fecha é o operador entrar no
beco **sem aviso**.

---

## Q6: o "Thumbprint certificado" sai do `XmlPipelineDialog`, com `accessRisk: CAPACIDADE`, e não `ILUSAO` nem `AUTO_BLOQUEIO`

**Piso:** certificado não aparece em tela, nem é operado a partir dela. O campo (`FiscalActionDialogs.tsx:399`)
deixa o operador escolher **qualquer certificado presente no repositório do servidor**:
`XmlFiscalSigner.cs` chama `_certificateProvider.ObterCertificado(request.CertificateThumbprint)` e procura por
`FindByThumbprint`. O thumbprint em si não é segredo. O risco é escolher a identidade que assina, possivelmente a
de outra empresa na mesma instalação. A forma é a remoção do campo: o payload envia vazio, e o servidor usa o
certificado configurado.

**Classificação, pelas definições de `risk.yaml:59-95`:**
- **Não é `ILUSAO`.** O backend honra o valor, e quem assina com um certificado diferente do padrão perde isso.
- **Não é `AUTO_BLOQUEIO`.** Nada aqui toca a permissão de conceder permissão.
- **É `CAPACIDADE`, em tese.** O uso real **não foi medido**: não achei onde o thumbprint escolhido fica
  registrado. Em instalação com um único certificado, a perda é zero na prática.
- `CAPACIDADE` exige decisão explícita do usuário e item próprio no CHANGELOG. Por isso esta é a única pergunta
  em que devolvo **`needs_decision`**.

**No Faturamento:** o campo continua fora (plano, `:209`), e nada muda.

**Em que fatia:** entra na `b71` como bloco próprio. A B-6 é dependência declarada da `b71` (`PLANO:69`), e a
leitura do código já responde que vazio usa a configuração do servidor. Se o usuário não confirmar a remoção, o
bloco sai sem arrastar o resto.

---

## Q7: as heranças da D80. O Faturar ganha o resumo da D79 e o `ApiErrorPanel`, e o `documento` passa a opcional

**O que já existe:**
- `AprovacaoResumo` (`PedidoVendaActionDialogs.tsx:28-55`) mostra número, cliente por rótulo, itens e valor
  total, lidos do cache do detalhe.
- O Aprovar tem `ApiErrorPanel` (`:72`).

**Forma no `FaturarPedidoVendaDialog` (`:84`):**
- **Resumo:** o mesmo componente, no mesmo arquivo. Não é abstração nova, é o segundo uso de um componente local.
  Renomeio para `PedidoVendaResumo`, e os textos de carregando e indisponível saem de `vendasLabels.aprovacao`
  para uma chave neutra.
- **Efeito:** o `Message info` da Q5 ("não gera nota fiscal nem conta a receber").
- **Erro:** `ApiErrorPanel` com `code`, `status` e `traceId` (erros de domínio no inventário, §8), e o diálogo
  continua aberto.
- **V11:** o rótulo passa de "Documento \*" para "Documento", sem obrigatoriedade. O schema fica
  `.max(80).optional()` e a observação `.max(300)`, como o validator (`PedidoVendaValidators.cs:73-79`).
- **Toast:** "Pedido faturado (lógico)", com o detalhe da baixa de estoque e "Nota fiscal e conta a receber não
  foram geradas." Hoje o texto (`PedidoVendaDetalhePage.tsx:222`) omite isso.

**Precisa de cuidado:** o `documento` vai para a baixa de estoque, e o backend aceita nulo
(`ReservaEstoqueValidators.cs:24`). Tirar a obrigatoriedade não perde rastreabilidade que o backend exija. Se o
**produto** quiser o documento como obrigação operacional, é regra dele, e não do contrato.

---

## Q8: os menores

| Item | Forma | Onde já existe |
| --- | --- | --- |
| Lista sem `empresaId` (FT-9) | `useFaturamentos` com `enabled: Boolean(empresaId)`. Sem empresa, `EmptyState` "Selecione uma empresa para listar faturamentos". O `EmptyState` de lista vazia só aparece com a consulta **bem-sucedida**. Hoje ele também aparece junto do erro (`FaturamentoPage.tsx:88`), em dobro com o `emptyMessage` (`:81`). | D82 e D88. É a **quarta** ocorrência da classe. |
| Tipo de documento (FT-4) | O Faturamento importa `tipoDocumentoFiscalOptions` de `features/fiscal/components/fiscalUiUtils.ts:459-462`, que já tem só NF-e e NFC-e. `tipoDocumentoOptions` com 6 valores sai de `faturamentoLabels.ts:53-60`, e o schema restringe aos dois. | Fiscal |
| GUID cru (FT-15) | Na lista e no detalhe, a coluna ou o campo "Pedido" mostra o **número**, resolvido pela lista de pedidos da empresa já carregada, nunca por uma chamada por linha (D79). Fora da lista, com teto de 200, aparece o rótulo neutro "Pedido fora da lista carregada" (D66). No detalhe, "Conta a receber" mostra "Gerada", e não o GUID (`DIRETRIZES_UX_REFERENCIAS.md:89-90`). | D66, diretriz |
| Limites (FT-5) | `.max` em série 20, número 40, unidade 20 e observação do Preparar 500. UF com `length(2)` e regex. | D30 item 1 (o mesmo tipo de correção) |
| Confirmar desabilitado sem motivo por falta de permissão | O botão do detalhe já tem o tooltip da D23 (`FaturamentoDetalhePage.tsx:106-107`). Ele passa a cobrir também "Exige FATURAMENTO_CONFIRMAR". O mesmo vale para Cancelar e Retomar. | D23. É o único `showOnDisabled` do repositório. |
| Rota × tela (FT-18, item 1) | Escopo de plataforma. De template, basta notar que quem tem só `CONFIRMAR` recebe `UnauthorizedState`. Alinhar a rota a `CONSULTAR` é `ILUSAO`. | — |

---

## Q9: uma `b71`, em blocos, com o bloco da verdade primeiro. O gate de campos deve cobrir o faturamento

Do ângulo de template, uma `.cN` com FT-1, FT-2 e FT-3 antes da UX não compra nada, pelo FT-21. Mesmo corrigidos os
três, nenhum faturamento conclui em dev sem natureza e sem endereço de cliente. Uma corretiva que "destrava o
faturamento" e não destrava seria a tela e o CHANGELOG mentindo juntos.

**Proposta: uma versão, e os blocos nesta ordem:**
- **A. Resultado honesto.**
  - O painel e o toast lidos da etapa (Q3).
  - O `runRequest` que preserva o `code`.
  - `ApiErrorPanel` e o mapa D50 no diálogo.
  - O `correlationId` (Q1).
- **B. Contrato do Confirmar.**
  - `NaturezaOperacaoField` nos três diálogos (Q2).
  - O CFOP sai, e a série vira `NotaFiscalSerieField`.
  - Os limites, o tipo de documento, o reagrupamento (Q4) e o texto do Fiscal corrigido (DIV-2 e DIV-3).
- **C. Heranças da D80:** o Faturar (Q7).
- **D. Caminhos:** os textos de efeito, o Preparar filtrado e com faturamentos existentes, e o formatador de
  rótulo (Q5).
- **E. Lista:** `enabled`, `EmptyState` e GUID (Q8).
- **F. Thumbprint (Q6),** condicionado à confirmação do usuário.

**Obrigação de honestidade (D53):** o CHANGELOG da `b71` diz com todas as letras que a confirmação conclui só com
natureza ativa cadastrada **e** cliente com endereço fiscal completo. Diz também que nenhuma das duas coisas tem
tela ainda (`b59`, `b60` e `b61` em dívida). O título "Faturamento completo" não pode sair sem essa ressalva.

**Gate de campos:** sim, estender a `FaturamentoResponse`, `FaturamentoLegResponse` e
`ConfirmarFaturamentoResponse`, e ao novo `NaturezaOperacaoResponse`, pelo mesmo raciocínio da D83 e da D90. A Q3
passa a **ler** `faturamento.etapa` e `legs` da resposta do Confirmar, que hoje são ignorados. Um campo lido que o
backend renomeie volta a ser sucesso falso em silêncio. O formato do gate é de plataforma.

---

## A D91 do Codex: o que adoto e o que recuso

| Parte da D91 | Posição | Por quê |
| --- | --- | --- |
| O CRUD da `b59` não entra na `b71` | **Adoto** | O padrão de tela é conhecido (D48), mas não é faturamento. |
| Consumir o `GET` de naturezas ativas por empresa, em `features/fiscal`, enviando o ID e nunca GUID digitado | **Adoto** | É o piso da diretriz e a D47 item 1. |
| O seletor só no Confirmar de Faturamento | **Recuso** | São três consumidores (régua de três). A D51 item 1 manda "texto e capacidade mudam juntos". Custo de alinhar depois: 2 diálogos. |
| CFOP escolhido de catálogo, enviando o código | **Recuso** | Com um valor único contra o derivado por item, o campo só pode causar recusa (`CfopDoItemResolver.cs:162-184`). O melhor valor é vazio. |
| Confirmar indisponível **sem natureza**, com motivo, sem orientar a desligar a validação | **Adoto** | É o estado "ação indisponível com motivo". |
| Confirmar indisponível **sem `PRODUTOS_CONSULTAR`** (unidade) | **Recuso** | A unidade é fallback de efeito quase nulo. Bloquear a confirmação por ela contraria D61 e D66 (guarda por campo) e o precedente de texto sem permissão do `NotaFiscalSerieField`. |
| `accessRisk: AUTO_BLOQUEIO` | **Recuso a classificação** | Pelo `risk.yaml:85-95`, `AUTO_BLOQUEIO` é perder a permissão de reconceder permissão, e nada aqui toca isso. Hoje nenhuma confirmação conclui (FT-1 e FT-2), então quem perde o botão perde uma promessa: é `ILUSAO`. |
| `certificateThumbprint` fora do Faturamento | **Adoto** | Plano e piso. A D91 não trata o campo digitável no Fiscal, e a Q6 trata. |
| `correlationId` só de leitura e estável até fechar | **Adoto** | É o mesmo que a Q1 propõe. |
| Silêncio sobre FT-3 (sucesso falso) e sobre o destinatário sem endereço (FT-21) | **Lacuna** | A D91 destrava um de três bloqueios e não muda o toast verde. |

---

## Estados e regras de UX que são piso nesta tela

| Elemento | `loading` | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FaturamentoPage` | existe | **corrigir**: um só estado, e só com a consulta ok. Sem empresa, orienta a escolher. | existe (`ApiErrorPanel`) | **entra**: sem empresa, não consulta (Q8) | existe | existe | **entra**: tooltip no Preparar desabilitado por permissão |
| `PrepararFaturamentoDialog` | existe | **entra**: "Nenhum pedido aprovado nesta empresa" | **entra**: `ApiErrorPanel` no diálogo | n/a | existe | n/a | **entra**: aviso de faturamento(s) em Erro do pedido (Q5) |
| `FaturamentoDetalhePage` | existe | existe (legs com "Sem registro") | existe | existe (divergência e reversão) + **entra** o sinal "parou no leg N" (Q3) | **corrigir**: severidade pela etapa, nunca verde com `Erro` | existe | **estende**: o tooltip da D23 cobre permissão |
| `ConfirmarFaturamentoDialog` | existe | **entra**: natureza vazia com texto operacional (Q2) | **entra**: `ApiErrorPanel` com `code` e `traceId`, e mapa D50 | **entra**: validação ligada e sem natureza → Confirmar desabilitado com motivo | delegado ao painel da Q3 | **entra**: um `Message` que lista as permissões que faltam (D66) | **entra** (os dois anteriores) |
| `NaturezaOperacaoField` (3 diálogos) | **entra** | **entra** | **entra** | n/a | n/a | **entra**: campo desabilitado | n/a |
| `FaturarPedidoVendaDialog` | existe | n/a | **entra**: `ApiErrorPanel` | n/a | **corrigir**: o texto diz "lógico, sem NF nem título" | existe (guard do botão) | n/a |
| `XmlPipelineDialog` (assinar) | existe | n/a | n/a | n/a | n/a | n/a | **sai** o campo de thumbprint (Q6, se confirmado) |

**Regras que são piso aqui:**
- Nenhum GUID cru na lista nem no detalhe.
- Nenhum campo de certificado.
- O erro de API sempre com `code`, `status` e `traceId`.
- Uma ação primária por diálogo.
- O vazio da natureza nunca orienta a digitar ID nem a desligar a validação.

**Nenhum destes itens é acabamento.** Sem o bloco A, a tela continua dizendo "confirmado" para um faturamento em
`Erro`.

---

## Dívida visual

**Fecha:**
- **DIV-2 nos 2 diálogos fiscais.** O campo Natureza passa a ter a mesma forma nos 3 diálogos.
- **Série.** O Faturamento passa a usar o componente que o Fiscal já usa, e os 3 consumidores ficam iguais.
- **Tipo de documento.** Faturamento e Fiscal passam a oferecer as mesmas 2 opções.
- **Rótulo de pedido de venda.** As 2 formas existentes e a nova convergem num formatador só.
- **Sucesso falso do Confirmar.**

**Cria:** zero componente em `components/`.
- **Novo em `features/fiscal`:** `NaturezaOperacaoField`, com 3 consumidores no dia 1.
- **Novo em `features/vendas`:** o formatador `pedidoVendaOptionLabel`, com 3 consumidores.
- **Local ao Faturamento:** o painel de resultado, cópia de forma do Fiscal. É o segundo caso, fica no módulo. O
  gatilho para extrair é um terceiro fluxo com resultado por etapa (Compras → recebimento, se ganhar integração).

**Continua, com número e dono:**
- **`correlationId` editável em 8 diálogos fiscais,** contra 2 somente leitura depois da `b71`: Transmitir e
  Faturamento. Alinhar custa 8 edições de uma linha. É reversível.
- **UF autorizadora em texto em 7 diálogos.** Fica consistente, e o gatilho é a B-25.
- **`PermissionGuard` sem motivo em 77 arquivos** (medido com `grep -rl 'mode="disable"' features app components`).
  Corrigir é mudar o componente para expor o motivo, uma vez para todos. Não é tarefa da `b71`. A D48 descartou
  `disabledReason` pelo mesmo tamanho.
- **19 clients de API com `throw new Error(mapApiError(...).message)`,** que perdem `code` e `traceId` (F5.5).

---

## O que eu abro mão

- **Do dropdown de UF prometido no plano.** Aceito o Faturamento com UF em texto validado, fora do "dropdown sobre
  catálogos". Troco a promessa do plano pela consistência com os 6 diálogos fiscais e por não fingir uma lista
  válida. Gatilho: B-25 (UFs configuradas) → um campo para os 7.
- **Do dropdown de CFOP e de qualquer campo de CFOP no Confirmar.** Se o backend disser que `cfopPadrao` vira
  conferência por item ou fonte da emissão (B-26), o campo volta, e já com o código como valor.
- **Do dropdown de unidade comercial.** Aceito texto num campo obrigatório de efeito quase nulo. Gatilho: B-27
  mantém o campo obrigatório e diz que a fonte é `UnidadeMedida` → dropdown nos dois diálogos juntos.
- **Do CRUD de naturezas na `b71`.** Aceito a tela de faturamento funcionando só onde alguém cadastrou natureza por
  fora. Gatilho para padronizar: o primeiro operador que precisar de uma natureza nova, ou a decisão de
  sequência, reabre a `b59` com o padrão de Séries.
- **De extrair o painel de resultado por etapa.** Fica duplicado em forma (Fiscal e Faturamento). Gatilho: um
  terceiro fluxo.
- **De uma ação primária única no pedido de venda já na `b71`.** Aceito, até a P-6, dois botões preenchidos
  (Faturar e Gerar NF) com texto de efeito, em vez de escolher o canônico por conta própria.
- **De alinhar os 8 `correlationId` editáveis do Fiscal.** Aceito a divergência de 8 contra 2 nesta versão.

---

## Onde discordo

Escrevo em paralelo, então estas discordâncias são antecipadas.

> **Discordo de `arquiteto-escopo-entrega`, se ele puser o seletor de natureza só no Faturamento e deixar a DIV-2
> para a `b59`.** Isso adia o padrão. Adiar significa que 2 diálogos do mesmo fluxo de pedido continuam dizendo
> "ainda sem endpoint" enquanto a tela vizinha consome esse endpoint. Custo de alinhar depois: 2 diálogos, mais o
> texto falso em produção por uma versão inteira. Reversível: sim, porque a troca é de campo, mas a D51 item 1 já
> travou que texto e capacidade mudam juntos.

> **Discordo de `arquiteto-operacao-erp`, se ele pedir dropdown de 27 UFs só no Confirmar.** São 6 diálogos
> fiscais em texto contra 1 em dropdown, para a mesma informação e o mesmo operador. Custo de alinhar depois:
> 6 telas. Reversível: sim. Mas a lista das 27 não é a lista válida (FT-6), e o dropdown só muda o jeito de errar.

> **Discordo de `arquiteto-plataforma-frontend`, se ele propuser extrair para `components/` o painel de resultado
> por etapa ou o seletor de natureza.** O painel tem 2 consumidores, e o seletor é de domínio fiscal (D47). Em
> `components/`, o primeiro seria abstração prematura, e o segundo criaria dependência de genérico para fiscal.

> **Discordo da D91 proposta em `accessRisk: AUTO_BLOQUEIO` e no bloqueio por `PRODUTOS_CONSULTAR`.** Motivos na
> tabela acima. O custo de manter as duas: um alerta em negrito e uma ordem de concessão pré-deploy para um risco
> que não existe, mais operadores bloqueados por um campo que o backend quase nunca usa.

---

## Perguntas ao backend (novas, a partir de B-25) e o que se resolve lendo o contrato

**Resolvido por leitura, sem pergunta:**
- O `correlationId` é obrigatório no leg 4.
- Thumbprint vazio usa o certificado do servidor.
- O CFOP é derivado por item.
- A unidade é fallback.
- O Faturar é lógico.
- O destinatário precisa de endereço (FT-21).

**Só o backend decide:**
- **B-25 (P-2):** existe ou vai existir uma lista das UFs com endpoint SEFAZ configurado, ou o uso de
  `DefaultUfAutorizadora`?
- **B-26 (novo):** `cfopPadrao` único, comparado com o CFOP derivado de cada item, recusa toda nota mista. É
  intencional? Ele vai virar conferência por item, sair do request, ou ser ignorado quando os itens divergem entre
  si?
- **B-27 (P-4):** `UnidadeComercialPadrao` pode deixar de ser `NotEmpty`, já que `Produto.UnidadeMedidaId` é
  obrigatório? Se não, a fonte é `UnidadeMedida`?
- **B-28 (P-5):** o Preparar reaproveita o faturamento em `Erro`? E o leg 1 vincula a nota Rascunho já existente
  da mesma origem?
- **B-29 (P-6):** qual é o caminho canônico a partir de `Aprovado`?
- **B-30 (P-7):** o Confirmar põe em `alertas` o motivo das falhas dos legs 2 a 6? A Q3 não depende disso, porque
  lê a etapa e os legs.
- **B-31 (P-1):** o reenvio depois de falha no leg 4 exige `correlationId` novo? O validator do Confirmar deveria
  exigi-lo, em vez de aceitar nulo e falhar com 200?
- **B-6 (P-3):** o certificado é um por instalação, ou por empresa ou filial?

A numeração é sugestão. Quem atribui é o orquestrador.

---

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "faturamento",
  "status": "needs_decision",
  "arquivo": "docs/arquitetura/debate/13-design-faturamento.md",
  "motivoNeedsDecision": "Q6: remover o campo digitavel 'Thumbprint certificado' do XmlPipelineDialog e accessRisk CAPACIDADE (o backend honra o valor e escolhe qualquer certificado do repositorio do servidor; uso real nao medido), o que exige decisao explicita do usuario pelo risk.yaml. As demais posicoes estao fechadas com evidencia.",
  "decisoesPropostas": [
    { "id": "Q1", "titulo": "correlationId gerado a cada abertura do ConfirmarFaturamentoDialog com gerarCorrelationId (decimo consumidor), somente leitura no padrao do Transmitir e repetido no painel de resultado", "reversivel": true, "gatilho": "B-31 pedir ID estavel por faturamento" },
    { "id": "Q2", "titulo": "NaturezaOperacaoField em features/fiscal (somenteAtivas, empresaId, value=id) nos tres dialogos que pedem natureza; fecha DIV-2/DIV-3 sem o CRUD da b59; Confirmar indisponivel com motivo sem natureza; vazio e CHANGELOG dizem que falta natureza e endereco do cliente (FT-21)", "reversivel": true, "gatilho": "decisao de sequencia que reabra b59/b60 antes da b71" },
    { "id": "Q3", "titulo": "Toast pela etapa real da resposta; painel local de resultado da ultima confirmacao (copia de forma de NotaFiscalRetornoOperacionalPanel); sinal persistente 'parou no leg N' via possuiLegComFalha (reve D30 item 3); ApiErrorPanel e mapa D50 no dialogo; runRequest do faturamento deixa de descartar code/traceId", "reversivel": true, "gatilho": "terceiro fluxo com resultado por etapa, para extrair o painel" },
    { "id": "Q4", "titulo": "cfopPadrao sai do dialogo (envia null); UF autorizadora fica texto com length(2) e regex, como os 6 dialogos fiscais; unidade fica texto .max(20) com ajuda de fallback; serie vira NotaFiscalSerieField (terceiro consumidor); dialogo reagrupado, nao ampliado", "reversivel": true, "gatilho": "B-25 (UFs configuradas), B-26 (cfopPadrao), B-27 (unidade)" },
    { "id": "Q5", "titulo": "Textos de efeito nos dialogos Faturar e Gerar NF; Preparar filtra Aprovado com busca no servidor, mostra faturamentos em Erro do pedido antes de criar e corrige o texto 'reaproveitado'; formatador unico pedidoVendaOptionLabel em features/vendas para os 3 consumidores", "reversivel": true, "gatilho": "B-29 definir o caminho canonico, que ganha a unica acao primaria" },
    { "id": "Q6", "titulo": "Remover 'Thumbprint certificado' do XmlPipelineDialog; accessRisk CAPACIDADE (nao ILUSAO, nao AUTO_BLOQUEIO); bloco proprio da b71 condicionado a confirmacao do usuario", "reversivel": true, "gatilho": "B-6 declarar certificado por empresa/filial" },
    { "id": "Q7", "titulo": "FaturarPedidoVendaDialog ganha o resumo da D79 (mesmo componente local, renomeado), ApiErrorPanel e texto de efeito; documento opcional .max(80), observacao .max(300); toast diz 'logico, sem NF nem titulo'", "reversivel": true, "gatilho": "produto exigir documento como regra operacional" },
    { "id": "Q8", "titulo": "Lista com enabled por empresaId (quarta ocorrencia D82/D88) e EmptyState so com consulta ok; tipoDocumentoFiscalOptions do Fiscal (2 opcoes); pedido por numero e conta a receber como 'Gerada' em vez de GUID; limites max no schema; tooltip da D23 cobre falta de permissao", "reversivel": true, "gatilho": "nenhum" },
    { "id": "Q9", "titulo": "Uma b71 em blocos A-F, com o resultado honesto primeiro; sem .cN, porque FT-21 impede qualquer corretiva de concluir faturamento; CHANGELOG com ressalva de natureza e endereco; gate de campos estendido a FaturamentoResponse, FaturamentoLegResponse, ConfirmarFaturamentoResponse e NaturezaOperacaoResponse", "reversivel": true, "gatilho": "entrega de b59/b60/b61" }
  ],
  "discordancias": [
    { "de": "arquiteto-escopo-entrega", "ponto": "seletor de natureza so no Faturamento, com DIV-2 adiada para a b59 (antecipada)", "impacto": "medio" },
    { "de": "arquiteto-operacao-erp", "ponto": "dropdown de 27 UFs so no Confirmar (antecipada)", "impacto": "baixo" },
    { "de": "arquiteto-plataforma-frontend", "ponto": "extrair painel de resultado ou seletor de natureza para components/ (antecipada)", "impacto": "baixo" },
    { "de": "proposta D91 (Codex)", "ponto": "accessRisk AUTO_BLOQUEIO, bloqueio por PRODUTOS_CONSULTAR, CFOP como dropdown e seletor so no Faturamento", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-25: lista de UFs com endpoint SEFAZ configurado ou uso de DefaultUfAutorizadora?", "decide": "se nasce um UfAutorizadoraField para os 7 dialogos" },
    { "tipo": "backend", "pergunta": "B-26: cfopPadrao unico comparado ao derivado de cada item recusa toda nota mista; e intencional?", "decide": "se algum campo de CFOP volta ao Confirmar" },
    { "tipo": "backend", "pergunta": "B-27: UnidadeComercialPadrao pode deixar de ser NotEmpty, ja que Produto.UnidadeMedidaId e obrigatorio?", "decide": "se a unidade sai do dialogo ou vira dropdown" },
    { "tipo": "backend", "pergunta": "B-28: Preparar reaproveita faturamento em Erro, e o leg 1 vincula a nota Rascunho existente da mesma origem?", "decide": "destravamento do pedido 00014 e texto do Preparar" },
    { "tipo": "backend", "pergunta": "B-29: caminho canonico a partir de Aprovado (Faturar logico, Gerar NF ou Faturamento)?", "decide": "qual botao do pedido e a acao primaria" },
    { "tipo": "backend", "pergunta": "B-30: o Confirmar poe em alertas o motivo das falhas dos legs 2 a 6?", "decide": "redundancia do painel; a Q3 nao depende disso" },
    { "tipo": "backend", "pergunta": "B-31: reenvio apos falha no leg 4 exige correlationId novo? O validator do Confirmar deveria exigi-lo?", "decide": "se o ID e por abertura ou estavel por faturamento" },
    { "tipo": "funcional", "pergunta": "Q6: o usuario confirma a remocao do thumbprint digitavel no Fiscal (accessRisk CAPACIDADE)?", "decide": "se o bloco F entra na b71" },
    { "tipo": "funcional", "pergunta": "Sequencia: b59/b60 continuam em divida, com a b71 dependendo de cadastro por fora, ou voltam para antes da b71?", "decide": "se 'Faturamento completo' conclui algum faturamento na propria versao" }
  ],
  "riscos": [
    "FT-21 (medido por leitura de codigo e banco dev: erp.pessoas_enderecos = 0, erp.clientes = 2, erp.naturezas_operacao = 0, via docker exec psql -U erp_user): mesmo com natureza, o leg 1 falha por DestinatarioSemEnderecoFiscal; nao ha tela de endereco de Pessoa (b60 nao entregue). Nao executado via HTTP.",
    "Preview nao olhado: a rota /faturamento redireciona para /login e nao autentiquei sem credencial fornecida pelo usuario; toda a forma descrita vem de leitura de codigo. O servidor logosoft-dev ficou de pe na porta 51452.",
    "Nao medi o volume de naturezas nem de enderecos em producao; o custo operacional do caminho (a) em producao e nao verificado.",
    "Nao verifiquei se existe registro do uso de thumbprint diferente do padrao; a classificacao CAPACIDADE da Q6 e teorica.",
    "Nenhum gate nem teste foi executado nesta posicao."
  ]
}
```
