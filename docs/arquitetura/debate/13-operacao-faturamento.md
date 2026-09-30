# Posição — `arquiteto-operacao-erp` — rodada 13, Faturamento (`b71`)

Fontes: `docs/arquitetura/debate/13-inventario-faturamento.md` (FT-1 a FT-20, a fonte principal),
`docs/PLANO-FRONTEND-ONDA-OPERACAO.md` (seção `b71`, B-6), `docs/arquitetura/DECISOES.md` (D24, D27,
D47, D50–D54, D79, D80, D82, D88) e a proposta **não travada** do Codex no branch
`codex/b71-planejamento-codex` (D91, plano `b71`, plano `b59`, lidos com `git show`). As citações de
frontend valem para o HEAD `1a35cb9`, cuja árvore de `features/` é a mesma do `9713de4` medido pelo
inventário. A árvore de trabalho estava limpa fora de `.codex/` e `.agents/` (`git status --short`).
Como a D91 veio pelo briefing, como proposta a julgar, não há `needs_decision` por instrução
chegada via arquivo.

Medições próprias desta rodada. Todas são só leitura: banco dev via
`docker exec logosoft-postgres psql -U erp_user -d erp`, backend em `../New project 3/src`.

```bash
select count(*) from erp.pessoas_enderecos          # 0  (erp.pessoas = 2, erp.clientes = 2)
select count(*) from erp.naturezas_operacao         # 0  (confirma o inventário)
select count(*) from erp.certificados_digitais      # 0  (tabela existe: EmpresaId, FilialId, Apelido, Thumbprint, ValidoAte)
select count(*) from erp.empresas                   # 2
produtos."UnidadeMedidaId" is_nullable              # NO; 3 de 3 produtos com unidade
grep -rn "dados-fiscais\|indicadorContribuinteIcms\|/enderecos" features   # 1 linha, só produtosApi.ts:210
grep -ic correlation Erp.Application/Fiscal/FiscalOperacoesNotaAutorizadaUseCases.cs   # 0
grep -in "Http.*reserv" Erp.Api/Controllers/Vendas/PedidosVendaController.cs          # 0
grep -in certificad Erp.Api/Controllers -r                                            # 0
```

---

## 1. Assunto e recorte

**Em debate:** o que a `b71` precisa entregar para um faturista levar um pedido `Aprovado` até
`Faturado`, com nota, baixa e título, e para corrigir quando algo dá errado no caminho.

**Fora:** o cadastro de naturezas (`b59`), o endereço e o bloco fiscal da Pessoa (`b60`/`b61`), a
regra fiscal em si e a reversão de nota autorizada. O último item é outro fluxo, e o backend diz isso
(`FaturamentoErrors.cs:33-38`).

---

## 2. O fluxo do operador, ponta a ponta

Há seis trabalhos neste recorte, e os escrevo porque a `b71` promete ser "completa e corrigível".
**A** é a implantação, feita uma vez. **B** é o faturamento do dia, dezenas de vezes. **C** é a
correção. **D** é o beco dos caminhos concorrentes. **E** é o desfazer. **F** é o faturamento lógico
pelo módulo Vendas.

### A. Pré-requisitos de implantação (uma vez por empresa, e uma vez por cliente)

| # | O que precisa existir | Onde se faz hoje | Fecha? |
| --- | --- | --- | --- |
| A1 | Série fiscal da NF-e | `/fiscal/series` (b58) | **fecha** |
| A2 | Endereço fiscal da empresa ou filial | Empresa/filial (b64) | **fecha** |
| A3 | Dados fiscais do produto | Produto (b65) | **fecha** |
| A4 | Natureza de operação ativa, com a matriz âmbito × tipo de item → CFOP | **nenhuma tela** (b59 não entregue, FT-17). Banco dev: 0 | **quebra**: só pela API, por fora |
| A5 | **Por cliente:** endereço principal com município IBGE e indicador de contribuinte ICMS | **nenhuma tela**. O backend tem as rotas (`PessoasController.cs:108-196`, `PATCH .../dados-fiscais` `:56`), e o frontend consome zero delas (grep acima). Banco dev: 0 endereços para 2 pessoas | **quebra**: só pela API, por fora, **a cada cliente novo** |
| A6 | Certificado e endpoint SEFAZ da UF | configuração do servidor (`SefazOptions`) | fora da tela, por desenho |

**A5 é o achado que o inventário não trouxe, e é o que mais pesa.** Com a natureza informada, o leg 1
resolve as UFs pelo destinatário antes de qualquer item
(`GerarNotaFiscalPedidoVendaUseCase.cs:141-153` → `CfopDoItemResolver.cs:68-78` →
`DestinatarioFiscalResolver.cs:157-173`). Sem endereço ativo, volta
`Fiscal.DestinatarioSemEnderecoFiscal`. Sem endereço principal, volta `DestinatarioSemEnderecoPrincipal`.
É um resultado "duro", que nenhuma flag ameniza (`CfopDoItemResolver.cs:80-85`).

A consequência, pela leitura do código: **corrigir FT-1 e FT-2 tira o faturamento do muro da
natureza e o leva ao muro do destinatário, no mesmo leg 1.** A D53 já dizia que "a nota só valida de
ponta a ponta depois de `b61`". A `b71` herda essa obrigação de honestidade. **Não medido em
execução.**

A frequência importa, e isto é intuição, e não medição. A4 acontece algumas vezes por empresa, na
implantação. A5 acontece **a cada cliente novo**. É cadastro recorrente e está sem tela.

### B. Faturista, caminho feliz (várias vezes por dia)

