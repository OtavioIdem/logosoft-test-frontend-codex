# 22 — Operação: Bancos / Boletos

Agente: `arquiteto-operacao-erp`. Rodada de arquitetura 22, assunto
`bancos-boletos`, nó `arquitetura` do `graph_arquitetura`. Insumo obrigatório:
`docs/arquitetura/debate/22-inventario-bancos-boletos.md` e decisões anteriores
relacionadas D10 e D14 em `docs/arquitetura/DECISOES.md`. Proponho; não arbitro
a rodada nem altero código.

Meu viés declarado: o operador precisa sair da tela sabendo **qual título o
boleto representa, em que estado ele está, o que ocorreu com ele e por que uma
ação está indisponível**. A existência do `POST /gerar` não torna a geração
operável se a carteira ainda só puder ser informada por identificador técnico.

## 1. Posição resumida

O menor fluxo operacional seguro para `/bancos/boletos` entra em duas camadas:

1. **Liberar integralmente agora:** consulta por empresa, detalhe, histórico e
   cancelamento com motivo. Os quatro caminhos possuem contrato utilizável no
   inventário (`22-inventario-bancos-boletos.md:20-24`).
2. **Preparar, mas não liberar ainda:** geração. O client deve reconhecer o
   envelope real `{ boleto, alertas }` e a tela deve ter o estado de resultado,
   porém o comando permanece indisponível com motivo enquanto não existir fonte
   legível de carteiras. O inventário confirma que não há `GET` contratual de
   carteiras e que aceitar `carteiraCobrancaId` digitado não é seguro
   (`22-inventario-bancos-boletos.md:61-66`).

Não proponho campo livre de GUID, carteira fixa no frontend nem reaproveitamento
de um id guardado em sessão. Qualquer um desses atalhos pode gerar um boleto em
carteira errada e deixar o erro aparecer somente na remessa ou no banco.

## 2. Fluxo do operador

### Fluxo A — consultar boletos

```text
1. O operador abre Bancos -> Boletos.
2. Seleciona obrigatoriamente a empresa; antes disso nenhuma consulta é enviada.
3. Pode restringir por filial e status. A busca por documento/nosso número é local.
4. A tela consulta GET /api/bancos/boletos com empresaId e os filtros suportados.
5. O operador lê documento, nosso número, valor do título, valor pago,
   vencimento e status sem derivar saldo ou estado no frontend.
6. Se não houver resultado, recebe vazio diferente de erro; se houver falha,
   vê o erro recuperável e pode tentar novamente sem remontar os filtros.
```

`empresaId` é obrigatório no contrato, enquanto `filialId`,
`contaBancariaId` e `status` são opcionais. `termo` não pertence à query e deve
continuar como busca local (`22-inventario-bancos-boletos.md:20,48,63`). Ao
trocar empresa, a filial dependente e a lista anterior precisam ser limpas antes
da nova consulta; resultado da empresa anterior não pode permanecer sob o novo
contexto.

O filtro opcional por conta bancária não entra no mínimo enquanto não houver
consulta que permita selecionar a conta por banco/agência/conta. O operador não
digita `contaBancariaId` para usar um filtro.

### Fluxo B — conferir detalhe e histórico

```text
1. O operador abre uma linha da listagem.
2. A tela busca GET /api/bancos/boletos/{id} para obter o estado atual.
3. Mostra documento, nosso número, emissão, vencimento, valor do título,
   valor pago, status, liquidação, linha digitável e código de barras.
4. Em paralelo, busca GET /api/bancos/boletos/{id}/historico.
5. Cada evento mostra data, estado anterior -> estado novo, observação e o
   identificador de usuário quando o backend o entregar.
6. Erro do histórico fica dentro do detalhe, com tentativa novamente; não vira
   tabela vazia nem fecha um detalhe que carregou corretamente.
```

Os campos acima são os que o contrato efetivamente entrega
(`22-inventario-bancos-boletos.md:32-47`). D10 já proíbe derivar saldo e fixa os
quatro estados `Gerado`, `Em remessa`, `Liquidado` e `Cancelado`; D14 fixa o
histórico como transição, não como rótulo de evento inventado
(`docs/arquitetura/DECISOES.md:312-348,423-448`).

Os ids de conta a receber, parcela e carteira podem aparecer somente numa área
de referência técnica, de leitura, para suporte e auditoria. Eles não substituem
documento, vencimento e valores como identidade operacional, e nunca viram
entrada digitável.

