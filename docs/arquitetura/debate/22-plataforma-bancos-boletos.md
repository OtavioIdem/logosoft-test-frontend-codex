# Debate 22 — Bancos / Boletos — posição do `arquiteto-plataforma-frontend`

Assunto: `bancos-boletos`. Insumo comum da rodada:
`docs/arquitetura/debate/22-inventario-bancos-boletos.md`. Recorte desta posição: tipos, schemas,
client HTTP, hooks, query keys, invalidação e cobertura de contrato das cinco rotas de Boletos. Não
abrange componentes, permissões, CNAB, cadastros bancários nem alteração de backend. Esta posição
propõe; a síntese da rodada decide.

## 1. Evidência que condiciona o desenho

O inventário confirmou que as cinco rotas existem, mas também mostrou que rota compatível não
significa payload compatível. O gate de mapa declarou **484 rotas** compatíveis enquanto dois erros
de forma permanecem no client: `POST /gerar` é tipado como boleto simples, embora devolva
`{ boleto, alertas }`, e a consulta permite `empresaId` ausente, envia `termo` inexistente e não
expõe `contaBancariaId` (`22-inventario-bancos-boletos.md`, divergências 1, 3 e 5).

Na camada atual:

- `BoletoResumoResponse` não representa o DTO real: `nossoNumero` está como texto opcional, faltam
  `dataEmissao` e `dataLiquidacao`, e `numeroDocumento` foi tornado opcional
  (`features/bancos/types/bancos.types.ts:50-66`);
- os schemas Zod validam requests, mas nenhuma das cinco respostas é validada em runtime
  (`features/bancos/schemas/bancosSchemas.ts:43-60` e `features/bancos/api/bancosApi.ts:61-76`);
- `motivoSchema` garante apenas texto não vazio e não protege o limite contratual de 300 caracteres
  (`bancosSchemas.ts:60`);
- a query key guarda o objeto bruto, portanto `null`, `undefined` e ausência podem criar entradas de
  cache diferentes para a mesma chamada HTTP já normalizada por `cleanQueryParams`
  (`features/bancos/hooks/useBancosResources.ts:7,22-23`);
- detalhe é buscado diretamente pelo client, fora do React Query, e não tem chave própria; a busca
  nominal mostrou `obterBoleto` usado fora do hook, enquanto lista e histórico passam pelo hook
  (`bancosApi.ts:64-68`; busca por `obterBoleto|useBoletoHistorico` no feature Bancos);
- cancelamento e geração invalidam apenas o prefixo da lista. O histórico do boleto cancelado e um
  futuro cache de detalhe permanecem sem política de atualização (`useBancosResources.ts:28-33`).

Há precedente interno para validar resposta sem rejeitar campos aditivos: Séries Fiscais usa schemas
de resposta Zod não estritos e faz o parse na borda do client
(`features/fiscal/schemas/seriesFiscaisSchemas.ts:111-131` e
`features/fiscal/api/seriesFiscaisApi.ts:36,43-75`). Não é necessária uma biblioteca nova.

## 2. Contrato canônico da camada

### P22-PLAT-1 — uma única forma de boleto, envelope de geração explícito

O frontend deve espelhar o contrato lido pelo inventário, sem manter um “resumo” diferente para a
mesma resposta do backend:

```text
BoletoResponse
  id: Guid
  contaReceberId: Guid
  parcelaReceberId: Guid
  carteiraCobrancaId: Guid
  nossoNumero: number
  numeroDocumento: string
  dataEmissao: IsoDateTime
  dataVencimento: IsoDateTime
  valorTitulo: number
  statusBoleto: StatusBoleto
  linhaDigitavel: string | null
  codigoBarras: string | null
  dataLiquidacao: IsoDateTime | null
  valorPago: number | null

GerarBoletoResponse
  boleto: BoletoResponse
  alertas: string[]

BoletoHistoricoResponse
  id, statusAnterior, statusNovo, observacao, usuarioId, data
```