| # | Passo | Tela | Fecha hoje? |
| --- | --- | --- | --- |
| B1 | Abre o pedido `Aprovado` que o comercial liberou | `/vendas/pedidos/[id]` | fecha |
| B2 | Precisa decidir **como** faturar. Vê "Faturar" e "Gerar NF" e não vê "Preparar faturamento" | idem, `PedidoVendaDetalhePage.tsx:232-233` | **quebra**: o caminho do módulo Faturamento não aparece no pedido, e os dois botões que aparecem não dizem o que fazem (FT-12, FT-14) |
| B3 | Vai a `/faturamento`, clica "Preparar", procura o pedido num combo que lista qualquer status, só pelo número, com teto de 200 sem aviso | `FaturamentoDialogs.tsx:45-46` | **quebra parcial** (FT-11) |
| B4 | Com a listagem vazia ou em 400 por falta de empresa, nem vê o que já existe | `FaturamentoPage.tsx:35,42` | **quebra** em contexto global (FT-9) |
| B5 | Preparar recusado porque o pedido foi aprovado **sem reserva** | `PrepararFaturamentoUseCase.cs:77-86` | **beco**: não há rota para reservar depois da aprovação (grep acima dá 0). O texto do backend manda "aprove reservando", mas o pedido já está aprovado |
| B6 | Abre o faturamento. Vê "Pedido de venda: `<GUID>`" e não vê o cliente | `FaturamentoDetalhePage.tsx:132` | **quebra** (FT-15): não sabe se abriu o faturamento certo |
| B7 | Clica em Confirmar. Precisa saber o **próximo número** da série | diálogo, `InputText` livre (`FaturamentoDialogs.tsx:114-119`) | **quebra**: tem de sair para `/fiscal/series`. O `NotaFiscalSerieField` da b58 já mostra "Série N — próximo X" (`NotaFiscalSerieField.tsx:59`), e o Faturamento não o usa |
| B8 | Precisa escolher a natureza | não existe no diálogo | **quebra** (FT-2) |
| B9 | Digita a UF, o CFOP e a unidade | `InputText` | **quebra parcial**: a UF se digita errado; o CFOP só serve para falhar (FT-7); a unidade quase nunca é usada (FT-8; `UnidadeMedidaId` é NOT NULL, então o fallback é raro) |
| B10 | Escolhe a condição de pagamento. **Se esquecer, o título sai em parcela única** no 1º vencimento | `FiscalOperacoesNotaAutorizadaUseCases.cs:484-499` | **quebra silenciosa**: nada no diálogo diz esse efeito |
| B11 | Confirma | — | **quebra**: sem `correlationId`, o leg 4 falha sempre (FT-1) |
| B12 | Lê o resultado | toast | **mente**: "Faturamento confirmado" em verde com a etapa `Erro` (FT-3) |
| B13 | Abre a nota e confere o título | "Abrir nota fiscal" fecha; a conta a receber aparece como GUID cru, e não há rota de detalhe (`app/(main)/financeiro/contas-receber/` não tem `[id]`) | **quebra parcial** |

### C. Faturista, quando dá errado

| # | Situação | O que o backend faz | O que a tela faz hoje |
| --- | --- | --- | --- |
| C1 | Falha no leg 1 (natureza, destinatário, número duplicado, série) | 400 com `code`; leg 1 `Falhou` | toast com a mensagem; o diálogo fica aberto (`rethrow`). **Serve**, mas o `code` se perde (`faturamentoApi.ts:18-24`) |
| C2 | Falha nos legs 2 a 6 | **200**, etapa `Erro`, motivo no leg, **não** em `alertas` | toast verde (FT-3) |
| C3 | O operador tenta de novo | `ExigirPodeConfirmar` aceita `Erro` e `PendenteFiscal` (`Faturamento.cs:117-123`). Cada leg já integrado é pulado (guards por leg, `ConfirmarFaturamentoUseCase.cs` legs 1, 4, 5 e 6). **Tentar de novo é Confirmar no mesmo faturamento** | o diálogo zera tudo (`initialConfirmar`, `FaturamentoDialogs.tsx:72-82`) e exige de novo série, número, natureza e unidade, **que não serão usados** se a nota já existir (o leg 1 é pulado com `NotaFiscalId` presente). Ninguém diz que o botão "Confirmar" é o "tentar de novo" |
| C4 | O operador acha que precisa de outro faturamento e clica em Preparar | cria **outro** (FT-10), porque `Erro` não conta como ativo | o texto promete "é reaproveitado" (`FaturamentoDialogs.tsx:56`) |
| C5 | Rejeição ou transmissão inconclusiva na SEFAZ | etapa `PendenteFiscal`; o motivo **vai** para `alertas`; o reprocessamento fica agendado no Fiscal | toast amarelo com o motivo. **Não verificado** qual é o próximo passo correto (ver pergunta B-28) |
| C6 | Falha no leg 5 ou 6 ("correção manual necessária") | leg `Falhou`; Confirmar de novo refaz só aquele leg | nada diz ao operador que Confirmar de novo é o caminho |

### D. O beco dos caminhos concorrentes (pedido `00014`)

D1. Alguém clicou "Gerar NF" no pedido. D2. Outra pessoa preparou e confirmou o faturamento. D3. O leg
1 falha com `NotaJaExisteParaOrigem`. D4. Ela prepara outro, e falha igual. **O banco dev mostra dois
faturamentos em `Erro` para o 00014 (FT-10, FT-12).**

Pelo código, o caminho do Faturamento **nunca** reabre para esse pedido.
`ObterNotaFiscalPorOrigemAsync` (`FiscalRepository.cs:33-39`) não filtra o status da nota, então
**nem cancelar a nota destrava**. A saída real é concluir pelo Fiscal: validar, gerar XML, assinar,
transmitir, baixar estoque e gerar conta a receber na própria nota (`NotasFiscaisController.cs`,
rotas `:122-253`). Depois, cancelar os faturamentos em `Erro`. **A tela não diz nada disso.**

### E. Desfazer

E1. Cancelar um faturamento sem leg 4 integrado **fecha**, com motivo de até 300 (D30), e os legs
integrados passam por reversão com retomada (P4, D22–D28). E2. Com o leg 4 integrado, o backend
recusa, e a mensagem já diz que "desfaz-se por cancelamento fiscal, que é outro fluxo"
(`FaturamentoErrors.cs:33-38`). Hoje isso chega como toast (inventário §12). O operador tem o botão
"Abrir nota fiscal" na mesma página: **fecha mal, mas fecha**. **Não verificado** o que acontece com
a baixa, com o título e com o faturamento depois do cancelamento fiscal (pergunta B-28).

### F. Faturamento lógico (Vendas → Faturar)

F1. O diálogo pede "Documento \*", que o backend não exige (V11, FT-13). F2. Não mostra resumo, ao
contrário da aprovação (D79). F3. Não diz que **não gera NF nem título**, nem que **fecha o caminho do
módulo Faturamento** para o pedido (`PedidoVenda.cs:190-194`). F4. O título sai depois, por Financeiro
→ "Gerar por pedido" (D90). O caminho **fecha**, mas às cegas.

---

## 3. Onde o fluxo quebra, em resumo

| Passo | Quebra | Origem |
| --- | --- | --- |
| A4, B8 | natureza sem campo e sem cadastro | FT-2, FT-17; banco 0 |
| **A5** | **destinatário sem endereço fiscal e sem tela para cadastrá-lo** | medição acima; `DestinatarioFiscalResolver.cs:157-173` |
| B2, D, F3 | três caminhos sem texto de efeito | FT-12, FT-14 |
| B5 | pedido aprovado sem reserva nunca prepara | `PrepararFaturamentoUseCase.cs:77-86`; sem rota de reserva |
| B7 | próximo número fora da tela | `FaturamentoDialogs.tsx:114-119` × `NotaFiscalSerieField.tsx:59` |
| B10 | condição omitida gera parcela única, em silêncio | `FiscalOperacoesNotaAutorizadaUseCases.cs:484-499` |
| B11 | `correlationId` ausente | FT-1 |
| B12, C2 | sucesso falso | FT-3 |
| C3, C6 | "tentar de novo" sem nome, e diálogo que zera | `FaturamentoDialogs.tsx:72-82`; `Faturamento.cs:117-123` |
| C4 | Preparar duplica | FT-10 |
| B6, B13 | GUID cru | FT-15 |

