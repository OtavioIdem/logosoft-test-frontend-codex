
# Posição: `arquiteto-plataforma-frontend`, rodada 13 (`faturamento`)

Viés declarado: ano cinco. A pergunta não é se a `b71` confirma um faturamento. É quanto custa mudar
isto depois de haver oito empresas emitindo, cada uma com o próprio CNPJ, as próprias naturezas e,
cedo ou tarde, o próprio certificado. E também depois de a Vendas passar a ler o estado do
faturamento, e de o `correlationId` que esta versão fixar já estar gravado nos logs fiscais de
produção.

## 1. Assunto e recorte

**Em debate:** o contrato de escrita do Confirmar (FT-1, FT-2, FT-4, FT-5), a leitura do resultado
(FT-3), a escolha entre os três caminhos que saem de `Aprovado` (FT-10, FT-11, FT-12), a listagem sem
empresa (FT-9), o certificado (B-6, FT-16), as heranças da D80 e o fatiamento.

**Fora:** reabrir a D24 (cancelamento e `FATURAMENTO_REVERTER_INTEGRACAO`), a D30 (os campos sem uso
por decisão), a D26 (a listagem sem sinal de legs) e o desenho visual da modal.

**Árvore lida:** o frontend no HEAD `1a35cb9`, com a árvore de trabalho limpa fora de `.codex/` e
`.agents/`. Chequei com `git status --short`. O rascunho do Codex li em
`codex/b71-planejamento-codex` (`38e2213`), como pede o briefing. O backend li em
`../New project 3/src`. Não rodei Docker nem `psql`. Os números do banco dev são os do inventário 13,
citados como tal.

## 2. Evidência nova (fora do inventário, medida por mim)

| # | Fato | Onde | Por que muda a decisão |
| --- | --- | --- | --- |
| E1 | O `correlationId` tem **quatro** semânticas na transmissão. Com log `Sucesso`, o reenvio é idempotente e não chama a SEFAZ de novo. Com `Pendente`, recusa. Com `Reprocessamento`, recusa e manda usar o reprocessamento. Com falha finalizada, recusa: "Gere um novo correlationId" | `FiscalIntegracaoSefazSupport.cs:30-68` | O ID tem de ser **o mesmo** num reenvio de resultado desconhecido (timeout, 5xx) e **novo** numa tentativa depois de uma resposta recebida. Isso decide Q1 |
| E2 | O Confirmar é reentrante. `ExigirPodeConfirmar` recusa só `Faturado`/`Cancelado`, então aceita `Erro`. Os legs 1 a 6 são pulados quando já integraram | `Faturamento.cs:117-123`; `ConfirmarFaturamentoUseCase.cs:119,161,188,245,291` | Um faturamento em `Erro` se retoma confirmando **o mesmo** registro. Criar outro pelo Preparar é o caminho errado, e não só o texto errado (FT-10) |
| E3 | A resposta 200 do Confirmar já traz `faturamento` **com os legs** e o `motivo` de cada um | `ConfirmarFaturamentoUseCase.cs:370-374` (`ConstruirRespostaAsync` → `ListarLegsAsync`) | O FT-3 se resolve só com o contrato atual. A P-7 do inventário não bloqueia |
| E4 | `GET /api/faturamento` filtra por `PedidoVendaId` no servidor, e `GET /api/fiscal/notas-fiscais` filtra por `Origem` + `OrigemId` | `FaturamentoRepository.cs:37`; `NotaFiscalRequests.cs` (`ListarNotasFiscaisRequest`, `Origem`, `OrigemId`) | O pedido consegue saber, com **duas consultas limitadas**, se já tem faturamento ou nota. Não precisa varrer lista nenhuma. Decide Q5 |
| E5 | O thumbprint digitado escolhe **qualquer** certificado do store do servidor, e não há conferência de CNPJ contra o emitente. No modo PFX, o valor digitado é **ignorado** | `SefazCertificateProvider.cs:17-60` (`FindByThumbprint`; `ValidarCertificadoCarregado` só confere validade e chave privada); `XmlFiscalSigner.cs:26-28` | A B-6 não é sobre "segredo". O thumbprint é hash público. É sobre **qual empresa assina com qual certificado**. Com mais de uma empresa, esse campo do Fiscal pode ser hoje o único caminho de UI para assinar com certificado que não é o padrão. Decide Q6 |
| E6 | `ResolverNaturezaAsync` só confere `EmpresaId`. Aceita natureza inativa e de qualquer `TipoOperacao`, e a nota nasce sempre `TipoOperacaoFiscal.Venda` | `CfopDoItemResolver.cs:112-124`; `GerarNotaFiscalPedidoVendaUseCase.cs:121` | Filtrar "só naturezas de venda" na tela seria regra fiscal inventada no React. Vira pergunta ao backend |
| E7 | Não há importador nem seed de natureza. Os importadores oficiais cobrem CFOP, NCM, CEST, IBGE e outros, mas não natureza | `ls Erp.Application/Fiscal/Cadastros/Importacao/` | Com a D91, a única forma de ter natureza é `POST` direto na API, empresa por empresa, com a matriz de CFOP junto |
| E8 | O cache global usa `staleTime: 30_000` e `refetchOnWindowFocus: false`. O Confirmar invalida só as chaves `faturamento*` | `lib/query/queryClient.ts:9-11`; `useFaturamentoResources.ts:28-33` | Até 30 s depois de confirmar, o pedido em cache continua `Aprovado`, com Faturar e Gerar NF à mostra. O backend recusa, então o dano é um clique recusado, e não corrupção |
| E9 | O gate de campos compara num sentido só: campo do TS que o backend não tem. **Nenhum** record de request está mapeado, e **nenhum** record de faturamento também | `scripts/gate-contract-fields.mjs:29-62,437-448`; o snapshot tem 10 records, nenhum de faturamento (`node -e` sobre `backend-response-records.snapshot.json`) | FT-1 e FT-2 são da classe inversa, campo que o backend aceita e a UI nunca envia. Nenhum gate a vê |
| E10 | `validate-backend-contract-map` fica verde no HEAD: "477 rotas frontend únicas e compatíveis" | `node scripts/validate-backend-contract-map.mjs`, rodado agora | As rotas de faturamento existem. O defeito é de **campo**, e não de rota |

