# Plano de onda — Operação: o anexo de melhorias vira entrega

Origem: anexo **"Melhorias e Implementações"** colado pelo usuário em 2026-09-18,
cobrindo ~45 telas. O arquivo original está em
`~/.codex/attachments/e7316e48-44b1-4e72-9c34-76d42b15ec08/Texto colado.txt`.

O Codex produziu três saídas sobre ele em 2026-09-18 (inventário, plano e posição
de operação), nas sessões `rollout-2026-09-18T14-59-12`, `15-07-43` e `15-16-56`
de `~/.codex/sessions/2026/09/18/`. A rodada ficou incompleta: `plataforma` foi
interrompido, `design` e `escopo` não rodaram, e nada foi arbitrado.

Este documento é a arbitragem. Ordem travada na **D56**.

## Por que este arquivo existe

O roteiro viveu só na conversa entre 2026-09-18 e 2026-09-21. Nesse intervalo a
`b58.c3` foi escrita, executada e bloqueada citando `b62` a `b69` como destino de
oito itens — destinos que nenhum arquivo definia. `docs/fatias/README.md` já
registra o que isso custou na onda F1; não custa de novo.

## O que NÃO está aqui

A sequência fiscal `b59`–`b61` é governada pela **D53** e não se replaneja:
naturezas de operação + CFOP, endereços da Pessoa, bloco fiscal da Pessoa. A nota
só valida ponta a ponta depois da `b61`. Nenhum item deste anexo entra nelas.

A `v1.11.0a8b58.c3` (contratos de request) tem plano próprio em
`docs/fatias/v1.11.0a8b58.c3-contratos-de-request.md` e está **em execução**.

## Regime de evidência desta onda

Três regras vieram de defeito medido nesta esteira, não de preferência:

1. **O Swagger não é fonte suficiente.** Ele não publica schema de resposta em
   nenhuma das 580 operações e erra anulabilidade de enum — declara `Crt?` e
   `TipoItemSped?` como `$ref` sem `nullable`. Nome de membro e anulabilidade
   vêm do `?` na assinatura C# em `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`.
   **Correção de 2026-09-21**: uma versão anterior deste documento afirmava que
   a API devolvia `regimeTributario` como `"LucroPresumido"`. É falso. O JSON
   trafega **número** nos dois sentidos — não existe `JsonStringEnumConverter`
   no backend (`Program.cs:28`, `AddControllers` sem `.AddJsonOptions`) e
   `AdministrationMapper.cs:12` passa o enum direto. A coluna `varchar` do banco
   é `HasConversion<string>()` do EF (`EmpresaConfiguration.cs:19`), conversor de
   **persistência**: armazenamento não é serialização. Tratar as 156 colunas de
   texto como indício de JSON em texto produziu uma correção errada, duas
   reconstruções de imagem e uma reversão.
2. **Tela que "parece certa" não é medição.** O AC-8 da `c3` foi relatado como
   aprovado e o banco refutou: nada havia sido gravado. Comportamento se confirma
   em `UpdatedAt`, em `auditoria_eventos` e no log do backend.
3. **Teste verde pode estar defendendo o defeito.** Três instâncias na `c3`:
   `segurancaUsuarioPayload` afirmando payload que o backend nunca aceitou, o
   guard da B37 travando `codigoProdutoFornecedor`, e uma tautologia que montava
   o objeto à mão sem chamar o builder. Registrado como ACH-5.

## A sequência

| Versão | Entrega | Depende de |
| --- | --- | --- |
| `b59`–`b61` | sequência fiscal — **D53**, não se replaneja | D47–D53 |
| `b62` | Header e navegação sem prometer o que não existe | nada |
| `b63` | Pessoa vinculada na admissão do colaborador — **reduzida pela D57** | nada |
| `b64` | Empresa, filial e endereço fiscal completos | `b60`–`b61` |
| `b65` | Produto: campos fiscais — **reduzida pela D58** | `b64` |
| `b66` | Cliente (configuração comercial) e Fornecedor (configuração de compra, homologação) — **D62–D67** | `b65` |
| `b67` | Classificações de Pessoa: cadastro e seletor no Cliente — **D65** | `b66` |
| `b68` | Estoque transacional e auditável | `b65`, B-3 |
| `b69` | Venda, preço e aprovação até a liberação | `b65`–`b68`, B-5 |
| `b70` | Compra e financeiro com origem e reversão explícitas | B-4, B-12 |
| `b71` | Faturamento completo e corrigível | `b59`–`b70`, B-6 |
| — | PDV com leitura de código de barras | **bloqueado**: B-7 |