### Fluxo C — cancelar um boleto

```text
1. Na linha ou no detalhe, o operador escolhe Cancelar.
2. A confirmação repete documento, nosso número, valor, vencimento e status,
   evitando cancelar a linha errada.
3. O operador informa um motivo obrigatório, entre 1 e 300 caracteres.
4. A tela envia POST /api/bancos/boletos/{id}/cancelar com { motivo }.
5. Em sucesso, usa o BoletoResponse devolvido, atualiza a lista e o detalhe e
   recarrega o histórico.
6. Em falha, mantém o motivo digitado, exibe a resposta do backend e permite
   corrigir ou desistir; não presume que o boleto continuou no estado antigo.
```

A ação pode ser apresentada para `Gerado` e `Em remessa`, seguindo D10 e a
regra visual já existente, mas o backend continua como autoridade final. Uma
mudança concorrente pode liquidar ou cancelar o boleto entre a listagem e a
confirmação; nessa situação a tela informa a recusa e recarrega o registro em
vez de forçar a transição. O payload e o limite do motivo estão confirmados no
inventário (`22-inventario-bancos-boletos.md:24,49`).

### Fluxo D — gerar um boleto quando a dependência existir

```text
1. O operador aciona Gerar boleto com BOLETOS_GERAR.
2. Seleciona empresa e, opcionalmente, filial.
3. Seleciona uma conta a receber por documento/rótulo legível.
4. Seleciona uma parcela por número, vencimento e saldo exibidos.
5. Seleciona uma carteira de cobrança por rótulo bancário legível e compatível
   com o contexto; nenhum GUID é digitado.
6. Informa opcionalmente o número do documento e confirma o resumo.
7. A tela envia contaReceberId, parcelaReceberId, carteiraCobrancaId e
   numeroDocumento? para POST /api/bancos/boletos/gerar.
8. Em sucesso, abre o boleto retornado e mantém todos os alertas visíveis até o
   operador fechar o resultado.
9. A lista e o histórico são invalidados/recarregados; falha preserva as
   seleções e mostra o erro do backend.
```

Este é o fluxo futuro, não autorização para ativá-lo com o contrato atual. A
conta e a parcela já têm seletor baseado em `GET /api/financeiro/contas-receber`,
que exige `FINANCEIRO_CONSULTAR` (`BancosOperacoesDialogs.tsx:30-92` e
`docs/backend-v1.23/CONTRATO-API-v1.23.md:3424-3431`). A carteira continua sem
origem de leitura. Portanto o botão deve explicar **“Geração indisponível: não
há consulta de carteiras de cobrança para uma seleção segura”**, e não apenas
sumir ou abrir formulário incompleto.

O retorno de geração não é `BoletoResponse`; é `GerarBoletoResponse` com
`boleto` e `alertas` (`22-inventario-bancos-boletos.md:23,46,61`). Alertas não
cabem apenas em toast: o backend avisa que linha digitável/código de barras são
best-effort e precisam de validação bancária. A tela pode dizer “gerado”, mas
não “homologado” ou “pronto para produção”.

## 3. Estados e motivos obrigatórios

| Situação | Estado que a tela precisa mostrar | Motivo/ação do operador |
|---|---|---|
| Empresa não selecionada | estado inicial, sem request | “Selecione uma empresa para consultar boletos.” |
| Consulta em andamento | carregamento sem apagar filtros | aguardar ou trocar filtro depois da conclusão |
| Consulta sem registros | vazio, não erro | revisar empresa, filial, status ou busca local |
| Falha da listagem | erro recuperável | tentar novamente mantendo filtros |
| Detalhe carregando | detalhe em carregamento | não mostrar valores vazios como se fossem reais |
| Histórico carregando | seção de histórico em carregamento | detalhe permanece utilizável |
| Histórico vazio | “Sem histórico registrado” | não confundir com falha |
| Histórico com erro | erro localizado e tentativa novamente | não renderizar vazio silencioso |
| Sem `BANCOS_CONSULTAR` | consulta indisponível | informar a permissão necessária; não chamar os três GETs |
| Sem `BOLETOS_CANCELAR` | cancelamento indisponível | explicar falta de permissão, sem alterar o status |
| Boleto `Liquidado` | cancelamento indisponível pela UI | “Boleto liquidado; atualize o registro ou trate no fluxo financeiro aplicável.” |
| Boleto `Cancelado` | cancelamento indisponível pela UI | “Boleto já cancelado.” |
| Motivo vazio ou maior que 300 | confirmação bloqueada | corrigir o motivo antes do POST |
| Cancelamento recusado por estado concorrente | erro + atualização do boleto | conferir o novo status e o histórico |
| Sem `BOLETOS_GERAR` | geração indisponível | informar a permissão necessária |
| Sem `FINANCEIRO_CONSULTAR` | seleção de título indisponível no desenho atual | conceder a consulta financeira ou aguardar endpoint próprio de elegíveis |
| Sem consulta de carteiras | geração bloqueada para todos | aguardar contrato legível; nunca digitar GUID |
| Geração concluída com alertas | sucesso com ressalvas persistentes | ler alertas e validar com o banco antes do uso real |
| Linha digitável/código de barras ausente | campo ausente, não zero/texto inventado | consultar alertas e tratar pelo backend/banco |