## 3. Posição

### 3.1 Pontos de não-retorno desta camada

1. **Autorização fiscal duplicada.** É o único ponto realmente irreversível do recorte. NF-e autorizada
   só se desfaz por evento de cancelamento com prazo, e não por código. Pela E1, o `correlationId`
   decide se um reenvio chama a SEFAZ de novo. Um ID que muda num reenvio de resultado desconhecido
   pode autorizar duas vezes a mesma operação. Um ID que se repete depois de falha recebida trava a
   nota. **Não verificado:** se o status da nota já impede uma segunda autorização quando o Fiscal
   ainda reprocessa uma transmissão inconclusiva (leg 4 com `DeveReprocessar`). Levei isso para B-25.
2. **Faturamentos órfãos que se acumulam.** Cada Preparar sobre um pedido cujo faturamento está em
   `Erro` cria outra linha (FT-10). Se o primeiro já gerou a nota, o segundo falha para sempre no leg
   1 com `NotaJaExisteParaOrigem`, e o pedido `00014` do banco dev já tem dois assim (inventário). Não
   se perde dado, mas o lixo fica, e limpar é tarefa do backend. A tela precisa parar de produzi-lo
   **agora**. Cada semana em produção sem essa trava deixa mais linhas.
3. **A permissão exigida para confirmar vira instrução publicada.** Se o CHANGELOG da `b71` mandar
   conceder três permissões para confirmar, os administradores de oito empresas passam a fazer isso.
   Retirar uma delas depois é reeducar, e não mudar código. Por isso contesto a `PRODUTOS_CONSULTAR`
   (§3.4, Q4) antes que ela seja publicada.
4. **O client e a chave de natureza viram herança da `b59`.** São baratos agora e têm custo médio
   depois (§3.2, Q2).

### 3.2 As decisões, uma a uma

**Q1: `correlationId` (FT-1).**
- **Quem gera:** o frontend, na abertura do diálogo de confirmação, com `createFiscalCorrelationId`
  (`fiscalUiUtils.ts:512-524`, precedente da D43 P-2). O fluxo é `faturamento-confirmar`, e o segmento
  de 8 caracteres é o `faturamentoId`, porque a nota ainda não existe. O tamanho fica em 58
  caracteres, abaixo do teto de 100 do Confirmar e do de 120 da transmissão. É conta de segmentos,
  não execução.
- **A regra de vida do ID, pela E1:** ele é estável enquanto o diálogo estiver aberto, é novo a cada
  abertura, e **o diálogo fecha em toda resposta 200**, inclusive quando a etapa volta `Erro`.
  - Numa resposta 400, o diálogo fica aberto com o mesmo ID. Isso é seguro, porque o 400 do leg 1 e
    o de validação acontecem antes do leg 4 (`ConfirmarFaturamentoUseCase.cs:80,119-145`).
  - Num erro de rede ou num 5xx, o diálogo também fica aberto com o mesmo ID. Esse é o caso
    importante: se a SEFAZ autorizou e a resposta se perdeu, o reenvio devolve a autorização
    idempotente, sem nova chamada.
  - O que proíbo: mostrar o resultado da 200 **dentro** do diálogo e oferecer "tentar de novo" ali.
    O segundo clique reusaria um ID já gasto numa falha, e o backend recusaria com
    `IntegracaoJaProcessada`.
- **Como aparece:** somente leitura no diálogo, e **repetido no resultado da tentativa** (§Q3),
  porque é ali que o suporte precisa dele para achar o log fiscal. Depois que o diálogo fecha, o ID
  não fica em nenhum outro lugar da tela, já que o faturamento não o guarda.
- **Schema:** `correlationId` obrigatório e `.max(100)` no request.