---

## 4. Posição por questão

### Q1 — `correlationId`: o frontend gera, um por tentativa, e a regra de reuso sai do contrato

**Isto se resolve lendo o contrato, e a P-1 do inventário deixa de ser pergunta.** A idempotência da
transmissão (`FiscalIntegracaoSefazSupport.cs:30-68`) tem três casos:

- **mesmo ID após sucesso:** devolve sucesso idempotente, sem nova chamada à SEFAZ;
- **mesmo ID com tentativa pendente:** recusa com "aguarde";
- **mesmo ID após falha:** recusa com "gere um novo correlationId".

Nos legs 5 e 6 o ID não tem papel de idempotência: há **0** ocorrências de `correlation` no arquivo
dos dois use cases (grep acima). Quem protege esses legs são os guards por leg.

Daí sai a regra operacional:

1. O frontend gera o ID com o gerador que já existe, `createFiscalCorrelationId('faturamento', faturamentoId)`
   (`fiscalUiUtils.ts:512-524`). São cerca de 48 caracteres pela soma dos segmentos, dentro dos 100.
   O schema de request passa a exigir o campo, porque o Confirmar aceita nulo e a transmissão não.
2. **O ID é mantido quando a chamada falha no transporte** (timeout, rede). O desfecho é
   desconhecido, e reenviar o mesmo ID é justamente o que impede transmitir duas vezes: dá sucesso
   idempotente ou "aguarde".
3. **O ID é trocado a cada resposta recebida** (200 ou 400) e a cada abertura do diálogo. Uma nova
   tentativa depois de falha real exige ID novo, pelo próprio backend.
4. Ele aparece **somente leitura**, e onde o operador vai precisar dele: **no resultado da
   confirmação** (Q3), para passar ao suporte. Dentro do formulário ele é ruído, porque ninguém faz
   nada com ele antes de clicar.

**Abro mão:** de mostrar o histórico de IDs das tentativas anteriores. Quem investiga uma tentativa
antiga vai ao log fiscal da nota, e não ao faturamento.

### Q2 — Natureza: adoto o núcleo da D91 do Codex e recuso a moldura

**Adoto:**

- consumir `GET /api/fiscal/naturezas-operacao?empresaId=&somenteAtivas=true` em `features/fiscal`
  (D47);
- seletor por rótulo (código e descrição), enviando o `id`;
- nunca GUID digitado;
- nunca fallback de texto livre;
- sem a natureza, com "Validar dados fiscais" ligado, o botão Confirmar fica indisponível e diz o
  motivo.

Esse último item espelha uma recusa certa do backend (`GerarNotaFiscalPedidoVendaUseCase.cs:165-168`),
na mesma condição, e não cria regra nova.

**Recuso, e cada item tem título próprio na §9:**

1. Tratar a `b59` como a única dívida. O muro seguinte é o destinatário (A5). Sem dizer isso, a `b71`
   sai como "Faturamento completo" e o primeiro cliente real para no leg 1 com
   `DestinatarioSemEnderecoFiscal`.
2. Classificar o caso como `AUTO_BLOQUEIO` (Q6 e §9).
3. Bloquear o Confirmar por falta de `PRODUTOS_CONSULTAR` para um campo de fallback (Q4).

**Custo de cada caminho para o operador:**

| Caminho | O que o operador faz | Frequência (intuição, não medição) | Aceitável se… |
| --- | --- | --- | --- |
| (a) D91: consome o GET, e o cadastro vira dívida | o implantador cadastra natureza e matriz pela API ou Swagger; o faturista escolhe no combo | algumas vezes por empresa, na implantação | houver implantador com acesso à API **e** o CHANGELOG disser isso |
| (b) `b71` absorve a `b59` | ninguém sai do ERP para cadastrar natureza | a mesma | nunca vale o custo aqui: a `b59` tem 10 ACs, rota, menu e a migração de selects da D47. Resolve um cadastro de implantação e deixa o recorrente (A5) igual |
| (c) nada | o faturamento fica inútil | sempre | nunca |

**Fico com (a)**, e com uma condição que não é enfeite: o estado vazio do seletor diz, literalmente,
que não há natureza ativa para a empresa e que o cadastro ainda não tem tela nesta versão. A
mensagem só não pode prometer o que não existe. O CHANGELOG nomeia as **três** dívidas que separam
esta tela de um faturamento concluído: `b59`, `b60` e `b61`.

**A D91 diz ter "orientação explícita do usuário".** Não tenho como verificar isso. Se a orientação
existiu, ela decide (a), e a minha posição não muda. Quem confirma é o orquestrador.

### Q3 — O resultado real, leg a leg, sai da própria resposta, sem pergunta ao backend

`ConfirmarFaturamentoResponse.faturamento` vem **com os legs**, cada um com estado e motivo, porque
`ConstruirRespostaAsync` os carrega (`ConfirmarFaturamentoUseCase.cs:370-374`). A P-7 do inventário
("pôr o motivo em `alertas`") deixa de bloquear. Ela seria conveniente, e não é necessária.

A tela precisa permitir, depois de cada Confirmar:

1. **Sucesso só com `etapa == Faturado`.** Qualquer outra etapa não é "confirmado".
2. **Com `Erro`, mostrar o leg que falhou, pelo rótulo do catálogo D25, e o motivo** que o backend
   gravou, sem reescrever o texto.
3. **Com `PendenteFiscal`, aviso com os `alertas`**, que nesse caso já trazem o motivo da rejeição ou
   da inconclusão.
4. **O próximo passo, dito pelo que o código faz**, sem inventar regra:
   - legs 1 a 3, 5 e 6: "corrija e **tente de novo neste faturamento**; o que já foi feito não se
     repete" (`ConfirmarFaturamentoUseCase.cs`, guards por leg, AC-012);
   - leg 4: o texto do backend, até a B-28 responder.
5. **O `correlationId` usado** (Q1), e em todos os casos a reconsulta que já existe (D27, `onSettled`).

**Onde:** no diálogo que fica aberto com o resultado, ou num painel da página. O `arquiteto-design-system`
decide. O que eu exijo é que o resultado não seja um toast que some: o operador que confirma
vinte vezes por dia precisa de leitura que permanece enquanto ele age.

Os 400 do leg 1 (C1) precisam do `code` preservado para que o painel de erro funcione. O `runRequest`
descarta o `code` (`faturamentoApi.ts:18-24`); a D27 mandou isso para a F5.5, e aqui ele passa a
custar operação.

**Abro mão:** de links de correção por código de erro no painel (D50), porque os destinos (natureza e
endereço da Pessoa) não existem como tela. O operador lê "destinatário sem endereço fiscal" e pede o
cadastro a quem tem acesso à API.

