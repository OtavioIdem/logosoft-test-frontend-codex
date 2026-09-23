# v1.11.0a8b65

## Classificação fiscal do produto ganha tela: SPED, unidade tributável oficial, EX-TIPI e benefício fiscal

A `v1.11.0a8b64.c2` já tinha destravado o PATCH de dados fiscais de Produto; faltava dar à tela os
campos que o backend já aceitava e devolvia sem nenhum input correspondente. Esta versão fecha os
cinco campos do recorte original registrado em `docs/fatias/v1.11.0a8b58.c3-contratos-de-request.md`:
`tipoItemSped` ganha `Dropdown` de edição (12 rótulos do Registro 0200 da EFD — antes só trafegava,
sem controle de UI), `unidadeTributavelSigla` ganha autocomplete contra o catálogo oficial global
(`GET /api/fiscal/cadastros/unidades-tributaveis`, primeiro consumo desse endpoint em `features/`),
`exTipi` e `codigoBeneficioFiscalPadrao` ganham campo de texto, e `descricaoFornecedor` ganha campo
no diálogo de vínculo de fornecedor. Rodada de arquitetura em `docs/arquitetura/debate/07-*-produtos-fiscais.md`,
decisões travadas em D58–D61 (`docs/arquitetura/DECISOES.md`), plano em
`docs/fatias/v1.11.0a8b65-produtos-fiscais.md`.

**Risco da fatia: `HIGH`** (contrato de request muda tipo/campo, e o novo campo de catálogo entra sob
guarda de uma segunda permissão). **Risco de acesso: `NENHUM`** — a guarda de
`FISCAL_CADASTROS_CONSULTAR` (D61) é escopada só ao campo novo `unidadeTributavelSigla`, não à aba
inteira: quem tem `PRODUTOS_DADOS_FISCAIS_GERENCIAR` sem a segunda permissão continua editando os
outros nove campos fiscais normalmente, e não perde nada que tinha antes desta versão.

### Seção operacional — leia antes do deploy

1. **Classificar um produto para o SPED pela tela passa a ser possível pela primeira vez.** Antes
   desta versão, `tipoItemSped` só trafegava no PATCH (lido do registro, reenviado sem alteração) —
   nenhum produto podia ganhar ou trocar de classificação SPED pela UI, só por carga direta em banco.
