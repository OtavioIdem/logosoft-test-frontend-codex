# Escopo e entrega — Bancos / Boletos

Agente: `arquiteto-escopo-entrega`. Rodada de arquitetura 22, assunto
`bancos-boletos`. Insumo: `docs/arquitetura/debate/22-inventario-bancos-boletos.md`.
Esta é uma posição de escopo; não arbitra a rodada e não autoriza implementação.

## Base fixada e marco

```text
$ node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
1.11.0-a.8.b76
1.11.0a8b76
```

A `b76` está aprovada e em `release` (`docs/fatias/v1.11.0a8b76-fiscal-v124-validacoes.md`,
seção 9). A `b77` já está atribuída ao plano da Central de Cadastros
(`docs/arquitetura/debate/21-plano-central-cadastros.md`). Portanto, **Boletos não disputa a
`b77`**: sua primeira versão nominal é `b78`, somente depois de a `b77` fechar. Se a `b77` for
bloqueada, qualquer corretiva `b77.cN` vem antes da `b78`.

O marco desta rodada é tornar `/bancos/boletos` operacional para **consultar, detalhar, auditar e
cancelar** boletos usando o contrato real do backend, sem liberar geração por GUID digitado e sem
prometer homologação bancária.

Não foi informada data-limite. A sequência prioriza integridade financeira e capacidade de prova.

## Posição resumida

O menor corte seguro é uma única fatia funcional para corrigir o contrato consumido e fechar o
fluxo observável:

```text
Empresa selecionada
→ consulta de boletos
→ filtro e busca local
→ detalhe
→ histórico
→ cancelamento com motivo
→ atualização da consulta
```

A geração fica **depois**, bloqueada pela ausência de um `GET` de carteiras de cobrança com
identificação legível. O `POST /api/bancos/boletos/gerar` existir não fecha o fluxo: seu request
exige `carteiraCobrancaId`, e aceitar GUID livre criaria dado financeiro sem origem verificável.

## Linha de corte

### Dentro — primeira fatia segura (`b78`, nominal)

1. Corrigir os tipos do boleto para o contrato real: `nossoNumero` numérico; `dataEmissao` e
   `dataLiquidacao`; retorno de geração como envelope `{ boleto, alertas }`; filtros com
   `empresaId` obrigatório e `contaBancariaId` opcional no contrato.
2. Não iniciar a consulta sem empresa selecionada. `filialId` e `status` permanecem filtros
   opcionais; a tela explica por que a consulta está indisponível antes da seleção de empresa.
3. Remover `termo` do request. Busca por documento ou nosso número ocorre localmente sobre a
   coleção recebida, sem inventar query que o backend não aceita.
4. Listagem com, no mínimo, número do documento, nosso número, vencimento, valor do título,
   valor pago, status e ações. Valor ausente não é apresentado como pagamento zero.
5. Detalhe somente leitura com os campos do `BoletoResponse`, inclusive linha digitável, código
   de barras, emissão, liquidação e identificadores de vínculo quando necessários para suporte.
6. Histórico com carregamento, vazio e erro próprios; falha no histórico não vira apenas toast
   solto nem apaga o detalhe já carregado.
7. Cancelamento para quem possui `BOLETOS_CANCELAR`, com confirmação, motivo obrigatório de 1 a
   300 caracteres, retorno de erro recuperável e reconsulta após sucesso. O backend continua
   autoridade final sobre a transição de status.
8. A ação de gerar aparece como indisponível, com motivo contextual, somente para quem possui
   `BOLETOS_GERAR`: falta consulta de carteiras. Ela não abre diálogo com GUID livre e não chama o
   `POST /gerar` nesta fatia.
9. Os sete estados são piso: carregando, vazio, erro recuperável, erro bloqueante, sucesso,
   permissão negada e ação indisponível com motivo.
10. Registrar as cinco rotas de Boletos no mapa auditável de contrato e protegê-las com teste de
    contrato/gate nominal. A exceção existente para ausência de `GET` de carteiras continua
    explícita; não é removida para obter verde.
11. Testes de unidade/componente para query, tipagem, valores monetários, detalhe, histórico,
    cancelamento e ação de geração bloqueada; E2E isolado do fluxo consulta → detalhe → histórico
    → cancelamento; gates usuais e QA independente.
12. Preservar as permissões atuais: `BANCOS_CONSULTAR`, `BOLETOS_GERAR` e
    `BOLETOS_CANCELAR`. Não criar nem ampliar permissão.

