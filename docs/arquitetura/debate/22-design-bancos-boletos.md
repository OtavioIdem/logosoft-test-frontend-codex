# Rodada 22 — posição de design system para Bancos / Boletos

## Posição

`/bancos/boletos` deve permanecer uma listagem operacional densa do padrão PrimeReact/Sakai,
com detalhe e histórico em diálogo. A ação primária da tela é **Gerar boleto**, mas ela deve
continuar visível e desabilitada enquanto não existir consulta de carteiras de cobrança com
rótulo operacional. O motivo da indisponibilidade fica visível na própria página; não se abre
diálogo incompleto e não se oferece campo para GUID.

O menor desenho útil é:

```text
PageHeader: Boletos                                      [Gerar boleto — desabilitado]
Aviso: geração indisponível porque falta consulta de carteiras de cobrança
[Empresa] [Filial] [Conta bancária] [Status] [Documento ou nosso número]
+--------------------------------------------------------------------------------+
| Documento / nosso número | Vencimento | Valor título | Valor pago | Status | ... |
+--------------------------------------------------------------------------------+
```

O cadastro bancário, CNAB e a futura habilitação da geração não entram neste desenho.

## Evidência do padrão vigente

- `features/bancos/components/BoletosPage.tsx:70-98` já usa `PageHeader`,
  `EmpresaFilialFilter`, `SearchInput`, `DataTableServer`, `DataTableActions`, `ApiErrorPanel` e
  `EmptyState` na composição esperada para uma listagem do ERP.
- `features/financeiro/components/ContasFinanceirasPage.tsx:123-134` confirma no módulo irmão o
  padrão de cabeçalho, contexto empresa/filial, tabela densa, ações de linha e `ReasonDialog`.
- `features/bancos/components/BancosOperacoesDialogs.tsx:98-120` já mantém detalhe e histórico
  dentro de um diálogo responsivo; o formato cabe no PrimeReact sem biblioteca ou template novo.
- `components/data/DataTableActions.tsx:20-49` já resolve ações inline em desktop e menu de
  overflow no mobile.
- `components/feedback/ReasonDialog.tsx:24-44` já resolve motivo obrigatório, estado de envio,
  aviso, erro e contador; o cancelamento deve reutilizá-lo com o limite contratual de 300
  caracteres.

O preview de `http://localhost:3000/bancos/boletos` foi tentado, mas a superfície do navegador
não retornou a árvore da aplicação. A posição visual foi, portanto, conferida no código vigente e
nos componentes irmãos; validação visual real em 1280 px e 768 px continua como gate da fatia.

## Padrão proposto por elemento

### Cabeçalho e geração indisponível

- Título `Boletos` e descrição curta, sem repetir explicação de contrato.
- Um único botão primário `Gerar boleto`, com ícone PrimeIcons, no `PageHeader`.
- Enquanto faltar o lookup de carteiras, o botão fica desabilitado e imediatamente associado a
  uma `Message severity="warn"` visível: `Geração indisponível: ainda não é possível selecionar
  uma carteira de cobrança pelo sistema.`
- O aviso não deve afirmar que o endpoint de geração está ausente; o impedimento é a seleção
  segura da carteira.
- O diálogo `GerarBoletoDialog` não fica alcançável nesse estado. Campo de GUID, lista fixa ou
  opção simulada são proibidos.
- Quando o backend oferecer a consulta legível, o gatilho de revisita é habilitar o diálogo
  existente e apresentar os `alertas` retornados pelo envelope de geração como `Message` de
  aviso persistente após o sucesso, nunca apenas como toast nem como confirmação de homologação
  bancária.

### Filtros

- Contexto obrigatório em primeiro lugar: empresa e filial, usando `EmpresaFilialFilter`.
- A consulta só assume estado carregável depois de empresa selecionada; antes disso, a área da
  tabela orienta `Selecione uma empresa para consultar boletos.`
- Conta bancária entra como seleção legível somente se houver opções por API já disponíveis no
  recorte; nunca como ID digitável. Se a fonte legível não estiver disponível nesta fatia, o
  filtro fica fora da composição, sem bloquear os filtros válidos.
- Status usa `Dropdown` com `Todos os status` e os quatro rótulos já existentes: Gerado, Em
  remessa, Liquidado e Cancelado.
- Busca textual local usa `SearchInput` com rótulo `Buscar por documento ou nosso número`.
- Em 1280 px os filtros podem ocupar uma linha; em 768 px e abaixo empilham em largura total.

### Listagem

- A tabela fica em um único `Card`, com `size="small"`, linhas listradas e rolagem horizontal
  apenas no contêiner da tabela.