2. **Resolver a unidade tributável oficial (`uTrib` da NF-e) exige `FISCAL_CADASTROS_CONSULTAR`
   além de `PRODUTOS_DADOS_FISCAIS_GERENCIAR`.** Sem a segunda permissão, o campo fica desabilitado
   com aviso explícito ("Consulta de cadastros fiscais indisponível: seu usuário não possui
   FISCAL_CADASTROS_CONSULTAR."), mesmo padrão já usado no endereço fiscal de Empresa/Filial (`b64`).
   Um valor já gravado continua visível mesmo sem a permissão de busca.
3. **O campo hoje rotulado só "Unidade tributável" virou dois campos com rótulos distintos**:
   "Unidade tributável (medida interna)" (o que já existia, catálogo interno Mód.03, sem mudança de
   comportamento) e "Unidade tributável (sigla oficial)" (novo, catálogo global Mód.04). Quem
   preenchia o campo antigo não precisa reconferir nada — só o rótulo mudou.
4. **Cliente e Fornecedor (configuração comercial, homologação) não entraram nesta versão** (D58) —
   o rótulo "Produto, cliente, fornecedor" do plano de onda descrevia um escopo maior do que o
   inventário sustentava; ficam para fatia própria, sem número reservado.

### Testes e QA

**O QA rodou e aprovou**, depois de um bloqueio inicial só pelo ritual de versão (corrigido nesta
mesma versão). Verificado: `validate:source`, `typecheck`, `lint`, `validate:contract-request-fields`
(`LACUNA` caiu de 7 para 3 — `TransferirEstoqueRequest.origemId`, `.documento`,
`AtualizarEmpresaRequest.contribuinteIpi`, nenhum dos três desta fatia), e 69 testes verdes em três
arquivos (16 de payload — incluindo `tipoItemSped = 0` como caso nominal e a opção sintética que
evita mostrar vazio um valor de sigla já gravado —, 47 do gate de contrato, 6 de componente,
incluindo a mensagem de erro do PATCH nomeando o campo em vez do toast genérico). O gate estrutural
novo (asserção contra entrada órfã em `LACUNA_DESTINO`) provou vermelho contra a árvore da `c2`
(11 entradas órfãs acusadas, worktree sobre `00e8316`) antes de fechar verde na árvore de hoje.

**Lacuna conhecida, não bloqueadora, registrada no plano (`GAP-E2E-b65`)**: o comportamento visual
do guard escopado (campo desabilitado + aviso quando falta `FISCAL_CADASTROS_CONSULTAR`, e os
rótulos/campos visíveis na aba) não tem teste automatizado — nem componente (sem precedente de
render de `TabView`/`SearchSelect` em `jsdom` neste repositório) nem E2E. Mesma lacuna existe desde
a `b64` para o caso irmão idêntico (`EnderecoFiscalFormSection`). A decisão de negócio por trás do
guard (payload, permissão de disparo do PATCH, mapeamento de erro) está coberta; o que falta é só a
confirmação visual em navegador.

# v1.11.0a8b64.c2

## O PATCH de dados fiscais de Produto volta a passar nos dois caminhos da tela

`PATCH /api/produtos/{id}/dados-fiscais` falhava com 400 nos dois caminhos da tela de Produtos. O
backend só aceita o bloco fiscal inteiramente em branco (dez campos nulos) ou com `tipoItemSped`
preenchido; o frontend mandava seis dos dez e nunca o `tipoItemSped`. Na criação havia ainda um
`tipoItemFiscal: Mercadoria` como padrão silencioso, que tirava o bloco do estado "em branco". Em
ambos os casos o cadastro já tinha gravado quando o PATCH falhava, e a mensagem dizia "Não foi
possível salvar o produto" — negando o que de fato tinha acontecido. Plano em
`docs/fatias/v1.11.0a8b64.c2-produto-fiscal-em-branco.md`.

**Risco da fatia: `HIGH`** (contrato de request que o backend recusa, num fluxo de cadastro usado
por qualquer operador com a permissão fiscal). **Risco de acesso: `NENHUM`**.

O padrão silencioso saiu; `tipoItemSped` passa a trafegar (lido do response e devolvido no
request, sem campo na tela); o PATCH só dispara quando o bloco não está em branco; e a mensagem de
erro passa a reconhecer a gravação parcial. Medido no banco do ambiente de desenvolvimento:
`erp.produtos` tem 3 linhas e zero com `TipoItemSped` — coerente com o defeito, já que nenhum
produto poderia ter sido classificado enquanto a chamada falhava. Três linhas não provam nada
sobre produção.

### Seção operacional — leia antes do deploy

1. **Classificar um produto fiscalmente pela tela continua indisponível.** O backend exige
   `tipoItemSped` assim que qualquer campo fiscal é preenchido, e o campo só chega na `b65`. Quem
   preencher NCM, CEST, origem ou tipo fiscal vai receber erro — agora com mensagem honesta,
   dizendo que o produto foi gravado e os dados fiscais não. Antes desta versão, toda criação de
   produto falhava, mesmo sem tocar em nada fiscal.
2. **Produtos sem classificação fiscal salvam normalmente**, na criação e na edição, e o bloco
   fiscal de um produto já classificado sobrevive a uma edição que não toca nele.

### Testes e QA

**O QA rodou e aprovou.** Verificado: `validate:source`, `tsc --noEmit`, `next lint --dir
features/produtos`, `validate:contract-request-fields` (7 lacunas, era 8), `npm run build`, e 60
testes verdes em três arquivos (9 de payload, 46 do gate, 5 de componente). O teste de componente
teve prova vermelha: com o defeito reintroduzido, os casos AC-2 e AC-2b falham e os outros três
seguem verdes.

**Lacuna conhecida, não bloqueadora, destinada à `b65`**: nenhum teste pega a volta do
`tipoItemFiscal: Mercadoria` como padrão de criação, porque isso mora no `buildInitialValues` do
diálogo, que os testes de fluxo stubam e os de payload não exercitam.

# v1.11.0a8b64.c1

## Os dois gates de contrato existiam desde a c3 e nunca rodaram em CI

`validate:contract-fields` e `validate:contract-request-fields` existem desde a `v1.11.0a8b58.c3`, cada um com
prova durável própria (`tests/unit/gateContractFields.test.ts`, `tests/unit/gateContractRequestFields.test.ts`),
e nenhum dos dois jamais esteve em `ci:gates` nem no workflow. Medido: `ci:gates`, antes desta fatia, não
continha `npm run validate:contract-fields` nem `npm run validate:contract-request-fields` — só a prova durável
deles rodava, de carona no `test:unit`, contra árvores montadas em espelho, nunca o script de fato como parte do
pipeline de produção. Isto muda: os dois entram em `ci:gates` e no job `frontend-gates` do workflow, na mesma
posição relativa dos demais `validate:*` (depois de `validate:fiscal:production`, antes de `typecheck`), e
`scripts/validate-ci-gates.mjs` passa a cobrar os dois nominalmente — usando o mecanismo que já existia
(`requiredCiGatesFragments`/`requiredWorkflowFragments`), sem verificação nova. Os dois já passam verdes na
árvore corrente: ligar não reprova nada hoje. Plano em `docs/fatias/v1.11.0a8b64.c1-gates-orfaos.md`.

**Risco da fatia: `MEDIUM`** — difere do precedente `CRITICAL` da `v1.11.0a8b57.c1`, onde o gate cego tinha
divergência real na árvore corrente; aqui os dois gates já passam limpos, e ligar não reprova ninguém hoje.
**Risco de acesso: `NENHUM`** — nenhuma permissão, rota, menu ou guard muda.

### O achado que expôs o buraco

A prova durável de `validate:contract-request-fields` estava vermelha desde a `b63`, sem que ninguém notasse, e
é isso que levou a investigar por que os dois gates nunca reprovaram nada em CI. Medido com `git worktree add`
sobre `4e589f7` (commit da b63): `node scripts/gate-contract-request-fields.mjs`, executado diretamente naquela
árvore, lista 10 "Campos anuláveis sem destino na UI", e `AdmitirColaboradorRequest.pessoaId` está ausente da
saída inteira (nem crítico, nem lacuna). O arquivo de teste daquele mesmo commit esperava 11 LACUNA, nomeando
`AdmitirColaboradorRequest.pessoaId` entre elas — a asserção teria falhado se `test:unit` tivesse corrido contra
aquele estado. **A b63 foi commitada com `test:unit` vermelho.** Isso é falha de processo, e **continua sem
correção nesta fatia** — o que esta fatia corrige é só a ausência dos dois gates em CI. A própria `b64` já havia
registrado este achado no seu `CHANGELOG.md` ("Achado à parte, medido nesta sessão") e reparado a prova (Bloco C
da b64): na árvore de hoje, os dois gates de contrato somam 77 testes passando
(`npx vitest run tests/unit/gateContractFields.test.ts tests/unit/gateContractRequestFields.test.ts`).

### Testes e QA

**Rodado nesta sessão**:

- `npm run validate:contract-fields` — exit 0, "Nenhuma divergência detectada.".
- `npm run validate:contract-request-fields` — exit 0, 8 LACUNA (mesmas de antes desta fatia).
- `npm run validate:ci` — exit 0, antes e depois do ritual de versão.
- `npm run validate:backend-permissions`, `npm run validate:guard-permission-map`,
  `npm run validate:backend-contract-map` — exit 0.
- `npx vitest run tests/unit/gateContractFields.test.ts tests/unit/gateContractRequestFields.test.ts` — 77
  passam, sem alteração desta fatia.
- `npx vitest run tests/unit/gateCiGatesContractSteps.test.ts` (novo): 6 passam — inclui a prova vermelha
  nominal (remover o step de cada gate no workflow derruba `validate:ci` com o fragmento nomeado na mensagem;
  restaurado, volta a passar).

**Não rodado**: `typecheck`, `lint`, `test:unit` completo, `build` e os gates de E2E/contrato opt-in — fora do
recorte desta fatia (nenhum arquivo de código de feature, schema ou tipo muda). **Sem QA aprovado** — o QA não
rodou nesta sessão.

# v1.11.0a8b64

## Empresa e Filial: CRT, `contribuinteIpi` sob demanda no PUT, e endereço fiscal compartilhado (D56)

Entrega o que o anexo de melhorias apontava em Empresa e Filial: o CRT no criar e no atualizar, o
indicador de IPI deixando de ser resetado em silêncio a cada PUT, e o bloco de endereço fiscal —
até aqui nunca consumido pelo frontend — pelo mesmo componente nas duas telas, gravando por
endpoint próprio. O gate de contratos de request cresce para cobrir `DefinirEnderecoFiscalRequest`
e passa a falhar duro quando um schema mapeado não é encontrado, em vez de só avisar. Plano em
`docs/fatias/v1.11.0a8b64-f4-empresa-filial-fiscal.md`.

**Risco da fatia: `HIGH`** (muda tipo e campo contra o contrato, e cria um bloco de endereço
herdado por duas telas). **Risco de acesso: `NENHUM`** — a fatia não remove acesso de ninguém.

### Seção operacional — leia antes do deploy

1. **Empresas e filiais cadastradas antes desta versão não têm endereço fiscal, e a nota fiscal vai
   exigi-lo.** Isso é trabalho de cadastro para a operação assumir, não defeito desta versão.
2. **`Crt?` é anulável e não tem zero** (1 Simples Nacional, 2 Simples Nacional com excesso de
   sublimite, 3 Regime normal). Quando o operador não informa, a tela grava `null` explícito.
3. **`contribuinteIpi` no PUT só é enviado quando o operador mexe no campo.** É `bool?`, onde
   `null` significa "mantém o valor atual"; editar outro dado da empresa não altera mais o
   indicador de IPI.
4. **O endereço fiscal de Empresa e Filial usa o mesmo bloco compartilhado**, gravando por
   endpoint próprio (`PUT .../endereco-fiscal`). O município tem ação própria de remoção
   (`DELETE .../endereco-fiscal/municipio`) — nunca se apaga mandando o campo nulo no PUT.
5. **Editar o endereço fiscal de um registro que já tem município vinculado exige a permissão
   `FISCAL_CADASTROS_CONSULTAR`**, porque o município precisa ser resolvido no catálogo antes de o
   endereço poder ser regravado. Sem ela, o bloco avisa em vez de falhar em silêncio.
6. **Remover o vínculo do município é ação deliberada** e deixa o endereço incompleto até um novo
   município ser selecionado e salvo.
7. **O gate de contratos de request agora cobre `DefinirEnderecoFiscalRequest`** e ganha falha
   dura quando um schema mapeado não é encontrado; antes disso era só aviso, e um recorte podia
   sair do universo em silêncio.

### Testes e QA

**Rodado nesta sessão** (verificação estática; sem credencial de backend disponível):

- Testes unitários e de payload do módulo administração: `npx vitest run tests/unit/administracaoPayload.test.ts tests/unit/administracaoFiliaisTransport.test.ts tests/unit/administracaoReferenceUx.test.ts` — 11 passam.
- Prova durável do gate de contratos de request: `npx vitest run tests/unit/gateContractRequestFields.test.ts` — 46 passam.
- `npm run validate:contract-request-fields` — verde, 0 divergências críticas.
- `tsc --noEmit` — limpo.

**Pendente**, e é trabalho de QA que ainda não rodou: AC-4 (reabrir a empresa com o município
resolvido) e AC-7 (o CRT grava, e editar outro campo não o altera) precisam se confirmar **no
banco** — `erp.empresas."Crt"`, `EnderecoFiscal_*`, `UpdatedAt` —, não por leitura de tela. Nesta
sessão não há credencial de backend nem verificação em tela ou em banco: não houve QA aprovado.

**Achado à parte, medido nesta sessão**: a prova durável do gate de contratos de request já
estava vermelha antes desta fatia — a `b63` preencheu `AdmitirColaboradorRequest.pessoaId` e
commitou sem atualizar a lista esperada do teste. Medido com `git worktree` sobre `4e589f7`: o
gate imprime 10 lacunas e `AdmitirColaboradorRequest.pessoaId` está ausente delas, enquanto a
prova esperava 11. Esta fatia reparou a prova (Bloco C). Registrado como fato medido; a decisão
sobre o que fazer com o achado fica pendente, com o usuário.

# v1.11.0a8b58

## Séries fiscais: cadastro, vigência, numeração e uso na emissão (F3)

Entrega a gestão de séries por empresa/filial e modelo fiscal, com criação, ampliação de faixa, encerramento de
vigência, inativação definitiva e consulta de buracos de numeração. A emissão passa a oferecer as séries válidas no
contexto da nota e preserva o campo textual quando o operador não tem as duas permissões de consulta necessárias.
O painel de validação também direciona erros cadastrais D47-D54 para a nova tela.

**Risco da fatia: `HIGH`** (numeração e emissão fiscal). Plano e evidências em
`docs/fatias/v1.11.0a8b58-f3-series-fiscais.md`.

### Seção operacional — leia antes do deploy

1. **Risco de acesso: `NENHUM`.** A fatia não remove acesso existente. A rota e o menu aceitam
   `FISCAL_SERIES_CONSULTAR` ou `FISCAL_SERIES_GERENCIAR`.
2. **O combo de série só aparece com `FISCAL_SERIES_CONSULTAR` e `FISCAL_MODELOS_CONSULTAR`.** Sem uma delas, a nota
   continua com o campo textual compatível com o fluxo anterior.
3. **Inativar uma série é definitivo para aquele número.** A confirmação exige motivo e a série inativa não volta a
   ser oferecida para emissão.
4. **A consulta de buracos inclui notas em andamento.** Os números encontrados precisam ser avaliados antes de uma
   inutilização; a ação de inutilizar continua exigindo `FISCAL_INUTILIZAR`.
5. **A validação E2E completa do fluxo de emissão permanece condicionada à b61.** Esta fatia valida o contrato e a
   integração da tela com APIs isoladas; não antecipa o backend futuro.

### Testes e QA

- Testes unitários e de componente cobrem contratos, permissões, filtros, diálogos, buracos, fallback textual e erros
  cadastrais.
- O E2E isolado cobre as sessões de permissão, payloads, resposta 204, recarga e integração com a nota fiscal.
- O resultado final dos gates, build, duas rodadas de E2E e parecer de QA fica registrado no plano da fatia.

# v1.11.0a8b57.c1

## O gate de guard volta a enxergar o menu: hierarquia pai-filho e menu contra regra de rota (D44, D45, D46)

Fatia corretiva de gate, fora do código de produção. Plano e estado em `docs/fatias/v1.11.0a8b57.c1-gate-menu.md`.

**Risco da fatia: `CRITICAL`** (gate estrutural que passa a reprovar o trabalho de todos). Exige aprovação humana antes
do release. Nenhuma tela, rota, permissão ou item de menu muda.

### O defeito

Desde a `b53`, duas checagens do `validate:guard-permission-map` pareciam proteger o menu e não mediam nada:

- **C2 (`menuHierarquia`)**: o grupo do menu precisa admitir quem o item filho admite, ou o grupo some para quem tem
  direito ao filho.
- **C3 (`menuSemRegra`/`menuForaDaRegra`)**: o menu não pode oferecer rota que a regra de rota recusa.

O leitor do menu exigia nome e permissões na mesma linha, e o `AppMenu.tsx` os escreve em linhas separadas: ele lia
**0 itens** (medido importando a função sobre o arquivo). Mesmo lido, C3 comparava a rota com o texto escapado do
padrão e nunca casaria.

### O que muda

- O menu é lido pela AST: 83 itens, com as três formas de permissão (`permission`, `anyPermissions`, `allPermissions`).
- C2 aplica a semântica de `isVisible` em toda profundidade. Forma não suportada reprova com mensagem nominal, inclusive
  item com mais de uma forma (`D46`); nenhum item do menu atual tem essa forma.
- C3 resolve cada rota pelo `RegExp` real, e vale a primeira regra que casa, como no runtime.
- Na árvore atual o gate fica verde: 0 divergências de C2 e 0 de C3.

### Prova de que o gate sabe ficar vermelho

- **Árvore anterior à `b53` (`66a69b5~1`)**: o gate acusa, par a par, os 16 pares de grupo e permissão que a `b53`
  corrigiu (Cadastros 7, Compras 3, Estoque 3, Financeiro 3) e `/estoque/locais` fora da regra. A `D4` falava em 15; a
  medição dá 16. Teste: `tests/unit/guardPermissionMapMenuProofHistoric.test.ts`, um `it` por item nos dois sentidos.
- **Armadilha de plataforma encontrada no caminho**: no Windows, `execSync` passa pelo cmd.exe, onde `^` é escape, e
  `66a69b5^` virava `66a69b5`, a árvore já corrigida. A prova usa `~1`. Com `^`, 18 testes caem nomeando os pares.
- **Fixtures** (`tests/unit/guardPermissionMapMenuRules.test.ts`): um caso vermelho e um verde por forma, aninhamento em
  dois níveis, forma não suportada, forma múltipla, rota sem regra, rota fora da regra e a primeira regra que casa.
- **Sabotagens na árvore atual**: tirar `FISCAL_REPROCESSAR` só do pai "Fiscal", apagar a regra de `/estoque/locais` e
  trocar a permissão de um filho derrubam o gate; restauração conferida por `sha256sum -c`.
- Recorte `npx vitest run tests/unit/guardPermissionMap`: 97 passed, 0 skipped, conferido pela sessão principal.

### Seção operacional

Nada a conceder e ninguém perde acesso. Quem mexer em `layout/AppMenu.tsx` ou `lib/security/routePermissions.ts` passa
a ter o CI vermelho se o grupo não admitir a permissão do filho, ou se o menu oferecer rota que a regra recusa.

### Pendências nomeadas

- Mensagem do validador para C2 diz "teto excedido — observado N" sem nomear o par; o nome aparece no `--report`.
- Duas worktrees temporárias antigas da prova de C1 (`gate-prova-*/b51`) seguem registradas no git desta máquina.

# v1.11.0a8b57

## Transmissão à SEFAZ: alertas da resposta na tela, reprocessamento no menu e Correlation ID obrigatório (F2.4 a F2.6)

Fecha a onda F2 (`D21`). Plano e estado em `docs/fatias/v1.11.0a8b57-f2-transmissao.md`; decisões `D43`.

**Risco da fatia: `CRITICAL`** (emissão e reprocessamento de documento fiscal). Exige aprovação humana antes do release.

### O que muda

- **Alertas da resposta chegam à tela.** Transmitir, reprocessar e consultar protocolo podem concluir com alerta, como
  "Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado". Antes o aviso era descartado. Agora aparece no
  painel "Último retorno operacional", um aviso por alerta, e continua visível até o próximo retorno ou até sair da nota;
  o toast passa de sucesso para atenção.
- **Correlation ID da transmissão é obrigatório e somente leitura.** Um novo é gerado a cada abertura do diálogo. O
  backend já recusava o campo vazio com 400; agora a tela não deixa chegar lá.
- **`FISCAL_REPROCESSAR` na rota e no menu.** O botão Reprocessar já exigia essa permissão desde a `b52`; a rota de
  notas e os itens "Fiscal" e "Notas fiscais" do menu passam a aceitá-la.
- **Transmitir, reprocessar e consultar protocolo recarregam a nota também quando falham**, para a aba de integrações
  não mostrar estado velho no caminho de recuperação.

### Seção operacional — leia antes do deploy

1. **Nenhuma permissão a conceder e ninguém perde acesso.** Risco de acesso: `NENHUM`.
2. **Quem tem só `FISCAL_REPROCESSAR` passa a ver "Fiscal > Notas fiscais"**, mas a tela exige também
   `FISCAL_CONSULTAR` para abrir notas e reprocessar. Conceda as duas a quem reprocessa.
3. **Grupos criados depois da concessão automática não têm `FISCAL_REPROCESSAR`.** O backend deu a permissão uma única
   vez aos grupos que já tinham `FISCAL_EMITIR` (`FiscalReprocessarConcessaoAutomatica.cs:10-14`).
4. **O Correlation ID da transmissão não é mais editável.** Para uma nova tentativa, feche e reabra o diálogo.
5. **Leia o painel "Último retorno operacional" depois de transmitir.** Alerta ali significa que a operação concluiu pela
   metade e alguém precisa agir (por exemplo, faturar o pedido manualmente).

### Testes, E2E e QA

- **Unit e estrutura** (155 testes no recorte fiscal, permissões e contrato): tipos com `alertas` e `correlationId`
  obrigatório; schema da transmissão recusa vazio, só espaços, nulo, ausente e 121 caracteres; rota e menu com listas
  exatas; `onSettled` nominal nas três mutações; o endpoint de reprocessar aparece uma única vez.
- **Componente** (34 testes): diálogo de transmissão somente leitura e com ID novo a cada abertura; painel com 0, 1 e 2
  alertas iguais e com a consulta de protocolo; botão Reprocessar com o guard e o texto de `FISCAL_REPROCESSAR`; a
  nota é reconsultada quando a transmissão falha.
- **Sabotagens SB1 a SB9**, cada uma derrubando os testes nominais, com restauração conferida por `sha256sum -c`.
  O QA refez SB1, SB4, SB6 e SB8; a sessão principal refez a SB6 (2 testes do AC-8 caem).
- **E2E** (`fiscal-transmissao`, `fiscal`, `fiscal-impostos`, `permissions`): 21 passed nas duas rodadas, servidor
  único na 3411. A primeira tentativa teve o R1 vermelho nas duas rodadas por defeito do teste (o log simulado não
  tinha id GUID, e o schema recusava antes do POST); corrigido o teste, a produção não mudou.
- **QA: APROVADO**, sem achados. Gates rodados pelo próprio QA, inclusive `npm run build` com `.next` apagado.
- **Limite conhecido (`D44`):** a checagem de hierarquia do menu no `validate:guard-permission-map` não enxerga o
  formato do `AppMenu.tsx`. Nesta versão, quem protege pai e filho do menu é o teste estrutural. O gate será refeito em
  fatia própria.

### Pendências nomeadas fora desta versão

- Gate de hierarquia do menu cego: fatia de gate própria (`D44`).
- Alertas de habilitar contingência; Correlation ID editável no reprocessamento: F5.
- `onSettled` nas demais mutações fiscais, erro de validação cru no toast, 409 como fluxo normal: F5.5.
- Perguntas ao backend B-5 (contrato publica `correlationId` opcional) e B-6 (`Alertas` ausente do documento de contrato).

# v1.11.0a8b56.c2

## A dashboard carrega os indicadores da empresa selecionada (DEF-3)

Fatia corretiva (`D42`), antes da `b57`. Os cards de contas a receber e contas a pagar pediam uma empresa e continuavam
pedindo depois de a empresa ser escolhida em "Selecionar contexto". Plano e estado em
`docs/fatias/v1.11.0a8b56.c2-dashboard-contexto-empresa.md`.

**Risco da fatia: `HIGH`** (valor monetário e contexto organizacional). Nenhuma permissão, rota ou menu muda.

### A causa, por leitura

A dashboard consultava vendas, contas a receber, contas a pagar, saldos de estoque e compras **sem enviar a empresa**,
e o backend exige `empresaId` nessas cinco rotas. A chave do cache não levava a empresa: trocar o contexto reconsultava,
mas de novo sem empresa, e o aviso voltava igual. Nos saldos de estoque era pior: o backend devolve lista vazia sem erro
(`ListarSaldosEstoqueUseCase.cs:23-24`), e o card mostrava "0 produtos sem saldo" como se fosse dado.

### O que muda

- As cinco consultas levam a empresa e a filial do contexto (a filial só quando houver).
- A chave do cache inclui o contexto: trocar a empresa recarrega os cards com a empresa nova.
- Sem empresa no contexto, as cinco consultas não saem; os cards ficam indisponíveis e um único aviso orienta a
  selecionar a empresa. A auditoria recente continua carregando.

### Seção operacional

1. **Nenhuma permissão a conceder.** Risco de acesso: `NENHUM`.
2. **O card "Produtos sem saldo disponível" pode mudar de 0 para o número real** da empresa selecionada.

### Testes, E2E e QA

- **Unit** (`dashboardApiContexto.test.ts`, 6 testes): parâmetros por rota com e sem filial; sem empresa, nenhuma das
  cinco rotas é chamada e o aviso sai uma vez.
- **Componente** (`DashboardContexto.test.tsx`, 2 testes): a chave leva o contexto; trocar a empresa reconsulta com o id
  novo e o card mostra o valor novo.
- **Sabotagens:** sem `empresaId` nas consultas, caem os testes de parâmetro; com a chave antiga, caem os de chave e de
  troca de empresa; sem a guarda de empresa, cai o de "sem empresa". Medidas pelo nó `tests` e refeitas pelo QA (SB1 e
  SB2), com restauração conferida por `sha256sum -c`.
- **E2E** (`dashboard-contexto.spec.ts`, com `auth` e `logosoft-critical-flows`): 6 passed nas duas rodadas, servidor
  único na 3411 (PID e linha de comando conferidos). O teste afirma o `empresaId` na URL, porque a simulação responde
  igual sem ele.
- **QA: APROVADO.** Recorte Vitest 45/45, `tsc`, `lint`, `validate:source`, `validate:ci`, os três gates de permissão e
  contrato e `npm run build` com `.next` apagado, rodados pelo próprio QA.

# v1.11.0a8b56.c1

## Campo de valor com casas decimais volta a gravar o que foi digitado em pt-BR

Fatia corretiva do DEF-1 (`D39`), pré-requisito da `b57`. Digitando "12,50" num campo de moeda, a tela gravava
R$ 12,00; digitando "12,05", gravava R$ 12,50. Plano e estado da execução em
`docs/fatias/v1.11.0a8b56.c1-campo-decimal-pt-br.md`; decisão `D40`.

**Risco da fatia: `HIGH`.** Muda o valor gravado por todo campo de moeda do sistema. Nenhuma tela, rota, permissão ou
contrato do backend muda.

### A causa, medida

O defeito é do `InputNumber` do PrimeReact 10.2.1, e não das telas. Na parte decimal, cada dígito sobrescreve o
caractere sob o cursor. Depois, o componente só avança o cursor se o número, convertido em texto JavaScript ("12.5"),
contiver o separador decimal do idioma. Em pt-BR o separador é vírgula e o texto do número usa ponto, então o cursor
nunca avança, e o dígito seguinte apaga o anterior. Em en-US o ponto coincide por acaso, e o defeito não aparece.

Confirmação A/B, com o mesmo teste (Vitest e jsdom) contra o arquivo original e contra uma cópia corrigida, em três
padrões de campo e cinco digitações: 15 de 15 exibem errado no original ("0,99" vira R$ 0,90; "1234,56" vira
R$ 1.234,60) e 15 de 15 exibem o digitado com a correção. O `master` do PrimeReact, lido em 2026-09-15, ainda tem o
mesmo defeito, então atualizar a biblioteca não resolve.

### O que muda

- **A correção é na biblioteca, por `patch-package`** (`patches/primereact+10.2.1.patch`). Quando a digitação cai
  depois do separador decimal, o cursor avança pelo tamanho do que foi digitado. Nenhum arquivo de `features/`,
  `components/` ou `app/` muda.
- **Alcance da correção:** os 22 campos de moeda escritos direto nas telas fiscal e de tributação, e o `MoneyInput`
  compartilhado, usado em 21 arquivos de 17 módulos.
- **`package.json`** ganha `patch-package` 8.0.1 em versão exata e `"postinstall": "patch-package --error-on-fail"`.
- **`Dockerfile`** copia `patches/` antes do `npm install`. Sem isso, a imagem sairia sem a correção e sem erro.
- **O `package-lock.json` continua fora do repositório** (`D8`).

### E um segundo defeito, achado pelo E2E desta versão: campo decimal sem idioma ignora a vírgula (DEF-2)

Com o navegador em pt-BR, digitar "1,25" na Quantidade do simulador exibia "125". Um `InputNumber` que não declara
`locale` não segue o navegador: usa o `'en'` padrão do PrimeReact, em que a vírgula é separador de milhar e é ignorada
na digitação. Medido na Quantidade: "1,25" gravava 125. Pela mesma regra, nos demais campos a vírgula some e o número
fica maior, até o teto do campo quando ele tem um (o `PercentInput` vai até 100 %). Já existia antes desta versão (`D41`).

- **Correção:** `locale="pt-BR"` nos 31 campos decimais que não declaravam idioma. Nada mais muda neles.
- **Alcance:** 27 alíquotas, MVA e reduções nas regras e exceções fiscais; o percentual de reajuste de contratos; a
  quantidade do simulador; o `PercentInput` compartilhado (2 arquivos) e o `QuantityInput` compartilhado (22 arquivos
  de estoque, compras, vendas, PDV, produção, frota, qualidade, serviços, CRM e alimentar).
- **Um teste passa a enumerar** todo `InputNumber` decimal do código e reprova o que não declarar idioma.

### Seção operacional — leia antes do deploy

1. **Nenhuma permissão a conceder.** Risco de acesso: `NENHUM`.
2. **Quem já tem `node_modules` na máquina precisa rodar `npm install` depois do pull.** A correção só entra pelo
   `postinstall`. Sem isso, o servidor local continua com o defeito.
3. **Apague `.next` antes de subir o servidor ou buildar** numa máquina que já rodou a versão anterior. O cache do
   webpack identifica o PrimeReact pela versão, que não mudou, e pode continuar servindo o arquivo antigo.
4. **Sai o aviso da `b56`** de conferir o valor exibido antes de salvar campo de moeda.
5. **Atualizar o PrimeReact passa a reprovar o install** se o patch não aplicar. É de propósito: a correção precisa
   ser refeita ou removida a cada atualização.
6. **Alíquotas, percentuais e quantidades passam a ser exibidos no formato brasileiro:** "12,50 %" em vez de "12.50 %",
   e "1.234,5" em vez de "1,234.5". O valor já cadastrado não muda; muda só como aparece e como se digita.
7. **Confira alíquotas e quantidades gravadas recentemente pela tela.** Até esta versão, quem digitou vírgula nesses
   campos gravou um número sem a vírgula, maior que o digitado, ou o teto do campo. Nas regras fiscais, isso chega ao
   cálculo de tributos.

### Testes, E2E e QA

- **Componente** (`InputNumberDigitacaoPtBr.test.tsx`, `ValoresAcessoriosDialog.test.tsx`): `InputNumber` de moeda e
  de percentual reais, `MoneyInput`, `PercentInput` e `QuantityInput` reais, digitados com `user-event` e conferidos
  depois do blur. Sem o patch (`npx patch-package --reverse`), 11 de 23 caem nominalmente (AC-1, AC-2, AC-3, AC-5);
  com o patch restaurado e conferido por `sha256sum -c`, 23 de 23 passam. Medido duas vezes: nó `tests` e QA.
- **Estrutura** (`primereactPatchStructure.test.ts`): dependência exata, `postinstall`, nome do patch igual à versão
  instalada, só os dois arquivos, e `COPY patches` antes do `npm install` no `Dockerfile`. Cada item derrubado pela
  sua sabotagem (SB2 a SB4).
- **Idioma declarado** (`inputNumberDecimalLocale.test.ts`): 53 de 53 `InputNumber` decimais com `locale`. Tirar o
  `locale` do `QuantityInput` ou de uma linha de `RegraFiscalFormDialog.tsx` reprova nomeando arquivo:linha (SB5, SB6).
- **E2E** (Chromium, teclado real, `next dev -p 3411` único com PID e linha de comando conferidos, `.next` apagado):
  `fiscal-impostos`, `campo-decimal-pt-br`, `financeiro-estoque` e `fiscal`, 12 passed nas duas rodadas, com os mesmos
  títulos. O S2 volta a digitar "12,50"; entram "12,05" no Frete, o Valor unitário do Item, o "Receber" de Contas a
  receber e o simulador com navegador em pt-BR.
- **QA: APROVADO.** Recortes Vitest 57/57 e 47/47, `tsc`, `lint`, `validate:source`, `validate:ci`, os três gates
  de permissão e contrato (177 códigos, 483 chamadas, 459 rotas) e `npm run build` com `.next` apagado, todos rodados
  pelo próprio QA. Diff de produção restrito aos 6 arquivos da `D41`, só pela prop `locale`.

### Pendências nomeadas fora desta versão

- **Issue no PrimeReact** com a causa e a correção: sugestão, fora do repositório.
- **F2.4 a F2.6:** `b57` (`D21`).

# v1.11.0a8b56

## A aba de Impostos diz de onde vem cada linha e qual compõe o total, e a nota ganha frete, seguro e outras despesas

Segunda fatia da onda F2 (`D21`). Corrige o P5 do plano da onda: a aba de Impostos afirmava que o imposto era
"parametrizado/manual" e que nada era calculado, o que é falso desde a v1.22.0/G2, e escondia que uma linha
lançada à mão vence a do motor no total para IPI, ICMS ST e FCP ST. Plano e estado da execução em
`docs/fatias/v1.11.0a8b56-f2-impostos-valores-acessorios.md`; inventário em
`docs/arquitetura/debate/03-inventario-impostos-nota-fiscal.md`; decisões `D33` a `D39`.

**Risco da fatia: `HIGH`.** Valor monetário que compõe o total de um documento fiscal, contrato que muda e um
diálogo que grava. Não emite, não transmite e não estorna. Ficaria `CRITICAL` se os valores acessórios pudessem
ser gravados em nota Validada, e é por isso que não podem (`D33`).

### O que o backend já entregava e a tela não lia

Conferido no código do backend (`New project 3/src`), porque o `CONTRATO-API-v1.23.md` não publica `ValorIpi`,
`OrigemImpostoNotaFiscal` nem os campos de proveniência da linha de imposto.

| O que a UI fazia | O que o backend entrega |
| --- | --- |
| `NotaFiscalResponse` sem os valores acessórios nem os tributos agregados | `valorFrete`, `valorSeguro`, `valorOutrasDespesas`, `valorIpi`, `valorIcmsSt`, `valorFcpSt`, todos somados em `valorTotal` (`NotaFiscal.cs:653-660`) |
| Linha de imposto sem proveniência | `origem` (`Manual = 1`, `Motor = 2`), `regraFiscalAplicadaId`, `excecaoFiscalAplicadaId` |
| Não chamava `POST /api/fiscal/notas-fiscais/{id}/valores-acessorios` | Endpoint sob `FISCAL_GERENCIAR`, com os três valores obrigatórios e não negativos |
| Lançamento manual com motivo pré-preenchido | O motivo é obrigatório e é a auditoria do override (`NotaFiscalBasicaUseCases.cs:326-329`) |

### O que a tela de detalhe da nota passa a fazer

**Aba de Impostos** (`D34`, `D38`)

- A legenda falsa sai. A nova diz o que o código sustenta: o motor calcula na validação, e um lançamento manual
  substitui o motor no total só para IPI, ICMS ST e FCP ST do mesmo item.
- Colunas novas: **Origem** (Manual ou Motor), **No total** e **Observação**.
- "No total" mostra, por linha, "Compõe o total", "Suprimida pelo lançamento manual" ou "Não compõe o total"
  (ICMS, PIS, COFINS e os demais não entram no total da nota).
- A tela não recalcula o total. Ela confere a marcação contra o valor agregado que o servidor devolve. Quando não
  bate, as linhas daquele imposto aparecem como "Não conferida" e um aviso diz que vale o total do servidor.

**Composição do total** (`D34`)

Cartão novo abaixo do cabeçalho: produtos, desconto, frete, seguro, outras despesas, IPI, ICMS ST, FCP ST e o
total. Todos os números vêm da resposta do servidor; nenhum é somado na tela.

**Valores acessórios** (`D33`)

Botão novo "Valores acessórios", sob `FISCAL_GERENCIAR`, habilitado **só com a nota em Rascunho**. O diálogo abre
com os valores atuais e recusa valor vazio ou negativo. Depois de gravar, com sucesso ou erro, a nota é consultada
de novo (`D37`).

**Lançamento manual de imposto** (`D35`)

O diálogo passa a se chamar "Lançar imposto manual". O motivo começa vazio, é obrigatório e aceita até 500
caracteres. O texto padrão "Imposto parametrizado manualmente." e a dica falsa saem.

### Seção operacional — leia antes do deploy

1. **Nenhuma permissão a conceder.** Nenhuma permissão entra ou sai do union, da regra de rota ou do menu. O botão
   novo usa `FISCAL_GERENCIAR`, que quem já lança item e imposto tem. Risco de acesso: `NENHUM`.
2. **Valores acessórios só em Rascunho, embora o backend aceite mais.** O backend grava frete, seguro e outras
   despesas também em Validada, Assinada, Rejeitada e Contingência, mas o motor de tributação só recalcula em
   Rascunho (`CalculoTributarioNotaFiscalService.cs:54`). Em Validada, o total mudaria e IPI, ICMS ST e FCP ST
   ficariam com a base antiga, e o XML já gerado seguiria para assinatura com o total anterior. Nota rejeitada volta
   a Rascunho pela correção e pode então ser ajustada.
3. **O motivo do lançamento manual passa a ser digitado.** Quem lança imposto à mão precisa escrever por quê; o
   motivo aparece na coluna Observação.
4. **Condição que já existe hoje, e não muda nesta versão:** os botões Item e Imposto seguem habilitados em
   Validada, com a mesma defasagem de base tributária. Restringi-los tiraria uma operação que conclui hoje, e fica
   para fatia própria com decisão do dono do produto (`D33`).
5. **Confira o valor exibido antes de salvar qualquer campo de moeda.** Defeito que já existia, encontrado pelo E2E
   desta versão e não corrigido nela (`D39`): digitando os centavos com dois dígitos, o segundo sobrescreve o
   primeiro. "12,50" grava R$ 12,00, e "12,05" grava R$ 12,50. Medido no campo de frete e no "Valor unitário" do item. Os
   demais campos de moeda do fiscal e da tributação usam a mesma configuração e provavelmente têm o mesmo defeito, assim
   como os outros campos de moeda do sistema.
   O valor que aparece no campo é o que será gravado. Correção em fatia própria, antes da `b57`.

### Gate de contrato (`D22`, `D36`)

A rota `valores-acessorios` foi acrescentada como adendo a `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, citando
`NotasFiscaisController.cs:95-102`. `calcular-tributos`, que também falta ali, ficou fora de propósito: a tela não
a consome e o destino é a F3. Medido logo após o adendo: `validate:backend-contract-map` com saída `0`.

### Testes, e a prova de que sabem falhar

Dois recortes, rodados com `npx vitest run` pela sessão principal depois do nó `tests`:

- **Fiscal, contrato e permissões:** 12 arquivos, **99 testes** ("Tests 99 passed (99)"). Novos:
  `tests/unit/fiscalImpostosComposicao.test.ts`, `fiscalImpostosStructure.test.ts` e, em `tests/components/`,
  `ValoresAcessoriosDialog`, `ImpostoNotaFiscalDialog`, `NotaFiscalImpostosPanels` e
  `useFiscalMutationsValoresAcessorios`. `backendContractMap.test.ts` passa de 577 para 578 rotas, com asserção
  nominal de `valores-acessorios`.
- **Pendências da b55 (QA3-2, QA3-3, QA3-4):** 3 arquivos de faturamento, **27 testes** ("Tests 27 passed (27)").

`npx tsc --noEmit` com saída 0. Os nove casos da regra de supressão (IPI manual contra motor, ICMS fora do total, só motor,
item nulo, soma que não bate, manual duplicado, nome com hífen, minúsculas, origem ausente) têm um teste cada.

Cada sabotagem abaixo foi feita no código de produção pelo `engenheiro-testes`, com backup e restauração
conferida por `sha256sum -c`, e derrubou os testes que a nomeiam:

| Sabotagem | Reprovou |
| --- | --- |
| S1: o motor volta a vencer o lançamento manual | AC-4 (a) e (e) no unitário; AC-5 no componente |
| S2: o cartão soma o total no cliente | AC-6 (total 999 com componentes que não somam 999) |
| S3: o schema de acessórios perde o `.strict()` | AC-8 (chave extra) |
| S4: a mutação de acessórios volta a reconsultar só no sucesso | AC-9 na estrutura e no `renderHook` com POST rejeitado |
| S5: valores acessórios liberados em Validada | os dois testes de AC-10 |
| S6: a legenda falsa volta | os dois testes de AC-2 |
| S7: `cancelarMutation` do faturamento volta a `onSuccess` com comentário decorativo | QA3-3 |

**E2E.** `tests/e2e/fiscal-impostos.spec.ts` (novo) roda com `fiscal.spec.ts` e `permissions.spec.ts`, porque a fixture
compartilhada mudou. Quatro sessões nominais:

- **S1:** só consultar. Botão visível e desabilitado.
- **S2:** consultar e gerenciar, nota em Rascunho. Envia o corpo exato e mostra o frete devolvido.
- **S3:** só gerenciar. A página nega acesso e nenhum POST sai.
- **S4:** depois de Validar. Botão desabilitado com o motivo.

A primeira execução reprovou o S2 nas duas rodadas (15 passed | 1 failed): digitado "12,50", o corpo saiu com
`valorFrete: 12`. A sessão principal mediu a causa, que é o DEF-1 (`D39`), e o S2 passou a digitar "12,5" e a
conferir o campo exibindo 12,50 antes de salvar. Segunda execução: **16 passed | 0 failed nas duas rodadas**, num
servidor isolado na 3411 (PID 31684, `next dev -p 3411` neste diretório, identidade conferida antes de cada rodada e
porta liberada ao fim).

**QA.** O `qa-revisor` rodou os gates e o `build` com saída 0 e os dois recortes (99 e 27), e reproduziu três
sabotagens com restauração conferida por `sha256sum -c` (28 arquivos OK): S1 com 3 failed | 20 passed, S2 com
1 failed | 22 passed e S5 com 2 failed | 18 passed. Veredito `APROVADO_COM_RESSALVA`: ele não reexecutou o E2E, e
faltam dois testes menores, valor negativo no componente do diálogo e GUID no cartão de composição, com destino F5.

### Pendências nomeadas fora desta versão

- **DEF-1, campo de moeda que grava centavo errado:** fatia corretiva própria, recomendada antes da `b57` (`D39`).
- **F2.4 a F2.6** (alertas da transmissão, `FISCAL_REPROCESSAR` na rota e no menu, `correlationId`): `b57` (`D21`).
- **Recalcular tributos pela tela** (`calcular-tributos`): F3 (`D36`).
- **Reconsulta no erro nas outras 21 mutações fiscais:** F5.5 (`D37`).
- **Observação da nota, e GUIDs de regra e exceção fiscal:** F5 (`D38`).
- **`Descartada` ausente do enum de status no frontend; `pessoaId` sem par; `numeroDocumento` não tipado:** fatias
  de classe de enum e de campo, depois das respostas do backend.
- **Perguntas ao backend:** B-1 (exigir Rascunho no domínio), B-2 (gerador do contrato perde campo depois de
  comentário), B-3 (request de acessórios publicado como opcional), B-4 (manual duplicado legado na mesma chave).
- **Esteira:** o builder desta fatia rodou `git stash`, que `policies.yaml` proíbe e nenhum hook impede (VIOL-1,
  sem dano, conferido).

# v1.11.0a8b55

## Faturamento mostra os seis legs, avisa quando a etapa mente, e oferece a retomada de reversão

É a primeira fatia da onda F2 (`D21`). Corrige o P4 do plano da onda: um leg preso em reversão deixava
estoque baixado ou título a receber de pé, com o faturamento em "Cancelado" ou "Erro", sem que a tela
dissesse isso e sem caminho de UI para resolver. Plano e estado da execução em
`docs/fatias/v1.11.0a8b55-f2-legs-faturamento.md`; inventário em
`docs/arquitetura/debate/02-inventario-legs-faturamento.md`; decisões `D21` a `D32`.

**Risco da fatia: `CRITICAL`.** A retomada chama porta inversa real: descarta nota não transmitida (legs 1
a 3), estorna baixa de estoque (leg 5) e cancela conta a receber (leg 6). A declaração de efeito desfeito é
afirmação humana. Conferido em `CatalogoLegIntegracaoFaturamento.cs` e `RetomarReversaoLegUseCase.cs`.

### O que o backend já entregava e a tela não lia

Tudo conferido no código do backend (`New project 3/src`), porque o documento de contrato não publica
valores de enum e tem três erros nesta seção (armadilhas 2 a 4 do plano).

| O que a UI fazia | O que o backend entrega |
| --- | --- |
| `FaturamentoResponse` com 13 campos | 18: mais `legs`, `possuiLegComFalha`, `possuiLegRevertido`, `etapaDivergeDosLegs`, `possuiLegEmReversao` |
| Não chamava `POST /api/faturamento/{id}/retomar-reversao` | Endpoint sob `FATURAMENTO_RETOMAR_REVERSAO`, motivo obrigatório de até 500 caracteres |
| Motivo do cancelamento sem teto | `MaximumLength(300)` (`FaturamentoValidators.cs:35`) |
| Recarregava o detalhe só em sucesso | É a falha no meio do cancelamento que cria o leg `EmReversao` e a ocorrência de erro |

### O que a tela de detalhe do faturamento passa a fazer

**Legs de integração** (`D25`)

Um cartão novo mostra sempre os seis legs, na ordem da cadeia:
1. Gerar nota fiscal
2. Gerar XML de envio
3. Assinar XML
4. Transmitir e autorizar na SEFAZ
5. Baixar estoque
6. Gerar conta a receber

Cada linha traz o estado, a data e o motivo. Leg que ainda não rodou aparece como "Sem registro". Estado
com valor desconhecido aparece como "Estado desconhecido (n)", e nunca como "Revertido".

**Os dois alertas**

- **Etapa × legs.** Quando `etapaDivergeDosLegs` vem verdadeiro, a tela avisa que a etapa não reflete o
  estado dos legs. Em Erro ou Cancelado, isso quer dizer que um efeito pode continuar de pé.
- **Leg em reversão.** Quando `possuiLegEmReversao` vem verdadeiro, a tela avisa que o efeito original pode
  continuar de pé até a retomada.

**Retomar reversão** (`D27`, `D28`)

O botão aparece só na linha do leg em reversão, sob `FATURAMENTO_RETOMAR_REVERSAO`.

- **O diálogo.** O leg da linha aparece só para leitura. A ação ("Reaplicar a inversa" ou "Declarar efeito
  desfeito") começa vazia. O motivo é obrigatório e aceita até 500 caracteres.
- **Declarar.** Escolher essa ação mostra o aviso de afirmação humana.
- **Toasts.** Sucesso dá "Reversão confirmada pelo sistema" para Reaplicar e "Declaração registrada" para
  Declarar.
- **Estado exibido.** A tela não troca o estado por conta própria. O que aparece vem sempre da nova consulta.

**Confirmar** (`D23`)

Fica desabilitado quando há leg em reversão, com o motivo no tooltip.

**Reconsulta no erro** (`D27`)

Confirmar, cancelar e retomar recarregam o detalhe, o histórico e as ocorrências também quando falham. É
na falha que o leg em reversão e a ocorrência de erro aparecem.

**Motivo do cancelamento** (`D30`)

Limitado a 300 caracteres, igual ao backend.

**O que não muda** (`D26`)

A listagem de faturamentos, a rota e o menu continuam como estavam. O backend não traz legs na listagem, e
um sinal ali diria "sem problema" em toda linha.

### Seção operacional — leia antes do deploy

1. **Conceder `FATURAMENTO_RETOMAR_REVERSAO` junto com `FATURAMENTO_CONSULTAR`** a quem resolve reversão
   de faturamento, antes do deploy. Só a permissão de retomada não abre a tela: a rota e o detalhe exigem
   consultar. Nenhuma rota ou item de menu muda.
2. **Confirmar fica indisponível quando o faturamento tem leg em reversão** (`D23`, risco de acesso
   `ILUSAO`). O backend já recusava esse caso depois de o operador preencher os campos fiscais. Nenhuma
   operação que conclui hoje deixa de concluir.
3. **"Declarar efeito desfeito" é afirmação humana, auditada como estorno**, e encerra o aviso de reversão
   pendente sem nenhuma chamada ao sistema. Oriente quem recebe a permissão: só declarar depois de
   conferir fora do sistema que o estoque foi reposto, a nota descartada ou o título cancelado.
4. **Condição que já existe hoje, e não muda nesta versão:** cancelar faturamento com leg integrado exige
   também `FATURAMENTO_REVERTER_INTEGRACAO`, que não aparece na tela de grupos. Sem ela, o cancelamento
   devolve "Recurso não encontrado.". Fica para a fatia de cancelamento (`D24`).
5. **Limite do dano, conferido no domínio:** cancelar conta a receber com qualquer valor recebido é
   recusado pelo backend (`ContaReceber.cs:80`), e o descarte de nota só vale para nota não transmitida.

### Gate de contrato (`D22`)

O `validate:backend-contract-map` lê `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, levantamento manual da
v1.18 (commit único `9c16a39`, sem gerador no backend, sem proteção de hook). A rota de retomada foi
acrescentada ali como adendo, citando `FaturamentosController.cs:99-106`, e o teste do mapa passa de 576
para 577 rotas com asserção nominal. Medido logo após o adendo: gate com saída `0`, e o teste antigo
vermelho com "expected 576 but got 577". A migração do gate para o `CONTRATO-API-v1.23.md` gerado fica como
fatia de esteira.

### Testes, e a prova de que sabem falhar

Recorte de 7 arquivos, com **67 testes**. A contagem é a saída "Tests 67 passed (67)" do `npx vitest run` nos 7 arquivos, medida pelo QA da tentativa 3, duas vezes. Antes da correção `D32` eram 66:

- **Unitários:** `tests/unit/faturamentoPayload.test.ts`, `faturamentoStructure.test.ts`, `faturamentoLabels.test.ts` (novo), `backendContractMap.test.ts` (576 → 577, com asserção nominal da rota) e `backendPermissions.test.ts`.
- **Componente:** `tests/components/RetomarReversaoDialog.test.tsx` (novo, 4 casos) e `FaturamentoDetalhePage.test.tsx` (novo, 10 casos).

Cada sabotagem abaixo foi feita no código de produção, com backup e restauração conferida com `cmp`, e derrubou **exatamente um** dos 13 testes de componente da bateria anterior à correção ("1 failed | 12 passed (13)"): o que a nomeia. As linhas de AC-6 e AC-10 foram reproduzidas também pela sessão principal, com o mesmo resultado.

| Sabotagem | Reprovou |
| --- | --- |
| Retomar aparece também em leg Integrado | `AC-6: botão Retomar existe só na linha em reversão` |
| Retomada volta a reconsultar só no sucesso (`onSuccess`) | `AC-10: após retomada rejeitada reconsulta o detalhe…` |
| Aviso de "Declarar" sempre oculto | `AC-8: Declarar exibe o aviso de afirmação humana; Reaplicar não` |
| Confirmar sem o bloqueio por reversão | `AC-12: Confirmar desabilitado com leg em reversão e habilitado sem` |
| Tabela sem as linhas "Sem registro" | `AC-2: mostra 6 linhas na ordem do catálogo e Sem registro para o leg 4` |

Unitários: estado desconhecido (0, 5, 99) nunca vira "Revertido". Os motivos aceitam 500 e 300 caracteres e recusam 501 e 301. Enum em string e campo extra são recusados.

**Foram precisas três tentativas neste nó.** A primeira não entregou os testes de componente nem o spec, alegando que o `Dropdown` do PrimeReact não era testável em jsdom — alegação já medida e derrubada na b54.c2. A segunda entregou testes que passavam sem testar: um único caso na tela, e seleção de opção dentro de um `if` que pulava em silêncio. A terceira teve títulos de caso prescritos e sabotagem obrigatória, e fechou.

**O QA bloqueou a primeira versão desta bateria, com razão.** Numa segunda revisão, feita no nível de modelo que o grafo exige, o QA fez nove sabotagens. Quatro passaram sem nenhum teste vermelho:

- valores do enum trocados (o teste comparava pelo membro, não pelo número);
- "Revertido" inventado pela tela depois de uma falha;
- tooltip do Confirmar sem `showOnDisabled`;
- permissão a mais no `anyOf` da rota.

O nó `correction` (`D32`) acrescentou os valores literais dos enums, o cenário direto de POST falho com o GET ainda em 4, o teste do tooltip no e2e e as listas `anyOf` literais. Depois disso, cada uma das três sabotagens de unidade e componente (S1, S2 e S4) derrubou exatamente o teste que a nomeia: "1 failed | 66 passed (67)" em cada uma, no recorte de 7 arquivos, medido pelo QA da tentativa 3. A sabotagem do tooltip foi medida no navegador:

- **Com a sabotagem (sem `showOnDisabled`):** o teste `AC-12 S4` do e2e falhou, com `.p-tooltip` não encontrado.
- **Restaurado:** o mesmo teste passou.
- **Como foi rodado:** `--grep "AC-12 S4"`, num servidor isolado na 3411 (PID 7344, `next dev -p 3411` em `Documents\New project`).
- **Antes de cada rodada:** o chunk servido confirmou que a sabotagem, e depois a restauração, estavam no ar.

O registro de exceção GC-01, com alvo `b54` vencido desde a b53, passou a apontar para a F5.6.

**Dívida registrada (`D31`).** Quando a gravação falha, o diálogo que faz `await onSubmit` sem `catch` gera uma rejeição não tratada no console. O toast e o diálogo aberto estão certos. É padrão da base (142 `rethrow: true` em 63 arquivos de `features/`, medido por grep) e vai para a F5.5.

### E2E

`tests/e2e/faturamento-legs.spec.ts` (novo) cobre quatro sessões nominais:

| Sessão | Permissões | O que se afirma |
| --- | --- | --- |
| S1 | `FATURAMENTO_CONSULTAR` | Retomar visível e desabilitado |
| S2 | `FATURAMENTO_CONSULTAR` + `FATURAMENTO_RETOMAR_REVERSAO` | Retomar habilitado. O corpo enviado é exatamente `{ leg: 5, acao: 1, motivo }`, numérico |
| S3 | só `FATURAMENTO_RETOMAR_REVERSAO` | Estado não autorizado, sem tabela de legs e nenhum `POST` (contador registrado antes da navegação) |
| S4 | `FATURAMENTO_CONSULTAR` + `FATURAMENTO_CONFIRMAR` | Confirmar desabilitado mostra o tooltip do motivo (`showOnDisabled`) |

**Servidor.** Único, na porta 3411. A identidade foi conferida pela linha de comando do PID, que roda `next dev -p 3411` a partir de `Documents\New project`. Antes de subir, a porta estava livre. No fim, foi liberada.

**Resultado.** Rodou `faturamento-legs.spec.ts` junto com `permissions.spec.ts`, porque a fixture compartilhada ganhou as rotas de faturamento. Foram **14 de 14 nas duas execuções**, com os mesmos títulos. Depois da correção pós-QA, com o teste S4 acrescentado, rodou de novo em outro servidor isolado (PID 26544, identidade conferida da mesma forma): **15 de 15 nas duas execuções**.

### O que fica aberto, nomeado

- **Fluxo de Cancelar** (`D24`): guard por leg 4 integrado, recusa como lista, `FATURAMENTO_REVERTER_INTEGRACAO`.
- **Sinal de legs na listagem** (`D26`): a listagem do backend não traz legs; depende da pergunta B-3.
- **Identificadores de usuário crus** (`D30`): F5.
- **Perguntas ao backend** B-1 a B-9, na seção 8 do plano.

# v1.11.0a8b54.c2

## Estado de Bens remodelado contra o contrato, a baixa volta a concluir, e o gate de campo ganha prova durável

Fatia criada por `D15` e `D16` na `b54.c1`, com dois itens nomeados: a remodelagem do estado de Bens e
a prova de que o gate de campo sabe ficar vermelho. O nó `inventario` achou mais três divergências no
mesmo fluxo, e `D20` as trouxe para dentro. Plano e estado da execução em
`docs/fatias/v1.11.0a8b54.c2-estado-de-bens.md`; inventário em
`docs/arquitetura/debate/01-inventario-estado-de-bens.md`.

### O que estava errado, e como foi medido

Tudo conferido contra o código do backend (`Erp.Domain/Patrimonio`, `Erp.Application/Patrimonio/Bens`,
`BensPatrimoniaisController`), e não só contra o documento de contrato, que não publica valores de enum.

| O que a UI fazia | O que o backend entrega ou exige |
| --- | --- |
| Lia `status` com enum `Ativo=1`, `Bloqueado=2`, `Baixado=3` | `StatusBem` com `Ativo=1`, `Baixado=2`, e bloqueio é `bool Bloqueado`, campo separado |
| Filtro "Bloqueado" enviava `status=2` | `2` é **Baixado**. E "Baixado" enviava `3`, valor que não existe, com lista sempre vazia |
| Categoria `Movel..Outro` com 6 valores | `CategoriaBemPatrimonial` com 8. A partir do `4`, o mesmo número nomeia outra coisa |
| Motivo da baixa como texto livre | `MotivoBaixaPatrimonial`, enum numérico obrigatório. O corpo nem desserializa |
| Desbloqueio pedia e enviava motivo | `Desbloquear(Guid id)` não lê corpo, e o domínio apaga `MotivoBloqueio` |

O backend serializa enum como **número**: nenhuma ocorrência de `JsonStringEnumConverter` em
`New project 3/src`, conferido pela sessão principal e pelo inventariante.

### O que a tela de Bens passa a fazer

**Status** (`D18`) — a coluna mostra a situação derivada dos dois campos: `Baixado`, `Bloqueado` (bem
ativo com bloqueio) ou `Ativo`. O filtro oferece só Ativo e Baixado, que é o que a listagem aceita. A
opção "Bloqueado" sai do filtro. Filtrar por bloqueio localmente é candidato a fatia funcional.

**Ações** (`D18`) — as quatro guardas espelham `BemPatrimonial.cs`: Transferir, Bloquear e Baixar para
bem ativo e não bloqueado; Desbloquear para bem bloqueado. Baixar deixa de ser oferecido para bem
bloqueado, que o domínio recusa com "Desbloqueie antes de baixar".

**Categoria** (`D20`) — o enum é substituído pelos 8 valores do backend: Móvel, Imóvel, Veículo,
Máquina, Equipamento, Ferramenta, Software, Outro. O cadastro continua abrindo em Equipamento, que agora
é o `5` de verdade.

**Baixa** (`D20`) — o motivo vira lista obrigatória: Venda, Obsolescência, Perda, Doação, Sinistro,
Transferência, Outro. A justificativa continua em texto.

**Desbloqueio** (`D20`) — executa direto na linha, sem diálogo, como em Lotes. O diálogo antigo
prometia que o motivo "será enviado para auditoria", e ele era descartado.

### Seção operacional — leia antes do deploy

**Nenhuma permissão, rota ou item de menu muda, e não há concessão a fazer.** Três comportamentos
visíveis mudam para quem já tem permissão:

1. **Quatro ações voltam a aparecer em Bens.** `Number(row.status)` era `NaN` sobre campo inexistente,
   e Transferir, Bloquear, Desbloquear e Baixar **nunca apareciam, para bem nenhum**. Voltam para quem
   tem `PATRIMONIO_TRANSFERIR`, `PATRIMONIO_BENS_GERENCIAR` ou `PATRIMONIO_BAIXAR`. É ganho de
   capacidade.
2. **A baixa passa a concluir.** Antes desta versão, mesmo com o botão visível, o `POST .../baixar`
   falharia na desserialização do motivo.
3. **A categoria exibida pode mudar em bens já cadastrados — revisar.** Um bem cadastrado por esta tela
   como "Equipamento" foi **gravado** como Máquina. Da mesma forma, "Informática" foi gravado como
   Equipamento, e "Outro" como Ferramenta. O dado no banco não muda. O que muda é o rótulo, que passa a
   dizer o que está gravado. **Recomendação a quem administra o patrimônio:** depois do deploy, revisar
   os bens nas categorias Máquina, Equipamento e Ferramenta. Quantos bens estão nessa situação **não foi
   medido**, porque esta esteira não tem acesso ao banco.

### Testes da tela de Bens, e a prova de que sabem falhar

`tests/unit/patrimonioEstadoBem.test.ts` (novo), `tests/components/BaixarBemDialog.test.tsx` (novo) e
três regressões textuais em `tests/unit/patrimonioStructure.test.ts`. O recorte roda 44 testes.

- **Guardas:** as 12 células de estado × ação, uma asserção cada.
- **Enums e opções:** estado, categoria e motivo da baixa, com os valores do backend.
- **Valor inicial do cadastro:** lido no fonte de `initialBem`.
- **Componente de baixa:** passa pelo `Dropdown` real e afirma que o motivo sai numérico.
- **Desbloqueio:** a chamada sai sem corpo.

Cada teste foi sabotado pela sessão principal no código de produção, com restauração conferida byte a
byte. Cada sabotagem derrubou **exatamente um** teste, o que devia derrubar:

| Sabotagem | Reprovou |
| --- | --- |
| Baixar volta a aceitar bem bloqueado | `Ativo bloqueado: Baixar` |
| Cadastro abre em Máquina | `valor inicial do cadastro é Equipamento=5` |
| Diálogo sem a validação de motivo | `AC-7: não confirma sem motivo` |
| Desbloqueio envia corpo | `AC-8 … sem segundo argumento (sem corpo)` |

A primeira entrega deste nó tinha trocado o teste de componente por teste de schema, alegando que o
PrimeReact não roda em jsdom. A alegação foi medida e não procedia: os testes de componente existentes
imprimem o mesmo aviso de CSS e passam. Com a primeira forma do teste de guarda, uma falha também não
dizia qual ação tinha quebrado.

**Typecheck só no QA.** O primeiro QA desta versão bloqueou por `npm run typecheck` com saída `1`. Eram três erros nos dois arquivos de teste novos: `for...of` sobre `NodeList` e uma regex com a flag `s`, que o `target: es5` do projeto não aceita. Nenhum nó anterior tinha checado tipo depois de os testes existirem, porque o builder roda antes deles e o nó de testes só roda Vitest. A correção trocou as iterações por `Array.from` e removeu a flag. A regex não tem `.`, então o que ela casa não mudou, e a sabotagem do cadastro abrindo em Máquina continuou derrubando o teste do valor inicial. A lacuna no grafo fica registrada como fatia de esteira separada: pôr `npx tsc --noEmit` nos gates do nó de testes.

### O que fica aberto, nomeado

- **`empresaId` na primeira consulta** (`D20` item 4). A listagem de Bens pode disparar antes do filtro
  alinhar a empresa ao contexto. O padrão `useState<...Query>({})` aparece em 50 telas (medido por grep),
  então é assunto de contexto organizacional, não de Bens. Não foi medido em execução.
- **A classe "valor de enum sem par" não tem gate.** Quatro instâncias em duas fatias (`StatusBoleto`,
  `StatusBem`, `CategoriaBem` e motivo da baixa). O documento de contrato não publica valores de enum, e
  sem fonte versionada não há gate possível. Pedido ao backend: publicar os enums no `CONTRATO-API`.

### A prova durável do gate de campo (`D16`, `D19`)

O registro de exceção de `scripts/gate-contract-fields.allowlist.json` fica **vazio, com `teto: 0`**.
A última entrada (`BemPatrimonialResponse.status`, `D15`) foi drenada pela remodelagem acima.

`tests/unit/gateContractFields.test.ts` deixa de ler o arquivo de tipos e passa a **executar o gate**
como processo, num espelho temporário fora do repositório, em três sondas:

| Sonda | Tipos | Esperado |
| --- | --- | --- |
| A | `2c50771`, a árvore anterior à `b54.c1` | saída `1` e **24 nomes**, um `it` por nome |
| B | árvore de hoje | saída `0` |
| C | árvore de hoje, com um campo fantasma injetado | saída `1` e o nome do campo |

A referência histórica é o SHA fixo `2c50771`, e não `origin/main`. O teste da `b54.c1` lia
`origin/main`, que depois do merge do pull request 16 deixa de conter os campos. Ele ficaria vermelho
**no próprio `main`**.

**24 nomes, e não os 19 que a decisão previa** (complemento de `D19`). Em `2c50771`, `BoletoResponse`
e `LancamentoContabilResponse` são interseções com os tipos resumo, e o gate valida os dois lados de
cada par. São 17 declarações próprias mais 7 nomes herdados. O nó de gate devolveu `needs_decision`
em vez de ajustar a lista até bater, que é o comportamento que o grafo pede.

**Medição da prova vermelha**, feita pela sessão principal sobre o arquivo final: edição temporária de
`scripts/gate-contract-fields.mjs` com backup, execução só do arquivo de teste, e restauração conferida
por `git diff --exit-code` (saída `0`) depois de cada sonda.

| Sonda | Resultado |
| --- | --- |
| Gate intacto | 31 passaram |
| Resolução de interseção desligada | **7 falharam**, exatamente os herdados, cada um pelo nome |
| Comparação que nunca acusa | **27 falharam**: código e 24 nomes da Sonda A, código e nome da Sonda C |

**Achados na execução do nó**, registrados porque são a classe que a esteira existe para pegar:

1. A segunda entrega declarou `prova_vermelha: passed` sem ter rodado sonda de cegamento nenhuma, com
   dois `it.skip` vazios afirmando "executados e medidos".
2. O título do `it.each` não interpolava, e as falhas saíam sem dizer qual campo sumiu.
3. O agente rodou a suíte completa três vezes, contra a regra do projeto.
4. O mesmo agente explicou uma rodada com 27 falhas como "estado compartilhado do Vitest". O número é
   exatamente o da sonda da sessão principal, que rodava ao mesmo tempo. Explicação de ambiente sem
   prova, descartada.

Os quatro foram corrigidos por um bloco de correção enxuto, que usou a terceira e última tentativa do nó.

### Ritual de versão

`package.json`, `config/app.ts`, `.env.example`, `.env.test`, `.env.backend-controlled.example`,
`.github/workflows/frontend-ci.yml`, `README.md`, `CHANGELOG.md` e
`tests/evidence/integrated-e2e.assisted-evidence.example.json` carimbados em `1.11.0a8b54.c2`.
`scripts/backend-permissions.allowlist.json` e `scripts/guard-permission-map.allowlist.json` carimbados;
`scripts/backend-contract-map.allowlist.json` por `npm run stamp:backend-contract-map-version`, e
`scripts/backend-permissions.snapshot.json` regenerado por `npm run generate:backend-permissions-snapshot`.

# v1.11.0a8b54.c1

## Campo monetário sem par no contrato: cinco telas corrigidas e um gate que fecha a classe

Fatia corretiva criada por `D5`, que a separou da `b54` de propósito: aquela drenou as cópias
locais de `formatMoney` e deixou quatro pontos de chamada lendo campo que o backend não declara,
com o custo declarado de exibirem `—` em produção até esta versão entrar. Entrou.

### O que estava errado, e como foi medido

O nó `inventario` confrontou o **tipo inteiro** de cada tela contra o record C# de response do
backend, campo a campo, citando arquivo e linha do `.cs`. O recorte cresceu de quatro pontos de
dinheiro para 13 campos fantasma em cinco telas:

| Tela | Campo que a UI lia | O que o backend entrega |
| --- | --- | --- |
| Boletos, lista e detalhe | `valor` | `ValorTitulo` obrigatório e `ValorPago` opcional |
| Boletos | `vencimento` | `DataVencimento` |
| Boletos | `status` | `StatusBoleto` |
| Boletos, detalhe | `alertas` | nada — o campo não existe em `GET /{id}` |
| Boletos, histórico | `evento` e `descricao` | `StatusAnterior`, `StatusNovo` e `Observacao` |
| Lançamentos contábeis | `valorTotal` | `TotalDebito` e `TotalCredito` |
| Lançamentos contábeis | `status` | `StatusLancamento` |
| Depreciação | `ano`, `mes`, `bensDepreciados`, `valorTotal` | `Competencia`, `TotalBensDepreciados`, `ValorTotalDepreciado` |
| Bens | `valorContabil` | `ValorContabilAtual` |

### O que cada tela passa a exibir

**Boletos** (`D10`) — a coluna única "Valor" vira duas, "Valor do título" com `formatMoney` e
"Valor pago" com `formatMoneyOptional`. **É o primeiro ponto de chamada de `formatMoneyOptional`
em produção**: a função existe desde a `b51`, por `D1`, e até hoje não tinha nenhum. O enum
`StatusBoleto` do frontend é **substituído** pelo do backend (`Gerado`, `EmRemessa`, `Liquidado`,
`Cancelado`); o antigo tinha cinco valores com semântica diferente em três deles, e corrigir só o
nome do campo teria trocado um sintoma barulhento por um silencioso — o valor `4` apareceria como
"Baixado" quando o backend quer dizer "Cancelado".

**Histórico do boleto** (`D14`) — a coluna "Evento", que lia um campo inexistente e renderizava
etiqueta vazia em toda linha, passa a exibir a **transição** (`Gerado → Em remessa`), montada com
os dois campos de estado que o contrato entrega. "Descrição" passa a ler `observacao`.

**Lançamentos contábeis** (`D11`) — a coluna "Valor" vira duas, "Débito" e "Crédito". Exibir um
total seria afirmar uma garantia que não existe: a igualdade entre os dois lados é imposta pelo
`refine` de `contabilSchemas.ts` apenas no que **o frontend cria**, e lançamento de origem
automática nunca passa por ele. Duas colunas é a única opção que não pode mentir.

**Depreciação** (`D12`) — o tipo é reescrito contra `ProcessarDepreciacaoPeriodoResponse` e a tela
decodifica `Competencia`, que é `ano * 100 + mes`. A frase que o operador lê **não muda**.
`TotalContabilizados` e a lista de `Bens`, que o backend entrega e a tela ignora, ficam
registrados como candidatos de fatia funcional — fatia corretiva conserta, quem acrescenta é outra.

**Bens** (`D13`) — a coluna "Valor contábil" passa a ler `valorContabilAtual`, **sem** o fallback
`?? valorAquisicao`. Era o fallback que tornava o defeito silencioso: como o campo lido nunca
existiu, a coluna mostrava o valor de aquisição mesmo para bem já depreciado.

### Seção operacional — duas ações voltam a aparecer

**Nenhuma permissão, rota ou item de menu muda, e não há concessão a fazer antes do deploy.** Mas
o comportamento visível muda para quem já tem permissão:

- **Boletos** — `boletoPodeCancelar` recebia `Number(row.status)` sobre campo inexistente, o que dá
  `NaN`. A ação **"Cancelar" nunca aparecia, para nenhum boleto**. Volta a aparecer para quem tem
  `BOLETOS_CANCELAR`.
- **Lançamentos contábeis** — mesmo defeito em `lancamentoPodeEstornar`. A ação **"Estornar" nunca
  aparecia, para nenhum lançamento**. Volta a aparecer para quem tem a permissão.

É ganho de capacidade, não perda. O backend continua sendo quem autoriza.

### O gate que fecha a classe

Nasce `scripts/gate-contract-fields.mjs` (`npm run validate:contract-fields`), ligado em
`scripts/validate-source.mjs` e portanto no CI. Ele reprova quando um tipo do frontend declara
campo que o record de response do backend não entrega, comparando contra os blocos `csharp` de
`docs/backend-v1.23/CONTRATO-API-v1.23.md`, que está versionado aqui — por isso o gate roda no
runner, sem depender do repositório do backend.

**Por que um gate e não mais um teste:** os três testes de estrutura dos módulos tocados
(`bancosStructure`, `contabilStructure`, `patrimonioStructure`) passaram **antes e depois** da
correção. Treze testes verdes não notaram a troca de cinco campos nem a substituição de um enum
inteiro, porque nenhum deles asserta sobre campo de contrato.

**Medição da prova vermelha:** contra `origin/main`, o gate acusa os 13 campos nominais acima, um a
um. Contra a árvore de hoje, zero. E a sessão principal conferiu por sonda independente: um campo
fantasma injetado em `LancamentoContabilResponse` foi acusado **pelo nome**, com código de saída
`1`; revertido, volta a `0`.

**Correção antes do merge, por revisão automática** (`D17`). O primeiro commit desta versão
afirmava comparar contra o documento de contrato e **não comparava**: o documento só aparecia num
comentário, e a comparação era contra uma cópia manual dos campos dentro do script. O teto do
registro de exceção também não era aplicado. Os dois defeitos foram apontados pelo Sourcery no pull
request 16, conferidos contra o código, e corrigidos num commit de acompanhamento. A sonda da sessão
principal com campo injetado não tinha como pegar a cópia manual, porque ela também acusava campo
desconhecido; o QA também não pegou. Um quarto comentário da mesma revisão, sobre checkout raso no
CI, não procedia.

Depois da correção, o gate foi sondado num espelho temporário fora do repositório, lendo o código
de saída do próprio comando:

| Sonda | Saída |
| --- | --- |
| Espelho intacto | `0` |
| Contrato sem `ValorContabilAtual` | `1`, acusa `valorContabilAtual` pelo nome |
| Record ausente do documento | `1` |
| Duas exceções com teto `1` | `1` |
| Exceção sem divergência correspondente | `1` |
| Registro sem `teto`, ou com `teto` diferente do tamanho da lista | `1` |

**Registro de exceção: teto `1`.** O gate encontrou seis campos fantasma além dos 13. `D15`
conferiu um a um e concluiu que cinco não são exceção: `BoletoResumoResponse.empresaId` e
`.filialId` (mais as duas heranças) **saem do tipo**, porque o backend não os entrega e nenhuma
linha da UI os lê de um registro — o filtro da tela lê o próprio estado do filtro; e
`valorDepreciado` vira `depreciacaoAcumulada`, o campo real. Sobra uma, com alvo real.

### O que fica para a `b54.c2`, nomeado e com dono

1. **Remodelagem do estado de Bens** (`D15`). `BemPatrimonialResponse.status` é a mesma classe dos
   outros, e derruba **quatro** guardas de ação em `BensPage.tsx` — Transferir, Bloquear,
   Desbloquear e Baixar, nenhuma aparece hoje. Mas não é renomeação: o enum do frontend
   (`Ativo`, `Bloqueado`, `Baixado`) modela bloqueio como **estado**, e o backend não —
   `StatusBemPatrimonial` tem dois valores e bloqueio é `bool Bloqueado` com `string? MotivoBloqueio`.
   Trocar só o nome faria bem baixado aparecer como bloqueado.
2. **Prova durável do gate** (`D16`). `tests/unit/gateContractFields.test.ts` trava a volta dos 13
   campos, o que é verdadeiro e útil, mas **não executa o gate**. Enquanto a `b54.c2` não entra, o
   gate protege o repositório e nada protege o gate contra ser cegado por dentro — que foi o que
   aconteceu duas vezes na `b53`.

### Ritual de versão

`package.json`, `config/app.ts`, `.env.example`, `.env.test`, `.env.backend-controlled.example`,
`.github/workflows/frontend-ci.yml`, `README.md`, `CHANGELOG.md`,
`scripts/backend-permissions.allowlist.json`, `scripts/guard-permission-map.allowlist.json`,
`tests/evidence/integrated-e2e.assisted-evidence.example.json` carimbados em `1.11.0a8b54.c1`.
`scripts/backend-permissions.snapshot.json` regenerado por comando, e
`scripts/backend-contract-map.allowlist.json` carimbado por
`npm run stamp:backend-contract-map-version`, o carimbador que `D7` criou na `b54`.

# v1.11.0a8b54

## Drenagem das 25 cópias locais de `formatMoney` — fecha `D1` e o bloco da onda F1

Item F1.4 do plano `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`. Fecha a dívida que `D1` abriu na
`b51` e que `D2` remanejou para esta versão. As 25 cópias locais, todas com o mesmo corpo
(`value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`), saem de `features/`, e
os 69 pontos de chamada em 13 módulos passam a importar `formatMoney` de `lib/formatters/money.ts`.

**Nenhum ponto de chamada usa `formatMoneyOptional`, e isso foi medido, não presumido.** O nó
`inventario` classificou os 69 um a um contra a declaração C# do record de response do backend,
citando arquivo, linha, campo e record em cada linha:

| Classificação | Pontos | Função |
| --- | ---: | --- |
| Campo que o contrato declara obrigatório (`decimal`) | 47 | `formatMoney` |
| Campo que o contrato declara opcional (`decimal?`) | 0 | — |
| Valor calculado na própria tela | 11 | `formatMoney`, por `D6` |
| Valor de formulário antes do submit | 7 | `formatMoney`, por `D6` |
| Campo sem par no record do backend | 4 | `formatMoney`, por `D5` |

`D6` decidiu os 18 pontos das duas linhas do meio: `isAbsent`, em `lib/formatters/money.ts`, trata
`NaN` como ausência, e total que vira `NaN` porque um operando chegou indefinido é a mesma classe
de defeito monetário silencioso que `D1` existe para fechar. `formatMoneyOptional` renderia `—` e
engoliria o caso.

**Armadilha de medição registrada, porque quase inverteu a fatia inteira**: o
`CONTRATO-API-v1.23.md` traz dois blocos por operação, e só o de response (```csharp```) discrimina
optionality. O bloco de request marca 1458 campos com `?` contra 9 sem — classificar por ele
tornaria todos os 69 pontos opcionais e esvaziaria o mecanismo de `D1`. No bloco de response a
discriminação é real: 533 campos `decimal` contra 48 `decimal?`.

**Comportamento observável muda, e para melhor.** A cópia local chamava `toLocaleString` sobre o
campo ausente, o que lançava `TypeError` e derrubava a tela inteira. A função nova denuncia na
célula em desenvolvimento e rende `—` em produção.

### Três telas leem campo monetário que o backend não entrega (achado, não corrigido aqui)

Decisão `D5`. São quatro pontos de chamada, em três telas alcançáveis pelo menu, todos confirmados
contra o record C# real do backend e não só contra o documento de contrato:

- **Boletos** — `features/bancos/components/BoletosPage.tsx` e `BancosOperacoesDialogs.tsx` leem
  `valor`. `BancosContracts.cs` tem `ValorTitulo` (obrigatório) e `ValorPago` (opcional). Não tem
  `Valor`.
- **Lançamentos contábeis** — `features/contabil/components/LancamentosPage.tsx` lê `valorTotal`.
  `LancamentoContabilContracts.cs` tem `TotalDebito` e `TotalCredito`. Não tem total.
- **Depreciação** — `features/patrimonio/components/DepreciacaoPage.tsx` lê `valorTotal` de um tipo
  (`DepreciacaoResultadoResponse`) cujos quatro campos não batem em nome com nenhum campo de
  `ProcessarDepreciacaoPeriodoResponse`, que é o record que o endpoint devolve.

É a classe do defeito `P1` da onda, encontrada por esta fatia e **não corrigida por ela**. Os
quatro pontos ficam com `formatMoney` e um comentário no ponto de chamada apontando o alvo. A
correção de campo é a fatia corretiva **`b54.c1`**, que precisa decidir o que cada um deveria ler.

**Custo aceito, declarado por `D5`:** até a `b54.c1` entrar, o sintoma fica **mais quieto em
produção**. Hoje essas telas quebram com `TypeError`; a partir desta versão exibem `—`. A troca é
deliberada e a `b54.c1` entra em seguida.

### Achados de esteira corrigidos no caminho

1. **O ritual de versão estava impossível num arquivo** (`D7`).
   `.claude/graph/policies.yaml` classificava `scripts/backend-contract-map.allowlist.json` como
   artefato gerado e apontava `npm run report:backend-contract-map` como origem. Esse comando é
   `validate-backend-contract-map.mjs --report` e **nunca escreveu em disco** — o arquivo não tem
   nenhum `writeFileSync`. O hook `PreToolUse` que nega escrita à mão nesse caminho entrou em
   `867b7fd`, depois da `b53`: de `b49` a `b53` o arquivo foi carimbado à mão, e desde então
   nenhum agente conseguia carimbá-lo. Nasce `scripts/stamp-contract-map-version.mjs`
   (`npm run stamp:backend-contract-map-version`), que reescreve **apenas** o campo `version`. O
   hook não muda: a lista de rotas, que é medição de verdade, continua inalcançável por
   `Edit`/`Write`. O diff do arquivo nesta versão é de uma linha, e é a prova de que o carimbador
   é estreito.

2. **A `b53` entrou com `npm run typecheck` vermelho.** Quatro erros `TS2802` em
   `tests/unit/guardPermissionMapProofHistoric.test.ts`, arquivo intocado desde então, o que prova
   que já estavam lá quando aquele release fechou. A causa é `tsconfig` com `target: es5`, que o
   `T8` do plano da onda manda não tocar; a correção é local (`Array.from` no lugar de spread e de
   `for…of` sobre `Set`) e não muda a forma nem a força de nenhuma asserção.

### Testes

`tests/unit/moneyFormatter.test.ts` — o teto monotônico de cópias locais deixa de ser `<= 25` e
passa a exigir lista vazia. A asserção nova **nomeia cada arquivo infrator** na mensagem de falha,
em vez de devolver só um total. Foi verificada contra um arquivo descartável com a cópia dentro: o
teste reprovou citando o caminho, e voltou ao verde depois da remoção. Asserção de catraca que só
sabe ficar verde não é catraca.

### Ritual de versão

`package.json`, `config/app.ts`, `.env.example`, `.env.test`, `.env.backend-controlled.example`,
`.github/workflows/frontend-ci.yml`, `README.md`, `CHANGELOG.md`,
`scripts/backend-permissions.allowlist.json`, `scripts/guard-permission-map.allowlist.json`,
`tests/evidence/integrated-e2e.assisted-evidence.example.json` carimbados em `1.11.0a8b54`.
`scripts/backend-permissions.snapshot.json` regenerado por
`npm run generate:backend-permissions-snapshot`; `scripts/backend-contract-map.allowlist.json`
carimbado pelo comando novo de `D7`.

**Nenhuma mudança de permissão, de rota ou de menu.** Não há concessão a fazer antes do deploy.

# v1.11.0a8b53

## Gate de permissões fechado: auditar e bloquear divergências (F1.6.b)

Onda F1 (parte 5) do plano `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §7, item F1.6. Decisão `D2` e `D3` em `docs/arquitetura/DECISOES.md`: constrói o gate que cruza cada chamada HTTP do frontend com a permissão que o contrato declara exigir. A análise abrange 481 chamadas HTTP resolvidas sobre a AST (abstract syntax tree) do repositório, comparadas às 579 operações do contrato v1.23. Zero divergência dentro do escopo — as sete divergências legítimas de `b52` foram corrigidas, e o guard de entrada de Tabelas de Preço segue as novas regras desde então.

**Exceções registradas**: 9 órfãs (módulos sem página de rota ativa) mantidas em lista nominada com teto monotônico. Nenhuma foi corrigida porque o escopo de F1.6 cobre apenas divergências de guard dentro de telas operacionais — a remoção de código morto é responsabilidade de F5.6. As exceções são:

- **Bancos**: 7 chamadas (`POST /api/bancos`, `/api/bancos/contas-bancarias`, `/api/bancos/convenios`, `/api/bancos/carteiras`, `/api/bancos/boletos/gerar`, `/api/bancos/cnab/remessas`, `/api/bancos/cnab/retornos/importar`), nenhuma tem guard.
- **Auditoria**: 1 chamada (`GET /api/auditoria/eventos`), permissão exigida é `AUDITORIA_CONSULTAR`, não tem guard (a tela que a usa agora exige `AUDITORIA_OPERACIONAL_CONSULTAR`, após `b52`).
- **Relatórios**: 1 chamada (`GET /api/relatorios/gerenciais/dashboard`), permissão exigida é `RELATORIOS_DASHBOARD_CONSULTAR`, não tem guard.

**Limite do gate**: o validador é condição **necessária** e **não suficiente**. Ele não detecta permissão em **excesso** — isto é, não pega quando um guard aceita mais permissões do que o contrato exige. Esse risco foi coberto por varredura manual (não automatizada) durante `b52` e é responsabilidade de F5.4 e F5.5. Ver comentário no cabeçalho de `scripts/validate-guard-permission-map.mjs` e seção "Limitações" no `README.md`.

**Duas correções de menu e rota constatadas na verificação** (não no plano original, portanto entram nesta versão como achados):

1. `layout/AppMenu.tsx` — item pai "Auditoria": corrige a permissão de `anyPermissions: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` para que o menu apareça para quem só tem a permissão nova (adicionado em `b52`).
2. `lib/security/routePermissions.ts` — rota `/tabelas-preco`: muda para `anyOf: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR']` (não mais aceita `VENDAS_*`), refletindo a decisão `D3` de `b52`.

**Mocks e fixtures**: nenhuma alteração nova; `b52` já preparou os conjuntos (`mockPermissions` em `tests/mocks/auth/mockAuthClient.ts` e `ADMIN_PERMISSIONS` em `tests/e2e/fixtures/logosoft.ts`).

**Testes**: novo teste unitário `tests/unit/guardPermissionMapProofHistoric.test.ts` garante que o gate continua honesto — executa a análise sobre `b52` (1312bc2) e confere que as sete divergências foram de fato corrigidas, e a árvore de hoje tem zero divergência legítima (apenas as 9 órfãs registradas).

**Ritual de versão** (`package.json`, `.env.example`, `.env.test`, `.env.backend-controlled.example`, `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`, `scripts/backend-permissions.allowlist.json`, `tests/evidence/integrated-e2e.assisted-evidence.example.json`, `README.md`, `CHANGELOG.md`) atualizado para `1.11.0a8b53`.

# v1.11.0a8b52

## Guards de permissão corrigidos: permissão existente, porém errada (F1.6.a)

Onda F1 (parte 4) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5, item F1.6. Sequência
travada em `D2` de `docs/arquitetura/DECISOES.md`: corrige agora as quatro divergências que a
varredura do `arquiteto-frontend` nomeou (481 chamadas HTTP resolvidas sobre AST × 579 operações
do contrato v1.23, 15 flags brutas, 4 verdadeiras depois da triagem), antes de `b53` construir o
gate de classe que cruza cada chamada HTTP com a permissão que o contrato declara. Os seis
códigos de permissão corretos usados nesta versão já estavam no union e no catálogo desde `b50` —
zero endpoint novo, zero contrato novo, zero permissão nova no frontend; `validate:backend-permissions`
segue em teto `0/0`. Depois que esta versão já estava em desenvolvimento, o usuário decidiu, por
`D3` em `docs/arquitetura/DECISOES.md`, trazer para dentro do escopo o guard de **entrada** de
Tabelas de Preço — que a varredura original (risco `R2`) havia deixado de fora por ter perfil de
risco diferente das outras quatro correções. Essa mudança entra como Passo 9, ao final desta
seção.

- `features/tabelas-preco/components/TabelasPrecoPage.tsx`: o guard único
  `hasAnyPermission(['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR'])`, que protegia editar,
  ativar e inativar tabela, e as ações de item, é substituído por permissões granulares. Botão
  "Nova tabela": `PermissionGuard permission="TABELAS_PRECO_GERENCIAR"` (sai `VENDAS_GERENCIAR`
  do guard). Ações de linha da tabela (editar/ativar/inativar) e do item (editar/inativar): usam
  o campo `permission` que `RowAction` (`components/data/DataTableActions.tsx`) já expunha e não
  era usado aqui — `TABELAS_PRECO_GERENCIAR`, `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`,
  `TABELAS_PRECO_ITENS_GERENCIAR`. Comportamento visual idêntico ao de hoje —
  `DataTableActions` já filtrava por permissão e escondia a ação, o diff só troca qual
  permissão é checada. O guard de **entrada** da tela e a regra de rota correspondente também
  mudam nesta versão — ver o Passo 9, ao final desta seção.
- `features/seguranca/components/SegurancaActionDialogs.tsx` (`GerenciarUsuarioDialog`): o guard
  único `SEGURANCA_USUARIOS_GERENCIAR`, que cobria os cinco botões de ação do diálogo, vira um
  `PermissionGuard` por botão: "Resetar senha" → `SEGURANCA_USUARIOS_RESETAR_SENHA`; "Vincular
  grupo" e "Remover grupo" → `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`; "Inativar" →
  `SEGURANCA_USUARIOS_INATIVAR`. "Reativar" continua `SEGURANCA_USUARIOS_GERENCIAR` — já estava
  certo e não muda. Cada botão desabilitado por falta de permissão passa a expor `title` no
  formato `"Permissão necessária: <CÓDIGO>."` (idioma já usado em
  `FiscalOperationalPanels.tsx`). "Remover grupo" mantém a composição
  `disabled || Boolean(motivoSemRemocao)`, com o `title` do `motivoSemRemocao`
  (indisponibilidade de negócio, resolvida pelo backend) tendo precedência sobre o de permissão.
  `UsuariosPage.tsx` (wiring de `acoes`) e `routePermissions.ts` (regra de
  `/seguranca/usuarios`) não mudam.
- `features/auditoria/components/AuditoriaEventosPage.tsx`: o guard de conteúdo da tela passa de
  `AUDITORIA_CONSULTAR` para `AUDITORIA_OPERACIONAL_CONSULTAR` — a permissão que
  `GET /api/auditoria/eventos` e `GET /api/auditoria/operacional` exigem de fato. O texto do
  `UnauthorizedState` passa a nomear a permissão certa. `lib/security/routePermissions.ts`
  (regra `/auditoria`) fica **permissiva de propósito**:
  `anyOf: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` — o prefixo `/auditoria`
  pode voltar a hospedar uma tela que use `AUDITORIA_CONSULTAR` de verdade quando
  `useAuditoriaEventos` deixar de ser órfão (ver `R6`); quem decide se a tela entrega conteúdo ou
  `UnauthorizedState` é o componente, não o portão de rota. `layout/AppMenu.tsx`: os dois itens
  do submenu "Auditoria" (`/auditoria/operacional` e `/auditoria/eventos` — ambos renderizam o
  mesmo `AuditoriaEventosPage`) passam a `permission: 'AUDITORIA_OPERACIONAL_CONSULTAR'`. **Ajuste
  não nomeado no plano, encontrado na verificação**: o item pai "Auditoria" também precisou virar
  `anyPermissions: ['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']` (era
  `permission: 'AUDITORIA_CONSULTAR'`) — sem isso, o `filterMenu` de `AppMenu.tsx` esconde o
  grupo inteiro para quem tem só a permissão nova, porque pai e filhos são filtrados de forma
  independente; a sessão que a correção deveria beneficiar (só `AUDITORIA_OPERACIONAL_CONSULTAR`)
  ficaria sem ver o item de menu.
- `features/fiscal/components/FiscalOperationalPanels.tsx` (`FiscalIntegracoesTable`): o botão
  "Reprocessar" troca de `FISCAL_EMITIR` para `FISCAL_REPROCESSAR` — a permissão distinta que a
  v1.23 introduziu para essa ação (ver risco `R1`). O gate de negócio `row.podeReprocessar`
  (workflow devolvido pelo backend) permanece ortogonal à permissão e não muda.
  `routePermissions.ts` e o menu de Fiscal continuam sem separar emitir de reprocessar no portão
  de rota — essa separação é `F2.5`, fora desta versão.
- Mocks de permissão, obrigatórios para que as quatro correções acima não derrubassem o E2E
  (nenhum dos nove códigos abaixo existia nos conjuntos mockados antes desta versão):
  `tests/mocks/auth/mockAuthClient.ts` (`mockPermissions`) e `tests/e2e/fixtures/logosoft.ts`
  (`ADMIN_PERMISSIONS`) ganham `TABELAS_PRECO_CONSULTAR`, `TABELAS_PRECO_GERENCIAR`,
  `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`, `TABELAS_PRECO_ITENS_GERENCIAR`,
  `AUDITORIA_OPERACIONAL_CONSULTAR`, `SEGURANCA_USUARIOS_RESETAR_SENHA`,
  `SEGURANCA_USUARIOS_INATIVAR`, `FISCAL_REPROCESSAR`. `CONSULTA_PERMISSIONS`
  (`tests/e2e/fixtures/logosoft.ts`) foi avaliado e mantido como está: nenhum caso hoje o exercita
  contra as telas tocadas nesta versão.
- **Passo 9 — guard de entrada de Tabelas de Preço, acrescentado ao escopo por `D3` depois que
  esta versão já estava em desenvolvimento** (ver "Item à parte", na seção operacional abaixo, e
  `docs/arquitetura/DECISOES.md`): `features/tabelas-preco/components/TabelasPrecoPage.tsx` — o
  guard de entrada da tela deixa de aceitar `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e passa a exigir
  só `TABELAS_PRECO_CONSULTAR`, a permissão que `GET /api/tabelas-preco` de fato exige; o
  `UnauthorizedState` passa a nomeá-la. `lib/security/routePermissions.ts` — a regra de
  `/tabelas-preco` perde `VENDAS_*` e vira `anyOf: ['TABELAS_PRECO_CONSULTAR',
  'TABELAS_PRECO_GERENCIAR']`. `layout/AppMenu.tsx` — o item de menu "Tabelas de preço" (dentro do
  grupo "Vendas") perde `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e fica com
  `anyPermissions: ['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR']`; o item **pai** "Vendas"
  não muda — já incluía `TABELAS_PRECO_*` desde antes, ao lado de `VENDAS_*`, porque também
  precisa aparecer para quem só usa "Pedidos de venda". Isso fecha o risco `R2` do plano `b52` e
  **revoga o `AC-1` do Passo 1** desse mesmo plano: o `grep -c "VENDAS_GERENCIAR"` em
  `TabelasPrecoPage.tsx` agora retorna `0`, não `1` — confirmado também para `VENDAS_` em geral
  (`grep -c "VENDAS_"` retorna `0`).
- `tests/unit/moneyFormatter.test.ts`: comentário do teto monotônico atualizado de "drenadas em
  b52" para "drenadas em b54" — `D2` remanejou a drenagem das cópias locais de `formatMoney`
  (`D1`/`b51` previa `b52`). É comentário; a asserção do teto (`<= 25`) não muda.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
  `scripts/backend-permissions.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para `1.11.0a8b52`.

### Antes do deploy: o que acrescentar aos grupos de acesso

Nenhuma operação que hoje conclui deixa de concluir. Os botões que somem ou ficam desabilitados
já eram recusados pelo backend com `403` — a tela apenas parou de prometer o que não podia
entregar.

| Ação na tela | Permissão agora exigida |
| --- | --- |
| Editar / Ativar / Inativar tabela de preço, "Nova tabela" | `TABELAS_PRECO_GERENCIAR`, `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR` |
| Editar / Inativar item de tabela de preço, "Adicionar item" | `TABELAS_PRECO_ITENS_GERENCIAR` |
| Resetar senha de usuário | `SEGURANCA_USUARIOS_RESETAR_SENHA` |
| Vincular / Remover grupo de acesso do usuário | `SEGURANCA_GRUPOS_ACESSO_GERENCIAR` |
| Inativar usuário | `SEGURANCA_USUARIOS_INATIVAR` |
| Ver "Auditoria operacional" / "Eventos de auditoria" | `AUDITORIA_OPERACIONAL_CONSULTAR` |
| Reprocessar integração fiscal | `FISCAL_REPROCESSAR` |

Preparação, em `/seguranca/grupos-acesso` → editar grupo → campo **Permissões** (o `MultiSelect`
de `GrupoAcessoFormDialog.tsx`, alimentado pelo catálogo completo desde `b50` — a tela já existe
hoje):

- Aos grupos que já têm `SEGURANCA_USUARIOS_GERENCIAR`: acrescentar
  `SEGURANCA_USUARIOS_RESETAR_SENHA`, `SEGURANCA_USUARIOS_INATIVAR` e
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`.
- Aos grupos que têm `TABELAS_PRECO_GERENCIAR` ou `VENDAS_GERENCIAR` e mexem em preço:
  acrescentar `TABELAS_PRECO_ATIVAR`, `TABELAS_PRECO_INATIVAR`, `TABELAS_PRECO_ITENS_GERENCIAR`.
- Aos grupos que têm `AUDITORIA_CONSULTAR`: acrescentar `AUDITORIA_OPERACIONAL_CONSULTAR`.
- Aos grupos que têm `FISCAL_EMITIR` e devem reprocessar integrações: acrescentar
  `FISCAL_REPROCESSAR`.

**O único caminho de auto-bloqueio**: se a preparação acima não for feita antes do deploy, o
administrador que tem apenas `SEGURANCA_USUARIOS_GERENCIAR` abre "Gerenciar usuário" e encontra
quatro dos cinco botões desabilitados (Resetar senha, Vincular grupo, Remover grupo, Inativar —
só "Reativar" continua liberado, pois usa a mesma permissão de sempre). **Se esse administrador
for o único com permissão para editar grupos de acesso, ele precisa ganhar
`SEGURANCA_GRUPOS_ACESSO_GERENCIAR` antes do deploy, sob pena de precisar de intervenção direta
no backend para se desbloquear.** Quem administra como `isMaster` ou com a permissão `'*'`
(`lib/permissions/permissions.ts`) passa por qualquer guard e não perde nada com esta versão.

### Item à parte: Tabelas de Preço deixa de aceitar permissão de Vendas na entrada

Diferente dos sete itens da tabela acima, este é o **único ponto desta versão em que alguém perde
acesso de verdade, e não apenas a ilusão de um botão que já era recusado pelo backend**. Decisão do
usuário, `D3` em `docs/arquitetura/DECISOES.md`, acrescentada ao escopo depois que a versão já
estava em desenvolvimento (Passo 9).

Hoje, quem tem só `VENDAS_CONSULTAR` ou `VENDAS_GERENCIAR` **entra** na tela de Tabelas de Preço —
ainda que veja a lista sempre vazia, porque `GET /api/tabelas-preco` já exige
`TABELAS_PRECO_CONSULTAR` e o backend recusa a consulta. Depois desta versão, esse mesmo usuário
deixa de ver o item de menu "Tabelas de preço" e, se acessar `/tabelas-preco` direto pela URL,
recebe `UnauthorizedState` nomeando `TABELAS_PRECO_CONSULTAR`.

**Antes do deploy**: aos grupos que têm `VENDAS_CONSULTAR` ou `VENDAS_GERENCIAR` e precisam de
Tabelas de Preço, acrescentar `TABELAS_PRECO_CONSULTAR` em `/seguranca/grupos-acesso` → editar
grupo → **Permissões** — sob pena de o módulo sumir do menu e da rota para o cargo inteiro.

A frase "nenhuma operação que hoje conclui deixa de concluir" continua verdadeira aqui também — a
lista já vinha vazia para esse público — mas o **acesso à tela** some, e isso o operador percebe
imediatamente, diferente dos botões desabilitados dos outros sete itens.

- **Teste novo, fora desta entrega** (é do `engenheiro-testes`): reescrita de
  `tests/unit/tabelasPrecoB40Structure.test.ts` (a asserção que hoje fixa
  `PermissionGuard anyOf={['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']}` e
  `canManageTabelaPreco` fica vermelha por esta versão, de propósito),
  `tests/unit/routePermissions.test.ts` (o `toEqual(['AUDITORIA_CONSULTAR'])` da regra de
  `/auditoria` também fica vermelho, de propósito), `tests/unit/auditoriaB45Structure.test.ts`
  (caso novo cobrindo `AUDITORIA_OPERACIONAL_CONSULTAR` em rota e menu),
  `tests/unit/segurancaB39Structure.test.ts` (caso novo cobrindo os cinco guards/quatro códigos
  distintos) e quatro casos novos de E2E em `tests/e2e/permissions.spec.ts` (AC-13 a AC-16 do
  plano `b52`). O Passo 9 acrescenta: no mesmo `tabelasPrecoB40Structure.test.ts`, o caso do guard
  de entrada passa a exigir `TABELAS_PRECO_CONSULTAR` e a proibir `VENDAS_*`; em
  `routePermissions.test.ts`, a regra de `/tabelas-preco` muda; em `permissions.spec.ts`, dois
  casos novos (AC-18, AC-19 do plano `b52`).
- **Fora do escopo desta versão** (nominalmente, ver plano `b52`): `types/erp.ts` e
  `features/seguranca/permissoesCatalogo.ts` (fecharam em `b50`, teto `0/0`); os três JSON de
  `scripts/` (só o carimbo de versão); `lib/formatters/money.ts` (entregue em `b51`, `D1`);
  `features/*/api|hooks|schemas|types` (nenhuma rota, payload, Zod, `queryKey`, `enabled` ou
  mutação muda); `components/data/DataTableActions.tsx` (`RowAction` não ganha campo `title`
  nesta versão — proposta para `F5`); `components/security/PermissionGuard.tsx` e
  `lib/permissions/permissions.ts` (contrato do guard e semântica de `isMaster`/`'*'`
  inalterados); a regra de `/seguranca/usuarios` e o wiring `acoes` de `UsuariosPage.tsx`; a separação
  emitir × reprocessar no portão de rota e no menu de Fiscal (`F2.5`); regra de negócio
  (`isTabelaAtiva`, `isContaEncerrada`, `motivoRemocaoIndisponivel`, `podeReprocessar` — todas do
  backend); bancos, relatórios, dashboard, shared (órfãos de `F5.6`); o gate de classe que cruza
  chamada HTTP × permissão do contrato (`F1.6.b`/`b53`).
- **Riscos e pendências**: `R1` — `FISCAL_REPROCESSAR` é permissão nova da v1.23
  (`novasEmV123` no snapshot); é plausível que nenhum grupo em produção a possua hoje e o botão
  "Reprocessar" desapareça para todo usuário não-master até a preparação acima ser feita — não é
  regressão (o backend já recusava a ação), mas fica pergunta em aberto para o backend: a
  migração da v1.23 concedeu `FISCAL_REPROCESSAR` a algum grupo existente? `R2` — **resolvido
  nesta versão pelo Passo 9, por decisão do usuário (`D3`)**: o guard de entrada de Tabelas de
  Preço e a regra de rota deixaram de aceitar `VENDAS_CONSULTAR`/`VENDAS_GERENCIAR` e passaram a
  exigir `TABELAS_PRECO_CONSULTAR`. Ver "Item à parte", na seção operacional acima, para o efeito
  em quem hoje só tem permissão de Vendas. `R6` — achados órfãos da
  varredura, só registrados aqui, tratamento em `F5.6`: `useAuditoriaEventos` e
  `useRelatorioDashboardConsolidado` sem consumidor; `BancosDialogs.tsx` não é importado por
  ninguém; `CnabPage` e `CadastrosBancariosPage` são placeholders de 15 linhas — consequência
  colateral: `AUDITORIA_CONSULTAR` hoje não protege nenhuma chamada real no produto. `A1` —
  ambiguidade de contrato sem efeito nesta versão: `POST /api/tabelas-preco` e
  `GET /api/tabelas-preco/{id}` declaram `Response DTO UsuarioResponse`, e `PUT` declara
  `CargoAcessoResponse` — pergunta ao backend, reforça a proposta de `ProducesResponseType`.

# v1.11.0a8b51

## `formatMoney` deixa de mascarar ausência com R$ 0,00 (F1.4)

Onda F1 (parte 3) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5. Decisão de desenho travada
em `D1` de `docs/arquitetura/DECISOES.md`: duas funções em vez de uma assinatura com opções.

- `lib/formatters/money.ts`: contrato novo. `formatMoney(value: number | null | undefined): string`
  — para campo que o contrato do backend declara obrigatório. Remove o `?? 0` que mascarava
  ausência com `R$ 0,00` plausível (o defeito P1 da onda F1.1). Ausência (`null`/`undefined`/`NaN`)
  denuncia na própria célula em desenvolvimento com o texto `"valor ausente (contrato)"` e degrada
  para exatamente `"—"` em produção. O sinal de ambiente é `process.env.NODE_ENV`, lido dentro da
  função (não `appConfig.env`/`NEXT_PUBLIC_APP_ENV`, que nunca vale `production` neste
  repositório — embarcaria o modo ruidoso em produção). Sem `console` (proibido por
  `validate:source`) e sem `throw` (derrubaria a `DataTable` inteira em vez da célula).
  `formatMoneyOptional(value, fallback = '—'): string` — para campo que o contrato declara
  opcional; ausência rende o `fallback` em silêncio, sem denúncia em nenhum ambiente. Invariante
  que a mudança não quebra: `formatMoney(0)` continua `"R$ 0,00"` — zero legítimo é diferente de
  campo ausente.
- `features/financeiro/components/financeiroUiUtils.ts`, `features/compras/components/comprasUiUtils.ts`,
  `features/vendas/components/vendasUiUtils.ts`: a cópia local de `formatMoney` (que fazia
  `?? 0`/`Number(value ?? 0)`) é removida; os três arquivos passam a reexportar `formatMoney` e
  `formatMoneyOptional` de `@/lib/formatters/money`. Os importadores existentes (financeiro: 3;
  compras: 4; vendas: 3) continuam intactos — diff pequeno, mesmo nome, contrato novo.
- `features/financeiro/hooks/useFinanceiroOriginOptions.ts`: apaga a cópia local de `formatMoney`
  (fazia `value ?? 0` sobre `pedido.valorTotal`, um campo que o autor supôs obrigatório); importa
  `formatMoney` de `@/lib/formatters/money`.
- `features/tabelas-preco/components/TabelasPrecoPage.tsx`: apaga a cópia local; `precoVenda` e
  `precoMinimo` passam a usar `formatMoney` (importado da lib) nos dois pontos de exibição (itens
  da tabela e preço vigente). Ambiguidade registrada: não há confirmação do backend de que
  `precoMinimo` seja opcional — decisão de falhar para o lado ruidoso (`formatMoney`, não
  `formatMoneyOptional`), porque se o campo for de fato opcional a denúncia em dev provoca
  pergunta; se for obrigatório e eu tivesse suposto opcional, o defeito voltaria a ser silencioso.
- `features/patrimonio/components/BensPage.tsx`, `features/contratos/components/ContratosPage.tsx`,
  `features/producao/components/OrdensProducaoPage.tsx`, `features/rh/components/BeneficiosPage.tsx`:
  as quatro cópias locais que já renderizavam `value == null ? '—' : ...` (evidência empírica de
  ausência legítima) são removidas; os call sites (`valorContabil`/`valorAquisicao`,
  `valorTotal`/`franquia`/`valorExcedente`/`valorFixo`, `custoConsolidado`, `valor` de benefício e
  concessão) passam a chamar `formatMoneyOptional` importado de `@/lib/formatters/money`
  explicitamente — a intenção declarada fica visível no diff e auditável por
  `grep formatMoneyOptional`, em vez de reimplementada célula a célula.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`, `scripts/backend-permissions.snapshot.json`,
  `scripts/backend-permissions.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para `1.11.0a8b51`.
- **Teste novo, fora desta entrega** (é do `engenheiro-testes`):
  `tests/unit/moneyFormatter.test.ts`, que fixa o contrato acima (AC-1 a AC-5 do plano) e o teto
  monotônico de cópias locais `(value: number) =>` restantes (24, medidas por
  `grep -rn "const formatMoney" features lib` — ver "Fora do escopo").
- **Fora do escopo desta versão** (nominalmente, ver plano `b51`): as 24 cópias locais com
  assinatura `(value: number)` em `bancos`, `clientes`, `compras-avancado`, `contabil`, `crm`,
  `faturamento`, `financeiro-avancado`, `frota`, `patrimonio/DepreciacaoPage`, `pdv`, `produtos`,
  `rh/ColaboradoresPage`, `rh/EventosPage`, `servicos` — elas não mascaram: com `undefined` lançam
  `TypeError` e derrubam o render da linha, classe de defeito diferente (barulhenta, não
  silenciosa), congelada por teto de teste e drenada em `b52`. `lib/formatters/display.ts`
  (`formatDisplayValue`, `Number(value ?? 0)` para `type === 'money'`) — mesmo defeito, mas só a
  camada órfã de F5.6 o consome; some junto com ela. Guards de permissão errados (F1.6) — versão
  seguinte.

# v1.11.0a8b50

## União e catálogo de permissões fechados (F1.2, F1.3)

Onda F1 (parte 2) de `docs/backend-v1.23/PLANO-FRONTEND-v1.23.md` §5. Fecha o registro auditável
aberto em b48/b49 (`scripts/backend-permissions.allowlist.json`): 3 permissões fantasma e 36
coberturas pendentes.

- `types/erp.ts` (union `PermissionCode`): removidas `ATIVIDADES_GERENCIAR`,
  `RELATORIOS_CONSULTAR` (nunca existiram no backend) e `PORTARIA_PRE_AUTORIZAR` (grafia
  incorreta). Acrescentadas as 36 permissões que `npm run report:backend-permissions` listava em
  `coberturaPendente`, agrupadas junto do módulo vizinho já existente no union: 5 granulares de
  Atividades (`CRIAR`/`ATUALIZAR`/`CANCELAR`/`COMENTAR`/`ATRIBUIR`), `AUDITORIA_OPERACIONAL_CONSULTAR`,
  `INFRAESTRUTURA_CONSULTAR`/`BACKUP_CONSULTAR`, `SEGURANCA_USUARIOS_INATIVAR`/`RESETAR_SENHA`,
  `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR`, `SEGURANCA_PARAMETROS_CONSULTAR`/`GERENCIAR`,
  `PESSOAS_BLOQUEAR`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`, `CLASSIFICACOES_PESSOA_GERENCIAR`,
  `TRANSPORTADORAS_CONSULTAR`/`GERENCIAR`, `TABELAS_PRECO_ATIVAR`/`INATIVAR`/`ITENS_GERENCIAR`,
  `POLITICA_COMERCIAL_GERENCIAR`, `VENDAS_PRECO_MINIMO_SOBRESCREVER`,
  `FINANCEIRO_CAIXA_GERENCIAR`/`BANCO_GERENCIAR`, `FISCAL_REPROCESSAR`,
  `FISCAL_CADASTROS_GERENCIAR`, `FISCAL_SERIES_CONSULTAR`/`GERENCIAR`, `FISCAL_MODELOS_CONSULTAR`,
  `INTEGRACOES_CONSULTAR`/`GERENCIAR`/`REPROCESSAR`, `FATURAMENTO_RETOMAR_REVERSAO` e
  `PORTARIA_PREAUTORIZAR` (substitui a grafia incorreta na mesma posição). Union: 144 → 177.
- `features/seguranca/permissoesCatalogo.ts`: catálogo `Record<PermissionCode, …>` acompanha o
  union — mesmas 3 remoções, mesmas 36 adições, com `{ grupo, label }`. Corrigido também o rótulo
  mentiroso de `SEGURANCA_PERMISSOES_GERENCIAR` (`"Grupos de acesso · Gerenciar"` →
  `"Cargos de acesso · Gerenciar"`): essa permissão guarda Cargos de acesso, não Grupos de acesso
  — origem documental do P2 do plano. Catálogo: 144 → 177.
- `lib/security/routePermissions.ts`: `/seguranca/grupos-acesso` passa a exigir
  `anyOf: ['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR']` em vez de
  `SEGURANCA_PERMISSOES_GERENCIAR`; `/portaria` corrige a grafia para `PORTARIA_PREAUTORIZAR`;
  `/atividades` troca `ATIVIDADES_GERENCIAR` pelas cinco permissões granulares.
- `layout/AppMenu.tsx`: item de menu "Grupos de acesso" passa a exigir
  `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR` (mantido `SEGURANCA_PERMISSOES_GERENCIAR` no
  `anyPermissions` do grupo pai "Segurança", que também cobre outros itens do menu); "Portaria" e
  "Atividades" acompanham a grafia/granularidade corrigidas em `routePermissions.ts`.
- `features/seguranca/components/GruposAcessoPage.tsx`: guard de página passa a
  `hasAnyPermission(['SEGURANCA_GRUPOS_ACESSO_CONSULTAR', 'SEGURANCA_GRUPOS_ACESSO_GERENCIAR'])`
  com texto de `UnauthorizedState` atualizado; "Novo grupo", "Editar" e "Inativar" passam a exigir
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`. **Mudança de acesso visível**: quem tem
  `SEGURANCA_GRUPOS_ACESSO_*` mas não `SEGURANCA_PERMISSOES_GERENCIAR` passa a ver a tela; quem só
  tinha `SEGURANCA_PERMISSOES_GERENCIAR` perde a tela — é a correção do P2, não uma regressão.
- `features/portaria/components/PortariaPage.tsx` e `PreAutorizacoesTab.tsx`: guard de página,
  item "Nova pré-autorização" e ação "Cancelar" trocam `PORTARIA_PRE_AUTORIZAR` por
  `PORTARIA_PREAUTORIZAR` (grafia real da constante C# `PortariaPreAutorizar`, catálogo §12 e
  `POST /api/portaria/pre-autorizacoes`).
- `features/atividades/components/AtividadesPage.tsx`: guard de página exige
  `['ATIVIDADES_CONSULTAR', 'ATIVIDADES_CRIAR', 'ATIVIDADES_ATUALIZAR', 'ATIVIDADES_CANCELAR',
  'ATIVIDADES_COMENTAR', 'ATIVIDADES_ATRIBUIR']`; "Nova atividade" exige `ATIVIDADES_CRIAR`;
  ações da tabela mapeadas por operação real do backend: "Editar"/"Status" →
  `ATIVIDADES_ATUALIZAR` (`PUT /api/atividades/{id}` e `POST /api/atividades/{id}/status`
  atualizam o mesmo agregado), "Atribuir" → `ATIVIDADES_ATRIBUIR`, "Comentar" →
  `ATIVIDADES_COMENTAR`, "Cancelar" → `ATIVIDADES_CANCELAR`. "Detalhe" continua exigindo só
  `ATIVIDADES_CONSULTAR` (é leitura).
- `scripts/backend-permissions.allowlist.json`: `fantasmasConhecidos` e `coberturaPendente`
  esvaziados; `teto` passa de `{ fantasmas: 3, coberturaPendente: 36 }` para `{ fantasmas: 0,
  coberturaPendente: 0 }` — tolerância zero a partir de agora; `version` → `1.11.0a8b50`.
- `scripts/backend-permissions.snapshot.json`: regenerado via
  `npm run generate:backend-permissions-snapshot` com `version: 1.11.0a8b50` (conteúdo nomeado
  inalterado — só a versão do artefato muda).
- `tests/mocks/auth/mockAuthClient.ts` e `tests/e2e/fixtures/logosoft.ts`: `mockPermissions` /
  `ADMIN_PERMISSIONS` trocam `ATIVIDADES_GERENCIAR` pelas cinco granulares, removem
  `RELATORIOS_CONSULTAR` e acrescentam `SEGURANCA_GRUPOS_ACESSO_CONSULTAR`/`GERENCIAR`;
  `CONSULTA_PERMISSIONS` apenas perde `RELATORIOS_CONSULTAR`. Sem esse ajuste o typecheck não
  fecha (os mocks são tipados por `PermissionCode`) e os fixtures E2E concederiam uma string morta.
- `docs/CI_GATES_FRONTEND.md` §8: os números "3 e 36" e a frase "o gate de permissões nasce
  vermelho por desenho" (verdadeiros em b48/b49) passam a descrever o estado fechado: nasceu
  vermelho em b48 com 3 fantasmas + 36 coberturas pendentes; zerado nesta versão (F1.2/F1.3); o
  teto `0/0` é agora tolerância zero.
- Ritual de versão (`package.json`, `config/app.ts`, `.env.example`, `.env.test`,
  `.env.backend-controlled.example`, `.github/workflows/frontend-ci.yml`, `README.md`,
  `scripts/backend-contract-map.allowlist.json`,
  `tests/evidence/integrated-e2e.assisted-evidence.example.json`) atualizado para
  `1.11.0a8b50`.
- **Testes que ficam vermelhos por desenho ao fim desta versão** (reescrita é do
  `engenheiro-testes`, não desta entrega): `tests/unit/backendPermissions.test.ts` (contadores de
  fantasma/cobertura pendente e os `toContain` das 3 strings fantasma),
  `tests/unit/routePermissions.test.ts` (`ATIVIDADES_GERENCIAR`), `tests/unit/portariaStructure.test.ts`
  e `tests/unit/atividadesB43Structure.test.ts` (grafia/granularidade),
  `tests/unit/segurancaB39Structure.test.ts` (`SEGURANCA_PERMISSOES_GERENCIAR` →
  `SEGURANCA_GRUPOS_ACESSO_GERENCIAR`). Teste novo pendente:
  `tests/unit/permissoesUnionCatalogo.test.ts`.
- **Fora do escopo desta versão** (nominalmente, ver plano): `features/tabelas-preco/`,
  `features/seguranca/components/SegurancaActionDialogs.tsx`, `features/auditoria/` (guards com
  permissão existente porém errada — F1.6); `features/fiscal/` (`FISCAL_REPROCESSAR` sem guard —
  F2.5); `features/faturamento/` (`FATURAMENTO_RETOMAR_REVERSAO` sem consumidor — F2.1);
  `features/shared/config/erpFeatureCatalog.ts` (F5.6); `scripts/validate-backend-permissions.mjs`
  e `scripts/lib/backend-permissions.mjs` (o script não muda, só os dados da allowlist);
  `lib/formatters/money.ts` e o restante de F1.4 (versão b51).
- **Ambiguidade registrada, não resolvida nesta versão**: o contrato declara 178 permissões
  nomeadas; a união medida entre as duas fontes documentais dá 177 — uma permissão do backend
  segue sem nome em nenhuma fonte (`naoConciliado.quantidade: 1` no snapshot). Não foi inventada.

# v1.11.0a8b49

## Contrato monetário do Financeiro (F1.1)

- `features/financeiro/types/financeiro.types.ts`: renomeados os 5 tipos de response afetados
  pelo P1 (`docs/backend-v1.23/PLANO-FRONTEND-v1.23.md`, §2). `ParcelaReceberResponse` e
  `ParcelaPagarResponse` passam a declarar `valorOriginal`, `valorPago`, `valorJuros`,
  `valorMulta`, `valorDesconto`, `valorSaldo` (o contrato não expande esses records; os nomes
  vêm da prosa do plano). `RecebimentoResponse.parcelaId` → `parcelaReceberId`;
  `PagamentoResponse.parcelaId` → `parcelaPagarId` (inferência por simetria, sem confirmação
  literal no contrato). `ContaReceberResponse`/`ContaPagarResponse` trocam
  `valorTotal`/`saldo`/`status`+`statusConta` por `valorOriginal`/`valorJuros`/`valorMulta`/
  `valorDesconto`/`valorSaldo`/`status` (campo único) — com uma correção ao texto do plano:
  o contrato real (`CONTRATO-API-v1.23.md:3268-3450`) declara `ContaPagarResponse.ValorPago`
  mas `ContaReceberResponse.ValorRecebido`, não `ValorPago` nos dois; o tipo segue o contrato,
  não a prosa. **Não tocados**: `ParcelaFinanceiraRequest`, `ReceberContaRequest.parcelaId`,
  `PagarContaRequest.parcelaId` — o rename de `parcelaId` vale só para os records de response.
- `features/financeiro/components/financeiroUiUtils.ts`: `countOpenFinancialRecords` passa a
  ler `{ valorSaldo }` em vez de `{ saldo }`. `origemFinanceiraOptions` **não muda** — alimenta
  tanto o dropdown de criação quanto `origemFinanceiraLabel` da coluna "Origem"; removê-la ali
  quebraria a coluna para toda conta derivada de compra pelo backend.
- `features/financeiro/components/ContasFinanceirasPage.tsx`: cards de resumo e colunas
  "Total"/"Saldo" passam a ler `valorOriginal`/`valorSaldo`; `displayStatus` lê só `record.status`.
- `features/financeiro/hooks/useFinanceiroResources.ts`: novos `contaReceberQueryKey(id)` /
  `contaPagarQueryKey(id)` e `useContaReceberDetalhe(id, enabled)` /
  `useContaPagarDetalhe(id, enabled)` (`enabled: Boolean(id) && enabled`, padrão de
  `pedidoVendaQueryKey`/`usePedidoVenda`). As mutations de baixa, estorno e cancelamento
  passam a invalidar o detalhe (`contaReceberQueryKey`/`contaPagarQueryKey`) além da lista.
- `features/financeiro/components/FinanceiroActionDialogs.tsx`: `BaixaFinanceiraDialog` deixa
  de confiar no registro selecionado da lista e passa a consumir o hook de detalhe
  (`enabled: visible`). Estados cobertos: **loading** (dropdown de parcela e confirmar
  desabilitados, campo Valor sem placeholder monetário — `valor` nasce `null`, não `0`);
  **erro** ("Não foi possível carregar as parcelas desta conta.", confirmar bloqueado, sem
  cair para o registro da lista); **sem parcela** (mensagem existente, confirmar bloqueado);
  **sucesso** (invalida lista e detalhe). Novo campo derivado `valor > 0`: confirmar
  bloqueado e `FieldError` "Informe um valor maior que zero." — validação de UX; o teto contra
  o saldo da parcela é regra de domínio do backend, via 400 mapeado por `mapApiError`.
- `features/dashboard/api/dashboardApi.ts`: `ContaFinanceiraResumo` (consumidor não listado no
  plano, mas com o mesmo defeito) passa a `{ valorSaldo?, valorOriginal?, status? }`; os cards
  de "Contas a receber/pagar em aberto" somam `conta.valorSaldo` filtrando por
  `isOpenFinancialStatus(conta.status)`.
- `features/bancos/components/BancosOperacoesDialogs.tsx`: dropdown de parcela do diálogo de
  boleto (outro consumidor não listado no plano) passa a exibir `parcela.valorSaldo`.

## Origem morta em Contas a Pagar (F1.5)

- `features/financeiro/components/ContaFinanceiraFormDialog.tsx`: para `type === 'pagar'`, o
  dropdown de Origem passa a oferecer só `Manual` (decisão do usuário: Manual-only), fica
  desabilitado e ganha o texto de apoio "A
  origem de uma conta a pagar é derivada pelo backend a partir do documento que a gerou. O
  lançamento manual nasce com origem Manual." `needsOriginReference`/`unsupportedOriginReference`
  deixam de considerar `OrigemFinanceira.Compra` — como nenhum dos dois tipos oferece mais essa
  origem no dropdown, o `EntitySelect` de documento de origem e o `Message` que prometia um
  envio recusado pelo backend nunca mais renderizam. Contas a Receber **não muda**: `Origem =
  Pedido de venda` continua válida, com `EntitySelect` — o guard do backend não existe lá.
- `features/financeiro/hooks/useFinanceiroOriginOptions.ts`: removido o ramo
  `OrigemFinanceira.Compra` (query morta a `/api/compras/pedidos`).

## Fixture E2E consertada (item 10 do plano)

- `tests/e2e/fixtures/logosoft.ts`: `contasReceber`/`contasPagar` liam `valorTotal`/`saldo`/
  `statusConta`/`status: 'ABERTO'` — a mesma mentira de contrato que o frontend tinha antes
  desta versão. Reescritas no formato real de `ContaReceberResponse`/`ContaPagarResponse`, com
  `parcelas[].valorSaldo` preenchido e saldo verificável (`R$ 251,00` em Contas a Receber, a
  partir do pedido de venda de 251 já existente na fixture). Adicionado roteamento por id
  (`GET /api/financeiro/contas-{receber,pagar}/{id}`) antes do `.includes()` genérico da lista,
  necessário para o novo hook de detalhe do diálogo de baixa.

## Validação executada

```bash
npm run validate:source
npm run typecheck
npm run lint
npx vitest run tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts
npx playwright test tests/e2e/financeiro-estoque.spec.ts
```

# v1.11.0a8b48

## Gate de permissões frontend/backend

- Novo `scripts/lib/backend-permissions.mjs`, extração compartilhada (mesmo padrão de `scripts/lib/backend-contract-map.mjs`): parseia o union `PermissionCode` de `types/erp.ts`, o catálogo `PERMISSOES_CATALOGO` de `features/seguranca/permissoesCatalogo.ts`, as permissões anexadas a cada uma das 579 operações de `docs/backend-v1.23/CONTRATO-API-v1.23.md` e a tabela `Constante C# → Código` da seção "12. Catálogo de permissões" de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`.
- Novo `scripts/generate-backend-permissions-snapshot.mjs` (script `generate:backend-permissions-snapshot`) regenera `scripts/backend-permissions.snapshot.json` como a união nomeada das duas fontes documentais — schemaVersion 2, 179 códigos (177 nomeados + `MASTER_GOD` + `*`), `permissions` ordenado alfabeticamente. `generatedAt` é derivado de `sourceDate` (não do relógio), então a geração é idempotente por construção. O script nunca entra em `ci:gates`.
- Registradas no snapshot: as permissões novas do contrato v1.23 sem representação prévia (`FISCAL_REPROCESSAR`, `FATURAMENTO_RETOMAR_REVERSAO` — pré-requisitos de F2.5 e F2.1), as permissões do catálogo §12 sem nenhuma operação em v1.23 (`SEGURANCA_SESSOES_GERENCIAR`, `FINANCEIRO_CAIXA_GERENCIAR`, `FINANCEIRO_BANCO_GERENCIAR`, `POLITICA_COMERCIAL_GERENCIAR`, `VENDAS_PRECO_MINIMO_SOBRESCREVER`, mantidas por não haver como provar remoção) e 1 permissão declarada pelo backend (178 no total) que não aparece em nenhuma das duas fontes — `naoConciliado`, não inventada.
- Novo `scripts/validate-backend-permissions.mjs` (scripts `validate:backend-permissions` e `report:backend-permissions --report`), ligado a `ci:gates`, `validate:source` e ao workflow de CI logo após o gate de mapa de rotas. Compara o union `PermissionCode` contra o snapshot nas duas direções: permissão **fantasma** (no union, fora do snapshot — guard impossível de satisfazer) e **cobertura pendente** (no snapshot, fora do union — permissão do backend sem representação no frontend). Hoje: 3 fantasmas (`ATIVIDADES_GERENCIAR`, `RELATORIOS_CONSULTAR`, `PORTARIA_PRE_AUTORIZAR`) e 36 pendências.
- Nova `scripts/backend-permissions.allowlist.json`: registro **fechado e monotônico** (não uma supressão) — `suppressions` sempre `[]`, `teto` trava o número de itens hoje, cada entrada exige `usos`/`backendOperacoes` reais e um alvo de onda (`F1.2` para cobertura pendente, `F1.3` para fantasma), e entrada que deixar de corresponder a uma divergência observada reprova o gate (anti-apodrecimento). Diferente do gate de rotas (`backend-contract-map.allowlist.json`, tolerância zero), este nasce vermelho porque já existe dívida medida; a allowlist documenta essa dívida sem escondê-la.
- Corrigida a indentação de `frontend-ci.yml:31` (bloco `env` do job `frontend-gates`) e reescrito `scripts/validate-ci-gates.mjs` para carregar o workflow com `js-yaml` (parse real, leitura estrutural de `jobs['frontend-gates'].env`, listas fechadas `allowedWorkflowJobs`/`allowedFrontendGatesEnvKeys`), em vez de checagens por regex/`includes` sobre o texto cru do YAML.

## Pendências registradas nesta versão

- `tests/unit/backendContractMap.test.ts:25-26` ainda afirma `permissionsSnapshot.count === 177` (schemaVersion 1); fica vermelho até o teste ser atualizado para o schemaVersion 2 (179).
- `npm run ci:gates` continua com a dívida herdada de `test:e2e:fiscal` (`tests/e2e/fiscal.spec.ts:27`, timeout no heading "Nota fiscal 1/900001"), fora do escopo desta versão.
- `SEGURANCA_SESSOES_GERENCIAR` está no union e no snapshot (via catálogo §12) mas sem nenhuma operação no contrato v1.23 — não é divergência hoje, mas é candidata a virar um 4º fantasma se o catálogo §12 for podado sem uma operação v1.23 equivalente.

## Validação executada

```bash
npm run generate:backend-permissions-snapshot
npm run validate:backend-permissions
npm run report:backend-permissions
npm run validate:ci
npm run validate:source
npm run typecheck
npm run lint
```

# v1.11.0a8b47.c3

## Contexto organizacional acessível

- Corrigida a regra `.layout-topbar-button span { display: none }`, que era seletor de elemento e apagava o ícone e o rótulo de qualquer componente PrimeReact aninhado no topbar. O rótulo passa a ser ocultado pela classe `.layout-topbar-button-label`.
- O botão "Selecionar contexto" existia no DOM mas renderizava como um círculo vazio e invisível, deixando o usuário master sem nenhuma forma de escolher empresa/filial. Ele virou `<button>` nativo com `<i>`, no mesmo padrão dos irmãos do topbar.
- Pelo mesmo motivo, o contador de notificações não lidas (`Badge` do PrimeReact) estava invisível no desktop e voltou a aparecer.
- Novo `SelecionarContextoButton` compartilhado: além do topbar, o CTA aparece dentro do estado bloqueado de Filiais e ao lado dos filtros Empresa/Filial travados, eliminando o beco sem saída.
- A política de contexto de `b47.c1/.c2` foi preservada: `empresaLocked` continua `true` e os filtros seguem alinhados ao snapshot, sem segunda fonte de verdade.

## Explicação de tela concentrada no tooltip

- Removidos 21 banners `Message severity="info"` estáticos do topo das telas; a explicação já é servida pelo tooltip do título no topbar, com fallback no cabeçalho compacto abaixo de 992px.
- Regras de negócio que viviam apenas nesses banners (bloqueio por status, LGPD de auditoria, não recálculo de indicadores) migraram para a `description` do `PageHeader`, sem perda de conteúdo.
- Removido o campo `listDescription` de `administracaoPageConfig` e o `pageText.info` de `MovimentoOperacionalPage`.
- Preservadas as mensagens condicionais de estado, de workflow do backend, de compliance fiscal em abas de detalhe e as de cards/diálogos sem `PageHeader`.

## Vínculo de grupo de acesso visível

- A tela de Usuários guardava `UsuarioResponse` congelado em `useState`; passou a guardar o id e derivar o usuário da listagem, eliminando o snapshot velho por construção.
- `UsuarioResponse` não devolve grupos em nenhum endpoint do contrato. O acesso efetivo passa a ser consultado em `GET /api/seguranca/usuarios/{id}/permissoes-efetivas`, e os grupos vinculados são derivados de `origens[].grupoAcessoId`.
- Após vincular um grupo, o diálogo de gestão reabre com o acesso efetivo recarregado, em vez de apenas emitir um toast e fechar.
- "Remover grupo" deixou de assumir "o primeiro grupo" e ganhou diálogo próprio com escolha do grupo vinculado e motivo. Quando indisponível, o motivo é escrito na tela em vez de o botão ficar cinza e mudo.
- Removida a coluna "Grupos" da listagem, que era sempre `-` com o contrato atual.
- Registrada a permissão `SEGURANCA_PERMISSOES_CONSULTAR`, que já existia no snapshot do backend e faltava no frontend.

## Pendências de backend registradas

- `UsuarioResponse` não expõe `GruposAcesso`; enquanto isso, os grupos dependem de `origens` de `permissoes-efetivas`.
- `OrigemPermissaoEfetivaResponse.CargoAcessoId` é não anulável, o que sugere que apenas o caminho cargo → grupo aparece em `origens`. A tela trata explicitamente o caso "origem indisponível".
- `AtribuirGrupoUsuarioRequest` não tem `Motivo`, embora `RemoverGrupoUsuarioRequest` tenha. O frontend segue enviando o campo, mas parou de prometer auditoria que o backend descarta.
- `buildCriarUsuarioPayload` envia `login` e `gruposAcessoIds`, ausentes do contrato — provável segunda ocorrência do mesmo defeito, não alterada nesta versão.

## Validação executada

```bash
npm run validate:source
npm run typecheck
npm run lint
```

# v1.11.0a8b47.c2

## Consulta segura de filiais

- Removido o singleton assíncrono do contexto organizacional; cada request escopado carrega snapshot imutável na própria metadata.
- Criado o escopo `lookup` exclusivo para `GET /api/administracao/filiais`, com `empresaId` explícito, sem `filialId` e sem body.
- Corrigido o bypass funcional de master no catálogo de permissões, mantendo `MASTER_GOD` e `*` fora do bypass solicitado.
- Selects de filial distinguem vazio, erro recuperável e ausência de acesso, com retry explícito.

# v1.11.0a8b47.c1

## Política de contexto organizacional

- Publicada política HTTP discriminada por metadata (`global`, `query`, `body` e `resource`) com snapshot somente leitura e chave estável.
- Ativadas apenas `GET /api/administracao/empresas` como global e `GET /api/administracao/filiais?empresaId` como query obrigatória.
- Movidos os selects de empresa e filial do topbar para Dialog PrimeReact; a faixa de título continua exibindo somente a página atual e ajuda.
- Corrigidos os testes estruturais legados para a política `audit-only-no-suppressions`.
- Mantida a Onda 1 em andamento; nenhum endpoint operacional adicional foi ativado.

## Validação esperada

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/organizationalContextPolicy.test.ts tests/unit/organizationalContextTopbarStructure.test.ts
```

## Contexto organizacional global

- Criados `OrganizationalContextProvider` e `useOrganizationalContext` a partir da identidade validada por `/api/auth/me`.
- Mantidos empresa e filial imutáveis para usuário comum.
- Adicionado seletor responsivo de empresa e filial para master no topbar.
- Preservada a seleção do mesmo master durante refresh e zerado o contexto na troca de identidade.
- Adicionada limpeza de cache entre identidades e invalidação posterior a mudanças organizacionais efetivas.
- Criados testes de contexto comum, master, troca de identidade e uso incorreto fora do provider.
- Fortalecido o gate de versão para workflow, ambientes, snapshots, evidências, README e CHANGELOG.

## Validações esperadas

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit -- tests/components/OrganizationalContextProvider.test.tsx
npm run build
```

# v1.11.0a8b46

## Bootstrap efetivo da sessão

- Integrado `GET /api/auth/me` ao ciclo de restauração e login.
- O shell protegido aguarda a validação de identidade, contexto organizacional e permissões pela API.
- Respostas 401 e payloads inválidos limpam a sessão; falhas transitórias bloqueiam o shell com nova tentativa.
- Preservados `status`, `code` e `traceId` nos erros do bootstrap de autenticação.
- Sincronizados os artefatos correntes de versão e os gates de governança em `1.11.0a8b46`.

## Validações esperadas

```bash
npm run validate:source
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

# v1.11.0a8b45.c1

## Reconciliação do contrato backend atual

- Preservado o `HEAD 398298d` como corte técnico auditado, sem declará-lo aprovado.
- Tornado `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` a fonte canônica para integração.
- Substituído o gate B38 por comparação estrita de método e caminho, com resolução de constantes e templates.
- Mantidas visíveis as incompatibilidades reais; a corretiva continua bloqueada até as ondas de correção.
- Nenhum client, tela, hook, schema ou fluxo produtivo foi alterado nesta Onda 0.

## Validações esperadas

```bash
npm run test:unit -- tests/unit/backendContractMap.test.ts
npm run validate:backend-contract-map
```

# v1.11.0a8b45

## Auditoria avançada

- Evoluída a auditoria para consulta operacional paginada em `/api/auditoria/operacional`.
- Adicionado consumo de `/api/auditoria/eventos-recentes`.
- Preservado client legado de `/api/auditoria/eventos`.
- Criada rota `/auditoria/operacional` reutilizando a tela avançada.
- Atualizada tela `/auditoria/eventos` com cards, eventos recentes e auditoria operacional.
- Implementados filtros por empresa, filial, usuário, módulo, entidade, ação, período e termo.
- Bloqueada exposição visual de GUID bruto por mascaramento de identificadores técnicos.
- Atualizado mapa frontend/backend para classificar `AUDITORIA_OPERACIONAL_AUSENTE_FRONTEND` como `IMPLEMENTADO_B45`.
- Criados testes estruturais e de payload para auditoria B45.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/auditoriaPayload.test.ts tests/unit/auditoriaB45Structure.test.ts tests/unit/auditoriaDisplay.test.ts tests/unit/routePermissions.test.ts
npm run ci:gates
```

# v1.11.0a8b42

## Financeiro gerencial

- Alinhadas as baixas financeiras para `POST /api/financeiro/contas-receber/{id}/baixar` e `POST /api/financeiro/contas-pagar/{id}/baixar`.
- Alinhados os estornos financeiros para `POST /api/financeiro/contas-receber/{id}/estornar` e `POST /api/financeiro/contas-pagar/{id}/estornar`.
- Simplificado o payload de baixa para `{ valor, dataBaixa, observacao }`, removendo campos de forma de pagamento/caixa/banco que não constavam no contrato inventariado.
- Atualizado o payload de estorno para `{ baixaId, dataEstorno, motivo }`.
- Criada tela `/financeiro/fluxo-caixa` consumindo `GET /api/financeiro/fluxo-caixa`.
- Atualizados menu, guard de rota e mapa de contratos frontend/backend para `IMPLEMENTADO_B42`.
- Reforçados testes de payload e estrutura financeira B42.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/financeiroPayload.test.ts tests/unit/financeiroB42Structure.test.ts tests/unit/routePermissions.test.ts
npm run ci:gates
```

# v1.11.0a8b41

## Estoque avançado

- Criada tela `/estoque/transferencias` para registrar transferência entre filial/local de origem e destino usando o endpoint `POST /api/estoque/transferencias`.
- Criada tela `/estoque/bloqueios` para registrar bloqueio de estoque e executar liberação/cancelamento por ID operacional com motivo auditável.
- Corrigido o client de inventário para usar `POST /api/estoque/inventarios/{id}/concluir` com payload `{ motivoAjuste }`, removendo a rota legada `/fechar`.
- Adicionado detalhe de inventário via `GET /api/estoque/inventarios/{id}` e ação `POST /api/estoque/inventarios/{id}/iniciar-contagem`.
- Atualizados menu, guard de rotas e permissões para transferências e bloqueios com `ESTOQUE_MOVIMENTAR`.
- Reforçados payloads, schemas e testes estruturais para estoque avançado B41.
- Atualizado mapa de contratos frontend/backend para classificar as divergências de estoque como `IMPLEMENTADO_B41`.

## Validações esperadas

```bash
npm run validate:source
npm run validate:backend-contract-map
npm run validate:guid-references
npm run test:unit -- tests/unit/estoquePayload.test.ts tests/unit/estoqueB41Structure.test.ts tests/unit/estoqueUxRules.test.ts
npm run ci:gates
```

# v1.11.0a8b39

## Correção de typecheck do gate de contratos

- Corrigido `tests/unit/backendContractMap.test.ts` para remover regex com flag `s`, incompatível com `target: es5` do `tsconfig.json`.
- Substituída a validação por extração do tipo `VincularFornecedorProdutoRequest` com `[\s\S]*?` e `not.toContain('descricaoFornecedor')`.
- Atualizado `scripts/validate-backend-contract-map.mjs` para usar a mesma abordagem sem flag dotAll.
- Mantido o escopo estrutural da B38 sem alteração de tela produtiva.

## Reconciliação controlada de contratos

- Criado `validate:backend-contract-map` para mapear endpoints frontend e divergências conhecidas contra o inventário/backend.
- Criada allowlist versionada de divergências controladas entre frontend e backend.
- Criado `docs/CONTRATO_FRONTEND_BACKEND_B38.md` com decisões, alvos e bloqueios para B39-B45.
- Preservada a correção B37 de Produto x Fornecedor como item resolvido no mapa.
- Integrado o novo gate ao `validate:source`, `validate:ci` e `ci:gates`.

# v1.11.0a8b37

## Correção Produto x Fornecedor

- Ajustado payload do vínculo fornecedor/produto para usar `codigoProdutoFornecedor`, alinhado ao inventário backend de `/api/produtos/{id}/fornecedores`.
- Mantido envio de `fornecedorId` operacional; o formulário não envia `pessoaId`.
- Removido campo de descrição do payload de vínculo para evitar propriedade não prevista no contrato.
- Reforçados testes unitários para payload e validação de GUID do fornecedor.

## Validações esperadas

```bash
npm run validate:source
npm run validate:guid-references
npm run test:unit -- tests/unit/produtosPayload.test.ts
npm run ci:gates
```

# v1.11.0a8b36

- Adicionada validação real assistida do E2E integrado com backend descartável/controlado.
- Criados gate `validate:assisted-e2e`, script `report:e2e:integrated:assisted` e template de evidências.
- Adicionado ACK `LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false` nos envs versionados.
- Reforçado que o E2E integrado mutável, seed/reset e relatório assistido não rodam no CI padrão.
- Atualizadas skills, README e documentação operacional da execução assistida.

# Changelog


## v1.11.0a8b35

- Criado `scripts/prepare-integrated-e2e-seed.mjs` para chamar procedimento real/controlado de seed/reset do backend.
- Adicionado gate `validate:backend-seed-reset` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado o E2E integrado para exigir `LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true` antes de rodar fluxo mutável.
- Atualizados `.env.example`, `.env.test` e `.env.backend-controlled.example` com variáveis de seed/reset desligadas por padrão.
- Criada documentação `docs/BACKEND_SEED_RESET_INTEGRATION.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B35.md`.
- Criado teste unitário `tests/unit/backendSeedResetIntegration.test.ts` para proteger scripts, ACKs e CI.
- Atualizada versão visual/documental para `1.11.0a8b35`.

## v1.11.0a8b34

- Criado `docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md` com procedimento de backend descartável para o E2E integrado real.
- Adicionado gate `validate:integrated-runbook` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado `tests/e2e/integrated-backend.spec.ts` para exigir `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true` além do opt-in e ACK de ambiente descartável.
- Atualizado `.env.backend-controlled.example` com `LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false`, preservando execução desligada em arquivo versionado.
- Criado teste unitário `tests/unit/integratedRunbook.test.ts` para proteger runbook, ACK e gates.
- Atualizada versão visual/documental para `1.11.0a8b34`.

## v1.11.0a8b33

- Criado template `tests/seeds/integrated-e2e.controlled-seed.example.json` para dados descartáveis do E2E integrado.
- Adicionado gate `validate:controlled-seeds` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado o E2E integrado para exigir `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID` e `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`.
- Reforçado `validate-integrated-e2e` e `validate-ci-gates` para bloquear regressão de execução mutável sem seed controlada.
- Criada documentação `docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B33.md`.
- Atualizada versão visual/documental para `1.11.0a8b33`.


## v1.11.0a8b32

- Criado E2E integrado controlado para venda → fiscal → estoque → financeiro → auditoria.
- Adicionado `test:e2e:integrated:backend` com Playwright config dedicada e opt-in próprio `LOGOSOFT_INTEGRATED_E2E_*`.
- Criado gate `validate:integrated-e2e` e integrado ao `validate:source`, `ci:gates` e GitHub Actions sem executar fluxo mutável no CI comum.
- Atualizado `.env.backend-controlled.example` com variáveis integradas sem segredos reais e execução desligada por padrão.
- Criada documentação `docs/BACKEND_INTEGRATED_E2E.md` e levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B32.md`.
- Atualizada versão visual/documental para `1.11.0a8b32`.

## v1.11.0a8b31.c1

- Corrigido isolamento entre contrato fiscal e contrato operacional.
- `playwright.contract.config.ts` passa a executar somente `fiscal-backend.contract.spec.ts`.
- Removido fallback `LOGOSOFT_CONTRACT_*` do contrato operacional, exigindo `LOGOSOFT_OPERATIONAL_CONTRACT_*`.
- Reforçado `validate-operational-contracts` para bloquear regressão de descoberta cruzada ou dependência operacional em variáveis fiscais.
- Atualizado teste unitário de regressão para proteger a separação das suítes.
- Atualizada versão visual/documental para `1.11.0a8b31.c1`.

## v1.11.0a8b31

- Criados contratos operacionais read-only para Vendas, Estoque, Financeiro e Auditoria contra backend real/controlado.
- Adicionado script `test:contract:operational` com configuração Playwright dedicada.
- Criado gate `validate:operational-contracts` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Atualizado `.env.backend-controlled.example` com variáveis operacionais sem segredos reais.
- Documentada a validação em `docs/BACKEND_OPERATIONAL_CONTRACTS.md`.
- Adicionado teste unitário para proteger scripts, opt-in e comportamento read-only do contrato operacional.
- Atualizada versão visual/documental para `1.11.0a8b31`.

## v1.11.0a8b30

- Preparada validação real/controlada frontend/backend sem reintroduzir mocks produtivos.
- Criado template `.env.backend-controlled.example` sem segredos reais.
- Criado gate `validate:backend-controlled` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Reforçado `validate-ci-gates` para exigir o novo gate.
- Criada documentação `docs/BACKEND_CONTROLLED_VALIDATION.md`.
- Criado levantamento `docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md` com pendências por módulo, testes e ambiente.
- Adicionado teste unitário para proteger o contrato estrutural de backend controlado.
- Atualizada versão visual/documental para `1.11.0a8b30`.

## v1.11.0a8b29

- Isolados mocks de autenticação e recursos fora de `features/**/api`, movendo-os para `tests/mocks/**`.
- Mantido E2E mockado apenas em `tests/e2e/fixtures/logosoft.ts` com interceptação controlada via Playwright.
- Criado gate `validate:mocks-isolation` e integrado ao `validate:source`, `ci:gates` e GitHub Actions.
- Atualizado o gate de CI para bloquear variáveis públicas `NEXT_PUBLIC_USE_MOCK_*` no workflow.
- Adicionado teste unitário de regressão para impedir retorno de arquivos mockados aos diretórios produtivos.
- Criada documentação `docs/MOCKS_ISOLATION_FRONTEND.md`.
- Atualizada versão visual/documental para `1.11.0a8b29`.

## v1.11.0a8b8

- Corrigido mascaramento defensivo de XML fiscal na observabilidade.
- `maskFiscalSensitiveText` agora substitui blocos XML completos por `[XML_MASKED]`, evitando vazamento de tags internas como `emit`, `CNPJ`, totais ou valores fiscais.
- Adicionado teste unitário com XML fiscal contendo dados internos para impedir regressão de segurança.
- Atualizada versão visual/documental para `1.11.0a8b8`.

## v1.11.0a8b7

- Evoluída a tela de Observabilidade Fiscal com filtros locais por operação, status, reprocessamento e dado sensível mascarado.
- Adicionada consulta operacional de status de serviço fiscal via `POST /api/fiscal/sefaz/status-servico`.
- Adicionados históricos de status de serviço e contingência na observabilidade.
- Adicionado mascaramento visual defensivo para `payloadResumo` fiscal, evitando exposição de token, senha, certificado, segredo ou XML completo.
- Adicionados testes unitários para payload de status de serviço e mascaramento fiscal.
- Corrigida duplicidade residual de `etapaAtual` no tipo de workflow fiscal.

## v1.11.0a8b6

- Corrigido `baixarDocumentoAuxiliar` para sempre retornar `filename` como string, preservando o contrato `DownloadedFiscalFile`.
- Adicionado fallback seguro `documento-auxiliar-fiscal-{documentoAuxiliarId}.bin` quando o backend não enviar `Content-Disposition`.
- Download de documento auxiliar passa a retornar `contentType` quando disponível.
- Atualizada versão visual/documental para `1.11.0a8b6`.
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B6.md`.

## v1.11.0a8b5

- Corrigido `UsuarioFormDialog`: `Password` agora usa `inputId="senha"`, mantendo o wrapper separado como `senha-wrapper`.
- Exportação CSV fiscal agora ignora paginação visual (`page`/`pageSize`) e usa filtros + limite auditado.
- Adicionada validação local para empresa obrigatória na exportação fiscal.
- Adicionada validação local para filtros conflitantes de pendência XML, DANFE e financeiro.
- Tratamento de erro em resposta `blob` para JSON, ProblemDetails e texto simples.
- Sanitização de nome de arquivo e fallback `notas-fiscais-YYYY-MM-DD.csv`.
- Adicionado teste unitário para parâmetros da exportação CSV auditada.
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B5.md`.

## v1.11.0a8b4

Versão anterior aplicada: `v1.11.0a8`.

### Corrigido
- Normalizado payload fiscal de geração de conta a receber para enviar `primeiraDataVencimento` como string ISO.
- `LoadingState` passou a aceitar o variant `cards`.
- Corrigidas regressões unitárias em fiscal, financeiro, estoque, auth refresh e formulário de usuário.
- Ações fiscais de consulta de protocolo e contingência passam a respeitar workflow/regras operacionais, não apenas permissão.
- Reprocessamento de integração fiscal passou a usar `PermissionGuard` com `FISCAL_EMITIR`.

### Alterado
- Campo de condição de pagamento no fluxo fiscal financeiro deixou de aceitar digitação manual de ID e passou a usar select carregado por API.
- Atualizada versão visual/documental para `1.11.0a8b4`.

### Documentação
- Criado `docs/IMPLEMENTACAO_V1_11_0A8B4.md`.
- Criado `docs/DIRETRIZES_UX_REFERENCIAS.md` com regra global de dropdowns/selects para entidades relacionadas.

### Validação
- `node scripts/validate-source.mjs` executado com sucesso.
- `npm install` não concluiu no container por Node 22/npm 10 e timeout/SIGTERM; validar `typecheck`, `lint`, `test:unit` e `build` em Node 24/npm 11.

## v1.11.0a8

Versão anterior aplicada: `v1.11.0a7`.

### Adicionado
- Listagem fiscal operacional em `/fiscal/notas` usando `GET /api/fiscal/notas-fiscais` com filtros, paginação, pendências e ação principal sugerida pelo backend.
- Exportação CSV auditada com motivo obrigatório e permissão `FISCAL_EXPORTAR`.
- Consumo de `resumo-operacional`, `workflow-operacional` e integrações no detalhe da nota fiscal.
- Abas de Workflow e Integrações na tela de detalhe fiscal.
- Modais de reprocessamento SEFAZ, consulta de protocolo, contingência, baixa de estoque e geração de conta a receber.
- Tela `/fiscal/observabilidade` com métricas e logs fiscais sanitizados.
- Tipos, schemas, hooks e API client para o contrato fiscal frontend/backend v1.10.0a18.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a8`.
- Módulo fiscal passa a usar `resumo.acoes` e workflow do backend para orientar ações críticas.
- `docs/CONTRATO_FISCAL_OFICIAL.md` atualizado para a documentação fiscal v1.10.0a18.
- Menu e proteção de rotas fiscais passam a reconhecer `FISCAL_EXPORTAR` e `/fiscal/observabilidade`.

### Corrigido
- Corrigida duplicidade de declaração em `CartaCorrecaoResponse` dentro dos tipos fiscais.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A8.md` com etapas padronizadas `v1.11.0a8b1` a `v1.11.0a8b7` para validação incremental.

### Validação
- `node scripts/validate-source.mjs` executado com sucesso.
- Validação sintática local dos arquivos alterados executada com `typescript.transpileModule`.
- `npm install`, `typecheck`, `lint`, testes e build dependem de Node 24/npm 11; o container atual está em Node 22/npm 10.

## v1.11.0a7

Versão anterior aplicada: `v1.11.0a6`.

### Alterado
- Removido o caminho de mock de runtime de autenticação e recursos compartilhados.
- `authApi` e `createResourceClient` passam a usar somente endpoints reais da API.
- Playwright mantém interceptações apenas em testes, sem flags públicas `NEXT_PUBLIC_USE_MOCK_*`.
- Módulo fiscal troca campos manuais de empresa, filial, pessoa, pedido e produto por selects conectados aos endpoints já existentes.
- Textos fiscais deixam de mencionar mock e passam a indicar ambiente configurado no backend.
- Download fiscal passa a usar `Content-Disposition` quando disponível.
- Erros fiscais preservam metadados técnicos de suporte: code, status HTTP e traceId.

### Removido
- `features/auth/api/mockAuthClient.ts`.
- `features/shared/api/mockErpStore.ts`.
- `features/shared/api/resourceMockClient.ts`.
- Flags `NEXT_PUBLIC_USE_MOCK_AUTH` e `NEXT_PUBLIC_USE_MOCK_API` dos arquivos `.env`.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A7.md`.
- Atualizado `docs/CONTRATO_FISCAL_OFICIAL.md` para v1.11.0a7.

### Validação
- `npm run validate:source` executado com sucesso.
- Demais comandos dependem de Node 24/npm 11 por causa do `engine-strict=true`.

## v1.11.0a5

Versao anterior aplicada: `v1.11.0a4`.

### Adicionado
- Campo de busca acima da lista da sidebar para localizar modulos e telas.
- Filtro por nome do item e rota, com normalizacao de acentos.
- Estado vazio para pesquisas sem resultado.

### Alterado
- A sidebar passa a aplicar a busca somente depois do filtro de permissao, evitando exposicao de telas nao liberadas ao usuario.
- Atualizada a versao visual/documental para `1.11.0a5`.

### Documentacao
- README atualizado com causa, modulos impactados e validacao.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A5.md`.

### Validacao
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0a4

Versao anterior aplicada: `v1.11.0a3`.

### Adicionado
- `LoadingState` com variantes `table`, `detail`, `metrics` e `panel`.
- Skeleton automatico no `DataTableServer` para carregamento inicial sem registros visiveis.
- Skeleton de ficha nos detalhes de pedido de venda e pedido de compra.
- Skeleton de metricas no Dashboard e nos cards de resumo de Saldos de estoque.

### Alterado
- Removidos skeletons locais duplicados das listagens, centralizando o comportamento no wrapper de tabela.
- Auditoria e demais telas que usam `DataTableServer` passam a receber skeleton sem implementacao local.
- Atualizada a versao visual/documental para `1.11.0a4`.

### Documentacao
- README atualizado com causa, modulos impactados e validacao.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A4.md`.

### Validacao
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0a3

Versão anterior aplicada: `v1.11.0a2`.

### Documentado
- Executada auditoria modular de testes unitários, componentes e E2E crítico.
- Criado documento `docs/AUDITORIA_MODULOS_V1_11_0A3.md`.
- README atualizado com matriz resumida de estado por módulo e melhorias recomendadas.

### Resultado
- Unitários/componentes: `93/100` testes passaram.
- Falhas concentradas em Segurança/usuários, Estoque e Financeiro.
- E2E crítico: `5/5` testes bloqueados por ambiente, devido ao Chromium gerenciado do Playwright ausente.

### Melhorias identificadas
- Criar `renderWithProviders` para testes de componentes com TanStack Query.
- Centralizar normalização de GUID opcional.
- Ajustar Financeiro e Estoque para alinhar GUID vazio/inválido com a regra de não envio.
- Tornar E2E crítico executável com instalação de browsers ou uso do Chrome local.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a3`.

## v1.11.0a2

Versão anterior aplicada: `v1.11.0a1`.

### Alterado
- `/login` agora ocupa a tela inteira no desktop, sem card central limitado.
- Painel institucional do login passa a preencher toda a coluna direita da viewport.
- Removido o campo `Filial` do formulário de login.
- Removido `filialId` do schema, tipos, hook e payload de login.
- `buildLoginPayload` ignora `filialId` legado e não envia mais o campo para `/api/auth/login`.
- Mensagens de erro de autenticação passaram a mencionar apenas empresa/credenciais.
- Atualizada a versão visual/documental para `1.11.0a2`.

### Documentação
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A2.md`.
- README atualizado com a causa, telas alteradas e validação recomendada.

### Validação
- `npm run validate:source` recomendado.
- `npm run test:component -- LoginForm` recomendado.
- `npm run test:unit -- authLoginPayload` recomendado.
- `npm run build` recomendado.

## v1.11.0a1

Versão anterior aplicada: `v1.11.0`.

### Corrigido
- Corrigido erro de build em `LoginForm`, removendo `inputProps` do `Password` do PrimeReact 10.2.1.
- Padronizado o layout da Dashboard com grid próprio e cards de métrica com altura estável.

### Alterado
- Atualizada a versão visual/documental para `1.11.0a1`.
- Criado `styles/layout/_dashboard.scss`.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0A1.md`.

### Validação
- `npm run validate:source` executado.
- `npm run build` executado.

## v1.11.0

Versão anterior aplicada: `v1.10.15a1`.

### Adicionado
- Criado gate técnico/documental para início seguro do bloco Fiscal/Nota Fiscal.
- Criado documento `docs/IMPLEMENTACAO_V1_11_0.md`.
- `validate:source` passou a bloquear implementação fiscal sem `docs/CONTRATO_FISCAL_OFICIAL.md`.

### Alterado
- Atualizada a versão visual/documental para `1.11.0`.

### Observação
- Nenhum endpoint, rota, menu ou regra fiscal foi criado nesta etapa.
- O bloco Fiscal continua dependente de contrato oficial, validação fiscal e documentação tributária aplicável.

### Validação
- `npm run validate:source` passou.
- `npm run test:unit` executou: 93 testes passaram e 7 falhas preexistentes foram aceitas temporariamente.

## v1.10.15a1

Versão anterior aplicada: `v10.0.15`. Esta entrega inaugura a nomenclatura operacional `v1.10.15`, usando o sufixo `a1` para manutenção dentro da mesma tag.

### Adicionado
- Nova tela `/login` com layout dividido, formulário corporativo e painel institucional abstrato configurável.
- Componentes `LoginPage`, `LoginBrandPanel` e `LoginEnvironmentBadge`.
- Schema `loginSchema` e hook `useLogin` para separar validação, submit e erro inline.
- Política de sessão com duração máxima de 5 horas e inatividade máxima de 30 minutos.
- Testes de componente do Login e testes unitários da política de sessão.

### Alterado
- Login mantém API real e contrato atual, mas passa a limpar sessão inválida antes de autenticar novamente.
- Mensagens de erro de autenticação foram refinadas para credenciais inválidas, usuário bloqueado/sem permissão e empresa/filial inválida.
- `validate:source` passou a validar arquivos críticos da nova UX de login e política de sessão.
- Atualizada a versão visual e documental para `1.10.15a1`.

### Validação
- Recomendado executar `npm run validate:source` e `npm run test:unit`.

## v10.0.15

- Fechada a última etapa antes do bloco Fiscal/Nota Fiscal.
- Criado `RoutePermissionGate` para proteger rotas internas por permissão, complementando menu, botão e ação.
- Criada matriz centralizada `lib/security/routePermissions.ts` para rotas de Segurança, Administração, Pessoas, Clientes, Fornecedores, Produtos, Estoque, Vendas, Financeiro, Compras e Auditoria.
- Integrado o gate de rotas no layout interno `app/(main)/layout.tsx`.
- Criado `lib/formatters/privacy.ts` com mascaramento de documento, e-mail, telefone e labels LGPD-safe.
- Listagem de Pessoas passou a usar `maskDocument` centralizado.
- Selects de Pessoa em Clientes e Fornecedores passaram a exibir documento minimizado em vez de CPF/CNPJ cru.
- Adicionados testes unitários para permissões por rota e formatadores de privacidade.
- `validate:source` reforçado para bloquear regressões de permissão por rota e LGPD visual.
- Criado documento `docs/IMPLEMENTACAO_V10_0_15.md`.
- Atualizada a versão visual e documental para `10.0.15`.

## v10.0.14

### Adicionado
- Criado helper E2E `tests/e2e/fixtures/logosoft.ts` com sessão autenticada, perfis de permissão, mocks de API via Playwright e helpers de navegação.
- Adicionada cobertura E2E para autenticação, logout, rota protegida, permissão somente consulta, cadastros, estoque, financeiro, vendas, compras e auditoria.
- Criados specs `permissions.spec.ts`, `cadastros.spec.ts`, `financeiro-estoque.spec.ts` e `auditoria.spec.ts`.
- Ampliado `logosoft-critical-flows.spec.ts` com navegação por módulos críticos e rotas `/novo` de Vendas/Compras.
- Adicionados scripts `test:e2e:critical` e `test:e2e:ui`.
- Criado documento `docs/IMPLEMENTACAO_V10_0_14.md`.

### Alterado
- `playwright.config.ts` agora sobe ambiente E2E com `NEXT_PUBLIC_USE_MOCK_AUTH=true`, `NEXT_PUBLIC_USE_MOCK_API=true` e `NEXT_PUBLIC_APP_ENV=test`.
- `validate:source` passou a validar arquivos E2E obrigatórios, script `test:e2e:critical` e configuração explícita de mocks no Playwright.
- Atualizada a versão visual e documental para `10.0.14`.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build`, `npm run test:e2e` e `docker build` não foram executados neste ambiente.

## v10.0.13.3

### Adicionado
- Criado utilitário `features/auditoria/utils/auditoriaDisplay.ts` para centralizar rótulos, severidades, datas e referências amigáveis de auditoria.
- Adicionado teste unitário `tests/unit/auditoriaDisplay.test.ts`.
- Adicionados cartões-resumo e filtro por ação na tela de Auditoria.
- Adicionados atalhos operacionais no Dashboard, protegidos por permissão.

### Corrigido
- Corrigida colisão visual de status numéricos nos fluxos críticos do Dashboard.
- `validate:source` passou a validar ausência de `timeout=` no `.npmrc`, presença de `.npmrc` no Dockerfile e existência das rotas operacionais de Vendas/Compras.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.

## v10.0.13.2

### Corrigido
- Criada rota `/vendas/pedidos/novo` apontando para `PedidoVendaDetalhePage` em modo novo.
- Criada rota `/vendas/pedidos/[id]` apontando para `PedidoVendaDetalhePage` com `pedidoId`.
- Criada rota `/compras/pedidos/novo` apontando para `PedidoCompraDetalhePage` em modo novo.
- Criada rota `/compras/pedidos/[id]` apontando para `PedidoCompraDetalhePage` com `pedidoId`.
- Corrigido o desalinhamento entre botões/redirecionamentos existentes e rotas reais do App Router.
- Atualizada a versão visual e documental para `10.0.13.2`, sem avançar para a linha v10.0.14.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build` e `docker build` não foram executados neste ambiente.

## v10.0.13.1

### Corrigido
- Corrigido erro de build em `OperationalGovernancePanel`, substituindo o type guard de data por `date instanceof Date` antes de acessar `getTime()`.
- Removida a configuração inválida `timeout=300000` do `.npmrc`, eliminando o warning `Unknown project config "timeout"` do npm 11.
- Mantidas as configurações suportadas de retry e timeout de fetch para reduzir falhas de rede no Docker.
- Atualizada a versão visual e documental para `10.0.13.1`, sem avançar para a linha v10.0.14.

### Validação
- `npm run validate:source` executado com sucesso nesta revisão.
- `npm install`, `npm run build` e `docker build` não foram executados neste ambiente.

## v10.0.13

- README reescrito com documentação detalhada de módulos, telas, rotas, scripts, regras permanentes e histórico por versão.
- Adicionado `docs/IMPLEMENTACAO_V10_0_13.md`.
- Atualizada versão para `10.0.13` em `package.json` e `config/app.ts`.
- Corrigido rodapé para renderizar `© logosoft v10.0.13`.
- Corrigido Dockerfile para copiar `.npmrc` antes do `npm install` no stage `deps`.
- Endurecido `npm install` do Docker contra `ETIMEDOUT` com retry explícito, timeout maior e cache npm via BuildKit.
- Atualizado `.npmrc` com `fetch-timeout=300000`; a chave inválida `timeout=300000` foi removida na v10.0.13.1.
- Mantida regra de não usar `npm ci`.
- Mantido Node 24 fixado em todos os stages Docker.

## v10.0.12

- Refinamento de Administração, Pessoas, Clientes, Fornecedores e Produtos/Catálogo.
- Adicionado `OperationalGovernancePanel` para métricas, controle operacional, privacidade e rastreabilidade.
- Painéis embutidos nos módulos de cadastro para reforçar regras de inativação, LGPD, dados fiscais e vínculo operacional.
- Mantido Node 24, Docker sem `npm ci`, Axios, mock desligado por padrão e validações preventivas de fonte.

## v10.0.11

- Refinamento UX do módulo de Estoque.
- Cards de resumo para locais, saldos, movimentos, reservas e inventários.
- Rótulos e severidades amigáveis para movimentos, reservas e inventários.
- Painéis explicativos para entrada, saída e ajuste.
- Testes unitários de regras visuais de estoque.

## v10.0.10

- Refinamento UX de Compras.
- Cards de resumo e fluxo visual de status no detalhe do pedido de compra.
- Melhorado painel de totais e impacto operacional de estoque/financeiro.

## v10.0.9

- Refinada UX de Vendas com fluxo visual do pedido, ações disponíveis por status e bloqueios operacionais.
- Adicionados cards de resumo na listagem de pedidos de venda.
- Melhorado painel de totais do pedido com quantidade de itens e percentual de desconto.
- Adicionado teste unitário `vendasUxRules.test.ts`.

## v10.0.8

- Dockerfile fixado em `node:24-alpine`.
- Adicionados `engines`, `.nvmrc`, `.node-version` e `.npmrc` com Node 24.
- `validate:source` agora bloqueia regressão para imagem Node não fixada.
- Refinamento UX do Financeiro: cards de resumo, totalizador de parcelas e botão Salvar protegido por preenchimento mínimo.
- Rodapé atualizado para `© logosoft v10.0.8`.

## v10.0.7

- Revisão global de referências amigáveis para campos enviados como GUID.
- Corrigido fornecedor do produto para exibir código + pessoa, sem `pessoaId` cru.
- Corrigido pedido de venda para exibir cliente por código + pessoa na criação.
- Corrigida reserva de estoque para selecionar documento de origem por número do pedido quando origem for Vendas, sem input manual de origemId.
- Mensagens de ajuda revisadas para explicar vínculo automático sem expor detalhe técnico.
- Validação de fonte reforçada para bloquear rótulos visíveis como OrigemId/GUID/ID técnico.
- Rodapé atualizado para `© logosoft v10.0.7`.

## v10.0.6

- Versão atualizada para `10.0.6`.
- `npm run build` agora executa `validate:source` antes do `next build`.
- Validação preventiva ampliada contra regressões de compilação já observadas.
- Removidos resíduos tipados do configurador do template (`AppConfigProps` e `configSidebarVisible`).
- Adicionado `.dockerignore` para evitar envio de artefatos locais ao Docker.
- Rodapé atualizado para `© logosoft v10.0.6`.

## v10.0.5

- Adicionada validação estática `npm run validate:source` para bloquear regressões que já quebraram build.
- Adicionado `dynamic = 'force-dynamic'` no segmento autenticado `(main)` para evitar prerender estático de telas protegidas e componentes client.
- Mantida correção dos identificadores `GUID_REGEX` e `INVALID_GUID_SENTINELS` em `lib/http/requestUtils.ts`.
- Rodapé atualizado para `© logosoft v10.0.5`.
- Mantida regra: campos que enviam GUID no payload devem ser exibidos ao usuário por nome, código, número ou descrição quando houver fonte de dados disponível.

## v10.0.4

- Corrigida substituição indevida de identificadores TypeScript em `lib/http/requestUtils.ts`, restaurando `GUID_REGEX` e `INVALID_GUID_SENTINELS`.
- Mantida a regra de UX: o usuário vê nome/código/descrição; o payload envia GUID técnico quando exigido pela API.
- Corrigido build do dashboard: soma de métricas agora usa `reduce<number>` com acumulador tipado para evitar inferência `null | undefined`.
- Dashboard real com dados da API e tratamento de falhas parciais.
- Auditoria real em `/api/auditoria/eventos` com filtros locais.
- Revisão de exibição para não mostrar referência técnica crua ao usuário final.
- Rodapé atualizado para `© logosoft v10.0.4`.
- Mantido Dockerfile sem `npm ci`, Axios e mock desligado por padrão.

## v9.6.9.1

- Removida definitivamente a engrenagem/configurador visual do template Sakai do layout renderizado.
- Removido o import de `_config.scss` para impedir CSS residual do botão flutuante de configuração.
- Ajustada a tela de nova conta a receber/pagar para não expor `origemId` como campo técnico de referência.
- Origem manual agora oculta a referência de origem.
- Pedido de venda e compra agora usam dropdown pesquisável por número/valor e enviam somente a referência técnica no payload.
- Ajustados espaçamentos da seção de parcelas e reduzido o botão de adicionar parcela.
- Ajustados botões da barra superior de contas financeiras.
- Revisadas listagens para evitar exibir referência técnica crua quando há nome/código disponível: clientes, fornecedores, contas financeiras, vendas e estoque.
- Rodapé atualizado para `© logosoft v9.6.9.1`.

## v9.6.9

- Implementado módulo Compras com endpoints reais do contrato v9.8.
- Criadas telas específicas de listagem, criação e detalhe de pedidos de compra.
- Adicionado client Axios para listar, buscar, criar, atualizar, adicionar/editar/remover itens, enviar para aprovação, aprovar, cancelar e receber.
- Implementado recebimento com seleção visual de itens por produto/local, sem expor referência técnica ao usuário.
- Implementado recebimento com flags `permiteReceberAcimaDoPedido` e `gerarContaPagar`.
- Aplicadas permissões COMPRAS_CONSULTAR, COMPRAS_GERENCIAR, COMPRAS_APROVAR, COMPRAS_CANCELAR e COMPRAS_RECEBER.
- Mantida regra visual de exibir nomes/códigos para referências e enviar somente referência técnica no payload.
- Rodapé atualizado para `© logosoft v9.6.9`.
- Adicionado teste unitário de payloads de Compras.

## v9.6.8

- Implementado módulo Financeiro com endpoints reais do contrato v9.8.
- Adicionadas telas de formas de pagamento, condições, contas a receber e contas a pagar.
- Implementadas ações de receber, pagar, estornar e cancelar com motivo.
- Implementada geração de conta a receber por pedido de venda.
- Rodapé ajustado para exibir `© logosoft v9.6.8`.
- Adicionado teste unitário de payload financeiro.

## v9.6.7

- Implementado módulo de Pedidos de Venda com endpoints reais do contrato v9.8.
- Criadas telas específicas de listagem, criação e detalhe do pedido.
- Criado client Axios para listar, buscar, criar, atualizar, adicionar/editar/remover itens, enviar para aprovação, aprovar, cancelar e faturar.
- Incluídos formulários de cabeçalho, itens, aprovação, cancelamento com motivo e faturamento.
- Aplicadas permissões VENDAS_CONSULTAR, VENDAS_GERENCIAR, VENDAS_APROVAR, VENDAS_CANCELAR e VENDAS_FATURAR.
- Aplicada melhoria nos selects de filial para limpar a filial quando a empresa muda e evitar reaproveitamento de lista antiga.
- Adicionados testes unitários para payloads de Vendas.

## v9.6.6

- Implementado módulo Estoque com endpoints reais do contrato v9.8.
- Criadas telas de locais, saldos, movimentos, entradas, saídas, ajustes, reservas e inventários.
- Adicionados dropdowns pesquisáveis de Empresa/Filial alimentados do banco via Administração.
- Atualizadas telas existentes de Administração, Segurança, Pessoas, Clientes, Fornecedores e Produtos para usar dropdown de empresa/filial onde o token já existe.
- Mantido payload enviando apenas referência técnica para `empresaId` e `filialId`.
- Adicionados schemas e builders de payload para Estoque.

## v9.6.5-buildfix

- Corrigido erro de typecheck em `fieldErrorMap` causado por `messages?.[0]` quando o retorno de `ZodError.flatten().fieldErrors` era inferido como `{}`.
- Aplicada a correção em Administração, Pessoas/Clientes/Fornecedores e Produtos para evitar regressão no build Docker/Next.js.
- Mantido Dockerfile sem `npm ci`.

## v9.6.5

- Implementado módulo Produtos / Catálogo com endpoints reais do contrato v9.8.
- Adicionados clientes Axios específicos para produtos, categorias, unidades de medida e marcas.
- Criadas telas específicas para produtos e cadastros auxiliares.
- Adicionados dados comerciais, preço/custo, dados fiscais protegidos por permissão, código de barras e vínculo com fornecedor.
- Inativação com motivo obrigatório para produto e cadastros auxiliares.
- Adicionados testes unitários de payloads de Produtos.

## v9.6.4

- Substituídas as telas genéricas de Pessoas, Clientes e Fornecedores por telas específicas usando o contrato real v9.8.
- Pessoas agora consome `GET/POST/PUT /api/pessoas` e `POST /api/pessoas/{id}/inativar`.
- Clientes agora consome `GET/POST/PUT /api/clientes`, bloqueio/desbloqueio de crédito e inativação.
- Fornecedores agora consome `GET/POST/PUT /api/fornecedores` e inativação.
- Implementado `CpfCnpjInput` nas pessoas, preservando CNPJ alfanumérico.
- Implementados schemas Zod, payload builders, hooks React Query e API clients específicos.
- Adicionados testes unitários para payloads de pessoa, cliente, fornecedor e motivos obrigatórios.
- Mantido Axios, sem `console.*`, Dockerfile sem clean install rígido e mock desligado por padrão.

## v9.6.3

- Substituídas as telas genéricas de Administração por telas específicas para empresas, filiais, setores, cargos e centros de custo.
- Implementados API clients reais para empresas, filiais, setores, cargos e centros de custo.
- Implementados payload builders com Zod e sanitização de referência técnica/string vazia.
- Implementados formulários com campos reais do contrato v9.8, incluindo diferença entre criação e atualização.
- Implementada inativação com motivo obrigatório via `ReasonDialog`.
- Bloqueada edição/inativação de registros cujo status retornado não seja Ativo.
- Adicionados filtros por `empresaId`, `filialId` e busca local conforme cada rotina.
- Atualizado `StatusTag` para suportar `EntityStatus` numérico retornado pelo backend.
- Adicionados testes unitários de payloads e teste de componente do formulário de Administração.

## v9.6.2

- Implementado refresh token real via `/api/auth/refresh`.
- Implementado logout real via `/api/auth/logout` com payload `{ refreshToken }`.
- Sessão local agora atualiza permissões retornadas no refresh.
- Criada tela real de usuários em `/seguranca/usuarios` usando `GET` e `POST /api/seguranca/usuarios`.
- Criado formulário de usuário com validação de referência técnica e payload conforme `CriarUsuarioRequest`.
- Grupos de acesso mantidos como placeholder controlado, sem inventar endpoints fora do contrato v9.8.
- Adicionados testes unitários de refresh de sessão e payload de usuário.

## v9.6.1

- Adicionados tipos base oficiais `Guid`, `IsoDateTime`, `ApiBusinessError`, `AspNetValidationError` e `LoginResponse`.
- Adicionados enums numéricos oficiais: `EntityStatus`, `TipoPessoa`, `TipoProduto`, `TipoItemFiscal`, `TipoMovimentoEstoque`, `StatusReservaEstoque`, `StatusInventario`, `TipoPedidoVenda`, `StatusPedidoVenda`, `OrigemFinanceira`, `StatusContaFinanceira`, `StatusParcelaFinanceira` e `StatusPedidoCompra`.
- Criado `lib/http/requestUtils.ts` com validação de referência técnica, sanitização de payload, limpeza de query params e conversão de datas.
- Criado `lib/api/healthApi.ts` usando `GET /api/health`.
- Atualizado `mapApiError` para reconhecer erros ASP.NET com `errors` por campo e erros de regra `{ code, message }`.
- Atualizado `httpClient` para enviar `Accept: application/json` e sanitizar payloads JSON antes da requisição.
- Atualizado `buildLoginPayload` para aceitar somente registro válido em `empresaId` e `filialId`, mantendo o manager sem esses campos.
- Atualizado `resourceClient` para não enviar `id` no body do `PUT`, converter busca global para `termo` e tratar `204 NoContent`.
- Adicionados testes unitários para `requestUtils` e `apiError`.
- Mantido Dockerfile sem clean install rígido.
- Mantido mock desligado por padrão.
- Mantida regra de não usar `console.*`.

## v9.6.0

- Corrigido normalizador da resposta de login para o contrato do backend com `accessToken`, `accessTokenExpiraEm`, `refreshToken`, `refreshTokenExpiraEm` e `permissoes`.
- Corrigida validação do `exp` do JWT usando segundos Unix multiplicados por 1000.
- Corrigido build blocker de narrowing no `authResponseMapper`.

## v9.5.0

- Corrigido payload real do login para o backend ASP.NET Core.
- O frontend envia `password` no login, e não `senha`.
- Para `manager@erp.local`, o payload final contém somente `email` e `password`.
- Campos `empresaId` e `filialId` vazios, `0` ou `99` são removidos antes da chamada `/api/auth/login`.
- `NEXT_PUBLIC_API_URL` padrão atualizado para `http://localhost:8080`.
- Adicionados testes unitários para montagem segura do payload de login.

## v9.4.0

- Axios definido como camada HTTP oficial da aplicação.
- Mock deixou de ser fluxo padrão.
- `NEXT_PUBLIC_USE_MOCK_AUTH=false` e `NEXT_PUBLIC_USE_MOCK_API=false` por padrão.
- Dockerfile alterado para `node:lts-alpine` com `npm install --no-audit --no-fund`.

## v9.3.0

- Correções iniciais de build e tipagem PrimeReact.