### Fora

1. **Backend, DTOs ou regras de geração/cancelamento.** A rodada corrige o consumidor frontend.
   **Gatilho de volta:** divergência comprovada que não possa ser representada pelo contrato atual
   e seja aceita em rodada própria do backend.
2. **CNAB, remessa, retorno, baixa ou conciliação.** São fluxos financeiros distintos e não
   aparecem entre as cinco rotas inventariadas. **Gatilho de volta:** inventário próprio de ponta a
   ponta, incluindo idempotência e auditoria.
3. **Cadastro de bancos, contas, convênios ou carteiras.** O pedido é a estrutura de Boletos e a
   fronteira do briefing os exclui. **Gatilho de volta:** contratos GET/CRUD utilizáveis e rodada
   específica de cadastros bancários.
4. **Filtro visual por conta bancária sem fonte legível.** Embora o backend aceite
   `contaBancariaId`, não se aceita GUID digitado. **Gatilho de volta:** consulta real de contas
   bancárias que entregue rótulo e vínculo organizacional para seleção.
5. **Nova permissão, alteração de menu ou mudança de guard.** A rota e as permissões já existem.
   **Gatilho de volta:** perda de acesso comprovada ou requisito explícito de segregação.
6. **Afirmação de homologação bancária.** O backend informa cálculo best-effort e exige validação
   do banco. **Gatilho de volta:** homologação formal por banco/carteira, com evidência operacional.
7. **Download, impressão ou envio de boleto.** Não há endpoint inventariado para arquivo ou
   transmissão. **Gatilho de volta:** contrato específico e regra de autorização/auditoria.

### Depois

1. Geração de boleto, na primeira versão funcional disponível **após** existir `GET` de carteiras
   de cobrança. A tela seleciona uma carteira legível, envia os quatro campos do request, consome
   `{ boleto, alertas }`, mostra cada alerta e reconsulta a listagem. Essa versão não recebe número
   enquanto o pré-requisito estiver ausente.
2. Filtro por conta bancária, depois de existir fonte de opções legíveis; o campo opcional do
   contrato pode ser tipado na `b78`, mas não vira controle com GUID livre.
3. Ações de copiar linha digitável/código de barras, exportar ou imprimir, após o fluxo essencial
   estar medido e existir contrato para cada saída. São conforto, não pré-requisito do marco.

## Sequência de entrega

### `b78` — contrato real, consulta e cancelamento

Dependências: `b77` aprovada; contrato das cinco rotas de Boletos registrado; empresa disponível no
contexto antes da consulta. Não depende do `GET` de carteiras porque a geração permanece bloqueada.

Entrega observável: operador consulta os boletos da empresa, busca e filtra, abre detalhe e
histórico, cancela com motivo e vê a tela atualizar. Quem pode gerar enxerga a indisponibilidade e
o motivo, sem campo de GUID.

Gates mínimos:

- mapa nominal das cinco rotas e permissões;
- teste do envelope `{ boleto, alertas }`, ainda que o `POST` não seja chamado pela tela;
- teste de que `empresaId` bloqueia a consulta e `termo` não vai à API;
- teste monetário que distingue `null` de zero;
- componente dos sete estados, histórico e cancelamento;
- E2E isolado do caminho observável, `validate:source`, `typecheck`, `lint`, `validate:ci`, build e
  QA.

### Primeira `bNN` após o `GET` de carteiras — geração

Dependências: `GET` de carteiras documentado, tipado, protegido por permissão e capaz de fornecer
identificador mais rótulo suficiente para o operador escolher sem digitar GUID. A `b78` precisa
estar aprovada; se estiver bloqueada, entra corretiva antes.

Entrega observável: seleção da origem financeira, geração do boleto, apresentação dos alertas do
backend, detalhe do boleto gerado e atualização da lista. A versão não afirma homologação.

Gates adicionais: contrato da consulta de carteiras, componente de seleção/alertas, E2E de sucesso
e falha de geração, e prova de que nenhum GUID livre é aceito.

## Trade-offs aceitos