`GET /boletos` deve devolver `BoletoResponse[]`; criar um segundo tipo de lista só é válido quando o
backend publicar um DTO resumido diferente. `POST /gerar` deve devolver `GerarBoletoResponse`, e os
alertas ficam no resultado da mutação, não dentro do cache do boleto. `POST /{id}/cancelar` continua
devolvendo `BoletoResponse`.

Os schemas de resposta devem ser aditivos — `z.object(...)` sem `.strict()` — e aplicados pelo client
às cinco respostas. Requests podem ser estritos porque campos extras enviados ao backend são erro de
integração. O request de cancelamento precisa de `trim().min(1).max(300)`. Os parâmetros da listagem
devem ser um tipo próprio com `empresaId` obrigatório e apenas `filialId`, `contaBancariaId` e
`status` opcionais; `termo` não pertence ao request.

**Ponto de não-retorno:** publicar componentes e testes consumindo o boleto nu de `/gerar` transforma
o envelope errado em contrato interno. Corrigir agora é barato porque a geração ainda não está
composta na página; depois exige migrar consumidores e tratamento de sucesso espalhado.

**Risco de precisão:** `nossoNumero` é `long` no backend e chega como JSON numérico. JavaScript só
preserva inteiros até `Number.MAX_SAFE_INTEGER`. Não há medição do maior Nosso Número real. A
implementação pode espelhar `number` para esta fatia, sem fazer aritmética, mas o backend precisa
confirmar que o domínio nunca excede o limite seguro; caso contrário, a correção sustentável é o DTO
transportar texto. Converter para string depois do parse não recupera dígitos já perdidos.

**Valor monetário:** `valorTitulo` e `valorPago` permanecem `number` por compatibilidade com o contrato
e com o frontend, mas são dados de exibição. Esta camada não deve recalcular liquidação, saldo, juros
ou arredondamento.

### P22-PLAT-2 — o client rejeita consulta sem empresa e não aceita payload fantasma

`listarBoletos` deve receber `BoletosListQuery`, sem parâmetro opcional, validar `empresaId` antes da
chamada e montar exatamente estes parâmetros:

```text
empresaId, filialId?, contaBancariaId?, status?
```

O hook também deve usar `enabled && Boolean(query.empresaId)`. A defesa duplicada é intencional: o
hook impede consulta prematura na tela e o client impede que outro consumidor contorne a regra. A
busca por documento ou Nosso Número pode filtrar a coleção já recebida, mas não entra no request nem
na query key enquanto o backend não publicar esse filtro.

Os métodos públicos de geração e cancelamento devem receber requests tipados, derivados dos schemas,
em vez de propagar `unknown` até a mutação. `unknown` continua aceitável somente na entrada do builder
que executa `schema.parse`; depois do parse, o payload já tem tipo nominal.

Não deve ser criada exceção nem supressão no mapa de contrato. As cinco rotas já são conhecidas; o
trabalho é alinhar a forma do payload. `validate:backend-contract-map` continua obrigatório, mas não
é prova suficiente do DTO, como a coexistência do gate verde com o envelope errado demonstrou.

### P22-PLAT-3 — query keys hierárquicas e invalidação por recurso

Recomendo substituir as duas famílias soltas por uma fábrica exportada antes que outros módulos
consumam as chaves atuais:

```text
boletosKeys.all                 = ['bancos', 'boletos']
boletosKeys.lists()             = [...all, 'list']
boletosKeys.list(queryNormalizada)
boletosKeys.details()           = [...all, 'detail']
boletosKeys.detail(id)
boletosKeys.histories()         = [...all, 'history']
boletosKeys.history(id)
```

A query normalizada deve conter somente os quatro parâmetros enviados e representar opcionais de uma
única forma. Assim, duas entradas semanticamente iguais não ocupam caches distintos. `empresaId`
fica necessariamente na chave da lista; detalhe e histórico podem usar apenas o GUID do boleto, que
é a identidade publicada pelo contrato.

O hook de detalhe deve ser criado sobre `boletosKeys.detail(id)`, eliminando a chamada direta e
permitindo estado, deduplicação e invalidação uniformes. As mutações seguem esta política:

| Mutação | Atualização imediata | Invalidação |
|---|---|---|
| gerar | `setQueryData(detail(id), response.boleto)`; alertas permanecem no resultado da mutação | todas as listas |
| cancelar | `setQueryData(detail(id), boletoRetornado)` | todas as listas e `history(id)` |

Invalidar todas as listas é deliberado: status e conta podem mover o registro entre filtros. Não há
razão para invalidar históricos de outros boletos. Atualizar listas manualmente exigiria reproduzir
no cliente todas as combinações de filtros e tem custo maior que o refetch correto.

Mudar as keys é barato agora: a busca nominal encontrou as definições e os consumidores somente em
`useBancosResources.ts`. Depois que outras telas importarem o prefixo atual, vira migração coordenada;
por isso esta é uma decisão a fechar antes da implementação.

## 3. Volume e materialização

O endpoint devolve coleção completa de `BoletoResponse` e não oferece paginação no contrato
inventariado. O volume esperado não foi informado. Portanto, chamar a tabela de server-side ou criar
parâmetros de página apenas no frontend produziria uma garantia falsa.

Para a primeira fatia, aceito carga integral condicionada por empresa e pelos filtros reais do
backend. Isso é uma concessão, não uma afirmação de escala. Devem ser medidos em ambiente representativo:

- maior quantidade de boletos retornada por empresa;
- tamanho do payload;
- tempo p95 do `GET /api/bancos/boletos`.

O gatilho proposto — **não medido** — para pedir paginação ao backend é resposta recorrente acima de
500 registros, payload acima de 1 MiB ou p95 acima de 1 segundo. Até medir, não se deve pré-carregar
detalhe ou histórico por linha; cada uma dessas rotas só executa sob seleção explícita.

## 4. Gates necessários

### G22-1 — contrato executável das cinco rotas

Classe de defeito: TypeScript declara um shape, Axios entrega outro e a tela recebe `undefined` sem
falha de compilação.

Um teste de contrato do client deve mockar a borda HTTP e verificar nominalmente:

- lista envia somente `empresaId`, `filialId`, `contaBancariaId` e `status`; sem empresa faz zero
  chamadas;
- lista e detalhe exigem os campos completos de `BoletoResponse` e aceitam campo aditivo;
- histórico exige todos os campos do evento;
- geração aceita `{ boleto, alertas }` e rejeita boleto nu;
- cancelamento envia `{ motivo }`, rejeita vazio e 301 caracteres, e aceita 300;
- `nossoNumero` textual falha enquanto o contrato vigente for numérico.

Sinal vermelho: qualquer uma das cinco rotas deixa de passar pelo parser correspondente, um campo
obrigatório desaparece ou o request envia chave fora do contrato. Custo aproximado: baixo a médio,
pois usa Vitest, mock do client e Zod já presentes no repositório.

### G22-2 — cache e invalidação

Classe de defeito: dado velho após cancelamento ou caches duplicados para a mesma consulta.

O teste dos hooks deve provar que:

- consulta sem empresa não chama a API;
- queries semanticamente iguais geram a mesma key normalizada;
- cancelar atualiza detalhe e invalida listas mais o histórico do ID nominal;
- gerar atualiza o detalhe do boleto retornado, invalida listas e preserva `alertas` no resultado;
- nenhuma mutação invalida o histórico de outro ID.

Sinal vermelho: asserções devem nomear as keys exatas; `expect.anything()` sobre a invalidação não
protege o contrato. Custo aproximado: baixo.

### G22-3 — mapa de rotas existente

`npm run validate:backend-contract-map` deve permanecer verde e sem nova supressão. Ele protege
método e caminho, não substitui G22-1 para request/response.

Não proponho nesta rodada um novo script global de schema para todas as features. Há um defeito
confirmado neste módulo e um precedente de parse em runtime, mas ainda não uma medição que justifique
migrar todo o frontend. O gatilho para estruturalizar o gate é uma segunda divergência de DTO em outra
feature financeira ou repetição do mesmo defeito após G22-1.