### Q4 — UF, CFOP e unidade: cada um tem uma resposta diferente

| Campo | Posição | Fonte | Sem a permissão do catálogo |
| --- | --- | --- | --- |
| **UF autorizadora** | combo das 27 (D52: "UF é combo estático") com `value = sigla`. Isso só elimina o erro de digitação; continua oferecendo UF sem endpoint configurado (FT-6) | `useUfCatalogo` | `InputText` com regex de 2 letras no schema (FT-5), sem bloquear |
| **CFOP** | **sai do diálogo**, e o request envia `null`. Com natureza, o backend deriva o CFOP e usa `cfopPadrao` só para **recusar** quando diverge (`CfopDoItemResolver.cs:162-184`). Sem natureza, o campo é ignorado. Para o operador, o campo tem uma única função possível: gerar um 400 novo. O CFOP derivado aparece depois, na nota | — | — |
| **Unidade comercial** | combo sobre `unidades-medida` (catálogo de produtos), `value = sigla`, com o texto "usada só se o produto não tiver unidade no cadastro". Pela leitura, a unidade do item vem de `UnidadeMedida` (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`), e a coluna é NOT NULL no banco | `useUnidadesMedida` | `InputText` (precedente D54: "sem permissão, continua texto livre, com aviso"), **sem bloquear o Confirmar** |
| **Série** (fora da lista do plano e decisiva) | `NotaFiscalSerieField` da b58, que mostra "próximo N" e destrava o B7 | b58 | texto livre com aviso (D54) |

Tirar o CFOP do diálogo diverge do plano da onda ("UF, CFOP e unidade como dropdown") e da D91, que
propõe o CFOP "de catálogo, enviando o código". O plano não é uma Dn, e a D91 não está travada.
Se a rodada preferir manter o campo, ele vira combo com `value = codigo`, porque o hook atual
devolve o `id` (FT-7), e fica **opcional e recolhido**, com a dica "conferência: se diferir do CFOP
derivado da natureza, a confirmação é recusada".

**Abro mão:** de um padrão automático para a UF, que pouparia um campo por confirmação. Deduzir que a
UF autorizadora é a do emitente seria regra fiscal que nenhuma fonte deste projeto documenta. Vira a
pergunta B-29.

### Q5 — Três caminhos a partir de `Aprovado`: dizer o efeito de cada um, e parar de fabricar beco

O frontend **não esconde nem bloqueia** nenhum dos três: são modelos de operação diferentes, e qual
vale é pergunta ao cliente (P-6). A tela precisa permitir:

1. **No pedido (B2):** cada ação diz o efeito com fatos lidos do código:
   - "Faturar": não gera nota nem conta a receber, e o pedido deixa de poder ser faturado pelo módulo
     Faturamento;
   - "Gerar NF": a nota segue pelo Fiscal passo a passo, e o módulo Faturamento passa a recusar este
     pedido.
   O lugar certo é o diálogo de cada ação (Q7), e não uma faixa permanente.
2. **No Preparar (C4, D):** ao escolher o pedido, a tela consulta
   `GET /api/faturamento?empresaId=&pedidoVendaId=`. O filtro já existe no contrato e no tipo, e
   nunca foi usado (FT-20). Se houver faturamento do pedido em `Erro`, a tela diz "este pedido já tem
   faturamento com erro; abra-o e tente de novo" e oferece o link. **Não bloqueia**, porque criar
   outro é permitido pelo backend. É uma única chamada, na escolha, e não uma por linha.
3. **O texto falso do Preparar sai** (FT-10). Ele passa a dizer o que o backend faz: reaproveita só
   o que está em andamento, e não o que está com erro nem o cancelado.
4. **O combo do Preparar filtra `Aprovado`** e mostra o cliente no rótulo (FT-11), com o aviso de
   teto da D78/D88.

**Abro mão:**

- de detectar, no Preparar, que o pedido **já tem nota** (`GET notas-fiscais?origem=PedidoVenda&origemId=`,
  que o client do Fiscal já suporta em `fiscalApi.ts:224`). Isso atravessa o módulo, exige
  `FISCAL_CONSULTAR` e antecipa uma recusa do backend. O operador descobre pelo leg 1 e segue pelo
  Fiscal (D);
- de um botão "Preparar faturamento" no próprio pedido, que pouparia o B3 inteiro. Eu o quero, mas
  entendo que é navegação nova entre features. Se a rodada recusar, o operador continua indo a
  `/faturamento` e usando o combo filtrado.

### Q6 — B-6 e o campo "Thumbprint certificado" do Fiscal: não remover na `b71`; `accessRisk: CAPACIDADE` (potencial)

**O que o campo faz** (`SefazCertificateProvider.cs:15-50`, `XmlFiscalSigner.cs:26-28`):

- sem PFX configurado, um thumbprint digitado **escolhe outro certificado do repositório do
  servidor** para assinar;
- vazio, vale o padrão da configuração;
- com PFX configurado, o thumbprint é ignorado;
- a conexão TLS com a SEFAZ usa sempre o certificado padrão (`SefazSoapClient.cs:40`).

Numa instalação com duas empresas (o dev tem 2) e repositório com um certificado por CNPJ, **esse
campo pode ser hoje o único jeito de assinar pela segunda empresa**. Não sei se alguém o usa: é
configuração de produção, e o frontend não mede isso.

**Classificação:**

- **`CAPACIDADE` potencial**, e não `ILUSAO`: o backend aceita o valor e age com ele;
- **não é `AUTO_BLOQUEIO`**, porque não envolve permissão de segurança (`risk.yaml:85-96`).

`CAPACIDADE` exige decisão explícita do usuário e uma ordem operacional antes do deploy. Por isso a
remoção **não entra na `b71` de carona**.

O thumbprint não é segredo: é o hash público do certificado. O defeito operacional é outro, e é
velho: um identificador técnico digitado. Para ele, o backend já tem meia resposta:
`erp.certificados_digitais` (por empresa e filial, com `Apelido`, `Thumbprint` e `ValidoAte`) existe,
tem 0 linhas e **não tem endpoint** (grep acima). Isso é a B-25.

- **Faturamento:** continua sem o campo e envia `null`. Isso serve às instalações de um certificado
  só. Para as de vários, a assinatura sai com o padrão do servidor. Qual é o efeito disso na SEFAZ eu
  não deduzo: vira a B-25.
- **Fiscal:** o campo fica como está até a B-25. O limite de 120 no schema do Fiscal já bate com a
  assinatura; o descompasso 200 × 120 (FT-16) é do Confirmar, que não o envia.

**Abro mão:** de fechar um GUID-like digitado nesta versão. O defeito vive mais uma versão, para não
tirar de alguém a única forma de assinar pela segunda empresa.

### Q7 — Heranças da D80: o resumo entra, o V11 entra, e o diálogo diz o que não acontece

No `FaturarPedidoVendaDialog`, a tela precisa permitir:

1. **Resumo como o da D79:** número, cliente por rótulo, itens e valor total, vindos da
   `pedidoVendaQueryKey` já em cache.
2. **Texto de efeito, com fatos do código:**
   - baixa ou saída de estoque quando marcado;
   - **não gera nota fiscal nem conta a receber**, e a conta sai por Financeiro → "Gerar por pedido";
   - depois disso, **o módulo Faturamento recusa este pedido**.
3. **V11:** `documento` opcional, com `.max(80)`; `observacao` com `.max(300)`; o rótulo perde o `*`.
4. **`ApiErrorPanel` no diálogo**, como a D79 fez na aprovação. Os erros de estoque
   (`ProdutoControlaEstoqueSemLocal`, `FalhaEstoque`) aparecem ali, e não num toast.
5. **O toast de sucesso para de dizer só "com baixa de estoque"** e passa a dizer o que aconteceu.

O mesmo vale para "Gerar NF": uma linha de efeito no diálogo, dizendo que o módulo Faturamento
passará a recusar este pedido.

**Travessia para a aprovação (D79), levantada e não imposta:** o pedido aprovado **sem reserva**
nunca passa pelo Preparar (B5), e não há como reservar depois. O texto da D79 explica a reserva e não
diz isso. Acrescentar uma frase ao texto da aprovação toca uma decisão travada. Levo ao orquestrador;
não reinterpreto a D79. A causa é a B-5, que já existe.

### Q8 — Menores

Concordo, sem ressalva:

- **FT-9:** `enabled: Boolean(empresaId)` na listagem, no padrão da D82/D88;
- **FT-4:** tipo de documento com as **2** opções que o validator aceita
  (`FaturamentoValidators.cs:20-21`). Isso é refletir o validator, e não regra nova;
- **FT-5:** limites no schema;
- **FT-10:** o texto do Preparar (Q5).

E acrescento, pelo operador:

- **FT-15 no detalhe:** o número do pedido e o cliente, com link para `/vendas/pedidos/[id]`, a
  partir de **um** GET do pedido (`VENDAS_CONSULTAR`). Sem a permissão, fica o rótulo neutro da D66.
  Na lista, mapear pelo `usePedidosVenda` da empresa já carregado; se o pedido não estiver ali, "Pedido
  não carregado", sem uma chamada por linha.
- **Conta a receber:** o rótulo "gerada", com o link para a lista de Contas a Receber. Não existe rota
  de detalhe, e não a crio.
- **B10, a condição omitida:** texto fixo no campo: "sem condição, a conta a receber é gerada em
  parcela única no 1º vencimento" (`FiscalOperacoesNotaAutorizadaUseCases.cs:484-499`).
- **C3, a retomada:** com `notaFiscalId` presente, o diálogo diz que a nota já existe e que série,
  número, natureza e unidade **não serão usados**. Os campos ficam, porque o validator ainda os exige
  (pergunta B-26), mas o operador sabe que não está refazendo a nota. O botão, nas etapas `Erro` e
  `PendenteFiscal`, diz que é uma nova tentativa. O nome é do `arquiteto-design-system`.
- **FT-18:** quem tem só `CONFIRMAR`/`CANCELAR` entra pela rota e cai no `UnauthorizedState`. Concordo
  em alinhar rota e tela; o eixo é de plataforma. `REVERTER_INTEGRACAO` segue a D24.

**Abro mão:**

- de pré-preencher a condição de pagamento com a condição padrão do cliente (`Cliente.cs:27`, dado
  da b66). Seriam mais duas leituras entre módulos. O operador escolhe à mão, avisado do efeito;
- de desabilitar o Cancelar com o leg 4 integrado. Isso seria replicar a regra, e a D24 manteve o
  botão. A recusa só precisa aparecer no diálogo, com o texto do backend, e não num toast.

### Q9 — Fatiamento e gate

**Sou indiferente entre uma `b71` e uma `.cN` antes, com uma condição.** O bloco que entra primeiro,
seja qual for o número, é **a verdade da tela**: FT-3 (resultado por leg), FT-1, FT-10 (texto) e
FT-4.

O argumento de operação para a `.cN` é que o toast verde sobre uma etapa `Erro` é a mentira mais cara
do recorte: o operador libera a carga achando que há nota. O argumento contra é que a `.cN` sozinha
não faz nenhum faturamento concluir, por causa de FT-2 e A5. O `arquiteto-escopo-entrega` pesa o
calendário melhor do que eu.

Se for versão única, a ordem dos blocos é:

- **A:** a verdade (Q1, Q3, FT-4, FT-5, FT-9, FT-10);
- **B:** o diálogo com catálogos (Q2, Q4, série);
- **C:** Vendas (Q7) e o Preparar (Q5);
- **D:** permissões e gate.

**Gate de campos:** deve cobrir `FaturamentoResponse`, `FaturamentoLegResponse`,
`ConfirmarFaturamentoResponse` e `NaturezaOperacaoResponse`, na infraestrutura da D83. Pelo lado da
operação: o painel de resultado (Q3) passa a **decidir sucesso ou erro** lendo `etapa`, `legs[].estado`
e `legs[].motivo` da resposta do Confirmar. Se um nome derivar, a tela volta a mentir, agora sem toast
para desconfiar. O teste de payload do request deve afirmar `correlationId` presente, `naturezaOperacaoId`
enviado, `cfopPadrao` nulo e `certificateThumbprint` ausente.

---

## 5. O que a tela precisa permitir (cada item, com o passo que destrava)

| # | Permitir | Destrava |
| --- | --- | --- |
| 1 | escolher a natureza ativa da empresa por rótulo, com um estado vazio honesto | B8 (e A4 declarado) |
| 2 | escolher a série vendo o próximo número (`NotaFiscalSerieField`) | B7 |
| 3 | escolher a UF e a unidade em combo, com fallback de texto sem permissão | B9 |
| 4 | o CFOP fora do fluxo padrão | B9, sem criar um 400 |
| 5 | o `correlationId` gerado, mantido em falha de transporte e trocado a cada resposta | B11, C3 |
| 6 | o resultado por leg, que permanece na tela, com o próximo passo e o ID | B12, C2, C5, C6 |
| 7 | o diálogo de retomada dizendo o que não será refeito | C3 |
| 8 | o Preparar avisando do faturamento em `Erro` do mesmo pedido, com link | C4, D |
| 9 | o combo do Preparar só com `Aprovado`, com cliente no rótulo e aviso de teto | B3 |
| 10 | a listagem só com empresa resolvida | B4 |
| 11 | o pedido e o cliente por rótulo no detalhe | B6 |
| 12 | o efeito da condição omitida dito no campo | B10 |
| 13 | Faturar (Vendas) com resumo, efeito, V11 e `ApiErrorPanel` | F1–F3 |
| 14 | "Gerar NF" dizendo que o Faturamento passa a recusar o pedido | D1 |
| 15 | a recusa de cancelamento no diálogo, e não em toast | E2 |

---

## 6. Impacto em módulo vizinho

- **Vendas:** o diálogo Faturar (Q7) e uma linha no "Gerar NF". O pedido vira `Faturado` pelo
  handler da autorização (`FiscalPedidoVendaAutorizacaoHandler.cs:55,69`). A invalidação do
  Confirmar hoje só toca chaves de faturamento (`useFaturamentoResources.ts:28-33`); quem volta ao
  pedido depende do refetch ao montar. Registro o ponto para a plataforma, sem exigir nada. Há ainda
  a **travessia com a aprovação** (B5, D79/B-5).
- **Fiscal:**
  - o client e hook de consulta de naturezas nasce em `features/fiscal` (D47);
  - a legenda falsa "sem endpoint operacional" (`FiscalActionDialogs.tsx:141,199`) continua mentindo
    no Fiscal. Corrigir a legenda **sem** trocar o campo seria mudar o texto sem mudar a capacidade,
    que a D51 proíbe ("o texto e a capacidade mudam juntos"). Com o client de consulta pronto, a troca
    do campo no Fiscal custa pouco. Proponho que entre só se o escopo aceitar; senão, fica com a `b59`;
  - o thumbprint (Q6) não é tocado.
- **Pessoas:** a dependência forte (A5). Zero de código na `b71`; a declaração vai no CHANGELOG.
- **Estoque:** o leg 5 consome a reserva da aprovação; o Faturar lógico baixa ou registra a saída.
  Não há mudança de código.
- **Financeiro:** o leg 6 gera o título. Parcela única sem condição (B10); o rótulo de origem da D85
  vale para ele. Não há mudança de código.

---

## 7. Regra × UX: onde a proposta está prestes a errar

- **Regra no frontend, que eu recuso:**
  - desabilitar o Cancelar com o leg 4 integrado (D24);
  - detectar `NotaJaExisteParaOrigem` pelo **texto** do motivo do leg (a D50 manda indexar por
    `Error.Code`, e o leg não tem código);
  - deduzir a UF autorizadora pela do emitente;
  - bloquear o Preparar porque já existe nota.
- **Bloqueio que o backend já retorna e a tela não reflete:**
  - a etapa `Erro` com 200 (FT-3);
  - o motivo por leg na própria resposta;
  - o `code` do 400 (C1);
  - `PodeConfirmar` em `Erro` como caminho de nova tentativa (C3).
- **Espelho aceitável:** exigir natureza quando "Validar dados fiscais" está ligado, o tipo de
  documento com 2 opções e os limites de tamanho. São a mesma condição do validator ou do use case,
  com a linha citada.
- **Decisão que não é minha nem do frontend:** se o faturista pode desligar "Validar dados fiscais".
  O backend aceita e gera a nota sem CFOP, com alerta (`GerarNotaFiscalPedidoVendaUseCase.cs:169-172`).
  Removê-lo ou mantê-lo é escolha de risco fiscal, que só o cliente decide. Mantenho o status quo:
  visível, marcado por padrão, com o efeito dito no texto. Vira pergunta funcional.

---

## 8. Propostas de decisão

- **D-A (Q1):** o frontend gera o `correlationId` com `createFiscalCorrelationId`; o ID é mantido
  em falha de transporte, trocado a cada resposta e a cada abertura, exigido no schema, e mostrado
  somente leitura no resultado. Alternativa descartada: um ID fixo por abertura, porque uma nova
  tentativa depois de falha seria recusada por `FiscalIntegracaoSefazSupport.cs:68`. Reversível: sim.
- **D-B (Q2):** adotar o núcleo da D91, com o estado vazio honesto; nomear `b59`, `b60` e `b61` como
  dívidas no CHANGELOG; `accessRisk: ILUSAO` para exigir `FISCAL_CADASTROS_CONSULTAR`, e não
  `AUTO_BLOQUEIO`. Reversível: sim.
- **D-C (Q3):** sucesso só em `Faturado`; resultado por leg a partir da resposta; próximo passo pelo
  que o código faz; o resultado permanece na tela. Reversível: sim.
- **D-D (Q4):** UF em combo das 27; unidade em combo de `unidades-medida` com fallback sem bloqueio;
  série pelo `NotaFiscalSerieField`; **CFOP fora do diálogo**, com a alternativa de combo por código,
  opcional e recolhido. Reversível: sim.
- **D-E (Q5):** texto de efeito nos três caminhos; aviso de faturamento em `Erro` do mesmo pedido no
  Preparar, sem bloqueio; combo do Preparar só com `Aprovado`. Reversível: sim.
- **D-F (Q6):** o thumbprint do Fiscal fica até a B-25; a classificação é `CAPACIDADE` potencial, e a
  remoção exige decisão do usuário. Reversível: sim. Remover sem essa decisão pode não ter volta
  barata: uma empresa sem assinatura até um deploy corretivo.
- **D-G (Q7):** Faturar com resumo, efeito, V11 e `ApiErrorPanel`; a frase sobre reserva na
  aprovação vai ao orquestrador. Reversível: sim.

---

## 9. Discordâncias

### Discordo da D91 (Codex) em tratar a `b59` como a única dívida entre a tela e o faturamento concluído

Ela propõe a `b71` com natureza consumida e a `b59` como dívida. Isso implica que o CHANGELOG da `b71`
diga "Faturamento completo", e que o primeiro cliente real pare no leg 1 com
`DestinatarioSemEnderecoFiscal`: o banco dev tem **0** endereços de pessoa, e o frontend consome
**0** rotas de endereço e de dados fiscais da Pessoa (medição no topo). Isso acontece **a cada
cliente novo**, e não uma vez por implantação.

**Alternativa:** mesma `b71`, com as três dívidas nomeadas e o painel de resultado (Q3) mostrando o
motivo do backend. Perde o título "completo"; ganha não mentir. Reversível: sim.

### Discordo da D91 em `accessRisk: AUTO_BLOQUEIO`

`AUTO_BLOQUEIO` é perder a permissão de devolver permissões (`risk.yaml:85-96`), e aqui nenhuma
permissão de segurança está em jogo. Exigir `FISCAL_CADASTROS_CONSULTAR` para confirmar é `ILUSAO`
pela leitura do código: nenhuma confirmação conclui hoje (FT-1 + FT-2), então ninguém perde uma
operação que funciona. O CHANGELOG diz isso com todas as letras e nomeia a permissão a conceder. **Não
medido em execução.** Se alguém provar que um faturamento concluiu no HEAD, vira `CAPACIDADE`.

### Discordo da D91 em bloquear o Confirmar por falta de `PRODUTOS_CONSULTAR`

A unidade é fallback raro (`UnidadeMedidaId` NOT NULL, 3 de 3 produtos com unidade). Bloquear a
confirmação inteira por falta de um catálogo de fallback tira do faturista um passo que não depende
dele. **Alternativa:** texto livre com aviso, no precedente D54. Perde pureza de catálogo; ganha o
faturista que não tem permissão de produtos. Reversível: sim.

### Discordo da D91 e do plano da onda em manter o CFOP no diálogo

A D91 manda enviar o código escolhido de um catálogo. Para o operador, o campo só pode produzir
`CfopDivergenteDoDerivado`; sem natureza, é ignorado. **Alternativa:** tirar o campo (D-D), ou mantê-lo
opcional e recolhido. Perde uma conferência que ninguém no fluxo manual pediu; ganha um campo a menos
vinte vezes por dia. Reversível: sim.

### Antecipando `arquiteto-escopo-entrega`

Se ele cortar o painel de resultado por leg (Q3) para "só trocar o toast pela etapa", o operador vê
"Erro" e precisa rolar até a tabela de legs e as ocorrências para saber o que fazer, **toda vez**
que um leg falha. Enquanto A5 não tiver tela, isso é quase toda confirmação. Aceito o recorte se a
tabela de legs já existente ganhar o destaque do leg que falhou. Não aceito se o resultado continuar
num toast.

### Antecipando `arquiteto-plataforma-frontend`

Concordo de antemão em não carregar o mundo:

- nada de consulta de nota por pedido no Preparar;
- nada de prefill da condição pelo cliente;
- nada de GET por linha na lista.

Mantenho **um** GET de faturamentos por pedido na escolha do Preparar e **um** GET do pedido no
detalhe. São duas chamadas por ação, e não por linha.

### Antecipando `arquiteto-design-system`

Não peço padrão novo de tela. O resultado por leg reusa a tabela de 6 legs da D25. O que peço é que
ela vire o resultado da confirmação, e não um anexo lido depois.

---

## 10. O que eu abro mão, em resumo

| Abro mão de | O operador passa a fazer, à mão | Frequência (intuição) |
| --- | --- | --- |
| cadastro de natureza na tela (`b59`) | pedir ao implantador que cadastre pela API | algumas vezes por empresa |
| endereço e bloco fiscal da Pessoa (`b60`/`b61`) | **pedir o cadastro pela API a cada cliente novo**; até lá, o faturamento desse cliente para no leg 1 | cada cliente novo. **É o que aceito com mais relutância** |
| conferência de CFOP | nada, porque o backend deriva | — |
| UF padrão | escolher a UF em toda confirmação | toda confirmação |
| numeração automática | ler "próximo N" e digitar | toda confirmação |
| prefill da condição pelo cliente | escolher a condição, avisado do efeito | toda confirmação |
| detectar nota existente no Preparar | descobrir pelo leg 1 e seguir pelo Fiscal | raro, se o texto do "Gerar NF" funcionar |
| botão "Preparar" no pedido (se recusado) | ir a `/faturamento` e usar o combo | todo faturamento |
| remover o thumbprint digitável do Fiscal | conviver com um identificador técnico digitado mais uma versão | quem assina pelo Fiscal |
| Cancelar desabilitado com o leg 4 integrado | ler a recusa e ir à nota pelo botão que já existe | raro |
| links de correção por código (D50) | ler o motivo e pedir o cadastro | a cada falha de cadastro |

---

## 11. Perguntas que só o backend ou o cliente respondem

**Resolvidas lendo o contrato**, sem pergunta:

- P-1 (idempotência do `correlationId`): §Q1;
- P-7 (motivo em `alertas`): a resposta já traz os legs, §Q3;
- de onde vem o CFOP e a unidade: inventário §4 e §6.

**Novas:**

- **B-25 (B-6, decide Q6):** o certificado de assinatura vai ser resolvido por empresa e filial a
  partir de `certificados_digitais` (existe, com 0 linhas e sem endpoint), ou vai ser exposto num GET
  com `Apelido` para seleção? Enquanto isso, numa instalação com duas empresas e o certificado no
  repositório do servidor, com que certificado o faturamento da segunda empresa assina, e isso é
  aceito? Decide se o thumbprint do Fiscal pode sair, e se o faturamento serve a multiempresa.
- **B-26 (decide C3 e B7):** série, número, natureza e unidade podem ficar opcionais no Confirmar
  quando o faturamento já tem `NotaFiscalId`? E o número pode ser alocado pela série
  (`proximoNumero` já existe), em vez de digitado? Decide se a retomada e a confirmação diária perdem
  campos.
- **B-27 (P-5 ampliada, decide D e C4):** o Preparar deveria reaproveitar o faturamento em `Erro`? O
  leg 1 deveria vincular a nota da mesma origem, em vez de falhar para sempre? E a nota **cancelada**
  deveria continuar travando a origem (`FiscalRepository.cs:33-39` não filtra status)? Decide se o
  pedido `00014` e iguais têm saída pelo Faturamento, ou só pelo Fiscal.
- **B-28 (decide Q3, item 4, leg 4 e E2):** depois de uma rejeição ou de uma transmissão inconclusiva
  dentro do faturamento, o operador deve Confirmar de novo (com ID novo), ou aguardar o
  reprocessamento do Fiscal? E, cancelada a nota autorizada pelo Fiscal, o que acontece com a baixa,
  com o título e com a etapa do faturamento? Decide o texto do próximo passo e se o desfazer depois
  da SEFAZ fecha.
- **B-29 (P-2 e P-4, decide Q4):** a UF autorizadora pode cair em `DefaultUfAutorizadora` quando
  omitida (hoje o campo não é lido), ou haverá lista das UFs configuradas? A unidade comercial padrão
  pode ser opcional, sendo fallback? Decide dois campos a menos em cada confirmação.
- **Cliente (P-6 e a flag):** qual dos três caminhos a empresa usa: NF fora do ERP (Faturar lógico),
  Fiscal passo a passo, ou Faturamento orquestrado? O faturista pode desligar "Validar dados
  fiscais"? Decide se algum botão sai do pedido numa versão futura, e se a flag fica no diálogo.

---

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "faturamento",
  "slice": "v1.11.0a8b71",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/13-operacao-faturamento.md",
  "decisoesPropostas": [
    { "id": "D-A-faturamento", "titulo": "correlationId gerado pelo frontend (createFiscalCorrelationId), mantido em falha de transporte, trocado a cada resposta e abertura, exigido no schema, exibido somente leitura no resultado", "reversivel": true, "gatilho": "backend passar a gerar o correlationId no Confirmar" },
    { "id": "D-B-faturamento", "titulo": "Adota o nucleo da D91 (natureza ativa por empresa, seletor por rotulo, sem fallback livre), com estado vazio honesto, CHANGELOG nomeando b59, b60 e b61 como dividas, e accessRisk ILUSAO (nao AUTO_BLOQUEIO)", "reversivel": true, "gatilho": "entrega da b59/b60/b61, ou prova de faturamento concluido no HEAD (vira CAPACIDADE)" },
    { "id": "D-C-faturamento", "titulo": "Sucesso so com etapa Faturado; resultado por leg lido de ConfirmarFaturamentoResponse.faturamento.legs; proximo passo pelo que o codigo faz; resultado permanece na tela", "reversivel": true, "gatilho": "resposta a B-28" },
    { "id": "D-D-faturamento", "titulo": "UF em combo das 27; unidade em combo de unidades-medida com fallback textual sem bloqueio; serie via NotaFiscalSerieField; CFOP fora do dialogo (alternativa: combo por codigo, opcional e recolhido)", "reversivel": true, "gatilho": "resposta a B-29" },
    { "id": "D-E-faturamento", "titulo": "Texto de efeito nos tres caminhos a partir de Aprovado; aviso no Preparar de faturamento em Erro do mesmo pedido (GET por pedidoVendaId), sem bloqueio; combo do Preparar so com Aprovado e cliente no rotulo", "reversivel": true, "gatilho": "resposta a B-27 ou ao cliente sobre o caminho canonico" },
    { "id": "D-F-faturamento", "titulo": "Thumbprint digitavel do Fiscal permanece ate B-25; classificacao CAPACIDADE potencial; remocao exige decisao do usuario; Faturamento segue enviando null", "reversivel": true, "gatilho": "resposta a B-25" },
    { "id": "D-G-faturamento", "titulo": "Faturar (Vendas) com resumo D79, texto de efeito (sem NF, sem titulo, fecha o modulo Faturamento), V11 (documento opcional max 80, observacao max 300) e ApiErrorPanel", "reversivel": true, "gatilho": "nenhum" }
  ],
  "discordancias": [
    { "de": "proposta Codex D91", "ponto": "b59 tratada como a unica divida; o leg 1 para em DestinatarioSemEnderecoFiscal (0 enderecos de pessoa no dev, 0 rotas de endereco consumidas pelo frontend), a cada cliente novo", "impacto": "alto" },
    { "de": "proposta Codex D91", "ponto": "accessRisk AUTO_BLOQUEIO mal classificado; e ILUSAO pela leitura do codigo", "impacto": "medio" },
    { "de": "proposta Codex D91", "ponto": "bloquear o Confirmar por falta de PRODUTOS_CONSULTAR para a unidade, que e fallback", "impacto": "medio" },
    { "de": "proposta Codex D91 e plano da onda", "ponto": "CFOP no dialogo so pode produzir CfopDivergenteDoDerivado; proponho tira-lo", "impacto": "medio" },
    { "de": "arquiteto-escopo-entrega (antecipada)", "ponto": "trocar so o toast pela etapa, sem o resultado por leg permanente", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-25 (B-6): certificado por empresa e filial via certificados_digitais (existe, 0 linhas, sem endpoint) ou GET com Apelido? Com que certificado assina a segunda empresa hoje?", "decide": "se o thumbprint do Fiscal pode sair e se o faturamento serve a multiempresa" },
    { "tipo": "backend", "pergunta": "B-26: serie, numero, natureza e unidade opcionais quando NotaFiscalId ja existe? Numero alocado pela serie (proximoNumero)?", "decide": "campos da retomada e da confirmacao diaria" },
    { "tipo": "backend", "pergunta": "B-27: Preparar reaproveita faturamento em Erro? O leg 1 vincula a nota existente da mesma origem? Nota cancelada continua travando a origem (FiscalRepository.cs:33-39 nao filtra status)?", "decide": "se o pedido 00014 e iguais tem saida pelo Faturamento ou so pelo Fiscal" },
    { "tipo": "backend", "pergunta": "B-28: apos rejeicao ou transmissao inconclusiva, Confirmar de novo ou aguardar o reprocessamento do Fiscal? Cancelada a nota autorizada pelo Fiscal, o que acontece com a baixa, o titulo e a etapa?", "decide": "texto do proximo passo no leg 4 e se o desfazer apos a SEFAZ fecha" },
    { "tipo": "backend", "pergunta": "B-29: UF autorizadora pode cair em DefaultUfAutorizadora (hoje nao lido) ou haver lista das UFs configuradas? Unidade comercial padrao pode ser opcional?", "decide": "dois campos a menos em toda confirmacao" },
    { "tipo": "funcional", "pergunta": "Qual dos tres caminhos a empresa usa (Faturar logico, Fiscal passo a passo, Faturamento orquestrado)? O faturista pode desligar 'Validar dados fiscais'?", "decide": "se algum botao sai do pedido no futuro e se a flag fica no dialogo" },
    { "tipo": "orquestrador", "pergunta": "A D91 cita 'orientacao explicita do usuario' para nao entregar a b59; isso e fato?", "decide": "se o caminho (a) de Q2 e decisao do usuario ou so do Codex" },
    { "tipo": "orquestrador", "pergunta": "Acrescentar a frase 'sem reserva, o pedido nao passa pelo modulo Faturamento' ao texto da aprovacao toca a D79; autoriza?", "decide": "se o beco B5 ganha aviso antes de acontecer" }
  ],
  "riscos": [
    "A5: com a natureza informada, o leg 1 exige endereco fiscal principal com municipio IBGE do destinatario (DestinatarioFiscalResolver.cs:157-173). O dev tem 0 enderecos de pessoa e o frontend nao tem tela para cadastrar. Pela leitura do codigo, nenhum faturamento conclui pela tela mesmo depois da b71; nao medido em execucao.",
    "Leg 2 (XML) com a validacao desligada: nao verificado se tambem exige o endereco e o indicador do destinatario (ContextoTributarioDocumentoResolver).",
    "B5: pedido aprovado sem reserva nunca passa pelo Preparar e nao ha rota para reservar depois; nao acomodado na b71 (depende de B-5 e de tocar a D79).",
    "D: pedido com nota gerada por 'Gerar NF' fica fora do Faturamento para sempre, mesmo com a nota cancelada; a b71 so acomoda com texto; a saida real e pelo Fiscal.",
    "C5 e E2: o proximo passo apos rejeicao ou inconclusao SEFAZ, e o efeito do cancelamento fiscal sobre a baixa e o titulo, ficam sem texto preciso ate B-28.",
    "Multiempresa: sem thumbprint, o Faturamento assina com o certificado padrao do servidor; o efeito para a segunda empresa nao e deduzido aqui (B-25).",
    "Numeracao manual: o operador digita o numero a cada confirmacao; colisao vira 400 NotaNumeroJaCadastrado no leg 1, sem reserva de numero (B-26).",
    "Condicao de pagamento omitida gera o titulo em parcela unica, em silencio no backend; a b71 so acomoda com texto.",
    "Nenhum gate nem teste executado nesta rodada; tudo e leitura de codigo e consulta ao banco dev."
  ]
}
```