| Corte | O que se perde | Quando dói | Reversível? |
|---|---|---|---|
| Entregar consulta/cancelamento antes da geração | O operador ainda gera boleto por outro meio | Ao tentar iniciar uma cobrança nova | Sim; a ação volta quando o GET de carteiras existir |
| Exibir geração indisponível com motivo | A tela evidencia uma lacuna do backend | Para usuário com `BOLETOS_GERAR` | Sim; o mesmo ponto vira ação quando a dependência fechar |
| Busca textual local | Não encontra item fora da coleção recebida | Se o volume futuro exigir paginação no servidor | Sim; volta ao backend quando houver query/paginação contratada |
| Não expor filtro por conta bancária | Menos precisão na consulta inicial | Empresas com muitas contas e muitos boletos | Sim; entra quando houver seletor legível |
| Corrigir agora o tipo do envelope de geração | Parte da alteração não tem chamador produtivo na `b78` | Só na manutenção; não muda a tela nesta fatia | Sim; é guardrail de contrato e evita que o próximo chamador perca `alertas` |
| Manter regras de status no backend | A UI pode receber recusa depois da confirmação | Concorrência ou mudança de estado entre consulta e cancelamento | Não há corte seguro; duplicar regra financeira no frontend seria pior |

## O que eu abro mão

1. **Abro mão de declarar Boletos completo na `b78`.** Consulta, auditoria e cancelamento fecham;
   geração não fecha sem carteira selecionável. O custo é uma entrega em duas etapas.
2. **Abro mão do filtro por conta bancária na primeira fatia.** Isso reduz conforto em bases
   volumosas, mas evita transformar um identificador técnico em entrada do operador.
3. **Abro mão de download, impressão, CNAB e conciliação.** Incluí-los sem contratos inventariados
   criaria quatro fluxos financeiros sem prova e desviaria do defeito atual.
4. **Não abro mão dos alertas do backend.** Quando geração entrar, descartá-los permitiria que a
   tela parecesse homologada apesar do cálculo best-effort.
5. **Não abro mão de testes de contrato, dinheiro, estados e E2E.** Cortar prova agora exigiria
   outra versão, revisão e documento para recuperar a confiança depois.

## Riscos e pendências para a síntese

- O `GET` de carteiras é a única pendência que bloqueia geração; não bloqueia a `b78` proposta.
- O mapa auditável ainda não registra as cinco rotas. A síntese precisa decidir que a correção do
  mapa pertence à mesma fatia e não pode ser substituída por exceção genérica.
- A busca local é segura apenas para o contrato atual de coleção. Se o backend adotar paginação,
  a busca precisa mudar junto do contrato, não silenciosamente.
- A versão de geração permanece sem número para não reservar `b79` a um backend que ainda não
  existe. O orquestrador numera apenas depois do gatilho objetivo.
- Esta posição não executou testes, E2E ou build; é escopo, não validação de código.

```json
{
  "agent": "arquiteto-escopo-entrega",
  "node": "projeto",
  "assunto": "bancos-boletos",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/22-escopo-bancos-boletos.md",
  "decisoesPropostas": [
    {
      "id": "D-BOL-ESC-1",
      "titulo": "Entregar na b78 consulta, detalhe, historico e cancelamento com o contrato real",
      "reversivel": true,
      "gatilho": "b77 aprovada; se bloqueada, a corretiva b77.cN vem antes"
    },
    {
      "id": "D-BOL-ESC-2",
      "titulo": "Bloquear geracao ate existir GET de carteiras legiveis, sem aceitar GUID livre",
      "reversivel": true,
      "gatilho": "GET de carteiras documentado, tipado, autorizado e com identificador mais rotulo"
    },
    {
      "id": "D-BOL-ESC-3",
      "titulo": "Registrar as cinco rotas no mapa auditavel junto da correcao da tela",
      "reversivel": false,
      "gatilho": "nao cortar; contrato financeiro sem gate nao tem retorno seguro"
    }
  ],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "MISSING_CONTRACT",
      "pergunta": "Quando o backend disponibilizara GET de carteiras de cobranca com dados legiveis?",
      "decide": "quando a geracao recebe numero de versao e deixa o estado indisponivel"
    },
    {
      "tipo": "MISSING_CONTRACT",
      "pergunta": "Existe consulta legivel de contas bancarias para alimentar contaBancariaId?",
      "decide": "quando o filtro por conta bancaria entra sem GUID livre"
    }
  ],
  "riscos": [
    "As cinco rotas existem no backend, mas ainda nao estao no mapa auditavel do frontend.",
    "A geracao perde alertas e pode parecer homologada se o envelope real nao for preservado.",
    "Busca local deixa de ser suficiente se o backend passar a paginar a colecao."
  ]
}
```