## 5. Custo de reversão e limites

| Decisão | Custo de desfazer |
|---|---|
| corrigir campos e envelope antes de a geração ser consumida | barato |
| remover `termo` do request e adicionar `contaBancariaId` | barato; alinha o contrato atual |
| exigir empresa no tipo, hook e client | baixo; fecha chamada inválida na origem |
| migrar query keys agora | baixo; consumidores medidos estão no mesmo hook |
| migrar query keys depois de reuso por outras telas | caro; exige coordenação de cache e consumidores |
| introduzir paginação apenas no frontend | caro e incorreto; cria protocolo inexistente |
| publicar geração aceitando GUID manual de carteira | caro e inseguro; espalha vínculo técnico pela UX |
| criar um gate global de DTO nesta rodada | médio/alto e sem recorrência medida; não proposto |

## 6. Posição final

Recomendo alinhar primeiro o contrato executável das cinco rotas: um `BoletoResponse` completo, um
`GerarBoletoResponse` que preserve alertas, query obrigatória por empresa com os quatro parâmetros
reais, schemas de resposta na borda HTTP e motivo limitado a 300 caracteres. Em seguida, consolidar
lista, detalhe e histórico sob uma fábrica de query keys e uma política nominal de invalidação.

A geração pode ter client, schema, mutation e testes prontos, mas sua disponibilização interativa
continua dependente de seleção legível de `carteiraCobrancaId`; este parecer não autoriza GUID manual
nem expande o escopo para cadastros bancários. Também não autoriza cálculo financeiro no frontend.

**O que eu abro mão:** aceito, na primeira fatia, a lista não paginada e valores monetários como
`number`, desde que não haja cálculo e que volume/latência sejam medidos. Aceito teste de contrato
focado em Boletos em vez de um gate global de DTO. Reviso a paginação nos gatilhos declarados e o
gate global na segunda divergência confirmada. Não abro mão de preservar `alertas`, de bloquear a
consulta sem empresa nem de corrigir a invalidação do boleto cancelado.

```json
{
  "agent": "arquiteto-plataforma-frontend",
  "node": "projeto",
  "assunto": "bancos-boletos",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/22-plataforma-bancos-boletos.md",
  "decisoesPropostas": [
    {
      "id": "P22-PLAT-1",
      "titulo": "Contrato canônico de boleto e envelope de geração validados por Zod",
      "reversivel": true,
      "gatilho": "contrato do backend alterar os DTOs de Boletos"
    },
    {
      "id": "P22-PLAT-2",
      "titulo": "Listagem exige empresa e envia apenas filtros publicados",
      "reversivel": true,
      "gatilho": "backend publicar busca textual ou novo filtro"
    },
    {
      "id": "P22-PLAT-3",
      "titulo": "Query keys hierárquicas com detalhe e invalidação nominal",
      "reversivel": true,
      "gatilho": "identidade do boleto deixar de ser global por GUID"
    }
  ],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Qual é o maior valor permitido para NossoNumero e ele é garantidamente menor ou igual a Number.MAX_SAFE_INTEGER?",
      "decide": "se nossoNumero pode permanecer number ou precisa ser transportado como string"
    },
    {
      "tipo": "medicao",
      "pergunta": "Qual é o maior volume, tamanho de payload e p95 reais do GET /api/bancos/boletos por empresa?",
      "decide": "se a listagem sem paginação é sustentável"
    },
    {
      "tipo": "backend",
      "pergunta": "Como a operação obterá uma carteira de cobrança elegível por seleção legível, sem GUID manual?",
      "decide": "quando a geração pode ser disponibilizada na interface"
    }
  ],
  "riscos": [
    "O mapa de rotas verde não detecta divergência de request ou response.",
    "NossoNumero como JSON number pode perder precisão se o domínio usar valores acima do limite seguro do JavaScript.",
    "A lista não possui paginação contratual e o volume real ainda não foi medido.",
    "Liberar geração sem seleção real de carteira transforma identificador técnico em entrada operacional insegura."
  ]
}
```