**Q2: natureza de operação (FT-2).** Adoto o **lado de consumo** da D91: consultar o `GET` existente,
só naturezas ativas, escopado por `faturamento.empresaId` (e não pela empresa do topbar, porque o
resolver compara com a empresa **da nota**, E6), enviar o ID, nunca GUID digitado, e natureza
obrigatória no schema. Recuso três pontos da D91:
1. **A dívida sem gatilho.** Pela E7, sem a `b59` cada empresa nova só fatura depois que alguém
   fizer `POST` na API com a matriz de CFOP. Hoje isso não piora nada, porque o faturamento já não
   conclui (FT-1 com FT-2). No ano cinco, porém, é o custo de implantar cada empresa. Recomendo a
   dívida **com gatilho escrito**: a `b59` é a primeira fatia depois da `b71`, ou entra antes da
   primeira empresa de produção que tentar faturar sem natureza cadastrada. O que for primeiro. A
   D91 diz que preserva uma "decisão do usuário" de não fazer a manutenção. **Não verifiquei essa
   decisão**, porque ela chegou por rascunho e não por Dn travada. Se ela existir, minha objeção
   passa a ser só o gatilho, e não bloqueio.
2. **O nome e a chave do client.** O rascunho cria `naturezasOperacaoConsultaApi` com a chave
   `['fiscal','naturezas-operacao','consulta',query]`. A `b59` vai precisar de outro client para as
   mutações, e passam a existir duas fontes para o mesmo endpoint, contra a D47. Proponho um client
   só, `naturezasOperacaoApi`, com `listar` por enquanto, e uma raiz exportada
   `NATUREZAS_OPERACAO_ROOT_KEY = ['fiscal','naturezas-operacao']`, no padrão de
   `SERIES_FISCAIS_ROOT_KEY` (`useSeriesFiscais.ts:14-18`). A `b59` acrescenta mutações e invalida a
   raiz. O custo agora é o mesmo número de arquivos. Depois, é migrar os consumidores de uma chave.
3. **`staleTime` de 5 minutos no rascunho.** A lista vazia é justamente a condição que bloqueia o
   Confirmar. Se alguém cadastrar a natureza pela API com o diálogo aberto, o operador fica até 5
   minutos vendo "sem natureza". Proponho o `staleTime` padrão e um botão de recarregar no estado
   vazio.

**Q3: resultado real (FT-3).** Pela E3, a fonte da verdade é `resposta.faturamento`, e não o status
HTTP nem os `alertas`.
- O `onSuccess` do Confirmar grava `resposta.faturamento` no cache com
  `setQueryData(faturamentoDetalheQueryKey(id), …)` e mantém o `onSettled` da D27. A tabela de legs
  mostra o resultado na hora, sem esperar a reconsulta.
- O toast sai da etapa:
  - `Faturado`: sucesso;
  - `Erro`: erro, com o nome do leg que ficou `Falhou` e o `motivo` dele;
  - `PendenteFiscal`: aviso, "transmissão inconclusiva, o Fiscal vai reprocessar".
- Cada toast repete o `correlationId`.
- Não depende de backend, e a P-7 vira melhoria, não bloqueio.

**Q4: UF, CFOP e unidade.** O critério é o **acoplamento de permissão marginal**. A natureza já exige
`FISCAL_CADASTROS_CONSULTAR`, e tudo o que usa essa mesma permissão sai de graça.
- **UF:** dropdown sobre `useUfCatalogo`, enviando a sigla. É a mesma permissão da natureza, então o
  acoplamento marginal é zero. Os 27 valores não mentem sobre o formato, mas mentem sobre o endpoint
  SEFAZ (FT-6). Proponho um texto de ajuda honesto e a P-2 do inventário em aberto.
- **CFOP:** **fora do diálogo, enviando `null`.** Pelo inventário (§6, FT-7), o campo tem só dois
  efeitos possíveis: sem natureza é ignorado, e com natureza só pode **recusar**
  (`CfopDivergenteDoDerivado`). Um campo que só pode recusar não vale a busca paginada, nem mexer
  num hook compartilhado. `useCfopOptions` devolve `value = id` e tem 3 consumidores em Tributação
  (medido por `grep -rln`).
- **Unidade:** continua texto, com `.max(20)` e ajuda "usada só quando o produto não tem unidade".
  Recuso a D91 AC-5 para a unidade. Exigir `PRODUTOS_CONSULTAR` para confirmar um faturamento, por
  causa de um campo de fallback cujo catálogo nem está decidido (P-4), é o ponto de não-retorno 3
  de §3.1.

**Q5: três caminhos.** Nada de sinal na **lista** de pedidos (D26 é o precedente, e seria N consultas).
No **detalhe** do pedido `Aprovado`, e no Preparar depois de escolher o pedido, entram duas consultas
limitadas (E4):
1. `faturamentosQueryKey({ empresaId, pedidoVendaId })`, importando a função exportada e nunca um
   literal. Ela só dispara com `FATURAMENTO_CONSULTAR`.