**Reindexação da D67 (2026-09-23)**: Cliente/Fornecedor e Classificações de Pessoa entram antes do
Estoque, pela ordem da D56 (cadastro antes de transação). Estoque, Venda, Compra e Faturamento
andaram duas posições (`b66`–`b69` → `b68`–`b71`). Nenhum plano de fatia nem entrada de CHANGELOG
citava os números antigos — medido pela posição de escopo da rodada 08.

### `b62` — Header e navegação

- Perfil somente leitura com o que `/api/auth/me` entrega. **Não** há endpoint de
  edição de perfil nem de preferências; nada de persistência local fingindo
  configuração corporativa.
- Logout com severidade destrutiva.
- Estados de erro e indisponibilidade do sino. As notificações **já estão
  implementadas e integradas** (`layout/AppTopbar.tsx:75`) — o anexo pedia algo
  que existe.
- Remover "Bloqueios" do menu (`layout/AppMenu.tsx:95`), preservando a rota, que
  hoje só redireciona para `/estoque/avancado`. `accessRisk: ILUSAO` — quem tem
  apenas `ESTOQUE_MOVIMENTAR` clica e cai numa tela que talvez não possa abrir.

### `b63` — a Pessoa na admissão — **reduzida pela D57**

- `pessoaId` por autocomplete na admissão (`AdmitirColaboradorRequest` aceita,
  a UI não envia). É o que sobrou, e é verdadeiro.

**Cargos de acesso saíram.** O inventário
(`docs/arquitetura/debate/06-inventario-cargos-de-acesso.md`) provou que as duas
cadeias de autorização são disjuntas: o guard lê `UsuarioGrupoAcesso →
GrupoAcesso.Permissoes` (`UsuarioRepository.ObterCodigosPermissoesAsync:75`,
que alimenta o claim do JWT), enquanto `permissoes-efetivas` calcula por
`UsuarioCargoAcesso` (`CargosAcessoRepository:107`). O guard nunca lê a segunda.
Atribuir cargo não concede nada, e uma tela que sugere o contrário ensina um
modelo mental que faz alguém remover o grupo achando que o cargo cobre. Virou
**B-9**.

Criação de usuário que já atribui grupo continua fora, dependendo de **B-1**.

### `b64` — Empresa e filial

- `crt` em criar e atualizar (a `c3` levou só `regimeTributario` e o
  `contribuinteIpi` da criação).
- `contribuinteIpi` no atualizar — `bool?`, onde `null` significa "mantém".
- Endereço fiscal de empresa e de filial.

### `b65` — Produto (fiscal) — **reduzida pela D58**

Rodada de arquitetura `07-produtos-fiscais` (`docs/arquitetura/debate/07-*-produtos-fiscais.md`,
inventário em `docs/fatias/v1.11.0a8b65-inventario.md`) fechou o recorte real, menor do que este
documento previa: Cliente e Fornecedor **saem** de `b65` por falta de inventário próprio (D58) —
ver "Fora de escopo, com gatilho" abaixo, sem número reservado.

- Campos fiscais restantes do produto: `unidadeTributavelSigla`, `exTipi`,
  `codigoBeneficioFiscalPadrao`, `descricaoFornecedor` — e `tipoItemSped` como controle de edição
  novo (D59; a `v1.11.0a8b64.c2` já tinha feito o campo trafegar, só faltava o input).
- Dois seletores de "unidade tributável" com rótulos distintos, nunca fundidos (D60).
- Guarda de `FISCAL_CADASTROS_CONSULTAR` escopada ao campo novo, não à aba inteira (D61).
- **Não entra**: `PUT /api/clientes/{id}/configuracao-comercial`, configuração de compra e
  homologação/revogação de fornecedor — foram para a `b66` depois do inventário da rodada 08.
- Código de cliente e fornecedor **continua manual**: não existe geração atômica,
  e incrementar no frontend cria duplicidade por concorrência (mantido do plano original).

### `b66` — Cliente e Fornecedor — **D62–D67**