- Ordem mínima das colunas: `Documento / nosso número`, `Vencimento`, `Valor do título`, `Valor
  pago`, `Status`, `Ações`.
- Documento e nosso número não devem competir em duas colunas estreitas: o documento é o texto
  principal e o nosso número aparece abaixo em texto secundário. Não usar fragmento do GUID como
  rótulo de fallback; quando ambos faltarem, mostrar `Sem identificação operacional`.
- Valores monetários ficam alinhados à direita; status usa `Tag` com texto, sem depender apenas da
  cor.
- `Abrir` é a ação neutra permanente. `Cancelar` é destrutiva e só aparece quando a camada de
  aplicação informar elegibilidade; o backend continua sendo a autoridade da transição.
- Em telas menores, vencimento e valor pago podem ceder espaço antes de documento, valor do
  título e status. As ações usam o menu mobile já fornecido por `DataTableActions`.

### Detalhe e histórico

- O detalhe permanece em `Dialog` modal com largura máxima de 56 rem e 98 vw, sem criar rota ou
  drawer novo.
- Cabeçalho do diálogo: `Boleto — <documento>` e `Tag` de status. Se não houver documento, usar
  nosso número; nunca o GUID.
- Primeiro bloco, em grade: valor do título, valor pago, emissão, vencimento, liquidação, nosso
  número e documento. Datas ausentes aparecem como `—`.
- Segundo bloco, largura total: linha digitável e código de barras somente leitura, fonte
  monoespaçada e quebra controlada para não alargar a página.
- `contaReceberId`, `parcelaReceberId` e `carteiraCobrancaId` permanecem internos. Enquanto o
  contrato não entregar rótulos operacionais, não são apresentados como informação ao operador.
  Esta posição diverge do destino técnico sugerido no inventário e aplica a diretriz global de
  não expor identificadores de vínculo.
- O aviso de cálculo/layout bancário continua imediatamente antes do histórico e deve dizer que a
  informação precisa de validação contra o banco real; a UI não afirma homologação.
- O histórico fica no próprio diálogo, em tabela pequena com `Data`, `Transição`, `Observação` e
  `Usuário` quando disponível. Transição mostra texto `Anterior → Novo`; observação vazia usa `—`.
- Falha do histórico aparece dentro do diálogo via `ApiErrorPanel`, com tentativa de recarregar;
  não deve virar toast perdido atrás do modal.

### Cancelamento

- O cancelamento parte da ação da linha e pode ser repetido no rodapé do detalhe quando elegível,
  sempre com severidade destrutiva.
- A confirmação usa o `ReasonDialog` compartilhado com título que identifique o boleto por
  documento ou nosso número, `maxLength={300}` e texto de auditoria já existente.
- Erro da tentativa fica dentro do diálogo. Sucesso fecha a confirmação, atualiza listagem,
  detalhe e histórico, e mostra toast curto `Boleto cancelado`.
- Quando o boleto não puder ser cancelado, o detalhe exibe a razão operacional junto ao status;
  não oferece botão inerte sem explicação.

## Sete estados obrigatórios

| Estado | Listagem | Detalhe / histórico | Cancelamento / geração |
| --- | --- | --- | --- |
| `loading` | `DataTableServer` com carregamento, preservando filtros | diálogo abre com conteúdo de carregamento; histórico tem loading próprio | botão confirma com loading e bloqueia fechamento acidental |
| `vazio` | antes da empresa: orientação de contexto; depois da consulta: `EmptyState` | histórico: `Nenhum evento registrado.` | não se aplica à geração bloqueada |
| `erro recuperável` | `ApiErrorPanel` com nova tentativa, sem apagar filtros | erro do detalhe ou histórico dentro do diálogo | erro do cancelamento dentro do `ReasonDialog` |
| `erro bloqueante` | painel de erro no lugar da tabela quando não há contrato utilizável | diálogo não exibe valores parciais como verdade | geração continua fechada; não monta payload incompleto |
| `sucesso` | tabela carregada com identificação operacional | dados e histórico coerentes | toast curto; alertas de geração futuros ficam persistentes |
| `permissão negada` | `UnauthorizedState` para consulta | não abre conteúdo protegido | ações seguem permissões existentes, sem propor código novo |
| `ação indisponível com motivo` | aviso persistente de geração | razão do cancelamento indisponível junto ao status | botão Gerar visível e desabilitado, com motivo visível |

## Responsividade e acessibilidade

- Validar em 1280 px e 768 px. A página nunca cria rolagem horizontal; apenas a tabela pode
  rolar dentro do `Card`.