Os estados de erro do detalhe/histórico e a indisponibilidade contextual estão
incompletos hoje (`22-inventario-bancos-boletos.md:51-57`). As frases acima são
orientação operacional; a posição de design decide o componente e a hierarquia
visual.

## 4. O que a estrutura precisa permitir

1. **Consultar somente após empresa válida.** Destrava o Fluxo A sem enviar
   payload incompatível nem misturar empresas.
2. **Separar filtro de servidor e busca local.** Destrava documento/nosso número
   sem inventar `termo` no contrato.
3. **Ler todos os valores financeiros sem derivação.** Valor do título e valor
   pago permanecem separados, como D10; não há “saldo do boleto” calculado no
   navegador.
4. **Abrir detalhe atual e histórico independente.** Uma falha de histórico não
   esconde linha digitável, vencimento ou status do boleto.
5. **Confirmar cancelamento com contexto e motivo.** Destrava o caminho errado
   sem transformar uma ação crítica em clique acidental.
6. **Reconsultar depois de mutação.** Destrava concorrência entre lista,
   detalhe, cancelamento e atualizações vindas de outros processos.
7. **Preservar o envelope de geração.** Destrava a apresentação dos alertas que
   fazem parte do resultado, sem tratá-los como metadado descartável.
8. **Explicar geração indisponível.** Destrava entendimento do operador enquanto
   a carteira não pode ser selecionada com segurança.
9. **Aplicar permissão por capacidade.** Consulta usa `BANCOS_CONSULTAR`, geração
   usa `BOLETOS_GERAR` e cancelamento usa `BOLETOS_CANCELAR`; uma não substitui a
   outra.
10. **Nunca aceitar vínculo técnico digitado.** Conta, parcela e carteira entram
    por seleção legível; ids aparecem, no máximo, como referência de suporte.

## 5. Onde o fluxo quebra hoje

1. A consulta é habilitada só pela permissão e pode executar com filtros vazios,
   embora `empresaId` seja obrigatório (`BoletosPage.tsx:39-47` e inventário
   linha 63).
2. O client envia `termo`, omite `contaBancariaId` e declara empresa opcional
   (`bancosApi.ts:61-62`, `bancos.types.ts:95`, inventário linha 63).
3. O tipo do boleto não contém `dataEmissao` nem `dataLiquidacao` e tipa
   `nossoNumero` diferente do backend, deixando o detalhe incompleto
   (`22-inventario-bancos-boletos.md:62`).
4. O histórico carrega, mas sua falha não aparece dentro do diálogo; o operador
   pode interpretar erro como ausência de eventos (`22-inventario-bancos-boletos.md:56`).
5. O diálogo de geração existe e sabe selecionar conta/parcela, mas não é
   composto na página e não tem fonte real de carteiras
   (`BancosOperacoesDialogs.tsx:30-96`; inventário linha 64).
6. O client de geração interpreta o envelope como boleto e descarta `alertas`,
   o que quebra o resultado mesmo que o POST responda com sucesso
   (`bancosApi.ts:70-72`; inventário linhas 61 e 66).
7. O cancelamento exige texto, mas o schema local não expressa o máximo de 300
   caracteres (`bancosSchemas.ts:43-55`; inventário linha 49).
8. A rota e o menu aceitam combinações de permissões diferentes da guarda
   interna da página: a rota aceita as capacidades de Bancos, o menu de Boletos
   aceita consulta ou geração, mas a página devolve `UnauthorizedState` sem
   `BANCOS_CONSULTAR` (`routePermissions.ts:73`, `AppMenu.tsx:190-192`,
   `BoletosPage.tsx:50-53`). A estrutura precisa mostrar cada capacidade
   permitida sem ampliar a permissão de nenhuma delas.