2. `notasFiscaisQueryKey({ empresaId, origem: PedidoVenda, origemId })`. Ela só dispara com a
   permissão de consulta fiscal.

O que a tela faz com o resultado:

| Situação encontrada | Comportamento |
| --- | --- |
| Faturamento ativo | Faturar e Gerar NF ficam indisponíveis, com motivo e link "Abrir faturamento" |
| Faturamento em `Erro` | O Preparar oferece **"Abrir o faturamento existente"** em vez de criar outro, porque a E2 mostra que confirmar de novo o retoma |
| Já existe nota com origem neste pedido | O Preparar avisa que o leg 1 vai recusar, com link para a nota. O precedente de indisponível com motivo, espelhando uma recusa certa do backend, é a D23 |
| Sem a permissão de consulta | A consulta não dispara, e a tela fica como está hoje. Não piora |

O combo do Preparar passa a mandar `status: Aprovado` e `termo` ao servidor, como o Fiscal já faz
(`FiscalActionDialogs.tsx:168`). Hoje ele traz os 200 pedidos mais recentes **de qualquer status**
(`VendasRepository.cs:40`, `.Take(200)` depois do `OrderByDescending`), e um pedido aprovado mais
antigo simplesmente não aparece (FT-11).

**Q6: `certificateThumbprint` (B-6, FT-16).** No Faturamento, continua fora, e o backend usa o
certificado do servidor. No Fiscal, **não removo na `b71`**.
- **`accessRisk: CAPACIDADE` potencial, sem medição.**
  - No modo store, o campo é hoje o único caminho de UI para assinar com um certificado que não é o
    padrão (E5).
  - No modo PFX, o campo é ignorado, e a classificação seria `NENHUM`.
  - Qual modo roda em produção, e se alguém digita thumbprint, só o backend e a operação sabem.
- Pela regra do `risk.yaml`, `CAPACIDADE` pede decisão do usuário e está fora do recorte de
  Faturamento.
- O achado de segurança vai para o `qa-revisor` e para B-27: o thumbprint digitado escolhe o
  certificado de **outra** empresa sem conferir CNPJ. Pelo que sei da NF-e, a SEFAZ rejeitaria o
  CNPJ divergente. **Isto é intuição, não medição.**

**Q7: heranças da D80.** Concordo com o resumo no Faturar, pelo padrão da D79, lendo a
`pedidoVendaQueryKey` já em cache e sem requisição nova. Entram também `ApiErrorPanel` e o texto de
efeito "não gera nota nem título". V11: `documento` opcional com `.max(80)` e `observacao` com
`.max(300)`. É mudança de payload que o backend já aceita (`PedidoVendaValidators.cs:73-79`), e é
reversível.

**Q8: menores.**
- **FT-9:** `enabled: Boolean(filters.empresaId)`, pelo padrão da D82/D88. É a **quarta** ocorrência da
  classe, e por isso agora vem com gate (G4).
- **FT-4:** tipo de documento só `NFe`/`NFCe`, no dropdown e no schema.
- **FT-5:** todos os limites no schema.
- **FT-15 (GUID cru):** no detalhe, número do pedido lido pela `pedidoVendaQueryKey`, que é uma
  consulta só. Na **lista**, um link "Abrir pedido" em vez do GUID, **sem** número, até o backend
  entregar `PedidoVendaNumero` no `FaturamentoResponse` (B-29).
- **FT-18:** a rota exigir `CONSULTAR` é `ILUSAO`, porque as telas já recusam. Entra se alguém mexer
  na rota, sem prioridade minha.
- **Invalidação cruzada depois do Confirmar (E8):** `['vendas','pedido',pedidoVendaId]`,
  `['vendas','pedidos']`, `['fiscal','notas-fiscais']` e `['financeiro','contas-receber']`, por
  prefixo. O precedente é Compras invalidando `['estoque']` e `['financeiro','contas-pagar']`
  (`useComprasResources.ts:35-36`).