Rodada `08-cliente-fornecedor` (`docs/arquitetura/debate/08-*-cliente-fornecedor.md`).

- Aba "Comercial" no `ClienteFormDialog` e aba "Compra" no `FornecedorFormDialog`, gravando pelo
  `PUT` de configuração depois do cadastro base, sob um único Salvar (D62).
- O bloco de configuração é substituído inteiro pelo backend — `null` apaga. Formulário parte do
  registro gravado e reenvia o bloco todo; schema com `.nullable()`, booleano obrigatório (D62).
- Homologar (confirmação) e revogar homologação (motivo) como ações de linha, coluna "Homologado"
  na listagem de Fornecedores (D63).
- Tabela de preço e condição de pagamento: guarda de permissão por campo, rótulo neutro quando o
  nome não pode ser resolvido, um aviso por aba (D66).
- `classificacaoId` só trafega (lido e reenviado); o seletor vem na `b67` (D65).
- Gate de contratos de request passa a cobrir `ConfigurarComercialClienteRequest` e
  `ConfigurarCompraFornecedorRequest` (D67).
- **Não entra**: `GET .../situacao-compra` (D64 — o pedido de compra não recusa fornecedor não
  homologado; a tela afirmaria uma regra que não existe; gatilho B-12).

### `b67` — Classificações de Pessoa — **D65**

- Cadastro de Classificações de Pessoa (código, nome, descrição, inativar) sobre o CRUD que o
  backend já tem (`ClassificacoesPessoaController`, `CLASSIFICACOES_PESSOA_GERENCIAR`). Rota, item
  de menu e guarda novos: o inventário da fatia precisa conferir a permissão de consulta.
- Seletor de `classificacaoId` no Cliente, alimentado por esse catálogo.

### `b68` — Estoque (era `b66`, D67)

- Entrada, Saída e Histórico em abas sobre as rotas que já existem. São operações
  distintas, com payload, permissão e confirmação próprios — abas são organização
  de UX, não fusão de operação.
- `origemId` e `documento` na transferência.
- Origem do ajuste como dropdown **só com catálogo publicado** (B-3). Hardcode no
  frontend apenas disfarça texto livre.

### `b69` — Venda, preço e aprovação (era `b67`, D67)

- Diagnóstico autenticado de Tabelas de preço **antes** de qualquer outra coisa.
  Ver `v1.11.0a8b58.c4`.
- Fila de pedidos pendentes com listagem e detalhe sob demanda.
- Aprovação com resumo e confirmação.
- **Não entra**: "reprovar" (não existe operação; cancelar não é reprovar) e
  "copiar pedido" (sem endpoint atômico, a cópia no browser reaproveita preço e
  tributação vencidos).

### `b70` — Compra e financeiro (era `b68`, D67)

- Origem do título visível: manual, venda, compra ou nota.
- Caminhos de compra explicados pela origem — pedido direto, solicitação
  aprovada, cotação escolhida. O backend **permite pedido direto**; impor
  obrigatoriedade na tela é opinião, e a regra precisa vir do backend (B-4).
- Lançamento manual preservado.

### `b71` — Faturamento (era `b69`, D67)

- `naturezaOperacaoId` (depende da `b59`), `correlationId` gerado e somente
  leitura.
- UF, CFOP e unidade comercial como dropdown sobre os catálogos existentes; hoje
  são `InputText` (`FaturamentoDialogs.tsx:104`).
- Layout da modal ampliado — **depois** do contrato, não antes.
- `certificateThumbprint` fica fora até existir fonte segura (B-6). Nunca expor
  segredo de certificado em campo digitável.

## Fora de escopo, com gatilho