## 6. Impacto em módulos vizinhos

- **Financeiro / Contas a receber:** a geração vincula obrigatoriamente conta e
  parcela. O frontend não decide elegibilidade, saldo ou estado; seleciona uma
  parcela legível e deixa o backend validar. No desenho atual, listar títulos
  também exige `FINANCEIRO_CONSULTAR`.
- **Cadastros bancários:** a carteira é pré-requisito da geração, mas o recorte
  não inclui criar ou corrigir Bancos, Contas, Convênios ou Carteiras. A ausência
  do `GET` é dependência de backend, não convite para recriar catálogo local.
- **CNAB:** remessa e retorno podem mover o boleto para estados posteriores,
  mas continuam fora desta rodada. A tela de Boletos apenas reflete o estado e
  o histórico recebidos; não oferece gerar remessa ou importar retorno dentro
  do detalhe.
- **Auditoria e suporte:** o histórico é a trilha operacional. Como o contrato
  entrega somente `usuarioId?`, a primeira entrega pode mostrar o identificador
  técnico ou “não informado”, mas não inventar nome de usuário.
- **Banco/homologação:** alertas e linha/código não provam homologação. A
  validação bancária real permanece um gate externo e não foi executada nesta
  rodada.

## 7. O que eu abro mão

1. Abro mão de ativar a geração nesta primeira fatia. Aceito entregar consulta,
   detalhe, histórico e cancelamento completos, com a geração visível como
   indisponível, até existir seleção legível de carteira.
2. Abro mão do filtro por conta bancária, embora a query o aceite. Sem catálogo
   de leitura, o operador usará empresa, filial, status e busca local; não
   digitará um id para ganhar o filtro.
3. Abro mão de iniciar obrigatoriamente a geração dentro da tela de Contas a
   Receber. A rota de Boletos pode ser o ponto inicial, desde que o título e a
   parcela sejam selecionados com contexto legível. Um atalho pré-selecionado
   pode vir depois.
4. Abro mão de calcular saldo, atraso, possibilidade de cancelamento ou
   homologação além do que o contrato e as decisões anteriores dizem. O
   operador verá os campos e bloqueios retornados pelo backend.
5. Abro mão de resolver `usuarioId` para nome nesta rodada. O histórico mantém a
   referência que existe; enriquecimento depende de contrato próprio.
6. Abro mão de incluir CNAB, cadastro bancário e alteração de permissões. A
   estrutura termina no ciclo do boleto coberto pelos cinco endpoints.

Não abro mão de preservar `alertas`, exigir motivo no cancelamento, bloquear
GUID livre nem diferenciar vazio de erro. Cortar qualquer um desses itens deixa
o fluxo financeiramente inseguro ou sem rastreabilidade.

## 8. Perguntas externas

1. **[backend]** Será publicado um `GET` de carteiras de cobrança com rótulo,
   empresa/filial e permissão definida? Decide quando `POST /gerar` pode ser
   ativado sem GUID digitado.
2. **[segurança/backend]** O operador com `BOLETOS_GERAR` deve também receber
   `FINANCEIRO_CONSULTAR` para escolher conta/parcela, ou haverá endpoint de
   títulos elegíveis protegido por `BOLETOS_GERAR`? Decide o perfil mínimo real
   da geração.
3. **[cliente/produto]** A geração deve começar prioritariamente em Boletos ou
   como ação de uma parcela em Contas a Receber? Decide se a primeira entrega
   precisa de entrada contextual com título/parcela pré-selecionados.
4. **[backend]** Quais transições e códigos estáveis de erro representam
   cancelamento recusado por estado concorrente? Decide se a UI consegue dar
   motivo específico sem casar texto da mensagem.
5. **[backend/produto]** O histórico pode devolver identificação legível do
   usuário além de `usuarioId`? Decide se a trilha serve diretamente à auditoria
   operacional ou exige consulta técnica externa.

## 9. Divergências para a síntese

- Se Escopo propuser chamar a estrutura de Boletos “completa” sem ativar
  geração, concordo somente se a indisponibilidade e sua causa forem explícitas
  na tela e no CHANGELOG. Endpoint implementado no client não equivale a fluxo
  operável.
- Se Plataforma propuser aceitar `carteiraCobrancaId` vindo de configuração
  estática, query string ou armazenamento local, discordo: isso não comprova que
  a carteira pertence ao contexto nem fornece rótulo para confirmação.