- Filtros preservam rótulo acessível; placeholder não substitui `label` ou `aria-label`.
- Botão apenas com ícone exige `aria-label`; ações com texto continuam preferíveis no desktop.
- Estados não dependem só de cor: `Tag`, `Message` e botões mantêm texto explícito.
- Foco retorna à ação de origem ao fechar detalhe ou confirmação; `Escape` fecha apenas quando
  não há mutação em andamento.
- Linha digitável e código de barras quebram dentro do diálogo e continuam selecionáveis por
  teclado, sem truncamento que esconda dígitos.

## Fronteira entre compartilhado e módulo

Nenhum componente compartilhado novo entra nesta rodada. Já existem componentes para cabeçalho,
filtros organizacionais, busca, tabela, ações, erro, vazio, permissão e motivo. A composição
`BoletosPage`, o detalhe e a apresentação do histórico continuam em `features/bancos/components`:
este é um caso de domínio, não o terceiro consumidor de um padrão novo.

Não proponho alterar `StatusHistoryPanel`: o contrato de histórico de boleto usa campos e
transição específicos, e adaptá-lo agora criaria uma abstração para um único consumidor.

## Dívida visual e custo

- **Fecha nesta tela:** o erro do histórico deixa de ser um toast invisível sob o modal; a
  geração passa de aviso solto para ação indisponível com motivo; identificadores técnicos deixam
  de competir com dados operacionais.
- **Não cria divergência sistêmica:** são reutilizados 9 componentes compartilhados existentes e
  são criados 0 componentes compartilhados.
- **Dívida mantida:** `DataTableActions` não possui hoje uma propriedade de motivo para ação
  desabilitada. Esta rodada não amplia o componente por existir apenas um caso confirmado no
  recorte. Gatilho: ao terceiro fluxo exigir ação de linha desabilitada com explicação acessível,
  revisar o compartilhado. Custo estimado de alinhamento futuro: 1 componente compartilhado e os
  consumidores que então adotarem a nova propriedade; não há medição desses consumidores nesta
  rodada.

## O que eu abro mão

- Abro mão de página dedicada, abas, cards de indicadores, drawer, cópia em um clique e qualquer
  painel de conciliação/CNAB. Eles aumentam o recorte sem resolver consulta, detalhe, histórico e
  cancelamento.
- Abro mão de habilitar geração só porque `POST /gerar` existe. Sem seleção legível da carteira,
  habilitar a ação transfere um vínculo técnico ao operador e viola a regra global de entidades.
- Abro mão de transformar o histórico de boleto em componente compartilhado. O gatilho de
  revisita é um terceiro histórico com o mesmo contrato visual e semântico.

```json
{
  "agent": "arquiteto-design-system",
  "node": "projeto",
  "assunto": "bancos-boletos",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/22-design-bancos-boletos.md",
  "decisoesPropostas": [
    {
      "id": "D22-DES-1",
      "titulo": "Manter Boletos como listagem densa com detalhe e historico em dialogo",
      "reversivel": true,
      "gatilho": "terceiro fluxo bancario exigir detalhe persistente em rota propria"
    },
    {
      "id": "D22-DES-2",
      "titulo": "Exibir Gerar boleto desabilitado com motivo ate existir lookup legivel de carteira",
      "reversivel": true,
      "gatilho": "backend disponibilizar consulta de carteiras de cobranca com rotulo operacional"
    },
    {
      "id": "D22-DES-3",
      "titulo": "Nao expor GUIDs de vinculos no detalhe do boleto",
      "reversivel": true,
      "gatilho": "contrato passar a entregar os rotulos operacionais das entidades vinculadas"
    }
  ],
  "discordancias": [
    {
      "de": "inventariante-contrato-tela",
      "ponto": "exibir contaReceberId, parcelaReceberId e carteiraCobrancaId no detalhe tecnico",
      "impacto": "alto"
    }
  ],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Quando existira consulta de carteiras de cobranca com rotulo operacional?",
      "decide": "quando o botao Gerar boleto deixa o estado indisponivel"
    },
    {
      "tipo": "validacao",
      "pergunta": "A composicao aprovada se mantem sem overflow e com foco correto em 1280 px e 768 px?",
      "decide": "aceite visual e acessivel da fatia"
    }
  ],
  "riscos": [
    "O preview local nao expôs a arvore da aplicacao; a validacao visual real permanece pendente.",
    "Sem motivo contextual no detalhe, ocultar o cancelamento em status inelegivel pode parecer perda de permissao."
  ]
}
```