**Q9: fatiamento.** Uma `b71` só, em blocos, com o bloco A liberável sozinho.
- **Por que não uma `.cN`:** a régua reserva `.cN` para versão bloqueada no review
  (`04_regua_de_fatiamento.md`). A `b70` foi aprovada e publicada (PR #33). FT-1 e FT-2 são defeitos
  da era `b55`, e não da `b70`. O mesmo raciocínio decidiu a D71, a D77 e a D82.
- **Os blocos:**

| Bloco | Conteúdo |
| --- | --- |
| **A**, contrato | Q1, Q2 no lado do consumo, Q3, FT-4, FT-5 e FT-9, mais os gates G1 a G4 |
| **B**, caminhos | Q5 e FT-11 |
| **C**, Vendas | Q7 |
| **D** | Invalidação cruzada, FT-15 e documentação atrasada (FT-19) |

- **O gate de campos cobre os responses de faturamento?** **Não**, pela E9. Não proponho estender a
  cobertura de response na `b71`. Detalhe em §3.4.

### 3.3 Onde o corte de escopo vira dívida cara, e onde não

**Vira dívida cara:**
- **Cortar a regra de vida do `correlationId` (Q1) para "gera um ID e pronto".** É o ponto 1 de §3.1,
  e o custo de errar é um fato fiscal.
- **Cortar a trava do Preparar sobre `Erro` (Q5).** Cada semana sem ela deixa linhas que só o backend
  limpa (§3.1, ponto 2).
- **Adiar a `b59` sem gatilho.** O custo é por empresa implantada (E7).

**Não vira dívida, e pode cortar sem medo:**
- **CFOP fora do diálogo.** Voltar com ele é acrescentar um campo.
- **A unidade como texto.** Virar dropdown depois é trocar o componente.
- **A invalidação cruzada.** O backend recusa a ação obsoleta, e o custo de ficar sem ela são 30 s de
  botão errado.
- **O número do pedido na lista (FT-15).** É campo aditivo quando o backend entregar.
- **A remoção do thumbprint no Fiscal.** Fica para a decisão sobre `CAPACIDADE`.

### 3.4 Os gates que a camada precisa

| Gate | Classe que fecha | O que o deixa vermelho | Prova vermelha | Custo |
| --- | --- | --- | --- | --- |
| **G1**: cobertura de campos de **request**, o sentido inverso do gate de campos | Campo que o backend aceita e a UI nunca envia: FT-1 e FT-2, que deixaram o módulo inteiro sem concluir | Campo do record C# de request ausente do tipo de formulário e sem entrada na allowlist com motivo e alvo | Contra `9713de4` (`b70`), com os 3 itens pelo nome: `naturezaOperacaoId`, `correlationId`, `certificateThumbprint`. Depois da `b71`, só o terceiro fica, na allowlist, com alvo **B-6** | Um modo novo em `gate-contract-fields.mjs` e o `ConfirmarFaturamentoRequest` em `TYPES_TO_EXTRACT` pelo gerador. Não sei o número de linhas: **isto é intuição, não medição**. Escopo: só os requests de `faturamento` e o `FaturarPedidoVendaRequest` |
| **G2**: teste de componente do Confirmar | Sucesso falso em 200 com etapa `Erro` (FT-3) | 200 com `etapa: Erro` que dispara o toast "Faturamento confirmado" | Contra `b70`, onde `FaturamentoDetalhePage.tsx:60` sempre mostra sucesso | Um teste |
| **G3**: teste de vida do `correlationId` | Autorização duplicada ou nota travada (§3.1, ponto 1) | ID diferente entre dois envios com erro de rede no meio; ID igual depois de fechar e reabrir; diálogo aberto depois de uma 200 | Contra `b70`, que nem envia o campo | Um teste |
| **G4**: teste estrutural nominal de `enabled` por empresa | A classe da D82/D88 | Um dos hooks conhecidos sem `enabled` dependente de `empresaId`: `usePedidosVenda`, `usePedidosCompra`, `useContasPagar`, `useContasReceber` e `useFaturamentos`, mais o do Estoque avançado se a medição confirmar | Contra `b70`, com `useFaturamentos` pelo nome | Um arquivo de teste |

O limite do G4: ele congela os casos conhecidos e **não pega o sétimo**. O gate genérico precisaria
saber qual endpoint recusa `Guid.Empty`, e há 59 telas que usam `EmpresaFilialFilter` (medido por
`grep -rl`). Esse gate genérico tem gatilho: a quinta ocorrência.

**O que não proponho.** Estender o gate de campos de **response** a `FaturamentoResponse`. O
inventário mede 0 divergência em 46 posições, e não existe árvore com defeito conhecido para provar o
vermelho. Pela regra do `CLAUDE.md`, gate só verde não é aceito.

## 4. Propostas de decisão

| Id proposto | Decisão | Alternativas | Reversível |
| --- | --- | --- | --- |
| P13-1 | `correlationId` gerado na abertura, estável até fechar, diálogo fecha em toda 200, repetido no resultado | um por clique (quebra a idempotência da E1); gerado pelo backend (B-25) | Sim no código. Não no efeito: uma autorização duplicada não se desfaz. Por isso levanto agora |
| P13-2 | O resultado sai de `resposta.faturamento.etapa`/`legs`, gravado no cache | esperar a P-7 (bloqueia sem necessidade) | Sim |
| P13-3 | Natureza: client único `naturezasOperacaoApi`, raiz exportada, `empresaId` do faturamento; `b59` com gatilho | D91 como está (dois clients depois); `b59` dentro da `b71` (não cabe, 10 ACs) | Sim. Custa migrar consumidores se a chave nascer errada |
| P13-4 | UF por dropdown; CFOP fora (`null`); unidade como texto com `.max(20)`; confirmar exige só `FATURAMENTO_CONFIRMAR` e `FISCAL_CADASTROS_CONSULTAR` | D91: três catálogos, com bloqueio por `PRODUTOS_CONSULTAR` | Sim. A instrução de permissão publicada tem custo de reeducação |
| P13-5 | Consultas por pedido (faturamento e nota) no detalhe e no Preparar; Preparar leva ao faturamento em `Erro` | só texto honesto (continua criando órfãos) | Sim |
| P13-6 | `accessRisk` da `b71`: **`ILUSAO`**, e não `AUTO_BLOQUEIO` | D91: `AUTO_BLOQUEIO` | Sim |
| P13-7 | Gates G1 a G4, cada um com prova vermelha contra `b70` | só testes de payload | Sim |
| P13-8 | Uma `b71` em blocos A a D, com A liberável sozinho | `.cN` antes (fora da régua) | Sim |

**Por que P13-6 é `ILUSAO`.** `AUTO_BLOQUEIO` é perder a permissão de devolver permissões
(`risk.yaml:85-96`), e ninguém aqui mexe em permissão de segurança. Nenhum faturamento conclui hoje.
Com a validação ligada, para no leg 1. Desligada, gera a nota sem CFOP e para no leg 4 por falta de
`correlationId`.

**Não verificado:** se uma nota sem CFOP gerada assim, e transmitida depois pelo Fiscal, seria
autorizada. `NotaFiscalXmlBuilder.cs:103` omite a tag `CFOP` quando ela é nula. Se fosse autorizada,
a classificação sobe para `CAPACIDADE`. O builder mede antes do release.

## 5. Discordância

**Discordo do rascunho do Codex (D91) na classificação `AUTO_BLOQUEIO`.** Ele exige alerta em
negrito, uma ordem de concessão como pré-requisito de deploy e confirmação do usuário antes do
release. Isso implica um ritual de release para um risco que não existe (P13-6). Pior: gasta a
classificação mais grave num caso que não a merece, e a D81 já mostrou que essa classificação se
desempata por medição, e não por prudência.
- **Alternativa:** `ILUSAO`, com a frase obrigatória no CHANGELOG. Perde a cautela extra e ganha
  precisão.
- **Reversível:** sim.

**Discordo do rascunho do Codex (D91 AC-5) em bloquear o Confirmar sem `PRODUTOS_CONSULTAR`.** Isso
implica que grupos que hoje confirmam com duas permissões passam a precisar de três, por um campo que
o backend usa só como fallback (`GerarNotaFiscalPedidoVendaUseCase.cs:236-247`) e cujo catálogo está
em aberto (P-4).
- **Alternativa:** unidade como texto limitado. Perde a validação de sigla no cliente. Ganha uma
  permissão a menos publicada.
- **Reversível:** o código, sim. A instrução aos administradores de várias empresas é o caro, e por
  isso levanto agora.

**Discordo, por antecipação, de `arquiteto-operacao-erp`, se ele propuser o resultado do Confirmar
dentro da modal com "tentar novamente".** Não li o texto dele. Se a posição for outra, este ponto
cai. Pela E1, o segundo clique reenvia um `correlationId` já gasto numa falha, e a transmissão recusa
com `IntegracaoJaProcessada`.
- **Alternativa:** o resultado na página (a tabela de legs já está lá, D25), e uma nova tentativa
  reabre o diálogo com ID novo. Perde um clique. Ganha uma retentativa que funciona.
- **Reversível:** sim, mas o defeito aparece em produção como "a SEFAZ recusou", e ninguém liga isso
  à modal.

**Discordo, por antecipação, de `arquiteto-operacao-erp`, se ele propuser o número do pedido na lista
de faturamentos resolvido linha a linha.** São 20 a 100 `GET /api/vendas/pedidos/{id}` por página,
pelo clamp de `FaturamentoRepository.cs:30`.
- **Alternativa:** link "Abrir pedido" na lista, número no detalhe, e B-29 para o campo aditivo.
- **Reversível:** sim.

**Discordo, por antecipação, de `arquiteto-design-system`, se ele propuser migrar agora
`CadastroFiscalSelects` para `features/fiscal` (D47.3) ou criar um `CatalogoSelect` genérico para os
quatro campos.** A migração é da `b59` e mexe em chaves com 3 consumidores em Tributação. Pela Q4,
sobram dois catálogos no diálogo, natureza e UF, e o `EntitySelect` já atende os dois.
- **Reversível:** sim.

**Discordo, por antecipação, de `arquiteto-escopo-entrega`, se ele cortar G1 ou G3 como "prova que
pode vir depois".** G1 é a única proteção contra a classe que deixou o módulo inteiro inutilizável
desde a `b55`. G3 protege o único ponto irreversível do recorte. Pela régua, prova cortada volta com
embalagem inteira.
- **Reversível:** sim, com custo de uma fatia.

**Concordo** com o inventário em FT-1 a FT-20. Com a D91 no consumo só de naturezas ativas, no ID
enviado e em nunca aceitar GUID digitado. Com a D79/D80 no resumo do Faturar.

## 6. O que eu abro mão

- **O gate genérico de `enabled` por empresa.** Aceito o G4 nominal, que não pega o próximo hook. O
  preço é que a quinta ocorrência vai passar. O sinal para trocar é essa quinta ocorrência.
- **A cobertura de response de faturamento no gate de campos.** O preço é que um rename no backend
  passa até alguém ler o erro na tela. O sinal para trocar é a primeira divergência de nome medida em
  `Faturamento*Response`.
- **A manutenção de naturezas dentro da `b71`.** Aceito que, até a `b59`, cada empresa dependa de
  `POST` pela API. O preço é trabalho manual por empresa implantada. O sinal é o gatilho de Q2.
- **A remoção do thumbprint no Fiscal.** Deixo um campo que o plano proíbe (FT-16) vivo por mais uma
  versão. O sinal é a resposta a B-27 e a decisão do usuário sobre `CAPACIDADE`.
- **O CFOP como conferência.** Se operação ou design mostrarem que o operador usa essa conferência,
  aceito o dropdown enviando o **código**, com o mapeamento feito no ponto de chamada e sem mudar o
  `value` de `useCfopOptions`.
- **A unidade como dropdown.** Aceito, se for sobre `unidades-medida` e **não** bloquear o Confirmar
  quando faltar `PRODUTOS_CONSULTAR`. Nesse caso volta a texto.
- **A invalidação cruzada (Q8).** Pode sair do recorte se o bloco D estourar. O backend segura, e o
  preço são 30 s de botão desatualizado.
- **A filtragem de natureza por tipo de operação.** Não a faço, e aceito que o operador escolha uma
  natureza de compra para uma venda. O sinal para trocar é a resposta a B-28.

## 7. Perguntas que só o backend responde

- **B-25:** o Confirmar deveria exigir `CorrelationId` no próprio validator (400 antes de qualquer
  leg), ou gerá-lo? E: ao confirmar de novo um faturamento em `PendenteFiscal` com transmissão
  inconclusiva que o Fiscal ainda reprocessa, com `correlationId` novo, o status da nota impede uma
  segunda autorização?
  - *Decide:* se o frontend é o único guardião da idempotência, e se o Confirmar fica indisponível em
    `PendenteFiscal`.
- **B-26:** o Preparar deveria reaproveitar o faturamento em `Erro`, e o leg 1 vincular a nota
  Rascunho que já existe na mesma origem? Qual é o caminho canônico entre Faturar, Gerar NF e
  Faturamento? São a P-5 e a P-6 do inventário.
  - *Decide:* se a trava de Q5 é definitiva ou provisória, e como destravar o `00014` e os casos
    iguais.
- **B-27:** o certificado passa a ser resolvido pelo servidor por empresa emitente? Enquanto isso,
  o thumbprint digitado deveria ser recusado quando não corresponde ao CNPJ da nota (E5)?
  - *Decide:* o destino do campo do Fiscal (Q6), e se a segunda empresa consegue faturar.
- **B-28:** o resolver deveria recusar natureza inativa ou de tipo de operação incompatível com a nota
  (E6)?
  - *Decide:* se a tela filtra por tipo (hoje seria regra inventada) ou se o backend garante.
- **B-29:** o `FaturamentoResponse` pode ganhar `PedidoVendaNumero`, como campo aditivo?
  - *Decide:* FT-15 na lista sem N consultas.

**O que se resolve lendo o contrato, sem pergunta:** a fonte do resultado real (E3), a semântica do ID
(E1), a reentrância do Confirmar (E2), os filtros por pedido e por origem (E4), e o thumbprint nulo
usando o certificado do servidor (inventário, §7).

**Pergunta ao cliente:** volume de faturamentos por dia e quantidade de naturezas por empresa. A
listagem já pagina no servidor, então o volume não muda o desenho. Muda só o tamanho de página do
seletor de natureza.

## 8. Contrato de saída

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "projeto",
  "assunto": "faturamento",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/13-plataforma-faturamento.md",
  "decisoesPropostas": [
    { "id": "P13-1", "titulo": "correlationId gerado na abertura do diálogo, estável até fechar, diálogo fecha em toda 200, repetido no resultado", "reversivel": false, "gatilho": "B-25: backend passa a exigir ou gerar o ID no Confirmar" },
    { "id": "P13-2", "titulo": "Resultado do Confirmar lido de resposta.faturamento (etapa e legs com motivo), gravado no cache; toast pela etapa", "reversivel": true, "gatilho": "P-7 respondida" },
    { "id": "P13-3", "titulo": "Natureza: consumo da D91 com client único naturezasOperacaoApi e raiz de chave exportada; empresaId do faturamento; b59 com gatilho escrito", "reversivel": true, "gatilho": "primeira fatia após b71, ou primeira empresa de produção sem natureza" },
    { "id": "P13-4", "titulo": "UF dropdown (sigla); CFOP fora, enviando null; unidade texto max(20); Confirmar exige só FATURAMENTO_CONFIRMAR e FISCAL_CADASTROS_CONSULTAR", "reversivel": true, "gatilho": "resposta a P-4, ou evidência de uso da conferência de CFOP" },
    { "id": "P13-5", "titulo": "Consultas por pedido (faturamentos por pedidoVendaId, notas por origemId) no detalhe do pedido e no Preparar; Preparar leva ao faturamento em Erro; combo com status Aprovado no servidor", "reversivel": true, "gatilho": "B-26" },
    { "id": "P13-6", "titulo": "accessRisk da b71 é ILUSAO, não AUTO_BLOQUEIO", "reversivel": true, "gatilho": "medição de que nota sem CFOP é autorizada via Fiscal: sobe para CAPACIDADE" },
    { "id": "P13-7", "titulo": "Gates G1 (cobertura de request), G2 (sucesso falso), G3 (vida do correlationId), G4 (enabled por empresa nominal), todos com prova vermelha contra b70", "reversivel": true, "gatilho": "quinta ocorrência da classe D82: G4 genérico" },
    { "id": "P13-8", "titulo": "Uma b71 em blocos A-D, bloco A liberável sozinho; .cN fora da régua porque a b70 foi aprovada", "reversivel": true, "gatilho": "bloco B ou C bloqueado no review" }
  ],
  "discordancias": [
    { "de": "rascunho Codex (D91)", "ponto": "accessRisk AUTO_BLOQUEIO; o correto é ILUSAO", "impacto": "medio" },
    { "de": "rascunho Codex (D91)", "ponto": "bloquear o Confirmar sem PRODUTOS_CONSULTAR por causa da unidade, que é fallback", "impacto": "alto" },
    { "de": "rascunho Codex (D91)", "ponto": "client e chave 'consulta' separados, que duplicam a fonte na b59, e staleTime de 5 min na condição que bloqueia", "impacto": "baixo" },
    { "de": "rascunho Codex (D91)", "ponto": "dívida b59 sem gatilho", "impacto": "medio" },
    { "de": "arquiteto-operacao-erp", "ponto": "(antecipada) resultado e retentativa dentro da modal reusam um correlationId já gasto", "impacto": "alto" },
    { "de": "arquiteto-operacao-erp", "ponto": "(antecipada) número do pedido na lista resolvido linha a linha", "impacto": "medio" },
    { "de": "arquiteto-design-system", "ponto": "(antecipada) migrar CadastroFiscalSelects ou criar CatalogoSelect genérico na b71", "impacto": "baixo" },
    { "de": "arquiteto-escopo-entrega", "ponto": "(antecipada) cortar G1 ou G3", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "B-25: Confirmar exige ou gera CorrelationId? Reconfirmar em PendenteFiscal com transmissão em reprocessamento e ID novo pode autorizar duas vezes?", "decide": "guardião da idempotência e disponibilidade do Confirmar em PendenteFiscal" },
    { "tipo": "backend", "pergunta": "B-26: Preparar reaproveita Erro e leg 1 vincula nota existente? Qual o caminho canônico?", "decide": "se a trava de Q5 é provisória" },
    { "tipo": "backend", "pergunta": "B-27: certificado por empresa emitente; thumbprint digitado sem conferência de CNPJ", "decide": "destino do campo do Fiscal e faturamento da segunda empresa" },
    { "tipo": "backend", "pergunta": "B-28: resolver recusa natureza inativa ou de TipoOperacao incompatível?", "decide": "filtro de natureza na tela" },
    { "tipo": "backend", "pergunta": "B-29: PedidoVendaNumero no FaturamentoResponse?", "decide": "FT-15 na lista sem N consultas" },
    { "tipo": "funcional", "pergunta": "A decisão do usuário de não fazer a manutenção de naturezas, citada na D91 do rascunho, existe e foi registrada?", "decide": "se a objeção em Q2 é gatilho ou bloqueio" },
    { "tipo": "funcional", "pergunta": "Volume de faturamentos por dia e de naturezas por empresa", "decide": "tamanho de página do seletor de natureza" }
  ],
  "riscos": [
    "Autorização fiscal duplicada é o único ponto irreversível do recorte; a regra de vida do correlationId vem de leitura de FiscalIntegracaoSefazSupport.cs:30-68, não de execução",
    "Não verificado se nota sem CFOP, gerada com a validação desligada e transmitida pelo Fiscal, seria autorizada (NotaFiscalXmlBuilder.cs:103 omite a tag): muda P13-6 para CAPACIDADE",
    "Não verificado se o status da nota bloqueia segunda autorização quando o Fiscal ainda reprocessa transmissão inconclusiva do leg 4",
    "Modo do certificado em produção (store ou PFX) desconhecido: a classificação de Q6 fica potencial",
    "Tamanho de G1 em linhas não medido (intuição); a prova vermelha contra b70 com os 3 campos pelo nome é conta sobre FaturamentoContracts.cs:87-99 e faturamento.types.ts no HEAD, e não execução do gate",
    "Nenhum teste nem gate de faturamento executado nesta sessão; só validate-backend-contract-map (verde, 477 rotas)"
  ]
}
```