- Se Design propuser ocultar totalmente o comando de geração, discordo: quem
  tem `BOLETOS_GERAR` precisa entender a dependência faltante, não concluir que
  sua permissão está quebrada.
- Se qualquer posição propuser derivar saldo ou traduzir alerta como
  homologação, discordo com base em D10 e no aviso explícito do backend.

```json
{
  "agent": "arquiteto-operacao-erp",
  "node": "projeto",
  "assunto": "bancos-boletos",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/22-operacao-bancos-boletos.md",
  "decisoesPropostas": [
    {
      "id": "P22-OP-1",
      "titulo": "Consulta exige empresa e separa busca local dos filtros contratuais",
      "reversivel": true,
      "gatilho": "backend tornar empresa opcional ou publicar busca textual no endpoint"
    },
    {
      "id": "P22-OP-2",
      "titulo": "Detalhe, histórico e cancelamento fecham o primeiro fluxo operacional",
      "reversivel": true,
      "gatilho": "contrato de boleto ou matriz de estados mudar"
    },
    {
      "id": "P22-OP-3",
      "titulo": "Geração permanece indisponível até haver seletor legível de carteira",
      "reversivel": true,
      "gatilho": "GET de carteiras de cobrança com contexto e permissão ser publicado"
    },
    {
      "id": "P22-OP-4",
      "titulo": "Resultado da geração preserva boleto e todos os alertas",
      "reversivel": true,
      "gatilho": "backend remover o envelope ou fornecer garantia formal de homologação"
    },
    {
      "id": "P22-OP-5",
      "titulo": "Cancelamento exige confirmação contextual e motivo de 1 a 300 caracteres",
      "reversivel": true,
      "gatilho": "contrato de cancelamento alterar payload ou limite"
    }
  ],
  "discordancias": [
    {
      "de": "arquiteto-escopo-entrega",
      "ponto": "declarar geração entregue enquanto a carteira não pode ser selecionada com segurança",
      "impacto": "alto"
    },
    {
      "de": "arquiteto-plataforma-frontend",
      "ponto": "usar fonte local ou GUID técnico para contornar a ausência do GET de carteiras",
      "impacto": "alto"
    },
    {
      "de": "arquiteto-design-system",
      "ponto": "ocultar a geração indisponível sem explicar a dependência ao operador autorizado",
      "impacto": "medio"
    }
  ],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Haverá GET de carteiras com rótulo, contexto e permissão?",
      "decide": "ativação segura da geração e do filtro por conta/carteira"
    },
    {
      "tipo": "backend",
      "pergunta": "Gerar boleto pressupõe FINANCEIRO_CONSULTAR ou terá endpoint próprio de títulos elegíveis?",
      "decide": "perfil mínimo e composição de permissões da geração"
    },
    {
      "tipo": "cliente",
      "pergunta": "A geração começa em Boletos ou na parcela de Contas a Receber?",
      "decide": "ponto de entrada e necessidade de pré-seleção contextual"
    },
    {
      "tipo": "backend",
      "pergunta": "Quais códigos estáveis representam cancelamento recusado por transição concorrente?",
      "decide": "motivo contextual sem casamento por texto"
    },
    {
      "tipo": "backend",
      "pergunta": "O histórico poderá expor nome ou outra identificação legível do usuário?",
      "decide": "legibilidade da trilha operacional"
    }
  ],
  "riscos": [
    "A geração não fecha operacionalmente sem consulta legível de carteiras e deve permanecer indisponível.",
    "O seletor atual de conta e parcela cria dependência adicional de FINANCEIRO_CONSULTAR ainda não resolvida para o perfil BOLETOS_GERAR.",
    "Alertas descartados podem fazer o operador tratar saída best-effort como boleto homologado.",
    "Consulta sem empresa pode falhar ou apresentar contexto incorreto.",
    "Falha do histórico pode ser confundida com ausência de eventos se não houver estado de erro localizado.",
    "Cancelamento concorrente exige reconsulta; a UI não pode assumir sucesso nem conservar status antigo.",
    "O filtro por conta bancária fica fora até existir seleção legível; o operador terá filtragem menos precisa.",
    "CNAB, cadastro bancário e homologação real ficaram fora do recorte de propósito.",
    "Nenhum endpoint foi executado nesta rodada; payloads e estados foram conferidos pelo inventário e por leitura estática."
  ]
}
```