| Item do anexo | Por quê | Gatilho |
| --- | --- | --- |
| Usuário criado pelo RH / vínculo colaborador | não existe `colaboradorId` no usuário nem `usuarioId` no colaborador; senha temporária é backend | contrato de provisionamento (B-2) |
| Código incremental de cliente/fornecedor | incrementar no frontend duplica por concorrência | geração atômica no backend |
| Copiar pedido | sem endpoint atômico, cópia parcial | endpoint de clonagem |
| Reprovar pedido | não existe a operação; cancelar é outra coisa | operação própria (B-5) |
| Código de barras no PDV | o PDV recebe `produtoId`; varrer catálogo no browser não é solução | busca indexada (B-7) |
| Setor ↔ centro de custo | não está no contrato do setor | vínculo + regra de vigência |
| Obrigar solicitação/cotação antes da compra | o backend permite pedido direto | regra no backend, por empresa/filial (B-4) |
| Editar perfil e preferências | Auth só expõe login, me, refresh, logout | endpoint de perfil |
| Simulador, regras fiscais, exceções, observabilidade, inutilizações | já implementados; o anexo diz "não consegui usar" | revisão de estados, permissão e dados mínimos — não é código novo |
| Situação de compra do fornecedor (`GET .../situacao-compra`) | o pedido de compra não recusa fornecedor não homologado; a tela afirmaria uma regra inexistente (D64) | resposta a B-12 |
| Tela do parâmetro `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO` | nenhuma tela administra parâmetros de sistema hoje | resposta a B-12, ou onda própria de parâmetros |

## As perguntas que destravam a onda

Consolidadas das três saídas do Codex, deduplicadas. São o item de maior
alavancagem e andam em paralelo com a `c3` e a `b59`.

| Id | Pergunta | Destrava |
| --- | --- | --- |
| B-1 | Precedência entre grupo direto, cargo de acesso e acesso pessoal. Existe negação explícita ou só união? | `b63` |
| B-2 | Haverá vínculo persistente Colaborador↔Usuário e convite/senha temporária por e-mail? | `b63` |
| B-3 | Quais valores válidos para `origemModulo`? Haverá catálogo? | `b68` (era `b66`) |
| B-4 | Qual evento gera título de venda/compra, e qual a política idempotente de estorno após baixa? Pedido direto continua permitido? | `b70` (era `b68`) |
| B-5 | Existe ação de reprovar pedido? Qual o padrão de `reservarEstoque` na aprovação rápida? | `b69` (era `b67`) |
| B-6 | Como o faturamento obtém o certificado sem expor `certificateThumbprint`? | `b71` (era `b69`) |
| B-7 | Haverá busca exata de produto por código de barras? | PDV |
| B-8 | **O OpenAPI vai publicar schema de resposta?** Sem isso o Swagger não tipa leitura, e nenhum gate prova o lado da resposta. | toda a onda |
| B-9 | **Cargo de acesso vai passar a governar acesso?** Hoje o guard lê só `UsuarioGrupoAcesso`; `UsuarioCargoAcesso` é ignorado por ele. Unificar as cadeias, ou declarar que cargo é outra coisa? | tela de cargos (D57) |
| B-10 | O 400 de `CadastrosFiscaisErrors.UnidadeMedidaTributavelObrigatoria` (R6 — `unidadeTributavelSigla` diverge da unidade comercial sem `unidadeMedidaTributavelId` informado) tem corpo de erro mapeável a um campo específico, ou é validação de domínio genérica sem `field`? | `b65` (aviso inline vs. toast pós-submit) |
| B-11 | Existe ou está prevista rota de atualização do vínculo `ProdutoFornecedor` (editar `descricaoFornecedor`/`codigoFornecedor` depois de criado)? Hoje só existe criação, recusada se o vínculo já existe. | `b65` (caminho de correção do vínculo de fornecedor, hoje sem solução possível na UI) |
| B-12 | A recusa de pedido de compra para fornecedor não homologado (parâmetro `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`) vai para dentro da criação do pedido, ou `situacao-compra` é deliberadamente só consultivo? Hoje nenhum use case de Pedido de Compra lê `Homologado`. | `situacao-compra` (D64) e `b70` |

## Correções fora da sequência funcional

| Versão | O quê | Estado |
| --- | --- | --- |
| `v1.11.0a8b58.c3` | 15 campos de request sem par, mais 3 fantasmas de response e o enum `RegimeTributario` | em execução — QA `BLOCKED`, AC-5 a AC-8 sem medição |
| `v1.11.0a8b58.c4` | "Tabela de preços não carrega" — `TabelasPrecoPage.tsx:53` nunca envia `empresaId`/`filialId`, e manda `termo`, que o endpoint não declara | hipótese, aguarda medição autenticada |
| rodada **05** | a forma dos enums: 449 membros numéricos no frontend contra 156 colunas de texto no banco | `arquitetura`, inventário em andamento |
